# Ensaio do beta (passo 7 do roadmap)

Roteiro para testar o ArcanaKin em aparelhos de verdade antes do beta de fevereiro, com o seu
grupo e uma loja de teste. Ele cobre principalmente o que até agora só foi conferido por testes
automáticos, sem um celular na mão. Marque cada item, e anote o que estranhar no **Feedback** do
próprio site ou app (Conta → Feedback): o texto chega no `/admin` com a tela de onde veio.

## Antes de começar

- **Pessoas:** pelo menos **6** (com 4, o top cut não roda). Uma delas faz a loja, outra fica
  sem conta para abrir os links públicos.
- **Aparelhos:** 1 iPhone e 1 Android, cada um com o app no **Expo Go** (até sair o build de
  dezembro) e o site no navegador; **1 iPad** (layout de tablet do app); um computador para o site.
- **Loja de teste:** um admin cria em `/admin` → Lojas, com o e-mail de quem vai ser dona.
- **Servidor:** Blob store público ligado ao projeto (fotos e logo), e-mails pelo Resend.
- **Tempo:** umas 2 horas, de preferência numa noite de jogo de verdade.

## 1. Conta e perfil

- [ ] Entrar com o Google no site e no app; criar uma conta com e-mail e senha (chega o e-mail de
      confirmação?).
- [ ] **Foto do perfil** no site (Configurações) e no app (Conta): escolher, trocar e remover. A
      foto nova aparece no menu do topo, no perfil e no ranking? Uma foto de celular grande (mais
      de 4 MB) sobe sem erro?
- [ ] Sair e entrar de novo com o Google: a foto enviada continua (não volta a do Google)?
- [ ] Idioma e fuso em Configurações; tema claro e escuro.

## 2. Grupo, agenda e encontro

- [ ] Criar o grupo; convidar pelo link (WhatsApp) e pelo código no app.
- [ ] Primeiros passos (onboarding) até o fim; a ajuda abre nas telas certas?
- [ ] Marcar disponibilidade; criar um encontro; confirmar presença pelo app e pelo site.
- [ ] Avisos: push no celular, e-mail e o sino. "Marcar como lida" e "Marcar todas".

## 3. Partida e modo mesa

- [ ] Abrir o **modo mesa** no app a partir do encontro; jogar uma partida curta; encerrar e
      registrar.
- [ ] A partida aparece no encontro, no ranking e nas estatísticas? A janela de conquistas novas
      aparece para quem ganhou alguma?
- [ ] Resumo do encontro: finalizar o encontro e abrir o `/resumo/…` no aparelho sem conta.
- [ ] **Comandantes parceiros:** numa mesa com um deck de dois comandantes, o dano de comandante
      aparece separado por comandante (21 de um só mata; 11 + 11 não)?
- [ ] **Painel:** o destaque mostra as fotos de quem confirmou, o botão dourado "Ver o encontro" e
      "Sua resposta: Vou" como selo (site e app).

## 4. Torneio do grupo

- [ ] **Commander em pods com top cut** (top 4, com 6 ou mais): criar no encontro, inscrever todo
      mundo, começar. Cada pessoa recebe "sua mesa é a N" no sino e no push?
- [ ] Registrar as mesas pelo celular (quem está na mesa) e pelo **modo mesa** do torneio.
- [ ] Depois do suíço, "Começar o top 4": a mesa final tem os 4 primeiros? A classificação vira
      "Classificação do suíço"? Uma correção numa mesa do suíço agora é recusada?
- [ ] Encerrar: o campeão aparece no topo; chegam as conquistas "Estreia em torneio", "No top
      cut" e "Campeão de torneio"?
- [ ] **Link público:** copiar da página do torneio e abrir no aparelho sem conta. Só aparecem
      primeiros nomes? A página se atualiza sozinha (registre uma mesa e espere 30 s)?
- [ ] **Um contra um:** um torneio rápido de Modern (ou Pauper) em **eliminação simples** com 5
      ou 6 pessoas (alguém passa direto na 1ª rodada?) e outro em **todos contra todos** com 4.
      No app, os nomes das fases ("Semifinal", "Final") aparecem?

## 5. Loja de ponta a ponta

- [ ] A dona aceita o convite por e-mail; edita o perfil e envia o **logo** ("Gerenciar a loja").
      O logo aparece na página pública da loja e na tela da loja no app?
- [ ] Convidar alguém para a equipe; a equipe consegue editar e a pessoa de fora não.
- [ ] Criar um **evento de torneio** de Commander com **4 vagas** e premiação em texto.
- [ ] Inscrições: 4 pelo app ("Me inscrever"), a 5ª cai na **lista de espera**. Uma das 4
      desiste: a 5ª recebe "Abriu vaga…" no sino e passa a inscrita?
- [ ] **Código do balcão:** alguém se inscreve digitando o código (no app, Conta → Eventos de
      loja). Um código errado dá uma mensagem clara?
- [ ] No dia: **check-in** de quem chegou; a equipe registra um **convidado** só com o nome.
- [ ] Começar o torneio com **top cut** (só aparecem os tops que cabem em quem fez check-in).
      Mesas registradas pelo app; quem não é da equipe e não está na mesa não registra.
- [ ] A página do evento mostra o torneio ao vivo para quem não tem conta. O aviso de rodada abre
      a página do evento no site e a tela do torneio no app.

## 5b. Lojas e eventos por perto

- [ ] Sem conta, no site: `/lojas`, escolher a cidade (uma vizinha da loja de teste também serve) e ver a loja e os eventos; "Usar minha localização" pede permissão e ordena por distância; "Baixar para a agenda" abre no calendário do celular.
- [ ] No app: Conta → "Lojas e eventos"; escolher a cidade (fica salva) e usar a localização (a permissão explica que ela não é guardada).
- [ ] A página da cidade da loja de teste (`/lojas/em/<uf>/<cidade>`) aparece no Google algumas semanas depois (só confirmar mais tarde).

## 5c. Decks, coleção e leitura pela câmera

- [ ] **Deck do zero** (`/decks/novo`): nome, formato e comandante; nasce como **rascunho**
      (privado, sem entrar na coleção). Publicar pergunta a visibilidade e soma as cartas à
      coleção.
- [ ] **Identidade de cor** (Commander): adicionar uma carta fora das cores avisa antes, com
      "Adicionar mesmo assim" e "Adicionar ao Talvez"; o selo "Fora da identidade" aparece na
      carta e na validação.
- [ ] **Análise em abas** (Visão geral, Mana, Mão inicial, Funções, Bracket) e o endereço muda
      (`?aba=`); **"Sortear mão inicial"** abre a janela, com mulligan de Londres.
- [ ] Opções do deck no menu "Opções do deck" (editar, exportar, imprimir proxies, apagar).
- [ ] No app: capas dos decks com a arte, galeria das cartas com selos (quantidade, proxy,
      foil), brilho nas foil (parado com "reduzir movimento"), custo de mana nas linhas.
- [ ] **Leitura pela câmera** (site no celular, só o seu grupo, flag `card-scanner`): coleção →
      "Adicionar cartas" → "Ler pela câmera"; com a **leitura contínua**, ir trocando as cartas e
      ver cada uma entrar na lista sozinha; conferir edição e foil; "Adicionar N cartas". Testar
      com carta em português, foil e luz fraca, e anotar quantas acertou.

## 5d. Aprender a jogar

- [ ] Trilha "Aprender a jogar" do começo ao fim (lições, botões de avançar, "Voltar" leva ao
      painel); a trilha de **Commander**; o **glossário** com busca; os **desafios**; a
      **primeira mesa** (quem terminou aparece como "pronto para a primeira mesa" no grupo).
- [ ] As conquistas da trilha chegam?

## 5e. iPad (app)

- [ ] Em pé e deitado: painel (números em 4, duas colunas), meus decks (2 ou 3 colunas), um
      deck (análise à esquerda, cartas à direita), coleção (mais cartas por linha), grupo,
      encontros, um encontro, disponibilidade, perfil, um torneio e uma loja. Nada esticado
      numa coluna só? Ranking, conta e ajuda ficam numa largura confortável?
- [ ] No celular, as mesmas telas continuam iguais (o deck com as seções em pilha).

## 5f. Admin (quem está em ADMIN_EMAILS)

- [ ] `/admin` abre em "Métricas do beta"; as abas mudam o endereço (`?aba=`).
- [ ] **Atividade:** depois do ensaio, filtrar pelo seu nome e conferir as entradas (entrar pelo
      site e pelo app, decks, cartas adicionadas, disponibilidade, presença, partidas), agrupadas
      por hora ("adicionou 37 cartas à coleção").
- [ ] **Custos:** lançar o custo do mês (Vercel em dólar, com a cotação da fatura) e ver a meta.

## 6. Acessibilidade (rápido, em 3 telas: encontro, torneio, evento de loja)

- [ ] **VoiceOver** (iPhone) ou **TalkBack** (Android): os botões dizem o que fazem? Os avisos
      (resultado salvo, erro) são lidos?
- [ ] Site só com teclado (Tab, Enter, Esc) e com zoom de 200%; celular com fonte grande.
- [ ] Tema escuro: algum texto apagado demais?

## Telas novas que nunca rodaram num aparelho

Estas só passaram por tipos e testes; capricho redobrado nelas:

- App: Conta → Eventos de loja, tela do evento, tela da loja (com logo), código do balcão.
- App: foto do perfil (seletor de fotos do sistema, recorte quadrado, remover em dois toques).
- App: torneio com top cut, eliminação simples e todos contra todos (títulos das fases, botão de
  quem organiza, campeão).
- App: aviso "Abriu vaga…" no sino, abrindo o evento.
- App (fase 14, a cara do site): títulos na fonte Fraunces (no Android, conferir que não caem na
  fonte do sistema), ícones iguais aos do site (abas, sino, conquistas, validação do deck),
  estados vazios com os símbolos de mana, painel (destaque, números, pódio em degraus) e grupo
  (membros com foto e "Gerenciar").
- App (fase 15): todo o layout de tablet (ver 5e).

## Depois do ensaio

Junte os achados (o `/admin` mostra os feedbacks) e me passe a lista: eu separo o que é defeito
(corrijo antes de fevereiro) do que é ajuste de texto ou de ideia (vai para o roadmap).
