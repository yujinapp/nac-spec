---
translation_source: docs/HUMAN_OK_CHECKLIST_TESTER.md
translation_source_hash: afd5ee5c709c7453a6d7017cf1114562eda10b3a6adfad54f3403d0f405b564a
translation_quality: machine_v1
translation_lang: pt
translation_date: 2026-05-11T13:18:46.530232+00:00
---

# NAC3 v2.2 -- Lista de verificação do testador (Inglês)

**Para:** o testador humano que está conduzindo a revisão do release.
**Tempo:** ~60-90 minutos para uma passagem completa.
**Última atualização:** 2026-05-11.

## Instruções para o testador

Para cada tarefa abaixo:

1. Leia os passos a, b, c, d em ordem.
2. Execute exatamente o que o passo a diz, depois b, depois c.
3. Compare o que você vê/ouve com o "Resultado esperado" no passo d.
4. Se o resultado corresponder exatamente: marque `[X]` na caixa de seleção **OK**.
5. Se o resultado NÃO corresponder: marque `[X]` na caixa de seleção **ERRO** E escreva o que realmente aconteceu na linha "Comentários".

Não pule tarefas. Se uma tarefa falhar, continue para a próxima (não pare). As tarefas com falha são corrigidas após a passagem completa.

Ao terminar, assine no final e envie o arquivo de volta.

---

## Seção 1 -- Smoke test da página inicial (Chrome)

### Tarefa 1

a) Abra o Chrome no modo anônimo (Ctrl+Shift+N).
b) Digite na barra de endereços: `https://yujin.app/nac-spec/` e pressione Enter.
c) Aguarde 5 segundos sem clicar em nada.
d) **Resultado esperado:** A página carrega. No topo da página aparece um ícone sumi-e (pincel japonês) e o título "NAC -- Native Agent Contract". Nenhuma mensagem de erro em vermelho aparece na tela. A página não está em branco.

- [ ] OK
- [ ] ERRO
Comentários: _______________________________

### Tarefa 2

a) Pressione a tecla F12 para abrir as ferramentas de desenvolvedor do navegador.
b) Clique na aba "Console" dentro das ferramentas de desenvolvedor.
c) Aguarde 3 segundos.
d) **Resultado esperado:** A área do Console não possui linhas de erro em vermelho. (Avisos em amarelo são aceitáveis; apenas linhas vermelhas indicam falha.)

- [ ] OK
- [ ] ERRO
Comentários: _______________________________

### Tarefa 3

a) Feche as ferramentas de desenvolvedor (F12 novamente).
b) Role a página para baixo até encontrar uma seção intitulada "Made with NAC3".
c) Observe os cards nessa seção.
d) **Resultado esperado:** Você vê pelo menos 4 cards em uma grade: "Yujin CRM", "Reference demos", "Cal.com (coming)" e "Your app". Cada card possui um símbolo de caractere japonês no topo, um título, uma descrição curta e um link com uma seta `->`.

- [ ] OK
- [ ] ERRO
Comentários: _______________________________

### Tarefa 4

a) Role a página para baixo até encontrar uma seção intitulada "Coming Q3 2026: Yujin Forge + Pilot".
b) Localize o campo de e-mail que exibe "you@example.com".
c) Digite seu e-mail real nesse campo.
d) **Resultado esperado:** As duas caixas de seleção "Forge ($19)" e "Pilot ($5)" estão ambas marcadas por padrão. Há um botão azul com o rótulo "Notify me".

- [ ] OK
- [ ] ERRO
Comentários: _______________________________

### Tarefa 5

a) Clique no botão "Notify me".
b) Aguarde 5 segundos.
c) Leia qualquer mensagem que apareça ao lado do botão.
d) **Resultado esperado:** Uma mensagem aparece dizendo "Got it. You will hear from us when Forge + Pilot launch." OU "Submission failed -- email hello@yujin.app instead." Qualquer uma das mensagens é aceitável; ambas indicam que o formulário está funcionando.

- [ ] OK
- [ ] ERRO
Comentários: _______________________________

---

## Seção 2 -- Comando de voz no demo de data-table

### Tarefa 6

a) No mesmo navegador, acesse: `https://yujin.app/nac-spec/example-v21-data-table.php`
b) Aguarde 5 segundos para a página carregar completamente.
c) Observe a página.
d) **Resultado esperado:** Você vê um demo de data-table com pelo menos 3 abas no topo: "Lines (collection)", "Permissions" e mais uma. Há um painel de chat no lado direito da tela.

- [ ] OK
- [ ] ERRO
Comentários: _______________________________

### Tarefa 7

a) Localize o botão de microfone na parte inferior do painel de chat (geralmente um ícone circular com símbolo de microfone).
b) Clique nele. Seu navegador pode solicitar permissão para usar o microfone; conceda-a.
c) Fale claramente no microfone do seu computador: **"ve a permisos"** (em espanhol: "ir para permissões").
d) **Resultado esperado:** Em 3-5 segundos, a aba ativa muda de "Lines (collection)" para "Permisos" ou "Permissions". O painel de chat exibe as palavras transcritas.

- [ ] OK
- [ ] ERRO
Comentários: _______________________________

### Tarefa 8

a) Clique no botão de microfone novamente.
b) Fale claramente: **"go to permissions"** (desta vez em inglês).
c) Aguarde a resposta do sistema.
d) **Resultado esperado:** A aba "Permissions" permanece ativa ou é reativada. O chat reflete a entrada em inglês.

- [ ] OK
- [ ] ERRO
Comentários: _______________________________

### Tarefa 9

a) Clique no botão de microfone novamente.
b) Fale claramente: **"cambia de pestana"** (em espanhol: "trocar de aba" -- a palavra "de" é a preposição em espanhol).
c) Aguarde a resposta.
d) **Resultado esperado:** O idioma do chat NÃO muda para alemão. O painel de chat pode trocar de aba OU fazer uma pergunta de esclarecimento, mas o idioma permanece em espanhol/inglês -- não em alemão. (Esta é a verificação de regressão para um bug antigo.)

- [ ] OK
- [ ] ERRO
Comentários: _______________________________

---

## Seção 3 -- Estudo de caso React

### Tarefa 10

a) Acesse: `https://yujin.app/nac-spec/demos/react/`
b) Aguarde 5 segundos.
c) Observe a página.
d) **Resultado esperado:** Você vê um app "Todos": campo de entrada no topo, botão "Add" ao lado e uma área de lista vazia abaixo. Um painel de chat existe no lado direito.

- [ ] OK
- [ ] ERRO
Comentários: _______________________________

### Tarefa 11

a) Clique no campo de entrada.
b) Digite a palavra **"milk"** (ou qualquer palavra curta).
c) Clique no botão "Add".
d) **Resultado esperado:** Um novo item de tarefa aparece na área da lista, exibindo "milk" com uma caixa de seleção ao lado.

- [ ] OK
- [ ] ERRO
Comentários: _______________________________

### Tarefa 12

a) No painel de chat, localize o botão de microfone.
b) Clique nele e fale: **"agrega pan"** (em espanhol: "adicionar pão").
c) Aguarde 5 segundos.
d) **Resultado esperado:** Um novo item de tarefa aparece na lista, exibindo "pan" ou "bread". A lista agora contém pelo menos 2 itens.

- [ ] OK
- [ ] ERRO
Comentários: _______________________________

### Tarefa 13

a) Clique no microfone novamente.
b) Fale: **"borra leche"** (em espanhol: "deletar leite").
c) Aguarde 5 segundos.
d] **Resultado esperado:** O item "milk" desaparece da lista. Apenas "pan/bread" permanece.

- [ ] OK
- [ ] ERRO
Comentários: _______________________________

## Seção 4 -- Estudo de caso Angular

### Tarefa 14

a) Navegue para: `https://yujin.app/nac-spec/demos/angular/`
b) Aguarde 5 segundos.
c) Observe a página.
d) **Resultado esperado:** Igual ao demo React (Tarefa 10): aplicativo "Todos" com campo de entrada, botão Adicionar, lista vazia e painel de chat.

- [ ] OK
- [ ] ERRO
Comentários: _______________________________

### Tarefa 15

a) Repita as tarefas 11, 12 e 13 neste demo Angular (adicione "leite" por texto, depois adicione "pão" por voz, depois exclua "leite" por voz).
b) Observe o resultado das três ações.
c) Compare com o comportamento do demo React.
d) **Resultado esperado:** As três ações funcionam exatamente igual ao demo React.

- [ ] OK
- [ ] ERRO
Comentários: _______________________________

---

## Seção 5 -- Teste básico entre navegadores

### Tarefa 16

a) Abra o Firefox (ou instale-o em mozilla.org caso não o tenha).
b) Navegue para `https://yujin.app/nac-spec/` no Firefox.
c) Aguarde 5 segundos.
d) **Resultado esperado:** Igual à Tarefa 1: página carrega, ícone sumi-e visível, sem erros.

- [ ] OK
- [ ] ERRO
Comentários: _______________________________

### Tarefa 17

a) No Firefox, navegue para `https://yujin.app/nac-spec/example-v21-data-table.php`
b) Clique em cada uma das abas visíveis (Lines, Permissions e quaisquer outras).
c) Observe o conteúdo da tabela mudar.
d) **Resultado esperado:** Cada clique em uma aba altera a área de conteúdo abaixo das abas. Nenhum erro aparece. Nenhuma aba fica "travada".

- [ ] OK
- [ ] ERRO
Comentários: _______________________________

### Tarefa 18

a) Abra o Safari (somente Mac) OU o Edge (Windows).
b) Navegue para `https://yujin.app/nac-spec/`
c) Aguarde 5 segundos.
d) **Resultado esperado:** Igual à Tarefa 1.

- [ ] OK
- [ ] ERRO
Comentários: _______________________________

---

## Seção 6 -- Navegação apenas por teclado (sem mouse)

### Tarefa 19

a) Abra `https://yujin.app/nac-spec/` em qualquer navegador.
b) Coloque o mouse de lado; NÃO o toque durante esta tarefa.
c) Pressione a tecla Tab repetidamente (cerca de 15 vezes).
d) **Resultado esperado:** Um destaque de "anel de foco" azul/colorido visível percorre diferentes elementos da página (links, botões). O foco é sempre visível -- ele nunca desaparece nem fica "preso" em um ponto invisível.

- [ ] OK
- [ ] ERRO
Comentários: _______________________________

### Tarefa 20

a) Continue navegando com Tab até chegar à área do painel de chat.
b) Pressione Tab até alcançar o campo de entrada do chat (você deve ver um anel de foco ao redor dele).
c) Digite "hello" com o teclado.
d) Pressione Enter.
d) **Resultado esperado:** O chat envia "hello" e exibe uma resposta em 5 a 10 segundos. Nenhum mouse foi usado em nenhum momento.

- [ ] OK
- [ ] ERRO
Comentários: _______________________________

---

## Seção 7 -- Leitor de tela (NVDA no Windows, VoiceOver no Mac)

Esta seção é opcional caso você não tenha NVDA ou VoiceOver. Pule para a Seção 8 se não estiver disponível.

### Tarefa 21 (somente Windows)

a) Instale o NVDA em https://www.nvaccess.org/download/ (é gratuito).
b) Inicie o NVDA (Ctrl+Alt+N).
c) Abra `https://yujin.app/nac-spec/` com o monitor desligado (ou de olhos fechados).
d) **Resultado esperado:** O NVDA lê o título da página e anuncia um esboço estruturado -- você pode navegar pressionando a tecla H para pular entre os títulos. Você consegue ouvir claramente o que cada título diz.

- [ ] OK
- [ ] ERRO
Comentários: _______________________________

### Tarefa 22 (somente Mac)

a) Pressione Cmd+F5 para iniciar o VoiceOver. (Ou Configurações do Sistema -> Acessibilidade -> VoiceOver.)
b) Abra `https://yujin.app/nac-spec/`
c) Pressione VO+A (Ctrl+Alt+A) para ler a página de cima a baixo.
d) **Resultado esperado:** O VoiceOver lê a página em uma ordem lógica. A leitura faz sentido semântico (por exemplo, "título nível 1, NAC", "link, Abrir demo vanilla", "botão, Notifique-me") -- e não "div, div, div, link, link, botão".

- [ ] OK
- [ ] ERRO
Comentários: _______________________________

---

## Seção 8 -- Chat multilíngue (10 idiomas)

### Tarefa 23

a) Navegue para `https://yujin.app/nac-spec/example-v21-data-table.php`
b) No painel de chat, localize o seletor de idioma (geralmente uma pequena bandeira ou indicador "lang"). Mude para Português (pt).
c) Clique no botão do microfone e fale: **"vai para permissoes"** (português para "ir para permissões").
d) **Resultado esperado:** A aba Permissions é ativada. O chat responde em português.

- [ ] OK
- [ ] ERRO
Comentários: _______________________________

### Tarefa 24

a) Mude o idioma do chat para Francês (fr).
b) Clique no microfone e fale: **"va aux permissions"** (francês para "ir para permissões").
c) Aguarde a resposta.
d) **Resultado esperado:** A aba Permissions é ativada. O chat responde em francês.

- [ ] OK
- [ ] ERRO
Comentários: _______________________________

### Tarefa 25 (opcional, pule se não falar nenhum desses idiomas)

Repita a tarefa 23/24 para qualquer um dos seguintes: Alemão (de), Italiano (it), Japonês (ja), Chinês (zh), Hindi (hi), Árabe (ar). Use a frase equivalente nesse idioma.

d) **Resultado esperado:** Cada idioma testado aciona a mudança correta de aba.

- [ ] OK
- [ ] ERRO
- [ ] Pulado (não falo nenhum desses idiomas)
Comentários: qual(is) idioma(s) testado(s) + resultado _______________________________

---

## Seção 9 -- Alto contraste + zoom

### Tarefa 26

a) Abra `https://yujin.app/nac-spec/`
b) Pressione Ctrl++ (Ctrl e a tecla de mais) até o nível de zoom atingir 200%.
c) Role por toda a página.
d) **Resultado esperado:** Todo o texto é legível. Os botões permanecem clicáveis. Nenhum texto é cortado ou se sobrepõe a outros elementos. Nenhuma barra de rolagem horizontal aparece em nenhum momento.

- [ ] OK
- [ ] ERRO
Comentários: _______________________________

### Tarefa 27 (somente Windows)

a) Pressione Alt Esquerdo + Shift Esquerdo + Print Screen para ativar o modo de Alto Contraste do Windows.
b) Alterne para o seu navegador.
c) Observe a página.
d) **Resultado esperado:** A página continua funcionando. O texto está visível (branco sobre preto ou contraste similar). Os botões têm bordas visíveis. Os links estão visíveis. Nada fica invisível.

Após esta tarefa, pressione o mesmo atalho de teclado para desativar o alto contraste.

- [ ] OK
- [ ] ERRO
Comentários: _______________________________

---

## Seção 10 -- Verificação de implantação (URLs respondem)

### Tarefa 28

Para cada URL abaixo, abra-a no navegador. Verifique se ela carrega (sem 404, sem página em branco).

| URL | OK? |
|-----|-----|
| https://yujin.app/nac-spec/ | [ ] |
| https://yujin.app/nac-spec/SPEC.md | [ ] |
| https://yujin.app/nac-spec/js/nac.js | [ ] |
| https://yujin.app/nac-spec/js/nac-chat-client.js | [ ] |
| https://yujin.app/nac-spec/example.php | [ ] |
| https://yujin.app/nac-spec/example-v21-data-table.php | [ ] |
| https://yujin.app/nac-spec/example-v22-interop.php | [ ] |
| https://yujin.app/nac-spec/demos/react/ | [ ] |
| https://yujin.app/nac-spec/demos/angular/ | [ ] |

Se alguma URL falhar: _______________________________

- [ ] Todas OK
- [ ] Pelo menos um ERRO (veja as notas acima)

---

## APROVAÇÃO FINAL

```
Tag de release testada:  v____._.___
Nome do testador:        ______________________________
Data do teste:           ____-____-____
Navegadores usados:      [ ] Chrome  [ ] Firefox  [ ] Safari  [ ] Edge
Sistema operacional:     [ ] Windows  [ ] macOS  [ ] Linux
Leitor de tela testado: [ ] NVDA  [ ] JAWS  [ ] VoiceOver  [ ] Nenhum
Total de tarefas feitas: ___ de 28
Tarefas com ERRO:        ___

Assinatura: _______________________________
```

Envie este arquivo preenchido ao mantenedor.

---

## Veja também

- [HUMAN_OK_CHECKLIST.md](HUMAN_OK_CHECKLIST.md) -- a versão técnica desta lista de verificação para desenvolvedores.
- [HUMAN_OK_CHECKLIST_TESTER.es.md](HUMAN_OK_CHECKLIST_TESTER.es.md) -- versão em espanhol.
- [ACCESSIBILITY.md](ACCESSIBILITY.md) -- o compromisso de acessibilidade.

---

*This is a machine translation of the canonical English
version at `/nac-spec/docs/HUMAN_OK_CHECKLIST_TESTER.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
