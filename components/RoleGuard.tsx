'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser, Role, SessionUser } from '@/lib/auth';

/**
 * Client-side gate so an admin/CC page doesn't even render for the wrong
 * role — a UX nicety, not the security boundary (that's the backend's
 * RolesGuard). See lib/auth.ts.
 *
 * `getCurrentUser()` reads localStorage, which doesn't exist during
 * server-side rendering (it returns null there — see its own
 * `typeof window === 'undefined'` guard). Reading it via a lazy useState
 * initializer meant the very first client render (the hydration pass, which
 * React requires to match the server's HTML exactly) already saw the real
 * user while the server had rendered null — a mismatch on every single
 * role-gated page (visible in the browser console as "Hydration failed").
 * Fix: start from the same `null`/`false` state the server used, and only
 * read the real session inside an effect, which runs after hydration is
 * already done — a normal post-hydration update, not a mismatch.
 */
export function RoleGuard({
  allow,
  children,
}: {
  allow: Role[];
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    setUser(getCurrentUser());
    setMounted(true);
  }, []);

  const authorized = mounted && !!user && allow.includes(user.role);

  useEffect(() => {
    if (mounted && !authorized) router.replace('/login');
  }, [mounted, authorized, router]);

  if (!authorized) return null;
  return <>{children}</>;
}
