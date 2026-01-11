'use client';

/**
 * Organization Navigation Component
 * Compact, sleek navigation for org pages
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ThemeToggle } from '@/components/theme-toggle';
import { LineUpLogo } from '@/components/ui/lineup-logo';

interface OrgNavProps {
  org: {
    id: string;
    name: string;
    slug: string;
    sport: string;
    logo_url: string | null;
  };
  role: 'member' | 'admin' | 'owner';
  isAdmin: boolean;
}

export function OrgNav({ org, role, isAdmin }: OrgNavProps) {
  const pathname = usePathname();
  const baseUrl = `/org/${org.slug}`;

  const navItems = [
    { href: baseUrl, label: 'Today', exact: true },
    { href: `${baseUrl}/checkin`, label: 'Check-in' },
    { href: `${baseUrl}/teams`, label: 'Teams' },
    { href: `${baseUrl}/attendance`, label: 'History' },
  ];

  const adminItems = [
    { href: `${baseUrl}/admin`, label: 'Dashboard' },
    { href: `${baseUrl}/admin/players`, label: 'Players' },
    { href: `${baseUrl}/admin/teams`, label: 'Generate Teams' },
    { href: `${baseUrl}/admin/stats`, label: 'Stats' },
    { href: `${baseUrl}/admin/announcements`, label: 'Announce' },
    { href: `${baseUrl}/admin/members`, label: 'Members' },
    { href: `${baseUrl}/admin/settings`, label: 'Settings' },
  ];

  const isActive = (href: string, exact = false) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-3">
        <div className="flex h-12 items-center justify-between">
          {/* Logo and Org Name */}
          <div className="flex items-center gap-2">
            {/* Home - LineUp Logo */}
            <Link
              href="/organizations"
              className="flex items-center hover:opacity-80 transition-opacity"
              title="All Groups"
            >
              <LineUpLogo size="sm" showText={false} />
            </Link>

            <div className="w-px h-6 bg-border mx-1" />

            {/* Current Org */}
            <Link href={baseUrl} className="flex items-center gap-1.5 group">
              <span className="font-semibold text-sm group-hover:text-primary transition-colors truncate max-w-[120px] sm:max-w-none">
                {org.name}
              </span>
              {(role === 'admin' || role === 'owner') && (
                <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4 hidden sm:flex">
                  {role}
                </Badge>
              )}
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-0.5">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    'h-8 px-2.5 text-xs font-medium',
                    isActive(item.href, item.exact)
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {item.label}
                </Button>
              </Link>
            ))}

            {isAdmin && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      'h-8 px-2.5 text-xs font-medium gap-0.5',
                      isActive(`${baseUrl}/admin`)
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    Admin
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  {adminItems.map((item, index) => (
                    <div key={item.href}>
                      {index === 5 && <DropdownMenuSeparator />}
                      <DropdownMenuItem asChild className="text-xs">
                        <Link
                          href={item.href}
                          className={cn(
                            isActive(item.href) && 'bg-primary/10 text-primary'
                          )}
                        >
                          {item.label}
                        </Link>
                      </DropdownMenuItem>
                    </div>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            <div className="w-px h-5 bg-border mx-1" />
            <ThemeToggle />
          </nav>

          {/* Mobile Menu */}
          <div className="md:hidden flex items-center gap-0.5">
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-36">
                {navItems.map((item) => (
                  <DropdownMenuItem key={item.href} asChild className="text-xs">
                    <Link href={item.href}>{item.label}</Link>
                  </DropdownMenuItem>
                ))}
                {isAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <div className="px-2 py-1 text-[10px] font-medium text-muted-foreground uppercase">
                      Admin
                    </div>
                    {adminItems.map((item) => (
                      <DropdownMenuItem key={item.href} asChild className="text-xs">
                        <Link href={item.href}>{item.label}</Link>
                      </DropdownMenuItem>
                    ))}
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}
