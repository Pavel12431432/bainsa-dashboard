export const COOKIE_NAME = "bainsa-auth";
export const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

// Token is a precomputed HMAC of the password, stored in DASHBOARD_TOKEN env var.
// This lets middleware verify synchronously without crypto at request time.

export function getExpectedToken(): string {
  return process.env.DASHBOARD_TOKEN ?? "";
}

export function createToken(): string {
  return getExpectedToken();
}

export function verifyToken(token: string): boolean {
  const expected = getExpectedToken();
  if (!expected || !token || token.length !== expected.length) return false;
  // Constant-time compare
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= token.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}
