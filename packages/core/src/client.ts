import { isConfig } from './config';
import type { Config } from './types';

export type VarifyErrorReason = 'timeout' | 'network' | 'http' | 'invalid-config';

export class VarifyError extends Error {
  readonly reason: VarifyErrorReason;

  constructor(message: string, reason: VarifyErrorReason, options?: ErrorOptions) {
    super(message, options);
    this.name = 'VarifyError';
    this.reason = reason;
  }
}

export interface VarifyClientOptions {
  /** The team's public id (sqid). */
  teamId: string;
  configUrl?: string;
  timeoutMs?: number;
  fetch?: typeof fetch;
  onError?: (error: VarifyError) => void;
}

export interface VarifyClient {
  /** Never throws: any failure is reported to `onError` and yields `null`, which `evaluate` treats as "keep everything, show the original". */
  loadConfig(): Promise<Config | null>;
}

export const createVarifyClient = (options: VarifyClientOptions): VarifyClient => {
  const url = options.configUrl ?? `https://delivery.varify.io/ss/${encodeURIComponent(options.teamId)}.json`;
  const timeoutMs = options.timeoutMs ?? 300;
  const fetchConfig = options.fetch ?? globalThis.fetch;

  const fail = (error: VarifyError): null => {
    options.onError?.(error);
    return null;
  };

  return {
    async loadConfig() {
      try {
        const response = await fetchConfig(url, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(timeoutMs) });
        if (!response.ok) {
          return fail(new VarifyError(`Loading the Varify config failed with HTTP ${response.status}`, 'http'));
        }

        const body: unknown = await response.json();
        if (!isConfig(body)) {
          return fail(new VarifyError('The Varify config has an unexpected shape', 'invalid-config'));
        }
        return body;
      } catch (error) {
        if (error instanceof SyntaxError) {
          return fail(new VarifyError('The Varify config is not valid JSON', 'invalid-config', { cause: error }));
        }
        const isTimeout = error instanceof DOMException && error.name === 'TimeoutError';
        return fail(
          new VarifyError(
            isTimeout ? `Loading the Varify config took longer than ${timeoutMs} ms` : 'Loading the Varify config failed',
            isTimeout ? 'timeout' : 'network',
            {
              cause: error,
            },
          ),
        );
      }
    },
  };
};
