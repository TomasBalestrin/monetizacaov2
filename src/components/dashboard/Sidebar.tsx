import React from 'react';
import {
  LayoutDashboard,
  Users,
  Phone,
  FileText,
  Settings,
  LogOut,
  X,
  TrendingUp,
  Zap,
  Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

export type ModuleId = 'dashboard' | 'eagles' | 'alcateia' | 'sharks' | 'sdrs' | 'reports' | 'admin';

interface MenuItem {
  id: ModuleId;
  label: string;
  icon: React.ElementType;
  permission: string;
  color?: string;
}

const squadItems: MenuItem[] = [
  { id: 'eagles', label: 'Squad Eagles', icon: Zap, permission: 'eagles', color: 'text-eagles' },
  { id: 'alcateia', label: 'Squad Alcateia', icon: Shield, permission: 'alcateia', color: 'text-alcateia' },
  { id: 'sharks', label: 'Squad Sharks', icon: TrendingUp, permission: 'sharks', color: 'text-sharks' },
];

const mainItems: MenuItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, permission: 'dashboard' },
  { id: 'sdrs', label: 'SDRs', icon: Phone, permission: 'sdrs' },
  { id: 'reports', label: 'Relatórios', icon: FileText, permission: 'reports' },
];

const adminItems: MenuItem[] = [
  { id: 'admin', label: 'Painel Admin', icon: Settings, permission: 'admin' },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeModule: ModuleId;
  onModuleChange: (module: ModuleId) => void;
}

export function Sidebar({ isOpen, onClose, activeModule, onModuleChange }: SidebarProps) {
  const { signOut, hasPermission, isAdmin } = useAuth();

  const handleLogout = async () => {
    await signOut();
  };

  const filterItems = (items: MenuItem[]) => {
    return items.filter((item) => {
      if (isAdmin) return true;
      if (item.id === 'admin') return false;
      return hasPermission(item.permission);
    });
  };

  const filteredMainItems = filterItems(mainItems);
  const filteredSquadItems = filterItems(squadItems);
  const filteredAdminItems = filterItems(adminItems);

  const renderMenuItem = (item: MenuItem) => {
    const isActive = activeModule === item.id;
    return (
      <button
        key={item.id}
        onClick={() => {
          onModuleChange(item.id);
          if (window.innerWidth < 768) onClose();
        }}
        className={cn(
          'w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200',
          'group relative overflow-hidden',
          isActive
            ? 'bg-primary text-primary-foreground shadow-md'
            : 'text-sidebar-foreground hover:bg-sidebar-accent'
        )}
      >
        <item.icon 
          size={20} 
          className={cn(
            'transition-colors shrink-0',
            isActive ? '' : item.color
          )} 
        />
        <span className="font-medium">{item.label}</span>
        {isActive && (
          <div className="absolute inset-y-0 left-0 w-1 bg-primary-foreground/30 rounded-r" />
        )}
      </button>
    );
  };

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden animate-fade-in"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 h-full z-50 transition-all duration-300',
          'bg-sidebar border-r border-sidebar-border',
          'md:w-64 md:translate-x-0',
          isOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-full md:translate-x-0',
        )}
      >
        <div className="p-6 h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                <TrendingUp size={20} className="text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-sidebar-foreground">Monetização</h2>
                <p className="text-xs text-muted-foreground">Dashboard de Vendas</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-colors md:hidden"
            >
              <X size={20} />
            </button>
          </div>

          {/* Navigation */}
          <nav className="space-y-6 flex-1 overflow-y-auto">
            {/* Main section */}
            <div className="space-y-1">
              <p className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Principal
              </p>
              {filteredMainItems.map(renderMenuItem)}
            </div>

            {/* Squads section */}
            {filteredSquadItems.length > 0 && (
              <div className="space-y-1">
                <p className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Squads
                </p>
                {filteredSquadItems.map(renderMenuItem)}
              </div>
            )}

            {/* Admin section */}
            {filteredAdminItems.length > 0 && (
              <>
                <Separator className="bg-sidebar-border" />
                <div className="space-y-1">
                  <p className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Administração
                  </p>
                  {filteredAdminItems.map(renderMenuItem)}
                </div>
              </>
            )}
          </nav>

          {/* Logout */}
          <Separator className="bg-sidebar-border my-4" />
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="w-full justify-start gap-3 px-4 py-3 h-auto text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <LogOut size={20} />
            <span className="font-medium">Sair</span>
          </Button>
        </div>
      </aside>
    </>
  );
}
