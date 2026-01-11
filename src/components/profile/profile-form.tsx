'use client';

/**
 * Player profile form component
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
import type { Player } from '@/types';

interface ProfileFormProps {
  userId: string;
  initialData?: Player | null;
}

export function ProfileForm({ userId, initialData }: ProfileFormProps) {
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

      router.push('/');
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
            <Select
              value={mainPosition}
              onValueChange={(value) =>
                setValue('main_position', value as ProfileFormData['main_position'])
              }
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select your main position" />
              </SelectTrigger>
              <SelectContent>
                {POSITIONS.map((pos) => (
                  <SelectItem key={pos} value={pos}>
                    {POSITION_LABELS[pos]} ({pos})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.main_position && (
              <p className="text-sm text-red-500">
                {errors.main_position.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="alt_position">Alternate Position (Optional)</Label>
            <Select
              value={watch('alt_position') || 'none'}
              onValueChange={(value) =>
                setValue(
                  'alt_position',
                  value === 'none' ? null : (value as ProfileFormData['main_position'])
                )
              }
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select alternate position (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {POSITIONS.filter((pos) => pos !== mainPosition).map((pos) => (
                  <SelectItem key={pos} value={pos}>
                    {POSITION_LABELS[pos]} ({pos})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
