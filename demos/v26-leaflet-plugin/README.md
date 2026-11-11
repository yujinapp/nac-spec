# V26-01 -- the plugin contract against a library we do not control

Layer 2 evidence for RFC V26-01 ([PROJECT.md sec 3.1](../../PROJECT.md#3-test-bar)),
and the receipt this project had been missing since V25-01 shipped: until
now the plugin extension contract had only ever been exercised against a
target we wrote ourselves.

The surface here is a real **Leaflet 1.9.4** -- a third-party library,
loaded from unpkg with a pinned SRI hash, that cannot be adjusted if the
contract does not fit it.

---

## Files

```
demos/v26-leaflet-plugin/
  index.html              the adopter page: a real Leaflet map + NAC3-marked chrome
  leaflet-nac-plugin.js   THE PLUGIN. Uses nothing but NAC.registerApiHandle +
                          NAC.registerPlugin -- this is what "lives in another
                          repository, under another licence" looks like
  README.md               this file

scripts/
  run-demo-v26-leaflet-plugin.mjs   Playwright runner; serves the repo itself, so
                                    nothing has to be started first

evidence/v26-leaflet-plugin/<YYYY-MM-DD>/
  01-initial.png ... 06-final.png   screenshots
  run-log.txt / run-log.json        trace + every assertion with its result
```

Run it:

```
cd runtime && npm run build        # the page loads runtime/dist/nac.browser.js
cd .. && node scripts/run-demo-v26-leaflet-plugin.mjs
```

The runner refuses rather than guesses in three places: a missing
`dist` bundle, a bundle that predates the v2.6 hooks, and a page that
never booted because Leaflet could not be fetched. A run with no
network measures nothing and says so.

## What it proves, hook by hook

| Hook | What the runner does | Why it is not a mock |
|---|---|---|
| E-1 discovery | Calls `NAC.plugins()` from the agent side, having registered nothing, and finds `leaflet.map` with its five verbs sorted. Mutates the descriptor and re-reads it to prove it is a copy. | The manifest was authored in a separate file the agent never read. |
| E-2 self-description | Reads `view.set` and finds the label, and `params` declaring `center` as an array in **degrees** and `zoom` as a number between 0 and 19. | A map needs a coordinate. Before v2.6 nothing in a manifest could say so. |
| E-3 `emitter-listen` | Subscribes to `view.moved`, then moves the map through **Leaflet's own API** (`map.panBy`), not through NAC. | Only a real `moveend` can deliver that callback. No polling is involved. |
| E-4 `sdk-call` | Calls `map.setView(center, zoom)` positionally over an API handle, then reads the centre back from Leaflet directly. Calls it again with only `center` and asserts the zoom was KEPT -- Leaflet's documented behaviour for an undefined second argument. | The map object never lands on `window`, and the signature is positional. 2.5.2 could express neither. |
| E-5 fail-closed observer | Moves Santiago out of the viewport so its row unmounts, then subscribes without `root` (refused, `backend_target_missing`) and with `root` (accepted; fires when the row remounts and keeps firing as it changes). | The mount / unmount cycle is produced by the real map, not by a timer. It is the virtualised-grid lifecycle. |
| E-6 plugin error space | Calls a verb whose glue raises `plugin.overlay_not_attached`, and a verb with a bad argument, and an undeclared verb. | Three different failures, three distinguishable codes: the application, the contract, the routing. |

Plus the v2.5 surface against the same real library: `NAC.expect` with a
tolerance comparator confirming a zoom change, and the
`nac:plugin:invoked / :read / :event` provenance family, read back off
the page's own log panel.

## Licences

Leaflet is BSD-2-Clause and is fetched from unpkg at runtime with a
pinned `integrity` hash; **no Leaflet byte is vendored into this
repository**. The page, the plugin file and the runner are Apache-2.0,
like the runtime.

## The honest limit

The tiles come from OpenStreetMap and can be rate-limited from a
datacentre address. When they are, the map still works -- Leaflet's API,
events and geometry are unaffected -- and the runner reports the failed
tile requests as external resource failures that it does NOT assert on.
What it asserts on is the library and the contract.
