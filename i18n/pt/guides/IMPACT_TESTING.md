---
translation_source: guides/IMPACT_TESTING.md
translation_source_hash: d69b8343b9c3e6a8ba3e22f198a9a6646d800f3f32a2f0446a506cb44f9e664b
translation_quality: machine_v1
translation_lang: pt
translation_date: 2026-05-11T13:36:10.755574+00:00
---

# Impacto do NAC3 em Testes + QA

**Versão do NAC3:** 2.2 stable.
**Público-alvo:** Engenheiros de teste, líderes de QA, SDETs, CTOs avaliando
o custo de manutenção de testes a longo prazo com a adoção do NAC3.

## Resumo

Código de teste que usa ids do NAC3 sobrevive a redesigns de UI. Código de
teste que usa seletores CSS não sobrevive. Essa única propriedade muda
a economia da manutenção de testes de "linear com a rotatividade de UI"
para "linear com a rotatividade de funcionalidades" -- tipicamente 5 a 10 vezes menos trabalho.

## A matemática da manutenção hoje

Uma suite típica de Selenium / Cypress / Playwright para uma aplicação web
não trivial contém centenas de seletores:

```ts
await page.locator('button.btn-primary.btn-large:has-text("Save")').click();
await page.locator('div.modal > div.body > input[type="text"]:first-of-type').fill('Acme');
await page.locator('table.invoice-grid > tbody > tr:nth-child(1) > td:last-child > button').click();
```

Esses seletores quebram quando:

- O time de design renomeia `.btn-primary` para `.btn-cta`.
- Uma div de envolvimento é adicionada por questões de acessibilidade.
- O rótulo do botão é internacionalizado e "Save" vira
  "Guardar" nos testes do tenant em espanhol.
- O layout do grid muda para `grid-template-rows`.
- Qualquer coisa na página que NÃO seja a intenção semântica
  muda.

Pesquisas do setor (2024-2025) estimam que **30 a 50% do tempo dos engenheiros de QA
é gasto em manutenção de seletores**. Esse número piora conforme a aplicação cresce.

## A matemática da manutenção com NAC3

```ts
await NAC.click('invoice.save');
await NAC.fill('invoice.client_name', 'Acme');
await NAC.click('invoice.line.42.delete');
```

Essas chamadas sobrevivem a:

- Renomeações de classes CSS (os seletores não referenciam CSS).
- Reestruturações da árvore DOM (os seletores não referenciam estrutura).
- Mudanças de rótulos por I18n (os seletores não referenciam texto).
- Migrações de layout de grid para flex.
- Trocas de biblioteca de componentes.

Elas quebram SOMENTE quando:

- O time de produto renomeia um verbo (`save` -> `commit`).
- Um botão é removido completamente.

Essas são **mudanças no nível de funcionalidade**, não no nível de UI. O teste
precisa ser atualizado pelo mesmo motivo que o código de produção precisa ser
atualizado. Essa é a base de custo correta.

## Métricas concretas de impacto

Dados internos do Yujin CRM (2025):

| Métrica | Antes do NAC | Depois do NAC | Delta |
|--------|-----------|-----------|-------|
| Média de linhas por spec no Playwright | 187 | 64 | -66% |
| Manutenção por spec após sprint de redesign | 4,2 horas | 0,3 horas | -93% |
| Falhas de teste relacionadas a seletores por semana | 38 | 2 | -95% |
| Tempo de onboarding de novo engenheiro de QA | 3 semanas | 1 semana | -67% |
| Testes passando 6 meses após escritos, sem edições | 31% | 89% | +180% |

O número de 89% é o mais impactante. **A grande maioria dos testes NAC3
continua funcionando ao longo da evolução normal do produto**, enquanto os
equivalentes baseados em seletores se deterioram.

## O que o NAC3 viabiliza para automação de testes

### 1. Corpus de testes estável

Um teste escrito em 2024 contra `NAC.click('invoice.save')` ainda
roda em 2026 se o verbo `save` sobreviver ao roadmap do produto. O DOM
ao redor do botão pode ter sido reconstruído três vezes.

### 2. Cross-browser sem troca de modo de seletor

Seletores CSS se comportam de forma diferente entre Chromium / Firefox /
WebKit em casos extremos (pseudo-elementos, anéis de foco, shadow
DOM). O NAC3 despacha via o resolver do runtime -- o mesmo
caminho de código independentemente do navegador.

### 3. Testes agnósticos a I18n

Em uma aplicação multi-locale: a suite de testes atual precisa de execuções por locale
porque "Save" / "Guardar" / "Speichern" são todos o mesmo
botão. Com NAC3, o teste chama o id; o runtime resolve
entre os locales. **Você escreve 1 teste, ele roda em 10 locales** (um
por ).

### 4. Autoria de testes assistida por LLM

Um LLM que vê `NAC.describe()` pode produzir uma spec de teste completa
a partir de uma descrição em prosa: "Teste que adicionar uma linha e depois
deletá-la retorna a tabela ao estado inicial." O LLM
emite chamadas `NAC.*`; você revisa e faz o commit. O Yujin CRM tem
~250 specs que foram criadas dessa forma e revisadas antes
do merge.

### 5. Testes auto-recuperáveis via descoberta

Quando um teste falha porque um id foi renomeado:

```ts
try {
  await NAC.click('invoice.save');
} catch (e) {
  if (e.code === 'not_found') {
    // Re-discover; the verb 'save' may live under a new id.
    const r = await NAC.click_by_verb('invoice', 'save');
    if (r.ok) console.warn('id has changed; update test');
  }
}
```

O `click_by_verb` do runtime oferece um fallback auto-recuperável
que sinaliza "este teste precisa de atualização, mas a ação ainda
funciona" -- um modo de falha muito melhor do que "seletor não encontrado,
ponto final".

### 6. Geração de testes a partir de manifests

`NAC.validate_global({probe: true})` sintetiza um clique em cada
elemento `role="action"` e verifica se ele emite o evento de ack canônico
em até 5s. **Isso é um smoke test gerado automaticamente para toda
a superfície clicável da aplicação**. Execute no CI; ele detecta qualquer
botão que seja montado sem a emissão correta do ack.

### 7. Cobertura por estágio no pipeline

A suite de testes de referência do Yujin (NAC_TEST_MANUAL.md) organiza os testes
por estágio do pipeline do NAC3:

- Estágio 1 (entrada STT)
- Estágio 2 (Desambiguação)
- Estágio 3 (intermediário LLM)
- Estágio 4 (chamadas `NAC.*`)
- Estágio 5 (efeito colateral no DOM)
- Estágio 6 (evento Ack)

A cobertura é medida **por estágio**, não apenas por linha de código.
A referência do Yujin reporta ~95% de média ponderada em todos os
estágios. Adotar esse esquema fornece um scorecard de cobertura
que mapeia diretamente para o contrato.

## Impacto nos frameworks de teste existentes

### Playwright

Integração direta. `page.evaluate()` invoca chamadas `NAC.*`.
Seletores permanecem como fallback para asserções de layout. A referência do Yujin
inclui 16 specs do Playwright em
`tests/e2e-nac/specs/`.

### Cypress

`cy.window().then(win => win.NAC.click(id))`. Mesmo padrão.
Comandos customizados encapsulam as chamadas NAC:
`cy.nacClick('invoice.save')`.

### Selenium

Executor JavaScript: `driver.execute_script('return
window.NAC.click(arguments[0])', 'invoice.save')`.

### Jest + React Testing Library

```ts
import '@nac3/runtime';
import { render } from '@testing-library/react';
import { App } from './App';

test('save works', async () => {
  render(<App />);
  await window.NAC.click('invoice.save');
  expect(mockApi.save).toHaveBeenCalled();
});
```

O NAC3 funciona ao lado do React Testing Library, não contra ele.

### Karma / Jasmine / runners mais antigos

Injeção direta via `window.NAC`. Qualquer coisa que consiga executar
JavaScript em um contexto de navegador funciona.

## Custo de adoção

### Aplicação existente

Conforme o [playbook de migração](AI_PLAYBOOK_MIGRATION.md), estime:

- ~1 dia por tela para decoração + manifest.
- ~1 dia por tela para migração do corpus de testes.
- Total para uma aplicação de 20 telas: ~6 semanas do tempo de um engenheiro,
  recuperado pela economia de manutenção em 3 a 4 meses.

### Nova aplicação

Já integrado. O playbook para projetos greenfield trata os atributos NAC3 como
uma preocupação de primeira classe. Sem custo de retrofit.

## Riscos + mitigação

### Risco -- "não confiamos em testes gerados por LLM"

Justo. O LLM produz um candidato; um humano revisa e faz o commit.
Mesmo fluxo de trabalho do Copilot. O corpus que vai para produção é exatamente o que
o time aprovou, não o que o LLM escreveu.

### Risco -- "os ids do NAC se tornam dívida técnica com o tempo"

Verdade, se você deixar que se deteriorem. Trate os ids do NAC como nomes de colunas de banco de dados:
renomeie via migração, nunca delete em produção.
O CLI `@nac3/runtime` detecta ids órfãos via lint estático.

### Risco -- "e se a adoção do NAC estagnar?"

A spec é Apache-2.0. O runtime tem menos de 200KB. No pior caso: você
possui o artefato, os ids permanecem estáveis. O pior caso ainda é melhor
do que seletores CSS.

## Veja também

- [NAC_TEST_MANUAL.md](../docs/NAC_TEST_MANUAL.md) -- o
  playbook de testes padronizado que esta análise de impacto fundamenta.
- [RPA_UIPATH.md](RPA_UIPATH.md) /
  [RPA_AUTOMATION_ANYWHERE.md](RPA_AUTOMATION_ANYWHERE.md) /
  [RPA_BLUE_PRISM.md](RPA_BLUE_PRISM.md) -- aplicações adjacentes
  do mesmo contrato.
- [COVERAGE_REPORT_2026_05_10.md](../docs/COVERAGE_REPORT_2026_05_10.md)
  -- os próprios números de cobertura da referência do Yujin.

## Licença

Apache-2.0.

---

*This is a machine translation of the canonical English
version at `/nac-spec/guides/IMPACT_TESTING.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
