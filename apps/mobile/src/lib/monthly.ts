import { Alert, Linking } from 'react-native';
import { api } from './api';
import { t } from './i18n';

/**
 * Abre a retrospectiva do mês (página do site) no navegador. O navegador não tem a sessão do app,
 * então o servidor devolve o endereço com o código de acesso do mês.
 */
export async function openMonthlyRecap(groupId: string, month: string) {
  try {
    await Linking.openURL(await api.stats.monthlyLink(groupId, month));
  } catch {
    Alert.alert(t('loadError'));
  }
}
