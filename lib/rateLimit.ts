const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

interface Entry {
  count: number;
  lockedUntil: number;
}

const store = new Map<string, Entry>();

export function checkRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const entry = store.get(ip);
  if (!entry) return { allowed: true };

  if (entry.lockedUntil > now) {
    return { allowed: false, retryAfter: Math.ceil((entry.lockedUntil - now) / 1000) };
  }

  return { allowed: true };
}

export function recordFailure(ip: string): void {
  const now = Date.now();
  const entry = store.get(ip) ?? { count: 0, lockedUntil: 0 };
  // Reset count if previous lockout has expired
  if (entry.lockedUntil > 0 && entry.lockedUntil <= now) {
    entry.count = 0;
    entry.lockedUntil = 0;
  }
  entry.count += 1;
  if (entry.count >= MAX_ATTEMPTS) {
    entry.lockedUntil = now + LOCKOUT_MS;
  }
  store.set(ip, entry);
}

export function clearAttempts(ip: string): void {
  store.delete(ip);
}
