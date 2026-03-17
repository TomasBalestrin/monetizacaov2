import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, UserPlus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useCreateUser } from '@/controllers/useUserController';
import { useClosersForLinking, useSDRsForLinking } from '@/controllers/useUserController';

const MODULES = ['dashboard', 'closers', 'eagles', 'sharks', 'sdrs', 'funil_intensivo', 'reports', 'admin'];

const createUserSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
  role: z.enum(['admin', 'manager', 'viewer', 'user']),
  permissions: z.array(z.string()),
  linked_closer_id: z.string().optional(),
  linked_sdr_id: z.string().optional(),
});

type CreateUserFormData = z.infer<typeof createUserSchema>;

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateUserDialog({ open, onOpenChange }: CreateUserDialogProps) {
  const createUser = useCreateUser();
  const { data: closers } = useClosersForLinking();
  const { data: sdrs } = useSDRsForLinking();
  
  const validClosers = closers?.filter(c => c.id && c.id.trim() !== '') || [];
  const validSdrs = sdrs?.filter(s => s.id && s.id.trim() !== '') || [];
  
  const form = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      email: '',
      password: '',
      role: 'viewer',
      permissions: ['dashboard'],
      linked_closer_id: 'none',
      linked_sdr_id: 'none',
    },
  });

  const watchedRole = form.watch('role');

  const onSubmit = async (data: CreateUserFormData) => {
    await createUser.mutateAsync({
      email: data.email,
      password: data.password,
      role: data.role,
      permissions: data.permissions,
      linked_closer_id: data.linked_closer_id === 'none' ? undefined : data.linked_closer_id,
      linked_sdr_id: data.linked_sdr_id === 'none' ? undefined : data.linked_sdr_id,
    });
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Novo Usuário
          </DialogTitle>
          <DialogDescription>
            Crie um novo usuário com email, senha, função e permissões.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="usuario@exemplo.com" 
                      type="email"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Senha</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Mínimo 6 caracteres" 
                      type="password"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Função</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma função" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="admin">Administrador</SelectItem>
                      <SelectItem value="manager">Gerente</SelectItem>
                      <SelectItem value="viewer">SDR</SelectItem>
                      <SelectItem value="user">Closer</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="permissions"
              render={() => (
                <FormItem>
                  <FormLabel>Permissões de Módulos</FormLabel>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {MODULES.map((module) => (
                      <FormField
                        key={module}
                        control={form.control}
                        name="permissions"
                        render={({ field }) => {
                          const isAdmin = watchedRole === 'admin';
                          return (
                            <FormItem className="flex items-center space-x-2 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={isAdmin || field.value?.includes(module)}
                                  disabled={isAdmin}
                                  onCheckedChange={(checked) => {
                                    if (isAdmin) return;
                                    const currentValue = field.value || [];
                                    if (checked) {
                                      field.onChange([...currentValue, module]);
                                    } else {
                                      field.onChange(currentValue.filter((v) => v !== module));
                                    }
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="text-sm font-normal capitalize cursor-pointer">
                                {module}
                              </FormLabel>
                            </FormItem>
                          );
                        }}
                      />
                    ))}
                  </div>
                  {watchedRole === 'admin' && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Administradores têm acesso a todos os módulos.
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Entity Links Section */}
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium text-muted-foreground mb-4">Vincular a Entidade (opcional)</h4>
              <p className="text-xs text-muted-foreground mb-4">
                Vincule este usuário a um Closer ou SDR para controle de acesso aos dados.
              </p>
            </div>

            <FormField
              control={form.control}
              name="linked_closer_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vincular a Closer</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Nenhum (opcional)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {validClosers.map((closer) => (
                        <SelectItem key={closer.id} value={closer.id}>
                          {closer.name} {closer.squads?.name ? `(${closer.squads.name})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="linked_sdr_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vincular a SDR</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Nenhum (opcional)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {validSdrs.map((sdr) => (
                        <SelectItem key={sdr.id} value={sdr.id}>
                          {sdr.name} ({sdr.type === 'sdr' ? 'SDR' : sdr.type === 'funil_intensivo' ? 'Funil Intensivo' : 'Social Selling'})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={createUser.isPending}>
                {createUser.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Criar Usuário
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
