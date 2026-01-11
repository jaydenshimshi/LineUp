/**
 * Landing Page - Beautiful .io style homepage
 * For non-authenticated users
 */

import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';

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
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <svg
                className="w-5 h-5 text-primary-foreground"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <span className="text-xl font-bold">Lineup</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Sign In
              </Button>
            </Link>
            <Link href="/register">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 overflow-hidden">
        <div className="container mx-auto max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
                Now with balanced team generation
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
                Organize sports.
                <br />
                <span className="text-primary">Play fair.</span>
              </h1>
              <p className="text-lg sm:text-xl text-muted-foreground mb-8 max-w-lg mx-auto lg:mx-0">
                The modern way to manage your sports groups. Check in for games,
                get AI-powered balanced teams, and never argue about fair matchups again.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link href="/register">
                  <Button size="lg" className="w-full sm:w-auto px-8 h-12 text-base">
                    Start for Free
                  </Button>
                </Link>
                <Link href="#features">
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full sm:w-auto px-8 h-12 text-base"
                  >
                    See How It Works
                  </Button>
                </Link>
              </div>
              {/* Social Proof */}
              <div className="mt-10 flex items-center gap-4 justify-center lg:justify-start">
                <div className="flex -space-x-2">
                  {['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500'].map(
                    (color, i) => (
                      <div
                        key={i}
                        className={`w-8 h-8 rounded-full ${color} border-2 border-background flex items-center justify-center text-white text-xs font-medium`}
                      >
                        {String.fromCharCode(65 + i)}
                      </div>
                    )
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  Trusted by <span className="font-semibold text-foreground">500+</span> sports groups
                </p>
              </div>
            </div>

            {/* Right Illustration */}
            <div className="relative hidden lg:block">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent rounded-3xl blur-3xl"></div>
              <div className="relative bg-card border rounded-2xl shadow-2xl p-6 transform rotate-1 hover:rotate-0 transition-transform duration-500">
                {/* Mock App UI */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-xl">
                        ⚽
                      </div>
                      <div>
                        <p className="font-semibold">Sunday Soccer</p>
                        <p className="text-xs text-muted-foreground">12 players checked in</p>
                      </div>
                    </div>
                    <div className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium dark:bg-green-900/30 dark:text-green-400">
                      Game ON
                    </div>
                  </div>
                  <div className="border-t pt-4">
                    <p className="text-sm font-medium mb-3">Today&apos;s Teams</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900">
                        <p className="text-sm font-semibold text-red-700 dark:text-red-400 mb-2">Team Red</p>
                        <div className="space-y-1">
                          {['Alex M.', 'Jordan K.', 'Sam T.'].map((name) => (
                            <p key={name} className="text-xs text-muted-foreground">{name}</p>
                          ))}
                          <p className="text-xs text-muted-foreground">+3 more</p>
                        </div>
                      </div>
                      <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900">
                        <p className="text-sm font-semibold text-blue-700 dark:text-blue-400 mb-2">Team Blue</p>
                        <div className="space-y-1">
                          {['Chris P.', 'Morgan L.', 'Taylor R.'].map((name) => (
                            <p key={name} className="text-xs text-muted-foreground">{name}</p>
                          ))}
                          <p className="text-xs text-muted-foreground">+3 more</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-xs text-muted-foreground">Skill balance: 98%</span>
                    <span className="text-xs text-primary font-medium">View Details →</span>
                  </div>
                </div>
              </div>
              {/* Floating Elements */}
              <div className="absolute -top-4 -left-4 bg-card border rounded-xl p-3 shadow-lg animate-float">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🎯</span>
                  <div>
                    <p className="text-xs font-medium">Fair Teams</p>
                    <p className="text-[10px] text-muted-foreground">Skill-balanced</p>
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-4 -right-4 bg-card border rounded-xl p-3 shadow-lg animate-float" style={{ animationDelay: '1s' }}>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">📱</span>
                  <div>
                    <p className="text-xs font-medium">Mobile First</p>
                    <p className="text-[10px] text-muted-foreground">Check in anywhere</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Everything you need to run your group
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              From player check-ins to balanced team generation, we&apos;ve got you covered.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="bg-card border rounded-2xl p-6 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-2xl mb-4">
                📅
              </div>
              <h3 className="text-lg font-semibold mb-2">Weekly Check-ins</h3>
              <p className="text-muted-foreground">
                Players check in for specific dates. Know exactly who&apos;s coming before game day.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-card border rounded-2xl p-6 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-2xl mb-4">
                ⚖️
              </div>
              <h3 className="text-lg font-semibold mb-2">Balanced Teams</h3>
              <p className="text-muted-foreground">
                Our algorithm considers skill, age, and positions to create the fairest matchups.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-card border rounded-2xl p-6 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-2xl mb-4">
                🔒
              </div>
              <h3 className="text-lg font-semibold mb-2">Private Ratings</h3>
              <p className="text-muted-foreground">
                Admin-only skill ratings ensure fair teams without awkward conversations.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-card border rounded-2xl p-6 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-2xl mb-4">
                📢
              </div>
              <h3 className="text-lg font-semibold mb-2">Announcements</h3>
              <p className="text-muted-foreground">
                Broadcast game updates, weather cancellations, and important news instantly.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-card border rounded-2xl p-6 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center text-2xl mb-4">
                👥
              </div>
              <h3 className="text-lg font-semibold mb-2">Multiple Groups</h3>
              <p className="text-muted-foreground">
                Create or join multiple groups. Perfect for players in different leagues.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="bg-card border rounded-2xl p-6 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center text-2xl mb-4">
                📊
              </div>
              <h3 className="text-lg font-semibold mb-2">Real-time Updates</h3>
              <p className="text-muted-foreground">
                See check-in counts update live. Never wonder if the game is happening.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              How it works
            </h2>
            <p className="text-lg text-muted-foreground">
              Get started in under 2 minutes
            </p>
          </div>

          <div className="space-y-12">
            {[
              {
                step: '01',
                title: 'Create your group',
                description: 'Set up your sports group in seconds. Name it, pick your sport, and you\'re ready.',
                icon: '🏟️',
              },
              {
                step: '02',
                title: 'Invite your players',
                description: 'Share a simple join code. Players create profiles with their positions and availability.',
                icon: '✉️',
              },
              {
                step: '03',
                title: 'Players check in',
                description: 'Each week, players mark which days they can play. Admins see live counts.',
                icon: '✅',
              },
              {
                step: '04',
                title: 'Generate balanced teams',
                description: 'One click creates fair teams based on skill, age, and positions. Publish when ready.',
                icon: '🎯',
              },
            ].map((item, index) => (
              <div key={item.step} className="flex gap-6 items-start">
                <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-3xl">
                  {item.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded">
                      STEP {item.step}
                    </span>
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                  <p className="text-muted-foreground">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sports Section */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Built for all sports
          </h2>
          <p className="text-lg text-muted-foreground mb-12">
            Starting with soccer, expanding to more
          </p>
          <div className="flex flex-wrap justify-center gap-4">
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
                className={`flex items-center gap-2 px-4 py-2 rounded-full border ${
                  sport.available
                    ? 'bg-card'
                    : 'bg-muted/50 opacity-60'
                }`}
              >
                <span className="text-2xl">{sport.emoji}</span>
                <span className="font-medium">{sport.name}</span>
                {!sport.available && (
                  <span className="text-xs text-muted-foreground">(Soon)</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="bg-primary rounded-3xl p-8 sm:p-12 text-center text-primary-foreground">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Ready to organize your group?
            </h2>
            <p className="text-lg opacity-90 mb-8 max-w-xl mx-auto">
              Join hundreds of sports groups already using Lineup for fair, organized games.
            </p>
            <Link href="/register">
              <Button
                size="lg"
                variant="secondary"
                className="px-8 h-12 text-base font-semibold"
              >
                Get Started Free
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-primary-foreground"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <span className="font-bold">Lineup</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Lineup. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
