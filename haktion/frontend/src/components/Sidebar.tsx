import React from 'react';
import {
  LayoutDashboard,
  Cpu,
  FileCheck,
  PlusCircle,
  History,
  Scale,
  Award,
  ShieldCheck,
  Bell,
  Settings as SettingsIcon,
  ChevronLeft,
  ChevronRight,
  LogOut,
  User as UserIcon,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  unreadCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  collapsed,
  setCollapsed,
  unreadCount = 0,
}) => {
  const { user, logout } = useAuth();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'loggers', label: 'Temperature Loggers', icon: Cpu },
    { id: 'calibrations', label: 'Calibration Records', icon: FileCheck },
    { id: 'new-calibration', label: 'New Calibration', icon: PlusCircle },
    { id: 'history', label: 'Calibration History', icon: History },
    { id: 'reference-instruments', label: 'Reference Instruments', icon: Scale },
    { id: 'certificates', label: 'Certificates & Reports', icon: Award },
    { id: 'audit-trail', label: 'Audit Trail', icon: ShieldCheck },
    { id: 'notifications', label: 'Notifications', icon: Bell, badge: unreadCount },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <aside
      className={`fixed top-0 bottom-0 left-0 z-30 flex flex-col bg-slate-900 text-slate-300 transition-all duration-300 border-r border-slate-800 ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-slate-800 bg-slate-950/40">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-teal-500 text-slate-950 font-bold text-lg shadow-md shrink-0">
            °C
          </div>
          {!collapsed && (
            <div className="truncate">
              <span className="text-base font-bold tracking-tight text-white block">TempTrace</span>
              <span className="text-[10px] uppercase tracking-wider text-teal-400 font-semibold block">
                Metrology Provenance
              </span>
            </div>
          )}
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group relative ${
                isActive
                  ? 'bg-teal-500 text-slate-950 font-semibold shadow-sm'
                  : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-100'
              }`}
              title={collapsed ? item.label : undefined}
            >
              <Icon size={20} className={isActive ? 'text-slate-950 shrink-0' : 'text-slate-400 group-hover:text-teal-400 shrink-0'} />
              {!collapsed && <span className="truncate flex-1 text-left">{item.label}</span>}
              {item.badge && item.badge > 0 ? (
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                    isActive ? 'bg-slate-950 text-teal-300' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  }`}
                >
                  {item.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* User Info & Logout footer */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-teal-400 font-bold shrink-0">
            {user?.full_name ? user.full_name.charAt(0) : <UserIcon size={18} />}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-200 truncate">{user?.full_name}</p>
              <p className="text-[11px] text-teal-400 capitalize">{user?.role}</p>
            </div>
          )}
          <button
            onClick={logout}
            className="p-1.5 rounded-md hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 transition-colors shrink-0"
            title="Log out"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </aside>
  );
};
