/**
 * Auth layout - centered card layout for login/register pages
 */

import type { ReactNode } from 'react';

interface AuthLayoutProps {
  children: ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-green-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-green-700 dark:text-green-400">
            Lineup
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Team coordination made simple
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
