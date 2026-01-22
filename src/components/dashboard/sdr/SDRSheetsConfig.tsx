import React, { useState } from 'react';
import { FileSpreadsheet, RefreshCw, Unlink, HelpCircle, Loader2, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  useSDRSheetsConfig,
  useSaveSDRSheetsConfig,
  useDisconnectSDRSheets,
  useSyncSDRSheets,
} from '@/hooks/useSDRSheetsConfig';

interface SDRSheetsConfigProps {
  variant?: 'prominent' | 'compact';
}

export function SDRSheetsConfig({ variant = 'prominent' }: SDRSheetsConfigProps) {
  const [spreadsheetId, setSpreadsheetId] = useState('');
  const [showHelp, setShowHelp] = useState(false);

  const { data: config, isLoading } = useSDRSheetsConfig();
  const saveConfig = useSaveSDRSheetsConfig();
  const disconnectSheets = useDisconnectSDRSheets();
  const syncSheets = useSyncSDRSheets();

  const isConnected = !!config?.spreadsheet_id;
  const isSyncing = syncSheets.isPending;
  const isConnecting = saveConfig.isPending;

  const handleConnect = () => {
    if (!spreadsheetId.trim()) return;
    saveConfig.mutate(spreadsheetId);
  };

  const handleDisconnect = () => {
    if (confirm('Deseja realmente desconectar a planilha?')) {
      disconnectSheets.mutate();
    }
  };

  const handleSync = () => {
    syncSheets.mutate();
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getSyncStatusIcon = () => {
    switch (config?.sync_status) {
      case 'success':
        return <CheckCircle size={14} className="text-green-500" />;
      case 'error':
        return <XCircle size={14} className="text-destructive" />;
      default:
        return <Clock size={14} className="text-muted-foreground" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Compact variant - shown when connected
  if (variant === 'compact' && isConnected) {
    return (
      <div className="flex flex-wrap items-center gap-3 p-3 bg-card rounded-xl border border-border">
        <div className="flex items-center gap-2">
          <FileSpreadsheet size={16} className="text-primary" />
          <span className="text-sm text-muted-foreground">Planilha conectada</span>
        </div>
        
        {config?.last_sync_at && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {getSyncStatusIcon()}
            <span>Última sync: {formatDate(config.last_sync_at)}</span>
          </div>
        )}

        <div className="flex items-center gap-2 ml-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={isSyncing}
          >
            {isSyncing ? (
              <Loader2 size={14} className="animate-spin mr-1" />
            ) : (
              <RefreshCw size={14} className="mr-1" />
            )}
            Sincronizar
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDisconnect}
            disabled={disconnectSheets.isPending}
          >
            <Unlink size={14} className="mr-1" />
            Desconectar
          </Button>
        </div>
      </div>
    );
  }

  // Prominent variant - shown when not connected or explicitly requested
  return (
    <div className="p-6 bg-card rounded-xl border border-border">
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-lg bg-primary/10">
          <FileSpreadsheet size={24} className="text-primary" />
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-lg font-semibold text-foreground">
              {isConnected ? 'Planilha Conectada' : 'Conectar Google Sheets'}
            </h3>
            {isConnected && (
              <Badge variant="outline" className="text-xs">
                {getSyncStatusIcon()}
                <span className="ml-1">{config?.sync_status}</span>
              </Badge>
            )}
          </div>

          {!isConnected ? (
            <>
              <p className="text-sm text-muted-foreground mb-4">
                Cole o ID ou URL da sua planilha de SDRs para importar os dados automaticamente.
              </p>

              <div className="flex gap-2 mb-3">
                <Input
                  placeholder="ID ou URL da planilha"
                  value={spreadsheetId}
                  onChange={(e) => setSpreadsheetId(e.target.value)}
                  className="max-w-md"
                />
                <Button
                  onClick={handleConnect}
                  disabled={!spreadsheetId.trim() || isConnecting}
                >
                  {isConnecting ? (
                    <Loader2 size={16} className="animate-spin mr-2" />
                  ) : null}
                  Conectar
                </Button>
              </div>

              <Collapsible open={showHelp} onOpenChange={setShowHelp}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-muted-foreground">
                    <HelpCircle size={14} className="mr-1" />
                    Como configurar?
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-3 p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground space-y-2">
                  <p><strong>1.</strong> Abra sua planilha no Google Sheets</p>
                  <p><strong>2.</strong> Vá em Arquivo → Compartilhar → Publicar na Web</p>
                  <p><strong>3.</strong> Cole a URL ou ID da planilha acima</p>
                  <p><strong>4.</strong> Cada aba da planilha deve ter o nome do SDR</p>
                  <p className="pt-2 border-t border-border">
                    <strong>Estrutura esperada:</strong> Data, Ativados, Agendado, % Agendamento, 
                    Agendado no dia, Realizado, % Comp, Vendas, % Conv
                  </p>
                </CollapsibleContent>
              </Collapsible>
            </>
          ) : (
            <>
              {config?.last_sync_at && (
                <p className="text-sm text-muted-foreground mb-4">
                  Última sincronização: {formatDate(config.last_sync_at)}
                </p>
              )}
              
              {config?.sync_message && (
                <p className="text-xs text-muted-foreground mb-4 bg-muted/50 p-2 rounded">
                  {config.sync_message}
                </p>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={handleSync}
                  disabled={isSyncing}
                >
                  {isSyncing ? (
                    <Loader2 size={16} className="animate-spin mr-2" />
                  ) : (
                    <RefreshCw size={16} className="mr-2" />
                  )}
                  Sincronizar Agora
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDisconnect}
                  disabled={disconnectSheets.isPending}
                >
                  <Unlink size={16} className="mr-2" />
                  Desconectar
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
