import React, { useMemo } from 'react';
import { LogOut, TrendingUp, Phone, Users, UserCheck, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useClosersForLinking, useSDRsForLinking } from '@/controllers/useUserController';
import { Button } from '@/components/ui/button';
import type { SelectedEntity } from '@/model/entities/user';

export function EntitySelectionScreen() {
  const { signOut, entityLinks, selectEntity, user } = useAuth();
  const { data: closers, isLoading: isLoadingClosers } = useClosersForLinking();
  const { data: sdrs, isLoading: isLoadingSDRs } = useSDRsForLinking();

  const linkedEntities = useMemo(() => {
    if (!entityLinks) return { closers: [], sdrs: [], socialSelling: [] };

    const closerIds = new Set(entityLinks.filter(l => l.entity_type === 'closer').map(l => l.entity_id));
    const sdrIds = new Set(entityLinks.filter(l => l.entity_type === 'sdr').map(l => l.entity_id));

    const linkedClosers = (closers || []).filter(c => closerIds.has(c.id));
    const linkedSDRs = (sdrs || []).filter(s => sdrIds.has(s.id) && s.type === 'sdr');
    const linkedSS = (sdrs || []).filter(s => sdrIds.has(s.id) && s.type === 'social_selling');

    return { closers: linkedClosers, sdrs: linkedSDRs, socialSelling: linkedSS };
  }, [entityLinks, closers, sdrs]);

  const handleSelect = (entity: SelectedEntity) => {
    selectEntity(entity);
  };

  const isLoading = isLoadingClosers || isLoadingSDRs;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <TrendingUp size={16} className="text-primary" />
          </div>
          <span className="font-semibold text-foreground">Monetização</span>
        </div>
        <Button variant="ghost" size="sm" onClick={() => signOut()} className="text-destructive">
          <LogOut size={16} className="mr-2" />
          Sair
        </Button>
      </header>

      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="w-full max-w-lg px-4">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-foreground mb-2">Selecionar Perfil</h1>
            <p className="text-muted-foreground text-sm">
              Escolha seu nome para acessar o sistema
            </p>
            {user?.email && (
              <p className="text-xs text-muted-foreground mt-1">{user.email}</p>
            )}
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Closers */}
              {linkedEntities.closers.length > 0 && (
                <div className="space-y-2">
                  <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                    <UserCheck size={14} />
                    Closers
                  </h2>
                  <div className="grid gap-2">
                    {linkedEntities.closers.map(closer => (
                      <button
                        key={closer.id}
                        onClick={() => handleSelect({
                          entity_id: closer.id,
                          entity_type: 'closer',
                          entity_name: closer.name,
                        })}
                        className="flex items-center gap-3 w-full p-4 rounded-xl border border-border bg-card hover:border-primary/50 hover:bg-primary/5 transition-colors text-left"
                      >
                        <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                          <UserCheck size={18} className="text-blue-500" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{closer.name}</p>
                          {closer.squads?.name && (
                            <p className="text-xs text-muted-foreground">Squad {closer.squads.name}</p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* SDRs */}
              {linkedEntities.sdrs.length > 0 && (
                <div className="space-y-2">
                  <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                    <Phone size={14} />
                    SDRs
                  </h2>
                  <div className="grid gap-2">
                    {linkedEntities.sdrs.map(sdr => (
                      <button
                        key={sdr.id}
                        onClick={() => handleSelect({
                          entity_id: sdr.id,
                          entity_type: 'sdr',
                          entity_name: sdr.name,
                        })}
                        className="flex items-center gap-3 w-full p-4 rounded-xl border border-border bg-card hover:border-primary/50 hover:bg-primary/5 transition-colors text-left"
                      >
                        <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                          <Phone size={18} className="text-green-500" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{sdr.name}</p>
                          <p className="text-xs text-muted-foreground">SDR</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Social Selling */}
              {linkedEntities.socialSelling.length > 0 && (
                <div className="space-y-2">
                  <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                    <Users size={14} />
                    Social Selling
                  </h2>
                  <div className="grid gap-2">
                    {linkedEntities.socialSelling.map(ss => (
                      <button
                        key={ss.id}
                        onClick={() => handleSelect({
                          entity_id: ss.id,
                          entity_type: 'sdr',
                          entity_name: ss.name,
                        })}
                        className="flex items-center gap-3 w-full p-4 rounded-xl border border-border bg-card hover:border-primary/50 hover:bg-primary/5 transition-colors text-left"
                      >
                        <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center shrink-0">
                          <Users size={18} className="text-purple-500" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{ss.name}</p>
                          <p className="text-xs text-muted-foreground">Social Selling</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
