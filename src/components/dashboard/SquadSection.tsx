import React from 'react';
import { Phone, Target, TrendingUp, DollarSign, Zap, Shield, Waves } from 'lucide-react';
import { MetricCard } from './MetricCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { SquadMetrics } from '@/hooks/useMetrics';

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
        bgClass: 'bg-eagles/5 border-eagles/20'
      };
    case 'alcateia':
      return { 
        variant: 'alcateia' as const, 
        icon: Shield, 
        gradient: 'gradient-alcateia',
        bgClass: 'bg-alcateia/5 border-alcateia/20'
      };
    case 'sharks':
      return { 
        variant: 'sharks' as const, 
        icon: Waves, 
        gradient: 'gradient-sharks',
        bgClass: 'bg-sharks/5 border-sharks/20'
      };
    default:
      return { 
        variant: 'default' as const, 
        icon: Target, 
        gradient: 'gradient-primary',
        bgClass: 'bg-primary/5 border-primary/20'
      };
  }
};

export function SquadSection({ squadMetrics, showClosers = true }: SquadSectionProps) {
  const { squad, totals, closers } = squadMetrics;
  const config = getSquadConfig(squad.slug);
  const SquadIcon = config.icon;

  return (
    <Card className={cn('glass-card animate-slide-up overflow-hidden', config.bgClass)}>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className={cn('p-2.5 rounded-xl text-white', config.gradient)}>
            <SquadIcon size={22} />
          </div>
          <div>
            <CardTitle className="text-xl">{squad.name}</CardTitle>
            <p className="text-sm text-muted-foreground mt-0.5">
              {closers.length} closer{closers.length !== 1 ? 's' : ''} ativos
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Squad totals */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4">
          <MetricCard 
            title="Calls" 
            value={totals.calls} 
            icon={Phone} 
            variant={config.variant}
          />
          <MetricCard 
            title="Vendas" 
            value={totals.sales} 
            icon={Target} 
            variant={config.variant}
          />
          <MetricCard
            title="Conversão"
            value={totals.conversion}
            icon={TrendingUp}
            isPercentage
            variant={config.variant}
          />
          <MetricCard 
            title="Faturamento" 
            value={totals.revenue} 
            icon={DollarSign} 
            isCurrency 
            variant={config.variant}
          />
          <MetricCard 
            title="Entradas" 
            value={totals.entries} 
            icon={DollarSign} 
            isCurrency 
            variant={config.variant}
          />
        </div>

        {/* Closers details */}
        {showClosers && closers.length > 0 && (
          <div className="space-y-4 pt-4 border-t border-border/50">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Performance Individual
            </h4>
            <div className="grid gap-4">
              {closers.map((cm) => (
                <div
                  key={cm.closer.id}
                  className="p-4 rounded-xl bg-background/50 border border-border/30"
                >
                  <p className="font-semibold text-foreground mb-3">{cm.closer.name}</p>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Calls</p>
                      <p className="text-lg font-bold text-foreground">{cm.metrics.calls}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Vendas</p>
                      <p className="text-lg font-bold text-foreground">{cm.metrics.sales}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Conversão</p>
                      <p className="text-lg font-bold text-foreground">{cm.metrics.conversion.toFixed(1)}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Faturamento</p>
                      <p className="text-lg font-bold text-foreground">
                        R$ {cm.metrics.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Entradas</p>
                      <p className="text-lg font-bold text-foreground">
                        R$ {cm.metrics.entries.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
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
    <Card className="glass-card">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <Skeleton className="w-11 h-11 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
