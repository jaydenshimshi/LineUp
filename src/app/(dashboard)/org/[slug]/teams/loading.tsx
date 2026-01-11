import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/30 to-background">
      <div className="container mx-auto py-6 px-4 max-w-3xl">
        {/* Header skeleton */}
        <div className="mb-8 text-center">
          <Skeleton className="h-8 w-40 mx-auto mb-2" />
          <Skeleton className="h-4 w-48 mx-auto" />
        </div>

        {/* Status badge skeleton */}
        <div className="flex justify-center mb-6">
          <Skeleton className="h-6 w-32 rounded-full" />
        </div>

        {/* Teams grid skeleton */}
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2].map((i) => (
            <Card key={i}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-5 w-20" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((j) => (
                    <div key={j} className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <Skeleton className="h-4 w-28" />
                      </div>
                      <Skeleton className="h-5 w-16" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
