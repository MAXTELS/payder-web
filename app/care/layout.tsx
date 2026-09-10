'use client';

import { RoleGuard } from '@/components/RoleGuard';
import { Sidebar, SidebarNavItem } from '@/components/Sidebar';

const NAV: SidebarNavItem[] = [{ href: '/care', label: 'Ticket queue' }];

export default function CareLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allow={['CUSTOMER_CARE', 'ADMIN']}>
      <div className="flex min-h-screen flex-col bg-surface-hover md:flex-row">
        <Sidebar nav={NAV} theme="dark" title="Customer Care" />
        <main className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8">
          <div className="mx-auto max-w-3xl payder-fade-up">{children}</div>
        </main>
      </div>
    </RoleGuard>
  );
}
