'use client';

/**
 * Settings Client Component
 * Handles user account settings and profile deletion
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { createClient } from '@/lib/supabase/client';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

interface Membership {
  id: string;
  role: string;
  organizations: { id: string; name: string; slug: string } | null;
}

interface SettingsClientProps {
  userId: string;
  email: string;
  createdAt: string;
  memberships: Membership[];
}

export function SettingsClient({
  userId,
  email,
  createdAt,
  memberships,
}: SettingsClientProps) {
  const router = useRouter();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const groupCount = memberships.filter((m) => m.organizations).length;

  const handleDeleteAccount = async () => {
    if (confirmText !== 'DELETE') {
      toast.error('Please type DELETE to confirm');
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch('/api/account/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        // Sign out and redirect
        const supabase = createClient();
        await supabase.auth.signOut();
        toast.success('Your account has been deleted');
        router.push('/');
        router.refresh();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to delete account');
      }
    } catch {
      toast.error('Something went wrong');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/30 to-background">
      <div className="container mx-auto py-8 px-4 max-w-2xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your account</p>
        </div>

        {/* Account Info */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <span>👤</span> Account Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-muted-foreground text-sm">Email</Label>
              <p className="font-medium">{email}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-sm">Member since</Label>
              <p className="font-medium">
                {createdAt ? format(new Date(createdAt), 'MMMM d, yyyy') : 'Unknown'}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground text-sm">Groups joined</Label>
              <p className="font-medium">{groupCount}</p>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-destructive">
              <span>⚠️</span> Danger Zone
            </CardTitle>
            <CardDescription>
              Irreversible actions that affect your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-destructive/5 rounded-lg border border-destructive/20">
              <h3 className="font-semibold text-destructive mb-2">
                Delete Account
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Permanently delete your account and all associated data. This action cannot be undone.
                {groupCount > 0 && (
                  <span className="block mt-2 text-destructive">
                    Warning: You will be removed from {groupCount} group{groupCount !== 1 ? 's' : ''}.
                  </span>
                )}
              </p>
              <Button
                variant="destructive"
                onClick={() => setShowDeleteDialog(true)}
              >
                Delete My Account
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">
              Delete your account?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                This action is <span className="font-bold">permanent and cannot be undone</span>.
              </p>
              <p>
                The following will be deleted:
              </p>
              <ul className="list-disc list-inside text-sm space-y-1">
                <li>Your user account and login credentials</li>
                <li>Your player profiles in all groups</li>
                <li>Your check-in history</li>
                <li>You will be removed from {groupCount} group{groupCount !== 1 ? 's' : ''}</li>
              </ul>
              {memberships.filter((m) => m.role === 'owner' && m.organizations).length > 0 && (
                <p className="text-destructive font-medium">
                  Warning: You own {memberships.filter((m) => m.role === 'owner').length} group(s).
                  These groups will need a new owner or will become inaccessible.
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="confirmDelete" className="text-sm">
              Type <span className="font-mono font-bold">DELETE</span> to confirm
            </Label>
            <Input
              id="confirmDelete"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
              placeholder="DELETE"
              className="mt-2 font-mono"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmText('')}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={confirmText !== 'DELETE' || isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete Account Forever'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
