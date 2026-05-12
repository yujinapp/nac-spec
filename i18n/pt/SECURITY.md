---
translation_source: SECURITY.md
translation_source_hash: 4d9f26e0cc810ed4f1c6cf921c7ae8f5c004d8ba42445a69a2de58106db2b64f
translation_quality: machine_v1
translation_lang: pt
translation_date: 2026-05-11T12:49:52.311729+00:00
---

# NAC3 -- modelo de segurança

**Versão da spec:** 2.2 stable (+ preview de interoperabilidade v2.3).

## Modelo de ameaças

O NAC3 fica entre os agentes e sua UI. É uma camada de contrato, não
uma camada de autenticação. Existem diversas fronteiras de confiança
distintas; este documento as nomeia para que você possa pensar com
clareza sobre quais o NAC3 protege e quais ele não protege.

### Fronteira A: Usuário -> UI

Fora do escopo do NAC. Use sua autenticação existente (sessões, OAuth,
SSO, MFA). Uma vez que o usuário esteja autenticado, o NAC3 assume que
qualquer ação que o usuário possa realizar na UI é permitida.

### Fronteira B: Agente controlado pelo usuário -> UI

Um usuário concede a um agente permissão para controlar sua sessão no
navegador. Exemplos: um assistente de voz, um leitor de tela, um cliente
de chat LLM embutido na mesma página. O papel do NAC3 aqui:

1. Fornecer ao agente nomes de elementos estáveis para que ele possa
   agir sem precisar capturar coordenadas.
2. Expor `event.isTrusted` para que o host possa recusar cliques
   sintéticos em verbos sensíveis à segurança (pagamento, exclusão,
   concessão de papéis). O agente não pode forjar `isTrusted=true`;
   apenas um gesto real do usuário define esse valor.
3. Fornecer confirmações no nível de evento para que o agente saiba o
   que foi concluído sem precisar reler o DOM.

O NAC3 NÃO protege contra o uso indevido de confiança por um agente que
o usuário explicitamente autorizou. Isso é um problema de experiência do
usuário (prompts de consentimento antes de verbos sensíveis) tratado pela
sua aplicação, não pelo NAC.

### Fronteira C: Serviço externo -> UI (intermediário LLM)

Se o prompt de voz de um usuário é enviado a um LLM remoto que retorna
ações NAC3, o LLM se torna um principal de confiança. O papel do NAC3
aqui:

1. O LLM só vê o que `NAC.describe()` expõe (o snapshot da árvore +
   os manifestos registrados). Ele não vê os tokens de autenticação do
   usuário, cookies ou internos do DOM além do que o manifesto declara.
2. O LLM não pode causar diretamente um clique. Ele retorna uma ação
   estruturada; o cliente de chat a valida (o nac_id existe? o verbo é
   permitido?) antes de despachá-la.
3. O cliente de chat DEVE rejeitar ações cujo `nac_id` não estava no
   snapshot enviado (previne injeção de prompt que tenta introduzir ids
   arbitrários).

O NAC3 NÃO prescreve o template de prompt do LLM, limites de taxa ou
filtragem. Consulte `guides/LLM_WIRING.md` para recomendações.

### Fronteira D: Tenant -> Tenant (implantações multi-tenant)

SaaS multi-tenant onde os tenants compartilham um runtime mas não os
dados. O NAC3 protege isso com manifestos assinados via HMAC:

1. Cada tenant envia seu manifesto com uma assinatura HMAC calculada
   sobre uma serialização estável, usando um segredo por tenant
   armazenado no servidor.
2. O runtime, ao executar `NAC.register()`, recalcula o HMAC usando o
   segredo esperado para o tenant ativo. Se a assinatura não corresponder,
   o manifesto é rejeitado.
3. Um tenant malicioso não pode forjar o manifesto de outro tenant sem
   o segredo de assinatura.

O NAC3 NÃO impede que um tenant registre um manifesto excessivamente
grande ou malformado além de um limite básico de tamanho; limite a taxa
de registro de manifestos no servidor se você aceitar manifestos não
confiáveis.

### Fronteira E: Script malicioso -> Página

Uma página que inclui JS controlado por um atacante (XSS, comprometimento
da cadeia de suprimentos) já está comprometida. O NAC3 não pode ajudar
aqui; o atacante pode chamar `NAC.click(...)` diretamente. Mitigue via
CSP, SRI e sua pilha usual de segurança web.

## Sinais de proveniência

### `is_trusted` em eventos de sucesso

O detalhe de cada evento de sucesso de ação carrega `is_trusted: boolean`.
Um host pode exigir isso para verbos sensíveis:

```js
document.addEventListener('nac:action:succeeded', function (e) {
  var d = e.detail;
  if (d.action_id === 'invoice.delete' && !d.is_trusted) {
    console.warn('[security] refused synthetic delete click');
    e.preventDefault();
  }
});
```

A demo de referência `example-v20-full.php` inclui um par de botões
(`v20_panel.istrusted_real` e `v20_panel.istrusted_fake`) que demonstra
a distinção na saída do painel.

### Assinatura de manifesto com HMAC

No servidor, gere a assinatura:

```python
import hmac, hashlib, json
manifest_body = json.dumps(manifest, sort_keys=True, separators=(',', ':'))
sig = hmac.new(
    tenant_secret.encode('utf-8'),
    manifest_body.encode('utf-8'),
    hashlib.sha256
).hexdigest()
manifest['provenance'] = {
    'signed_at': now_iso8601(),
    'signed_by': tenant_slug,
    'signature': sig
}
```

No cliente:

```js
NAC.set_provenance_secret(SECRET_FROM_AUTHED_RESPONSE);
NAC.register(manifest);
// runtime recomputes hmac, rejects if mismatch
```

O segredo DEVE vir de uma resposta autenticada do servidor; nunca o
incorpore no código-fonte JS. Faça rotação por sessão se o modelo de
ameaças exigir.

## Reportando uma vulnerabilidade

Envie um e-mail para `nac@yujin.dev` com:

1. Descrição da vulnerabilidade.
2. Passos de reprodução ou prova de conceito.
3. Versão(ões) do NAC3 afetada(s).
4. Mitigação sugerida, se você tiver uma.

NÃO abra uma issue pública no GitHub. Nos comprometemos a:

- Confirmar o recebimento em até 3 dias úteis.
- Fornecer uma avaliação de triagem em até 10 dias úteis.
- Coordenar o momento da divulgação com o reportante.

Problemas críticos que afetam a spec pública são publicados com uma
versão de correção em até 30 dias; severidade menor em até 90.

## O que o NAC3 explicitamente NÃO faz

- Autenticar usuários.
- Criptografar dados em trânsito (use TLS).
- Impedir o usuário de fazer o que ele tem permissão para fazer.
- Isolar agentes uns dos outros (todos rodam na mesma página; se você
  quiser isolamento, use páginas separadas).
- Assinar ações individuais (apenas manifestos). A assinatura por ação
  está sendo acompanhada como candidata para a v3.0.

---

*This is a machine translation of the canonical English
version at `/nac-spec/SECURITY.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
