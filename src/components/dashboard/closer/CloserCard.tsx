import React from 'react';
import { cn } from '@/lib/utils';
import { Phone, ChevronRight, TrendingUp } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

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

export function CloserCard({ closer, onClick }: CloserCardProps) {
  const { metrics } = closer;

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full p-4 rounded-xl border border-border bg-card',
        'hover:bg-accent/50 hover:border-primary/30 transition-all duration-200',
        'text-left group'
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="text-lg font-bold text-primary">
              {closer.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
              {closer.name}
            </h3>
            <p className="text-xs text-muted-foreground">Closer</p>
          </div>
        </div>
        <ChevronRight
          size={18}
          className="text-muted-foreground group-hover:text-primary transition-colors"
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <p className="text-xs text-muted-foreground">Calls</p>
          <p className="text-lg font-bold text-foreground">
            {metrics.calls.toLocaleString('pt-BR')}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Vendas</p>
          <p className="text-lg font-bold text-primary">
            {metrics.sales.toLocaleString('pt-BR')}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Faturamento</p>
          <p className="text-sm font-bold text-foreground">
            {metrics.revenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
        </div>
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
          <span>Taxa de Conversão</span>
          <span className="flex items-center gap-1">
            <TrendingUp size={12} />
            {metrics.conversion.toFixed(1)}%
          </span>
        </div>
        <Progress value={Math.min(metrics.conversion, 100)} className="h-1.5" />
      </div>
    </button>
  );
}
