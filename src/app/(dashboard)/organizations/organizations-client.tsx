'use client';

/**
 * Organizations Dashboard Client Component
 * Beautiful, modern design for managing groups
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';

interface MembershipWithOrg {
  id: string;
  role: 'member' | 'admin' | 'owner';
  joined_at: string;
  organizations: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    sport: string;
    logo_url: string | null;
    created_at: string;
  };
}

interface OrganizationsClientProps {
  memberships: MembershipWithOrg[];
}

const sportIcons: Record<string, string> = {
  soccer: '⚽',
  basketball: '🏀',
  volleyball: '🏐',
  tennis: '🎾',
  default: '🏆',
};

const roleColors: Record<string, string> = {
  owner: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  admin: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  member: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
};

export function OrganizationsClient({ memberships }: OrganizationsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [leaveOrgId, setLeaveOrgId] = useState<string | null>(null);
  const [leaveOrgName, setLeaveOrgName] = useState<string>('');
  const [leaveOrgRole, setLeaveOrgRole] = useState<string>('');
  const [isLeaving, setIsLeaving] = useState(false);

  // Handle QR code scan - auto-join with code from URL or localStorage
  useEffect(() => {
    const codeFromUrl = searchParams.get('join');
    const storedCode = localStorage.getItem('pendingJoinCode');
    const joinCodeToUse = codeFromUrl || storedCode;

    if (joinCodeToUse) {
      // Clean up URL and localStorage immediately
      if (codeFromUrl) {
        window.history.replaceState({}, '', '/organizations');
      }
      localStorage.removeItem('pendingJoinCode');

      // Auto-join the group
      autoJoinGroup(joinCodeToUse.toUpperCase());
    }
  }, [searchParams]);

  // Auto-join function that runs automatically
  const autoJoinGroup = async (code: string) => {
    setIsJoining(true);
    setJoinError(null);

    try {
      const response = await fetch('/api/organizations/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });

      const data = await response.json();

      if (!response.ok) {
        // If already a member, just redirect to the org
        if (data.error?.includes('already a member')) {
          // Find the org they're already a member of and redirect
          const existingOrg = memberships.find(m =>
            m.organizations && data.error?.includes(m.organizations.name)
          );
          if (existingOrg) {
            router.push(`/org/${existingOrg.organizations.slug}`);
          } else {
            setJoinError(data.error);
            setJoinCode(code);
            setJoinDialogOpen(true);
          }
          return;
        }
        setJoinError(data.error || 'Failed to join group');
        setJoinCode(code);
        setJoinDialogOpen(true);
        return;
      }

      // Success - redirect to the organization
      router.push(`/org/${data.organization.slug}`);
      router.refresh();
    } catch {
      setJoinError('Something went wrong. Please try again.');
      setJoinCode(code);
      setJoinDialogOpen(true);
    } finally {
      setIsJoining(false);
    }
  };

  const handleJoinGroup = async () => {
    if (!joinCode.trim()) {
      setJoinError('Please enter a join code');
      return;
    }

    setIsJoining(true);
    setJoinError(null);

    try {
      const response = await fetch('/api/organizations/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: joinCode.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        setJoinError(data.error || 'Failed to join group');
        return;
      }

      setJoinDialogOpen(false);
      router.push(`/org/${data.organization.slug}`);
      router.refresh();
    } catch {
      setJoinError('Something went wrong. Please try again.');
    } finally {
      setIsJoining(false);
    }
  };

  const handleLeaveGroup = async () => {
    if (!leaveOrgId) return;

    setIsLeaving(true);
    try {
      const response = await fetch(`/api/organizations/${leaveOrgId}/leave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        toast.success(`Left ${leaveOrgName}`);
        setLeaveOrgId(null);
        router.refresh();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to leave group');
      }
    } catch {
      toast.error('Something went wrong');
    } finally {
      setIsLeaving(false);
    }
  };

  const openLeaveDialog = (orgId: string, orgName: string, role: string) => {
    setLeaveOrgId(orgId);
    setLeaveOrgName(orgName);
    setLeaveOrgRole(role);
  };

  // Show loading screen while auto-joining
  if (isJoining && !joinDialogOpen) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-primary/5 via-background to-background">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
            <span className="text-3xl">⚽</span>
          </div>
          <h2 className="text-xl font-semibold mb-2">Joining group...</h2>
          <p className="text-muted-foreground">Please wait a moment</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 via-background to-background">
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative container mx-auto py-8 sm:py-12 px-4 max-w-5xl">
        {/* Header */}
        <div className="text-center mb-10 sm:mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <span className="text-lg">👋</span>
            Welcome back
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-4">
            Your <span className="text-primary">Groups</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-md mx-auto">
            Manage your sports teams, check in for games, and get balanced matchups
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10 sm:mb-12">
          <Link href="/organizations/create">
            <Button size="lg" className="w-full sm:w-auto px-8 h-12 text-base font-medium shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create a Group
            </Button>
          </Link>

          <Dialog open={joinDialogOpen} onOpenChange={setJoinDialogOpen}>
            <DialogTrigger asChild>
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto px-8 h-12 text-base font-medium hover:bg-primary/5"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                Join with Code
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-center">Join a Group</DialogTitle>
                <DialogDescription className="text-center">
                  Enter the invite code shared by your group admin
                </DialogDescription>
              </DialogHeader>
              <div className="py-6">
                {joinError && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertDescription>{joinError}</AlertDescription>
                  </Alert>
                )}
                <Label htmlFor="joinCode" className="sr-only">Invite Code</Label>
                <Input
                  id="joinCode"
                  placeholder="Enter code..."
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  className="text-center text-2xl tracking-[0.5em] font-mono h-14 border-2 focus:border-primary"
                  maxLength={10}
                />
              </div>
              <DialogFooter className="sm:justify-center">
                <Button
                  onClick={handleJoinGroup}
                  disabled={isJoining || !joinCode.trim()}
                  size="lg"
                  className="w-full sm:w-auto px-8"
                >
                  {isJoining ? 'Joining...' : 'Join Group'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Groups List */}
        {memberships.length > 0 ? (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-muted-foreground">
                {memberships.length} {memberships.length === 1 ? 'Group' : 'Groups'}
              </h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {memberships
                .filter(({ organizations: org }) => org !== null)
                .map(({ organizations: org, role, joined_at }) => (
                <div key={org!.id} className="relative group/card">
                  <Link href={`/org/${org!.slug}`}>
                    <Card className="h-full hover:shadow-xl hover:shadow-primary/10 hover:border-primary/50 hover:-translate-y-1 transition-all duration-300 cursor-pointer group overflow-hidden">
                      {/* Colored top border */}
                      <div className="h-1 bg-gradient-to-r from-primary to-primary/50" />
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform shadow-sm">
                              {sportIcons[org!.sport] || sportIcons.default}
                            </div>
                            <div>
                              <CardTitle className="text-lg group-hover:text-primary transition-colors">
                                {org!.name}
                              </CardTitle>
                              <CardDescription className="text-sm font-mono">
                                /{org!.slug}
                              </CardDescription>
                            </div>
                          </div>
                          <Badge className={roleColors[role]} variant="secondary">
                            {role}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {org!.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                            {org!.description}
                          </p>
                        )}
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Joined {format(new Date(joined_at), 'MMM d, yyyy')}</span>
                          <span className="text-primary opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                            Open
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                  {/* Leave Group Button - Always visible on mobile, hover on desktop */}
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      openLeaveDialog(org!.id, org!.name, role);
                    }}
                    className="absolute top-3 right-3 p-2 rounded-full bg-background/90 backdrop-blur-sm border shadow-sm sm:opacity-0 sm:group-hover/card:opacity-100 transition-all hover:bg-destructive/10 hover:border-destructive/30 hover:text-destructive active:scale-95 z-10 touch-manipulation"
                    title="Leave group"
                    aria-label="Leave group"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Empty State */
          <Card className="text-center py-16 border-dashed border-2 bg-gradient-to-b from-muted/30 to-transparent">
            <CardContent>
              {/* Illustration */}
              <div className="relative w-32 h-32 mx-auto mb-6">
                <div className="absolute inset-0 bg-primary/10 rounded-full animate-pulse" />
                <div className="absolute inset-2 bg-primary/5 rounded-full" />
                <div className="absolute inset-0 flex items-center justify-center text-6xl">
                  ⚽
                </div>
                {/* Floating elements */}
                <div className="absolute -top-2 -right-2 text-2xl animate-bounce" style={{ animationDelay: '0.2s' }}>🏀</div>
                <div className="absolute -bottom-2 -left-2 text-2xl animate-bounce" style={{ animationDelay: '0.4s' }}>🎾</div>
              </div>

              <h3 className="text-2xl font-bold mb-2">No groups yet</h3>
              <p className="text-muted-foreground mb-8 max-w-sm mx-auto">
                Create your first group to start organizing games, or join an existing one with an invite code.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/organizations/create">
                  <Button size="lg" className="w-full sm:w-auto">
                    Create Your First Group
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setJoinDialogOpen(true)}
                  className="w-full sm:w-auto"
                >
                  Join with Code
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tips Section */}
        {memberships.length > 0 && (
          <div className="mt-12 grid sm:grid-cols-3 gap-4">
            {[
              { icon: '📅', title: 'Check In', description: 'Mark your availability for upcoming games' },
              { icon: '⚖️', title: 'Fair Teams', description: 'Get balanced matchups every time' },
              { icon: '📢', title: 'Stay Updated', description: 'Get announcements from your admins' },
            ].map((tip) => (
              <div key={tip.title} className="flex items-start gap-3 p-4 rounded-xl bg-muted/30">
                <span className="text-2xl">{tip.icon}</span>
                <div>
                  <p className="font-medium">{tip.title}</p>
                  <p className="text-sm text-muted-foreground">{tip.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Leave Group Confirmation Dialog */}
      <AlertDialog open={!!leaveOrgId} onOpenChange={() => setLeaveOrgId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave {leaveOrgName}?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Are you sure you want to leave this group? You will lose access to:
              </p>
              <ul className="list-disc list-inside text-sm space-y-1">
                <li>Team assignments and schedules</li>
                <li>Group announcements</li>
                <li>Your check-in history</li>
              </ul>
              {leaveOrgRole === 'owner' && (
                <p className="text-destructive font-medium mt-3">
                  Warning: You are the owner of this group. If you leave, the group may become inaccessible.
                </p>
              )}
              <p className="text-sm text-muted-foreground mt-2">
                You can rejoin later with a new invite code.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLeaveGroup}
              disabled={isLeaving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isLeaving ? 'Leaving...' : 'Leave Group'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
