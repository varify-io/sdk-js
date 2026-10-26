import { EXPERIMENT_ID, getVariation, VARIATION_ID, VarifyExperiment } from '@/varify';

export default async function ServerPage() {
  const { variation } = await getVariation(EXPERIMENT_ID);

  return (
    <main>
      <h1>Server component</h1>
      <VarifyExperiment id={EXPERIMENT_ID} variation={VARIATION_ID}>
        <button style={{ background: 'seagreen', color: 'white', padding: 12 }}>Variation: new CTA</button>
      </VarifyExperiment>
      <VarifyExperiment id={EXPERIMENT_ID} original>
        <button style={{ padding: 12 }}>Original CTA</button>
      </VarifyExperiment>
      <p>
        getVariation({EXPERIMENT_ID}) → {variation ?? 'original'}
      </p>
    </main>
  );
}
