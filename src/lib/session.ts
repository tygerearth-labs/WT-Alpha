import { cookies } from 'next/headers';

/**
 * Session data stored in the signed session cookie.
 */
export interface SessionData {
  userId: string;
}

// Use NEXTAUTH_SECRET (already in Vercel ENV) — no need for a separate SESSION_SECRET
const SESSION_SECRET = process.env.NEXTAUTH_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'dev-only-secret-change-in-production');

if (process.env.NODE_ENV === 'production' && !process.env.NEXTAUTH_SECRET) {
  throw new Error('NEXTAUTH_SECRET environment variable is required in production');
}

const SESSION_COOKIE_NAME = 'session';

/**
 * Encode a string to Uint8Array (UTF-8)
 */
function textEncode(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

/**
 * Decode Uint8Array to hex string
 */
function bufToHex(buffer: Uint8Array): string {
  return Array.from(buffer)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Create an HMAC-SHA256 signature using Web Crypto API (Edge-compatible).
 * Format: userId.hmacSignature
 */
export async function signSessionToken(userId: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    textEncode(SESSION_SECRET) as BufferSource,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, textEncode(userId) as BufferSource);
  return `${userId}.${bufToHex(new Uint8Array(signature))}`;
}

/**
 * Verify an HMAC-signed session token using Web Crypto API (Edge-compatible).
 * Returns the userId if valid, or null if the signature is invalid.
 */
export async function verifySessionToken(token: string): Promise<string | null> {
  const dotIndex = token.lastIndexOf('.');
  if (dotIndex === -1) return null;

  const userId = token.substring(0, dotIndex);
  const providedSignature = token.substring(dotIndex + 1);

  // Compute expected signature
  const key = await crypto.subtle.importKey(
    'raw',
    textEncode(SESSION_SECRET) as BufferSource,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, textEncode(userId) as BufferSource);
  const expectedSignature = bufToHex(new Uint8Array(signature));

  // Timing-safe comparison: always compare full length
  if (providedSignature.length !== expectedSignature.length) {
    return null;
  }

  // XOR-based constant-time comparison
  let mismatch = 0;
  for (let i = 0; i < providedSignature.length; i++) {
    mismatch |= providedSignature.charCodeAt(i) ^ expectedSignature.charCodeAt(i);
  }

  if (mismatch !== 0) {
    return null;
  }

  return userId;
}

/**
 * Create a session by setting a signed cookie.
 */
export async function createSession(userId: string): Promise<void> {
  const cookieStore = await cookies();
  const signedToken = await signSessionToken(userId);
  cookieStore.set(SESSION_COOKIE_NAME, signedToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });
}

/**
 * Get the current session from cookies.
 * Verifies the HMAC signature.
 * Returns null if not authenticated or signature is invalid.
 */
export async function getSession(): Promise<SessionData | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const userId = await verifySessionToken(token);
  if (!userId) return null;

  return { userId };
}

/**
 * Destroy the current session by clearing the signed cookie.
 */
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });
}

/**
 * Verify a session token from a raw cookie string value.
 * Used by middleware where `cookies()` is not available.
 * Uses Web Crypto API for Edge Runtime compatibility.
 */
export async function verifySessionTokenFromValue(token: string | undefined): Promise<string | null> {
  if (!token) return null;
  return verifySessionToken(token);
}
