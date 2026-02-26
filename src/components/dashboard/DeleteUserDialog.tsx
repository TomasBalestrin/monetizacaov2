import React, { useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useDeleteUserCompletely } from '@/hooks/useUserManagement';

interface DeleteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userEmail: string;
}

export function DeleteUserDialog({ open, onOpenChange, userId, userEmail }: DeleteUserDialogProps) {
  const [confirmEmail, setConfirmEmail] = useState('');
  const deleteUser = useDeleteUserCompletely();

  const isConfirmed = confirmEmail === userEmail;

  const handleDelete = async () => {
    if (!isConfirmed) return;
    deleteUser.mutate(userId, {
      onSuccess: () => {
        setConfirmEmail('');
        onOpenChange(false);
      },
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={(v) => { if (!v) setConfirmEmail(''); onOpenChange(v); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Excluir Usuário Permanentemente
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              Esta ação é <strong>irreversível</strong>. O usuário <strong>{userEmail}</strong> será
              completamente removido do sistema, incluindo perfil, permissões e vínculos.
            </p>
            <p className="text-sm">
              Digite o email do usuário para confirmar:
            </p>
            <Input
              placeholder={userEmail}
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
              className="mt-2"
            />
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button variant="outline" onClick={() => { setConfirmEmail(''); onOpenChange(false); }}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={!isConfirmed || deleteUser.isPending}
          >
            {deleteUser.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Excluindo...
              </>
            ) : (
              'Excluir Permanentemente'
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
