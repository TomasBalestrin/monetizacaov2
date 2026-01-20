import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';

interface MetricCardProps {
  title: string;
  value: string | number;
  trend?: number;
  icon?: LucideIcon;
  large?: boolean;
  isCurrency?: boolean;
  isPercentage?: boolean;
  className?: string;
  variant?: 'default' | 'eagles' | 'alcateia' | 'sharks' | 'success' | 'warning';
}

export function MetricCard({
  title,
  value,
  trend,
  icon: Icon,
  large = false,
  isCurrency = false,
  isPercentage = false,
  className,
  variant = 'default',
}: MetricCardProps) {
  const formatValue = () => {
    if (typeof value === 'number') {
      if (isCurrency) {
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
        return 'bg-eagles/20 text-eagles';
      case 'alcateia':
        return 'bg-alcateia/20 text-alcateia';
      case 'sharks':
        return 'bg-sharks/20 text-sharks';
      case 'success':
        return 'bg-success/20 text-success';
      case 'warning':
        return 'bg-warning/20 text-warning';
      default:
        return 'bg-primary/10 text-primary';
    }
  };

  return (
    <Card
      className={cn(
        'glass-card transition-all duration-200 hover:shadow-lg hover:scale-[1.02] animate-fade-in',
        large && 'glass-card-elevated',
        className
      )}
    >
      <CardContent className={cn('p-6', large && 'p-8')}>
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-muted-foreground text-sm font-medium mb-2 truncate">{title}</p>
            <h3
              className={cn(
                'font-bold text-card-foreground truncate',
                large ? 'text-3xl md:text-4xl' : 'text-2xl md:text-3xl'
              )}
            >
              {formatValue()}
            </h3>
            {trend !== undefined && (
              <div
                className={cn(
                  'flex items-center mt-3 text-sm font-medium',
                  trend >= 0 ? 'text-success' : 'text-destructive'
                )}
              >
                {trend >= 0 ? (
                  <TrendingUp size={16} className="mr-1.5 shrink-0" />
                ) : (
                  <TrendingDown size={16} className="mr-1.5 shrink-0" />
                )}
                <span>
                  {trend >= 0 ? '+' : ''}
                  {trend.toFixed(1)}% vs. período anterior
                </span>
              </div>
            )}
          </div>
          {Icon && (
            <div className={cn('p-3 rounded-xl shrink-0 ml-4', getIconBackground())}>
              <Icon size={large ? 28 : 24} />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
