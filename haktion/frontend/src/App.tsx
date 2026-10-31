import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar } from './components/Sidebar';
import { LoginModal } from './components/LoginModal';
import { DashboardView } from './components/DashboardView';
import { LoggersView } from './components/LoggersView';
import { NewCalibrationWorkflow } from './components/NewCalibrationWorkflow';
import { CalibrationRecordsView } from './components/CalibrationRecordsView';
import { CalibrationHistoryView } from './components/CalibrationHistoryView';
import { ReferenceInstrumentsView } from './components/ReferenceInstrumentsView';
import { CertificatesView } from './components/CertificatesView';
import { AuditTrailView } from './components/AuditTrailView';
import { NotificationsView } from './components/NotificationsView';
import { SettingsView } from './components/SettingsView';
import { api } from './services/api';
import { Bell, ShieldCheck, Scale, CheckCircle2 } from 'lucide-react';

const AppContent: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [navParam, setNavParam] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  const fetchUnread = async () => {
    if (!isAuthenticated) return;
    try {
      const res = await api.get('/notifications', { params: { unread_only: true } });
      setUnreadCount(res.data.length);
    } catch (err) {
      // ignore
    }
  };

  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated, currentTab]);

  const handleNavigate = (tab: string, param?: string) => {
    setCurrentTab(tab);
    setNavParam(param || null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {!isAuthenticated && <LoginModal />}

      {/* Collapsible Sidebar */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={(tab) => {
          setCurrentTab(tab);
          setNavParam(null);
        }}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        unreadCount={unreadCount}
      />

      {/* Main Content Area */}
      <div
        className={`flex-1 transition-all duration-300 flex flex-col ${
          collapsed ? 'pl-20' : 'pl-64'
        }`}
      >
        {/* Top Navbar */}
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-20 shadow-xs">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Metrology Workspace
            </span>
            <span className="text-slate-300">/</span>
            <span className="text-sm font-bold text-slate-800 capitalize">
              {currentTab.replace('-', ' ')}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-[11px] font-medium border border-slate-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>SHA-256 Provenance Chain Active</span>
            </div>

            <button
              onClick={() => setCurrentTab('notifications')}
              className="relative p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              title="Notifications"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500"></span>
              )}
            </button>
          </div>
        </header>

        {/* Dynamic Page Views */}
        <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
          {currentTab === 'dashboard' && <DashboardView onNavigate={handleNavigate} />}
          {currentTab === 'loggers' && (
            <LoggersView
              onSelectLoggerForCal={(id) => handleNavigate('new-calibration', id)}
              onNavigateToHistory={(id) => handleNavigate('history', id)}
            />
          )}
          {currentTab === 'new-calibration' && (
            <NewCalibrationWorkflow
              initialLoggerId={navParam}
              onCalibrationFinished={(recId) => handleNavigate('calibrations')}
            />
          )}
          {currentTab === 'calibrations' && <CalibrationRecordsView />}
          {currentTab === 'history' && <CalibrationHistoryView initialLoggerId={navParam} />}
          {currentTab === 'reference-instruments' && <ReferenceInstrumentsView />}
          {currentTab === 'certificates' && <CertificatesView />}
          {currentTab === 'audit-trail' && <AuditTrailView />}
          {currentTab === 'notifications' && <NotificationsView />}
          {currentTab === 'settings' && <SettingsView />}
        </main>
      </div>
    </div>
  );
};

export function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
