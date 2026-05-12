---
translation_source: README_DEMOS.md
translation_source_hash: 0f488dd749283f4f2e03f0e431de47d7007818c6745ce1ce993014bdf9839480
translation_quality: machine_v1
translation_lang: pt
translation_date: 2026-05-11T12:50:06.757873+00:00
---

# Demonstrações ao vivo do NAC3 em yujin.app/nac-spec/

**Versão da spec:** 2.2 stable (+ prévia de interoperabilidade v2.3).

**NAC3** = **Native Agent Contract**. A spec que permite que interfaces web sejam
controladas por assistentes de IA, runners de voz e ferramentas de acessibilidade
sem código de integração específico por aplicação.

Três demonstrações disponíveis lado a lado. Cada uma tem um propósito distinto; não as confunda.

| Arquivo | Versão | Propósito |
|---|---|---|
| `example.php` | v1.9 stable | A demonstração canônica do NAC3 v1.9. 27 widgets (chat, calendário, autopilot, modais, abas, gráficos, etc.). Exibe toda a superfície de funcionalidades da v1.9 em uma UI com formato de produção. **Sem alterações.** |
| `example-v20-primitives-showcase.php` | v2.0-rc4 | **Showcase didático** dos 8 primitivos da v2.0 + HMAC + isTrusted + contrato i18n. 8 seções, uma por primitivo. Útil para revisores e adotantes que desejam entender cada novo primitivo de forma isolada. **NÃO é uma migração do example.php.** |
| `example-v20-full.php` | v2.0-rc4 | **Migração brownfield** do `example.php` para NAC3 v2.0 strict. Os mesmos 27 widgets, mesmo HTML, mesmos handlers -- com a camada v2.0 aplicada por cima via ~80 linhas de código de configuração. Demonstra que a adoção no mundo real NÃO exige reescrever cada widget. |

## Comparação lado a lado

Abra `example.php` e `example-v20-full.php` em duas abas.

### O que é idêntico

- Marcação HTML (cada `<article data-nac-plugin="X">`, cada
  `data-nac-id`, cada referência ao catálogo i18n, cada handler)
- Aparência visual (mesmo layout, mesmos widgets, mesmas interações)
- Runtime de referência v1.9 (`js/nac.js`) carregado da mesma forma
- Referências ao catálogo `data-i18n-key` existentes

### O que é diferente na versão v2.0-full

1. **Docstring do cabeçalho** explica explicitamente que se trata de um
   showcase de migração brownfield.
2. **Uma tag de script adicional**: `js/nac-v2-extensions.js` carregado
   após `nac.js` e antes de `example.js`.
3. **Um bloco de configuração adicional** (~80 linhas no final da
   página) que:
   - Constrói uma árvore de escopos hierárquica a partir dos atributos
     `data-nac-plugin` existentes (cada plugin se torna um escopo
     sob `demo.shell`).
   - Chama `NAC.set_provenance_secret()` para habilitar a assinatura HMAC.
   - Chama `NAC.setTenantPrefix('demo')` para demonstrar multi-tenant.
   - Inicia o ring buffer `NAC.captureEphemeral()` para toasts.
   - Chama `NAC.autoRegister.watch()` no contêiner de cards.
4. **Um painel de UI adicional** (`#v20-panel`, fixo no canto inferior direito)
   expondo `describe_v2()`, `validate_global_v2()`, demonstração de assinatura
   HMAC e botão de distinção isTrusted ao vivo.

Esse é o delta completo. Adotantes reais podem reutilizar esse padrão literalmente.

## Como avaliar

Se você é um revisor do NAC3 v2.0:

1. Abra `example.php` primeiro. Confirme que a demonstração v1.9 funciona como antes.
2. Abra `example-v20-full.php`. Confirme que funciona DE FORMA IDÊNTICA para
   as funcionalidades v1.9 (chat, calendário, autopilot, etc.).
3. Abra o painel v2.0 (canto inferior direito). Clique em cada botão:
   - `describe_v2()` -- veja a árvore de escopos construída a partir dos
     atributos de plugin brownfield.
   - `validate_global_v2()` -- veja os resultados (provavelmente apenas avisos
     se o catálogo i18n tiver lacunas).
   - `sign as agent` -- veja a assinatura HMAC produzida.
   - `click=trusted` / `.click()=fake` -- veja a distinção isTrusted em ação.

Se você é um adotante:

Use o bloco de configuração do `example-v20-full.php` como seu template. Adapte
a árvore de escopos à estrutura de plugins da sua aplicação. A maior parte do trabalho
está em identificar sua hierarquia de escopos; o restante é mecânico.

## Links relacionados

- Spec do NAC3: https://github.com/pkuschnirof/nac-spec
- Release v1.9: tag `v1.9.0`
- Release candidate v2.0: `2.0.0-rc4` em `main`
- Histórico de revisão Round 3: `docs/PEER_REVIEW.md`

---

*This is a machine translation of the canonical English
version at `/nac-spec/README_DEMOS.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
