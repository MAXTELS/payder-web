'use client';

import { RoleGuard } from '@/components/RoleGuard';
import { Sidebar, SidebarNavItem } from '@/components/Sidebar';

const NAV: SidebarNavItem[] = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/wallet', label: 'Wallet' },
  { href: '/transactions', label: 'Transaction history' },
  { href: '/bills', label: 'Bills' },
  { href: '/bills/manual-payment', label: 'Remita / eTranzact' },
  { href: '/airtime', label: 'Airtime & Data' },
  { href: '/betting', label: 'Betting' },
  { href: '/exams', label: 'Exam pins' },
  { href: '/kyc', label: 'Identity verification' },
  { href: '/account/transaction-pin', label: 'Transaction PIN' },
  { href: '/support', label: 'Support' },
];

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allow={['CUSTOMER']}>
      <div className="flex min-h-screen flex-col bg-surface-hover md:flex-row">
        <Sidebar nav={NAV} theme="light" />
        <main className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8">
          <div className="mx-auto max-w-5xl payder-fade-up">{children}</div>
        </main>
      </div>
    </RoleGuard>
  );
}
