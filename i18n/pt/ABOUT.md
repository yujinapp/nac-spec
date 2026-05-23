---
translation_source: ABOUT.md
translation_source_hash: 4ab5d9a2ad96ee42811299474895d9836adc1ca93ea37726806f190f59646484
translation_quality: machine_v1
translation_lang: pt
translation_date: 2026-05-11T12:49:07.894126+00:00
---

# Sobre o NAC3

**Versão da spec:** 2.2 stable (+ prévia de interoperabilidade v2.3).

**NAC3** = **Native Agent Contract**.

Uma spec pequena e pública que permite que interfaces web sejam operadas por agentes de IA, executores de voz e ferramentas de acessibilidade da mesma forma que são operadas por humanos hoje: clicando, digitando e lendo -- mas com nomes que máquinas conseguem resolver, eventos que máquinas conseguem aguardar, e uma trilha de proveniência que distingue um usuário real de um chamador sintético.

O NAC3 fica ao lado do ARIA, não sobre ele. Assim como o ARIA padronizou a **árvore de acessibilidade** para que leitores de tela e dispositivos de controle alternativo pudessem operar a mesma UI que um usuário com visão enxerga, o NAC3 padroniza a **árvore de agentes** para que um comando de voz, um intermediário LLM ou um bot RPA possam fazer o mesmo sem código de integração específico por aplicação.

## O que você escreve

Um punhado de atributos HTML (`data-nac-id`, `data-nac-role`,
`data-nac-action`, `data-nac-plugin`) mais um manifesto JS opcional
que nomeia os elementos da página e os verbos que eles aceitam. O
runtime resolve os nomes para elementos e os despacha.

## O que você obtém

- Uma página que responde a `NAC.click('deals.create')` de qualquer
  chamador -- um executor de voz, uma spec do Playwright, um intermediário LLM,
  uma macro de teclado, uma ferramenta de acessibilidade.
- Uma página que emite uma família de eventos determinística
  (`nac:action:succeeded`, `nac:tab:activated`, `nac:field:changed`,
  ...) para que o chamador saiba quando cada etapa foi concluída.
- Uma página cujas identidades de elementos, e não coordenadas, conduzem o
  contrato -- de modo que um redesign da UI não quebre a automação.
- Uma camada de proveniência (`isTrusted`, manifestos assinados com HMAC) que
  informa a um sistema downstream se um clique veio de um usuário real
  ou de outro agente.

## O que o NAC3 não é

- Não é um framework de UI. Você mantém React / Vue / vanilla / PHP /
  o que for. O NAC3 é um contrato fino aplicado sobre o que você
  já renderiza.
- Não é um LLM. O LLM que resolve "clique no botão salvar"
  para `NAC.click('deals.save')` é seu problema (ou do seu fornecedor);
  veja `guides/LLM_WIRING.md` para uma referência.
- Não é um substituto de acessibilidade. Mantenha seus roles ARIA.
  O NAC3 adiciona uma camada paralela; muitos adotantes acabam com
  `role="button"` e `data-nac-role="action"` no mesmo elemento.

## Status

- **v1.9** -- stable. 27 widgets cobertos, 9 famílias de eventos,
  HMAC + isTrusted, modo estrito de i18n, validador. A referência de
  produção é `example.php`.
- **v2.0** -- traz a história de migração brownfield (páginas existentes
  passam a ser controladas pelo NAC via ~80 linhas de configuração). Referência:
  `example-v20-full.php`.
- **v2.1** -- adiciona o primitivo de tabela de dados (`collection`,
  `matrix`, subtipos `matrix-singletree`; `dt_add_row`, `dt_edit_cell`,
  agregações, commit transacional). Referência:
  `example-v21-data-table.php`.
- **v2.2** -- LANÇADO em 2026-05-10. `NAC.register` agora é um validador
  estrito (`manifest_role_unknown`, `tab_id_manifest_role_drift`,
  `manifest_dom_role_mismatch`). Novo helper `NAC.bindAction(el, handler,
  ctx)` incorpora o contrato `nac:action:succeeded` ao runtime. Nova flag
  `NAC.STRICT_VALIDATION` alterna os resultados entre apenas avisos
  (padrão na 2.2) e lançamento de exceções (padrão na 2.3). **É isso que
  `npm install @nac3/runtime` instala hoje.**
  Veja `docs/NAC_V22_ROADMAP.md` para o changelog completo.
- **v2.3** -- em planejamento. O padrão de `STRICT_VALIDATION` muda para
  `true`. Companion `NAC.bindTab(el, handler, ctx)` para widgets de aba.
  Opt-in opcional: despacho de chat em streaming.

## Por onde começar

- Execute as demos em `yujin.app/nac-spec/` (qualquer navegador, qualquer dispositivo).
- Leia `SPEC.md` para o contrato completo.
- Leia `guides/REACT.md` se você adotar a partir do React.
- Leia `guides/LLM_WIRING.md` se você conectar seu próprio intermediário LLM.
- Leia `SECURITY.md` antes de implantar o NAC3 em um contexto multi-tenant.

## Governança

O NAC3 é atualmente administrado pela Yujin. A spec está sob a licença Apache 2.0;
o runtime de referência está sob a licença MIT. A Yujin se compromete a transferir o NAC3 para
uma fundação neutra (grupo comunitário W3C, Linux Foundation
ou organismo setorial equivalente) caso e quando a adoção justificar
uma governança neutra. Até lá, as mudanças na spec seguem o processo RFC
em `CONTRIBUTING.md` com um período de comentários públicos de
pelo menos 14 dias para qualquer alteração na API pública ou no
formato de wire.

O licenciamento Apache 2.0 + MIT garante que a spec e o
runtime sobrevivam a qualquer mudança no status corporativo da Yujin.
Adotantes podem fazer fork de qualquer um, executar qualquer um e distribuir qualquer um, hoje
e após a Yujin deixar de existir.

## Autoria

O NAC3 é criado e mantido pela Yujin (rpaforce.com).
Apache-2.0. Contribuições são bem-vindas -- veja `CONTRIBUTING.md`.

---

*This is a machine translation of the canonical English
version at `/nac-spec/ABOUT.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
