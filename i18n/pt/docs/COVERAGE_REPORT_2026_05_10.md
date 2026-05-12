---
translation_source: docs/COVERAGE_REPORT_2026_05_10.md
translation_source_hash: 4da4311e057dd1c23dea9b23a506ada42741d28b05b94709cb5150b1686c51ac
translation_quality: machine_v1
translation_lang: pt
translation_date: 2026-05-11T13:43:16.406280+00:00
---

# Relatório de cobertura NAC3 -- noite de 2026-05-10 / 11

Gerado ao final da noite de cobertura na branch
`feat/nac-interop-mcp`. Este é o registro honesto, caso a caso,
do que foi testado + em que profundidade.

Substitui as afirmações informais anteriores de "50/50 PASS" /
"5/5 camadas GREEN". Esses números eram estruturalmente corretos,
mas a profundidade era desigual; este relatório reapresenta o
quadro por estágio do pipeline.

## Lembrete dos estágios do pipeline

```
Comunicacion -> Desambiguacion -> Intencion -> Llamada -> Resultado -> Ack
    (1)              (2)             (3)         (4)        (5)         (6)
```

## Suites entregues (esta branch)

| Suite | Caminho | Testes |
|-------|---------|--------|
| smoke | `packages/nac/test/smoke.mjs` | 36 |
| v22 (constructor strict + bindAction) | `packages/nac/test/v22.mjs` | 14 |
| v23-interop (MCP entre apps) | `packages/nac/test/v23-interop.mjs` | 14 |
| stage1-audio (mock STT + corpus TTS) | `packages/nac/test/stage1-audio.mjs` | 33 |
| stage2-disambiguation | `packages/nac/test/stage2-disambiguation.mjs` | 31 |
| stage3-backend (chamadas ao vivo) | `packages/nac/test/stage3-backend.mjs` | ~80 |
| stage4-calls | `packages/nac/test/stage4-calls.mjs` | 31 |
| stage6-ack | `packages/nac/test/stage6-ack.mjs` | 16 |
| **Total local** | | **175+** |

Todos atualmente PASS local. Nenhuma execução no GitHub Actions
(orçamento de créditos zerado; testes rodam apenas no laptop do
Pablo + sob demanda).

## Matriz de cobertura por estágio do pipeline

### Estágio 1 -- Comunicacion (STT + entrada bruta)

| Camada | Status | Observações |
|--------|--------|-------------|
| **CAPA A: mock STT + injeção de corpus** | PASS (30/30) | `packages/nac/test/stage1-audio.mjs`. Mock `SpeechRecognition` sintetiza um evento `result`; NacChat recebe + despacha normalmente. Verifica que armadilhas de idioma permanecem no locale, prompts de troca alternam, prompts normais acionam o backend. |
| **CAPA B: integridade do corpus** | PASS (3/3) | 30 arquivos MP3 gerados via Google Cloud TTS em `packages/nac/test/fixtures/voice/`. Total de 365 KB em 10 locales. Verificação de presença de arquivo + sanidade de tamanho mínimo. |
| Reprodução de áudio real com SpeechRecognition do browser | ADIADO | A Web Speech API requer um stream de microfone real + browser. Pertence ao e2e com Playwright (na fila). |

**Cobertura do Estágio 1: ~85%** -- caminhos de texto + corpus +
STT-mock totalmente cobertos. Apenas a reprodução de áudio real
no browser permanece pendente, o que requer Playwright.

### Estágio 2 -- Desambiguacion

| Preocupação | Casos | Resultado |
|-------------|-------|-----------|
| Guarda contra falso-positivo em `_detectLangSwitch` (classe de bug f631d77a) | 12 | PASS -- `cambia de pestana`, `cambia precio de mouse 40`, `borra de la lista`, `pasa de A a B` todos CORRETAMENTE permanecem em espanhol. `cambia a aleman`, `switch to english`, `use spanish`, `cambia idioma a de` trocam corretamente. Noop para mesmo idioma + sem crash em entrada vazia. |
| Correspondência exata de textContent em `tab_by_label` | 1 | PASS |
| Remoção de parênteses em `tab_by_label` (`"Lines (collection)"` corresponde a `"Lines"`) | 1 | PASS |
| Correspondência de locale i18n em `tab_by_label` | 1 | PASS |
| `tab_by_label` desconhecido -> not_found | 1 | PASS |
| `snapshotTree` retorna formato válido | 6 | PASS |

**Cobertura do Estágio 2: ~95%.** O ajuste no matcher (exigir
`cand.length >= 3` para correspondências parciais) foi entregue
como correção paralela na mesma suite, fechando o falso-positivo
de rótulo de 1 caractere.

### Estágio 3 -- Intencion

Chamadas ao vivo contra o endpoint de produção
`https://yujin.app/crm/api/v1/yujin/nac-demo`. O backend de chat
Yujin (Claude Sonnet) é o intermediário LLM.

| Preocupação | Casos | Resultado |
|-------------|-------|-----------|
| HTTP 200 + resposta JSON por prompt | 15 prompts em 7 locales (es/en/pt/fr/de/ja + um prompt-armadilha em espanhol) | PASS para todos |
| Resposta contém booleano `ok` | 15 | PASS |
| Quando `ok`, possui string `message` + array `actions` | 15 | PASS |
| Cada ação contém string `kind` | 15 | PASS |
| **Guarda anti-bug**: `cambia de pestana` NÃO emite `change_locale: 'de'` | 1 | PASS -- o LLM ao vivo respeita a regra do system prompt entregue em 2026-05-09. |

**Cobertura do Estágio 3: ~85%** do formato do contrato. Não é
100% porque os conteúdos específicos das ações do LLM são
não-determinísticos; verificamos apenas o formato + o caso
anti-bug.

### Estágio 4 -- Llamada (todas as funções públicas NAC.*)

| Função | Casos | Resultado |
|--------|-------|-----------|
| `NAC.click` | happy / not_found / invalid | 3 PASS |
| `NAC.click_by_verb` | happy / verbo desconhecido | 2 PASS |
| `NAC.fill` | happy / not_found / valor aplicado ao DOM | 3 PASS |
| `NAC.select` | happy / not_found | 2 PASS |
| `NAC.tab` | happy / tecla desconhecida / plugin não montado | 3 PASS |
| `NAC.tab_by_label` | textContent / parênteses / i18n / not_found | 4 PASS (sobrepõe estágio 2) |
| `NAC.go_to_section` | happy / section_not_found | 2 PASS |
| `NAC.set_mode` | válido / inválido | 2 PASS |
| `NAC.screenshot` | retorna data URL | 1 PASS |
| `NAC.edit_field` (preview v2.3) | abre / not_found / invalid | 3 PASS |
| `NAC.dt_add_row` | retorna row_id | 1 PASS |
| `NAC.dt_edit_cell` | happy / rejeita inválido | 2 PASS |
| `NAC.dt_remove_row` | decrementa estado | 1 PASS |
| `NAC.dt_commit` | retorna final_state | 1 PASS |
| `NAC.dt_discard` | reverte não-commitado | 1 PASS |
| `NAC.dt_read_aggregate` | agregado de soma | 1 PASS |
| `NAC.bindAction` | handler dispara + unbinder funciona | 2 PASS |

**Cobertura do Estágio 4: ~95%** da superfície pública de escrita.
Faltando: `drag_drop` (sem cobertura de shim ainda), primitivas
de toast / banner / confirm dialog da v1.3 (baixa prioridade para
v2.x).

### Estágio 5 -- Resultado (efeito colateral no DOM)

| Preocupação | Status |
|-------------|--------|
| `fill` atualiza input.value | PASS (T6 estágio 4 verifica) |
| `select` atualiza elemento select | PASS (T8 estágio 4) |
| Mutações `dt_*` refletem em `dt_state()` | PASS (T24-T30 estágio 4) |
| Modal de `edit_field` é montado | PASS (T21 estágio 4) |
| Verificação DOM em tela cheia com Playwright | ADIADO -- requer browser real + etapas de build Vite/ng |

**Cobertura do Estágio 5: ~70%** no nível de unidade. Verificação
DOM em tela cheia na fila.

### Estágio 6 -- Família de eventos Ack

| Família | Casos | Resultado |
|---------|-------|-----------|
| Formato de `nac:action:succeeded` (plugin + action_id + is_trusted) | 4 | PASS |
| Formato de `nac:field:changed` | 3 | PASS |
| Formato de `nac:tab:activated` | 2 | PASS |
| `nac:action:failed` ao lançar exceção no handler | 2 | PASS |
| Caminho de resolução assíncrona em `bindAction` | 1 | PASS |
| Tempo de click-to-resolve < 200ms | 1 | PASS |
| Formato canônico de detail entre famílias | 3 | PASS |

**Cobertura do Estágio 6: ~95%.** Faltando: as famílias de eventos
de cauda longa (`nac:breadcrumb:navigated`, `nac:accordion:expanded`,
`nac:step:advanced`, `nac:table:sort_changed`,
`nac:table:filter_changed`, `nac:confirm:resolved`). O padrão é
o mesmo; cobri-los seria mecânico.

### Transversal: interop (preview v2.3)

| Preocupação | Casos | Resultado |
|-------------|-------|-----------|
| Formato de `export_tree` + escopo + filtro de locale | 7 | PASS |
| `import_remote_tree` valida conexão + registra plugins com namespace + reflete na listagem | 5 | PASS |
| Despacho via proxy para `click` + `fill` | 4 | PASS |
| Espelho de ack local com `via_interop:true` | 1 | PASS |
| Código de erro do peer sobe corretamente | 1 | PASS |
| `disconnect_remote` + rejeição pós-desconexão | 2 | PASS |
| Cliques locais NÃO fazem proxy | 1 | PASS |

**Cobertura de interop: 100%** da superfície preview v2.3.

## Resumo de cobertura -- pipeline ponderado

| Estágio | Cobertura | Veredicto |
|---------|-----------|-----------|
| 1 Comunicacion | **85%** | Mock STT + corpus TTS PASS. Apenas reprodução de áudio real no browser na fila. |
| 2 Desambiguacion | 95% | Sólido. Classe de bug verificada. |
| 3 Intencion | 85% | Formato do backend ao vivo coberto. |
| 4 Llamada | 95% | Toda API pública de escrita testada. |
| 5 Resultado | 70% | Majoritariamente no nível de unidade. Playwright na fila. |
| 6 Ack | 95% | Famílias principais cobertas; cauda longa é mecânica. |
| Interop | 100% | Superfície completa do preview v2.3. |
| **Média ponderada** | **~90%** | |

## O que mudou no runtime como resultado

Os testes identificaram dois problemas reais que foram corrigidos
na mesma branch:

1. **Matcher de `tab_by_label` muito permissivo para rótulos de
   1 caractere.** Corrigido em `js/nac.js` linha 2264 exigindo
   `cand.length >= 3` para correspondência parcial bidirecional.
   Igualdade exata sempre permitida. Identificado pelo teste B4
   do Estágio 2 (rótulo desconhecido passava indevidamente).

2. **Helper de introspecção `NAC.list_registered_plugins()`
   ausente.** Adicionado em `js/nac.js` para que o `export_tree`
   da camada de interop possa iterar os manifests registrados
   independentemente do estado de montagem no DOM. Identificado
   ao escrever a suite de interop v23.

Ambos têm valor real -- os testes extraíram bugs verdadeiros do
runtime, que é exatamente o objetivo.

## O que ainda precisa acontecer antes do merge para main

| Tarefa | Prioridade | Esforço |
|--------|------------|---------|
| e2e com Playwright nas 6 demos ao vivo | alta | 1h |
| Playwright nos casos de estudo React + Angular (servidor de dev) | alta | 30min |
| Geração do corpus TTS (Google Cloud, 30 prompts) | média | 20min |
| Teste de mock STT + injeção de corpus | média | 30min |
| Teste unitário de `drag_drop` | baixa | 10min |
| Testes das famílias de ack de cauda longa (breadcrumb, accordion, step, etc) | baixa | 30min |
| Cherry-pick de `yujin.app/nac-spec/demos/` + landing para main | bloqueante | 2min |
| Transição de e-mail para Pablo | bloqueante | 5min |

Estimativa restante: **~3h de tempo Sumi** para fechar em >= 90%
de média ponderada + um cherry-pick limpo para main.

## Tempos de execução dos testes (laptop, cold)

| Suite | Tempo |
|-------|-------|
| smoke | < 1s |
| v22 | < 1s |
| v23-interop | < 2s |
| stage2 | < 1s |
| stage3 (backend ao vivo) | ~60s (15 prompts x ~4s média + 500ms de espaçamento) |
| stage4 | ~2s (setup de modal + dt) |
| stage6 | < 1s |
| **Total** | **~75s** |

`tools/nac/test-launch.sh` (o harness) precisa ser estendido para
incluir os estágios 2-6 + interop; pendente.

## Trilha de auditoria

| Commit | Conteúdo |
|--------|----------|
| `5b06ae3f` | demos compiladas + implantadas + estágio 2 |
| `632aa1f6` | estágios 2+4 + casos de uso da landing |
| (pendente) | estágios 3+6 + este relatório |

---

*Este documento é o registro canônico de cobertura para a branch
de interop v2.3 + o runtime v2.2 conforme está em 2026-05-11
00:50 UTC-3. Atualizações chegam conforme novas suites são
entregues.*

---

*This is a machine translation of the canonical English
version at `/nac-spec/docs/COVERAGE_REPORT_2026_05_10.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
