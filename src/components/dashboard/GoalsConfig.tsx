import React, { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Loader2, Save, Target } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MonthSelector } from '@/components/dashboard/MonthSelector';
import { useClosers, useCloserMetrics } from '@/controllers/useCloserController';
import { useSDRs, useSDRMetrics } from '@/controllers/useSdrController';
import { useAllGoals, useUpsertGoal, CLOSER_METRIC_KEYS, SDR_METRIC_KEYS } from '@/controllers/useGoalController';
import { useAuth } from '@/contexts/AuthContext';

export function GoalsConfig() {
  const { isAdmin, isManager, permissions } = useAuth();
  const [entityType, setEntityType] = useState<'closer' | 'sdr'>('closer');
  const [selectedEntityId, setSelectedEntityId] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<Date>(startOfMonth(new Date()));
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const { data: closers } = useClosers();
  const { data: sdrs } = useSDRs();
  const upsertGoal = useUpsertGoal();

  const monthStr = format(selectedMonth, 'yyyy-MM-dd');
  const periodStart = format(startOfMonth(selectedMonth), 'yyyy-MM-dd');
  const periodEnd = format(endOfMonth(selectedMonth), 'yyyy-MM-dd');
  const { data: existingGoals, isLoading } = useAllGoals(monthStr);

  // Fetch current metrics for the selected entity
  const { data: closerMetrics } = useCloserMetrics(
    entityType === 'closer' ? selectedEntityId : '',
    periodStart,
    periodEnd
  );
  const { data: sdrMetrics } = useSDRMetrics(
    entityType === 'sdr' ? selectedEntityId : undefined,
    periodStart,
    periodEnd
  );

  // Aggregate current values to show alongside goal inputs
  const currentValues = useMemo(() => {
    const vals: Record<string, number> = {};
    if (entityType === 'closer' && closerMetrics) {
      vals.calls = closerMetrics.reduce((sum, m) => sum + (m.calls || 0), 0);
      vals.sales = closerMetrics.reduce((sum, m) => sum + (m.sales || 0), 0);
      vals.revenue = closerMetrics.reduce((sum, m) => sum + (m.revenue || 0), 0);
      vals.entries = closerMetrics.reduce((sum, m) => sum + (m.entries || 0), 0);
    } else if (entityType === 'sdr' && sdrMetrics) {
      vals.activated = sdrMetrics.reduce((sum, m) => sum + (m.activated || 0), 0);
      vals.scheduled = sdrMetrics.reduce((sum, m) => sum + (m.scheduled || 0), 0);
      vals.attended = sdrMetrics.reduce((sum, m) => sum + (m.attended || 0), 0);
      vals.sales = sdrMetrics.reduce((sum, m) => sum + (m.sales || 0), 0);
    }
    return vals;
  }, [entityType, closerMetrics, sdrMetrics]);

  // For managers, filter entities by their module permissions
  // Squad slugs (eagles, sharks) map to closer squads; 'sdrs' maps to SDR entities
  const managerSquadSlugs = useMemo(() => {
    if (isAdmin) return null; // admin sees all
    return permissions.filter(p => ['eagles', 'sharks'].includes(p));
  }, [isAdmin, permissions]);

  const canAccessSDRs = isAdmin || permissions.includes('sdrs');
  const canAccessClosers = isAdmin || (managerSquadSlugs && managerSquadSlugs.length > 0);

  // Available entity types for this user
  const availableTypes = useMemo(() => {
    const types: Array<{ value: 'closer' | 'sdr'; label: string }> = [];
    if (canAccessClosers) types.push({ value: 'closer', label: 'Closer' });
    if (canAccessSDRs) types.push({ value: 'sdr', label: 'SDR / Social' });
    return types;
  }, [canAccessClosers, canAccessSDRs]);

  // Auto-select first available type
  React.useEffect(() => {
    if (availableTypes.length > 0 && !availableTypes.find(t => t.value === entityType)) {
      setEntityType(availableTypes[0].value);
      setSelectedEntityId('');
    }
  }, [availableTypes]);

  const entities = useMemo(() => {
    if (entityType === 'closer') {
      const allClosers = (closers || []).map(c => ({ id: c.id, name: c.name, extra: c.squad?.name, squadSlug: c.squad?.slug }));
      if (isAdmin) return allClosers;
      // Filter by manager's squad permissions
      return allClosers.filter(c => managerSquadSlugs?.includes(c.squadSlug || ''));
    }
    return (sdrs || []).map(s => ({ id: s.id, name: s.name, extra: s.type === 'sdr' ? 'SDR' : s.type === 'funil_intensivo' ? 'Funil Int.' : 'Social', squadSlug: undefined }));
  }, [entityType, closers, sdrs, isAdmin, managerSquadSlugs]);

  const metricKeys = entityType === 'closer' ? CLOSER_METRIC_KEYS : SDR_METRIC_KEYS;

  // Load existing goals when entity changes
  const entityGoals = useMemo(() => {
    if (!existingGoals || !selectedEntityId) return {};
    const map: Record<string, number> = {};
    existingGoals
      .filter(g => g.entity_type === entityType && g.entity_id === selectedEntityId)
      .forEach(g => { map[g.metric_key] = g.target_value; });
    return map;
  }, [existingGoals, selectedEntityId, entityType]);

  // Sync values when entity goals change
  React.useEffect(() => {
    const newValues: Record<string, string> = {};
    metricKeys.forEach(({ key }) => {
      newValues[key] = entityGoals[key]?.toString() || '';
    });
    setValues(newValues);
  }, [entityGoals, entityType]);

  const handleSave = async () => {
    if (!selectedEntityId) {
      toast.error('Selecione uma entidade');
      return;
    }

    setSaving(true);
    try {
      const promises = metricKeys
        .filter(({ key }) => values[key] && parseFloat(values[key]) > 0)
        .map(({ key }) =>
          upsertGoal.mutateAsync({
            entity_type: entityType,
            entity_id: selectedEntityId,
            month: monthStr,
            metric_key: key,
            target_value: parseFloat(values[key]),
          })
        );
      await Promise.all(promises);
      toast.success('Metas salvas com sucesso!');
    } catch {
      toast.error('Erro ao salvar metas');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-lg p-6 border border-border">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-primary/10">
            <Target className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">Configurar Metas Mensais</h2>
            <p className="text-sm text-muted-foreground">Defina metas para closers e SDRs</p>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Select value={entityType} onValueChange={(v) => { setEntityType(v as 'closer' | 'sdr'); setSelectedEntityId(''); }}>
            <SelectTrigger>
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              {availableTypes.map(t => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedEntityId} onValueChange={setSelectedEntityId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {entities.map(e => (
                <SelectItem key={e.id} value={e.id}>
                  {e.name} {e.extra ? `(${e.extra})` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <MonthSelector selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} />
        </div>

        {/* Goals Form */}
        {selectedEntityId && (
          <div className="space-y-4">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {metricKeys.map(({ key, label }) => {
                    const current = currentValues[key] || 0;
                    const target = values[key] ? parseFloat(values[key]) : 0;
                    const progress = target > 0 ? Math.min((current / target) * 100, 100) : 0;
                    const isCurrency = key === 'revenue' || key === 'entries';
                    const formatCurrent = isCurrency
                      ? `R$ ${current.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : current.toLocaleString('pt-BR');

                    return (
                      <div key={key} className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium text-foreground">{label}</label>
                          {current > 0 && (
                            <span className="text-[11px] text-muted-foreground">
                              Atual: <span className="font-semibold text-foreground">{formatCurrent}</span>
                            </span>
                          )}
                        </div>
                        <Input
                          type="number"
                          min="0"
                          step="any"
                          placeholder="0"
                          value={values[key] || ''}
                          onChange={(e) => setValues(prev => ({ ...prev, [key]: e.target.value }))}
                        />
                        {target > 0 && current > 0 && (
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className={cn(
                                  'h-full rounded-full transition-all duration-500',
                                  progress >= 100 ? 'bg-green-500' :
                                  progress >= 70 ? 'bg-amber-500' :
                                  'bg-red-500'
                                )}
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            <span className={cn(
                              'text-[11px] font-semibold',
                              progress >= 100 ? 'text-green-500' :
                              progress >= 70 ? 'text-amber-500' :
                              'text-red-500'
                            )}>
                              {progress.toFixed(0)}%
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <Button onClick={handleSave} disabled={saving} className="gap-2">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Salvar Metas
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
