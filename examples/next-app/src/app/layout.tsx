import Link from 'next/link';
import type { ReactNode } from 'react';

import { VarifyDebug } from '@/varify';

import { ExposureQueue } from './exposure-queue';

const varifyScriptUrl = process.env.VARIFY_SCRIPT_URL;
const varifyIid = Number(process.env.VARIFY_IID);

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      {varifyScriptUrl !== undefined && (
        <head>
          <script
            dangerouslySetInnerHTML={{
              __html: `window.varify = Object.assign(window.varify || {}, { iid: ${varifyIid} }); window.dataLayer = window.dataLayer || [];`,
            }}
          />
          <script src={varifyScriptUrl} />
        </head>
      )}
      <body style={{ fontFamily: 'system-ui', margin: 32 }}>
        <nav style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
          <Link href="/">Server component</Link>
          <Link href="/client">Client component</Link>
          <Link href="/?varify-force=269-311">Force variation</Link>
          <Link href="/?varify-force=269-0">Force original</Link>
        </nav>
        {children}
        <ExposureQueue />
        <VarifyDebug />
      </body>
    </html>
  );
}
