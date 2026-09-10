'use client';

import { useRouter } from 'next/navigation';
import { clearSession } from '@/lib/auth';

/**
 * Addresses the "Logout Page not details" gap — clearSession() existed in
 * lib/auth.ts but nothing in the UI ever called it. Drop this into any
 * layout's sidebar/header.
 */
export function LogoutButton({ className = '' }: { className?: string }) {
  const router = useRouter();

  function handleLogout() {
    clearSession();
    router.push('/login');
  }

  return (
    <button
      onClick={handleLogout}
      className={
        className ||
        'flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-neutral-300 transition hover:bg-white/10 hover:text-white'
      }
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M15 17l5-5-5-5M20 12H9M12 3H6a2 2 0 00-2 2v14a2 2 0 002 2h6"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      Log out
    </button>
  );
}
