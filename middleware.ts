import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from './lib/supabase/server';

// Define protected route patterns
const PROTECTED_ROUTES = [
  '/dashboard',
  '/incidents',
  '/onboarding',
];

const PUBLIC_ROUTES = [
  '/',
  '/auth',
  '/api/auth',
];

export function isProtectedRoute(pathname: string): boolean {
  // Check if the route starts with any protected pattern
  return PROTECTED_ROUTES.some(route => pathname.startsWith(route));
}

export async function checkAuthentication(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    
    return {
      user,
      error,
      isAuthenticated: !!user && !error,
    };
  } catch (error) {
    console.error('Authentication check failed:', error);
    return {
      user: null,
      error,
      isAuthenticated: false,
    };
  }
}

export async function validateSession(request?: NextRequest) {
  try {
    const supabase = createServerClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    
    return {
      user,
      error: error || null,
    };
  } catch (error) {
    console.error('Session validation failed:', error);
    return {
      user: null,
      error,
    };
  }
}

export function handleRedirect(user: any, nextUrl?: string | null): string {
  // If user is not authenticated, redirect to root
  if (!user) {
    return '/';
  }

  // If no next URL provided, redirect to root
  if (!nextUrl) {
    return '/';
  }

  // Security check: only allow internal redirects
  try {
    // Block external URLs
    if (nextUrl.includes('//') || nextUrl.startsWith('http')) {
      return '/';
    }

    // Block potentially malicious schemes
    if (nextUrl.startsWith('javascript:') || nextUrl.startsWith('data:')) {
      return '/';
    }

    // Ensure it starts with /
    if (!nextUrl.startsWith('/')) {
      return '/';
    }

    return nextUrl;
  } catch (error) {
    console.error('Redirect validation failed:', error);
    return '/';
  }
}

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Performance optimization: early return for public routes
  if (PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Check if route needs protection
  if (!isProtectedRoute(pathname)) {
    return NextResponse.next();
  }

  // Validate authentication for protected routes
  const authResult = await checkAuthentication(request);

  if (!authResult.isAuthenticated) {
    // Preserve the original URL for post-auth redirect
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    
    console.log(`Redirecting unauthenticated user from ${pathname} to login`);
    return NextResponse.redirect(loginUrl);
  }

  // User is authenticated, allow access
  console.log(`Authenticated user accessing ${pathname}`);
  return NextResponse.next();
}

// Middleware configuration
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/incidents/:path*',
    '/onboarding',
  ],
};