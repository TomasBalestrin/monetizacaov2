import React, { useState, useEffect, useMemo } from 'react';
import { Menu, User, Timer } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { NotificationPanel } from './NotificationPanel';
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
import { useSDRs, useSDRFunnelsWithDates } from '@/controllers/useSdrController';
import { differenceInDays, isPast, parseISO, startOfDay } from 'date-fns';

interface HeaderProps {
  onMenuClick: () => void;
}

function FICountdown() {
  const { isAdmin, isManager, selectedEntity } = useAuth();
  const { data: fiSdrs } = useSDRs('funil_intensivo');
  const fiSdrId = fiSdrs?.[0]?.id;
  const isFIOwner = selectedEntity?.entity_type === 'sdr' && fiSdrs?.some(s => s.id === selectedEntity?.entity_id);
  const canSeeFI = isAdmin || isManager || isFIOwner;
  const { data: funnelsWithDates } = useSDRFunnelsWithDates(canSeeFI ? fiSdrId : undefined);

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const nextEvent = useMemo(() => {
    if (!funnelsWithDates) return null;
    const upcoming = funnelsWithDates
      .filter(f => f.event_date && !isPast(startOfDay(parseISO(f.event_date))))
      .sort((a, b) => a.event_date!.localeCompare(b.event_date!));
    return upcoming[0] || null;
  }, [funnelsWithDates]);

  if (!canSeeFI || !nextEvent?.event_date) return null;

  const target = startOfDay(parseISO(nextEvent.event_date));
  const daysLeft = differenceInDays(target, startOfDay(now));

  if (daysLeft < 0) return null;

  return (
    <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/8 border border-primary/15 text-xs">
      <Timer size={13} className="text-primary" />
      <span className="text-muted-foreground">{nextEvent.funnel_name}:</span>
      {daysLeft === 0 ? (
        <span className="font-bold text-primary">Hoje!</span>
      ) : (
        <span className="font-bold text-foreground">{daysLeft}d</span>
      )}
    </div>
  );
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
        return 'SDR';
      default:
        return 'Closer';
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
    <header
      className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl"
      style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}
    >
      <div className="flex items-center justify-between h-14 px-4 md:px-6">
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

          <div className="hidden md:flex items-center gap-1.5 text-sm">
            <span className="text-muted-foreground/70">Dashboard</span>
            <span className="text-muted-foreground/40">/</span>
            <span className="text-foreground font-medium">Visão Geral</span>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* FI Countdown */}
          <FICountdown />

          {/* Notifications */}
          <NotificationPanel />

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2.5 h-auto py-1.5 px-2.5 rounded-xl">
                <Avatar className="h-8 w-8 ring-2 ring-border/50">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                    {getUserInitials(user?.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-medium leading-none">{user?.email?.split('@')[0]}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{getRoleLabel(role)}</p>
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
