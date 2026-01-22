import React from 'react';
import { cn } from '@/lib/utils';
import { Phone, Users, ChevronRight } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import type { SDRWithMetrics } from '@/hooks/useSdrMetrics';

interface SDRCardProps {
  sdr: SDRWithMetrics;
  onClick: () => void;
}

export function SDRCard({ sdr, onClick }: SDRCardProps) {
  const { metrics } = sdr;
  const Icon = sdr.type === 'sdr' ? Phone : Users;

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
          <div className="p-2 rounded-lg bg-primary/10">
            <Icon size={18} className="text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
              {sdr.name}
            </h3>
            <p className="text-xs text-muted-foreground capitalize">
              {sdr.type === 'sdr' ? 'SDR' : 'Social Selling'}
            </p>
          </div>
        </div>
        <ChevronRight
          size={18}
          className="text-muted-foreground group-hover:text-primary transition-colors"
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <p className="text-xs text-muted-foreground">Ativados</p>
          <p className="text-lg font-bold text-foreground">
            {metrics.totalActivated.toLocaleString('pt-BR')}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Agendados</p>
          <p className="text-lg font-bold text-foreground">
            {metrics.totalScheduled.toLocaleString('pt-BR')}
          </p>
          <p className="text-xs text-muted-foreground">
            ({metrics.avgScheduledRate.toFixed(1)}%)
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Vendas</p>
          <p className="text-lg font-bold text-primary">
            {metrics.totalSales.toLocaleString('pt-BR')}
          </p>
        </div>
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
          <span>Taxa de Conversão</span>
          <span>{metrics.avgConversionRate.toFixed(1)}%</span>
        </div>
        <Progress value={Math.min(metrics.avgConversionRate, 100)} className="h-1.5" />
      </div>
    </button>
  );
}
