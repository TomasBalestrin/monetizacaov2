import React from 'react';
import { LucideIcon, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface CombinedMetricCardProps {
  title: string;
  value: number;
  trend: number;
  trendLabel?: string;
  icon?: LucideIcon;
  variant?: 'default' | 'eagles' | 'alcateia' | 'sharks' | 'success' | 'warning';
  className?: string;
}

export function CombinedMetricCard({
  title,
  value,
  trend,
  trendLabel = 'Tendência',
  icon: Icon,
  variant = 'default',
  className,
}: CombinedMetricCardProps) {
  const formatValue = (val: number, compact = true) => {
    if (compact && val >= 1000000) {
      return `R$ ${(val / 1000000).toFixed(1).replace('.', ',')}M`;
    }
    if (compact && val >= 1000) {
      return `R$ ${(val / 1000).toFixed(1).replace('.', ',')} mil`;
    }
    return `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'eagles':
        return {
          bg: 'from-eagles/15 to-eagles/5',
          border: 'border-eagles/30',
          icon: 'text-eagles',
          trend: 'text-eagles',
        };
      case 'alcateia':
        return {
          bg: 'from-alcateia/15 to-alcateia/5',
          border: 'border-alcateia/30',
          icon: 'text-alcateia',
          trend: 'text-alcateia',
        };
      case 'sharks':
        return {
          bg: 'from-sharks/15 to-sharks/5',
          border: 'border-sharks/30',
          icon: 'text-sharks',
          trend: 'text-sharks',
        };
      case 'success':
        return {
          bg: 'from-success/15 to-success/5',
          border: 'border-success/30',
          icon: 'text-success',
          trend: 'text-success',
        };
      case 'warning':
        return {
          bg: 'from-warning/15 to-warning/5',
          border: 'border-warning/30',
          icon: 'text-warning',
          trend: 'text-warning',
        };
      default:
        return {
          bg: 'from-primary/15 to-primary/5',
          border: 'border-primary/30',
          icon: 'text-primary',
          trend: 'text-primary',
        };
    }
  };

  const styles = getVariantStyles();
  const displayValue = formatValue(value, true);
  const fullValue = formatValue(value, false);
  const displayTrend = formatValue(trend, true);
  const fullTrend = formatValue(trend, false);
  const needsTooltip = value >= 1000;

  return (
    <div
      className={cn(
        'p-4 rounded-xl bg-gradient-to-br border backdrop-blur-sm transition-all duration-200 hover:shadow-md',
        styles.bg,
        styles.border,
        className
      )}
    >
      <div className="flex justify-between items-start gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground font-medium mb-1">{title}</p>
          {needsTooltip ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <p className="text-xl sm:text-2xl font-bold text-card-foreground cursor-help truncate">
                  {displayValue}
                </p>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="font-semibold">
                {fullValue}
              </TooltipContent>
            </Tooltip>
          ) : (
            <p className="text-xl sm:text-2xl font-bold text-card-foreground truncate">
              {displayValue}
            </p>
          )}
          <div className={cn('flex items-center gap-1.5 mt-2 text-sm font-medium', styles.trend)}>
            <TrendingUp size={14} className="shrink-0" />
            <span className="text-muted-foreground text-xs">{trendLabel}:</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-help truncate">{displayTrend}</span>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="font-semibold">
                {fullTrend}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
        {Icon && (
          <div className={cn('p-2.5 rounded-xl bg-background/50 shrink-0', styles.icon)}>
            <Icon size={24} />
          </div>
        )}
      </div>
    </div>
  );
}
