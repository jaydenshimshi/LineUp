'use client';

/**
 * Admin Users Management Client Component
 */

import { useState } from 'react';
import { format } from 'date-fns';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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

interface UserWithPlayer {
  id: string;
  email: string;
  role: 'player' | 'admin';
  created_at: string;
  players: Array<{
    id: string;
    full_name: string;
    profile_completed: boolean;
  }> | null;
}

interface UsersClientProps {
  initialUsers: UserWithPlayer[];
}

export function UsersClient({ initialUsers }: UsersClientProps) {
  const [users, setUsers] = useState<UserWithPlayer[]>(initialUsers);
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    user: UserWithPlayer | null;
    newRole: 'player' | 'admin';
  }>({ open: false, user: null, newRole: 'player' });

  const handleRoleChange = async () => {
    if (!confirmDialog.user) return;

    setIsLoading(confirmDialog.user.id);
    try {
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: confirmDialog.user.id,
          role: confirmDialog.newRole,
        }),
      });

      if (response.ok) {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === confirmDialog.user!.id
              ? { ...u, role: confirmDialog.newRole }
              : u
          )
        );
      }
    } catch (error) {
      console.error('Error updating role:', error);
    } finally {
      setIsLoading(null);
      setConfirmDialog({ open: false, user: null, newRole: 'player' });
    }
  };

  const adminCount = users.filter((u) => u.role === 'admin').length;

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">User Management</h1>
        <p className="text-gray-600 mt-1">
          Manage user roles and permissions
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Users</CardDescription>
            <CardTitle className="text-3xl">{users.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Admins</CardDescription>
            <CardTitle className="text-3xl">{adminCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Players</CardDescription>
            <CardTitle className="text-3xl">{users.length - adminCount}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>
            Click on a user&apos;s role to change it. Admins have full access to manage teams, ratings, and announcements.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Profile</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => {
                const playerProfile = user.players?.[0];
                const displayName = playerProfile?.full_name || 'No profile';

                return (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{displayName}</TableCell>
                    <TableCell className="text-gray-600">{user.email}</TableCell>
                    <TableCell>
                      <Badge
                        variant={user.role === 'admin' ? 'default' : 'secondary'}
                      >
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {playerProfile?.profile_completed ? (
                        <span className="text-green-600">Complete</span>
                      ) : (
                        <span className="text-yellow-600">Incomplete</span>
                      )}
                    </TableCell>
                    <TableCell className="text-gray-500">
                      {format(new Date(user.created_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="text-right">
                      {user.role === 'admin' ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setConfirmDialog({
                              open: true,
                              user,
                              newRole: 'player',
                            })
                          }
                          disabled={isLoading === user.id || adminCount <= 1}
                          title={
                            adminCount <= 1
                              ? 'Cannot demote the last admin'
                              : 'Demote to player'
                          }
                        >
                          {isLoading === user.id ? 'Updating...' : 'Demote'}
                        </Button>
                      ) : (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() =>
                            setConfirmDialog({
                              open: true,
                              user,
                              newRole: 'admin',
                            })
                          }
                          disabled={isLoading === user.id}
                        >
                          {isLoading === user.id ? 'Updating...' : 'Make Admin'}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog
        open={confirmDialog.open}
        onOpenChange={(open) =>
          setConfirmDialog((prev) => ({ ...prev, open }))
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDialog.newRole === 'admin'
                ? 'Promote to Admin?'
                : 'Demote to Player?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog.newRole === 'admin' ? (
                <>
                  <strong>{confirmDialog.user?.email}</strong> will have full
                  admin access including:
                  <ul className="list-disc ml-6 mt-2">
                    <li>Manage player ratings (hidden from players)</li>
                    <li>Generate and publish teams</li>
                    <li>Create announcements</li>
                    <li>Promote/demote other users</li>
                  </ul>
                </>
              ) : (
                <>
                  <strong>{confirmDialog.user?.email}</strong> will lose admin
                  access and become a regular player.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRoleChange}>
              {confirmDialog.newRole === 'admin' ? 'Promote' : 'Demote'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
