import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { cookies } from 'next/headers';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'SYNERGON',
  description: 'Intelligence · Alignment · Exponential Capabilities Enablement — fictional demonstration data (Asterion Business Solutions).',
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const [locale, messages, jar] = await Promise.all([getLocale(), getMessages(), cookies()]);
  const theme = jar.get('theme')?.value === 'dark' ? 'dark' : 'light';
  return (
    <html lang={locale} data-theme={theme}>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
