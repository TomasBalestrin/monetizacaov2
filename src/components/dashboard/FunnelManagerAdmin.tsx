import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Check, X, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAllFunnelsAdmin, useCreateFunnel, useUpdateFunnel, useDeleteFunnel } from '@/controllers/useFunnelController';
import type { Funnel } from '@/model/entities/funnel';

export function FunnelManagerAdmin() {
  const { data: funnels, isLoading } = useAllFunnelsAdmin();
  const createFunnel = useCreateFunnel();
  const updateFunnel = useUpdateFunnel();
  const deleteFunnel = useDeleteFunnel();

  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [deletingFunnel, setDeletingFunnel] = useState<Funnel | null>(null);

  const handleCreate = () => {
    if (!newName.trim()) return;
    createFunnel.mutate(
      { name: newName.trim(), category: newCategory.trim() || undefined },
      {
        onSuccess: () => {
          setNewName('');
          setNewCategory('');
        },
      }
    );
  };

  const handleStartEdit = (funnel: Funnel) => {
    setEditingId(funnel.id);
    setEditName(funnel.name);
    setEditCategory(funnel.category || '');
  };

  const handleSaveEdit = () => {
    if (!editingId || !editName.trim()) return;
    updateFunnel.mutate(
      { id: editingId, name: editName.trim(), category: editCategory.trim() || null },
      { onSuccess: () => setEditingId(null) }
    );
  };

  const handleToggleActive = (funnel: Funnel) => {
    updateFunnel.mutate({ id: funnel.id, is_active: !funnel.is_active });
  };

  const handleDelete = () => {
    if (!deletingFunnel) return;
    deleteFunnel.mutate(deletingFunnel.id, {
      onSuccess: () => setDeletingFunnel(null),
    });
  };

  const activeFunnels = funnels?.filter(f => f.is_active) || [];
  const inactiveFunnels = funnels?.filter(f => !f.is_active) || [];

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-lg p-6 border border-border">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Funis / Produtos</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {activeFunnels.length} ativo{activeFunnels.length !== 1 ? 's' : ''}
              {inactiveFunnels.length > 0 && `, ${inactiveFunnels.length} inativo${inactiveFunnels.length !== 1 ? 's' : ''}`}
            </p>
          </div>
        </div>

        {/* Add new funnel */}
        <div className="flex gap-2 mb-6">
          <Input
            placeholder="Nome do funil..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            className="flex-1"
          />
          <Input
            placeholder="Categoria (opcional)"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            className="w-48"
          />
          <Button
            onClick={handleCreate}
            disabled={!newName.trim() || createFunnel.isPending}
          >
            <Plus className="h-4 w-4 mr-2" />
            Adicionar
          </Button>
        </div>

        {/* Funnel list */}
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Carregando...</div>
        ) : (
          <div className="space-y-2">
            {funnels?.map((funnel) => (
              <div
                key={funnel.id}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                  funnel.is_active
                    ? 'bg-muted/50 border-border'
                    : 'bg-muted/20 border-border/50 opacity-60'
                }`}
              >
                <div className="p-1.5 rounded-md bg-primary/10">
                  <Filter className="h-4 w-4 text-primary" />
                </div>

                {editingId === funnel.id ? (
                  <>
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveEdit();
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      className="flex-1 h-8"
                      autoFocus
                    />
                    <Input
                      value={editCategory}
                      onChange={(e) => setEditCategory(e.target.value)}
                      placeholder="Categoria"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveEdit();
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      className="w-40 h-8"
                    />
                    <Button size="sm" variant="ghost" onClick={handleSaveEdit} className="h-8 w-8 p-0">
                      <Check className="h-4 w-4 text-green-500" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="h-8 w-8 p-0">
                      <X className="h-4 w-4 text-red-500" />
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-foreground">{funnel.name}</span>
                      {funnel.category && (
                        <Badge variant="secondary" className="ml-2 text-xs">
                          {funnel.category}
                        </Badge>
                      )}
                    </div>

                    <Badge
                      variant={funnel.is_active ? 'default' : 'secondary'}
                      className="cursor-pointer select-none"
                      onClick={() => handleToggleActive(funnel)}
                    >
                      {funnel.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleStartEdit(funnel)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDeletingFunnel(funnel)}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            ))}

            {(!funnels || funnels.length === 0) && (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum funil cadastrado. Adicione o primeiro acima.
              </div>
            )}
          </div>
        )}

        <div className="mt-6 bg-muted/30 rounded-lg p-4 border border-border">
          <p className="text-muted-foreground text-sm">
            <strong>Dica:</strong> Funis inativos não aparecem nas telas de SDR e Closers,
            mas os dados históricos são mantidos. Clique em "Ativo/Inativo" para alternar.
          </p>
        </div>
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={!!deletingFunnel} onOpenChange={(open) => !open && setDeletingFunnel(null)}>
        <AlertDialogContent className="bg-background border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Funil</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o funil <strong>"{deletingFunnel?.name}"</strong>?
              Esta ação não pode ser desfeita. Se houver dados vinculados, a exclusão falhará —
              nesse caso, desative o funil em vez de excluí-lo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
