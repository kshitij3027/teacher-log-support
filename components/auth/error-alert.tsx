'use client';

// Minimal inline icons to avoid external dependency issues during tests
const IconAlert = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="1em" height="1em" {...props}>
    <path d="M12 9v4" />
    <path d="M12 17h.01" />
    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
  </svg>
);
const IconClock = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="1em" height="1em" {...props}>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);
const IconShield = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="1em" height="1em" {...props}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);
const IconWifi = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="1em" height="1em" {...props}>
    <path d="M5 12.55a11 11 0 0 1 14.08 0" />
    <path d="M1.42 9a16 16 0 0 1 21.16 0" />
    <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
    <line x1="12" y1="20" x2="12.01" y2="20" />
  </svg>
);
const IconServer = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="1em" height="1em" {...props}>
    <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
    <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
    <line x1="6" y1="6" x2="6.01" y2="6" />
    <line x1="6" y1="18" x2="6.01" y2="18" />
  </svg>
);

interface ErrorAlertProps {
  error: string;
}

const ERROR_MESSAGES: Record<string, { title: string; message: string; icon: any }> = {
  auth_failed: {
    title: 'Authentication Failed',
    message: 'The authentication process failed. Please try signing in again.',
    icon: IconShield,
  },
  invalid_code: {
    title: 'Invalid Magic Link',
    message: 'This magic link is not valid or has been corrupted. Please request a new one.',
    icon: IconAlert,
  },
  missing_code: {
    title: 'Invalid Magic Link',
    message: 'This magic link appears to be incomplete. Please request a new one.',
    icon: IconAlert,
  },
  session_invalid: {
    title: 'Session Error',
    message: 'Unable to establish a valid session. Please try signing in again.',
    icon: IconShield,
  },
  callback_failed: {
    title: 'Sign-in Error',
    message: 'Something went wrong during sign-in. Please try again.',
    icon: IconServer,
  },
  rate_limit: {
    title: 'Too Many Attempts',
    message: 'Too many authentication attempts. Please wait a few minutes before trying again.',
    icon: IconClock,
  },
  expired_token: {
    title: 'Magic Link Expired',
    message: 'This magic link has expired. Magic links are only valid for a limited time.',
    icon: IconClock,
  },
  token_already_used: {
    title: 'Magic Link Already Used',
    message: 'This magic link has already been used. Please request a new one if needed.',
    icon: IconAlert,
  },
  network_error: {
    title: 'Connection Error',
    message: 'Unable to connect to our servers. Please check your internet connection and try again.',
    icon: IconWifi,
  },
};

const DEFAULT_ERROR = {
  title: 'Authentication Error',
  message: 'An unexpected error occurred. Please try again or contact support if the problem persists.',
  icon: IconAlert,
};

export function ErrorAlert({ error }: ErrorAlertProps) {
  const errorInfo = ERROR_MESSAGES[error] || DEFAULT_ERROR;
  const Icon = errorInfo.icon;

  return (
    <div className="mb-6 p-4 border border-destructive/20 bg-destructive/10 rounded-lg animate-in fade-in-50 slide-in-from-top-2 duration-500">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          <Icon className="h-5 w-5 text-destructive" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-destructive mb-1">
            {errorInfo.title}
          </h3>
          <p className="text-sm text-destructive/80">
            {errorInfo.message}
          </p>
          {error === 'rate_limit' && (
            <p className="text-xs text-muted-foreground mt-2">
              This helps protect our service from abuse. Thank you for your patience.
            </p>
          )}
          {(error === 'expired_token' || error === 'invalid_code' || error === 'token_already_used') && (
            <p className="text-xs text-muted-foreground mt-2">
              Enter your email below to receive a new magic link.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}