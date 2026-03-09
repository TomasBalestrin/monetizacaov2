import React, { useState } from 'react';
import { Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCloserActiveCalls } from '@/controllers/useScheduledCallController';
import { FinishCallDialog } from './FinishCallDialog';
import type { ScheduledCall } from '@/model/entities/scheduledCall';

interface ActiveCallBannerProps {
  closerId: string;
}

export function ActiveCallBanner({ closerId }: ActiveCallBannerProps) {
  const { data: activeCalls } = useCloserActiveCalls(closerId);
  const [finishingCall, setFinishingCall] = useState<ScheduledCall | null>(null);

  if (!activeCalls || activeCalls.length === 0) return null;

  return (
    <>
      {activeCalls.map((call) => (
        <div
          key={call.id}
          className="rounded-xl border border-amber-500/50 bg-amber-50 dark:bg-amber-950/20 p-4 flex items-center justify-between gap-4 animate-fade-in"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-900/30 shrink-0">
              <Phone className="h-5 w-5 text-amber-600 animate-pulse" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm text-amber-900 dark:text-amber-200">
                Call em Andamento
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-400 truncate">
                {call.client_name} &bull; {call.funnel?.name || '—'} &bull; SDR: {call.sdr?.name || '—'}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => setFinishingCall(call)}
            className="shrink-0"
          >
            Finalizar Call
          </Button>
        </div>
      ))}

      <FinishCallDialog
        open={!!finishingCall}
        onOpenChange={(open) => { if (!open) setFinishingCall(null); }}
        call={finishingCall}
      />
    </>
  );
}
