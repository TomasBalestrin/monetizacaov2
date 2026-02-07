import React from 'react';
import { cn } from '@/lib/utils';
import { Target } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface GoalProgressProps {
  current: number;
  target: number;
  isCurrency?: boolean;
  className?: string;
}

export function GoalProgress({ current, target, isCurrency = false, className }: GoalProgressProps) {
  if (target <= 0) return null;

  const percentage = Math.min((current / target) * 100, 150);
  const cappedWidth = Math.min(percentage, 100);

  const formatValue = (v: number) => {
    if (isCurrency) {
      if (v >= 1000) return `R$ ${(v / 1000).toFixed(1).replace('.', ',')} mil`;
      return `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    }
    return v.toLocaleString('pt-BR');
  };

  const colorClass =
    percentage >= 100
      ? 'bg-green-500'
      : percentage >= 70
        ? 'bg-amber-500'
        : 'bg-red-500';

  const textColorClass =
    percentage >= 100
      ? 'text-green-500'
      : percentage >= 70
        ? 'text-amber-500'
        : 'text-red-500';

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={cn('mt-2 space-y-1', className)}>
          <div className="flex items-center justify-between text-[10px]">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Target size={10} />
              <span>Meta: {formatValue(target)}</span>
            </div>
            <span className={cn('font-semibold', textColorClass)}>
              {percentage.toFixed(0)}%
            </span>
          </div>
          <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all duration-700', colorClass)}
              style={{ width: `${cappedWidth}%` }}
            />
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        {formatValue(current)} / {formatValue(target)} ({percentage.toFixed(1)}%)
      </TooltipContent>
    </Tooltip>
  );
}
