import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Check, X, Package } from 'lucide-react';
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
import { useAllProductsAdmin, useCreateProduct, useUpdateProduct, useDeleteProduct } from '@/controllers/useFunnelController';
import type { Product } from '@/model/entities/funnel';

export function ProductManagerAdmin() {
  const { data: products, isLoading } = useAllProductsAdmin();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();

  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);

  const handleCreate = () => {
    if (!newName.trim()) return;
    createProduct.mutate(
      { name: newName.trim() },
      { onSuccess: () => setNewName('') }
    );
  };

  const handleStartEdit = (product: Product) => {
    setEditingId(product.id);
    setEditName(product.name);
  };

  const handleSaveEdit = () => {
    if (!editingId || !editName.trim()) return;
    updateProduct.mutate(
      { id: editingId, name: editName.trim() },
      { onSuccess: () => setEditingId(null) }
    );
  };

  const handleToggleActive = (product: Product) => {
    updateProduct.mutate({ id: product.id, is_active: !product.is_active });
  };

  const handleDelete = () => {
    if (!deletingProduct) return;
    deleteProduct.mutate(deletingProduct.id, {
      onSuccess: () => setDeletingProduct(null),
    });
  };

  const activeProducts = products?.filter(p => p.is_active) || [];
  const inactiveProducts = products?.filter(p => !p.is_active) || [];

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-lg p-6 border border-border">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Produtos</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {activeProducts.length} ativo{activeProducts.length !== 1 ? 's' : ''}
              {inactiveProducts.length > 0 && `, ${inactiveProducts.length} inativo${inactiveProducts.length !== 1 ? 's' : ''}`}
            </p>
          </div>
        </div>

        <div className="flex gap-2 mb-6">
          <Input
            placeholder="Nome do produto..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            className="flex-1"
          />
          <Button
            onClick={handleCreate}
            disabled={!newName.trim() || createProduct.isPending}
          >
            <Plus className="h-4 w-4 mr-2" />
            Adicionar
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Carregando...</div>
        ) : (
          <div className="space-y-2">
            {products?.map((product) => (
              <div
                key={product.id}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                  product.is_active
                    ? 'bg-muted/50 border-border'
                    : 'bg-muted/20 border-border/50 opacity-60'
                }`}
              >
                <div className="p-1.5 rounded-md bg-primary/10">
                  <Package className="h-4 w-4 text-primary" />
                </div>

                {editingId === product.id ? (
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
                      <span className="font-medium text-foreground">{product.name}</span>
                    </div>

                    <Badge
                      variant={product.is_active ? 'default' : 'secondary'}
                      className="cursor-pointer select-none"
                      onClick={() => handleToggleActive(product)}
                    >
                      {product.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>

                    <Button size="sm" variant="ghost" onClick={() => handleStartEdit(product)} className="h-8 w-8 p-0">
                      <Edit2 className="h-4 w-4" />
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDeletingProduct(product)}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            ))}

            {(!products || products.length === 0) && (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum produto cadastrado. Adicione o primeiro acima.
              </div>
            )}
          </div>
        )}

        <div className="mt-6 bg-muted/30 rounded-lg p-4 border border-border">
          <p className="text-muted-foreground text-sm">
            <strong>Dica:</strong> Produtos representam o tipo de venda fechada pelos closers
            (ex: Mentoria Julia, Elite Premium). Funis representam a origem do lead (SDR).
          </p>
        </div>
      </div>

      <AlertDialog open={!!deletingProduct} onOpenChange={(open) => !open && setDeletingProduct(null)}>
        <AlertDialogContent className="bg-background border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Produto</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o produto <strong>"{deletingProduct?.name}"</strong>?
              Esta ação não pode ser desfeita. Se houver dados vinculados, a exclusão falhará —
              nesse caso, desative o produto em vez de excluí-lo.
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
