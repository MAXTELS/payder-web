'use client';

/**
 * Client-side auth helpers for the scaffold. The JWT's role/kycTier claims
 * decide what a user sees here, but — same caveat as everywhere else in this
 * codebase — that is a UX convenience only. The NestJS backend re-checks
 * RBAC on every request regardless of what this file lets a user navigate
 * to (PAYDER-ARCHITECTURE.md §8/§6). Do not add money-moving logic here.
 */

export type Role = 'CUSTOMER' | 'ADMIN' | 'CUSTOMER_CARE' | 'BILLER';

export interface SessionUser {
  id: string;
  role: Role;
  kycTier: string;
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const [, payload] = token.split('.');
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return null;
  }
}

export function storeSession(accessToken: string, refreshToken: string) {
  localStorage.setItem('payder_access_token', accessToken);
  localStorage.setItem('payder_refresh_token', refreshToken);
}

export function clearSession() {
  localStorage.removeItem('payder_access_token');
  localStorage.removeItem('payder_refresh_token');
}

export function getCurrentUser(): SessionUser | null {
  if (typeof window === 'undefined') return null;
  const token = localStorage.getItem('payder_access_token');
  if (!token) return null;
  const payload = decodeJwtPayload(token);
  if (!payload) return null;
  return {
    id: payload.sub as string,
    role: payload.role as Role,
    kycTier: payload.kycTier as string,
  };
}
