import { describe, expect, it } from '@jest/globals';

// Intentionally import a module that does not exist yet (TDD Red phase)
// Implementation will be added in Task 6.9
// eslint-disable-next-line import/no-unresolved
import { getSecurityHeaders } from '@/lib/utils/security-headers';

describe('security headers utility', () => {
  it('should include standard security headers with non-empty values', () => {
    const headers = getSecurityHeaders();

    const requiredHeaderKeys = [
      'Content-Security-Policy',
      'Strict-Transport-Security',
      'X-Content-Type-Options',
      'X-Frame-Options',
      'Referrer-Policy',
      'Permissions-Policy',
      'Cross-Origin-Opener-Policy',
      'Cross-Origin-Resource-Policy',
    ];

    expect(Array.isArray(headers)).toBe(true);

    const keyToValue = new Map(headers.map((h: { key: string; value: string }) => [h.key, h.value]));

    for (const key of requiredHeaderKeys) {
      expect(keyToValue.has(key)).toBe(true);
      const value = keyToValue.get(key);
      expect(typeof value).toBe('string');
      expect(value && value.length).toBeGreaterThan(0);
    }
  });
});


