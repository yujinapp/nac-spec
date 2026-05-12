---
translation_source: CONTRIBUTING.md
translation_source_hash: 15fa7e8a34cc86e6193de8cd9826a9bd98d4b3ac1c72a43646521d75f88f9a26
translation_quality: machine_v1
translation_lang: hi
translation_date: 2026-05-11T13:12:25.461525+00:00
---

# NAC3 में योगदान

**Spec संस्करण:** 2.2 stable (+ v2.3 interop preview)।

## Governance

NAC3 वर्तमान में Yujin द्वारा संचालित है। Spec Apache 2.0 लाइसेंस के अंतर्गत है; reference runtime MIT के अंतर्गत है। Yujin की प्रतिबद्धता है कि जब adoption इसे उचित ठहराए, तब NAC3 को एक neutral foundation (W3C community group, Linux Foundation, या समकक्ष) को सौंपा जाएगा। तब तक, spec में बदलाव नीचे दी गई RFC प्रक्रिया के अनुसार होंगे, जिसमें public API या wire formats में किसी भी बदलाव के लिए कम से कम 14 दिनों की सार्वजनिक टिप्पणी अवधि अनिवार्य है।

Apache 2.0 + MIT लाइसेंसिंग यह सुनिश्चित करती है कि Yujin की कॉर्पोरेट स्थिति में किसी भी बदलाव के बावजूद spec और runtime बने रहें। दोनों लाइसेंसों के अंतर्गत forks का स्पष्ट रूप से स्वागत है।

---

योगदान पर विचार करने के लिए धन्यवाद। NAC3 एक public spec के साथ-साथ एक reference implementation है; दोनों में योगदान स्वीकार किए जाते हैं।

## योगदान के तीन प्रकार

### 1. Spec बदलाव (RFC आवश्यक)

`SPEC.md`, `ABOUT.md`, या `docs/NAC_V*_ROADMAP.md` में संपादन spec बदलाव माने जाते हैं। PR खोलने से पहले:

1. GitHub issue खोलें जिसका शीर्षक `RFC: <one-line summary>` हो।
2. समस्या की श्रेणी का वर्णन करें (यह किस bug या सीमा को ठीक करता है, आदर्श रूप से एक ठोस reproduction के साथ)।
3. प्रस्तावित contract बदलाव का वर्णन करें।
4. मौजूदा adopters के लिए migration path का वर्णन करें।
5. PR खोलने से पहले issue पर कम से कम एक maintainer की प्रतिक्रिया की प्रतीक्षा करें।

बिना paired RFC issue के आए spec PRs को इस अनुभाग की ओर संकेत करते हुए बंद कर दिया जाएगा।

### 2. Reference runtime बदलाव

`js/nac.js`, `js/nac-v2-extensions.js`, या `js/nac-chat-client.js` में संपादन। RFC के बिना PR स्वागत योग्य है यदि:

- बदलाव एक bug fix है जो runtime को मौजूदा spec के अनुरूप बनाता है।
- बदलाव एक performance सुधार है जिसमें कोई व्यावहारिक अंतर नहीं है।
- बदलाव documentation, types, या test coverage से संबंधित है।

ऐसे PRs जो runtime के व्यवहार को इस तरह बदलते हैं कि spec contract प्रभावित हो, उनके साथ पहले spec RFC होना अनिवार्य है।

### 3. Demo, tooling, या दस्तावेज़ सुधार

`example*.php`, `tools/`, `guides/`, या किसी भी non-spec markdown में संपादन। सीधे PR करें। बदलाव न्यूनतम रखें; हम एक बड़े PR की बजाय दस छोटे PRs को प्राथमिकता देते हैं।

## Code style

- केवल ASCII source files (यह प्रोजेक्ट GoDaddy-deployed है; PHP 8.3 comments में भी non-ASCII को अस्वीकार करता है)। em-dashes के लिए `--` उपयोग करें, `--` नहीं।
- JS: runtime files पर कोई transpiler, bundler, या build step नहीं। Plain ES2018+। npm package उसी source के चारों ओर एक ESM/CJS wrapper जोड़ता है।
- PHP: heredocs सरल रखें (केवल `{$var}`, कोई expressions नहीं)।
- Comments: WHY समझाएं, WHAT नहीं। diff पहले से ही what दिखाता है।
- Tests: हर व्यावहारिक बदलाव के साथ एक ऐसा test होना चाहिए जो पहले fail हो और बाद में pass हो। Push करने से पहले repo root से `make test-launch` चलाएं।

## Commit style

- Subject 70 characters से कम, present-tense imperative में।
  "fix(nac): treat tab role drift as register-time error", न कि
  "Fixed tab thing"।
- Body में समस्या, कारण और समाधान का वर्णन हो। संबंधित commits को short SHA से उद्धृत करें।
- AI-assisted commits के लिए co-author trailer ठीक है; हम tooling छुपाते नहीं।

## Review प्रक्रिया

- Bugfix PRs: 1 approver, merge।
- Runtime/spec PRs: 1 approver + green CI, merge।
- Spec change PRs: paired RFC issue with discussion + 1 approver + green CI + PR खुलने के बाद 7-दिन की comment window।

## लाइसेंसिंग

PR submit करके आप अपना योगदान Apache-2.0 के अंतर्गत लाइसेंस करते हैं, जो प्रोजेक्ट से मेल खाता है। PR template में एक checkbox शामिल है; उसे tick करें।

## आचार संहिता

तकनीकी रूप से सही, संक्षिप्त और विनम्र रहें। असहमति ठीक है; व्यक्तिगत आक्षेप नहीं। Maintainers बार-बार उल्लंघन करने पर threads बंद कर सकते हैं या commit access रद्द कर सकते हैं।

## प्रश्न कहाँ पूछें

- Design संबंधी प्रश्नों, "क्या मुझे इसके लिए NAC3 उपयोग करना चाहिए?", और showcases के लिए GitHub Discussions।
- Bug reports के लिए GitHub Issues।
- Security संबंधी खुलासों के लिए `nac@yujin.dev` (देखें `SECURITY.md`)।

---

*This is a machine translation of the canonical English
version at `/nac-spec/CONTRIBUTING.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
