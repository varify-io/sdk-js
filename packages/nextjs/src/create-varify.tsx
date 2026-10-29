import {
  createVarifyClient,
  evaluate,
  fallbackAssignment,
  FORCE_PARAM,
  getAssignment,
  parseForceParam,
  type Assignment,
  type Evaluation,
  type VarifyClientOptions,
} from '@varify-io/core';
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import { cache, type ReactNode } from 'react';

import { isBotUserAgent } from './bot';
import { VarifyClientProvider } from './context';
import { cookieSettings, decodeState, encodeState, type CookieOptions } from './cookie';
import { VarifyDebugPanel } from './debug-panel';
import { VarifyTracking } from './tracking';

export interface CreateVarifyOptions extends VarifyClientOptions {
  cookie?: CookieOptions;
  isBot?: (request: NextRequest) => boolean;
  /** Logs every request's assignments. Defaults to on outside production. */
  debug?: boolean;
}

export type VarifyExperimentProps = { id: number; children?: ReactNode } & (
  | { variation: number; original?: never }
  | { original: true; variation?: never }
);

export interface VarifyProviderProps {
  children?: ReactNode;
}

export interface Varify {
  proxy: (request: NextRequest) => Promise<NextResponse>;
  getVariation: (experimentId: number) => Promise<Assignment>;
  /** The id Varify buckets this visitor by, e.g. to store next to your own user id. `null` for bots and routes outside the proxy matcher. */
  getVisitorId: () => Promise<string | null>;
  VarifyExperiment: (props: VarifyExperimentProps) => Promise<ReactNode>;
  VarifyProvider: (props: VarifyProviderProps) => Promise<ReactNode>;
  VarifyDebug: () => Promise<ReactNode>;
}

export const createVarify = (options: CreateVarifyOptions): Varify => {
  const client = createVarifyClient(options);
  const cookie = cookieSettings(options.cookie);
  const isBot = options.isBot ?? ((request: NextRequest) => isBotUserAgent(request.headers.get('user-agent')));
  const debug = options.debug ?? process.env.NODE_ENV !== 'production';

  const proxy = async (request: NextRequest): Promise<NextResponse> => {
    if (isBot(request)) {
      return NextResponse.next();
    }

    const current = decodeState(request.cookies.get(cookie.name)?.value);
    const force = parseForceParam(request.nextUrl.searchParams.get(FORCE_PARAM));
    const { state, changed } = evaluate(await client.loadConfig(), current, { force });
    if (!changed) {
      return NextResponse.next();
    }

    const value = encodeState(state);
    request.cookies.set(cookie.name, value);
    const response = NextResponse.next({ request: { headers: request.headers } });
    response.cookies.set(cookie.name, value, {
      path: '/',
      httpOnly: true,
      secure: request.nextUrl.protocol === 'https:',
      sameSite: cookie.sameSite,
      maxAge: cookie.maxAge,
      ...(cookie.domain === undefined ? {} : { domain: cookie.domain }),
    });
    // A CDN must never hand this visitor's id to anyone else.
    response.headers.set('cache-control', 'private, no-store');
    return response;
  };

  const getState = cache(async () => decodeState((await cookies()).get(cookie.name)?.value));

  const getEvaluation = cache(async (): Promise<Evaluation | null> => {
    const state = await getState();
    // Without an id from the proxy (bots, or a route outside its matcher) a fresh id would change on every request.
    if (state === undefined) {
      return null;
    }

    const evaluation = evaluate(await client.loadConfig(), state);
    if (debug) {
      console.debug(
        '[varify]',
        Object.fromEntries(
          [...evaluation.assignments].map(([id, assignment]) => [id, `${assignment.variation ?? 'original'} (${assignment.source})`]),
        ),
      );
    }
    return evaluation;
  });

  const getVariation = async (experimentId: number): Promise<Assignment> => {
    const evaluation = await getEvaluation();
    return evaluation === null ? fallbackAssignment(experimentId) : getAssignment(evaluation, experimentId);
  };

  const getVisitorId = async (): Promise<string | null> => (await getState())?.uid ?? null;

  const VarifyExperiment = async ({ id, variation, original, children }: VarifyExperimentProps): Promise<ReactNode> => {
    const assignment = await getVariation(id);
    const matches = original === true ? assignment.variation === null : assignment.variation === variation;
    return (
      <>
        {matches ? children : null}
        <VarifyTracking assignment={assignment} />
      </>
    );
  };

  const VarifyProvider = async ({ children }: VarifyProviderProps): Promise<ReactNode> => {
    const evaluation = await getEvaluation();
    return <VarifyClientProvider assignments={Object.fromEntries(evaluation?.assignments ?? [])}>{children}</VarifyClientProvider>;
  };

  const VarifyDebug = async (): Promise<ReactNode> => {
    if (!debug) {
      return null;
    }
    return <VarifyDebugPanel uid={await getVisitorId()} />;
  };

  return { proxy, getVariation, getVisitorId, VarifyExperiment, VarifyProvider, VarifyDebug };
};
