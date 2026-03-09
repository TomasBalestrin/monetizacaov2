 import React, { useState, useEffect } from 'react';
 import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
 import { Button } from '@/components/ui/button';
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
 import { Label } from '@/components/ui/label';
 import { Badge } from '@/components/ui/badge';
 import { X, Plus, Loader2, Link2 } from 'lucide-react';
 import { 
   useUserEntityLinks, 
   useClosersForLinking, 
   useSDRsForLinking,
   useCreateEntityLink,
   useDeleteEntityLink,
   UserEntityLink
 } from '@/controllers/useUserController';
 import { toast } from 'sonner';
 
 interface EditUserLinksDialogProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   userId: string;
   userEmail: string;
 }
 
 export function EditUserLinksDialog({ open, onOpenChange, userId, userEmail }: EditUserLinksDialogProps) {
   const { data: userLinks, isLoading: linksLoading } = useUserEntityLinks(userId);
   const { data: closers } = useClosersForLinking();
   const { data: sdrs } = useSDRsForLinking();
   const createLink = useCreateEntityLink();
   const deleteLink = useDeleteEntityLink();
   
   const [newLinkType, setNewLinkType] = useState<'closer' | 'sdr'>('sdr');
   const [newLinkEntityId, setNewLinkEntityId] = useState('');
 
   // Reset form when dialog opens
   useEffect(() => {
     if (open) {
       setNewLinkType('sdr');
       setNewLinkEntityId('');
     }
   }, [open]);
 
   const handleAddLink = async () => {
     if (!newLinkEntityId) {
       toast.error('Selecione uma entidade para vincular');
       return;
     }
 
     // Check if link already exists
     const exists = userLinks?.some(
       link => link.entity_type === newLinkType && link.entity_id === newLinkEntityId
     );
     
     if (exists) {
       toast.error('Este vínculo já existe');
       return;
     }
 
     try {
       await createLink.mutateAsync({
         user_id: userId,
         entity_type: newLinkType,
         entity_id: newLinkEntityId,
       });
       toast.success('Vínculo adicionado!');
       setNewLinkEntityId('');
     } catch (error) {
       toast.error('Erro ao adicionar vínculo');
     }
   };
 
   const handleDeleteLink = async (linkId: string) => {
     try {
       await deleteLink.mutateAsync(linkId);
       toast.success('Vínculo removido!');
     } catch (error) {
       toast.error('Erro ao remover vínculo');
     }
   };
 
   const getEntityName = (link: UserEntityLink) => {
     if (link.entity_type === 'closer') {
       const closer = closers?.find(c => c.id === link.entity_id);
       return closer?.name || 'Closer desconhecido';
     } else {
       const sdr = sdrs?.find(s => s.id === link.entity_id);
       return sdr?.name || 'SDR desconhecido';
     }
   };
 
   const getEntityTypeLabel = (link: UserEntityLink) => {
     if (link.entity_type === 'closer') return 'Closer';
     const sdr = sdrs?.find(s => s.id === link.entity_id);
     return sdr?.type === 'sdr' ? 'SDR' : 'Social Selling';
   };
 
   const availableEntities = newLinkType === 'closer' 
     ? closers?.filter(c => !userLinks?.some(l => l.entity_type === 'closer' && l.entity_id === c.id))
     : sdrs?.filter(s => !userLinks?.some(l => l.entity_type === 'sdr' && l.entity_id === s.id));
 
   return (
     <Dialog open={open} onOpenChange={onOpenChange}>
       <DialogContent className="sm:max-w-md">
         <DialogHeader>
           <DialogTitle className="flex items-center gap-2">
             <Link2 className="h-5 w-5" />
             Gerenciar Vínculos
           </DialogTitle>
           <DialogDescription>
             Vincule o usuário <strong>{userEmail}</strong> a Closers ou SDRs.
           </DialogDescription>
         </DialogHeader>
 
         <div className="space-y-6 pt-4">
           {/* Current Links */}
           <div>
             <Label className="text-sm font-medium">Vínculos Atuais</Label>
             {linksLoading ? (
               <div className="flex items-center justify-center py-4">
                 <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
               </div>
             ) : userLinks && userLinks.length > 0 ? (
               <div className="flex flex-wrap gap-2 mt-2">
                 {userLinks.map((link) => (
                   <Badge 
                     key={link.id} 
                     variant="secondary" 
                     className="flex items-center gap-2 pr-1"
                   >
                     <span className="text-xs text-muted-foreground">
                       {getEntityTypeLabel(link)}:
                     </span>
                     {getEntityName(link)}
                     <button
                       onClick={() => handleDeleteLink(link.id)}
                       disabled={deleteLink.isPending}
                       className="ml-1 rounded-full p-0.5 hover:bg-destructive/20 transition-colors"
                     >
                       <X className="h-3 w-3 text-destructive" />
                     </button>
                   </Badge>
                 ))}
               </div>
             ) : (
               <p className="text-sm text-muted-foreground mt-2">
                 Nenhum vínculo configurado.
               </p>
             )}
           </div>
 
           {/* Add New Link */}
           <div className="border-t pt-4">
             <Label className="text-sm font-medium">Adicionar Novo Vínculo</Label>
             <div className="grid grid-cols-2 gap-2 mt-2">
               <Select 
                 value={newLinkType} 
                 onValueChange={(v) => {
                   setNewLinkType(v as 'closer' | 'sdr');
                   setNewLinkEntityId('');
                 }}
               >
                 <SelectTrigger>
                   <SelectValue />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="closer">Closer</SelectItem>
                   <SelectItem value="sdr">SDR / Social Selling</SelectItem>
                 </SelectContent>
               </Select>
 
               <Select value={newLinkEntityId} onValueChange={setNewLinkEntityId}>
                 <SelectTrigger>
                   <SelectValue placeholder="Selecione..." />
                 </SelectTrigger>
                 <SelectContent>
                   {newLinkType === 'closer' ? (
                     availableEntities?.map((closer: any) => (
                       <SelectItem key={closer.id} value={closer.id}>
                         {closer.name} {closer.squads?.name ? `(${closer.squads.name})` : ''}
                       </SelectItem>
                     ))
                   ) : (
                     availableEntities?.map((sdr: any) => (
                       <SelectItem key={sdr.id} value={sdr.id}>
                         {sdr.name} ({sdr.type === 'sdr' ? 'SDR' : 'Social'})
                       </SelectItem>
                     ))
                   )}
                 </SelectContent>
               </Select>
             </div>
             <Button 
               onClick={handleAddLink}
               disabled={!newLinkEntityId || createLink.isPending}
               className="w-full mt-2"
               size="sm"
             >
               {createLink.isPending ? (
                 <Loader2 className="h-4 w-4 animate-spin mr-2" />
               ) : (
                 <Plus className="h-4 w-4 mr-2" />
               )}
               Adicionar Vínculo
             </Button>
           </div>
 
           <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">
             💡 Usuários vinculados a um SDR/Social Selling podem adicionar, editar e excluir apenas suas próprias métricas.
           </div>
         </div>
       </DialogContent>
     </Dialog>
   );
 }