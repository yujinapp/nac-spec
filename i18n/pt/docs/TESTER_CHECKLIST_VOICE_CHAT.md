---
translation_source: docs/TESTER_CHECKLIST_VOICE_CHAT.md
translation_source_hash: 8a27543feff39f34b78b01fceec66d117fae27d4d9e6d4a8f74eef3c71e5982d
translation_quality: machine_v1
translation_lang: pt
translation_date: 2026-05-11T13:19:29.819474+00:00
---

# NAC3 v2.2 -- Checklist do testador: voz + chat

**Para:** o testador humano focado no comportamento de voz + chat.
**Tempo:** ~30-45 minutos.
**Pré-requisito:** microfone funcionando + alto-falantes/fones de ouvido.

## Instruções

Para cada tarefa:

1. Leia os passos a, b, c, d em ordem.
2. Execute exatamente o que o passo a diz, depois b, depois c.
3. Compare o que você vê/ouve com o "Resultado esperado" em d.
4. Marque `[X]` em **OK** se corresponder; marque `[X]` em **ERRO** + escreva o que realmente aconteceu.
5. Não pule etapas. Se uma tarefa falhar, continue para a próxima.

---

## Seção A -- Noções básicas do painel de chat

### Tarefa A1 -- Abrir o painel de chat

a) Abra o Chrome em modo anônimo (Ctrl+Shift+N).
b) Acesse `https://yujin.app/nac-spec/`.
c) Localize o painel de chat (geralmente uma bolha circular no canto inferior direito; clique para expandir). Se já estiver expandido, pule este clique.
d) **Resultado esperado:** Um painel de chat abre no lado direito da tela. Ele contém: um cabeçalho com o texto "Yujin chat", um seletor de idioma dropdown, uma caixa de entrada de texto na parte inferior, um botão Enviar e um botão de microfone ao lado da entrada.

- [ ] OK
- [ ] ERRO
Comentários: _______________________________

### Tarefa A2 -- Enviar uma pergunta por texto

a) Clique na caixa de entrada do chat.
b) Digite: `que es NAC3?`
c) Clique no botão Enviar (ou pressione Enter).
d) **Resultado esperado:** Em 5 a 15 segundos, o chat exibe uma resposta em espanhol (porque a mensagem foi enviada em espanhol). A resposta explica o que é o NAC3. A resposta tem pelo menos 2 frases. Nenhuma mensagem de erro em vermelho aparece.

- [ ] OK
- [ ] ERRO
Comentários: _______________________________

### Tarefa A3 -- Enviar outra pergunta em inglês

a) No mesmo chat, digite: `how do I install NAC3?`
b) Pressione Enter.
c) Aguarde a resposta.
d) **Resultado esperado:** A resposta retorna em inglês. Ela menciona `npm install @nac3/runtime` ou um comando de instalação similar.

- [ ] OK
- [ ] ERRO
Comentários: _______________________________

---

## Seção B -- Entrada por voz (microfone)

### Tarefa B1 -- Primeira ativação do microfone (concessão de permissão)

a) Clique no botão de microfone ao lado da entrada do chat.
b) O navegador solicitará permissão para o microfone. Clique em "Permitir".
c) Observe o estado visual do botão.
d) **Resultado esperado:** O botão do microfone muda de aparência (cor, animação ou ícone) para indicar que está ouvindo ativamente. Pode aparecer um indicador visível de "gravação".

- [ ] OK
- [ ] ERRO
Comentários: _______________________________

### Tarefa B2 -- Falar em espanhol

a) Com o microfone ativo, fale claramente: **"hola"** (apenas uma palavra).
b) Após ~2 segundos de silêncio, a gravação para automaticamente (ou clique no botão do microfone novamente para parar).
c) Aguarde 3 a 5 segundos.
d) **Resultado esperado:** O painel de chat exibe a palavra transcrita "hola" (ou algo próximo). Uma resposta do chat aparece em espanhol em até 10 segundos.

- [ ] OK
- [ ] ERRO
Comentários: _______________________________

### Tarefa B3 -- Voz em inglês

a) Clique no botão do microfone novamente.
b) Fale claramente: **"what is NAC3"**.
c) Aguarde a resposta.
d) **Resultado esperado:** A transcrição exibe "what is NAC3" (ou algo próximo). Resposta em inglês.

- [ ] OK
- [ ] ERRO
Comentários: _______________________________

### Tarefa B4 -- TTS (text-to-speech): reprodução de áudio

a) Após a resposta da Tarefa B3 aparecer, ouça atentamente seus alto-falantes.
b) Preste atenção durante os 5 segundos após a resposta aparecer no chat.
d) **Resultado esperado:** Uma voz clara em inglês lê a resposta em voz alta pelos seus alto-falantes. A voz soa natural (não robótica ou truncada).

- [ ] OK
- [ ] ERRO
- [ ] Nenhum áudio ouvido
Comentários: _______________________________

---

## Seção C -- Despacho de voz na demo de tabela de dados

### Tarefa C1 -- Carregar a demo de tabela de dados

a) Acesse `https://yujin.app/nac-spec/example-v21-data-table.php`.
b) Aguarde 5 segundos para o carregamento completo.
c) Localize o painel de chat e as abas na parte superior da tabela de dados.
d) **Resultado esperado:** A página exibe múltiplas abas (pelo menos "Lines (collection)" e "Permissions"). O painel de chat está visível.

- [ ] OK
- [ ] ERRO
Comentários: _______________________________

### Tarefa C2 -- Trocar de aba por voz (espanhol)

a) Clique no botão do microfone.
b) Fale: **"ve a permisos"**.
c) Aguarde até 5 segundos.
d) **Resultado esperado:** A aba "Permisos" (ou "Permissions") fica ativa. A área de conteúdo visível muda.

- [ ] OK
- [ ] ERRO
Comentários: _______________________________

### Tarefa C3 -- Trocar de aba por voz (inglês)

a) Clique no microfone.
b) Fale: **"go to lines"**.
c) Aguarde.
d) **Resultado esperado:** A aba "Lines (collection)" é ativada.

- [ ] OK
- [ ] ERRO
Comentários: _______________________________

### Tarefa C4 -- Adicionar uma linha por voz

a) Clique no microfone.
b) Fale devagar: **"agrega una linea con concepto leche cantidad dos precio cien"**.
c) Aguarde até 10 segundos.
d) **Resultado esperado:** Uma nova linha aparece na tabela de dados com: conceito = "leche" (ou "milk"), quantidade = 2, preço = 100 (ou interpretação similar).

- [ ] OK
- [ ] ERRO
Comentários: _______________________________

### Tarefa C5 -- Ler agregado por voz

a) Clique no microfone.
b) Fale: **"cuanto total hay?"** (ou "what is the total?").
c) Aguarde a resposta.
d) **Resultado esperado:** O chat responde com um valor numérico correspondente à soma das linhas visíveis. O TTS lê o número em voz alta.

- [ ] OK
- [ ] ERRO
Comentários: _______________________________

---

## Seção D -- Despacho de voz nas demos React + Angular

### Tarefa D1 -- Demo React: adicionar por voz

a) Acesse `https://yujin.app/nac-spec/demos/react/`.
b) Aguarde 5 segundos.
c) Clique no microfone no painel de chat.
d) Fale: **"agrega leche"**.
e) Aguarde 5 segundos.
d) **Resultado esperado:** Um item de tarefa "leche" (ou "milk") aparece na lista de tarefas.

- [ ] OK
- [ ] ERRO
Comentários: _______________________________

### Tarefa D2 -- Demo React: excluir por voz

a) Na mesma demo, clique no microfone.
b) Fale: **"borra leche"**.
c) Aguarde 5 segundos.
d) **Resultado esperado:** O item "leche/milk" desaparece da lista.

- [ ] OK
- [ ] ERRO
Comentários: _______________________________

### Tarefa D3 -- Demo Angular: mesmos fluxos

a) Acesse `https://yujin.app/nac-spec/demos/angular/`.
b) Repita as Tarefas D1 e D2 nesta demo.
c) Compare o comportamento com a demo React.
d) **Resultado esperado:** Comportamento idêntico -- adicionar por voz funciona, excluir por voz funciona.

- [ ] OK
- [ ] ERRO
Comentários: _______________________________

---

## Seção E -- Voz multilíngue (teste apenas os idiomas que você fala)

Para cada idioma que você realmente fala, execute o teste abaixo. Caso contrário, pule.

### Tarefa E1 -- Português

a) Acesse `https://yujin.app/nac-spec/example-v21-data-table.php`.
b) Mude o idioma do chat para "pt" (Português) via o dropdown.
c) Clique no microfone, fale: **"vai para permissoes"**.
d) **Resultado esperado:** A aba de Permissões é ativada. Resposta do chat em português.

- [ ] OK
- [ ] ERRO
- [ ] Pulado (não falo português)
Comentários: _______________________________

### Tarefa E2 -- Francês

a) Mude o idioma para "fr".
b) Fale: **"va aux permissions"**.
c) Observe.
d) **Resultado esperado:** A aba de Permissões é ativada. Resposta em francês.

- [ ] OK
- [ ] ERRO
- [ ] Pulado
Comentários: _______________________________

### Tarefa E3 -- Alemão

a) Mude o idioma para "de".
b) Fale: **"gehe zu berechtigungen"**.
c) Observe.
d) **Resultado esperado:** A aba de Permissões é ativada. Resposta em alemão.

- [ ] OK
- [ ] ERRO
- [ ] Pulado
Comentários: _______________________________

### Tarefa E4 -- Outro (it / ja / zh / hi / ar)

Para qualquer outro idioma que você fale entre {Italiano, Japonês, Chinês, Hindi, Árabe}, execute o mesmo teste com a frase equivalente a "ir para permissões".

- [ ] OK
- [ ] ERRO
- [ ] Pulado
Idioma testado: ______________
Comentários: _______________________________

---

## Seção F -- Armadilha de troca de localidade (proteção contra regressão)

### Tarefa F1 -- A armadilha da preposição "de" (espanhol)

a) Acesse `https://yujin.app/nac-spec/example-v21-data-table.php`.
b) Certifique-se de que o chat está em espanhol ("es") no dropdown de idioma.
c) Clique no microfone, fale: **"cambia de pestana"** (espanhol para "trocar de aba" -- "de" é a preposição em espanhol, NÃO alemão).
d) Aguarde a resposta.
d) **Resultado esperado:** O chat NÃO muda para alemão. O dropdown de idioma permanece em "es". O chat pode responder em espanhol pedindo esclarecimento, ou pode trocar de aba -- ambos são aceitáveis. O resultado proibido é "idioma trocado para alemão".

- [ ] OK (permaneceu em espanhol)
- [ ] ERRO (trocou para alemão -- regressão!)
Comentários: _______________________________

### Tarefa F2 -- Troca de idioma explícita (permitida)

a) Clique no microfone.
b) Fale: **"cambia el idioma a aleman"** (explicitamente "mude o idioma para alemão").
c) Aguarde.
d) **Resultado esperado:** O idioma do chat muda para "de" (alemão). Este É o gatilho legítimo.

- [ ] OK
- [ ] ERRO
Comentários: _______________________________

---

## APROVAÇÃO FINAL (voz + chat)

```
Tag de release:         v____._.___
Nome do testador:       ______________________________
Data:                   ____-____-____
Navegador:              [ ] Chrome  [ ] Firefox  [ ] Safari  [ ] Edge
Mic + alto-falantes OK: [ ] sim  [ ] não
Idiomas testados:       __ , __ , __ , __ , __ , __
Tarefas executadas:     __ de 23
Tarefas marcadas OK:    __
Tarefas marcadas ERRO:  __
Veredicto geral:        [ ] pronto  [ ] precisa de correções  [ ] problemas bloqueantes

Top 3 problemas (se houver):
1. _______________________________
2. _______________________________
3. _______________________________

Assinatura: ______________________________
```

---

## Veja também

- `TESTER_CHECKLIST_VISUAL.md` -- avaliação de layout visual.
- `TESTER_CHECKLIST_VOICE_CHAT.es.md` -- versão em espanhol deste arquivo.
- `HUMAN_OK_CHECKLIST_TESTER.md` -- checklist funcional geral.

---

*This is a machine translation of the canonical English
version at `/nac-spec/docs/TESTER_CHECKLIST_VOICE_CHAT.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
