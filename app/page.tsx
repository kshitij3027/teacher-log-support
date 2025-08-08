import { redirect } from 'next/navigation';

export default function Home() {
  // Redirect root to login to satisfy E2E expectations
  redirect('/auth/login');
}
