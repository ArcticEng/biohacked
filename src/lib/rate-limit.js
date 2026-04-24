// ═══════════════════════════════════════════════════
// Rate Limiting — in-memory sliding window
// Protects AI endpoints and auth from abuse
// ═══════════════════════════════════════════════════

const windows = new Map();

/**
 * @param {string} key   - Unique identifier (IP + path, or userId)
 * @param {number} limit - Max requests in the window
 * @param {number} windowMs - Window duration in ms (default 60s)
 * @returns {{ allowed: boolean, remaining: number, retryAfter?: number }}
 */
export function rateLimit(key, limit = 30, windowMs = 60000) {
  const now = Date.now();
  const record = windows.get(key);

  if (!record || now - record.start > windowMs) {
    windows.set(key, { start: now, count: 1 });
    return { allowed: true, remaining: limit - 1 };
  }

  record.count++;
  const remaining = Math.max(0, limit - record.count);

  if (record.count > limit) {
    const retryAfter = Math.ceil((record.start + windowMs - now) / 1000);
    return { allowed: false, remaining: 0, retryAfter };
  }

  return { allowed: true, remaining };
}

/**
 * Extract IP from Next.js request for rate limit keying
 */
export function getClientIP(request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "unknown";
}

/**
 * Middleware helper — returns a 429 response if rate limited
 */
export function checkRateLimit(request, { limit = 30, windowMs = 60000, prefix = "" } = {}) {
  const ip = getClientIP(request);
  const path = new URL(request.url).pathname;
  const key = `${prefix || path}:${ip}`;
  const result = rateLimit(key, limit, windowMs);

  if (!result.allowed) {
    return { error: "Too many requests. Try again later.", status: 429, retryAfter: result.retryAfter };
  }

  return null;
}

// Cleanup stale entries every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of windows) {
      if (now - record.start > 120000) windows.delete(key);
    }
  }, 300000);
}
