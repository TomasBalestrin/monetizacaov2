import React, { useState } from 'react';
import { FileSpreadsheet, Plus, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MetricsDialog } from './MetricsDialog';

interface EmptyStateProps {
  onConnectSheet?: () => void;
}

export function EmptyState({ onConnectSheet }: EmptyStateProps) {
  const [metricsDialogOpen, setMetricsDialogOpen] = useState(false);

  return (
    <>
      <div className="flex items-center justify-center min-h-[60vh] animate-fade-in">
        <Card className="glass-card-elevated max-w-lg w-full mx-4">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <FileSpreadsheet size={32} className="text-primary" />
            </div>
            
            <h2 className="text-2xl font-bold text-foreground mb-3">
              Bem-vindo ao Dashboard
            </h2>
            
            <p className="text-muted-foreground mb-8 max-w-sm mx-auto">
              Conecte sua planilha do Google Sheets ou adicione métricas manualmente para começar a visualizar os dados de vendas.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button 
                size="lg" 
                className="gap-2"
                onClick={onConnectSheet}
              >
                <Upload size={18} />
                Conectar Google Sheets
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                className="gap-2"
                onClick={() => setMetricsDialogOpen(true)}
              >
                <Plus size={18} />
                Inserir Manualmente
              </Button>
            </div>

            <div className="mt-8 pt-6 border-t border-border">
              <p className="text-xs text-muted-foreground">
                Acesse o <span className="font-medium">Painel Admin</span> para configurar a integração com Google Sheets
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <MetricsDialog 
        open={metricsDialogOpen} 
        onOpenChange={setMetricsDialogOpen} 
      />
    </>
  );
}
