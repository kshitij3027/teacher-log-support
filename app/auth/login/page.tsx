import { Suspense } from 'react';
import { LoginForm } from '../../../components/auth/login-form';
import { ErrorAlert } from '../../../components/auth/error-alert';

interface LoginPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const error = typeof params?.error === 'string' ? params.error : null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-8">
          <Suspense fallback={<div>Loading...</div>}>
            {error && <ErrorAlert error={error} />}
            <LoginForm />
          </Suspense>
        </div>
        
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Don't have an account? You'll be automatically registered when you sign in for the first time.
          </p>
        </div>
      </div>
    </div>
  );
}