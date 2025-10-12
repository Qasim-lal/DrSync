'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  HomeIcon,
  BuildingOfficeIcon,
  CreditCardIcon,
  ChartBarIcon,
  LifebuoyIcon,
} from '@heroicons/react/24/outline';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  children?: {
    name: string;
    href: string;
  }[];
}

const navigation: NavItem[] = [
  {
    name: 'Dashboard',
    href: '/admin',
    icon: HomeIcon,
  },
  {
    name: 'Organizations',
    href: '/admin/organizations',
    icon: BuildingOfficeIcon,
  },
  {
    name: 'Billing',
    href: '/admin/billing',
    icon: CreditCardIcon,
    children: [
      { name: 'Overview', href: '/admin/billing' },
      { name: 'Transactions', href: '/admin/billing/transactions' },
      { name: 'Invoices', href: '/admin/billing/invoices' },
      { name: 'Trials', href: '/admin/billing/trials' },
      { name: 'Revenue', href: '/admin/billing/revenue' },
    ],
  },
  {
    name: 'Analytics',
    href: '/admin/analytics',
    icon: ChartBarIcon,
    children: [
      { name: 'Overview', href: '/admin/analytics' },
      { name: 'System Health', href: '/admin/analytics/health' },
      { name: 'Usage', href: '/admin/analytics/usage' },
      { name: 'Growth', href: '/admin/analytics/growth' },
    ],
  },
  {
    name: 'Support',
    href: '/admin/support',
    icon: LifebuoyIcon,
    children: [
      { name: 'Dashboard', href: '/admin/support' },
      { name: 'Tickets', href: '/admin/support/tickets' },
      { name: 'Knowledge Base', href: '/admin/support/knowledge-base' },
      { name: 'Communications', href: '/admin/support/communications' },
      { name: 'Assistance', href: '/admin/support/assistance' },
      { name: 'Analytics', href: '/admin/support/analytics' },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [expanded, setExpanded] = React.useState<string[]>([]);

  const toggleExpanded = (name: string) => {
    setExpanded((prev) =>
      prev.includes(name)
        ? prev.filter((n) => n !== name)
        : [...prev, name]
    );
  };

  const isActive = (href: string) => pathname === href;
  const isParentActive = (item: NavItem) => {
    if (pathname === item.href) return true;
    return item.children?.some((child) => pathname === child.href) ?? false;
  };

  return (
    <div className="flex h-full w-64 flex-col bg-gray-900">
      {/* Logo */}
      <div className="flex h-16 items-center px-6">
        <h1 className="text-xl font-bold text-white">DrSync Admin</h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {navigation.map((item) => {
          const Icon = item.icon;
          const active = isParentActive(item);
          const hasChildren = item.children && item.children.length > 0;
          const isExpanded = expanded.includes(item.name);

          return (
            <div key={item.name}>
              {hasChildren ? (
                <button
                  onClick={() => toggleExpanded(item.name)}
                  className={`group flex w-full items-center rounded-md px-3 py-2 text-sm font-medium ${
                    active
                      ? 'bg-gray-800 text-white'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  <Icon className="mr-3 h-5 w-5 flex-shrink-0" />
                  <span className="flex-1 text-left">{item.name}</span>
                  <svg
                    className={`ml-auto h-4 w-4 transition-transform ${
                      isExpanded ? 'rotate-90' : ''
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              ) : (
                <Link
                  href={item.href}
                  className={`group flex items-center rounded-md px-3 py-2 text-sm font-medium ${
                    active
                      ? 'bg-gray-800 text-white'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  <Icon className="mr-3 h-5 w-5 flex-shrink-0" />
                  {item.name}
                </Link>
              )}

              {/* Submenu */}
              {hasChildren && isExpanded && (
                <div className="ml-11 mt-1 space-y-1">
                  {item.children!.map((child) => (
                    <Link
                      key={child.href}
                      href={child.href}
                      className={`block rounded-md px-3 py-2 text-sm ${
                        isActive(child.href)
                          ? 'bg-gray-800 text-white'
                          : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                      }`}
                    >
                      {child.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-800 p-4">
        <p className="text-xs text-gray-400">
          © 2025 DrSync. All rights reserved.
        </p>
      </div>
    </div>
  );
}
