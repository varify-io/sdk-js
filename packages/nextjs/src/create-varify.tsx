import {
  createVarifyClient,
  evaluate,
  fallbackAssignment,
  FORCE_PARAM,
  getAssignment,
  parseForceParam,
  type Assignment,
  type Evaluation,
  type State,
  type VarifyClientOptions,
} from '@varify-io/core';
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import { cache, type ReactNode } from 'react';

import { isBotUserAgent } from './bot';
import { VarifyClientProvider } from './context';
import { cookieState, decodeState, encodeState, type CookieStateStore } from './cookie';
import { VarifyDebugPanel } from './debug-panel';
import { VarifyTracking } from './tracking';

/** A store for customers who persist the state themselves, e.g. next to their own user record. */
export interface StateStore {
  get(): State | undefined | Promise<State | undefined>;
  /** Called from Server Components, where Next.js forbids setting cookies; a database is fine. */
  set(state: State): void | Promise<void>;
}

export interface CreateVarifyOptions extends VarifyClientOptions {
  store?: CookieStateStore | StateStore;
  isBot?: (request: NextRequest) => boolean;
  /** Logs every request's assignments. Defaults to on outside production. */
  debug?: boolean;
}

export type VarifyExperimentProps = { id: number; children?: ReactNode } & (
  | { variation: number; original?: never }
  | { original: true; variation?: never }
);

const isCookieStore = (store: CookieStateStore | StateStore): store is CookieStateStore => 'kind' in store && store.kind === 'cookie';

export interface Varify {
  proxy: (request: NextRequest) => Promise<NextResponse>;
  getVariation: (experimentId: number) => Promise<Assignment>;
  VarifyExperiment: (props: VarifyExperimentProps) => Promise<ReactNode>;
  VarifyProvider: (props: { children?: ReactNode }) => Promise<ReactNode>;
  VarifyDebug: () => Promise<ReactNode>;
}

export const createVarify = (options: CreateVarifyOptions): Varify => {
  const client = createVarifyClient(options);
  const store = options.store ?? cookieState();
  const isBot = options.isBot ?? ((request: NextRequest) => isBotUserAgent(request.headers.get('user-agent')));
  const debug = options.debug ?? process.env.NODE_ENV !== 'production';

  const proxy = async (request: NextRequest): Promise<NextResponse> => {
    if (!isCookieStore(store) || isBot(request)) {
      return NextResponse.next();
    }

    const current = decodeState(request.cookies.get(store.name)?.value);
    const force = parseForceParam(request.nextUrl.searchParams.get(FORCE_PARAM));
    const { state, changed } = evaluate(await client.loadConfig(), current, { force });
    if (!changed) {
      return NextResponse.next();
    }

    const value = encodeState(state);
    request.cookies.set(store.name, value);
    const response = NextResponse.next({ request: { headers: request.headers } });
    response.cookies.set(store.name, value, {
      path: '/',
      httpOnly: true,
      secure: request.nextUrl.protocol === 'https:',
      sameSite: store.sameSite,
      maxAge: store.maxAge,
      ...(store.domain === undefined ? {} : { domain: store.domain }),
    });
    // A CDN must never hand this visitor's id to anyone else.
    response.headers.set('cache-control', 'private, no-store');
    return response;
  };

  const getEvaluation = cache(async (): Promise<Evaluation | null> => {
    const state = isCookieStore(store) ? decodeState((await cookies()).get(store.name)?.value) : await store.get();
    // Without an id from the proxy (bots, or a route outside its matcher) a fresh id would change on every request.
    if (state === undefined && isCookieStore(store)) {
      return null;
    }

    const evaluation = evaluate(await client.loadConfig(), state);
    if (!isCookieStore(store) && evaluation.changed) {
      await store.set(evaluation.state);
    }
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

  const VarifyProvider = async ({ children }: { children?: ReactNode }): Promise<ReactNode> => {
    const evaluation = await getEvaluation();
    return <VarifyClientProvider assignments={Object.fromEntries(evaluation?.assignments ?? [])}>{children}</VarifyClientProvider>;
  };

  const VarifyDebug = async (): Promise<ReactNode> => {
    if (!debug) {
      return null;
    }
    const evaluation = await getEvaluation();
    return <VarifyDebugPanel uid={evaluation?.state.uid ?? null} />;
  };

  return { proxy, getVariation, VarifyExperiment, VarifyProvider, VarifyDebug };
};
