---
translation_source: docs/TESTER_CHECKLIST_VISUAL.md
translation_source_hash: 096be2111afd4470edb63fbb0001b20e678a6720201334fc1622bed3a4d434fb
translation_quality: machine_v1
translation_lang: pt
translation_date: 2026-05-11T13:20:28.395521+00:00
---

# NAC3 v2.2 -- Checklist do testador: layout visual / front-end

**Para:** o testador humano avaliando a aparência e sensação visual.
**Tempo:** ~30 minutos.
**Pré-requisito:** qualquer navegador moderno (Chrome recomendado).

## Como usar esta checklist

Para cada tarefa:

1. Abra a URL indicada.
2. Observe a página com calma. Aguarde 30-60 segundos antes de julgar.
3. Compare com a lista "O que avaliar".
4. Marque `[X]` em **OK** se tudo estiver bom.
5. Marque `[X]` em **PRECISA CORRIGIR** se algo parecer ruim / quebrado / amador.
6. SEMPRE escreva pelo menos 1 frase no campo de Comentários, mesmo marcando OK -- descreva o que viu e como se sentiu.
7. Se notar algo que não está na lista de avaliação, escreva nos Comentários também. O campo de Comentários é a parte mais importante desta checklist.

Seja honesto, não educado. Um "precisa corrigir" com um comentário real é mais útil do que 10 "OK" marcados por reflexo.

---

## Seção 1 -- Página inicial (a porta de entrada)

### Tarefa V1 -- Primeira impressão da página inicial

a) Abra o Chrome em modo anônimo e acesse `https://yujin.app/nac-spec/`.
b) Observe a página por 30 segundos sem rolar.
c) Imagine que você chegou pelo Twitter pela primeira vez.
d) **O que avaliar:**
- A área hero (topo da página) deixa claro o que é o NAC3 em menos de 10 segundos de leitura?
- A identidade visual sumi-e japonesa está visível sem ser excessiva?
- A fonte é legível? O contraste é bom?
- Há lugares óbvios para clicar em seguida (Demo, Docs, etc.)?
- Parece profissional ou amador?

- [ ] OK -- parece profissional, mensagem clara
- [ ] PRECISA CORRIGIR
Comentários (obrigatório): _______________________________
_______________________________

### Tarefa V2 -- Espaçamento e ritmo

a) Role a página inicial lentamente do topo até o fim.
b) Preste atenção no ritmo vertical: as seções estão separadas de forma limpa ou se misturam?
c) **O que avaliar:**
- Espaço em branco adequado entre as seções (nem muito apertado, nem muito esparso)?
- Os títulos das seções se destacam do texto do corpo?
- As linhas de texto são confortáveis de ler (nem muito largas, nem muito estreitas)?
- Nenhum elemento parece ter "vazado" para fora do seu contêiner?

- [ ] OK
- [ ] PRECISA CORRIGIR
Comentários: _______________________________
_______________________________

### Tarefa V3 -- Seção "Made with NAC3"

a) Role até encontrar a seção "Made with NAC3".
b) Observe os 4 cards na grade.
c) **O que avaliar:**
- Todos os 4 cards têm o mesmo tamanho visual?
- Os caracteres japoneses no topo de cada card parecem intencionais ou aleatórios?
- Cada card é legível -- título, descrição e seta de link estão claros?
- A seção transmite a sensação de adotantes de prestígio ou de conteúdo de preenchimento?

- [ ] OK
- [ ] PRECISA CORRIGIR
Comentários: _______________________________
_______________________________

### Tarefa V4 -- Seção de lista de espera Forge + Pilot

a) Role até "Coming Q3 2026: Yujin Forge + Pilot".
b) Observe os 2 cards de produto + o formulário de e-mail abaixo.
c) **O que avaliar:**
- Os dois níveis de preço ($19 e $5) são visualmente distintos?
- As listas de funcionalidades dos produtos (marcadores) são fáceis de escanear?
- O formulário de e-mail está limpo -- sem poluição visual?
- O texto de aviso sobre BYOK é legível, mas sem chamar atenção excessiva?
- O botão "Notify me" é óbvio e parece clicável?

- [ ] OK
- [ ] PRECISA CORRIGIR
Comentários: _______________________________
_______________________________

### Tarefa V5 -- Governança + rodapé

a) Role até o final da página.
b) Observe a seção "Open standard, open governance" + o rodapé.
c) **O que avaliar:**
- O texto de governança é legível e transmite confiança?
- O rodapé é minimalista (kanji, licença, link do GitHub, link da Yujin, versão)?
- Nada no rodapé parece quebrado ou desalinhado?

- [ ] OK
- [ ] PRECISA CORRIGIR
Comentários: _______________________________
_______________________________

---

## Seção 2 -- Visual dos demos

### Tarefa V6 -- Demo Vanilla (example.php)

a) Acesse `https://yujin.app/nac-spec/example.php`.
b) Observe a página sem interagir.
c) **O que avaliar:**
- Os 27 widgets se encaixam de forma coerente ou parecem jogados juntos?
- As cores são consistentes (paleta sumi-e ou caótica)?
- Os botões parecem clicáveis (elevados, coloridos, bem espaçados)?
- Os campos de entrada parecem preenchíveis (o cursor claramente pousaria neles)?
- As abas (se houver) parecem abas?

- [ ] OK
- [ ] PRECISA CORRIGIR
Comentários: _______________________________
_______________________________

### Tarefa V7 -- Demo v20-full

a) Acesse `https://yujin.app/nac-spec/example-v20-full.php`.
b) Preste atenção especial ao "v20-panel", geralmente no canto superior direito.
c) **O que avaliar:**
- O v20-panel está visível imediatamente (não oculto, não cortado)?
- Os botões do painel (describe_v2, validate_global_v2, etc.) são legíveis e distintos?
- O painel não parece "colado" -- se encaixa visualmente na página?

- [ ] OK
- [ ] PRECISA CORRIGIR
Comentários: _______________________________
_______________________________

### Tarefa V8 -- Demo de tabela de dados (v21)

a) Acesse `https://yujin.app/nac-spec/example-v21-data-table.php`.
b) Observe as abas + a tabela de dados dentro delas.
c) **O que avaliar:**
- A aba ativa é visualmente distinta das abas inativas?
- As linhas da tabela alternam cores (zebra) para facilitar a leitura?
- Os cabeçalhos das colunas se destacam das linhas de dados?
- Os botões de ação como "adicionar linha" são fáceis de encontrar?
- O painel de chat não sobrepõe nem oculta a tabela?

- [ ] OK
- [ ] PRECISA CORRIGIR
Comentários: _______________________________
_______________________________

### Tarefa V9 -- Demo de interoperabilidade (v22)

a) Acesse `https://yujin.app/nac-spec/example-v22-interop.php`.
b) Observe os dois mini-apps lado a lado.
c) **O que avaliar:**
- Os dois lados estão claramente separados (borda, cor ou espaçamento)?
- Os 4 CTAs (Export tree, Import remote, etc.) estão visíveis no topo?
- Após clicar em um CTA, o painel de saída exibe o feedback claramente?
- A aparência transmite a sensação de "dois apps" e não de "uma página confusa"?

- [ ] OK
- [ ] PRECISA CORRIGIR
Comentários: _______________________________
_______________________________

### Tarefa V10 -- Demos React + Angular

a) Abra `https://yujin.app/nac-spec/demos/react/` e `https://yujin.app/nac-spec/demos/angular/` em duas abas.
b) Compare-os lado a lado.
c) **O que avaliar:**
- Parecem o mesmo app implementado em 2 frameworks (consistência)?
- Ambos têm uma UI de Todos limpa: campo de entrada + botão + lista?
- Ambos têm um painel de chat funcionando?
- Nenhum apresenta bugs visuais óbvios (sobreposições, texto cortado, cores erradas)?

- [ ] OK
- [ ] PRECISA CORRIGIR
Comentários: _______________________________
_______________________________

---

## Seção 3 -- Visual do painel de chat

### Tarefa V11 -- Layout do painel de chat

a) Na página inicial, abra o painel de chat (clique na bolha se estiver recolhido).
b) Redimensione a janela do navegador: estreita (estilo celular, ~400px de largura) e larga (desktop, 1400px).
c) **O que avaliar:**
- Em telas largas: o painel de chat está ancorado à direita e não comprime o conteúdo?
- Em telas estreitas: o painel de chat ocupa toda a largura OU flutua de forma sensata?
- O botão de microfone está sempre visível (nunca cortado)?
- O botão Enviar está sempre clicável?
- As bolhas de mensagem (quando há mensagens) distinguem claramente usuário de assistente?

- [ ] OK
- [ ] PRECISA CORRIGIR
Comentários: _______________________________
_______________________________

### Tarefa V12 -- Legibilidade do chat

a) Digite e envie 3 mensagens. Aguarde as respostas.
b) Role pela conversa.
c) **O que avaliar:**
- As mensagens do usuário e do assistente são visualmente distintas?
- Respostas longas (com vários parágrafos) são paginadas / roláveis de forma limpa?
- Blocos de código nas respostas (se houver) estão formatados claramente?
- O tamanho da fonte é confortável (nem muito pequeno, nem muito grande)?

- [ ] OK
- [ ] PRECISA CORRIGIR
Comentários: _______________________________
_______________________________

---

## Seção 4 -- Mobile / responsividade

### Tarefa V13 -- Mobile em modo retrato

a) Em um celular (ou no modo mobile do DevTools do navegador configurado como iPhone), acesse `https://yujin.app/nac-spec/`.
b) Role a página inteira.
c) **O que avaliar:**
- Não há barra de rolagem horizontal (a largura da página se encaixa)?
- Todos os botões são acessíveis com o polegar (não muito pequenos)?
- O texto é legível sem precisar dar zoom?
- Imagens / GIFs (se houver) não quebram o layout?

- [ ] OK
- [ ] PRECISA CORRIGIR
Comentários: _______________________________
_______________________________

### Tarefa V14 -- Tablet em modo paisagem

a) Em um tablet (ou DevTools no modo iPad paisagem), abra a página inicial.
b) Observe como o layout aproveita a largura maior.
c) **O que avaliar:**
- Layouts de múltiplas colunas são ativados em telas mais largas?
- A página NÃO permanece estreita (~600px) em uma tela de 1024px?
- O espaço em branco está equilibrado, sem parecer estranho?

- [ ] OK
- [ ] PRECISA CORRIGIR
Comentários: _______________________________
_______________________________

---

## Seção 5 -- Sensação subjetiva

### Tarefa V15 -- Estética geral

a) Sem pensar demais, navegue pela página inicial + 2 demos.
b) Avalie a sensação nestas dimensões:

| Dimensão | 1 (ruim) - 5 (ótimo) |
|----------|----------------------|
| Profissional vs. amador | __ |
| Identidade visual sumi-e integrada naturalmente | __ |
| Hierarquia visual clara | __ |
| Escolhas de cores coerentes | __ |
| Tipografia legível e com bom gosto | __ |
| Sinal de confiança (você levaria este produto a sério?) | __ |

Comentários: _______________________________
_______________________________

### Tarefa V16 -- Uma coisa a mudar

Se você pudesse mudar UMA coisa visual em todo o site para melhorá-lo mais, o que seria?

Sua resposta (obrigatória, 1-3 frases): _______________________________
_______________________________
_______________________________

### Tarefa V17 -- Uma coisa a manter

Qual UMA escolha visual do site mais impressiona você e deve ser mantida?

Sua resposta (obrigatória): _______________________________
_______________________________

### Tarefa V18 -- Julgamento de confiança

a) Imagine que você é um CTO vendo isso pela primeira vez.
b) Você confiaria suficientemente na empresa por trás disso para considerar adotar o NAC3 em produção?
c) **Por quê ou por que não?**

- [ ] Sim, confiaria
- [ ] Não, não confiaria (ainda)
Por quê: _______________________________
_______________________________

### Tarefa V19 -- Comparação com concorrentes

Comparado a outras páginas iniciais de padrões abertos / ferramentas para desenvolvedores (ex.: Anthropic, Vercel, Linear, Notion), o site do NAC3 parece:

- [ ] Melhor
- [ ] No mesmo nível
- [ ] Abaixo
- [ ] Muito abaixo

O que especificamente: _______________________________
_______________________________

### Tarefa V20 -- Campo de feedback livre

Qualquer coisa que você notou e que não se encaixou em nenhuma tarefa acima. Bugs, textos estranhos, espaçamentos esquisitos, links quebrados, fluxos confusos, oportunidades perdidas. Escreva tudo.

_______________________________
_______________________________
_______________________________
_______________________________
_______________________________
_______________________________
_______________________________
_______________________________

---

## APROVAÇÃO FINAL (avaliação visual)

```
Release tag:        v____._.___
Nome do testador:   ______________________________
Data:               ____-____-____
Navegador:          [ ] Chrome  [ ] Firefox  [ ] Safari  [ ] Edge
Dispositivo:        [ ] Desktop  [ ] Tablet  [ ] Celular

Avaliação visual geral (1-10): __

Top 3 problemas visuais a corrigir (ordem de prioridade):
1. _______________________________
2. _______________________________
3. _______________________________

Veredicto para o lançamento:
[ ] visual está pronto para lançar
[ ] visual precisa de ajustes, mas não é bloqueante
[ ] visual está bloqueando -- não lançar ainda

Assinatura: ______________________________
```

---

## Veja também

- `TESTER_CHECKLIST_VOICE_CHAT.md` -- avaliação específica de voz + chat.
- `TESTER_CHECKLIST_VISUAL.es.md` -- versão em espanhol.
- `HUMAN_OK_CHECKLIST_TESTER.md` -- checklist funcional geral.

---

*This is a machine translation of the canonical English
version at `/nac-spec/docs/TESTER_CHECKLIST_VISUAL.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
