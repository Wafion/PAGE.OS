'use client';

import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  label?: string;
  icon?: React.ComponentType<{ className?: string }>;
  variant?: 'classic' | 'lounge';
  accent?: boolean;
}

export default function StatCard({
  title,
  value,
  label,
  icon: Icon,
  variant = 'lounge',
  accent = false,
}: StatCardProps) {
  const formattedValue = typeof value === 'number'
    ? value.toLocaleString()
    : value;

  return (
    <Card
      className={cn(
        'group relative overflow-hidden border-border/40 transition-all duration-200',
        'hover:border-accent/30 hover:shadow-md hover:shadow-accent/5',
        accent
          ? 'border-accent/20 bg-gradient-to-br from-card to-accent/5'
          : 'bg-card/60'
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {title}
            </p>
            <div className="flex items-baseline gap-1.5">
              <span
                className={cn(
                  'text-2xl font-bold tabular-nums tracking-tight',
                  accent ? 'text-accent' : 'text-foreground'
                )}
              >
                {formattedValue}
              </span>
            </div>
            {label && (
              <p className="text-xs text-muted-foreground/60">{label}</p>
            )}
          </div>
          {Icon && (
            <Icon
              className={cn(
                'h-5 w-5 transition-colors',
                accent ? 'text-accent' : 'text-muted-foreground/40 group-hover:text-accent/60'
              )}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}