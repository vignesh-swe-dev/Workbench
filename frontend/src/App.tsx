// Workbench main single-page application router
import React, { Suspense, lazy } from 'react';
import { AppProvider, useApp } from './context/AppContext.tsx';
import { TopBar } from './components/TopBar.tsx';
import { Sidebar } from './components/Sidebar.tsx';
import { ToastProvider } from './ui/Toast.tsx';
import { Skeleton } from './ui/Skeleton.tsx';
import { Logo } from './ui/Logo.tsx';
import { AuthPage } from './components/AuthPage.tsx';
import { Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Lazy-load heavy views
const KanbanBoard      = lazy(() => import('./components/KanbanBoard.tsx').then(m => ({ default: m.KanbanBoard })));
const TaskListView     = lazy(() => import('./components/TaskListView.tsx').then(m => ({ default: m.TaskListView })));
const ReleasesView     = lazy(() => import('./components/ReleasesView.tsx').then(m => ({ default: m.ReleasesView })));
const AnalyticsView    = lazy(() => import('./components/AnalyticsView.tsx').then(m => ({ default: m.AnalyticsView })));
const TeamView         = lazy(() => import('./components/TeamView.tsx').then(m => ({ default: m.TeamView })));
const GitHubSimulator  = lazy(() => import('./components/GitHubSimulatorView.tsx').then(m => ({ default: m.GitHubSimulatorView })));
const DocsView         = lazy(() => import('./components/DocsView.tsx').then(m => ({ default: m.DocsView })));
const TaskDetailModal  = lazy(() => import('./components/TaskDetailModal.tsx').then(m => ({ default: m.TaskDetailModal })));
const CreateTaskModal  = lazy(() => import('./components/CreateTaskModal.tsx').then(m => ({ default: m.CreateTaskModal })));
const CreateProjectModal = lazy(() => import('./components/CreateProjectModal.tsx').then(m => ({ default: m.CreateProjectModal })));
const InviteMemberModal  = lazy(() => import('./components/InviteMemberModal.tsx').then(m => ({ default: m.InviteMemberModal })));
const ActivityDrawer     = lazy(() => import('./components/ActivityDrawer.tsx').then(m => ({ default: m.ActivityDrawer })));

function PageSkeleton() {
  return (
    <div className="flex-1 p-6 space-y-4">
      <div className="flex gap-3">
        {[1,2,3,4].map(i => (
          <div key={i} className="flex-1 h-24 rounded-[var(--radius)] border border-[var(--border)] skeleton" />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[1,2,3].map(i => (
          <div key={i} className="space-y-3 p-4 border border-[var(--border)] rounded-[var(--radius)] bg-[var(--surface)]">
            {[1,2,3].map(j => (
              <div key={j} className="h-20 rounded-[var(--radius-sm)] skeleton" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function AppLoading() {
  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-[#F8FAFC] gap-3 select-none">
      <div className="w-9 h-9 rounded-[6px] bg-[#1E293B] flex items-center justify-center shadow-xs">
        <Logo variant="dark" size={22} showWordmark={false} />
      </div>
      <p className="text-[13px] font-medium text-[#6B7280]">Loading workspace…</p>
    </div>
  );
}

function MainContent() {
  const { activeTab } = useApp();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="flex-1 flex flex-col min-w-0 overflow-hidden"
      >
        <Suspense fallback={<PageSkeleton />}>
          {activeTab === 'board'     && <KanbanBoard />}
          {activeTab === 'list'      && <TaskListView />}
          {activeTab === 'releases'  && <ReleasesView />}
          {activeTab === 'analytics' && <AnalyticsView />}
          {activeTab === 'members'   && <TeamView />}
          {activeTab === 'github'    && <GitHubSimulator />}
          {activeTab === 'docs'      && <DocsView />}
        </Suspense>
      </motion.div>
    </AnimatePresence>
  );
}

function MainLayout() {
  const { loading, authStatus } = useApp();

  if (loading || authStatus === 'loading') return <AppLoading />;
  if (authStatus === 'unauthenticated') return <AuthPage />;

  return (
    <div className="h-full flex flex-col bg-[var(--bg)] overflow-hidden">
      <TopBar />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <main className="flex-1 flex overflow-hidden relative">
          <MainContent />
        </main>
      </div>

      {/* Overlays — lazy loaded */}
      <Suspense fallback={null}>
        <TaskDetailModal />
        <CreateTaskModal />
        <CreateProjectModal />
        <InviteMemberModal />
        <ActivityDrawer />
      </Suspense>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppProvider>
        <MainLayout />
      </AppProvider>
    </ToastProvider>
  );
}
