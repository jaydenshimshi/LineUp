import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 via-background to-background">
      <div className="container mx-auto py-8 px-4 max-w-3xl">
        {/* Header skeleton */}
        <div className="mb-8">
          <Skeleton className="h-6 w-32 mb-3" />
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-40" />
        </div>

        {/* Announcement skeleton */}
        <Skeleton className="h-24 w-full rounded-xl mb-6" />

        {/* Today card skeleton */}
        <Card className="mb-8">
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <Skeleton className="h-16 w-16 rounded-full" />
              <Skeleton className="h-10 w-32" />
            </div>
          </CardContent>
        </Card>

        {/* Quick actions skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="pt-6 text-center">
                <Skeleton className="h-12 w-12 rounded-xl mx-auto mb-3" />
                <Skeleton className="h-4 w-16 mx-auto mb-1" />
                <Skeleton className="h-3 w-12 mx-auto" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
