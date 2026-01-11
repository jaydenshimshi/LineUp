'use client';

/**
 * Profile Client Component
 * Beautiful form for player profile creation/editing
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

const positionValues = ['GK', 'DF', 'MID', 'ST'] as const;

const profileSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  age: z.number().min(5, 'Age must be at least 5').max(100, 'Age must be under 100'),
  main_position: z.enum(positionValues, {
    message: 'Please select your main position',
  }),
  alt_position: z.enum(positionValues).nullable().optional(),
  contact_email: z.string().email('Invalid email').or(z.literal('')).optional(),
  contact_phone: z.string().optional(),
  contact_opt_in: z.boolean().default(false),
});

type ProfileFormData = z.infer<typeof profileSchema>;
type PositionType = typeof positionValues[number];

interface ExistingProfile {
  id: string;
  full_name: string;
  age: number;
  main_position: string;
  alt_position: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  contact_opt_in: boolean;
  profile_completed: boolean;
}

interface ProfileClientProps {
  orgId: string;
  orgSlug: string;
  orgName: string;
  userId: string;
  existingProfile: ExistingProfile | null;
}

const positions = [
  { value: 'GK', label: 'Goalkeeper', emoji: '🧤', description: 'Last line of defense' },
  { value: 'DF', label: 'Defender', emoji: '🛡️', description: 'Stop attacks, protect the goal' },
  { value: 'MID', label: 'Midfielder', emoji: '⚙️', description: 'Control the game flow' },
  { value: 'ST', label: 'Striker', emoji: '⚡', description: 'Score goals, lead the attack' },
];

export function ProfileClient({
  orgId,
  orgSlug,
  orgName,
  userId,
  existingProfile,
}: ProfileClientProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: existingProfile?.full_name || '',
      age: existingProfile?.age || undefined,
      main_position: (existingProfile?.main_position as PositionType) || undefined,
      alt_position: (existingProfile?.alt_position as PositionType | null) || null,
      contact_email: existingProfile?.contact_email || '',
      contact_phone: existingProfile?.contact_phone || '',
      contact_opt_in: existingProfile?.contact_opt_in || false,
    },
  });

  const mainPosition = watch('main_position');

  const onSubmit = async (data: z.infer<typeof profileSchema>) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/players', {
        method: existingProfile ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          organization_id: orgId,
          user_id: userId,
          player_id: existingProfile?.id,
          profile_completed: true,
        }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to save profile');
      }

      router.push(`/org/${orgSlug}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/30 to-background">
      <div className="container mx-auto py-8 px-4 max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-3xl mx-auto mb-4">
            ⚽
          </div>
          <h1 className="text-2xl font-bold">
            {existingProfile ? 'Edit Profile' : 'Complete Your Profile'}
          </h1>
          <p className="text-muted-foreground mt-2">
            {existingProfile
              ? `Update your profile for ${orgName}`
              : `Set up your player profile for ${orgName}`}
          </p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)}>
          {/* Basic Info */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Basic Info</CardTitle>
              <CardDescription>Tell us about yourself</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  placeholder="John Smith"
                  {...register('full_name')}
                  className="mt-1.5"
                />
                {errors.full_name && (
                  <p className="text-sm text-destructive mt-1">
                    {errors.full_name.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="age">Age</Label>
                <Input
                  id="age"
                  type="number"
                  placeholder="25"
                  {...register('age', { valueAsNumber: true })}
                  className="mt-1.5"
                />
                {errors.age && (
                  <p className="text-sm text-destructive mt-1">
                    {errors.age.message}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Position */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Position</CardTitle>
              <CardDescription>Where do you usually play?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Main Position</Label>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  {positions.map((pos) => (
                    <button
                      key={pos.value}
                      type="button"
                      onClick={() => setValue('main_position', pos.value as 'GK' | 'DF' | 'MID' | 'ST')}
                      className={cn(
                        'flex flex-col items-center p-4 rounded-xl border-2 transition-all',
                        'hover:border-primary/50',
                        mainPosition === pos.value
                          ? 'border-primary bg-primary/10'
                          : 'border-border'
                      )}
                    >
                      <span className="text-2xl mb-1">{pos.emoji}</span>
                      <span className="font-medium">{pos.label}</span>
                      <span className="text-xs text-muted-foreground text-center mt-1">
                        {pos.description}
                      </span>
                    </button>
                  ))}
                </div>
                {errors.main_position && (
                  <p className="text-sm text-destructive mt-2">
                    {errors.main_position.message}
                  </p>
                )}
              </div>

              <div>
                <Label>Alternate Position (Optional)</Label>
                <Select
                  value={watch('alt_position') || ''}
                  onValueChange={(val) =>
                    setValue('alt_position', val as 'GK' | 'DF' | 'MID' | 'ST' | null)
                  }
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Select backup position" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {positions.map((pos) => (
                      <SelectItem key={pos.value} value={pos.value}>
                        {pos.emoji} {pos.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Contact (Optional) */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Contact (Optional)</CardTitle>
              <CardDescription>
                Share your contact info with group admins
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="contact_email">Email</Label>
                <Input
                  id="contact_email"
                  type="email"
                  placeholder="john@example.com"
                  {...register('contact_email')}
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="contact_phone">Phone</Label>
                <Input
                  id="contact_phone"
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  {...register('contact_phone')}
                  className="mt-1.5"
                />
              </div>

              <label className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 cursor-pointer">
                <input
                  type="checkbox"
                  {...register('contact_opt_in')}
                  className="w-4 h-4 rounded border-border"
                />
                <div>
                  <p className="font-medium text-sm">Share with teammates</p>
                  <p className="text-xs text-muted-foreground">
                    Allow other players to see your contact info
                  </p>
                </div>
              </label>
            </CardContent>
          </Card>

          {/* Submit */}
          <Button
            type="submit"
            size="lg"
            className="w-full h-12"
            disabled={isSubmitting}
          >
            {isSubmitting
              ? 'Saving...'
              : existingProfile
              ? 'Save Changes'
              : 'Complete Profile'}
          </Button>
        </form>
      </div>
    </div>
  );
}
