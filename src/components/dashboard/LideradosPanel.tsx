import React, { useState, useMemo } from 'react';
import { UserCheck, Phone, Users, ChevronRight, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useClosers } from '@/controllers/useCloserController';
import { useSDRs } from '@/controllers/useSdrController';
import { LideradoDetailDialog } from './LideradoDetailDialog';
import type { Closer } from '@/model/entities/closer';
import type { SDR } from '@/model/entities/sdr';

type FilterType = 'todos' | 'closer' | 'sdr' | 'social_selling' | 'funil_intensivo';

type Liderado =
  | { type: 'closer'; data: Closer }
  | { type: 'sdr' | 'social_selling' | 'funil_intensivo'; data: SDR };

const filterOptions: { value: FilterType; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'closer', label: 'Closers' },
  { value: 'sdr', label: 'SDRs' },
  { value: 'social_selling', label: 'Social Selling' },
  { value: 'funil_intensivo', label: 'Funil Intensivo' },
];

const typeLabels: Record<string, string> = {
  closer: 'Closer',
  sdr: 'SDR',
  social_selling: 'Social Selling',
  funil_intensivo: 'Funil Intensivo',
};

const typeColors: Record<string, string> = {
  closer: 'bg-blue-500/10 text-blue-600',
  sdr: 'bg-green-500/10 text-green-600',
  social_selling: 'bg-purple-500/10 text-purple-600',
  funil_intensivo: 'bg-orange-500/10 text-orange-600',
};

const typeIcons: Record<string, React.ElementType> = {
  closer: UserCheck,
  sdr: Phone,
  social_selling: Users,
  funil_intensivo: Phone,
};

export function LideradosPanel() {
  const [filter, setFilter] = useState<FilterType>('todos');
  const [selectedLiderado, setSelectedLiderado] = useState<Liderado | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: closers, isLoading: closersLoading } = useClosers();
  const { data: sdrs, isLoading: sdrsLoading } = useSDRs('sdr');
  const { data: socialSellers, isLoading: ssLoading } = useSDRs('social_selling');
  const { data: funilIntensivo, isLoading: fiLoading } = useSDRs('funil_intensivo');

  const isLoading = closersLoading || sdrsLoading || ssLoading || fiLoading;

  const allLiderados = useMemo<Liderado[]>(() => {
    const items: Liderado[] = [];
    if (closers) items.push(...closers.map(c => ({ type: 'closer' as const, data: c })));
    if (sdrs) items.push(...sdrs.map(s => ({ type: 'sdr' as const, data: s })));
    if (socialSellers) items.push(...socialSellers.map(s => ({ type: 'social_selling' as const, data: s })));
    if (funilIntensivo) items.push(...funilIntensivo.map(s => ({ type: 'funil_intensivo' as const, data: s })));
    return items.sort((a, b) => a.data.name.localeCompare(b.data.name));
  }, [closers, sdrs, socialSellers, funilIntensivo]);

  const filteredLiderados = useMemo(() => {
    if (filter === 'todos') return allLiderados;
    return allLiderados.filter(l => l.type === filter);
  }, [allLiderados, filter]);

  const handleSelect = (liderado: Liderado) => {
    setSelectedLiderado(liderado);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Gestão de Liderados</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Delegue funis e produtos, e mova closers entre squads.
        </p>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        {filterOptions.map(opt => (
          <Button
            key={opt.value}
            variant={filter === opt.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(opt.value)}
          >
            {opt.label}
          </Button>
        ))}
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredLiderados.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          Nenhum liderado encontrado.
        </div>
      ) : (
        <div className="border rounded-lg divide-y">
          {filteredLiderados.map(liderado => {
            const Icon = typeIcons[liderado.type];
            const isCloser = liderado.type === 'closer';
            const closer = isCloser ? (liderado.data as Closer) : null;

            return (
              <button
                key={`${liderado.type}-${liderado.data.id}`}
                onClick={() => handleSelect(liderado)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent/50 transition-colors text-left"
              >
                <Icon size={18} className="text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{liderado.data.name}</p>
                  {isCloser && closer?.squad && (
                    <p className="text-xs text-muted-foreground">{closer.squad.name}</p>
                  )}
                </div>
                <Badge variant="secondary" className={cn('text-xs shrink-0', typeColors[liderado.type])}>
                  {typeLabels[liderado.type]}
                </Badge>
                <ChevronRight size={16} className="text-muted-foreground shrink-0" />
              </button>
            );
          })}
        </div>
      )}

      <LideradoDetailDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        liderado={selectedLiderado}
      />
    </div>
  );
}
