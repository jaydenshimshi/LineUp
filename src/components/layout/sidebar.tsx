'use client';

/**
 * Admin sidebar navigation component
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

interface SidebarLink {
  href: string;
  label: string;
  icon: string;
}

const adminLinks: SidebarLink[] = [
  { href: '/admin', label: 'Overview', icon: 'dashboard' },
  { href: '/admin/players', label: 'Players', icon: 'users' },
  { href: '/admin/checkins', label: 'Check-ins', icon: 'calendar' },
  { href: '/admin/teams', label: 'Teams', icon: 'teams' },
  { href: '/admin/ratings', label: 'Ratings', icon: 'star' },
  { href: '/admin/announcements', label: 'Announcements', icon: 'megaphone' },
  { href: '/admin/users', label: 'User Management', icon: 'shield' },
  { href: '/admin/settings', label: 'Settings', icon: 'settings' },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 min-h-screen bg-gray-50 dark:bg-gray-900 border-r">
      <div className="p-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Admin Panel
        </h2>
        <nav className="space-y-1">
          {adminLinks.map((link) => {
            const isActive =
              pathname === link.href ||
              (link.href !== '/admin' && pathname.startsWith(link.href));

            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                )}
              >
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
        >
          <span>Back to Dashboard</span>
        </Link>
      </div>
    </aside>
  );
}
