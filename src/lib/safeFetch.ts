import dns from 'dns/promises';
import http from 'http';
import https from 'https';
import { URL } from 'url';

export interface SafeFetchOptions {
  timeoutMs?: number;
  maxRedirects?: number;
  maxSizeBytes?: number;
  method?: 'GET' | 'HEAD';
  headers?: Record<string, string>;
}

export interface SafeFetchResult {
  ok: boolean;
  statusCode: number;
  headers: Record<string, string | string[] | undefined>;
  body?: string;
  error?: string;
}

/**
 * Checks if an IPv4 address is in a reserved/private/loopback range.
 */
export function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(p => isNaN(p) || p < 0 || p > 255)) {
    return true; // Malformed IP treated as unsafe
  }

  const [a, b, c, d] = parts;

  // 0.0.0.0/8
  if (a === 0) return true;
  // 10.0.0.0/8
  if (a === 10) return true;
  // 100.64.0.0/10 (Carrier NAT)
  if (a === 100 && b >= 64 && b <= 127) return true;
  // 127.0.0.0/8 (Loopback)
  if (a === 127) return true;
  // 169.254.0.0/16 (Link-local & AWS/GCP/Azure metadata 169.254.169.254)
  if (a === 169 && b === 254) return true;
  // 172.16.0.0/12 (Private)
  if (a === 172 && b >= 16 && b <= 31) return true;
  // 192.0.0.0/24 (IETF)
  if (a === 192 && b === 0 && c === 0) return true;
  // 192.0.2.0/24 (TEST-NET-1)
  if (a === 192 && b === 0 && c === 2) return true;
  // 192.168.0.0/16 (Private)
  if (a === 192 && b === 168) return true;
  // 198.18.0.0/15 (Benchmarking)
  if (a === 198 && (b === 18 || b === 19)) return true;
  // 198.51.100.0/24 (TEST-NET-2)
  if (a === 198 && b === 51 && c === 100) return true;
  // 203.0.113.0/24 (TEST-NET-3)
  if (a === 203 && b === 0 && c === 113) return true;
  // 224.0.0.0/4 (Multicast)
  if (a >= 224 && a <= 239) return true;
  // 240.0.0.0/4 (Reserved)
  if (a >= 240) return true;

  return false;
}

/**
 * Checks if an IPv6 address is in a reserved/private/loopback range.
 */
export function isPrivateIPv6(ip: string): boolean {
  const norm = ip.toLowerCase();
  // Loopback / Unspecified
  if (norm === '::1' || norm === '::' || norm === '0:0:0:0:0:0:0:1') return true;
  // IPv4-mapped IPv6 ::ffff:a.b.c.d
  if (norm.startsWith('::ffff:')) {
    const ipv4Part = norm.substring(7);
    if (ipv4Part.includes('.')) {
      return isPrivateIPv4(ipv4Part);
    }
  }
  // Unique Local Address fc00::/7 (fc00... or fd00...)
  if (norm.startsWith('fc') || norm.startsWith('fd')) return true;
  // Link-Local fe80::/10
  if (norm.startsWith('fe8') || norm.startsWith('fe9') || norm.startsWith('fea') || norm.startsWith('feb')) return true;
  // Multicast ff00::/8
  if (norm.startsWith('ff')) return true;

  return false;
}

export function isPrivateIP(ip: string): boolean {
  if (ip.includes(':')) {
    return isPrivateIPv6(ip);
  }
  return isPrivateIPv4(ip);
}

/**
 * Resolves a hostname and verifies that all resolved IP addresses are public.
 */
export async function validateHostPublicIP(hostname: string): Promise<string> {
  // If hostname is already an IP address
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
    if (isPrivateIPv4(hostname)) {
      throw new Error(`SSRF Blocked: ${hostname} is a private/reserved IPv4 address`);
    }
    return hostname;
  }

  if (hostname.includes(':')) {
    if (isPrivateIPv6(hostname)) {
      throw new Error(`SSRF Blocked: ${hostname} is a private/reserved IPv6 address`);
    }
    return hostname;
  }

  // Block localhost directly
  if (hostname.toLowerCase() === 'localhost' || hostname.toLowerCase().endsWith('.localhost') || hostname.toLowerCase().endsWith('.local')) {
    throw new Error(`SSRF Blocked: localhost / local domains are not permitted`);
  }

  // DNS Lookup
  const addresses = await dns.lookup(hostname, { all: true });
  if (!addresses || addresses.length === 0) {
    throw new Error(`DNS resolution failed for ${hostname}`);
  }

  for (const addr of addresses) {
    if (isPrivateIP(addr.address)) {
      throw new Error(`SSRF Blocked: ${hostname} resolves to private/reserved IP ${addr.address}`);
    }
  }

  return addresses[0].address;
}

/**
 * Executes an HTTP/HTTPS request with strict SSRF controls, timeouts, redirect capping, and payload limits.
 */
export async function safeFetch(
  targetUrl: string,
  options: SafeFetchOptions = {}
): Promise<SafeFetchResult> {
  const {
    timeoutMs = 3500,
    maxRedirects = 3,
    maxSizeBytes = 512 * 1024,
    method = 'GET',
    headers = {},
  } = options;

  let currentUrl = targetUrl;
  let redirectsRemaining = maxRedirects;

  while (true) {
    let parsed: URL;
    try {
      parsed = new URL(currentUrl);
    } catch {
      return { ok: false, statusCode: 0, headers: {}, error: 'Invalid URL syntax' };
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return {
        ok: false,
        statusCode: 0,
        headers: {},
        error: `Protocol "${parsed.protocol}" not allowed. Only HTTP and HTTPS are permitted.`,
      };
    }

    // SSRF IP Validation
    try {
      await validateHostPublicIP(parsed.hostname);
    } catch (err: any) {
      return { ok: false, statusCode: 0, headers: {}, error: err.message };
    }

    const client = parsed.protocol === 'https:' ? https : http;

    const requestResult = await new Promise<SafeFetchResult>((resolve) => {
      const req = client.request(
        parsed,
        {
          method,
          headers: {
            'User-Agent': 'TechOpportunityTracker/1.0 (+https://github.com/sanvisharma850/tech-opportunity-tracker)',
            Accept: '*/*',
            ...headers,
          },
        },
        (res) => {
          const statusCode = res.statusCode || 0;

          // Handle redirects
          if ([301, 302, 303, 307, 308].includes(statusCode) && res.headers.location) {
            res.resume(); // drain response
            if (redirectsRemaining <= 0) {
              return resolve({
                ok: false,
                statusCode,
                headers: res.headers,
                error: 'Exceeded maximum redirects',
              });
            }
            try {
              const nextUrl = new URL(res.headers.location, currentUrl).toString();
              return resolve({
                ok: false,
                statusCode,
                headers: res.headers,
                body: nextUrl, // Signal redirect target
              });
            } catch {
              return resolve({
                ok: false,
                statusCode,
                headers: res.headers,
                error: 'Invalid redirect location header',
              });
            }
          }

          let size = 0;
          let body = '';

          res.on('data', (chunk) => {
            size += chunk.length;
            if (size > maxSizeBytes) {
              req.destroy(new Error(`Payload exceeded ${maxSizeBytes} bytes`));
              return;
            }
            if (method !== 'HEAD') {
              body += chunk.toString('utf-8');
            }
          });

          res.on('end', () => {
            resolve({
              ok: statusCode >= 200 && statusCode < 300,
              statusCode,
              headers: res.headers,
              body: method === 'HEAD' ? undefined : body,
            });
          });
        }
      );

      req.on('error', (err) => {
        resolve({
          ok: false,
          statusCode: 0,
          headers: {},
          error: err.message || 'Network request failed',
        });
      });

      req.setTimeout(timeoutMs, () => {
        req.destroy(new Error(`Request timed out after ${timeoutMs}ms`));
      });

      req.end();
    });

    // Check if this was a redirect
    if ([301, 302, 303, 307, 308].includes(requestResult.statusCode) && requestResult.body) {
      redirectsRemaining--;
      currentUrl = requestResult.body;
      continue;
    }

    return requestResult;
  }
}

/**
 * Checks liveness for a URL: tries HEAD first, then falls back to GET with a short timeout.
 */
export async function checkUrlLiveness(url: string, timeoutMs = 3000): Promise<{ ok: boolean; statusCode: number; error?: string }> {
  try {
    // 1. Try HEAD
    const headRes = await safeFetch(url, { method: 'HEAD', timeoutMs });
    if (headRes.ok) {
      return { ok: true, statusCode: headRes.statusCode };
    }

    // 2. Fall back to GET if HEAD was 405 Method Not Allowed or 403 or network issue
    const getRes = await safeFetch(url, { method: 'GET', timeoutMs, maxSizeBytes: 64 * 1024 });
    return { ok: getRes.ok, statusCode: getRes.statusCode, error: getRes.error };
  } catch (err: any) {
    return { ok: false, statusCode: 0, error: err.message };
  }
}
