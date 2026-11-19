# Ensaio do beta (passo 7 do roadmap)

Roteiro para testar o ArcanaKin em aparelhos de verdade antes do beta de fevereiro, com o seu
grupo e uma loja de teste. Ele cobre principalmente o que até agora só foi conferido por testes
automáticos, sem um celular na mão. Marque cada item, e anote o que estranhar no **Feedback** do
próprio site ou app (Conta → Feedback): o texto chega no `/admin` com a tela de onde veio.

## Antes de começar

- **Pessoas:** pelo menos **6** (com 4, o top cut não roda). Uma delas faz a loja, outra fica
  sem conta para abrir os links públicos.
- **Aparelhos:** 1 iPhone e 1 Android, cada um com o app no **Expo Go** (até sair o build de
  dezembro) e o site no navegador; um computador para o site.
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

## Depois do ensaio

Junte os achados (o `/admin` mostra os feedbacks) e me passe a lista: eu separo o que é defeito
(corrijo antes de fevereiro) do que é ajuste de texto ou de ideia (vai para o roadmap).
