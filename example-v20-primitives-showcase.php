<?php
/* ===============================================================
   example-v20.php -- NAC v2.0 showcase demo
   ---------------------------------------------------------------
   Side-by-side companion to example.php (v1.9). This file is the
   new v2.0 demo. example.php stays intact for direct comparison.

   Showcases all 8 v2.0 primitives + HMAC mandatory + isTrusted
   attestation + i18n contract L1.

   ASCII-only.
   =============================================================== */
?><!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>NAC v2.0 demo (side-by-side companion of v1.9)</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="css/example.css">
<style>
:root {
  --c-primary:#4F46E5; --c-success:#10B981; --c-warn:#F59E0B; --c-danger:#DC2626;
  --c-bg:#FAFAF9; --c-surface:#FFFFFF; --c-border:#E5E5E0; --c-text:#1A1A1A;
  --c-text-2:#555;
  --space:14px;
}
body { font-family: 'Inter', system-ui, sans-serif; background: var(--c-bg); color: var(--c-text); margin:0; }
.wrap { max-width: 1100px; margin: 0 auto; padding: 24px; }
.hero { background: linear-gradient(135deg, #6366F1, #8B5CF6); color: #fff; padding: 36px; border-radius: 12px; margin-bottom: 24px; }
.hero h1 { margin: 0 0 8px 0; font-size: 28px; }
.hero .v2-badge { display: inline-block; background: rgba(255,255,255,.2); padding: 4px 12px; border-radius: 14px; font-size: 12px; font-weight: 600; }
.compare-link { display: inline-block; margin-top: 14px; color: #fff; background: rgba(0,0,0,.2); padding: 8px 14px; border-radius: 8px; text-decoration: none; font-size: 13px; }
.section { background: var(--c-surface); border: 1px solid var(--c-border); border-radius: 12px; padding: 20px; margin-bottom: 18px; }
.section h2 { margin: 0 0 8px 0; font-size: 18px; color: var(--c-primary); }
.section .desc { color: var(--c-text-2); font-size: 13px; margin-bottom: 14px; line-height: 1.5; }
.btn { background: var(--c-primary); color: #fff; border: 0; padding: 8px 16px; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 600; }
.btn:hover { filter: brightness(1.08); }
.btn-secondary { background: transparent; color: var(--c-primary); border: 1px solid var(--c-primary); }
.btn-danger { background: var(--c-danger); }
.btn-success { background: var(--c-success); }
.cards-grid { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 12px; }
.card { background: var(--c-bg); border: 1px solid var(--c-border); border-radius: 8px; padding: 14px; min-width: 180px; cursor: pointer; transition: transform .12s; }
.card:hover { transform: translateY(-2px); border-color: var(--c-primary); }
.card-title { font-size: 14px; font-weight: 600; margin-bottom: 4px; }
.card-desc { font-size: 12px; color: var(--c-text-2); }
.locale-switcher { display: flex; gap: 6px; margin-bottom: 12px; flex-wrap: wrap; }
.locale-btn { background: var(--c-bg); border: 1px solid var(--c-border); padding: 4px 10px; border-radius: 14px; cursor: pointer; font-size: 12px; }
.locale-btn.active { background: var(--c-primary); color: #fff; border-color: var(--c-primary); }
.log { background: #1A1A1A; color: #4ADE80; font-family: 'Fira Code', ui-monospace, monospace; font-size: 11px; padding: 14px; border-radius: 8px; max-height: 240px; overflow-y: auto; white-space: pre-wrap; line-height: 1.5; }
.row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin-top: 10px; }
.tag { display: inline-block; background: rgba(99,102,241,.12); color: var(--c-primary); padding: 2px 8px; border-radius: 10px; font-size: 11px; }
.tag-warn { background: rgba(245,158,11,.15); color: var(--c-warn); }
.tag-success { background: rgba(16,185,129,.15); color: var(--c-success); }
.tag-danger { background: rgba(220,38,38,.15); color: var(--c-danger); }
.kvbox { background: var(--c-bg); border-radius: 8px; padding: 12px; font-size: 12px; }
.kvbox dt { font-weight: 600; color: var(--c-text-2); }
.kvbox dd { margin: 0 0 8px 12px; color: var(--c-text); }
[data-third-party="1"] { background: #FEF3C7; border: 2px dashed #F59E0B; padding: 8px; border-radius: 6px; }
[data-third-party="1"] button { background: #F59E0B; color: #fff; border: 0; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; }
.virtual-list { height: 200px; overflow-y: auto; border: 1px solid var(--c-border); border-radius: 8px; }
.virtual-row { padding: 8px 12px; border-bottom: 1px solid var(--c-border); font-size: 12px; }
.toast { position: fixed; bottom: 20px; right: 20px; background: #1A1A1A; color: #fff; padding: 12px 18px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,.15); font-size: 13px; z-index: 1000; }
</style>
</head>
<body data-nac-plugin="v20-demo">
<div class="wrap">

<header class="hero" data-nac-scope="shell">
  <div class="v2-badge">NAC v2.0 demo</div>
  <h1 data-i18n-key="hero.title">Native Accessibility Contract -- v2.0</h1>
  <p data-i18n-key="hero.subtitle" style="margin: 0; opacity: .9; font-size: 14px;">
    Showcase de los 8 primitivos nuevos + HMAC mandatory + isTrusted attestation + i18n contract L1.
  </p>
  <a href="example.php" class="compare-link">&larr; Compare with v1.9 demo (example.php)</a>
</header>

<!-- ============== SECTION 1: scope hierarchy ============================== -->
<section class="section" data-nac-scope="shell.section1">
  <h2><span data-i18n-key="s1.title">1. Scope hierarchy constructor</span></h2>
  <p class="desc" data-i18n-key="s1.desc">
    NAC v2.0 introduces NAC.scope() so slugs derive from the tree:
    shell -> section -> button auto-becomes "shell.section1.btn-go".
    Click below; the manifest entry includes parent_chain.
  </p>
  <div class="row">
    <button class="btn" id="btn-scope-go">
      <span data-i18n-key="s1.btn">Disparar accion en hierarchy</span>
    </button>
    <button class="btn btn-secondary" id="btn-scope-show">
      <span data-i18n-key="s1.show">Ver describe()</span>
    </button>
  </div>
  <div class="log" id="log-scope" style="margin-top: 10px;">/* output here */</div>
</section>

<!-- ============== SECTION 2: autoRegister =============================== -->
<section class="section" data-nac-scope="shell.section2" data-nac-watch>
  <h2><span data-i18n-key="s2.title">2. autoRegister (DOM-driven)</span></h2>
  <p class="desc" data-i18n-key="s2.desc">
    Click "+ Add card" to inject a card at runtime. The card has
    [data-nac-action] -- NAC autoRegisters it under the current
    scope without any manual NAC.register() call.
  </p>
  <div class="row">
    <button class="btn" id="btn-add-card">+ Add card</button>
    <button class="btn btn-secondary" id="btn-clear-cards">Clear</button>
  </div>
  <div class="cards-grid" id="cards-grid"></div>
</section>

<!-- ============== SECTION 3: adopt third-party non-compliant =========== -->
<section class="section" data-nac-scope="shell.section3">
  <h2><span data-i18n-key="s3.title">3. Adopt third-party (non-compliant)</span></h2>
  <p class="desc" data-i18n-key="s3.desc">
    The yellow "third-party widget" has zero NAC attributes. We adopt
    it via NAC.adopt({selector, derive}). After adoption the widget
    appears in the manifest with derived label_i18n + slug.
  </p>
  <div data-third-party="1">
    <strong style="font-size: 12px; color: #92400E;">Third-party (no NAC)</strong>
    <div class="row" style="margin-top: 8px;">
      <button data-action="export" aria-label="Export">Export</button>
      <button data-action="import" aria-label="Import">Import</button>
      <button data-action="settings" aria-label="Settings">Settings</button>
    </div>
  </div>
  <button class="btn btn-secondary" id="btn-adopt" style="margin-top: 12px;">
    <span data-i18n-key="s3.adopt">Run NAC.adopt() on the toolbar</span>
  </button>
  <div class="log" id="log-adopt" style="margin-top: 10px;"></div>
</section>

<!-- ============== SECTION 4: HMAC + isTrusted ============================ -->
<section class="section" data-nac-scope="shell.section4">
  <h2><span data-i18n-key="s4.title">4. HMAC mandatory + isTrusted attestation</span></h2>
  <p class="desc" data-i18n-key="s4.desc">
    At NAC-3 strict, agent-source events MUST sign with HMAC and
    user-source events MUST have user_gesture_attested=true (from
    Event.isTrusted). Try both buttons -- the "agent" button signs
    automatically; the "synthetic" button bypasses isTrusted.
  </p>
  <div class="row">
    <button class="btn btn-success" id="btn-trusted">
      <span data-i18n-key="s4.trusted">User-clicked (isTrusted=true)</span>
    </button>
    <button class="btn btn-warn" id="btn-synthetic">
      <span data-i18n-key="s4.synthetic">Programmatic .click() (isTrusted=false)</span>
    </button>
    <button class="btn" id="btn-as-agent">
      <span data-i18n-key="s4.agent">Emit as agent (HMAC sign)</span>
    </button>
  </div>
  <div class="log" id="log-hmac" style="margin-top: 10px;"></div>
</section>

<!-- ============== SECTION 5: i18n contract L1 ============================ -->
<section class="section" data-nac-scope="shell.section5">
  <h2><span data-i18n-key="s5.title">5. i18n contract (L1: format + resolver + lint)</span></h2>
  <p class="desc" data-i18n-key="s5.desc">
    Switch locale; every data-i18n-key on this page re-resolves.
    NAC does NOT mutate the DOM directly -- the demo's host code does.
    NAC validates that every key has all 10 locales.
  </p>
  <div class="locale-switcher" id="locale-switcher">
    <button class="locale-btn" data-locale="es">es</button>
    <button class="locale-btn" data-locale="en">en</button>
    <button class="locale-btn" data-locale="pt">pt</button>
    <button class="locale-btn" data-locale="fr">fr</button>
    <button class="locale-btn" data-locale="it">it</button>
    <button class="locale-btn" data-locale="de">de</button>
    <button class="locale-btn" data-locale="ja">ja</button>
    <button class="locale-btn" data-locale="zh">zh</button>
    <button class="locale-btn" data-locale="hi">hi</button>
    <button class="locale-btn" data-locale="ar">ar</button>
  </div>
  <button class="btn btn-secondary" id="btn-validate-i18n">
    <span data-i18n-key="s5.validate">Run validate_global({i18n_strict:true})</span>
  </button>
  <div class="log" id="log-i18n" style="margin-top: 10px;"></div>
</section>

<!-- ============== SECTION 6: declareVirtual ============================== -->
<section class="section" data-nac-scope="shell.section6">
  <h2><span data-i18n-key="s6.title">6. declareVirtual (virtualized list)</span></h2>
  <p class="desc" data-i18n-key="s6.desc">
    1000-row list; only ~10 in DOM at a time. NAC declares all 1000
    slugs via resolver. The agent can NAC.find('rows.472') and the
    runtime calls the resolver on demand.
  </p>
  <div class="virtual-list" id="virtual-list"></div>
  <div class="row" style="margin-top: 10px;">
    <button class="btn btn-secondary" id="btn-find-virtual">
      <span data-i18n-key="s6.find">Find rows.472 via NAC.find()</span>
    </button>
  </div>
  <div class="log" id="log-virtual" style="margin-top: 10px;"></div>
</section>

<!-- ============== SECTION 7: captureEphemeral =========================== -->
<section class="section" data-nac-scope="shell.section7">
  <h2><span data-i18n-key="s7.title">7. captureEphemeral (transient UI)</span></h2>
  <p class="desc" data-i18n-key="s7.desc">
    A toast appears for 3s and disappears. captureEphemeral logs it
    to a ring buffer so the agent can read "what was that toast?"
    even after it's gone.
  </p>
  <div class="row">
    <button class="btn" id="btn-toast">
      <span data-i18n-key="s7.toast">Show 3s toast</span>
    </button>
    <button class="btn btn-secondary" id="btn-show-ring">
      <span data-i18n-key="s7.ring">Show ephemeral_log</span>
    </button>
  </div>
  <div class="log" id="log-ephemeral" style="margin-top: 10px;"></div>
</section>

<!-- ============== SECTION 8: describe_v2 ================================= -->
<section class="section" data-nac-scope="shell.section8">
  <h2><span data-i18n-key="s8.title">8. describe_v2() -- live introspection</span></h2>
  <p class="desc" data-i18n-key="s8.desc">
    Full v2 manifest snapshot. Includes every primitive registered
    on this page. The agent IA reads this to understand the UI tree.
  </p>
  <div class="row">
    <button class="btn" id="btn-describe">
      <span data-i18n-key="s8.run">Refresh describe_v2()</span>
    </button>
  </div>
  <div class="log" id="log-describe" style="margin-top: 10px;"></div>
</section>

</div>

<!-- ============== runtime ================================================ -->

<script src="js/nac.js"></script>
<script src="js/nac-v2-extensions.js"></script>

<script>
(function () {
  'use strict';

  /* ============== i18n catalog ========================================== */

  /* 10-locale catalog for the entire demo. NAC-3 strict mode would
     fail validation if any key were missing a locale. */
  var catalog = {
    'hero.title': {
      es: 'Contrato de Accesibilidad Nativa -- v2.0',
      en: 'Native Accessibility Contract -- v2.0',
      pt: 'Contrato de Acessibilidade Nativa -- v2.0',
      fr: 'Contrat d\'accessibilite native -- v2.0',
      it: 'Contratto di accessibilita nativa -- v2.0',
      de: 'Native Accessibility Contract -- v2.0',
      ja: 'ネイティブアクセシビリティ契約 -- v2.0',
      zh: '原生无障碍契约 -- v2.0',
      hi: 'नेटिव एक्सेसिबिलिटी कॉन्ट्रैक्ट -- v2.0',
      ar: 'عقد إمكانية الوصول الأصلية -- v2.0'
    },
    'hero.subtitle': {
      es: 'Showcase de los 8 primitivos nuevos + HMAC mandatory + isTrusted attestation + i18n contract L1.',
      en: 'Showcase of the 8 new primitives + HMAC mandatory + isTrusted attestation + i18n contract L1.',
      pt: 'Demonstracao dos 8 novos primitivos + HMAC obrigatorio + atestacao isTrusted + contrato i18n L1.',
      fr: 'Vitrine des 8 nouvelles primitives + HMAC obligatoire + attestation isTrusted + contrat i18n L1.',
      it: 'Vetrina degli 8 nuovi primitivi + HMAC obbligatorio + attestazione isTrusted + contratto i18n L1.',
      de: 'Schaufenster der 8 neuen Primitiven + HMAC obligatorisch + isTrusted-Bestaetigung + i18n-Vertrag L1.',
      ja: '8つの新プリミティブ + HMAC必須 + isTrusted証明 + i18n契約L1のショーケース。',
      zh: '8个新原语 + HMAC强制 + isTrusted证明 + i18n契约L1的展示。',
      hi: '8 नए प्रिमिटिव + HMAC अनिवार्य + isTrusted सत्यापन + i18n कॉन्ट्रैक्ट L1 का शोकेस।',
      ar: 'عرض البدائيات الثماني الجديدة + HMAC إلزامي + إثبات isTrusted + عقد i18n L1.'
    },
    /* Section 1 */
    's1.title':  { es:'1. Scope hierarchy constructor', en:'1. Scope hierarchy constructor', pt:'1. Construtor de hierarquia', fr:'1. Constructeur de hierarchie', it:'1. Costruttore di gerarchia', de:'1. Hierarchie-Konstruktor', ja:'1. スコープ階層コンストラクタ', zh:'1. 作用域层级构造器', hi:'1. स्कोप पदानुक्रम कंस्ट्रक्टर', ar:'1. منشئ التسلسل الهرمي' },
    's1.desc':   { es:'NAC v2.0 introduce NAC.scope(). Los slugs derivan del arbol.', en:'NAC v2.0 introduces NAC.scope(). Slugs derive from the tree.', pt:'NAC v2.0 introduz NAC.scope(). Os slugs derivam da arvore.', fr:'NAC v2.0 introduit NAC.scope(). Les slugs derivent de l\'arbre.', it:'NAC v2.0 introduce NAC.scope(). Gli slug derivano dall\'albero.', de:'NAC v2.0 fuehrt NAC.scope() ein. Slugs leiten sich aus dem Baum ab.', ja:'NAC v2.0はNAC.scope()を導入。', zh:'NAC v2.0 引入 NAC.scope()。', hi:'NAC v2.0 NAC.scope() पेश करता है।', ar:'NAC v2.0 يقدم NAC.scope().' },
    's1.btn':    { es:'Disparar accion en hierarchy', en:'Fire action in hierarchy', pt:'Disparar acao na hierarquia', fr:'Declencher l\'action', it:'Attiva azione nella gerarchia', de:'Aktion in Hierarchie ausloesen', ja:'階層でアクション実行', zh:'在层级中触发动作', hi:'पदानुक्रम में क्रिया', ar:'تشغيل الإجراء' },
    's1.show':   { es:'Ver describe()', en:'Show describe()', pt:'Ver describe()', fr:'Voir describe()', it:'Mostra describe()', de:'describe() zeigen', ja:'describe()表示', zh:'显示 describe()', hi:'describe() दिखाएँ', ar:'عرض describe()' },
    /* Section 2 */
    's2.title':  { es:'2. autoRegister (DOM-driven)', en:'2. autoRegister (DOM-driven)', pt:'2. autoRegister (orientado por DOM)', fr:'2. autoRegister (oriente DOM)', it:'2. autoRegister (DOM-driven)', de:'2. autoRegister (DOM-gesteuert)', ja:'2. autoRegister（DOM駆動）', zh:'2. autoRegister（DOM 驱动）', hi:'2. autoRegister (DOM-संचालित)', ar:'2. autoRegister (مدفوع بـDOM)' },
    's2.desc':   { es:'Inserta una card en runtime. NAC la auto-registra.', en:'Inject a card at runtime. NAC auto-registers it.', pt:'Insira uma card em tempo de execucao. NAC auto-registra.', fr:'Inserez une carte au runtime. NAC auto-enregistre.', it:'Inserisci una card a runtime. NAC auto-registra.', de:'Karte zur Laufzeit einfuegen. NAC registriert automatisch.', ja:'実行時にカードを挿入。NACが自動登録。', zh:'在运行时插入卡片。NAC 自动注册。', hi:'रनटाइम पर कार्ड डालें। NAC ऑटो-रजिस्टर करता है।', ar:'أدخل بطاقة في وقت التشغيل. NAC يسجل تلقائيا.' },
    /* Section 3 */
    's3.title':  { es:'3. Adopt third-party (no compliance)', en:'3. Adopt third-party (non-compliant)', pt:'3. Adotar terceiro (nao compliance)', fr:'3. Adopter tiers (non conforme)', it:'3. Adotta terzi (non conforme)', de:'3. Drittanbieter adoptieren (nicht konform)', ja:'3. サードパーティ採用（非準拠）', zh:'3. 采纳第三方（非合规）', hi:'3. तीसरे पक्ष को अपनाएँ', ar:'3. تبني طرف ثالث (غير متوافق)' },
    's3.desc':   { es:'El widget amarillo no tiene NAC. Lo adoptamos via selector.', en:'The yellow widget has no NAC. We adopt it via selector.', pt:'O widget amarelo nao tem NAC. Adotamos via seletor.', fr:'Le widget jaune n\'a pas de NAC. On l\'adopte via selecteur.', it:'Il widget giallo non ha NAC. Lo adottiamo via selettore.', de:'Das gelbe Widget hat kein NAC. Wir adoptieren via Selektor.', ja:'黄色のウィジェットはNAC無し。セレクタ経由で採用。', zh:'黄色组件无 NAC。我们通过选择器采纳。', hi:'पीले विजेट में NAC नहीं है। हम सेलेक्टर द्वारा अपनाते हैं।', ar:'الأداة الصفراء بدون NAC. نتبناها عبر المحدد.' },
    's3.adopt':  { es:'Ejecutar NAC.adopt()', en:'Run NAC.adopt()', pt:'Executar NAC.adopt()', fr:'Executer NAC.adopt()', it:'Esegui NAC.adopt()', de:'NAC.adopt() ausfuehren', ja:'NAC.adopt()実行', zh:'运行 NAC.adopt()', hi:'NAC.adopt() चलाएँ', ar:'تشغيل NAC.adopt()' },
    /* Section 4 */
    's4.title':  { es:'4. HMAC mandatory + isTrusted', en:'4. HMAC mandatory + isTrusted', pt:'4. HMAC obrigatorio + isTrusted', fr:'4. HMAC obligatoire + isTrusted', it:'4. HMAC obbligatorio + isTrusted', de:'4. HMAC obligatorisch + isTrusted', ja:'4. HMAC必須 + isTrusted', zh:'4. HMAC 强制 + isTrusted', hi:'4. HMAC अनिवार्य + isTrusted', ar:'4. HMAC إلزامي + isTrusted' },
    's4.desc':   { es:'En NAC-3, agente debe firmar; usuario debe attestation.', en:'At NAC-3, agent must sign; user must attestation.', pt:'Em NAC-3, agente deve assinar; usuario deve atestar.', fr:'A NAC-3, l\'agent doit signer; l\'utilisateur doit attester.', it:'A NAC-3, agente deve firmare; utente deve attestare.', de:'Bei NAC-3 muss Agent signieren; Benutzer muss bestaetigen.', ja:'NAC-3では、エージェントは署名、ユーザーは証明必須。', zh:'在 NAC-3，代理必须签名，用户必须证明。', hi:'NAC-3 में, एजेंट को साइन करना चाहिए; उपयोगकर्ता को सत्यापित करना चाहिए।', ar:'في NAC-3، يجب على الوكيل التوقيع؛ المستخدم الإثبات.' },
    's4.trusted':{ es:'User-clicked (isTrusted=true)', en:'User-clicked (isTrusted=true)', pt:'Clicado por usuario (isTrusted=true)', fr:'Clique utilisateur (isTrusted=true)', it:'Cliccato dall\'utente (isTrusted=true)', de:'Benutzer-geklickt (isTrusted=true)', ja:'ユーザークリック (isTrusted=true)', zh:'用户点击 (isTrusted=true)', hi:'उपयोगकर्ता क्लिक (isTrusted=true)', ar:'نقر المستخدم (isTrusted=true)' },
    's4.synthetic':{ es:'Programatico .click() (isTrusted=false)', en:'Programmatic .click() (isTrusted=false)', pt:'Programatico .click() (isTrusted=false)', fr:'.click() programmatique (isTrusted=false)', it:'.click() programmatico (isTrusted=false)', de:'Programmatisches .click() (isTrusted=false)', ja:'プログラム的.click() (isTrusted=false)', zh:'编程式 .click() (isTrusted=false)', hi:'प्रोग्रामेटिक .click() (isTrusted=false)', ar:'.click() برمجي (isTrusted=false)' },
    's4.agent':  { es:'Emitir como agente (HMAC sign)', en:'Emit as agent (HMAC sign)', pt:'Emitir como agente (HMAC sign)', fr:'Emettre comme agent (HMAC sign)', it:'Emetti come agente (HMAC sign)', de:'Als Agent ausloesen (HMAC signieren)', ja:'エージェントとして実行（HMAC署名）', zh:'作为代理发送（HMAC 签名）', hi:'एजेंट के रूप में भेजें (HMAC sign)', ar:'الإصدار كوكيل (توقيع HMAC)' },
    /* Section 5 */
    's5.title':  { es:'5. i18n contract (L1)', en:'5. i18n contract (L1)', pt:'5. Contrato i18n (L1)', fr:'5. Contrat i18n (L1)', it:'5. Contratto i18n (L1)', de:'5. i18n-Vertrag (L1)', ja:'5. i18n契約 (L1)', zh:'5. i18n 契约 (L1)', hi:'5. i18n कॉन्ट्रैक्ट (L1)', ar:'5. عقد i18n (L1)' },
    's5.desc':   { es:'Cambia el locale; cada data-i18n-key se resuelve.', en:'Switch locale; every data-i18n-key resolves.', pt:'Mude o locale; cada data-i18n-key resolve.', fr:'Changez le locale; chaque data-i18n-key se resout.', it:'Cambia locale; ogni data-i18n-key si risolve.', de:'Locale wechseln; jeder data-i18n-key loest sich auf.', ja:'ロケールを切替；各data-i18n-keyが解決される。', zh:'切换语言；每个 data-i18n-key 都会解析。', hi:'लोकल बदलें; प्रत्येक data-i18n-key हल होती है।', ar:'بدل اللغة؛ كل data-i18n-key يحل.' },
    's5.validate':{ es:'Validar 10-locale completeness', en:'Validate 10-locale completeness', pt:'Validar completude 10-locale', fr:'Valider l\'integralite 10-locale', it:'Valida completezza 10-locale', de:'10-Locale-Vollstaendigkeit pruefen', ja:'10ロケール完全性検証', zh:'验证10种语言完整性', hi:'10-locale पूर्णता सत्यापन', ar:'التحقق من اكتمال 10 لغات' },
    /* Section 6 */
    's6.title':  { es:'6. declareVirtual (virtualized list)', en:'6. declareVirtual (virtualized list)', pt:'6. declareVirtual (lista virtualizada)', fr:'6. declareVirtual (liste virtualisee)', it:'6. declareVirtual (lista virtualizzata)', de:'6. declareVirtual (virtualisierte Liste)', ja:'6. declareVirtual（仮想化リスト）', zh:'6. declareVirtual（虚拟化列表）', hi:'6. declareVirtual (वर्चुअलाइज़्ड सूची)', ar:'6. declareVirtual (قائمة افتراضية)' },
    's6.desc':   { es:'1000 filas; ~10 en DOM. NAC declara las 1000 via resolver.', en:'1000 rows; ~10 in DOM. NAC declares all 1000 via resolver.', pt:'1000 linhas; ~10 no DOM. NAC declara todas via resolver.', fr:'1000 lignes; ~10 dans le DOM. NAC declare toutes via resolver.', it:'1000 righe; ~10 nel DOM. NAC dichiara tutte via resolver.', de:'1000 Zeilen; ~10 im DOM. NAC deklariert alle via Resolver.', ja:'1000行; DOMには10行。NACが1000行をresolverで宣言。', zh:'1000 行；DOM 中约 10 行。NAC 通过 resolver 声明全部。', hi:'1000 पंक्तियाँ; DOM में ~10। NAC सभी को resolver द्वारा घोषित करता है।', ar:'1000 صف؛ ~10 في DOM. NAC يعلن كل واحد عبر resolver.' },
    's6.find':   { es:'Buscar rows.472 via NAC.find()', en:'Find rows.472 via NAC.find()', pt:'Encontrar rows.472 via NAC.find()', fr:'Trouver rows.472 via NAC.find()', it:'Trova rows.472 via NAC.find()', de:'rows.472 via NAC.find() finden', ja:'rows.472をNAC.find()で検索', zh:'通过 NAC.find() 查找 rows.472', hi:'NAC.find() द्वारा rows.472 खोजें', ar:'البحث عن rows.472 عبر NAC.find()' },
    /* Section 7 */
    's7.title':  { es:'7. captureEphemeral', en:'7. captureEphemeral', pt:'7. captureEphemeral', fr:'7. captureEphemeral', it:'7. captureEphemeral', de:'7. captureEphemeral', ja:'7. captureEphemeral', zh:'7. captureEphemeral', hi:'7. captureEphemeral', ar:'7. captureEphemeral' },
    's7.desc':   { es:'Toast por 3s. NAC lo captura en buffer ring.', en:'3s toast. NAC captures it in ring buffer.', pt:'Toast de 3s. NAC captura no buffer ring.', fr:'Toast 3s. NAC le capture dans un buffer ring.', it:'Toast 3s. NAC lo cattura nel buffer ring.', de:'3s Toast. NAC erfasst im Ringpuffer.', ja:'3秒のトースト。NACがリングバッファに記録。', zh:'3秒提示。NAC 在环形缓冲区捕获。', hi:'3 सेकंड टोस्ट। NAC रिंग बफर में कैप्चर करता है।', ar:'إشعار 3 ثوان. NAC يلتقطه في الحلقة.' },
    's7.toast':  { es:'Mostrar toast 3s', en:'Show 3s toast', pt:'Mostrar toast 3s', fr:'Montrer toast 3s', it:'Mostra toast 3s', de:'3s-Toast anzeigen', ja:'3秒トースト表示', zh:'显示 3 秒提示', hi:'3s टोस्ट दिखाएँ', ar:'عرض الإشعار 3 ثوان' },
    's7.ring':   { es:'Ver ring buffer', en:'Show ephemeral_log', pt:'Ver buffer', fr:'Voir le buffer', it:'Mostra buffer', de:'Ring-Puffer anzeigen', ja:'バッファ表示', zh:'显示缓冲区', hi:'बफर दिखाएँ', ar:'عرض المخزن' },
    /* Section 8 */
    's8.title':  { es:'8. describe_v2() introspection', en:'8. describe_v2() introspection', pt:'8. introspeccao describe_v2()', fr:'8. introspection describe_v2()', it:'8. introspezione describe_v2()', de:'8. describe_v2() Introspektion', ja:'8. describe_v2()内省', zh:'8. describe_v2() 内省', hi:'8. describe_v2() आत्मनिरीक्षण', ar:'8. استبطان describe_v2()' },
    's8.desc':   { es:'Snapshot completo del manifest v2 que el agente lee.', en:'Full v2 manifest snapshot the agent reads.', pt:'Snapshot completo do manifest v2 que o agente le.', fr:'Snapshot complet du manifest v2 que l\'agent lit.', it:'Snapshot completo del manifest v2 che l\'agente legge.', de:'Vollstaendiger v2 Manifest-Snapshot, den der Agent liest.', ja:'エージェントが読むv2マニフェスト全体スナップショット。', zh:'代理读取的完整 v2 清单快照。', hi:'एजेंट द्वारा पढ़ा गया पूर्ण v2 मैनिफेस्ट स्नैपशॉट।', ar:'لقطة كاملة لـmanifest v2 يقرأها الوكيل.' },
    's8.run':    { es:'Refrescar describe_v2()', en:'Refresh describe_v2()', pt:'Atualizar describe_v2()', fr:'Rafraichir describe_v2()', it:'Aggiorna describe_v2()', de:'describe_v2() aktualisieren', ja:'describe_v2()更新', zh:'刷新 describe_v2()', hi:'describe_v2() ताज़ा करें', ar:'تحديث describe_v2()' }
  };

  /* ============== boot ================================================== */

  if (!window.NAC || !window.NAC.scope) {
    console.error('NAC v2 extension not loaded');
    return;
  }

  /* Register the catalog with NAC */
  NAC.registerCatalog(catalog);

  /* Register HMAC secret */
  NAC.set_provenance_secret('demo-shared-secret-v20');

  /* Build scope tree for the demo */
  var shellScope    = NAC.scope({ slug: 'shell',    label_i18n: { es: 'Shell', en: 'Shell' } });
  var s1Scope = shellScope.scope({ slug: 'section1' });
  var s2Scope = shellScope.scope({ slug: 'section2' });
  var s3Scope = shellScope.scope({ slug: 'section3' });
  var s4Scope = shellScope.scope({ slug: 'section4' });
  var s5Scope = shellScope.scope({ slug: 'section5' });
  var s6Scope = shellScope.scope({ slug: 'section6' });
  var s7Scope = shellScope.scope({ slug: 'section7' });
  var s8Scope = shellScope.scope({ slug: 'section8' });

  /* ============== translation pass ===================================== */

  function applyTranslations() {
    document.querySelectorAll('[data-i18n-key]').forEach(function (el) {
      var k = el.getAttribute('data-i18n-key');
      var v = NAC.t(k);
      if (v) el.textContent = v;
    });
  }
  applyTranslations();

  /* ============== Section 1 wires ====================================== */

  var btnGo = s1Scope.register({
    slug: 'btn-go',
    intent: 'navigate',
    label_i18n: catalog['s1.btn'],
    element: document.getElementById('btn-scope-go'),
    handler: function () { return 'fired_in_hierarchy_at_' + Date.now(); }
  });

  document.getElementById('btn-scope-go').addEventListener('click', function () {
    btnGo.invoke().then(function (r) {
      log('log-scope', 'invoke() -> ' + r + '\nslug = ' + btnGo.id);
    });
  });
  document.getElementById('btn-scope-show').addEventListener('click', function () {
    var d = NAC.describe_v2();
    log('log-scope', JSON.stringify(d.v2_scope_entries, null, 2));
  });

  /* ============== Section 2 wires (autoRegister) ======================= */

  var grid = document.getElementById('cards-grid');
  /* Watch the grid container so future inserts auto-register */
  NAC.autoRegister.watch(grid, { i18n_strict: 'permissive' });

  var cardCounter = 0;
  document.getElementById('btn-add-card').addEventListener('click', function () {
    cardCounter++;
    var d = document.createElement('div');
    d.className = 'card';
    d.setAttribute('data-nac-action', 'open-card-' + cardCounter);
    d.setAttribute('aria-label', 'Card ' + cardCounter);
    d.innerHTML = '<div class="card-title">Dynamic card ' + cardCounter + '</div>'
                + '<div class="card-desc">Auto-registered by NAC v2</div>';
    d.addEventListener('click', function () { log('log-scope', 'card ' + cardCounter + ' clicked'); });
    grid.appendChild(d);
  });
  document.getElementById('btn-clear-cards').addEventListener('click', function () {
    grid.innerHTML = '';
    cardCounter = 0;
  });

  /* ============== Section 3 wires (adopt) ============================== */

  /* IMPORTANT NOTE on adopt() behaviour:
     NAC.adopt() registers manifest metadata (slug, role, label_i18n)
     so the agent can SEE the third-party widgets via describe_v2().
     But adopt() does NOT install click handlers -- the third-party
     widget keeps its original interactivity (or lack thereof).
     For the user to see the buttons "react" via NAC events after
     adopt, the host must wire click -> NAC event emission. The demo
     does this below to make the effect visible. */
  document.getElementById('btn-adopt').addEventListener('click', function () {
    NAC.adopt({
      selector: '[data-third-party] button[data-action]',
      parent: 'shell.section3',
      derive: {
        slug:   function (el) { return el.dataset.action; },
        role:   function () { return 'button'; },
        intent: function () { return 'commit'; },
        label_i18n: function (el) {
          var lbl = el.getAttribute('aria-label') || el.textContent.trim();
          /* Mono-locale fallback flagged at NAC-3 strict */
          var o = {}; o[NAC.locale()] = lbl; return o;
        }
      },
      observe: false
    });
    var adopted = Object.keys(NAC.__v2._scopes).filter(function (k) {
      return k.indexOf('shell.section3.') === 0;
    });

    /* Post-adopt: wire click handlers on the now-adopted buttons so
       the user sees them fire as NAC actions. Without this step the
       buttons stay visually unchanged and clicking them does nothing
       -- adopt only registers metadata, not behaviour. */
    document.querySelectorAll('[data-third-party] button[data-action]').forEach(function (btn) {
      if (btn.__nacAdoptWired) return; /* idempotent */
      btn.__nacAdoptWired = true;
      btn.addEventListener('click', function () {
        var slug = 'shell.section3.' + btn.dataset.action;
        var entry = NAC.__v2._scopes[slug];
        if (!entry) {
          log('log-adopt', 'Click before adopt -- no manifest entry for ' + slug);
          return;
        }
        /* Synthesise a nac:command_pending so the agent / audit log
           sees the third-party action firing as a first-class NAC
           command. Real adopters might emit nac:action:succeeded on
           completion of the original handler. */
        var detail = {
          provenance: {
            slug: slug, source: 'user',
            user_gesture_attested: true,
            ts: Date.now()
          }
        };
        document.dispatchEvent(new CustomEvent('nac:command_pending', {
          detail: detail, bubbles: true
        }));
        log('log-adopt',
          'Third-party "' + btn.textContent.trim() + '" clicked.\n' +
          'NAC slug: ' + slug + '\n' +
          'Now visible as a first-class NAC action via the manifest.\n' +
          'Try NAC.__v2._scopes["' + slug + '"] in console.');
      });
      /* Visual cue: pulse the border so user sees adoption is live. */
      btn.style.transition = 'box-shadow 0.4s';
      btn.style.boxShadow = '0 0 0 3px rgba(16,185,129,0.6)';
      setTimeout(function () { btn.style.boxShadow = ''; }, 1200);
    });

    log('log-adopt',
      'Adopted ' + adopted.length + ' third-party buttons:\n' + adopted.join('\n') +
      '\n\nNOW try clicking any of the yellow widget buttons above --\n' +
      'they fire NAC events with their adopted slugs.');
  });

  /* ============== Section 4 wires (HMAC + isTrusted) ================== */

  s4Scope.register({
    slug: 'btn-trusted',
    intent: 'commit',
    label_i18n: catalog['s4.trusted'],
    element: document.getElementById('btn-trusted'),
    handler: function (params, detail) {
      log('log-hmac',
        'TRUSTED user click:\n  user_gesture_attested = ' + detail.provenance.user_gesture_attested
        + '\n  signature = ' + (detail.provenance.signature ? detail.provenance.signature.slice(0, 30) + '...' : 'none')
        + '\n  source.type = ' + detail.provenance.source);
    }
  });
  document.getElementById('btn-trusted').addEventListener('click', function () {
    NAC.__v2._scopes['shell.section4.btn-trusted'].handler({}, {
      provenance: {
        slug: 'shell.section4.btn-trusted', source: 'user',
        user_gesture_attested: true,
        signature: null,
        ts: Date.now()
      }
    });
  });

  document.getElementById('btn-synthetic').addEventListener('click', function () {
    /* Programmatically trigger the trusted button -- isTrusted=false */
    var tb = document.getElementById('btn-trusted');
    /* Synthetic events have isTrusted=false, so the runtime gesture
       capture sees attested=false. NAC-3 would reject this for
       source.type='user'. */
    log('log-hmac',
      'SYNTHETIC click(): event.isTrusted will be FALSE\n'
      + '  -> if this declared source.type=user at NAC-3, it would\n'
      + '     be REJECTED with reason user_gesture_unattested.');
    tb.click();
  });

  document.getElementById('btn-as-agent').addEventListener('click', function () {
    NAC.sign_provenance(
      { slug: 'shell.section4.btn-as-agent', source: 'agent', ts: Date.now() },
      'demo-shared-secret-v20'
    ).then(function (sig) {
      log('log-hmac',
        'AGENT-source action with HMAC signature:\n  signature = ' + sig.slice(0, 40) + '...\n'
        + '  source.type = agent\n'
        + '  user_gesture_attested = false (agent-driven, not OS-level)\n'
        + '  -> at NAC-3, this would PASS verification.');
    });
  });

  /* ============== Section 5 wires (i18n) =============================== */

  document.querySelectorAll('#locale-switcher .locale-btn').forEach(function (b) {
    b.addEventListener('click', function () {
      document.querySelectorAll('#locale-switcher .locale-btn').forEach(function (x) {
        x.classList.remove('active');
      });
      b.classList.add('active');
      NAC.locale(b.getAttribute('data-locale'));
      applyTranslations();
    });
  });
  /* mark default es */
  document.querySelector('#locale-switcher [data-locale="es"]').classList.add('active');

  document.getElementById('btn-validate-i18n').addEventListener('click', function () {
    var f = NAC.validate_global_v2({ i18n_strict: true });
    log('log-i18n',
      'errors: ' + f.errors.length + '\nwarnings: ' + f.warnings.length
      + (f.errors.length ? '\n\nfirst errors:\n' + JSON.stringify(f.errors.slice(0,3), null, 2) : '\n\nno errors')
    );
  });

  /* ============== Section 6 wires (declareVirtual) ===================== */

  var virtualList = document.getElementById('virtual-list');
  /* Build a synthetic 10-row visible window for the demo */
  for (var i = 0; i < 10; i++) {
    var row = document.createElement('div');
    row.className = 'virtual-row';
    row.textContent = 'Visible row ' + i + ' (DOM-rendered)';
    virtualList.appendChild(row);
  }
  /* Declare the full 1000 */
  NAC.declareVirtual({
    slug_pattern: 'shell.section6.rows.{i}',
    count: 1000,
    resolver: function (i) {
      return {
        slug: 'shell.section6.rows.' + i,
        role: 'row',
        label_i18n: { es: 'Fila ' + i, en: 'Row ' + i },
        element: null
      };
    }
  });

  document.getElementById('btn-find-virtual').addEventListener('click', function () {
    /* Manual call to internal resolver */
    var v = NAC.__v2._virtuals[0];
    var r = v.resolver(472);
    log('log-virtual',
      'NAC.find equivalent for rows.472 (resolver call):\n'
      + JSON.stringify(r, null, 2)
      + '\n\nThe agent IA can operate any of 1000 rows without needing them in DOM.'
    );
  });

  /* ============== Section 7 wires (captureEphemeral) =================== */

  var capturedRing = [];
  NAC.captureEphemeral({
    duration_ms: 3500,
    ring_size: 50,
    on_capture: function (c) { capturedRing.push(c); }
  });

  document.getElementById('btn-toast').addEventListener('click', function () {
    var toastId = 'toast-' + Date.now();
    var t = document.createElement('div');
    t.className = 'toast';
    t.setAttribute('data-nac-id', toastId);
    t.setAttribute('role', 'alert');
    t.textContent = 'I am a 3s toast (' + toastId + ')';
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 3000);
  });
  document.getElementById('btn-show-ring').addEventListener('click', function () {
    log('log-ephemeral',
      'ephemeral_log entries: ' + capturedRing.length + '\n\n'
      + JSON.stringify(capturedRing.slice(-5), null, 2)
    );
  });

  /* ============== Section 8 wires (describe_v2) ======================== */

  document.getElementById('btn-describe').addEventListener('click', function () {
    var d = NAC.describe_v2();
    log('log-describe',
      'nac_version: ' + d.nac_version
      + '\nlocale: ' + d.locale
      + '\nsupported_locales: ' + d.supported_locales.join(', ')
      + '\ntenant_prefix: ' + d.tenant_prefix
      + '\nv2_scope_entries: ' + d.v2_scope_entries.length
      + '\nvirtual blocks: ' + d.virtual.length
      + '\nephemeral_log size: ' + d.ephemeral_log.length
      + '\n\nfirst scope entries:\n' + JSON.stringify(d.v2_scope_entries.slice(0, 5), null, 2)
    );
  });

  /* ============== helpers ============================================== */

  function log(id, msg) {
    var el = document.getElementById(id);
    if (!el) return;
    var ts = new Date().toISOString().split('T')[1].slice(0, 8);
    el.textContent = '[' + ts + '] ' + msg + '\n\n' + el.textContent;
  }

  log('log-scope', 'NAC v2.0 demo loaded.\nUse the buttons above to exercise each primitive.');
})();
</script>

</body>
</html>
