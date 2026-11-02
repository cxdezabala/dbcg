import 'server-only';
import { getLocale, getMessages } from 'next-intl/server';
import { makeDict, translate, type Locale, type TFn } from './translate';

/** Server-side t(): same dictionary and rules as the client hook. */
export async function getT(): Promise<{ t: TFn; locale: Locale }> {
  const locale = (await getLocale()) as Locale;
  const msgs = (await getMessages()) as { dict?: [string, string][] };
  const D = makeDict(msgs.dict);
  return { locale, t: (s: string) => translate(s, locale, D) };
}
