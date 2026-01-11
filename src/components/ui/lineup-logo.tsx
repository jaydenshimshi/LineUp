'use client';

import { cn } from '@/lib/utils';

interface LineUpLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export function LineUpLogo({ className, size = 'md', showText = true }: LineUpLogoProps) {
  const sizes = {
    sm: { icon: 20, text: 'text-sm', gap: 'gap-1.5' },
    md: { icon: 24, text: 'text-base', gap: 'gap-2' },
    lg: { icon: 32, text: 'text-xl', gap: 'gap-2.5' },
  };

  const { icon, text, gap } = sizes[size];

  return (
    <div className={cn('flex items-center', gap, className)}>
      {/* Icon - 4 people bars */}
      <svg
        width={icon}
        height={icon}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0"
      >
        {/* Person 1 - Blue */}
        <circle cx="5" cy="5" r="2.5" fill="#2563eb" />
        <rect x="3" y="9" width="4" height="14" rx="2" fill="#2563eb" />

        {/* Person 2 - Green (tall) - uses CSS variable for primary */}
        <circle cx="12" cy="4" r="2.5" fill="var(--color-primary, #22c55e)" />
        <rect x="10" y="8" width="4" height="18" rx="2" fill="var(--color-primary, #22c55e)" />

        {/* Person 3 - Gray */}
        <circle cx="19" cy="6" r="2.5" fill="#9ca3af" />
        <rect x="17" y="10" width="4" height="12" rx="2" fill="#9ca3af" />

        {/* Person 4 - Green */}
        <circle cx="26" cy="5" r="2.5" fill="var(--color-primary, #22c55e)" />
        <rect x="24" y="9" width="4" height="15" rx="2" fill="var(--color-primary, #22c55e)" />
      </svg>

      {/* Text */}
      {showText && (
        <span className={cn('font-bold tracking-tight', text)}>
          <span className="text-foreground">Line</span>
          <span className="text-primary">Up</span>
        </span>
      )}
    </div>
  );
}
