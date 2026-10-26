import { VarifyProvider } from '@/varify';

import { ClientCta } from './client-cta';

export default function ClientPage() {
  return (
    <VarifyProvider>
      <main>
        <h1>Client component</h1>
        <ClientCta />
      </main>
    </VarifyProvider>
  );
}
