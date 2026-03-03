import React, { useMemo, useState } from 'react';
import { Filter, Users, Package } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { type PersonProductSales } from '@/hooks/useFunnels';
import { MetricCardSkeletonGrid } from '@/components/dashboard/skeletons';

interface ProductSalesTableProps {
  data: PersonProductSales[];
  isLoading: boolean;
}

export function ProductSalesTable({ data, isLoading }: ProductSalesTableProps) {
  const [selectedProduct, setSelectedProduct] = useState<string>('all');

  const products = useMemo(() => {
    if (!data) return [];
    return [...new Set(data.map(d => d.funnel_name))].sort();
  }, [data]);

  const filtered = useMemo(() => {
    if (!data) return [];
    return selectedProduct === 'all' ? data : data.filter(d => d.funnel_name === selectedProduct);
  }, [data, selectedProduct]);

  // Group by person for totals
  const personTotals = useMemo(() => {
    const map = new Map<string, { person_name: string; person_type: string; total_sales: number; total_revenue: number; total_leads: number; total_done: number }>();
    filtered.forEach(row => {
      const key = `${row.person_name}-${row.person_type}`;
      const existing = map.get(key) || { person_name: row.person_name, person_type: row.person_type, total_sales: 0, total_revenue: 0, total_leads: 0, total_done: 0 };
      existing.total_sales += Number(row.total_sales);
      existing.total_revenue += Number(row.total_revenue);
      existing.total_leads += Number(row.total_leads);
      existing.total_done += Number(row.total_done);
      map.set(key, existing);
    });
    return [...map.values()].sort((a, b) => b.total_sales - a.total_sales);
  }, [filtered]);

  const grandTotal = useMemo(() => ({
    sales: personTotals.reduce((s, p) => s + p.total_sales, 0),
    revenue: personTotals.reduce((s, p) => s + p.total_revenue, 0),
    leads: personTotals.reduce((s, p) => s + p.total_leads, 0),
    done: personTotals.reduce((s, p) => s + p.total_done, 0),
  }), [personTotals]);

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  const typeLabel = (t: string) => {
    if (t === 'closer') return 'Closer';
    if (t === 'sdr') return 'SDR';
    if (t === 'social_selling') return 'Social Selling';
    return t;
  };

  if (isLoading) return <MetricCardSkeletonGrid count={4} />;

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Package size={48} className="mx-auto mb-4 opacity-50" />
        <p>Nenhum dado de vendas por produto encontrado para o período.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Users size={20} />
          Vendas por Pessoa × Produto
        </h2>
        <Select value={selectedProduct} onValueChange={setSelectedProduct}>
          <SelectTrigger className="w-[220px]">
            <Filter size={16} className="mr-2 text-muted-foreground" />
            <SelectValue placeholder="Todos os Produtos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Produtos</SelectItem>
            {products.map(p => (
              <SelectItem key={p} value={p}>{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Detail rows when a specific product is selected */}
      {selectedProduct !== 'all' ? (
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Leads</TableHead>
                <TableHead className="text-right">Realizadas</TableHead>
                <TableHead className="text-right">Vendas</TableHead>
                <TableHead className="text-right">Faturamento</TableHead>
                <TableHead className="text-right">Conversão</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((row, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{row.person_name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">{typeLabel(row.person_type)}</Badge>
                  </TableCell>
                  <TableCell className="text-right">{Number(row.total_leads)}</TableCell>
                  <TableCell className="text-right">{Number(row.total_done)}</TableCell>
                  <TableCell className="text-right">{Number(row.total_sales)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(Number(row.total_revenue))}</TableCell>
                  <TableCell className="text-right font-semibold">
                    {Number(row.total_done) > 0
                      ? ((Number(row.total_sales) / Number(row.total_done)) * 100).toFixed(1)
                      : '0.0'}%
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length > 1 && (
                <TableRow className="bg-muted/50 font-semibold">
                  <TableCell>Total</TableCell>
                  <TableCell></TableCell>
                  <TableCell className="text-right">{grandTotal.leads}</TableCell>
                  <TableCell className="text-right">{grandTotal.done}</TableCell>
                  <TableCell className="text-right">{grandTotal.sales}</TableCell>
                  <TableCell className="text-right">{formatCurrency(grandTotal.revenue)}</TableCell>
                  <TableCell className="text-right">
                    {grandTotal.done > 0 ? ((grandTotal.sales / grandTotal.done) * 100).toFixed(1) : '0.0'}%
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      ) : (
        /* Aggregated view: one row per person with totals across all products */
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Leads</TableHead>
                <TableHead className="text-right">Realizadas</TableHead>
                <TableHead className="text-right">Vendas</TableHead>
                <TableHead className="text-right">Faturamento</TableHead>
                <TableHead className="text-right">Conversão</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {personTotals.map((p, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{p.person_name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">{typeLabel(p.person_type)}</Badge>
                  </TableCell>
                  <TableCell className="text-right">{p.total_leads}</TableCell>
                  <TableCell className="text-right">{p.total_done}</TableCell>
                  <TableCell className="text-right">{p.total_sales}</TableCell>
                  <TableCell className="text-right">{formatCurrency(p.total_revenue)}</TableCell>
                  <TableCell className="text-right font-semibold">
                    {p.total_done > 0 ? ((p.total_sales / p.total_done) * 100).toFixed(1) : '0.0'}%
                  </TableCell>
                </TableRow>
              ))}
              {personTotals.length > 1 && (
                <TableRow className="bg-muted/50 font-semibold">
                  <TableCell>Total</TableCell>
                  <TableCell></TableCell>
                  <TableCell className="text-right">{grandTotal.leads}</TableCell>
                  <TableCell className="text-right">{grandTotal.done}</TableCell>
                  <TableCell className="text-right">{grandTotal.sales}</TableCell>
                  <TableCell className="text-right">{formatCurrency(grandTotal.revenue)}</TableCell>
                  <TableCell className="text-right">
                    {grandTotal.done > 0 ? ((grandTotal.sales / grandTotal.done) * 100).toFixed(1) : '0.0'}%
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
