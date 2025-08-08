/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    typedRoutes: true,
  },
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test_anon_key',
    NEXT_PUBLIC_DISABLE_MIDDLEWARE: process.env.NEXT_PUBLIC_DISABLE_MIDDLEWARE || 'false',
  },
  async headers() {
    const isProd = process.env.NODE_ENV === 'production';
    if (!isProd) {
      // Disable strict security headers during development/testing to allow Next.js dev features and E2E
      return [];
    }
    // Define headers inline to avoid requiring TypeScript from Next config
    const getSecurityHeaders = () => {
      const contentSecurityPolicy = [
        "default-src 'self'",
        "base-uri 'self'",
        "frame-ancestors 'none'",
        "script-src 'self'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob:",
        "font-src 'self' data:",
        "connect-src 'self' https://*.supabase.co http://127.0.0.1:54321",
        "frame-src 'none'",
        "object-src 'none'",
        "form-action 'self'",
      ].join('; ');

      return [
        { key: 'Content-Security-Policy', value: contentSecurityPolicy },
        { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Referrer-Policy', value: 'no-referrer' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
        { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
      ];
    };
    return [
      {
        source: '/:path*',
        headers: getSecurityHeaders(),
      },
    ];
  },
};

module.exports = nextConfig;
