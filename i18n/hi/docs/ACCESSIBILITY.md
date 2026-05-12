---
translation_source: docs/ACCESSIBILITY.md
translation_source_hash: 615f9c5a447d95c7aee985d926f7b29377bed44dc959fd07a966fd41fa86a03b
translation_quality: machine_v1
translation_lang: hi
translation_date: 2026-05-11T15:25:28.815744+00:00
---

# NAC3 -- Accessibility की प्रतिबद्धता

**Spec संस्करण:** 2.2 stable (+ v2.3 interop preview)।
**अंतिम समीक्षा:** 2026-05-11।

NAC3 को इस उद्देश्य से डिज़ाइन किया गया था कि web UI को मशीनों द्वारा संबोधित किया जा सके। जो गुण किसी UI को AI agent द्वारा नेविगेट करने योग्य बनाता है, वही उसे screen reader, switch device, eye tracker और voice user द्वारा भी नेविगेट करने योग्य बनाता है। NAC3 अपनी संरचना से ही एक accessibility primitive है -- और Yujin इसे इसी रूप में बनाए रखने के लिए प्रतिबद्ध है।

---

## प्रतिबद्धता

1. **WCAG 2.1 Level AA** अनुपालन उन सभी Yujin उत्पादों के लिए न्यूनतम मानक है जो NAC3 पर आधारित हैं (`yujin-pilot`, `yujin-forge`, yujin.app/nac-spec/ पर उपलब्ध reference demos, yujin.app/registry)।
2. **AAA जहाँ संभव हो** उन surfaces के लिए जहाँ accessibility सबसे अधिक मायने रखती है: chat panel, voice activation, first-run onboarding, error messages।
3. **कोई अलग "accessible edition" नहीं**। Accessibility मुख्य उत्पाद में ही शामिल होती है, उसी मूल्य पर, उसी release cadence के साथ। अलग editions उपयोगकर्ताओं को कलंकित करती हैं और धीरे-धीरे बेकार हो जाती हैं।
4. **कोई "accessible later" नहीं**। प्रत्येक release [HUMAN_OK_CHECKLIST.md](HUMAN_OK_CHECKLIST.md) की section 8.6 और नए screen-reader smoke section (Track G7) में दर्ज accessibility जाँचों पर निर्भर करती है।

---

## समर्थित assistive technologies

Reference implementations को निम्नलिखित के साथ परीक्षण किया गया है:

| AT श्रेणी | सत्यापित उपकरण |
|-------------|----------------|
| Screen readers | NVDA (Windows), JAWS (Windows), VoiceOver (macOS, iOS) |
| Voice control | Yujin Pilot, Apple Voice Control, Windows Speech Recognition, Dragon NaturallySpeaking |
| Switch access | iOS Switch Control, Android Switch Access |
| Eye tracking | Tobii Dynavox |
| Magnification | Browser zoom 200% तक, ZoomText, macOS Zoom |
| Keyboard-only | पूर्ण keyboard navigation, visible focus, कोई time limit नहीं |

कोई भी AT जो standard accessibility tree (ARIA, accessibilityRole, accessibilityLabel) का उपयोग करती है, NAC3 से लाभान्वित होती है -- क्योंकि NAC3 elements में वही semantic जानकारी होती है जो AT layer उपयोग करती है।

---

## NAC3 accessibility में क्या योगदान देता है (तंत्र)

- **स्थिर पहचानकर्ता (`data-nac-id`)**: screen readers और switch access दृश्य स्थिति पर निर्भर नहीं करते। यह पहचानकर्ता redesigns के बाद भी बना रहता है, इसलिए AT उपयोगकर्ता की muscle memory भी बनी रहती है।
- **Canonical roles (`data-nac-role`)**: role enumeration (action, field, tab, आदि) ARIA roles से 1:1 मेल खाती है। AT उपयोगकर्ताओं को semantically सही announcements सुनाई देती हैं।
- **Manifest verbs (`label_i18n`)**: प्रत्येक action का 10 भाषाओं में localised label होता है। Voice control उपयोगकर्ता verb बोलते हैं; manifest उसे resolve करता है।
- **Deterministic ack events (`nac:action:succeeded`)**: AT उपयोगकर्ताओं को पुष्टि सुनाई देती है कि action पूरा हुआ -- UI animation पर आधारित अनुमान नहीं।
- **Strict validation (v2.2)**: manifest और DOM के बीच drift को AT उपयोगकर्ताओं तक पहुँचने से पहले ही पकड़ लेता है।

---

## NAC3 क्या हल नहीं करता

- **Native iOS/Android applications**: v2.2 spec केवल web + WebView को कवर करता है। Native mobile v3.0 roadmap पर है।
- **Visual presentation**: NAC3 structural है। Contrast, font size, focus indicators -- ये सब implementation की जिम्मेदारी हैं (Yujin tokens हमारे reference implementations में इसे कवर करते हैं)।
- **जटिल flows का cognitive load**: NAC3 ids किसी बुरी तरह डिज़ाइन किए गए workflow को सरल नहीं बनाते। अच्छा IA + plain-language copy यह काम करती है।
- **Multimedia का captioning**: audio/video assets को publisher द्वारा caption किया जाना चाहिए। NAC3 hooks प्रदान करता है, content नहीं।

---

## Accessibility संबंधी समस्या रिपोर्ट करना

`accessibility@yujin.app` पर ईमेल करें (या जो भी maintainer को forward होता हो)। Response SLA: triage के लिए 5 business days; fix पर कोई SLA नहीं क्योंकि हर मामला अलग होता है। Issues को `nac-spec` repo में `a11y` label के साथ सार्वजनिक रूप से track किया जाता है।

Security-sensitive issues के लिए (जैसे confirmation dialogs का AT bypass), `SECURITY.md` का पालन करें।

---

## Roadmap

| Track | विवरण | लक्ष्य |
|-------|-------------|--------|
| G1 | WCAG 2.1 AA audit + remediation (Forge + Pilot UI) | Forge/Pilot v1 से पहले |
| G2 | Voice-first setup wizard (Forge + Pilot first-run) | Forge/Pilot v1 |
| G3 | हर doc page में NAC3-compliance | NAC3 v2.2 launch |
| G4 | हर guide का audio संस्करण (.mp3) | NAC3 v2.3 |
| G5 | yujin.app/learn पर conversational tutorial | NAC3 v2.3 |
| G6 | प्रमुख guides का plain-language parallel संस्करण | NAC3 v2.3 |
| G7 | HUMAN_OK_CHECKLIST में screen reader smoke test | NAC3 v2.2 launch |
| G8 | वास्तविक disabled-user beta program | Forge/Pilot v1 से पहले |
| G9 | यह statement, सार्वजनिक + हर page से linked | NAC3 v2.2 launch |
| G10 | बाहरी certified audit | Forge/Pilot 1.0 commercial से पहले |

---

## हम यह क्यों प्रकाशित करते हैं

नैतिकता से परे दो व्यावहारिक कारण:

1. **EU Accessibility Act (EAA)** जून 2025 में B2C services के लिए लागू हुआ। Forge से बने apps डिफ़ॉल्ट रूप से NAC3-compliant होते हैं और प्रतिस्पर्धियों की तुलना में EAA अनुपालन के अधिक करीब होते हैं।
2. **Web apps पर US ADA Title III के मुकदमे** YoY 320% बढ़े हैं। Enterprise खरीदार इस पर ध्यान देते हैं। NAC3 + Yujin compliance posture उनके कानूनी जोखिम को कम करती है।

NAC3 "bonus के रूप में accessibility वाला open standard" नहीं है। NAC3 "एकमात्र general-purpose web automation contract है जो अपनी संरचना से ही accessibility-native है"। हम इसे इसी तरह बनाए रखेंगे।

---

## यह भी देखें

- [SPEC.md](../SPEC.md) -- canonical contract।
- [HUMAN_OK_CHECKLIST.md](HUMAN_OK_CHECKLIST.md) -- screen reader smoke section शामिल है।
- [SECURITY.md](../SECURITY.md) -- security model, AT-संबंधित concerns शामिल हैं।

## License

यह दस्तावेज़ Apache-2.0 है। जिन implementations की यह प्रतिबद्धता करता है वे हैं: MIT (runtime) / Apache-2.0 (spec) / proprietary (Forge, Pilot)।

---

*This is a machine translation of the canonical English
version at `/nac-spec/docs/ACCESSIBILITY.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
