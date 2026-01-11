'use client';

/**
 * Quick actions component - shortcuts to common actions
 */

import Link from 'next/link';
import { Calendar, Users, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface QuickAction {
  label: string;
  href: string;
  icon: React.ReactNode;
  description?: string;
}

const DEFAULT_ACTIONS: QuickAction[] = [
  {
    label: 'Weekly Check-in',
    href: '/checkin',
    icon: <Calendar className="h-4 w-4" />,
    description: 'Plan your week',
  },
  {
    label: 'View Teams',
    href: '/teams',
    icon: <Users className="h-4 w-4" />,
    description: 'See all teams',
  },
  {
    label: 'Rules & Info',
    href: '/info',
    icon: <Info className="h-4 w-4" />,
    description: 'Game rules',
  },
];

interface QuickActionsProps {
  actions?: QuickAction[];
}

export function QuickActions({ actions = DEFAULT_ACTIONS }: QuickActionsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action) => (
        <Link key={action.href} href={action.href}>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            {action.icon}
            <span>{action.label}</span>
          </Button>
        </Link>
      ))}
    </div>
  );
}
