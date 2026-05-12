---
translation_source: guides/IMPACT_RPA.md
translation_source_hash: d278c291a38100f66ef8ed5ae0030875b5e9eb4412db6edecf9b7db2794a16e2
translation_quality: machine_v1
translation_lang: pt
translation_date: 2026-05-11T13:37:06.797172+00:00
---

# Impacto do NAC3 em RPA

**Versão do NAC3:** 2.2 estável.
**Público-alvo:** Arquitetos de RPA, líderes de centros de excelência
em automação (CoE), engenheiros de automação avaliando o custo de
manutenção e expansão de automações baseadas em NAC3.

## Resumo

RPA baseado em seletores CSS é frágil por design. Reconhecimento por
imagem é frágil por exibição. O NAC3 coloca âncoras nomeadas e estáveis
na página que QUALQUER plataforma de RPA pode usar como alvo. O custo
por automação cai 60–90% e a dívida de manutenção de seletores por
trimestre cai a quase zero.

## O estado atual dos seletores de RPA

Três estilos, todos com falhas:

### 1. Seletores CSS / XPath

```xml
<webctrl tag='button'
         class='btn-primary btn-lg invoice-save-btn'
         text='Save' />
```

Quebra com: renomeação de classes CSS, reestruturação de layout,
tradução de rótulos, adição de classes em estado hover.

### 2. Correspondência por imagem / OCR

Comparação de pixels do botão renderizado. Quebra com: mudança de
tema, modo escuro, mudança de resolução, troca de fonte, sobreposição
do anel de foco.

### 3. Segmentação por âncora (coordenada relativa)

"O botão duas células à direita do rótulo 'Subtotal'." Quebra com:
refluxo de layout, reordenação de colunas, mudanças de breakpoint
responsivo.

Os três exigem manutenção constante do CoE. Um CoE empresarial típico
gasta 35–60% do seu tempo atualizando seletores quebrados após
redesigns de interface.

## O estado com NAC3

Uma única linha por elemento:

```js
await window.NAC.click('invoice.save');
```

Quebra com: o verbo `save` sendo renomeado pela equipe de produto para
outra coisa. Essa é uma mudança semântica real, e a automação DEVE ser
atualizada pelo mesmo motivo que humanos precisariam de retreinamento.

## Métricas concretas de impacto

De um CoE que pilotou o NAC3 em 14 automações:

| Métrica | Baseado em seletores | Baseado em NAC3 | Delta |
|---------|---------------------|-----------------|-------|
| Média de atividades por automação | 47 | 9 | -81% |
| Horas de manutenção por trimestre de redesign de UI | 41 | 3 | -93% |
| Execuções com falha por semana (desvio de seletores) | 18 | 0 | -100% |
| Tempo para criar uma nova automação | 12 horas | 2 horas | -83% |
| Cobertura da superfície do app (% de ações alcançáveis) | 38% | 95% | +150% |

O número de cobertura é o mais importante. **RPA baseado em seletores
tipicamente cobre 30–50% das ações de um app** porque os 50–70%
restantes são frágeis demais para automatizar de forma economicamente
viável. O NAC3 eleva isso para >90% — a cauda longa se torna
economicamente endereçável.

## O que o NAC3 habilita para RPA

### 1. Portabilidade entre tenants

Hoje: um bot de RPA construído para a instância Salesforce do Cliente A
não roda no Cliente B porque as classes CSS diferem levemente. Com NAC3:
o bot aponta para `invoice.save`, que é estável entre tenants. Mesmo
bot, multi-tenant.

### 2. Portabilidade entre fornecedores

Se dois produtos SaaS no mesmo domínio (CRM, ERP, gestão de projetos)
entregam manifests NAC3 com verbos sobrepostos (`create_invoice`,
`mark_paid`), a mesma lógica do bot despacha contra qualquer um. O bot
de RPA se torna agnóstico ao fornecedor.

### 3. Automação criada por LLM

Um engenheiro do CoE descreve a automação em prosa:

> "Abrir o Yujin CRM, encontrar todas as faturas não pagas com mais de
> 60 dias, marcá-las como cobranças, enviar e-mail ao consultor
> responsável."

Um LLM com acesso a `NAC.describe()` produz a sequência de atividades:

```
1. NAC.click_by_verb('invoice', 'list_unpaid')
2. NAC.fill('invoice.filter.age_days_min', 60)
3. NAC.click('invoice.filter.apply')
4. Para cada linha em NAC.dt_state('invoice.list'):
     - NAC.click_by_verb('invoice', 'mark_collections', {row_id})
     - NAC.click_by_verb('email', 'send_advisor', {row_id})
```

O engenheiro do CoE revisa e aprova. Horas, não semanas.

### 4. Autodescoberta para novos apps

`NAC.describe()` retorna o manifest completo. O bot pode introspectar
QUALQUER app compatível com NAC3 em tempo de execução. **Uma automação
que aponta para "todo app compatível com NAC3 que o usuário tem aberto"
se torna possível** (veja o Yujin Pilot em yujin.app/pilot para a
versão produtizada).

### 5. Trilha de auditoria com proveniência

Cada despacho emite `nac:action:succeeded` com
`is_trusted: false` (sinalizando origem de RPA) + `plugin` +
`action_id`. O app host pode registrar isso para conformidade:

> O bot xyz despachrou `invoice.delete` para a fatura #INV-42
> às 14:23 GMT-3, com `is_trusted=false`. Aprovado por:
> rpa-coe-policy v1.4.

Equipes de GRC obtêm um log de auditoria determinístico por execução
de bot. Sem scraping de DOM nos logs, sem vazamento de PII nas strings
de seletores.

### 6. Controle de verbos sensíveis

Apps que marcam certos verbos (excluir, pagamento, concessão de papel)
como exigindo `isTrusted` recusarão despachos de RPA por padrão. O CoE
explicitamente coloca na lista de permissões quais verbos o RPA pode
usar:

```js
window.__NAC_ALLOW_UNTRUSTED__ = [
  'invoice.send',
  'invoice.save',
  'report.export'
  // verbos de exclusão, pagamento e admin intencionalmente ausentes
];
```

A governança do CoE se torna uma configuração JS + um log de auditoria,
não uma planilha de permissões de bots.

### 7. Voz + chat como front-end de RPA

A camada de RPA pode usar o painel de chat como sua interface: um
engenheiro do CoE diz "executar o job de faturas não pagas para o
tenant Acme" e um backend compatível com NAC3 resolve e despacha. O
caminho de voz usa os mesmos primitivos `NAC.*` que o chat usa.

## Matriz de adoção por plataforma de RPA

| Plataforma | Caminho | Custo de integração | Referência |
|------------|---------|---------------------|------------|
| UiPath | Injetar JS via atividade Browser | Baixo (uma atividade por chamada) | [RPA_UIPATH.md](RPA_UIPATH.md) |
| Automation Anywhere A360 | Run JavaScript Function | Baixo | [RPA_AUTOMATION_ANYWHERE.md](RPA_AUTOMATION_ANYWHERE.md) |
| Blue Prism | Inject JavaScript (ação VBO) | Baixo | [RPA_BLUE_PRISM.md](RPA_BLUE_PRISM.md) |
| Power Automate Desktop | Run JavaScript on web page | Baixo | (em breve) |
| RPA baseado em Selenium | execute_script | Baixo | -- |
| Baseado em imagem (TagUI, Sikuli) | Caminho de fallback; usar apenas como último recurso | Alto | -- |

## Guia de migração para uma suíte de automação existente

### Fase 1 — auditoria (1 semana)

1. Inventariar todos os seletores em todas as automações.
2. Para cada um: classificar como "estável-baixa-manutenção" /
   "frágil-alta-manutenção".
3. Os frágeis se tornam candidatos ao NAC3 primeiro.

### Fase 2 — preparação do app alvo

O app web que a automação aponta deve adotar o NAC3. Opções:

- A equipe do app adota via o guia de migração
  ([AI_PLAYBOOK_MIGRATION.md](AI_PLAYBOOK_MIGRATION.md)).
- OU: o CoE de RPA injeta o cliente NAC3 via userscript /
  extensão de navegador, caso a equipe do app não consiga migrar.
  Isso funciona, mas é frágil; prefira adoção de primeira parte.

### Fase 3 — reescrita da automação (1–2 semanas por automação)

Substituir cada seletor pela chamada `NAC.*` correspondente.
A versão baseada em seletores permanece em uma branch de backup.
A nova versão é entregue com log de auditoria NAC3 explícito.

### Fase 4 — governança

O CoE atualiza seu checklist de revisão de bots:
- O bot aponta apenas para IDs NAC que existem nos manifests atuais.
- O bot tem lista de permissões explícita de verbos para operações
  sensíveis.
- O bot registra cada despacho na tabela de auditoria.

## Custo de adoção

Para um CoE executando 50 automações contra 10 apps alvo:

- Migração no lado do app: 6–8 semanas (um engenheiro por app).
- Reescrita no lado do bot: 1–2 semanas por bot = 50–100
  semanas-engenheiro.

Parece caro até você comparar com o custo em estado estacionário de
manter 50 bots baseados em seletores indefinidamente. O ponto de
equilíbrio tipicamente ocorre em 6–9 meses; tudo depois disso é
economia pura de tempo de engenheiro do CoE.

## Riscos + mitigação

### Risco — "o app alvo se recusa a adotar o NAC3"

Comum em software empresarial legado. Mitigar com:

- Injetar `nac.js` no lado do cliente via extensão de navegador
  gerenciada pelo CoE ou userscript estilo Tampermonkey.
- Definir manifests no lado do CoE; o app permanece intocado.
- Menos robusto que a adoção de primeira parte, mas viável
  transitoriamente.

### Risco — "o RPA contorna o controle de isTrusted"

Este é o trade-off de segurança. O RPA VAI sintetizar cliques. O app
host deve colocar na lista de permissões quais verbos o RPA pode
acionar. O CoE e a equipe do app negociam por verbo. Documente a
negociação; audite a lista de permissões periodicamente.

### Risco — "perdemos visibilidade sobre a sequência de ações do RPA"

Inverso: com NAC3 você GANHA visibilidade. Cada despacho de bot dispara
um evento canônico `nac:action:succeeded` com
`{plugin, action_id, args, is_trusted}` estruturado. Registre isso no
seu SIEM com a política de retenção adequada.

## Paralelo com a indústria

O que o ARIA fez para tecnologia assistiva (dar aos leitores de tela um
contrato estável na página), o NAC3 faz para RPA e automação agêntica.
O CoE passa de "zelador de seletores" para "designer de automação".

## Veja também

- [RPA_UIPATH.md](RPA_UIPATH.md), [RPA_AUTOMATION_ANYWHERE.md](RPA_AUTOMATION_ANYWHERE.md),
  [RPA_BLUE_PRISM.md](RPA_BLUE_PRISM.md) — guias de integração por
  plataforma.
- [IMPACT_TESTING.md](IMPACT_TESTING.md) — análise de impacto paralela
  para a dimensão de testes/QA.
- [SECURITY.md](../SECURITY.md) — modelo de ameaças do isTrusted do
  qual a lista de permissões de RPA depende.

## Licença

Apache-2.0.

---

*This is a machine translation of the canonical English
version at `/nac-spec/guides/IMPACT_RPA.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
