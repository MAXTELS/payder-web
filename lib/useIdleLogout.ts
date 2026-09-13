'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { clearSession } from './auth';

// How long a session can sit idle (no mouse/keyboard/touch/scroll activity)
// before we treat it as abandoned and force a fresh login. Applies to every
// role-gated page (customer/admin/biller/care) via RoleGuard, and mirrors
// the same 10-minute policy enforced in the mobile app.
export const IDLE_TIMEOUT_MS = 10 * 60 * 1000;

const ACTIVITY_EVENTS: Array<keyof WindowEventMap> = [
  'mousemove',
  'mousedown',
  'keydown',
  'touchstart',
  'scroll',
  'wheel',
];

/**
 * Logs the user out and bounces them to /login after IDLE_TIMEOUT_MS of no
 * user activity. Only runs once `active` is true (RoleGuard passes this once
 * the session has been confirmed authorized), so it never fires on the
 * public/marketing pages or while the auth check itself is still pending.
 *
 * This is a client-side convenience, same caveat as the rest of lib/auth.ts:
 * the backend still rejects an old/expired token on its own merits. This
 * hook just makes the browser proactively forget the session and send the
 * user back to /login instead of leaving a signed-in tab open indefinitely.
 */
export function useIdleLogout(active: boolean) {
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!active) return;

    function reset() {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        clearSession();
        router.replace('/login?reason=timeout');
      }, IDLE_TIMEOUT_MS);
    }

    reset();
    ACTIVITY_EVENTS.forEach((evt) => window.addEventListener(evt, reset, { passive: true }));
    document.addEventListener('visibilitychange', reset);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, reset));
      document.removeEventListener('visibilitychange', reset);
    };
  }, [active, router]);
}
