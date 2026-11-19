# Descoberta de lojas e eventos por cidade (10.3) — desenho

Data: 19/11/2026. Para depois do beta de fevereiro de 2027. Complementa
`2026-11-18-torneios-e-lojas-design.md` (seção "Descoberta").

## Intenção

Quem procura **onde jogar** (torneios, noites de jogo) ou **onde comprar cartas** abre "Lojas e
eventos" e vê o que existe perto de si. A tela também é **porta de entrada** do ArcanaKin: abre
sem conta e aparece no Google para buscas como "onde jogar Magic em Curitiba".

## Decidido com o dono

- Duas buscas na mesma tela: **eventos** dos próximos dias e **lojas** (mesmo sem evento marcado,
  porque a loja também serve para comprar cartas).
- **"Perto":** a **cidade escolhida no perfil** por padrão; um botão **"Usar minha localização"**
  ordena por distância e inclui cidades vizinhas. Sem permissão, nada de localização precisa.
- **Pública e indexável:** funciona sem conta e tem páginas por cidade para buscadores.
- **Cidades:** lista completa de municípios do **IBGE** (5.570, com a coordenada do centro),
  guardada no banco. "Perto" de uma cidade = **até 50 km do centro dela**, então quem mora em
  Osasco vê as lojas de São Paulo sem dar localização.

## Objetivos

1. Página `/lojas`: escolher a cidade (ou usar a localização) e ver eventos e lojas por perto.
2. Páginas `/lojas/em/<uf>/<cidade>` (ex.: `/lojas/em/pr/curitiba`), públicas e indexáveis, só
   para cidades com pelo menos uma loja num raio de 50 km.
3. "Adicionar à agenda" nos eventos de loja (arquivo `.ics` e link do Google Agenda), também sem
   conta.
4. A loja diz **o que oferece**, e isso vira filtro.
5. A pessoa com conta guarda a sua cidade no perfil (site e app).
6. Tela equivalente no app.

## Fora do escopo (agora)

- Seguidores e avisos da loja (10.4).
- Mapa interativo com alfinetes (a página mostra distância em texto; o mapa da loja continua na
  página da loja).
- Avaliações, preços ou estoque de cartas.
- Eventos e encontros **de grupo**: são privados e nunca aparecem aqui.
- Eventos passados com campeões na página da loja (fica para quando houver histórico).

## O que não pode acontecer (anti-objetivos)

- Pedir a localização do aparelho sem a pessoa tocar em "Usar minha localização".
- Guardar ou registrar em log a posição do aparelho.
- Mostrar quem está inscrito num evento (nomes, contagem por pessoa); só vagas e números.
- Encher o Google de páginas vazias (cidades sem loja não têm página nem entram no sitemap).
- Quebrar as lojas já cadastradas (cidade em texto livre hoje).

## Abordagens consideradas

|                   | Como                                                         | Prós                                                           | Contras                                                                  |
| ----------------- | ------------------------------------------------------------ | -------------------------------------------------------------- | ------------------------------------------------------------------------ |
| A                 | Lista só com as cidades que têm loja                         | Simples, sem dado externo                                      | Quem mora em cidade sem loja não se acha; "perto" precisa de localização |
| **B (escolhida)** | Tabela do IBGE com todos os municípios e o centro de cada um | A cidade do perfil já resolve o "perto" (50 km), sem permissão | Carregar e manter uma tabela pública (~200 KB)                           |
| C                 | Buscar a cidade no Photon enquanto digita                    | Sem tabela                                                     | Depende de serviço externo a cada busca; páginas por cidade difíceis     |

Em todas, a distância é calculada no Postgres pela fórmula de haversine; com centenas de lojas,
não precisa de PostGIS.

## Desenho

### Dados

- **Tabela `municipalities`** (nova): `code` (código IBGE, 7 dígitos, chave), `name`, `uf` (sigla),
  `slug` (nome sem acento, minúsculo, com hífen), `lat`, `lng`. Carregada por uma migration de
  dados, para existir em todos os ambientes (produção, previews, E2E e PGlite dos testes).
  Índice único em (`uf`, `slug`).
- **Lojas:** nova coluna `municipality_code` (referência a `municipalities`). A coluna `city`
  continua só como texto de exibição durante a transição. Migração das lojas atuais: casar
  `city` por nome sem acento; o que não casar fica nulo e aparece para o admin em `/admin` →
  Lojas como "cidade a confirmar". Loja sem município não aparece na descoberta até o admin
  confirmar.
- **Coordenadas da loja:** continuam vindo do endereço escolhido no cadastro (Photon/Nominatim).
  Loja sem coordenadas usa o centro do município para a distância.
- **O que a loja oferece:** nova coluna `offers` (lista de textos) com valores fixos:
  `singles` (cartas avulsas), `sealed` (selados e acessórios), `play_space` (mesas para jogar),
  `tournaments` (torneios). Editada por dono e equipe no "Gerenciar a loja".
- **Pessoa:** nova coluna `user.municipality_code` (cidade do perfil, opcional). Entra na
  exportação de dados (LGPD) e é apagada com a conta. Escolhida em Configurações (site) e Conta
  (app), com busca por nome ("Curit…" → "Curitiba, PR").

### Busca

`findNearby(db, { lat, lng, radiusKm = 50, days = 30, formats?, offers? })` em
`packages/db/src/services/discovery.ts`:

- **Eventos:** eventos de loja agendados (não cancelados) de hoje até `days` dias, de lojas
  dentro do raio, mais cedo primeiro; cada um com loja, distância (km, 1 casa), formato, tipo
  (torneio ou noite livre), vagas e lista de espera em números.
- **Lojas:** dentro do raio, mais perto primeiro, com cidade, distância, o que oferece, formatos,
  selo de verificada, logo e o próximo evento.
- Distância por haversine em SQL, com um filtro prévio por caixa de latitude/longitude para não
  calcular para todas as lojas.

O ponto de partida é **o centro da cidade escolhida** ou **a posição do aparelho**. A posição
chega arredondada a 2 casas decimais (~1 km) e só vive durante a requisição: não vai para log,
banco nem Sentry.

### Telas

**Site, `/lojas`** (pública):

```
Lojas e eventos               [Curitiba, PR ▾]  [📍 Usar minha localização]
Próximos eventos  [Formato ▾] [Torneio | Noite livre]
  Sex 27/11, 19h · Commander de sexta · Loja do Mago · 3,2 km · 6 de 8 vagas  [+ Agenda]
Lojas  [Cartas avulsas] [Selados] [Mesas para jogar] [Torneios]
  Loja do Mago ✓ · Curitiba · 3,2 km · Cartas avulsas · Mesas · próximo: sex 27/11
```

- Sem conta: a cidade escolhida fica num cookie (só a cidade, sem posição); com conta, vem do
  perfil e a troca pergunta se quer salvar no perfil.
- Sem cidade nem localização: a página pede a cidade (busca) e lista as cidades com lojas.
- `/lojas/em/<uf>/<cidade>`: só para municípios que **têm loja** (não os vizinhos: dezenas de
  cidades de uma região metropolitana repetiriam as mesmas lojas e o Google trata isso como
  conteúdo duplicado). A mesma tela já com a cidade; título e descrição próprios
  ("Lojas e eventos de Magic em Curitiba, PR"), indexável, no sitemap; dados estruturados
  `schema.org` (`Store` e `Event`) para os buscadores.
- Município sem loja própria: `/lojas/em/...` responde 404 (nada de página vazia ou repetida);
  em `/lojas`, escolher essa cidade funciona normalmente pelo raio de 50 km. Sem loja nenhuma no
  raio: "Ainda não há lojas perto de Osasco" e as cidades com loja mais próximas.
- O caminho `em` fica reservado: nenhuma loja pode ter o endereço `/lojas/em`.

**"Adicionar à agenda":** `GET /api/v1/store-events/:id/ics` (público, só para evento agendado),
mais o link do Google Agenda, no evento e na lista. Mesmo formato do `.ics` dos encontros.

**App:** tela "Lojas e eventos" (Conta → e um atalho no painel), com a mesma busca pela API
(`GET /api/v1/discovery?…`, pública, com limite de uso por IP como as outras rotas abertas) e "Usar minha localização" pelo `expo-location`
(permissão "enquanto o app está em uso", texto explicando que a posição não é guardada).

### Privacidade e LGPD

- Política: a cidade do perfil (dado novo), o uso da localização só no momento da busca (sem
  guardar), e o que a página pública mostra das lojas e eventos (só dados da loja e números de
  vagas).
- Exportação e exclusão: `municipality_code` da pessoa.

### Acessibilidade

- Filtros com `aria-pressed`; lista de eventos e de lojas com títulos e nomes acessíveis completos
  (evento, loja, data, distância, vagas).
- "Usar minha localização": botão com o resultado anunciado em região de status ("Ordenado pela
  sua localização" ou o erro de permissão em texto).
- Rotas novas no `a11y.spec.ts`.

## Entregas sugeridas (um PR cada)

1. Municípios do IBGE + cidade e "o que oferece" da loja (admin e gerenciar) + migração das lojas
   atuais.
2. Busca no banco + `/lojas` e `/lojas/em/...` + `.ics` público + sitemap e SEO.
3. Cidade no perfil (site e app) + tela no app com `expo-location`.

## Chamadas minhas (o dono pode mudar)

- Raio de 50 km e janela de 30 dias para eventos.
- Os quatro valores de "o que oferece".
- Cookie só com a cidade para quem não tem conta.
- Página de cidade (`/lojas/em/...`) só existe para municípios com loja própria.
- Fonte das coordenadas dos municípios: a lista de municípios com latitude e longitude derivada do
  IBGE (repositório público `kelvins/municipios-brasileiros`). **Quem construir confere a
  licença antes;** se não servir, a alternativa é calcular o centro a partir das malhas do IBGE
  (CC BY 4.0), com a atribuição na página de privacidade/créditos.

## O que fica para quem construir

- Nome exato das rotas da API e dos componentes.
- Como gerar o `slug` (normalização de acentos) e tratar homônimos em UFs diferentes (o `uf` na
  URL resolve).
- Texto final das telas e da política (pt-BR e en).
