export interface ConfigVariation {
  id: number;
  slug: string;
  traffic_allocation: number;
}

export interface ConfigExperiment {
  id: number;
  slug: string;
  tracking_enabled: boolean;
  variations: ConfigVariation[];
}

export interface Config {
  experiments: ConfigExperiment[];
}

export interface State {
  uid: string;
  /** Experiment id → variation id; `null` is the original. */
  assignments: Record<number, number | null>;
}

export interface TrackingPayload {
  experiment: { id: number; name: string };
  variation: { id: number | null; name: string | null };
}

export type AssignmentSource = 'forced' | 'stored' | 'hash' | 'fallback';

export interface Assignment {
  experimentId: number;
  /** `null` is the original. */
  variation: number | null;
  /** `null` means do not track. */
  tracking: TrackingPayload | null;
  source: AssignmentSource;
}

export interface ForcedVariation {
  experimentId: number;
  /** `null` forces the original. */
  variationId: number | null;
}

export interface Evaluation {
  state: State;
  /** Whether `state` differs from the state passed in and has to be persisted. */
  changed: boolean;
  assignments: Map<number, Assignment>;
}
