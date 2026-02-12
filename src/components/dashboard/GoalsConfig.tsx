import React, { useState, useMemo } from 'react';
import { format, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Loader2, Save, Target } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MonthSelector } from '@/components/dashboard/MonthSelector';
import { useClosers } from '@/hooks/useMetrics';
import { useSDRs } from '@/hooks/useSdrMetrics';
import { useAllGoals, useUpsertGoal, CLOSER_METRIC_KEYS, SDR_METRIC_KEYS } from '@/hooks/useGoals';
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
  const { data: existingGoals, isLoading } = useAllGoals(monthStr);

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
    return (sdrs || []).map(s => ({ id: s.id, name: s.name, extra: s.type === 'sdr' ? 'SDR' : 'Social', squadSlug: undefined }));
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
                  {metricKeys.map(({ key, label }) => (
                    <div key={key} className="space-y-1.5">
                      <label className="text-sm font-medium text-foreground">{label}</label>
                      <Input
                        type="number"
                        min="0"
                        step="any"
                        placeholder="0"
                        value={values[key] || ''}
                        onChange={(e) => setValues(prev => ({ ...prev, [key]: e.target.value }))}
                      />
                    </div>
                  ))}
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
