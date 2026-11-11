/**
 * Consentimento para cookies não essenciais (LGPD). Hoje só a gravação de sessões
 * (Hotjar/Contentsquare) depende dele; login, idioma, fuso e tema são essenciais.
 */
export const CONSENT_COOKIE = 'ak_consent';
export type Consent = 'accepted' | 'rejected';

/** Vale 6 meses; depois o aviso aparece de novo (o consentimento é renovado). */
export const CONSENT_MAX_AGE = 60 * 60 * 24 * 182;
export const CONSENT_EVENT = 'arcanakin:consent';

export function parseConsent(value: string | null | undefined): Consent | null {
  return value === 'accepted' || value === 'rejected' ? value : null;
}

/** Lê o consentimento de uma string de cookies (`document.cookie`). */
export function consentFromCookies(cookies: string): Consent | null {
  const match = cookies.match(new RegExp(`(?:^|;\\s*)${CONSENT_COOKIE}=([^;]*)`));
  return parseConsent(match?.[1]);
}

/** Cookies que o Contentsquare grava no navegador (apagados quando a pessoa recusa). */
const TRACKING_COOKIE = /^_(cs|uetsid|hj)/;

/** Salva a escolha, avisa a página e, ao recusar, apaga os cookies de gravação. */
export function saveConsent(consent: Consent, doc: Document = document) {
  const secure = doc.location?.protocol === 'https:' ? '; Secure' : '';
  doc.cookie = `${CONSENT_COOKIE}=${consent}; Path=/; Max-Age=${CONSENT_MAX_AGE}; SameSite=Lax${secure}`;
  if (consent === 'rejected') {
    const host = doc.location?.hostname ?? '';
    const domains = ['', host, `.${host.replace(/^www\./, '')}`];
    for (const pair of doc.cookie.split(';')) {
      const name = pair.split('=')[0]!.trim();
      if (!TRACKING_COOKIE.test(name)) continue;
      for (const domain of domains) {
        doc.cookie = `${name}=; Path=/; Max-Age=0${domain ? `; Domain=${domain}` : ''}`;
      }
    }
  }
  doc.defaultView?.dispatchEvent(new CustomEvent<Consent>(CONSENT_EVENT, { detail: consent }));
}
