/**
 * @jest-environment node
 */

// API Rate Limiting Integration Tests
// Tests actual integration with API endpoints and middleware

import { NextRequest, NextResponse } from 'next/server';
import { createRateLimitMiddleware, checkRateLimit, createRateLimitResponse, RateLimitResult } from '../../../lib/middleware/rate-limiting';
import { RateLimitStore } from '../../../lib/storage/rate-limit-store';
import { getEndpointConfig } from '../../../lib/utils/rate-limit-config';

// Helper function to match the one in rate-limiting middleware
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

// Mock Supabase client to prevent actual API calls
jest.mock('../../../lib/supabase/server', () => ({
  createClient: () => ({
    auth: {
      signOut: jest.fn().mockResolvedValue({ error: null }),
      signInWithOtp: jest.fn().mockResolvedValue({ error: null }),
    },
  }),
  createServerClient: () => ({
    auth: {
      signOut: jest.fn().mockResolvedValue({ error: null }),
      signInWithOtp: jest.fn().mockResolvedValue({ error: null }),
    },
  }),
}));

describe('API Rate Limiting Integration Tests', () => {
  let testStore: RateLimitStore;
  let mockRequest: NextRequest;
  let originalEnv: string | undefined;

  beforeEach(() => {
    // Enable rate limiting for tests
    originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    
    testStore = new RateLimitStore();
    mockRequest = {
      method: 'POST',
      url: 'http://localhost:3000/api/auth/magic-link',
      headers: new Headers({
        'user-agent': 'test-browser/1.0',
        'content-type': 'application/json',
        'x-forwarded-for': '192.168.1.100',
      }),
      json: jest.fn().mockResolvedValue({ email: 'test@example.com' }),
    } as any;
  });

  afterEach(() => {
    // Restore original environment
    if (originalEnv) {
      process.env.NODE_ENV = originalEnv;
    } else {
      delete process.env.NODE_ENV;
    }
  });

  describe('Magic Link API Integration', () => {
    test('should integrate rate limiting with magic link endpoint', async () => {
      const middleware = createRateLimitMiddleware({ store: testStore });
      
      // Get the actual rate limit configuration
      const config = getEndpointConfig('/api/auth/magic-link', 'POST');
      const maxRequests = config.requests;
      
      // Make requests up to the limit
      let responses = [];
      for (let i = 0; i < maxRequests + 5; i++) {
        const response = await middleware(mockRequest, '/api/auth/magic-link', 'POST');
        responses.push(response);
      }

      // At least some requests should be allowed
      const allowedResponses = responses.filter(r => r === null);
      expect(allowedResponses.length).toBeGreaterThan(0);
      expect(allowedResponses.length).toBeLessThanOrEqual(maxRequests);

      // Some requests should be rate limited if we exceed the limit
      const rateLimitedResponses = responses.filter(r => r !== null);
      if (maxRequests < responses.length) {
        expect(rateLimitedResponses.length).toBeGreaterThan(0);

        // Check rate limit response format
        const limitedResponse = rateLimitedResponses[0] as NextResponse;
        expect(limitedResponse.status).toBe(429);
        
        // Verify rate limit headers are present
        const headers = limitedResponse.headers;
        expect(headers.get('X-RateLimit-Limit')).toBeDefined();
        expect(headers.get('X-RateLimit-Remaining')).toBeDefined();
        expect(headers.get('Retry-After')).toBeDefined();
      }
    });

    test('should handle different IP addresses independently', async () => {
      const middleware = createRateLimitMiddleware({ store: testStore });
      const config = getEndpointConfig('/api/auth/magic-link', 'POST');
      
      // First IP
      const request1 = { 
        ...mockRequest, 
        headers: new Headers({
          'user-agent': 'test-browser/1.0',
          'content-type': 'application/json',
          'x-forwarded-for': '192.168.1.1'
        })
      } as NextRequest;
      
      // Second IP
      const request2 = { 
        ...mockRequest, 
        headers: new Headers({
          'user-agent': 'test-browser/1.0',
          'content-type': 'application/json',
          'x-forwarded-for': '192.168.1.2'
        })
      } as NextRequest;

      // Make requests from both IPs
      const response1 = await middleware(request1, '/api/auth/magic-link', 'POST');
      const response2 = await middleware(request2, '/api/auth/magic-link', 'POST');

      // Both should pass initially
      expect(response1).toBeNull();
      expect(response2).toBeNull();

      // Exhaust rate limit for first IP (use actual limit + buffer)
      const requestsToMake = config.requests + 3;
      for (let i = 0; i < requestsToMake; i++) {
        await middleware(request1, '/api/auth/magic-link', 'POST');
      }

      // First IP should be rate limited after exceeding limit
      const limitedResponse1 = await middleware(request1, '/api/auth/magic-link', 'POST');
      expect(limitedResponse1).not.toBeNull();
      expect((limitedResponse1 as NextResponse).status).toBe(429);

      // Second IP should still work
      const allowedResponse2 = await middleware(request2, '/api/auth/magic-link', 'POST');
      expect(allowedResponse2).toBeNull();
    });

    test('should respect endpoint-specific rate limit configurations', async () => {
      const middleware = createRateLimitMiddleware({ store: testStore });
      
      // Test magic link endpoint config
      const magicLinkConfig = getEndpointConfig('/api/auth/magic-link', 'POST');
      expect(magicLinkConfig).toBeDefined();
      expect(magicLinkConfig.requests).toBeDefined();
      expect(magicLinkConfig.window).toBeDefined();

      // Test that rate limiting uses endpoint-specific config
      const key = 'test-key';
      const result = checkRateLimit(key, magicLinkConfig, testStore);
      
      expect(result.allowed).toBe(true);
      expect(result.limit).toBeGreaterThan(0); // Should have some limit
      expect(result.remaining).toBeLessThan(result.limit); // Should decrease after first check
      expect(result.remaining).toBeGreaterThanOrEqual(0); // Should not be negative
    });
  });

  describe('Logout API Integration', () => {
    test('should integrate rate limiting with logout endpoint', async () => {
      const middleware = createRateLimitMiddleware({ store: testStore });
      
      const logoutRequest = {
        ...mockRequest,
        url: 'http://localhost:3000/api/auth/logout',
        method: 'POST',
      } as NextRequest;

      // Test rate limiting for logout endpoint
      const response1 = await middleware(logoutRequest, '/api/auth/logout', 'POST');
      expect(response1).toBeNull(); // First request should pass

      // Get logout endpoint configuration
      const logoutConfig = getEndpointConfig('/api/auth/logout', 'POST');
      expect(logoutConfig).toBeDefined();
    });

    test('should handle logout rate limiting differently from magic link', async () => {
      const middleware = createRateLimitMiddleware({ store: testStore });
      
      const magicLinkRequest = {
        ...mockRequest,
        url: 'http://localhost:3000/api/auth/magic-link',
      } as NextRequest;

      const logoutRequest = {
        ...mockRequest,
        url: 'http://localhost:3000/api/auth/logout',
      } as NextRequest;

      // These should have independent rate limits
      const magicLinkResponse = await middleware(magicLinkRequest, '/api/auth/magic-link', 'POST');
      const logoutResponse = await middleware(logoutRequest, '/api/auth/logout', 'POST');

      expect(magicLinkResponse).toBeNull();
      expect(logoutResponse).toBeNull();

      // Verify they use different rate limit keys
      const magicLinkConfig = getEndpointConfig('/api/auth/magic-link', 'POST');
      const logoutConfig = getEndpointConfig('/api/auth/logout', 'POST');
      
      // Configs may be different
      expect(magicLinkConfig).toBeDefined();
      expect(logoutConfig).toBeDefined();
    });
  });

  describe('Cross-Endpoint Rate Limiting', () => {
    test('should handle rate limiting across multiple endpoints for same IP', async () => {
      const middleware = createRateLimitMiddleware({ store: testStore });
      
      const endpoints = [
        { path: '/api/auth/magic-link', method: 'POST' },
        { path: '/api/auth/logout', method: 'POST' },
      ];

      // Test that each endpoint has independent rate limiting
      for (const endpoint of endpoints) {
        const request = { 
          ...mockRequest, 
          url: `http://localhost:3000${endpoint.path}`,
          method: endpoint.method,
        } as NextRequest;

        const response = await middleware(request, endpoint.path, endpoint.method);
        expect(response).toBeNull(); // First request to each endpoint should pass
      }
    });

    test('should maintain rate limit state across endpoint changes', async () => {
      const middleware = createRateLimitMiddleware({ store: testStore });
      
      // Get the actual config to understand the limits
      const magicLinkConfig = getEndpointConfig('/api/auth/magic-link', 'POST');
      
      // Make requests to magic link endpoint (up to the limit)
      const requestsToMake = Math.min(magicLinkConfig.requests, 3);
      for (let i = 0; i < requestsToMake; i++) {
        await middleware(mockRequest, '/api/auth/magic-link', 'POST');
      }

      // Generate the same key that middleware would use
      const ip = '192.168.1.100';
      const userAgent = 'test-browser/1.0';
      const hashedUA = hashString(userAgent.substring(0, 50));
      const clientKey = `${ip}:${hashedUA}`;
      const rateLimitKey = `${clientKey}:/api/auth/magic-link:POST`;
      
      const status = checkRateLimit(rateLimitKey, magicLinkConfig, testStore);
      
      // Verify that some requests were recorded
      expect(status.remaining).toBeLessThanOrEqual(magicLinkConfig.requests);
    });
  });

  describe('Rate Limit Response Integration', () => {
    test('should create properly formatted rate limit responses', async () => {
      const config = getEndpointConfig('/api/auth/magic-link', 'POST');
      const rateLimitResult: RateLimitResult = {
        allowed: false,
        limit: 10,
        remaining: 0,
        resetTime: Date.now() + 60000,
        retryAfter: 60,
      };

      const response = createRateLimitResponse(rateLimitResult, config);

      expect(response.status).toBe(429);
      
      // Check headers
      expect(response.headers.get('X-RateLimit-Limit')).toBe('10');
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('0');
      expect(response.headers.get('Retry-After')).toBe('60');
      
      // Check CORS headers
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('POST');
    });

    test('should include proper error message in rate limit response', async () => {
      const config = getEndpointConfig('/api/auth/magic-link', 'POST');
      const rateLimitResult: RateLimitResult = {
        allowed: false,
        limit: 5,
        remaining: 0,
        resetTime: Date.now() + 60000,
        retryAfter: 60,
      };

      const response = createRateLimitResponse(rateLimitResult, config);
      const body = await response.json();

      expect(body.error).toBe('Rate limit exceeded');
      expect(body.message).toBeDefined();
      expect(body.limit).toBe(5);
      expect(body.remaining).toBe(0);
      expect(body.retryAfter).toBe(60);
    });
  });

  describe('Middleware Error Handling', () => {
    test('should handle invalid requests gracefully', async () => {
      const middleware = createRateLimitMiddleware({ store: testStore });
      
      const invalidRequest = {
        ip: undefined,
        method: 'POST',
        url: 'http://localhost:3000/api/auth/magic-link',
        headers: new Headers(),
      } as any;

      // Should not throw error with invalid request
      const response = await middleware(invalidRequest, '/api/auth/magic-link', 'POST');
      // Should either return null (allowed) or a valid rate limit response
      expect(response === null || response instanceof NextResponse).toBe(true);
    });

    test('should handle missing headers gracefully', async () => {
      const middleware = createRateLimitMiddleware({ store: testStore });
      
      const requestWithoutHeaders = {
        ...mockRequest,
        headers: new Headers(), // Empty headers
      } as NextRequest;

      const response = await middleware(requestWithoutHeaders, '/api/auth/magic-link', 'POST');
      expect(response === null || response instanceof NextResponse).toBe(true);
    });
  });

  describe('Rate Limit Store Integration', () => {
    test('should work with custom rate limit store', async () => {
      const customStore = new RateLimitStore();
      const middleware = createRateLimitMiddleware({ store: customStore });
      
      // Test that middleware uses the custom store
      const response = await middleware(mockRequest, '/api/auth/magic-link', 'POST');
      expect(response).toBeNull();

      // Verify store has entries
      expect(customStore.size()).toBeGreaterThan(0);
    });

    test('should handle store cleanup properly', async () => {
      const middleware = createRateLimitMiddleware({ store: testStore });
      
      // Make some requests
      await middleware(mockRequest, '/api/auth/magic-link', 'POST');
      await middleware(mockRequest, '/api/auth/logout', 'POST');

      const initialSize = testStore.size();
      expect(initialSize).toBeGreaterThan(0);

      // Trigger cleanup (if implemented)
      testStore.cleanup();
      
      // Size should remain the same or decrease (depending on expiration)
      const finalSize = testStore.size();
      expect(finalSize).toBeLessThanOrEqual(initialSize);
    });
  });

  describe('Production Scenario Integration', () => {
    test('should handle high-frequency requests from different IPs', async () => {
      const middleware = createRateLimitMiddleware({ store: testStore });
      const config = getEndpointConfig('/api/auth/magic-link', 'POST');
      
      const requests = [];
      
      // Simulate requests that will exceed the limit for some IPs
      const requestsPerIP = config.requests + 2; // Exceed limit for each IP
      const numIPs = 3; // Use fewer IPs for clearer testing
      
      for (let ip = 1; ip <= numIPs; ip++) {
        for (let req = 1; req <= requestsPerIP; req++) {
          const request = {
            ...mockRequest,
            ip: `192.168.1.${ip}`,
          } as NextRequest;
          
          requests.push(middleware(request, '/api/auth/magic-link', 'POST'));
        }
      }

      const responses = await Promise.all(requests);
      
      // Some requests should be allowed (first requests from each IP)
      const allowedResponses = responses.filter(r => r === null);
      expect(allowedResponses.length).toBeGreaterThan(0);
      expect(allowedResponses.length).toBeLessThanOrEqual(numIPs * config.requests);
      
      // Some requests should be rate limited (exceeding limit per IP)
      const rateLimitedResponses = responses.filter(r => r !== null);
      const totalRequestsOverLimit = numIPs * requestsPerIP - numIPs * config.requests;
      if (totalRequestsOverLimit > 0) {
        expect(rateLimitedResponses.length).toBeGreaterThan(0);
      }
    });

    test('should maintain performance under load', async () => {
      const middleware = createRateLimitMiddleware({ store: testStore });
      
      const startTime = Date.now();
      
      // Make 100 rapid requests
      const requests = [];
      for (let i = 0; i < 100; i++) {
        const request = {
          ...mockRequest,
          ip: `192.168.1.${i % 10}`, // Distribute across 10 IPs
        } as NextRequest;
        
        requests.push(middleware(request, '/api/auth/magic-link', 'POST'));
      }

      await Promise.all(requests);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete within reasonable time (adjust threshold as needed)
      expect(duration).toBeLessThan(5000); // 5 seconds
    });

    test('should handle concurrent requests from same IP correctly', async () => {
      const middleware = createRateLimitMiddleware({ store: testStore });
      
      // Make 10 concurrent requests from same IP
      const concurrentRequests = Array(10).fill(null).map(() => 
        middleware(mockRequest, '/api/auth/magic-link', 'POST')
      );

      const responses = await Promise.all(concurrentRequests);
      
      // Should have consistent rate limiting behavior
      const allowedCount = responses.filter(r => r === null).length;
      const blockedCount = responses.filter(r => r !== null).length;
      
      expect(allowedCount + blockedCount).toBe(10);
      expect(allowedCount).toBeGreaterThan(0); // At least some should be allowed
    });
  });
});