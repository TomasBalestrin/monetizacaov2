import React from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { useSyncSquadSheets, useSquadSheetsConfig } from '@/hooks/useSquadSheetsConfig';

interface SquadSyncButtonProps {
  squadSlug: string;
}

export function SquadSyncButton({ squadSlug }: SquadSyncButtonProps) {
  const { data: config } = useSquadSheetsConfig(squadSlug);
  const { mutate: syncSheets, isPending: isSyncing } = useSyncSquadSheets(squadSlug);

  // Don't show button if not connected
  if (!config?.spreadsheet_id) {
    return null;
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => syncSheets()}
      disabled={isSyncing}
    >
      <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
      {isSyncing ? 'Sincronizando...' : 'Sincronizar'}
    </Button>
  );
}
