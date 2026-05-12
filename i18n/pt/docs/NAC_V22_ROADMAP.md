---
translation_source: docs/NAC_V22_ROADMAP.md
translation_source_hash: 8d844659a0ed290a00c015c5b2e875d6d9b3d52b18f02f8c182169927d3d4750
translation_quality: machine_v1
translation_lang: pt
translation_date: 2026-05-11T13:35:17.680412+00:00
---

# NAC3 v2.2 -- roadmap

NAC3 = **Native Agent Contract**.

Iniciado em 2026-05-09. Este arquivo acumula os itens de evolução para
o próximo minor da spec NAC3. Cada seção é autocontida: descrição do
problema, a classe de bug que previne, a mudança de contrato proposta
e as notas de implementação.

**Status em 2026-05-10:** v2.2 ENTREGUE. Itens V22-01 +
V22-02 + V22-03 + V22-04 estão todos em `js/nac.js` + no pacote NPM
`@nac3/runtime` 2.2.0. Este arquivo é agora o changelog canônico da versão.

| Item | Status | Commit |
|------|--------|--------|
| V22-01 strict validator | ENTREGUE | 6c2b1866 |
| V22-02 bindAction helper | ENTREGUE | 6c2b1866 |
| V22-03 locale detector hardening | ENTREGUE 2026-05-09 | f631d77a |
| V22-04 tab_by_label parens normalisation | ENTREGUE 2026-05-09 | f631d77a |
| V23-01 field editor primitive (preview) | DEMO ENTREGUE 2026-05-11 | (example-v23-editor.php + packages/nac/test/v23-editor.mjs 8/8 PASS) |

---

## V22-01 -- O construtor (`NAC.register`) passa a ser um validador estrito

**Classe do problema.** Demos em ambientes legados podem declarar elementos
de manifesto com valores de role não canônicos (`role:'navigation'` em uma
aba, `role:'button'` em vez de `'action'`, etc). O construtor atual aceita
qualquer formato recebido e o armazena como está. O bug só aparece em
tempo de execução quando a API (`NAC.tab()`, `NAC.tab_by_label()`,
`NAC.click()`) não consegue encontrar o elemento, porque a query DOM
canônica (`[data-nac-role="tab"]`) não corresponde. Nesse ponto o demo
já está implantado, o usuário já acionou o comando de voz quebrado, e o
runtime corretamente lança `tab X missing` -- um erro enganoso, pois o
elemento ESTÁ no DOM, apenas com o role errado.

**Gatilho concreto (2026-05-09).** Pablo dita `ve a pestana
permisos` em `example-v21-data-table.php`. O LLM resolve para
`NAC.tab('invoice_edit_modal','tab.permissions')`. O botão existe no DOM
mas com `data-nac-role="navigation"` (definido pelo autor do demo por
razões semânticas HTML: abas SÃO navegação). O runtime lança
"tab tab.permissions missing" mesmo com o botão visível. A mesma causa
raiz fez `tab_by_label('Lines (collection)')` falhar anteriormente na
mesma sessão.

**Por que três camadas de proteção deveriam ter detectado, mas não detectaram.**

| Camada | Deveria detectar... | O que faz hoje |
|---|---|---|
| Lint pré-commit | desvio de role em arquivos PHP/HTML de demo | não existe |
| `NAC.register(manifest)` (em tempo de registro) | roles não canônicos, incompatibilidade id/role | aceita tudo silenciosamente |
| `NAC.validate_global()` (em tempo de lint) | desvio de role dentro de `m.elements[]` | verifica apenas a presença de `m.tabs[]` |

A camada de API em tempo de execução (`NAC.tab` etc.) é a **quarta** proteção,
e a única que dispara hoje -- como erro em tempo de execução para o
usuário final. Nesse ponto o custo é o mais alto.

**Mudança de contrato proposta para v2.2.**

`NAC.register` DEVE validar o manifesto antes de armazená-lo.
Regras de validação:

1. **Enumeração de roles conhecidos.** Todo `m.elements[i].role` deve
   ser membro do conjunto canônico de roles (estende
   `_CLICK_EVENT_FAMILY`):

   ```
   action, field, option, tab, breadcrumb-item, accordion-toggle,
   step, pagination-item, confirm-button, sort-control,
   filter-control, data-table, plugin, section, region,
   navigation, banner, complementary, contentinfo, button
   ```

   Roles desconhecidos -> `console.error` + rejeita a chamada de registro.
   Roles de landmark (`navigation`, `banner`, etc) são aceitos, mas
   apenas em elementos cujo nó DOM correspondente é um contêiner de
   região, não um widget clicável.

2. **Coerência id/role.** Se `e.id` corresponde a `^tab\.` então
   `e.role === 'tab'` é obrigatório. Se `e.id` corresponde a
   `^modal\.` então `e.role === 'action'` (ou o sub-role da ação)
   é obrigatório. Qualquer incompatibilidade -> `console.error` +
   rejeita. A gramática do campo id também é um contrato;
   hoje ela é implícita.

3. **Coerência DOM (melhor esforço).** Quando `register` é chamado
   após o DOM ser parseado (o caminho típico), busca
   `[data-nac-id="<e.id>"]` no DOM. Se encontrado e seu
   `data-nac-role` diferir de `e.role`, `console.error` +
   rejeita. Isso captura o caso que Pablo encontrou em 2026-05-09: o
   manifesto diz `role:'tab'` mas o HTML ainda diz
   `data-nac-role="navigation"` (ou vice-versa). Quando chamado
   antes do DOM estar pronto, adia a verificação para um
   pós-processamento em `DOMContentLoaded`.

4. **Helper de migração (janela de uma release).** Para v2.2.0 as
   regras acima produzem `console.error` mas NÃO lançam exceção -- os
   adotantes precisam de uma janela para migrar. A partir da v2.3.0
   lançarão um `RegisterError` e o manifesto será rejeitado
   definitivamente. Rastreado no runtime via flag `NAC.STRICT_VALIDATION`
   com padrão `false` na v2.2 e `true` na v2.3.

**Extensão de `NAC.validate_global()`.**

Adiciona três novos achados:

- `manifest_role_unknown` -- o role de um elemento está fora do
  conjunto canônico.
- `manifest_dom_role_mismatch` -- o role do manifesto para
  `<id>` difere do atributo `data-nac-role` no DOM.
- `tab_role_drift` -- um `<button>` (ou qualquer elemento clicável) no
  DOM tem `data-nac-id="tab.X"` mas `data-nac-role` não é
  `"tab"` -- independentemente de existir uma entrada no manifesto.
  Captura desvios apenas no HTML que o validador de manifesto
  não detecta por definição.

Cada achado carrega severidade `error` por padrão;
`{ kind: 'warn' }` pode ser sobrescrito por projeto.

**Lint pré-commit (entregável separado, bloqueia o mesmo desvio).**

Um novo script Node `tools/nac/check_demos.mjs` lê todos os
arquivos `*.php` e `*.html` em `yujin.app/nac-spec/`, constrói um pseudo-DOM
via cheerio (ou regex para o caminho mais leve), extrai cada
chamada `NAC.register({...})` de scripts inline e verifica
as mesmas regras de coerência. Integrado ao GitHub Actions e a um
hook git local de `pre-commit`. Bloqueia o commit se alguma regra falhar.

**Estimativa de esforço.**

| Tarefa | Onde | Esforço |
|---|---|---|
| Modo estrito de `NAC.register` | `js/nac.js` | 2h |
| Novos achados em `validate_global` | `js/nac.js` | 2h |
| Script de lint pré-commit | `tools/nac/check_demos.mjs` | 4h |
| Varredura de migração nos demos existentes | `example-v*.php` | 1h |
| Atualizações de documentação na spec | `docs/spec.md` etc. | 1h |
| Testes + integração com CI | `tests/` + `.github/workflows/` | 2h |

Total: ~12h focadas.

**Compatibilidade com versões anteriores.**

As notas de release da v2.2 devem declarar:
- `NAC.register` agora emite `console.error` em desvio de role
  (sem lançar exceção).
- A v2.3 passará a lançar `RegisterError` nas mesmas condições.
- Os adotantes devem executar `NAC.validate_global()` antes de publicar.

O caminho de migração para os 6 demos existentes neste repositório já
foi concluído no commit `0633e080` (2026-05-09): os botões de aba do demo
v21 e o manifesto foram corrigidos para `role:'tab'`.

---

## V22-02 -- Aplicação do contrato action-ack

**Classe do problema.** Click handlers que executam seu trabalho de forma síncrona devem disparar `dispatchEvent(new CustomEvent('nac:action:succeeded', {detail:{plugin,action_id}}))` após o efeito colateral. Painéis brownfield frequentemente esquecem disso. O runtime então aguarda o timeout de 5s do ack-poll mesmo que o efeito colateral já tenha ocorrido, e o chat ou agente reporta `No pude ejecutar X: timeout`.

**Gatilho concreto (2026-05-09).** Pablo: `hide` -> painel oculta corretamente, chat exibe "No pude ejecutar v20_panel.toggle: timeout". O mesmo ocorre com todos os botões do v20-panel.

**O contorno anterior estava errado.** O commit `ad200e4c` tratava `err.code === 'timeout'` como sucesso no loop agêntico do chat. Pablo sinalizou corretamente que isso mascarava falhas reais (handler travado, race condition de rede, exceção não tratada) e quebrava o único sinal honesto do runtime. Revertido em `c9bf2bdb`.

**A correção correta já foi entregue.** Encapsular `bind()` em `example-v20-full.php` para emitir automaticamente `nac:action:succeeded`/`nac:action:failed` após cada handler. Feito em `c9bf2bdb`.

**Mudança de contrato proposta para v2.2.**

O runtime DEVE fornecer um helper:

```js
NAC.bindAction(el, handler, { plugin, action_id })
```

que cuida da emissão do ack automaticamente. Mesma interface que `addEventListener('click', handler)`, mas com o contrato de conformidade embutido. Demos que adotarem o helper não poderão esquecer.

`validate_global` adiciona um novo achado:

- `action_handler_without_ack` -- detectado via instrumentação: durante `validate_global`, o validador dispara um click sintético em cada elemento `data-nac-role="action"` em um contexto controlado, aguarda `nac:action:succeeded` por 500ms e sinaliza os que não dispararem.

Este achado é opt-in (`NAC.validate_global({ probe: true })`) porque clicks sintéticos têm efeitos colaterais.

**Esforço.** ~3h para o helper + ~4h para o achado baseado em probe.

---

## V22-03 -- Endurecimento do detector de troca de locale

**Classe do problema.** Códigos de locale com apenas 2 letras no detector de idioma do cliente de chat (`'de'`, `'es'`, `'en'`) colidem com preposições e artigos em vários idiomas. `cambia DE pestana` trocou o chat para alemão.

**A correção já foi entregue.** O `_detectLangSwitch` em `nac-chat-client.js` agora exige que códigos de 2 letras coexistam com um `LOCALE_TRIGGER` explícito (`idioma`/`language`/`sprache`/...). Feito em `f631d77a`.

**Proposto para v2.2.** Mover o detector de locale para fora do cliente de chat e transformá-lo em um primitivo NAC3, para que todo embed de chat brownfield utilize o mesmo detector endurecido. Documentar explicitamente a classe de falsos positivos na spec, para que implementações futuras não reintroduzam o bug.

**Esforço.** ~2h.

---

## V22-04 -- Tolerância a linguagem natural em `tab_by_label`

**Já incluído.** A remoção de parênteses (`"Lines (collection)"` corresponde a `"Lines"` e `"Lines tab"`) foi entregue em `f631d77a`. Isso **não** é um fallback legado -- é uma normalização legítima do texto de botões citados por LLMs. Documentar na spec como comportamento canônico do matcher.

**Esforço.** ~1h somente de documentação.

---

## Fora do escopo para v2.2 (adiado para v2.3+)

- Hierarquias de roles compostas (`role:'tab.primary'` vs `role:'tab.secondary'`): desejável, mas sem gatilho concreto.
- Hot-reload de manifesto: ainda raro; o reload de página atual é suficiente.
- Busca de labels em múltiplos locales simultaneamente nos 10 locales (hoje o matcher os itera em série, o que é adequado para ~20 tabs por plugin).

---

## V23-01 -- Primitivo de edição de campos (preview entregue)

**Classe do problema.** Voice runners e agentes não têm uma forma geral de manipular texto de forma granular dentro de um `<input>` ou `<textarea>` -- eles só podem usar `NAC.fill(id, value)`, que substitui tudo. Tarefas do mundo real (corrigir gramática dentro de um parágrafo, substituir apenas a seleção, melhorar uma frase com IA) precisam de verbos mais refinados. Hoje, cada adotante que precisa disso implementa a própria solução.

**Solução.** Um novo primitivo de runtime `NAC.edit_field(nac_id)` abre um modal que controla a superfície de edição e registra seu próprio plugin `nac_editor` com 8 verbos canônicos:

| Verbo | Descrição |
|-------|-----------|
| `select_word` | seleciona a palavra na posição do cursor |
| `select_sentence` | seleciona a frase na posição do cursor |
| `select_all` | seleciona todo o texto |
| `replace` | substitui a seleção pelo texto fornecido |
| `delete_selection` | exclui a seleção atual |
| `ai_correct_syntax` | envia o valor atual ao backend do chat via POST e substitui pela versão corrigida pela IA |
| `save` | grava de volta no campo de origem e fecha o modal |
| `cancel` | descarta as alterações e fecha o modal |

O manifesto do modal é registrado de forma idempotente (múltiplas chamadas a `edit_field` compartilham um único plugin `nac_editor`). Todos os verbos possuem `label_i18n` para os 10 locales.

**Status:**
- Runtime: ENTREGUE em 2026-05-10 em `js/nac.js` (funções `edit_field` + `_editorRegisterManifest` + handlers do modal com emissão de ack).
- Demo: ENTREGUE em 2026-05-11 em `example-v23-editor.php` (3 campos editáveis + contadores de verbos em tempo real conectados a `nac:action:succeeded`).
- Testes: ENTREGUES em 2026-05-11 em `packages/nac/test/v23-editor.mjs` (8/8 PASS): existência + id inválido lança exceção + role inválido lança exceção + monta modal + registra plugin + idempotência + cancel fecha + save fecha.
- Spec: seção a ser adicionada ao SPEC.md seção 13 como parte do ciclo de GA da v2.3.

**Esforço até o GA.** Além do que já está incluído: revisão de labels em locale nativo para ja/zh/ar/hi (~2h), spec visual e2e com Playwright (~3h), texto da spec em SPEC.md (~2h).

---

## Como os itens migram deste documento para a spec

1. Implementar e entregar a mudança no runtime por trás de uma feature flag.
2. Atualizar as demos para que passem na nova validação estrita.
3. Maturar em produção por pelo menos um ciclo de release com a flag padrão em `warn` (sem lançar exceção).
4. Mover a regra para `docs/spec.md` e elevar o padrão para `error` (lançando exceção) na próxima minor.
5. Remover a entrada deste roadmap e adicionar uma entrada de uma linha em `docs/CHANGELOG.md`.

---

*This is a machine translation of the canonical English
version at `/nac-spec/docs/NAC_V22_ROADMAP.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
