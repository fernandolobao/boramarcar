/**
 * Ajuda (FAQ): os fluxos do ArcanaKin explicados passo a passo, nos dois idiomas. Texto fixo,
 * sem nenhum dado de pessoa ou grupo: os exemplos usam nomes inventados. Fica no core para o
 * site (/ajuda) e o app (Conta → Ajuda) mostrarem exatamente o mesmo conteúdo.
 *
 * Mudou um fluxo? Atualize os dois idiomas; o teste confere que as seções e perguntas batem.
 */

export type HelpLocale = 'pt-BR' | 'en';

export interface HelpQuestion {
  id: string;
  question: string;
  /** Parágrafos curtos antes dos passos. */
  intro?: string[];
  /** Passos numerados, na ordem em que a pessoa faz. */
  steps?: string[];
  /** Observações depois dos passos. */
  notes?: string[];
}

export interface HelpSection {
  id: string;
  title: string;
  questions: HelpQuestion[];
}

export interface HelpContent {
  title: string;
  intro: string;
  sections: HelpSection[];
}

export const HELP: Record<HelpLocale, HelpContent> = {
  'pt-BR': {
    title: 'Ajuda',
    intro:
      'Como fazer cada coisa no ArcanaKin, passo a passo. Os nomes dos botões são os que você vê no site e no app.',
    sections: [
      {
        id: 'comecar',
        title: 'Começar',
        questions: [
          {
            id: 'aprender',
            question: 'Nunca joguei Magic. Por onde começo?',
            intro: [
              'Abra "Aprender a jogar" (no rodapé de todas as páginas): lições curtas sobre cartas, mana, o turno, combate e a pilha e, depois, "Commander para iniciantes" (comandante, identidade de cor, a mesa com várias pessoas, Rule 0 e brackets), com cartas de exemplo. Não precisa de conta; com conta, o seu progresso fica salvo.',
            ],
          },
          {
            id: 'entrar-grupo',
            question: 'Como entro no grupo da minha mesa?',
            steps: [
              'Peça o link ou o código de convite para quem organiza o grupo.',
              'Abra o link (ele já leva ao grupo) ou, no app ou no site, toque em "Entrar ou criar grupo" e digite o código.',
              'Entre com a sua conta Google ou com e-mail e senha. Pronto: você já vê os encontros e a disponibilidade do grupo.',
            ],
            notes: [
              'Pode estar em mais de um grupo: o grupo ativo troca na aba Conta (app) ou no menu Grupo (site).',
            ],
          },
          {
            id: 'criar-grupo',
            question: 'Como crio um grupo novo e convido as pessoas?',
            steps: [
              'Toque em "Entrar ou criar grupo" e depois em "Criar grupo". Dê um nome (ex.: "Mesa de Terça").',
              'Abra "Seu grupo" (app) ou o menu Grupo (site) e toque em "Convidar": ali estão o link, o código e o QR Code do convite.',
              'Toque em "Compartilhar convite" para mandar pelo WhatsApp ou por onde preferir. No site, "Copiar link" fica ao lado do link, e "Baixar QR Code" logo abaixo do QR Code, para imprimir.',
            ],
            notes: [
              'Quem cria o grupo vira dono(a) e pode promover admins, remover pessoas e passar a posse. Se o link vazar, gere um novo convite: o antigo deixa de funcionar.',
            ],
          },
          {
            id: 'guia',
            question: 'Como vejo o guia de boas-vindas de novo?',
            intro: [
              'O guia abre sozinho no seu primeiro acesso: seu grupo, fuso e idioma, e quando você pode jogar. Dá para pular em qualquer passo. Para ver de novo: no site, "Ver o guia de novo" nos primeiros passos do painel; no app, Conta → "Ver o guia de novo".',
            ],
          },
          {
            id: 'dicas',
            question: 'O que são as dicas no topo de algumas telas?',
            intro: [
              'A análise de deck, o modo mesa e a coleção mostram uma dica curta na primeira vez. "Entendi" fecha a dica; para ver de novo, toque no botão ⓘ ao lado do título (no site e no app).',
            ],
          },
        ],
      },
      {
        id: 'disponibilidade',
        title: 'Disponibilidade e horários',
        questions: [
          {
            id: 'marcar-disponibilidade',
            question: 'Como digo quando posso jogar?',
            steps: [
              'Abra Disponibilidade.',
              'Escolha "Uma vez" para um dia específico ou "Toda semana" para um horário fixo (ex.: terças das 19h às 23h).',
              'Marque o início e o fim e, se quiser, onde você pode jogar. Salve.',
            ],
            notes: [
              'Numa semana em que você não pode, use "Não posso nesta data" na regra semanal: só aquele dia é pulado.',
              'Os horários valem no seu fuso horário (Configurações).',
            ],
          },
          {
            id: 'mesa-fecha',
            question: 'O que é "a mesa fechou"?',
            intro: [
              'É quando o número mínimo de pessoas do grupo (configurado pelo organizador, por padrão 4) está disponível no mesmo horário. A lista "Horários em que a mesa fecha" mostra esses momentos, e dá para marcar o encontro direto dali com um toque.',
            ],
          },
        ],
      },
      {
        id: 'encontros',
        title: 'Encontros',
        questions: [
          {
            id: 'criar-encontro',
            question: 'Como marco um encontro?',
            steps: [
              'Em Encontros, toque em "Novo encontro" (ou use um horário em que a mesa fecha, na Disponibilidade).',
              'Preencha o título (já vem "Commander"), quando e onde. Marque quem vai participar.',
              'Salve. Todo mundo do grupo recebe um aviso (e-mail ou notificação no celular, conforme a preferência de cada um).',
            ],
          },
          {
            id: 'presenca',
            question: 'Como confirmo presença?',
            steps: [
              'Abra o encontro e, em "Sua presença", escolha "Vou", "Talvez" ou "Não vou".',
              'Mudou de ideia? É só tocar de novo. O organizador vê a lista atualizada.',
            ],
          },
          {
            id: 'cancelar-encontro',
            question: 'Como cancelo ou finalizo um encontro?',
            intro: [
              'Quem criou o encontro, ou um admin do grupo, pode cancelar (o botão pede confirmação em dois toques) ou marcar como finalizado depois do início. Finalizar manda o resumo da noite para o grupo. Um encontro cancelado pode ser reaberto.',
            ],
          },
          {
            id: 'sugestao-mesas',
            question: 'Como dividir a turma em mesas?',
            intro: [
              'Com 6 ou mais confirmados num encontro de Commander (ou outro formato todos contra todos), o encontro mostra a "Sugestão de mesas": divide quem confirmou em mesas de 3 a 5 pessoas, juntando quem menos jogou junto (as partidas dos últimos 3 meses pesam mais).',
            ],
            steps: [
              'Abra o encontro e veja a "Sugestão de mesas", logo depois da lista de presença.',
              'Cada mesa mostra quantas duplas ali nunca jogaram juntas.',
              'Não gostou? Toque em "Sortear de novo" para outra divisão.',
            ],
            notes: ['É só uma sugestão: nada muda nas presenças nem nas partidas.'],
          },
          {
            id: 'quem-anda-sumido',
            question: 'Como chamo de volta quem anda sumido?',
            intro: [
              'O dono e os admins do grupo veem, na tela do Grupo, a lista "Quem anda sumido": a presença de cada pessoa nos últimos 8 encontros (conta quem marcou "Vou" ou jogou alguma partida), a última partida e há quantas semanas ela não aparece (quem faltou os 4 últimos encontros e não joga há um mês). Os outros membros não veem essa lista.',
            ],
            steps: [
              'Marque o próximo encontro.',
              'No Grupo, em "Quem anda sumido", toque em "Chamar" ao lado da pessoa.',
              'Ela recebe um convite para o próximo encontro, por notificação ou e-mail, conforme a preferência dela. Dá para chamar cada pessoa uma vez por encontro.',
            ],
          },
        ],
      },
      {
        id: 'partidas',
        title: 'Registrar partidas',
        questions: [
          {
            id: 'commander-dois',
            question: 'Como registro uma partida de Commander com duas pessoas?',
            intro: [
              'Commander aceita de 2 a 8 jogadores. A partida sempre fica dentro de um encontro do grupo, e os dois jogadores precisam estar no grupo.',
            ],
            steps: [
              'Marque um encontro (ou abra um já existente) e confirme a presença dos dois.',
              'No encontro, toque em "Registrar partida".',
              'Em "Tipo de jogo", escolha Commander. Em "Jogou", marque os dois jogadores.',
              'Marque "Venceu" em quem ganhou, ou "A partida terminou empatada". Se quiser, escolha o deck de cada um.',
              'Em "Mais detalhes (opcional)": quem começou, turno em que acabou, duração e observações. Toque em "Registrar partida".',
            ],
            notes: [
              'A partida entra no ranking do grupo e nas estatísticas e conquistas de cada jogador. Para corrigir, abra a partida no encontro e edite; para apagar, "Remover partida" (pede confirmação).',
            ],
          },
          {
            id: 'modo-mesa',
            question: 'Como uso o modo mesa (contador de vida) durante o jogo?',
            steps: [
              'No encontro, toque em "Abrir modo mesa".',
              'Escolha o tipo de jogo (a vida inicial já vem certa: 40 no Commander), marque quem está jogando e, se quiser, o deck de cada um. Toque em "Começar".',
              'Deite o celular no meio da mesa: cada um tem uma área do mesmo tamanho, virada para quem está daquele lado (com 3 ou 5 jogadores sobra um canto vazio, como um lugar livre na mesa). Toque para tirar ou somar 1 de vida, segure para 10.',
              'O botão do centro tem dado, moeda, sorteio de quem começa, desfazer e trocar lugares. O botão de cada jogador abre, virados para ele, dano de comandante, veneno e outros marcadores.',
              'Deck com dois comandantes (parceiros)? Se o deck foi escolhido na mesa, o dano de cada comandante já aparece separado, com o nome dele. Sem deck, abra as opções de quem joga com parceiros e ligue "Dois comandantes": 21 de dano do mesmo comandante derrubam.',
              'Quando sobrar um jogador, o app sugere o vencedor. Toque em "Encerrar e registrar", confira e salve.',
            ],
            notes: [
              'A tela fica acesa enquanto a mesa está aberta. No iPhone, para usar a tela toda, adicione o ArcanaKin à tela inicial pelo botão Compartilhar.',
              'A partida fica salva no aparelho até você registrar ou descartar: dá para fechar e voltar depois.',
            ],
          },
          {
            id: 'outros-formatos',
            question: 'E outros formatos (Two-Headed Giant, Standard, Draft)?',
            intro: [
              'Em "Tipo de jogo" há Commander, Brawl, Oathbreaker, Two-Headed Giant (2×2, com times), formatos de 60 cartas, Draft, Selado e "Outro". A tela diz quantos jogadores cada um aceita.',
            ],
          },
        ],
      },
      {
        id: 'decks',
        title: 'Decks',
        questions: [
          {
            id: 'deck-do-zero',
            question: 'Como monto um deck do zero?',
            steps: [
              'No site, abra Decks e toque em "Novo deck".',
              'Dê um nome, escolha o tipo de jogo e, em Commander, o comandante (pode ficar para depois).',
              'Na página do deck, toque em "Editar" e acrescente as cartas pela busca.',
            ],
          },
          {
            id: 'deck-rascunho',
            question: 'O que é um deck em rascunho?',
            intro: [
              'É um deck para testar ideias. As cartas dele não entram na sua coleção, ninguém mais vê o deck e ele não pode ser escolhido em partidas. Deck novo começa como rascunho (dá para desmarcar ao criar ou importar).',
              'Quando o deck estiver pronto, toque em "Publicar deck" na página dele: as cartas passam a contar na sua coleção (menos proxies e "talvez") e o deck aparece para quem você escolheu.',
              'No rascunho, as cartas que você já tem livres na coleção (em qualquer edição e sem uso em outro deck publicado) aparecem com o selo da coleção. Ao publicar, para cada uma delas você escolhe: usar a que já tem (a carta do deck passa para essa edição) ou adicionar uma nova à coleção.',
            ],
          },
          {
            id: 'importar-deck',
            question: 'Como trago meu deck do Moxfield ou do Archidekt?',
            steps: [
              'No site, abra Decks e toque em "Importar".',
              'Cole o link do Archidekt ou, no caso do Moxfield (que bloqueia a leitura automática), copie a lista em texto e cole.',
              'Confira o nome e a visibilidade (só você, o grupo ou público) e salve. O app mostra o deck; editar continua no site.',
            ],
          },
          {
            id: 'edicao-carta',
            question: 'Como escolho a edição (impressão) de uma carta?',
            steps: [
              'No deck, no modo Editar, toque em "Edição" na carta.',
              'Filtre pelo código e número ("ltr 268"), por parte do nome da edição ou pelo ilustrador ("tedin"), útil em cartas antigas sem número.',
              'Escolha a impressão e quantas cópias mudam. As outras continuam na edição atual.',
              'Ao adicionar à coleção, a edição é escolhida antes; se a carta só tem uma edição, ela já vem escolhida.',
            ],
          },
          {
            id: 'nota-deck',
            question: 'Como funciona a nota do deck?',
            intro: [
              'A nota (0 a 100) compara o deck com metas de referência do formato. É um guia, não uma regra.',
            ],
            steps: [
              'Commander, Brawl e Oathbreaker: terrenos, ramp, compra, remoção, board wipes e curva.',
              'Formatos de 60 cartas (Standard, Pioneer, Modern, Pauper…): terrenos (22 a 26), curva, interação (remoção e board wipes) e consistência (mágicas em 3 ou 4 cópias).',
              'Draft e Sealed (40 cartas): terrenos (16 a 18), curva, interação e criaturas (15 a 17).',
              'Toque num item da nota para ver o cálculo e as cartas que contam. Funções das cartas, base de mana e chances da mão inicial ficam em "Mais detalhes da análise".',
            ],
          },
          {
            id: 'compartilhar-deck',
            question: 'Como compartilho um deck?',
            steps: [
              'No site, abra o deck, toque em "Opções do deck" (no canto do topo da página), escolha "Editar deck" e mude a visibilidade para "Público".',
              'Abra "Compartilhar deck": copie o link, mande pelo WhatsApp ou baixe o QR Code.',
            ],
            notes: [
              'Quem recebe vê a lista e a análise; quem ainda não tem conta cria uma antes. Decks do grupo ou privados não têm esse bloco.',
            ],
          },
          {
            id: 'proxies',
            question: 'Como marco e imprimo proxies?',
            intro: [
              'No modo Editar, marque quantas cópias de cada carta são proxy. Em "Opções do deck" (no canto do topo), "Imprimir proxies" monta a folha em tamanho real, só com os proxies ou com o deck todo. No mesmo menu ficam copiar e baixar a lista e atualizar o deck.',
            ],
          },
        ],
      },
      {
        id: 'ranking',
        title: 'Ranking, temporadas e conquistas',
        questions: [
          {
            id: 'pontos',
            question: 'Como funciona o ranking?',
            intro: [
              'Cada partida registrada dá pontos a quem jogou, com mais para quem venceu. O ranking do grupo soma tudo; os filtros mostram um período, uma temporada ou um tipo de jogo. Temporadas são criadas pelo organizador nas configurações do grupo (botão "Configurações" na tela do grupo), e quem termina em 1º ganha o título no perfil.',
            ],
          },
          {
            id: 'conquistas',
            question: 'O que são as conquistas?',
            intro: [
              'Selos que aparecem no perfil conforme você joga: primeira partida, primeira vitória, sequências, vitória rápida, fiel ao deck, campeão da temporada, 100 partidas, vencer cada pessoa do grupo, jogar em 4 encontros seguidos, jogar os 12 meses do ano, estreia em torneio, chegar ao top cut, campeão de torneio, as lições da trilha "Aprender a jogar" e outros. Abra o perfil (toque no seu nome no ranking): a aba "Em aberto" mostra o que falta, as mais perto de sair primeiro, e "Finalizadas" mostra as que você já ganhou, com a data.',
              'Quando você ganha conquistas novas, uma janela mostra todas juntas na próxima vez que abrir o painel ou o seu perfil, mesmo que tenham vindo de várias partidas.',
            ],
          },
          {
            id: 'notificacoes',
            question: 'O que aparece no sino de notificações?',
            intro: [
              'O sino fica no topo do site e no painel do app, com o número de novidades. Lá aparecem as partidas em que você jogou, as partidas do seu grupo, as conquistas que você ganhou, as mudanças no pódio do grupo e os avisos do ArcanaKin. Toque numa notificação para abrir o encontro, o perfil ou o ranking; ela passa a contar como lida. Também dá para marcar uma como lida sem abrir, ou "Marcar todas como lidas" no topo.',
              'Toda semana, as novidades do ArcanaKin também chegam por ali, num texto curto.',
              'As notificações ficam só no site e no app: e-mail e avisos no celular continuam só para encontros.',
            ],
          },
          {
            id: 'eventos-de-loja',
            question: 'Como me inscrevo num evento de loja?',
            intro: [
              'Pela página do evento (na página da loja, em "Próximos eventos"): "Me inscrever". Se as vagas acabaram, você entra na lista de espera e sobe sozinho quando alguém desiste. Já está na loja? No menu da conta (no app, em Conta → Eventos de loja), "Código de evento": digite o código que está no balcão.',
              'A equipe da loja também inscreve quem chegou sem conta, só com o nome, e marca quem chegou (check-in). Na página pública aparecem só as vagas: os nomes de quem se inscreveu ficam com a equipe da loja.',
              'Nos eventos de torneio, a equipe começa o torneio com quem fez check-in (convidados também) e a inscrição fecha. Qualquer pessoa acompanha as mesas, a classificação e a linha do tempo na página do evento; quem está na mesa registra o resultado (a equipe registra o dos convidados). Torneio de duplas (2HG) em loja ainda não é possível.',
            ],
          },
          {
            id: 'lojas-perto',
            question: 'Como acho lojas e eventos perto de mim?',
            intro: [
              'Em "Lojas e eventos" (link no rodapé do site, sem precisar de conta; no app, em Conta → Lojas e eventos): escolha a sua cidade da lista e veja os torneios e noites de jogo dos próximos 30 dias e as lojas a até 50 km, as mais perto primeiro. "Usar minha localização" ordena pela distância de onde você está (a posição não é guardada). Os filtros mostram só um formato, um tipo de evento ou lojas que vendem cartas avulsas, selados, têm mesas para jogar ou fazem torneios. Cada evento tem "Baixar para a agenda" e "Google Agenda". Com conta, a sua cidade fica salva em Configurações e a página já abre nela.',
              'Gostou de uma loja? Na página dela, "Seguir loja": os eventos novos e os avisos da loja chegam no sino (e no celular, se você ligou os avisos). A loja vê só quantas pessoas seguem, não quem. Quem é da equipe manda os avisos em "Gerenciar a loja" (até 3 por semana).',
            ],
          },
          {
            id: 'lojas',
            question: 'Como uma loja entra no ArcanaKin?',
            intro: [
              'A equipe do ArcanaKin cria o perfil da loja e manda um convite para o e-mail do responsável. Quem recebe entra (ou cria a conta) com esse mesmo e-mail e aceita o convite: o convite só vale para aquele endereço e por 14 dias. Depois, em "Gerenciar a loja" (no menu da conta), dá para editar a cidade (escolhida da lista), o endereço com mapa, horários, Instagram, WhatsApp, site, os formatos que a loja joga e o que ela oferece (cartas avulsas, selados e acessórios, mesas para jogar, torneios), e chamar a equipe por e-mail.',
              'O perfil público da loja abre para qualquer pessoa, sem login, e não mostra o e-mail de contato. O selo "Loja verificada" é dado pela equipe do ArcanaKin.',
            ],
          },
          {
            id: 'torneios',
            question: 'Como funciona um torneio do grupo?',
            intro: [
              'O dono ou um admin cria o torneio num encontro (no próprio encontro, em "Criar torneio neste encontro", ou em Encontros → Torneios), em qualquer formato. Nos formatos multijogador (Commander, Brawl, Oathbreaker) as mesas são pods de 4, de 3 quando a conta não fecha; no um contra um (Modern, Pauper, Draft…) são pares em melhor de 3 (ou de 1), e no Two-Headed Giant cada inscrição é uma dupla.',
              'Cada pessoa se inscreve em "Me inscrever" (quem organiza inscreve qualquer pessoa do grupo). Ao começar, a 1ª rodada é sorteada; as seguintes juntam quem tem pontos parecidos e evitam repetir adversários, e com número ímpar alguém fica de bye (vale vitória). Quem está na mesa registra o resultado, que vale na hora; quem organiza corrige quando precisar e libera a próxima rodada quando todas as mesas têm resultado.',
              'A classificação usa os pontos do torneio (3/1/0 por padrão) e desempata pelos critérios oficiais: % de vitórias dos oponentes, % de jogos vencidos e % de jogos vencidos dos oponentes. Se o torneio conta no ranking, cada jogo também vira uma partida do grupo.',
              'Top cut (opcional, na criação do torneio ou, na loja, ao começar): depois do suíço, os melhores seguem em eliminação. No um contra um, top 4 ou 8 em chave (1º contra o último do top), e cada mesa precisa de um vencedor. Nos pods, top 4 (mesa final direta), 10 (os dois primeiros esperam na final) ou 16 (quatro pods misturados); empate na mesa leva quem ficou melhor no suíço. Quem vence a final é o campeão; o suíço fica fechado quando o top começa.',
              'Para quem não é do grupo acompanhar (num campeonato, ou para mandar no WhatsApp), a página do torneio tem o "Link público": abre sem login, se atualiza sozinha enquanto o torneio roda e mostra só o primeiro nome de cada pessoa.',
              'No um contra um (e no 2HG), a estrutura pode ser outra além do suíço: eliminação simples (chave sorteada, quem perde sai, e quem sobra no sorteio passa direto na 1ª rodada), eliminação dupla (quem perde a primeira vez cai para a chave dos perdedores e só sai na segunda derrota; a grande final é uma partida só) ou todos contra todos (cada pessoa enfrenta todas as outras uma vez, até 16 inscrições). Nos pods, é sempre o suíço.',
            ],
          },
          {
            id: 'retrospectiva',
            question: 'O que é a retrospectiva do mês?',
            intro: [
              'Todo dia 1, quem é de um grupo que jogou no mês anterior recebe no sino o aviso da retrospectiva: quantas partidas e noites, o destaque do mês, as estreias, os feitos do mês (com os recordes do grupo que caíram) e o duelo do mês. Ela também fica na tela do grupo, em "Retrospectiva de…". Dá para compartilhar o link: cada mês tem o seu (quem recebe o de outubro não abre os outros meses), e a página mostra só o primeiro nome de quem jogou, sem o nome do grupo, local ou e-mail.',
            ],
          },
          {
            id: 'recordes',
            question: 'Onde vejo os recordes do grupo?',
            intro: [
              'Na tela do grupo, logo no começo: vitória mais rápida, partida mais longa, maior sequência de vitórias, noite com mais partidas e comandante com mais vitórias, cada um com o encontro e a data. Logo abaixo, a cara do grupo: as cores mais jogadas, quantos comandantes diferentes já apareceram e o meta dos últimos 90 dias.',
            ],
          },
          {
            id: 'rivalidades',
            question: 'O que são "Rivalidades"?',
            intro: [
              'No painel, "Seu maior rival" é quem mais venceu você e "Seu freguês" é quem você mais venceu, entre as pessoas do grupo que jogaram com você pelo menos 3 vezes. No perfil de outra pessoa, aparece o placar entre vocês dois no grupo. É só brincadeira: ninguém vê as rivalidades dos outros.',
            ],
          },
          {
            id: 'com-quem-jogar',
            question: 'O que é "Com quem jogar" no painel?',
            intro: [
              'Até 3 pessoas do grupo com quem você nunca jogou, ou não joga há mais de um mês. Quem já confirmou o próximo encontro aparece primeiro. Toque no nome para ver o perfil. Ninguém mais vê essa lista: ela é só sua.',
            ],
          },
        ],
      },
      {
        id: 'avisos',
        title: 'Avisos e notificações',
        questions: [
          {
            id: 'avisos-celular',
            question: 'Como recebo avisos no celular?',
            intro: [
              'Na primeira vez que você confirma presença num encontro pelo app, ele pergunta se quer ligar os avisos. Se preferir depois:',
            ],
            steps: [
              'No app, abra Conta e ligue "Avisos neste celular".',
              'Aceite a permissão do sistema. Você passa a receber encontro novo, mudança, cancelamento, lembrete no dia e "a mesa fechou!".',
            ],
            notes: [
              'Avisos por e-mail ligam e desligam em Configurações. Sair da conta desliga os avisos daquele celular.',
            ],
          },
        ],
      },
      {
        id: 'conta',
        title: 'Conta e privacidade',
        questions: [
          {
            id: 'foto',
            question: 'Como troco a minha foto?',
            intro: [
              'Em Configurações (site) ou Conta (app): "Escolher foto" ou "Trocar foto". Vale JPEG, PNG ou WebP; a foto é recortada em quadrado e guardada sem a localização e os outros dados do arquivo. "Remover foto" volta às suas iniciais. Quem entra com o Google começa com a foto do Google; depois de enviar a sua, ela fica no lugar.',
              'A equipe de uma loja troca o logo da mesma forma, em "Gerenciar a loja".',
            ],
          },
          {
            id: 'fuso-idioma',
            question: 'Como mudo fuso horário e idioma?',
            intro: [
              'Em Configurações. O fuso vale para todas as datas e horários que você vê e digita; o idioma vale para o site e os e-mails (o app segue o idioma do aparelho). Na página inicial, o seletor PT | EN no topo também troca o idioma.',
            ],
          },
          {
            id: 'dados',
            question: 'Que dados o ArcanaKin guarda e como apago a minha conta?',
            intro: [
              'Nome, e-mail e foto da conta, seus grupos, disponibilidade, encontros, partidas e decks. Nada é vendido nem compartilhado fora do grupo. Em Configurações (site) ou Conta (app) dá para baixar seus dados e excluir a conta: os dados pessoais somem e as partidas ficam no histórico do grupo como "Jogador removido".',
              'A Política de Privacidade completa está no rodapé.',
            ],
          },
          {
            id: 'feedback',
            question: 'Achei um problema ou tenho uma ideia. Para onde mando?',
            intro: [
              'Use "Feedback" (no rodapé do site ou na aba Conta do app). A mensagem chega direto para quem cuida do projeto.',
            ],
          },
        ],
      },
    ],
  },
  en: {
    title: 'Help',
    intro:
      'How to do each thing in ArcanaKin, step by step. Button names are the ones you see on the website and in the app.',
    sections: [
      {
        id: 'comecar',
        title: 'Getting started',
        questions: [
          {
            id: 'aprender',
            question: "I've never played Magic. Where do I start?",
            intro: [
              'Open "Learn to play" (in the footer of every page): short lessons about cards, mana, the turn, combat and the stack, then "Commander for beginners" (the commander, color identity, the multiplayer table, Rule 0 and brackets), with example cards. No account needed; with one, your progress is saved.',
            ],
          },
          {
            id: 'entrar-grupo',
            question: 'How do I join my table’s group?',
            steps: [
              'Ask whoever runs the group for the invite link or code.',
              'Open the link (it takes you straight to the group) or, in the app or on the website, tap "Join or create a group" and type the code.',
              'Sign in with your Google account or with e-mail and password. Done: you can already see the group’s meetups and availability.',
            ],
            notes: [
              'You can be in more than one group: switch the active group in the Account tab (app) or the Group menu (website).',
            ],
          },
          {
            id: 'criar-grupo',
            question: 'How do I create a new group and invite people?',
            steps: [
              'Tap "Join or create a group", then "Create group". Give it a name (e.g. "Tuesday Table").',
              'Open "Your group" (app) or the Group menu (website) and tap "Invite": the invite link, code and QR code are there.',
              'Tap "Share invite" to send it on WhatsApp or wherever you like. On the website, "Copy link" sits next to the link and "Download QR code" right below the QR code, to print.',
            ],
            notes: [
              'Whoever creates the group becomes the owner and can promote admins, remove people and transfer ownership. If the link leaks, generate a new invite: the old one stops working.',
            ],
          },
          {
            id: 'guia',
            question: 'How do I see the welcome guide again?',
            intro: [
              'The guide opens by itself the first time you sign in: your group, time zone and language, and when you can play. You can skip it at any step. To see it again: on the website, "See the guide again" in the first steps on the dashboard; in the app, Account → "See the guide again".',
            ],
          },
          {
            id: 'dicas',
            question: 'What are the tips at the top of some screens?',
            intro: [
              'Deck analysis, table mode and the collection show a short tip the first time. "Got it" closes it; to see it again, tap the ⓘ button next to the title (on the website and in the app).',
            ],
          },
        ],
      },
      {
        id: 'disponibilidade',
        title: 'Availability and times',
        questions: [
          {
            id: 'marcar-disponibilidade',
            question: 'How do I say when I can play?',
            steps: [
              'Open Availability.',
              'Choose "Once" for a specific day or "Every week" for a fixed slot (e.g. Tuesdays 7 pm to 11 pm).',
              'Set the start and end and, if you like, where you can play. Save.',
            ],
            notes: [
              'For a week you can’t make it, use "Can’t make this date" on the weekly rule: only that day is skipped.',
              'Times are in your time zone (Settings).',
            ],
          },
          {
            id: 'mesa-fecha',
            question: 'What does "the table fills up" mean?',
            intro: [
              'It’s when the group’s minimum number of people (set by the organizer, 4 by default) is available at the same time. The "Times when the table fills up" list shows those moments, and you can schedule the meetup right from there with one tap.',
            ],
          },
        ],
      },
      {
        id: 'encontros',
        title: 'Meetups',
        questions: [
          {
            id: 'criar-encontro',
            question: 'How do I schedule a meetup?',
            steps: [
              'In Meetups, tap "New meetup" (or use a time when the table fills up, in Availability).',
              'Fill in the title (it defaults to "Commander"), when and where. Mark who is taking part.',
              'Save. Everyone in the group gets a notice (e-mail or phone notification, depending on each person’s preference).',
            ],
          },
          {
            id: 'presenca',
            question: 'How do I RSVP?',
            steps: [
              'Open the meetup and, under "Your RSVP", choose "Going", "Maybe" or "Not going".',
              'Changed your mind? Just tap again. The organizer sees the updated list.',
            ],
          },
          {
            id: 'cancelar-encontro',
            question: 'How do I cancel or finish a meetup?',
            intro: [
              'Whoever created the meetup, or a group admin, can cancel it (the button asks for a two-tap confirmation) or mark it as finished after it starts. Finishing sends the night’s recap to the group. A cancelled meetup can be reopened.',
            ],
          },
          {
            id: 'sugestao-mesas',
            question: 'How do I split everyone into tables?',
            intro: [
              'With 6 or more confirmed for a Commander meetup (or another free-for-all format), the meetup shows "Suggested tables": it splits the confirmed players into tables of 3 to 5, putting together people who have played together the least (games from the last 3 months count more).',
            ],
            steps: [
              'Open the meetup and look for "Suggested tables", right after the RSVP list.',
              'Each table shows how many pairs there have never played together.',
              'Don\'t like it? Tap "Shuffle again" for another split.',
            ],
            notes: ["It's only a suggestion: nothing changes in the RSVPs or the games."],
          },
          {
            id: 'quem-anda-sumido',
            question: "How do I bring back someone who's been missing?",
            intro: [
              "The group owner and admins see, on the Group screen, the \"Who's been missing\" list: each person's attendance at the last 8 meetups (counting whoever said \"Going\" or played a game), their last game and how many weeks they haven't shown up (whoever missed the last 4 meetups and hasn't played for a month). Other members don't see this list.",
            ],
            steps: [
              'Schedule the next meetup.',
              'On Group, under "Who\'s been missing", tap "Invite" next to the person.',
              'They get an invite to the next meetup, by notification or email, depending on their preference. You can invite each person once per meetup.',
            ],
          },
        ],
      },
      {
        id: 'partidas',
        title: 'Recording games',
        questions: [
          {
            id: 'commander-dois',
            question: 'How do I record a two-player Commander game?',
            intro: [
              'Commander takes 2 to 8 players. A game always belongs to a group meetup, and both players must be in the group.',
            ],
            steps: [
              'Schedule a meetup (or open an existing one) and confirm both RSVPs.',
              'In the meetup, tap "Record game".',
              'Under "Game type", choose Commander. Under "Played", mark both players.',
              'Mark "Won" on the winner, or "The game ended in a draw". Optionally pick each player’s deck.',
              'Under "More details (optional)": who went first, the turn it ended, duration and notes. Tap "Record game".',
            ],
            notes: [
              'The game counts for the group ranking and each player’s stats and achievements. To fix it, open the game in the meetup and edit; to delete, "Remove game" (asks for confirmation).',
            ],
          },
          {
            id: 'modo-mesa',
            question: 'How do I use table mode (life counter) during the game?',
            steps: [
              'In the meetup, tap "Open table mode".',
              'Choose the game type (starting life is already right: 40 in Commander), mark who is playing and, optionally, each deck. Tap "Start".',
              'Lay the phone in the middle of the table: everyone gets an area of the same size, facing the person on that side (with 3 or 5 players one corner stays empty, like a free seat). Tap to lose or gain 1 life, hold for 10.',
              'The centre button has a die, a coin, a first-player draw, undo and swap seats. Each player’s button opens commander damage, poison and other counters, facing that player.',
              'Deck with two commanders (partners)? If the deck was chosen at the table, each commander’s damage already shows separately, with its name. Without a deck, open the options of whoever plays partners and turn on "Two commanders": 21 damage from the same commander knocks a player out.',
              'When one player is left, the app suggests the winner. Tap "End and record", check and save.',
            ],
            notes: [
              'The screen stays on while the table is open. On iPhone, to use the whole screen, add ArcanaKin to your Home Screen from the Share button.',
              'The game stays saved on the device until you record or discard it: you can close and come back later.',
            ],
          },
          {
            id: 'outros-formatos',
            question: 'What about other formats (Two-Headed Giant, Standard, Draft)?',
            intro: [
              'Under "Game type" there are Commander, Brawl, Oathbreaker, Two-Headed Giant (2×2, with teams), 60-card formats, Draft, Sealed and "Other". The screen says how many players each one takes.',
            ],
          },
        ],
      },
      {
        id: 'decks',
        title: 'Decks',
        questions: [
          {
            id: 'deck-do-zero',
            question: 'How do I build a deck from scratch?',
            steps: [
              'On the website, open Decks and tap "New deck".',
              'Give it a name, pick the game type and, in Commander, the commander (it can wait).',
              'On the deck page, tap "Edit" and add cards through the search.',
            ],
          },
          {
            id: 'deck-rascunho',
            question: 'What is a draft deck?',
            intro: [
              'It is a deck for trying ideas. Its cards don\u2019t go into your collection, nobody else sees the deck and it can\u2019t be picked in games. A new deck starts as a draft (you can uncheck it when creating or importing).',
              'When the deck is ready, tap "Publish deck" on its page: the cards start counting in your collection (except proxies and "maybe") and the deck is shown to whoever you chose.',
              'In a draft, cards you already have free in your collection (any edition, unused by other published decks) show the collection badge. When publishing, for each of them you choose: use the one you have (the deck card switches to that edition) or add a new one to your collection.',
            ],
          },
          {
            id: 'importar-deck',
            question: 'How do I bring my deck from Moxfield or Archidekt?',
            steps: [
              'On the website, open Decks and tap "Import".',
              'Paste the Archidekt link or, for Moxfield (which blocks automatic reading), copy the list as text and paste it.',
              'Check the name and visibility (only you, the group or public) and save. The app shows the deck; editing stays on the website.',
            ],
          },
          {
            id: 'edicao-carta',
            question: 'How do I choose a card’s edition (printing)?',
            steps: [
              'In the deck, in Edit mode, tap "Edition" on the card.',
              'Filter by set code and number ("ltr 268"), by part of the set name or by artist ("tedin"), handy for old cards without a number.',
              'Pick the printing and how many copies change. The rest keep the current edition.',
              'When adding to your collection, you pick the edition first; if the card has only one edition, it comes already picked.',
            ],
          },
          {
            id: 'nota-deck',
            question: 'How does the deck score work?',
            intro: [
              'The score (0 to 100) compares the deck with the format’s reference targets. It’s a guide, not a rule.',
            ],
            steps: [
              'Commander, Brawl and Oathbreaker: lands, ramp, card draw, removal, board wipes and curve.',
              '60-card formats (Standard, Pioneer, Modern, Pauper…): lands (22 to 26), curve, interaction (removal and board wipes) and consistency (spells running 3 or 4 copies).',
              'Draft and Sealed (40 cards): lands (16 to 18), curve, interaction and creatures (15 to 17).',
              'Tap a score item to see the math and which cards count. Card roles, mana base and opening hand odds are under "More analysis details".',
            ],
          },
          {
            id: 'compartilhar-deck',
            question: 'How do I share a deck?',
            steps: [
              'On the website, open the deck, tap "Deck options" (in the top corner of the page), choose "Edit deck" and set the visibility to "Public".',
              'Open "Share deck": copy the link, send it on WhatsApp or download the QR code.',
            ],
            notes: [
              'People who get it see the list and the analysis; anyone without an account creates one first. Group and private decks do not have this block.',
            ],
          },
          {
            id: 'proxies',
            question: 'How do I mark and print proxies?',
            intro: [
              'In Edit mode, mark how many copies of each card are proxies. In "Deck options" (top corner), "Print proxies" builds the real-size sheet with only the proxies or the whole deck. The same menu has copying and downloading the list and updating the deck.',
            ],
          },
        ],
      },
      {
        id: 'ranking',
        title: 'Ranking, seasons and achievements',
        questions: [
          {
            id: 'pontos',
            question: 'How does the ranking work?',
            intro: [
              'Each recorded game gives points to everyone who played, with more for the winner. The group ranking adds it all up; filters show a period, a season or a game type. Seasons are created by the organizer in the group settings (the "Settings" button on the group screen), and whoever finishes 1st gets the title on their profile.',
            ],
          },
          {
            id: 'conquistas',
            question: 'What are achievements?',
            intro: [
              'Badges that appear on your profile as you play: first game, first win, streaks, lightning win, loyal to the deck, season champion, 100 games, beating everyone in your group, playing 4 meetups in a row, playing all 12 months of a year, a tournament debut, making the top cut, tournament champion, the "Learn to play" lessons and more. Open a profile (tap a name in the ranking): the "Open" tab shows what is left, closest first, and "Completed" shows the ones you already have, with the date.',
              'When you earn new achievements, a window shows them all together the next time you open the dashboard or your profile, even if they came from several games.',
            ],
          },
          {
            id: 'notificacoes',
            question: 'What shows up in the notifications bell?',
            intro: [
              'The bell sits at the top of the website and on the app dashboard, with the number of new items. It lists the games you played, your group’s games, the achievements you earned, podium changes in your group and ArcanaKin announcements. Tap a notification to open the meetup, profile or ranking; it then counts as read. You can also mark one as read without opening it, or use "Mark all as read" at the top.',
              'Every week, ArcanaKin news arrives there too, in a short text.',
              'Notifications stay in the website and the app: e-mail and phone alerts are still only for meetups.',
            ],
          },
          {
            id: 'eventos-de-loja',
            question: 'How do I sign up for a store event?',
            intro: [
              'On the event page (on the store page, under "Upcoming events"): "Sign me up". If the spots are full, you go on the waitlist and move up automatically when someone drops out. Already at the store? In the account menu (in the app, Account → Store events), "Event code": type the code from the counter.',
              'The store team can also sign up people without an account, by name only, and mark who arrived (check-in). The public page only shows the spots: the names of who signed up stay with the store team.',
              'At tournament events, the team starts the tournament with everyone who checked in (guests too), and sign-ups close. Anyone can follow the tables, standings and timeline on the event page; players at a table report the result (the team reports for guests). Two-Headed Giant tournaments at stores aren’t possible yet.',
            ],
          },
          {
            id: 'lojas-perto',
            question: 'How do I find stores and events near me?',
            intro: [
              'Under "Stores and events" (link in the website footer, no account needed; in the app, Account → Stores and events): pick your city from the list and see tournaments and game nights in the next 30 days and stores within 50 km, closest first. "Use my location" sorts by distance from where you are (the position isn’t stored). Filters show only one format, one event type or stores that sell singles or sealed, have tables to play or run tournaments. Each event has "Download to calendar" and "Google Calendar". With an account, your city is saved in Settings and the page opens on it.',
              'Like a store? On its page, "Follow store": the store’s new events and notices arrive in your bell (and phone, if you turned notifications on). The store only sees how many people follow, not who. Team members send notices under "Manage the store" (up to 3 a week).',
            ],
          },
          {
            id: 'lojas',
            question: 'How does a store join ArcanaKin?',
            intro: [
              'The ArcanaKin team creates the store profile and sends an invite to the owner’s e-mail. Whoever gets it signs in (or creates an account) with that same e-mail and accepts the invite: it only works for that address and for 14 days. Then, under "Manage the store" (in the account menu), they can edit the city (picked from the list), the address with a map, hours, Instagram, WhatsApp, website, the formats the store plays and what it offers (singles, sealed and accessories, tables to play, tournaments), and invite the team by e-mail.',
              'The store’s public profile opens for anyone, without signing in, and doesn’t show the contact e-mail. The "Verified store" badge is given by the ArcanaKin team.',
            ],
          },
          {
            id: 'torneios',
            question: 'How does a group tournament work?',
            intro: [
              'The owner or an admin creates the tournament at a meetup (on the meetup itself, under "Create a tournament at this meetup", or in Meetups → Tournaments), in any format. In multiplayer formats (Commander, Brawl, Oathbreaker) tables are pods of 4, or 3 when the numbers don’t work out; in one-on-one formats (Modern, Pauper, Draft…) they are best-of-3 (or best-of-1) pairs, and in Two-Headed Giant each entry is a duo.',
              'Everyone enters with "Enter myself" (organizers can enter anyone in the group). When it starts, round 1 is drawn at random; later rounds group players with similar points and avoid repeat opponents, and with an odd number someone gets a bye (counts as a win). Players at a table report the result, which counts right away; organizers correct it when needed and open the next round once every table has a result.',
              'Standings use the tournament points (3/1/0 by default) and break ties with the official criteria: opponents’ match-win %, game-win % and opponents’ game-win %. If the tournament counts in the ranking, each game also becomes a group game.',
              'Top cut (optional, when creating the tournament or, at a store, when starting it): after the Swiss rounds, the best go on to elimination. In one-on-one, a top 4 or 8 bracket (1st against the last of the cut), and each table needs a winner. In pods, a top 4 (straight to the final table), 10 (the first two wait at the final) or 16 (four mixed pods); a drawn table goes to whoever finished higher in the Swiss. The winner of the final is the champion; the Swiss is locked once the top cut starts.',
              'For people outside the group to follow along (at an event, or to send on WhatsApp), the tournament page has a "Public link": it opens without signing in, refreshes on its own while the tournament runs and shows only each person’s first name.',
              'In one-on-one (and 2HG), the structure can be something other than Swiss: single elimination (random bracket, lose and you’re out, and the extra spots in the draw skip round 1), double elimination (a first loss drops you to the losers bracket and a second one knocks you out; the grand final is a single match) or round robin (everyone plays everyone else once, up to 16 entries). Pods always play Swiss.',
            ],
          },
          {
            id: 'retrospectiva',
            question: 'What is the monthly recap?',
            intro: [
              'On the 1st of each month, people in a group that played the month before get the recap notice in the bell: how many games and nights, the player of the month, first-timers, the month’s feats (including group records that fell) and the duel of the month. It also lives on the group screen, under "… recap". You can share the link: each month has its own (whoever gets October’s can’t open other months), and the page shows only first names, with no group name, place or e-mail.',
            ],
          },
          {
            id: 'recordes',
            question: 'Where do I see the group records?',
            intro: [
              'On the group screen, right at the top: fastest win, longest game, longest winning streak, night with the most games and the commander with the most wins, each with its meetup and date. Below, the group’s identity: the most played colors, how many different commanders have shown up and the meta of the last 90 days.',
            ],
          },
          {
            id: 'rivalidades',
            question: 'What are "Rivalries"?',
            intro: [
              'On the dashboard, "Your biggest rival" is who beat you the most and "Your favorite target" is who you beat the most, among group members who played with you at least 3 times. On someone else’s profile, you see the score between the two of you in the group. It’s just for fun: nobody sees other people’s rivalries.',
            ],
          },
          {
            id: 'com-quem-jogar',
            question: 'What is "Who to play with" on the dashboard?',
            intro: [
              "Up to 3 people in the group you have never played with, or haven't played with for over a month. Whoever already confirmed the next meetup shows up first. Tap a name to see the profile. Nobody else sees this list: it's just for you.",
            ],
          },
        ],
      },
      {
        id: 'avisos',
        title: 'Notices and notifications',
        questions: [
          {
            id: 'avisos-celular',
            question: 'How do I get notifications on my phone?',
            intro: [
              'The first time you RSVP to a meetup in the app, it asks whether you want to turn on notifications. If you prefer to do it later:',
            ],
            steps: [
              'In the app, open Account and turn on "Notifications on this phone".',
              'Accept the system permission. You’ll get new meetup, changes, cancellation, a reminder on the day and "the table filled up!".',
            ],
            notes: [
              'E-mail notices are turned on and off in Settings. Signing out turns off notifications on that phone.',
            ],
          },
        ],
      },
      {
        id: 'conta',
        title: 'Account and privacy',
        questions: [
          {
            id: 'foto',
            question: 'How do I change my photo?',
            intro: [
              'In Settings (website) or Account (app): "Choose photo" or "Change photo". JPEG, PNG or WebP work; the photo is cropped square and stored without the location and other file data. "Remove photo" brings back your initials. If you sign in with Google you start with your Google photo; once you upload your own, it stays.',
              'A store’s team changes its logo the same way, under "Manage the store".',
            ],
          },
          {
            id: 'fuso-idioma',
            question: 'How do I change time zone and language?',
            intro: [
              'In Settings. The time zone applies to every date and time you see and type; the language applies to the website and e-mails (the app follows the device language). On the home page, the PT | EN switch at the top also changes the language.',
            ],
          },
          {
            id: 'dados',
            question: 'What data does ArcanaKin keep, and how do I delete my account?',
            intro: [
              'Your account name, e-mail and photo, your groups, availability, meetups, games and decks. Nothing is sold or shared outside the group. In Settings (website) or Account (app) you can download your data and delete your account: personal data is erased and games stay in the group history as "Removed player".',
              'The full Privacy Policy is in the footer.',
            ],
          },
          {
            id: 'feedback',
            question: 'I found a problem or have an idea. Where do I send it?',
            intro: [
              'Use "Feedback" (in the website footer or the app’s Account tab). The message goes straight to the people running the project.',
            ],
          },
        ],
      },
    ],
  },
};
