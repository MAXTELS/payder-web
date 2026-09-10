'use client';

import { RoleGuard } from '@/components/RoleGuard';
import { Sidebar, SidebarNavItem } from '@/components/Sidebar';

const NAV: SidebarNavItem[] = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/users', label: 'User management' },
  { href: '/admin/kyc', label: 'KYC review' },
  { href: '/admin/transactions', label: 'Transactions' },
  { href: '/admin/wallet-funding', label: 'Wallet funding' },
  { href: '/admin/withdrawals', label: 'Withdrawals' },
  { href: '/admin/manual-payments', label: 'Manual payments' },
  { href: '/admin/billers', label: 'Billers' },
  { href: '/admin/providers', label: 'Providers' },
  { href: '/admin/staff', label: 'Staff' },
  { href: '/admin/audit-log', label: 'Audit log' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allow={['ADMIN']}>
      <div className="flex min-h-screen flex-col bg-surface-hover md:flex-row">
        <Sidebar nav={NAV} theme="dark" title="Admin" />
        <main className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8">
          <div className="mx-auto max-w-5xl payder-fade-up">{children}</div>
        </main>
      </div>
    </RoleGuard>
  );
}
