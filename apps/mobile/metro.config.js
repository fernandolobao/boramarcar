// Metro do Expo com o Sentry: identificadores nos pacotes e nos mapas de código, para os erros
// do app apontarem a linha certa. Sem o Sentry configurado, funciona igual ao padrão do Expo.
// O Metro lê este arquivo como CommonJS.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getSentryExpoConfig } = require('@sentry/react-native/metro');

module.exports = getSentryExpoConfig(__dirname);
