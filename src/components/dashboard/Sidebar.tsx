import React from 'react';
import {
  LayoutDashboard,
  Users,
  Phone,
  FileText,
  Settings,
  LogOut,
  X,
  ChevronLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

export type ModuleId = 'dashboard' | 'eagles' | 'alcateia' | 'sharks' | 'sdrs' | 'reports' | 'admin';

interface MenuItem {
  id: ModuleId;
  label: string;
  icon: React.ElementType;
  permission: string;
}

const menuItems: MenuItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, permission: 'dashboard' },
  { id: 'eagles', label: 'Squad Eagles', icon: Users, permission: 'eagles' },
  { id: 'alcateia', label: 'Squad Alcateia', icon: Users, permission: 'alcateia' },
  { id: 'sharks', label: 'Squad Sharks', icon: Users, permission: 'sharks' },
  { id: 'sdrs', label: 'SDRs', icon: Phone, permission: 'sdrs' },
  { id: 'reports', label: 'Relatórios', icon: FileText, permission: 'reports' },
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

  const filteredMenuItems = menuItems.filter((item) => {
    if (isAdmin) return true;
    if (item.id === 'admin') return false;
    return hasPermission(item.permission);
  });

  // Always show dashboard for authenticated users
  const hasOnlyDashboard = !filteredMenuItems.some(item => item.id !== 'dashboard' && item.id !== 'admin');

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          'fixed left-0 top-0 h-full bg-slate-800 border-r border-slate-700 transition-all duration-300 z-50',
          isOpen ? 'w-64' : 'w-0 lg:w-0',
          'overflow-hidden'
        )}
      >
        <div className="p-6 h-full flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold text-white">Monetização</h2>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          <nav className="space-y-2 flex-1">
            {filteredMenuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  onModuleChange(item.id);
                  if (window.innerWidth < 1024) onClose();
                }}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                  activeModule === item.id
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-slate-700'
                )}
              >
                <item.icon size={20} />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          <Button
            variant="ghost"
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-400 hover:bg-slate-700 hover:text-red-300 transition-colors justify-start"
          >
            <LogOut size={20} />
            <span>Sair</span>
          </Button>
        </div>
      </div>
    </>
  );
}
