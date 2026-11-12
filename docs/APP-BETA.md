# App no beta: como gerar e distribuir

O app (`apps/mobile`) é gerado na nuvem pelo **EAS** (Expo). Não precisa de Xcode nem Android
Studio. Os perfis estão em `apps/mobile/eas.json`; os dois usam o servidor de produção
(`EXPO_PUBLIC_API_URL=https://www.arcanakin.com.br`).

| Perfil       | Para quê                                             | Contas necessárias                   |
| ------------ | ---------------------------------------------------- | ------------------------------------ |
| `preview`    | Android: APK instalável por link (beta sem loja)     | Expo                                 |
| `production` | Lojas: TestFlight (iPhone) e teste fechado (Android) | Expo + Apple Developer + Google Play |

## 1. Uma vez só: ligar o projeto ao Expo

No Terminal do Mac, na pasta do repositório:

```bash
cd apps/mobile
npx eas-cli@latest login      # entra com a conta do expo.dev
npx eas-cli@latest init       # cria o projeto e grava extra.eas.projectId no app.json
```

Faça commit do `app.json` alterado (o `projectId` não é segredo). Sem ele, as notificações push
não funcionam.

## 2. Android para o beta (sem loja)

```bash
npx eas-cli@latest build --platform android --profile preview
```

Na primeira vez o EAS pergunta se pode gerar a chave de assinatura: responda **sim** (ela fica
guardada no Expo). No fim aparece um link e um QR code: quem abrir no Android baixa e instala o APK
(o sistema pede para permitir "instalar apps desta fonte"). Mande esse link para os grupos do beta.

## 3. iPhone (precisa da conta Apple Developer, US$ 99/ano)

```bash
npx eas-cli@latest build --platform ios --profile production
npx eas-cli@latest submit --platform ios --latest
```

O EAS cria certificados e o app no App Store Connect. Depois, no App Store Connect → TestFlight,
adicione os testadores por e-mail (teste interno: até 100 pessoas, sem revisão; teste externo:
link público, com uma revisão rápida da Apple).

## 4. Android pela Play Store (opcional, US$ 25 uma vez)

```bash
npx eas-cli@latest build --platform android --profile production
npx eas-cli@latest submit --platform android --latest
```

Na primeira vez, o envio pela linha de comando precisa de uma chave de conta de serviço do Google
Play; o mais simples é subir o primeiro `.aab` à mão no Play Console (Teste → Teste fechado).

## Convites e o app

A página do convite (`/convite/CÓDIGO`) mostra o código e o link "abra o convite no app"
(`arcanakin://convite/CÓDIGO`). No app, sem grupo, a tela inicial oferece **entrar com o código**
ou **criar um grupo**. Sem login, o app guarda o convite e entra no grupo logo depois do login.
