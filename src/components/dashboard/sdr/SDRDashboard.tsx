import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Phone, Users, UserCheck, Calendar, TrendingUp, ShoppingCart } from 'lucide-react';
import { PeriodFilter } from '@/components/dashboard/PeriodFilter';
import { SDRTypeToggle, SDRType } from './SDRTypeToggle';
import { SDRMetricCard } from './SDRMetricCard';
import { SDRCard } from './SDRCard';
import { SDRDetailPage } from './SDRDetailPage';
import { SDRSheetsConfig } from './SDRSheetsConfig';
import { useSDRTotalMetrics, useSDRsWithMetrics } from '@/hooks/useSdrMetrics';
import { useSDRSheetsConfig } from '@/hooks/useSDRSheetsConfig';
import { Skeleton } from '@/components/ui/skeleton';

export function SDRDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [sdrType, setSdrType] = useState<SDRType>('sdr');
  const [periodStart, setPeriodStart] = useState<string | undefined>();
  const [periodEnd, setPeriodEnd] = useState<string | undefined>();

  // Check if viewing a specific SDR
  const selectedSdrId = searchParams.get('sdr');

  const { data: totalMetrics, isLoading: isLoadingTotal } = useSDRTotalMetrics(
    sdrType,
    periodStart,
    periodEnd
  );

  const { data: sdrsWithMetrics, isLoading: isLoadingSDRs } = useSDRsWithMetrics(
    sdrType,
    periodStart,
    periodEnd
  );

  const { data: sheetsConfig, isLoading: isLoadingConfig } = useSDRSheetsConfig();
  const isConnected = !!sheetsConfig?.spreadsheet_id;

  const handlePeriodChange = (start: string | undefined, end: string | undefined) => {
    setPeriodStart(start);
    setPeriodEnd(end);
  };

  const handleSDRClick = (sdrId: string) => {
    setSearchParams({ module: 'sdrs', sdr: sdrId });
  };

  const handleBackToDashboard = () => {
    setSearchParams({ module: 'sdrs' });
  };

  // If a specific SDR is selected, render the detail page
  if (selectedSdrId) {
    return (
      <SDRDetailPage
        sdrId={selectedSdrId}
        periodStart={periodStart}
        periodEnd={periodEnd}
        onPeriodChange={handlePeriodChange}
        onBack={handleBackToDashboard}
      />
    );
  }

  const isLoading = isLoadingTotal || isLoadingSDRs || isLoadingConfig;
  const hasData = sdrsWithMetrics && sdrsWithMetrics.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-primary/10">
            <Phone size={28} className="text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard SDR</h1>
            <p className="text-muted-foreground">
              Métricas consolidadas de {sdrType === 'sdr' ? 'SDRs' : 'Social Selling'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <SDRTypeToggle value={sdrType} onChange={setSdrType} />
          <PeriodFilter
            periodStart={periodStart}
            periodEnd={periodEnd}
            onPeriodChange={handlePeriodChange}
          />
        </div>
      </div>

      {/* Sheets Configuration - compact when connected, prominent when not */}
      {!isLoading && (
        <SDRSheetsConfig variant={isConnected && hasData ? 'compact' : 'prominent'} />
      )}

      {/* Consolidated Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {isLoading ? (
          Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))
        ) : (
          <>
            <SDRMetricCard
              title="Ativados"
              value={totalMetrics?.totalActivated || 0}
              icon={Users}
            />
            <SDRMetricCard
              title="Agendados"
              value={totalMetrics?.totalScheduled || 0}
              icon={Calendar}
            />
            <SDRMetricCard
              title="% Agendamento"
              value={totalMetrics?.avgScheduledRate || 0}
              isPercentage
              showProgress
              icon={TrendingUp}
            />
            <SDRMetricCard
              title="Agend. no dia"
              value={totalMetrics?.totalScheduledSameDay || 0}
              icon={UserCheck}
            />
            <SDRMetricCard
              title="Realizados"
              value={totalMetrics?.totalAttended || 0}
              icon={UserCheck}
            />
            <SDRMetricCard
              title="% Comparec."
              value={totalMetrics?.avgAttendanceRate || 0}
              isPercentage
              showProgress
              icon={TrendingUp}
            />
            <SDRMetricCard
              title="Vendas"
              value={totalMetrics?.totalSales || 0}
              icon={ShoppingCart}
              variant="highlight"
            />
          </>
        )}
      </div>

      {/* SDR List */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">
          {sdrType === 'sdr' ? 'SDRs' : 'Social Selling'} Individuais
        </h2>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-xl" />
            ))}
          </div>
        ) : sdrsWithMetrics && sdrsWithMetrics.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sdrsWithMetrics.map((sdr) => (
              <SDRCard
                key={sdr.id}
                sdr={sdr}
                onClick={() => handleSDRClick(sdr.id)}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 bg-card rounded-xl border border-border">
            <Phone size={48} className="text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Nenhum {sdrType === 'sdr' ? 'SDR' : 'Social Selling'} cadastrado
            </h3>
            <p className="text-muted-foreground text-center max-w-md">
              {isConnected 
                ? 'Clique em "Sincronizar" acima para importar os dados da planilha.'
                : 'Conecte uma planilha do Google Sheets acima para importar os dados.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
