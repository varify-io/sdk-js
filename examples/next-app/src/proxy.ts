import type { NextRequest } from 'next/server';

import { varify } from './varify';

export const proxy = (request: NextRequest) => varify.proxy(request);

export const config = {
  matcher: ['/((?!_next/|favicon.ico).*)'],
};
