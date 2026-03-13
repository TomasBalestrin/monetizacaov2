import React, { useState, useMemo, useCallback } from 'react';
import { FileText, TrendingUp, Users, Phone, DollarSign, Target, Filter, Plus, Package } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { MonthSelector, getMonthPeriod } from '@/components/dashboard/MonthSelector';
import { PeriodFilter } from '@/components/dashboard/PeriodFilter';
import { useAllFunnelsSummary, useFunnelReport, useSalesByPersonAndProduct, useProductSummary, useProducts, type FunnelSummary } from '@/controllers/useFunnelController';
import { useMetrics } from '@/controllers/useCloserController';
import { MetricCardSkeletonGrid } from '@/components/dashboard/skeletons';
import { FunnelChart } from './FunnelChart';
import { ProductSalesTable } from './ProductSalesTable';
import { ProductSummaryView } from './ProductSummaryView';
import { EditableCell } from './EditableCell';
import { SDRMetricsDialog } from '@/components/dashboard/sdr/SDRMetricsDialog';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
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
  const { isAdmin, isManager, hasPermission } = useAuth();
  const canManage = isAdmin || isManager || hasPermission('reports');

  const [selectedMonth, setSelectedMonth] = useState(() => startOfMonth(new Date()));
  const [selectedFunnelId, setSelectedFunnelId] = useState<string | null>(null);
  const [customPeriodStart, setCustomPeriodStart] = useState<string | undefined>(undefined);
  const [customPeriodEnd, setCustomPeriodEnd] = useState<string | undefined>(undefined);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
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
  const { data: productSummaryData, isLoading: isLoadingProductSummary } = useProductSummary(periodStart, periodEnd);
  const { data: allProducts } = useProducts();
  const { data: allMetrics } = useMetrics(periodStart, periodEnd);
  const availableProducts = allProducts || [];

  const displayedSummaries = useMemo(() => {
    if (!summaries) return [];

    // When a product is selected, re-aggregate from metrics table
    if (selectedProductId && allMetrics) {
      const filtered = allMetrics.filter(m => m.product_id === selectedProductId);
      const byFunnel = new Map<string, FunnelSummary>();

      for (const m of filtered) {
        const fid = m.funnel_id || 'no-funnel';
        const fname = m.funnel?.name || 'Sem Funil';
        const existing = byFunnel.get(fid);
        if (existing) {
          existing.total_calls_done += m.calls || 0;
          existing.total_sales += m.sales || 0;
          existing.total_revenue += m.revenue || 0;
          existing.total_entries += (m.entries || 0);
        } else {
          byFunnel.set(fid, {
            funnel_id: fid,
            funnel_name: fname,
            category: null,
            total_leads: 0,
            total_qualified: 0,
            total_calls_scheduled: 0,
            total_calls_done: m.calls || 0,
            total_sales: m.sales || 0,
            total_revenue: m.revenue || 0,
            total_entries: m.entries || 0,
            leads_to_qualified_rate: 0,
            conversion_rate: 0,
          });
        }
      }

      const result = Array.from(byFunnel.values()).map(s => ({
        ...s,
        conversion_rate: s.total_calls_done > 0 ? (s.total_sales / s.total_calls_done) * 100 : 0,
      }));

      return selectedFunnelId ? result.filter(f => f.funnel_id === selectedFunnelId) : result;
    }

    return selectedFunnelId ? summaries.filter(f => f.funnel_id === selectedFunnelId) : summaries;
  }, [summaries, selectedFunnelId, selectedProductId, allMetrics]);

  const totals = useMemo(() => {
    if (!displayedSummaries || displayedSummaries.length === 0) return null;
    return {
      leads: displayedSummaries.reduce((s, f) => s + Number(f.total_leads), 0),
      qualified: displayedSummaries.reduce((s, f) => s + Number(f.total_qualified), 0),
      scheduled: displayedSummaries.reduce((s, f) => s + Number(f.total_calls_scheduled), 0),
      done: displayedSummaries.reduce((s, f) => s + Number(f.total_calls_done), 0),
      sales: displayedSummaries.reduce((s, f) => s + Number(f.total_sales), 0),
      revenue: displayedSummaries.reduce((s, f) => s + Number(f.total_revenue), 0),
      entries: displayedSummaries.reduce((s, f) => s + Number(f.total_entries || 0), 0),
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
          {canManage && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" className="rounded-xl h-8 text-xs gap-1.5">
                  <Plus size={14} />
                  Metrica
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => { setSdrDialogType('sdr'); setSdrDialogOpen(true); }}>
                  Métrica SDR
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setSdrDialogType('social_selling'); setSdrDialogOpen(true); }}>
                  Métrica Social Selling
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
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
          <TabsTrigger value="overview">Por Funil</TabsTrigger>
          <TabsTrigger value="by-product">Por Produto</TabsTrigger>
          <TabsTrigger value="by-person">Por Pessoa</TabsTrigger>
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
            {availableProducts.length > 0 && (
              <Select
                value={selectedProductId || 'all'}
                onValueChange={(v) => setSelectedProductId(v === 'all' ? null : v)}
              >
                <SelectTrigger className="w-[200px]">
                  <Package size={16} className="mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Todos os Produtos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Produtos</SelectItem>
                  {availableProducts.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Total Cards */}
          {isLoading ? (
            <MetricCardSkeletonGrid count={6} />
          ) : totals ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <SummaryCard icon={Users} title="Leads" value={totals.leads} />
              <SummaryCard icon={Phone} title="Agendadas" value={totals.scheduled} />
              <SummaryCard icon={Phone} title="Realizadas" value={totals.done} />
              <SummaryCard icon={TrendingUp} title="Vendas" value={totals.sales} />
              <SummaryCard icon={DollarSign} title="Faturamento" value={formatCurrency(totals.revenue)} />
              <SummaryCard icon={DollarSign} title="Entradas" value={formatCurrency(totals.entries)} />
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
                      <TableHead className="text-right">Agendadas</TableHead>
                      <TableHead className="text-right">Realizadas</TableHead>
                      <TableHead className="text-right">Vendas</TableHead>
                      <TableHead className="text-right">Faturamento</TableHead>
                      <TableHead className="text-right">Entradas</TableHead>
                      <TableHead className="text-right">Conversão</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayedSummaries.map((f) => (
                      <FunnelRow key={f.funnel_id} funnel={f} canEdit={canManage} periodStart={periodStart} periodEnd={periodEnd} formatCurrency={formatCurrency} />
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="by-product" className="space-y-6">
          <ProductSummaryView data={productSummaryData || []} isLoading={isLoadingProductSummary} />
        </TabsContent>

        <TabsContent value="by-person" className="space-y-6">
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

function FunnelRow({ funnel: f, canEdit, periodStart, periodEnd, formatCurrency }: {
  funnel: FunnelSummary;
  canEdit: boolean;
  periodStart: string;
  periodEnd: string;
  formatCurrency: (v: number) => string;
}) {
  const queryClient = useQueryClient();

  const handleSave = async (field: 'leads' | 'qualified' | 'scheduled' | 'done' | 'sales' | 'revenue' | 'entries', newValue: number) => {
    const currentValues: Record<string, number> = {
      leads: Number(f.total_leads),
      qualified: Number(f.total_qualified),
      scheduled: Number(f.total_calls_scheduled),
      done: Number(f.total_calls_done),
      sales: Number(f.total_sales),
      revenue: Number(f.total_revenue),
      entries: Number(f.total_entries || 0),
    };
    const delta = newValue - currentValues[field];
    if (delta === 0) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;

      // Map field to funnel_daily_data columns
      const fieldMap: Record<string, string> = {
        leads: 'leads_count',
        qualified: 'qualified_count',
        scheduled: 'calls_scheduled',
        done: 'calls_done',
        sales: 'sales_count',
        revenue: 'sales_value',
        entries: 'entries_value',
      };

      const insertData: Record<string, unknown> = {
        user_id: userId,
        funnel_id: f.funnel_id,
        date: periodEnd,
        created_by: userId,
        [fieldMap[field]]: delta,
      };

      const { error } = await supabase.from('funnel_daily_data').insert(insertData as any);
      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['funnels-summary'] });
      queryClient.invalidateQueries({ queryKey: ['funnel-report'] });
      queryClient.invalidateQueries({ queryKey: ['sales-by-person-product'] });
      toast.success('Valor atualizado!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao salvar valor');
    }
  };

  return (
    <TableRow>
      <TableCell className="font-medium">{f.funnel_name}</TableCell>
      <TableCell className="text-right">
        <EditableCell value={Number(f.total_leads)} onSave={(v) => handleSave('leads', v)} disabled={!canEdit} />
      </TableCell>
      <TableCell className="text-right">
        <EditableCell value={Number(f.total_calls_scheduled)} onSave={(v) => handleSave('scheduled', v)} disabled={!canEdit} />
      </TableCell>
      <TableCell className="text-right">
        <EditableCell value={Number(f.total_calls_done)} onSave={(v) => handleSave('done', v)} disabled={!canEdit} />
      </TableCell>
      <TableCell className="text-right">
        <EditableCell value={Number(f.total_sales)} onSave={(v) => handleSave('sales', v)} disabled={!canEdit} />
      </TableCell>
      <TableCell className="text-right">
        <EditableCell value={Number(f.total_revenue)} onSave={(v) => handleSave('revenue', v)} disabled={!canEdit} isCurrency />
      </TableCell>
      <TableCell className="text-right">
        <EditableCell value={Number(f.total_entries || 0)} onSave={(v) => handleSave('entries', v)} disabled={!canEdit} isCurrency />
      </TableCell>
      <TableCell className="text-right font-semibold">{Number(f.conversion_rate).toFixed(1)}%</TableCell>
    </TableRow>
  );
}
