---
translation_source: docs/VOICE_CHAT_ERROR_ANALYSIS_2026_05_09.md
translation_source_hash: 1c92bf209ccbc809e9d43062cc65ea0594983593f9e93293ae2912837f639f8d
translation_quality: machine_v1
translation_lang: pt
translation_date: 2026-05-11T13:46:56.784269+00:00
---

# Análise de erros -- sessão voz+chat 2026-05-09

> Sessão de teste de Pablo em `example-v20-full.php` com voz +
> chat. Este documento isola as falhas observadas, classifica-as
> por causa raiz e propõe uma correção concreta para cada uma.
> ASCII-only.
>
> **STATUS 2026-05-09 (final do dia):** os 8 fixes do
> roadmap estão implementados (C1..C8). Ver seção 7 ao final
> com o resumo de mudanças + localização no código.

---

## 1. Resumo executivo

7 categorias de falhas detectadas. 4 são **bugs reproduzíveis**
com causa raiz identificada no código; 2 são **limitações de
design do pipeline de voz** que requerem mudança de
arquitetura; 1 é **um blocker de UX** (modal bloqueia o chat).

Severidade:

| Categoria | Severidade | Tipo | Prioridade |
|---|---|---|---|
| C1. Feedback loop TTS -> STT | **CRITICAL** | arquitetura | imediata |
| C2. Matcher por sub-cadeia dispara comandos | **HIGH** | bug | imediata |
| C3. Modal de confirmação bloqueia o chat | **HIGH** | UX | alta |
| C4. v20_panel.X não resolve por chat | **MEDIUM** | bug | média |
| C5. Fragmentos de STT executados como comandos | **MEDIUM** | arquitetura | média |
| C6. "show" em inglês mapeia errado quando v20_panel não está | derivado de C4 | -- | resolvido ao fechar C4 |
| C7. "cambia idioma" inconsistente | **LOW** | bug | baixa |

---

## 2. Diário de comandos (input -> output -> diagnóstico)

| # | Input voz / chat | Resposta do bot | Diagnóstico |
|---|---|---|---|
| 1 | "apreta describe_v20" | "No encuentro esa accion. Lo mas parecido: Correr el self-test, Ver capacidades, Ver mapa del sistema." | **C4** -- o manifesto v20_panel não está na árvore que o backend recebe. O bot busca na árvore que enxerga e o top-3 são os slugs reais presentes. |
| 2 | "pulsa boton show" | "Mostrando el mapa del sistema." | **C6** = consequência de C4. A palavra "show" em inglês deveria corresponder a `v20_panel.toggle` (label EN "Toggle panel"), mas como esse plugin não está na árvore, o matcher cai em `navmap.fetch_map` (label "Show the system map"). |
| 3 | "ve a NAC3 v2.0 layer y pulsa el boton mostrar" | "No veo una capa v2.0 ni un boton 'mostrar'. Lo mas cercano: Ver mapa, Ver capacidades, Listar secciones." | **C4** -- consistente com #1. Se o v20_panel está na árvore, o bot encontra `v20_panel.toggle`. Se não, não encontra. |
| 4 | "cambia a ingles" | "No encuentro un control de idioma en esta pagina..." | **C7** -- inconsistente: o comando #16 (idêntico) funcionou. |
| 5 | "pulsa system map" | "Pulsando NAC.system_map()." | OK (acerto). O slug `navmap.fetch_map` está na árvore. |
| 6 | "pulsa capacidades" | "Pulsando NAC.capabilities()." | OK. Slug `navmap.caps`. |
| 7 | "pulsa ver capacidades" | "Pulsando Ver capacidades." | OK. Mesmo slug. |
| 8 | "filtra por ricardo" | "Filtrando la tabla por 'ricardo'." | OK. Tabela com filtro live. |
| 9 | "pon brasil" | "Pongo Brasil en el campo Pais." | OK. Datalist autocomplete. |
| 10 | "sube volumen a 80" | "Subiendo volumen a 80%." | OK. Slider. |
| 11 | "Porqué no me iluminas mostrándome el monte" | "Te muestro el Monte Fuji." | OK. Frase longa + indireta -- o LLM mapeia corretamente para o ícone `art.fuji`. |
| 12 | "secretísimo" | "Abriendo el modal secreto." | OK. |
| 13 | "elimina factura" | "Eliminando la factura." | **C3** -- a ação é destrutiva mas NÃO há confirmação prévia antes de disparar; o modal aparece DEPOIS mas o chat fica bloqueado (ver C3). |
| 14 | "Voz activada" (era TTS do bot) | "Eliminando la factura." | **C1** -- feedback loop. O TTS disse "Voz activada" e o STT captou. A frase "Voz activada" não deveria corresponder a nada, mas por C2 "activada" se associa a um comando de eliminação anterior no buffer. |
| 15 | "voz activada" (eco) | "Eliminando la factura." | **C1** + **C2** -- repete o ciclo. |
| 16 | "eliminatorias" | "Eliminando la factura." | **C2** -- o matcher faz sub-cadeia: o prefixo "elimin" corresponde a "eliminar". Qualquer palavra que comece com "elimina" dispara a ação. |
| 17 | "Muéstrame factura" | "Previsualizando la factura." | OK. |
| 18 | "Manos libres activado..." (TTS) -> "manos libres activado" (STT) | "Modo manos libres confirmado." | **C1** -- mesmo loop. |
| 19 | "modo manos libres confirmado Dime cuáles son tus capacidades" | "Mostrando las capacidades del sistema." | O input é a resposta do bot colada com o comando do usuário. Acertou porque "capacidades" tem match forte. **C5** parcial. |
| 20 | "del sistema" | "Mostrando el mapa del sistema." | **C5** -- fragmento do input anterior é processado como comando independente. |
| 21 | "corre el test" | "Corriendo el self-test de NAC." | OK. |
| 22 | "de nac" | "Corriendo el self-test de NAC." | **C5** -- fragmento. |
| 23 | "cambia a inglés" | "Switching to English mode for upcoming replies." | OK. **MAS** inconsistente com #4 (mesmo input, resposta diferente). |
| 24 | "cambia el idioma de la página a chino" | "No encuentro un control de idioma en esta página..." | **C7** -- o LLM não reconhece este meta-comando como mudança de idioma da sessão, busca-o como um controle na árvore. |

---

## 3. Causa raiz por categoria

### C1 -- Feedback loop TTS -> STT (CRITICAL)

**Mecanismo:** o `SpeechSynthesisUtterance` reproduz a
resposta do bot pelos alto-falantes do usuário. O
`SpeechRecognition` está ativo simultaneamente (modo mãos
livres). O microfone capta a voz dos alto-falantes, o STT
a transcreve como input do usuário, o chat a processa, o
bot volta a falar: ciclo infinito.

Qualquer resposta do bot que contenha uma palavra
similar-a-comando (eliminar, mostrar, abrir, cambiar) pode
disparar outra ação. Se a palavra for destrutiva,
**produz dano real**.

**Evidência no log:**
- "Voz activada" (TTS) -> captado como input -> correspondido
  contra "elimina" do buffer anterior -> elimina fatura.
- "Manos libres activado. Te escucho de continuo." (TTS) ->
  captado como "manos libres activado" -> bot responde "Modo
  manos libres confirmado".
- "Modo manos libres confirmado" (TTS) -> captado e colado ao
  próximo input.

**Soluções (em ordem de robustez):**

1. **Half-duplex obrigatório** (a correção padrão da
   indústria):
   - `recognition.stop()` quando `speechSynthesis.speaking
     === true`.
   - `recognition.start()` é retomado quando o utterance
     termina (evento `onend` do utterance).
   - Custo: o usuário não pode falar POR CIMA do bot. Aceitável
     em 99% dos casos; adiciona latência percebida mas
     evita o loop.
2. **Filtro por conteúdo** (defesa em profundidade):
   - Manter um buffer circular dos últimos N (=10)
     `SpeechSynthesisUtterance.text` que o bot disse nos
     últimos 30 segundos.
   - Quando chega um transcript do STT, normalizar (lowercase,
     sem diacríticos, trim) e comparar contra o buffer. Se
     coincidir >70% com qualquer utterance recente, descartar
     silenciosamente.
3. **Confirmação obrigatória para ações destrutivas**
   (defesa de último recurso):
   - Qualquer ação com `data-nac-a11y-hint="destructive"` ou
     marcada `irreversible` requer um segundo turno de
     confirmação explícita ANTES de disparar. NAC3 v1.9 já
     define `confirm_action()` para isso -- o demo não está
     usando no path destrutivo.

**Recomendação:** implementar (1) imediatamente + (3) a curto
prazo. (2) opcional para ambientes onde o usuário quer poder
interromper o bot.

---

### C2 -- Matcher por sub-cadeia dispara comandos (HIGH)

**Mecanismo:** o resolver de intent (no backend ou no
LLM) faz match por sub-cadeia. A palavra "eliminatorias"
contém "elimina" como prefixo, e "elimina" é o verbo de
uma ação registrada -> a ação é disparada.

**Evidência:**
- "eliminatorias" -> "Eliminando la factura."

**Solução:** o matcher deve operar por **token completo**
(ou por stem), não por sub-cadeia. Implementação possível:

- Tokenizar o input por espaços + pontuação.
- Para cada token, comparar contra os verbos das ações
  com normalização de stem espanhol ("elimina/elimino/
  elimine/eliminar" -> stem `elimin`, "eliminatorias" ->
  stem `eliminatori`). Stems diferentes -> sem match.
- Manter uma lista curta de stems "comando" no system
  prompt (~30 verbos) para limitar a heurística.

O módulo `@nac-spec/test-runner/src/lib/matcher.js` já faz
matching por token completo (`indexOf` sobre a frase inteira,
não por sub-cadeia do slug). O bug está no backend
intermediário, não no matcher recente.

**Ação concreta:** auditar o system prompt
(`yjNacDemoSystemPrompt` em `crm_desa/api/v1/yujin.php`) e
adicionar regra explícita: "verbos como `eliminar`, `borrar`,
`cancelar` só correspondem quando o token completo do input
coincide com o verbo conjugado, NÃO quando é prefixo de outra
palavra."

---

### C3 -- Modal de confirmação bloqueia o chat (HIGH)

**Mecanismo (reportado por Pablo):** quando o bot dispara
uma ação destrutiva, aparece um modal com botões
"Aprovar" / "Cancelar". O modal usa `<dialog>` com focus
trap ou um overlay com `inert` sobre o restante do DOM,
incluindo o chat. O chat fica inacessível: não é possível
escrever, ditar por voz ou confirmar pela conversa.

**Consequência:** o usuário precisa cancelar/aprovar
manualmente com clique. Para um modo mãos livres isso quebra
o contrato de "operável por voz".

**Solução:**

1. O modal de confirmação deve estar **fora do trap de
   foco** do chat -- ou equivalentemente, o chat deve estar
   **fora do trap** do modal. Prática: mover o chat para
   `position: fixed` com `z-index` superior ao modal e
   `inert={false}` quando o modal abre.
2. O modal deve declarar seus botões com `data-nac-id`
   (ex. `confirm.approve`, `confirm.cancel`) e entrar na
   árvore NAC. O chatbot pode então fazer dispatch de "aprovar"
   ou "cancelar" por voz contra o slug correspondente.
3. O TTS deve ler a pergunta do modal automaticamente
   ("Confirma eliminar a fatura? Diga 'sim' ou 'não'.") e o
   STT deve interpretar a resposta diretamente como
   confirm/reject.

**Ação concreta:** auditar o componente modal-confirm em
`example-v20-full.php` (se existir) ou o hook genérico de
`confirm_action()` em `js/nac.js` para garantir que o
modal NÃO encerre o chat em sua árvore de foco.

---

### C4 -- v20_panel.X não resolve por chat (MEDIUM)

**Mecanismo:** o JS da página chama
`nacDemoSnapshotTree()` antes de cada turno de chat para
serializar a árvore NAC. Essa função chama
`NAC.describe()` (v1, não `describe_v2()`). `NAC.describe()`
inclui APENAS plugins já registrados via `NAC.register()`.

O v20_panel é registrado em `example-v20-full.php` dentro
do bloco `<script>` ao final do body, na função
`bootV20()` que faz polling com `setTimeout(bootV20, 50)` até que
`NAC.scope` exista. Se:
- o navegador está lento ou o deploy do rc5 ainda não
  chegou (o rpaforce-crm vendora sua própria cópia de
  `nac-v2-extensions.js`), `NAC.scope` não existe e bootV20
  não roda,
- ou bootV20 roda tarde, depois que o usuário
  enviou a primeira mensagem ao chat,

então `NAC.describe()` não inclui o v20_panel e o
backend recebe uma árvore sem esses slugs.

**Evidência:**
- "apreta describe_v20" -> bot não encontra
  `v20_panel.describe_v2`.
- "pulsa system map" -> bot SIM encontra `navmap.fetch_map`
  (porque navmap é registrado no boot de example.js, muito antes).

**Soluções:**

1. **Migrar `nacDemoSnapshotTree` para `describe_v2()`** (quando
   disponível). `describe_v2()` retorna tanto
   v1_plugins (compat) quanto v2_scope_entries -- garante que
   os manifests registrados via `NAC.register` E os scopes
   declarados via `NAC.scope` cheguem ao backend.
2. **Bloquear o envio da primeira mensagem até `bootV20()`
   completar.** O `chat-send` tem um estado disabled até
   que o evento `nac:v2_installed` seja emitido.
3. **Garantir que `NAC.register({plugin_slug:'v20_panel'})`
   rode ANTES de qualquer tentativa de `chatSend`.** Mover
   esse register para o boot de `example.js` (linha ~30
   onde estão os outros manifests) em vez de
   adiá-lo para o script inline ao final.

**Recomendação:** combinar (1) + (3). (1) é o fix
estrutural; (3) elimina a condição de corrida.

---

### C5 -- Fragmentos de STT como comandos (MEDIUM)

**Mecanismo:** a Web Speech API entrega resultados parciais
(`onresult` com `interim` true) e resultados finais. O
chat atual processa cada resultado final como uma mensagem
independente. Quando o usuário faz uma pausa entre
"el del sistema" e "muéstrame el mapa", o STT pode
emitir dois resultados finais: "el del sistema" e depois
"muéstrame el mapa", e o bot processa ambos.

Adicionalmente, a resposta do bot por TTS (problema C1)
pode se infiltrar e ser processada como um fragmento.

**Evidência:**
- "del sistema" -> executa "mostrar mapa del sistema" como
  se fosse um comando completo.
- "de nac" -> executa "self-test de NAC3".

**Solução:**

1. **Buffer + debounce com timeout de silêncio**:
   - Acumular resultados finais em um buffer.
   - Enviar ao backend apenas quando houver 800-1500 ms de silêncio
     após o último resultado, OU quando o usuário pressionar
     "send".
   - Isso agrupa fragmentos contíguos em uma única pergunta.
2. **Filtro de comprimento mínimo**: ignorar transcrições de menos
   de 4 caracteres significativos a menos que correspondam a
   verbo + objeto (regex de frase curta válida).
3. **Filtro contra C1**: se o transcript corresponder (>70%) às
   últimas N utterances do bot, descartar.

**Recomendação:** (1) + (3). Padrão em aplicações de voz
modernas (Alexa, Google Assistant, Siri).

---

### C6 -- "show" mapeia errado quando v20_panel não está (DERIVADO)

Resolvido ao fechar C4. Quando o v20_panel está na árvore,
seu `label_i18n.en="Toggle panel"` (ou o que for escolhido) ganha
o match contra "show". Hoje não está na árvore -> o matcher
cai em `navmap.fetch_map` (label "Show the system map")
porque sua keyword "show" faz prefix match.

Adicional: o label EN do `v20_panel.toggle` deve incluir
"show / hide" como sinônimos, não apenas "Toggle panel". Atualizar
o manifest:

```js
{ id: 'v20_panel.toggle', role: 'button',
  label_i18n: {
    es: 'Mostrar / ocultar panel',
    en: 'Show or hide panel',  /* antes: 'Toggle panel' */
    ...
  }
}
```

---

### C7 -- "cambia idioma" inconsistente (LOW)

**Mecanismo:** o LLM tem duas rotas não determinísticas:
- Rota literal: buscar um controle de idioma na árvore
  visível (não existe -> rejeita com top-3 candidatos).
- Rota meta: reconhecer "cambia a inglés" como meta-comando
  da sessão e emitir `{kind:'say', text:'Switching to
  English mode...'}` alterando `currentLang`.

Qual rota é tomada depende da amostragem do LLM (temperature
0.5-0.7 no system prompt atual). Resultado:
inconsistente.

**Solução:** **regra explícita no system prompt**:

> "Quando o usuário pedir para mudar o idioma da sessão
> (ex. 'cambia a inglés', 'switch to French', 'idioma
> chino'), SEMPRE responder com `{kind:'change_locale',
> locale:'<2-letter>'}` -- NÃO buscar um controle de idioma
> na árvore. É um meta-comando que afeta a sessão, não
> um clique na página."

E adicionar o kind `change_locale` ao vocabulário aceito do
backend (junto a click / fill / say / etc).

Custo: 1 linha no system prompt + 1 branch no handler do backend.

---

## 4. Roadmap de Correções (por ordem de impacto / custo)

| # | Correção | Categoria | Custo | Impacto |
|---|---|---|---|---|
| 1 | TTS/STT half-duplex (muta o microfone enquanto o bot fala) | C1 | baixo | crítico |
| 2 | Confirmar ações destrutivas com `confirm_action()` | C1, C3 | médio | crítico |
| 3 | Modal de confirmação fora do focus trap do chat | C3 | médio | alto |
| 4 | Tokenizer por palavra completa no matcher | C2 | baixo | alto |
| 5 | Migrar `nacDemoSnapshotTree` para `describe_v2()` | C4 | baixo | médio |
| 6 | Mover `NAC.register('v20_panel')` para o boot antecipado | C4 | trivial | médio |
| 7 | Buffer + debounce de 800-1500ms para STT | C5 | baixo | médio |
| 8 | Regra `change_locale` no system prompt | C7 | trivial | baixo |
| 9 | Sinônimos em `label_i18n` do v20_panel.toggle | C6 | trivial | baixo |

Custos:
- **trivial**: 1 linha de código + 1 commit.
- **baixo**: <30 linhas, 1-2 horas.
- **médio**: 30-150 linhas, meio dia.

---

## 5. Acertos Relevantes (o que funcionou)

Documentar também o que funcionou bem para não quebrar:

- "Porqué no me iluminas mostrándome el monte" -> o LLM mapeia
  corretamente para o ícone `art.fuji`. **Resolução de intent indireto +
  metafórico** -- é exatamente o que pedimos na sec 16.
- "secretísimo" -> abre o modal secreto. **Coloquialismo
  resolvido**.
- "Muéstrame factura" -> pré-visualiza. **Conjugação + objeto
  diferenciado do comando destrutivo "elimina factura"**.
- "filtra por ricardo" -> filtro ao vivo. **Ação + parâmetro
  separados corretamente**.
- "pon brasil" -> Brasil no campo país. **Mapeamento de objeto
  declarativo para `fill`**.
- "sube volumen a 80" -> slider em 80%. **Valor numérico extraído do
  texto + ação no slider**.
- "corre el test" -> self-test. **Verbo + objeto da árvore**.

Esses casos validam que o system prompt rc5 (contrato da sec 16)
funciona quando a árvore está completa e o matcher
não se confunde por sub-cadeia.

---

## 6. Próximo Passo

Implementar as correções #1, #4, #6 no próximo push (as três
têm custo baixo ou trivial e cobrem as 3 categorias
críticas). As correções #2, #3, #5 podem ir em um PR separado de
maior envergadura. O restante pode ir para o backlog.

Pablo: me avisa se quer que eu comece com essas correções agora
ou se prefere revisar o documento primeiro.

---

## 7. STATUS de Implementação (2026-05-09 final)

Pablo aprovou a implementação de **todas** as correções com a
restrição de **NÃO quebrar a resolução de intent indireto /
metafórico / coloquial** que o system prompt rc5 habilitou
(metáforas como "porqué no me iluminas mostrándome el monte"
-> Mt. Fuji; coloquialismos como "secretísimo" -> modal
secreto). Essa capacidade vive no LLM, não no matcher local.
As correções preservam o LLM intacto e refinam: (a) a captura
do input antes do LLM (C1, C5), (b) as regras que o
prompt entrega ao LLM (C2, C7, C8), e (c) o dispatch
posterior (C3, C4).

| # | Categoria | Correção implementada | Localização |
|---|---|---|---|
| C1 | Feedback loop TTS->STT | Half-duplex (muta STT enquanto `speechSynthesis.speaking`) + buffer circular das últimas 8 utterances do bot + filtro de conteúdo (exact / containment / 70%-token-overlap) no handler `recognizer.onresult` | `js/example.js` -- `_ttsRecentBuf`, `_sttIsBotEcho`, `_ttsRememberUtterance`; recognizer.onresult verifica `speechSynthesis.speaking` antes de processar |
| C2 | Matcher de sub-string | Regra 11 explícita no system prompt: "WORD-LEVEL MATCHING -- 'eliminatorias' NÃO faz match com 'eliminar'. Apenas formas conjugadas ou infinitivo. Em ambiguidade de prefixo próximo, retornar `{kind:'say'}` para esclarecimento, NUNCA a ação destrutiva." O interpret() local já tokenizava corretamente desde 2026-05-06. | `crm_desa/api/v1/yujin.php` `yjNacDemoSystemPrompt` regra 11 |
| C3 | Modal confirm bloqueia chat | (a) CSS: `.ne-side { z-index: 10001 }` tira o chat do overlay (z-index 9999). (b) Listener `nac:confirm:requested` que anuncia o prompt + hint localizado via TTS. (c) `_maybeAnswerPendingConfirm()` roteado em `chatSend` e em `_sttFlush` mapeia YES/NO em 10 idiomas para `<id>.confirm`/`.cancel` diretamente, antes do LLM. | `css/example.css` `.ne-side`; `js/example.js` `_findPendingConfirm`, `_maybeAnswerPendingConfirm`, listener `nac:confirm:requested` |
| C4 | v20_panel não chega ao chat | (a) Manifest extraído para `window.__V20_PANEL_MANIFEST__` e registrado via `registerV20PanelManifest()` com polling de 30ms assim que `NAC.register` existir (antes de `bootV20`). (b) `nacDemoSnapshotTree` agora também inclui `v2_scope_entries`, `v2_intermediate_scopes`, `sitemap`, `tenant_prefix`, `nac_version_v2` quando `NAC.describe_v2` existir. | `example-v20-full.php` (bloco de registro antecipado); `js/example.js` `nacDemoSnapshotTree` estendido |
| C5 | Fragmentos STT como comandos | Buffer `_sttBuffer` + `setTimeout(_sttFlush, 1100)`. Cada resultado `final` do STT reinicia o timer; somente após 1100ms de silêncio o buffer é descarregado para o backend. Limpar buffer no caminho manual (chatSend / mic-stop). | `js/example.js` `recognizer.onresult` + `_sttFlush` |
| C6 | "show" mapeia errado | Resolvido ao fechar C4 (v20_panel agora visível na árvore). Adicional: `label_i18n.en` do v20_panel.toggle atualizado de "Toggle panel" para "Show or hide v2.0 panel" + 9 novos locales completos. | `example-v20-full.php` `__V20_PANEL_MANIFEST__` |
| C7 | "cambia idioma" inconsistente | (a) Novo kind `change_locale` no catálogo do system prompt. (b) Regra 13: "SESSION META-COMMANDS use change_locale -- do NOT search the tree for a 'language control'." (c) Handler em `dispatchAgenticAction` que chama `applyLangChange(a.locale)`. | `crm_desa/api/v1/yujin.php` (novo kind + regra 13); `js/example.js` `dispatchAgenticAction` case `change_locale` |
| C8 | Verbo no plugin errado (warning no console "No action with verb=fetch_map found in plugin selftest") | Regra 12 explícita: "PLUGIN-VERB BINDING is fixed by the manifest. Do NOT guess, do NOT carry the verb to a nearby plugin, do NOT invent a plugin name." Com exemplos de WRONG ↔ RIGHT. | `crm_desa/api/v1/yujin.php` `yjNacDemoSystemPrompt` regra 12 |

### O que NÃO foi alterado (intencional)

- **System prompt principal (contrato sec 16):** intacto. Apenas
  foram adicionadas as regras 11, 12, 13 como refinamentos; as absolutas A-F e
  as 1-10 não foram alteradas.
- **Matcher local `interpret()`:** já tokeniza por palavra
  completa desde 2026-05-06. Sem risco aqui.
- **Confirm dialog (`NAC.confirm_dialog` em `nac.js`):** intacto;
  já emitia `nac:confirm:requested` e os botões já tinham
  `data-nac-id`. Apenas passamos a escutá-lo agora.

### Risco Residual / Próximos Passos

- **C1 nível-3 (`confirm_action()` para destrutivas):** ainda
  pendente. Hoje "elimina factura" dispara a ação + o
  modal aparece. Se o LLM voltasse a se confundir apesar da
  regra 11, o fallback deveria ser que TODA ação declarada
  como destrutiva (`data-nac-a11y-hint=destructive`) PASSE primeiro
  por `confirm_dialog`. Deixo como follow-up: implica
  inspecionar manifest.actions[].destructive e, se estiver marcada,
  envolver o invoke com `confirm_action()` na camada de dispatch.
- **STT debounce (C5):** os 1100ms são um valor empírico.
  Se for observado "o bot demora para responder a comandos curtos",
  reduzir para 800ms e observar.
- **Filtro de feedback TTS (C1) -- nível agressivo:** o threshold
  de 70% de token-overlap pode bloquear comandos legítimos do
  usuário que coincidam com frases comuns do bot (ex.:
  "muestra capacidades" se o bot acabou de dizer "estas son
  las capacidades"). Telemetria futura: contar quantos drops
  são registrados em `[stt] dropping bot-echo` -- se ultrapassar N por sessão,
  reduzir o threshold para 80%.

---

*This is a machine translation of the canonical English
version at `/nac-spec/docs/VOICE_CHAT_ERROR_ANALYSIS_2026_05_09.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
