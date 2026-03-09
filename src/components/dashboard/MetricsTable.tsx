import React, { useState } from 'react';
import { format } from 'date-fns';
import { parseDateString } from '@/lib/utils';
import { ptBR } from 'date-fns/locale';
import { Edit, Trash2, MoreHorizontal } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useMetrics, useDeleteMetric, useSquads, Metric } from '@/controllers/useCloserController';
import { MetricsDialog } from './MetricsDialog';

export function MetricsTable() {
  const [squadFilter, setSquadFilter] = useState<string>('all');
  const [editingMetric, setEditingMetric] = useState<Metric | undefined>();
  const [deletingMetricId, setDeletingMetricId] = useState<string | null>(null);

  const { data: squads } = useSquads();
  const { data: metrics, isLoading } = useMetrics();
  const deleteMetric = useDeleteMetric();

  const filteredMetrics = metrics?.filter(m => {
    if (squadFilter === 'all') return true;
    return m.closer?.squad_id === squadFilter;
  }) || [];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const handleDelete = async () => {
    if (deletingMetricId) {
      await deleteMetric.mutateAsync(deletingMetricId);
      setDeletingMetricId(null);
    }
  };

  const getSquadBadgeColor = (squadSlug?: string) => {
    switch (squadSlug) {
      case 'eagles':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'sharks':
        return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Métricas Cadastradas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Métricas Cadastradas</CardTitle>
          <Select value={squadFilter} onValueChange={setSquadFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrar por squad" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Squads</SelectItem>
              {squads?.map(squad => (
                <SelectItem key={squad.id} value={squad.id}>
                  {squad.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {filteredMetrics.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma métrica encontrada.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Closer</TableHead>
                    <TableHead>Squad</TableHead>
                    <TableHead>Período</TableHead>
                    <TableHead className="text-right">Calls</TableHead>
                    <TableHead className="text-right">Vendas</TableHead>
                    <TableHead className="text-right">Faturamento</TableHead>
                    <TableHead className="text-right">Entradas</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMetrics.map((metric) => (
                    <TableRow key={metric.id}>
                      <TableCell className="font-medium">
                        {metric.closer?.name || 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={getSquadBadgeColor(metric.closer?.squad?.slug)}
                        >
                          {metric.closer?.squad?.name || 'N/A'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(parseDateString(metric.period_start), 'dd/MM', { locale: ptBR })}
                        {' - '}
                        {format(parseDateString(metric.period_end), 'dd/MM/yy', { locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {metric.calls}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {metric.sales}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(metric.revenue)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(metric.entries)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setEditingMetric(metric)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-destructive focus:text-destructive"
                              onClick={() => setDeletingMetricId(metric.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <MetricsDialog
        open={!!editingMetric}
        onOpenChange={(open) => !open && setEditingMetric(undefined)}
        metric={editingMetric}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingMetricId} onOpenChange={(open) => !open && setDeletingMetricId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta métrica? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
