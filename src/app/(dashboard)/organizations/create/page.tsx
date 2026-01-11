'use client';

/**
 * Create Organization Page
 * Sleek form to create a new group
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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

const sports = [
  { value: 'soccer', label: 'Soccer', icon: '⚽' },
  { value: 'basketball', label: 'Basketball', icon: '🏀' },
  { value: 'volleyball', label: 'Volleyball', icon: '🏐' },
  { value: 'tennis', label: 'Tennis', icon: '🎾' },
  { value: 'other', label: 'Other', icon: '🏆' },
];

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 30);
}

export default function CreateOrganizationPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [sport, setSport] = useState('soccer');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [slugEdited, setSlugEdited] = useState(false);

  const handleNameChange = (value: string) => {
    setName(value);
    if (!slugEdited) {
      setSlug(generateSlug(value));
    }
  };

  const handleSlugChange = (value: string) => {
    setSlugEdited(true);
    setSlug(generateSlug(value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Group name is required');
      return;
    }

    if (!slug.trim()) {
      setError('URL slug is required');
      return;
    }

    if (slug.length < 3) {
      setError('URL must be at least 3 characters');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          slug: slug.trim(),
          description: description.trim() || null,
          sport,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to create group');
        return;
      }

      // Redirect to the new organization
      router.push(`/org/${slug}`);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-hero">
      <div className="container mx-auto py-12 px-4 max-w-lg">
        {/* Back Button */}
        <Link
          href="/organizations"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <span className="mr-2">&larr;</span> Back to groups
        </Link>

        <Card className="shadow-xl">
          <CardHeader className="text-center pb-2">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-3xl mx-auto mb-4">
              {sports.find((s) => s.value === sport)?.icon || '\u26BD'}
            </div>
            <CardTitle className="text-2xl">Create a Group</CardTitle>
            <CardDescription>
              Set up a new group for your team or league
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-5">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="name">Group Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Downtown Soccer Club"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  disabled={isLoading}
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">URL</Label>
                <div className="flex items-center">
                  <span className="text-sm text-muted-foreground mr-1">
                    lineup.app/org/
                  </span>
                  <Input
                    id="slug"
                    placeholder="downtown-soccer"
                    value={slug}
                    onChange={(e) => handleSlugChange(e.target.value)}
                    disabled={isLoading}
                    className="h-11 font-mono"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  This will be your group&apos;s unique URL
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sport">Sport</Label>
                <Select value={sport} onValueChange={setSport} disabled={isLoading}>
                  <SelectTrigger className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {sports.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        <span className="flex items-center gap-2">
                          <span>{s.icon}</span>
                          <span>{s.label}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Tell members about your group..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isLoading}
                  rows={3}
                />
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-3">
              <Button
                type="submit"
                className="w-full h-11"
                disabled={isLoading || !name.trim() || !slug.trim()}
              >
                {isLoading ? 'Creating...' : 'Create Group'}
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                You&apos;ll be the owner and can invite others after creation.
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
