import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { GoalProgress } from '@/components/dashboard/GoalProgress';

interface MetricCardProps {
  title: string;
  value: string | number;
  trend?: number;
  trendWarning?: string;
  icon?: LucideIcon;
  large?: boolean;
  compact?: boolean;
  isCurrency?: boolean;
  isPercentage?: boolean;
  showProgress?: boolean;
  className?: string;
  variant?: 'default' | 'eagles' | 'sharks' | 'success' | 'warning' | 'destructive';
  goalTarget?: number | null;
}

export function MetricCard({
  title,
  value,
  trend,
  trendWarning,
  icon: Icon,
  large = false,
  compact = false,
  isCurrency = false,
  isPercentage = false,
  showProgress = false,
  className,
  variant = 'default',
  goalTarget,
}: MetricCardProps) {
  const formatValue = (compact = true) => {
    if (typeof value === 'number') {
      if (isCurrency) {
        if (compact && value >= 1000000) {
          return `R$ ${(value / 1000000).toFixed(1).replace('.', ',')}M`;
        }
        if (compact && value >= 1000) {
          return `R$ ${(value / 1000).toFixed(1).replace('.', ',')} mil`;
        }
        return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      }
      if (isPercentage) {
        return `${value.toFixed(1)}%`;
      }
      return value.toLocaleString('pt-BR');
    }
    return value;
  };

  const getIconBackground = () => {
    switch (variant) {
      case 'eagles':
        return 'bg-eagles/10 text-eagles';
      case 'sharks':
        return 'bg-sharks/10 text-sharks';
      case 'success':
        return 'bg-success/10 text-success';
      case 'warning':
        return 'bg-warning/10 text-warning';
      case 'destructive':
        return 'bg-destructive/10 text-destructive';
      default:
        return 'bg-primary/8 text-primary';
    }
  };

  const getProgressColor = () => {
    switch (variant) {
      case 'eagles':
        return 'bg-eagles';
      case 'sharks':
        return 'bg-sharks';
      case 'success':
        return 'bg-success';
      case 'warning':
        return 'bg-warning';
      case 'destructive':
        return 'bg-destructive';
      default:
        return 'bg-primary';
    }
  };

  const displayValue = formatValue(true);
  const fullValue = formatValue(false);
  const needsTooltip = isCurrency && typeof value === 'number' && value >= 1000;
  const progressValue = isPercentage && typeof value === 'number' ? Math.min(value, 100) : 0;

  const valueElement = (
    <h3
      className={cn(
        'font-bold text-card-foreground tracking-tight',
        large ? 'text-2xl sm:text-3xl md:text-4xl' : compact ? 'text-lg sm:text-xl' : 'text-lg sm:text-xl md:text-2xl'
      )}
    >
      {displayValue}
    </h3>
  );

  if (compact) {
    return (
      <div
        className={cn(
          'p-3 sm:p-4 rounded-2xl bg-card border border-border/30 transition-all duration-300',
          className
        )}
        style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}
      >
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <p className="section-label">{title}</p>
          {Icon && (
            <div className={cn('p-1.5 rounded-full shrink-0', getIconBackground())}>
              <Icon size={14} />
            </div>
          )}
        </div>
        {needsTooltip ? (
          <Tooltip>
            <TooltipTrigger asChild>
              {valueElement}
            </TooltipTrigger>
            <TooltipContent side="bottom" className="font-semibold">
              {fullValue}
            </TooltipContent>
          </Tooltip>
        ) : (
          valueElement
        )}
        {showProgress && isPercentage && (
          <div className="mt-2">
            <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all duration-500', getProgressColor())}
                style={{ width: `${progressValue}%` }}
              />
            </div>
          </div>
        )}
        {goalTarget != null && typeof value === 'number' && (
          <GoalProgress current={value} target={goalTarget} isCurrency={isCurrency} />
        )}
      </div>
    );
  }

  return (
    <Card
      className={cn(
        'glass-card transition-all duration-300 animate-fade-in',
        large && 'glass-card-elevated',
        className
      )}
    >
      <CardContent className={cn('p-5 sm:p-6', large && 'p-6 sm:p-8')}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="section-label mb-2 sm:mb-3">{title}</p>
            {needsTooltip ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  {valueElement}
                </TooltipTrigger>
                <TooltipContent side="bottom" className="font-semibold">
                  {fullValue}
                </TooltipContent>
              </Tooltip>
            ) : (
              valueElement
            )}
            {showProgress && isPercentage && (
              <div className="mt-3">
                <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all duration-500', getProgressColor())}
                    style={{ width: `${progressValue}%` }}
                  />
                </div>
              </div>
            )}
            {goalTarget != null && typeof value === 'number' && (
              <GoalProgress current={value} target={goalTarget} isCurrency={isCurrency} />
            )}
            {trend !== undefined && (
              <div
                className={cn(
                  'flex items-center mt-2 sm:mt-3 text-xs sm:text-sm font-medium',
                  trend >= 0 ? 'text-success' : 'text-destructive'
                )}
              >
                {trend >= 0 ? (
                  <TrendingUp size={14} className="mr-1 shrink-0" />
                ) : (
                  <TrendingDown size={14} className="mr-1 shrink-0" />
                )}
                <span>
                  {trend >= 0 ? '+' : ''}
                  {trend.toFixed(1)}%
                </span>
              </div>
            )}
            {trendWarning && (
              <p className="text-xs text-muted-foreground mt-1 italic">{trendWarning}</p>
            )}
          </div>
          {Icon && (
            <div className={cn('p-2.5 sm:p-3 rounded-full shrink-0', getIconBackground())}>
              <Icon size={large ? 24 : 20} className="sm:w-6 sm:h-6" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
