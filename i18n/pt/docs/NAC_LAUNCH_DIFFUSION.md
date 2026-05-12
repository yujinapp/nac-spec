---
translation_source: docs/NAC_LAUNCH_DIFFUSION.md
translation_source_hash: cbdf7b9e5ec3ed43a39111aab16fbe59c222a05a835429ea43148036320fc5cf
translation_quality: machine_v1
translation_lang: pt
translation_date: 2026-05-11T13:44:18.390375+00:00
---

# Plano de difusão do lançamento do NAC3

Um guia prático para colocar o NAC3 na frente das pessoas que
deveriam estar usando-o. Escrito em 2026-05-10 para o lançamento
da v2.2 / v2.3-preview.

## O que estamos lançando

- **Spec:** v2.2 estável, v2.3 preview (primitiva de editor de campo).
- **Runtime:** `@nac3/runtime@2.2.0` no npm (ESM + CJS + d.ts + CLI).
- **Demos:** quatro demos ao vivo em yujin.app/nac-spec/.
- **Guias de adoção:** React + Angular + integração com LLM.
- **Casos de estudo:** apps funcionais com Vite + React 18 e Angular 17 em
  `packages/nac-react-demo` + `packages/nac-angular-demo`.
- **História de migração brownfield:** o próprio Yujin CRM, documentado
  em pkuschnirof/yujin docs/MIGRATION_FROM_RPAFORCE.md.
- **Conformidade NAC-3:** a própria landing page é compatível com NAC-3
  (manifest + chat + autopilot + isTrusted-aware).

## Mensagens

### Frase de impacto

> **NAC3 -- a pequena spec pública que permite que UIs web sejam controladas por agentes de IA,
> runners de voz e ferramentas de acessibilidade sem código de integração por app.**

### Três frases

> NAC3 é o que ARIA teria sido se tivesse sido projetado em
> 2026 com LLMs em mente. Decore sua UI existente com três
> atributos HTML; o runtime resolve nomes + despacha cliques
> + emite eventos de conclusão + lida com localização + fornece
> proveniência. Apache-2.0, npm install, sem mudanças no processo de build.

### Pitch de 30 segundos

> Assistentes de voz, agentes de chat com LLM e ferramentas de acessibilidade enfrentam
> o mesmo problema: precisam de nomes estáveis para os elementos
> nos quais querem agir. Seletores CSS quebram. ARIA para em "isso
> é um botão". Cada equipe constrói a mesma infraestrutura do zero.
>
> NAC3 é o pequeno contrato que resolve isso. Você adiciona `data-nac-id`,
> `data-nac-role`, `data-nac-action` aos elementos que um agente
> deve controlar; o runtime cuida do resto. Há uma
> spec v2.2 funcional, um pacote npm estável, guias para React + Angular,
> e quatro demos ao vivo, incluindo um integrado de ponta a ponta a
> um backend de chat Claude Sonnet com o qual você pode conversar agora mesmo.
>
> É Apache-2.0. Criamos porque rodamos um CRM que precisava
> disso. Agora você também pode usar.

## Públicos-alvo

| Público | Canal | Gancho |
|---------|-------|--------|
| Devs de React + Vue + Svelte + Angular | dev.to, Hashnode, r/javascript, r/webdev | "Controle seu app React existente por voz em 80 linhas" |
| Criadores de voz + agentes | r/LocalLLaMA, r/ChatGPTCoding, Discords de criadores de agentes | "Um padrão que faltava para o lado do usuário em apps de voz" |
| Defensores de acessibilidade | r/Accessibility, listas de e-mail de a11y, palestrantes de meetups de A11y | "ARIA projetado em 2026 com LLMs em mente" |
| Engenheiros de teste/QA | r/qualityassurance, comunidades de Selenium / Playwright | "Seletores estáveis que sobrevivem a redesigns de UI" |
| HN | news.ycombinator.com | o Show HN canônico |
| Tech leads + CTOs | LinkedIn, Mastodon | o ângulo "você vai adicionar isso em 12 meses de qualquer forma" |
| Usuários do Yujin CRM | e-mail direto + banner no produto | "seu CRM fala NAC3; veja o que isso significa" |

## Canais + exemplos de posts

### Show HN

- **Título:** `Show HN: NAC -- a small public spec that lets web UIs be driven by AI agents`
- **Primeira linha:** "We made this while building Yujin CRM and realised every team trying to ship voice/agent UI rebuilds the same plumbing."
- **Corpo:** explicar o contrato (3 atributos + manifest + eventos), linkar o demo ao vivo, linkar a spec, linkar o pacote npm, linkar o caso de estudo React. Manter abaixo de 200 palavras. Threads de comentários atraem mais atenção do que posts longos.
- **Dia:** terça ou quarta de manhã (horário dos EUA). Evitar segundas + sextas.
- **Acompanhamento:** estar nos comentários por pelo menos 4 horas; responder a todas as perguntas técnicas; não responder a provocações.

### r/javascript

- **Título:** `[Showoff] NAC: drive your React app with voice + chat using 3 HTML attributes`
- **Corpo:** focar em "o que o desenvolvedor React faz" -- exemplos de código de `guides/REACT.md`. Linkar o diretório do caso de estudo no GitHub.

### r/Accessibility

- **Título:** `NAC: a parallel layer to ARIA for AI-agent-driven UI`
- **Corpo:** começar com "isso NÃO é um substituto para ARIA, é um complemento" -- a comunidade de acessibilidade é protetora, com razão. Mostrar como `data-nac-role="action"` e `role="button"` coexistem.

### dev.to

- **Título:** `Drive any web UI by voice with @nac3/runtime`
- **Gancho:** o repositório do caso de estudo React. Screenshots/gifs inline do painel de chat + o tour de autopilot.
- **Tamanho:** 1500-2000 palavras. Passo a passo.

### Twitter / X

Uma thread de 6 tweets:

1. "Acabamos de lançar o NAC3 v2.2 -- uma spec pública + pacote npm que permite que UIs web sejam controladas por agentes de IA. Apache-2.0. (gif do demo)"
2. "Por quê: cada equipe que constrói UX de voz/agente reconstrói a mesma infraestrutura. Seletores CSS quebram. ARIA não foi feito para agentes. Precisávamos de um pequeno contrato."
3. "Quão pequeno: 3 atributos HTML por elemento. (screenshot de código)"
4. "O que você ganha: nomes estáveis, eventos de conclusão determinísticos, i18n para 10 locales de fábrica, proveniência via HMAC + isTrusted, validação automática."
5. "Demo ao vivo em yujin.app/nac-spec -- quatro demos, um integrado a um backend de chat Claude Sonnet. Converse com ele."
6. "Guias de adoção para React + Angular + casos de estudo funcionais em github.com/yujinapp/nac-spec. Spec em yujin.app/nac-spec/SPEC.md."

### LinkedIn

Post longo (~600 palavras). Apostar no ângulo "você vai adicionar isso em 12 meses de qualquer forma"; apelar para CTOs avaliando sua estratégia de agentes. Incluir um screenshot do tour de autopilot em formato BPMN.

### Mastodon

Repostar a thread do Twitter, manter conciso. Incluir alt-text em todas as imagens (isso importa lá).

## Plano de gif/vídeo de demo

### Gif (15 segundos, em loop)

Cena 1 (4s): usuário digita "agrega tomar agua" no campo de chat do
demo React.
Cena 2 (3s): o LLM resolve; o todo é adicionado com um
destaque piscante.
Cena 3 (4s): usuário clica em "tour"; o autopilot percorre a página,
narrando.
Cena 4 (4s): usuário segura o microfone, diz "remove all done", os todos
são removidos.

Hospedado como MP4 de 8MB + fallback WebP de 4MB em
`yujin.app/nac-spec/assets/demo.{mp4,webp}`. Usado como gif hero do README,
imagem OG, Twitter card, cabeçalho do dev.to.

### Vídeo (90 segundos, narração)

Publicado no YouTube + Vimeo.
- 0:00-0:10 -- o problema ("voz + agentes precisam de nomes estáveis").
- 0:10-0:25 -- o contrato (3 atributos).
- 0:25-0:45 -- demo de adoção (caso de estudo React, 5 linhas adicionadas).
- 0:45-1:05 -- controle via chat + voz + autopilot.
- 1:05-1:20 -- exemplo brownfield do Yujin CRM.
- 1:20-1:30 -- "Apache-2.0, npm install @nac3/runtime, links abaixo."

## Cadência de acompanhamento

| Tempo | Ação |
|-------|------|
| Dia 0 | Show HN + r/javascript + thread no Twitter + artigo no dev.to. Responder a comentários por 4-8 horas. |
| Dia 1 | Post no LinkedIn. Responder a comentários no dev.to. Adicionar issues fáceis levantadas ao backlog do GitHub. |
| Dia 3 | Post no r/Accessibility + repost no Mastodon. |
| Dia 7 | Post de blog "Reflexão da semana 1": feedback recebido, o que mudamos, principais issues abertas no GitHub. |
| Dia 14 | Entrar em contato com pessoas específicas de acessibilidade / criadores de agentes que engajaram no dia 0 com um DM "quer conversar?". |
| Dia 30 | Lançar um patch v2.2.x com as correções mais solicitadas pela comunidade. Post de anúncio: "o que 30 dias nos ensinaram sobre o NAC3". |
| Dia 90 | NAC3 v2.3 lançado (editor de campo canônico, STRICT_VALIDATION padrão true). Novo pulso de lançamento, menor alcance. |

## Métricas a acompanhar

- Downloads semanais do `@nac3/runtime` no npm.
- Stars + forks no GitHub em `yujinapp/nac-spec` e
  `pkuschnirof/yujin`.
- Visualizações da página de demo em yujin.app/nac-spec/ (logs de acesso do servidor).
- Número de issues abertas no GitHub (proxy de engajamento).
- Número de comentaristas únicos nos canais acima.
- Tendência de busca por "Native Agent Contract" (Google Trends).

Metas para a semana 1:
- 200 downloads no npm
- 100 stars no GitHub entre os dois repositórios
- 5000 visualizações da página de demo
- 10 issues / discussões abertas
- 1 post de blog não solicitado por alguém de fora

Se ficarmos 50%+ abaixo dessas metas, as mensagens precisam de ajuste; iterar
o texto do post no LinkedIn + dev.to e tentar novamente no dia 14.

## Checklist pré-lançamento (antes de clicar em publicar)

- [ ] `npm publish @nac3/runtime@2.2.0` concluído (isso é **manual**;
      requer token npm do proprietário).
- [ ] `npm install @nac3/runtime` funciona a partir de um diretório tmp limpo.
- [ ] Demos ao vivo carregam sem erros de console no Chrome + Firefox + Safari.
- [ ] `validate_global({probe: true})` retorna `[]` na landing.
- [ ] Gif de demo renderiza nos cards de preview do dev.to + Twitter.
- [ ] `LICENSE`, `CONTRIBUTING`, `SECURITY` todos no lugar.
- [ ] Pelo menos uma issue aberta no GitHub com o label "good first issue"
      para que contribuidores que chegarem no dia 1 tenham por onde começar.
- [ ] Pablo está acordado + pronto para responder comentários por 4 horas.

## Anti-objetivos

O que NÃO faremos:

- Pagar por anúncios (pelo menos até que as métricas da semana 4 estejam disponíveis).
- Falar mal de ARIA, Selenium, Playwright ou qualquer fornecedor de agentes.
  NAC3 é aditivo, não adversarial.
- Prometer contratos de suporte enterprise no lançamento (esses vêm
  depois que soubermos a carga de suporte).
- Open-source-washing: o código É Apache-2.0, E a implementação de referência
  do backend de chat também é. Não separamos funcionalidades "core" de "premium"
  como vantagem competitiva -- a vantagem é hospedagem + créditos de LLM + operações.

## Playbook do dia do lançamento

Com tempo limitado porque Pablo toca isso sozinho:

| Horário | Ação |
|---------|------|
| 06:00 (US ET) | Smoke final: `npm test` + `npx @nac3/runtime validate yujin.app/nac-spec/` + abrir todos os demos em modo anônimo. Corrigir o que estiver quebrado. |
| 09:00 | Show HN publicado. |
| 09:05 | Thread no Twitter publicada. |
| 09:15 | Post no r/javascript publicado. |
| 09:30 | Artigo no dev.to publicado. |
| 09:30-13:30 | Ao vivo nos comentários do HN. Fixar um comentário no topo com links rápidos. |
| 14:00 | Post no LinkedIn. |
| 14:00-18:00 | Ao vivo nos comentários do dev.to + menções no Twitter. |
| 18:00 | Parar. Descansar. |
| Dia 1 09:00 | r/Accessibility + Mastodon. Triagem de issues no GitHub. |

---

*This is a machine translation of the canonical English
version at `/nac-spec/docs/NAC_LAUNCH_DIFFUSION.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
