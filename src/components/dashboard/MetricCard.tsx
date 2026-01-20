import React from 'react';
import { LucideIcon } from 'lucide-react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  value: string | number;
  trend?: number;
  icon?: LucideIcon;
  large?: boolean;
  isCurrency?: boolean;
  isPercentage?: boolean;
  className?: string;
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

  return (
    <div
      className={cn(
        'bg-slate-800 rounded-lg p-6 border border-slate-700 transition-all hover:border-slate-600',
        className
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <p className="text-slate-400 text-sm mb-1">{title}</p>
          <h3 className={cn('font-bold text-white', large ? 'text-3xl' : 'text-2xl')}>
            {formatValue()}
          </h3>
          {trend !== undefined && (
            <div
              className={cn(
                'flex items-center mt-2 text-sm',
                trend >= 0 ? 'text-green-400' : 'text-red-400'
              )}
            >
              {trend >= 0 ? (
                <TrendingUp size={16} className="mr-1" />
              ) : (
                <TrendingDown size={16} className="mr-1" />
              )}
              <span>
                {trend >= 0 ? '+' : ''}
                {trend.toFixed(1)}%
              </span>
            </div>
          )}
        </div>
        {Icon && (
          <div className="bg-blue-600/20 p-3 rounded-lg">
            <Icon className="text-blue-400" size={24} />
          </div>
        )}
      </div>
    </div>
  );
}
