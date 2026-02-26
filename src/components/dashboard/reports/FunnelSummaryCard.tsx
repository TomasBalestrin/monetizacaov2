import React from 'react';
import { ArrowRight, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { FunnelSummary } from '@/hooks/useFunnels';

interface FunnelSummaryCardProps {
  summary: FunnelSummary;
  onClick: () => void;
}

export function FunnelSummaryCard({ summary, onClick }: FunnelSummaryCardProps) {
  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v);

  return (
    <Card
      className="bg-card border-border hover:border-primary/50 transition-colors cursor-pointer group"
      onClick={onClick}
    >
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-foreground">{summary.funnel_name}</h3>
          <ArrowRight
            size={16}
            className="text-muted-foreground group-hover:text-primary transition-colors"
          />
        </div>

        {summary.category && (
          <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full mb-3 inline-block">
            {summary.category}
          </span>
        )}

        <div className="grid grid-cols-3 gap-3 mt-3">
          <div>
            <p className="text-xs text-muted-foreground">Leads</p>
            <p className="text-sm font-bold text-foreground">{Number(summary.total_leads)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Vendas</p>
            <p className="text-sm font-bold text-foreground">{Number(summary.total_sales)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Faturamento</p>
            <p className="text-sm font-bold text-foreground">{formatCurrency(Number(summary.total_revenue))}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
          <TrendingUp size={14} className="text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            Conversão: <span className="font-semibold text-foreground">{Number(summary.conversion_rate).toFixed(1)}%</span>
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
