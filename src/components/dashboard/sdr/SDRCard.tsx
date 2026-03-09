import React from 'react';
import { cn } from '@/lib/utils';
import { Phone, Users, ChevronRight } from 'lucide-react';
import type { SDRWithMetrics } from '@/controllers/useSdrController';

interface SDRCardProps {
  sdr: SDRWithMetrics;
  onClick: () => void;
}

function getConversionColor(rate: number) {
  if (rate >= 30) return 'bg-success';
  if (rate >= 15) return 'bg-warning';
  return 'bg-destructive/70';
}

export function SDRCard({ sdr, onClick }: SDRCardProps) {
  const { metrics } = sdr;
  const Icon = sdr.type === 'sdr' ? Phone : Users;

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full p-4 rounded-2xl border border-border/30 bg-card',
        'hover:border-primary/20 transition-all duration-300',
        'text-left group'
      )}
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-primary/10">
            <Icon size={16} className="text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">
              {sdr.name}
            </h3>
            <p className="text-[11px] text-muted-foreground capitalize">
              {sdr.type === 'sdr' ? 'SDR' : 'Social Selling'}
            </p>
          </div>
        </div>
        <ChevronRight
          size={16}
          className="text-muted-foreground/40 group-hover:text-primary transition-colors mt-1"
        />
      </div>

      {/* Top of funnel */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Ativados</p>
          <p className="text-lg font-bold text-foreground">
            {metrics.totalActivated.toLocaleString('pt-BR')}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Agendados</p>
          <p className="text-lg font-bold text-foreground">
            {metrics.totalScheduled.toLocaleString('pt-BR')}
          </p>
          <p className="text-[10px] text-muted-foreground">
            ({metrics.avgScheduledRate.toFixed(1)}%)
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Vendas</p>
          <p className="text-lg font-bold text-success">
            {metrics.totalSales.toLocaleString('pt-BR')}
          </p>
        </div>
      </div>

      {/* Middle of funnel - Realizados e Comparecimento */}
      <div className="mt-2 grid grid-cols-2 gap-3">
        <div className="p-2 rounded-lg bg-muted/30">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Realizados</p>
          <p className="text-sm font-bold text-foreground">
            {metrics.totalAttended.toLocaleString('pt-BR')}
          </p>
        </div>
        <div className="p-2 rounded-lg bg-muted/30">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">% Comparec.</p>
          <p className={cn(
            'text-sm font-bold',
            metrics.avgAttendanceRate >= 70 ? 'text-success' :
            metrics.avgAttendanceRate >= 50 ? 'text-warning' :
            'text-destructive'
          )}>
            {metrics.avgAttendanceRate.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Conversion bar - scaled to 50% benchmark */}
      <div className="mt-3 pt-3 border-t border-border/20">
        <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1.5">
          <span>Taxa de Conversão</span>
          <span className={cn(
            'font-semibold',
            metrics.avgConversionRate >= 30 ? 'text-success' :
            metrics.avgConversionRate >= 15 ? 'text-warning' :
            'text-destructive'
          )}>
            {metrics.avgConversionRate.toFixed(1)}%
          </span>
        </div>
        <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all duration-500', getConversionColor(metrics.avgConversionRate))}
            style={{ width: `${Math.min((metrics.avgConversionRate / 50) * 100, 100)}%` }}
          />
        </div>
      </div>
    </button>
  );
}
