'use client';

/**
 * Client component for announcements page with interactive forms
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AnnouncementForm } from '@/components/announcements/announcement-form';
import { SCOPE_LABELS, URGENCY_LABELS } from '@/lib/validations/announcement';
import type { Announcement } from '@/types';

interface AnnouncementsClientProps {
  announcements: Announcement[];
}

export function AnnouncementsClient({
  announcements,
}: AnnouncementsClientProps) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] =
    useState<Announcement | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete(id: string) {
    setIsDeleting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting announcement:', error);
        return;
      }

      router.refresh();
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setIsDeleting(false);
      setDeletingId(null);
    }
  }

  async function handleToggleActive(announcement: Announcement) {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('announcements')
        .update({ is_active: !announcement.is_active } as never)
        .eq('id', announcement.id);

      if (error) {
        console.error('Error toggling announcement:', error);
        return;
      }

      router.refresh();
    } catch (err) {
      console.error('Toggle error:', err);
    }
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">All Announcements</h2>
        <Button onClick={() => setShowForm(true)}>New Announcement</Button>
      </div>

      {announcements.length > 0 ? (
        <div className="space-y-4">
          {announcements.map((announcement) => (
            <Card
              key={announcement.id}
              className={!announcement.is_active ? 'opacity-60' : ''}
            >
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">
                      {announcement.title}
                    </CardTitle>
                    <CardDescription>
                      Created {formatDate(announcement.created_at)}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Badge
                      variant={
                        announcement.urgency === 'important'
                          ? 'destructive'
                          : 'secondary'
                      }
                    >
                      {URGENCY_LABELS[announcement.urgency]}
                    </Badge>
                    <Badge variant="outline">
                      {SCOPE_LABELS[announcement.scope_type]}
                    </Badge>
                    {!announcement.is_active && (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 dark:text-gray-300 mb-4">
                  {announcement.body}
                </p>
                {announcement.scope_date && (
                  <p className="text-sm text-gray-500 mb-4">
                    For: {formatDate(announcement.scope_date)}
                  </p>
                )}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingAnnouncement(announcement)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleActive(announcement)}
                  >
                    {announcement.is_active ? 'Deactivate' : 'Activate'}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setDeletingId(announcement.id)}
                  >
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-gray-500">
            No announcements yet. Create your first announcement to get started.
          </CardContent>
        </Card>
      )}

      {/* Create Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <AnnouncementForm
            onSuccess={() => {
              setShowForm(false);
              router.refresh();
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Form Dialog */}
      <Dialog
        open={!!editingAnnouncement}
        onOpenChange={() => setEditingAnnouncement(null)}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <AnnouncementForm
            initialData={editingAnnouncement}
            onSuccess={() => {
              setEditingAnnouncement(null);
              router.refresh();
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Announcement</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this announcement? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeletingId(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deletingId && handleDelete(deletingId)}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
