<?php
/**
 * NAC v1.3 -- common UI primitives extension demo.
 *
 * URL: https://yujin.app/nac-spec/example-v13.php
 *
 * Showcases the 16 primitive families added in v1.3:
 *   A. toast / banner / alert
 *   B. toggle / switch
 *   C. stepper
 *   D. tree
 *   E. calendar with events
 *   F. rich text editor
 *   G. tag-input
 *   H. rating
 *   I. confirmation dialog
 *   J. drawer / bottom-sheet
 *   K. pagination standalone
 *   L. chart
 *   M. map
 *   N. avatar + presence indicator
 *   O. floating action button
 *   P. empty-state + skeleton
 *
 * Every interactive element carries data-nac-*. Every action
 * emits a NAC lifecycle event.
 *
 * ASCII pure (rule 3 GoDaddy PHP 8.3).
 */
$assetVersion = 'v1';
?><!DOCTYPE html>
<html lang="en" data-theme="light">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>NAC v1.3 -- common UI primitives</title>
<link rel="icon" type="image/svg+xml" href="../assets/favicon.svg">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Noto+Serif+JP:wght@300;400;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="css/example.css?v=<?php echo htmlspecialchars($assetVersion); ?>">
<link rel="stylesheet" href="css/example-v13.css?v=<?php echo htmlspecialchars($assetVersion); ?>">
</head>
<body>

<header class="ne-topbar">
  <div class="ne-topbar-inner">
    <div class="ne-brand">
      <span class="ne-kanji" aria-hidden="true">&#22810;</span>
      <span class="ne-brand-text">
        <span class="ne-brand-line1">NAC v1.3 -- common UI primitives</span>
        <span class="ne-brand-line2">16 widget families, all driveable through window.NAC</span>
      </span>
    </div>
    <nav class="ne-topbar-nav">
      <a href="example.php">main demo</a>
      <a href="example-navmap.php">system map</a>
      <a href="https://github.com/pkuschnirof/nac-spec/blob/main/spec/NAC-v1.0.md#15-common-ui-primitives-extension-v13-normative" target="_blank" rel="noopener">spec</a>
      <a href="https://github.com/pkuschnirof/nac-spec" target="_blank" rel="noopener">github</a>
    </nav>
  </div>
</header>

<main class="ne-main">

  <section class="ne-intro" data-nac-role="section" data-nac-id="page.section.intro" data-nac-label="Intro">
    <h1 class="ne-h1">Sixteen primitives, one driver API.</h1>
    <p class="ne-lede">
      Every widget on this page exposes itself through the same
      <code>data-nac-*</code> attributes you already know -- so a voice
      assistant, an RPA bot or an AI agent can drive the lot through
      <code>window.NAC</code> alone. Open the dev console and type
      <code>NAC.list()</code> to see the registered manifests; type
      <code>NAC.system_map()</code> for the navigation graph.
    </p>
    <p class="ne-lede">
      Each card below has a "drive me" button that exercises the
      widget through the v1.3 driver API, narrating what it did in
      the events log on the right.
    </p>
  </section>

  <section class="v13-grid" data-nac-role="section" data-nac-id="page.section.demos" data-nac-label="Live demos">

    <!-- A. Toasts -->
    <article class="v13-card" data-nac-plugin="toasts" aria-labelledby="t-toast">
      <header class="ne-card-head">
        <span class="ne-card-kanji" aria-hidden="true">&#21855;</span>
        <h2 class="ne-h2" id="t-toast">A. Toasts</h2>
      </header>
      <p class="ne-card-sub">Transient feedback. Auto-dismiss after a TTL. Driveable via <code>NAC.toast(text, opts)</code>.</p>
      <div class="v13-row">
        <button class="ne-btn" data-nac-id="toasts.fire_info"    data-nac-role="action" data-nac-action="apply" type="button">Fire info</button>
        <button class="ne-btn" data-nac-id="toasts.fire_success" data-nac-role="action" data-nac-action="apply" type="button">Fire success</button>
        <button class="ne-btn ne-btn-ghost" data-nac-id="toasts.fire_warn"  data-nac-role="action" data-nac-action="apply" type="button">Fire warn</button>
        <button class="ne-btn ne-btn-ghost" data-nac-id="toasts.fire_error" data-nac-role="action" data-nac-action="apply" type="button">Fire error</button>
      </div>
    </article>

    <!-- B. Banner -->
    <article class="v13-card" data-nac-plugin="banner" aria-labelledby="t-banner">
      <header class="ne-card-head">
        <span class="ne-card-kanji" aria-hidden="true">&#26071;</span>
        <h2 class="ne-h2" id="t-banner">B. Banner</h2>
      </header>
      <p class="ne-card-sub">Persistent feedback at the top of a region. Manual dismiss. <code>data-nac-role="banner"</code>.</p>
      <div class="v13-banner" data-nac-id="banner.system" data-nac-role="banner"
           data-nac-state="visible" data-nac-severity="warn">
        <span>Maintenance window scheduled for 2026-05-10 02:00 UTC.</span>
        <button class="v13-banner-x" data-nac-id="banner.dismiss" data-nac-role="action"
                data-nac-action="cancel" aria-label="Dismiss" type="button">x</button>
      </div>
    </article>

    <!-- C. Toggle / switch -->
    <article class="v13-card" data-nac-plugin="toggle" aria-labelledby="t-toggle">
      <header class="ne-card-head">
        <span class="ne-card-kanji" aria-hidden="true">&#20999;</span>
        <h2 class="ne-h2" id="t-toggle">C. Toggle / switch</h2>
      </header>
      <p class="ne-card-sub">Instant boolean. Distinct from checkbox. <code>data-nac-field-type="toggle"</code>.</p>
      <div class="v13-row">
        <label class="v13-toggle-row">
          <span>Notifications</span>
          <button class="v13-toggle" type="button" role="switch" aria-checked="false"
                  data-nac-id="toggle.notif" data-nac-role="field" data-nac-field-type="toggle"
                  data-nac-state="off"><span class="v13-toggle-knob"></span></button>
        </label>
        <label class="v13-toggle-row">
          <span>Dark mode</span>
          <button class="v13-toggle" type="button" role="switch" aria-checked="true"
                  data-nac-id="toggle.dark" data-nac-role="field" data-nac-field-type="toggle"
                  data-nac-state="on"><span class="v13-toggle-knob"></span></button>
        </label>
      </div>
    </article>

    <!-- D. Stepper -->
    <article class="v13-card" data-nac-plugin="stepper" aria-labelledby="t-step">
      <header class="ne-card-head">
        <span class="ne-card-kanji" aria-hidden="true">&#27497;</span>
        <h2 class="ne-h2" id="t-step">D. Stepper</h2>
      </header>
      <p class="ne-card-sub">Multi-step form progress. <code>NAC.step_next(id) / step_back(id) / step_to(id, n)</code>.</p>
      <div class="v13-stepper" data-nac-id="stepper.demo" data-nac-role="stepper" data-nac-state="in_progress">
        <div class="v13-step" data-nac-id="step.s1" data-nac-role="step" data-nac-state="current">1. Start</div>
        <div class="v13-step" data-nac-id="step.s2" data-nac-role="step" data-nac-state="pending">2. Form</div>
        <div class="v13-step" data-nac-id="step.s3" data-nac-role="step" data-nac-state="pending">3. Review</div>
        <div class="v13-step" data-nac-id="step.s4" data-nac-role="step" data-nac-state="pending">4. Submit</div>
      </div>
      <div class="v13-row">
        <button class="ne-btn" data-nac-id="stepper.next" data-nac-role="action" data-nac-action="step_next" type="button">Next</button>
        <button class="ne-btn ne-btn-ghost" data-nac-id="stepper.back" data-nac-role="action" data-nac-action="step_back" type="button">Back</button>
      </div>
    </article>

    <!-- E. Tree -->
    <article class="v13-card" data-nac-plugin="tree" aria-labelledby="t-tree">
      <header class="ne-card-head">
        <span class="ne-card-kanji" aria-hidden="true">&#26408;</span>
        <h2 class="ne-h2" id="t-tree">E. Tree</h2>
      </header>
      <p class="ne-card-sub">Hierarchical view. <code>NAC.tree_expand / _collapse / _select / _path</code>.</p>
      <ul class="v13-tree" data-nac-id="tree.fs" data-nac-role="tree">
        <li class="v13-treenode" data-nac-id="tree.fs.docs" data-nac-role="treenode"
            data-nac-state="collapsed" data-nac-level="0">
          <span class="v13-tree-toggle" data-nac-id="tree.fs.docs.toggle"
                data-nac-role="action" data-nac-action="expand_node">+</span>
          docs/
          <ul class="v13-tree-children" data-nac-role="tree-children" hidden>
            <li class="v13-treenode" data-nac-id="tree.fs.docs.spec" data-nac-role="treenode"
                data-nac-state="leaf" data-nac-level="1">spec/NAC-v1.0.md</li>
            <li class="v13-treenode" data-nac-id="tree.fs.docs.man" data-nac-role="treenode"
                data-nac-state="leaf" data-nac-level="1">MANUAL.md</li>
            <li class="v13-treenode" data-nac-id="tree.fs.docs.imp" data-nac-role="treenode"
                data-nac-state="collapsed" data-nac-level="1">
              <span class="v13-tree-toggle" data-nac-id="tree.fs.docs.imp.toggle"
                    data-nac-role="action" data-nac-action="expand_node">+</span>
              impact/
              <ul class="v13-tree-children" data-nac-role="tree-children" hidden>
                <li class="v13-treenode" data-nac-id="tree.fs.docs.imp.rpa" data-nac-role="treenode" data-nac-state="leaf" data-nac-level="2">IMPACT_RPA.md</li>
                <li class="v13-treenode" data-nac-id="tree.fs.docs.imp.tst" data-nac-role="treenode" data-nac-state="leaf" data-nac-level="2">IMPACT_TESTING.md</li>
              </ul>
            </li>
          </ul>
        </li>
        <li class="v13-treenode" data-nac-id="tree.fs.js" data-nac-role="treenode"
            data-nac-state="leaf" data-nac-level="0">js/nac.js</li>
        <li class="v13-treenode" data-nac-id="tree.fs.runner" data-nac-role="treenode"
            data-nac-state="leaf" data-nac-level="0">runner/nac_runner.py</li>
      </ul>
    </article>

    <!-- F. Calendar -->
    <article class="v13-card" data-nac-plugin="calendar" aria-labelledby="t-cal">
      <header class="ne-card-head">
        <span class="ne-card-kanji" aria-hidden="true">&#26257;</span>
        <h2 class="ne-h2" id="t-cal">F. Calendar with events</h2>
      </header>
      <p class="ne-card-sub">Month view + 4 events. <code>NAC.calendar_select_event(id)</code>.</p>
      <div class="v13-calendar" data-nac-id="cal.demo" data-nac-role="calendar"
           data-nac-view="month" data-nac-date="2026-05-01">
        <div class="v13-cal-grid">
          <div class="v13-cal-day"><span>1</span></div>
          <div class="v13-cal-day"><span>2</span></div>
          <div class="v13-cal-day v13-cal-has-event"><span>3</span>
            <button class="v13-cal-event" data-nac-id="cal.demo.evt.1" data-nac-role="calendar-event"
                    data-nac-state="confirmed" data-nac-start="2026-05-03T10:00"
                    data-nac-end="2026-05-03T11:00" data-nac-label="Standup" type="button">Standup</button>
          </div>
          <div class="v13-cal-day"><span>4</span></div>
          <div class="v13-cal-day v13-cal-has-event"><span>5</span>
            <button class="v13-cal-event v13-cal-evt-tentative" data-nac-id="cal.demo.evt.2" data-nac-role="calendar-event"
                    data-nac-state="tentative" data-nac-start="2026-05-05T15:00"
                    data-nac-end="2026-05-05T16:30" data-nac-label="Demo to client" type="button">Demo (tentative)</button>
          </div>
          <div class="v13-cal-day"><span>6</span></div>
          <div class="v13-cal-day v13-cal-has-event"><span>7</span>
            <button class="v13-cal-event" data-nac-id="cal.demo.evt.3" data-nac-role="calendar-event"
                    data-nac-state="confirmed" data-nac-start="2026-05-07T09:00"
                    data-nac-end="2026-05-07T10:00" data-nac-label="1-on-1" type="button">1-on-1</button>
          </div>
          <div class="v13-cal-day"><span>8</span></div>
          <div class="v13-cal-day v13-cal-has-event"><span>10</span>
            <button class="v13-cal-event v13-cal-evt-cancel" data-nac-id="cal.demo.evt.4" data-nac-role="calendar-event"
                    data-nac-state="cancelled" data-nac-start="2026-05-10T14:00"
                    data-nac-end="2026-05-10T15:00" data-nac-label="Maintenance" type="button">Maintenance</button>
          </div>
        </div>
        <div class="v13-row">
          <button class="ne-btn ne-btn-ghost" data-nac-id="cal.demo.view_month" data-nac-role="action" data-nac-action="view_change" type="button">Month</button>
          <button class="ne-btn ne-btn-ghost" data-nac-id="cal.demo.view_week"  data-nac-role="action" data-nac-action="view_change" type="button">Week</button>
          <button class="ne-btn ne-btn-ghost" data-nac-id="cal.demo.view_day"   data-nac-role="action" data-nac-action="view_change" type="button">Day</button>
        </div>
      </div>
    </article>

    <!-- G. Rich text -->
    <article class="v13-card" data-nac-plugin="richtext" aria-labelledby="t-rt">
      <header class="ne-card-head">
        <span class="ne-card-kanji" aria-hidden="true">&#26356;</span>
        <h2 class="ne-h2" id="t-rt">G. Rich text editor</h2>
      </header>
      <p class="ne-card-sub">WYSIWYG. <code>NAC.richtext_format / _insert_link / _insert_mention</code>.</p>
      <div class="v13-rt-toolbar">
        <button class="v13-rt-btn" data-nac-id="rt.bold"   data-nac-role="action" data-nac-action="format_apply" type="button" aria-label="Bold">B</button>
        <button class="v13-rt-btn" data-nac-id="rt.italic" data-nac-role="action" data-nac-action="format_apply" type="button" aria-label="Italic"><i>I</i></button>
        <button class="v13-rt-btn" data-nac-id="rt.h2"     data-nac-role="action" data-nac-action="format_apply" type="button" aria-label="Heading">H</button>
        <button class="v13-rt-btn" data-nac-id="rt.list"   data-nac-role="action" data-nac-action="format_apply" type="button" aria-label="List">UL</button>
        <button class="v13-rt-btn" data-nac-id="rt.link"   data-nac-role="action" data-nac-action="format_apply" type="button" aria-label="Link">@</button>
      </div>
      <div class="v13-rt-editor" contenteditable="true"
           data-nac-id="rt.body" data-nac-role="field" data-nac-field-type="richtext"
           data-nac-state="empty">Type something, then format.</div>
    </article>

    <!-- H. Tag-input -->
    <article class="v13-card" data-nac-plugin="tags" aria-labelledby="t-tags">
      <header class="ne-card-head">
        <span class="ne-card-kanji" aria-hidden="true">&#31614;</span>
        <h2 class="ne-h2" id="t-tags">H. Tag input</h2>
      </header>
      <p class="ne-card-sub">Free input + autocomplete. <code>NAC.add_tag / remove_tag / list_tags</code>.</p>
      <div class="v13-tags" data-nac-id="tags.demo" data-nac-role="field"
           data-nac-field-type="tag-input" data-nac-state="empty" data-nac-value=""></div>
      <div class="v13-row">
        <input class="v13-tag-input" data-nac-id="tags.demo.input" data-nac-role="field"
               data-nac-field-type="text" data-nac-state="empty"
               type="text" placeholder="Type tag + Enter" aria-label="Tag input">
      </div>
    </article>

    <!-- I. Rating -->
    <article class="v13-card" data-nac-plugin="rating" aria-labelledby="t-rate">
      <header class="ne-card-head">
        <span class="ne-card-kanji" aria-hidden="true">&#26143;</span>
        <h2 class="ne-h2" id="t-rate">I. Rating</h2>
      </header>
      <p class="ne-card-sub">1..5 stars. <code>data-nac-field-type="rating"</code>, fired via <code>NAC.fill</code>.</p>
      <div class="v13-rating" data-nac-id="rate.demo" data-nac-role="field"
           data-nac-field-type="rating" data-nac-state="empty"
           data-nac-min="1" data-nac-max="5" data-nac-value="0">
        <span class="v13-star" data-v="1">*</span>
        <span class="v13-star" data-v="2">*</span>
        <span class="v13-star" data-v="3">*</span>
        <span class="v13-star" data-v="4">*</span>
        <span class="v13-star" data-v="5">*</span>
      </div>
    </article>

    <!-- J. Confirm dialog -->
    <article class="v13-card" data-nac-plugin="confirm" aria-labelledby="t-conf">
      <header class="ne-card-head">
        <span class="ne-card-kanji" aria-hidden="true">&#30906;</span>
        <h2 class="ne-h2" id="t-conf">J. Confirmation dialog</h2>
      </header>
      <p class="ne-card-sub">Yes/no interrupting prompt. <code>NAC.confirm(prompt, opts) -> Promise&lt;boolean&gt;</code>.</p>
      <div class="v13-row">
        <button class="ne-btn" data-nac-id="confirm.danger" data-nac-role="action"
                data-nac-action="delete" type="button">Delete account</button>
        <button class="ne-btn ne-btn-ghost" data-nac-id="confirm.normal" data-nac-role="action"
                data-nac-action="apply" type="button">Apply changes</button>
      </div>
    </article>

    <!-- K. Drawer / sheet -->
    <article class="v13-card" data-nac-plugin="drawer-host" aria-labelledby="t-drawer">
      <header class="ne-card-head">
        <span class="ne-card-kanji" aria-hidden="true">&#24239;</span>
        <h2 class="ne-h2" id="t-drawer">K. Drawer / bottom-sheet</h2>
      </header>
      <p class="ne-card-sub">Slide-out non-blocking panel. <code>NAC.open_drawer / close_drawer / peek_drawer</code>.</p>
      <div class="v13-row">
        <button class="ne-btn" data-nac-id="drawer.open_right" data-nac-role="action" data-nac-action="open_drawer" type="button">Open right drawer</button>
        <button class="ne-btn" data-nac-id="drawer.open_bottom" data-nac-role="action" data-nac-action="open_drawer" type="button">Open bottom sheet</button>
        <button class="ne-btn ne-btn-ghost" data-nac-id="drawer.peek_bottom" data-nac-role="action" data-nac-action="peek_drawer" type="button">Peek bottom (25%)</button>
      </div>
    </article>

    <!-- L. Pagination -->
    <article class="v13-card" data-nac-plugin="pager" aria-labelledby="t-page">
      <header class="ne-card-head">
        <span class="ne-card-kanji" aria-hidden="true">&#39029;</span>
        <h2 class="ne-h2" id="t-page">L. Pagination (standalone)</h2>
      </header>
      <p class="ne-card-sub">Same primitive as v1.1 table pager, here on a card grid. <code>NAC.go_to_page(id, n)</code>.</p>
      <div class="v13-pager-cards" data-nac-id="pager.cards" data-nac-role="region">
        <div class="v13-mini-card">Customer #1</div>
        <div class="v13-mini-card">Customer #2</div>
        <div class="v13-mini-card">Customer #3</div>
      </div>
      <div class="v13-pager" data-nac-id="pager.cards.pager" data-nac-role="pagination-control"
           data-nac-current-page="1" data-nac-total-pages="5">
        <button class="ne-btn ne-btn-ghost" data-nac-id="pager.cards.prev" data-nac-role="action" data-nac-action="prev_page" type="button">Prev</button>
        <span class="v13-pager-info">Page <strong data-nac-id="pager.cards.current">1</strong> of 5</span>
        <button class="ne-btn ne-btn-ghost" data-nac-id="pager.cards.next" data-nac-role="action" data-nac-action="next_page" type="button">Next</button>
      </div>
    </article>

    <!-- M. Chart -->
    <article class="v13-card v13-card-wide" data-nac-plugin="chart" aria-labelledby="t-chart">
      <header class="ne-card-head">
        <span class="ne-card-kanji" aria-hidden="true">&#22259;</span>
        <h2 class="ne-h2" id="t-chart">M. Chart</h2>
      </header>
      <p class="ne-card-sub">Inline bar chart. Each point is a NAC element. <code>NAC.chart_data(id) / chart_toggle_series</code>.</p>
      <div class="v13-chart" data-nac-id="chart.sales" data-nac-role="chart" data-nac-kind="bar">
        <div class="v13-chart-series" data-nac-id="chart.sales.s1" data-nac-role="chart-series"
             data-nac-label="Sales" data-nac-state="visible">
          <button class="v13-bar" style="height:30%" data-nac-id="chart.sales.s1.jan" data-nac-role="chart-point"
                  data-nac-x="Jan" data-nac-y="30" data-nac-label="Jan: 30" type="button"><span>Jan</span></button>
          <button class="v13-bar" style="height:55%" data-nac-id="chart.sales.s1.feb" data-nac-role="chart-point"
                  data-nac-x="Feb" data-nac-y="55" data-nac-label="Feb: 55" type="button"><span>Feb</span></button>
          <button class="v13-bar" style="height:70%" data-nac-id="chart.sales.s1.mar" data-nac-role="chart-point"
                  data-nac-x="Mar" data-nac-y="70" data-nac-label="Mar: 70" type="button"><span>Mar</span></button>
          <button class="v13-bar" style="height:90%" data-nac-id="chart.sales.s1.apr" data-nac-role="chart-point"
                  data-nac-x="Apr" data-nac-y="90" data-nac-label="Apr: 90" type="button"><span>Apr</span></button>
          <button class="v13-bar" style="height:65%" data-nac-id="chart.sales.s1.may" data-nac-role="chart-point"
                  data-nac-x="May" data-nac-y="65" data-nac-label="May: 65" type="button"><span>May</span></button>
        </div>
      </div>
      <div class="v13-row">
        <button class="ne-btn ne-btn-ghost" data-nac-id="chart.sales.toggle_s1" data-nac-role="action" data-nac-action="toggle_series" type="button">Toggle series</button>
      </div>
    </article>

    <!-- N. Map -->
    <article class="v13-card v13-card-wide" data-nac-plugin="map" aria-labelledby="t-map">
      <header class="ne-card-head">
        <span class="ne-card-kanji" aria-hidden="true">&#22320;</span>
        <h2 class="ne-h2" id="t-map">N. Map</h2>
      </header>
      <p class="ne-card-sub">Schematic map with markers + a layer. <code>NAC.map_focus / map_select_marker / map_toggle_layer</code>.</p>
      <div class="v13-map" data-nac-id="map.demo" data-nac-role="map"
           data-nac-provider="schematic" data-nac-lat="-34.6" data-nac-lng="-58.4" data-nac-zoom="4">
        <div class="v13-map-layer" data-nac-id="map.demo.stores" data-nac-role="map-layer"
             data-nac-label="Stores" data-nac-state="visible"></div>
        <button class="v13-marker" style="left:60%;top:62%"
                data-nac-id="map.demo.m1" data-nac-role="map-marker"
                data-nac-lat="-34.6" data-nac-lng="-58.4" data-nac-label="Buenos Aires" type="button">B</button>
        <button class="v13-marker" style="left:25%;top:40%"
                data-nac-id="map.demo.m2" data-nac-role="map-marker"
                data-nac-lat="40.4" data-nac-lng="-3.7" data-nac-label="Madrid" type="button">M</button>
        <button class="v13-marker" style="left:75%;top:33%"
                data-nac-id="map.demo.m3" data-nac-role="map-marker"
                data-nac-lat="35.7" data-nac-lng="139.7" data-nac-label="Tokyo" type="button">T</button>
      </div>
      <div class="v13-row">
        <button class="ne-btn ne-btn-ghost" data-nac-id="map.demo.toggle_stores" data-nac-role="action" data-nac-action="toggle_layer" type="button">Toggle Stores layer</button>
      </div>
    </article>

    <!-- O. Avatar + presence -->
    <article class="v13-card" data-nac-plugin="presence" aria-labelledby="t-pres">
      <header class="ne-card-head">
        <span class="ne-card-kanji" aria-hidden="true">&#21451;</span>
        <h2 class="ne-h2" id="t-pres">O. Avatar + presence</h2>
      </header>
      <p class="ne-card-sub">Per-user presence. State: online | away | busy | offline.</p>
      <ul class="v13-people">
        <li class="v13-person">
          <span class="v13-avatar" data-nac-id="user.alice.avatar" data-nac-role="avatar">A</span>
          <span class="v13-presence" data-nac-id="user.alice.presence" data-nac-role="presence-indicator" data-nac-state="online" title="online"></span>
          <span>Alice</span>
        </li>
        <li class="v13-person">
          <span class="v13-avatar" data-nac-id="user.bob.avatar" data-nac-role="avatar">B</span>
          <span class="v13-presence" data-nac-id="user.bob.presence" data-nac-role="presence-indicator" data-nac-state="away" title="away"></span>
          <span>Bob</span>
        </li>
        <li class="v13-person">
          <span class="v13-avatar" data-nac-id="user.carol.avatar" data-nac-role="avatar">C</span>
          <span class="v13-presence" data-nac-id="user.carol.presence" data-nac-role="presence-indicator" data-nac-state="busy" title="busy"></span>
          <span>Carol</span>
        </li>
        <li class="v13-person">
          <span class="v13-avatar" data-nac-id="user.dan.avatar" data-nac-role="avatar">D</span>
          <span class="v13-presence" data-nac-id="user.dan.presence" data-nac-role="presence-indicator" data-nac-state="offline" title="offline"></span>
          <span>Dan</span>
        </li>
      </ul>
    </article>

    <!-- P. Empty state + skeleton -->
    <article class="v13-card" data-nac-plugin="emptystate" aria-labelledby="t-empty">
      <header class="ne-card-head">
        <span class="ne-card-kanji" aria-hidden="true">&#28961;</span>
        <h2 class="ne-h2" id="t-empty">P. Empty state + skeleton</h2>
      </header>
      <p class="ne-card-sub">Distinguish "loading" from "nothing here yet". <code>data-nac-role="empty-state" / "skeleton"</code>.</p>
      <div class="v13-empty-host" data-nac-id="empty.host" data-nac-role="region">
        <div class="v13-skeleton" data-nac-id="empty.skeleton" data-nac-role="skeleton"
             data-nac-state="done" hidden>
          <div class="v13-skel-bar"></div><div class="v13-skel-bar"></div><div class="v13-skel-bar"></div>
        </div>
        <div class="v13-empty" data-nac-id="empty.state" data-nac-role="empty-state"
             data-nac-state="visible" data-nac-kind="no-results">
          <div class="v13-empty-kanji">&#28961;</div>
          <div class="v13-empty-text">No items yet.</div>
          <button class="ne-btn" data-nac-id="empty.cta" data-nac-role="action" data-nac-action="add" type="button">Create one</button>
        </div>
      </div>
      <div class="v13-row">
        <button class="ne-btn ne-btn-ghost" data-nac-id="empty.show_skel" data-nac-role="action" data-nac-action="apply" type="button">Show loading</button>
        <button class="ne-btn ne-btn-ghost" data-nac-id="empty.show_empty" data-nac-role="action" data-nac-action="apply" type="button">Show empty</button>
      </div>
    </article>

  </section>

  <section class="v13-events" data-nac-role="section" data-nac-id="page.section.events" data-nac-label="Event log">
    <h2 class="ne-h2">NAC events live</h2>
    <p class="ne-lede">Every interaction emits a typed lifecycle event. Watch them flow.</p>
    <ol class="ne-events-log" data-nac-id="v13.events.log" data-nac-role="region"
        aria-live="polite" aria-relevant="additions"></ol>
  </section>

</main>

<!-- O bis. Floating action button (FAB) -->
<button class="v13-fab" data-nac-id="fab.primary" data-nac-role="fab"
        data-nac-action="add" type="button" aria-label="Primary action">+</button>

<!-- Drawers (sit at end of body, controlled by NAC.open_drawer) -->
<aside class="v13-drawer v13-drawer-right" data-nac-id="drawer.right" data-nac-role="drawer"
       data-nac-position="right" data-nac-state="closed" aria-hidden="true">
  <header class="v13-drawer-head">
    <h3 class="ne-h3">Right drawer</h3>
    <button class="v13-drawer-x" data-nac-id="drawer.right.close" data-nac-role="action"
            data-nac-action="close_drawer" aria-label="Close" type="button">x</button>
  </header>
  <div class="v13-drawer-body">A non-blocking side panel.
    Useful for filters, details, or a chat. The page underneath stays interactive.</div>
</aside>
<aside class="v13-bottom-sheet" data-nac-id="drawer.bottom" data-nac-role="bottom-sheet"
       data-nac-position="bottom" data-nac-state="closed" aria-hidden="true">
  <div class="v13-sheet-grab"></div>
  <header class="v13-drawer-head">
    <h3 class="ne-h3">Bottom sheet</h3>
    <button class="v13-drawer-x" data-nac-id="drawer.bottom.close" data-nac-role="action"
            data-nac-action="close_drawer" aria-label="Close" type="button">x</button>
  </header>
  <div class="v13-drawer-body">Mobile-first slide-up. Peek mode keeps it half-open.</div>
</aside>

<script src="js/nac.js?v=<?php echo htmlspecialchars($assetVersion); ?>"></script>
<script src="js/example-v13.js?v=<?php echo htmlspecialchars($assetVersion); ?>"></script>

</body>
</html>
