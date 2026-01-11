'use client';

/**
 * Members Client Component
 * Beautiful UI for managing organization members
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface Member {
  id: string;
  role: 'member' | 'admin' | 'owner';
  joined_at: string;
  user_id: string;
  users: {
    id: string;
    email: string;
  };
  players: {
    id: string;
    full_name: string;
    profile_completed: boolean;
  } | null;
}

interface MembersClientProps {
  orgId: string;
  orgSlug: string;
  orgName: string;
  joinCode: string | null;
  members: Member[];
  currentUserId: string;
  currentRole: 'admin' | 'owner';
}

const roleColors = {
  owner: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  admin: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  member: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
};

export function MembersClient({
  orgId,
  orgSlug,
  orgName,
  joinCode: initialJoinCode,
  members,
  currentUserId,
  currentRole,
}: MembersClientProps) {
  const router = useRouter();
  const [joinCode, setJoinCode] = useState(initialJoinCode);
  const [showJoinCode, setShowJoinCode] = useState(false);
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<Member | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  const isOwner = currentRole === 'owner';

  // Generate the join URL for QR code
  const joinUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/organizations?join=${joinCode}`
    : '';

  const handleGenerateCode = async () => {
    setIsGeneratingCode(true);
    try {
      const response = await fetch(`/api/organizations/${orgId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ generate_join_code: true }),
      });

      if (response.ok) {
        const data = await response.json();
        setJoinCode(data.organization.join_code);
        toast.success('New join code generated!');
      } else {
        toast.error('Failed to generate code');
      }
    } catch {
      toast.error('Something went wrong');
    } finally {
      setIsGeneratingCode(false);
    }
  };

  const handleCopyCode = () => {
    if (joinCode) {
      navigator.clipboard.writeText(joinCode);
      toast.success('Join code copied!');
    }
  };

  const handleChangeRole = async (memberId: string, newRole: 'member' | 'admin' | 'owner') => {
    try {
      const response = await fetch(`/api/organizations/${orgId}/members`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ membership_id: memberId, role: newRole }),
      });

      if (response.ok) {
        toast.success(`Role updated to ${newRole}`);
        router.refresh();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to update role');
      }
    } catch {
      toast.error('Something went wrong');
    }
  };

  const handleRemoveMember = async () => {
    if (!memberToRemove) return;

    setIsRemoving(true);
    try {
      const response = await fetch(`/api/organizations/${orgId}/members`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ membership_id: memberToRemove.id }),
      });

      if (response.ok) {
        toast.success('Member removed');
        router.refresh();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to remove member');
      }
    } catch {
      toast.error('Something went wrong');
    } finally {
      setIsRemoving(false);
      setMemberToRemove(null);
    }
  };

  const owners = members.filter((m) => m.role === 'owner');
  const admins = members.filter((m) => m.role === 'admin');
  const regularMembers = members.filter((m) => m.role === 'member');

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/30 to-background">
      <div className="container mx-auto py-6 px-4 max-w-3xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Members</h1>
          <p className="text-muted-foreground mt-1">
            {members.length} members in {orgName}
          </p>
        </div>

        {/* Invite Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <span className="text-xl">✉️</span>
              Invite Players
            </CardTitle>
            <CardDescription>
              Share the join code with new players
            </CardDescription>
          </CardHeader>
          <CardContent>
            {joinCode ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex-1 relative">
                    <Input
                      value={showJoinCode ? joinCode : '••••••••'}
                      readOnly
                      className="font-mono text-lg tracking-widest text-center pr-20"
                    />
                    <button
                      onClick={() => setShowJoinCode(!showJoinCode)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showJoinCode ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  <Button onClick={handleCopyCode} variant="outline">
                    Copy
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowQRDialog(true)}
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                    </svg>
                    Show QR Code
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateCode}
                    disabled={isGeneratingCode}
                  >
                    {isGeneratingCode ? 'Generating...' : 'New Code'}
                  </Button>
                </div>
              </div>
            ) : (
              <Button onClick={handleGenerateCode} disabled={isGeneratingCode}>
                {isGeneratingCode ? 'Generating...' : 'Generate Join Code'}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Members List */}
        <div className="space-y-6">
          {/* Owners */}
          {owners.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                <span>👑</span> Owners ({owners.length})
              </h2>
              <div className="space-y-2">
                {owners.map((member) => (
                  <MemberCard
                    key={member.id}
                    member={member}
                    isCurrentUser={member.user_id === currentUserId}
                    canManage={false}
                    onChangeRole={() => {}}
                    onRemove={() => {}}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Admins */}
          {admins.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                <span>🔑</span> Admins ({admins.length})
              </h2>
              <div className="space-y-2">
                {admins.map((member) => (
                  <MemberCard
                    key={member.id}
                    member={member}
                    isCurrentUser={member.user_id === currentUserId}
                    canManage={isOwner && member.user_id !== currentUserId}
                    onChangeRole={(role) => handleChangeRole(member.id, role)}
                    onRemove={() => setMemberToRemove(member)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Members */}
          {regularMembers.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                <span>👤</span> Members ({regularMembers.length})
              </h2>
              <div className="space-y-2">
                {regularMembers.map((member) => (
                  <MemberCard
                    key={member.id}
                    member={member}
                    isCurrentUser={member.user_id === currentUserId}
                    canManage={member.user_id !== currentUserId}
                    onChangeRole={(role) => handleChangeRole(member.id, role)}
                    onRemove={() => setMemberToRemove(member)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* QR Code Dialog */}
      <Dialog open={showQRDialog} onOpenChange={setShowQRDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">Scan to Join</DialogTitle>
            <DialogDescription className="text-center">
              Players can scan this QR code to join {orgName}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center py-6">
            <div className="bg-white p-4 rounded-xl shadow-lg">
              <QRCodeSVG
                value={joinUrl}
                size={200}
                level="H"
                includeMargin={false}
              />
            </div>
            <p className="mt-4 text-center text-sm text-muted-foreground">
              Or share this code:
            </p>
            <p className="font-mono text-2xl tracking-widest font-bold mt-2">
              {joinCode}
            </p>
          </div>
          <div className="flex justify-center gap-2">
            <Button variant="outline" onClick={handleCopyCode}>
              Copy Code
            </Button>
            <Button
              onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    title: `Join ${orgName}`,
                    text: `Join my sports group on Lineup! Use code: ${joinCode}`,
                    url: joinUrl,
                  });
                } else {
                  navigator.clipboard.writeText(joinUrl);
                  toast.success('Link copied!');
                }
              }}
            >
              Share
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Remove Confirmation Dialog */}
      <AlertDialog open={!!memberToRemove} onOpenChange={() => setMemberToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove member?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove{' '}
              <span className="font-medium">
                {memberToRemove?.players?.full_name || memberToRemove?.users.email}
              </span>{' '}
              from {orgName}? They will need to rejoin with a new invite code.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveMember}
              disabled={isRemoving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isRemoving ? 'Removing...' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function MemberCard({
  member,
  isCurrentUser,
  canManage,
  onChangeRole,
  onRemove,
}: {
  member: Member;
  isCurrentUser: boolean;
  canManage: boolean;
  onChangeRole: (role: 'member' | 'admin' | 'owner') => void;
  onRemove: () => void;
}) {
  const displayName = member.players?.full_name || member.users.email.split('@')[0];
  const hasProfile = member.players?.profile_completed;

  return (
    <Card>
      <CardContent className="py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
            {displayName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-medium">{displayName}</p>
              {isCurrentUser && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  You
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{member.users.email}</span>
              {!hasProfile && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  No profile
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge className={roleColors[member.role]} variant="secondary">
            {member.role}
          </Badge>

          {canManage && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                  </svg>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {member.role !== 'admin' && (
                  <DropdownMenuItem onClick={() => onChangeRole('admin')}>
                    Make Admin
                  </DropdownMenuItem>
                )}
                {member.role !== 'member' && (
                  <DropdownMenuItem onClick={() => onChangeRole('member')}>
                    Make Member
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={onRemove}
                  className="text-destructive focus:text-destructive"
                >
                  Remove
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
