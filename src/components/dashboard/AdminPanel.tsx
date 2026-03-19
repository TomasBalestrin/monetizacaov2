import React, { useState } from 'react';
import { Trash2, Loader2, Plus, Settings, Database, Users, Link2, Edit2, Target, Filter, Activity } from 'lucide-react';
import { useUsers, useAssignRole, useTogglePermission } from '@/controllers/useUserController';
import { DeleteUserDialog } from './DeleteUserDialog';
import { useAllEntityLinks, useClosersForLinking, useSDRsForLinking } from '@/controllers/useUserController';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { MetricsTable } from './MetricsTable';
import { CreateUserDialog } from './CreateUserDialog';
import { CreateEntityDialog } from './CreateEntityDialog';
import { EditUserLinksDialog } from './EditUserLinksDialog';
import { GoalsConfig } from './GoalsConfig';
import { FunnelManagerAdmin } from './FunnelManagerAdmin';
import { ProductManagerAdmin } from './ProductManagerAdmin';
import { ActivityLog } from './ActivityLog';

const MODULES = ['dashboard', 'closers', 'eagles', 'sharks', 'sdrs', 'social_selling', 'funil_intensivo', 'reports', 'admin'];

export function AdminPanel() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreateEntityDialogOpen, setIsCreateEntityDialogOpen] = useState(false);
  const [editLinksUser, setEditLinksUser] = useState<{ id: string; email: string } | null>(null);
  const [deleteUserTarget, setDeleteUserTarget] = useState<{ id: string; email: string } | null>(null);
  const { user: currentUser } = useAuth();
  const { data: users, isLoading } = useUsers();
  const { data: entityLinks } = useAllEntityLinks();
  const { data: closers } = useClosersForLinking();
  const { data: sdrs } = useSDRsForLinking();
  const assignRole = useAssignRole();
  const togglePermission = useTogglePermission();

  // Helper to get entity names for a user
  const getUserLinks = (userId: string) => {
    const userLinks = entityLinks?.filter(link => link.user_id === userId) || [];
    return userLinks.map(link => {
      if (link.entity_type === 'closer') {
        const closer = closers?.find(c => c.id === link.entity_id);
        return { type: 'Closer', name: closer?.name || 'Desconhecido' };
      } else {
        const sdr = sdrs?.find(s => s.id === link.entity_id);
        return { type: sdr?.type === 'sdr' ? 'SDR' : sdr?.type === 'funil_intensivo' ? 'Funil Int.' : 'Social', name: sdr?.name || 'Desconhecido' };
      }
    });
  };
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-foreground">Painel Administrativo</h1>
        <p className="text-muted-foreground">Gerencie integrações, métricas e usuários do sistema</p>
      </div>

      <Tabs defaultValue="metrics" className="space-y-6">
        <TabsList className="bg-muted/50 p-1 h-auto flex-wrap">
          <TabsTrigger value="metrics" className="data-[state=active]:bg-background gap-2 px-4 py-2">
            <Database className="h-4 w-4" />
            Métricas
          </TabsTrigger>
          <TabsTrigger value="users" className="data-[state=active]:bg-background gap-2 px-4 py-2">
            <Users className="h-4 w-4" />
            Usuários
          </TabsTrigger>
          <TabsTrigger value="goals" className="data-[state=active]:bg-background gap-2 px-4 py-2">
            <Target className="h-4 w-4" />
            Metas
          </TabsTrigger>
          <TabsTrigger value="funnels" className="data-[state=active]:bg-background gap-2 px-4 py-2">
            <Filter className="h-4 w-4" />
            Funis
          </TabsTrigger>
          <TabsTrigger value="products" className="data-[state=active]:bg-background gap-2 px-4 py-2">
            <Settings className="h-4 w-4" />
            Produtos
          </TabsTrigger>
          <TabsTrigger value="log" className="data-[state=active]:bg-background gap-2 px-4 py-2">
            <Activity className="h-4 w-4" />
            Log
          </TabsTrigger>
        </TabsList>

        {/* Metrics Tab */}
        <TabsContent value="metrics" className="space-y-6">
          <MetricsTable />
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="bg-card rounded-lg p-6 border border-border">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Usuários Cadastrados</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {users?.length || 0} usuários no sistema
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setIsCreateEntityDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Novo Perfil
                  </Button>
                  <Button onClick={() => setIsCreateDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Novo Usuário
                  </Button>
                </div>
              </div>

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
                                  <SelectItem value="viewer">SDR</SelectItem>
                                  <SelectItem value="user">Closer</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <p className="text-muted-foreground text-sm">
                              Criado em: {new Date(user.created_at).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                          {/* Entity Links */}
                          <div className="flex items-center gap-2 mt-2">
                            <Link2 className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">Vínculos:</span>
                            {getUserLinks(user.id).length > 0 ? (
                              getUserLinks(user.id).map((link, idx) => (
                                <Badge key={idx} variant="secondary" className="text-xs">
                                  {link.type}: {link.name}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-xs text-muted-foreground italic">Nenhum</span>
                            )}
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-6 w-6 p-0 ml-1"
                              onClick={() => setEditLinksUser({ id: user.id, email: user.email })}
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        {!isCurrentUser && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setDeleteUserTarget({ id: user.id, email: user.email })}
                          >
                            <Trash2 size={16} className="mr-1" />
                            Remover
                          </Button>
                        )}
                      </div>
                      <div>
                        <p className="text-foreground text-sm mb-2 font-medium">Permissões de Acesso:</p>
                        <div className="flex flex-wrap gap-2">
                          {MODULES.map((module) => {
                            const SDR_PERMISSIONS = ['sdrs'];
                            const CLOSER_PERMISSIONS = ['closers'];
                            const isSDRRole = user.role === 'viewer';
                            const isCloserRole = user.role === 'user';
                            const hasPermission = user.permissions.includes(module) || user.role === 'admin' || (isSDRRole && SDR_PERMISSIONS.includes(module)) || (isCloserRole && CLOSER_PERMISSIONS.includes(module));
                            const isFixed = user.role === 'admin' || (isSDRRole && SDR_PERMISSIONS.includes(module)) || (isCloserRole && CLOSER_PERMISSIONS.includes(module));
                            return (
                              <button
                                key={module}
                                onClick={() => !isCurrentUser && !isFixed && togglePermission.mutate({
                                  userId: user.id,
                                  module,
                                  hasPermission: user.permissions.includes(module)
                                })}
                                disabled={isCurrentUser || isFixed}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                  hasPermission
                                    ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                } ${(isCurrentUser || isFixed) ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'}`}
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

              <div className="mt-6 bg-muted/30 rounded-lg p-4 border border-border">
                <p className="text-muted-foreground text-sm">
                  💡 <strong>Dica:</strong> Use o botão "Novo Usuário" para criar usuários diretamente, 
                  ou eles podem se cadastrar na página de login.
                </p>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Goals Tab */}
        <TabsContent value="goals" className="space-y-6">
          <GoalsConfig />
        </TabsContent>

        {/* Funnels Tab */}
        <TabsContent value="funnels" className="space-y-6">
          <FunnelManagerAdmin />
        </TabsContent>

        {/* Products Tab */}
        <TabsContent value="products" className="space-y-6">
          <ProductManagerAdmin />
        </TabsContent>

        {/* Activity Log Tab */}
        <TabsContent value="log" className="space-y-6">
          <ActivityLog />
        </TabsContent>
      </Tabs>

      <CreateUserDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />

      <CreateEntityDialog
        open={isCreateEntityDialogOpen}
        onOpenChange={setIsCreateEntityDialogOpen}
      />

      {editLinksUser && (
        <EditUserLinksDialog
          open={!!editLinksUser}
          onOpenChange={(open) => !open && setEditLinksUser(null)}
          userId={editLinksUser.id}
          userEmail={editLinksUser.email}
        />
      )}

      {deleteUserTarget && (
        <DeleteUserDialog
          open={!!deleteUserTarget}
          onOpenChange={(open) => !open && setDeleteUserTarget(null)}
          userId={deleteUserTarget.id}
          userEmail={deleteUserTarget.email}
        />
      )}
    </div>
  );
}
