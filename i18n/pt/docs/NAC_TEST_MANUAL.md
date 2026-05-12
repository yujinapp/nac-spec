---
translation_source: docs/NAC_TEST_MANUAL.md
translation_source_hash: 75c7b936593deacfec1dd9689f1093483363cc45f01514ff9c9d8d52e466c9a9
translation_quality: machine_v1
translation_lang: pt
translation_date: 2026-05-11T13:38:53.450230+00:00
---

# Manual de Testes NAC3

**Um playbook de testes padronizado para qualquer app compatível com NAC-3.**

Versão 1.0 -- 2026-05-11. Autoritativo para a superfície NAC3 v2.2 + v2.3
preview. Atualize quando a especificação mudar.

Este documento informa à equipe adotante o que testar, como testar, o que
verificar e o que ignorar. Estágio por estágio ao longo do pipeline NAC3:

```
Comunicacion -> Desambiguacion -> Intencion -> Llamada -> Resultado -> Ack
    (1)             (2)             (3)         (4)         (5)        (6)
```

Além de preocupações transversais: constructor (V22-01), contrato bindAction
(V22-02), interop (v2.3), proveniência + segurança.

A suíte de referência Yujin (o estudo de caso ao final deste manual) possui
**175+ testes unitários + 16 testes e2e com Playwright**. Cobertura média
ponderada do pipeline: **95%**. Copie o que for adequado.

---

## 0. Por que este manual existe

Cada adotante do NAC3 constrói um corpus de testes do zero e acaba com
cobertura desigual -- uma equipe tem testes de ack-event perfeitos mas ignora
o intermediário LLM; outra tem Playwright end-to-end mas nenhum teste unitário.
Este manual codifica o que "teste completo" significa para um app NAC-3.

O requisito mínimo para um app certificado NAC-3:

| Estágio | Obrigatório | Recomendado |
|---------|-------------|-------------|
| 1 Comunicacion | Caminho de texto coberto. Teste de mock STT para o chat client. | Corpus TTS real + reprodução de áudio via Playwright. |
| 2 Desambiguacion | Detector de troca de locale testado para falsos positivos. Formato de snapshotTree verificado. | Tolerância de label por aba/i18n testada. |
| 3 Intencion | Smoke de backend ao vivo (ou cassete VCR) para >= 5 prompts. | Guardas anti-bug (específicos ao histórico de bugs do seu app). |
| 4 Llamada | Toda função pública NAC.* que seu app usa, com caminhos feliz + erro. | drag_drop, edit_field se você os conectar. |
| 5 Resultado | Efeito colateral no DOM verificado para pelo menos os 10 verbos mais usados do seu app. | Cross-browser via matriz Playwright. |
| 6 Ack | Toda família de eventos que seus roles produzem, com formato de detail verificado. | Famílias de cauda longa (breadcrumb, accordion, step). |
| Interop | Se você exportar/importar MCP: formato de export_tree + import + proxy + disconnect. | Assinatura HMAC + guarda de recursão. |

---

## 1. Estrutura da suíte

Recomendamos esta estrutura (corresponde à referência Yujin):

```
packages/<your-app>/
  test/
    smoke.mjs                       artefact integrity + CLI
    v22.mjs                         strict validator + bindAction
    v23-interop.mjs                 cross-app MCP (if you implement)
    stage1-audio.mjs                STT mock + TTS corpus integrity
    stage2-disambiguation.mjs       _detectLangSwitch + tab_by_label + snapshotTree
    stage3-backend.mjs              live (or recorded) backend smoke
    stage4-calls.mjs                every public NAC.* write API
    stage6-ack.mjs                  ack event families
    stage6b-longtail.mjs            breadcrumb/accordion/step/sort/filter/confirm
    fixtures/voice/                 TTS-generated MP3 corpus
      corpus.json                   prompt -> expected outcome
      generate.mjs                  one-shot regen via Google/ElevenLabs
      <locale>/<id>.mp3
tests/
  e2e-nac/
    playwright.config.ts
    specs/
      01-landing.spec.ts            @demos
      02-demo-<name>.spec.ts        @demos one per surface
      08-pipeline-end-to-end.spec.ts @e2e full chat-to-ack
tools/nac/
  test-launch.sh                    orchestrates everything
```

`tools/nac/test-launch.sh` executa:
- Camada 1: toda suíte node-side encadeada em ordem, abortando no
  primeiro FAIL.
- Camada 1b (opt-in): smoke de backend ao vivo (~60s).
- Camada 2: lint estático via `npx @nac3/runtime validate <dir>`.
- Camada 3: sanidade de links de documentação.
- Camada 4: integridade de artefatos de demo.
- Camada 5: integridade do pacote do estudo de caso.

Meta: camadas 1 + 2 + 3 + 4 + 5 em menos de 10 segundos em um laptop.

---

## 2. Estágio por estágio: o que testar

### Estágio 1 -- Comunicacion (STT + entrada bruta)

#### O que este estágio abrange

Captura de áudio, transcrição STT, entrada de texto bruto no chat
client. O debouncing de `_sttBuffer` + `_sttFlushTimer` do chat client
pertence aqui. O curto-circuito de troca de locale
(`_maybeChangeLocaleLocally`) também vive aqui.

#### O que testar

1. **Mock STT + injeção de transcrição.** Substitua
   `window.SpeechRecognition` por um fake que dispara um
   evento `result` sintético com uma transcrição plantada. Verifique
   que `NacChat.send(transcript)` propaga exatamente esse
   texto para o dispatcher.
2. **Integridade do corpus TTS.** Gere ~30 prompts de áudio via
   Google Cloud TTS / ElevenLabs nos seus 10 locales suportados.
   Verifique que cada arquivo MP3 existe + tem >= 1KB. Funciona como
   detector de regressão para o próprio corpus.
3. **Reprodução de áudio real (Playwright).** Opcional. Reproduza um
   dos MP3s do corpus via mock de `getUserMedia`, roteando para
   o SpeechRecognition do navegador. Difícil de configurar de forma limpa;
   ignore para v1.

#### O que verificar

- Todo prompt do corpus chega ao `NacChat.send()` com o
  texto exato.
- Entrada vazia + espaços em branco não trava o chat client.
- O curto-circuito de troca de locale dispara para prompts que correspondem
  a `_detectLangSwitch` (coberto também no Estágio 2).

#### O que ignorar

- Fluxos de permissão de microfone. São UI de nível do navegador; não
  valem Playwright.
- Compatibilidade de codec de áudio cross-browser. Use MP3 no
  corpus e um único navegador.

---

### Estágio 2 -- Desambiguacion

#### O que este estágio abrange

`_detectLangSwitch`. Composição + sanitização de snapshot.
Tolerância do matcher `tab_by_label`. Tudo que transforma texto bruto
em "o que o LLM deve ver / qual atalho disparar localmente".

#### O que testar

1. **Casos de falso positivo de `_detectLangSwitch`.** Esta é a
   área propensa a bugs; inclua anti-testes explícitos:
   - `'cambia de pestana'` -> permanece no locale atual.
   - `'cambia precio de mouse 40'` -> permanece no locale atual.
   - `'borra de la lista'` -> permanece.
   - `'pasa de A a B'` -> permanece.
2. **Casos positivos de `_detectLangSwitch`.** Mínimo de 12 nos
   locales suportados:
   - `'cambia a aleman'` -> de
   - `'switch to english'` -> en
   - `'use spanish'` -> es
   - `'cambia idioma a de'` (gatilho explícito + código bare) -> de
   - Noop para mesmo idioma.
   - Entrada vazia / espaços em branco.
3. **Tolerância de `tab_by_label`**:
   - Correspondência exata de textContent.
   - Correspondência com parênteses removidos (`"Lines (collection)"` corresponde a `"Lines"`).
   - Correspondência de label de locale i18n.
   - Label desconhecido -> not_found.
4. **Formato de `snapshotTree`.** Retorna `{active, plugins[]}`.
   Inclui manifest por plugin. Contém o snapshot da tabela de dados
   do plugin ativo (se v2.1).

#### O que verificar

- O idioma final após `NacChat.send(text)` corresponde à expectativa.
- O backend foi / não foi chamado conforme esperado.
- `tab_by_label` retorna ou lança exceção de forma limpa por caso.
- `snapshotTree()` é serializável em JSON + limitado em tamanho.

#### Armadilhas comuns

- Códigos de locale de 2 letras (`'de'`, `'es'`) colidem com
  preposições/artigos. Teste os casos-armadilha explicitamente.
- Labels de preenchimento de 1-2 caracteres em `label_i18n` causam falsos
  positivos em correspondência parcial. Use strings realistas.

---

### Estágio 3 -- Intencion (intermediário LLM)

#### O que este estágio abrange

O round-trip HTTP entre o chat client e o intermediário LLM.
O papel do backend: ler o snapshot `nac_tree` + prompt, retornar
`{message, actions[]}`.

#### O que testar

1. **Smoke de formato do backend.** Para um conjunto de prompts canônicos nos
   seus locales suportados (recomenda-se >= 15), faça POST para o
   endpoint e verifique:
   - HTTP 200.
   - Resposta JSON com booleano `ok`.
   - Quando ok: string `message` + array `actions`.
   - Todo `action.kind` é um dos tipos canônicos.
2. **Guardas anti-bug.** Para cada classe de bug conhecida no seu
   histórico, escreva um teste ao vivo explícito. Exemplo: `'cambia de
   pestana'` NÃO DEVE retornar `change_locale: 'de'`.
3. **Guarda de tamanho de snapshot.** Não envie snapshots > 20KB para o
   LLM se você paga por token; o teste falha o build se sua
   árvore exceder o orçamento.

#### O que ignorar

- Conteúdos específicos de ações do LLM. O LLM é não-determinístico;
  não verifique "save vai disparar action_id = X". Apenas o formato.
- Resiliência de rede (timeouts, retries). Pertence a testes de carga /
  confiabilidade, não unitários / smoke.

#### Ao vivo vs VCR

Testes ao vivo são frágeis por causa do custo + limites de taxa do LLM.
Após o corpus de prompts estabilizar, grave as respostas como cassetes VCR
(arquivos JSON mapeando prompt -> resposta) e reproduza no CI.
A referência Yujin usa testes ao vivo porque o orçamento permite
~60s/execução; mude para cassetes se seu CI rodar com muita frequência.

---

### Estágio 4 -- Llamada (APIs de escrita NAC.*)

#### O que este estágio abrange

Toda função pública em `window.NAC`: click, click_by_verb,
fill, select, tab, tab_by_label, go_to_section, drag_drop,
edit_field, dt_*, bindAction.

#### O que testar

Para cada função que você usa, três casos:

1. **Caminho feliz.** Monte um elemento DOM correspondente ao id do manifest;
   conecte seu handler para emitir o evento ack canônico;
   chame NAC.<func>(...) e verifique que resolve.
2. **not_found.** Chame com um id que não existe; verifique
   que lança exceção com código `'not_found'` (ou `'section_not_found'`
   para go_to_section).
3. **Entrada inválida.** Chame com args vazios / de formato errado;
   verifique que lança exceção com código `'invalid'`.

Para a família `dt_*`, adicionalmente:

- `dt_add_row` retorna `{ok, row_id}`.
- `dt_edit_cell` caminho feliz + valor inválido rejeitado (ex.:
  `qty < min`).
- `dt_remove_row` decrementa `dt_state().rows.length`.
- `dt_commit` retorna `{ok, final_state}`.
- `dt_discard` reverte mutações não confirmadas.

#### Nota de implementação

Execute em um shim DOM in-process pequeno (~150-200 linhas de subclasse
EventTarget) para não precisar de jsdom ou Playwright no estágio 4.
O matcher de seletor composto (`[a="b"][c="d"]`) é o único recurso
que você deve suportar. Veja `stage4-calls.mjs` na suíte de referência.

---

### Estágio 5 -- Resultado (efeito colateral no DOM)

#### O que este estágio abrange

O que realmente muda no DOM após uma chamada NAC.*. Distinto
do Estágio 4 (a função retornou ok) e do Estágio 6 (o evento ack
disparou).

#### O que testar

1. **Mutação DOM por verbo.** Para seus 10 verbos mais usados:
   - `save` -> o formulário subjacente foi submetido? Toast apareceu?
   - `cancel` -> o modal fechou? Valores do formulário foram resetados?
   - `delete` -> a linha foi removida da lista?
   - `add_row` -> uma nova linha está visível na tabela?
2. **e2e Playwright por superfície.** Uma spec por plugin / tela de
   nível superior. Monte a superfície em um navegador real,
   execute o fluxo canônico do usuário, verifique o estado do DOM.

#### O que ignorar

- Diffs de screenshot pixel-perfect. Regressão visual tem
  suas próprias ferramentas.
- Performance (taxa de frames, layout shifts). Pertence a testes de
  performance, orçamento separado.

---

### Estágio 6 -- Família de eventos Ack

#### O que este estágio abrange

Todo evento `nac:*` que o runtime escuta. Cada um tem um
formato de detail canônico (plugin + id-key + extras opcionais).

#### O que testar

Por família em `_CLICK_EVENT_FAMILY`:

- `nac:action:succeeded` -- detail.plugin + detail.action_id +
  detail.is_trusted.
- `nac:action:failed` -- mesmo + detail.error.
- `nac:field:changed` -- detail.field_id + detail.value.
- `nac:tab:activated` -- detail.tab_id.
- `nac:breadcrumb:navigated` -- detail.breadcrumb_id.
- `nac:accordion:expanded` / `:collapsed` -- detail.accordion_id.
- `nac:step:advanced` -- detail.step_id.
- `nac:table:page_changed` -- detail.page_index.
- `nac:confirm:resolved` / `:cancelled` -- detail.confirm_id.
- `nac:table:sort_changed` -- detail.column_id.
- `nac:table:filter_changed` -- detail.filter_id.

Para cada um:
1. Monte um elemento DOM com o role canônico.
2. Conecte o handler de clique para emitir o evento canônico.
3. Chame `NAC.click(id)` e escute o evento.
4. Verifique o formato do detail.

Além disso:
- **Timing click-to-resolve.** O listener do runtime deve
  resolver em até 200ms após o disparo do ack. Qualquer coisa mais lenta é
  um bug do runtime.
- **`bindAction`** emite automaticamente o ack após um handler síncrono.
- **`bindAction` async-resolve** emite automaticamente após a Promise
  resolver.
- **`bindAction` throw** -> emite automaticamente `nac:action:failed`
  com detail.error.

---

### V22-01 -- Validador estrito do constructor

`NAC.STRICT_VALIDATION = true` faz `NAC.register` lançar exceção em:

- `manifest_role_unknown` -- role fora do conjunto canônico.
- `tab_id_manifest_role_drift` -- id corresponde a `^tab\.` mas
  o role não é `'tab'`.
- `manifest_dom_role_mismatch` -- DOM montado tem role diferente
  do declarado no manifest.

Teste cada um:
1. Definindo `STRICT_VALIDATION = true`.
2. Chamando `register` com um manifest criado para violar a
   regra.
3. Verificando que lança exceção com `code: 'strict_validation'` e
   `findings: [...]`.

Sem modo estrito: verifique que `console.error` foi emitido (capture
via spy em `console.error`).

---

### V22-02 -- Helper bindAction

Já coberto acima no Estágio 6, mas: escreva pelo menos 5
testes explícitos:

1. Handler síncrono -> ack dispara.
2. Handler que lança exceção -> evento failed dispara + erro relançado.
3. Handler assíncrono que resolve -> ack dispara após resolução.
4. `bindAction` retorna um unbinder; chamá-lo interrompe a
   emissão.
5. ctx ausente (sem plugin ou action_id) -> lança exceção com
   `code: 'invalid'`.

---

### Interop -- preview v2.3

Se seu app exporta / importa árvores NAC3 via MCP:

1. **Formato de export_tree.** Retorna `{app_id, app_version,
   nac_version, exported_at, active_plugin, manifests,
   scope_tree, data_tables, state, ack_endpoint}`.
2. **Filtros de export_tree.** `scope: 'plugin_slug:<slug>'`
   retorna apenas aquele plugin. `scope: 'active_plugin'` retorna
   apenas o ativo. `include_locales: ['en','es']` retorna
   apenas esses locales.
3. **Validação de import_remote_tree.** Bearer ou endpoint ausente lança
   `invalid`. Namespace duplicado lança `conflict`.
4. **Registro de plugin com namespace.** Após o import,
   `NAC.list_registered_plugins()` inclui `remote:<ns>:<slug>`.
5. **Proxy dispatch.** `NAC.click('remote:<ns>:...')` dispara
   um `fetch` para o endpoint do peer com `bearer` + `nac_id`
   (local do peer, sem prefixo) + `action.kind`.
6. **Mirror de ack local.** Após proxy bem-sucedido, um
   `nac:action:succeeded` local dispara com `detail.via_interop: true`
   + `detail.is_trusted: false`.
7. **Propagação de erro do peer.** Peer retorna `{ok: false, error:
   {code: '...', message: '...'}}` -> cliente lança exceção com
   o código do peer.
8. **disconnect_remote.** Limpa o namespace; chamadas subsequentes
   a `NAC.click('remote:...')` lançam not_found.
9. **Cliques locais não fazem proxy.** Contrato crítico: após a
   camada de interop ser instalada, chamar NAC.click em um id LOCAL
   NÃO DEVE fazer fetch.

---

## 3. Recomendações de ferramentas

### Test runner

- **Node + módulos ESM simples** para os estágios 2-6. Sem Jest, sem
  Vitest -- 200 linhas de `assert(name, ok)` são suficientes e
  adicionam menos dependências.
- **Playwright** para e2e do Estágio 5 + reprodução de áudio do Estágio 1,
  se aplicável.

### CI

- Não execute smoke tests ao vivo do backend (Estágio 3) a cada push -- ~60s
  por execução x frequência de merge = custo real. Execute em:
  - Acionamento manual (`gh workflow run`).
  - Cron noturno.
  - Antes de criar uma tag de release.
- Execute os estágios 1, 2, 4, 6 + o harness a cada push. Orçamento
  total: menos de 15s.

### Relatório de cobertura

Mantenha um arquivo `docs/COVERAGE_REPORT_<date>.md` por release. Atualize
a tabela caso a caso. Inclua a média ponderada do pipeline.
A referência Yujin está em
`yujin.app/nac-spec/docs/COVERAGE_REPORT_2026_05_10.md`.

---

## 4. Anti-padrões a evitar

1. **Verificar o conteúdo das ações do LLM.** Não determinístico.
   Teste o FORMATO, não os VALORES.
2. **Mockar o DOM no Estágio 5.** O Estágio 5 trata de mutação real do
   DOM; use Playwright, não um shim.
3. **Cobertura por linha, não por estágio.** Linhas de código cobertas
   não dizem nada sobre se o pipeline funciona. Use a matriz de estágios.
4. **Apenas happy-paths no Estágio 4.** Not_found + entrada inválida
   representam metade do contrato.
5. **Pular o Estágio 6.** O evento ack é a parte mais violada
   da spec no código dos adotantes. Teste todas as famílias que você emite.
6. **Sem proteções contra bugs.** Todo bug de produção corrigido no seu app
   deve ter um teste de regressão permanente. O caso 'cambia de pestana'
   está para sempre no nosso Estágio 2.
7. **Testes ao vivo a cada push.** Consome orçamento; instável por
   variância de terceiros.

---

## 5. Estudo de caso -- a suite de referência Yujin

Todos os links de código-fonte abaixo apontam para os arquivos canônicos no
GitHub.

| Suite | Fonte | Testes | Tempo |
|-------|--------|-------|------|
| smoke | [packages/nac/test/smoke.mjs](https://github.com/pkuschnirof/rpaforce-crm/blob/main/packages/nac/test/smoke.mjs) | 36 | < 1s |
| v22 | [packages/nac/test/v22.mjs](https://github.com/pkuschnirof/rpaforce-crm/blob/main/packages/nac/test/v22.mjs) | 14 | < 1s |
| v23-interop | [packages/nac/test/v23-interop.mjs](https://github.com/pkuschnirof/rpaforce-crm/blob/main/packages/nac/test/v23-interop.mjs) | 14 | < 2s |
| stage1-audio | [packages/nac/test/stage1-audio.mjs](https://github.com/pkuschnirof/rpaforce-crm/blob/main/packages/nac/test/stage1-audio.mjs) | 33 | < 1s |
| stage2-disambiguation | [packages/nac/test/stage2-disambiguation.mjs](https://github.com/pkuschnirof/rpaforce-crm/blob/main/packages/nac/test/stage2-disambiguation.mjs) | 31 | < 1s |
| stage3-backend (live) | [packages/nac/test/stage3-backend.mjs](https://github.com/pkuschnirof/rpaforce-crm/blob/main/packages/nac/test/stage3-backend.mjs) | ~150 (10 locales x 3 prompts) | ~120s |
| stage4-calls | [packages/nac/test/stage4-calls.mjs](https://github.com/pkuschnirof/rpaforce-crm/blob/main/packages/nac/test/stage4-calls.mjs) | 31 | ~2s |
| stage6-ack | [packages/nac/test/stage6-ack.mjs](https://github.com/pkuschnirof/rpaforce-crm/blob/main/packages/nac/test/stage6-ack.mjs) | 16 | < 1s |
| stage6b-longtail | [packages/nac/test/stage6b-longtail.mjs](https://github.com/pkuschnirof/rpaforce-crm/blob/main/packages/nac/test/stage6b-longtail.mjs) | 14 | < 1s |
| Gerador de corpus TTS | [packages/nac/test/fixtures/voice/generate.mjs](https://github.com/pkuschnirof/rpaforce-crm/blob/main/packages/nac/test/fixtures/voice/generate.mjs) | -- | one-shot |
| Catálogo de corpus TTS | [packages/nac/test/fixtures/voice/corpus.json](https://github.com/pkuschnirof/rpaforce-crm/blob/main/packages/nac/test/fixtures/voice/corpus.json) | 30 prompts | -- |
| Harness | [tools/nac/test-launch.sh](https://github.com/pkuschnirof/rpaforce-crm/blob/main/tools/nac/test-launch.sh) | 5 camadas | ~10s |
| **Total lado Node** | | **259+** | **~10s + 120s opt-in** |

Mais 16 specs e2e com Playwright (~54s):

| Spec | Fonte | Testes | Tag |
|------|--------|-------|-----|
| 01-landing | [tests/e2e-nac/specs/01-landing.spec.ts](https://github.com/pkuschnirof/rpaforce-crm/blob/main/tests/e2e-nac/specs/01-landing.spec.ts) | 2 | @demos |
| 02-demo-v19 | [tests/e2e-nac/specs/02-demo-v19.spec.ts](https://github.com/pkuschnirof/rpaforce-crm/blob/main/tests/e2e-nac/specs/02-demo-v19.spec.ts) | 1 | @demos |
| 03-demo-v20 | [tests/e2e-nac/specs/03-demo-v20.spec.ts](https://github.com/pkuschnirof/rpaforce-crm/blob/main/tests/e2e-nac/specs/03-demo-v20.spec.ts) | 2 | @demos |
| 04-demo-v21-datatable | [tests/e2e-nac/specs/04-demo-v21-datatable.spec.ts](https://github.com/pkuschnirof/rpaforce-crm/blob/main/tests/e2e-nac/specs/04-demo-v21-datatable.spec.ts) | 3 | @demos |
| 05-demo-v22-interop | [tests/e2e-nac/specs/05-demo-v22-interop.spec.ts](https://github.com/pkuschnirof/rpaforce-crm/blob/main/tests/e2e-nac/specs/05-demo-v22-interop.spec.ts) | 1 | @demos |
| 06-demo-react-study-case | [tests/e2e-nac/specs/06-demo-react-study-case.spec.ts](https://github.com/pkuschnirof/rpaforce-crm/blob/main/tests/e2e-nac/specs/06-demo-react-study-case.spec.ts) | 2 | @study |
| 07-demo-angular-study-case | [tests/e2e-nac/specs/07-demo-angular-study-case.spec.ts](https://github.com/pkuschnirof/rpaforce-crm/blob/main/tests/e2e-nac/specs/07-demo-angular-study-case.spec.ts) | 2 | @study |
| 08-pipeline-end-to-end | [tests/e2e-nac/specs/08-pipeline-end-to-end.spec.ts](https://github.com/pkuschnirof/rpaforce-crm/blob/main/tests/e2e-nac/specs/08-pipeline-end-to-end.spec.ts) | 3 | @e2e |
| Config | [tests/e2e-nac/playwright.config.ts](https://github.com/pkuschnirof/rpaforce-crm/blob/main/tests/e2e-nac/playwright.config.ts) | -- | -- |
| **Total Playwright** | | **16** | |

**Total geral: 205+ testes** cobrindo o pipeline completo desde
a entrada no chat até o evento ack, com cobertura ponderada média
de **95%**.

### Cobertura por estágio (referência Yujin, 2026-05-11)

| Estágio | Suite que o cobre | Cobertura |
|-------|---------------------|----------|
| 1 Comunicacion | stage1-audio.mjs | 85% |
| 2 Desambiguacion | stage2-disambiguation.mjs | 95% |
| 3 Intencion | stage3-backend.mjs (LLM ao vivo) | 85% |
| 4 Llamada | stage4-calls.mjs | 95% |
| 5 Resultado | tests/e2e-nac/specs/*.spec.ts (Playwright) | 95% |
| 6 Ack | stage6-ack.mjs + stage6b-longtail.mjs | 100% |
| Interop (v2.3) | v23-interop.mjs + 05-demo-v22-interop.spec.ts | 100% |
| Constructor (V22-01) | v22.mjs | 100% |
| bindAction (V22-02) | v22.mjs | 100% |
| **Média ponderada** | | **~95%** |

### Bugs encontrados pelo corpus de testes

O corpus de testes, durante o desenvolvimento, revelou dois bugs reais
em tempo de execução que foram corrigidos na mesma branch:

1. **Matcher `tab_by_label` muito permissivo.** A implementação original
   aceitava qualquer correspondência bidirecional via `indexOf`. Um label
   de 1 caractere (`'a'`) em `label_i18n` corresponderia a qualquer consulta
   com 1+ caractere.
   O teste B4 do Estágio 2 detectou o problema. Correção: exigir que tanto
   o candidato quanto a consulta tenham >= 3 caracteres para correspondência
   parcial; igualdade exata sempre permitida.

2. **Helper de introspecção `list_registered_plugins` ausente.**
   O `export_tree` da camada de interop itera o registro de manifesto
   para produzir seu payload. O runtime não tinha API pública para listar
   plugins registrados independentemente do estado de montagem no DOM.
   Detectado ao escrever a suite v23-interop. Correção:
   adicionado `NAC.list_registered_plugins()` retornando
   `Object.keys(_manifests)`.

Ambas as correções foram entregues em `js/nac.js` na mesma branch.

### Guia para adotantes -- como adotar esta suite

1. **Copie a infraestrutura de testes primeiro.** Shim + helpers + harness
   de `packages/nac/test/`. Execute os testes existentes para verificar.
2. **Substitua o corpus de testes pela superfície do seu app.** Seus
   slugs de plugin, seus verbos, suas data-tables. Mantenha a organização
   por estágio do pipeline.
3. **Gere seu corpus TTS** via
   `packages/nac/test/fixtures/voice/generate.mjs`. Forneça
   sua chave do Google Cloud TTS ou ElevenLabs via variável de ambiente.
4. **Conecte `tools/nac/test-launch.sh`** ao seu CI. Camadas 1-5
   no pré-merge; camada 1b do backend opt-in ou noturna.
5. **Mantenha um relatório de cobertura.** Atualize a cada release.

### Licença

Este manual é Apache-2.0, assim como o restante da spec NAC3.
Copie, faça fork, redistribua.

---

## 6. Próximos passos

- [SPEC.md](../SPEC.md) -- o contrato canônico que o Yujin testa.
- [SECURITY.md](../SECURITY.md) -- modelo de ameaças + proveniência.
- [COVERAGE_REPORT_2026_05_10.md](COVERAGE_REPORT_2026_05_10.md)
  -- o relatório de referência atualizado.
- [LAUNCH_PLAN_2026_05_10.md](LAUNCH_PLAN_2026_05_10.md) -- o
  playbook de lançamento autônomo da Sumi para o qual este corpus de testes
  foi construído.

*Este documento evolui junto com a spec NAC3. Envie edições via PR
contra `yujin.app/nac-spec/docs/NAC_TEST_MANUAL.md`.*

---

*This is a machine translation of the canonical English
version at `/nac-spec/docs/NAC_TEST_MANUAL.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
