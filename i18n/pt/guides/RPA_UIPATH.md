---
translation_source: guides/RPA_UIPATH.md
translation_source_hash: 2dd66d68221f687237ac663fa2a360077a51b7cdf8ad74c16488a5934ee7927d
translation_quality: machine_v1
translation_lang: pt
translation_date: 2026-05-11T13:37:40.201127+00:00
---

# Guia de integração NAC3 + UiPath

**Versão do NAC3:** 2.2 (com prévia de interoperabilidade v2.3)
**Status:** Estável. Testado com UiPath Studio 23.10 + Web
Automation v23.10.

A automação web do UiPath hoje extrai dados do DOM via seletores CSS,
segmentação visual ou coordenadas fixas. Com o NAC3, cada widget
clicável da sua aplicação expõe um `data-nac-id` estável; o UiPath
endereça os elementos por esse id e sobrevive a redesigns de interface
sem esforço.

## Por que NAC3 + UiPath

| Problema atual | Solução NAC3 |
|----------------|-------------|
| Seletores quebram quando o CSS muda | `data-nac-id` é estável entre redesigns visuais |
| Segmentação por âncora/coordenada falha quando um botão muda de lugar | Idem |
| Fragilidade entre tenants (IDs diferentes por cliente) | O manifesto declara o verbo; o bot chama pelo verbo |
| Aguardar "o elemento estar pronto" é frágil | O evento `nac:action:succeeded` é determinístico |
| UIs multilíngues exigem automação por localidade | `label_i18n` é agnóstico de localidade; o bot usa ids, não rótulos |

## Dois caminhos de integração

### Caminho A -- Atividade de navegador + injeção de JS (recomendado)

A atividade `Inject JavaScript` do UiPath executa `window.NAC.click(...)`
diretamente. Sem seletores, sem fragilidade.

```vb
' Pseudocódigo de sequência UiPath
Open Browser https://your-app.example.com/
Inject JS: window.NAC.click('invoice.save')
Wait for Event: nac:action:succeeded
```

Implementação:

1. **Atividade de navegador** -- fluxo padrão do UiPath.
2. **Atividade Inject JavaScript** -- payload:
   ```js
   return await (async () => {
     const result = await window.NAC.click('@id@');
     return JSON.stringify(result);
   })();
   ```
3. **Atribua** a string retornada a uma variável. Analise para verificar
   `{ok: true}`.

Para despacho baseado em verbo:

```js
await window.NAC.click_by_verb('@plugin@', '@verb@')
```

Para preenchimento:

```js
await window.NAC.fill('@id@', '@value@')
```

### Caminho B -- Baseado em seletor com xpath compatível com NAC

Se o seu perfil UiPath preferir seletores, use o atributo `data-nac-id`
diretamente:

```xml
<webctrl tag='button' attr='data-nac-id' value='invoice.save' />
```

Mesma lógica, mas consome o DOM do navegador via explorador de árvore
do UiPath. Ligeiramente menos robusto (depende do tempo de carregamento
da árvore), mas mantém o idioma do UiPath.

## Exemplo de workflow UiPath

`Examples_NAC_Invoice.xaml` (disponível para download no marketplace
Yujin após publicação):

1. **Open Browser** -- direcione a aba para sua aplicação compatível com NAC-3.
2. **Aguardar window.NAC3** -- injete:
   ```js
   return new Promise(r => {
     const t = setInterval(() => {
       if (window.NAC) { clearInterval(t); r('ready'); }
     }, 100);
   });
   ```
3. **For Each Row** -- itere sobre a tabela de dados de origem.
4. **Inject JS** -- por linha:
   ```js
   await window.NAC.click_by_verb('invoice', 'new');
   await window.NAC.fill('invoice.client_name', @row("client")@);
   await window.NAC.fill('invoice.amount', @row("amount")@);
   await window.NAC.click_by_verb('invoice', 'save');
   ```
5. **Aguardar** -- nac:action:succeeded com action_id='invoice.save'.
6. **Continuar** o loop.

O fluxo completo tem apenas 5 atividades, independentemente da
complexidade da aplicação subjacente. Compare com as típicas 30 a 50
atividades de um equivalente baseado em seletores CSS.

## Descoberta: leia o manifesto

O UiPath pode introspectar o manifesto antes de automatizar:

```js
return window.NAC.describe();
```

Retorna a árvore completa de plugins. Use-o para construir fluxogramas
dinâmicos que se adaptam a mudanças no manifesto sem reimplantar
o .xaml.

## Proveniência (NAC-3)

O UiPath despacha cliques sintéticos, portanto `event.isTrusted === false`
no evento de confirmação do NAC3. Aplicações que restringem verbos
sensíveis com base em `is_trusted` (exclusão, pagamento, administração)
**recusarão** o despacho do UiPath por padrão.

Para habilitar RPA nesses verbos, a aplicação host deve explicitamente
incluir na lista de permissões:

```js
// No bootstrap NAC da aplicação host:
window.__NAC_ALLOW_UNTRUSTED__ = ['invoice.save', 'invoice.send'];
```

Discuta o modelo de ameaças com o responsável pela aplicação -- contornar
o isTrusted anula a garantia anti-spoofing da especificação. O UiPath
opera em um ambiente controlado, então a troca geralmente é aceitável,
mas documente-a.

## Tratamento de erros

O NAC3 lança erros estruturados nos quais o UiPath pode ramificar:

```js
try {
  await window.NAC.click('invoice.save');
} catch (e) {
  return JSON.stringify({ ok: false, code: e.code, message: e.message });
}
```

| `e.code` | Significado | Ramificação UiPath |
|----------|-------------|-------------------|
| `not_found` | id não existe no DOM atual | Redescubra via `NAC.describe()` |
| `invalid` | formato do argumento incorreto | Bug na lógica do bot, escale |
| `timeout` | efeito colateral não confirmado em 5s | Tente novamente até N vezes |

## Matriz de testes

Exercitamos a integração com a
[demo de tabela de dados v21](https://yujin.app/nac-spec/example-v21-data-table.php)
via UiPath 23.10 em CI. O workflow de referência está em
`tools/rpa/uipath/InvoiceFromCSV.xaml` neste repositório (em breve).

## Veja também

- [SPEC.md seção 5](../SPEC.md#5-public-api) -- superfície completa do NAC.*.
- [SECURITY.md](../SECURITY.md) -- modelo de ameaças do isTrusted.
- [LLM_WIRING.md](LLM_WIRING.md) -- se o seu fluxo RPA também precisar
  de entrada por voz/chat, conecte o intermediário LLM na frente.
- [NAC_TEST_MANUAL.md](../docs/NAC_TEST_MANUAL.md) -- como a Yujin
  testa este contrato de ponta a ponta.

## Licença

Apache-2.0.

---

*This is a machine translation of the canonical English
version at `/nac-spec/guides/RPA_UIPATH.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
