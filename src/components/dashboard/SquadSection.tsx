import React from 'react';
import { Phone, Target, TrendingUp, DollarSign, Zap, Shield, Waves, XCircle } from 'lucide-react';
import { MetricCard } from './MetricCard';
import { CombinedMetricCard } from './CombinedMetricCard';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { SquadMetrics } from '@/controllers/useCloserController';

interface SquadSectionProps {
  squadMetrics: SquadMetrics;
  showClosers?: boolean;
}

const getSquadConfig = (slug: string) => {
  switch (slug) {
    case 'eagles':
      return { 
        variant: 'eagles' as const, 
        icon: Zap, 
        gradient: 'gradient-eagles',
        headerBg: 'from-eagles/20 via-eagles/10 to-transparent',
        badgeClass: 'border-eagles/50 text-eagles bg-eagles/10',
      };
    case 'sharks':
      return { 
        variant: 'sharks' as const, 
        icon: Waves, 
        gradient: 'gradient-sharks',
        headerBg: 'from-sharks/20 via-sharks/10 to-transparent',
        badgeClass: 'border-sharks/50 text-sharks bg-sharks/10',
      };
    default:
      return { 
        variant: 'default' as const, 
        icon: Target, 
        gradient: 'gradient-primary',
        headerBg: 'from-primary/20 via-primary/10 to-transparent',
        badgeClass: 'border-primary/50 text-primary bg-primary/10',
      };
  }
};

export function SquadSection({ squadMetrics, showClosers = true }: SquadSectionProps) {
  const { squad, totals, closers } = squadMetrics;
  const config = getSquadConfig(squad.slug);
  const SquadIcon = config.icon;

  return (
    <Card className="glass-card animate-slide-up overflow-hidden">
      <CardHeader className={cn('pb-4 bg-gradient-to-r', config.headerBg)}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className={cn('p-2.5 rounded-xl text-white', config.gradient)}>
              <SquadIcon size={22} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground tracking-tight">{squad.name}</h3>
              <p className="text-xs text-muted-foreground">
                {closers.length} closer{closers.length !== 1 ? 's' : ''} ativos
              </p>
            </div>
          </div>
          <Badge variant="outline" className={cn('text-xs px-2.5 py-0.5 rounded-lg', config.badgeClass)}>
            {totals.conversion.toFixed(1)}% conversao
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 pt-4">
        {/* Simple metrics row */}
        <div className="grid grid-cols-3 gap-3">
          <MetricCard
            title="Calls"
            value={totals.calls}
            icon={Phone}
            variant={config.variant}
            compact
          />
          <MetricCard
            title="Vendas"
            value={totals.sales}
            icon={Target}
            variant={config.variant}
            compact
          />
          <MetricCard
            title="Conversão"
            value={totals.conversion}
            icon={TrendingUp}
            isPercentage
            showProgress
            variant={config.variant}
            compact
          />
        </div>

        {/* Financial metrics with trends */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <CombinedMetricCard
            title="Faturamento"
            value={totals.revenue}
            trend={totals.revenueTrend}
            icon={DollarSign}
            variant={config.variant}
          />
          <CombinedMetricCard
            title="Entradas"
            value={totals.entries}
            trend={totals.entriesTrend}
            icon={DollarSign}
            variant={config.variant}
          />
        </div>

        {/* Cancellation summary */}
        {totals.cancellations > 0 && (
          <div className="grid grid-cols-2 gap-3">
            <MetricCard
              title="Cancelamentos"
              value={totals.cancellations}
              icon={XCircle}
              variant="destructive"
              compact
            />
            <MetricCard
              title="% Cancelamento"
              value={totals.cancellationRate}
              icon={TrendingUp}
              isPercentage
              variant="destructive"
              compact
            />
          </div>
        )}

        {/* Closers details */}
        {showClosers && closers.length > 0 && (
          <div className="space-y-3 pt-4 border-t border-border/30">
            <p className="section-label">
              Performance Individual
            </p>
            <div className="grid gap-3">
              {closers.map((cm) => (
                <div
                  key={cm.closer.id}
                  className="p-4 rounded-xl bg-background/50 border border-border/30 hover:bg-background/70 transition-colors"
                >
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-semibold text-foreground">{cm.closer.name}</p>
                    <Badge variant="secondary" className="text-xs">
                      {cm.metrics.conversion.toFixed(1)}%
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Calls</p>
                      <p className="text-lg font-bold text-foreground">{cm.metrics.calls}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Vendas</p>
                      <p className="text-lg font-bold text-foreground">{cm.metrics.sales}</p>
                    </div>
                    <div className="hidden sm:block">
                      <p className="text-xs text-muted-foreground">Conversão</p>
                      <p className="text-lg font-bold text-foreground">{cm.metrics.conversion.toFixed(1)}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Faturamento</p>
                      <p className="text-lg font-bold text-foreground">
                        R$ {cm.metrics.revenue >= 1000 
                          ? `${(cm.metrics.revenue / 1000).toFixed(1).replace('.', ',')} mil`
                          : cm.metrics.revenue.toLocaleString('pt-BR')}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Entradas</p>
                      <p className="text-lg font-bold text-foreground">
                        R$ {cm.metrics.entries >= 1000 
                          ? `${(cm.metrics.entries / 1000).toFixed(1).replace('.', ',')} mil`
                          : cm.metrics.entries.toLocaleString('pt-BR')}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface SquadSectionLoadingProps {
  showClosers?: boolean;
}

export function SquadSectionLoading({ showClosers = true }: SquadSectionLoadingProps) {
  return (
    <Card className="glass-card overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Skeleton className="w-14 h-14 rounded-2xl" />
            <div className="space-y-2">
              <Skeleton className="h-7 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
          <Skeleton className="h-7 w-28 rounded-full" />
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[...Array(2)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
