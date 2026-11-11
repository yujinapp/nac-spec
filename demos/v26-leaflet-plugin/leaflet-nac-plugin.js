/* =====================================================================
   leaflet-nac-plugin.js -- a NAC3 v2.6 plugin for a REAL third-party
   library (Leaflet 1.9.4), written the way a plugin living in ANOTHER
   repository would be written.

   THE POINT OF THIS FILE. It touches no NAC3 internal. Everything it
   uses is the published surface of the runtime:

     NAC.registerApiHandle(name, obj)   -- hand the runtime the live
                                           Leaflet map, which never
                                           lands on window
     NAC.registerPlugin(slug, manifest) -- declare the routing contract
                                           as pure JSON

   Nothing else. No patch of the runtime, no import of a private
   function, no shared build. That is what makes "the surface lives in
   its own repository, under its own licence, attached to the Apache
   core" a mechanical fact rather than a plan.

   WHAT IT DECLARES, and which v2.6 hook each piece exercises:

     E-1  the manifest is discoverable: an agent that never saw this
          file calls NAC.plugins() and finds the slug, the verbs and
          the arguments.
     E-2  every verb carries a label, a hint and typed params with
          units and ranges -- a map takes a COORDINATE, and before
          v2.6 nothing in a manifest could say so.
     E-3  'moveend' and 'zoomend' are Leaflet's own events, reached
          declaratively through the emitter-listen backend. No
          polling, no hand-written mirror node for the event.
     E-4  map.setView(center, zoom) is a POSITIONAL signature on an
          object that is not global: `handle` + `args_order`.
     E-5  the marker rows mount and unmount as the map moves, which is
          the virtualised-row shape; the subscription declares `root`
          so it survives the remount.
     E-6  a verb that fails for a reason of the APPLICATION, not of
          the routing, raises a code in the reserved plugin space.

   Apache-2.0, same as the runtime it attaches to. Leaflet itself is
   BSD-2-Clause and is loaded from unpkg with a pinned SRI hash; no
   Leaflet byte is vendored into this repository.
   ===================================================================== */

(function (global) {
  'use strict';

  /* The three cities the demo tracks. A row per city is rendered ONLY
     while the city is inside the current viewport -- that is the
     mount / unmount cycle E-5 is about. */
  var CITIES = [
    { slug: 'bue', label: 'Buenos Aires', lat: -34.6037, lng: -58.3816 },
    { slug: 'mvd', label: 'Montevideo',   lat: -34.9011, lng: -56.1645 },
    { slug: 'scl', label: 'Santiago',     lat: -33.4489, lng: -70.6693 }
  ];

  function haversineKm(a, b) {
    var R = 6371;
    var dLat = (b.lat - a.lat) * Math.PI / 180;
    var dLng = (b.lng - a.lng) * Math.PI / 180;
    var la1 = a.lat * Math.PI / 180, la2 = b.lat * Math.PI / 180;
    var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return Math.round(2 * R * Math.asin(Math.sqrt(h)));
  }

  /* ---------------------------------------------------------------
     The glue object. Everything Leaflet does not expose as one call
     lives here: it is the plugin's own API, not the runtime's, and
     the runtime reaches it the same way it reaches the map -- as a
     registered handle. This is the shape an adopter uses for a
     facade over any library.
     --------------------------------------------------------------- */
  function makeGlue(map, rowsContainer) {
    return {
      cities: CITIES,

      panToCity: function (args) {
        var slug = args && args.city;
        var city = CITIES.filter(function (c) { return c.slug === slug; })[0];
        if (!city) {
          /* The ARGUMENT was wrong, which is a contract error, not an
             application state -- so this one is `invalid`, from the
             closed list of SPEC 15.9. */
          var e = new Error('panToCity: unknown city "' + slug + '"');
          e._code = 'invalid';
          throw e;
        }
        map.setView([city.lat, city.lng], args && args.zoom != null ? args.zoom : 11);
        return { ok: true, city: city.slug };
      },

      visibleCount: function () {
        var b = map.getBounds();
        return CITIES.filter(function (c) {
          return b.contains([c.lat, c.lng]);
        }).length;
      },

      /* E-6: a failure of the APPLICATION, named in the plugin's own
         code space. An agent can tell "this map has no such overlay"
         from "the protocol could not reach the map" -- which is the
         distinction the closed list of ten codes cannot express. */
      requireOverlay: function (args) {
        var name = (args && args.overlay) || 'unknown';
        var e = new Error('overlay "' + name + '" is not attached to this map');
        e._code = 'plugin.overlay_not_attached';
        throw e;
      },

      /* Re-render the per-city rows. A row EXISTS only while its city
         is in view: mount and unmount driven by the real map, not by a
         timer. The row's data-value is the distance in km from the
         current centre, so panning changes a mounted row. */
      renderRows: function () {
        if (!rowsContainer) return;
        var bounds = map.getBounds();
        var centre = map.getCenter();
        CITIES.forEach(function (city) {
          var existing = rowsContainer.querySelector('[data-marker-row="' + city.slug + '"]');
          var inView = bounds.contains([city.lat, city.lng]);
          if (!inView) {
            if (existing && existing.parentNode) existing.parentNode.removeChild(existing);
            return;
          }
          var km = haversineKm({ lat: centre.lat, lng: centre.lng }, city);
          if (!existing) {
            existing = document.createElement('li');
            existing.className = 'marker-row';
            existing.setAttribute('data-marker-row', city.slug);
            existing.setAttribute('data-nac-id', 'map.marker.' + city.slug);
            existing.setAttribute('data-nac-role', 'list_item');
            existing.setAttribute('data-nac-label', city.label);
            rowsContainer.appendChild(existing);
          }
          if (existing.getAttribute('data-value') !== String(km)) {
            existing.setAttribute('data-value', String(km));
          }
          existing.textContent = city.label + ' -- ' + km + ' km from centre';
        });
      }
    };
  }

  /* ---------------------------------------------------------------
     The manifest. Pure JSON -- no function reference anywhere in it.
     --------------------------------------------------------------- */
  function buildManifest() {
    var manifest = {
      slug:  'leaflet.map',
      label: 'Leaflet map',
      hint:  'A real Leaflet 1.9.4 map. Its surface is canvas and tiles; none of it is addressable as DOM.',
      verbs: {
        'view.set': {
          backend:    'sdk-call',
          handle:     'leaflet.map',
          path:       'setView',
          mode:       'invoke',
          args_order: ['center', 'zoom'],
          label:      'Move the view',
          hint:       'Centres the map on a coordinate at a zoom level',
          params: [
            { name: 'center', type: 'array', required: true, unit: 'degrees',
              label: 'Centre', hint: 'Two numbers: [latitude, longitude]' },
            { name: 'zoom', type: 'number', required: false, unit: 'zoom level',
              min: 0, max: 19, label: 'Zoom', hint: '0 is the whole world, 19 is a building' }
          ]
        },
        'view.zoom_in': {
          backend: 'sdk-call', handle: 'leaflet.map', path: 'zoomIn', mode: 'invoke',
          label: 'Zoom in', hint: 'One zoom level closer'
        },
        'view.zoom_out': {
          backend: 'sdk-call', handle: 'leaflet.map', path: 'zoomOut', mode: 'invoke',
          label: 'Zoom out', hint: 'One zoom level further away'
        },
        'view.fit_all': {
          backend: 'sdk-call', handle: 'leaflet.glue', path: 'panToCity', mode: 'invoke',
          label: 'Go to a tracked city',
          hint: 'Centres the map on one of the three cities this plugin tracks',
          params: [
            { name: 'city', type: 'string', required: true,
              enum: ['bue', 'mvd', 'scl'], label: 'City',
              hint: 'bue Buenos Aires, mvd Montevideo, scl Santiago' },
            { name: 'zoom', type: 'number', required: false, unit: 'zoom level', min: 0, max: 19 }
          ]
        },
        'overlay.require': {
          backend: 'sdk-call', handle: 'leaflet.glue', path: 'requireOverlay', mode: 'invoke',
          label: 'Require an overlay',
          hint: 'Fails with a plugin-space code when the overlay is not attached',
          params: [
            { name: 'overlay', type: 'string', required: true, label: 'Overlay name' }
          ]
        }
      },
      state: {
        'view.zoom': [
          { backend: 'sdk-call', handle: 'leaflet.map', path: 'getZoom', mode: 'invoke',
            label: 'Zoom level', unit: 'zoom level' },
          { backend: 'dom-mirror', selector: '[data-mirror="zoom"]', extract: 'attribute:data-value' }
        ],
        'view.center.lat': [
          { backend: 'sdk-call', handle: 'leaflet.map', path: 'getCenter', mode: 'invoke',
            extract: 'lat', label: 'Latitude of the centre', unit: 'degrees' },
          { backend: 'dom-mirror', selector: '[data-mirror="lat"]', extract: 'attribute:data-value' }
        ],
        'view.center.lng': [
          { backend: 'sdk-call', handle: 'leaflet.map', path: 'getCenter', mode: 'invoke',
            extract: 'lng', label: 'Longitude of the centre', unit: 'degrees' }
        ],
        'markers.visible': [
          { backend: 'sdk-call', handle: 'leaflet.glue', path: 'visibleCount', mode: 'invoke',
            label: 'Tracked cities inside the viewport' }
        ]
      },
      events: {
        /* E-3: Leaflet's own events, declared. No polling. */
        'view.moved': {
          backend: 'emitter-listen',
          handle:  'leaflet.map',
          event:   'moveend',
          observe: ['view.center.lat', 'view.center.lng', 'view.zoom'],
          label:   'The map stopped moving'
        },
        'view.zoomed': {
          backend: 'emitter-listen',
          handle:  'leaflet.map',
          event:   'zoomend',
          observe: ['view.zoom'],
          label:   'The zoom level settled'
        }
      }
    };

    /* One state path and two event shapes per city. The rooted event is
       the one that survives the row unmounting (E-5); the bare one is
       declared on purpose so the demo can show the refusal the
       fail-closed rule now produces. */
    CITIES.forEach(function (city) {
      manifest.state['markers.row.' + city.slug] = [
        { backend: 'dom-mirror',
          selector: '[data-marker-row="' + city.slug + '"]',
          extract:  'attribute:data-value',
          label:    'Distance from the centre to ' + city.label,
          unit:     'km' }
      ];
      manifest.events['markers.row.' + city.slug + '.changed'] = {
        backend: 'synthetic-mutation',
        observe: ['markers.row.' + city.slug],
        root:    '[data-grid="markers"]',
        throttle_ms: 50,
        label:   'The distance to ' + city.label + ' changed'
      };
      manifest.events['markers.row.' + city.slug + '.changed_unrooted'] = {
        backend: 'synthetic-mutation',
        observe: ['markers.row.' + city.slug],
        throttle_ms: 50,
        label:   'Same, without a root -- refuses while the row is not painted'
      };
    });

    return manifest;
  }

  global.LeafletNacPlugin = {
    cities: CITIES,

    /* map: an L.Map instance. rowsContainer: the <ul> the per-city
       rows are rendered into. Returns the glue so the page can keep
       the rows in sync; the runtime holds it as a handle. */
    install: function (map, rowsContainer) {
      if (!global.NAC || typeof global.NAC.registerApiHandle !== 'function') {
        throw new Error('leaflet-nac-plugin needs NAC3 >= 2.6 (NAC.registerApiHandle)');
      }
      var glue = makeGlue(map, rowsContainer);
      global.NAC.registerApiHandle('leaflet.map', map);
      global.NAC.registerApiHandle('leaflet.glue', glue);
      global.NAC.registerPlugin('leaflet.map', buildManifest());
      /* The rows follow the real map. Nothing in the protocol does
         this for us: it is the adopter's rendering, same as any list. */
      map.on('moveend zoomend', glue.renderRows);
      glue.renderRows();
      return glue;
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
