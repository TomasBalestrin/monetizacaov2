import React, { useState, useMemo } from 'react';
import { FileText, TrendingUp, Users, Phone, DollarSign, Target, Filter, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MonthSelector, getMonthPeriod } from '@/components/dashboard/MonthSelector';
import { useAllFunnelsSummary, useFunnelReport, type FunnelSummary } from '@/hooks/useFunnels';
import { MetricCardSkeletonGrid } from '@/components/dashboard/skeletons';
import { FunnelChart } from './FunnelChart';
import { FunnelSummaryCard } from './FunnelSummaryCard';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function ReportsPage() {
  const [selectedMonth, setSelectedMonth] = useState(() => startOfMonth(new Date()));
  const [selectedFunnelId, setSelectedFunnelId] = useState<string | null>(null);

  const { periodStart, periodEnd } = useMemo(() => getMonthPeriod(selectedMonth), [selectedMonth]);

  const { data: summaries, isLoading } = useAllFunnelsSummary(periodStart, periodEnd);
  const { data: detailedReport } = useFunnelReport(
    selectedFunnelId || undefined,
    periodStart,
    periodEnd
  );

  const totals = useMemo(() => {
    if (!summaries || summaries.length === 0) return null;
    return {
      leads: summaries.reduce((s, f) => s + Number(f.total_leads), 0),
      qualified: summaries.reduce((s, f) => s + Number(f.total_qualified), 0),
      scheduled: summaries.reduce((s, f) => s + Number(f.total_calls_scheduled), 0),
      done: summaries.reduce((s, f) => s + Number(f.total_calls_done), 0),
      sales: summaries.reduce((s, f) => s + Number(f.total_sales), 0),
      revenue: summaries.reduce((s, f) => s + Number(f.total_revenue), 0),
    };
  }, [summaries]);

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          {selectedFunnelId && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedFunnelId(null)}
              className="shrink-0"
            >
              <ArrowLeft size={20} />
            </Button>
          )}
          <div className="p-3 rounded-2xl bg-primary/10">
            <FileText size={28} className="text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Relatórios por Funil</h1>
            <p className="text-muted-foreground">Visão consolidada de todos os funis</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select
            value={selectedFunnelId || 'all'}
            onValueChange={(v) => setSelectedFunnelId(v === 'all' ? null : v)}
          >
            <SelectTrigger className="w-[200px]">
              <Filter size={16} className="mr-2 text-muted-foreground" />
              <SelectValue placeholder="Todos os Funis" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Funis</SelectItem>
              {summaries?.map((f) => (
                <SelectItem key={f.funnel_id} value={f.funnel_id}>
                  {f.funnel_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <MonthSelector selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} />
        </div>
      </div>

      {/* Total Cards */}
      {isLoading ? (
        <MetricCardSkeletonGrid count={6} />
      ) : totals ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <SummaryCard icon={Users} title="Leads" value={totals.leads} />
          <SummaryCard icon={Target} title="Qualificados" value={totals.qualified} />
          <SummaryCard icon={Phone} title="Agendadas" value={totals.scheduled} />
          <SummaryCard icon={Phone} title="Realizadas" value={totals.done} />
          <SummaryCard icon={TrendingUp} title="Vendas" value={totals.sales} />
          <SummaryCard icon={DollarSign} title="Faturamento" value={formatCurrency(totals.revenue)} />
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <FileText size={48} className="mx-auto mb-4 opacity-50" />
          <p>Nenhum dado de funil encontrado para o período selecionado.</p>
          <p className="text-sm mt-1">Adicione dados via "Cadastro por Funil" na página do Closer.</p>
        </div>
      )}

      {/* Funnel Chart - detailed view */}
      {detailedReport && selectedFunnelId && (
        <FunnelChart report={detailedReport} />
      )}

      {/* All funnels summary cards */}
      {!selectedFunnelId && summaries && summaries.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Desempenho por Funil</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {summaries.map((f) => (
              <FunnelSummaryCard
                key={f.funnel_id}
                summary={f}
                onClick={() => setSelectedFunnelId(f.funnel_id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ icon: Icon, title, value }: { icon: React.ElementType; title: string; value: string | number }) {
  return (
    <Card className="bg-card border-border">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <Icon size={16} className="text-muted-foreground" />
          <span className="text-xs text-muted-foreground">{title}</span>
        </div>
        <p className="text-xl font-bold text-foreground">{value}</p>
      </CardContent>
    </Card>
  );
}
