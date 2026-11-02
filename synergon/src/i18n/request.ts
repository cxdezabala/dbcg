import { cookies } from 'next/headers';
import { getRequestConfig } from 'next-intl/server';

export const LOCALES = ['en', 'es'] as const;
export const LOCALE_COOKIE = 'NEXT_LOCALE';

// Locale lives in a cookie (EN/ES switch in the top bar) — no locale prefix in URLs.
export default getRequestConfig(async () => {
  const c = (await cookies()).get(LOCALE_COOKIE)?.value;
  const locale = c === 'es' ? 'es' : 'en';
  return { locale, messages: (await import(`../../messages/${locale}.json`)).default };
});
