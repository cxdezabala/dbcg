'use client';
import { useLocale, useMessages } from 'next-intl';
import { useMemo } from 'react';
import { makeDict, translate, type Locale, type TFn } from './translate';

export function useT(): TFn {
  const locale = useLocale() as Locale;
  const msgs = useMessages() as unknown as { dict?: [string, string][] };
  return useMemo(() => { const D = makeDict(msgs.dict); return (s: string) => translate(s, locale, D); }, [locale, msgs]);
}
