---
translation_source_hash: abf83a2435d03edd99061463e66e25982e426a41f93a8a1bf4a0c0720500553c
translation_quality: machine_v1
translation_date: 2026-10-27
translation_engine: anthropic/claude-opus-5 (Yujin Forge)
translation_normative: false
translation_status: complete
translation_lang: pt
translation_source: SPEC.md
translation_source_version: 2.5.2
translation_source_date: 2026-10-27
translation_sections: 83
translation_sections_canonical: 83
translation_units: 283
translation_units_canonical: 283
translation_canonical_url: /nac-spec/SPEC.html
---

<!-- translation-banner: produced by scripts/build-translation-banners.mjs -->

> **Tradução automática, não normativa.** Traduz a versão em inglês tal como estava em 2026-10-27 (NAC3 v2.5.2) e cobre 83 das 83 seções do original de hoje. O texto normativo é o inglês: se esta tradução e o inglês divergirem, vale o inglês.
>
> *Non-normative machine translation. The normative text of NAC3 is the English one.*
>
> [Ler o texto normativo em inglês](/nac-spec/SPEC.html)

<!-- /translation-banner -->

# NAC3 -- Native Agent Contract

**Versão:** 2.5.2 (estável -- a superfície v2.5 completa: narrate, context+tree, expect+diff)
**Status:** Versão estável. A dist-tag `latest` do npm aponta para cá; a seção 9.1 diz o que isso garante e o que uma pré-versão não garante. Este documento declara sua versão em exatamente um lugar, a linha acima. Os RFCs publicados e suas evidências de Camada 2 + Camada 3 estão listados em `README.md` e `runtime/CHANGELOG.md`.
**Licença:** Apache-2.0
**Editor:** Yujin (yujin.app)

---

## 0. Propósito

NAC3 é um contrato entre interfaces web e os agentes que as conduzem.
Entre os agentes estão executores de voz, intermediários LLM, bots de
RPA, ferramentas de acessibilidade e executores de testes end-to-end. O
contrato especifica:

1. **Como os elementos são nomeados** -- para que um agente possa pedir
   "clique no botão salvar" e resolver isso para um único nó do DOM.
2. **Como os verbos se aplicam** -- para que um agente possa chamar
   `NAC.click(id)`, `NAC.fill(id, value)`, `NAC.tab(plugin, key)`, etc.,
   sem cola por aplicação.
3. **Como a conclusão é sinalizada** -- para que um agente saiba quando
   um passo terminou, com uma família de eventos determinística por papel.
4. **Como a procedência é preservada** -- para que um sistema posterior
   consiga distinguir um clique real do usuário de um sintetizado.

O NAC3 acrescenta uma camada fina sobre qualquer framework com que você
já renderize. Ele não substitui ARIA, React, Vue nem o seu design
system.

---

## 1. Papéis

Todo elemento do DOM relevante para um agente carrega `data-nac-role`.
Os papéis canônicos são:

| Papel | Significado | Exemplo |
|------|---------|---------|
| `plugin` | Um módulo de interface autocontido (uma página, um painel, um conjunto de widgets). | `<article data-nac-plugin="invoice">` |
| `section` | Um marco dentro de um plugin (cabeçalho, corpo, rodapé, barra lateral). | `<section data-nac-role="section">` |
| `region` | Uma área nomeável dentro de uma seção (um agrupamento de cartões, uma lista de resultados). | `<div data-nac-role="region">` |
| `action` | Um widget clicável que dispara um verbo (botão, link usado como botão). | `<button data-nac-role="action" data-nac-action="save">` |
| `field` | Uma entrada que o usuário digita ou alterna (texto, número, caixa de seleção, rádio, data, arquivo). | `<input data-nac-role="field">` |
| `option` | Uma opção selecionável dentro de um campo (filho de combobox / select / grupo de rádios). | `<li data-nac-role="option">` |
| `tab` | Um seletor de painel alternável. **Obrigatório quando `data-nac-id` casa com `^tab\.`** | `<button data-nac-role="tab" data-nac-id="tab.lines">` |
| `breadcrumb-item` | Um salto na trilha de navegação. | `<a data-nac-role="breadcrumb-item">` |
| `accordion-toggle` | Um controle de expandir/recolher. | `<button data-nac-role="accordion-toggle">` |
| `step` | Um indicador de passo de assistente. | `<li data-nac-role="step">` |
| `pagination-item` | Um controle de salto de página numa lista paginada. | `<button data-nac-role="pagination-item">` |
| `confirm-button` | Um botão de confirmar/cancelar dentro de um diálogo de confirmação. | `<button data-nac-role="confirm-button">` |
| `sort-control` | Um cabeçalho de coluna que ordena. | `<th data-nac-role="sort-control">` |
| `filter-control` | Um disparador de filtro de coluna. | `<button data-nac-role="filter-control">` |
| `data-table` | O hospedeiro de uma tabela de dados (desde 2.1). | `<table data-nac-role="data-table">` |
| `navigation` | Uma região de navegação de referência. **Não é uma aba.** | `<nav data-nac-role="navigation">` |
| `confirm-dialog` | O modal de um pedido de confirmação. | `<div data-nac-role="confirm-dialog">` |
| `draggable` | Um elemento que o usuário pode pegar e mover (desde 1.6.2). | `<li data-nac-role="draggable">` |
| `drop-target` | Um lugar onde um `draggable` pode ser solto (desde 1.6.2). | `<ul data-nac-role="drop-target">` |
| `button` | **Tolerado, não recomendado.** Um botão legado que só precisa ser clicável, sem contrato de ação. O runtime o trata como `action`. Prefira `action` com um `data-nac-action` explícito. | `<button data-nac-role="button">` |

Os papéis fora desta lista ficam reservados para uso futuro. Um runtime
NAC-strict DEVERIA rejeitar papéis desconhecidos no momento do registro
(v2.2). Um runtime NAC-permissive PODE tratar papéis desconhecidos como
`action` por compatibilidade retroativa (o padrão em v1.9 e v2.0).

Esta tabela é a lista normativa, e ela é publicada como dado: o catálogo
legível por máquina em `api/latest/contract.json` carrega todos os
papéis que o runtime de referência aceita, cada um marcado com
`declared_in_spec_table` para que as duas listas possam ser comparadas
sem ler prosa. Elas coincidem na v2.5. Qualquer divergência futura fica
visível nessa marca, em vez de escondida numa diferença de opinião entre
um documento e uma implementação.

---

## 2. Nomes

Todo elemento resolvível por um agente carrega `data-nac-id`. O id é:

- **Um caminho com pontos** (por exemplo `deals.list.row.42.actions.delete`).
  Os pontos separam níveis semânticos; o runtime não os interpreta, mas
  pessoas e LLMs sim.
- **Único globalmente dentro do escopo de um `data-nac-plugin`.** Dois
  plugins diferentes PODEM compartilhar um id; o runtime resolve pelo
  par `(plugin, id)`.
- **Estável entre re-renderizações.** Frameworks que produzem um id novo
  a cada renderização (hashes aleatórios, contadores de instância)
  quebram o contrato.
- **Estável entre redesenhos da interface.** Um botão sai da barra de
  ferramentas e vai para um menu suspenso; seu id DEVE permanecer o
  mesmo.

Prefixos de id reservados (desde 2.1):

| Prefixo | Reservado para |
|--------|--------------|
| `tab.` | Botões de aba. O papel DEVE ser `tab`. |
| `modal.` | Elementos com escopo de modal. O papel é o do widget folha. |
| `field.` | Forma abreviada de campo de formulário. O papel DEVE ser `field` ou `option`. |
| `confirm.` | Diálogos de confirmação. |

---

## 3. Verbos

Um elemento com `data-nac-role="action"` PODE carregar `data-nac-action="<verb>"`
nomeando o que ele faz. O verbo é um identificador livre em snake-case
acordado entre o host e o agente. Verbos comuns:

`save`, `cancel`, `submit`, `delete`, `edit`, `view`, `create`,
`approve`, `reject`, `send`, `download`, `upload`, `refresh`,
`expand`, `collapse`, `open`, `close`, `add_row`, `remove_row`.

`NAC.click_by_verb(plugin, verb)` resolve um verbo para a única ação sob
aquele plugin e clica nela. Várias ações compartilhando o mesmo verbo
sob um plugin é um erro de manifesto (lint: `duplicate_verb`).

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

O manifesto é a fonte de verdade voltada ao agente. Um intermediário LLM
que decide "o usuário disse 'salvar'" consulta o manifesto do plugin,
encontra o verbo `save` e emite `NAC.click_by_verb('invoice', 'save')`.

### 4.1 Campos obrigatórios

- `plugin_slug` -- casa com o `data-nac-plugin` do elemento hospedeiro.
- `nac_version` -- a versão do NAC3 com a qual este manifesto afirma
  estar conforme. O runtime rejeita manifestos que declaram uma versão
  superior à dele.

### 4.2 Campos opcionais

- `elements[]` -- o catálogo de widgets nomeados. Cada entrada DEVE ter
  `id` e `role`.
- `tabs[]` -- um array de primeiro nível separado, para abas. Equivale a
  entradas de `elements[]` com `role:'tab'`. As duas formas são válidas.
- `fields[]`, `actions[]`, `kpis[]`, `data_tables[]` -- subcoleções
  tipadas; a mesma semântica de `elements[]` filtrado por papel. As
  demos escolhem a forma que fica mais legível para pessoas.

### 4.3 i18n

Todo `label_i18n` DEVE cobrir todas as 10 locales do NAC3:

```
es, en, pt, fr, ja, zh, hi, ar, de, it
```

`i18n_strict: 'permissive'` em `NAC.autoRegister.watch()` permite
cobertura parcial durante uma migração brownfield; manifestos de
produção deveriam publicar as 10 locales.

#### 4.3.1 Sobre o que recai a exigência das dez locales

A exigência acima recai sobre o **manifesto de quem adota** -- o mapa
`label_i18n` que um agente lê para nomear um elemento no idioma do
usuário. Ela NÃO recai sobre o idioma deste documento, e nada no NAC3
obriga uma implementação a publicar a própria documentação em dez
idiomas.

#### 4.3.2 Idioma normativo desta especificação

O texto normativo do NAC3 é o **inglês**: o `SPEC.md` na raiz do
repositório da especificação, renderizado em
`https://yujin.app/nac-spec/SPEC.html`.

A especificação também é publicada como traduções automáticas em
`i18n/<locale>/SPEC.md`. Essas traduções são **não normativas**. Cada
uma declara, num banner que o leitor vê e num frontmatter legível por
máquina, qual revisão do inglês ela traduz e quanto dela cobre; o banner
é obrigatório, e uma tradução publicada sem banner é um defeito da
publicação, não da tradução. Quando uma tradução e o texto em inglês
divergem, vale o texto em inglês, e uma afirmação de conformidade é uma
afirmação contra o texto em inglês.

Uma tradução atrasada em relação ao inglês **nunca bloqueia a
publicação do inglês**. O texto normativo sai quando está pronto; uma
tradução velha é reportada, unidade por unidade, e a versão vai ao ar.
Nove artefatos automáticos não têm veto sobre o documento que traduzem.
Até a 2.5.1 as nove cobriam 34 das 83 seções e nada dizia isso;
agora elas são produzidas a partir de um repositório por idioma, e o
procedimento é `docs/TRANSLATION_PASS.md`.

---

## 5. API pública

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

### 5.1.1 Auxiliar de conformidade (v2.2)

`NAC.bindAction(el, handler, ctx)` é a forma conforme à especificação de
ligar um handler de clique. Ele emite `nac:action:succeeded` (ou
`:failed`) automaticamente depois que o handler roda (síncrono, com
exceção ou Promise). Devolve um desvinculador. Use isso em vez de um
`addEventListener('click', ...)` cru sempre que o host suportar; código
brownfield pode continuar emitindo o evento manualmente como antes.

### 5.1.3 Editor de campo (v2.3)

`NAC.edit_field(nac_id)` abre um modal que permite a uma pessoa (ou a um
agente em seu nome) editar qualquer campo de texto com ferramentas no
estilo de um processador de texto:

```ts
NAC.edit_field(nac_id: string): Promise<{ok:true}>
```

O modal se registra sob `plugin_slug='nac_editor'` com estes verbos
invocáveis pelo NAC3:

| Verbo | Efeito |
|------|--------|
| `select_word` | selecionar a palavra onde está o cursor |
| `select_sentence` | selecionar a frase onde está o cursor |
| `select_all` | ctrl-A dentro do editor |
| `replace` | substituir a seleção pelo texto dado |
| `delete_selection` | remover a seleção atual |
| `ai_correct_syntax` | fazer POST do valor atual ao intermediário LLM com o prompt de sistema "fix grammar + spelling, return only fixed text"; substituir o valor pela resposta |
| `save` | escrever de volta no campo de origem, despachar os eventos input e change, fechar |
| `cancel` | descartar, fechar |

Esc fecha (cancela). Ctrl/Cmd+Enter salva. Um clique no fundo do overlay
cancela.

A seção 13 da especificação vai formalizar o contrato na v2.3; o runtime
v2.2 já publica uma implementação de referência funcionando para que
quem adota possa ligá-la hoje. Disponível em qualquer campo via:

```js
NAC.edit_field('invoice.client_name');
// or by intermediary:
NAC.click_by_verb('myplugin', 'edit_field', { nac_id: 'invoice.client_name' });
```

### 5.1.4 Carga da ação + invoke (v2.3)

As ações do NAC v2.2 são de clicar e pronto: um agente dispara
`NAC.click(id)` ou `NAC.click_by_verb(plugin, verb)` e o host faz o que
faz. Isso funciona para ações de verbo e estado (`save`, `cancel`,
`submit`, `delete`) mas desmorona quando uma ação precisa de **dados**
do agente -- `utter(text)`, `search(query)`, `send_message(body)`,
`upload(file)`, `schedule(date)`, `translate(text, target_lang)`. O host
não tem como receber a carga do agente por meio de um clique sintético.

A v2.3 fecha essa lacuna. O contrato é aditivo: os verbos no estilo
clique continuam funcionando sem mudança.

```ts
NAC.invoke(action_id: string, payload: object, opts?: { timeout?: number })
  : Promise<{ok: true, request_id: string, ack: object|null}>

NAC.utter(action_id: string,
          opts: { text: string, lang?: string, voice?: string, metadata?: object })
  : Promise<{ok: true, request_id: string, ack: object|null}>
```

`NAC.invoke` despacha um `CustomEvent` `nac:action:requested` no
elemento hospedeiro (borbulha até document) com:

```ts
detail: {
  action_id:  string,    // canonical nac_id of the host element
  verb:       string,    // payload.verb || el's data-nac-action
  payload:    object,    // arbitrary, action-specific
  plugin:     string|null,
  request_id: string,    // correlation token assigned by the runtime
  ts:         number,    // Date.now()
}
```

O host escuta `nac:action:requested`, processa a carga e emite
`nac:action:succeeded` (ou `nac:action:failed`) com o mesmo
`request_id` no detalhe. O runtime correlaciona por `request_id` e
resolve a Promise do agente.

O timeout padrão é de **30 segundos** (contra 5 s para o clique).
Pode ser trocado com `opts.timeout`. No vencimento, a Promise rejeita
com `NacError('timeout', ...)`. Como no clique, um timeout significa
falha real: quem chamou DEVE tratá-lo como tal, a menos que tenha
prova do efeito por outro canal.

`NAC.utter(id, opts)` é o atalho ergonômico para o verbo com carga
mais comum. Equivale a:

```js
NAC.invoke(id, { verb: 'utter', text: opts.text, lang: opts.lang });
```

#### Declaração no manifesto

Uma ação que leva carga declara o esquema dessa carga na sua entrada
do manifesto, por rastreabilidade e pelas ferramentas:

```js
NAC.register({
  plugin_slug: 'atlas_pro_ad',
  version:     '2.1.0',
  nac_version: '2.3',
  elements: [
    { id: 'atlas_pro_ad.mic', role: 'action',
      actions: [
        { verb: 'listen' },
        { verb: 'utter',
          payload_schema: {
            text: { type: 'string', required: true, max: 4000 },
            lang: { type: 'string',
                    enum: ['en','es','pt','fr','it','de','ja','zh','hi','ar'] }
          },
          label_i18n: { es:'Decir', en:'Utter', /* ... 10 locales */ } }
      ],
      label_i18n: { /* ... */ } }
  ]
});
```

`payload_schema` é **informativo na v2.5**, e o runtime de referência
não o lê de forma alguma: o campo é aceito num manifesto, viaja em
`NAC.manifest()` e nunca é validado contra nada.
`NAC.STRICT_VALIDATION` -- cujo padrão de fato virou `true` na 2.3.0
-- cobre somente os achados de papel de manifesto e DOM; nunca cobriu
cargas. Então um agente NÃO DEVE supor que uma carga foi verificada
porque um esquema foi declarado: hoje a única validação que acontece é
a que o agente faz antes de enviar.

Os esquemas são deliberadamente simples (um subconjunto com forma de
JSON-Schema) para que um runtime consiga validar sem embarcar um
validador completo de JSON-Schema, e essa segue sendo a intenção de
projeto para quando a exigência entrar.

Uma revisão anterior desta seção prometia, para a versão 2.4,
formalizar a gramática do esquema e tornar a exigência o padrão.
**Isso não aconteceu na 2.4 e não aconteceu até a 2.5.** A frase é
removida em vez de receber outra data: uma promessa com um número de
versão colado, que continua de pé depois daquela versão, é lida por um
agente como uma capacidade com a qual ele pode contar. Formalizar a
gramática e ligar a exigência está registrado como pergunta aberta na
seção 13, onde consta como aberta e sem data.

#### Semântica do estado desabilitado (correção da v2.3 vinda da alpha.2)

`NAC.invoke` NÃO rejeita quando o elemento alvo tem `disabled` ou
`aria-disabled='true'` definidos. O atributo HTML `disabled` é uma
guarda de clique da interface; `invoke` é um pedido lógico com carga,
não um clique sintético. Hosts que precisem recusar um invoke com base
no estado da interface DEVEM fazê-lo no seu listener de
`nac:action:requested` e emitir `nac:action:failed` com um código de
erro que signifique algo.

`NAC.click`, por outro lado, AINDA rejeita em elementos desabilitados
(a semântica do clique é preservada). Cobertura de testes:
`runtime/test/v23-invoke.mjs` T7/T8/T9.

#### Conformidade: hosts que suportam invoke DEVEM

1. Declarar `actions[].payload_schema` na entrada do manifesto.
2. Escutar `nac:action:requested` (ou usar um listener genérico que
   filtre por `detail.action_id` + `detail.verb`).
3. Emitir `nac:action:succeeded` -- com `detail.request_id` devolvido
   igual -- depois de processar, ou `nac:action:failed` (com o código
   em `detail.error`) em caso de falha.
4. NUNCA emitir um evento `:succeeded` com um `request_id` que não
   receberam (evita cruzamento entre invocações concorrentes).

Hosts que NÃO suportam invoke seguem operando normalmente sob
`NAC.click()` e `NAC.click_by_verb()`. Agentes que chamam
`NAC.invoke()` contra um host sem uma entrada
`actions[].payload_schema` ainda vão receber um `request_id`, mas o
runtime não pode garantir a entrega; o timeout dispara aos 30 s.

#### Por que isso importa

A superfície agêntica completa deixa de ser "uma lista de botões" e
passa a ser "uma lista de botões + entradas estruturadas". Um anúncio
de voz passa a ser invocável por NAC.invoke. Uma barra de busca passa a
ser invocável por NAC.invoke. Um upload de arquivo passa a ser
invocável por NAC.invoke. Mesmo protocolo, mesma procedência, mesma
semântica de confirmação.

O primeiro adotante de referência é o **Atlas Pro**: seu elemento
`atlas_pro_ad.mic` declara tanto o verbo `listen` (só clique, o que já
existia) quanto `utter` (com carga). O mesmo laço conversacional de
`/parse` + `/tts` conduz nos dois casos; agentes que têm STT chamam
`listen`, e agentes que têm o próprio modelo de linguagem chamam
`utter`.

#### Modalidades futuras (previstas, sem mudança de especificação)

`invoke` é deliberadamente agnóstico de modalidade, para que famílias
de entrada futuras se encaixem sem quebrar o contrato:

| Modalidade | Verbo (esboço)        | Carga (esboço)                                   |
|----------|-----------------------|--------------------------------------------------|
| Texto    | `utter`               | `{text, lang?}`                                  |
| Busca    | `search`              | `{query, scope?, limit?}`                        |
| Arquivo  | `upload`              | `{filename, mime, data_url \| stream_id}`        |
| Imagem   | `analyze_image`       | `{image_url \| data_url, prompt?}`               |
| Vídeo    | `analyze_stream`      | `{stream_url, frame_window_ms?, return?}`        |
| Agenda   | `schedule`            | `{datetime, duration_min, attendees?}`           |
| Código   | `apply_diff`          | `{file_path, unified_diff}`                      |
| Voz      | `transcribe`          | `{audio_url \| data_url, lang?}`                 |

Cada modalidade segue o mesmo protocolo de eventos
`nac:action:requested` -> `nac:action:succeeded` / `:failed`, a mesma
correlação por `request_id`, a mesma semântica de timeout. O runtime
continua pequeno; o vocabulário de verbos cresce por convenção entre
hosts e agentes. Atalhos ergonômicos (`NAC.utter`, `NAC.search`,
`NAC.watch`, etc.) podem ser acrescentados depois sem reespecificar
nada, porque cada um é um invólucro fino sobre `invoke`.

### 5.1.5 Resolução em shadow DOM -- raízes abertas (v2.3)

O runtime resolve referências `data-nac-id` através de raízes shadow
abertas, de forma recursiva. Uma página pode montar Web Components com
`attachShadow({mode:'open'})`, colocar atributos `data-nac-*` em
elementos dentro da árvore shadow, e qualquer chamador do NAC3
(`NAC.click`, `NAC.fill`, `NAC.invoke`, etc.) resolve o alvo de forma
transparente.

#### Algoritmo de resolução

Para um seletor `S` (tipicamente `[data-nac-id="..."]`) contra uma raiz
`R` (tipicamente `document`):

1. `R.querySelector(S)` -> se não for nulo, retornar imediatamente.
2. Para cada descendente `el` de `R`:
   - Se `el.shadowRoot` não for nulo (ou seja, raiz shadow aberta):
     recorrer com `R := el.shadowRoot`, profundidade +1.
   - Senão, se `el.nac3` for um objeto que expõe um método `query`,
     delegar (ver a seção 5.1.6).
3. A recursão é **limitada a 10 níveis de profundidade**. Alvos mais
   profundos que 10 são inalcançáveis; quem chamou recebe
   `code='not_found'`. O limite existe para evitar caminhadas
   patológicas; na prática nenhuma base de código em produção aninha
   mais de 3-4 níveis de shadow.
4. A caminhada segue a ordem do DOM em largura: irmãos antes dos
   shadows aninhados. A primeira coincidência vence.

#### Propagação de eventos

Eventos emitidos por hosts dentro de raízes shadow DEVEM definir
`composed: true` para que listeners no nível de document os recebam. O
runtime do NAC3 já emite todos os seus próprios eventos com
`composed:true`; o código do host que emite eventos `nac:*` à mão é
responsável pelo mesmo. Sem `composed:true` o evento para na fronteira
do shadow e a maquinaria de correlação do runtime nunca o vê.

#### Responsabilidade de quem escreve o componente

Quem escreve o componente precisa:

1. Colocar `data-nac-id`, `data-nac-role`, `data-nac-action` nos
   elementos operáveis dentro da raiz shadow.
2. Definir `composed:true` em qualquer evento próprio que o host emita
   para sinalizar um contrato do NAC3 (`nac:action:succeeded`,
   `nac:field:changed`, etc.).
3. Evitar `<slot>` para elementos que precisam ficar isolados no
   shadow -- nós colocados num slot vivem no light DOM e são resolvidos
   lá.

Para raízes shadow abertas não é necessária nenhuma dica no manifesto
nem nenhuma ativação no runtime; a resolução é automática.

#### Implementação de referência

O runtime de referência expõe dois auxiliares internos,
`_deepQuery(selector, root)` e `_deepQueryAll(selector, root)`, que
fazem a caminhada. Os auxiliares públicos `NAC.click`, `NAC.fill`,
`NAC.invoke`, `NAC.describe`, etc., passam todos pelas variantes
profundas.

#### Demos e testes

- `example-v23-shadow-open.php` -- demos de shadow aberto aninhado em
  1, 2 e 3 níveis.
- `runtime/test/v23-shadow.mjs` T1-T3, T10 -- cobertura unitária,
  incluindo o limite de profundidade.

### 5.1.6 Resolução em shadow DOM -- raízes fechadas, exposição voluntária (v2.3)

Raízes shadow fechadas (`attachShadow({mode:'closed'})`) são opacas de
fora do código de quem escreveu o componente: é uma fronteira de
segurança do navegador, não uma decisão do NAC3. O NAC3 não consegue
alcançar o interior a menos que quem escreveu o componente exponha
voluntariamente uma superfície consultável pelo contrato abaixo.

#### O contrato de interface `el.nac3`

Um elemento customizado PODE expor um objeto de interface no seu
hospedeiro, por meio de um getter chamado `nac3`:

```ts
interface NAC3HostInterface {
  query(selector: string): Element | null;        // MANDATORY
  queryAll(selector: string): Element[];          // RECOMMENDED
  describe?(): Array<{                            // OPTIONAL
    id:    string;
    role:  string;
    action?: string;
    label?: string;
  }>;
}
```

Componentes aderem implementando o getter. Componentes que NÃO aderem
seguem inacessíveis para os chamadores do NAC3 (suas partes internas
permanecem privadas, como o navegador pretende).

#### Semântica da resolução

Durante `_deepQuery(selector)`, para cada elemento visitado `el` com
`el.shadowRoot === null`:

1. Se `typeof el.nac3 === 'object'` e `el.nac3.query` for uma função,
   o runtime chama `el.nac3.query(selector)`:
   - O valor devolvido é um Element -> resolvido.
   - O valor devolvido é `null` -> não há coincidência neste shadow.
   - O valor devolvido é qualquer outra coisa -> emite
     `nac:shadow_protocol_violation` (uma vez por hospedeiro) e pula.
   - Lança uma exceção -> emite `nac:shadow_blocked` (motivo
     `'exposure_threw'`, uma vez por hospedeiro) e pula.
2. Senão, se `el.hasAttribute('data-nac-shadow') === true` e o valor do
   atributo for `'closed'` E não houver nenhuma interface `nac3`
   presente, o runtime emite `nac:shadow_blocked` (motivo
   `'not_exposed'`, uma vez por hospedeiro). É a adesão de quem escreve
   o componente ao sinal de depuração "sou um componente
   deliberadamente fechado".
3. Senão: o elemento é tratado como um elemento normal do light DOM,
   sem raiz shadow.

#### Forma do detalhe dos eventos de erro

Detalhe de `nac:shadow_blocked`:

```ts
{
  host:   Element,     // the closed-shadow host
  reason: 'exposure_threw' | 'not_exposed',
  ts:     number       // Date.now()
}
```

Detalhe de `nac:shadow_protocol_violation`:

```ts
{
  host:           Element,
  message:        string,            // diagnostic message
  value_snapshot: string,            // truncated value preview
  ts:             number
}
```

Os dois eventos borbulham (`bubbles: true`) e cruzam as fronteiras do
shadow (`composed: true`). A deduplicação é por hospedeiro, por meio de
um WeakSet mantido pelo runtime; um mesmo hospedeiro emite cada evento
**no máximo uma vez por carregamento de página**.

#### Por que é voluntário

A opacidade do shadow fechado é imposta pelo navegador. Mesmo que o
NAC3 definisse um mecanismo não voluntário, o navegador o impediria. A
exposição voluntária deixa quem escreve o componente com controle total
de como a sua superfície pública se apresenta para os agentes.

O custo é a adesão componente por componente; o benefício é que agentes
conformes ao NAC3 funcionam contra design systems com componentes de
shadow fechado (Salesforce Lightning, alguns componentes do GitHub
Primer, widgets sensíveis por segurança) sem código adaptador por
componente.

#### Demos e testes

- `example-v23-shadow-closed.php` -- o caso positivo
  (`<todo-card-closed-exposed>`) e o negativo
  (`<todo-card-closed-blind>`) lado a lado, com painéis de veredito +
  log de eventos ao vivo.
- `runtime/test/v23-shadow.mjs` T4-T9 -- cobertura unitária de cada
  família de eventos de erro, mais a semântica de deduplicação.
- `guides/SHADOW_DOM_CLOSED.md` -- guia para quem escreve componentes.

### 5.1.7 Capacidades cientes de autorização (v2.3)

O NAC3 v2.3 permite que o manifesto declare, por ação, quais
capacidades são exigidas, e com isso trava `NAC.click` e `NAC.invoke`
antes do despacho. O agente recebe uma recusa rápida
(`code='capability_required'`) em vez de uma ida e volta que falha no
servidor.

#### Declaração no manifesto

Uma exigência de capacidade se prende no nível do elemento ou no nível
do verbo. Se as duas estiverem presentes, vence a do verbo.

```js
NAC.register({
  plugin_slug: 'fin',
  version:     '1.0.0',
  nac_version: '2.3',
  elements: [
    // Element-level (covers all verbs on this id).
    { id: 'fin.invoice.delete', role: 'action',
      requires_capability: 'finance.delete_invoice',
      actions: [{ verb: 'delete' }] },

    // Verb-level (more granular).
    { id: 'fin.invoice.edit', role: 'action',
      actions: [
        { verb: 'edit',
          requires_capability: 'finance.edit_invoice' },
        { verb: 'view',
          /* no capability -> always allowed */ }
      ] },

    // Array value: OR semantics.
    // ("at least one of these capabilities matches")
    { id: 'fin.invoice.approve', role: 'action',
      requires_capability: ['finance.approve',
                            'finance.admin'],
      actions: [{ verb: 'approve' }] }
  ]
});
```

Para semântica de E lógico ("o usuário precisa de TODAS estas
capacidades"), declare cada uma por meio de ações travadas separadas,
ou componha no host, no listener de `nac:action:requested`.

#### API pública

```ts
NAC.setCapabilities(caps: string | string[] | null): void
NAC.grantCapability(cap: string): void
NAC.revokeCapability(cap: string): void
NAC.userCapabilities(): string[]
```

`setCapabilities` substitui o conjunto inteiro (use no login ou na
renovação de sessão). `grantCapability` / `revokeCapability` são
incrementais. `userCapabilities` devolve um array com um retrato do
estado. `setCapabilities(null)` limpa o conjunto.

Os hosts chamam isso sempre que o papel do usuário muda. O conjunto
vive no runtime; nenhum recarregamento de manifesto é necessário.

#### Semântica da trava

Antes do despacho, `NAC.click(id)` e `NAC.invoke(id, payload)` buscam a
entrada correspondente do manifesto (elemento + verbo), leem
`requires_capability` e chamam `_hasCapability`:

- Nenhuma exigência declarada -> permite.
- Exigência declarada e o conjunto atual a satisfaz -> permite.
- Exigência declarada e o conjunto atual NÃO a satisfaz -> rejeita com
  `NacError('capability_required', ...)` E emite
  `nac:command:rejected` com `detail.reason='capability_required'`.

A trava roda DEPOIS das verificações de `not_found` / `disabled` /
`hidden` no `click`, para que a falha mais específica venha à
superfície. No `invoke`, a trava roda antes de o evento de pedido
disparar (o host nunca vê uma tentativa não autorizada).

#### Por que isso importa

Sem a trava, um agente que chama `NAC.click('finance.delete')` ou tem
sucesso (nenhuma trava de autorização -> buraco de segurança) ou falha
no servidor com um 403 vários segundos depois. Com a trava, o agente
descobre de forma síncrona que lhe falta a capacidade e pode reagir
como convém (pedir outro fluxo, pedir elevação de permissão, mostrar a
restrição ao usuário).

Isso complementa -- não substitui -- a autorização no servidor. Os
hosts DEVEM continuar aplicando as permissões no servidor. A trava do
cliente é uma otimização de experiência e um sinal no nível da
intenção, não uma fronteira de segurança.

#### Demos e testes

- `runtime/test/v23-capabilities.mjs` -- 17 asserções cobrindo
  consultar e definir, conceder e revogar, a trava do clique, a trava
  do invoke, a resolução entre nível de verbo e nível de elemento, a
  semântica de OU lógico, a limpeza com null, a recusa de entradas
  inválidas e a regressão das ações sem trava.

### 5.1.2 Flag de validação estrita (v2.2; padrão invertido na v2.3)

`NAC.STRICT_VALIDATION` (booleano). Quando `true`, `NAC.register()`
lança um `Error` com `code='strict_validation'` e um array `findings`
em qualquer um destes casos:

- `manifest_role_unknown` -- o papel da entrada está fora do conjunto
  canônico.
- `tab_id_manifest_role_drift` -- o id casa com `^tab\.` mas o papel
  não é `'tab'`.
- `manifest_dom_role_mismatch` -- o `data-nac-role` do elemento montado
  no DOM difere do papel da entrada do manifesto.

**Valor padrão:**

- **v2.2.x:** `false` (só avisa). Quem adotava precisava de uma janela
  de migração.
- **v2.3.x:** **`true`** (lança). A janela de migração fechou com a
  linha v2.2. Quem adota com manifestos cheios de desvios sai disso
  definindo `NAC.STRICT_VALIDATION = false` ANTES de qualquer chamada a
  `register()`.
- **v3.0:** a flag é removida (estrito é o único modo).

Veja `guides/MIGRATION_v2.2_to_v2.3.md` para o roteiro de limpeza dos
achados de desvio.

Todos os métodos assíncronos rejeitam com um `NacError` cujo `code` é
um destes:

- `not_found` -- o elemento, papel ou verbo nomeado não está no DOM.
- `invalid` -- a forma do argumento está errada.
- `disabled` -- o elemento tem `disabled` ou `aria-disabled='true'`
  (só `NAC.click`; `NAC.invoke` não verifica mais desde a correção da
  v2.3, ver a seção 5.1.4).
- `hidden` -- o elemento está fora da tela, ou com
  `aria-hidden='true'`, ou com dimensão zero.
- `capability_required` -- o manifesto declarou `requires_capability`
  e o conjunto atual de `NAC.userCapabilities()` não o satisfaz (v2.3,
  ver a seção 5.1.7).
- `timeout` -- o efeito foi despachado mas o evento de confirmação de
  conformidade não chegou em 5 segundos (30 segundos para `invoke`).
  **Um timeout significa falha real**: o handler pode ter travado, a
  confirmação pode nunca ter sido ligada, pode ter havido uma corrida
  de rede. Quem chamou DEVE tratar o timeout como falha, a menos que
  tenha prova do efeito por outro canal.

### 5.2 Introspecção

```ts
NAC.describe():    { active: string|null, plugins: PluginSnap[] }
NAC.describe_v2(): { v2_scope_entries: [...], sitemap: ..., data_tables: [...] }
NAC.manifest(plugin_slug: string): Manifest|null
NAC.validate_global(opts?: {probe?: boolean}): GlobalReport   // named buckets, see 10.1
```

### 5.3 Tabelas de dados (desde 2.1)

As primitivas de tabela de dados NÃO fazem parte do runtime central
(`js/nac.js` / o `nac.mjs` do `@nac3/runtime`). Elas vêm no módulo de
extensões para brownfield `js/nac-v2-extensions.js` (publicado como
`@nac3/runtime/extensions`), que as prende ao mesmo objeto
`window.NAC` depois de carregar. Carregue o módulo de extensões depois
do runtime central para ter a superfície `dt_*`:

```html
<script src="https://yujin.app/nac-spec/js/nac.js"></script>
<script src="https://yujin.app/nac-spec/js/nac-v2-extensions.js"></script>
```

```js
// or with the npm package:
import '@nac3/runtime';
import '@nac3/runtime/extensions';
```

Os métodos abaixo só existem quando o módulo de extensões está
carregado; chamá-los num runtime só com o núcleo não faz nada / devolve
`undefined`.

```ts
NAC.registerDataTable(spec: DataTableSpec): string   // returns table_id
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

Uma tabela de dados tem um `subkind`:

- `collection` -- linhas ordenadas, com confirmação transacional
  opcional. Usada para linhas de nota fiscal, itens de carrinho,
  entradas de log.
- `matrix` -- uma grade de linha x coluna em que cada célula carrega um
  valor. Usada para matrizes de permissão, grades de horário.
- `matrix-singletree` -- uma matriz em que cada linha se colapsa numa
  árvore (raro).

---

### 5.4 Resolução estrita + desambiguação (v2.4)

O NAC3 v2.4 torna **estrita** a resolução de id, verbo, qualificador e
rótulo. Os verbos que resolvem um pedido para um único elemento do DOM
-- `click_by_verb`, `tab` (na forma de um argumento) e `tab_by_label`
-- não adivinham mais. Quando um pedido resolve para zero candidatos ou
para mais de um, o runtime lança um `NacError` carregando a lista de
candidatos E emite um evento `nac:disambiguation_requested`, em vez de
despachar silenciosamente para o primeiro parecido.

Este é o invariante de **dano silencioso zero**. Ele existe para
software assistivo e para agentes, onde um despacho silencioso para o
elemento errado sem caminho de recuperação é um bloqueador de
segurança. O comportamento tolerante de antes da 2.4 -- um fallback com
`indexOf` por substring que resolvia para o primeiro parecido -- foi
removido.

> Compatibilidade retroativa: a v2.4 é uma mudança de
> *comportamento do contrato*. Caminhos de código que já passavam
> argumentos sem ambiguidade seguem funcionando igual. Caminhos de
> código que dependiam do fallback tolerante com `indexOf` para
> resolver para o primeiro parecido agora vão lançar exceção -- por
> projeto.

#### 5.4.1 Casamento estrito de qualificador (`click_by_verb`)

`click_by_verb(plugin, verb, opts?)` escolhe entre nós do DOM que
compartilham `data-nac-action="<verb>"`. Quando `opts.qualifier` (uma
string) é fornecido, um elemento casa **somente** se o seu
`data-nac-id` satisfizer:

```js
id === qualifier || id.endsWith('__' + qualifier)
```

Ou seja: igualdade exata do id, ou um sufixo ancorado depois de um
separador `__`. **Não há fallback por substring**. Um qualificador que
é apenas uma substring de um id (não igual, não um `__suffix`
ancorado) NÃO casa.

- 0 casamentos -> lança `NacError('no_matching_instance', ...)`.
- exatamente 1 casamento -> resolve e clica.
- >1 casamentos -> lança `NacError('ambiguous_qualifier', ...)`.

`opts.qualifier_ordinal` (um número) escolhe por posição entre todos os
elementos do DOM que compartilham o verbo, sem passar pelo casamento de
qualificador.

#### 5.4.2 Resolução estrita de id (`tab`)

Forma de um argumento de `tab(plugin, id)`: um casamento exato de
`data-nac-id` no DOM vence. Caso contrário, o runtime procura
instâncias cujo id comece com `id + "__"`:

- 0 instâncias qualificadas e nenhum id exato -> `no_matching_instance`.
- exatamente 1 -> resolve.
- >1 -> `ambiguous_tab` (passe o id qualificado completo).

#### 5.4.3 Resolução estrita por rótulo (`tab_by_label`)

`tab_by_label(plugin, label)` resolve um rótulo legível por pessoas
para uma aba, tentando, nesta ordem: casamento exato com o rótulo do
manifesto, casamento difuso ou por substring no manifesto, casamento
exato com o texto do DOM, casamento difuso com o texto do DOM. Se
qualquer um desses níveis der mais de um casamento, lança
`NacError('ambiguous_label', ...)`; se nenhum nível casar, lança
`NacError('not_found', ...)`. O campo `reason` do evento emitido
registra qual nível ficou ambíguo (`ambiguous_label_exact`,
`ambiguous_label_fuzzy`, `ambiguous_label_exact_dom`,
`ambiguous_label_fuzzy_dom` ou `no_matching_label`).

#### 5.4.4 Códigos de erro

| `err.code` | Lançado por | Significado |
|------------|-----------|---------|
| `no_matching_instance` | `click_by_verb` (qualificador), `tab` | nenhum elemento casa com o qualificador / id |
| `ambiguous_qualifier`  | `click_by_verb` | mais de 1 elemento casa com o qualificador |
| `ambiguous_tab`        | `tab`           | mais de 1 instância qualificada `id__` casa |
| `ambiguous_label`      | `tab_by_label`  | mais de 1 aba casa com o rótulo (em qualquer nível) |
| `not_found`            | `tab_by_label`  | nenhuma aba casa com o rótulo |

#### 5.4.5 A forma de `err.candidates`

Todo erro de desambiguação carrega um array `candidates`. Cada
candidato é exatamente:

```ts
{ nac_id: string, label: string }
```

`nac_id` é o `data-nac-id` do elemento. `label` é resolvido preferindo
`aria-label`, depois o `textContent` aparado (cortado em 120
caracteres), e por fim recorrendo ao `data-nac-id`. A lista é validada
contra o DOM: ela nomeia os elementos reais entre os quais quem chamou
pode escolher. `NacError` mescla `candidates` no `Error` lançado, então
`err.code`, `err.message` e `err.candidates` ficam todos preenchidos.

#### 5.4.6 O evento `nac:disambiguation_requested`

Sempre que uma chamada de resolução estrita falha (nenhum casamento OU
casamentos demais), o runtime despacha um `CustomEvent`
`nac:disambiguation_requested` em `document` *além de* lançar a
exceção. A emissão é de melhor esforço: se o despacho falhar, o runtime
lança de todo modo.

```ts
document.addEventListener('nac:disambiguation_requested', (e) => {
  e.detail; /* {
    method:     'click_by_verb' | 'tab' | 'tab_by_label',
    plugin:     string | null,
    query:      { verb?, qualifier?, label?, id? },
    reason:     string,   // finer-grained than err.code (see 5.4.3)
    candidates: Array<{ nac_id: string, label: string }>,
  } */
});
```

#### 5.4.7 Como quem chama desambigua

Com a lista de candidatos em mãos (de `err.candidates` ou de
`event.detail.candidates`), quem chamou escolhe um e despacha de novo
por qualquer destes caminhos:

1. **O `nac_id` completo** -- `NAC.click(candidate.nac_id)`. Este é o
   caminho canônico de recuperação: o candidato já carrega o id exato.
2. **O `__suffix` ancorado** -- passe para `click_by_verb` o sufixo
   exato da instância como qualificador.
3. **`opts.qualifier_ordinal`** -- seleção por posição entre os
   elementos que compartilham o verbo (na ordem do DOM).

A referência trabalhada é `example-v24-disambiguation.php`; o contrato
é coberto por `runtime/test/stage2-disambiguation.mjs` e
`runtime/test/stage7-strict-resolution.mjs`.

---

## 6. Eventos

Toda ação emite um evento de conclusão determinístico. O `NAC.click()`
do runtime consulta esse evento e resolve quando ele dispara.

| Papel | Evento de sucesso | Evento de falha |
|------|---------------|---------------|
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

### 6.1 Forma do detalhe do evento

O detalhe de todo evento carrega o campo canônico de id, mais `plugin`:

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

### 6.2 Emitir de um handler do host

Um handler de clique DEVE emitir o evento de sucesso correspondente
depois do seu efeito síncrono:

```js
button.addEventListener('click', function (ev) {
  // ... do the work ...
  document.dispatchEvent(new CustomEvent('nac:action:succeeded', {
    detail: { plugin: 'invoice', action_id: 'invoice.save' }
  }));
});
```

Se o trabalho for assíncrono, emita depois da resolução. Se o trabalho
falhar, emita `nac:action:failed` com `{detail: {plugin, action_id,
error: <message>}}`.

O runtime v2.2 vai fornecer `NAC.bindAction(el, handler, ctx)`, que
envolve `addEventListener` e emite automaticamente.

### 6.3 Por que não usar o próprio evento de clique?

Um evento `click` do DOM dispara antes de o handler rodar. O contrato
do NAC3 precisa saber quando o **efeito terminou**, não quando o
clique começou. Daí a família de eventos separada.

---

## 7. Procedência

### 7.1 isTrusted

`event.isTrusted` vale `true` para cliques iniciados por uma pessoa
(mouse real, tecla real, ativação por leitor de tela) e `false` para
cliques sintetizados (`element.click()`, o dispatchEvent de um
MouseEvent construído à mão, automação).

O NAC3 DEVE expor isso em `event.detail.is_trusted` dentro do evento de
sucesso. Hosts que executam ações sensíveis por segurança (pagamento,
exclusão) PODEM exigir `is_trusted === true` e recusar cliques
sintéticos. A demo de referência `example-v20-full.php` inclui um par
de botões (`v20_panel.istrusted_real` e `v20_panel.istrusted_fake`)
que demonstra a distinção.

### 7.2 Manifestos assinados com HMAC

Um manifesto PODE carregar um bloco `provenance`:

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
manifesto (excluindo a própria assinatura) e recusa manifestos cuja
assinatura não casa. Usado por implantações multi-inquilino para
impedir que um inquilino falsifique o manifesto de outro.

### 7.3 Modelo de ameaças

Veja `SECURITY.md` para o modelo de ameaças completo. A versão curta:

- O NAC3 não autentica o **usuário**. Esse é o trabalho da sua camada
  de autenticação.
- O NAC3 autentica o **manifesto** (HMAC).
- O NAC3 distingue cliques reais de cliques sintetizados (isTrusted),
  para que um host possa recusar os últimos em verbos sensíveis.
- O NAC3 não protege contra um agente malicioso rodando com o acesso do
  usuário. Tal agente pode fazer tudo o que o usuário pode.

---

## 8. Níveis de conformidade

Um nível se escreve **NAC3 Conformance Level 1**, **2** ou **3**. O
nome de um nível não é o nome do protocolo: um validador, um relatório
ou uma afirmação de conformidade DEVE citar um nível pelo identificador
`nac3-conformance-level-<1|2|3>` publicado em
`api/latest/levels.json`, nunca por um nome de exibição. A seção 8.1
registra os nomes que estes níveis carregavam antes da 2.5.0.

Uma página está em **NAC3 Conformance Level 1** se:

- Todo widget clicável que um agente deveria conseguir operar carrega
  `data-nac-id` e `data-nac-role`.
- Todo elemento com `data-nac-role="action"` dispara
  `nac:action:succeeded` depois do seu efeito.
- A página registra ao menos um manifesto de plugin via
  `NAC.register()`.
- `NAC.click(id)` funciona para cada id anunciado.

Uma página está em **NAC3 Conformance Level 2** se, além disso:

- Registra os arrays `tabs[]`, `fields[]`, `actions[]` explicitamente
  no seu manifesto (não inferidos do DOM).
- Fornece `label_i18n` cobrindo todas as 10 locales do NAC3 para cada
  rótulo visível ao usuário.
- Implementa as primitivas brownfield da v2.0: árvore de escopo,
  captura efêmera, autoRegister.watch.
- Passa `NAC.validate_global({probe: false})` com zero achados de
  severidade `error`.

Uma página está em **NAC3 Conformance Level 3** se, além disso:

- Carrega manifestos assinados com HMAC.
- Distingue `isTrusted` para os verbos sensíveis por segurança.
- Passa `NAC.validate_global({probe: true})` com zero achados.

A linha de comando do pacote NPM (`npx nac3 validate <url>`) informa o
nível mais alto que uma página alcança. (O pacote publica os binários
`nac3` e `nac`; os dois resolvem para a mesma linha de comando.)

### 8.1 Nomes históricos dos níveis (v2.5)

Antes da 2.5.0 os três níveis se escreviam `NAC-1`, `NAC-2` e `NAC-3`.
Esses nomes estão a um hífen de distância do nome do protocolo, `NAC3`,
então "esta página é conforme NAC-3" não podia ser distinguido de "esta
página implementa NAC3", e um agente a quem se pedia informar um nível
não tinha nenhuma string sem ambiguidade para informar.

Os nomes antigos seguem legíveis como apelidos históricos:
`api/latest/levels.json` publica cada um como `legacy_display_name` ao
lado do nível a que pertencia, para que um documento escrito antes da
2.5.0 ainda possa ser mapeado para um nível. Eles NÃO são normativos.
Texto novo, saída de validador e afirmações de conformidade usam o
número do nível ou o identificador publicado.

---

## 9. Versionamento

O NAC3 segue o semver:

- Salto **maior**: mudança incompatível na API pública ou nos formatos
  de fio. Quem adota edita código.
- Salto **menor**: funcionalidades novas, compatíveis com o anterior. O
  código antigo continua funcionando.
- Salto de **correção**: correções de defeito, mudanças só de
  documentação.

Política de obsolescência: uma funcionalidade marcada `@deprecated` na
versão `X.Y.0` não é removida antes de `(X+1).0.0`. As notas de cada
versão documentam toda remoção explicitamente.

A versão do pacote NPM espelha a versão da especificação:
`@nac3/runtime@X.Y.Z` implementa o NAC3 vX.Y, com Z revisões de
correção em cima. O exemplo está escrito com marcadores de propósito:
uma versão concreta nesta frase fica velha na versão seguinte, e este
documento carregava `2.1.3` muito depois de o pacote ter avançado.

### 9.1 Pré-versões e dist-tags

Uma versão com cauda de pré-versão (`-alpha.N`, `-beta.N`, `-rc.N`)
**não** é uma versão publicada desta especificação. Ela existe para que
uma mudança possa ser exercitada antes de ser prometida.

- **`latest` aponta sempre e somente para uma versão estável.** Um
  `npm install @nac3/runtime` sem tag DEVE resolver para uma versão sem
  cauda de pré-versão. Quem adota e instala o padrão nunca recebe uma
  pré-versão por acidente.
- **Pré-versões são publicadas sob a sua própria dist-tag** (`alpha`,
  `beta`, `rc`). Aderir é explícito: `npm install
  @nac3/runtime@alpha`.
- **Nada numa pré-versão é uma promessa.** Qualquer superfície
  introduzida numa delas pode mudar ou desaparecer antes da versão
  estável que a carregue. As garantias de estabilidade da seção 10 e as
  garantias de códigos de achado da seção 12 começam na versão estável.
- **Pré-versões nunca são despublicadas** e nunca são re-etiquetadas
  como `latest` retroativamente. O registro do que foi publicado
  permanece legível.

A versão autoritativa do runtime de referência é a constante
`NAC.version` em `js/nac.js`, e ela é publicada como dado:
`api/latest.json` carrega um ponteiro `stable` e um `prerelease`
separados (qualquer um dos dois pode ser `null`), e todo artefato
publicado carrega o seu próprio campo `channel`. Um consumidor que
exige um contrato estável lê um campo e recusa, sem nenhuma string de
versão para parsear e nenhuma tag em que confiar.

---

## 10. Validadores

### 10.1 Runtime: `NAC.validate_global()`

Percorre o DOM vivo + os manifestos registrados e devolve um **objeto
de grupos nomeados**: um grupo por condição, cada um um array de
achados. Desde a 2.5.0 cada achado de cada grupo carrega `code` e
`severity`, então uma integração de CI pode travar por um código sem
parsear uma mensagem:

```ts
{
  ok:         boolean,       // false when any error-severity finding exists
  has_errors: boolean,
  duplicates: [{ code: 'nac_id_duplicate_across_plugins',
                 severity: 'error', nac_id, plugins: string[] }],
  orphans:    [{ code: 'nac_id_orphan_in_dom',
                 severity: 'warn', nac_id, in_dom, in_manifest,
                 plugin_root }],
  unmounted:  [{ code: 'nac_id_declared_not_mounted',
                 severity: 'warn', nac_id, in_manifest, in_dom,
                 plugin }],
  convention_violations:
              [{ code: 'nac_id_missing_plugin_prefix',
                 severity: 'warn', nac_id, plugin, hint }],
  plugin_instance_violations:
              [{ code: 'duplicate_plugin_no_instance_id',
                 severity: 'error', slug, instance_count, ... }],
  tolerated:  [{ kind, nac_id, until, original }],
  plugin_count: number,
  total_ids:    number,
  timestamp:    number
}
```

Os cinco códigos, a sua severidade e o que fazer com cada um são
publicados como dado em `api/latest/findings.json`, sob
`global_buckets`. Códigos de achado são estáveis entre versões de
correção; códigos novos só em saltos menores, e um código nunca é
reutilizado para outra condição (seção 12, promessa 4).

**As versões anteriores à 2.5.0 não prendiam nenhum código a estes
grupos**, e esta seção descrevia um array plano de achados que o
runtime de referência nunca devolveu (auditoria N-14, N-34).

**Mudança de comportamento na 2.5.0 (auditoria N-33).** Antes da 2.5.0
o coletor por trás deste validador lia apenas os grupos legados do
manifesto (`actions`, `fields`, `tabs`, `kpis`, `charts`, com chave
`nac_id`) e nunca a forma canônica `elements: [{ id }]` da seção 4.
Contra um manifesto escrito da maneira documentada, portanto, ele
informava `total_ids: 0`, listava cada elemento declarado como órfão,
não conseguia informar uma duplicata, um id não montado nem uma
violação de convenção de modo algum, e ainda respondia `ok: true`. Da
2.5.0 em diante as duas formas são lidas. Um host que travava a sua CI
em `has_errors` pode ver a sua primeira falha depois de atualizar: esse
é um verdadeiro positivo que sempre estava lá, não uma regra nova.

### 10.2 CLI: `npx nac3 validate <target>`

Envolve o `validate_global` mais um lint estático de coerência entre
HTML e manifesto. Códigos de saída:

- `0` -- nenhum achado de severidade >= ao limiar configurado.
- `1` -- há achados.
- `2` -- o próprio alvo não pôde ser carregado.

Útil em CI: `npx nac3 validate ./dist/index.html --severity=error`. O
pacote expõe a CLI sob dois nomes de binário, `nac3` e `nac`; use o que
não colidir com outra ferramenta no seu PATH.

---

## 11. O sistema em torno do NAC3

O NAC3 é uma camada de contrato. Para transformar uma página conforme
ao NAC3 num aplicativo conduzido por voz, você também precisa de:

1. **Uma fonte de voz para texto** (o SpeechRecognition do navegador, a
   API do Whisper, etc).
2. **Um intermediário LLM** que toma o texto do usuário + o retrato que
   o `NAC.describe()` dá da página + uma dica de i18n e emite ações
   estruturadas: `[{kind: 'click', nac_id: 'X'}, {kind: 'fill',
   nac_id: 'Y', value: 'Z'}]`. Veja `guides/LLM_WIRING.md`.
3. **Um cliente de chat** que sustenta a conversa e despacha as ações.
   A referência é `js/nac-chat-client.js`.
4. **Um destino de texto para voz** para as respostas faladas (o
   SpeechSynthesis do navegador, ElevenLabs, etc).

O NAC3 padroniza apenas a forma de entrada e saída do passo 2 (o
retrato do `NAC.describe()` + a forma das ações). Os passos 1, 3 e 4
ficam fora da especificação; cada um compõe o que quiser.

---

## 12. Garantias de estabilidade

O que esta especificação promete:

1. O conjunto de papéis canônicos da seção 1 não vai encolher. PODEM
   ser acrescentados papéis novos em versões menores.
2. A família de eventos da seção 6 não vai ser renomeada. PODEM ser
   acrescentados eventos novos em versões menores.
3. Os verbos de `NAC.click`, `NAC.fill`, etc., não vão mudar de forma
   em versões menores. PODEM aparecer campos opcionais novos em `opts`.
4. Os códigos de achado do `validate_global` não vão ser reutilizados
   para condições diferentes entre versões menores. Desde a 2.5.0 cada
   grupo desse validador carrega um código, e todos são publicados com
   a sua severidade em `api/latest/findings.json`: comparando duas
   versões publicadas, um código reutilizado fica visível sem ler fonte
   nenhum.

O que esta especificação NÃO promete:

1. A redação exata das mensagens de erro (são strings do catálogo de
   i18n; as localizações podem mudar).
2. A estratégia de DOM para encontrar elementos (`querySelector` hoje;
   mais adiante pode virar um índice mais rápido).
3. O arranjo interno do cache de manifestos. Trate os manifestos como
   de escrita apenas do lado do host, e de leitura apenas do lado do
   agente.

---

## 13. Perguntas abertas

Elas são registradas **aqui**, nesta seção. Uma revisão anterior
intitulava isto "Perguntas abertas (registradas separadamente)" e nunca
dizia onde ficava esse "separadamente"; não havia nenhum outro
registro. Uma pergunta que chega a uma decisão sai da tabela abaixo e
entra na seção que ela afeta. Uma pergunta que se torna uma proposta
concreta recebe um RFC, e esses estão indexados em
[`rfcs/README.md`](rfcs/README.md), com o processo em
[`CONTRIBUTING.md`](CONTRIBUTING.md).

Cada linha carrega a versão em que foi avaliada por último, para que
quem lê consiga distinguir uma pergunta viva de uma abandonada.
**Nenhuma linha carrega uma versão-alvo**: uma promessa com data que
passa da data é pior do que uma sem data, que é o erro que a seção 5
cometia a respeito do `payload_schema`.

| Pergunta | Estado | Última avaliação | Como está |
|----------|-------|---------------|-----------------|
| O `data-nac-role="navigation"` deveria resolver alguma vez para uma aba? | **DECIDIDO: não** | v2.5 | Decidido na 2.2.0 e exigido desde então: um id com prefixo `tab.` e papel `navigation` levanta `tab_id_manifest_role_drift`, e com `STRICT_VALIDATION` (padrão `true` desde a 2.3.0) o `NAC.register` lança. O `tab_by_label` resolve abas apenas a partir de `m.tabs[]` e `elements[role=='tab']`. `navigation` é uma região de referência, nunca um painel alternável. Veja as seções 1 e 10. |
| O `NAC.click()` deveria aceitar ids relativos (por exemplo `'./save'`)? | **ABERTA, não implementada** | v2.5 | O resolvedor casa `data-nac-id` de forma exata e delimita por plugin: o ativo, ou o de `opts.plugin`. Essa delimitação já cobre o caso que a pergunta pedia (`NAC.click('save', {plugin:'invoice'})`), então a pressão por uma sintaxe relativa é baixa e nada está em andamento. Decidi-la significaria acrescentar uma gramática de caminhos à seção 2, onde os ids são declarados opacos para o runtime. |
| Os manifestos deveriam suportar herança / extensão entre plugins (um manifesto base estendido por um inquilino)? | **ABERTA, candidata para a próxima maior** | v2.5 | Não implementada. **Não confundir com a seção 15**, o "contrato de extensão de plugin": aquilo foi publicado na v2.5 e é um mecanismo de roteamento para o backend (`registerPlugin` / `call` / `read` / `subscribe`), não herança de manifestos. A pergunta aqui é sobre um manifesto derivar de outro, o que toca as regras de unicidade de id da seção 2 e é por isso que fica reservada para uma maior. |
| A exigência de `payload_schema` deveria ser formalizada e ligada? | **ABERTA, sem data** | v2.5 | Movida para cá da seção 5, que a prometia para a v2.4. Não chegou na v2.4 e não chegou até a v2.5; o runtime de referência não lê o campo. Veja a seção 5 para saber exatamente o que é e o que não é validado hoje. |
| Os achados do `validate_global()` deveriam carregar um código do catálogo publicado? | **DECIDIDO: sim, publicado na 2.5.0** | v2.5 | Cada item de cada grupo carrega `code` + `severity`, então a promessa 4 da seção 12 agora cobre um conjunto real em vez de um vazio. Os cinco códigos são publicados sob `global_buckets` em `api/latest/findings.json`, e o gerador os LÊ de um caso de teste que provoca cada grupo, em vez de escrevê-los à mão: a versão anterior escrevia `code: null` para um grupo que carregava código desde a 2.5.0 e publicava as duas afirmações no mesmo arquivo. Construir esse caso de teste é também o que encontrou a auditoria N-33: o validador não conseguia ver um manifesto escrito na forma canônica. Veja 10.1. |

---

## 13.5 Governança

Hoje o NAC3 é tutelado pela Yujin. A especificação, a documentação e o
runtime de referência são todos publicados sob Apache-2.0. (O runtime
esteve marcado como MIT na era de dois repositórios anterior à 2.5; foi
harmonizado para Apache-2.0 em todos os artefatos do NAC3 na
consolidação de 2026-05-23. Veja `LICENSE` e `runtime/LICENSE`.) A
Yujin se compromete a mover o NAC3 para uma fundação neutra (um grupo
comunitário do W3C, a Linux Foundation, ou um organismo industrial
equivalente) se e quando a adoção justificar uma governança neutra. Até
então, mudanças na especificação seguem o processo de RFC documentado em
`CONTRIBUTING.md`, com período de comentário público de ao menos 14
dias para qualquer mudança que afete a API pública ou os formatos de
fio.

Para quem adota: o licenciamento uniforme sob Apache-2.0 garante que a
especificação e o runtime sobrevivam a qualquer mudança na situação
societária da Yujin. Você pode bifurcar qualquer um dos dois, rodar
qualquer um dos dois e publicar qualquer um dos dois, hoje e depois que
não estivermos mais aqui. Este documento registra o compromisso para
que o caminho até essa sobrevivência seja explícito, não implícito.

---

## 14. Implementação de referência

A implementação canônica é o runtime de referência distribuído como o
pacote NPM `@nac3/runtime`. A fonte normativa da versão é a própria
constante `NAC.version` do runtime, publicada como dado em
`api/latest.json` (veja a seção 9.1). Esta seção deliberadamente não
repete um número de versão: ela carregava `2.5.0-alpha.5` quando o
pacote já havia se movido, o que é a mesma classe de defeito dos
exemplos velhos removidos das seções 5 e 9. Ela publica:

- `js/nac.js` -- o runtime central: a API pública imperativa + de
  introspecção da seção 5 (click/fill/select/tab,
  click_by_verb/tab_by_label, invoke/utter, edit_field,
  setCapabilities, syncPlugin, request_authority/confirm_action,
  registerPlugin/call/read/subscribe, narrate/context/tree,
  expect/diff, describe, validate_global, ...). Publicado como a
  entrada `main`/`module`/`browser` do pacote (`dist/nac.mjs`).
- `js/nac-v2-extensions.js` -- as primitivas brownfield + de tabela de
  dados que se prendem ao mesmo `window.NAC` depois de o núcleo
  carregar: árvore de escopo, autoRegister, captura efêmera, HMAC,
  atestação de isTrusted, catálogo de i18n (`t`/`locale`) e toda a
  família `registerDataTable` / `dt_*` de tabelas de dados (seção
  5.3). Publicado como `@nac3/runtime/extensions`
  (`dist/nac-v2-extensions.mjs`). O runtime central NÃO carrega a
  superfície `dt_*`; carregue este módulo para tê-la.
- `js/nac-chat-client.js` -- um cliente de chat de referência que liga
  voz + LLM + despachante. Publicado como
  `@nac3/runtime/chat-client`.

O pacote também expõe uma CLI sob os nomes de binário `nac3` e `nac`
(`dist/cli.js`, seção 10.2).

Outras implementações são bem-vindas (Python para executores de
automação nativos, Rust para agentes embarcados, etc). A autoridade é a
especificação, não o código JS.

---

## 15. Contrato de extensão de plugin -- superfícies de canvas + API (v2.5)

As seções 1-14 supõem que a superfície relevante para o agente é o
**DOM**. Todo elemento endereçável tem um atributo `data-nac-id`, todo
verbo dispara por `el.click()`, toda leitura de estado vem de
`el.getAttribute(...)`. Isso funciona para aplicativos cuja moldura E
conteúdo vivem em nós do DOM.

Não funciona para aplicativos em que parte da superfície é **canvas**
(LibreOffice / Collabora Online, Figma, Excalidraw, Miro, qualquer
editor WebGL próprio). A moldura pode continuar sendo DOM (barras de
ferramentas, diálogos), mas os comandos muitas vezes precisam fluir
pela própria API pública do aplicativo (postMessage, SDK de plugins,
ponte de script), e o estado pode não ser legível pelo DOM de forma
alguma.

A v2.5 acrescenta um conjunto pequeno de primitivas que permitem a um
plugin do NAC3 declarar o seu próprio contrato de roteamento para essas
superfícies. O runtime permanece agnóstico de qualquer aplicativo
específico: ele aprende a falar com um apenas lendo o manifesto do
plugin.

### 15.1 Por que um conjunto novo de primitivas

O `NAC.click(id)` que só conhece DOM não consegue:

- Mandar um postMessage `Send_UNO_Command` para um iframe do Collabora
  em sandbox.
- Chamar `figma.currentPage.selection = [...]` dentro do sandbox de
  plugins do Figma.
- Invocar `excalidrawAPI.setElements(...)` numa ref do React.
- Ler se o Negrito está ativo na seleção atual do Collabora (a barra de
  ferramentas reflete isso; o canvas esconde).

A correção **não** é estender o `NAC.click` com heurísticas de detecção
de backend. A correção é acrescentar um verbo explícito e agnóstico que
tome um slug de plugin e um caminho de verbo, e que deixe o manifesto
do plugin declarar como esse verbo é roteado.

### 15.2 As três primitivas

```ts
NAC.registerPlugin(slug: string, manifest: PluginManifest): void
NAC.call(plugin: string, verb_path: string, args?: object): Promise<any>
NAC.read(plugin: string, state_path: string): Promise<any>
NAC.subscribe(plugin: string, event_path: string,
              cb: (data: any) => void): SubscriptionHandle
NAC.unsubscribe(handle: SubscriptionHandle): void
```

- `registerPlugin(slug, manifest)` registra um plugin v2.5. Um mesmo
  `slug` PODE aparecer tanto no registro de manifestos do DOM (seção 5)
  quanto no registro de extensões v2.5; os dois coexistem. Chamadas da
  v2.5 resolvem apenas pelo registro v2.5.
- `call` invoca um verbo declarado. O roteamento é escolhido pelo
  manifesto, não pelo agente. Resolve com o que o backend tenha
  devolvido (muitas vezes `undefined` / `{ok: true}`); rejeita com
  `NacError` se o verbo for desconhecido, se o backend falhar, ou se a
  forma da resposta for inválida.
- `read` devolve um valor de estado declarado. O runtime percorre a
  cadeia de alternativas do estado na ordem declarada e devolve a
  primeira fonte que resolve; rejeita somente quando todas as fontes da
  cadeia falharam.
- `subscribe` prende um listener a um evento declarado. Devolve um
  identificador que quem chamou passa para `unsubscribe` para limpar.
  Os eventos PODEM ser respaldados por uma fonte de eventos real a
  montante ou sintetizados por polling / MutationObserver -- o
  manifesto declara qual.

As quatro funções são assíncronas (devolvem Promise), exceto
`unsubscribe`, que é síncrona e idempotente.

### 15.3 Forma do manifesto de plugin

```ts
interface PluginManifest {
  slug: string;
  verbs:  { [verb_path: string]: VerbBinding };
  state:  { [state_path: string]: StateBinding[] };
  events: { [event_path: string]: EventBinding };
}

interface VerbBinding {
  backend:       BackendKind;
  /* backend-specific fields (see 15.4) */
  [k: string]: any;
}

interface StateBinding {
  backend:       BackendKind;
  /* backend-specific fields (see 15.4) */
  extract?:      string;   /* extractor DSL string (see 15.5) */
  [k: string]: any;
}

interface EventBinding {
  backend:       BackendKind;
  /* backend-specific fields */
  [k: string]: any;
}

type BackendKind =
  | 'postmessage'
  | 'postmessage-listen'
  | 'sdk-call'
  | 'script-bridge'
  | 'dom-mirror'
  | 'same-origin-window'
  | 'synthetic-mutation'
  | 'synthetic-poll';
```

Os manifestos são JSON puro (sem callbacks de JS). Forge, Sumi e
qualquer ferramenta futura os geram como dado; o runtime interpreta os
nomes de backend a partir de um vocabulário fixo.

Verbos e eventos têm **exatamente uma** ligação. O estado tem um
**array ordenado** de ligações: o runtime percorre a cadeia em ordem e
devolve a primeira fonte que resolveu com sucesso.

### 15.4 Vocabulário de backends

| Tipo | Usado para | Campos obrigatórios |
|------|----------|-----------------|
| `postmessage` | Verbo: postar uma mensagem num iframe via `postMessage`. | `target` (seletor CSS do iframe para onde enviar), `message` (a string MessageId), `values` (objeto literal interpolado com os argumentos), `values_from_args` (array opcional de chaves de argumento repassadas tal e qual) |
| `postmessage-listen` | Evento: escutar um `MessageId` entrante específico em `window.message`. | `source` (seletor CSS do iframe por onde filtrar a origem; se omitido, aceita qualquer origem), `message` (o MessageId a casar), `extract` (o DSL de extração sobre os dados da mensagem) |
| `sdk-call` | Verbo: chamar uma função JS exposta globalmente (por exemplo um plugin do Figma, a API do Excalidraw). | `path` (caminho pontilhado dentro de `window`, por exemplo `figma.currentPage.selection`), `mode` (`assign` para definir o caminho com o valor dos argumentos, `invoke` para chamá-lo como função com o objeto de argumentos) |
| `script-bridge` | Verbo ou estado: invocar a ponte de script de um aplicativo (o `CallPythonScript` do Collabora, a ponte UNO do LibreOffice, o Google Apps Script). | `bridge` (um identificador específico do backend, como `collabora.python`), `script` (identificador do script), `function` (nome da função a rodar), `args` (objeto literal interpolado com os argumentos da chamada), `response_match` (para estado: o MessageId de resposta a esperar), `timeout_ms` (opcional, padrão 5000) |
| `dom-mirror` | Estado: ler de um elemento do DOM cujo atributo / classe / texto espelha um estado interno do canvas (por exemplo um botão da barra de ferramentas realçado quando a sua formatação está ativa na seleção atual). | `selector` (seletor CSS a consultar), `extract` (o DSL de extração, veja 15.5) |
| `same-origin-window` | Estado: ler de `iframe.contentWindow.<path>` quando o iframe é da mesma origem. O runtime detecta a origem cruzada e segue para a alternativa seguinte. | `target` (seletor CSS do iframe), `path` (caminho pontilhado dentro de `contentWindow`) |
| `synthetic-mutation` | Evento: sintetizar um evento observando mutações do DOM sobre uma ou mais fontes de estado e reemitindo quando o valor observado muda. | `observe` (array de caminhos de estado a vigiar; o runtime chama `read` em cada um e os compara entre mutações), `throttle_ms` (opcional, padrão 100) |
| `synthetic-poll` | Evento: sintetizar um evento fazendo polling das fontes de estado. | `observe` (array de caminhos de estado), `interval_ms` (padrão 250) |

Cada backend DEVE ser implementado pelo runtime como um despachante
autocontido (`dispatch(binding, args, context) -> Promise<value>`).
Acrescentar um tipo de backend novo à especificação exige saltar a
versão da especificação; runtimes que ignoram backends desconhecidos
DEVEM recusar manifestos que os declaram (sem pulo silencioso).

### 15.5 Mini-DSL de extração

Os backends de estado e o backend de evento `postmessage-listen` muitas
vezes precisam tirar um campo de um objeto maior. O runtime traz um DSL
declarativo minúsculo para que os manifestos continuem sendo só JSON:

| Sintaxe | Significado | Exemplo de entrada -> saída |
|--------|---------|-------------------------|
| `field.path.to.value` | Percurso de um caminho pontilhado. | `{a:{b:1}}` com `a.b` -> `1` |
| `attribute:NAME` | Só DOM: ler `el.getAttribute(NAME)`. | `<i data-x="hi">` com `attribute:data-x` -> `'hi'` |
| `text` | Só DOM: ler `el.textContent`. | `<span>hi</span>` com `text` -> `'hi'` |
| `classList.contains:CLASS` | Só DOM: `el.classList.contains(CLASS)` -> booleano. | `<button class="active">` com `classList.contains:active` -> `true` |
| `value` | Só DOM: ler `el.value`. | `<input value="x">` com `value` -> `'x'` |
| `present` | Só DOM: devolve `true` se o seletor resolveu um elemento, e `false` caso contrário. | o seletor casou -> `true` |

Na v2.5 não há suporte a composição; um extrator é exatamente uma das
linhas acima. Um manifesto que precise de transformação complexa
declara um `script-bridge` em vez disso.

### 15.6 Semântica da cadeia de alternativas de `state`

`state[path]` é um array de ligações. `NAC.read(plugin, path)` percorre
o array em ordem. Para cada ligação:

1. O runtime invoca o despachante do backend.
2. Se o despachante resolve com um valor (incluindo `false`, `0` e
   string vazia, mas NÃO `undefined`), o `read` devolve esse valor.
3. Se o despachante rejeita, ou resolve com `undefined`, o runtime
   avança para a ligação seguinte do array.
4. Se nenhuma ligação produziu um valor, o `read` rejeita com
   `NacError('state_unreadable', ...)`, cujo `err.attempts: [...]`
   carrega uma entrada por backend tentado, com `{backend, reason}`.

Fundamento: a cadeia codifica a ordem de preferência de quem escreveu o
manifesto. A fonte mais rápida, mais barata e mais fresca é declarada
primeiro; as alternativas degradam com elegância. O runtime nunca
escolhe silenciosamente uma fonte pior primeiro.

### 15.7 Procedência das ações sintéticas

Cada despacho de `NAC.call` emite um evento `nac:plugin:invoked` em
`document` depois de o backend devolver. A carga do detalhe:

```js
{
  plugin:    'collabora.writer',
  verb_path: 'uno.Bold',
  backend:   'postmessage',
  request_id: 'pi_<random hex>',
  source:    'agent',     // see sec 7
  trusted:   false,
  duration_ms: 12,
  ok:        true,
  error:     null,
}
```

A mesma forma vale para `nac:plugin:read` (depois de um `read`) e para
`nac:plugin:event` (a reemissão de um evento sintetizado). `source`
vale `'agent'` por padrão; hosts que envolvem o runtime numa interface
de usuário PODEM trocá-lo pelo mecanismo que já existe,
`NAC.set_source(...)` (seção 7).

### 15.8 Exemplo trabalhado -- Collabora Writer

```json
{
  "slug": "collabora.writer",
  "verbs": {
    "uno.Bold": {
      "backend": "postmessage",
      "target":  "iframe[data-collabora-frame]",
      "message": "Send_UNO_Command",
      "values":  { "Command": ".uno:Bold" }
    },
    "doc.save": {
      "backend": "postmessage",
      "target":  "iframe[data-collabora-frame]",
      "message": "Action_Save",
      "values_from_args": ["DontTerminateEdit", "Notify"]
    }
  },
  "state": {
    "selection.isBold": [
      { "backend": "dom-mirror",
        "selector": "[data-nac-id='toolbar.bold']",
        "extract":  "classList.contains:selected" },
      { "backend": "script-bridge",
        "bridge":   "collabora.python",
        "script":   "yujin_state.py",
        "function": "GetSelectionState",
        "response_match": "CallPythonScript-Result",
        "extract":  "Values.is_bold" }
    ],
    "doc.modified": [
      { "backend": "same-origin-window",
        "target":  "iframe[data-collabora-frame]",
        "path":    "app.file.modified" }
    ]
  },
  "events": {
    "doc.modified": {
      "backend": "postmessage-listen",
      "source":  "iframe[data-collabora-frame]",
      "message": "Doc_ModifiedStatus",
      "extract": "Values.Modified"
    },
    "selection.changed": {
      "backend":     "synthetic-mutation",
      "observe":     ["selection.isBold", "selection.isItalic"],
      "throttle_ms": 100
    }
  }
}
```

O agente chama `NAC.call('collabora.writer', 'uno.Bold')`; o runtime
roteia pelo backend `postmessage` e posta `Send_UNO_Command` no
iframe. Para confirmar que o efeito ocorreu (veja a seção 17), o agente
chama `await NAC.read('collabora.writer', 'selection.isBold')`; o
runtime tenta primeiro o espelho da barra de ferramentas (rápido, de
graça) e recorre à ponte de scripts Python se o espelho não estiver
disponível. O agente nunca sabe nem se importa com qual fonte
respondeu.

### 15.9 Erros

`NAC.call` / `read` / `subscribe` rejeitam com um `NacError` cujo
`code` é um destes:

- `plugin_not_registered` -- o slug não tem manifesto v2.5.
- `verb_not_declared` -- o caminho do verbo não está no manifesto.
- `state_not_declared` -- o caminho do estado não está no manifesto.
- `event_not_declared` -- o caminho do evento não está no manifesto.
- `backend_unknown` -- o manifesto declara um backend que o runtime não
  implementa. O manifesto DEVE ser recusado no momento do registro;
  este erro só aparece se um runtime aceitar um formato de manifesto
  futuro que depois não consegue despachar.
- `backend_target_missing` -- o alvo do backend (iframe, caminho JS,
  seletor do DOM) não pode ser encontrado.
- `cross_origin_blocked` -- um `same-origin-window` foi tentado contra
  um iframe de origem cruzada.
- `state_unreadable` -- todas as ligações de uma cadeia de estado
  falharam; veja 15.6.
- `timeout` -- um backend não respondeu dentro do seu `timeout_ms`
  declarado (padrão 5000 para verbos, 1000 para leituras de estado).
- `invalid` -- a forma do argumento está errada (slug inválido,
  manifesto malformado no momento do registro, etc).

---

## 16. Navegação em árvore (v2.5 -- PUBLICADO na 2.5.0-alpha.5 / RFC V25-02)

Primitivas de navegação hierárquica de comandos, para fluxos assistivos
e executores de voz que precisam descrever o que podem fazer a partir
do foco atual.

**Superfície de API:**

- `NAC.context(plugin) -> { breadcrumb: [{nac_id, label}, ...] }`
  Sobe de `document.activeElement` pelos elementos ancestrais que
  carregam `data-nac-id`, parando na raiz do plugin. Devolve uma trilha
  vazia se nada estiver com foco dentro do plugin. O `label` de cada
  item vem do `narrate` (seção 17).

- `NAC.tree(plugin, rootId?) -> [{nac_id, label, opens?, leaf?}, ...]`
  Enumera os filhos endereçáveis IMEDIATOS de `rootId` (ou da raiz do
  plugin, se omitido). "Imediato" quer dizer que nenhum outro elemento
  com `data-nac-id` está entre o ponto de partida e o filho. Para cada
  entrada:
  - `label` resolvido pelo `narrate`
  - `opens` espelha o atributo `data-nac-opens` quando presente
  - `leaf` vale `true` quando `data-nac-leaf` está presente

**Atributos para quem escreve:**

- `data-nac-opens="<target-nac-id>"`: declara que este nó abre /
  aprofunda para o elemento identificado pelo id alvo. Permite que
  agentes sigam a cadeia de navegação sem adivinhar nomes.
- `data-nac-leaf`: marcador terminal explícito; agentes posteriores
  sabem que não há mais como aprofundar.

**Erros:** o `tree` devolve `[]` para um rootId desconhecido (vazio
silencioso, não um erro). O `context` sempre devolve
`{ breadcrumb: [] }` para plugins desconhecidos.

---

## 17. Rótulos assistivos (v2.5 -- PUBLICADO na 2.5.0-alpha.5 / RFC V25-03)

Resolução canônica de rótulos legíveis por pessoas. Uma única função
para leitores de tela, fala sintetizada, fluxos de voz, logs de
auditoria e superfícies assistivas móveis.

**Superfície de API:**

- `NAC.narrate(plugin, nac_id) -> string | null`
  Devolve `null` se o plugin ou o nac_id não puderem ser encontrados.
  Caso contrário, o rótulo que segue esta ordem estrita de prioridade:

  1. **`aria-label`** -- acessibilidade primeiro; respeitado a menos
     que seja só espaços.
  2. **o texto visível** -- o `textContent` do elemento, excluindo
     qualquer subárvore aninhada com `data-nac-id` (essas têm a sua
     própria resolução de narrate; são excluídas para que a saída
     falada fique delimitada).
  3. **`data-nac-label`** -- sobreposição explícita de quem escreve;
     útil quando o texto visível contém glifos de ícone ou chaves de
     i18n.
  4. **o `nac_id` como último recurso** -- o pior caso; sinaliza que
     "nenhum rótulo foi escrito".

  Valores que são só espaços, em qualquer nível, caem para o nível
  seguinte.

**Validação:** o `validate_global()` pode emitir avisos no grupo
`plugin_instance_violations` para nac_ids com forma ordinal (`btn-1`,
`btn-2`, ...) aos quais falta qualquer um dos rótulos dos níveis
superiores.

---

## 18. Detecção do efeito (v2.5 -- PUBLICADO na 2.5.0-alpha.5 / RFC V25-04)

Fecha a lacuna do "dano silencioso": um agente confirma o EFEITO de uma
ação, não apenas que o comando foi emitido. As duas primitivas se
compõem com `NAC.read()`, então qualquer backend da V25-01 funciona
(postmessage, sdk-call, dom-mirror, ...).

**Superfície de API:**

- `NAC.expect(plugin, statePath, value, opts?) -> Promise<value>`
  Faz polling de `NAC.read(plugin, statePath)` até o comparador
  devolver algo verdadeiro ou até o prazo vencer. Resolve com o valor
  resolvido; rejeita com `NacError('timeout', ...)` no vencimento.

  Falhas de leitura durante o polling são repetidas até o prazo
  (tratadas como "ainda não observável", não como erro duro).

  Opções:
  - `timeout_ms` (padrão `5000`)
  - `poll_ms` (padrão `100`)
  - `comparator` (padrão `(cur, want) => cur === want`)
    Recebe `(current, expected)` e devolve um booleano.

- `NAC.diff(plugin, statePath, actionFn) -> Promise<{before, after, changed}>`
  Lê o estado, aguarda `actionFn()`, lê o estado de novo. Devolve os
  dois retratos e um booleano `changed` calculado por comparação com
  JSON-stringify (então `undefined` contra um valor também é marcado
  como mudado). Falhas de leitura se colapsam para `undefined`.

**Notas de composição:** o `diff` captura apenas o retrato do INÍCIO e
o do FIM; ele NÃO observa os estados intermediários dentro da ação. Use
o `expect` se a sua preocupação é "o estado passa por algum valor
específico em algum momento".

---

*Este documento é a especificação canônica do NAC3 v2.5. As seções 0-14
estão sem mudanças em relação à v2.4 estável. As seções 15-18 são
publicadas na v2.5. Edições neste arquivo constituem mudanças da
especificação e exigem um RFC; veja `CONTRIBUTING.md`.*
