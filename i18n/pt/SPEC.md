---
translation_source: SPEC.md
translation_source_hash: 5ebb8103746daf5bf7877b67ebb3a44cf98b4e2cba1fd8ba30093e0fce1b9b76
translation_quality: machine_v1
translation_lang: pt
translation_date: 2026-05-11T12:48:49.271636+00:00
---

# NAC3 -- Native Agent Contract

**Version:** 2.2.0
**Status:** Stable
**License:** Apache-2.0
**Editor:** Yujin (rpaforce.com)

---

## 0. Propósito

NAC3 é um contrato entre UIs web e os agentes que as operam.
Os agentes incluem executores de voz, intermediários LLM, bots de
RPA, ferramentas de acessibilidade e executores de testes end-to-end.
O contrato especifica:

1. **Como os elementos são nomeados** -- para que um agente possa
   pedir "clique no botão salvar" e resolver isso para um único nó
   DOM.
2. **Como os verbos se aplicam** -- para que um agente possa chamar
   `NAC.click(id)`, `NAC.fill(id, value)`, `NAC.tab(plugin, key)`,
   etc., sem código de integração específico por aplicação.
3. **Como a conclusão é sinalizada** -- para que um agente saiba
   quando uma etapa terminou, com uma família de eventos
   determinística por role.
4. **Como a proveniência é preservada** -- para que um sistema
   downstream consiga distinguir um clique real do usuário de um
   clique sintetizado.

NAC3 adiciona uma camada fina sobre qualquer framework que você já
utiliza para renderização. Ele não substitui ARIA, React, Vue ou
seu design system.

---

## 1. Roles

Todo elemento DOM relevante para agentes carrega `data-nac-role`.
Os roles canônicos são:

| Role | Significado | Exemplo |
|------|-------------|---------|
| `plugin` | Um módulo de UI autocontido (uma página, um painel, uma coleção de widgets). | `<article data-nac-plugin="invoice">` |
| `section` | Um landmark dentro de um plugin (cabeçalho, corpo, rodapé, barra lateral). | `<section data-nac-role="section">` |
| `region` | Uma área nomeável dentro de uma section (um cluster de cards, uma lista de resultados). | `<div data-nac-role="region">` |
| `action` | Um widget clicável que dispara um verbo (botão, link-como-botão). | `<button data-nac-role="action" data-nac-action="save">` |
| `field` | Um input que o usuário digita ou alterna (texto, número, checkbox, radio, data, arquivo). | `<input data-nac-role="field">` |
| `option` | Uma opção selecionável dentro de um field (filho de combobox / select / radio group). | `<li data-nac-role="option">` |
| `tab` | Um seletor de painel alternável. **Obrigatório quando `data-nac-id` corresponde a `^tab\.`** | `<button data-nac-role="tab" data-nac-id="tab.lines">` |
| `breadcrumb-item` | Um item de breadcrumb. | `<a data-nac-role="breadcrumb-item">` |
| `accordion-toggle` | Um controle de expandir/recolher. | `<button data-nac-role="accordion-toggle">` |
| `step` | Um indicador de etapa em um wizard. | `<li data-nac-role="step">` |
| `pagination-item` | Um controle de salto de página em uma lista paginada. | `<button data-nac-role="pagination-item">` |
| `confirm-button` | Um botão de confirmar/cancelar dentro de um diálogo de confirmação. | `<button data-nac-role="confirm-button">` |
| `sort-control` | Um cabeçalho de coluna para ordenação. | `<th data-nac-role="sort-control">` |
| `filter-control` | Um gatilho de filtro de coluna. | `<button data-nac-role="filter-control">` |
| `data-table` | Um host de tabela de dados (v2.1). | `<table data-nac-role="data-table">` |
| `navigation` | Uma região de navegação landmark. **Não é uma tab.** | `<nav data-nac-role="navigation">` |
| `confirm-dialog` | O modal de uma solicitação de confirmação. | `<div data-nac-role="confirm-dialog">` |

Roles fora desta lista são reservados para uso futuro. Um runtime
NAC-strict DEVE rejeitar roles desconhecidos no momento do registro
(v2.2). Um runtime NAC-permissive PODE tratar roles desconhecidos
como `action` para compatibilidade retroativa (padrão v1.9 e v2.0).

---

## 2. Nomes

Todo elemento resolvível por agentes carrega `data-nac-id`. O id é:

- **Um caminho com pontos** (ex.: `deals.list.row.42.actions.delete`).
  Os pontos separam níveis semânticos; o runtime não os interpreta,
  mas humanos e LLMs o fazem.
- **Globalmente único dentro de um escopo `data-nac-plugin`.** Dois
  plugins diferentes PODEM compartilhar um id; o runtime resolve pelo
  par `(plugin, id)`.
- **Estável entre re-renders.** Frameworks que produzem um novo id
  a cada render (hashes aleatórios, contadores de instância) violam
  o contrato.
- **Estável entre redesigns de UI.** Um botão migra da barra de
  ferramentas para um dropdown; seu id DEVE permanecer o mesmo.

Prefixos de id reservados (v2.1):

| Prefixo | Reservado para |
|---------|----------------|
| `tab.` | Botões de tab. Role DEVE ser `tab`. |
| `modal.` | Elementos com escopo de modal. O role é o role do widget folha. |
| `field.` | Atalho para campos de formulário. Role DEVE ser `field` ou `option`. |
| `confirm.` | Diálogos de confirmação. |

---

## 3. Verbos

Um elemento `data-nac-role="action"` PODE carregar `data-nac-action="<verb>"`
nomeando o que ele faz. O verbo é um identificador snake-case de forma
livre acordado entre o host e o agente. Verbos comuns:

`save`, `cancel`, `submit`, `delete`, `edit`, `view`, `create`,
`approve`, `reject`, `send`, `download`, `upload`, `refresh`,
`expand`, `collapse`, `open`, `close`, `add_row`, `remove_row`.

`NAC.click_by_verb(plugin, verb)` resolve um verbo para a action
única sob aquele plugin e a clica. Múltiplas actions compartilhando
o mesmo verbo sob um único plugin é um erro de manifesto (lint:
`duplicate_verb`).

---

## 4. Manifesto

Todo plugin PODE registrar um manifesto via:

```js
NAC.register({
  plugin_slug: 'invoice',
  version:     '1.0.0',
  nac_version: '2.1',
  elements: [
    { id: 'invoice.save', role: 'action',
      actions: [{ verb: 'save', label_i18n: { es: 'Guardar', en: 'Save', ... } }],
      label_i18n: { es: 'Guardar factura', en: 'Save invoice', ... } },
    ...
  ],
  tabs: [
    { nac_id: 'tab.lines', label_i18n: { es: 'Lineas', en: 'Lines' } },
    ...
  ],
  fields: [
    { id: 'field.client_name', type: 'text', required: true,
      label_i18n: { es: 'Cliente', en: 'Customer' } },
    ...
  ],
  data_tables: [...]
});
```

O manifesto é a fonte de verdade voltada ao agente. Um intermediário
LLM que decide "o usuário disse 'guardar'" consulta o manifesto do
plugin, encontra o verbo `save` e emite
`NAC.click_by_verb('invoice', 'save')`.

### 4.1 Campos obrigatórios

- `plugin_slug` -- corresponde a `data-nac-plugin` no elemento host.
- `nac_version` -- a versão do NAC3 com a qual este manifesto declara
  conformidade. O runtime rejeita manifestos que declaram uma versão
  superior à sua própria.

### 4.2 Campos opcionais

- `elements[]` -- o catálogo de widgets nomeados. Cada entrada DEVE
  ter `id` e `role`.
- `tabs[]` -- um array de nível superior separado para tabs.
  Equivalente a entradas de `elements[]` com `role:'tab'`. Ambas as
  formas são válidas.
- `fields[]`, `actions[]`, `kpis[]`, `data_tables[]` -- subcoleções
  tipadas; mesma semântica que `elements[]` filtrado por role. As
  demos escolhem a forma que fica mais legível para humanos.

### 4.3 i18n

Todo `label_i18n` DEVE cobrir todos os 10 locales do NAC3:

```
es, en, pt, fr, ja, zh, hi, ar, de, it
```

`i18n_strict: 'permissive'` em `NAC.autoRegister.watch()` permite
cobertura parcial durante migrações de sistemas legados; manifestos
de produção devem incluir os 10 locales.

---

## 5. API Pública

### 5.1 Imperativa

```ts
NAC.click(nac_id: string, opts?: ClickOpts): Promise<{ok: true}>
NAC.click_by_verb(plugin: string|null, verb: string, opts?): Promise<...>
NAC.fill(nac_id: string, value: string|number|boolean): Promise<...>
NAC.select(nac_id: string, value: string): Promise<...>
NAC.tab(plugin: string, tab_key: string): Promise<...>
NAC.tab_by_label(plugin: string|null, label: string): Promise<...>
NAC.go_to_section(nac_id: string): Promise<...>
NAC.drag_drop(source_id, target_id, opts?: {to_index?: number}): Promise<...>
NAC.set_mode(mode: 'modal'|'maximized'|'new_tab'|'new_window'): void
NAC.screenshot(): Promise<string>  // data URL
NAC.bindAction(el, handler, {plugin, action_id}): () => void  // v2.2
```

### 5.1.1 Helper de conformidade (v2.2)

`NAC.bindAction(el, handler, ctx)` é a forma prevista pela especificação para
conectar um handler de clique. Ele emite `nac:action:succeeded` (ou
`:failed`) automaticamente após a execução do handler (síncrono, exceção ou
Promise). Retorna uma função de desvinculação. Use-o no lugar de
`addEventListener('click', ...)` puro sempre que o host suportar;
código legado ainda pode emitir o evento manualmente como antes.

### 5.1.3 Editor de campo (v2.3 preview)

`NAC.edit_field(nac_id)` abre um modal que permite a um usuário (ou a um
agente em seu nome) editar qualquer campo de texto com ferramentas no estilo Word:

```ts
NAC.edit_field(nac_id: string): Promise<{ok:true}>
```

O modal se registra sob `plugin_slug='nac_editor'` com os seguintes
verbos chamáveis pelo NAC-3:

| Verbo | Efeito |
|-------|--------|
| `select_word` | seleciona a palavra na posição do cursor |
| `select_sentence` | seleciona a frase na posição do cursor |
| `select_all` | Ctrl+A dentro do editor |
| `replace` | substitui a seleção pelo texto fornecido |
| `delete_selection` | remove a seleção atual |
| `ai_correct_syntax` | envia o valor atual ao intermediário LLM com o prompt de sistema "fix grammar + spelling, return only fixed text"; substitui o valor pela resposta |
| `save` | grava de volta no campo de origem, dispara os eventos input + change e fecha |
| `cancel` | descarta as alterações e fecha |

Esc fecha (cancela). Ctrl/Cmd+Enter salva. Clicar no backdrop do overlay
cancela.

A seção 13 da especificação formalizará o contrato na v2.3; o runtime v2.2
já inclui uma implementação de referência funcional para que os adotantes
possam integrá-la hoje.
Disponível em qualquer campo via:

```js
NAC.edit_field('invoice.client_name');
// ou via intermediário:
NAC.click_by_verb('myplugin', 'edit_field', { nac_id: 'invoice.client_name' });
```

### 5.1.2 Flag de validação estrita (v2.2)

`NAC.STRICT_VALIDATION` (booleano, padrão `false` na v2.2). Quando
`true`, `NAC.register()` lança um `Error` com `code='strict_validation'`
e um array `findings` em qualquer dos casos:

- `manifest_role_unknown` -- o role da entrada está fora do conjunto canônico.
- `tab_id_manifest_role_drift` -- o id corresponde a `^tab\.` mas o role
  não é `'tab'`.
- `manifest_dom_role_mismatch` -- o `data-nac-role` do elemento DOM montado
  difere do role da entrada no manifest.

Na v2.3 o padrão muda para `true`. Na v3.0 a flag é removida
(o modo estrito passa a ser o único disponível).

Todos os métodos assíncronos rejeitam com `NacError` cujo `code` é um dos seguintes:

- `not_found` -- o elemento/role/verbo nomeado não está no DOM.
- `invalid` -- o formato do argumento está incorreto.
- `timeout` -- o efeito colateral foi disparado, mas o evento de confirmação de conformidade
  não chegou dentro de 5 segundos. **Um timeout representa falha real**:
  o handler pode ter travado, o ack nunca foi conectado ou ocorreu uma
  condição de corrida na rede. Os chamadores DEVEM tratar timeout como falha,
  a menos que tenham prova do efeito colateral por outro canal.

### 5.2 Introspecção

```ts
NAC.describe():    { active: string|null, plugins: PluginSnap[] }
NAC.describe_v2(): { v2_scope_entries: [...], sitemap: ..., data_tables: [...] }
NAC.manifest(plugin_slug: string): Manifest|null
NAC.validate_global(opts?: {probe?: boolean}): Findings[]
```

### 5.3 Tabelas de dados (v2.1)

```ts
NAC.registerDataTable(spec: DataTableSpec): void
NAC.dt_add_row(table_id, values): {ok, row_id}
NAC.dt_remove_row(table_id, row_id): {ok}
NAC.dt_edit_cell(table_id, row_id, column, value): {ok} | {ok:false, error}
NAC.dt_set_cell(table_id, row, col, value): {ok} | {ok:false, error}
NAC.dt_select(table_id, target): {ok}
NAC.dt_commit(table_id): {ok, final_state} | {ok:false, errors:[...]}
NAC.dt_discard(table_id): {ok}
NAC.dt_state(table_id): TableState
NAC.dt_read_aggregate(table_id, agg_key, column): number|null
NAC.registerDataTableComputed(table_id, column, fn): void
```

Uma tabela de dados possui um `subkind`:

- `collection` -- linhas ordenadas com commit transacional opcional.
  Usada para linhas de fatura, itens de carrinho, entradas de log.
- `matrix` -- grade linha x coluna onde cada célula carrega um valor.
  Usada para matrizes de permissão, grades de agenda.
- `matrix-singletree` -- matrix onde cada linha se expande em uma
  árvore (uso raro).

---

## 6. Eventos

Toda ação emite um evento de conclusão determinístico. O método
`NAC.click()` do runtime aguarda esse evento e resolve quando ele é disparado.

| Role | Evento de sucesso | Evento de falha |
|------|-------------------|-----------------|
| `action` | `nac:action:succeeded` | `nac:action:failed` |
| `field` | `nac:field:changed` | -- |
| `option` | `nac:field:changed` | -- |
| `tab` | `nac:tab:activated` | -- |
| `breadcrumb-item` | `nac:breadcrumb:navigated` | -- |
| `accordion-toggle` | `nac:accordion:expanded` / `:collapsed` | -- |
| `step` | `nac:step:advanced` | -- |
| `pagination-item` | `nac:table:page_changed` | -- |
| `confirm-button` | `nac:confirm:resolved` / `:cancelled` | -- |
| `sort-control` | `nac:table:sort_changed` | -- |
| `filter-control` | `nac:table:filter_changed` | -- |

### 6.1 Formato do detail do evento

O detail de todo evento carrega o campo de id canônico mais `plugin`:

```js
nac:action:succeeded {
  detail: { plugin: 'invoice', action_id: 'invoice.save', ... }
}
nac:tab:activated {
  detail: { plugin: 'invoice_edit_modal', tab_id: 'tab.lines', ... }
}
nac:field:changed {
  detail: { plugin: 'invoice', field_id: 'field.client_name',
            value: 'Acme Corp', ... }
}
```

### 6.2 Emitindo a partir de um handler do host

Um handler de clique DEVE emitir o evento de sucesso correspondente após
seu efeito colateral síncrono:

```js
button.addEventListener('click', function (ev) {
  // ... executa o trabalho ...
  document.dispatchEvent(new CustomEvent('nac:action:succeeded', {
    detail: { plugin: 'invoice', action_id: 'invoice.save' }
  }));
});
```

Se o trabalho for assíncrono, emita após a resolução. Se o trabalho
falhar, emita `nac:action:failed` com `{detail: {plugin, action_id,
error: <message>}}`.

O runtime v2.2 fornecerá `NAC.bindAction(el, handler, ctx)`
que encapsula o `addEventListener` e emite automaticamente.

### 6.3 Por que não usar o próprio evento de clique?

Um evento DOM `click` é disparado antes da execução do handler. O contrato
do NAC3 precisa saber quando o **efeito colateral foi concluído**, não quando
o clique foi iniciado. Por isso existe a família de eventos separada.

---

## 7. Proveniência

### 7.1 isTrusted

`event.isTrusted` é `true` para cliques iniciados pelo usuário (mouse real,
tecla real, ativação por leitor de tela) e `false` para cliques
sintetizados (`element.click()`, dispatchEvent de um MouseEvent construído,
automação).

O NAC3 DEVE expor isso via `event.detail.is_trusted` no evento de sucesso.
Hosts que executam ações sensíveis à segurança (pagamento, exclusão) PODEM
exigir `is_trusted === true` e rejeitar cliques sintéticos. A demo de
referência `example-v20-full.php` inclui um par de botões
(`v20_panel.istrusted_real` e `v20_panel.istrusted_fake`) que demonstra
essa distinção.

### 7.2 Manifests assinados com HMAC

Um manifest PODE conter um bloco `provenance`:

```js
NAC.set_provenance_secret('your-tenant-secret');
NAC.register({
  plugin_slug: 'invoice',
  ...,
  provenance: {
    signed_at: '2026-05-09T10:00:00Z',
    signed_by: 'tenant-X',
    signature: '<HMAC-SHA256 of manifest body>'
  }
});
```

O runtime calcula o HMAC esperado sobre uma serialização estável do
manifest (excluindo a própria assinatura) e rejeita manifests cuja
assinatura não corresponda. Utilizado em implantações multi-tenant para
impedir que um tenant falsifique o manifest de outro tenant.

### 7.3 Modelo de ameaças

Consulte `SECURITY.md` para o modelo de ameaças completo. Versão resumida:

- O NAC3 não autentica o **usuário**. Isso é responsabilidade da sua
  camada de autenticação.
- O NAC3 autentica o **manifest** (HMAC).
- O NAC3 distingue cliques reais de cliques sintetizados (isTrusted) para
  que um host possa recusar os últimos em verbos sensíveis.
- O NAC3 não protege contra um agente malicioso executando com acesso em
  nível de usuário. Tal agente pode fazer tudo que o usuário pode.

---

## 8. Níveis de conformidade

Uma página é **NAC-1 conformante** se:

- Todo widget clicável que um agente deve ser capaz de operar
  possui `data-nac-id` e `data-nac-role`.
- Todo elemento `data-nac-role="action"` dispara
  `nac:action:succeeded` após seu efeito colateral.
- A página registra ao menos um manifest de plugin via
  `NAC.register()`.
- `NAC.click(id)` funciona para todo id anunciado.

Uma página é **NAC-2 conformante** se também:

- Registra os arrays `tabs[]`, `fields[]`, `actions[]` explicitamente
  em seu manifest (não inferidos do DOM).
- Fornece `label_i18n` cobrindo todos os 10 locales do NAC3 para cada
  rótulo voltado ao usuário.
- Implementa as primitivas brownfield da v2.0: árvore de escopo,
  captura efêmera, autoRegister.watch.
- Passa `NAC.validate_global({probe: false})` com zero achados de
  severidade `error`.

Uma página é **NAC-3 conformante** se também:

- Possui manifests assinados com HMAC.
- Distingue `isTrusted` para verbos sensíveis à segurança.
- Passa `NAC.validate_global({probe: true})` com zero achados.

O CLI do pacote NPM (`npx @nac3/runtime validate <url>`) reporta o nível
mais alto que uma página alcança.

---

## 9. Versionamento

O NAC3 segue semver:

- Incremento **Major**: mudança incompatível na API pública ou nos
  formatos de comunicação. Adotantes precisam editar o código.
- Incremento **Minor**: novas funcionalidades, compatíveis com versões
  anteriores. Código antigo continua funcionando.
- Incremento **Patch**: correções de bugs, alterações apenas na
  documentação.

Política de depreciação: uma funcionalidade marcada como `@deprecated`
na versão `X.Y.0` é removida não antes de `(X+1).0.0`. As notas de
lançamento documentam cada remoção explicitamente.

A versão do pacote NPM espelha a versão da especificação: `@nac3/runtime@2.1.3`
implementa o NAC3 v2.1 com três revisões de patch.

---

## 10. Validadores

### 10.1 Runtime: `NAC.validate_global()`

Percorre o DOM ativo + os manifests registrados + o catálogo i18n
e retorna um array de achados:

```ts
{
  severity: 'error' | 'warn' | 'info',
  code:     string,                     // e.g. 'tab_role_drift'
  nac_id:   string | null,
  message:  string,
  detail:   Record<string, any>
}
```

Os códigos de achados são estáveis entre releases de patch; novos
códigos aparecem apenas em incrementos minor.

### 10.2 CLI: `npx @nac3/runtime validate <target>`

Encapsula `validate_global` mais uma análise estática da coerência
entre HTML e manifest. Códigos de saída:

- `0` -- nenhum achado com severidade >= limite configurado.
- `1` -- achados encontrados.
- `2` -- o próprio alvo falhou ao carregar.

Útil em CI: `npx @nac3/runtime validate ./dist/index.html
--severity=error`.

---

## 11. O ecossistema em torno do NAC3

O NAC3 é uma camada de contrato. Para transformar uma página NAC-conformante
em um aplicativo controlado por voz, você também precisa de:

1. **Uma fonte de speech-to-text** (browser SpeechRecognition,
   Whisper API, etc).
2. **Um intermediário LLM** que recebe o texto do usuário + o snapshot
   `NAC.describe()` da página + uma dica i18n e emite ações estruturadas:
   `[{kind: 'click', nac_id: 'X'}, {kind: 'fill', nac_id: 'Y', value: 'Z'}]`.
   Consulte `guides/LLM_WIRING.md`.
3. **Um cliente de chat** que mantém a conversa e despacha as ações.
   A referência é `js/nac-chat-client.js`.
4. **Um sink de text-to-speech** para respostas faladas (browser
   SpeechSynthesis, ElevenLabs, etc).

O NAC3 padroniza apenas o formato de entrada/saída do passo 2 (o snapshot
`NAC.describe()` + o formato das ações). Os passos 1, 3 e 4 estão fora
da especificação; você compõe o que preferir.

---

## 12. Garantias de estabilidade

O que esta especificação promete:

1. O conjunto de roles canônicos na seção 1 não será reduzido.
   Novos roles PODEM ser adicionados em versões minor.
2. A família de eventos na seção 6 não será renomeada.
   Novos eventos PODEM ser adicionados em versões minor.
3. Os verbos de `NAC.click`, `NAC.fill`, etc. não terão sua
   assinatura alterada em versões minor. Novos campos opcionais em
   `opts` PODEM aparecer.
4. Os códigos de achados do `validate_global` não serão reutilizados
   para condições diferentes entre versões minor.

O que esta especificação NÃO promete:

1. O texto exato das mensagens de erro (são strings do catálogo i18n;
   as localizações podem mudar).
2. A estratégia DOM para localizar elementos (`querySelector` hoje;
   pode migrar para um índice mais rápido futuramente).
3. O layout interno do cache de manifests. Trate manifests como
   somente-escrita pelo lado do host e somente-leitura pelo lado do agente.

---

## 13. Questões em aberto (rastreadas separadamente)

- `data-nac-role="navigation"` deve alguma vez resolver para uma tab?
  Atualmente não (v2.1). O roadmap v22 defende uma rejeição mais estrita.
- `NAC.click()` deve aceitar ids relativos (ex.: `'./save'` para
  significar "save sob o plugin ativo")? Não na v2.1; possivelmente na v2.3.
- Os manifests devem suportar herança/extensão entre plugins
  (um manifest base estendido por um tenant)? Rastreado como candidato
  para v3.0.

---

## 13.5 Governança

O NAC3 é atualmente administrado pela Yujin. A especificação é publicada
sob Apache 2.0; o runtime de referência sob MIT. A Yujin se compromete a
migrar o NAC3 para uma fundação neutra (grupo comunitário W3C, Linux
Foundation ou organização setorial equivalente) caso e quando a adoção
justificar uma governança neutra. Até lá, as mudanças na especificação
seguem o processo RFC documentado em `CONTRIBUTING.md`, com período de
comentários públicos de pelo menos 14 dias para qualquer alteração que
afete a API pública ou os formatos de comunicação.

Para adotantes: a combinação de licenças Apache 2.0 + MIT garante que a
especificação e o runtime sobrevivam a qualquer mudança no status
corporativo da Yujin. Você pode fazer fork de ambos, executar ambos e
distribuir ambos, hoje e após nossa eventual saída. Este documento registra
esse compromisso para que o caminho para essa sobrevivência seja explícito,
não implícito.

---

## 14. Implementação de referência

A implementação canônica é o runtime de referência distribuído como o
pacote NPM `@nac3/runtime`. O runtime está completo em funcionalidades para
a v2.1 e inclui:

- `js/nac.js` -- base v1.9 + a API pública da seção 5.
- `js/nac-v2-extensions.js` -- as primitivas brownfield da v2.0
  (árvore de escopo, captura efêmera, autoRegister, HMAC, isTrusted).
- `js/nac-chat-client.js` -- um cliente de chat de referência que integra
  voz + LLM + dispatcher.

Outras implementações são bem-vindas (Python para runners de automação
nativos, Rust para agentes embarcados, etc). A especificação, não o código
JS, é a autoridade.

---

*Este documento é a especificação canônica do NAC3 v2.1. Edições neste
arquivo constituem mudanças na especificação e requerem um RFC; consulte
`CONTRIBUTING.md`.*

---

*This is a machine translation of the canonical English
version at `/nac-spec/SPEC.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
