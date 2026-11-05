const ONE_YEAR = 60 * 60 * 24 * 365;

/** Monta um header Set-Cookie para preferências do app (legíveis só pelo servidor, exceto quando indicado). */
export function preferenceCookie(
  name: string,
  value: string,
  options: { httpOnly?: boolean } = {},
) {
  return [
    `${name}=${encodeURIComponent(value)}`,
    'Path=/',
    `Max-Age=${ONE_YEAR}`,
    'SameSite=Lax',
    options.httpOnly === false ? null : 'HttpOnly',
    process.env.NODE_ENV === 'production' ? 'Secure' : null,
  ]
    .filter(Boolean)
    .join('; ');
}
