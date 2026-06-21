'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

const navSections = [
  {
    title: 'Sales',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: '📊' },
      { href: '/accounts', label: 'Accounts', icon: '🏢' },
      { href: '/contacts', label: 'Contacts', icon: '👤' },
      { href: '/leads', label: 'Leads', icon: '🎯' },
      { href: '/deals', label: 'Deals', icon: '💼' },
      { href: '/quotes', label: 'Quotes', icon: '📄' },
    ],
  },
  {
    title: 'Phase 2',
    items: [
      { href: '/orders', label: 'Orders', icon: '🚚' },
      { href: '/pricing-analytics', label: 'Pricing Analytics', icon: '📊' },
      { href: '/invoices', label: 'Invoices', icon: '💰' },
      { href: '/subscriptions', label: 'Subscriptions', icon: '🔄' },
      { href: '/contracts', label: 'Contracts', icon: '📝' },
      { href: '/approvals', label: 'Approvals', icon: '✔️' },
      { href: '/forecasting', label: 'Forecasting', icon: '📈' },
      { href: '/cadences', label: 'Cadences', icon: '🔁' },
      { href: '/documents', label: 'Documents', icon: '📁' },
      { href: '/constraints', label: 'CPQ Rules', icon: '⚙️' },
      { href: '/chatter', label: 'Chatter', icon: '💬' },
      { href: '/playbooks', label: 'Playbooks', icon: '📋' },
      { href: '/call-scripts', label: 'Call Scripts', icon: '📞' },
      { href: '/currencies', label: 'Currencies', icon: '💱' },
      { href: '/blueprints', label: 'Blueprints', icon: '🔀' },
      { href: '/flow-builder', label: 'Flow Builder', icon: '🛠️' },
    ],
  },
  {
    title: 'Platform',
    items: [
      { href: '/sales-programs', label: 'Sales Programs', icon: '🎯' },
    ],
  },
  {
    title: 'Admin',
    items: [
      { href: '/admin/gdpr', label: 'GDPR Toolkit', icon: '🔒' },
      { href: '/admin/custom-modules', label: 'Custom Modules', icon: '🧩' },
      { href: '/admin/routing', label: 'Routing Rules', icon: '🔀' },
      { href: '/admin/ai', label: 'AI Trust Layer', icon: '🛡️' },
    ],
  },
  {
    title: 'Phase 3',
    items: [
      { href: '/vendors', label: 'Vendors', icon: '🏭' },
      { href: '/marketing', label: 'Marketing', icon: '📣' },
      { href: '/knowledge', label: 'Knowledge', icon: '📚' },
      { href: '/deal-registrations', label: 'Deal Registration', icon: '🤝' },
      { href: '/partner-enablement', label: 'Partner Enablement', icon: '🎓' },
      { href: '/portals', label: 'Portals', icon: '🌐' },
      { href: '/account-plans', label: 'Account Plans', icon: '🗺️' },
      { href: '/mdf', label: 'MDF', icon: '💵' },
      { href: '/journeys', label: 'Journeys', icon: '🛤️' },
      { href: '/revops', label: 'RevOps', icon: '📉' },
      { href: '/emails', label: 'Email Hub', icon: '✉️' },
    ],
  },
  {
    title: 'Phase 4 — Service',
    items: [
      { href: '/cases', label: 'Cases', icon: '🎫' },
      { href: '/assets', label: 'Installed Base', icon: '🔧' },
      { href: '/field-service', label: 'Field Service', icon: '📅' },
      { href: '/rma', label: 'RMA', icon: '↩️' },
      { href: '/incidents', label: 'Incidents', icon: '🚨' },
      { href: '/eol', label: 'EOL Manager', icon: '⏳' },
    ],
  },
  {
    title: 'Phase 5 — AI',
    items: [
      { href: '/copilot', label: 'Copilot', icon: '🤖' },
      { href: '/agents', label: 'Agents', icon: '⚡' },
    ],
  },
  {
    title: 'Operations',
    items: [
      { href: '/products', label: 'Products', icon: '📦' },
      { href: '/inventory', label: 'Inventory', icon: '🏬' },
      { href: '/activities', label: 'Activities', icon: '📅' },
      { href: '/workqueue', label: 'Workqueue', icon: '✅' },
      { href: '/search', label: 'Search', icon: '🔍' },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const initials = user
    ? `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase()
    : 'U';

  return (
    <aside className="flex h-screen w-64 flex-shrink-0 flex-col bg-slate-900 text-slate-100">
      <div className="border-b border-slate-700 px-6 py-5">
        <h1 className="text-lg font-bold tracking-tight text-white">CRM</h1>
        <p className="mt-0.5 text-xs text-slate-400">B2B Distribution</p>
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-4">
        {navSections.map((section) => (
          <div key={section.title}>
            <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
              {section.title}
            </p>
            <div className="space-y-1">
              {section.items.map((item) => {
                const isActive =
                  pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <span className="text-base">{item.icon}</span>
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-slate-700 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-bold">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">
              {user ? `${user.firstName} ${user.lastName}` : 'User'}
            </p>
            <p className="truncate text-xs text-slate-400">{user?.email}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={logout}
          className="mt-3 w-full rounded-lg px-3 py-2 text-left text-sm text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}