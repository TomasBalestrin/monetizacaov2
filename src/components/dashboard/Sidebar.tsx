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
  Target,
  CalendarDays,
  UserCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

export type ModuleId = 'dashboard' | 'closers' | 'eagles' | 'sharks' | 'sdrs' | 'social_selling' | 'reports' | 'admin' | 'goals' | 'meetings';

interface MenuItem {
  id: ModuleId;
  label: string;
  icon: React.ElementType;
  permission: string;
  color?: string;
}

const squadItems: MenuItem[] = [
  { id: 'eagles', label: 'Squad Eagles', icon: Zap, permission: 'eagles', color: 'text-eagles' },
  { id: 'sharks', label: 'Squad Sharks', icon: TrendingUp, permission: 'sharks', color: 'text-sharks' },
];

const mainItems: MenuItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, permission: 'dashboard' },
  { id: 'closers', label: 'Closers', icon: UserCheck, permission: 'closers' },
  { id: 'sdrs', label: 'SDRs', icon: Phone, permission: 'sdrs' },
  { id: 'social_selling', label: 'Social Selling', icon: Users, permission: 'sdrs' },
  { id: 'meetings', label: 'Reuniões', icon: CalendarDays, permission: 'meetings' },
  { id: 'goals', label: 'Metas', icon: Target, permission: 'goals' },
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
  const { signOut, hasPermission, isAdmin, isManager } = useAuth();

  const handleLogout = async () => {
    await signOut();
  };

  const filterItems = (items: MenuItem[]) => {
    return items.filter((item) => {
      if (isAdmin) return true;
      if (item.id === 'admin') return false;
      if (item.id === 'goals' || item.id === 'meetings') return isManager;
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
          'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200',
          'group relative',
          isActive
            ? 'bg-sidebar-primary/15 text-sidebar-primary font-semibold'
            : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
        )}
      >
        {isActive && (
          <div className="absolute left-0 inset-y-1.5 w-[3px] rounded-r-full bg-sidebar-primary" />
        )}
        <item.icon
          size={18}
          className={cn(
            'transition-colors shrink-0',
            isActive ? 'text-sidebar-primary' : item.color || 'text-sidebar-foreground/50'
          )}
        />
        <span className="text-sm">{item.label}</span>
      </button>
    );
  };

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden animate-fade-in"
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
        <div className="px-4 py-6 h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between mb-8 px-2">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-sidebar-primary flex items-center justify-center">
                <TrendingUp size={18} className="text-white" />
              </div>
              <div>
                <h2 className="text-[15px] font-bold text-sidebar-foreground">Monetização</h2>
                <p className="text-[11px] text-sidebar-foreground/50">Dashboard de Vendas</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors md:hidden"
            >
              <X size={18} />
            </button>
          </div>

          {/* Navigation */}
          <nav className="space-y-6 flex-1 overflow-y-auto">
            {/* Main section */}
            <div className="space-y-0.5">
              <p className="px-3 text-[10px] font-semibold text-sidebar-foreground/40 uppercase tracking-[0.15em] mb-2">
                Principal
              </p>
              {filteredMainItems.map(renderMenuItem)}
            </div>

            {/* Squads section */}
            {filteredSquadItems.length > 0 && (
              <div className="space-y-0.5">
                <p className="px-3 text-[10px] font-semibold text-sidebar-foreground/40 uppercase tracking-[0.15em] mb-2">
                  Squads
                </p>
                {filteredSquadItems.map(renderMenuItem)}
              </div>
            )}

            {/* Admin section */}
            {filteredAdminItems.length > 0 && (
              <>
                <div className="mx-3 h-px bg-sidebar-border" />
                <div className="space-y-0.5">
                  <p className="px-3 text-[10px] font-semibold text-sidebar-foreground/40 uppercase tracking-[0.15em] mb-2">
                    Administração
                  </p>
                  {filteredAdminItems.map(renderMenuItem)}
                </div>
              </>
            )}
          </nav>

          {/* Logout */}
          <div className="mx-3 h-px bg-sidebar-border my-3" />
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-400/80 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
          >
            <LogOut size={18} />
            <span>Sair</span>
          </button>
        </div>
      </aside>
    </>
  );
}
