'use client';

/**
 * Join Client Component
 * Shows join info and redirects to signup/login
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface JoinClientProps {
  joinCode: string;
}

export function JoinClient({ joinCode }: JoinClientProps) {
  const router = useRouter();

  // Store join code in localStorage for after signup
  useEffect(() => {
    localStorage.setItem('pendingJoinCode', joinCode.toUpperCase());
  }, [joinCode]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-primary/5 via-background to-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-3xl mb-4">
            ⚽
          </div>
          <CardTitle className="text-2xl">Join a Group</CardTitle>
          <CardDescription>
            You&apos;ve been invited to join a sports group!
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Invite Code</p>
            <p className="text-2xl font-mono font-bold tracking-widest">
              {joinCode.toUpperCase()}
            </p>
          </div>

          <p className="text-sm text-center text-muted-foreground">
            Create an account or sign in to join this group
          </p>

          <div className="space-y-3">
            <Link href="/register" className="block">
              <Button className="w-full" size="lg">
                Create Account
              </Button>
            </Link>
            <Link href="/login" className="block">
              <Button variant="outline" className="w-full" size="lg">
                Sign In
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
