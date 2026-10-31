import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { TemperatureLogger, CalibrationRecord } from '../types';
import {
  Plus,
  Search,
  Filter,
  Cpu,
  MapPin,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Eye,
  Edit2,
  Trash2,
  FileText,
  Activity,
  History,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface LoggersViewProps {
  onSelectLoggerForCal: (loggerId: string) => void;
  onNavigateToHistory: (loggerId: string) => void;
}

export const LoggersView: React.FC<LoggersViewProps> = ({
  onSelectLoggerForCal,
  onNavigateToHistory,
}) => {
  const { user } = useAuth();
  const [loggers, setLoggers] = useState<TemperatureLogger[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedLogger, setSelectedLogger] = useState<TemperatureLogger | null>(null);
  const [loggerCals, setLoggerCals] = useState<CalibrationRecord[]>([]);
  const [loadingCals, setLoadingCals] = useState(false);

  // Modal create/edit state
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [formData, setFormData] = useState<any>({
    logger_id: '',
    manufacturer: '',
    model: '',
    serial_number: '',
    logger_type: 'Wireless Bluetooth',
    measurement_range: '-40°C to +85°C',
    resolution: 0.01,
    accuracy_spec: '±0.30°C',
    location: '',
    owner: '',
    commissioning_date: new Date().toISOString().split('T')[0],
    calibration_interval_months: 12,
    status: 'active',
    notes: '',
  });
  const [formError, setFormError] = useState<string | null>(null);

  const fetchLoggers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/loggers', {
        params: {
          search: search || undefined,
          status: statusFilter || undefined,
        },
      });
      setLoggers(res.data);
    } catch (err: any) {
      console.error('Error fetching loggers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLoggers();
  }, [search, statusFilter]);

  const handleOpenDetails = async (logger: TemperatureLogger) => {
    setSelectedLogger(logger);
    setLoadingCals(true);
    try {
      const res = await api.get('/calibrations', {
        params: { logger_id: logger.id },
      });
      setLoggerCals(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingCals(false);
    }
  };

  const handleOpenCreate = () => {
    setModalMode('create');
    setFormData({
      logger_id: `TL-${String(loggers.length + 1).padStart(3, '0')}`,
      manufacturer: '',
      model: '',
      serial_number: '',
      logger_type: 'Wireless Bluetooth',
      measurement_range: '-40°C to +85°C',
      resolution: 0.01,
      accuracy_spec: '±0.30°C',
      location: 'Main Biological Storage',
      owner: user?.full_name || 'Lab Staff',
      commissioning_date: new Date().toISOString().split('T')[0],
      calibration_interval_months: 12,
      status: 'active',
      notes: '',
    });
    setFormError(null);
    setShowModal(true);
  };

  const handleOpenEdit = (logger: TemperatureLogger) => {
    setModalMode('edit');
    setFormData({
      ...logger,
      commissioning_date: logger.commissioning_date.split('T')[0],
    });
    setFormError(null);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    try {
      if (modalMode === 'create') {
        await api.post('/loggers', {
          ...formData,
          commissioning_date: new Date(formData.commissioning_date).toISOString(),
          resolution: parseFloat(formData.resolution),
          calibration_interval_months: parseInt(formData.calibration_interval_months),
        });
      } else {
        await api.put(`/loggers/${formData.id}`, {
          ...formData,
          resolution: parseFloat(formData.resolution),
          calibration_interval_months: parseInt(formData.calibration_interval_months),
        });
      }
      setShowModal(false);
      fetchLoggers();
    } catch (err: any) {
      setFormError(err.response?.data?.detail || 'Failed to save logger.');
    }
  };

  const handleDelete = async (id: number, loggerId: string) => {
    if (!window.confirm(`Are you sure you want to delete logger ${loggerId}?`)) return;
    try {
      await api.delete(`/loggers/${id}`);
      fetchLoggers();
      if (selectedLogger?.id === id) {
        setSelectedLogger(null);
      }
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Delete failed.');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'valid':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
            <CheckCircle2 size={12} /> Valid
          </span>
        );
      case 'due_soon':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
            <Clock size={12} /> Due Soon (≤30d)
          </span>
        );
      case 'overdue':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">
            <AlertTriangle size={12} /> Overdue
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">
            <XCircle size={12} /> Out of Tol
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
            Uncalibrated
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Temperature Loggers</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage data loggers, sensors, calibration validity schedules, and historical records
          </p>
        </div>
        {user?.role !== 'auditor' && (
          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
          >
            <Plus size={16} /> Register New Logger
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Logger ID, Serial Number, Model, Location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="py-2 px-3 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-700"
          >
            <option value="">All Statuses</option>
            <option value="active">Active Loggers</option>
            <option value="inactive">Inactive</option>
            <option value="retired">Retired</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-700 uppercase font-semibold text-[11px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Logger ID</th>
                <th className="py-3 px-4">Manufacturer & Model</th>
                <th className="py-3 px-4">Serial Number</th>
                <th className="py-3 px-4">Range & Accuracy</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4">Next Due</th>
                <th className="py-3 px-4">Calibration Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Activity className="animate-spin inline-block text-teal-600 mb-2" size={24} />
                    <p>Loading temperature loggers...</p>
                  </td>
                </tr>
              ) : loggers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No loggers found matching your query.
                  </td>
                </tr>
              ) : (
                loggers.map((logger) => (
                  <tr key={logger.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-teal-700">{logger.logger_id}</td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{logger.manufacturer}</div>
                      <div className="text-[11px] text-slate-500">{logger.model} ({logger.logger_type})</div>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">{logger.serial_number}</td>
                    <td className="py-3 px-4">
                      <div>{logger.measurement_range}</div>
                      <div className="text-[11px] text-slate-500 font-mono">Spec: {logger.accuracy_spec}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1 text-slate-700">
                        <MapPin size={13} className="text-slate-400" />
                        <span className="truncate max-w-[130px]">{logger.location}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{logger.owner}</div>
                    </td>
                    <td className="py-3 px-4 font-mono">
                      {logger.next_due_date ? logger.next_due_date.split('T')[0] : 'None'}
                    </td>
                    <td className="py-3 px-4">{getStatusBadge(logger.calibration_status)}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenDetails(logger)}
                          className="p-1 rounded hover:bg-slate-100 text-slate-600 hover:text-slate-900"
                          title="View Details & History"
                        >
                          <Eye size={15} />
                        </button>
                        {user?.role !== 'auditor' && (
                          <button
                            onClick={() => onSelectLoggerForCal(String(logger.id))}
                            className="px-2 py-1 bg-teal-50 hover:bg-teal-100 text-teal-800 font-semibold rounded text-[11px]"
                            title="Start Calibration"
                          >
                            Calibrate
                          </button>
                        )}
                        {user?.role !== 'auditor' && (
                          <button
                            onClick={() => handleOpenEdit(logger)}
                            className="p-1 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-800"
                            title="Edit"
                          >
                            <Edit2 size={14} />
                          </button>
                        )}
                        {user?.role === 'admin' && (
                          <button
                            onClick={() => handleDelete(logger.id, logger.logger_id)}
                            className="p-1 rounded hover:bg-rose-50 text-rose-500 hover:text-rose-700"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details Slide-Over / Modal */}
      {selectedLogger && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold">
                  TL
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    {selectedLogger.logger_id} – {selectedLogger.manufacturer} {selectedLogger.model}
                  </h2>
                  <p className="text-xs text-slate-500">Serial Number: {selectedLogger.serial_number}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedLogger(null)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              {/* Specification Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-400 uppercase text-[10px] block font-bold">Type</span>
                  <span className="font-semibold text-slate-800">{selectedLogger.logger_type}</span>
                </div>
                <div>
                  <span className="text-slate-400 uppercase text-[10px] block font-bold">Range</span>
                  <span className="font-semibold text-slate-800">{selectedLogger.measurement_range}</span>
                </div>
                <div>
                  <span className="text-slate-400 uppercase text-[10px] block font-bold">Accuracy Spec</span>
                  <span className="font-semibold text-slate-800">{selectedLogger.accuracy_spec}</span>
                </div>
                <div>
                  <span className="text-slate-400 uppercase text-[10px] block font-bold">Resolution</span>
                  <span className="font-semibold text-slate-800">{selectedLogger.resolution} °C</span>
                </div>
                <div>
                  <span className="text-slate-400 uppercase text-[10px] block font-bold">Location</span>
                  <span className="font-semibold text-slate-800">{selectedLogger.location}</span>
                </div>
                <div>
                  <span className="text-slate-400 uppercase text-[10px] block font-bold">Owner / Custodian</span>
                  <span className="font-semibold text-slate-800">{selectedLogger.owner}</span>
                </div>
                <div>
                  <span className="text-slate-400 uppercase text-[10px] block font-bold">Interval</span>
                  <span className="font-semibold text-slate-800">{selectedLogger.calibration_interval_months} Months</span>
                </div>
                <div>
                  <span className="text-slate-400 uppercase text-[10px] block font-bold">Status</span>
                  <span className="capitalize font-semibold text-slate-800">{selectedLogger.status}</span>
                </div>
              </div>

              {/* Calibration History for this Logger */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <History size={16} className="text-teal-600" />
                    Calibration Lifecycle History
                  </h3>
                  <button
                    onClick={() => {
                      const id = selectedLogger.id;
                      setSelectedLogger(null);
                      onNavigateToHistory(String(id));
                    }}
                    className="text-xs text-teal-600 hover:text-teal-700 font-semibold"
                  >
                    Deep Metrology Trends →
                  </button>
                </div>

                {loadingCals ? (
                  <p className="text-xs text-slate-500 py-4 text-center">Loading calibrations...</p>
                ) : loggerCals.length === 0 ? (
                  <div className="p-4 text-center bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-500">
                    No calibration records on file for this unit yet.
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-100 text-slate-600 font-semibold">
                        <tr>
                          <th className="p-2.5">Record #</th>
                          <th className="p-2.5">Date</th>
                          <th className="p-2.5">Max Error</th>
                          <th className="p-2.5">Tolerance</th>
                          <th className="p-2.5">Result</th>
                          <th className="p-2.5">Provenance Hash</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {loggerCals.map((cal) => (
                          <tr key={cal.id} className="hover:bg-slate-50">
                            <td className="p-2.5 font-mono font-semibold text-teal-700">{cal.record_number}</td>
                            <td className="p-2.5">{cal.calibration_date.split('T')[0]}</td>
                            <td className="p-2.5 font-mono">{cal.max_error.toFixed(3)} °C</td>
                            <td className="p-2.5 font-mono">±{cal.configured_tolerance.toFixed(2)} °C</td>
                            <td className="p-2.5">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  cal.overall_outcome === 'pass'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-rose-100 text-rose-800'
                                }`}
                              >
                                {cal.overall_outcome.toUpperCase()}
                              </span>
                            </td>
                            <td className="p-2.5 font-mono text-[10px] text-slate-400 truncate max-w-[120px]">
                              {cal.provenance_hash || 'Draft'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-2">
              <button
                onClick={() => setSelectedLogger(null)}
                className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Create/Edit */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">
                {modalMode === 'create' ? 'Register New Temperature Logger' : `Edit Logger ${formData.logger_id}`}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-700">
                ✕
              </button>
            </div>

            {formError && (
              <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Logger ID *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={modalMode === 'edit'}
                    value={formData.logger_id}
                    onChange={(e) => setFormData({ ...formData, logger_id: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 bg-slate-50 disabled:bg-slate-100"
                    placeholder="e.g. TL-015"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Serial Number *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={modalMode === 'edit'}
                    value={formData.serial_number}
                    onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 bg-slate-50 disabled:bg-slate-100"
                    placeholder="e.g. SN-88319-FLK"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Manufacturer *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.manufacturer}
                    onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                    placeholder="e.g. Testo, Elpro"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Model *</label>
                  <input
                    type="text"
                    required
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                    placeholder="e.g. 176 T4"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Type *</label>
                  <input
                    type="text"
                    required
                    value={formData.logger_type}
                    onChange={(e) => setFormData({ ...formData, logger_type: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                    placeholder="e.g. RTD, Wireless"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Range *</label>
                  <input
                    type="text"
                    required
                    value={formData.measurement_range}
                    onChange={(e) => setFormData({ ...formData, measurement_range: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                    placeholder="e.g. -40°C to +85°C"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Accuracy Spec</label>
                  <input
                    type="text"
                    required
                    value={formData.accuracy_spec}
                    onChange={(e) => setFormData({ ...formData, accuracy_spec: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                    placeholder="e.g. ±0.30°C"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Location / Department *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                    placeholder="e.g. Cold Room A"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Responsible Owner *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.owner}
                    onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                    placeholder="e.g. Dr. Jane Doe"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Calibration Interval
                  </label>
                  <select
                    value={formData.calibration_interval_months}
                    onChange={(e) =>
                      setFormData({ ...formData, calibration_interval_months: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                  >
                    <option value={3}>3 Months</option>
                    <option value={6}>6 Months</option>
                    <option value={12}>12 Months (Standard)</option>
                    <option value={24}>24 Months</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="retired">Retired</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Resolution</label>
                  <input
                    type="number"
                    step="0.001"
                    value={formData.resolution}
                    onChange={(e) => setFormData({ ...formData, resolution: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold shadow-xs"
                >
                  {modalMode === 'create' ? 'Save Logger' : 'Update Logger'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
