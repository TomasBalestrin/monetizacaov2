import React, { useState, useEffect } from 'react';
import { FileSpreadsheet, CheckCircle2, XCircle, RefreshCw, Unlink, HelpCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  useGoogleSheetsConfig, 
  useSaveGoogleSheetsConfig, 
  useDisconnectGoogleSheets,
  useSyncGoogleSheets,
  useSaveRowMapping,
  DEFAULT_ROW_MAPPING,
  type RowMapping
} from '@/hooks/useGoogleSheetsConfig';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { RowMappingConfig } from './RowMappingConfig';

export function GoogleSheetsConfig() {
  const [spreadsheetId, setSpreadsheetId] = useState('');
  const [showHelp, setShowHelp] = useState(false);
  const [rowMapping, setRowMapping] = useState<RowMapping>({ ...DEFAULT_ROW_MAPPING });

  const { data: config, isLoading } = useGoogleSheetsConfig();
  const saveConfig = useSaveGoogleSheetsConfig();
  const disconnect = useDisconnectGoogleSheets();
  const sync = useSyncGoogleSheets();
  const saveRowMapping = useSaveRowMapping();

  const isConnected = !!config?.spreadsheet_id;

  // Load row mapping from config when it changes
  useEffect(() => {
    if (config?.row_mapping) {
      setRowMapping(config.row_mapping);
    }
  }, [config?.row_mapping]);

  const handleConnect = () => {
    if (!spreadsheetId.trim()) {
      return;
    }
    saveConfig.mutate(spreadsheetId.trim());
  };

  const handleDisconnect = () => {
    disconnect.mutate();
    setSpreadsheetId('');
  };

  const handleSync = () => {
    sync.mutate();
  };

  const handleSaveRowMapping = () => {
    if (config?.id) {
      saveRowMapping.mutate({ configId: config.id, rowMapping });
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Nunca';
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="py-12 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl ${isConnected ? 'bg-green-500/20' : 'bg-muted'}`}>
              <FileSpreadsheet className={`h-6 w-6 ${isConnected ? 'text-green-500' : 'text-muted-foreground'}`} />
            </div>
            <div>
              <CardTitle className="text-xl">Google Sheets</CardTitle>
              <CardDescription>
                Importe dados de vendas automaticamente da sua planilha
              </CardDescription>
            </div>
          </div>
          <Badge 
            variant={isConnected ? 'default' : 'secondary'}
            className={isConnected ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' : ''}
          >
            {isConnected ? (
              <><CheckCircle2 className="h-3 w-3 mr-1" /> Conectado</>
            ) : (
              <><XCircle className="h-3 w-3 mr-1" /> Desconectado</>
            )}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {!isConnected ? (
          // Not connected state
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="spreadsheet-id" className="text-sm font-medium text-foreground">
                ID da Planilha
              </label>
              <Input
                id="spreadsheet-id"
                placeholder="Ex: 1BxiMVs0XRA5nFMdKvBd..."
                value={spreadsheetId}
                onChange={(e) => setSpreadsheetId(e.target.value)}
                className="bg-background border-border"
              />
            </div>

            <Button 
              onClick={handleConnect} 
              disabled={!spreadsheetId.trim() || saveConfig.isPending}
              className="w-full"
            >
              {saveConfig.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Conectando...</>
              ) : (
                'Conectar Planilha'
              )}
            </Button>

            <Collapsible open={showHelp} onOpenChange={setShowHelp}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full text-muted-foreground hover:text-foreground">
                  <HelpCircle className="h-4 w-4 mr-2" />
                  Como encontrar o ID da planilha?
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3">
                <div className="bg-muted/50 rounded-lg p-4 space-y-3 text-sm">
                  <p className="text-muted-foreground">
                    O ID está na URL da sua planilha do Google Sheets:
                  </p>
                  <code className="block bg-background p-3 rounded text-xs text-foreground break-all">
                    docs.google.com/spreadsheets/d/<span className="text-primary font-bold">[ID_AQUI]</span>/edit
                  </code>
                  <p className="text-muted-foreground">
                    Copie apenas a parte destacada em azul (entre /d/ e /edit).
                  </p>
                  <div className="pt-2 border-t border-border">
                    <p className="text-amber-400 text-xs">
                      ⚠️ Importante: A planilha deve estar com compartilhamento público (Qualquer pessoa com o link pode visualizar).
                    </p>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        ) : (
          // Connected state
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-xs text-muted-foreground mb-1">Última sincronização</p>
                <p className="text-sm font-medium text-foreground">
                  {formatDate(config.last_sync_at)}
                </p>
              </div>
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-xs text-muted-foreground mb-1">Status</p>
                <p className="text-sm font-medium text-foreground">
                  {config.sync_status || 'Aguardando sincronização'}
                </p>
              </div>
            </div>

            {/* Row Mapping Configuration */}
            <RowMappingConfig
              mapping={rowMapping}
              onChange={(newMapping) => setRowMapping(newMapping)}
              onSave={handleSaveRowMapping}
              isSaving={saveRowMapping.isPending}
            />

            <div className="flex gap-3">
              <Button 
                onClick={handleSync} 
                disabled={sync.isPending}
                className="flex-1"
              >
                {sync.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sincronizando...</>
                ) : (
                  <><RefreshCw className="h-4 w-4 mr-2" /> Sincronizar Agora</>
                )}
              </Button>
              <Button 
                variant="outline" 
                onClick={handleDisconnect}
                disabled={disconnect.isPending}
                className="border-destructive/50 text-destructive hover:bg-destructive/10"
              >
                {disconnect.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <><Unlink className="h-4 w-4 mr-2" /> Desconectar</>
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
