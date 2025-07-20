/**
 * @jest-environment node
 */

import { createServerClient as createServerClientFunc } from '../server';
import { cookies } from 'next/headers';

// Mock next/headers
jest.mock('next/headers', () => ({
  cookies: jest.fn(),
}));

describe('Supabase Server Client Configuration', () => {
  const mockCookies = {
    get: jest.fn(),
    set: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (cookies as jest.Mock).mockReturnValue(mockCookies);
  });

  test('should create server client with correct configuration', () => {
    const client = createServerClientFunc();

    expect(client).toBeDefined();
    expect(client.supabaseUrl).toBeDefined();
    expect(client.supabaseKey).toBeDefined();
  });

  test('should have auth methods available', () => {
    const client = createServerClientFunc();

    expect(client.auth).toBeDefined();
    expect(client.auth.getSession).toBeDefined();
    expect(client.auth.getUser).toBeDefined();
  });

  test('should have database methods available', () => {
    const client = createServerClientFunc();

    expect(client.from).toBeDefined();
    expect(typeof client.from).toBe('function');
  });

  test('should handle cookie operations', () => {
    createServerClientFunc();

    // Verify cookie handling is set up
    expect(cookies).toHaveBeenCalled();
  });

  test('should throw error if environment variables are missing', () => {
    const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const originalKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    expect(() => {
      jest.resetModules();
      require('../server');
    }).toThrow('Missing Supabase environment variables');

    // Restore environment variables
    process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalKey;
  });
});
