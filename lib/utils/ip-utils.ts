import { NextRequest } from 'next/server';

/**
 * Extract client IP address from NextRequest
 * Handles various proxy headers in order of priority
 */
export function getClientIP(request: NextRequest): string {
  // Check various headers in order of reliability
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const cfConnectingIP = request.headers.get('cf-connecting-ip');

  // Handle x-forwarded-for (may contain multiple IPs)
  if (forwardedFor) {
    const ips = forwardedFor.split(',').map(ip => ip.trim());
    const firstIP = ips[0];
    if (firstIP && validateIP(firstIP)) {
      return normalizeIP(firstIP);
    }
  }

  // Handle CloudFlare connecting IP
  if (cfConnectingIP && validateIP(cfConnectingIP)) {
    return normalizeIP(cfConnectingIP);
  }

  // Handle x-real-ip
  if (realIP && validateIP(realIP)) {
    return normalizeIP(realIP);
  }

  // Final fallback for development/testing
  return '127.0.0.1';
}

/**
 * Extract IP from headers object
 */
export function extractIPFromHeaders(headers: Headers): string | null {
  const forwardedFor = headers.get('x-forwarded-for');
  const realIP = headers.get('x-real-ip');
  const cfConnectingIP = headers.get('cf-connecting-ip');

  if (forwardedFor) {
    const ips = forwardedFor.split(',').map(ip => ip.trim());
    const firstIP = ips[0];
    if (firstIP && validateIP(firstIP)) {
      return normalizeIP(firstIP);
    }
  }

  if (cfConnectingIP && validateIP(cfConnectingIP)) {
    return normalizeIP(cfConnectingIP);
  }

  if (realIP && validateIP(realIP)) {
    return normalizeIP(realIP);
  }

  return null;
}

/**
 * Handle proxy IP scenarios
 */
export function handleProxyIP(ip: string, headers: Headers): string {
  // If IP is from a trusted proxy, try to get real client IP
  if (isTrustedProxy(ip)) {
    const realIP = extractIPFromHeaders(headers);
    return realIP || ip;
  }
  return ip;
}

/**
 * Validate IP address format (IPv4 and IPv6)
 */
export function validateIP(ip: string): boolean {
  if (!ip || typeof ip !== 'string') {
    return false;
  }

  // IPv4 regex
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  
  // IPv6 regex (simplified)
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$/;

  return ipv4Regex.test(ip) || ipv6Regex.test(ip) || ip === 'localhost';
}

/**
 * Check if IP is IPv6
 */
export function isIPv6(ip: string): boolean {
  return ip.includes(':');
}

/**
 * Check if IP is in private range
 */
export function isPrivateIP(ip: string): boolean {
  if (!validateIP(ip)) return false;

  // Common private IP ranges
  const privateRanges = [
    /^127\./,          // 127.0.0.0/8 (localhost)
    /^10\./,           // 10.0.0.0/8
    /^172\.(1[6-9]|2[0-9]|3[01])\./,  // 172.16.0.0/12
    /^192\.168\./,     // 192.168.0.0/16
    /^::1$/,           // IPv6 localhost
    /^fc00:/,          // IPv6 unique local
    /^fe80:/,          // IPv6 link local
  ];

  return privateRanges.some(range => range.test(ip));
}

/**
 * Normalize IP address for consistent storage
 */
export function normalizeIP(ip: string): string {
  if (!validateIP(ip)) {
    throw new Error('Invalid IP address');
  }

  // Handle localhost variations
  if (ip === 'localhost' || ip === '::1') {
    return '127.0.0.1';
  }

  // For IPv4, remove leading zeros
  if (!isIPv6(ip)) {
    return ip.split('.').map(part => parseInt(part, 10).toString()).join('.');
  }

  // For IPv6, basic normalization with compression
  return compressIPv6(ip.toLowerCase());
}

/**
 * Compress IPv6 address with proper :: compression
 */
function compressIPv6(ipv6: string): string {
  if (!ipv6.includes(':')) return ipv6;
  
  // Handle already compressed addresses
  if (ipv6.includes('::')) {
    return ipv6;
  }
  
  // Remove leading zeros from each part
  const parts = ipv6.split(':');
  const normalized = parts.map(part => {
    if (part === '') return part;
    return part.replace(/^0+/, '') || '0';
  });
  
  // Find longest sequence of consecutive zeros
  let maxZeroStart = -1;
  let maxZeroLength = 0;
  let currentZeroStart = -1;
  let currentZeroLength = 0;
  
  for (let i = 0; i < normalized.length; i++) {
    if (normalized[i] === '0') {
      if (currentZeroStart === -1) {
        currentZeroStart = i;
        currentZeroLength = 1;
      } else {
        currentZeroLength++;
      }
    } else {
      if (currentZeroLength > maxZeroLength && currentZeroLength > 1) {
        maxZeroStart = currentZeroStart;
        maxZeroLength = currentZeroLength;
      }
      currentZeroStart = -1;
      currentZeroLength = 0;
    }
  }
  
  // Check final sequence
  if (currentZeroLength > maxZeroLength && currentZeroLength > 1) {
    maxZeroStart = currentZeroStart;
    maxZeroLength = currentZeroLength;
  }
  
  // Apply :: compression if we found a sequence to compress
  if (maxZeroStart !== -1 && maxZeroLength > 1) {
    const before = normalized.slice(0, maxZeroStart);
    const after = normalized.slice(maxZeroStart + maxZeroLength);
    
    if (before.length === 0 && after.length === 0) {
      return '::';
    } else if (before.length === 0) {
      return '::' + after.join(':');
    } else if (after.length === 0) {
      return before.join(':') + '::';
    } else {
      return before.join(':') + '::' + after.join(':');
    }
  }
  
  return normalized.join(':');
}

/**
 * Hash IP for privacy (basic implementation)
 */
export function hashIPForPrivacy(ip: string): string {
  // Simple hash implementation for privacy
  let hash = 0;
  for (let i = 0; i < ip.length; i++) {
    const char = ip.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Anonymize IP address
 */
export function anonymizeIP(ip: string): string {
  if (!validateIP(ip)) return ip;

  if (isIPv6(ip)) {
    // For IPv6, zero out last 64 bits
    const parts = ip.split(':');
    return parts.slice(0, 4).join(':') + '::';
  } else {
    // For IPv4, zero out last octet
    const parts = ip.split('.');
    return parts.slice(0, 3).join('.') + '.0';
  }
}

/**
 * Extract IP from NextRequest
 */
export function extractIPFromNextRequest(request: NextRequest): string {
  return getClientIP(request);
}

/**
 * Prioritize IP headers by reliability
 */
export function prioritizeIPHeaders(headers: Headers): string | null {
  const headerPriority = [
    'cf-connecting-ip',    // CloudFlare (most reliable if present)
    'x-real-ip',          // Nginx proxy
    'x-forwarded-for',    // Standard forwarded header
  ];

  for (const header of headerPriority) {
    const value = headers.get(header);
    if (value) {
      if (header === 'x-forwarded-for') {
        // Handle comma-separated list
        const ips = value.split(',').map(ip => ip.trim());
        const firstIP = ips[0];
        if (firstIP && validateIP(firstIP)) {
          return normalizeIP(firstIP);
        }
      } else if (validateIP(value)) {
        return normalizeIP(value);
      }
    }
  }

  return null;
}

/**
 * Check if IP is from trusted proxy
 */
export function isTrustedProxy(ip: string): boolean {
  // Common CDN/proxy IP ranges (simplified)
  const trustedProxies = [
    /^10\./,           // Internal network
    /^172\.(1[6-9]|2[0-9]|3[01])\./,  // Internal network
    /^192\.168\./,     // Internal network
    /^127\./,          // Localhost
  ];

  return trustedProxies.some(range => range.test(ip));
}

/**
 * Detect potential IP spoofing
 */
export function detectIPSpoofing(request: NextRequest): boolean {
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');

  // Basic spoofing detection - check for inconsistencies
  if (forwardedFor && realIP) {
    const forwardedIPs = forwardedFor.split(',').map(ip => ip.trim());
    if (!forwardedIPs.includes(realIP)) {
      // Potential spoofing if headers don't match
      return true;
    }
  }

  return false;
}

/**
 * Check if IP is blacklisted
 */
export function isBlacklistedIP(ip: string): boolean {
  // Placeholder - would integrate with actual blacklist service
  const blacklistedIPs = new Set<string>([
    // Add known bad IPs here
  ]);

  return blacklistedIPs.has(ip);
}

/**
 * Check if IP is whitelisted
 */
export function isWhitelistedIP(ip: string): boolean {
  // Placeholder - would integrate with actual whitelist
  const whitelistedIPs = new Set([
    '127.0.0.1', // Localhost always whitelisted
  ]);

  return whitelistedIPs.has(ip);
}

/**
 * Cache IP lookup results
 */
export function cacheIPLookup(_ip: string, _result: any): void {
  // Placeholder for caching implementation
  // Would use Redis or in-memory cache in production
}

/**
 * Optimize IP lookup performance
 */
export function optimizeIPLookup(ip: string): string {
  // Placeholder for optimization logic
  return normalizeIP(ip);
}

/**
 * Process multiple IPs in batch
 */
export function processBatchIPs(ips: string[]): string[] {
  return ips.map(ip => {
    try {
      return normalizeIP(ip);
    } catch {
      return ip; // Return original if normalization fails
    }
  });
}

/**
 * Handle localhost requests specifically
 */
export function handleLocalhostRequests(ip: string): string {
  if (ip === 'localhost' || ip === '::1' || ip === '127.0.0.1') {
    return '127.0.0.1';
  }
  return ip;
}

/**
 * Handle development mode IPs
 */
export function handleDevelopmentIPs(ip: string): string {
  if (process.env.NODE_ENV === 'development') {
    // In development, treat all local IPs consistently
    if (isPrivateIP(ip)) {
      return '127.0.0.1';
    }
  }
  return ip;
}

/**
 * Handle missing IP with fallback
 */
export function handleMissingIP(request: NextRequest): string {
  // Try multiple methods to get IP
  const ip = getClientIP(request);
  
  if (ip === '127.0.0.1' && process.env.NODE_ENV === 'production') {
    console.warn('Could not determine client IP, using fallback');
  }
  
  return ip;
}