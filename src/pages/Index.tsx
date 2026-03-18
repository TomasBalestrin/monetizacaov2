import React, { useState, useEffect, lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Sidebar, ModuleId } from '@/components/dashboard/Sidebar';
import { Header } from '@/components/dashboard/Header';
import { BottomNavigation } from '@/components/dashboard/BottomNavigation';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { cn } from '@/lib/utils';
import { SaleCelebrationOverlay } from '@/components/dashboard/SaleCelebrationOverlay';
import { Loader2 } from 'lucide-react';

// P2: Lazy load heavy page components
const DashboardOverview = lazy(() => import('@/components/dashboard/DashboardOverview').then(m => ({ default: m.DashboardOverview })));
const SquadPage = lazy(() => import('@/components/dashboard/SquadPage').then(m => ({ default: m.SquadPage })));
const AdminPanel = lazy(() => import('@/components/dashboard/AdminPanel').then(m => ({ default: m.AdminPanel })));
const ClosersDashboard = lazy(() => import('@/components/dashboard/closer/ClosersDashboard').then(m => ({ default: m.ClosersDashboard })));
const SDRDashboard = lazy(() => import('@/components/dashboard/sdr/SDRDashboard').then(m => ({ default: m.SDRDashboard })));
const UserDashboard = lazy(() => import('@/components/dashboard/UserDashboard').then(m => ({ default: m.UserDashboard })));
const EntitySelectionScreen = lazy(() => import('@/components/dashboard/EntitySelectionScreen').then(m => ({ default: m.EntitySelectionScreen })));
const GoalsConfig = lazy(() => import('@/components/dashboard/GoalsConfig').then(m => ({ default: m.GoalsConfig })));
const MeetingsPage = lazy(() => import('@/components/dashboard/meetings').then(m => ({ default: m.MeetingsPage })));
const ReportsPage = lazy(() => import('@/components/dashboard/reports').then(m => ({ default: m.ReportsPage })));

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

const Index = () => {
  const [searchParams] = useSearchParams();
  const { user, loading, isUser, needsEntitySelection } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [activeModule, setActiveModule] = useState<ModuleId>('dashboard');

  // Handle URL module parameter
  useEffect(() => {
    const moduleParam = searchParams.get('module');
    if (moduleParam && ['dashboard', 'closers', 'eagles', 'sharks', 'sdrs', 'social_selling', 'funil_intensivo', 'reports', 'admin', 'goals', 'meetings'].includes(moduleParam)) {
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

  // Team accounts need to select their entity first
  if (isUser && needsEntitySelection) {
    return (
      <Suspense fallback={<PageLoader />}>
        <EntitySelectionScreen />
      </Suspense>
    );
  }

  const renderContent = () => {
    switch (activeModule) {
      case 'dashboard':
        return <DashboardOverview />;
      case 'closers':
        return <ClosersDashboard />;
      case 'eagles':
        return <SquadPage squadSlug="eagles" />;
      case 'sharks':
        return <SquadPage squadSlug="sharks" />;
      case 'admin':
        return <AdminPanel />;
      case 'goals':
        return <GoalsConfig />;
      case 'meetings':
        return <MeetingsPage />;
      case 'sdrs':
        return <SDRDashboard sdrType="sdr" />;
      case 'social_selling':
        return <SDRDashboard sdrType="social_selling" />;
      case 'funil_intensivo':
        return <SDRDashboard sdrType="funil_intensivo" />;
      case 'reports':
        return <ReportsPage />;
      default:
        return <DashboardOverview />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isExpanded={sidebarExpanded}
        onExpandChange={setSidebarExpanded}
        activeModule={activeModule}
        onModuleChange={setActiveModule}
      />

      {/* Overlay to close expanded sidebar on desktop */}
      {sidebarExpanded && (
        <div
          className="hidden md:block fixed inset-0 z-40"
          onClick={() => setSidebarExpanded(false)}
        />
      )}

      <div className={cn('min-h-screen flex flex-col transition-all duration-300', sidebarExpanded ? 'md:pl-64' : 'md:pl-16')}>
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

      {/* Global sale celebration overlay */}
      <SaleCelebrationOverlay />
    </div>
  );
};

export default Index;
