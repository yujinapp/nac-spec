---
translation_source: docs/TEST_COVERAGE_MATRIX.md
translation_source_hash: 378d7bf89e65b07e54f5d5dc1c62938accfe383e903468a4df028a3e2936f48d
translation_quality: machine_v1
translation_lang: pt
translation_date: 2026-05-11T13:40:13.688411+00:00
---

# NAC3 -- Matriz de Cobertura de Testes (automático + manual)

**Versão da spec:** 2.2 + prévia v2.3.
**Gerado em:** 2026-05-11.
**Referência para:** o repositório de referência Yujin
`yujinapp/nac-spec` na branch `main`.

Esta matriz lista TODOS os artefatos do ecossistema NAC3 e
reporta sua cobertura por testes automatizados + o gate de
verificação manual (o checklist "human OK").

Adotantes: copie esta estrutura de matriz para o seu próprio app. Substitua
as colunas pelos seus artefatos; mantenha a mesma profundidade por linha.

---

## Legenda

| Símbolo | Significado |
|---------|-------------|
| AUTO | Coberto por testes automatizados (Playwright / suite Node) |
| MAN  | Requer verificação humana (visual no browser, gesto de voz, UX subjetiva) |
| BOTH | Coberto por auto para invariantes + verificado por humano para UX |
| --   | Sem cobertura planejada (intencional) |
| TBD  | Cobertura planejada mas não implementada |

---

## 1. Artefatos de runtime

| Artefato | Cobertura AUTO | Gate manual | Notas |
|----------|----------------|-------------|-------|
| `js/nac.js` (base v1.9 + v2.0 + v2.1) | AUTO 95% | MAN (smoke cross-browser) | smoke + v22 + stage4 cobrem a write API; manual = abrir no Firefox + Safari pelo menos uma vez por release |
| `js/nac-v2-extensions.js` | AUTO 90% | MAN (autoRegister.watch em um DOM novo) | stage4 dt_* + v22 parcial; manual = montar um novo plugin em runtime via autoRegister |
| `js/nac-chat-client.js` | AUTO 95% | MAN (STT com microfone real) | stage1-audio faz mock do SpeechRecognition; manual = pressionar o mic na demo ao vivo + falar um prompt por locale |
| `js/nac-mcp-interop.js` (prévia v2.3) | AUTO 100% | MAN (roundtrip cross-origin com peer real) | v23-interop cobre o cenário de página local; manual = testar contra um peer NAC3 remoto real via HTTPS |

## 2. Pacote NPM

| Artefato | Cobertura AUTO | Gate manual | Notas |
|----------|----------------|-------------|-------|
| Build do `@nac3/runtime` (dist/ ESM + CJS + d.ts + CLI) | AUTO 100% | MAN (`npm install` em um diretório novo) | smoke.mjs com 36 verificações; manual = npm pack + install + import em um projeto Node vazio para verificar |
| Subpath `@nac3/runtime/extensions` | AUTO 100% | -- | smoke confirma presença dos arquivos + d.ts |
| Subpath `@nac3/runtime/chat-client` | AUTO 100% | -- | smoke confirma presença dos arquivos + d.ts |
| CLI `npx @nac3/runtime validate` | AUTO 100% | MAN (executar contra um projeto construído externamente pelo time) | smoke executa o CLI contra o diretório de demos; manual = executar contra o repositório do cliente antes do deploy |

## 3. Demos (ao vivo em yujin.app/nac-spec/)

| Demo | Cobertura AUTO | Gate manual | Notas |
|------|----------------|-------------|-------|
| `index.html` (landing) | BOTH | MAN (tour autopilot + envio de chat) | Playwright 01-landing.spec.ts verifica a superfície; manual = executar o autopilot em um browser real, narração audível |
| `example.php` (referência v1.9) | AUTO | MAN (click-through nos 27 widgets) | Playwright 02-demo-v19 verifica a inicialização; manual = percorrer todos os 27 widgets sem erros no console |
| `example-v20-full.php` (brownfield) | AUTO | MAN (botões describe_v2 / validate_global_v2 do painel v20) | Playwright 03-demo-v20 cobre painel + ack do bindAction; manual = clicar em cada botão do painel + inspecionar saída |
| `example-v20-primitives-showcase.php` | -- | MAN (percurso didático por primitivo) | Demo puramente educacional; manual = o tour dos 8 primitivos |
| `example-v21-data-table.php` | AUTO | MAN (chat de voz com mic) | Playwright 04-demo-v21 cobre dt_state + tab.permissions; manual = usar o mic de voz, observar o LLM despachar corretamente |
| `example-v22-interop.php` (prévia v2.3) | AUTO | MAN (usar os 4 CTAs em ordem) | Playwright 05-demo-v22-interop end-to-end; manual = o fluxo dos 4 botões com atenção visual na tela |
| `demos/react/` (estudo de caso compilado) | AUTO | MAN (add/delete via chat) | Playwright 06-demo-react cobre mount + add; manual = enviar chat "agrega leche" via mic real, observar atualização do estado React |
| `demos/angular/` (estudo de caso compilado) | AUTO | MAN (add/delete via chat) | Playwright 07-demo-angular cobre mount + add; manual = igual ao React |

## 4. Documentação

| Doc | Cobertura AUTO | Gate manual | Notas |
|-----|----------------|-------------|-------|
| `SPEC.md` (canônico v2.2) | -- | MAN (revisão de PR por um mantenedor) | A spec é prosa; nenhum auto-teste é possível. Humano revisa cada palavra |
| `ABOUT.md` | -- | MAN (revisão de PR) | Igual |
| `CONTRIBUTING.md` | -- | MAN (revisão de PR) | Igual |
| `SECURITY.md` | -- | MAN (revisão de PR) | Igual. Mais releitura trimestral do modelo de ameaças |
| `README_DEMOS.md` | -- | MAN | Verificação manual de links |
| `docs/NAC_V22_ROADMAP.md` | -- | MAN | Atualizar + revisar por release |
| `docs/NAC_TEST_MANUAL.md` | AUTO (links) | MAN (revisão de PR) | A camada 3 do test-launch.sh verifica a existência dos 11 docs; manual = ler para verificar precisão |
| `docs/COVERAGE_REPORT_2026_05_10.md` | -- | MAN (regenerar por release) | Este é o próprio registro de cobertura; humano escreve por release |
| `docs/NAC_INTEROP_MCP.md` | -- | MAN | Proposta de spec, revisada por humano |
| `docs/NAC_LAUNCH_DIFFUSION.md` | -- | MAN | Playbook interno |
| `docs/CASE_STUDIES_DISCOVERY.md` | -- | MAN | Postmortems de bugs; curado por humano |
| `docs/LAUNCH_PLAN_2026_05_10.md` | -- | MAN (histórico) | Registro histórico |
| `docs/TEST_COVERAGE_MATRIX.md` (este arquivo) | AUTO (links) | MAN | Atualizar por release |
| `docs/VOICE_CHAT_ERROR_ANALYSIS_2026_05_09.md` | -- | MAN | Análise histórica de bugs |
| `docs/HUMAN_OK_CHECKLIST.md` | -- | MAN (Pablo executa) | O próprio checklist; Pablo executa |

## 5. Guias de adoção

| Guia | Cobertura AUTO | Gate manual | Notas |
|------|----------------|-------------|-------|
| `guides/REACT.md` | -- | MAN (revisão de PR + feedback de adotantes) | O snippet hello-world deve continuar compilando; manual = verificação anual de rebuild |
| `guides/ANGULAR.md` | -- | MAN (revisão de PR) | Igual |
| `guides/LLM_WIRING.md` | -- | MAN (revisão de PR) | O backend Node de referência funciona; manual = executar contra a spec ao vivo |
| `guides/AI_PLAYBOOK_NEW_PROJECT.md` | -- | MAN (revisão de PR) | As asserções de etapas devem permanecer executáveis |
| `guides/AI_PLAYBOOK_MIGRATION.md` | -- | MAN (revisão de PR) | Igual |
| `guides/IMPACT_TESTING.md` | -- | MAN (revisão de PR) | Afirmações de impacto; atualizar números por trimestre |
| `guides/IMPACT_RPA.md` | -- | MAN (revisão de PR) | Igual |
| `guides/RPA_UIPATH.md` | -- | MAN (executar o workflow de exemplo uma vez por release) | Manual = exercitar o InvoiceFromCSV.xaml |
| `guides/RPA_AUTOMATION_ANYWHERE.md` | -- | MAN | Mesmo formato |
| `guides/RPA_BLUE_PRISM.md` | -- | MAN | Mesmo formato |
| `guides/RPA_PLAYWRIGHT.md` | AUTO (suite de referência) | MAN (revisão de PR) | Os padrões são exercitados por `tests/e2e-nac/specs/`; manual = ler uma vez por release |

## 6. Suites de testes

| Suite | Cobertura AUTO | Gate manual | Notas |
|-------|----------------|-------------|-------|
| `packages/nac/test/smoke.mjs` | AUTO (própria) | MAN (revisar taxa de aprovação) | 36 verificações; manual = conferir a contagem uma vez por release |
| `packages/nac/test/v22.mjs` | AUTO (própria) | -- | 14 testes unitários |
| `packages/nac/test/v23-interop.mjs` | AUTO (própria) | -- | 14 testes unitários |
| `packages/nac/test/stage1-audio.mjs` | AUTO (própria) | MAN (regenerar corpus por locale) | 33 verificações; manual = ouvir uma amostra do corpus TTS, verificar se está audível |
| `packages/nac/test/stage2-disambiguation.mjs` | AUTO (própria) | -- | 31 verificações |
| `packages/nac/test/stage3-backend.mjs` | AUTO (própria, ao vivo) | MAN (revisar respostas do LLM) | 45 prompts x 10 locales; manual = verificar pontualmente se o LLM não derivou em 2 prompts aleatórios |
| `packages/nac/test/stage4-calls.mjs` | AUTO (própria) | -- | 31 verificações |
| `packages/nac/test/stage6-ack.mjs` | AUTO (própria) | -- | 16 verificações |
| `packages/nac/test/stage6b-longtail.mjs` | AUTO (própria) | -- | 14 verificações |
| `tests/e2e-nac/specs/*.spec.ts` | AUTO (própria) | MAN (revisão visual de execução com interface uma vez por release) | 16 specs; manual = executar com `--headed` uma vez para inspecionar visualmente |
| Corpus TTS (30 arquivos MP3) | AUTO (presença + tamanho) | MAN (ouvir 1 por locale) | Manual = amostrar 10 arquivos, confirmar audível, sem lixo |
| `tools/nac/test-launch.sh` | AUTO (própria) | -- | Orquestrador |
| `tools/nac/discovery-loop.sh` | AUTO (própria) | -- | Loop de descoberta + correção |

## 7. Pacotes de estudo de caso

| Pacote | Cobertura AUTO | Gate manual | Notas |
|--------|----------------|-------------|-------|
| Fonte de `packages/nac-react-demo/` | AUTO (build + Playwright) | MAN (visual no dist implantado) | Build Vite limpo; Playwright cobre todos+chat+autopilot |
| Dist implantado de `packages/nac-react-demo/` | AUTO | MAN (abrir em aba anônima, percorrer) | Manual = o walkthrough humano em /demos/react/ |
| Fonte de `packages/nac-angular-demo/` | AUTO | MAN | Mesmo formato |
| Dist implantado de `packages/nac-angular-demo/` | AUTO | MAN | Igual |

## 8. Aspectos transversais

| Aspecto | Cobertura AUTO | Gate manual | Notas |
|---------|----------------|-------------|-------|
| Completude do catálogo i18n | AUTO (validador) | MAN (revisão por falante nativo por locale) | O validador em modo estrito sinaliza chaves ausentes; falante nativo verifica pontualmente se as strings fazem sentido culturalmente |
| Assinatura de manifesto HMAC | AUTO (unitário) | MAN (smoke de deploy multi-tenant) | Testes unitários assinam + verificam; manual = smoke de produção contra o fluxo de distribuição de segredos |
| Controle por isTrusted | AUTO (unitário) | MAN (clique real vs. sintético lado a lado) | Unitário v22 cobre a flag; manual = o par de botões istrusted_real / istrusted_fake em example-v20-full.php |
| Interop cross-origin (v2.3) | AUTO (mock) | MAN (peer real com bearer token real) | v23-interop usa mock na página; manual = pelo menos um teste cross-origin antes de declarar v2.3 GA |
| Deploy para yujin.app | AUTO (push -> deploy automático) | MAN (verificar se as URLs retornam 200 + conteúdo correto) | GoDaddy faz deploy automático; manual = curl em todas as URLs críticas após cada push na main |
| Reprodução de áudio em browser real | -- | MAN (teste de mic + alto-falante) | A Web Speech API precisa de hardware real; manual = pressionar o mic na demo v21 ao vivo, dizer um prompt por locale |

## Resumo -- cobertura ponderada por categoria

| Categoria | AUTO | MAN | BOTH | Saúde da cobertura |
|-----------|------|-----|------|--------------------|
| Artefatos de runtime | 4 | 0 | 0 | EXCELENTE (média auto 95%) |
| Pacote NPM | 4 | 0 | 0 | EXCELENTE (100% auto) |
| Demos | 6 | 1 | 1 | BOM (auto para invariantes, manual para UX) |
| Documentação | 1 | 14 | 0 | ESPERADO (docs são revisados, não testados unitariamente) |
| Guias de adoção | 0 | 10 | 0 | ESPERADO |
| Suites de testes | 13 | 4 | 0 | EXCELENTE |
| Pacotes de estudo de caso | 2 | 2 | 0 | BOM (auto + visual manual) |
| Aspectos transversais | 4 | 2 | 0 | BOM |
| **TOTAL** | **34** | **33** | **1** | **EXCELENTE** |

## Como usar esta matriz

### Por release

1. Marque a versão da spec + versão da suite de referência.
2. Execute `bash tools/nac/test-launch.sh` -- cada linha AUTO é um gate.
3. Percorra a coluna MAN -- o [checklist Human OK](HUMAN_OK_CHECKLIST.md) é a forma executável.
4. Atualize o COVERAGE_REPORT_<data>.md com os resultados da execução.
5. Ajuste esta matriz se o conjunto de artefatos mudou.

### Por adotante

Copie esta estrutura de matriz para o seu próprio app. Substitua os
nomes dos artefatos; mantenha o mesmo formato. A disciplina é a mesma:
cada artefato recebe um gate explícito de auto + manual.

### Anti-padrão

NÃO marque um artefato como "AUTO" se o teste apenas verifica a
presença do arquivo. AUTO significa que o teste exercita comportamento.
Verificações de presença de arquivo ficam no harness (test-launch.sh),
não na matriz de artefatos.

## Veja também

- [NAC_TEST_MANUAL.md](NAC_TEST_MANUAL.md) -- o playbook do qual esta
  matriz deriva.
- [HUMAN_OK_CHECKLIST.md](HUMAN_OK_CHECKLIST.md) -- a forma executável
  da coluna MAN.
- [COVERAGE_REPORT_2026_05_10.md](COVERAGE_REPORT_2026_05_10.md)
  -- os resultados reais da execução para o release atual.

## Licença

Apache-2.0.

---

*This is a machine translation of the canonical English
version at `/nac-spec/docs/TEST_COVERAGE_MATRIX.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
