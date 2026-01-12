'use client';

/**
 * Player profile form component
 */

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createClient } from '@/lib/supabase/client';
import {
  profileSchema,
  transformProfileData,
  POSITIONS,
  POSITION_LABELS,
  type ProfileFormData,
} from '@/lib/validations/profile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PositionPicker } from '@/components/ui/position-picker';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { Player } from '@/types';

interface ProfileFormProps {
  userId: string;
  initialData?: Player | null;
}

// Position options for native select
const POSITION_OPTIONS = POSITIONS.map((pos) => ({
  value: pos,
  label: `${POSITION_LABELS[pos]} (${pos})`,
}));

export function ProfileForm({ userId, initialData }: ProfileFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const isEditing = !!initialData;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: initialData
      ? {
          full_name: initialData.full_name,
          age: initialData.age,
          main_position: initialData.main_position,
          alt_position: initialData.alt_position,
          contact_email: initialData.contact_email || '',
          contact_phone: initialData.contact_phone || '',
          contact_opt_in: initialData.contact_opt_in,
        }
      : {
          contact_opt_in: false,
        },
  });

  const mainPosition = watch('main_position');

  async function onSubmit(data: ProfileFormData) {
    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const profileData = transformProfileData(data);

      if (isEditing && initialData) {
        const { error: updateError } = await supabase
          .from('players')
          .update(profileData as never)
          .eq('id', initialData.id);

        if (updateError) {
          setError(updateError.message);
          return;
        }
      } else {
        const { error: insertError } = await supabase.from('players').insert({
          ...profileData,
          user_id: userId,
        } as never);

        if (insertError) {
          setError(insertError.message);
          return;
        }
      }

      // Check for next param or pending join code
      const nextUrl = searchParams.get('next');
      const pendingJoinCode = localStorage.getItem('pendingJoinCode');

      if (nextUrl) {
        router.push(nextUrl);
      } else if (pendingJoinCode) {
        router.push('/organizations');
      } else {
        router.push('/');
      }
      router.refresh();
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      console.error('Profile save error:', err);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {isEditing ? 'Edit Profile' : 'Complete Your Profile'}
        </CardTitle>
        <CardDescription>
          {isEditing
            ? 'Update your player information'
            : 'Tell us about yourself to get started'}
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
            <Label htmlFor="full_name">Full Name *</Label>
            <Input
              id="full_name"
              placeholder="Enter your full name"
              disabled={isLoading}
              {...register('full_name')}
            />
            {errors.full_name && (
              <p className="text-sm text-red-500">{errors.full_name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="age">Age *</Label>
            <Input
              id="age"
              type="number"
              placeholder="Enter your age"
              disabled={isLoading}
              {...register('age', { valueAsNumber: true })}
            />
            {errors.age && (
              <p className="text-sm text-red-500">{errors.age.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="main_position">Main Position *</Label>
            <PositionPicker
              value={mainPosition || ''}
              onChange={(value) =>
                setValue('main_position', value as ProfileFormData['main_position'])
              }
              disabled={isLoading}
              options={POSITION_OPTIONS}
              placeholder="Select your main position"
              label="Select Main Position"
            />
            {errors.main_position && (
              <p className="text-sm text-red-500">
                {errors.main_position.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="alt_position">Alternate Position (Optional)</Label>
            <PositionPicker
              value={watch('alt_position') || null}
              onChange={(value) =>
                setValue('alt_position', value as ProfileFormData['main_position'] | null)
              }
              disabled={isLoading}
              options={POSITION_OPTIONS.filter((opt) => opt.value !== mainPosition)}
              placeholder="Select alternate position"
              label="Select Alternate Position"
              allowNone
            />
          </div>

          <div className="border-t pt-4 mt-4">
            <h3 className="font-medium mb-3">Contact Information (Optional)</h3>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="contact_email">Contact Email</Label>
                <Input
                  id="contact_email"
                  type="email"
                  placeholder="your@email.com"
                  disabled={isLoading}
                  {...register('contact_email')}
                />
                {errors.contact_email && (
                  <p className="text-sm text-red-500">
                    {errors.contact_email.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact_phone">Phone Number</Label>
                <Input
                  id="contact_phone"
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  disabled={isLoading}
                  {...register('contact_phone')}
                />
                {errors.contact_phone && (
                  <p className="text-sm text-red-500">
                    {errors.contact_phone.message}
                  </p>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <input
                  id="contact_opt_in"
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300"
                  disabled={isLoading}
                  {...register('contact_opt_in')}
                />
                <Label htmlFor="contact_opt_in" className="text-sm font-normal">
                  Allow other players to see my contact information
                </Label>
              </div>
            </div>
          </div>
        </CardContent>

        <CardFooter>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading
              ? 'Saving...'
              : isEditing
                ? 'Update Profile'
                : 'Complete Profile'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
