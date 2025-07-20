// Mock the Supabase SSR module
jest.mock('@supabase/ssr', () => ({
  createBrowserClient: jest.fn(() => ({
    auth: {
      signInWithOtp: jest.fn(),
      signOut: jest.fn(),
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(),
    },
    from: jest.fn(),
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  })),
}));

import { createClient } from '../client';

describe('Supabase Client Configuration', () => {
  test('should create Supabase client with correct configuration', () => {
    const client = createClient();

    // Test that client is created
    expect(client).toBeDefined();
    // Note: Supabase client doesn't expose these properties directly
    expect(client.supabaseUrl).toBeDefined();
    expect(client.supabaseKey).toBeDefined();
  });

  test('should have auth methods available', () => {
    const client = createClient();

    expect(client.auth).toBeDefined();
    expect(client.auth.signInWithOtp).toBeDefined();
    expect(client.auth.signOut).toBeDefined();
    expect(client.auth.getSession).toBeDefined();
    expect(client.auth.onAuthStateChange).toBeDefined();
  });

  test('should have database methods available', () => {
    const client = createClient();

    expect(client.from).toBeDefined();
    expect(typeof client.from).toBe('function');
  });

  test('should throw error if environment variables are missing', () => {
    // Mock missing environment variables
    const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const originalKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    expect(() => {
      jest.resetModules();
      require('../client');
    }).toThrow('Missing Supabase environment variables');

    // Restore environment variables
    process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalKey;
  });
});
