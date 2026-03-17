import React from 'react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { GoalProgress } from '@/components/dashboard/GoalProgress';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface SDRMetricCardProps {
  title: string;
  value: number;
  icon?: LucideIcon;
  isPercentage?: boolean;
  isCurrency?: boolean;
  showProgress?: boolean;
  variant?: 'default' | 'highlight' | 'success' | 'warning';
  size?: 'default' | 'large' | 'featured';
  trend?: number | null;
  trendLabel?: string;
  className?: string;
  goalTarget?: number | null;
}

export function SDRMetricCard({
  title,
  value,
  icon: Icon,
  isPercentage = false,
  isCurrency = false,
  showProgress = false,
  variant = 'default',
  size = 'default',
  trend,
  trendLabel = 'vs semana anterior',
  className,
  goalTarget,
}: SDRMetricCardProps) {
  const displayValue = isPercentage
    ? `${value.toFixed(1)}%`
    : isCurrency
    ? value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    : value.toLocaleString('pt-BR');

  const TrendIcon = trend && trend > 0 ? TrendingUp : trend && trend < 0 ? TrendingDown : Minus;
  const hasTrend = trend !== undefined && trend !== null;

  const sizeClasses = {
    default: 'p-3 sm:p-4',
    large: 'p-4 sm:p-5',
    featured: 'p-5 sm:p-6',
  };

  const valueSizeClasses = {
    default: 'text-xl sm:text-2xl',
    large: 'text-2xl sm:text-3xl',
    featured: 'text-3xl sm:text-4xl',
  };

  const variantClasses = {
    default: 'bg-card border-border/30',
    highlight: 'bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20',
    success: 'bg-gradient-to-br from-green-500/10 via-green-500/5 to-transparent border-green-500/20',
    warning: 'bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border-amber-500/20',
  };

  const iconVariantClasses = {
    default: 'text-muted-foreground',
    highlight: 'text-primary',
    success: 'text-green-500',
    warning: 'text-amber-500',
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
        'rounded-2xl border transition-all duration-300',
        sizeClasses[size],
        variantClasses[variant],
        size === 'featured' && 'col-span-2 md:col-span-1',
        className
      )}
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}
    >
      <div className="flex items-center gap-1.5 mb-2">
        {Icon && (
          <Icon
            size={14}
            className={iconVariantClasses[variant]}
          />
        )}
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
          {title}
        </p>
        {variant === 'highlight' && (
          <span className="ml-auto px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider bg-primary/15 text-primary rounded-md">
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
        <div className="mt-2">
          <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                variant === 'highlight' ? 'bg-primary' :
                variant === 'success' ? 'bg-green-500' :
                variant === 'warning' ? 'bg-amber-500' :
                'bg-primary'
              )}
              style={{ width: `${Math.min(value, 100)}%` }}
            />
          </div>
        </div>
      )}

      {goalTarget != null && (
        <GoalProgress current={value} target={goalTarget} />
      )}

      {hasTrend && (
        <div className={cn(
          "flex items-center gap-1 mt-2 text-[11px]",
          trend > 0 && "text-green-500",
          trend < 0 && "text-red-500",
          trend === 0 && "text-muted-foreground"
        )}>
          <TrendIcon size={12} />
          <span className="font-medium">
            {trend > 0 ? '+' : ''}{trend.toFixed(0)}%
          </span>
          <span className="text-muted-foreground ml-0.5">{trendLabel}</span>
        </div>
      )}
    </div>
  );
}
