---
translation_source: docs/ACCESSIBILITY.md
translation_source_hash: 615f9c5a447d95c7aee985d926f7b29377bed44dc959fd07a966fd41fa86a03b
translation_quality: machine_v1
translation_lang: pt
translation_date: 2026-05-11T13:34:04.934743+00:00
---

# NAC3 -- Compromisso com acessibilidade

**Versão da spec:** 2.2 estável (+ prévia de interoperabilidade v2.3).
**Última revisão:** 2026-05-11.

O NAC3 foi projetado para tornar interfaces web endereçáveis por máquinas. A
mesma propriedade que torna uma UI navegável por um agente de IA a torna
navegável por um leitor de tela, um dispositivo de switch, um rastreador ocular
e um usuário de voz. O NAC3 é, por construção, um primitivo de acessibilidade
-- e a Yujin se compromete a mantê-lo assim.

---

## O compromisso

1. **Conformidade WCAG 2.1 Nível AA** é o piso para todo
   produto Yujin construído sobre o NAC3 (`yujin-pilot`,
   `yujin-forge`, as demos de referência em yujin.app/nac-spec/,
   yujin.app/registry).
2. **AAA onde viável** para as superfícies onde a acessibilidade
   é mais importante: painel de chat, ativação por voz, onboarding
   inicial, mensagens de erro.
3. **Sem "edição acessível" separada**. Acessibilidade é entregue
   no produto principal, pelo mesmo preço, com o mesmo ciclo de
   lançamento. Edições separadas estigmatizam usuários e se deterioram.
4. **Sem "acessibilidade depois"**. Cada versão é bloqueada pelas
   verificações de acessibilidade documentadas em
   [HUMAN_OK_CHECKLIST.md](HUMAN_OK_CHECKLIST.md) seção 8.6
   e na nova seção de smoke test para leitores de tela (Track G7).

---

## Tecnologias assistivas suportadas

As implementações de referência são testadas com:

| Categoria de AT | Ferramentas verificadas |
|-----------------|------------------------|
| Leitores de tela | NVDA (Windows), JAWS (Windows), VoiceOver (macOS, iOS) |
| Controle por voz | Yujin Pilot, Apple Voice Control, Windows Speech Recognition, Dragon NaturallySpeaking |
| Acesso por switch | iOS Switch Control, Android Switch Access |
| Rastreamento ocular | Tobii Dynavox |
| Ampliação | Zoom do navegador até 200%, ZoomText, macOS Zoom |
| Somente teclado | Navegação completa por teclado, foco visível, sem limites de tempo |

Qualquer AT que consuma a árvore de acessibilidade padrão (ARIA,
accessibilityRole, accessibilityLabel) se beneficia do NAC3,
pois os elementos NAC3 carregam as mesmas informações semânticas
utilizadas pela camada de AT.

---

## O que o NAC3 contribui para a acessibilidade (mecanismo)

- **Identificadores estáveis (`data-nac-id`)**: leitores de tela e
  dispositivos de switch não dependem de posição visual. O
  identificador sobrevive a redesigns, portanto a memória muscular
  do usuário de AT também sobrevive.
- **Roles canônicos (`data-nac-role`)**: a enumeração de roles
  (action, field, tab, etc) mapeia 1:1 para roles ARIA. Usuários de AT
  ouvem anúncios semanticamente corretos.
- **Verbos do manifesto (`label_i18n`)**: cada ação possui um
  rótulo localizado em 10 idiomas. Usuários de controle por voz falam
  o verbo; o manifesto o resolve.
- **Eventos de confirmação determinísticos (`nac:action:succeeded`)**:
  usuários de AT ouvem a confirmação de que uma ação foi concluída, não
  uma suposição baseada em animação da UI.
- **Validação estrita (v2.2)**: detecta divergências entre o manifesto
  e o DOM antes que cheguem aos usuários de AT.

---

## O que o NAC3 NÃO resolve

- **Aplicações nativas iOS/Android**: a spec v2.2 cobre
  apenas web + WebView. Mobile nativo está no roadmap da v3.0.
- **Apresentação visual**: o NAC3 é estrutural. Contraste,
  tamanho de fonte e indicadores de foco são responsabilidade da
  implementação (os tokens Yujin cobrem isso em nossas implementações
  de referência).
- **Carga cognitiva de fluxos complexos**: os ids do NAC3 não tornam
  um fluxo mal projetado simples. Uma boa arquitetura de informação
  e textos em linguagem simples fazem isso.
- **Legendagem de multimídia**: recursos de áudio/vídeo devem ser
  legendados pelo publicador. O NAC3 fornece hooks, mas não o conteúdo.

---

## Reportando um problema de acessibilidade

Envie um e-mail para `accessibility@yujin.app` (ou o endereço que
encaminha para o mantenedor). SLA de resposta: 5 dias úteis para triagem,
sem SLA para correção pois cada caso é diferente. Os problemas são
rastreados publicamente no repositório `nac-spec` com a label `a11y`.

Para problemas sensíveis à segurança (ex.: bypass de AT em diálogos de
confirmação), siga o `SECURITY.md`.

---

## Roadmap

| Track | Descrição | Meta |
|-------|-----------|------|
| G1 | Auditoria WCAG 2.1 AA + remediação (Forge + Pilot UI) | Pré Forge/Pilot v1 |
| G2 | Assistente de configuração voice-first (primeiro uso do Forge + Pilot) | Forge/Pilot v1 |
| G3 | Conformidade com NAC3 em todas as páginas de documentação | Lançamento NAC3 v2.2 |
| G4 | Versão em áudio (.mp3) de cada guia | NAC3 v2.3 |
| G5 | Tutorial conversacional em yujin.app/learn | NAC3 v2.3 |
| G6 | Versão em linguagem simples dos guias principais | NAC3 v2.3 |
| G7 | Smoke test de leitor de tela no HUMAN_OK_CHECKLIST | Lançamento NAC3 v2.2 |
| G8 | Programa beta com usuários reais com deficiência | Pré Forge/Pilot v1 |
| G9 | Esta declaração, pública + vinculada em todas as páginas | Lançamento NAC3 v2.2 |
| G10 | Auditoria certificada externa | Pré Forge/Pilot 1.0 comercial |

---

## Por que publicamos isso

Dois motivos práticos além da ética:

1. **EU Accessibility Act (EAA)** entrou em vigor em junho de 2025 para
   serviços B2C. Aplicações construídas com o Forge são conformes ao NAC3
   por padrão e chegam mais próximas da conformidade com o EAA do que
   as concorrentes.
2. **Processos judiciais ADA Título III nos EUA sobre aplicações web**
   cresceram 320% ao ano. Compradores corporativos se preocupam com isso.
   O NAC3 + a postura de conformidade da Yujin reduz a exposição legal deles.

O NAC3 não é "padrão aberto com acessibilidade como bônus". O NAC3
é "o único contrato de automação web de propósito geral que é
nativo em acessibilidade por construção". Vamos mantê-lo assim.

---

## Veja também

- [SPEC.md](../SPEC.md) -- o contrato canônico.
- [HUMAN_OK_CHECKLIST.md](HUMAN_OK_CHECKLIST.md) -- inclui
  a seção de smoke test para leitores de tela.
- [SECURITY.md](../SECURITY.md) -- modelo de segurança, inclui
  questões relacionadas a AT.

## Licença

Este documento está sob Apache-2.0. As implementações às quais ele se
compromete são MIT (runtime) / Apache-2.0 (spec) / proprietária (Forge,
Pilot).

---

*This is a machine translation of the canonical English
version at `/nac-spec/docs/ACCESSIBILITY.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
