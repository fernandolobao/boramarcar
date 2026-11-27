import type { LearnLocale, Lesson } from './index';

/**
 * Bloco "Além do básico" (trilha intermediária): para quem já joga e quer entender por que as
 * coisas acontecem do jeito que acontecem. Texto **nosso** (Política de Conteúdo de Fãs), nos dois
 * idiomas, com as mesmas seções. Regras conferidas com as Regras Abrangentes atuais (ex.: desde
 * Foundations, o atacante divide o dano entre os bloqueadores como quiser).
 */
export const INTERMEDIATE_TRACK: Record<LearnLocale, { title: string; intro: string }> = {
  'pt-BR': {
    title: 'Além do básico',
    intro:
      'Para quem já joga: prioridade e respostas, combate avançado, habilidades, ações baseadas em estado, vantagem de cartas e o Commander a fundo.',
  },
  en: {
    title: 'Beyond the basics',
    intro:
      'For players who already play: priority and responses, advanced combat, abilities, state-based actions, card advantage and Commander in depth.',
  },
};

export const INTERMEDIATE_LESSONS: Record<LearnLocale, Lesson[]> = {
  'pt-BR': [
    {
      id: 'prioridade-e-respostas',
      track: 'intermediate',
      title: 'Prioridade e respostas',
      summary: 'Quem pode agir e quando: responder a uma resposta e o que usa (ou não) a pilha.',
      minutes: 5,
      sections: [
        {
          id: 'prioridade',
          heading: 'Prioridade: a vez de agir',
          paragraphs: [
            'Ter prioridade é ter a vez de lançar uma mágica instantânea ou ativar uma habilidade. Quem está no próprio turno recebe a prioridade primeiro em cada passo e fase.',
            'Quando você lança algo, a prioridade volta para você; ao passar, ela vai para o próximo jogador. Só quando todos passam em seguida, sem fazer nada, o objeto do topo da pilha resolve.',
            'Depois que algo resolve, quem está no turno recebe a prioridade de novo: dá para responder de novo antes de o próximo objeto resolver.',
          ],
        },
        {
          id: 'resposta-a-resposta',
          heading: 'Resposta à resposta',
          paragraphs: [
            'Se o oponente lança Lightning Bolt na sua criatura e você responde com Giant Growth, ele ainda pode responder ao Giant Growth, por exemplo com Counterspell.',
            'A pilha fica com o Raio embaixo, o Giant Growth no meio e o Counterspell no topo. O Counterspell resolve primeiro e anula o Giant Growth; depois o Raio resolve, e a criatura recebe os 3 de dano sem o bônus.',
          ],
          cards: ['Counterspell', 'Lightning Bolt', 'Giant Growth'],
        },
        {
          id: 'sem-pilha',
          heading: 'O que não usa a pilha',
          paragraphs: [
            'Jogar um terreno não usa a pilha: ninguém pode responder. Habilidades de mana, como {T}: adicione {G}, também resolvem na hora.',
            'Habilidades disparadas e ativadas (que não sejam de mana) usam a pilha, como as mágicas: dá para responder a elas.',
          ],
          cards: ['Llanowar Elves'],
        },
      ],
      remember: [
        'Algo só resolve quando todos passam a prioridade em seguida.',
        'Dá para responder a uma resposta: o último a entrar na pilha resolve primeiro.',
        'Terreno e habilidade de mana não usam a pilha.',
      ],
    },
    {
      id: 'combate-avancado',
      track: 'intermediate',
      title: 'Combate avançado',
      summary:
        'Iniciativa, golpe duplo, ameaçar, vários bloqueadores e atropelar com toque mortífero.',
      minutes: 5,
      sections: [
        {
          id: 'iniciativa',
          heading: 'Iniciativa e golpe duplo',
          paragraphs: [
            'Quando alguma criatura no combate tem iniciativa ou golpe duplo, o dano acontece em duas etapas: primeiro quem tem iniciativa ou golpe duplo, depois as demais (e de novo quem tem golpe duplo).',
            'Por isso um 2/2 com iniciativa que bloqueia um 2/2 comum sobrevive: o outro morre antes de causar dano.',
          ],
          cards: ['White Knight', 'Boros Swiftblade'],
        },
        {
          id: 'varios-bloqueadores',
          heading: 'Ameaçar e vários bloqueadores',
          paragraphs: [
            'Uma criatura com ameaçar só pode ser bloqueada por duas ou mais criaturas.',
            'Quando várias criaturas bloqueiam o mesmo atacante, quem ataca divide o dano entre elas como quiser. Todas as bloqueadoras causam dano ao atacante.',
          ],
          cards: ['Boggart Brute'],
        },
        {
          id: 'atropelar-e-toque',
          heading: 'Atropelar e toque mortífero',
          paragraphs: [
            'Com atropelar, o atacante só precisa causar dano letal a cada bloqueadora; o resto vai para o jogador. Dano letal é o que falta para a resistência da criatura (contando o dano que ela já recebeu).',
            'Com toque mortífero, 1 de dano já é letal. Um atacante com atropelar e toque mortífero causa 1 a cada bloqueadora e manda todo o resto para o jogador.',
          ],
          cards: ['Colossal Dreadmaw', 'Typhoid Rats'],
        },
        {
          id: 'truques',
          heading: 'Truques de combate',
          paragraphs: [
            'O melhor momento para um truque (como um +3/+3) costuma ser depois dos bloqueios: o oponente já se comprometeu e não pode mudar de ideia.',
          ],
        },
      ],
      remember: [
        'Iniciativa e golpe duplo causam dano antes das outras criaturas.',
        'Com vários bloqueadores, quem ataca divide o dano como quiser.',
        'Atropelar + toque mortífero: 1 em cada bloqueadora, o resto no jogador.',
      ],
    },
    {
      id: 'habilidades',
      track: 'intermediate',
      title: 'Habilidades: disparadas, ativadas e estáticas',
      summary: 'Como reconhecer cada tipo de habilidade e quando cada uma acontece.',
      minutes: 4,
      sections: [
        {
          id: 'tipos',
          heading: 'Os três tipos',
          paragraphs: [
            'Ativada: tem custo e efeito separados por dois-pontos ("{T}: cause 1 ponto de dano"). Você escolhe quando usar, sempre que tiver prioridade (ou só como feitiço, se a carta disser).',
            'Disparada: começa com "quando", "sempre que" ou "no início de". Acontece sozinha quando a condição ocorre e vai para a pilha.',
            'Estática: está sempre valendo enquanto a carta está em jogo, como "As criaturas que você controla recebem +1/+1".',
          ],
          cards: ['Prodigal Pyromancer', 'Soul Warden', 'Glorious Anthem'],
        },
        {
          id: 'gatilhos',
          heading: 'Vários gatilhos ao mesmo tempo',
          paragraphs: [
            'Se vários gatilhos disparam juntos, cada jogador põe os seus na pilha na ordem que quiser, começando por quem está no turno. Como a pilha resolve de cima para baixo, os gatilhos de quem está no turno resolvem por último.',
            'Leia com atenção a quem o gatilho se refere: "sempre que outra criatura entrar" vale para criaturas de qualquer jogador, não só as suas.',
          ],
        },
      ],
      remember: [
        'Custo: efeito = ativada. "Quando / sempre que / no início de" = disparada.',
        'Estática vale sempre, sem usar a pilha.',
        'Gatilhos de quem está no turno vão primeiro para a pilha e resolvem por último.',
      ],
    },
    {
      id: 'acoes-de-estado',
      track: 'intermediate',
      title: 'Ações baseadas em estado e substituições',
      summary:
        'Por que uma criatura morre "sozinha" e o que muda quando uma carta diz "em vez de".',
      minutes: 4,
      sections: [
        {
          id: 'estado',
          heading: 'O jogo confere sozinho',
          paragraphs: [
            'Antes de qualquer jogador receber a prioridade, o jogo confere algumas situações e resolve na hora, sem pilha: criatura com resistência 0 ou menos vai para o cemitério; criatura com dano igual ou maior que a resistência é destruída; jogador com 0 de vida ou 10 de veneno perde.',
            'Também é assim que funcionam a regra das lendárias (duas com o mesmo nome: o dono escolhe uma e a outra vai para o cemitério) e os 21 de dano de comandante.',
          ],
          cards: ['Thalia, Guardian of Thraben'],
        },
        {
          id: 'fim-do-turno',
          heading: 'Dano e efeitos "até o fim do turno"',
          paragraphs: [
            'O dano marcado nas criaturas some na etapa de limpeza, no fim do turno, ao mesmo tempo que acabam os efeitos "até o fim do turno". Por isso uma criatura que recebeu dano enquanto estava fortalecida sobrevive quando o bônus acaba.',
          ],
          cards: ['Giant Growth'],
        },
        {
          id: 'substituicao',
          heading: 'Efeitos de substituição',
          paragraphs: [
            'Quando uma carta diz "em vez de", o evento original nem acontece: ele é trocado por outro. Com Rest in Peace, cartas que iriam para o cemitério vão para o exílio em vez disso, e nada dispara "quando morrer".',
            'Substituições não usam a pilha e não dá para responder a elas: só a quem as criou.',
          ],
          cards: ['Rest in Peace'],
        },
      ],
      remember: [
        'Resistência 0, dano letal, 0 de vida e 10 de veneno são conferidos sozinhos, sem pilha.',
        'No fim do turno, o dano some junto com os efeitos "até o fim do turno".',
        '"Em vez de" troca o evento: o original não acontece.',
      ],
    },
    {
      id: 'vantagem-de-cartas',
      track: 'intermediate',
      title: 'Vantagem de cartas e tempo',
      summary:
        'Como avaliar uma troca: quantas cartas cada um gasta e quanto tempo cada jogada ganha.',
      minutes: 4,
      sections: [
        {
          id: 'cartas',
          heading: 'Vantagem de cartas',
          paragraphs: [
            'Cada carta é um recurso. Se você gasta uma carta e o oponente perde duas, você ganhou um "dois por um". Comprar cartas extras e criaturas que fazem algo ao entrar são jeitos comuns de ficar à frente.',
            'Ravenous Chupacabra é o exemplo clássico: uma carta que deixa uma criatura na mesa e destrói outra do oponente.',
          ],
          cards: ['Divination', 'Ravenous Chupacabra'],
        },
        {
          id: 'tempo',
          heading: 'Tempo',
          paragraphs: [
            'Tempo é usar a mana de cada turno da forma mais eficiente: lançar algo em todo turno e fazer o oponente gastar mais mana para responder do que você gastou.',
            'Às vezes vale perder uma carta para ganhar tempo, como devolver à mão uma criatura cara que o oponente acabou de lançar.',
          ],
        },
        {
          id: 'na-mesa',
          heading: 'No seu deck',
          paragraphs: [
            'A análise de deck do ArcanaKin conta compra, remoção e ramp: são justamente as funções que dão vantagem de cartas e de tempo. A curva de mana mostra se você tem o que lançar em cada turno.',
          ],
        },
      ],
      remember: [
        'Uma carta que resolve duas do oponente é vantagem de cartas.',
        'Tempo é usar bem a mana de cada turno.',
        'Compra, remoção, ramp e curva aparecem na análise do deck.',
      ],
    },
    {
      id: 'commander-a-fundo',
      track: 'intermediate',
      title: 'Commander a fundo',
      summary: 'Dano de comandante, parceiros e como ler uma mesa de quatro jogadores.',
      minutes: 5,
      sections: [
        {
          id: 'dano',
          heading: 'Dano de comandante',
          paragraphs: [
            'Quem recebe 21 ou mais de dano de combate de um mesmo comandante ao longo da partida perde, mesmo com vida sobrando.',
            'Conta só dano de combate, e cada comandante conta separado: com parceiros, 12 de um e 9 do outro não somam 21.',
          ],
          cards: ['Thrasios, Triton Hero', 'Tymna the Weaver'],
        },
        {
          id: 'zonas',
          heading: 'Para onde o comandante vai',
          paragraphs: [
            'Se o comandante iria para a mão ou para o grimório, o dono pode mandá-lo para a zona de comando em vez disso. Se ele foi para o cemitério ou para o exílio, o dono também pode devolvê-lo à zona de comando.',
            'Lembre do imposto: cada vez que você o lança da zona de comando, ele custa {2} a mais.',
          ],
        },
        {
          id: 'mesa',
          heading: 'Ler a mesa',
          paragraphs: [
            'Com quatro jogadores, quem parece mais forte vira alvo de todos. Às vezes vale esperar, segurar uma resposta ou atacar quem está para vencer, e não quem está mais fraco.',
            'Acordos de mesa ("não ataco você se você não me atacar") fazem parte do Commander, mas não são regras: ninguém é obrigado a cumprir.',
          ],
        },
      ],
      remember: [
        '21 de dano de combate do mesmo comandante derrubam; parceiros contam separado.',
        'O dono decide se o comandante volta à zona de comando.',
        'Na mesa de quatro, ameace com cuidado e ataque quem está para vencer.',
      ],
    },
  ],
  en: [
    {
      id: 'prioridade-e-respostas',
      track: 'intermediate',
      title: 'Priority and responses',
      summary:
        'Who can act and when: responding to a response, and what does (or does not) use the stack.',
      minutes: 5,
      sections: [
        {
          id: 'prioridade',
          heading: 'Priority: your chance to act',
          paragraphs: [
            'Having priority means it is your chance to cast an instant or activate an ability. The player whose turn it is gets priority first in each step and phase.',
            'When you cast something, priority comes back to you; when you pass, it goes to the next player. Only when everyone passes in a row, without doing anything, does the top of the stack resolve.',
            'After something resolves, the player whose turn it is gets priority again: you can respond again before the next object resolves.',
          ],
        },
        {
          id: 'resposta-a-resposta',
          heading: 'Responding to a response',
          paragraphs: [
            'If your opponent casts Lightning Bolt at your creature and you respond with Giant Growth, they can still respond to the Giant Growth, for example with Counterspell.',
            'The stack has the Bolt at the bottom, Giant Growth in the middle and Counterspell on top. Counterspell resolves first and counters Giant Growth; then the Bolt resolves, and the creature takes 3 damage without the bonus.',
          ],
          cards: ['Counterspell', 'Lightning Bolt', 'Giant Growth'],
        },
        {
          id: 'sem-pilha',
          heading: 'What does not use the stack',
          paragraphs: [
            'Playing a land does not use the stack: no one can respond. Mana abilities, like {T}: add {G}, also resolve right away.',
            'Triggered and activated abilities (other than mana abilities) use the stack, like spells: you can respond to them.',
          ],
          cards: ['Llanowar Elves'],
        },
      ],
      remember: [
        'Something resolves only when everyone passes priority in a row.',
        'You can respond to a response: the last one on the stack resolves first.',
        'Lands and mana abilities do not use the stack.',
      ],
    },
    {
      id: 'combate-avancado',
      track: 'intermediate',
      title: 'Advanced combat',
      summary:
        'First strike, double strike, menace, multiple blockers, and trample with deathtouch.',
      minutes: 5,
      sections: [
        {
          id: 'iniciativa',
          heading: 'First strike and double strike',
          paragraphs: [
            'When a creature in combat has first strike or double strike, damage happens in two steps: first the creatures with first strike or double strike, then the rest (and the double strikers again).',
            'That is why a 2/2 with first strike blocking a plain 2/2 survives: the other one dies before dealing damage.',
          ],
          cards: ['White Knight', 'Boros Swiftblade'],
        },
        {
          id: 'varios-bloqueadores',
          heading: 'Menace and multiple blockers',
          paragraphs: [
            'A creature with menace can only be blocked by two or more creatures.',
            'When several creatures block the same attacker, the attacking player divides the damage among them however they like. Every blocker deals damage to the attacker.',
          ],
          cards: ['Boggart Brute'],
        },
        {
          id: 'atropelar-e-toque',
          heading: 'Trample and deathtouch',
          paragraphs: [
            'With trample, the attacker only needs to deal lethal damage to each blocker; the rest goes to the player. Lethal damage is what the creature still needs to reach its toughness (counting damage it already took).',
            'With deathtouch, 1 damage is already lethal. An attacker with trample and deathtouch deals 1 to each blocker and sends everything else to the player.',
          ],
          cards: ['Colossal Dreadmaw', 'Typhoid Rats'],
        },
        {
          id: 'truques',
          heading: 'Combat tricks',
          paragraphs: [
            'The best time for a trick (like a +3/+3) is usually after blocks: your opponent has committed and cannot change their mind.',
          ],
        },
      ],
      remember: [
        'First strike and double strike deal damage before other creatures.',
        'With several blockers, the attacker divides damage however they like.',
        'Trample + deathtouch: 1 to each blocker, the rest to the player.',
      ],
    },
    {
      id: 'habilidades',
      track: 'intermediate',
      title: 'Abilities: triggered, activated and static',
      summary: 'How to recognize each kind of ability and when each one happens.',
      minutes: 4,
      sections: [
        {
          id: 'tipos',
          heading: 'The three kinds',
          paragraphs: [
            'Activated: cost and effect separated by a colon ("{T}: deal 1 damage"). You choose when to use it, whenever you have priority (or only as a sorcery, if the card says so).',
            'Triggered: starts with "when", "whenever" or "at the beginning of". It happens on its own when the condition occurs and goes on the stack.',
            'Static: always on while the card is in play, like "Creatures you control get +1/+1".',
          ],
          cards: ['Prodigal Pyromancer', 'Soul Warden', 'Glorious Anthem'],
        },
        {
          id: 'gatilhos',
          heading: 'Several triggers at once',
          paragraphs: [
            'If several triggers happen together, each player puts theirs on the stack in any order, starting with the player whose turn it is. Since the stack resolves from the top down, the active player’s triggers resolve last.',
            'Read carefully who a trigger refers to: "whenever another creature enters" counts creatures of any player, not just yours.',
          ],
        },
      ],
      remember: [
        'Cost: effect = activated. "When / whenever / at the beginning of" = triggered.',
        'Static abilities always apply, without using the stack.',
        'The active player’s triggers go on the stack first and resolve last.',
      ],
    },
    {
      id: 'acoes-de-estado',
      track: 'intermediate',
      title: 'State-based actions and replacements',
      summary: 'Why a creature dies "on its own" and what changes when a card says "instead".',
      minutes: 4,
      sections: [
        {
          id: 'estado',
          heading: 'The game checks on its own',
          paragraphs: [
            'Before any player gets priority, the game checks some situations and handles them right away, without the stack: a creature with 0 or less toughness goes to the graveyard; a creature with damage equal to or greater than its toughness is destroyed; a player with 0 life or 10 poison loses.',
            'The legend rule works the same way (two with the same name: the owner chooses one and the other goes to the graveyard), and so do the 21 commander damage.',
          ],
          cards: ['Thalia, Guardian of Thraben'],
        },
        {
          id: 'fim-do-turno',
          heading: 'Damage and "until end of turn" effects',
          paragraphs: [
            'Damage marked on creatures wears off in the cleanup step, at the end of the turn, at the same time "until end of turn" effects end. That is why a creature that took damage while pumped survives when the bonus ends.',
          ],
          cards: ['Giant Growth'],
        },
        {
          id: 'substituicao',
          heading: 'Replacement effects',
          paragraphs: [
            'When a card says "instead", the original event does not even happen: it is swapped for another one. With Rest in Peace, cards that would go to the graveyard are exiled instead, and nothing triggers "when it dies".',
            'Replacements do not use the stack and cannot be responded to: only the card that creates them can.',
          ],
          cards: ['Rest in Peace'],
        },
      ],
      remember: [
        '0 toughness, lethal damage, 0 life and 10 poison are checked on their own, without the stack.',
        'At end of turn, damage wears off together with "until end of turn" effects.',
        '"Instead" swaps the event: the original does not happen.',
      ],
    },
    {
      id: 'vantagem-de-cartas',
      track: 'intermediate',
      title: 'Card advantage and tempo',
      summary:
        'How to judge a trade: how many cards each side spends and how much time each play buys.',
      minutes: 4,
      sections: [
        {
          id: 'cartas',
          heading: 'Card advantage',
          paragraphs: [
            'Every card is a resource. If you spend one card and your opponent loses two, you got a "two-for-one". Drawing extra cards and creatures that do something when they enter are common ways to get ahead.',
            'Ravenous Chupacabra is the classic example: one card that leaves a creature on the battlefield and destroys one of your opponent’s.',
          ],
          cards: ['Divination', 'Ravenous Chupacabra'],
        },
        {
          id: 'tempo',
          heading: 'Tempo',
          paragraphs: [
            'Tempo is using each turn’s mana as efficiently as possible: casting something every turn and making your opponent spend more mana to answer it than you spent.',
            'Sometimes it is worth losing a card to gain time, like bouncing an expensive creature your opponent just cast.',
          ],
        },
        {
          id: 'na-mesa',
          heading: 'In your deck',
          paragraphs: [
            'ArcanaKin’s deck analysis counts card draw, removal and ramp: exactly the roles that give card and tempo advantage. The mana curve shows whether you have something to cast every turn.',
          ],
        },
      ],
      remember: [
        'One card that answers two of your opponent’s is card advantage.',
        'Tempo is using each turn’s mana well.',
        'Draw, removal, ramp and curve show up in the deck analysis.',
      ],
    },
    {
      id: 'commander-a-fundo',
      track: 'intermediate',
      title: 'Commander in depth',
      summary: 'Commander damage, partners and how to read a four-player table.',
      minutes: 5,
      sections: [
        {
          id: 'dano',
          heading: 'Commander damage',
          paragraphs: [
            'A player who takes 21 or more combat damage from the same commander over the game loses, even with life to spare.',
            'Only combat damage counts, and each commander counts separately: with partners, 12 from one and 9 from the other do not add up to 21.',
          ],
          cards: ['Thrasios, Triton Hero', 'Tymna the Weaver'],
        },
        {
          id: 'zonas',
          heading: 'Where the commander goes',
          paragraphs: [
            'If your commander would go to your hand or library, you may put it into the command zone instead. If it went to the graveyard or exile, you may also return it to the command zone.',
            'Remember the tax: each time you cast it from the command zone, it costs {2} more.',
          ],
        },
        {
          id: 'mesa',
          heading: 'Reading the table',
          paragraphs: [
            'With four players, whoever looks strongest becomes everyone’s target. Sometimes it is worth waiting, holding up an answer or attacking whoever is about to win, not whoever is weakest.',
            'Table deals ("I won’t attack you if you don’t attack me") are part of Commander, but they are not rules: no one has to keep them.',
          ],
        },
      ],
      remember: [
        '21 combat damage from the same commander knocks a player out; partners count separately.',
        'The owner decides whether the commander goes back to the command zone.',
        'At a four-player table, threaten carefully and attack whoever is about to win.',
      ],
    },
  ],
};
