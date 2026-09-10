'use client';

import { RoleGuard } from '@/components/RoleGuard';
import { Sidebar, SidebarNavItem } from '@/components/Sidebar';

const NAV: SidebarNavItem[] = [
  { href: '/biller', label: 'Dashboard' },
  { href: '/biller/wallet', label: 'Wallet' },
  { href: '/biller/bill', label: 'My bill' },
  { href: '/biller/payments', label: 'Payments' },
];

export default function BillerLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allow={['BILLER']}>
      <div className="flex min-h-screen flex-col bg-surface-hover md:flex-row">
        <Sidebar nav={NAV} theme="dark" title="Biller" />
        <main className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8">
          <div className="mx-auto max-w-5xl payder-fade-up">{children}</div>
        </main>
      </div>
    </RoleGuard>
  );
}
