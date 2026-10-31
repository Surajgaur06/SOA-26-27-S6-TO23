import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { CalibrationRecord } from '../types';
import {
  Award,
  Download,
  FileSpreadsheet,
  FileText,
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ShieldAlert,
} from 'lucide-react';

export const CertificatesView: React.FC = () => {
  const [records, setRecords] = useState<CalibrationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchFinalized = async () => {
    try {
      setLoading(true);
      const res = await api.get('/calibrations');
      setRecords(res.data.filter((r: CalibrationRecord) => r.state !== 'draft'));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinalized();
  }, []);

  const handleDownloadPDF = async (record: CalibrationRecord) => {
    try {
      const res = await api.get(`/calibrations/${record.id}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Calibration_Certificate_${record.record_number}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (err) {
      alert('Could not download certificate.');
    }
  };

  const handleDownloadCSV = async (record: CalibrationRecord) => {
    try {
      const res = await api.get(`/calibrations/${record.id}/csv`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Measurement_Data_${record.record_number}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (err) {
      alert('Could not export CSV.');
    }
  };

  const filtered = records.filter(
    (r) =>
      r.record_number.toLowerCase().includes(search.toLowerCase()) ||
      (r.logger?.logger_id || '').toLowerCase().includes(search.toLowerCase()) ||
      (r.logger?.serial_number || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 pb-2">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Certificates & Metrology Reports</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Downloadable tamper-verified calibration certificates with measurement uncertainty and raw CSV exports
        </p>
      </div>

      {/* Prominent Educational Notice */}
      <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 flex items-start gap-3">
        <ShieldAlert size={20} className="text-amber-600 shrink-0 mt-0.5" />
        <div>
          <h4 className="font-bold text-sm">Educational & Demonstration Calibration Documents</h4>
          <p className="text-amber-800 mt-1 leading-relaxed">
            All generated reports and calibration certificates in this repository are produced for demonstration and verification purposes.
            In compliance with ISO/IEC 17025 conformity requirements, documents are clearly watermarked as demonstration reports.
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-3 text-slate-400" />
        <input
          type="text"
          placeholder="Search certificates by report ID, logger, or serial number..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800"
        />
      </div>

      {/* Grid of Certificates */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((r) => (
          <div
            key={r.id}
            className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-teal-50 text-teal-700 rounded-lg">
                  <Award size={20} />
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                    r.overall_outcome === 'pass'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {r.overall_outcome}
                </span>
              </div>

              <h3 className="font-mono font-bold text-slate-900 text-sm">{r.record_number}</h3>
              <p className="text-xs text-slate-600 font-semibold mt-0.5">
                {r.logger?.manufacturer} {r.logger?.model}
              </p>
              <p className="text-[11px] text-slate-400 font-mono">
                Logger: {r.logger?.logger_id} (S/N: {r.logger?.serial_number})
              </p>

              <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs space-y-1.5 text-slate-600">
                <div className="flex justify-between">
                  <span className="text-slate-400">Date Calibrated:</span>
                  <span className="font-mono text-slate-800">{r.calibration_date.split('T')[0]}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Max Error:</span>
                  <span className="font-mono font-bold text-slate-800">{r.max_error.toFixed(3)} °C</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Tolerance Limit:</span>
                  <span className="font-mono text-slate-800">±{r.configured_tolerance.toFixed(2)} °C</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Reference Standard:</span>
                  <span className="text-slate-800">{r.reference_instrument?.instrument_id}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
              <button
                onClick={() => handleDownloadPDF(r)}
                className="flex-1 py-1.5 px-3 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs"
              >
                <Download size={13} /> PDF Report
              </button>
              <button
                onClick={() => handleDownloadCSV(r)}
                className="py-1.5 px-3 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1"
                title="Download CSV"
              >
                <FileSpreadsheet size={13} /> CSV
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
