import { describe, expect, it } from '@jest/globals';

describe('next.config.js security headers', () => {
  it('should export a headers function or config that can provide security headers', async () => {
    // Dynamically import the Next.js config
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const nextConfig = require('../next.config.js');

    // For Next.js, headers can be provided via an async headers() function on the config.
    // We assert either headers() exists, or that we can import a helper until we wire it in Task 6.9.
    const hasHeadersFn = typeof nextConfig.headers === 'function';

    expect(hasHeadersFn).toBe(true);
  });
});


