/**
 * Landing Page - Sleek, modern .io style homepage
 * For non-authenticated users
 */

import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { LineUpLogo } from '@/components/ui/lineup-logo';

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If logged in, redirect to organizations
  if (user) {
    redirect('/organizations');
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation - Compact */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <LineUpLogo size="sm" />
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/login">
              <Button variant="ghost" size="sm" className="h-8 text-xs">
                Sign In
              </Button>
            </Link>
            <Link href="/register">
              <Button size="sm" className="h-8 text-xs">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section - Compact */}
      <section className="pt-24 pb-12 px-4 overflow-hidden">
        <div className="container mx-auto max-w-5xl">
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            {/* Left Content */}
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-4">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary"></span>
                </span>
                AI-powered team balancing
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-4">
                Organize sports.
                <br />
                <span className="text-primary">Play fair.</span>
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground mb-6 max-w-md mx-auto lg:mx-0">
                The modern way to manage your sports groups. Check in for games,
                get AI-powered balanced teams, and never argue about fair matchups again.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                <Link href="/register">
                  <Button size="default" className="w-full sm:w-auto px-6 h-10 text-sm">
                    Start for Free
                  </Button>
                </Link>
                <Link href="#features">
                  <Button
                    size="default"
                    variant="outline"
                    className="w-full sm:w-auto px-6 h-10 text-sm"
                  >
                    Learn More
                  </Button>
                </Link>
              </div>
              {/* Social Proof */}
              <div className="mt-6 flex items-center gap-3 justify-center lg:justify-start">
                <div className="flex -space-x-1.5">
                  {['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500'].map(
                    (color, i) => (
                      <div
                        key={i}
                        className={`w-6 h-6 rounded-full ${color} border-2 border-background flex items-center justify-center text-white text-[10px] font-medium`}
                      >
                        {String.fromCharCode(65 + i)}
                      </div>
                    )
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">500+</span> groups trust us
                </p>
              </div>
            </div>

            {/* Right Illustration - Mock App */}
            <div className="relative hidden lg:block">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent rounded-2xl blur-3xl"></div>
              <div className="relative bg-card border rounded-xl shadow-xl p-4 transform rotate-1 hover:rotate-0 transition-transform duration-500">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-base">
                        ⚽
                      </div>
                      <div>
                        <p className="text-sm font-semibold">Sunday Soccer</p>
                        <p className="text-[10px] text-muted-foreground">12 players in</p>
                      </div>
                    </div>
                    <div className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-medium dark:bg-green-900/30 dark:text-green-400">
                      Game ON
                    </div>
                  </div>
                  <div className="border-t pt-3">
                    <p className="text-xs font-medium mb-2">Today&apos;s Teams</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900">
                        <p className="text-xs font-semibold text-red-700 dark:text-red-400 mb-1">Team Red</p>
                        <div className="space-y-0.5">
                          {['Alex M.', 'Jordan K.', 'Sam T.'].map((name) => (
                            <p key={name} className="text-[10px] text-muted-foreground">{name}</p>
                          ))}
                        </div>
                      </div>
                      <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900">
                        <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-1">Team Blue</p>
                        <div className="space-y-0.5">
                          {['Chris P.', 'Morgan L.', 'Taylor R.'].map((name) => (
                            <p key={name} className="text-[10px] text-muted-foreground">{name}</p>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-[10px] text-muted-foreground">Balance: 98%</span>
                    <span className="text-[10px] text-primary font-medium">Details →</span>
                  </div>
                </div>
              </div>
              {/* Floating Elements */}
              <div className="absolute -top-2 -left-2 bg-card border rounded-lg p-2 shadow-lg animate-float">
                <div className="flex items-center gap-1.5">
                  <span className="text-base">🎯</span>
                  <div>
                    <p className="text-[10px] font-medium">Fair Teams</p>
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-2 -right-2 bg-card border rounded-lg p-2 shadow-lg animate-float" style={{ animationDelay: '1s' }}>
                <div className="flex items-center gap-1.5">
                  <span className="text-base">📱</span>
                  <div>
                    <p className="text-[10px] font-medium">Mobile First</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section - Compact */}
      <section id="features" className="py-12 px-4 bg-muted/30">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-8">
            <h2 className="text-xl sm:text-2xl font-bold mb-2">
              Everything you need
            </h2>
            <p className="text-sm text-muted-foreground max-w-xl mx-auto">
              From check-ins to balanced teams, we&apos;ve got you covered.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { icon: '📅', title: 'Weekly Check-ins', desc: 'Know exactly who\'s coming before game day', color: 'bg-blue-100 dark:bg-blue-900/30' },
              { icon: '⚖️', title: 'Balanced Teams', desc: 'AI considers skill, age, and positions', color: 'bg-green-100 dark:bg-green-900/30' },
              { icon: '🔒', title: 'Private Ratings', desc: 'Admin-only skill ratings for fair play', color: 'bg-purple-100 dark:bg-purple-900/30' },
              { icon: '📢', title: 'Announcements', desc: 'Broadcast updates to your group instantly', color: 'bg-orange-100 dark:bg-orange-900/30' },
              { icon: '👥', title: 'Multiple Groups', desc: 'Create or join different leagues', color: 'bg-pink-100 dark:bg-pink-900/30' },
              { icon: '📊', title: 'Real-time', desc: 'See check-in counts update live', color: 'bg-cyan-100 dark:bg-cyan-900/30' },
            ].map((feature) => (
              <div key={feature.title} className="bg-card border rounded-xl p-4 hover:shadow-md transition-shadow">
                <div className={`w-9 h-9 rounded-lg ${feature.color} flex items-center justify-center text-lg mb-2`}>
                  {feature.icon}
                </div>
                <h3 className="text-sm font-semibold mb-1">{feature.title}</h3>
                <p className="text-xs text-muted-foreground">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works - Compact */}
      <section className="py-12 px-4">
        <div className="container mx-auto max-w-3xl">
          <div className="text-center mb-8">
            <h2 className="text-xl sm:text-2xl font-bold mb-2">
              How it works
            </h2>
            <p className="text-sm text-muted-foreground">
              Get started in under 2 minutes
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { step: '1', title: 'Create your group', desc: 'Name it, pick your sport, ready!', icon: '🏟️' },
              { step: '2', title: 'Invite players', desc: 'Share a simple join code', icon: '✉️' },
              { step: '3', title: 'Players check in', desc: 'Mark available days weekly', icon: '✅' },
              { step: '4', title: 'Generate teams', desc: 'One click, fair teams', icon: '🎯' },
            ].map((item) => (
              <div key={item.step} className="flex gap-3 p-3 rounded-xl bg-muted/30 border">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-lg">
                  {item.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                      {item.step}
                    </span>
                    <h3 className="text-sm font-semibold truncate">{item.title}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sports Section - Compact */}
      <section className="py-10 px-4 bg-muted/30">
        <div className="container mx-auto max-w-3xl text-center">
          <h2 className="text-lg font-bold mb-2">Built for all sports</h2>
          <p className="text-xs text-muted-foreground mb-6">Starting with soccer, expanding to more</p>
          <div className="flex flex-wrap justify-center gap-2">
            {[
              { emoji: '⚽', name: 'Soccer', available: true },
              { emoji: '🏀', name: 'Basketball', available: true },
              { emoji: '🏐', name: 'Volleyball', available: true },
              { emoji: '🎾', name: 'Tennis', available: true },
              { emoji: '🏈', name: 'Football', available: false },
              { emoji: '🏒', name: 'Hockey', available: false },
            ].map((sport) => (
              <div
                key={sport.name}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm ${
                  sport.available ? 'bg-card' : 'bg-muted/50 opacity-60'
                }`}
              >
                <span className="text-base">{sport.emoji}</span>
                <span className="text-xs font-medium">{sport.name}</span>
                {!sport.available && <span className="text-[10px] text-muted-foreground">(Soon)</span>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section - Compact */}
      <section className="py-12 px-4">
        <div className="container mx-auto max-w-2xl">
          <div className="bg-primary rounded-2xl p-6 sm:p-8 text-center text-primary-foreground">
            <h2 className="text-xl sm:text-2xl font-bold mb-2">
              Ready to organize your group?
            </h2>
            <p className="text-sm opacity-90 mb-6 max-w-md mx-auto">
              Join hundreds of sports groups using LineUp for fair games.
            </p>
            <Link href="/register">
              <Button
                variant="secondary"
                className="px-6 h-10 text-sm font-semibold"
              >
                Get Started Free
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer - Compact */}
      <footer className="border-t py-6 px-4">
        <div className="container mx-auto max-w-5xl">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <LineUpLogo size="sm" />
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} LineUp. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
