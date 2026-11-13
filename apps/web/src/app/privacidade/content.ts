/**
 * Texto da Política de Privacidade (LGPD, Lei 13.709/2018). Fica aqui, e não nas mensagens, por
 * ser um documento longo. Mudou o que o app coleta, com quem compartilha ou por quanto tempo
 * guarda? Atualize os dois idiomas e a data.
 */

export interface PolicySection {
  id: string;
  title: string;
  paragraphs?: string[];
  items?: string[];
  /** Parágrafos depois da lista. */
  after?: string[];
}

export interface PrivacyPolicy {
  title: string;
  updated: string;
  intro: string;
  contactLabel: string;
  sections: PolicySection[];
}

export const PRIVACY_UPDATED = '2026-11-13';

export const PRIVACY_POLICY: Record<'pt-BR' | 'en', PrivacyPolicy> = {
  'pt-BR': {
    title: 'Política de Privacidade',
    updated: 'Atualizada em {date}',
    intro:
      'Esta política explica quais dados pessoais a ArcanaKin trata, para quê, com quem compartilha, por quanto tempo guarda e como você exerce os seus direitos, conforme a Lei Geral de Proteção de Dados (LGPD, Lei nº 13.709/2018).',
    contactLabel: 'Contato de privacidade (encarregado)',
    sections: [
      {
        id: 'controlador',
        title: '1. Quem cuida dos seus dados',
        paragraphs: [
          'A ArcanaKin é um projeto independente e sem fins lucrativos. Ela é a controladora dos dados e também a encarregada pelo tratamento. Para qualquer assunto de privacidade, escreva para o e-mail de contato indicado acima.',
        ],
      },
      {
        id: 'dados',
        title: '2. Quais dados tratamos',
        items: [
          'Da sua conta Google, ao entrar com ela: nome, e-mail, foto de perfil e o identificador da conta. Não pedimos acesso ao Gmail, ao Drive nem a nenhum outro serviço do Google.',
          'Se você cria a conta com e-mail e senha: nome, e-mail e a senha guardada só como hash (embaralhada de um jeito que não dá para desfazer; ninguém, nem nós, consegue ver a senha). O e-mail é usado para confirmar a conta e para redefinir a senha.',
          'O que você informa no app: grupos de que participa, disponibilidade, locais e endereços cadastrados, encontros e presenças, partidas e resultados, decks e preferências (fuso horário, idioma, tema e avisos por e-mail). Se você liga os avisos no celular, guardamos o identificador de notificação daquele aparelho (apagado quando você desliga, sai da conta ou desinstala o app).',
          'Feedback que você envia pelo site ou pelo app: o texto, o tipo, a página de onde veio e a plataforma, junto com a sua conta.',
          'Dados técnicos: cookies de sessão, endereço IP e registros de acesso mantidos pelo provedor de hospedagem, métricas de uso agregadas do Vercel Analytics (sem cookies e sem identificar você) e, quando algo dá errado, o registro do erro no Sentry, sem nome nem e-mail.',
          'Só com o seu consentimento: gravação de como as telas são usadas (cliques, rolagem, navegação e mapas de calor) pelo Hotjar (Contentsquare). O que você digita em campos de formulário não é gravado, e o seu e-mail é mascarado na tela.',
        ],
      },
      {
        id: 'finalidades',
        title: '3. Para que usamos e com qual base legal',
        items: [
          'Criar e manter a sua conta, montar os grupos, sugerir horários, marcar encontros, registrar partidas, calcular o ranking e analisar decks: execução do serviço que você pediu (art. 7º, V).',
          'Enviar avisos por e-mail (encontros, lembretes e mudanças): execução do serviço; você pode desligar em Configurações.',
          'Segurança, prevenção de abuso, correção de erros e métricas agregadas sem cookies: legítimo interesse (art. 7º, IX), sempre no mínimo necessário.',
          'Ler e responder ao feedback que você envia (pelo seu e-mail) e melhorar o app com ele: legítimo interesse (art. 7º, IX).',
          'Gravação de sessões com o Hotjar, para entender onde as pessoas têm dificuldade e melhorar o app: consentimento (art. 7º, I), que você pode dar ou retirar a qualquer momento.',
        ],
        after: [
          'Não vendemos dados, não usamos os seus dados para publicidade e não tomamos decisões automatizadas que afetem os seus direitos.',
        ],
      },
      {
        id: 'compartilhamento',
        title: '4. Quem mais vê os seus dados',
        paragraphs: [
          'As pessoas dos seus grupos veem o seu nome, a sua foto, a sua disponibilidade, presenças, partidas e os decks que você deixou visíveis para o grupo ou público. O seu e-mail não aparece para outros jogadores.',
          'O resumo de um encontro finalizado (página "Resumo do encontro", feita para mandar no grupo) pode ser aberto por quem tiver o link: mostra só o título e a data do encontro, o primeiro nome de quem jogou, os comandantes e o placar — nada de local, foto, e-mail ou nome do grupo.',
          'Usamos estes serviços (operadores), cada um só com os dados necessários para a sua função:',
        ],
        items: [
          'Google: login (OpenID Connect).',
          'Vercel: hospedagem do site e da API, e métricas agregadas sem cookies.',
          'Sentry: registro de erros do site (mensagem do erro, página, navegador e sistema), sem nome, e-mail nem gravação de tela.',
          'Neon: banco de dados.',
          'Resend: envio dos e-mails de aviso, de confirmação da conta e de redefinição de senha.',
          'Expo (Expo Push), Apple e Google: entrega das notificações no celular, para quem as liga no app. Recebem o identificador do aparelho e o texto do aviso (ex.: nome e horário do encontro).',
          'Hotjar/Contentsquare: gravação de sessões, só com o seu consentimento.',
          'OpenStreetMap (Nominatim) e Photon (Komoot): busca de endereços. Recebem só o texto do endereço digitado.',
          'Scryfall, Archidekt, Moxfield, Commander Spellbook, EDHREC e Banco Central: dados de cartas, decks públicos, combos e cotação do dólar. Não recebem dados pessoais.',
        ],
      },
      {
        id: 'transferencia',
        title: '5. Transferência internacional',
        paragraphs: [
          'Alguns desses serviços guardam dados fora do Brasil, principalmente nos Estados Unidos e na União Europeia. Escolhemos provedores que adotam cláusulas contratuais e medidas de segurança compatíveis com a LGPD (art. 33).',
        ],
      },
      {
        id: 'cookies',
        title: '6. Cookies e armazenamento no navegador',
        items: [
          'Essenciais (sempre ativos): sessão de login, idioma, fuso horário e a sua escolha sobre cookies. O tema claro/escuro fica no armazenamento local do navegador.',
          'Não essenciais (só com consentimento): cookies do Hotjar/Contentsquare para a gravação de sessões. Recusar não muda nada no funcionamento do app.',
        ],
        after: [
          'A sua escolha vale por 6 meses; depois perguntamos de novo. Você pode mudar quando quiser em Configurações → Privacidade e dados.',
        ],
      },
      {
        id: 'retencao',
        title: '7. Por quanto tempo guardamos',
        paragraphs: [
          'Os dados ficam enquanto a sua conta existir. Ao excluir a conta, apagamos na hora o seu login, perfil, foto, decks, disponibilidade, presenças futuras e os locais que você hospeda. As partidas já registradas continuam no histórico dos grupos, sem nome, e-mail ou foto, como “Jogador removido”, porque também fazem parte da história dos outros jogadores. Cópias de segurança do banco de dados e registros técnicos dos provedores são descartados no ciclo normal deles, em até 30 dias.',
        ],
      },
      {
        id: 'direitos',
        title: '8. Os seus direitos',
        paragraphs: ['Pela LGPD (art. 18), você pode, a qualquer momento:'],
        items: [
          'confirmar que tratamos os seus dados e acessá-los;',
          'corrigir dados incompletos ou desatualizados;',
          'pedir anonimização, bloqueio ou eliminação de dados desnecessários;',
          'levar os seus dados para outro serviço (portabilidade);',
          'saber com quem compartilhamos;',
          'retirar o consentimento e excluir a sua conta;',
          'reclamar à Autoridade Nacional de Proteção de Dados (ANPD).',
        ],
      },
      {
        id: 'como',
        title: '9. Como exercer os seus direitos',
        paragraphs: [
          'Em Configurações → Privacidade e dados você baixa os seus dados (arquivo JSON), muda a escolha sobre cookies e exclui a sua conta, sem precisar pedir para ninguém. Para o resto, escreva para o e-mail de contato: respondemos em até 15 dias.',
        ],
      },
      {
        id: 'seguranca',
        title: '10. Segurança',
        paragraphs: [
          'Todo o tráfego usa HTTPS, o acesso ao banco de dados é restrito e as credenciais ficam só no servidor. Nenhum sistema é 100% seguro: se acontecer um incidente que possa trazer risco a você, avisaremos você e a ANPD.',
        ],
      },
      {
        id: 'criancas',
        title: '11. Crianças',
        paragraphs: [
          'A ArcanaKin não é destinada a crianças, e não tratamos de propósito dados de menores de 12 anos. Se você acha que isso aconteceu, escreva para nós e apagamos os dados.',
        ],
      },
      {
        id: 'mudancas',
        title: '12. Mudanças nesta política',
        paragraphs: [
          'Quando esta política mudar, atualizamos a data no topo. Mudanças importantes, como novos usos dos dados, também são avisadas no app.',
        ],
      },
    ],
  },
  en: {
    title: 'Privacy Policy',
    updated: 'Updated on {date}',
    intro:
      'This policy explains which personal data ArcanaKin processes, why, who it is shared with, how long it is kept and how you exercise your rights, under Brazil’s General Data Protection Law (LGPD, Law 13,709/2018).',
    contactLabel: 'Privacy contact (data protection officer)',
    sections: [
      {
        id: 'controlador',
        title: '1. Who looks after your data',
        paragraphs: [
          'ArcanaKin is an independent, non-profit project. It is the data controller and also the data protection officer. For any privacy matter, write to the contact e-mail shown above.',
        ],
      },
      {
        id: 'dados',
        title: '2. What data we process',
        items: [
          'From your Google account, when you sign in with it: name, e-mail, profile photo and the account identifier. We don’t ask for access to Gmail, Drive or any other Google service.',
          'If you create the account with e-mail and password: name, e-mail and the password stored only as a hash (scrambled in a way that can’t be undone; nobody, not even us, can see it). The e-mail is used to confirm the account and to reset the password.',
          'What you enter in the app: the groups you are in, availability, places and addresses, meetups and RSVPs, games and results, decks and preferences (time zone, language, theme and e-mail notices). If you turn on notifications on your phone, we keep that device’s notification identifier (deleted when you turn them off, sign out or uninstall the app).',
          'Feedback you send from the website or the app: the text, the type, the page you came from and the platform, with your account.',
          'Technical data: session cookies, IP address and access logs kept by the hosting provider, aggregated usage metrics from Vercel Analytics (no cookies, doesn’t identify you) and, when something goes wrong, the error log in Sentry, without name or e-mail.',
          'Only with your consent: recordings of how screens are used (clicks, scrolling, navigation and heatmaps) by Hotjar (Contentsquare). What you type in form fields isn’t recorded, and your e-mail is masked on screen.',
        ],
      },
      {
        id: 'finalidades',
        title: '3. Why we use it and on what legal basis',
        items: [
          'Creating and keeping your account, running groups, suggesting times, scheduling meetups, recording games, computing the ranking and analyzing decks: performing the service you asked for (art. 7, V).',
          'Sending e-mail notices (meetups, reminders and changes): performing the service; you can turn them off in Settings.',
          'Security, abuse prevention, bug fixing and cookieless aggregated metrics: legitimate interest (art. 7, IX), always to the minimum necessary.',
          'Reading and replying to the feedback you send (to your e-mail) and improving the app with it: legitimate interest (art. 7, IX).',
          'Session recording with Hotjar, to understand where people struggle and improve the app: consent (art. 7, I), which you can give or withdraw at any time.',
        ],
        after: [
          'We don’t sell data, don’t use your data for advertising and don’t make automated decisions that affect your rights.',
        ],
      },
      {
        id: 'compartilhamento',
        title: '4. Who else sees your data',
        paragraphs: [
          'People in your groups see your name, photo, availability, RSVPs, games and the decks you made visible to the group or public. Your e-mail isn’t shown to other players.',
          'The recap of a finished meetup (the “Meetup recap” page, made to send to the group) can be opened by anyone with the link: it shows only the meetup’s title and date, the first names of who played, the commanders and the score — no place, photo, e-mail or group name.',
          'We use these services (processors), each with only the data it needs:',
        ],
        items: [
          'Google: sign-in (OpenID Connect).',
          'Vercel: hosting of the site and API, and cookieless aggregated metrics.',
          'Sentry: error logging for the site (error message, page, browser and system), without name, e-mail or screen recording.',
          'Neon: database.',
          'Resend: sending notice, account confirmation and password reset e-mails.',
          'Expo (Expo Push), Apple and Google: delivering phone notifications, for those who turn them on in the app. They receive the device identifier and the notice text (e.g. the meetup name and time).',
          'Hotjar/Contentsquare: session recording, only with your consent.',
          'OpenStreetMap (Nominatim) and Photon (Komoot): address search. They only receive the address text you type.',
          'Scryfall, Archidekt, Moxfield, Commander Spellbook, EDHREC and Brazil’s Central Bank: card data, public decks, combos and the dollar rate. They receive no personal data.',
        ],
      },
      {
        id: 'transferencia',
        title: '5. International transfers',
        paragraphs: [
          'Some of these services store data outside Brazil, mainly in the United States and the European Union. We choose providers that adopt contractual clauses and security measures compatible with the LGPD (art. 33).',
        ],
      },
      {
        id: 'cookies',
        title: '6. Cookies and browser storage',
        items: [
          'Essential (always on): sign-in session, language, time zone and your cookie choice. The light/dark theme is kept in the browser’s local storage.',
          'Non-essential (only with consent): Hotjar/Contentsquare cookies for session recording. Declining doesn’t change how the app works.',
        ],
        after: [
          'Your choice lasts 6 months; then we ask again. You can change it anytime in Settings → Privacy and data.',
        ],
      },
      {
        id: 'retencao',
        title: '7. How long we keep it',
        paragraphs: [
          'Data is kept while your account exists. When you delete your account, we immediately delete your sign-in, profile, photo, decks, availability, upcoming RSVPs and the places you host. Games already recorded stay in the groups’ history, without name, e-mail or photo, as “Jogador removido” (removed player), because they are also part of the other players’ history. Database backups and providers’ technical logs are discarded in their normal cycle, within 30 days.',
        ],
      },
      {
        id: 'direitos',
        title: '8. Your rights',
        paragraphs: ['Under the LGPD (art. 18), you can at any time:'],
        items: [
          'confirm that we process your data and access it;',
          'correct incomplete or outdated data;',
          'ask for anonymization, blocking or deletion of unnecessary data;',
          'take your data to another service (portability);',
          'know who we share it with;',
          'withdraw consent and delete your account;',
          'file a complaint with Brazil’s data protection authority (ANPD).',
        ],
      },
      {
        id: 'como',
        title: '9. How to exercise your rights',
        paragraphs: [
          'In Settings → Privacy and data you can download your data (JSON file), change your cookie choice and delete your account, without asking anyone. For anything else, write to the contact e-mail: we answer within 15 days.',
        ],
      },
      {
        id: 'seguranca',
        title: '10. Security',
        paragraphs: [
          'All traffic uses HTTPS, database access is restricted and credentials stay on the server only. No system is 100% secure: if an incident could put you at risk, we will tell you and the ANPD.',
        ],
      },
      {
        id: 'criancas',
        title: '11. Children',
        paragraphs: [
          'ArcanaKin isn’t meant for children, and we don’t knowingly process data of children under 12. If you think that happened, write to us and we will delete the data.',
        ],
      },
      {
        id: 'mudancas',
        title: '12. Changes to this policy',
        paragraphs: [
          'When this policy changes, we update the date at the top. Important changes, such as new uses of data, are also announced in the app.',
        ],
      },
    ],
  },
};
