---
translation_source: guides/RPA_AUTOMATION_ANYWHERE.md
translation_source_hash: 165e60e4b3922f8353a3f038d815452ebf9ba7d597cb68f8c313eb47cb416eab
translation_quality: machine_v1
translation_lang: pt
translation_date: 2026-05-11T13:37:53.304995+00:00
---

# Guia de integração NAC3 + Automation Anywhere

**Versão do NAC3:** 2.2 (com prévia de interoperabilidade v2.3)
**Testado com:** Automation Anywhere A2019 + A360.

## Dois caminhos — escolha conforme sua edição do AA

### Caminho A — A360 + Web Recorder + Run JavaScript

A ação `Run JavaScript Function` do AA injeta código na aba ativa do navegador.

```js
// payload variable: NAC_ID = "invoice.save"
async function nacClick(id) {
  await window.NAC.click(id);
  return 'ok';
}
return nacClick($NAC_ID$);
```

Vincule as variáveis de entrada (`$NAC_ID$`, `$VALUE$`) em tempo de design;
a ação retorna uma string que o bot usa para ramificação.

### Caminho B — A2019 + Object Cloning com atributo personalizado

O `Object Cloning` do A2019 tradicionalmente localiza elementos via propriedades do DOM.
Configure o seletor de propriedade:

```
HTML.Attribute: data-nac-id
Search value: invoice.save
```

Menos robusto que o Caminho A (depende do tempo de carregamento da árvore DOM), mas permite
que bots A2019 mais antigos adotem o NAC3 sem reescrever os fluxos.

## Template canônico de bot com 8 ações

Para a demo de fatura v21:

| Passo | Ação | Payload |
|-------|------|---------|
| 1 | Open Browser | https://your-app.example.com/ |
| 2 | Wait | aguardar `window.NAC` pronto (poll JS) |
| 3 | Loop CSV | linhas |
| 4 | Run JS | `await window.NAC.click_by_verb('invoice','new')` |
| 5 | Run JS | `await window.NAC.fill('invoice.client',$row.client$)` |
| 6 | Run JS | `await window.NAC.fill('invoice.amount',$row.amount$)` |
| 7 | Run JS | `await window.NAC.click_by_verb('invoice','save')` |
| 8 | End Loop | -- |

8 ações independentemente da complexidade da interface. Compare com os típicos
30 a 60 ações em fluxos baseados em seletores CSS.

## Descoberta via `NAC.describe()`

```js
return JSON.stringify(window.NAC.describe());
```

Retorna a árvore do manifesto. O AA pode analisá-la com `JSON Parse` e
construir fluxogramas dinâmicos.

## Proveniência + isTrusted

O AA despacha cliques sintéticos. A aplicação host pode recusar verbos sensíveis
(delete, payment) a menos que estejam explicitamente na lista de permissões. Consulte
a seção "Provenance" em `RPA_UIPATH.md` para o padrão de opt-in no lado do host.
O mesmo se aplica ao AA.

## Tratamento de erros

Envolva cada chamada JS em `try/catch` retornando JSON:

```js
try {
  await window.NAC.fill('@id@', '@value@');
  return JSON.stringify({ok: true});
} catch (e) {
  return JSON.stringify({ok: false, code: e.code, message: e.message});
}
```

A ação `If` ramifica com base no JSON analisado.

## Licença + veja também

Apache-2.0. Consulte [RPA_UIPATH.md](RPA_UIPATH.md) para um tratamento mais aprofundado;
os padrões se transferem 1:1.

---

*This is a machine translation of the canonical English
version at `/nac-spec/guides/RPA_AUTOMATION_ANYWHERE.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
