import { NextRequest, NextResponse } from 'next/server';
import { redirect } from 'next/navigation';
import { createServerClient } from '../../../lib/supabase/server';

// Code exchange function
export async function exchangeCodeForSession(code: string) {
  try {
    const supabase = createServerClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('Code exchange error:', error);
      return { error: error.message };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Unexpected error during code exchange:', err);
    return { error: 'Failed to exchange code for session' };
  }
}

// Session validation function
export async function validateSession() {
  try {
    const supabase = createServerClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      console.error('Session validation error:', error);
      return { user: null, error: error.message };
    }

    return { user, error: null };
  } catch (err) {
    console.error('Unexpected error during session validation:', err);
    return { user: null, error: 'Failed to validate session' };
  }
}

// Redirect handling function
export function handleRedirect(user: any, next?: string | null): string {
  // Security: Only allow internal redirects
  const isInternalRedirect =
    next &&
    next.startsWith('/') &&
    !next.startsWith('//') &&
    !next.includes('://');

  // If user exists, redirect based on next parameter or default to dashboard
  if (user) {
    if (isInternalRedirect) {
      return next;
    }
    // For now, redirect to root since we haven't implemented dashboard yet
    return '/';
  }

  // If no user, redirect to login
  return '/';
}

// Input sanitization function
function sanitizeInput(input: any): string | null {
  if (typeof input !== 'string') {
    return null;
  }

  // Remove any HTML tags and script content
  const sanitized = input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .trim();

  return sanitized || null;
}

// Rate limiting (basic implementation)
const callbackAttempts = new Map<
  string,
  { count: number; resetTime: number }
>();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const MAX_CALLBACK_ATTEMPTS = 10;

function checkCallbackRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = callbackAttempts.get(ip);

  if (!record || now > record.resetTime) {
    callbackAttempts.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (record.count >= MAX_CALLBACK_ATTEMPTS) {
    return false;
  }

  record.count++;
  return true;
}

// Main GET handler for auth callback
export async function GET(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const ip =
      request.ip || request.headers.get('x-forwarded-for') || 'unknown';

    // Check rate limit
    if (!checkCallbackRateLimit(ip)) {
      console.warn(`Rate limit exceeded for callback from IP: ${ip}`);
      redirect('/?error=rate_limit');
    }

    // Extract URL parameters
    const { searchParams } = new URL(request.url);
    const code = sanitizeInput(searchParams.get('code'));
    const next = sanitizeInput(searchParams.get('next'));
    const error = sanitizeInput(searchParams.get('error'));

    // Handle auth errors from Supabase
    if (error) {
      console.error('Auth callback error:', error);
      redirect('/?error=auth_failed');
    }

    // Validate required code parameter
    if (!code) {
      console.warn('Auth callback missing code parameter');
      redirect('/?error=missing_code');
    }

    // Log successful callback attempt
    console.log('Processing auth callback for IP:', ip);

    // Exchange code for session
    const { data: sessionData, error: exchangeError } =
      await exchangeCodeForSession(code);

    if (exchangeError || !sessionData) {
      console.error('Failed to exchange code for session:', exchangeError);
      redirect('/?error=invalid_code');
    }

    // Validate session and get user
    const { user, error: sessionError } = await validateSession();

    if (sessionError || !user) {
      console.error('Session validation failed:', sessionError);
      redirect('/?error=session_invalid');
    }

    // Log successful authentication
    console.log('Successful authentication for user:', user.id);

    // Determine redirect destination
    const redirectTo = handleRedirect(user, next);

    // Perform redirect
    redirect(redirectTo);
  } catch (err) {
    console.error('Unexpected error in auth callback:', err);
    redirect('/?error=callback_failed');
  }
}

// Handle other HTTP methods
export async function POST() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}

export async function PUT() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}

export async function DELETE() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
