---
translation_source: docs/CASE_STUDIES_DISCOVERY.md
translation_source_hash: 59b940d486104c6a9b42d59c1ee6f16c25eb01c0c08b8b98458c68ef4312ed77
translation_quality: machine_v1
translation_lang: pt
translation_date: 2026-05-11T13:42:12.848738+00:00
---

# Estudos de caso -- bugs descobertos de forma autônoma

Bugs encontrados pela varredura diagnóstica com Playwright contra
`yujin.app/nac-spec/demos/react/` e `/demos/angular/`. Pablo
me pediu em 2026-05-11 para descobrir + documentar + corrigir sem
que ele nomeasse os sintomas. Este arquivo registra o processo de
descoberta + as correções.

---

## Bug #1 (ALTO) -- O intermediário LLM não enxerga o manifest do app

**Demos afetados:** React + Angular.

**Sintoma (observável):** Quando o usuário digita "hola" no painel
de chat do demo React ou Angular, o chat responde com um genérico
"How can I help you with this page?" -- sem saber que se trata de
um app de todos. Quando o usuário diz "agrega tomar agua", o LLM
não consegue despachar `click_by_verb('todos', 'add_todo')` porque
não sabe que esse plugin existe.

**Método de descoberta.** A spec diagnóstica captura todas as
mensagens de `page.console` durante a interação com o chat. O
cliente de chat registra:

```
[nac-chat] snapshot plugins (1): chat
[nac-chat] backend response: message="Hi! How can I help you with this page?" actions=[]
```

`snapshot plugins (1): chat` é a prova cabal -- apenas UM plugin
aparece no snapshot enviado ao LLM, o plugin `chat`. O plugin
`todos` -- que o demo registra via `NAC.register(TODOS_MANIFEST)`
-- está ausente.

**Causa raiz.** `NAC.describe()` enumera plugins percorrendo o
DOM em busca de elementos `[data-nac-plugin="..."]` (linha ~1557
de `yujin.app/nac-spec/js/nac.js`). O painel de chat
`<aside class="chat" data-nac-plugin="chat">` possui o atributo;
a região de todos do app NÃO possui. O runtime nunca enxerga a
região de todos como um escopo de plugin, portanto `describe()`
também não enxerga, `snapshotTree()` também não, e o LLM também
não.

O registro do manifest via `NAC.register(...)` popula o mapa
interno `_manifests`, mas NÃO anexa automaticamente um atributo
`data-nac-plugin` ao DOM. Isso é responsabilidade de quem chama.

**Correção.** Adicionar `data-nac-plugin="todos"` ao container
principal do app em ambos os demos:

- React: `<div className="app">` -> `<div className="app" data-nac-plugin="todos">`
- Angular: `<div class="app">` no template -> `<div class="app" data-nac-plugin="todos">`

Após a correção, `NAC.describe()` retorna 2 plugins (`todos` +
`chat`), o snapshot carrega ambos os manifests, e o LLM consegue
despachar ações baseadas em verbos contra `todos.*`.

**Lição para o manual.** O contrato NAC3 exige AMBOS:
1. `NAC.register(manifest)` para declarar o schema.
2. `data-nac-plugin="<slug>"` em um nó raiz do DOM para inscrever
   o plugin na árvore de escopo.

Os guias de adoção e o NAC_TEST_MANUAL devem deixar isso explícito.
Um erro comum de quem adota é registrar o manifest e esquecer o
atributo DOM, produzindo exatamente o sintoma de "LLM cego" descrito
acima. Adicionar a `stage2-disambiguation.mjs` um teste de regressão:
o snapshot deve incluir TODOS os plugins registrados; caso contrário,
sinalizar uma descoberta.

---

## Bug #2 (MÉDIO) -- Handlers `onChatAction` no React fecham sobre estado obsoleto

**Demo afetado:** Somente React. Signals + `update()` do Angular
fazem com que essa categoria não se aplique.

**Sintoma (observável):** Após o deploy da correção #1, o despacho
de verbos via chat ainda não adiciona todos. Enviar "agrega leche"
não resulta em nenhum novo todo. O LLM emite corretamente a sequência
de duas ações (`fill todos.input "leche"` + `click_by_verb todos
add_todo`), mas o handler de `add_todo` vê `input.trim() === ''`
e retorna silenciosamente sem chamar `addTodo()`.

**Método de descoberta.** A varredura Playwright de descoberta
profunda (rodada 2) captura a contagem de linhas antes/depois
durante uma adição via chat. Descobertas:

```
[WARN] chat.dispatch: [react] chat "agrega leche" did not add a
todo (before=3, after=3). May be LLM hallucination or dispatch
broken.
```

**Causa raiz.** O `useEffect` de `App.tsx` para registro do
handler de chat tem deps `[input, todos]`. Os handlers fecham
sobre os valores de estado do React NO MOMENTO DO REGISTRO.
Quando o LLM envia `actions[]` de forma síncrona, o cliente de
chat despacha:
1. `fill todos.input "leche"` -> `setInput('leche')` enfileira
   uma re-renderização.
2. `click_by_verb todos add_todo` -> executa IMEDIATAMENTE, na
   mesma task JS. O React ainda não re-renderizou. O closure do
   handler ainda tem `input === ''`. A guarda `input.trim()` falha;
   `addTodo()` nunca é executado.

Este é o clássico problema de closure vs. estado obsoleto no React.

**Correção.** Usar um `useRef` que espelha `input`; o handler lê
do ref (sempre o valor atual) em vez de do closure. Mesmo padrão
para `todos`, caso verbos futuros precisem.

```ts
const inputRef = useRef(input);
useEffect(() => { inputRef.current = input; }, [input]);

useEffect(() => {
  if (!window.NacChat) return;
  window.NacChat.onAction('click_by_verb', (a) => {
    if (a.plugin === 'todos' && a.verb === 'add_todo') {
      const text = (a as any).args?.text || inputRef.current.trim();
      if (text) {
        addTodoFromText(text);
        return { ok: true };
      }
    }
    ...
  });
}, []); // registrar uma única vez
```

Bônus: aceitar também que o LLM passe o texto diretamente em
`args.text`, para que até apps que não fazem fill-then-click
funcionem.

**Lição para o manual.** Ao conectar verbos via chat NAC3 no React,
NUNCA feche handlers diretamente sobre estado. Use refs ou o padrão
de setter funcional. Adicionar ao guia de adoção React
(`guides/REACT.md`) e ao manual de testes uma seção de "armadilhas
comuns".

---

## Bug #3 (A DEFINIR)

Aguardando rodada diagnóstica 3.

---

## Log de iterações

| Rodada | Quando | Erros React | Erros Angular | Bugs registrados |
|--------|--------|-------------|---------------|------------------|
| 1 | 2026-05-11 02:10 | 0 na varredura superficial | 0 na varredura superficial | #1 (cobertura de manifest) encontrado via análise de console |

As verificações estruturais da spec diagnóstica (NAC montado,
`validate_global` limpo, manifests no registry, CRUD de todos
funcionando, toggle do chat funcionando) passam todas no verde.
Os bugs surgem em semânticas mais profundas, como "o LLM está
realmente enxergando o que registramos?". Rodadas diagnósticas
futuras adicionam: formato das ações pós-resposta-LLM, verificação
de que o dispatch dispara, verificação da propagação de mutação
`dt_state` pelo estado do framework, verificação de que o autopilot
conclui todos os passos, verificação de troca de locale via chat.

---

*This is a machine translation of the canonical English
version at `/nac-spec/docs/CASE_STUDIES_DISCOVERY.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
