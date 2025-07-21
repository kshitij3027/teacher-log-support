import { NextRequest, NextResponse } from 'next/server';
import { getClientIP } from '../utils/ip-utils';
import { globalRateLimitStore, RateLimitStore } from '../storage/rate-limit-store';
import { getEndpointConfig, RATE_LIMIT_CONFIGS, RateLimitConfig } from '../utils/rate-limit-config';

/**
 * Rate limiting result
 */
export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
  retryAfter: number;
}

/**
 * Rate limiting options
 */
export interface RateLimitOptions {
  store?: RateLimitStore;
  keyGenerator?: (request: NextRequest) => string;
  skip?: (request: NextRequest) => boolean;
  onLimitReached?: (request: NextRequest, result: RateLimitResult) => void;
}

/**
 * Create rate limiting middleware
 */
export function createRateLimitMiddleware(options: RateLimitOptions = {}) {
  const store = options.store || globalRateLimitStore;
  const keyGenerator = options.keyGenerator || defaultKeyGenerator;
  const skip = options.skip || (() => false);
  const onLimitReached = options.onLimitReached;

  return async function rateLimitMiddleware(
    request: NextRequest,
    path?: string,
    method?: string
  ): Promise<NextResponse | null> {
    // Skip rate limiting if specified
    if (skip(request)) {
      return null; // Continue processing
    }

    // Get configuration for this endpoint
    const endpoint = path || new URL(request.url).pathname;
    const httpMethod = method || request.method;
    const config = getEndpointConfig(endpoint, httpMethod);

    // Generate unique key for this client/endpoint combination
    const key = keyGenerator(request);
    const rateLimitKey = `${key}:${endpoint}:${httpMethod}`;

    // Check rate limit
    const result = checkRateLimit(rateLimitKey, config, store);

    // Add rate limit headers to all responses
    const headers = createRateLimitHeaders(result);

    if (!result.allowed) {
      // Call onLimitReached callback if provided
      if (onLimitReached) {
        onLimitReached(request, result);
      }

      // Create rate limit exceeded response
      return createRateLimitResponse(result, config, headers);
    }

    return null; // Allow request to continue
  };
}

/**
 * Check rate limit for a key
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig,
  store: RateLimitStore = globalRateLimitStore
): RateLimitResult {
  const record = store.increment(key, config.window);
  const now = Date.now();
  
  // Handle burst limit if configured
  const effectiveLimit = config.burstLimit && record.count <= config.burstLimit 
    ? config.burstLimit 
    : config.requests;

  const allowed = record.count <= effectiveLimit;
  const remaining = Math.max(0, effectiveLimit - record.count);
  const retryAfter = Math.ceil((record.resetTime - now) / 1000);

  return {
    allowed,
    limit: effectiveLimit,
    remaining,
    resetTime: record.resetTime,
    retryAfter: Math.max(0, retryAfter),
  };
}

/**
 * Enforce rate limit (alias for checkRateLimit for backwards compatibility)
 */
export function enforceRateLimit(
  key: string,
  config: RateLimitConfig,
  store?: RateLimitStore
): RateLimitResult {
  return checkRateLimit(key, config, store);
}

/**
 * Default key generator
 */
function defaultKeyGenerator(request: NextRequest): string {
  const ip = getClientIP(request);
  const userAgent = request.headers.get('user-agent') || 'unknown';
  
  // Create a simple hash of IP + User Agent for uniqueness
  // In production, you might want to use just IP or add user ID if authenticated
  return `${ip}:${hashString(userAgent.substring(0, 50))}`;
}

/**
 * Simple string hash function
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Create rate limit headers
 */
function createRateLimitHeaders(result: RateLimitResult): Headers {
  const headers = new Headers();
  
  headers.set('X-RateLimit-Limit', result.limit.toString());
  headers.set('X-RateLimit-Remaining', result.remaining.toString());
  headers.set('X-RateLimit-Reset', result.resetTime.toString());
  headers.set('X-RateLimit-Window', Math.floor((result.resetTime - Date.now()) / 1000).toString());
  
  if (!result.allowed) {
    headers.set('Retry-After', result.retryAfter.toString());
  }

  return headers;
}

/**
 * Create rate limit exceeded response
 */
export function createRateLimitResponse(
  result: RateLimitResult,
  config: RateLimitConfig,
  headers?: Headers
): NextResponse {
  const responseHeaders = headers || createRateLimitHeaders(result);
  
  // Add CORS headers
  responseHeaders.set('Access-Control-Allow-Origin', '*');
  responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  responseHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  responseHeaders.set('Access-Control-Expose-Headers', 'X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, Retry-After');

  const errorResponse = {
    error: 'Rate limit exceeded',
    message: config.message || 'Too many requests. Please try again later.',
    limit: result.limit,
    remaining: result.remaining,
    resetTime: result.resetTime,
    retryAfter: result.retryAfter,
  };

  return NextResponse.json(errorResponse, {
    status: 429,
    headers: responseHeaders,
  });
}

/**
 * Calculate retry after value
 */
export function calculateRetryAfter(resetTime: number): number {
  return Math.max(0, Math.ceil((resetTime - Date.now()) / 1000));
}

/**
 * Sliding window rate limiter
 */
export class SlidingWindowRateLimit {
  private store: RateLimitStore;

  constructor(store?: RateLimitStore) {
    this.store = store || globalRateLimitStore;
  }

  check(key: string, config: RateLimitConfig): RateLimitResult {
    return checkRateLimit(key, config, this.store);
  }

  reset(key: string): void {
    this.store.reset(key);
  }
}

/**
 * Get endpoint-specific rate limit configuration
 */
export function getEndpointRateLimit(endpoint: string, method: string = 'GET'): RateLimitConfig {
  return getEndpointConfig(endpoint, method);
}

/**
 * Burst protection implementation
 */
export class BurstProtection {
  private burstStore: RateLimitStore;
  private sustainedStore: RateLimitStore;

  constructor() {
    this.burstStore = new RateLimitStore();
    this.sustainedStore = new RateLimitStore();
  }

  check(key: string, burstConfig: RateLimitConfig, sustainedConfig: RateLimitConfig): RateLimitResult {
    // Check burst limit (short window, low limit)
    const burstResult = checkRateLimit(`burst:${key}`, burstConfig, this.burstStore);
    
    // Check sustained limit (long window, higher limit)
    const sustainedResult = checkRateLimit(`sustained:${key}`, sustainedConfig, this.sustainedStore);

    // Allow if both limits are satisfied
    const allowed = burstResult.allowed && sustainedResult.allowed;

    // Return the more restrictive result
    if (!burstResult.allowed) {
      return burstResult;
    }
    
    return { ...sustainedResult, allowed };
  }
}

/**
 * Adaptive rate limiting based on system metrics
 */
export class AdaptiveRateLimit {
  private baseConfig: RateLimitConfig;
  private loadFactor: number = 0;

  constructor(baseConfig: RateLimitConfig) {
    this.baseConfig = baseConfig;
  }

  updateLoad(cpuUsage: number, memoryUsage: number): void {
    // Simple load calculation (could be more sophisticated)
    this.loadFactor = Math.max(cpuUsage, memoryUsage);
  }

  getConfig(): RateLimitConfig {
    // Reduce limits under high load
    const adjustmentFactor = Math.max(0.1, 1 - this.loadFactor * 0.5);
    
    return {
      ...this.baseConfig,
      requests: Math.floor(this.baseConfig.requests * adjustmentFactor),
    };
  }
}

/**
 * Get rate limit status for monitoring
 */
export function getRateLimitStatus(key: string, endpoint: string): {
  remaining: number;
  resetTime: number;
  isLimited: boolean;
} | null {
  const config = getEndpointConfig(endpoint);
  const record = globalRateLimitStore.get(`${key}:${endpoint}`);
  
  if (!record) {
    return {
      remaining: config.requests,
      resetTime: Date.now() + config.window,
      isLimited: false,
    };
  }

  const remaining = Math.max(0, config.requests - record.count);
  const isLimited = record.count >= config.requests;

  return {
    remaining,
    resetTime: record.resetTime,
    isLimited,
  };
}

/**
 * Reset rate limit for a key
 */
export function resetRateLimit(key: string): void {
  // Reset all entries for this key (across different endpoints)
  const keysToReset = globalRateLimitStore.keys().filter(k => k.startsWith(key));
  keysToReset.forEach(k => globalRateLimitStore.reset(k));
}

/**
 * IP Filter for allowlists/blocklists
 */
export class IPFilter {
  private allowlist: Set<string> = new Set();
  private blocklist: Set<string> = new Set();

  addToAllowlist(ip: string): void {
    this.allowlist.add(ip);
  }

  addToBlocklist(ip: string): void {
    this.blocklist.add(ip);
  }

  isAllowed(ip: string): boolean {
    if (this.blocklist.has(ip)) return false;
    if (this.allowlist.size > 0) return this.allowlist.has(ip);
    return true; // Allow if no allowlist is configured
  }
}

/**
 * Suspicious pattern detector
 */
export class SuspiciousPatternDetector {
  private patterns: Map<string, number> = new Map();

  detect(request: NextRequest): boolean {
    const ip = getClientIP(request);
    const userAgent = request.headers.get('user-agent') || '';
    
    // Check for suspicious patterns
    const suspiciousUA = this.isSuspiciousUserAgent(userAgent);
    const rapidRequests = this.isRapidRequestPattern(ip);
    
    return suspiciousUA || rapidRequests;
  }

  private isSuspiciousUserAgent(userAgent: string): boolean {
    const suspiciousPatterns = [
      'bot', 'crawler', 'scraper', 'spider',
      'curl', 'wget', 'http', 'python'
    ];
    
    const lowerUA = userAgent.toLowerCase();
    return suspiciousPatterns.some(pattern => lowerUA.includes(pattern));
  }

  private isRapidRequestPattern(ip: string): boolean {
    const now = Date.now();
    const lastRequest = this.patterns.get(ip) || 0;
    const timeDiff = now - lastRequest;
    
    this.patterns.set(ip, now);
    
    // Flag if requests are less than 100ms apart
    return timeDiff < 100 && timeDiff > 0;
  }
}

/**
 * Prevent rate limit bypass attempts
 */
export function preventRateLimitBypass(request: NextRequest): boolean {
  // Check for header manipulation attempts
  const suspiciousHeaders = [
    'x-forwarded-for',
    'x-real-ip',
    'x-cluster-client-ip',
    'x-forwarded',
    'forwarded-for',
    'forwarded'
  ];

  const headerCount = suspiciousHeaders.filter(header => 
    request.headers.has(header)
  ).length;

  // Flag if too many forwarding headers are present (potential spoofing)
  return headerCount > 2;
}

/**
 * Distributed rate limiting (placeholder for Redis/external store integration)
 */
export class DistributedRateLimit {
  private localStore: RateLimitStore;

  constructor() {
    this.localStore = globalRateLimitStore;
  }

  async check(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
    // In a real implementation, this would check a distributed store like Redis
    // For now, fall back to local store
    return checkRateLimit(key, config, this.localStore);
  }
}

/**
 * Rate limit metrics collection
 */
export class RateLimitMetrics {
  private metrics: Map<string, any> = new Map();

  recordRequest(endpoint: string, allowed: boolean): void {
    const key = `${endpoint}:${allowed ? 'allowed' : 'blocked'}`;
    const current = this.metrics.get(key) || 0;
    this.metrics.set(key, current + 1);
  }

  getMetrics(): Record<string, any> {
    return Object.fromEntries(this.metrics);
  }

  reset(): void {
    this.metrics.clear();
  }
}

/**
 * Rate limit alerting system
 */
export class RateLimitAlerting {
  private thresholds: Map<string, number> = new Map();
  private callbacks: ((alert: any) => void)[] = [];

  setThreshold(endpoint: string, blockedRequestsPerMinute: number): void {
    this.thresholds.set(endpoint, blockedRequestsPerMinute);
  }

  onAlert(callback: (alert: any) => void): void {
    this.callbacks.push(callback);
  }

  checkAlert(endpoint: string, blockedRequests: number): void {
    const threshold = this.thresholds.get(endpoint);
    if (threshold && blockedRequests > threshold) {
      const alert = {
        endpoint,
        blockedRequests,
        threshold,
        timestamp: new Date().toISOString(),
      };
      this.callbacks.forEach(callback => callback(alert));
    }
  }
}

/**
 * Rate limit dashboard data provider
 */
export class RateLimitDashboard {
  private metrics: RateLimitMetrics;

  constructor(metrics?: RateLimitMetrics) {
    this.metrics = metrics || new RateLimitMetrics();
  }

  getDashboardData(): {
    totalRequests: number;
    blockedRequests: number;
    allowedRequests: number;
    blockRate: number;
  } {
    const data = this.metrics.getMetrics();
    const allowed = Object.entries(data)
      .filter(([key]) => key.endsWith(':allowed'))
      .reduce((sum, [, value]) => sum + value, 0);
    
    const blocked = Object.entries(data)
      .filter(([key]) => key.endsWith(':blocked'))
      .reduce((sum, [, value]) => sum + value, 0);

    const total = allowed + blocked;
    const blockRate = total > 0 ? (blocked / total) * 100 : 0;

    return {
      totalRequests: total,
      blockedRequests: blocked,
      allowedRequests: allowed,
      blockRate,
    };
  }
}

/**
 * Create global rate limiting middleware
 */
export function createGlobalRateLimitMiddleware(options?: RateLimitOptions) {
  return createRateLimitMiddleware(options);
}

/**
 * Integrate with Next.js middleware
 */
export function integrateWithNextMiddleware() {
  // Placeholder for Next.js middleware integration
  return function(request: NextRequest) {
    // This would be implemented to work with Next.js middleware
    return NextResponse.next();
  };
}

/**
 * Higher-order function to wrap route handlers with rate limiting
 */
export function withRateLimit(config: RateLimitConfig) {
  return function(handler: Function) {
    return async function(request: NextRequest, ...args: any[]) {
      const middleware = createRateLimitMiddleware();
      const rateLimitResponse = await middleware(request);
      
      if (rateLimitResponse) {
        return rateLimitResponse; // Rate limit exceeded
      }
      
      return handler(request, ...args);
    };
  };
}

/**
 * Performance utilities
 */
export function handleConcurrentRequests() {
  // Placeholder for concurrent request handling
  return true;
}

export function optimizeMemoryUsage() {
  // Placeholder for memory optimization
  return true;
}

export function startAutoCleanup() {
  // Placeholder for auto cleanup
  return true;
}

/**
 * Security utilities
 */
export function enableDDoSProtection() {
  // Placeholder for DDoS protection
  return true;
}

export function validateRequestHeaders(request: NextRequest): boolean {
  // Basic header validation for rate limiting bypass prevention
  const requiredHeaders = ['user-agent'];
  const suspiciousHeaders = ['x-rate-limit-bypass', 'x-skip-rate-limit'];
  
  // Check for required headers
  for (const header of requiredHeaders) {
    if (!request.headers.get(header)) {
      return false;
    }
  }
  
  // Check for suspicious headers
  for (const header of suspiciousHeaders) {
    if (request.headers.get(header)) {
      return false;
    }
  }
  
  return true;
}

export function handleProxyRequests() {
  // Placeholder for proxy handling
  return true;
}

// Export configuration for tests
export { RATE_LIMIT_CONFIGS, getEndpointConfig };