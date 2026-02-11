import React, { useState, useEffect, lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Sidebar, ModuleId } from '@/components/dashboard/Sidebar';
import { Header } from '@/components/dashboard/Header';
import { BottomNavigation } from '@/components/dashboard/BottomNavigation';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Loader2 } from 'lucide-react';

// P2: Lazy load heavy page components
const DashboardOverview = lazy(() => import('@/components/dashboard/DashboardOverview').then(m => ({ default: m.DashboardOverview })));
const SquadPage = lazy(() => import('@/components/dashboard/SquadPage').then(m => ({ default: m.SquadPage })));
const AdminPanel = lazy(() => import('@/components/dashboard/AdminPanel').then(m => ({ default: m.AdminPanel })));
const SDRDashboard = lazy(() => import('@/components/dashboard/sdr').then(m => ({ default: m.SDRDashboard })));
const UserDashboard = lazy(() => import('@/components/dashboard/UserDashboard').then(m => ({ default: m.UserDashboard })));
const GoalsConfig = lazy(() => import('@/components/dashboard/GoalsConfig').then(m => ({ default: m.GoalsConfig })));
const MeetingsPage = lazy(() => import('@/components/dashboard/meetings').then(m => ({ default: m.MeetingsPage })));

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

const Index = () => {
  const [searchParams] = useSearchParams();
  const { user, loading, isUser } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeModule, setActiveModule] = useState<ModuleId>('dashboard');

  // Handle URL module parameter
  useEffect(() => {
    const moduleParam = searchParams.get('module');
    if (moduleParam && ['dashboard', 'eagles', 'alcateia', 'sharks', 'sdrs', 'reports', 'admin', 'goals', 'meetings'].includes(moduleParam)) {
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
    return (
      <Suspense fallback={<PageLoader />}>
        <UserDashboard />
      </Suspense>
    );
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
      case 'meetings':
        return <MeetingsPage />;
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
          <ErrorBoundary section={activeModule} key={activeModule}>
            <Suspense fallback={<PageLoader />}>
              {renderContent()}
            </Suspense>
          </ErrorBoundary>
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
