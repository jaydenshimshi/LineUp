/**
 * Auth layout - centered card layout for login/register pages
 */

import type { ReactNode } from 'react';
import Link from 'next/link';
import { LineUpLogo } from '@/components/ui/lineup-logo';

interface AuthLayoutProps {
  children: ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-background p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <Link href="/">
            <LineUpLogo size="lg" />
          </Link>
          <p className="text-xs text-muted-foreground mt-2">
            Team coordination made simple
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
