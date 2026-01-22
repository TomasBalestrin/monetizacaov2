import React from 'react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { LucideIcon } from 'lucide-react';

interface SDRMetricCardProps {
  title: string;
  value: number;
  icon?: LucideIcon;
  isPercentage?: boolean;
  showProgress?: boolean;
  variant?: 'default' | 'highlight';
  className?: string;
}

export function SDRMetricCard({
  title,
  value,
  icon: Icon,
  isPercentage = false,
  showProgress = false,
  variant = 'default',
  className,
}: SDRMetricCardProps) {
  const displayValue = isPercentage
    ? `${value.toFixed(1)}%`
    : value.toLocaleString('pt-BR');

  return (
    <div
      className={cn(
        'p-4 rounded-xl border transition-all duration-200',
        variant === 'highlight'
          ? 'bg-gradient-to-br from-primary/10 to-transparent border-primary/20'
          : 'bg-card border-border',
        className
      )}
    >
      <div className="flex items-start justify-between mb-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {title}
        </p>
        {Icon && (
          <Icon
            size={18}
            className={cn(
              variant === 'highlight' ? 'text-primary' : 'text-muted-foreground'
            )}
          />
        )}
      </div>
      
      <p
        className={cn(
          'text-2xl font-bold',
          variant === 'highlight' ? 'text-primary' : 'text-foreground'
        )}
      >
        {displayValue}
      </p>

      {showProgress && isPercentage && (
        <div className="mt-3">
          <Progress
            value={Math.min(value, 100)}
            className="h-2"
          />
        </div>
      )}
    </div>
  );
}
