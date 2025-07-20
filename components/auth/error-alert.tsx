'use client';

import { AlertCircle, Clock, Shield, Wifi, Server } from 'lucide-react';

interface ErrorAlertProps {
  error: string;
}

const ERROR_MESSAGES: Record<string, { title: string; message: string; icon: any }> = {
  auth_failed: {
    title: 'Authentication Failed',
    message: 'The authentication process failed. Please try signing in again.',
    icon: Shield,
  },
  invalid_code: {
    title: 'Invalid Magic Link',
    message: 'This magic link is not valid or has been corrupted. Please request a new one.',
    icon: AlertCircle,
  },
  missing_code: {
    title: 'Invalid Magic Link',
    message: 'This magic link appears to be incomplete. Please request a new one.',
    icon: AlertCircle,
  },
  session_invalid: {
    title: 'Session Error',
    message: 'Unable to establish a valid session. Please try signing in again.',
    icon: Shield,
  },
  callback_failed: {
    title: 'Sign-in Error',
    message: 'Something went wrong during sign-in. Please try again.',
    icon: Server,
  },
  rate_limit: {
    title: 'Too Many Attempts',
    message: 'Too many authentication attempts. Please wait a few minutes before trying again.',
    icon: Clock,
  },
  expired_token: {
    title: 'Magic Link Expired',
    message: 'This magic link has expired. Magic links are only valid for a limited time.',
    icon: Clock,
  },
  token_already_used: {
    title: 'Magic Link Already Used',
    message: 'This magic link has already been used. Please request a new one if needed.',
    icon: AlertCircle,
  },
  network_error: {
    title: 'Connection Error',
    message: 'Unable to connect to our servers. Please check your internet connection and try again.',
    icon: Wifi,
  },
};

const DEFAULT_ERROR = {
  title: 'Authentication Error',
  message: 'An unexpected error occurred. Please try again or contact support if the problem persists.',
  icon: AlertCircle,
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