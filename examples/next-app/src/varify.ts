import { createVarify } from '@varify-io/nextjs';

export const varify = createVarify({
  teamId: process.env.VARIFY_TEAM_ID ?? '',
  ...(process.env.VARIFY_CONFIG_URL === undefined ? {} : { configUrl: process.env.VARIFY_CONFIG_URL }),
  onError: (error) => console.warn('[varify]', error.reason, error.message),
});

export const { VarifyExperiment, VarifyProvider, VarifyDebug, getVariation, getVisitorId } = varify;

export const EXPERIMENT_ID = Number(process.env.VARIFY_EXPERIMENT_ID ?? 269);
export const VARIATION_ID = Number(process.env.VARIFY_VARIATION_ID ?? 311);
