import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Sidebar, ModuleId } from '@/components/dashboard/Sidebar';
import { Header } from '@/components/dashboard/Header';
import { BottomNavigation } from '@/components/dashboard/BottomNavigation';
import { DashboardOverview } from '@/components/dashboard/DashboardOverview';
import { SquadPage } from '@/components/dashboard/SquadPage';
import { AdminPanel } from '@/components/dashboard/AdminPanel';
import { SDRDashboard } from '@/components/dashboard/sdr';
import { UserDashboard } from '@/components/dashboard/UserDashboard';
import { GoalsConfig } from '@/components/dashboard/GoalsConfig';
import { Loader2 } from 'lucide-react';

const Index = () => {
  const [searchParams] = useSearchParams();
  const { user, loading, isUser } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeModule, setActiveModule] = useState<ModuleId>('dashboard');

  // Handle URL module parameter
  useEffect(() => {
    const moduleParam = searchParams.get('module');
    if (moduleParam && ['dashboard', 'eagles', 'alcateia', 'sharks', 'sdrs', 'reports', 'admin', 'goals'].includes(moduleParam)) {
      setActiveModule(moduleParam as ModuleId);
    }
  }, [searchParams]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  // Role "user" gets a dedicated layout without sidebar
  if (isUser) {
    return <UserDashboard />;
  }

  const renderContent = () => {
    switch (activeModule) {
      case 'dashboard':
        return <DashboardOverview />;
      case 'eagles':
        return <SquadPage squadSlug="eagles" />;
      case 'alcateia':
        return <SquadPage squadSlug="alcateia" />;
      case 'sharks':
        return <SquadPage squadSlug="sharks" />;
      case 'admin':
        return <AdminPanel />;
      case 'goals':
        return <GoalsConfig />;
      case 'sdrs':
        return <SDRDashboard />;
      case 'reports':
        return (
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-foreground mb-2">Relatórios</h2>
              <p className="text-muted-foreground">Em desenvolvimento...</p>
            </div>
          </div>
        );
      default:
        return <DashboardOverview />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeModule={activeModule}
        onModuleChange={setActiveModule}
      />
      
      <div className="md:pl-64 min-h-screen flex flex-col">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        
        <main className="flex-1 p-4 md:p-6 lg:p-8 pb-24 md:pb-8">
          {renderContent()}
        </main>
      </div>
      
      {/* Mobile Bottom Navigation */}
      <BottomNavigation
        activeModule={activeModule}
        onModuleChange={setActiveModule}
      />
    </div>
  );
};

export default Index;
