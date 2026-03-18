import React, { useState } from 'react';
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
  ChevronRight,
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useClosers } from '@/controllers/useCloserController';
import { useSDRs } from '@/controllers/useSdrController';

export type ModuleId = 'dashboard' | 'closers' | 'eagles' | 'sharks' | 'sdrs' | 'social_selling' | 'funil_intensivo' | 'reports' | 'admin' | 'goals' | 'meetings';

interface MenuItem {
  id: ModuleId;
  label: string;
  icon: React.ElementType;
  permission: string;
  color?: string;
  expandable?: boolean;
}

const squadItems: MenuItem[] = [
  { id: 'eagles', label: 'Squad Eagles', icon: Zap, permission: 'eagles', color: 'text-eagles' },
  { id: 'sharks', label: 'Squad Sharks', icon: TrendingUp, permission: 'sharks', color: 'text-sharks' },
];

const mainItems: MenuItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, permission: 'dashboard' },
  { id: 'closers', label: 'Closers', icon: UserCheck, permission: 'closers', expandable: true },
  { id: 'sdrs', label: 'SDRs', icon: Phone, permission: 'sdrs', expandable: true },
  { id: 'social_selling', label: 'Social Selling', icon: Users, permission: 'sdrs', expandable: true },
  { id: 'funil_intensivo', label: 'Funil Intensivo', icon: Phone, permission: 'funil_intensivo', expandable: true },
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
  isExpanded: boolean;
  onExpandChange: (expanded: boolean) => void;
  activeModule: ModuleId;
  onModuleChange: (module: ModuleId) => void;
}

export function Sidebar({ isOpen, onClose, isExpanded, onExpandChange, activeModule, onModuleChange }: SidebarProps) {
  const { signOut, hasPermission, isAdmin, isManager } = useAuth();
  const [, setSearchParams] = useSearchParams();
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  const { data: closers } = useClosers();
  const { data: sdrs } = useSDRs('sdr');
  const { data: socialSellers } = useSDRs('social_selling');
  const { data: funilIntensivo } = useSDRs('funil_intensivo');

  const handleLogout = async () => {
    await signOut();
  };

  const toggleExpand = (id: string) => {
    setExpandedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const getExpandableProfiles = (itemId: ModuleId) => {
    switch (itemId) {
      case 'closers':
        return closers?.map((c) => ({ id: c.id, name: c.name })) || [];
      case 'sdrs':
        return sdrs?.map((s) => ({ id: s.id, name: s.name })) || [];
      case 'social_selling':
        return socialSellers?.map((s) => ({ id: s.id, name: s.name })) || [];
      case 'funil_intensivo':
        return funilIntensivo?.map((s) => ({ id: s.id, name: s.name })) || [];
      default:
        return [];
    }
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

  const renderMenuItem = (item: MenuItem, sidebarExpanded: boolean) => {
    const isActive = activeModule === item.id;
    const isItemExpanded = expandedItems[item.id] || false;
    const profiles = item.expandable ? getExpandableProfiles(item.id) : [];

    // Collapsed desktop: icon-only button
    if (!sidebarExpanded && item.expandable) {
      return (
        <div key={item.id}>
          <button
            onClick={() => {
              setSearchParams({ module: item.id });
              onModuleChange(item.id);
              if (window.innerWidth < 768) onClose();
            }}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200',
              'group relative',
              isActive
                ? 'bg-sidebar-primary/15 text-sidebar-primary font-semibold'
                : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50',
              !sidebarExpanded && 'md:justify-center md:px-0'
            )}
            title={!sidebarExpanded ? item.label : undefined}
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
            <span className={cn('text-sm', !sidebarExpanded && 'md:hidden')}>{item.label}</span>
          </button>
        </div>
      );
    }

    if (item.expandable) {
      return (
        <div key={item.id}>
          <div className="flex items-center">
            <button
              onClick={() => {
                setSearchParams({ module: item.id });
                onModuleChange(item.id);
                if (window.innerWidth < 768) onClose();
              }}
              className={cn(
                'flex-1 flex items-center gap-3 px-3 py-2.5 rounded-l-xl transition-all duration-200',
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
            <button
              onClick={() => toggleExpand(item.id)}
              className={cn(
                'px-2 py-2.5 rounded-r-xl transition-all duration-200',
                isActive
                  ? 'bg-sidebar-primary/15 text-sidebar-primary'
                  : 'text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
              )}
            >
              <ChevronRight
                size={14}
                className={cn(
                  'transition-transform duration-200',
                  isItemExpanded && 'rotate-90'
                )}
              />
            </button>
          </div>
          <div
            className={cn(
              'overflow-hidden transition-all duration-200',
              isItemExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
            )}
          >
            <div className="mt-1 space-y-0.5">
              {profiles.map((profile) => (
                <button
                  key={profile.id}
                  onClick={() => {
                    const paramKey = item.id === 'closers' ? 'closer' : 'sdr';
                    const moduleName = item.id;
                    setSearchParams({ module: moduleName, [paramKey]: profile.id });
                    onModuleChange(item.id);
                    if (window.innerWidth < 768) onClose();
                  }}
                  className="w-full flex items-center gap-3 pl-9 pr-3 py-1.5 rounded-xl text-sidebar-foreground/55 hover:text-sidebar-foreground hover:bg-sidebar-accent/40 transition-all duration-150"
                >
                  <item.icon size={14} className="text-sidebar-foreground/35 shrink-0" />
                  <span className="text-[13px] truncate">{profile.name}</span>
                </button>
              ))}
              {profiles.length === 0 && (
                <p className="pl-9 pr-3 py-1.5 text-xs text-sidebar-foreground/30 italic">
                  Nenhum perfil
                </p>
              )}
            </div>
          </div>
        </div>
      );
    }

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
            : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50',
          !sidebarExpanded && 'md:justify-center md:px-0'
        )}
        title={!sidebarExpanded ? item.label : undefined}
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
        <span className={cn('text-sm', !sidebarExpanded && 'md:hidden')}>{item.label}</span>
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
        onClick={() => {
          if (!isExpanded && window.innerWidth >= 768) onExpandChange(true);
        }}
        className={cn(
          'fixed left-0 top-0 h-full z-50 transition-all duration-300 overflow-hidden',
          'bg-sidebar border-r border-sidebar-border',
          isOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-full',
          // Desktop: collapsed (w-16) or expanded (w-64), always visible
          isExpanded ? 'md:w-64 md:translate-x-0' : 'md:w-16 md:translate-x-0',
          !isExpanded && 'md:cursor-pointer',
        )}
      >
        <div className={cn('py-6 h-full flex flex-col transition-all duration-300', isExpanded ? 'px-4' : 'md:px-1.5 px-4')}>
          {/* Header */}
          <div className={cn('flex items-center justify-between mb-8', isExpanded ? 'px-2' : 'md:px-0 md:justify-center px-2')}>
            <div className={cn('flex items-center gap-3', !isExpanded && 'md:justify-center md:gap-0')}>
              <div className="w-9 h-9 rounded-xl bg-sidebar-primary flex items-center justify-center shrink-0">
                <TrendingUp size={18} className="text-white" />
              </div>
              <div className={cn(!isExpanded && 'md:hidden')}>
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
              <p className={cn('px-3 text-[10px] font-semibold text-sidebar-foreground/40 uppercase tracking-[0.15em] mb-2', !isExpanded && 'md:hidden')}>
                Principal
              </p>
              {filteredMainItems.map((item) => renderMenuItem(item, isExpanded))}
            </div>

            {/* Squads section */}
            {filteredSquadItems.length > 0 && (
              <div className="space-y-0.5">
                <p className={cn('px-3 text-[10px] font-semibold text-sidebar-foreground/40 uppercase tracking-[0.15em] mb-2', !isExpanded && 'md:hidden')}>
                  Squads
                </p>
                {filteredSquadItems.map((item) => renderMenuItem(item, isExpanded))}
              </div>
            )}

            {/* Admin section */}
            {filteredAdminItems.length > 0 && (
              <>
                <div className="mx-3 h-px bg-sidebar-border" />
                <div className="space-y-0.5">
                  <p className={cn('px-3 text-[10px] font-semibold text-sidebar-foreground/40 uppercase tracking-[0.15em] mb-2', !isExpanded && 'md:hidden')}>
                    Administração
                  </p>
                  {filteredAdminItems.map((item) => renderMenuItem(item, isExpanded))}
                </div>
              </>
            )}
          </nav>

          {/* Logout */}
          <div className="mx-3 h-px bg-sidebar-border my-3" />
          <button
            onClick={handleLogout}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-400/80 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200',
              !isExpanded && 'md:justify-center md:px-0'
            )}
            title={!isExpanded ? 'Sair' : undefined}
          >
            <LogOut size={18} />
            <span className={cn(!isExpanded && 'md:hidden')}>Sair</span>
          </button>
        </div>
      </aside>
    </>
  );
}
