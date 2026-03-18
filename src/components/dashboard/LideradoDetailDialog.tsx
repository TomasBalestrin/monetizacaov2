import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useSquads } from '@/controllers/useCloserController';
import { useUpdateCloser } from '@/controllers/useCloserController';
import {
  useFunnels,
  useProducts,
  useUserFunnels,
  useAssignUserFunnel,
  useRemoveUserFunnel,
  useUserProducts,
  useAssignUserProduct,
  useRemoveUserProduct,
} from '@/controllers/useFunnelController';
import {
  useSDRFunnels,
  useAddSDRFunnel,
  useDeleteSDRFunnel,
} from '@/controllers/useSdrController';
import type { Closer } from '@/model/entities/closer';
import type { SDR } from '@/model/entities/sdr';

type Liderado =
  | { type: 'closer'; data: Closer }
  | { type: 'sdr' | 'social_selling' | 'funil_intensivo'; data: SDR };

interface LideradoDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  liderado: Liderado | null;
}

export function LideradoDetailDialog({ open, onOpenChange, liderado }: LideradoDetailDialogProps) {
  if (!liderado) return null;

  const isCloser = liderado.type === 'closer';
  const entityId = liderado.data.id;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {liderado.data.name}
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({isCloser ? 'Closer' : liderado.type === 'sdr' ? 'SDR' : liderado.type === 'social_selling' ? 'Social Selling' : 'Funil Intensivo'})
            </span>
          </DialogTitle>
        </DialogHeader>

        {isCloser ? (
          <CloserDelegation closerId={entityId} closer={liderado.data as Closer} />
        ) : (
          <SDRDelegation sdrId={entityId} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function CloserDelegation({ closerId, closer }: { closerId: string; closer: Closer }) {
  const { data: squads } = useSquads();
  const { data: funnels, isLoading: funnelsLoading } = useFunnels();
  const { data: products, isLoading: productsLoading } = useProducts();
  const { data: userFunnels, isLoading: userFunnelsLoading } = useUserFunnels(closerId);
  const { data: userProducts, isLoading: userProductsLoading } = useUserProducts(closerId);

  const updateCloser = useUpdateCloser();
  const assignFunnel = useAssignUserFunnel();
  const removeFunnel = useRemoveUserFunnel();
  const assignProduct = useAssignUserProduct();
  const removeProduct = useRemoveUserProduct();

  const assignedFunnelIds = new Set((userFunnels || []).map(f => f.id));
  const assignedProductIds = new Set((userProducts || []).map(p => p.id));

  const handleSquadChange = (squadId: string) => {
    updateCloser.mutate({ id: closerId, squad_id: squadId });
  };

  const handleFunnelToggle = (funnelId: string, checked: boolean) => {
    if (checked) {
      assignFunnel.mutate({ closerId, funnelId });
    } else {
      removeFunnel.mutate({ closerId, funnelId });
    }
  };

  const handleProductToggle = (productId: string, checked: boolean) => {
    if (checked) {
      assignProduct.mutate({ closerId, productId });
    } else {
      removeProduct.mutate({ closerId, productId });
    }
  };

  return (
    <div className="space-y-6">
      {/* Squad */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Squad</Label>
        <Select value={closer.squad_id} onValueChange={handleSquadChange}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione o squad" />
          </SelectTrigger>
          <SelectContent>
            {squads?.map(s => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Funis */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Funis Delegados</Label>
        {funnelsLoading || userFunnelsLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : (
          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            {funnels?.map(f => (
              <div key={f.id} className="flex items-center gap-2">
                <Checkbox
                  id={`funnel-${f.id}`}
                  checked={assignedFunnelIds.has(f.id)}
                  onCheckedChange={(checked) => handleFunnelToggle(f.id, !!checked)}
                />
                <Label htmlFor={`funnel-${f.id}`} className="text-sm cursor-pointer">{f.name}</Label>
              </div>
            ))}
            {(!funnels || funnels.length === 0) && (
              <p className="text-sm text-muted-foreground italic">Nenhum funil disponível</p>
            )}
          </div>
        )}
      </div>

      {/* Produtos */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Produtos Delegados</Label>
        {productsLoading || userProductsLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : (
          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            {products?.map(p => (
              <div key={p.id} className="flex items-center gap-2">
                <Checkbox
                  id={`product-${p.id}`}
                  checked={assignedProductIds.has(p.id)}
                  onCheckedChange={(checked) => handleProductToggle(p.id, !!checked)}
                />
                <Label htmlFor={`product-${p.id}`} className="text-sm cursor-pointer">{p.name}</Label>
              </div>
            ))}
            {(!products || products.length === 0) && (
              <p className="text-sm text-muted-foreground italic">Nenhum produto disponível</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SDRDelegation({ sdrId }: { sdrId: string }) {
  const { data: funnels, isLoading: funnelsLoading } = useFunnels();
  const { data: sdrFunnelNames, isLoading: sdrFunnelsLoading } = useSDRFunnels(sdrId);

  const addFunnel = useAddSDRFunnel();
  const deleteFunnel = useDeleteSDRFunnel();

  const assignedNames = new Set(sdrFunnelNames || []);

  const handleFunnelToggle = (funnelName: string, checked: boolean) => {
    if (checked) {
      addFunnel.mutate({ sdrId, funnelName });
    } else {
      deleteFunnel.mutate({ sdrId, funnelName });
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Label className="text-sm font-medium">Funis Delegados</Label>
        {funnelsLoading || sdrFunnelsLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : (
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {funnels?.map(f => (
              <div key={f.id} className="flex items-center gap-2">
                <Checkbox
                  id={`sdr-funnel-${f.id}`}
                  checked={assignedNames.has(f.name)}
                  onCheckedChange={(checked) => handleFunnelToggle(f.name, !!checked)}
                />
                <Label htmlFor={`sdr-funnel-${f.id}`} className="text-sm cursor-pointer">{f.name}</Label>
              </div>
            ))}
            {(!funnels || funnels.length === 0) && (
              <p className="text-sm text-muted-foreground italic">Nenhum funil disponível</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
