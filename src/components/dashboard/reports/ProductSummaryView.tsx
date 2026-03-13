import React from 'react';
import { Package, DollarSign, TrendingUp, Phone } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MetricCardSkeletonGrid } from '@/components/dashboard/skeletons';
import type { ProductSummary } from '@/model/entities/funnel';

interface ProductSummaryViewProps {
  data: ProductSummary[];
  isLoading: boolean;
}

export function ProductSummaryView({ data, isLoading }: ProductSummaryViewProps) {
  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  if (isLoading) return <MetricCardSkeletonGrid count={4} />;

  const totals = data.reduce(
    (acc, p) => ({
      sales: acc.sales + Number(p.total_sales),
      revenue: acc.revenue + Number(p.total_revenue),
      entries: acc.entries + Number(p.total_entries),
      calls: acc.calls + Number(p.total_calls),
    }),
    { sales: 0, revenue: 0, entries: 0, calls: 0 }
  );

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Package size={48} className="mx-auto mb-4 opacity-50" />
        <p>Nenhum dado de produto encontrado para o período.</p>
        <p className="text-sm mt-1">Selecione um produto ao registrar vendas para que os dados apareçam aqui.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Total Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard icon={TrendingUp} title="Vendas" value={totals.sales} />
        <SummaryCard icon={DollarSign} title="Faturamento" value={formatCurrency(totals.revenue)} />
        <SummaryCard icon={DollarSign} title="Entradas" value={formatCurrency(totals.entries)} />
        <SummaryCard icon={Phone} title="Calls" value={totals.calls} />
      </div>

      {/* Product Table */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Desempenho por Produto</h2>
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead className="text-right">Vendas</TableHead>
                <TableHead className="text-right">Faturamento</TableHead>
                <TableHead className="text-right">Entradas</TableHead>
                <TableHead className="text-right">Calls</TableHead>
                <TableHead className="text-right">Ticket Médio</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((p) => {
                const avgTicket = Number(p.total_sales) > 0
                  ? Number(p.total_revenue) / Number(p.total_sales)
                  : 0;
                return (
                  <TableRow key={p.product_id}>
                    <TableCell className="font-medium">{p.product_name}</TableCell>
                    <TableCell className="text-right">{Number(p.total_sales)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(Number(p.total_revenue))}</TableCell>
                    <TableCell className="text-right">{formatCurrency(Number(p.total_entries))}</TableCell>
                    <TableCell className="text-right">{Number(p.total_calls)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(avgTicket)}</TableCell>
                  </TableRow>
                );
              })}
              {data.length > 1 && (
                <TableRow className="bg-muted/50 font-semibold">
                  <TableCell>Total</TableCell>
                  <TableCell className="text-right">{totals.sales}</TableCell>
                  <TableCell className="text-right">{formatCurrency(totals.revenue)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(totals.entries)}</TableCell>
                  <TableCell className="text-right">{totals.calls}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(totals.sales > 0 ? totals.revenue / totals.sales : 0)}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
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
