import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { SystemNotification } from '../types';
import {
  Bell,
  Clock,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  Check,
  Scale,
  Calendar,
  Layers,
} from 'lucide-react';

export const NotificationsView: React.FC = () => {
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterUnread, setFilterUnread] = useState(false);

  const fetchNotifs = async () => {
    try {
      setLoading(true);
      const res = await api.get('/notifications', {
        params: { unread_only: filterUnread },
      });
      setNotifications(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifs();
  }, [filterUnread]);

  const handleMarkAsRead = async (id: number) => {
    try {
      await api.post(`/notifications/${id}/read`);
      setNotifications(
        notifications.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.post('/notifications/mark-all-read');
      setNotifications(notifications.map((n) => ({ ...n, is_read: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'overdue':
        return <AlertTriangle size={18} className="text-rose-600 shrink-0" />;
      case 'due_7_days':
        return <Clock size={18} className="text-amber-600 shrink-0" />;
      case 'due_30_days':
        return <Calendar size={18} className="text-teal-600 shrink-0" />;
      case 'expired_reference':
        return <Scale size={18} className="text-rose-600 shrink-0" />;
      case 'failed_calibration':
        return <XCircle size={18} className="text-red-600 shrink-0" />;
      default:
        return <Bell size={18} className="text-slate-500 shrink-0" />;
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Calibration Alerts & Notifications</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Automated alerts for expiring calibrations, overdue units, failed tolerances, and expired standards
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs"
            >
              <Check size={14} /> Mark all as read
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilterUnread(false)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            !filterUnread ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          All Notifications ({notifications.length})
        </button>
        <button
          onClick={() => setFilterUnread(true)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            filterUnread ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          Unread ({unreadCount})
        </button>
      </div>

      {/* Notification List */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs">Loading alerts...</div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-xs text-slate-500">
            No active alerts at this time. All calibrated devices are compliant.
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              className={`p-4 rounded-xl border flex items-start justify-between gap-4 transition-all ${
                n.is_read
                  ? 'bg-white border-slate-200 text-slate-600 opacity-80'
                  : 'bg-teal-50/30 border-teal-200 text-slate-900 shadow-xs'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">{getIcon(n.type)}</div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-xs text-slate-900">{n.title}</h4>
                    {!n.is_read && (
                      <span className="w-2 h-2 rounded-full bg-teal-500 inline-block"></span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">{n.message}</p>
                  <span className="text-[10px] text-slate-400 font-mono mt-2 block">
                    Triggered: {n.created_at.replace('T', ' ').slice(0, 16)} UTC
                  </span>
                </div>
              </div>

              {!n.is_read && (
                <button
                  onClick={() => handleMarkAsRead(n.id)}
                  className="px-2.5 py-1 text-[11px] font-semibold text-teal-700 hover:bg-teal-100 rounded border border-teal-200 transition-colors shrink-0"
                >
                  Mark Read
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
