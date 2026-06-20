'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface StatCardProps {
  title: string;
  value: string | number;
  label?: string;
  icon?: React.ComponentType<{ className?: string }>;
  variant?: 'classic' | 'lounge';
}

export default function StatCard({
  title,
  value,
  label,
  icon: Icon,
  variant = 'lounge'
}: StatCardProps) {
  const formattedValue = typeof value === 'number'
    ? value.toLocaleString()
    : value;

  return (
    <Card className="border-border/50 bg-card">
      <CardHeader className="pb-2">
        <div className="flex items-center space-x-2">
          {Icon && <Icon className="h-4 w-4 text-accent" />}
          <CardTitle className="font-headline text-xs text-accent/80">
            {title}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="text-center space-y-2">
        <div className="text-2xl font-bold text-accent">
          {formattedValue}
        </div>
        {label && (
          <div className="text-xs text-muted-foreground">
            {label}
          </div>
        )}
      </CardContent>
    </Card>
  );
}