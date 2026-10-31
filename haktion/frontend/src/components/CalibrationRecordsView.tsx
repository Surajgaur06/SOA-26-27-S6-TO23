import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { CalibrationRecord, CalibrationAmendment } from '../types';
import {
  Search,
  Filter,
  Download,
  Eye,
  FileText,
  Clock,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  AlertCircle,
  Edit3,
  Calendar,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const CalibrationRecordsView: React.FC = () => {
  const { user } = useAuth();
  const [records, setRecords] = useState<CalibrationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<CalibrationRecord | null>(null);

  // Formal Amendment state
  const [showAmendModal, setShowAmendModal] = useState(false);
  const [amendReason, setAmendReason] = useState('');
  const [amendPoints, setAmendPoints] = useState<any[]>([]);
  const [amendmentsHistory, setAmendmentsHistory] = useState<CalibrationAmendment[]>([]);
  const [submittingAmend, setSubmittingAmend] = useState(false);
  const [amendError, setAmendError] = useState<string | null>(null);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const res = await api.get('/calibrations', {
        params: {
          search: search || undefined,
          state: stateFilter || undefined,
        },
      });
      setRecords(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [search, stateFilter]);

  const handleDownloadPDF = async (record: CalibrationRecord) => {
    try {
      const res = await api.get(`/calibrations/${record.id}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Calibration_Report_${record.record_number}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (err) {
      alert('Could not download PDF report.');
    }
  };

  const handleDownloadCSV = async (record: CalibrationRecord) => {
    try {
      const res = await api.get(`/calibrations/${record.id}/csv`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Calibration_Data_${record.record_number}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (err) {
      alert('Could not download CSV export.');
    }
  };

  const handleViewRecord = async (record: CalibrationRecord) => {
    setSelectedRecord(record);
    try {
      const res = await api.get(`/calibrations/${record.id}/amendments`);
      setAmendmentsHistory(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenAmendment = (record: CalibrationRecord) => {
    setSelectedRecord(record);
    setAmendReason('');
    setAmendPoints(
      record.measurement_points.map((p) => ({
        sequence: p.sequence,
        nominal_temperature: p.nominal_temperature,
        reference_reading: p.reference_reading,
        logger_reading: p.logger_reading,
        allowed_tolerance: p.allowed_tolerance,
        unit: p.unit,
      }))
    );
    setAmendError(null);
    setShowAmendModal(true);
  };

  const handleAmendPointChange = (index: number, field: string, val: any) => {
    const updated = [...amendPoints];
    updated[index] = { ...updated[index], [field]: val };
    setAmendPoints(updated);
  };

  const handleSubmitAmendment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecord) return;
    setSubmittingAmend(true);
    setAmendError(null);
    try {
      const res = await api.post(`/calibrations/${selectedRecord.id}/amend`, {
        reason: amendReason,
        corrected_points: amendPoints,
        notes: `Correction submitted by ${user?.full_name}`,
      });
      setSelectedRecord(res.data);
      setShowAmendModal(false);
      fetchRecords();
      alert(`Amendment v${res.data.version} recorded successfully with updated provenance hash.`);
    } catch (err: any) {
      setAmendError(err.response?.data?.detail || 'Failed to submit amendment.');
    } finally {
      setSubmittingAmend(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 pb-2">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Calibration Records Repository</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Archived metrology certificates, error calculations, provenance hash chains, and formal amendments
        </p>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Record Number (e.g. CAL-2026-0001), Logger ID, Serial..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-slate-400" />
          <select
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            className="py-2 px-3 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-700"
          >
            <option value="">All Record States</option>
            <option value="finalized">Finalized</option>
            <option value="amended">Amended</option>
            <option value="draft">Drafts</option>
          </select>
        </div>
      </div>

      {/* Records Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-700 uppercase font-semibold text-[11px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Record Number</th>
                <th className="py-3 px-4">Logger ID</th>
                <th className="py-3 px-4">Calibration Date</th>
                <th className="py-3 px-4">Technician</th>
                <th className="py-3 px-4">Max Error</th>
                <th className="py-3 px-4">Tolerance</th>
                <th className="py-3 px-4">Outcome</th>
                <th className="py-3 px-4">State</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    Loading calibration records...
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    No records found matching criteria.
                  </td>
                </tr>
              ) : (
                records.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-teal-800">{r.record_number}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {r.logger?.logger_id || `ID: ${r.logger_id}`}
                    </td>
                    <td className="py-3 px-4 font-mono">{r.calibration_date.split('T')[0]}</td>
                    <td className="py-3 px-4 truncate max-w-[130px]">
                      {r.technician?.full_name || 'Staff Technician'}
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold">
                      {r.max_error >= 0 ? `+${r.max_error.toFixed(3)}` : r.max_error.toFixed(3)} °C
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500">
                      ±{r.configured_tolerance.toFixed(2)} °C
                    </td>
                    <td className="py-3 px-4">
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
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          r.state === 'finalized'
                            ? 'bg-blue-100 text-blue-800'
                            : r.state === 'amended'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {r.state} {r.version > 1 ? `v${r.version}` : ''}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleViewRecord(r)}
                          className="p-1 rounded hover:bg-slate-100 text-slate-600 hover:text-slate-900"
                          title="View Record Details & Provenance"
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          onClick={() => handleDownloadPDF(r)}
                          className="p-1 rounded hover:bg-teal-50 text-teal-600 hover:text-teal-800"
                          title="Download PDF Certificate"
                        >
                          <Download size={15} />
                        </button>
                        <button
                          onClick={() => handleDownloadCSV(r)}
                          className="p-1 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-800"
                          title="Export CSV"
                        >
                          <FileSpreadsheet size={15} />
                        </button>
                        {user?.role !== 'auditor' && (r.state === 'finalized' || r.state === 'amended') && (
                          <button
                            onClick={() => handleOpenAmendment(r)}
                            className="px-2 py-0.5 rounded bg-purple-50 hover:bg-purple-100 text-purple-700 font-semibold text-[10px]"
                            title="Create Formal Amendment"
                          >
                            Amend
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

      {/* Record Details Slide-Over */}
      {selectedRecord && !showAmendModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Calibration Record: {selectedRecord.record_number}
                </h2>
                <p className="text-xs text-slate-500">
                  State: <span className="font-semibold uppercase">{selectedRecord.state} (v{selectedRecord.version})</span>
                </p>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              {/* Disclaimer Notice */}
              <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg text-amber-800 text-xs">
                <strong>Educational/Demo Calibration Notice:</strong> This calibration record and generated certificate are strictly for training and demonstration purposes within TempTrace.
              </div>

              {/* Logger & Reference Summary */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                    Temperature Logger
                  </span>
                  <div className="font-bold text-slate-900">{selectedRecord.logger?.logger_id}</div>
                  <div className="text-slate-600">{selectedRecord.logger?.manufacturer} {selectedRecord.logger?.model}</div>
                  <div className="text-slate-500 font-mono">S/N: {selectedRecord.logger?.serial_number}</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                    Reference Standard
                  </span>
                  <div className="font-bold text-slate-900">{selectedRecord.reference_instrument?.instrument_id}</div>
                  <div className="text-slate-600">{selectedRecord.reference_instrument?.manufacturer} {selectedRecord.reference_instrument?.model}</div>
                  <div className="text-slate-500 font-mono">Cert: {selectedRecord.reference_instrument?.certificate_number}</div>
                </div>
              </div>

              {/* Measurement Points Table */}
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                  Test Point Measurements & Error Analysis
                </h3>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 text-slate-700 font-semibold">
                      <tr>
                        <th className="p-2.5">Point</th>
                        <th className="p-2.5">Nominal (°C)</th>
                        <th className="p-2.5">Ref Reading (°C)</th>
                        <th className="p-2.5">Logger Reading (°C)</th>
                        <th className="p-2.5">Error (°C)</th>
                        <th className="p-2.5">Tolerance</th>
                        <th className="p-2.5">Outcome</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {selectedRecord.measurement_points?.map((pt) => (
                        <tr key={pt.id || pt.sequence}>
                          <td className="p-2.5 font-bold">#{pt.sequence}</td>
                          <td className="p-2.5 font-mono">{pt.nominal_temperature.toFixed(2)}</td>
                          <td className="p-2.5 font-mono">{pt.reference_reading.toFixed(3)}</td>
                          <td className="p-2.5 font-mono font-bold">{pt.logger_reading.toFixed(3)}</td>
                          <td className="p-2.5 font-mono font-bold">
                            {pt.error !== undefined
                              ? (pt.error >= 0 ? `+${pt.error.toFixed(3)}` : pt.error.toFixed(3))
                              : '0.000'}
                          </td>
                          <td className="p-2.5 font-mono">±{pt.allowed_tolerance.toFixed(2)} °C</td>
                          <td className="p-2.5">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                pt.outcome === 'pass'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {pt.outcome?.toUpperCase()}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Provenance Fingerprint */}
              <div className="p-4 bg-slate-900 text-white rounded-xl text-xs space-y-2">
                <div className="flex items-center gap-2 text-teal-400 font-semibold">
                  <ShieldCheck size={16} />
                  <span>Tamper-Evident SHA-256 Provenance Fingerprint</span>
                </div>
                <div className="font-mono text-[11px] bg-slate-950 p-2.5 rounded border border-slate-800 break-all text-slate-300">
                  {selectedRecord.provenance_hash || 'Draft Uncalculated'}
                </div>
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>Procedure: {selectedRecord.procedure_code} ({selectedRecord.tolerance_source})</span>
                  <span>Recorded by: {selectedRecord.technician?.full_name}</span>
                </div>
              </div>

              {/* Amendment History */}
              {amendmentsHistory.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Official Amendment History ({amendmentsHistory.length})
                  </h3>
                  <div className="space-y-2">
                    {amendmentsHistory.map((amend) => (
                      <div key={amend.id} className="p-3 bg-purple-50/50 border border-purple-200 rounded-lg text-xs">
                        <div className="flex justify-between font-semibold text-purple-900 mb-1">
                          <span>Version {amend.version} Amendment</span>
                          <span className="text-slate-500 font-mono">{amend.timestamp.split('T')[0]}</span>
                        </div>
                        <p className="text-slate-700"><strong>Reason:</strong> {amend.reason}</p>
                        <p className="text-slate-500 text-[11px] mt-1">Authorized by: {amend.user_name}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-between items-center">
              <div className="flex gap-2">
                <button
                  onClick={() => handleDownloadPDF(selectedRecord)}
                  className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs"
                >
                  <Download size={14} /> Download PDF
                </button>
                <button
                  onClick={() => handleDownloadCSV(selectedRecord)}
                  className="px-3 py-1.5 border border-slate-300 hover:bg-white text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5"
                >
                  <FileSpreadsheet size={14} /> Export CSV
                </button>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="px-4 py-1.5 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Formal Amendment Modal */}
      {showAmendModal && selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-200 bg-purple-50 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-purple-950">
                  Create Formal Calibration Amendment
                </h2>
                <p className="text-xs text-purple-700">
                  For record {selectedRecord.record_number} (Preserves original record in append-only audit trail)
                </p>
              </div>
              <button onClick={() => setShowAmendModal(false)} className="text-slate-400 hover:text-slate-700">
                ✕
              </button>
            </div>

            {amendError && (
              <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs">
                {amendError}
              </div>
            )}

            <form onSubmit={handleSubmitAmendment} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Reason for Calibration Correction *
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="e.g. Transcription error correction in 25°C test point logger reading per technician logbook."
                  value={amendReason}
                  onChange={(e) => setAmendReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Corrected Test Point Values
                </label>
                <div className="border border-slate-200 rounded-lg overflow-hidden max-h-56 overflow-y-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 text-slate-700 font-semibold">
                      <tr>
                        <th className="p-2">Point</th>
                        <th className="p-2">Nominal (°C)</th>
                        <th className="p-2">Ref Standard (°C)</th>
                        <th className="p-2">Corrected Logger Reading (°C)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {amendPoints.map((pt, idx) => (
                        <tr key={idx}>
                          <td className="p-2 font-bold font-mono">#{pt.sequence}</td>
                          <td className="p-2 font-mono">{pt.nominal_temperature}</td>
                          <td className="p-2 font-mono">{pt.reference_reading}</td>
                          <td className="p-2">
                            <input
                              type="number"
                              step="0.001"
                              value={pt.logger_reading}
                              onChange={(e) =>
                                handleAmendPointChange(idx, 'logger_reading', parseFloat(e.target.value) || 0)
                              }
                              className="w-28 px-2 py-1 border border-slate-300 rounded font-mono font-bold text-xs focus:ring-1 focus:ring-purple-500"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAmendModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAmend}
                  className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-xs font-semibold shadow-xs"
                >
                  {submittingAmend ? 'Recording Amendment...' : 'Submit Formal Amendment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
