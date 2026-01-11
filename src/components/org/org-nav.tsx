'use client';

/**
 * Organization Navigation Component
 * Modern navigation for org pages
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

const sportIcons: Record<string, string> = {
  soccer: '\u26BD',
  basketball: '\uD83C\uDFC0',
  volleyball: '\uD83C\uDFD0',
  tennis: '\uD83C\uDFBE',
  default: '\uD83C\uDFC6',
};

export function OrgNav({ org, role, isAdmin }: OrgNavProps) {
  const pathname = usePathname();
  const baseUrl = `/org/${org.slug}`;

  const navItems = [
    { href: baseUrl, label: 'Today', exact: true },
    { href: `${baseUrl}/checkin`, label: 'Check-in' },
    { href: `${baseUrl}/teams`, label: 'Teams' },
  ];

  const adminItems = [
    { href: `${baseUrl}/admin`, label: 'Dashboard' },
    { href: `${baseUrl}/admin/players`, label: 'Players' },
    { href: `${baseUrl}/admin/teams`, label: 'Generate Teams' },
    { href: `${baseUrl}/admin/announcements`, label: 'Announcements' },
    { href: `${baseUrl}/admin/members`, label: 'Members' },
    { href: `${baseUrl}/admin/settings`, label: 'Settings' },
  ];

  const isActive = (href: string, exact = false) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo and Org Name */}
          <div className="flex items-center gap-4">
            <Link
              href="/organizations"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </Link>
            <Link href={baseUrl} className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-lg">
                {sportIcons[org.sport] || sportIcons.default}
              </div>
              <div>
                <h1 className="font-semibold text-sm leading-none">{org.name}</h1>
                <Badge
                  variant="secondary"
                  className="mt-1 text-[10px] px-1.5 py-0 h-4"
                >
                  {role}
                </Badge>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={isActive(item.href, item.exact) ? 'secondary' : 'ghost'}
                  size="sm"
                  className={cn(
                    'h-9',
                    isActive(item.href, item.exact) && 'bg-primary/10 text-primary'
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
                    variant={isActive(`${baseUrl}/admin`) ? 'secondary' : 'ghost'}
                    size="sm"
                    className={cn(
                      'h-9 gap-1',
                      isActive(`${baseUrl}/admin`) && 'bg-primary/10 text-primary'
                    )}
                  >
                    Admin
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {adminItems.map((item, index) => (
                    <div key={item.href}>
                      {index === 4 && <DropdownMenuSeparator />}
                      <DropdownMenuItem asChild>
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
          </nav>

          {/* Mobile Menu */}
          <div className="md:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="4" x2="20" y1="12" y2="12" />
                    <line x1="4" x2="20" y1="6" y2="6" />
                    <line x1="4" x2="20" y1="18" y2="18" />
                  </svg>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {navItems.map((item) => (
                  <DropdownMenuItem key={item.href} asChild>
                    <Link href={item.href}>{item.label}</Link>
                  </DropdownMenuItem>
                ))}
                {isAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                      Admin
                    </div>
                    {adminItems.map((item) => (
                      <DropdownMenuItem key={item.href} asChild>
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
