import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { FileSpreadsheet, Link2, RefreshCw, Unlink, HelpCircle, CheckCircle, AlertCircle, Clock, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  useSquadSheetsConfig,
  useSaveSquadSheetsConfig,
  useDisconnectSquadSheets,
  useSyncSquadSheets,
} from '@/hooks/useSquadSheetsConfig';

interface SquadSheetsConfigProps {
  squadSlug: string;
  squadName: string;
  variant?: 'prominent' | 'compact';
}

export function SquadSheetsConfig({ squadSlug, squadName, variant = 'compact' }: SquadSheetsConfigProps) {
  const [spreadsheetId, setSpreadsheetId] = useState('');
  const [showHelp, setShowHelp] = useState(false);

  const { data: config, isLoading } = useSquadSheetsConfig(squadSlug);
  const { mutate: saveConfig, isPending: isSaving } = useSaveSquadSheetsConfig(squadSlug);
  const { mutate: disconnect, isPending: isDisconnecting } = useDisconnectSquadSheets(squadSlug);
  const { mutate: syncSheets, isPending: isSyncing } = useSyncSquadSheets(squadSlug);

  const isConnected = !!config?.spreadsheet_id;
  const isConnecting = isSaving;

  const handleConnect = () => {
    if (!spreadsheetId.trim()) return;
    saveConfig(spreadsheetId.trim());
    setSpreadsheetId('');
  };

  const handleDisconnect = () => {
    if (confirm(`Deseja realmente desconectar a planilha do Squad ${squadName}?`)) {
      disconnect();
    }
  };

  const handleSync = () => {
    syncSheets();
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Nunca';
    try {
      return format(new Date(dateString), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch {
      return 'Data inválida';
    }
  };

  const getSyncStatusIcon = () => {
    switch (config?.sync_status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      case 'syncing':
        return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Carregando configuração...</span>
      </div>
    );
  }

  // Compact variant - shows inline status and sync button
  if (variant === 'compact' && isConnected) {
    return (
      <div className="flex items-center gap-3 text-sm">
        <div className="flex items-center gap-2">
          {getSyncStatusIcon()}
          <span className="text-muted-foreground">
            {config?.spreadsheet_name || 'Planilha conectada'}
          </span>
          <span className="text-muted-foreground/60">•</span>
          <span className="text-muted-foreground/60">
            Última sync: {formatDate(config?.last_sync_at)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={isSyncing}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Sincronizando...' : 'Sincronizar'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDisconnect}
            disabled={isDisconnecting}
          >
            <Unlink className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  // Prominent variant - full card UI for initial setup
  return (
    <Card className="border-dashed">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileSpreadsheet className="h-5 w-5" />
          Conectar Google Sheets
        </CardTitle>
        <CardDescription>
          Conecte uma planilha do Google para sincronizar as métricas do Squad {squadName}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isConnected ? (
          <>
            <div className="flex gap-2">
              <Input
                placeholder="Cole a URL ou ID da planilha..."
                value={spreadsheetId}
                onChange={(e) => setSpreadsheetId(e.target.value)}
                className="flex-1"
              />
              <Button 
                onClick={handleConnect} 
                disabled={!spreadsheetId.trim() || isConnecting}
              >
                {isConnecting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Link2 className="h-4 w-4 mr-2" />
                )}
                Conectar
              </Button>
            </div>

            <Collapsible open={showHelp} onOpenChange={setShowHelp}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground">
                  <HelpCircle className="h-4 w-4" />
                  Como configurar?
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3 space-y-2 text-sm text-muted-foreground bg-muted/50 p-4 rounded-lg">
                <p><strong>1.</strong> Abra a planilha no Google Sheets</p>
                <p><strong>2.</strong> Clique em Compartilhar → "Qualquer pessoa com o link pode ver"</p>
                <p><strong>3.</strong> Copie a URL ou ID da planilha</p>
                <p><strong>4.</strong> Cole acima e clique em Conectar</p>
                <p className="pt-2 text-xs">
                  A planilha deve ter abas com os nomes dos closers do squad (ex: "Hannah", "Carlos")
                </p>
              </CollapsibleContent>
            </Collapsible>
          </>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                {getSyncStatusIcon()}
                <div>
                  <p className="font-medium text-sm">
                    {config?.spreadsheet_name || 'Planilha conectada'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Última sincronização: {formatDate(config?.last_sync_at)}
                  </p>
                  {config?.sync_message && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {config.sync_message}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSync}
                  disabled={isSyncing}
                >
                  <RefreshCw className={`h-4 w-4 mr-1 ${isSyncing ? 'animate-spin' : ''}`} />
                  {isSyncing ? 'Sincronizando...' : 'Sincronizar'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDisconnect}
                  disabled={isDisconnecting}
                >
                  <Unlink className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
