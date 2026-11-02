import 'server-only';
import { NextResponse } from 'next/server';
import { ForbiddenError, UnauthenticatedError } from './errors';

/** Wraps an API handler: maps auth/scope errors to 401/403 JSON responses. */
export async function handle<T>(fn: () => Promise<T>) {
  try { return NextResponse.json(await fn()); }
  catch (e) {
    if (e instanceof UnauthenticatedError) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
    if (e instanceof ForbiddenError) return NextResponse.json({ error: e.message }, { status: 403 });
    if (e instanceof Error && e.message === 'not_found') return NextResponse.json({ error: 'not found' }, { status: 404 });
    throw e;
  }
}
