---
translation_source: guides/RPA_BLUE_PRISM.md
translation_source_hash: 7ab698b35a99ca25e77a07599f1aa733b4ba42eb08d0f3bce785a9b0c7f7e276
translation_quality: machine_v1
translation_lang: pt
translation_date: 2026-05-11T13:38:03.236431+00:00
---

# Guia de integração NAC3 + Blue Prism

**Versão do NAC3:** 2.2 (com preview de interoperabilidade v2.3)
**Testado com:** Blue Prism 7.1 + Browser Automation v7.1.

O objeto de negócio `Browser` do Blue Prism expõe `Inject JavaScript`
nativamente. NAC3 + Blue Prism segue um padrão de 5 etapas.

## Fluxo de etapas

1. **Login Agent** -- padrão.
2. **Navigate** -- abrir o aplicativo compatível com NAC.
3. **JS: wait for window.NAC3** -- aguardar até estar pronto.
4. **JS: NAC.click / fill / tab** -- despacho canônico.
5. **JS: read describe()** -- introspectar o manifesto para a próxima
   iteração do fluxo de dados.

## Exemplo de VBO (Visual Business Object)

```
Object: NAC Driver
Action: Click NAC ID
  Inputs:
    - nacId (Text)
  Code (Inject JavaScript):
    (async () => {
      try {
        await window.NAC.click([nacId]);
        return JSON.stringify({ok:true});
      } catch (e) {
        return JSON.stringify({ok:false, code:e.code, message:e.message});
      }
    })()
  Outputs:
    - resultJson (Text)
```

Ações espelhadas: `Click By Verb`, `Fill`, `Select`, `Tab`,
`Describe`, `WaitForAck`.

## Padrão de espera por confirmação (ack)

`NAC.click()` já aguarda internamente pelo evento `nac:action:succeeded`
(timeout de 5s). O Blue Prism pode adicionar uma espera explícita adicional:

```js
return new Promise(resolve => {
  let acked = false;
  document.addEventListener('nac:action:succeeded', function (e) {
    if (e.detail.action_id === '[expectedId]') {
      acked = true;
      resolve('ok');
    }
  }, { once: true });
  setTimeout(() => { if (!acked) resolve('timeout'); }, [timeoutMs]);
});
```

Esse padrão expõe a família canônica de eventos do NAC3 nas saídas de
etapa do Blue Prism, o que é útil para ramificar o fluxo do processo.

## Descoberta

Ação `Read Manifest`:

```js
return JSON.stringify(window.NAC.describe());
```

Direcione o resultado para uma Collection. O processo pode se adaptar a
mudanças no esquema do manifesto sem recompilar as etapas.

## Licença + veja também

Apache-2.0. Consulte [RPA_UIPATH.md](RPA_UIPATH.md) para uma
abordagem mais abrangente.

---

*This is a machine translation of the canonical English
version at `/nac-spec/guides/RPA_BLUE_PRISM.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
