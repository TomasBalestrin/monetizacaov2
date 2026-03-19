import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, User, Key, Eye, EyeOff } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

const profileSchema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres'),
  newPassword: z.string().optional(),
  confirmPassword: z.string().optional(),
}).refine(
  (data) => {
    if (data.newPassword && data.newPassword.length > 0 && data.newPassword.length < 8) return false;
    return true;
  },
  { message: 'Mínimo 8 caracteres', path: ['newPassword'] }
).refine(
  (data) => {
    if (data.newPassword && data.newPassword !== data.confirmPassword) return false;
    return true;
  },
  { message: 'Senhas não coincidem', path: ['confirmPassword'] }
);

type ProfileFormData = z.infer<typeof profileSchema>;

interface ProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProfileDialog({ open, onOpenChange }: ProfileDialogProps) {
  const { user, entityLinks } = useAuth();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [currentName, setCurrentName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  // Fetch current name from the linked entity
  useEffect(() => {
    if (!open || entityLinks.length === 0) return;

    const link = entityLinks[0];
    const table = link.entity_type === 'closer' ? 'closers' : 'sdrs';

    supabase
      .from(table)
      .select('name')
      .eq('id', link.entity_id)
      .single()
      .then(({ data }) => {
        if (data?.name) {
          setCurrentName(data.name);
          form.setValue('name', data.name);
        }
      });
  }, [open, entityLinks, form]);

  // Fallback to email username if no entity linked
  useEffect(() => {
    if (!open || entityLinks.length > 0) return;
    const fallback = user?.email?.split('@')[0] || '';
    setCurrentName(fallback);
    form.setValue('name', fallback);
  }, [open, entityLinks, user, form]);

  const onSubmit = async (data: ProfileFormData) => {
    setSaving(true);
    try {
      // Update name if changed
      if (data.name !== currentName && entityLinks.length > 0) {
        const link = entityLinks[0];
        const table = link.entity_type === 'closer' ? 'closers' : 'sdrs';
        const { error } = await supabase
          .from(table)
          .update({ name: data.name })
          .eq('id', link.entity_id);

        if (error) throw new Error('Erro ao atualizar nome: ' + error.message);

        // Invalidate queries so the name updates in the UI
        queryClient.invalidateQueries({ queryKey: ['closers'] });
        queryClient.invalidateQueries({ queryKey: ['sdrs'] });
      }

      // Update password if provided
      if (data.newPassword && data.newPassword.length >= 8) {
        const { error } = await supabase.auth.updateUser({
          password: data.newPassword,
        });

        if (error) throw new Error('Erro ao atualizar senha: ' + error.message);
      }

      toast.success('Perfil atualizado com sucesso!');
      form.reset({ name: data.name, newPassword: '', confirmPassword: '' });
      setCurrentName(data.name);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar perfil');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Meu Perfil
          </DialogTitle>
          <DialogDescription>
            Atualize seu nome e senha
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
              {user?.email}
            </div>

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input placeholder="Seu nome" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="border-t border-border pt-4">
              <div className="flex items-center gap-2 mb-3">
                <Key className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Alterar Senha</span>
                <span className="text-xs text-muted-foreground">(opcional)</span>
              </div>

              <div className="space-y-3">
                <FormField
                  control={form.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nova Senha</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input type={showPassword ? 'text' : 'password'} placeholder="Mínimo 8 caracteres" {...field} />
                          <button
                            type="button"
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            onClick={() => setShowPassword(!showPassword)}
                            tabIndex={-1}
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirmar Senha</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input type={showConfirmPassword ? 'text' : 'password'} placeholder="Repita a nova senha" {...field} />
                          <button
                            type="button"
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            tabIndex={-1}
                          >
                            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
