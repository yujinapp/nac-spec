<?php
/**
 * NAC v1.8 -- live drivable demo.
 *
 * URL: https://yujin.app/nac-spec/example.php
 * Spec + impl: https://github.com/pkuschnirof/nac-spec
 *
 * What this page demonstrates:
 *   1. Every interactive element is annotated with NAC v1.7+v1.8 attributes
 *      (data-nac-id / data-nac-role / data-nac-state) per spec sec 6.2.
 *   2. NAC v1.8.0 reference impl (vendored js/nac.js) wires the lifecycle
 *      events so a chat assistant, a voice runner, an RPA bot or an
 *      accessibility helper can drive the page programmatically.
 *   3. An autopilot ("Watch Yujin do it") drives the demo end-to-end
 *      via NAC.click / NAC.fill, narrating each step, demonstrating
 *      end-to-end autonomy.
 *   4. A v1.7+v1.8 conformance self-test walks every event family in sec
 *      6.2 and checks the runtime emits the canonical detail shapes.
 *
 * ASCII pure (rule 3 GoDaddy PHP 8.3). No backend deps -- pure
 * static page, served as PHP only so .htaccess + future env-var
 * substitution stay possible without touching the file shape.
 */
$assetVersion = 'v69';
?><!DOCTYPE html>
<html lang="es" data-theme="light">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>NAC v1.8 -- live demo</title>
<meta name="description" content="Live demo of NAC v1.8 -- a public spec for making web UIs drivable by AI assistants, voice runners, and accessibility tools. Drive this page with your voice or with a chat agent.">
<link rel="icon" type="image/svg+xml" href="../assets/favicon.svg">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Noto+Serif+JP:wght@300;400;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="css/example.css?v=<?php echo htmlspecialchars($assetVersion); ?>">
</head>
<body>

<header class="ne-topbar">
  <div class="ne-topbar-inner">
    <div class="ne-brand">
      <span class="ne-kanji" aria-hidden="true">&#27005;</span>
      <span class="ne-brand-text">
        <span class="ne-brand-line1">NAC v1.8</span>
        <span class="ne-brand-line2" data-i18n-key="brand.tagline">drive UIs by voice, chat, AI</span>
      </span>
    </div>
    <nav class="ne-topbar-nav">
      <a href="https://github.com/pkuschnirof/nac-spec" target="_blank" rel="noopener" data-i18n-key="nav.spec">spec</a>
      <a href="https://github.com/pkuschnirof/nac-spec/blob/main/docs/MANUAL.md" target="_blank" rel="noopener" data-i18n-key="nav.manual">manual</a>
      <a href="https://github.com/pkuschnirof/nac-spec/blob/main/CONTRIBUTING.md" target="_blank" rel="noopener" data-i18n-key="nav.contribute">contribute</a>
    </nav>
  </div>
</header>

<main id="ne-app" class="ne-app" data-nac-plugin="example_demo" data-nac-state="idle">

  <section class="ne-intro" data-nac-role="section" data-nac-id="page.section.intro" data-nac-label="Intro">
    <h1 class="ne-h1" data-i18n-key="intro.title">
      Talk to this page. Or click. Or let Yujin do it.
    </h1>
    <p class="ne-lead" data-i18n-key="intro.lead">
      Every button, field and modal here speaks NAC. A voice runner,
      a chat agent or an accessibility tool can drive the page
      without scraping pixels and without DOM hacks. Hit the button
      below and watch the page drive itself.
    </p>
    <p class="ne-lead-cta">
      <button type="button" class="ne-link-btn"
              data-nac-id="play.autopilot" data-nac-role="action"
              data-nac-action="apply" data-nac-state="idle"
              data-i18n-key="intro.watch_btn">
        Watch Yujin do it
      </button>
    </p>
  </section>

  <section class="ne-grid" data-nac-role="section" data-nac-id="page.section.demos" data-nac-label="Live demos">

    <article class="ne-card ne-card-art" aria-labelledby="art-title">
      <header class="ne-card-head">
        <span class="ne-card-kanji" aria-hidden="true">&#22696;</span><!-- 墨 sumi (ink) -->
        <h2 class="ne-h2" id="art-title" data-i18n-key="card.art">Sumi-e gallery</h2>
      </header>
      <p class="ne-card-sub" data-i18n-key="sub.art">3 icons, 3 ink drawings. Click an icon to expand it; click again to minimize.</p>
      <div class="ne-art-row" role="group" aria-label="Sumi-e gallery"
           data-i18n-aria-label-key="card.art">
        <button type="button" class="ne-art-icon"
                data-nac-id="art.sakura"
                data-nac-role="action" data-nac-action="apply"
                data-nac-state="idle" data-art="sakura"
                aria-label="Sakura branch"
                data-i18n-aria-label-key="aria.sakura_branch">&#26716;</button><!-- 桜 -->
        <button type="button" class="ne-art-icon"
                data-nac-id="art.fuji"
                data-nac-role="action" data-nac-action="apply"
                data-nac-state="idle" data-art="fuji"
                aria-label="Mount Fuji"
                data-i18n-aria-label-key="aria.mount_fuji">&#23665;</button><!-- 山 -->
        <button type="button" class="ne-art-icon"
                data-nac-id="art.bamboo"
                data-nac-role="action" data-nac-action="apply"
                data-nac-state="idle" data-art="bamboo"
                aria-label="Bamboo"
                data-i18n-aria-label-key="aria.bamboo">&#31481;</button><!-- 竹 -->
      </div>
      <div class="ne-art-canvas" data-nac-id="art.canvas"
           data-nac-role="region" data-nac-state="empty"
           aria-live="polite" hidden>
        <div class="ne-art-canvas-inner" data-nac-id="art.canvas.body">
          <!-- the active drawing renders here at runtime -->
        </div>
      </div>
    </article>

    <article class="ne-card ne-card-modal" aria-labelledby="modal-title">
      <header class="ne-card-head">
        <span class="ne-card-kanji" aria-hidden="true">&#31192;</span>
        <h2 class="ne-h2" id="modal-title" data-i18n-key="card.modal">Secret modal</h2>
      </header>
      <p class="ne-card-sub" data-i18n-key="sub.modal">Click and watch the lifecycle events fly.</p>
      <button type="button" class="ne-btn ne-btn-primary"
              data-nac-id="secret.open" data-nac-role="action"
              data-nac-action="apply" data-nac-state="idle">
        <span data-i18n-key="btn.open_secret">Open the secret</span>
      </button>
    </article>

    <article class="ne-card ne-card-form" aria-labelledby="form-title">
      <header class="ne-card-head">
        <span class="ne-card-kanji" aria-hidden="true">&#23383;</span>
        <h2 class="ne-h2" id="form-title" data-i18n-key="card.form">Form fields</h2>
      </header>
      <p class="ne-card-sub" data-i18n-key="sub.form">Text, select, checkbox -- all driveable by NAC.fill.</p>

      <label class="ne-label" for="ne-field-name" data-i18n-key="lbl.your_name">Your name</label>
      <input type="text" id="ne-field-name" class="ne-input"
             data-nac-id="field.name" data-nac-role="field"
             data-nac-field-type="text" data-nac-state="pristine"
             placeholder="Type or let Yujin fill it"
             data-i18n-placeholder-key="ph.type_or_yujin">

      <label class="ne-label" for="ne-field-mood" data-i18n-key="lbl.mood">Mood</label>
      <select id="ne-field-mood" class="ne-select"
              data-nac-id="field.mood" data-nac-role="field"
              data-nac-field-type="select" data-nac-state="pristine">
        <option value="" data-i18n-key="opt.pick_one">Pick one</option>
        <option value="curious" data-i18n-key="opt.curious">Curious</option>
        <option value="impressed" data-i18n-key="opt.impressed">Impressed</option>
        <option value="skeptical" data-i18n-key="opt.skeptical">Skeptical</option>
      </select>

      <label class="ne-checkbox">
        <input type="checkbox" id="ne-field-spread"
               data-nac-id="field.spread" data-nac-role="field"
               data-nac-field-type="checkbox" data-nac-state="pristine">
        <span data-i18n-key="lbl.spread_word">I want to spread the word about NAC</span>
      </label>
    </article>

    <article class="ne-card ne-card-tabs" aria-labelledby="tabs-title">
      <header class="ne-card-head">
        <span class="ne-card-kanji" aria-hidden="true">&#27573;</span>
        <h2 class="ne-h2" id="tabs-title" data-i18n-key="card.tabs">Tabs &amp; accordion</h2>
      </header>
      <p class="ne-card-sub" data-i18n-key="sub.tabs">Tablist, tabpanel and accordion-section -- v1.1.</p>

      <div class="ne-tablist" role="tablist"
           data-nac-id="tabs.demo" data-nac-role="tablist">
        <button type="button" class="ne-tab" role="tab"
                data-nac-id="tabs.demo.t1" data-nac-role="tab"
                data-nac-action="apply" data-nac-state="active"
                aria-selected="true" data-i18n-key="tab.overview">Overview</button>
        <button type="button" class="ne-tab" role="tab"
                data-nac-id="tabs.demo.t2" data-nac-role="tab"
                data-nac-action="apply" data-nac-state="idle"
                aria-selected="false" data-i18n-key="tab.details">Details</button>
        <button type="button" class="ne-tab" role="tab"
                data-nac-id="tabs.demo.t3" data-nac-role="tab"
                data-nac-action="apply" data-nac-state="idle"
                aria-selected="false" data-i18n-key="tab.history">History</button>
      </div>

      <div class="ne-tabpanel" role="tabpanel"
           data-nac-id="tabs.demo.t1.panel" data-nac-role="tabpanel"
           data-nac-state="active" data-i18n-key="tabpanel.overview">
        Overview content. Try saying "passa a la tab Details".
      </div>
      <div class="ne-tabpanel" role="tabpanel" hidden
           data-nac-id="tabs.demo.t2.panel" data-nac-role="tabpanel"
           data-nac-state="idle">
        <span data-i18n-key="tabpanel.details_intro">Details content. Three accordion sections below.</span>
        <div class="ne-accordion">
          <div class="ne-acc-section"
               data-nac-id="acc.s1" data-nac-role="accordion-section"
               data-nac-state="collapsed">
            <button type="button" class="ne-acc-head"
                    data-nac-id="acc.s1.toggle" data-nac-role="action"
                    data-nac-action="apply" aria-expanded="false">
              <span data-i18n-key="acc.section_a">Section A</span> <span class="ne-acc-caret">&#9656;</span>
            </button>
            <div class="ne-acc-body" hidden data-i18n-key="acc.section_a_body">
              Hidden content. Open me with NAC.expand("acc.s1").
            </div>
          </div>
          <div class="ne-acc-section"
               data-nac-id="acc.s2" data-nac-role="accordion-section"
               data-nac-state="collapsed">
            <button type="button" class="ne-acc-head"
                    data-nac-id="acc.s2.toggle" data-nac-role="action"
                    data-nac-action="apply" aria-expanded="false">
              <span data-i18n-key="acc.section_b">Section B</span> <span class="ne-acc-caret">&#9656;</span>
            </button>
            <div class="ne-acc-body" hidden data-i18n-key="acc.section_b_body">
              More hidden content.
            </div>
          </div>
        </div>
      </div>
      <div class="ne-tabpanel" role="tabpanel" hidden
           data-nac-id="tabs.demo.t3.panel" data-nac-role="tabpanel"
           data-nac-state="idle" data-i18n-key="tabpanel.history">
        History content. Empty for now.
      </div>
    </article>

    <article class="ne-card ne-card-combo" aria-labelledby="combo-title">
      <header class="ne-card-head">
        <span class="ne-card-kanji" aria-hidden="true">&#36984;</span>
        <h2 class="ne-h2" id="combo-title" data-i18n-key="card.combo">Combobox &amp; slider</h2>
      </header>
      <p class="ne-card-sub" data-i18n-key="sub.combo">Autocomplete + continuous range -- v1.1.</p>

      <label class="ne-label" for="ne-field-country" data-i18n-key="lbl.country">Country (autocomplete)</label>
      <div class="ne-combo-wrap">
        <input type="text" id="ne-field-country" class="ne-input"
               data-nac-id="field.country" data-nac-role="field"
               data-nac-field-type="combobox" data-nac-state="pristine"
               role="combobox" aria-autocomplete="list"
               aria-expanded="false" aria-controls="ne-combo-list"
               placeholder="Try: Argen, Brazil, France"
               data-i18n-placeholder-key="ph.try_country">
        <ul class="ne-combo-list" id="ne-combo-list" role="listbox"
            data-nac-id="field.country.list" data-nac-role="region"
            hidden></ul>
      </div>

      <label class="ne-label" for="ne-field-volume">
        <span data-i18n-key="lbl.volume">Volume:</span>&nbsp;<span data-nac-id="field.volume.read" data-nac-role="region">50</span>%
      </label>
      <input type="range" id="ne-field-volume" class="ne-slider"
             data-nac-id="field.volume" data-nac-role="slider"
             data-nac-field-type="range" data-nac-state="pristine"
             min="0" max="100" step="1" value="50"
             aria-valuemin="0" aria-valuemax="100" aria-valuenow="50">
    </article>

    <article class="ne-card ne-card-table" aria-labelledby="table-title">
      <header class="ne-card-head">
        <span class="ne-card-kanji" aria-hidden="true">&#34920;</span>
        <h2 class="ne-h2" id="table-title" data-i18n-key="card.table">Sortable / filterable table</h2>
      </header>
      <p class="ne-card-sub" data-i18n-key="sub.table">sort-control, filter-control, pagination-control -- v1.1.</p>

      <input type="text" class="ne-input ne-table-filter"
             data-nac-id="table.demo.filter" data-nac-role="filter-control"
             data-nac-state="idle"
             placeholder="Filter by name..."
             aria-label="Filter table"
             data-i18n-placeholder-key="ph.filter_name"
             data-i18n-aria-label-key="aria.filter_table">

      <table class="ne-table" data-nac-id="table.demo"
             data-nac-role="region">
        <thead>
          <tr>
            <th><button type="button" class="ne-th-btn"
                        data-nac-id="table.demo.sort.name"
                        data-nac-role="sort-control"
                        data-nac-action="apply" data-nac-state="idle"
                        data-sort-key="name" data-sort-dir="none">
              <span data-i18n-key="th.name">Name</span> <span class="ne-th-caret">&#8645;</span>
            </button></th>
            <th><button type="button" class="ne-th-btn"
                        data-nac-id="table.demo.sort.age"
                        data-nac-role="sort-control"
                        data-nac-action="apply" data-nac-state="idle"
                        data-sort-key="age" data-sort-dir="none">
              <span data-i18n-key="th.age">Age</span> <span class="ne-th-caret">&#8645;</span>
            </button></th>
            <th><button type="button" class="ne-th-btn"
                        data-nac-id="table.demo.sort.city"
                        data-nac-role="sort-control"
                        data-nac-action="apply" data-nac-state="idle"
                        data-sort-key="city" data-sort-dir="none">
              <span data-i18n-key="th.city">City</span> <span class="ne-th-caret">&#8645;</span>
            </button></th>
          </tr>
        </thead>
        <tbody data-nac-id="table.demo.body" data-nac-role="region">
          <!-- rows rendered by JS -->
        </tbody>
      </table>

      <div class="ne-pagination" data-nac-id="table.demo.pagination"
           data-nac-role="pagination-control" data-nac-state="idle">
        <button type="button" class="ne-btn ne-btn-sm"
                data-nac-id="table.demo.page.prev"
                data-nac-role="action" data-nac-action="prev"
                data-nac-state="disabled" data-i18n-key="btn.prev">Prev</button>
        <span class="ne-page-label">
          <span data-i18n-key="lbl.page">Page</span> <span data-nac-id="table.demo.page.current">1</span>
          / <span data-nac-id="table.demo.page.total">2</span>
        </span>
        <button type="button" class="ne-btn ne-btn-sm"
                data-nac-id="table.demo.page.next"
                data-nac-role="action" data-nac-action="next"
                data-nac-state="idle" data-i18n-key="btn.next_short">Next</button>
      </div>
    </article>

    <article class="ne-card ne-card-drag" aria-labelledby="drag-title">
      <header class="ne-card-head">
        <span class="ne-card-kanji" aria-hidden="true">&#36716;</span>
        <h2 class="ne-h2" id="drag-title" data-i18n-key="card.drag">Drag &amp; drop + file zone</h2>
      </header>
      <p class="ne-card-sub" data-i18n-key="sub.drag">draggable, drop-target, dropzone -- v1.1.</p>

      <div class="ne-drag-board">
        <ul class="ne-drag-list" data-nac-id="drag.list.left"
            data-nac-role="drop-target" data-nac-state="idle">
          <li class="ne-drag-item" draggable="true"
              data-nac-id="drag.item.alpha"
              data-nac-role="draggable" data-nac-state="idle">Alpha</li>
          <li class="ne-drag-item" draggable="true"
              data-nac-id="drag.item.beta"
              data-nac-role="draggable" data-nac-state="idle">Beta</li>
          <li class="ne-drag-item" draggable="true"
              data-nac-id="drag.item.gamma"
              data-nac-role="draggable" data-nac-state="idle">Gamma</li>
        </ul>
        <ul class="ne-drag-list ne-drag-list-right"
            data-nac-id="drag.list.right"
            data-nac-role="drop-target" data-nac-state="idle">
          <li class="ne-drag-empty" data-i18n-key="drag.drop_here">drop here</li>
        </ul>
      </div>

      <div class="ne-dropzone" data-nac-id="upload.zone"
           data-nac-role="dropzone" data-nac-state="idle">
        <span class="ne-dropzone-text">
          <span data-i18n-key="dropzone.line1">Drop a file here, or click to pick.</span>
          <small data-i18n-key="dropzone.line2">(no real upload -- demo only)</small>
        </span>
        <input type="file" class="ne-dropzone-input"
               data-nac-id="upload.input" data-nac-role="field"
               data-nac-field-type="file" data-nac-state="pristine"
               aria-label="File upload"
               data-i18n-aria-label-key="aria.file_upload">
      </div>
    </article>

    <article class="ne-card ne-card-remote" data-nac-plugin="cities" data-nac-state="normal" aria-labelledby="remote-title">
      <header class="ne-card-head">
        <span class="ne-card-kanji" aria-hidden="true">&#37117;</span>
        <h2 class="ne-h2" id="remote-title" data-i18n-key="card.remote">Remote autocomplete</h2>
        <div class="ne-chrome">
          <button class="ne-chrome-btn" data-nac-id="cities.minimize" data-nac-role="action"
                  data-nac-action="minimize" aria-label="Minimize"
                  data-i18n-aria-label-key="aria.minimize" type="button">_</button>
          <button class="ne-chrome-btn" data-nac-id="cities.maximize" data-nac-role="action"
                  data-nac-action="maximize" aria-label="Maximize"
                  data-i18n-aria-label-key="aria.maximize" type="button">[ ]</button>
          <button class="ne-chrome-btn" data-nac-id="cities.restore" data-nac-role="action"
                  data-nac-action="restore" aria-label="Restore"
                  data-i18n-aria-label-key="aria.restore" type="button">o</button>
        </div>
      </header>
      <p class="ne-card-sub" data-i18n-key="sub.remote">5000 cities, server-fetched. options_source=remote -- v1.2.</p>
      <div class="ne-combobox-wrap">
        <input type="text" class="ne-combobox" data-nac-id="cities.search"
               data-nac-role="field" data-nac-field-type="combobox" data-nac-state="normal"
               placeholder="Type at least 2 chars..." aria-label="Search city" autocomplete="off"
               data-i18n-placeholder-key="ph.type_2_chars"
               data-i18n-aria-label-key="aria.search_city">
        <ul class="ne-combo-list" data-nac-id="cities.list" data-nac-role="listbox"
            data-nac-state="collapsed" aria-label="City suggestions"
            data-i18n-aria-label-key="aria.city_suggestions"></ul>
      </div>
      <div class="ne-remote-info">
        <span data-nac-id="cities.status" data-nac-role="status" data-nac-state="ready"
              aria-live="polite" data-i18n-key="status.ready_search">Ready. Type to search.</span>
        <span class="ne-remote-pick"><span data-i18n-key="lbl.picked">Picked:</span> <strong data-nac-id="cities.picked" data-nac-role="value" data-i18n-key="status.none_paren">(none)</strong></span>
      </div>
    </article>

    <article class="ne-card ne-card-navmap" data-nac-plugin="navmap" data-nac-state="normal" aria-labelledby="navmap-title">
      <header class="ne-card-head">
        <span class="ne-card-kanji" aria-hidden="true">&#22320;</span>
        <h2 class="ne-h2" id="navmap-title" data-i18n-key="card.navmap">System map</h2>
        <div class="ne-chrome">
          <button class="ne-chrome-btn" data-nac-id="navmap.minimize" data-nac-role="action"
                  data-nac-action="minimize" aria-label="Minimize"
                  data-i18n-aria-label-key="aria.minimize" type="button">_</button>
          <button class="ne-chrome-btn" data-nac-id="navmap.maximize" data-nac-role="action"
                  data-nac-action="maximize" aria-label="Maximize"
                  data-i18n-aria-label-key="aria.maximize" type="button">[ ]</button>
          <button class="ne-chrome-btn" data-nac-id="navmap.restore" data-nac-role="action"
                  data-nac-action="restore" aria-label="Restore"
                  data-i18n-aria-label-key="aria.restore" type="button">o</button>
        </div>
      </header>
      <p class="ne-card-sub" data-i18n-key="sub.navmap">First-contact discovery: views, transitions, capabilities -- v1.2.</p>
      <div class="ne-navmap-row">
        <button class="ne-btn" data-nac-id="navmap.fetch" data-nac-role="action"
                data-nac-action="fetch_map" type="button">NAC.system_map()</button>
        <button class="ne-btn ne-btn-ghost" data-nac-id="navmap.caps" data-nac-role="action"
                data-nac-action="fetch_capabilities" type="button">NAC.capabilities()</button>
      </div>
      <pre class="ne-navmap-pre" data-nac-id="navmap.output" data-nac-role="region"
           aria-label="System map output"
           data-i18n-aria-label-key="aria.navmap_output"
           data-i18n-key="placeholder.empty_click_button">(empty -- click a button)</pre>
    </article>

    <article class="ne-card ne-card-selftest" data-nac-plugin="selftest" data-nac-state="normal" aria-labelledby="selftest-title">
      <header class="ne-card-head">
        <span class="ne-card-kanji" aria-hidden="true">&#35430;</span>
        <h2 class="ne-h2" id="selftest-title" data-i18n-key="card.selftest">Self-test &amp; introspect</h2>
        <div class="ne-chrome">
          <button class="ne-chrome-btn" data-nac-id="selftest.minimize" data-nac-role="action" data-nac-action="minimize" type="button">_</button>
          <button class="ne-chrome-btn" data-nac-id="selftest.maximize" data-nac-role="action" data-nac-action="maximize" type="button">[ ]</button>
          <button class="ne-chrome-btn" data-nac-id="selftest.restore"  data-nac-role="action" data-nac-action="restore"  type="button">o</button>
        </div>
      </header>
      <p class="ne-card-sub" data-i18n-key="sub.selftest">Run the runner against this same page. See the system map. Take an AI agent tour.</p>
      <div class="ne-selftest-row">
        <button class="ne-btn" data-nac-id="selftest.show_navmap" data-nac-role="action"
                data-nac-action="fetch_map" type="button" data-i18n-key="btn.show_navmap">Show navmap</button>
        <button class="ne-btn ne-btn-ghost" data-nac-id="selftest.show_caps" data-nac-role="action"
                data-nac-action="fetch_capabilities" type="button" data-i18n-key="btn.show_caps">Show capabilities</button>
        <button class="ne-btn ne-btn-ghost" data-nac-id="selftest.list_sections" data-nac-role="action"
                data-nac-action="list_sections" type="button" data-i18n-key="btn.list_sections">List sections</button>
      </div>
      <div class="ne-selftest-row">
        <button class="ne-btn ne-btn-primary" data-nac-id="selftest.run_tests" data-nac-role="action"
                data-nac-action="run_tests" type="button" data-i18n-key="btn.run_self_test">Run NAC self-test</button>
        <button class="ne-btn" data-nac-id="selftest.agent_tour" data-nac-role="action"
                data-nac-action="agent_tour" type="button" data-i18n-key="btn.agent_tour">AI agent: tour the page</button>
        <button class="ne-btn" data-nac-id="selftest.event_conformance" data-nac-role="action"
                data-nac-action="event_conformance" type="button" data-i18n-key="btn.event_conformance">v1.7 event conformance</button>
      </div>
      <pre class="ne-selftest-output" data-nac-id="selftest.output" data-nac-role="region"
           aria-live="polite" aria-label="Self-test output"
           data-i18n-aria-label-key="aria.selftest_output"
           data-i18n-key="placeholder.empty_click_any_button">(empty -- click any button)</pre>
      <details class="ne-selftest-gaps" data-nac-id="selftest.gaps" data-nac-role="region"
               data-nac-state="collapsed">
        <summary data-i18n-key="lbl.gap_report">Gap report</summary>
        <ol class="ne-selftest-gap-list" data-nac-id="selftest.gaps.list"></ol>
      </details>
    </article>

    <article class="ne-card ne-card-events" aria-labelledby="events-title">
      <header class="ne-card-head">
        <span class="ne-card-kanji" aria-hidden="true">&#35023;</span>
        <h2 class="ne-h2" id="events-title" data-i18n-key="card.events">NAC events live</h2>
      </header>
      <p class="ne-card-sub" data-i18n-key="sub.events">Every interaction emits a NAC lifecycle event. Watch.</p>
      <ol class="ne-events-log" data-nac-id="events.log" data-nac-role="region"
          aria-live="polite" aria-relevant="additions"></ol>
    </article>

    <!-- v1.7 widget showcase: cada card cubre una event-family de
         spec sec 6.2 con shape canonica. El self-test las recorre
         y verifica las shapes. -->
    <article class="ne-card ne-card-stepper ne-v17" data-nac-plugin="stepper_demo">
      <header class="ne-card-head">
        <span class="ne-card-kanji" aria-hidden="true">&#27497;</span>
        <h2 class="ne-h2" data-i18n-key="card.stepper">Stepper -- sumi-e cycler</h2>
      </header>
      <p class="ne-card-sub" data-i18n-key="sub.stepper">v1.7 sec 6.2.8 -- nac:step:advanced / :back</p>
      <div data-nac-id="stepper.demo" data-nac-role="stepper">
        <div class="ne-stepper-canvas" data-nac-id="stepper.demo.canvas"
             data-nac-role="region"></div>
        <div class="ne-stepper-meta">
          <span data-nac-id="stepper.demo.display">Sakura -- step 1 of 3</span>
        </div>
        <div class="ne-row">
          <button class="ne-btn ne-btn-ghost" type="button"
                  data-nac-id="stepper.demo.back" data-nac-role="action"
                  data-nac-action="back" data-i18n-key="btn.back">&laquo; Back</button>
          <button class="ne-btn" type="button"
                  data-nac-id="stepper.demo.next" data-nac-role="action"
                  data-nac-action="next" data-i18n-key="btn.next">Next &raquo;</button>
        </div>
      </div>
    </article>

    <article class="ne-card ne-card-tree" data-nac-plugin="tree_demo">
      <header class="ne-card-head">
        <h2 class="ne-h2" data-i18n-key="card.tree">Tree</h2>
      </header>
      <p class="ne-card-sub" data-i18n-key="sub.tree">v1.7 sec 6.2.9 -- nac:tree:expanded/collapsed/selected</p>
      <ul data-nac-id="tree.demo" data-nac-role="tree">
        <li data-nac-id="tree.demo.fruits" data-nac-role="tree-node"
            data-nac-state="collapsed">
          <button class="ne-tree-toggle" type="button"
                  data-nac-id="tree.demo.fruits.toggle"
                  data-nac-role="action" data-nac-action="toggle"
                  data-tree-toggle="fruits"
                  aria-label="Toggle Fruits node"
                  data-i18n-aria-label-key="aria.toggle_fruits">+</button>
          <span class="ne-tree-label" data-i18n-key="tree.fruits">Fruits</span>
          <ul class="ne-tree-children" hidden>
            <li data-nac-id="tree.demo.apple" data-nac-role="tree-node"
                data-nac-state="idle" data-i18n-key="tree.apple">Apple</li>
            <li data-nac-id="tree.demo.pear"  data-nac-role="tree-node"
                data-nac-state="idle" data-i18n-key="tree.pear">Pear</li>
            <li data-nac-id="tree.demo.citrus" data-nac-role="tree-node"
                data-nac-state="collapsed">
              <button class="ne-tree-toggle" type="button"
                      data-nac-id="tree.demo.citrus.toggle"
                      data-nac-role="action" data-nac-action="toggle"
                      data-tree-toggle="citrus"
                      aria-label="Toggle Citrus node"
                      data-i18n-aria-label-key="aria.toggle_citrus">+</button>
              <span class="ne-tree-label" data-i18n-key="tree.citrus">Citrus</span>
              <ul class="ne-tree-children" hidden>
                <li data-nac-id="tree.demo.lemon" data-nac-role="tree-node"
                    data-nac-state="idle" data-i18n-key="tree.lemon">Lemon</li>
                <li data-nac-id="tree.demo.orange" data-nac-role="tree-node"
                    data-nac-state="idle" data-i18n-key="tree.orange">Orange</li>
                <li data-nac-id="tree.demo.lime" data-nac-role="tree-node"
                    data-nac-state="idle" data-i18n-key="tree.lime">Lime</li>
              </ul>
            </li>
          </ul>
        </li>
        <li data-nac-id="tree.demo.veggies" data-nac-role="tree-node"
            data-nac-state="collapsed">
          <button class="ne-tree-toggle" type="button"
                  data-nac-id="tree.demo.veggies.toggle"
                  data-nac-role="action" data-nac-action="toggle"
                  data-tree-toggle="veggies"
                  aria-label="Toggle Vegetables node"
                  data-i18n-aria-label-key="aria.toggle_veggies">+</button>
          <span class="ne-tree-label" data-i18n-key="tree.veggies">Vegetables</span>
          <ul class="ne-tree-children" hidden>
            <li data-nac-id="tree.demo.carrot" data-nac-role="tree-node"
                data-nac-state="idle" data-i18n-key="tree.carrot">Carrot</li>
            <li data-nac-id="tree.demo.potato" data-nac-role="tree-node"
                data-nac-state="idle" data-i18n-key="tree.potato">Potato</li>
            <li data-nac-id="tree.demo.greens" data-nac-role="tree-node"
                data-nac-state="collapsed">
              <button class="ne-tree-toggle" type="button"
                      data-nac-id="tree.demo.greens.toggle"
                      data-nac-role="action" data-nac-action="toggle"
                      data-tree-toggle="greens"
                      aria-label="Toggle Greens node"
                      data-i18n-aria-label-key="aria.toggle_greens">+</button>
              <span class="ne-tree-label" data-i18n-key="tree.greens">Greens</span>
              <ul class="ne-tree-children" hidden>
                <li data-nac-id="tree.demo.spinach" data-nac-role="tree-node"
                    data-nac-state="idle" data-i18n-key="tree.spinach">Spinach</li>
                <li data-nac-id="tree.demo.kale" data-nac-role="tree-node"
                    data-nac-state="idle" data-i18n-key="tree.kale">Kale</li>
              </ul>
            </li>
          </ul>
        </li>
        <li data-nac-id="tree.demo.grains" data-nac-role="tree-node"
            data-nac-state="collapsed">
          <button class="ne-tree-toggle" type="button"
                  data-nac-id="tree.demo.grains.toggle"
                  data-nac-role="action" data-nac-action="toggle"
                  data-tree-toggle="grains"
                  aria-label="Toggle Grains node"
                  data-i18n-aria-label-key="aria.toggle_grains">+</button>
          <span class="ne-tree-label" data-i18n-key="tree.grains">Grains</span>
          <ul class="ne-tree-children" hidden>
            <li data-nac-id="tree.demo.rice" data-nac-role="tree-node"
                data-nac-state="idle" data-i18n-key="tree.rice">Rice</li>
            <li data-nac-id="tree.demo.wheat" data-nac-role="tree-node"
                data-nac-state="idle" data-i18n-key="tree.wheat">Wheat</li>
            <li data-nac-id="tree.demo.oats" data-nac-role="tree-node"
                data-nac-state="idle" data-i18n-key="tree.oats">Oats</li>
          </ul>
        </li>
      </ul>
    </article>

    <article class="ne-card ne-card-toast" data-nac-plugin="toast_demo">
      <header class="ne-card-head">
        <h2 class="ne-h2" data-i18n-key="card.toast">Toast</h2>
      </header>
      <p class="ne-card-sub" data-i18n-key="sub.toast">v1.7 sec 6.2.10 -- nac:toast:shown/dismissed</p>
      <div class="ne-row">
        <button class="ne-btn" type="button"
                data-nac-id="toast.demo.fire" data-nac-role="action"
                data-nac-action="fire_toast" data-i18n-key="btn.fire_toast">Fire toast</button>
      </div>
      <div class="ne-toast-host" data-nac-id="toast.demo" data-nac-role="region"></div>
    </article>

    <article class="ne-card ne-card-drawer" data-nac-plugin="drawer_demo">
      <header class="ne-card-head">
        <h2 class="ne-h2" data-i18n-key="card.drawer">Drawer</h2>
      </header>
      <p class="ne-card-sub" data-i18n-key="sub.drawer">v1.7 sec 6.2.11 -- nac:drawer:opened/closed</p>
      <div class="ne-row">
        <button class="ne-btn" type="button"
                data-nac-id="drawer.demo.open" data-nac-role="action"
                data-nac-action="open" data-i18n-key="btn.open_drawer">Open drawer</button>
      </div>
      <aside data-nac-id="drawer.demo" data-nac-role="drawer"
             data-nac-state="closed" hidden>
        <header data-i18n-key="lbl.drawer_content">Drawer content</header>
        <p data-i18n-key="text.drawer_body">Lorem ipsum drawer body.</p>
        <button class="ne-btn ne-btn-ghost" type="button"
                data-nac-id="drawer.demo.close" data-nac-role="action"
                data-nac-action="close" data-i18n-key="btn.close">Close</button>
      </aside>
    </article>

    <article class="ne-card ne-card-calendar" data-nac-plugin="calendar_demo">
      <header class="ne-card-head">
        <h2 class="ne-h2" data-i18n-key="card.calendar">Calendar</h2>
      </header>
      <p class="ne-card-sub" data-i18n-key="sub.calendar">v1.7 sec 6.2.12 -- nac:calendar:view_changed/event_selected</p>
      <div class="ne-row">
        <button class="ne-btn ne-btn-ghost" type="button"
                data-nac-id="calendar.demo.view.month" data-nac-role="action"
                data-nac-action="view_month" data-cal-view="month"
                data-i18n-key="cal.view_month">Month</button>
        <button class="ne-btn ne-btn-ghost" type="button"
                data-nac-id="calendar.demo.view.week" data-nac-role="action"
                data-nac-action="view_week" data-cal-view="week"
                aria-pressed="true" data-i18n-key="cal.view_week">Week</button>
        <button class="ne-btn ne-btn-ghost" type="button"
                data-nac-id="calendar.demo.view.day" data-nac-role="action"
                data-nac-action="view_day" data-cal-view="day"
                data-i18n-key="cal.view_day">Day</button>
      </div>
      <div class="ne-cal-grid" data-nac-id="calendar.demo"
           data-nac-role="calendar" data-cal-view="week"
           aria-label="Week calendar grid"
           data-i18n-aria-label-key="aria.week_cal_grid">
        <div class="ne-cal-day" data-day="Mon">
          <span class="ne-cal-day-label" data-i18n-key="day.mon">Mon</span>
          <span class="ne-cal-day-num">04</span>
        </div>
        <div class="ne-cal-day" data-day="Tue">
          <span class="ne-cal-day-label" data-i18n-key="day.tue">Tue</span>
          <span class="ne-cal-day-num">05</span>
        </div>
        <div class="ne-cal-day" data-day="Wed">
          <span class="ne-cal-day-label" data-i18n-key="day.wed">Wed</span>
          <span class="ne-cal-day-num">06</span>
        </div>
        <div class="ne-cal-day" data-day="Thu">
          <span class="ne-cal-day-label" data-i18n-key="day.thu">Thu</span>
          <span class="ne-cal-day-num">07</span>
        </div>
        <div class="ne-cal-day ne-cal-day-today" data-day="Fri">
          <span class="ne-cal-day-label" data-i18n-key="day.fri">Fri</span>
          <span class="ne-cal-day-num">08</span>
          <span class="ne-cal-event-dot"
                data-nac-id="calendar.demo.event.1" data-nac-role="calendar-event"
                title="Standup 09:00"
                data-i18n-title-key="cal.evt_standup">&bull;</span>
        </div>
        <div class="ne-cal-day" data-day="Sat">
          <span class="ne-cal-day-label" data-i18n-key="day.sat">Sat</span>
          <span class="ne-cal-day-num">09</span>
          <span class="ne-cal-event-dot"
                data-nac-id="calendar.demo.event.2" data-nac-role="calendar-event"
                title="Demo 14:00"
                data-i18n-title-key="cal.evt_demo">&bull;</span>
        </div>
        <div class="ne-cal-day" data-day="Sun">
          <span class="ne-cal-day-label" data-i18n-key="day.sun">Sun</span>
          <span class="ne-cal-day-num">10</span>
        </div>
      </div>
      <p class="ne-card-foot ne-cal-status" data-nac-id="calendar.demo.status"
         data-nac-role="feedback" data-nac-state="idle"
         data-i18n-key="cal.status_default">View: week, 2 events</p>
    </article>

    <article class="ne-card ne-card-chart" data-nac-plugin="chart_demo">
      <header class="ne-card-head">
        <h2 class="ne-h2" data-i18n-key="card.chart">Chart</h2>
      </header>
      <p class="ne-card-sub" data-i18n-key="sub.chart">v1.7 sec 6.2.13 -- nac:chart:data_loaded/series_toggled</p>
      <div class="ne-row">
        <button class="ne-btn ne-btn-ghost" type="button"
                data-nac-id="chart.demo.series.alpha" data-nac-role="action"
                data-nac-action="toggle_series" data-series-id="alpha"
                aria-pressed="true">Alpha</button>
        <button class="ne-btn ne-btn-ghost" type="button"
                data-nac-id="chart.demo.series.beta" data-nac-role="action"
                data-nac-action="toggle_series" data-series-id="beta"
                aria-pressed="true">Beta</button>
        <button class="ne-btn" type="button"
                data-nac-id="chart.demo.reload" data-nac-role="action"
                data-nac-action="reload" data-i18n-key="btn.reload_data">Reload data</button>
      </div>
      <div class="ne-chart-canvas" data-nac-id="chart.demo"
           data-nac-role="chart" data-nac-state="loaded"
           aria-label="Two-series bar chart"
           data-i18n-aria-label-key="aria.chart_two_series">
        <svg viewBox="0 0 320 120" xmlns="http://www.w3.org/2000/svg"
             class="ne-chart-svg" role="img" aria-hidden="true">
          <g class="ne-chart-axis">
            <line x1="20" y1="100" x2="310" y2="100" />
            <line x1="20" y1="20"  x2="20"  y2="100" />
          </g>
          <g class="ne-chart-bars" data-series-id="alpha"
             data-active="1"></g>
          <g class="ne-chart-bars" data-series-id="beta"
             data-active="1"></g>
        </svg>
      </div>
      <p class="ne-card-foot ne-chart-status" data-nac-id="chart.demo.status"
         data-nac-role="feedback" data-nac-state="idle"
         data-i18n-key="chart.status_default">2 series, 6 points each</p>
    </article>

    <article class="ne-card ne-card-map" data-nac-plugin="map_demo">
      <header class="ne-card-head">
        <h2 class="ne-h2" data-i18n-key="card.map">Map</h2>
      </header>
      <p class="ne-card-sub" data-i18n-key="sub.map">v1.7 sec 6.2.14 -- nac:map:focused/marker_selected</p>
      <div class="ne-map-canvas" data-nac-id="map.demo"
           data-nac-role="map" data-nac-state="loaded"
           aria-label="World map with three sumi-e markers"
           data-i18n-aria-label-key="aria.map_world">
        <svg viewBox="0 0 360 180" xmlns="http://www.w3.org/2000/svg"
             class="ne-map-svg" role="img" aria-hidden="true">
          <!-- ink-style continents (rough silhouettes, sumi-e brush) -->
          <g class="ne-map-land">
            <!-- North America -->
            <path d="M30 40 Q40 30 60 32 L80 28 Q95 32 100 50 L95 70 Q80 78 60 75 L45 85 Q35 75 30 60 Z" />
            <!-- South America -->
            <path d="M75 90 Q85 88 92 100 L95 130 Q88 150 80 152 L72 130 Q70 110 75 90 Z" />
            <!-- Europe -->
            <path d="M165 40 Q180 35 195 42 L200 55 Q190 65 175 60 L168 52 Z" />
            <!-- Africa -->
            <path d="M170 70 Q185 68 195 75 L200 105 Q190 130 180 132 L172 115 Q168 95 170 70 Z" />
            <!-- Asia -->
            <path d="M200 30 Q230 25 270 32 L295 45 Q300 60 285 70 L260 75 Q235 70 215 60 L205 50 Z" />
            <!-- Australia -->
            <path d="M275 110 Q295 108 305 118 L300 130 Q285 132 275 125 Z" />
          </g>
          <!-- markers -->
          <g class="ne-map-markers">
            <!-- Buenos Aires ~ x=85, y=140 -->
            <circle data-marker-id="ba" cx="85" cy="140" r="5" />
            <text x="85" y="155" text-anchor="middle">BA</text>
            <!-- Berlin ~ x=183, y=48 -->
            <circle data-marker-id="berlin" cx="183" cy="48" r="5" />
            <text x="183" y="35" text-anchor="middle">Berlin</text>
            <!-- Tokyo ~ x=290, y=58 -->
            <circle data-marker-id="tokyo" cx="290" cy="58" r="5" />
            <text x="290" y="75" text-anchor="middle">Tokyo</text>
          </g>
        </svg>
      </div>
      <div class="ne-row">
        <button class="ne-btn ne-btn-ghost" type="button"
                data-nac-id="map.demo.marker.ba" data-nac-role="action"
                data-nac-action="select_marker" data-marker-id="ba">BA</button>
        <button class="ne-btn ne-btn-ghost" type="button"
                data-nac-id="map.demo.marker.tokyo" data-nac-role="action"
                data-nac-action="select_marker" data-marker-id="tokyo">Tokyo</button>
        <button class="ne-btn ne-btn-ghost" type="button"
                data-nac-id="map.demo.marker.berlin" data-nac-role="action"
                data-nac-action="select_marker" data-marker-id="berlin">Berlin</button>
      </div>
      <p class="ne-card-foot ne-map-status" data-nac-id="map.demo.status"
         data-nac-role="feedback" data-nac-state="idle"
         data-i18n-key="map.status_default">No marker selected</p>
    </article>

    <article class="ne-card ne-card-richtext" data-nac-plugin="richtext_demo">
      <header class="ne-card-head">
        <h2 class="ne-h2" data-i18n-key="card.richtext">Richtext</h2>
      </header>
      <p class="ne-card-sub" data-i18n-key="sub.richtext">v1.7 sec 6.2.15 -- nac:richtext:formatted/link_inserted</p>
      <div class="ne-row">
        <button class="ne-btn ne-btn-ghost" type="button"
                data-nac-id="richtext.demo.bold" data-nac-role="action"
                data-nac-action="format_bold" data-format="bold"><b>B</b></button>
        <button class="ne-btn ne-btn-ghost" type="button"
                data-nac-id="richtext.demo.italic" data-nac-role="action"
                data-nac-action="format_italic" data-format="italic"><i>I</i></button>
        <button class="ne-btn ne-btn-ghost" type="button"
                data-nac-id="richtext.demo.link" data-nac-role="action"
                data-nac-action="insert_link" data-i18n-key="btn.link">Link</button>
      </div>
      <div data-nac-id="richtext.demo" data-nac-role="richtext"
           contenteditable="true" data-i18n-key="richtext.placeholder">Type here. Use B/I/Link buttons.</div>
    </article>

    <article class="ne-card ne-card-breadcrumb" data-nac-plugin="breadcrumb_demo">
      <header class="ne-card-head">
        <h2 class="ne-h2" data-i18n-key="card.breadcrumb">Breadcrumb</h2>
      </header>
      <p class="ne-card-sub" data-i18n-key="sub.breadcrumb">v1.7 sec 6.2.16 -- nac:breadcrumb:navigated</p>
      <nav data-nac-id="breadcrumb.demo" data-nac-role="breadcrumb">
        <button class="ne-crumb" type="button" data-nac-id="breadcrumb.demo.0"
                data-nac-role="breadcrumb-item" data-crumb-index="0"
                data-i18n-key="crumb.home">Home</button>
        <span class="ne-crumb-sep">/</span>
        <button class="ne-crumb" type="button" data-nac-id="breadcrumb.demo.1"
                data-nac-role="breadcrumb-item" data-crumb-index="1"
                data-i18n-key="crumb.catalogue">Catalogue</button>
        <span class="ne-crumb-sep">/</span>
        <button class="ne-crumb" type="button" data-nac-id="breadcrumb.demo.2"
                data-nac-role="breadcrumb-item" data-crumb-index="2"
                aria-current="page" data-i18n-key="crumb.item_42">Item 42</button>
      </nav>
      <p class="ne-crumb-preview" data-nac-id="breadcrumb.demo.preview"
         data-nac-role="feedback" data-nac-state="idle">
        <span data-i18n-key="crumb.preview_label">Showing:</span>
        <strong data-nac-id="breadcrumb.demo.preview.label"
                data-i18n-key="crumb.item_42">Item 42</strong>
      </p>
    </article>

    <article class="ne-card ne-card-carousel" data-nac-plugin="carousel_demo">
      <header class="ne-card-head">
        <h2 class="ne-h2" data-i18n-key="card.carousel">Carousel</h2>
      </header>
      <p class="ne-card-sub" data-i18n-key="sub.carousel">v1.7 sec 6.2.17 -- nac:carousel:advanced</p>
      <div data-nac-id="carousel.demo" data-nac-role="carousel" data-cur="0">
        <div class="ne-carousel-track">
          <div class="ne-carousel-slide" data-active="1"
               data-nac-id="carousel.demo.slide.0" data-nac-role="carousel-slide">
            <div class="ne-carousel-art" data-art="sakura"></div>
            <h3 class="ne-h3" data-i18n-key="carousel.sakura_title">Sakura</h3>
            <p class="ne-carousel-blurb" data-i18n-key="carousel.sakura_blurb">Cherry blossom in ink. Index 0 of 3.</p>
          </div>
          <div class="ne-carousel-slide"
               data-nac-id="carousel.demo.slide.1" data-nac-role="carousel-slide">
            <div class="ne-carousel-art" data-art="fuji"></div>
            <h3 class="ne-h3" data-i18n-key="carousel.fuji_title">Fuji</h3>
            <p class="ne-carousel-blurb" data-i18n-key="carousel.fuji_blurb">Mount Fuji silhouette. Index 1 of 3.</p>
          </div>
          <div class="ne-carousel-slide"
               data-nac-id="carousel.demo.slide.2" data-nac-role="carousel-slide">
            <div class="ne-carousel-art" data-art="bamboo"></div>
            <h3 class="ne-h3" data-i18n-key="carousel.bamboo_title">Bamboo</h3>
            <p class="ne-carousel-blurb" data-i18n-key="carousel.bamboo_blurb">Bamboo grove brushstrokes. Index 2 of 3.</p>
          </div>
        </div>
        <div class="ne-carousel-controls">
          <button class="ne-btn ne-btn-ghost" type="button"
                  data-nac-id="carousel.demo.prev" data-nac-role="action"
                  data-nac-action="prev" aria-label="Previous slide"
                  data-i18n-aria-label-key="aria.prev_slide">&laquo;</button>
          <span data-nac-id="carousel.demo.display"
                class="ne-carousel-display"
                data-i18n-key="carousel.display_default">Slide 1 of 3</span>
          <button class="ne-btn" type="button"
                  data-nac-id="carousel.demo.next" data-nac-role="action"
                  data-nac-action="next" aria-label="Next slide"
                  data-i18n-aria-label-key="aria.next_slide">&raquo;</button>
        </div>
      </div>
    </article>

    <article class="ne-card ne-card-timeline" data-nac-plugin="timeline_demo">
      <header class="ne-card-head">
        <h2 class="ne-h2" data-i18n-key="card.timeline">Timeline</h2>
      </header>
      <p class="ne-card-sub" data-i18n-key="sub.timeline">v1.7 sec 6.2.18 -- nac:timeline:loaded</p>
      <ul data-nac-id="timeline.demo" data-nac-role="timeline">
        <li data-nac-id="timeline.demo.entry.1" data-nac-role="timeline-entry">2026-05-07 -- v1.7 sec 6.2 spec</li>
        <li data-nac-id="timeline.demo.entry.2" data-nac-role="timeline-entry">2026-05-06 -- v1.6.1 hard-error drift</li>
        <li data-nac-id="timeline.demo.entry.3" data-nac-role="timeline-entry">2026-05-06 -- v1.6.0 reset primitive</li>
      </ul>
      <div class="ne-row">
        <button class="ne-btn ne-btn-ghost" type="button"
                data-nac-id="timeline.demo.older" data-nac-role="action"
                data-nac-action="load_older" data-i18n-key="btn.load_older">Load older</button>
        <button class="ne-btn ne-btn-ghost" type="button"
                data-nac-id="timeline.demo.newer" data-nac-role="action"
                data-nac-action="load_newer" data-i18n-key="btn.load_newer">Load newer</button>
      </div>
    </article>

    <!-- v1.8 demo cards -->
    <article class="ne-card ne-card-skip" data-nac-plugin="skip_demo">
      <header class="ne-card-head">
        <h2 class="ne-h2" data-i18n-key="card.skip">Skip-validate region</h2>
      </header>
      <p class="ne-card-sub" data-i18n-key="sub.skip">v1.8 sec 3.1 -- data-nac-validate=&quot;skip&quot;</p>
      <p class="ne-card-blurb" data-i18n-key="blurb.skip">
        The grey region below mocks a third-party widget the host
        cannot retrofit with NAC. The validator does NOT raise
        hard-errors on its contents but DOES warn about the
        interactives it hides.
      </p>
      <div class="ne-skip-region" data-nac-validate="skip"
           data-nac-skip-reason="third_party_widget;remediate-by=2027-01-01;tracker=NAC-DEMO-1"
           data-nac-id="vendor.thirdparty.mock"
           role="group" aria-label="Vendor widget (not NAC-tagged)"
           data-i18n-aria-label-key="aria.vendor_widget">
        <span class="ne-skip-label" data-i18n-key="skip.third_party_label">3rd-party</span>
        <button class="ne-btn ne-btn-sm" type="button" data-i18n-key="skip.vendor_button">Vendor button</button>
        <input class="ne-input ne-input-sm" type="text" placeholder="Vendor input"
               data-i18n-placeholder-key="skip.vendor_input_ph">
      </div>
      <div class="ne-row" style="margin-top:8px;">
        <button class="ne-btn ne-btn-sm" type="button"
                data-nac-id="skip.demo.run_validate" data-nac-role="action"
                data-nac-action="apply" data-i18n-key="btn.run_validate">Run validate()</button>
        <span data-nac-id="skip.demo.feedback" data-nac-role="feedback"
              data-nac-state="idle" class="ne-feedback-inline" data-i18n-key="status.idle">idle</span>
      </div>
    </article>

    <article class="ne-card ne-card-a11y" data-nac-plugin="a11y_hint_demo">
      <header class="ne-card-head">
        <h2 class="ne-h2" data-i18n-key="card.a11y">Dangerous action with a11y hint</h2>
      </header>
      <p class="ne-card-sub" data-i18n-key="sub.a11y">v1.8 sec 3.1 -- data-nac-a11y-hint</p>
      <p class="ne-card-blurb" data-i18n-key="blurb.a11y">
        The button below declares its risk via
        data-nac-a11y-hint. Voice tools, screen readers
        and AI agents read this from NAC.describe() and
        SHOULD interpose a confirmation BEFORE invoking. The inert
        button next to it has no hint and is just a normal action.
      </p>
      <div class="ne-row">
        <button class="ne-btn ne-btn-danger" type="button"
                data-nac-id="a11y.demo.delete" data-nac-role="action"
                data-nac-action="delete"
                data-nac-a11y-hint="irreversible|requires_confirmation|data_loss"
                data-nac-braille-label="Del" data-i18n-key="btn.delete_invoice">
          Delete invoice
        </button>
        <button class="ne-btn ne-btn-ghost" type="button"
                data-nac-id="a11y.demo.preview" data-nac-role="action"
                data-nac-action="apply" data-i18n-key="btn.preview_invoice">Preview invoice</button>
        <span data-nac-id="a11y.demo.feedback" data-nac-role="feedback"
              data-nac-state="idle" class="ne-feedback-inline"
              data-i18n-key="status.idle">idle</span>
      </div>
      <p class="ne-card-foot" data-i18n-key="a11y.foot_describe">
        describe() on the delete button:
        a11y_hint: ["irreversible","requires_confirmation","data_loss"]
      </p>
    </article>

    <article class="ne-card ne-card-dragtypes" data-nac-plugin="dragtypes_demo">
      <header class="ne-card-head">
        <h2 class="ne-h2" data-i18n-key="card.dragtypes">Drag-type accept / reject</h2>
      </header>
      <p class="ne-card-sub" data-i18n-key="sub.dragtypes">v1.8 sec 13.4 -- data-nac-drag-type / -drag-accept</p>
      <p class="ne-card-blurb" data-i18n-key="blurb.dragtypes">
        Drag the typed cards into one of the two zones. The "files
        only" zone accepts only file; the "any" zone accepts
        everything. A type mismatch fires nac:command:rejected with
        reason="drag_type_mismatch".
      </p>
      <div class="ne-dragtypes-grid">
        <div class="ne-dragtypes-source" data-nac-id="dragtypes.source"
             data-nac-role="region">
          <div class="ne-dragtypes-card"
               data-nac-id="dragtypes.card.file"
               data-nac-role="draggable"
               data-nac-drag-type="file"
               draggable="true">file</div>
          <div class="ne-dragtypes-card"
               data-nac-id="dragtypes.card.tag"
               data-nac-role="draggable"
               data-nac-drag-type="tag"
               draggable="true">tag</div>
          <div class="ne-dragtypes-card"
               data-nac-id="dragtypes.card.note"
               data-nac-role="draggable"
               data-nac-drag-type="note"
               draggable="true">note</div>
        </div>
        <div class="ne-dragtypes-targets">
          <div class="ne-dragtypes-zone"
               data-nac-id="dragtypes.zone.files"
               data-nac-role="drop-target"
               data-nac-drag-accept="file"
               data-i18n-key="dragtypes.files_only">
            files only
          </div>
          <div class="ne-dragtypes-zone"
               data-nac-id="dragtypes.zone.any"
               data-nac-role="drop-target"
               data-nac-drag-accept="*"
               data-i18n-key="dragtypes.any">
            any
          </div>
        </div>
      </div>
      <div class="ne-row">
        <button class="ne-btn ne-btn-sm" type="button"
                data-nac-id="dragtypes.demo.try_mismatch" data-nac-role="action"
                data-nac-action="apply" data-i18n-key="btn.drive_mismatch">Drive a tag -&gt; files-only (rejected)</button>
        <span data-nac-id="dragtypes.demo.feedback" data-nac-role="feedback"
              data-nac-state="idle" class="ne-feedback-inline" data-i18n-key="status.idle">idle</span>
      </div>
    </article>

  </section>
</main>

<aside id="ne-side" class="ne-side" data-nac-plugin="example_assistant"
       data-nac-state="idle" aria-label="Yujin guide and chat"
       data-i18n-aria-label-key="aria.yujin_guide">

  <section class="ne-side-section ne-chat"
           data-nac-id="page.section.chat" data-nac-role="section" data-nac-label="Chat">
    <header class="ne-side-head">
      <span class="ne-side-kanji" aria-hidden="true">&#21451;</span>
      <h2 class="ne-h3" data-i18n-key="side.chat">Talk to Yujin</h2>
      <span class="ne-chat-status" data-nac-id="chat.status" data-i18n-key="chat.status_offline">offline demo</span>
    </header>
    <div class="ne-lang-row">
      <label for="ne-lang" data-i18n-key="lbl.lang">Lang:</label>
      <select id="ne-lang"
              data-nac-id="chat.lang" data-nac-role="field"
              data-nac-field-type="select" data-nac-state="pristine"
              aria-label="Display language"
              data-i18n-aria-label-key="aria.display_language">
        <option value="en">English (en)</option>
        <option value="es">Espanol (es)</option>
        <option value="pt">Portugues (pt)</option>
        <option value="fr">Francais (fr)</option>
        <option value="de">Deutsch (de)</option>
        <option value="it">Italiano (it)</option>
        <option value="ja">&#26085;&#26412;&#35486; (ja)</option>
        <option value="zh">&#20013;&#25991; (zh)</option>
        <option value="hi">&#2361;&#2367;&#2344;&#2381;&#2342;&#2368; (hi)</option>
        <option value="ar">&#1575;&#1604;&#1593;&#1585;&#1576;&#1610;&#1577; (ar)</option>
      </select>
    </div>
    <ol class="ne-chat-log" data-nac-id="chat.log" data-nac-role="region"
        aria-live="polite" aria-relevant="additions"></ol>
    <div class="ne-chat-input-row">
      <button type="button" class="ne-icon-btn"
              data-nac-id="chat.mic" data-nac-role="action"
              data-nac-action="apply" data-nac-state="idle"
              data-nac-toggle="true"
              aria-label="Hold to talk" aria-pressed="false"
              data-i18n-aria-label-key="aria.hold_to_talk">
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3z"/>
          <path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>
        </svg>
      </button>
      <input type="text" class="ne-chat-input"
             data-nac-id="chat.input" data-nac-role="field"
             data-nac-field-type="text" data-nac-state="pristine"
             placeholder="Tell Yujin what to do (try: tocale Do)"
             data-i18n-placeholder-key="ph.tell_yujin">
      <button type="button" class="ne-icon-btn"
              data-nac-id="chat.send" data-nac-role="action"
              data-nac-action="submit" data-nac-state="idle"
              aria-label="Send" data-i18n-aria-label-key="aria.send">
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <path d="M3 12l18-9-7 18-3-7-8-2z"/>
        </svg>
      </button>
      <button type="button" class="ne-icon-btn"
              data-nac-id="chat.tts" data-nac-role="action"
              data-nac-action="apply" data-nac-state="idle"
              data-nac-toggle="true"
              aria-label="Toggle voice replies" aria-pressed="false"
              data-i18n-aria-label-key="aria.toggle_voice">
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <path d="M3 9v6h4l5 5V4L7 9H3zM16 8a5 5 0 0 1 0 8M19 5a9 9 0 0 1 0 14"/>
        </svg>
      </button>
      <!-- v1.6.3: hands-free / always-on voice mode for headphone use. -->
      <button type="button" class="ne-icon-btn"
              data-nac-id="chat.voice.always_on" data-nac-role="action"
              data-nac-action="apply" data-nac-state="idle"
              data-nac-toggle="true"
              aria-label="Hands-free / always-on listening"
              title="Hands-free" aria-pressed="false"
              data-i18n-aria-label-key="aria.hands_free"
              data-i18n-title-key="title.hands_free">
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <path d="M4 14v-3a8 8 0 0 1 16 0v3"/>
          <path d="M4 14h3v6H4zM17 14h3v6h-3z"/>
          <path d="M12 20v2"/>
        </svg>
      </button>
    </div>
  </section>

  <section class="ne-side-section ne-manifest"
           data-nac-id="page.section.manifest" data-nac-role="section" data-nac-label="NAC manifest">
    <header class="ne-side-head ne-side-head-collapsible"
            data-nac-id="manifest.toggle" data-nac-role="action"
            data-nac-action="apply" data-nac-state="collapsed"
            tabindex="0" role="button" aria-expanded="false">
      <span class="ne-side-kanji" aria-hidden="true">&#37782;</span>
      <h2 class="ne-h3" data-i18n-key="side.manifest">NAC manifest</h2>
      <span class="ne-side-caret">&#9656;</span>
    </header>
    <pre class="ne-manifest-body" data-nac-id="manifest.body" hidden></pre>
  </section>
</aside>

<!-- Modal portal -->
<div id="ne-modal-portal"></div>

<!-- NAC v1.8.0 reference impl (vendored from nac-spec repo). -->
<script src="js/nac.js?v=<?php echo htmlspecialchars($assetVersion); ?>"></script>
<!-- Demo behaviour: synth, chat, voice, autopilot, NAC wiring. -->
<script src="js/example.js?v=<?php echo htmlspecialchars($assetVersion); ?>"></script>

</body>
</html>
