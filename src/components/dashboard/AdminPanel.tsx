import React from 'react';
import { Trash2, Loader2 } from 'lucide-react';
import { useUsers, useAssignRole, useTogglePermission, useDeleteUser } from '@/hooks/useUserManagement';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MetricsTable } from './MetricsTable';

const MODULES = ['dashboard', 'eagles', 'alcateia', 'sharks', 'sdrs', 'reports', 'admin'];

export function AdminPanel() {
  const { user: currentUser } = useAuth();
  const { data: users, isLoading } = useUsers();
  const assignRole = useAssignRole();
  const togglePermission = useTogglePermission();
  const deleteUser = useDeleteUser();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-foreground mb-6">Painel Administrativo</h1>

      {/* Metrics Management Section */}
      <MetricsTable />

      {/* Users Management Section */}
      <div className="bg-card rounded-lg p-6 border border-border">
        <h2 className="text-2xl font-bold text-foreground mb-4">Usuários Cadastrados</h2>
        <div className="space-y-4">
          {users?.map((user) => {
            const isCurrentUser = user.id === currentUser?.id;
            
            return (
              <div key={user.id} className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <p className="text-foreground font-semibold text-lg">{user.email}</p>
                    <div className="flex items-center gap-4 mt-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground text-xs">Função:</span>
                        <Select
                          value={user.role || 'viewer'}
                          onValueChange={(value) => assignRole.mutate({ userId: user.id, role: value as any })}
                          disabled={isCurrentUser}
                        >
                          <SelectTrigger className="w-32 bg-background border-border text-foreground text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="manager">Gerente</SelectItem>
                            <SelectItem value="viewer">Visualizador</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <p className="text-muted-foreground text-sm">
                        Criado em: {new Date(user.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                  {!isCurrentUser && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteUser.mutate(user.id)}
                      disabled={deleteUser.isPending}
                    >
                      <Trash2 size={16} className="mr-1" />
                      Remover permissões
                    </Button>
                  )}
                </div>
                <div>
                  <p className="text-foreground text-sm mb-2 font-medium">Permissões de Acesso:</p>
                  <div className="flex flex-wrap gap-2">
                    {MODULES.map((module) => {
                      const hasPermission = user.permissions.includes(module) || user.role === 'admin';
                      return (
                        <button
                          key={module}
                          onClick={() => !isCurrentUser && togglePermission.mutate({ 
                            userId: user.id, 
                            module, 
                            hasPermission: user.permissions.includes(module) 
                          })}
                          disabled={isCurrentUser || user.role === 'admin'}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            hasPermission
                              ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                              : 'bg-muted text-muted-foreground hover:bg-muted/80'
                          } ${(isCurrentUser || user.role === 'admin') ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'}`}
                        >
                          {module}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-muted/30 rounded-lg p-6 border border-border">
        <p className="text-muted-foreground text-sm">
          💡 <strong>Dica:</strong> Novos usuários podem se cadastrar na página de login. 
          Após o cadastro, você pode atribuir funções e permissões aqui.
        </p>
      </div>
    </div>
  );
}
