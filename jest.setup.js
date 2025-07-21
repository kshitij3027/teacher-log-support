import '@testing-library/jest-dom';

// Mock Next.js globals for API route testing
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock window-related APIs only if window exists (jsdom environment)
if (typeof window !== 'undefined') {
  // Mock window.matchMedia for responsive components
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });

  // Mock ResizeObserver
  global.ResizeObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }));

  // Mock IntersectionObserver
  global.IntersectionObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }));
}

// Mock fetch with a simple implementation
global.fetch = jest.fn();

// Mock Next.js server environment
Object.defineProperty(globalThis, 'crypto', {
  value: require('crypto').webcrypto,
});

// Mock Headers, Request, Response only if they don't exist
if (typeof global.Headers === 'undefined') {
  global.Headers = class Headers {
    constructor() {}
    get() { return null; }
    set() {}
    has() { return false; }
  };
}

if (typeof global.Request === 'undefined') {
  global.Request = class Request {
    constructor(url, options = {}) {
      this.url = url;
      this.method = options.method || 'GET';
      this.headers = new global.Headers();
      this.body = options.body;
    }
    json() { return Promise.resolve({}); }
  };
}

if (typeof global.Response === 'undefined') {
  global.Response = class Response {
    constructor(body, options = {}) {
      this.body = body;
      this.status = options.status || 200;
      this.headers = new global.Headers();
    }
    json() { return Promise.resolve({}); }
  };
}