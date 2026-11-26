# Leitura de cartas pela câmera (5.9) — plano

Data: 18/11/2026 (atualizado em 26/11/2026). Situação: **plano para seguir em dezembro de 2026**, junto com as contas de desenvolvedor da Apple e do Google. **Precisa estar pronto antes do beta de fevereiro.**

## Atualização de 26/11/2026: plano de dezembro

Desde este plano, a leitura pela câmera saiu **no site** (11.6, #261 e #263, atrás da flag `card-scanner`) e foi testada com cartas reais no iPhone do dono. Muito do que este plano previa construir **já existe** e o app reaproveita.

**Já existe (servidor e `core`):**

- **Interpretação do texto:** `readCardText`, em `packages/core/src/decks/scan.ts`, testada com leituras reais: nomes em inglês e português, código da edição em minúsculas, número sem o ano, linhas de copyright e de tipo descartadas.
- **Rota:** `POST /api/v1/cards/scan` (em vez da `/cards/recognize` prevista abaixo), com limite de 40 por minuto, flag por grupo e 404 sem a flag. A busca vai nesta ordem: edição + número conferidos com o nome; nome aproximado com semelhança mínima; nome impresso em português; edição + número sem conferir.
- **Comportamento validado no site:**
  - leitura contínua, em que cada carta nova entra sozinha;
  - a mesma carta parada não entra de novo, e a moldura vazia "zera";
  - o servidor só é consultado quando aparece uma carta nova;
  - lista para conferir com edição, foil, "Trocar edição" e remover.

**O que falta, só no app:**

1. **Build de desenvolvimento** (`expo-dev-client`, perfis no `eas.json`). O Expo Go não tem câmera com leitura de texto.
2. **Câmera e leitura no aparelho:**
   - Google ML Kit (texto), mais rápido e preciso que o Tesseract do site;
   - a imagem não sai do aparelho, e só o texto e as linhas (com a altura relativa) vão para a rota que já existe;
   - na primeira semana, conferir a compatibilidade do Vision Camera e do plugin de ML Kit com o Expo SDK 58 (ver Riscos). Se não houver plugin mantido, começar com foto + ML Kit sobre a imagem parada.
3. **Tela de leitura:**
   - moldura, leitura contínua ligada por padrão, vibração ao adicionar e lanterna;
   - a mesma lógica do site: interpretar no aparelho com `readCardText` e só consultar o servidor quando a carta muda.
4. **Revisão:** lista com edição (o seletor que já existe), foil e remover; depois "Adicionar N cartas" na coleção ou no deck (board escolhido), com as mesmas rotas do site.
5. **Flag no app:** o app pergunta ao servidor se pode ler cartas (`canScan` no `/api/v1/me` ou numa rota de recursos) e mostra o botão só para os grupos liberados, como no site.

**Ordem em dezembro (um PR por item):**

| #   | Entrega                                                                                                                                      | Precisa de                                                                                           |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| 1   | Build de desenvolvimento (Android e iPhone), guia no `AGENTS.md`/README e Sentry com mapas de código (#177)                                  | Dono: `eas login` (conta grátis da Expo) e as contas da Apple/Google; ou Android Studio/Xcode no Mac |
| 2   | Prova de conceito: câmera + ML Kit numa tela escondida, com o texto lido na tela; teste com 50 cartas (normais, foil, antigas, em português) | Dono testa no aparelho                                                                               |
| 3   | `canScan` no servidor e no `api-client` (com casos em `autorizacao.test.ts`)                                                                 | —                                                                                                    |
| 4   | Tela de leitura contínua e revisão na **coleção**                                                                                            | —                                                                                                    |
| 5   | No **deck** (board escolhido) e ajustes do teste                                                                                             | Dono testa com o grupo                                                                               |
| 6   | Tirar a flag (site e app), com ajuda, novidade e capturas                                                                                    | Teste com o grupo aprovado                                                                           |

**Decisões que já valem:**

- leitura contínua ligada por padrão, com "Ler carta" manual como alternativa;
- coleção primeiro, depois o deck;
- confirmar a lista antes de gravar;
- imagem só no aparelho.

**Ainda em aberto:** a câmera ao vivo (Vision Camera) ou a foto. A prova de conceito decide.

O restante deste documento é o plano original (18/11), mantido como referência.

## O que é

A pessoa aponta o celular para uma carta (ou para várias, uma depois da outra) e ela entra:

- **na coleção**, o uso principal: cadastrar cartas sem digitar;
- **num deck**, ao montar ou importar;
- **numa lista**, para revisar antes de salvar.

O app reconhece a carta e a **edição** (código e número de colecionador, quando a carta tem), mostra o que entendeu e deixa corrigir antes de salvar.

## Decisão: não reescrever o app

Não precisamos refazer os apps em Kotlin (Android Studio) e Swift (Xcode). O app continua em **Expo + React Native**, com a mesma base de código para Android e iOS e o mesmo `@boramarcar/api-client` do site. O que muda:

- **Sai o Expo Go** como forma de testar. Ele só tem os módulos nativos dele, e a câmera com leitura de texto precisa de módulos nativos novos.
- **Entra o build de desenvolvimento** (`expo-dev-client`): um app nosso, instalado no aparelho, que tem os módulos nativos e continua recebendo o código JavaScript ao vivo, como o Expo Go.
- **Android Studio e Xcode viram ferramentas, não projeto.** Eles servem para compilar e instalar no aparelho (`npx expo run:android` e `npx expo run:ios`), ou o EAS compila na nuvem. As pastas `android/` e `ios/` continuam geradas a partir do `app.json` (CNG) e nunca são editadas à mão.

Reescrever em nativo daria duas bases de código e duplicaria telas, API, traduções e testes. Também nos faria perder o compartilhamento com o site. Não há ganho que justifique isso para a leitura de cartas.

**O que você precisa no computador:**

|          | Android                                 | iOS                                                                                                |
| -------- | --------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Programa | Android Studio (SDK e emulador)         | Xcode (só no Mac)                                                                                  |
| Aparelho | Celular com "depuração USB" ligada      | iPhone ligado ao Mac                                                                               |
| Conta    | Não precisa para testar no seu aparelho | Apple ID grátis instala por 7 dias; a conta paga (dezembro) tira esse limite e libera o TestFlight |

## Como reconhecer a carta (o que a pesquisa mostrou)

Os apps de coleção (ManaBox, Delver Lens, SpellScan, Scrytics) usam reconhecimento **no próprio aparelho**. O caminho comum é ler o **texto** da carta e casar com o banco de cartas, e não comparar a imagem inteira:

1. **Nome da carta:** a linha do topo, pelo reconhecimento de texto (OCR).
2. **Edição:** nas cartas desde 2023, o canto inferior esquerdo traz o número de colecionador, o código da edição e o idioma (ex.: `0098 · FIN · EN`). Com isso, o Scryfall devolve a impressão exata (`GET /cards/:code/:number/:lang`).
3. **Casamento:**
   - com código e número, a edição exata;
   - só com o nome, a busca aproximada do Scryfall (`/cards/named?fuzzy=`), que já usamos;
   - nome em português, pela busca em português que já existe (`lang:pt`, inclusive cartas de duas faces).
4. **Qualidade:** um relato de quem construiu um leitor mostra que o número de colecionador só é lido bem com a imagem nítida (de 33% para 78% de acerto ao descartar quadros borrados). Por isso:
   - esperar a carta parar e a imagem ficar nítida;
   - ler 2 ou 3 quadros seguidos e só aceitar quando concordam;
   - sempre mostrar o resultado para confirmar.
5. **O que é difícil:** foil com reflexo, cartas antigas sem número, artes alternativas com o mesmo número. A tela de confirmação resolve com "trocar edição", o mesmo seletor que já existe.

**Bibliotecas candidatas** (conferir as versões compatíveis com o Expo SDK 58 no começo do trabalho; ver Riscos):

- **Câmera:** `react-native-vision-camera`. Tem plugin para o Expo e processa os quadros ao vivo.
- **Leitura de texto:** Google ML Kit pelo plugin de quadros do Vision Camera (`react-native-vision-camera-mlkit` e semelhantes). É grátis, roda sem internet e não manda imagem para servidor nenhum.
- **Alternativa mais simples para a primeira versão:** `expo-camera` para tirar a foto e ML Kit sobre a imagem parada (`@react-native-ml-kit/text-recognition`). É menos fluido (um toque por carta), mas tem menos peças.

**Privacidade:** a imagem não sai do aparelho. Só o texto lido (nome, código e número) vai para a nossa API, que consulta o Scryfall. Isso fica escrito na política de privacidade.

## Experiência

1. **Entrada:** "Ler cartas com a câmera" na coleção e no editor de deck do app, ao lado do "Adicionar".
2. **Tela da câmera:**
   - moldura de carta na tela e a dica "Aponte para uma carta, com boa luz";
   - lanterna;
   - contador de cartas lidas.
3. **Leitura contínua:**
   - ao reconhecer, vibra de leve e mostra um cartão pequeno ("Sol Ring · C21 #263");
   - a carta entra na **lista da sessão** e a câmera já espera a próxima;
   - a mesma carta lida de novo soma uma cópia.
4. **Revisão:**
   - a lista com quantidade, edição (trocável), foil e proxy;
   - remover itens antes de salvar;
   - "Salvar na coleção" ou "Adicionar ao deck".
5. **Falhou?** "Não reconheci: digite o nome", que cai na busca que já existe.
6. **Acessibilidade:**
   - o resultado é anunciado ao leitor de tela;
   - tudo funciona sem depender de ver o cartão de confirmação;
   - existe sempre o caminho por texto.

## Entregas (dezembro e janeiro)

1. **Build de desenvolvimento** (primeira semana de dezembro, assim que as contas existirem):
   - `expo-dev-client`;
   - perfis `development`, `preview` e `production` no `eas.json`;
   - instalar no seu Android e no seu iPhone;
   - ligar o Sentry com os mapas de código (#177);
   - guia em `apps/mobile/AGENTS.md` e no README.
2. **Prova de conceito:**
   - câmera e leitura de texto;
   - um teste com 50 cartas reais (normais, foil, antigas, em português) para medir o acerto do nome e da edição;
   - **a decisão entre leitura ao vivo e foto** sai daqui.
3. **Casamento no servidor:**
   - rota `POST /api/v1/cards/recognize` recebe o texto lido e devolve a carta e a edição;
   - a lógica fica no `core`, com testes de casos reais lidos na prova de conceito.
4. **Tela de leitura e revisão:** coleção primeiro, depois o deck.
5. **Ensaio no beta:** entra no roteiro de teste em aparelhos reais e nas novidades da semana.
6. **Publicação:** o build de pré-lançamento (TestFlight e teste interno do Google Play) já sai com a câmera.

**E o site?** Dá para ler pela webcam no navegador, com reconhecimento de texto em JavaScript, mas é mais lento e menos preciso. Fica fora por enquanto. O site continua com a busca e a importação por texto.

## Riscos e o que conferir primeiro

- **Compatibilidade com o Expo SDK 58** (e a nova arquitetura do React Native) do Vision Camera e do plugin de ML Kit. Vários plugins de OCR ainda dependem de `react-native-worklets-core`. Se não houver um plugin mantido, a alternativa da foto com ML Kit cobre a primeira versão.
- **iOS 16 ou mais novo** é exigido pelo ML Kit.
- **Tamanho do app:** os modelos do ML Kit aumentam o download.
- **Permissões:** o texto do pedido de câmera (iOS e Android) tem que dizer para que serve. Ele vai no `app.json`, em pt-BR e en.

## Decisões para você

1. **Começar pela leitura ao vivo ou pela foto?** Proposta: decidir depois da prova de conceito com as 50 cartas.
2. **Onde a câmera entra primeiro:** coleção (proposta) ou deck?

## Fontes

- [Scryfall: carta por código e número (`/cards/:code/:number/:lang`)](https://scryfall.com/docs/api/cards/collector) e [busca em lote (`/cards/collection`)](https://scryfall.com/docs/api/cards/collection)
- [Plugin ML Kit para Vision Camera (pedrol2b)](https://github.com/pedrol2b/react-native-vision-camera-mlkit), [react-native-vision-camera-text-recognition](https://www.npmjs.com/package/react-native-vision-camera-text-recognition), [react-native-vision-camera-mlkit-plugin](https://packages.ecosyste.ms/registries/npmjs.org/packages/react-native-vision-camera-mlkit-plugin)
- [Como fiz um leitor de cartas no aparelho com Apple Vision (HackerNoon)](https://hackernoon.com/how-i-built-an-on-device-trading-card-scanner-with-apple-vision?source=rss), [MTGScan (OCR + busca aproximada)](https://fortierq.github.io/mtgscan-ocr-azure-flask-celery-socketio), [comparação de leitores 2026 (Scrytics)](https://scrytics.com/blog/best-mtg-card-scanner-app-2026), [SpellScan](https://play.google.com/store/apps/details?id=com.spellscan.app)
- Expo: [usando o Sentry](https://docs.expo.dev/guides/using-sentry/); para o build de desenvolvimento e o Vision Camera, ler a documentação da versão 58 no começo do trabalho (orientação do `apps/mobile/AGENTS.md`).
