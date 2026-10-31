import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { DashboardMetrics } from '../types';
import {
  ShieldCheck,
  Clock,
  AlertTriangle,
  XCircle,
  Cpu,
  Scale,
  Calendar,
  CheckCircle2,
  ChevronRight,
  TrendingUp,
  Activity,
  ArrowUpRight,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

interface DashboardViewProps {
  onNavigate: (tab: string, param?: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const res = await api.get('/dashboard/metrics');
      setMetrics(res.data);
    } catch (err: any) {
      setError('Unable to load dashboard telemetry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-500">
        <Activity className="animate-spin text-teal-600 mb-3" size={32} />
        <p className="text-sm font-medium">Computing metrology metrics and calibration statuses...</p>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 rounded-xl text-rose-700">
        <p className="font-semibold">{error || 'Data could not be loaded.'}</p>
        <button
          onClick={fetchMetrics}
          className="mt-3 px-4 py-1.5 bg-rose-600 text-white rounded text-sm font-medium"
        >
          Retry
        </button>
      </div>
    );
  }

  // Distribution chart data
  const pieData = [
    { name: 'Valid', value: metrics.valid_calibrations, color: '#10B981' },
    { name: 'Due Soon (≤30d)', value: metrics.due_soon_calibrations, color: '#F59E0B' },
    { name: 'Overdue', value: metrics.overdue_calibrations, color: '#EF4444' },
    { name: 'Failed', value: metrics.failed_calibrations, color: '#DC2626' },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Metrology Operations Dashboard</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time status of temperature logger calibrations, validity intervals, and sensor compliance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('new-calibration')}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
          >
            <Activity size={15} />
            Perform New Calibration
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Loggers */}
        <div
          onClick={() => onNavigate('loggers')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-teal-500 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Registered Loggers</span>
            <Cpu size={18} className="text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{metrics.total_loggers}</div>
          <p className="text-[11px] text-slate-500 mt-1">Active inventory units</p>
        </div>

        {/* Valid Calibrations */}
        <div
          onClick={() => onNavigate('loggers')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-emerald-500 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between text-emerald-600 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Calibration Valid</span>
            <CheckCircle2 size={18} />
          </div>
          <div className="text-2xl font-bold text-emerald-600">{metrics.valid_calibrations}</div>
          <p className="text-[11px] text-slate-500 mt-1">Compliant for operations</p>
        </div>

        {/* Due Soon */}
        <div
          onClick={() => onNavigate('notifications')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-amber-500 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between text-amber-600 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Due Soon (≤30d)</span>
            <Clock size={18} />
          </div>
          <div className="text-2xl font-bold text-amber-600">{metrics.due_soon_calibrations}</div>
          <p className="text-[11px] text-slate-500 mt-1">Recalibration required</p>
        </div>

        {/* Overdue */}
        <div
          onClick={() => onNavigate('notifications')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-rose-500 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between text-rose-600 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Overdue</span>
            <AlertTriangle size={18} />
          </div>
          <div className="text-2xl font-bold text-rose-600">{metrics.overdue_calibrations}</div>
          <p className="text-[11px] text-rose-500 font-medium mt-1">Non-compliant units</p>
        </div>

        {/* Out of Tolerance / Failed */}
        <div
          onClick={() => onNavigate('history')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-red-600 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between text-red-600 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Failed / Out of Tol</span>
            <XCircle size={18} />
          </div>
          <div className="text-2xl font-bold text-red-600">{metrics.failed_calibrations}</div>
          <p className="text-[11px] text-slate-500 mt-1">Exceeded acceptance criteria</p>
        </div>
      </div>

      {/* Analytics & Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Activity Bar Chart */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Calibration Verification Volume (6 Months)</h3>
              <p className="text-xs text-slate-500">Breakdown of passed vs failed calibration records</p>
            </div>
            <TrendingUp size={18} className="text-slate-400" />
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.activity_timeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="month" stroke="#94A3B8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0F172A', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="Passed" fill="#0D9488" radius={[4, 4, 0, 0]} name="Passed" />
                <Bar dataKey="Failed" fill="#EF4444" radius={[4, 4, 0, 0]} name="Failed" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Distribution Donut Chart */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-slate-900">Validity Distribution</h3>
              <ShieldCheck size={18} className="text-slate-400" />
            </div>
            <p className="text-xs text-slate-500 mb-4">Current compliance proportion across the fleet</p>
            <div className="h-48 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0F172A', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Valid Loggers
              </span>
              <span className="font-semibold text-slate-800">{metrics.valid_calibrations}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Due Soon
              </span>
              <span className="font-semibold text-slate-800">{metrics.due_soon_calibrations}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Overdue
              </span>
              <span className="font-semibold text-slate-800">{metrics.overdue_calibrations}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Tables: Upcoming Due Dates & Recent Calibrations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Calibration Due Dates */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-teal-600" />
              <h3 className="text-sm font-bold text-slate-900">Upcoming Calibration Due Dates</h3>
            </div>
            <button
              onClick={() => onNavigate('loggers')}
              className="text-xs text-teal-600 hover:text-teal-700 font-semibold flex items-center gap-0.5"
            >
              View all <ChevronRight size={14} />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/70 text-slate-600 font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Logger ID</th>
                  <th className="py-2.5 px-3">Location</th>
                  <th className="py-2.5 px-3">Due Date</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {metrics.upcoming_calibrations.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{item.logger_id}</td>
                    <td className="py-2.5 px-3 truncate max-w-[120px]">{item.location}</td>
                    <td className="py-2.5 px-3 font-mono">{item.next_due_date}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          item.status === 'Overdue'
                            ? 'bg-rose-100 text-rose-700'
                            : item.status === 'Due Soon'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {item.status} ({item.days_remaining}d)
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => onNavigate('new-calibration', String(item.id))}
                        className="text-teal-600 hover:text-teal-800 font-semibold hover:underline"
                      >
                        Calibrate
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Calibration Activity */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2">
              <Activity size={16} className="text-teal-600" />
              <h3 className="text-sm font-bold text-slate-900">Recent Calibration Records</h3>
            </div>
            <button
              onClick={() => onNavigate('calibrations')}
              className="text-xs text-teal-600 hover:text-teal-700 font-semibold flex items-center gap-0.5"
            >
              View all <ChevronRight size={14} />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/70 text-slate-600 font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Record #</th>
                  <th className="py-2.5 px-3">Logger</th>
                  <th className="py-2.5 px-3">Technician</th>
                  <th className="py-2.5 px-3">Max Error</th>
                  <th className="py-2.5 px-3">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {metrics.recent_calibrations.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-semibold text-teal-700">{item.record_number}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{item.logger_id}</td>
                    <td className="py-2.5 px-3 truncate max-w-[110px]">{item.technician}</td>
                    <td className="py-2.5 px-3 font-mono">{item.max_error.toFixed(3)} °C</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          item.outcome === 'pass' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                        }`}
                      >
                        {item.outcome.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
