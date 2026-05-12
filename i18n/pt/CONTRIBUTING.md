---
translation_source: CONTRIBUTING.md
translation_source_hash: 15fa7e8a34cc86e6193de8cd9826a9bd98d4b3ac1c72a43646521d75f88f9a26
translation_quality: machine_v1
translation_lang: pt
translation_date: 2026-05-11T12:49:28.195844+00:00
---

# Contribuindo para o NAC3

**Versão da spec:** 2.2 stable (+ preview de interoperabilidade v2.3).

## Governança

O NAC3 é atualmente mantido por Yujin. A spec está sob Apache 2.0;
o runtime de referência está sob MIT. Yujin se compromete a migrar o NAC3 para
uma fundação neutra (grupo comunitário W3C, Linux Foundation ou
equivalente) caso e quando a adoção justificar uma governança neutra.
Até lá, mudanças na spec seguem o processo de RFC abaixo, com pelo menos
14 dias de comentário público para qualquer alteração na API pública
ou nos formatos de wire.

O licenciamento Apache 2.0 + MIT garante que a spec e o
runtime sobrevivam a qualquer mudança no status corporativo de Yujin. Forks
são explicitamente bem-vindos sob ambas as licenças.

---

Obrigado por considerar uma contribuição. O NAC3 é uma spec pública mais uma
implementação de referência; ambas aceitam contribuições.

## Três tipos de contribuição

### 1. Mudança na spec (RFC obrigatório)

Edições em `SPEC.md`, `ABOUT.md` ou `docs/NAC_V*_ROADMAP.md` são
mudanças de spec. Antes de abrir um PR:

1. Abra uma issue no GitHub com o título `RFC: <resumo em uma linha>`.
2. Descreva a classe do problema (qual bug ou limitação ele corrige,
   idealmente com uma reprodução concreta).
3. Descreva a mudança de contrato proposta.
4. Descreva o caminho de migração para os adotantes existentes.
5. Aguarde pelo menos uma resposta de um mantenedor na issue antes
   de abrir o PR.

PRs de spec que chegarem sem uma issue de RFC vinculada serão fechados
com um apontamento para esta seção.

### 2. Mudança no runtime de referência

Edições em `js/nac.js`, `js/nac-v2-extensions.js` ou
`js/nac-chat-client.js`. PRs são bem-vindos sem RFC se:

- A mudança for uma correção de bug que alinha o runtime com a
  spec atual.
- A mudança for uma melhoria de desempenho sem delta comportamental.
- A mudança for de documentação, tipos ou cobertura de testes.

PRs que alterem o comportamento do runtime de forma que afete o contrato
da spec DEVEM ser acompanhados de um RFC de spec primeiro.

### 3. Demo, ferramentas ou melhoria de documentação

Edições em `example*.php`, `tools/`, `guides/` ou qualquer markdown
que não seja de spec. PR direto. Mantenha as mudanças mínimas; preferimos
dez PRs pequenos a um grande.

## Estilo de código

- Arquivos-fonte somente ASCII (o projeto é implantado no GoDaddy; PHP
  8.3 rejeita caracteres não-ASCII mesmo em comentários). Use `--` para travessões,
  não `--`.
- JS: sem transpilador, sem bundler, sem etapa de build nos arquivos de runtime.
  ES2018+ puro. O pacote npm adiciona um wrapper ESM/CJS
  em torno do mesmo código-fonte.
- PHP: mantenha heredocs simples (apenas `{$var}`, sem expressões).
- Comentários: explique o PORQUÊ, não o O QUÊ. O diff já mostra o o quê.
- Testes: toda mudança comportamental deve vir acompanhada de um teste que falha
  antes e passa depois. Execute `make test-launch` a partir da raiz do repositório
  antes de fazer push.

## Estilo de commit

- Assunto com menos de 70 caracteres, imperativo no presente.
  "fix(nac): treat tab role drift as register-time error", não
  "Fixed tab thing".
- O corpo explica o problema, a causa e a correção. Cite
  commits relacionados pelo SHA abreviado.
- Trailer de co-autor para commits assistidos por IA é permitido; não
  ocultamos ferramentas.

## Revisão

- PRs de correção de bug: 1 aprovador, merge.
- PRs de runtime/spec: 1 aprovador + CI verde, merge.
- PRs de mudança de spec: issue de RFC vinculada com discussão + 1 aprovador
  + CI verde + janela de comentários de 7 dias após a abertura do PR.

## Licenciamento

Ao submeter um PR, você licencia sua contribuição sob Apache-2.0
para corresponder ao projeto. O template de PR inclui uma caixa de seleção; marque-a.

## Código de conduta

Seja tecnicamente correto, breve e gentil. Discordância é bem-vinda; ataques
pessoais não são. Os mantenedores podem fechar threads ou revogar acesso de commit
em caso de violações repetidas.

## Onde fazer perguntas

- GitHub Discussions para perguntas de design, "devo usar o NAC3 para
  isso?" e showcases.
- GitHub Issues para relatos de bugs.
- `nac@yujin.dev` para divulgações de segurança (consulte `SECURITY.md`).

---

*This is a machine translation of the canonical English
version at `/nac-spec/CONTRIBUTING.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
