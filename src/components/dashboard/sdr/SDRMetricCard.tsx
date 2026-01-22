import React from 'react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface SDRMetricCardProps {
  title: string;
  value: number;
  icon?: LucideIcon;
  isPercentage?: boolean;
  showProgress?: boolean;
  variant?: 'default' | 'highlight' | 'success' | 'warning';
  size?: 'default' | 'large' | 'featured';
  trend?: number | null;
  trendLabel?: string;
  className?: string;
}

export function SDRMetricCard({
  title,
  value,
  icon: Icon,
  isPercentage = false,
  showProgress = false,
  variant = 'default',
  size = 'default',
  trend,
  trendLabel = 'vs semana anterior',
  className,
}: SDRMetricCardProps) {
  const displayValue = isPercentage
    ? `${value.toFixed(1)}%`
    : value.toLocaleString('pt-BR');

  const TrendIcon = trend && trend > 0 ? TrendingUp : trend && trend < 0 ? TrendingDown : Minus;
  const hasTrend = trend !== undefined && trend !== null;

  const sizeClasses = {
    default: 'p-4',
    large: 'p-5',
    featured: 'p-6',
  };

  const valueSizeClasses = {
    default: 'text-2xl',
    large: 'text-3xl',
    featured: 'text-4xl',
  };

  const variantClasses = {
    default: 'bg-card border-border',
    highlight: 'bg-gradient-to-br from-primary/15 via-primary/10 to-transparent border-primary/30 shadow-lg shadow-primary/5',
    success: 'bg-gradient-to-br from-green-500/15 via-green-500/10 to-transparent border-green-500/30',
    warning: 'bg-gradient-to-br from-amber-500/15 via-amber-500/10 to-transparent border-amber-500/30',
  };

  const iconVariantClasses = {
    default: 'text-muted-foreground bg-muted/50',
    highlight: 'text-primary bg-primary/20',
    success: 'text-green-500 bg-green-500/20',
    warning: 'text-amber-500 bg-amber-500/20',
  };

  const valueVariantClasses = {
    default: 'text-foreground',
    highlight: 'text-primary',
    success: 'text-green-500',
    warning: 'text-amber-500',
  };

  return (
    <div
      className={cn(
        'rounded-xl border transition-all duration-300 hover:scale-[1.02] hover:shadow-lg',
        sizeClasses[size],
        variantClasses[variant],
        size === 'featured' && 'col-span-2 md:col-span-1',
        className
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          {Icon && (
            <div className={cn(
              'p-2 rounded-lg',
              iconVariantClasses[variant]
            )}>
              <Icon
                size={size === 'featured' ? 22 : size === 'large' ? 20 : 18}
              />
            </div>
          )}
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {title}
          </p>
        </div>
        
        {variant === 'highlight' && (
          <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-primary/20 text-primary rounded-full">
            Destaque
          </span>
        )}
      </div>
      
      <p
        className={cn(
          'font-bold tracking-tight',
          valueSizeClasses[size],
          valueVariantClasses[variant]
        )}
      >
        {displayValue}
      </p>

      {showProgress && isPercentage && (
        <div className="mt-3">
          <Progress
            value={Math.min(value, 100)}
            className={cn(
              "h-2",
              variant === 'highlight' && '[&>div]:bg-primary',
              variant === 'success' && '[&>div]:bg-green-500',
              variant === 'warning' && '[&>div]:bg-amber-500'
            )}
          />
        </div>
      )}

      {hasTrend && (
        <div className={cn(
          "flex items-center gap-1 mt-3 text-xs",
          trend > 0 && "text-green-500",
          trend < 0 && "text-red-500",
          trend === 0 && "text-muted-foreground"
        )}>
          <TrendIcon size={14} />
          <span className="font-medium">
            {trend > 0 ? '+' : ''}{trend.toFixed(0)}%
          </span>
          <span className="text-muted-foreground ml-1">{trendLabel}</span>
        </div>
      )}
    </div>
  );
}
