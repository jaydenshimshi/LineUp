'use client';

/**
 * Announcement form component for creating/editing announcements
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createClient } from '@/lib/supabase/client';
import {
  announcementSchema,
  transformAnnouncementData,
  ANNOUNCEMENT_SCOPES,
  ANNOUNCEMENT_URGENCY,
  SCOPE_LABELS,
  URGENCY_LABELS,
  type AnnouncementFormData,
} from '@/lib/validations/announcement';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { Announcement } from '@/types';

interface AnnouncementFormProps {
  initialData?: Announcement | null;
  onSuccess?: () => void;
}

export function AnnouncementForm({
  initialData,
  onSuccess,
}: AnnouncementFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const isEditing = !!initialData;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<AnnouncementFormData>({
    resolver: zodResolver(announcementSchema),
    defaultValues: initialData
      ? {
          title: initialData.title,
          body: initialData.body,
          scope_type: initialData.scope_type,
          scope_date: initialData.scope_date || undefined,
          urgency: initialData.urgency,
          is_active: initialData.is_active,
        }
      : {
          scope_type: 'global',
          urgency: 'info',
          is_active: true,
        },
  });

  const scopeType = watch('scope_type');

  async function onSubmit(data: AnnouncementFormData) {
    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError('You must be logged in');
        return;
      }

      const announcementData = transformAnnouncementData(data, user.id);

      if (isEditing && initialData) {
        const { error: updateError } = await supabase
          .from('announcements')
          .update(announcementData as never)
          .eq('id', initialData.id);

        if (updateError) {
          setError(updateError.message);
          return;
        }
      } else {
        const { error: insertError } = await supabase
          .from('announcements')
          .insert(announcementData as never);

        if (insertError) {
          setError(insertError.message);
          return;
        }
      }

      router.refresh();
      onSuccess?.();
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      console.error('Announcement save error:', err);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {isEditing ? 'Edit Announcement' : 'Create Announcement'}
        </CardTitle>
        <CardDescription>
          {isEditing
            ? 'Update the announcement details'
            : 'Create a new announcement for players'}
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="Announcement title"
              disabled={isLoading}
              {...register('title')}
            />
            {errors.title && (
              <p className="text-sm text-red-500">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="body">Message *</Label>
            <Textarea
              id="body"
              placeholder="Write your announcement message..."
              disabled={isLoading}
              rows={4}
              {...register('body')}
            />
            {errors.body && (
              <p className="text-sm text-red-500">{errors.body.message}</p>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="scope_type">Scope</Label>
              <Select
                value={scopeType}
                onValueChange={(value) =>
                  setValue(
                    'scope_type',
                    value as AnnouncementFormData['scope_type']
                  )
                }
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select scope" />
                </SelectTrigger>
                <SelectContent>
                  {ANNOUNCEMENT_SCOPES.map((scope) => (
                    <SelectItem key={scope} value={scope}>
                      {SCOPE_LABELS[scope]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="urgency">Urgency</Label>
              <Select
                value={watch('urgency')}
                onValueChange={(value) =>
                  setValue('urgency', value as AnnouncementFormData['urgency'])
                }
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select urgency" />
                </SelectTrigger>
                <SelectContent>
                  {ANNOUNCEMENT_URGENCY.map((urgency) => (
                    <SelectItem key={urgency} value={urgency}>
                      {URGENCY_LABELS[urgency]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {scopeType === 'date_specific' && (
            <div className="space-y-2">
              <Label htmlFor="scope_date">Date</Label>
              <Input
                id="scope_date"
                type="date"
                disabled={isLoading}
                {...register('scope_date')}
              />
              {errors.scope_date && (
                <p className="text-sm text-red-500">
                  {errors.scope_date.message}
                </p>
              )}
            </div>
          )}

          <div className="flex items-center space-x-2">
            <input
              id="is_active"
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300"
              disabled={isLoading}
              {...register('is_active')}
            />
            <Label htmlFor="is_active" className="text-sm font-normal">
              Active (visible to players)
            </Label>
          </div>
        </CardContent>

        <CardFooter className="flex gap-2">
          <Button type="submit" disabled={isLoading}>
            {isLoading
              ? 'Saving...'
              : isEditing
                ? 'Update Announcement'
                : 'Create Announcement'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
