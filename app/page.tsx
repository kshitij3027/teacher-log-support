import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-background">
      <div className="z-10 w-full max-w-5xl items-center justify-between text-sm">
        <h1 className="text-4xl font-bold text-center mb-8 text-primary">
          Teacher Support Platform
        </h1>
        <p className="text-center text-lg mb-8 text-foreground">
          Secure incident reporting and management system for educators
        </p>
        <div className="text-center space-x-4">
          <Link 
            href="/auth/login"
            className="inline-block bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 px-6 rounded-lg transition-colors"
          >
            Get Started
          </Link>
          <button className="bg-accent hover:bg-accent/90 text-accent-foreground font-bold py-3 px-6 rounded-lg transition-colors">
            Learn More
          </button>
        </div>
      </div>
    </main>
  );
}
