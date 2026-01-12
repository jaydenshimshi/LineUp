'use client';

/**
 * Rating form component for admin to rate players
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { RATING_LABELS } from '@/lib/validations/rating';

interface RatingFormProps {
  playerId: string;
  playerName: string;
  currentRating?: number;
  currentNotes?: string;
  isOpen: boolean;
  onClose: () => void;
}

export function RatingForm({
  playerId,
  playerName,
  currentRating,
  currentNotes,
  isOpen,
  onClose,
}: RatingFormProps) {
  const router = useRouter();
  const [rating, setRating] = useState(currentRating || 3);
  const [notes, setNotes] = useState(currentNotes || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
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

      // Check if rating exists
      const { data: existingRating } = await supabase
        .from('player_admin_ratings')
        .select('id')
        .eq('player_id', playerId)
        .single();

      if (existingRating) {
        // Update existing rating
        const { error: updateError } = await supabase
          .from('player_admin_ratings')
          .update({
            rating_stars: rating,
            notes: notes || null,
            rated_by_admin_id: user.id,
          } as never)
          .eq('player_id', playerId);

        if (updateError) {
          setError(updateError.message);
          return;
        }
      } else {
        // Insert new rating
        const { error: insertError } = await supabase
          .from('player_admin_ratings')
          .insert({
            player_id: playerId,
            rating_stars: rating,
            notes: notes || null,
            rated_by_admin_id: user.id,
          } as never);

        if (insertError) {
          setError(insertError.message);
          return;
        }
      }

      router.refresh();
      onClose();
    } catch (err) {
      setError('An unexpected error occurred');
      console.error('Rating error:', err);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose} modal={true}>
      <DialogContent
        className="sm:max-w-md max-h-[85vh] overflow-y-auto fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%]"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Rate {playerName}</DialogTitle>
          <DialogDescription>
            Assign a skill rating from 1 to 5 stars. This rating is private and
            only visible to admins.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <p className="text-sm text-red-500 bg-red-50 dark:bg-red-950 p-2 rounded">
              {error}
            </p>
          )}

          <div className="space-y-3">
            <Label>Skill Rating</Label>
            <div className="flex gap-3 justify-center">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setRating(star);
                  }}
                  className={`w-12 h-12 sm:w-10 sm:h-10 rounded-lg border-2 flex items-center justify-center text-xl transition-colors touch-manipulation select-none ${
                    star <= rating
                      ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/30'
                      : 'border-gray-200 dark:border-gray-700'
                  }`}
                  disabled={isLoading}
                >
                  {star <= rating ? '⭐' : '☆'}
                </button>
              ))}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
              {RATING_LABELS[rating]} ({rating}/5)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any notes about this player's skill level..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isLoading}
              rows={3}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={(e) => {
              e.preventDefault();
              onClose();
            }}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            onClick={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            {isLoading ? 'Saving...' : 'Save Rating'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
