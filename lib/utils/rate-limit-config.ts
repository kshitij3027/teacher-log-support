/**
 * Rate Limiting Configuration
 * Defines rate limits for different endpoints and scenarios
 */

export interface RateLimitConfig {
  requests: number;
  window: number; // Time window in milliseconds
  burstLimit?: number; // Allow short bursts
  skipSuccessfulRequests?: boolean; // Don't count successful requests
  message?: string; // Custom error message
}

export interface MethodSpecificConfig {
  GET?: RateLimitConfig;
  POST?: RateLimitConfig;
  PUT?: RateLimitConfig;
  DELETE?: RateLimitConfig;
  PATCH?: RateLimitConfig;
}

/**
 * Rate limit configurations for different endpoints
 */
export const RATE_LIMIT_CONFIGS: Record<string, RateLimitConfig | MethodSpecificConfig> = {
  // Authentication endpoints - strictest limits
  '/api/auth/magic-link': {
    requests: 5,
    window: 900000, // 15 minutes
    burstLimit: 2, // Allow 2 quick attempts for typos
    skipSuccessfulRequests: true, // Don't count successful logins
    message: 'Too many login attempts. Please wait 15 minutes before trying again.',
  },
  '/api/auth/logout': {
    requests: 10,
    window: 300000, // 5 minutes
    burstLimit: 3, // Allow quick logouts for UI issues
    message: 'Too many logout requests. Please wait 5 minutes.',
  },
  '/api/auth/callback': {
    requests: 10,
    window: 900000, // 15 minutes
    burstLimit: 3,
    message: 'Too many callback attempts. Please wait 15 minutes.',
  },

  // User profile endpoints - moderate limits
  '/api/user/profile': {
    GET: {
      requests: 30,
      window: 600000, // 10 minutes
      message: 'Too many profile requests. Please wait 10 minutes.',
    },
    PUT: {
      requests: 10,
      window: 600000, // 10 minutes
      message: 'Too many profile updates. Please wait 10 minutes.',
    },
    DELETE: {
      requests: 2,
      window: 3600000, // 1 hour
      message: 'Account deletion limited. Please wait 1 hour.',
    },
  },

  // Incident endpoints - higher limits for productivity
  '/api/incidents': {
    GET: {
      requests: 100,
      window: 600000, // 10 minutes
      message: 'Too many incident requests. Please wait 10 minutes.',
    },
    POST: {
      requests: 20,
      window: 600000, // 10 minutes
      message: 'Too many incident submissions. Please wait 10 minutes.',
    },
  },
  '/api/incidents/[id]': {
    GET: {
      requests: 50,
      window: 600000, // 10 minutes
      message: 'Too many individual incident requests. Please wait 10 minutes.',
    },
    PUT: {
      requests: 30,
      window: 600000, // 10 minutes
      message: 'Too many incident updates. Please wait 10 minutes.',
    },
    DELETE: {
      requests: 10,
      window: 600000, // 10 minutes
      message: 'Too many incident deletions. Please wait 10 minutes.',
    },
  },

  // Default fallback
  default: {
    requests: 100,
    window: 3600000, // 1 hour
    message: 'Rate limit exceeded. Please try again later.',
  },
};

/**
 * Environment-specific configurations
 */
const ENVIRONMENT_CONFIGS = {
  development: {
    multiplier: 10, // 10x more lenient in development
    enabled: false, // Disable rate limiting in development by default
  },
  test: {
    multiplier: 1,
    enabled: false, // Disable in tests unless explicitly testing rate limiting
  },
  production: {
    multiplier: 1,
    enabled: true,
  },
};

/**
 * Validate rate limit configuration
 */
export function validateRateLimitConfig(config: RateLimitConfig): boolean {
  if (!config || typeof config !== 'object') return false;
  if (typeof config.requests !== 'number' || config.requests <= 0) return false;
  if (typeof config.window !== 'number' || config.window <= 0) return false;
  if (config.burstLimit && (typeof config.burstLimit !== 'number' || config.burstLimit <= 0)) return false;
  return true;
}

/**
 * Load rate limit configuration (could be extended to load from external source)
 */
export function loadRateLimitConfig(): typeof RATE_LIMIT_CONFIGS {
  return RATE_LIMIT_CONFIGS;
}

/**
 * Match endpoint pattern (supports dynamic routes)
 */
export function matchEndpointPattern(actualPath: string, pattern: string): boolean {
  // Exact match
  if (actualPath === pattern) return true;

  // Dynamic route matching (e.g., /api/incidents/[id])
  const patternRegex = pattern.replace(/\[([^\]]+)\]/g, '([^/]+)');
  const regex = new RegExp(`^${patternRegex}$`);
  return regex.test(actualPath);
}

/**
 * Get method-specific configuration
 */
export function getMethodSpecificConfig(
  config: RateLimitConfig | MethodSpecificConfig,
  method: string
): RateLimitConfig | undefined {
  // If it's already a RateLimitConfig, return it
  if ('requests' in config) {
    return config;
  }

  // Get method-specific config
  const methodConfig = (config as MethodSpecificConfig)[method as keyof MethodSpecificConfig];
  return methodConfig;
}

/**
 * Get environment-specific configuration
 */
export function getEnvironmentConfig(env: string = process.env.NODE_ENV || 'development') {
  return ENVIRONMENT_CONFIGS[env as keyof typeof ENVIRONMENT_CONFIGS] || ENVIRONMENT_CONFIGS.production;
}

/**
 * Get endpoint configuration with environment adjustments
 */
export function getEndpointConfig(path: string, method: string = 'GET'): RateLimitConfig {
  const envConfig = getEnvironmentConfig();
  
  // If rate limiting is disabled in this environment
  if (!envConfig.enabled) {
    return {
      requests: Infinity,
      window: 1000,
      message: 'Rate limiting disabled in this environment',
    };
  }

  // Find matching configuration
  let matchedConfig: RateLimitConfig | MethodSpecificConfig | undefined;
  
  for (const [pattern, config] of Object.entries(RATE_LIMIT_CONFIGS)) {
    if (matchEndpointPattern(path, pattern)) {
      matchedConfig = config;
      break;
    }
  }

  // Fall back to default if no match
  if (!matchedConfig) {
    matchedConfig = RATE_LIMIT_CONFIGS.default as RateLimitConfig;
  }

  // Get method-specific config
  const finalConfig = getMethodSpecificConfig(matchedConfig, method) || (matchedConfig as RateLimitConfig);

  // Apply environment multiplier
  return {
    ...finalConfig,
    requests: Math.floor(finalConfig.requests * envConfig.multiplier),
  };
}

/**
 * Override rate limit configuration at runtime
 */
export function overrideRateLimitConfig(path: string, config: RateLimitConfig): void {
  if (validateRateLimitConfig(config)) {
    RATE_LIMIT_CONFIGS[path] = config;
  } else {
    throw new Error('Invalid rate limit configuration');
  }
}

/**
 * Get user-specific configuration (placeholder for future implementation)
 */
export function getUserSpecificConfig(userId: string, baseConfig: RateLimitConfig): RateLimitConfig {
  // Could implement user tiers (e.g., premium users get higher limits)
  // For now, return base config
  return baseConfig;
}

/**
 * Get IP-based configuration (placeholder for future implementation)
 */
export function getIPBasedConfig(ip: string, baseConfig: RateLimitConfig): RateLimitConfig {
  // Could implement IP allowlists/blocklists
  // For now, return base config
  return baseConfig;
}

/**
 * Protect configuration from tampering
 */
export function protectConfiguration(): void {
  // Freeze the configuration to prevent runtime modifications
  Object.freeze(RATE_LIMIT_CONFIGS);
  Object.freeze(ENVIRONMENT_CONFIGS);
}

/**
 * Validate configuration security
 */
export function validateConfigSecurity(config: RateLimitConfig): boolean {
  // Check for suspiciously high limits that might indicate an attack
  const maxReasonableRequests = 10000; // Adjust based on your needs
  const minReasonableWindow = 1000; // 1 second minimum

  if (config.requests > maxReasonableRequests) {
    console.warn('Rate limit configuration has suspiciously high request limit');
    return false;
  }

  if (config.window < minReasonableWindow) {
    console.warn('Rate limit configuration has suspiciously low time window');
    return false;
  }

  return true;
}

/**
 * Audit configuration changes
 */
export function auditConfigChanges(path: string, oldConfig: RateLimitConfig, newConfig: RateLimitConfig): void {
  const auditLog = {
    timestamp: new Date().toISOString(),
    path,
    oldConfig,
    newConfig,
    action: 'configuration_change',
  };

  // In production, this would send to a logging service
  console.log('Rate limit configuration change:', auditLog);
}

/**
 * Create adaptive configuration based on system load
 */
export function createAdaptiveConfig(baseConfig: RateLimitConfig, loadFactor: number): RateLimitConfig {
  // Adjust limits based on system load (0.1 = low load, 1.0 = high load)
  const adjustedRequests = Math.floor(baseConfig.requests * (1 - loadFactor * 0.5));
  
  return {
    ...baseConfig,
    requests: Math.max(1, adjustedRequests), // Ensure at least 1 request is allowed
  };
}

/**
 * Create time-based configuration changes
 */
export function createTimeBasedConfig(baseConfig: RateLimitConfig): RateLimitConfig {
  const hour = new Date().getHours();
  
  // Reduce limits during peak hours (9 AM - 5 PM)
  if (hour >= 9 && hour <= 17) {
    return {
      ...baseConfig,
      requests: Math.floor(baseConfig.requests * 0.8), // 20% reduction during peak
    };
  }
  
  return baseConfig;
}

/**
 * Adjust configuration based on load
 */
export function adjustConfigForLoad(baseConfig: RateLimitConfig, currentLoad: number): RateLimitConfig {
  // currentLoad is between 0 and 1 (0 = no load, 1 = maximum load)
  const loadAdjustment = 1 - (currentLoad * 0.3); // Reduce up to 30% under high load
  
  return {
    ...baseConfig,
    requests: Math.floor(baseConfig.requests * loadAdjustment),
  };
}

/**
 * Test rate limit configuration
 */
export function testRateLimitConfig(config: RateLimitConfig): boolean {
  try {
    validateRateLimitConfig(config);
    validateConfigSecurity(config);
    return true;
  } catch {
    return false;
  }
}

/**
 * Simulate rate limit configuration
 */
export function simulateRateLimitConfig(config: RateLimitConfig, requestCount: number): {
  allowed: number;
  blocked: number;
  effectiveRate: number;
} {
  const allowed = Math.min(requestCount, config.requests);
  const blocked = Math.max(0, requestCount - config.requests);
  const effectiveRate = allowed / (config.window / 1000); // requests per second

  return { allowed, blocked, effectiveRate };
}

/**
 * Analyze configuration performance
 */
export function analyzeConfigPerformance(config: RateLimitConfig): {
  requestsPerSecond: number;
  requestsPerMinute: number;
  requestsPerHour: number;
} {
  const windowInSeconds = config.window / 1000;
  const requestsPerSecond = config.requests / windowInSeconds;
  const requestsPerMinute = requestsPerSecond * 60;
  const requestsPerHour = requestsPerMinute * 60;

  return {
    requestsPerSecond,
    requestsPerMinute,
    requestsPerHour,
  };
}