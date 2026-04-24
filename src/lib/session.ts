import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

/**
 * Session data stored in the signed session cookie.
 */
export interface SessionData {
  userId: string;
}

// Use NEXTAUTH_SECRET (already in Vercel ENV) — no need for a separate SESSION_SECRET
// Lazy getter so the check only runs at request-time, not at build-time
let _secret: string | undefined;
function getSecret(): string {
  if (!_secret) {
    _secret = process.env.NEXTAUTH_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'dev-only-secret-change-in-production');
    if (process.env.NODE_ENV === 'production' && !_secret) {
      throw new Error('NEXTAUTH_SECRET environment variable is required in production');
    }
  }
  return _secret;
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
    textEncode(getSecret()) as BufferSource,
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
    textEncode(getSecret()) as BufferSource,
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
 * Generate a signed session token for a user.
 * Returns the signed token string (userId.hmacSignature).
 * Use `attachSessionCookie()` to set it on a NextResponse.
 */
export async function createSession(userId: string): Promise<string> {
  return signSessionToken(userId);
}

/**
 * Cookie options for the session cookie.
 */
export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 60 * 60 * 24 * 7, // 7 days
  path: '/',
};

/**
 * Attach a signed session token to a NextResponse object.
 * This is the correct way to set cookies when using NextResponse.json().
 */
export function attachSessionCookie(response: NextResponse, token: string): void {
  response.cookies.set(SESSION_COOKIE_NAME, token, SESSION_COOKIE_OPTIONS);
}

/**
 * Create a session by setting a signed cookie via the headers API.
 * WARNING: Only use this in Server Components, NOT in route handlers that return NextResponse.
 * In route handlers, use createSession() + attachSessionCookie() instead.
 */
export async function createSessionViaHeaders(userId: string): Promise<void> {
  const cookieStore = await cookies();
  const signedToken = await signSessionToken(userId);
  cookieStore.set(SESSION_COOKIE_NAME, signedToken, SESSION_COOKIE_OPTIONS);
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
