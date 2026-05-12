---
translation_source: docs/HUMAN_OK_CHECKLIST.md
translation_source_hash: 2b87f1b0665762daf6be1ad520c7ba16f977d21771e6574ae60451039baada31
translation_quality: machine_v1
translation_lang: pt
translation_date: 2026-05-11T13:41:47.884672+00:00
---

# NAC3 -- Checklist de aprovação humana (Human OK)

**Versão da spec:** 2.2 + prévia v2.3.
**Última execução:** 2026-05-11 (atualizar a cada release).
**Objetivo:** forma executável da coluna MAN em
[TEST_COVERAGE_MATRIX.md](TEST_COVERAGE_MATRIX.md). Um humano
percorre cada item abaixo e marca a caixa. Se qualquer item falhar,
o release NÃO é publicado -- registre um bug e corrija antes de tentar novamente.

Este documento NÃO substitui os testes automatizados. A suíte automática
(`bash tools/nac/test-launch.sh`) DEVE estar verde antes de você iniciar
este checklist. O checklist existe para tudo que a automação
não consegue verificar: áudio real, sensação cross-browser, fraseado de falante nativo,
handshake cross-origin com um peer real, polimento visual.

---

## Como usar este documento

1. Abra uma janela anônima (Chrome + Firefox + Safari, nessa
   ordem; repita as seções visuais para cada um).
2. Percorra as seções em ordem -- algumas dependem de uma
   seção anterior estar ativa (ex.: interop precisa que ambas as demos
   tenham carregado).
3. Marque cada `[ ]` somente quando você pessoalmente confirmar. Não
   delegue. Se tiver dúvida, marque `[?]` e consulte o responsável pela spec.
4. Ao final, assine e date o bloco SIGN-OFF.
5. Faça commit do arquivo com o novo carimbo de data da execução.

Tempo estimado por passagem: **45-60 minutos**. Não se apresse; o
objetivo deste gate é justamente cobrir o que a automação não alcança.

---

## 1. Artefatos de runtime

### 1.1 Smoke cross-browser -- `js/nac.js` + `nac-v2-extensions.js`

Para cada navegador (Chrome, Firefox, Safari):

- [ ] Abra `https://yujin.app/nac-spec/example.php` em
      modo anônimo.
- [ ] O console não apresenta nenhum erro após 5 segundos.
- [ ] `NAC.describe().plugins[0]` retorna um objeto no
      console.
- [ ] `NAC.list_registered_plugins()` retorna pelo menos um
      slug.
- [ ] Clique em um botão decorado com `data-nac-role="action"`
      -- ele funciona E um evento `nac:action:succeeded` é disparado
      (escute via `document.addEventListener` no console).

### 1.2 Cliente de chat ao vivo -- `nac-chat-client.js`

- [ ] Em `example-v21-data-table.php`, pressione o botão do microfone.
- [ ] Diga "ve a permisos" -- o chat despacha uma troca de aba,
      não uma resposta em texto livre.
- [ ] Repita em inglês ("go to permissions") + português
      ("vai para permissoes") -- despacho correto.
- [ ] Diga "cambia de pestaña" -- o locale NÃO muda para
      alemão (guarda de regressão para V22-03).

### 1.3 Runtime de interop -- `nac-mcp-interop.js`

- [ ] Abra `example-v22-interop.php`.
- [ ] Use os 4 CTAs em ordem: Export tree -> Import remote ->
      List remote apps -> Disconnect remote.
- [ ] Cada CTA registra sucesso no seu painel de saída.
- [ ] Após Disconnect, o app remoto não aparece mais em
      `NAC.list_remote_apps()`.

---

## 2. Pacote NPM

### 2.1 Smoke de instalação limpa

- [ ] Em um diretório temporário:
      ```
      mkdir /tmp/nac-smoke && cd /tmp/nac-smoke
      npm init -y
      npm install @nac3/runtime
      node -e "import('@nac3/runtime').then(m => console.log(Object.keys(m)))"
      ```
- [ ] A saída inclui `NAC`, `registerPlugin`, validators.
- [ ] Nenhum aviso de deprecação durante a instalação.

### 2.2 Validador CLI em um projeto externo

- [ ] Escolha qualquer projeto não-Yujin que você tenha (uma demo de
      adoção, ou qualquer pasta).
- [ ] Execute `npx @nac3/runtime validate .` a partir da raiz do projeto.
- [ ] A saída é legível por humanos, lista 0 BLOCKERS, encerra com código 0 em
      projetos limpos / código diferente de zero quando há achados.

---

## 3. Demos

### 3.1 Landing -- `index.html`

- [ ] A página renderiza com a identidade visual sumi-e, sem FOUC.
- [ ] Clique em "Autopilot" -- o tour de 5 segundos é executado, narração
      audível (TTS, não silenciosa).
- [ ] Abra o chat -- digite "que es NAC3?" -- obtenha uma resposta
      coerente, não um erro.

### 3.2 Demo de referência -- `example.php`

- [ ] Percorra cada um dos 27 widgets visíveis na página.
- [ ] Zero erros no console após a passagem completa.
- [ ] Zero widgets sem resposta (nenhum clique que não faça nada).

### 3.3 Demo brownfield -- `example-v20-full.php`

- [ ] `v20-panel` está visível no canto superior direito após o carregamento da página.
- [ ] Clique em "describe_v2" -- o painel exibe saída JSON válida.
- [ ] Clique em "validate_global_v2" -- o painel exibe achados
      (ou "0 findings, OK").
- [ ] Clique em cada um dos 6 botões no v20-panel -- todos
      emitem `nac:action:succeeded` (visível no console se o
      listener estiver anexado).
- [ ] Botão istrusted_fake -- o ack NÃO é disparado (o
      runtime rejeita corretamente cliques sintéticos para
      verbos com gate isTrusted).
- [ ] Botão istrusted_real (clique humano real) -- o ack É
      disparado.

### 3.4 Showcase de primitivos -- `example-v20-primitives-showcase.php`

- [ ] Cada um dos 8 primitivos renderiza uma seção com um
      exemplo funcional.
- [ ] O texto didático em cada seção está correto
      (sem placeholders corrompidos).

### 3.5 Demo de data-table -- `example-v21-data-table.php`

- [ ] Pressione o microfone, diga "agrega una linea con concepto leche
      cantidad 2 precio 100" -- uma linha aparece na
      tabela de coleção.
- [ ] Diga "cuanto total hay?" -- o chat responde com um
      número, não com a tabela bruta.
- [ ] Diga "ve a permisos" -- a aba muda.

### 3.6 Demo de interop -- `example-v22-interop.php`

- [ ] Já coberto no item 1.3 acima.
- [ ] Bônus: abra a página em duas abas do navegador, repita o
      handshake -- deve funcionar entre abas (cada
      aba é sua própria instância NAC, a camada de interop é a
      ponte).

### 3.7 Estudo de caso React -- `demos/react/`

- [ ] Abra `https://yujin.app/nac-spec/demos/react/`.
- [ ] Digite "leche" na caixa de texto, clique em "Add" -- o todo
      aparece.
- [ ] Abra o chat, diga (via microfone) "agrega pan" -- o todo "pan"
      aparece pelo caminho acionado pelo chat. Este é o
      guarda de regressão para o bug #2 do estudo de caso.
- [ ] Diga "borra leche" -- o todo "leche" desaparece.

### 3.8 Estudo de caso Angular -- `demos/angular/`

- [ ] Mesmas 4 verificações do React, em
      `/nac-spec/demos/angular/`.

---

## 4. Documentação

Para cada um dos documentos abaixo, leia do início ao fim pelo menos uma vez por
release trimestral. Verifique:

- O carimbo de versão está atualizado (v2.2).
- Nenhum link interno quebrado.
- Nenhum TODO pendente.
- Os trechos de código compilam / executam conforme mostrado.

- [ ] `SPEC.md` (contrato canônico).
- [ ] `ABOUT.md`.
- [ ] `CONTRIBUTING.md`.
- [ ] `SECURITY.md` -- mais releitura trimestral do modelo de ameaças.
- [ ] `README_DEMOS.md`.
- [ ] `docs/NAC_V22_ROADMAP.md`.
- [ ] `docs/NAC_TEST_MANUAL.md`.
- [ ] `docs/NAC_INTEROP_MCP.md`.
- [ ] `docs/NAC_LAUNCH_DIFFUSION.md`.
- [ ] `docs/CASE_STUDIES_DISCOVERY.md`.
- [ ] `docs/TEST_COVERAGE_MATRIX.md` (esta matriz é o documento irmão).
- [ ] `docs/VOICE_CHAT_ERROR_ANALYSIS_2026_05_09.md`.

---

## 5. Guias de adoção

Para cada guia, verifique se o trecho hello-world ainda compila
e se os passos conduzem um leitor iniciante a uma instalação funcional:

- [ ] `guides/REACT.md` -- trecho compila com Vite + React 18.
- [ ] `guides/ANGULAR.md` -- trecho compila com Angular 17
      standalone.
- [ ] `guides/LLM_WIRING.md` -- o backend de referência Node inicializa
      e o teste de contrato de exemplo passa.
- [ ] `guides/AI_PLAYBOOK_NEW_PROJECT.md` -- as asserções dos passos
      ainda correspondem à API de runtime.
- [ ] `guides/AI_PLAYBOOK_MIGRATION.md` -- idem.
- [ ] `guides/IMPACT_TESTING.md` -- números revisados para
      atualidade (verificar a cada trimestre).
- [ ] `guides/IMPACT_RPA.md` -- idem.
- [ ] `guides/RPA_UIPATH.md` -- executar o exemplo `InvoiceFromCSV.xaml`
      uma vez (ou seu equivalente na versão mais recente do UiPath
      Studio).
- [ ] `guides/RPA_AUTOMATION_ANYWHERE.md` -- workflow de exemplo
      equivalente.
- [ ] `guides/RPA_BLUE_PRISM.md` -- estudo de objeto de exemplo
      equivalente.

---

## 6. Suítes de teste

- [ ] Executar `bash tools/nac/test-launch.sh` -- TODOS VERDES em
      menos de 15s.
- [ ] Inspecionar o contador de smoke (`36 PASS`) -- confere com
      o total esperado.
- [ ] Abrir `packages/nac/test/fixtures/voice/` -- selecionar 1
      arquivo por locale (10 arquivos no total) -- reproduzir no
      player de áudio -- audível e inteligível.
- [ ] Verificar aleatoriamente 2 prompts LLM de
      `stage3-backend.mjs` -- as respostas fazem sentido, sem
      desvios.
- [ ] Executar a suíte Playwright com `--headed` uma vez
      (`npx playwright test --headed`) -- observar visualmente a UI
      de cada spec durante a execução.
- [ ] Executar `bash tools/nac/discovery-loop.sh 1` -- uma rodada
      completa com 0 ocorrências.

---

## 7. Pacotes de casos de estudo

- [ ] `packages/nac-react-demo/` compila sem erros
      (`npm run build`).
- [ ] O dist React implantado se comporta de forma idêntica ao
      build local.
- [ ] `packages/nac-angular-demo/` compila sem erros.
- [ ] O dist Angular implantado se comporta de forma idêntica.

---

## 8. Aspectos transversais

### 8.1 i18n

- [ ] Escolher um locale (rotacionar a cada release) -- enviar para um
      falante nativo para verificação pontual de 10 strings aleatórias.
- [ ] O validador confirma 0 chaves ausentes em todos os 10
      locales (`NAC.validate_global({locale: 'all'})`).

### 8.2 HMAC + proveniência

- [ ] Executar o smoke multi-tenant contra o tenant de staging --
      a assinatura do manifesto é verificada, sem erros de
      `provenance_mismatch` nos logs.

### 8.3 Controle isTrusted

- [ ] Em `example-v20-full.php`, o teste lado a lado de istrusted_real vs
      istrusted_fake (coberto em 3.3 acima) PASSA no diff visual:
      o real dispara ack, o falso não dispara.

### 8.4 Interoperabilidade cross-origin (prévia v2.3)

- [ ] Pelo menos UM teste cross-origin antes de declarar v2.3
      GA: abrir a demo de interoperabilidade contra um peer NAC3 remoto
      hospedado em uma origem diferente, bearer token real,
      preflight CORS real. O roundtrip é concluído com sucesso.

### 8.5 Implantação

- [ ] Após o push do release, executar curl nestas URLs e confirmar
      200 + conteúdo correto:
      - `https://yujin.app/nac-spec/index.html`
      - `https://yujin.app/nac-spec/SPEC.md`
      - `https://yujin.app/nac-spec/js/nac.js`
      - `https://yujin.app/nac-spec/js/nac-chat-client.js`
      - `https://yujin.app/nac-spec/example.php`
      - `https://yujin.app/nac-spec/example-v21-data-table.php`
      - `https://yujin.app/nac-spec/example-v22-interop.php`
      - `https://yujin.app/nac-spec/demos/react/`
      - `https://yujin.app/nac-spec/demos/angular/`

### 8.6 Áudio real

- [ ] Hardware real (microfone + alto-falante do laptop) -- pressionar o
      microfone no `example-v21-data-table.php` ao vivo, falar um
      prompt por locale (10 prompts no total) -- o despacho LLM
      faz sentido em todos os locales.

---

## 9. Verificação com leitor de tela (acessibilidade -- Track G7)

Esta seção percorre as demos com um leitor de tela ativado +
monitor desligado (ou olhos literalmente fechados). É o critério
de aprovação para o compromisso de acessibilidade em
[ACCESSIBILITY.md](ACCESSIBILITY.md).

Realize esta seção em pelo menos DOIS leitores de tela por release
(NVDA é a entrada mais fácil no Windows; VoiceOver vem
pré-instalado no macOS; JAWS se você tiver licença).

### 9.1 NVDA (Windows)

- [ ] Instalar o NVDA (gratuito, nvaccess.org). Iniciar com
      Ctrl+Alt+N.
- [ ] Abrir `https://yujin.app/nac-spec/index.html` com o
      monitor desligado (ou olhos fechados).
- [ ] NVDA anuncia o título da página + um esboço estruturado
      de cabeçalhos (h1, h2, h3) ao navegar com a tecla H.
- [ ] A tecla Tab alcança todos os controles interativos em uma
      ordem lógica; cada controle anuncia claramente seu papel +
      rótulo.
- [ ] Abrir o painel de chat (NVDA lê que o campo de entrada do chat tem
      role=textbox com um rótulo claro).
- [ ] Digitar "que es NAC3?" + enviar -- NVDA lê a resposta
      completa quando ela chega.

### 9.2 NVDA em `example-v21-data-table.php`

- [ ] NVDA anuncia "Lines (collection) tab" + a aba Permissions
      na navegação por Tab.
- [ ] Ativar uma aba anuncia o novo estado via o ack do evento
      `nac:tab:activated`.
- [ ] Quando o LLM adiciona uma linha, NVDA lê o conteúdo da nova
      linha sem solicitação (ou com uma única seta para baixo).

### 9.3 VoiceOver (macOS)

- [ ] Cmd+F5 para iniciar o VoiceOver.
- [ ] Abrir `https://yujin.app/nac-spec/index.html`.
- [ ] VO+U abre o rotor; verificar se cabeçalhos, links e controles
      de formulário estão preenchidos.
- [ ] VO+A lê a página inteira de cima a baixo -- faz sentido
      semanticamente, não "div div div link link button".

### 9.4 VoiceOver nos casos de estudo React + Angular

- [ ] Em `demos/react/`: adicionar um todo via campo de entrada
      usando apenas teclado + VoiceOver. O novo todo é
      anunciado ao ser adicionado (o evento ack está conectado).
- [ ] Em `demos/angular/`: mesmo teste, mesma expectativa.

### 9.5 Navegação apenas por teclado (sem leitor de tela, apenas sem
mouse)

- [ ] Desconectar/desabilitar o mouse.
- [ ] Percorrer a página inicial usando apenas a tecla Tab. Cada ponto
      de foco é visível (anel de foco presente).
- [ ] Abrir o painel de chat via teclado, digitar um prompt,
      enviar. O resultado é narrado / exibido corretamente.
- [ ] Escape fecha qualquer modal que tenha sido aberto.
- [ ] Sem armadilhas de teclado (Tab eventualmente cicla de volta ao
      topo).

### 9.6 Alto contraste + zoom a 200%

- [ ] Zoom do navegador a 200% na página inicial. O layout NÃO
      quebra, sem rolagem horizontal, sem sobreposição de texto.
- [ ] Modo de alto contraste do Windows (ou Aumentar Contraste do
      macOS). Botões, links e anéis de foco permanecem
      visíveis.

### 9.7 Controle por voz (o caso recursivo)

- [ ] Em um navegador equipado com Pilot (ou usando o botão de microfone
      do `nac-chat-client.js` de referência), controlar as demos
      apenas por voz.
- [ ] O botão de microfone anuncia seu estado ao NVDA/VoiceOver
      ("gravação iniciada", "gravação encerrada").
- [ ] Comandos de voz despachados via NAC3 têm efeito; o
      ack é anunciado ao leitor de tela.

### 9.8 Problemas de acessibilidade encontrados

Liste aqui quaisquer problemas encontrados nesta seção, com severidade:

```
-
-
-
```

Se algum problema de severidade BLOQUEANTE estiver em aberto, o release NÃO
é publicado até que seja resolvido.

---

## APROVAÇÃO FINAL

```
Tag do release:         v____._.___
Verificado por:         ______________________
Verificado em:          ____-____-____
Navegadores usados:     [ ] Chrome  [ ] Firefox  [ ] Safari
Falantes nativos consultados (locale -> nome):
   ____________________________________________
Total de itens verificados:  ___ / ___
Itens com falha (listar com links de bugs):
   ____________________________________________
   ____________________________________________
Assinatura:             ______________________
```

Faça o commit deste arquivo com o bloco de APROVAÇÃO FINAL preenchido para marcar o
release como "aprovado por humano".

---

## Veja também

- [TEST_COVERAGE_MATRIX.md](TEST_COVERAGE_MATRIX.md) -- a
  matriz da qual este checklist deriva.
- [NAC_TEST_MANUAL.md](NAC_TEST_MANUAL.md) -- o playbook upstream
  para adotantes.
- [COVERAGE_REPORT_2026_05_10.md](COVERAGE_REPORT_2026_05_10.md)
  -- o registro de cobertura automática para o release atual.

## Licença

Apache-2.0.

---

*This is a machine translation of the canonical English
version at `/nac-spec/docs/HUMAN_OK_CHECKLIST.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
