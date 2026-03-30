import React, { useMemo, useState } from 'react';
import { Filter, Users, Phone, Package } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { type PersonProductSales } from '@/controllers/useFunnelController';
import { MetricCardSkeletonGrid } from '@/components/dashboard/skeletons';

interface ProductSalesTableProps {
  data: PersonProductSales[];
  isLoading: boolean;
}

function formatCurrency(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

export function ProductSalesTable({ data, isLoading }: ProductSalesTableProps) {
  const [selectedFunnel, setSelectedFunnel] = useState<string>('all');
  const [selectedProduct, setSelectedProduct] = useState<string>('all');

  const funnelNames = useMemo(() => {
    if (!data) return [];
    return [...new Set(data.map(d => d.funnel_name).filter(Boolean))].sort();
  }, [data]);

  const productNames = useMemo(() => {
    if (!data) return [];
    return [...new Set(data.map(d => d.product_name).filter(n => n && n !== ''))].sort();
  }, [data]);

  const filtered = useMemo(() => {
    if (!data) return [];
    let result = data;
    if (selectedFunnel !== 'all') result = result.filter(d => d.funnel_name === selectedFunnel);
    if (selectedProduct !== 'all') result = result.filter(d => d.product_name === selectedProduct);
    return result;
  }, [data, selectedFunnel, selectedProduct]);

  // Split by role
  const sdrRows = useMemo(() => filtered.filter(r => r.person_type === 'sdr' || r.person_type === 'social_selling'), [filtered]);
  const closerRows = useMemo(() => filtered.filter(r => r.person_type === 'closer'), [filtered]);

  // Aggregate by person
  const aggregateByPerson = (rows: PersonProductSales[]) => {
    const map = new Map<string, { person_id: string; person_name: string; person_type: string; total_sales: number; total_revenue: number; total_leads: number; total_scheduled: number; total_done: number; total_entries: number }>();
    rows.forEach(row => {
      const key = `${row.person_name}-${row.person_type}`;
      const existing = map.get(key) || { person_id: row.person_id, person_name: row.person_name, person_type: row.person_type, total_sales: 0, total_revenue: 0, total_leads: 0, total_scheduled: 0, total_done: 0, total_entries: 0 };
      existing.total_sales += Number(row.total_sales);
      existing.total_revenue += Number(row.total_revenue);
      existing.total_leads += Number(row.total_leads);
      existing.total_scheduled += Number(row.total_scheduled);
      existing.total_done += Number(row.total_done);
      existing.total_entries += Number(row.total_entries);
      map.set(key, existing);
    });
    return [...map.values()];
  };

  const isFiltered = selectedFunnel !== 'all' || selectedProduct !== 'all';

  const sdrPersonTotals = useMemo(() =>
    aggregateByPerson(sdrRows).sort((a, b) => b.total_scheduled - a.total_scheduled),
    [sdrRows]
  );

  const closerPersonTotals = useMemo(() =>
    aggregateByPerson(closerRows).sort((a, b) => b.total_sales - a.total_sales),
    [closerRows]
  );

  const sdrGrandTotal = useMemo(() => ({
    leads: sdrPersonTotals.reduce((s, p) => s + p.total_leads, 0),
    scheduled: sdrPersonTotals.reduce((s, p) => s + p.total_scheduled, 0),
    done: sdrPersonTotals.reduce((s, p) => s + p.total_done, 0),
  }), [sdrPersonTotals]);

  const closerGrandTotal = useMemo(() => ({
    done: closerPersonTotals.reduce((s, p) => s + p.total_done, 0),
    sales: closerPersonTotals.reduce((s, p) => s + p.total_sales, 0),
    revenue: closerPersonTotals.reduce((s, p) => s + p.total_revenue, 0),
    entries: closerPersonTotals.reduce((s, p) => s + p.total_entries, 0),
  }), [closerPersonTotals]);

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
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Users size={20} />
          Vendas por Pessoa
        </h2>
        <div className="flex items-center gap-2">
          <Select value={selectedFunnel} onValueChange={setSelectedFunnel}>
            <SelectTrigger className="w-[200px]">
              <Filter size={16} className="mr-2 text-muted-foreground" />
              <SelectValue placeholder="Todos os Funis" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Funis</SelectItem>
              {funnelNames.map(f => (
                <SelectItem key={f} value={f}>{f}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {productNames.length > 0 && (
            <Select value={selectedProduct} onValueChange={setSelectedProduct}>
              <SelectTrigger className="w-[200px]">
                <Package size={16} className="mr-2 text-muted-foreground" />
                <SelectValue placeholder="Todos os Produtos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Produtos</SelectItem>
                {productNames.map(p => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* SDRs & Social Selling Table */}
      {sdrPersonTotals.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Users size={16} />
            SDRs & Social Selling
          </h3>
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead className="text-right">Leads</TableHead>
                  <TableHead className="text-right">Agendados</TableHead>
                  <TableHead className="text-right">Realizados</TableHead>
                  <TableHead className="text-right">% Agend.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sdrPersonTotals.map((p, i) => {
                  const scheduledRate = p.total_leads > 0 ? (p.total_scheduled / p.total_leads) * 100 : 0;
                  return (
                    <TableRow key={i}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {p.person_name}
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${
                            p.person_type === 'social_selling'
                              ? 'bg-violet-500/15 text-violet-500'
                              : 'bg-blue-500/15 text-blue-500'
                          }`}>
                            {p.person_type === 'social_selling' ? 'SS' : 'SDR'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{p.total_leads}</TableCell>
                      <TableCell className="text-right">{p.total_scheduled}</TableCell>
                      <TableCell className="text-right">{p.total_done}</TableCell>
                      <TableCell className="text-right font-semibold">
                        {scheduledRate.toFixed(1)}%
                      </TableCell>
                    </TableRow>
                  );
                })}
                {sdrPersonTotals.length > 1 && (
                  <TableRow className="bg-muted/50 font-semibold">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-right">{sdrGrandTotal.leads}</TableCell>
                    <TableCell className="text-right">{sdrGrandTotal.scheduled}</TableCell>
                    <TableCell className="text-right">{sdrGrandTotal.done}</TableCell>
                    <TableCell className="text-right">
                      {sdrGrandTotal.leads > 0
                        ? ((sdrGrandTotal.scheduled / sdrGrandTotal.leads) * 100).toFixed(1)
                        : '0.0'}%
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Closers Table */}
      {closerPersonTotals.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Phone size={16} />
            Closers
          </h3>
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead className="text-right">Calls</TableHead>
                  <TableHead className="text-right">Vendas</TableHead>
                  <TableHead className="text-right">Faturamento</TableHead>
                  <TableHead className="text-right">Entradas</TableHead>
                  <TableHead className="text-right">% Conv.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {closerPersonTotals.map((p, i) => {
                  const conversionRate = p.total_done > 0 ? (p.total_sales / p.total_done) * 100 : 0;
                  return (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{p.person_name}</TableCell>
                      <TableCell className="text-right">{p.total_done}</TableCell>
                      <TableCell className="text-right">{p.total_sales}</TableCell>
                      <TableCell className="text-right">{formatCurrency(p.total_revenue)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(p.total_entries)}</TableCell>
                      <TableCell className="text-right font-semibold">
                        {conversionRate.toFixed(1)}%
                      </TableCell>
                    </TableRow>
                  );
                })}
                {closerPersonTotals.length > 1 && (
                  <TableRow className="bg-muted/50 font-semibold">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-right">{closerGrandTotal.done}</TableCell>
                    <TableCell className="text-right">{closerGrandTotal.sales}</TableCell>
                    <TableCell className="text-right">{formatCurrency(closerGrandTotal.revenue)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(closerGrandTotal.entries)}</TableCell>
                    <TableCell className="text-right">
                      {closerGrandTotal.done > 0
                        ? ((closerGrandTotal.sales / closerGrandTotal.done) * 100).toFixed(1)
                        : '0.0'}%
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
