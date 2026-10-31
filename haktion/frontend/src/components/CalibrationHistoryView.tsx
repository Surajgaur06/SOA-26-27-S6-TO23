import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { CalibrationRecord, TemperatureLogger } from '../types';
import {
  TrendingUp,
  Search,
  Filter,
  Activity,
  Calendar,
  Layers,
  History,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

interface CalibrationHistoryViewProps {
  initialLoggerId?: string | null;
}

export const CalibrationHistoryView: React.FC<CalibrationHistoryViewProps> = ({
  initialLoggerId,
}) => {
  const [loggers, setLoggers] = useState<TemperatureLogger[]>([]);
  const [selectedLoggerId, setSelectedLoggerId] = useState<string>(initialLoggerId || '');
  const [historyRecords, setHistoryRecords] = useState<CalibrationRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLoggers = async () => {
      try {
        const res = await api.get('/loggers');
        setLoggers(res.data);
        if (!selectedLoggerId && res.data.length > 0) {
          setSelectedLoggerId(String(res.data[0].id));
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchLoggers();
  }, []);

  useEffect(() => {
    if (!selectedLoggerId) return;
    const fetchHistory = async () => {
      try {
        setLoading(true);
        const res = await api.get('/calibrations', {
          params: { logger_id: selectedLoggerId },
        });
        setHistoryRecords(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [selectedLoggerId]);

  const selectedLogger = loggers.find((l) => String(l.id) === selectedLoggerId);

  // Prepare trend chart data across calibration dates
  const trendData = [...historyRecords]
    .reverse()
    .map((rec) => {
      const dataPoint: any = {
        date: rec.calibration_date.split('T')[0],
        record: rec.record_number,
        tolerance: rec.configured_tolerance,
        neg_tolerance: -rec.configured_tolerance,
        maxError: rec.max_error,
      };
      rec.measurement_points.forEach((pt) => {
        dataPoint[`pt_${pt.nominal_temperature}C`] = pt.error;
      });
      return dataPoint;
    });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Calibration Trends & Drift History</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Evaluate longitudinal sensor drift, error trends across multiple calibration sessions, and tolerance margins
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-700">Select Logger:</label>
          <select
            value={selectedLoggerId}
            onChange={(e) => setSelectedLoggerId(e.target.value)}
            className="py-1.5 px-3 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 font-semibold text-slate-800"
          >
            {loggers.map((l) => (
              <option key={l.id} value={l.id}>
                {l.logger_id} – {l.manufacturer} {l.model}
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedLogger && (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap gap-6 text-xs">
          <div>
            <span className="text-slate-400 uppercase text-[10px] font-bold block">Logger ID</span>
            <span className="font-bold text-teal-800 text-sm">{selectedLogger.logger_id}</span>
          </div>
          <div>
            <span className="text-slate-400 uppercase text-[10px] font-bold block">Model & Serial</span>
            <span className="font-semibold text-slate-800">{selectedLogger.manufacturer} {selectedLogger.model} ({selectedLogger.serial_number})</span>
          </div>
          <div>
            <span className="text-slate-400 uppercase text-[10px] font-bold block">Location</span>
            <span className="font-semibold text-slate-800">{selectedLogger.location}</span>
          </div>
          <div>
            <span className="text-slate-400 uppercase text-[10px] font-bold block">Accuracy Specification</span>
            <span className="font-semibold text-slate-800">{selectedLogger.accuracy_spec}</span>
          </div>
          <div>
            <span className="text-slate-400 uppercase text-[10px] font-bold block">Calibration Records Count</span>
            <span className="font-bold text-slate-900">{historyRecords.length} sessions</span>
          </div>
        </div>
      )}

      {/* Drift Trend Chart */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Measurement Error Drift Over Time</h3>
            <p className="text-xs text-slate-500">
              Error = Logger Reading - Reference Standard (Boundary lines indicate ±Acceptance Tolerance)
            </p>
          </div>
          <TrendingUp size={18} className="text-teal-600" />
        </div>

        {loading ? (
          <div className="h-64 flex items-center justify-center text-xs text-slate-400">
            Loading drift history...
          </div>
        ) : historyRecords.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-xs text-slate-400">
            No historical calibration data recorded for this logger yet.
          </div>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="date" stroke="#94A3B8" fontSize={11} />
                <YAxis stroke="#94A3B8" fontSize={11} unit="°C" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0F172A', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <ReferenceLine y={0} stroke="#CBD5E1" strokeWidth={1.5} />
                <ReferenceLine y={0.5} stroke="#EF4444" strokeDasharray="3 3" label={{ value: '+Tol', position: 'right', fill: '#EF4444', fontSize: 10 }} />
                <ReferenceLine y={-0.5} stroke="#EF4444" strokeDasharray="3 3" label={{ value: '-Tol', position: 'right', fill: '#EF4444', fontSize: 10 }} />
                <Line
                  type="monotone"
                  dataKey="maxError"
                  stroke="#0D9488"
                  strokeWidth={2.5}
                  name="Max Absolute Error"
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Chronological Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
            <History size={16} className="text-teal-600" /> Chronological Verification History
          </h3>
          <span className="text-xs text-slate-500 font-medium">{historyRecords.length} Records</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3">Record Number</th>
                <th className="p-3">Date</th>
                <th className="p-3">Reference Standard</th>
                <th className="p-3">Technician</th>
                <th className="p-3">Max Error</th>
                <th className="p-3">Tolerance</th>
                <th className="p-3">Overall Outcome</th>
                <th className="p-3">Version / State</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {historyRecords.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="p-3 font-mono font-bold text-teal-800">{r.record_number}</td>
                  <td className="p-3 font-mono">{r.calibration_date.split('T')[0]}</td>
                  <td className="p-3">{r.reference_instrument?.instrument_id || `REF #${r.reference_instrument_id}`}</td>
                  <td className="p-3">{r.technician?.full_name || 'Staff Technician'}</td>
                  <td className="p-3 font-mono font-bold">{r.max_error.toFixed(3)} °C</td>
                  <td className="p-3 font-mono">±{r.configured_tolerance.toFixed(2)} °C</td>
                  <td className="p-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        r.overall_outcome === 'pass'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {r.overall_outcome === 'pass' ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
                      {r.overall_outcome.toUpperCase()}
                    </span>
                  </td>
                  <td className="p-3 uppercase text-[10px] font-bold text-slate-500">
                    {r.state} (v{r.version})
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
