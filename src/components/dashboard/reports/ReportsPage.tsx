import React, { useState, useMemo } from 'react';
import { FileText, TrendingUp, Users, Phone, DollarSign, Target, Filter, Plus } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { MonthSelector, getMonthPeriod } from '@/components/dashboard/MonthSelector';
import { PeriodFilter } from '@/components/dashboard/PeriodFilter';
import { useAllFunnelsSummary, useFunnelReport, useSalesByPersonAndProduct, type FunnelSummary } from '@/hooks/useFunnels';
import { MetricCardSkeletonGrid } from '@/components/dashboard/skeletons';
import { FunnelChart } from './FunnelChart';
import { ProductSalesTable } from './ProductSalesTable';
import { SDRMetricsDialog } from '@/components/dashboard/sdr/SDRMetricsDialog';
import { useAuth } from '@/contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function ReportsPage() {
  const { isAdmin, isManager } = useAuth();
  const canManage = isAdmin || isManager;

  const [selectedMonth, setSelectedMonth] = useState(() => startOfMonth(new Date()));
  const [selectedFunnelId, setSelectedFunnelId] = useState<string | null>(null);
  const [customPeriodStart, setCustomPeriodStart] = useState<string | undefined>(undefined);
  const [customPeriodEnd, setCustomPeriodEnd] = useState<string | undefined>(undefined);
  const [sdrDialogOpen, setSdrDialogOpen] = useState(false);
  const [sdrDialogType, setSdrDialogType] = useState<'sdr' | 'social_selling'>('sdr');

  const monthPeriod = useMemo(() => getMonthPeriod(selectedMonth), [selectedMonth]);

  const periodStart = customPeriodStart || monthPeriod.periodStart;
  const periodEnd = customPeriodEnd || monthPeriod.periodEnd;

  const handlePeriodChange = (start: string | undefined, end: string | undefined) => {
    setCustomPeriodStart(start);
    setCustomPeriodEnd(end);
  };

  const { data: summaries, isLoading } = useAllFunnelsSummary(periodStart, periodEnd);
  const { data: detailedReport } = useFunnelReport(
    selectedFunnelId || undefined,
    periodStart,
    periodEnd
  );
  const { data: personProductData, isLoading: isLoadingPersonProduct } = useSalesByPersonAndProduct(periodStart, periodEnd);

  const displayedSummaries = useMemo(() => {
    if (!summaries) return [];
    return selectedFunnelId ? summaries.filter(f => f.funnel_id === selectedFunnelId) : summaries;
  }, [summaries, selectedFunnelId]);

  const totals = useMemo(() => {
    if (!displayedSummaries || displayedSummaries.length === 0) return null;
    return {
      leads: displayedSummaries.reduce((s, f) => s + Number(f.total_leads), 0),
      qualified: displayedSummaries.reduce((s, f) => s + Number(f.total_qualified), 0),
      scheduled: displayedSummaries.reduce((s, f) => s + Number(f.total_calls_scheduled), 0),
      done: displayedSummaries.reduce((s, f) => s + Number(f.total_calls_done), 0),
      sales: displayedSummaries.reduce((s, f) => s + Number(f.total_sales), 0),
      revenue: displayedSummaries.reduce((s, f) => s + Number(f.total_revenue), 0),
    };
  }, [displayedSummaries]);

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-primary/10">
            <FileText size={28} className="text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Relatórios por Funil</h1>
            <p className="text-muted-foreground">Visão consolidada de todos os funis</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {canManage && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" className="gap-1.5">
                  <Plus size={16} />
                  Adicionar Métrica
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => { setSdrDialogType('sdr'); setSdrDialogOpen(true); }}>
                  Métrica SDR
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setSdrDialogType('social_selling'); setSdrDialogOpen(true); }}>
                  Métrica Social Selling
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <PeriodFilter
            periodStart={customPeriodStart}
            periodEnd={customPeriodEnd}
            onPeriodChange={handlePeriodChange}
          />
          <MonthSelector selectedMonth={selectedMonth} onMonthChange={(m) => { setSelectedMonth(m); setCustomPeriodStart(undefined); setCustomPeriodEnd(undefined); }} />
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="by-product">Por Produto</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Funnel filter */}
          <div className="flex items-center gap-2">
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

          {/* Funnel Chart */}
          {detailedReport && selectedFunnelId && (
            <FunnelChart report={detailedReport} />
          )}

          {/* Funnel Data Table */}
          {displayedSummaries.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">Desempenho por Funil</h2>
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Funil</TableHead>
                      <TableHead className="text-right">Leads</TableHead>
                      <TableHead className="text-right">Qualificados</TableHead>
                      <TableHead className="text-right">Agendadas</TableHead>
                      <TableHead className="text-right">Realizadas</TableHead>
                      <TableHead className="text-right">Vendas</TableHead>
                      <TableHead className="text-right">Faturamento</TableHead>
                      <TableHead className="text-right">Conversão</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayedSummaries.map((f) => (
                      <TableRow key={f.funnel_id}>
                        <TableCell className="font-medium">{f.funnel_name}</TableCell>
                        <TableCell className="text-right">{Number(f.total_leads)}</TableCell>
                        <TableCell className="text-right">{Number(f.total_qualified)}</TableCell>
                        <TableCell className="text-right">{Number(f.total_calls_scheduled)}</TableCell>
                        <TableCell className="text-right">{Number(f.total_calls_done)}</TableCell>
                        <TableCell className="text-right">{Number(f.total_sales)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(Number(f.total_revenue))}</TableCell>
                        <TableCell className="text-right font-semibold">{Number(f.conversion_rate).toFixed(1)}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="by-product" className="space-y-6">
          <ProductSalesTable data={personProductData || []} isLoading={isLoadingPersonProduct} periodStart={periodStart} periodEnd={periodEnd} canEdit={canManage} />
        </TabsContent>
      </Tabs>

      {canManage && (
        <SDRMetricsDialog
          open={sdrDialogOpen}
          onOpenChange={setSdrDialogOpen}
          sdrType={sdrDialogType}
        />
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
