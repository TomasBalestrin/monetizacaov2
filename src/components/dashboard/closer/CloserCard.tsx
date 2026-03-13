import React from 'react';
import { cn } from '@/lib/utils';
import { ChevronRight, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

interface CloserWithMetrics {
  id: string;
  name: string;
  squad_id: string;
  metrics: {
    calls: number;
    sales: number;
    revenue: number;
    entries: number;
    revenueTrend: number;
    entriesTrend: number;
    conversion: number;
  };
}

interface CloserCardProps {
  closer: CloserWithMetrics;
  onClick: () => void;
}

function getConversionColor(rate: number) {
  if (rate >= 30) return 'bg-success';
  if (rate >= 15) return 'bg-warning';
  return 'bg-destructive/70';
}

function formatCurrency(value: number) {
  if (value >= 1000000) return `R$ ${(value / 1000000).toFixed(1).replace('.', ',')}M`;
  if (value >= 1000) return `R$ ${(value / 1000).toFixed(1).replace('.', ',')} mil`;
  return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

export function CloserCard({ closer, onClick }: CloserCardProps) {
  const { metrics } = closer;
  const trendGrowing = metrics.revenueTrend > metrics.revenue;

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full p-4 rounded-xl border border-border bg-card shadow-sm',
        'hover:border-primary/30 hover:shadow-md transition-all duration-300',
        'text-left group'
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-sm font-bold text-primary">
              {closer.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h3 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">
              {closer.name}
            </h3>
            <p className="text-[11px] text-muted-foreground">Closer</p>
          </div>
        </div>
        <ChevronRight
          size={16}
          className="text-muted-foreground/40 group-hover:text-primary transition-colors mt-1"
        />
      </div>

      {/* Main stats row */}
      <div className="grid grid-cols-3 gap-2">
        <div className="p-2 rounded-lg bg-muted/40">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Calls</p>
          <p className="text-lg font-bold text-foreground tabular-nums">
            {metrics.calls.toLocaleString('pt-BR')}
          </p>
        </div>
        <div className="p-2 rounded-lg bg-primary/5">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Vendas</p>
          <p className="text-lg font-bold text-primary tabular-nums">
            {metrics.sales.toLocaleString('pt-BR')}
          </p>
        </div>
        <div className="p-2 rounded-lg bg-muted/40">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Conversão</p>
          <p className={cn(
            'text-lg font-bold tabular-nums',
            metrics.conversion >= 30 ? 'text-success' :
            metrics.conversion >= 15 ? 'text-warning' :
            'text-destructive'
          )}>
            {metrics.conversion.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Financial row */}
      <div className="mt-2 grid grid-cols-2 gap-2">
        <div className="p-2 rounded-lg bg-muted/40">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Faturamento</p>
          <p className="text-sm font-bold text-foreground flex items-center gap-1">
            {formatCurrency(metrics.revenue)}
            {metrics.revenueTrend > 0 && (
              trendGrowing ? (
                <TrendingUp size={12} className="text-success shrink-0" />
              ) : (
                <TrendingDown size={12} className="text-destructive shrink-0" />
              )
            )}
          </p>
        </div>
        <div className="p-2 rounded-lg bg-muted/40">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Entradas</p>
          <p className="text-sm font-bold text-foreground">
            {formatCurrency(metrics.entries)}
          </p>
        </div>
      </div>

      {/* Conversion bar */}
      <div className="mt-3 pt-3 border-t border-border/30">
        <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1.5">
          <span>Taxa de Conversão</span>
          <span className={cn(
            'font-semibold',
            metrics.conversion >= 30 ? 'text-success' :
            metrics.conversion >= 15 ? 'text-warning' :
            'text-destructive'
          )}>
            {metrics.conversion.toFixed(1)}%
          </span>
        </div>
        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all duration-500', getConversionColor(metrics.conversion))}
            style={{ width: `${Math.min((metrics.conversion / 50) * 100, 100)}%` }}
          />
        </div>
      </div>
    </button>
  );
}
