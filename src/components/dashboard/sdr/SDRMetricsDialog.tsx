import React from 'react';
import { Plus, TrendingUp } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { SDRMetricsForm, type SDRMetricsFormValues } from './SDRMetricsForm';
import { useCreateSDRMetric } from '@/hooks/useSdrMetrics';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface SDRMetricsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sdrType: 'sdr' | 'social_selling';
  defaultSdrId?: string;
}

export function SDRMetricsDialog({
  open,
  onOpenChange,
  sdrType,
  defaultSdrId,
}: SDRMetricsDialogProps) {
  const createMetric = useCreateSDRMetric();

  const handleSubmit = async (values: SDRMetricsFormValues) => {
    try {
      await createMetric.mutateAsync({
        sdr_id: values.sdr_id,
        date: format(values.date, 'yyyy-MM-dd'),
        funnel: values.funnel || null,
        activated: values.activated,
        scheduled: values.scheduled,
        scheduled_same_day: values.scheduled_same_day,
        attended: values.attended,
        sales: values.sales,
        source: 'manual',
      });

      toast.success('Métrica adicionada com sucesso!');
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating SDR metric:', error);
      toast.error('Erro ao adicionar métrica');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto bg-background/95 backdrop-blur-sm border-border/50">
        <DialogHeader className="pb-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold">
                Nova Métrica {sdrType === 'sdr' ? 'SDR' : 'Social Selling'}
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                Insira os dados de desempenho manualmente
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <SDRMetricsForm
          sdrType={sdrType}
          defaultSdrId={defaultSdrId}
          onSubmit={handleSubmit}
          isLoading={createMetric.isPending}
        />
      </DialogContent>
    </Dialog>
  );
}
