import React, { useState } from 'react';
import { Menu, User, Bell } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { user, role, signOut, isAdmin, isManager } = useAuth();

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

  const getRoleBadgeVariant = (role: string | null) => {
    switch (role) {
      case 'admin':
        return 'default';
      case 'manager':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getUserInitials = (email: string | undefined) => {
    if (!email) return 'U';
    return email.slice(0, 2).toUpperCase();
  };

  return (
    <header className="sticky top-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
      <div className="flex items-center justify-between h-16 px-4 md:px-6">
        {/* Left side */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="md:hidden"
          >
            <Menu size={20} />
          </Button>
          
          <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
            <span>Dashboard</span>
            <span>/</span>
            <span className="text-foreground font-medium">Visão Geral</span>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative">
            <Bell size={20} />
            <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
          </Button>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-3 h-auto py-2 px-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
                    {getUserInitials(user?.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-medium leading-none">{user?.email?.split('@')[0]}</p>
                  <p className="text-xs text-muted-foreground mt-1">{getRoleLabel(role)}</p>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-2">
                  <p className="text-sm font-medium leading-none">{user?.email}</p>
                  <Badge variant={getRoleBadgeVariant(role)} className="w-fit">
                    {getRoleLabel(role)}
                  </Badge>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                Meu Perfil
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="cursor-pointer text-destructive focus:text-destructive"
                onClick={() => signOut()}
              >
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
