import { NextResponse } from 'next/server';

// Keep this route minimal and side-effect free for tests.
// Playwright tests may stub this route to simulate auth.
export async function GET() {
  // Default to unauthenticated. Tests can intercept and return { user }.
  return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
}


