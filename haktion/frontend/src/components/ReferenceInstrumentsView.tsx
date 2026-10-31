import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { ReferenceInstrument } from '../types';
import {
  Plus,
  Scale,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  FileText,
  ShieldCheck,
  Edit2,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const ReferenceInstrumentsView: React.FC = () => {
  const { user } = useAuth();
  const [instruments, setInstruments] = useState<ReferenceInstrument[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [formData, setFormData] = useState<any>({
    instrument_id: '',
    manufacturer: '',
    model: '',
    serial_number: '',
    measurement_range: '-100°C to +300°C',
    certificate_number: '',
    calibration_provider: '',
    calibration_date: new Date().toISOString().split('T')[0],
    expiry_date: new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
    stated_uncertainty: 'U = 0.015°C (k=2)',
    traceability_details: 'Traceable to National Metrology Institute via primary SPRT',
    is_active: true,
  });
  const [formError, setFormError] = useState<string | null>(null);

  const fetchInstruments = async () => {
    try {
      setLoading(true);
      const res = await api.get('/reference-instruments');
      setInstruments(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInstruments();
  }, []);

  const handleOpenCreate = () => {
    setModalMode('create');
    setFormData({
      instrument_id: `REF-STD-${String(instruments.length + 1).padStart(3, '0')}`,
      manufacturer: '',
      model: '',
      serial_number: '',
      measurement_range: '-80°C to +250°C',
      certificate_number: `NIST-CAL-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      calibration_provider: 'National Metrology Institute Accreditation #102',
      calibration_date: new Date().toISOString().split('T')[0],
      expiry_date: new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
      stated_uncertainty: 'U = 0.012°C (k=2, 95% CL)',
      traceability_details: 'ITS-90 fixed points (Triple Point of Water, Gallium Melting Point)',
      is_active: true,
    });
    setFormError(null);
    setShowModal(true);
  };

  const handleOpenEdit = (inst: ReferenceInstrument) => {
    setModalMode('edit');
    setFormData({
      ...inst,
      calibration_date: inst.calibration_date.split('T')[0],
      expiry_date: inst.expiry_date.split('T')[0],
    });
    setFormError(null);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    try {
      if (modalMode === 'create') {
        await api.post('/reference-instruments', {
          ...formData,
          calibration_date: new Date(formData.calibration_date).toISOString(),
          expiry_date: new Date(formData.expiry_date).toISOString(),
        });
      } else {
        await api.put(`/reference-instruments/${formData.id}`, {
          ...formData,
          calibration_date: new Date(formData.calibration_date).toISOString(),
          expiry_date: new Date(formData.expiry_date).toISOString(),
        });
      }
      setShowModal(false);
      fetchInstruments();
    } catch (err: any) {
      setFormError(err.response?.data?.detail || 'Failed to save reference instrument.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Reference Instruments & Traceability</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Secondary standards, PRT reference probes, and calibration certificate expiry monitoring
          </p>
        </div>
        {user?.role !== 'auditor' && (
          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
          >
            <Plus size={16} /> Register Reference Standard
          </button>
        )}
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {instruments.map((inst) => (
          <div
            key={inst.id}
            className={`bg-white rounded-xl border p-5 shadow-xs flex flex-col justify-between transition-all ${
              inst.is_expired ? 'border-rose-300 ring-1 ring-rose-300' : 'border-slate-200'
            }`}
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-slate-100 text-teal-700 rounded-lg">
                    <Scale size={20} />
                  </div>
                  <div>
                    <span className="font-mono font-bold text-slate-900 text-sm block">
                      {inst.instrument_id}
                    </span>
                    <span className="text-xs text-slate-500">{inst.manufacturer} {inst.model}</span>
                  </div>
                </div>
                {inst.is_expired ? (
                  <span className="px-2 py-0.5 bg-rose-100 text-rose-700 text-[10px] font-bold rounded-full flex items-center gap-1">
                    <AlertTriangle size={11} /> EXPIRED
                  </span>
                ) : (
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full flex items-center gap-1">
                    <CheckCircle2 size={11} /> ACTIVE
                  </span>
                )}
              </div>

              <div className="space-y-2 text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
                <div className="flex justify-between">
                  <span className="text-slate-400">Serial No:</span>
                  <span className="font-mono text-slate-800">{inst.serial_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Measurement Range:</span>
                  <span className="text-slate-800">{inst.measurement_range}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Stated Uncertainty:</span>
                  <span className="font-semibold text-slate-800">{inst.stated_uncertainty}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Certificate No:</span>
                  <span className="font-mono text-teal-700">{inst.certificate_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Calibration Expiry:</span>
                  <span className={`font-mono font-bold ${inst.is_expired ? 'text-rose-600' : 'text-slate-800'}`}>
                    {inst.expiry_date.split('T')[0]}
                  </span>
                </div>
              </div>

              <div className="mt-3">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                  Traceability Evidence:
                </span>
                <p className="text-xs text-slate-600 leading-relaxed bg-white border border-slate-100 p-2 rounded">
                  {inst.traceability_details}
                </p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-[11px] text-slate-400 truncate max-w-[170px]">
                {inst.calibration_provider}
              </span>
              {user?.role !== 'auditor' && (
                <button
                  onClick={() => handleOpenEdit(inst)}
                  className="text-teal-600 hover:text-teal-800 font-semibold flex items-center gap-1"
                >
                  <Edit2 size={13} /> Edit
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modal Create/Edit */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">
                {modalMode === 'create' ? 'Register Reference Instrument' : `Edit ${formData.instrument_id}`}
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
                    Instrument ID *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={modalMode === 'edit'}
                    value={formData.instrument_id}
                    onChange={(e) => setFormData({ ...formData, instrument_id: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 bg-slate-50"
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
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 bg-slate-50"
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
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Measurement Range
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.measurement_range}
                    onChange={(e) => setFormData({ ...formData, measurement_range: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Stated Uncertainty *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.stated_uncertainty}
                    onChange={(e) => setFormData({ ...formData, stated_uncertainty: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Certificate Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.certificate_number}
                    onChange={(e) => setFormData({ ...formData, certificate_number: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Calibration Provider *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.calibration_provider}
                    onChange={(e) => setFormData({ ...formData, calibration_provider: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Calibration Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.calibration_date}
                    onChange={(e) => setFormData({ ...formData, calibration_date: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Certificate Expiry Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.expiry_date}
                    onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Traceability Information & Chain Evidence *
                </label>
                <textarea
                  required
                  rows={2}
                  value={formData.traceability_details}
                  onChange={(e) => setFormData({ ...formData, traceability_details: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                />
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
                  Save Standard
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
