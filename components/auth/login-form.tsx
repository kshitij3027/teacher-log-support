'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createClient } from '../../lib/supabase/client';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../ui/form';
import { Loader2, Mail, CheckCircle, ArrowLeft } from 'lucide-react';

// Email validation schema
const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface LoginFormProps {
  className?: string;
}

export function LoginForm({ className }: LoginFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedEmail, setSubmittedEmail] = useState<string>('');

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithOtp({
        email: data.email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (authError) {
        // Handle different types of auth errors based on Supabase error codes and messages
        const errorMessage = authError.message.toLowerCase();
        const errorCode = authError.status;
        
        // Handle 429 rate limit errors specifically
        if (errorCode === 429 || 
            errorMessage.includes('rate limit') || 
            errorMessage.includes('too many requests') ||
            errorMessage.includes('rate_limit_exceeded')) {
          setError('Too many magic link requests. Please wait before trying again.');
        } else if (errorMessage.includes('invalid email')) {
          setError('Please enter a valid email address.');
        } else if (errorMessage.includes('network') ||
                   errorMessage.includes('fetch') ||
                   errorCode >= 500) {
          setError('Network error. Please check your connection and try again.');
        } else {
          setError(authError.message);
        }
      } else {
        setSubmittedEmail(data.email);
        setIsSuccess(true);
        form.reset();
      }
    } catch (err) {
      // Handle network and other unexpected errors
      if (err instanceof Error) {
        const errorMessage = err.message.toLowerCase();
        if (errorMessage.includes('fetch') || 
            errorMessage.includes('network')) {
          setError('Unable to connect. Please check your internet connection and try again.');
        } else if (errorMessage.includes('rate') || 
                   errorMessage.includes('429') ||
                   errorMessage.includes('too many')) {
          setError('Too many magic link requests. Please wait before trying again.');
        } else {
          setError('An unexpected error occurred. Please try again.');
        }
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="text-center space-y-6 animate-in fade-in-50 slide-in-from-bottom-3 duration-500">
        <div className="flex justify-center">
          <div className="rounded-full bg-green-100 p-3 dark:bg-green-900/20">
            <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
        </div>
        
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-foreground">Check your email</h2>
          <p className="text-muted-foreground max-w-sm mx-auto">
            We've sent a magic link to <strong>{submittedEmail}</strong>. Click the link to sign in to your account.
          </p>
        </div>

        <div className="space-y-3">
          <div className="text-xs text-muted-foreground">
            Didn't receive the email? Check your spam folder or try again.
          </div>
          
          <Button
            variant="outline"
            className="transition-all duration-200 hover:scale-105"
            onClick={() => {
              setIsSuccess(false);
              setError(null);
            }}
          >
            <ArrowLeft className="h-4 w-4" />
            Send another link
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="space-y-4 text-center mb-6">
        <h1 className="text-2xl font-semibold">Welcome back</h1>
        <p className="text-muted-foreground">
          Enter your email to receive a magic link
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type="email"
                      placeholder="Enter your email"
                      required
                      disabled={isLoading}
                      className={`transition-all duration-200 ${
                        isLoading ? 'bg-muted/50' : ''
                      }`}
                      {...field}
                    />
                    {isLoading && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      </div>
                    )}
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 p-3 rounded-md animate-in fade-in-50 slide-in-from-top-1 duration-300">
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded-full bg-destructive/20 flex items-center justify-center">
                  <div className="h-2 w-2 rounded-full bg-destructive" />
                </div>
                {error}
              </div>
            </div>
          )}

          <Button 
            type="submit" 
            className="w-full transition-all duration-200" 
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending magic link...
              </>
            ) : (
              <>
                <Mail className="h-4 w-4" />
                Send magic link
              </>
            )}
          </Button>
        </form>
      </Form>
    </div>
  );
}
