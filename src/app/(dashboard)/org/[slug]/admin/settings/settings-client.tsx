'use client';

/**
 * Settings Client Component
 * Beautiful UI for organization settings
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { BackButton } from '@/components/ui/back-button';

const settingsSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().max(500, 'Description too long').optional(),
  sport: z.string(),
});

type SettingsFormData = z.infer<typeof settingsSchema>;

interface SettingsClientProps {
  org: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    sport: string;
    logo_url: string | null;
    join_code: string | null;
    is_public: boolean;
    settings: Record<string, unknown>;
    created_at: string;
  };
  isOwner: boolean;
}

const sportOptions = [
  { value: 'soccer', label: 'Soccer', emoji: '⚽' },
  { value: 'basketball', label: 'Basketball', emoji: '🏀' },
  { value: 'volleyball', label: 'Volleyball', emoji: '🏐' },
  { value: 'tennis', label: 'Tennis', emoji: '🎾' },
  { value: 'other', label: 'Other', emoji: '🏆' },
];

export function SettingsClient({ org, isOwner }: SettingsClientProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      name: org.name,
      description: org.description || '',
      sport: org.sport,
    },
  });

  const currentSport = watch('sport');

  const onSubmit = async (data: SettingsFormData) => {
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/organizations/${org.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to save settings');
      }

      toast.success('Settings saved!');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/organizations/${org.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to delete organization');
      }

      toast.success('Organization deleted');
      router.push('/organizations');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setIsDeleting(false);
    }
  };

  const sportEmoji = sportOptions.find((s) => s.value === currentSport)?.emoji || '🏆';

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/30 to-background">
      <div className="container mx-auto py-6 px-4 max-w-2xl">
        {/* Header */}
        <div className="mb-6">
          <BackButton className="-ml-2 mb-1" />
          <h1 className="text-xl font-bold">Settings</h1>
          <p className="text-sm text-muted-foreground">Manage your organization</p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)}>
          {/* General Settings */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <span className="text-xl">⚙️</span>
                General
              </CardTitle>
              <CardDescription>
                Basic organization information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Organization Preview */}
              <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center text-3xl">
                  {sportEmoji}
                </div>
                <div>
                  <p className="font-semibold">{watch('name') || org.name}</p>
                  <p className="text-sm text-muted-foreground">/{org.slug}</p>
                </div>
              </div>

              <div>
                <Label htmlFor="name">Organization Name</Label>
                <Input
                  id="name"
                  {...register('name')}
                  className="mt-1.5"
                  disabled={!isOwner}
                />
                {errors.name && (
                  <p className="text-sm text-destructive mt-1">
                    {errors.name.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  {...register('description')}
                  placeholder="Tell people about your group..."
                  className="mt-1.5 resize-none"
                  rows={3}
                  disabled={!isOwner}
                />
              </div>

              <div>
                <Label>Sport</Label>
                <Select
                  value={currentSport}
                  onValueChange={(val) => setValue('sport', val, { shouldDirty: true })}
                  disabled={!isOwner}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {sportOptions.map((sport) => (
                      <SelectItem key={sport.value} value={sport.value}>
                        <span className="flex items-center gap-2">
                          <span>{sport.emoji}</span>
                          <span>{sport.label}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <span className="text-xl">📋</span>
                Organization Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">URL Slug</span>
                <code className="bg-muted px-2 py-0.5 rounded text-xs">
                  {org.slug}
                </code>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span>{format(new Date(org.created_at), 'MMMM d, yyyy')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Visibility</span>
                <Badge variant="secondary">
                  {org.is_public ? 'Public' : 'Private'}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Join Code</span>
                <span className="font-mono">
                  {org.join_code || 'Not set'}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          {isOwner && (
            <Button
              type="submit"
              size="lg"
              className="w-full h-12"
              disabled={isSaving || !isDirty}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          )}
        </form>

        {/* Danger Zone */}
        {isOwner && (
          <Card className="mt-8 border-destructive/50">
            <CardHeader>
              <CardTitle className="text-lg text-destructive flex items-center gap-2">
                <span className="text-xl">⚠️</span>
                Danger Zone
              </CardTitle>
              <CardDescription>
                Irreversible actions - proceed with caution
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="w-full">
                    Delete Organization
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete {org.name}?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. All members, player profiles,
                      check-ins, and team data will be permanently deleted.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {isDeleting ? 'Deleting...' : 'Delete Forever'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        )}

        {!isOwner && (
          <div className="mt-6 p-4 bg-muted/50 rounded-lg text-center">
            <p className="text-sm text-muted-foreground">
              Only organization owners can edit settings.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
