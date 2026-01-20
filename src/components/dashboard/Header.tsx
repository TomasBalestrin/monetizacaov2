import React from 'react';
import { Menu } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { user, role } = useAuth();

  const getRoleLabel = (role: string | null) => {
    switch (role) {
      case 'admin':
        return 'Administrador';
      case 'manager':
        return 'Gerente';
      case 'viewer':
        return 'Visualizador';
      default:
        return 'Usuário';
    }
  };

  return (
    <div className="bg-slate-800 border-b border-slate-700 px-6 py-4">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          className="text-white hover:bg-slate-700"
        >
          <Menu size={24} />
        </Button>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-white font-semibold">{user?.email}</p>
            <p className="text-slate-400 text-sm">{getRoleLabel(role)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
