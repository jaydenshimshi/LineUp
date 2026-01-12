'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { BackButton } from '@/components/ui/back-button';

interface Announcement {
  id: string;
  title: string;
  message: string;
  scope_type: 'global' | 'date';
  scope_date: string | null;
  urgency: 'info' | 'important';
  visible_from: string;
  visible_until: string | null;
  created_at: string;
}

interface AnnouncementsClientProps {
  organizationId: string;
  orgSlug: string;
  announcements: Announcement[];
}

export function AnnouncementsClient({
  organizationId,
  orgSlug,
  announcements: initialAnnouncements,
}: AnnouncementsClientProps) {
  const router = useRouter();
  const [announcements, setAnnouncements] = useState(initialAnnouncements);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [scopeType, setScopeType] = useState<'global' | 'date'>('global');
  const [scopeDate, setScopeDate] = useState('');
  const [urgency, setUrgency] = useState<'info' | 'important'>('info');
  const [visibleFrom, setVisibleFrom] = useState('');
  const [visibleUntil, setVisibleUntil] = useState('');

  const resetForm = () => {
    setTitle('');
    setMessage('');
    setScopeType('global');
    setScopeDate('');
    setUrgency('info');
    setVisibleFrom('');
    setVisibleUntil('');
    setEditingId(null);
    setError(null);
  };

  const openEditDialog = (announcement: Announcement) => {
    setEditingId(announcement.id);
    setTitle(announcement.title);
    setMessage(announcement.message);
    setScopeType(announcement.scope_type);
    setScopeDate(announcement.scope_date || '');
    setUrgency(announcement.urgency);
    setVisibleFrom(announcement.visible_from ? announcement.visible_from.slice(0, 16) : '');
    setVisibleUntil(announcement.visible_until ? announcement.visible_until.slice(0, 16) : '');
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!title.trim() || !message.trim()) {
      setError('Title and message are required');
      return;
    }

    if (scopeType === 'date' && !scopeDate) {
      setError('Please select a date for date-specific announcements');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const payload = {
        organization_id: organizationId,
        title: title.trim(),
        message: message.trim(),
        scope_type: scopeType,
        scope_date: scopeType === 'date' ? scopeDate : null,
        urgency,
        visible_from: visibleFrom ? new Date(visibleFrom).toISOString() : null,
        visible_until: visibleUntil ? new Date(visibleUntil).toISOString() : null,
      };

      if (editingId) {
        // Update existing
        const response = await fetch(`/api/announcements/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to update announcement');
        }

        const { announcement } = await response.json();
        setAnnouncements(prev =>
          prev.map(a => (a.id === editingId ? announcement : a))
        );
      } else {
        // Create new
        const response = await fetch('/api/announcements', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to create announcement');
        }

        const { announcement } = await response.json();
        setAnnouncements(prev => [announcement, ...prev]);
      }

      setIsDialogOpen(false);
      resetForm();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this announcement?')) return;

    try {
      const response = await fetch(`/api/announcements/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete announcement');
      }

      setAnnouncements(prev => prev.filter(a => a.id !== id));
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  const isActive = (announcement: Announcement) => {
    const now = new Date();
    const from = new Date(announcement.visible_from);
    const until = announcement.visible_until ? new Date(announcement.visible_until) : null;
    return now >= from && (!until || now <= until);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 via-background to-background">
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <BackButton className="-ml-2 mb-1" />
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold">Announcements</h1>
              <p className="text-sm text-muted-foreground">
                Broadcast messages to your group
              </p>
            </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button size="lg">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Announcement
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>
                  {editingId ? 'Edit Announcement' : 'Create Announcement'}
                </DialogTitle>
                <DialogDescription>
                  {editingId
                    ? 'Update the announcement details'
                    : 'Create a new announcement for your group members'}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Game ON today!"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Add details about the announcement..."
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select value={scopeType} onValueChange={(v) => setScopeType(v as 'global' | 'date')}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="global">Global</SelectItem>
                        <SelectItem value="date">Specific Date</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Urgency</Label>
                    <Select value={urgency} onValueChange={(v) => setUrgency(v as 'info' | 'important')}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="info">Info</SelectItem>
                        <SelectItem value="important">Important</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {scopeType === 'date' && (
                  <div className="space-y-2">
                    <Label htmlFor="scopeDate">Date</Label>
                    <Input
                      id="scopeDate"
                      type="date"
                      value={scopeDate}
                      onChange={(e) => setScopeDate(e.target.value)}
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="visibleFrom">Visible From (optional)</Label>
                    <Input
                      id="visibleFrom"
                      type="datetime-local"
                      value={visibleFrom}
                      onChange={(e) => setVisibleFrom(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="visibleUntil">Visible Until (optional)</Label>
                    <Input
                      id="visibleUntil"
                      type="datetime-local"
                      value={visibleUntil}
                      onChange={(e) => setVisibleUntil(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={isSubmitting}>
                  {isSubmitting
                    ? 'Saving...'
                    : editingId
                    ? 'Update'
                    : 'Create Announcement'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        {/* Announcements List */}
        {announcements.length > 0 ? (
          <div className="space-y-4">
            {announcements.map((announcement) => (
              <Card
                key={announcement.id}
                className={`transition-all ${
                  !isActive(announcement) ? 'opacity-60' : ''
                } ${
                  announcement.urgency === 'important'
                    ? 'border-amber-500/50 bg-amber-500/5'
                    : ''
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {announcement.urgency === 'important' ? (
                        <span className="text-xl">!</span>
                      ) : (
                        <span className="text-xl">i</span>
                      )}
                      <CardTitle className="text-lg">{announcement.title}</CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={announcement.urgency === 'important' ? 'destructive' : 'secondary'}>
                        {announcement.urgency}
                      </Badge>
                      <Badge variant="outline">
                        {announcement.scope_type === 'global' ? 'Global' : format(new Date(announcement.scope_date!), 'MMM d')}
                      </Badge>
                      {!isActive(announcement) && (
                        <Badge variant="outline" className="text-muted-foreground">
                          Inactive
                        </Badge>
                      )}
                    </div>
                  </div>
                  <CardDescription className="text-xs">
                    Created {format(new Date(announcement.created_at), 'MMM d, yyyy h:mm a')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap mb-4">
                    {announcement.message}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(announcement)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() => handleDelete(announcement.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="text-center py-16 border-dashed">
            <CardContent>
              <div className="text-6xl mb-4">i</div>
              <h3 className="text-xl font-semibold mb-2">No announcements yet</h3>
              <p className="text-muted-foreground mb-6">
                Create your first announcement to communicate with your group
              </p>
              <Button onClick={() => setIsDialogOpen(true)}>
                Create Announcement
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <div className="mt-8 p-4 rounded-xl bg-muted/30 border">
          <h3 className="font-medium mb-3">Quick Templates</h3>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setTitle('Game ON Today!');
                setMessage('We have enough players. See you at the usual time and place!');
                setScopeType('date');
                setScopeDate(format(new Date(), 'yyyy-MM-dd'));
                setUrgency('important');
                setIsDialogOpen(true);
              }}
            >
              Game ON
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setTitle('No Game Today');
                setMessage('Unfortunately, we dont have enough players today. See you next time!');
                setScopeType('date');
                setScopeDate(format(new Date(), 'yyyy-MM-dd'));
                setUrgency('info');
                setIsDialogOpen(true);
              }}
            >
              No Game
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setTitle('Location Change');
                setMessage('Please note: We are playing at a different location today. Check the details below.');
                setScopeType('date');
                setScopeDate(format(new Date(), 'yyyy-MM-dd'));
                setUrgency('important');
                setIsDialogOpen(true);
              }}
            >
              Location Change
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
