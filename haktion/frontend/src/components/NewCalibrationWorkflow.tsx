import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { TemperatureLogger, ReferenceInstrument, MeasurementPoint, CalibrationRecord } from '../types';
import {
  Check,
  ChevronRight,
  ChevronLeft,
  AlertTriangle,
  FileCheck,
  Plus,
  Trash2,
  Save,
  Send,
  Download,
  ShieldCheck,
  Cpu,
  Scale,
  Activity,
  Layers,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface NewCalibrationWorkflowProps {
  initialLoggerId?: string | null;
  onCalibrationFinished: (recordId: number) => void;
}

export const NewCalibrationWorkflow: React.FC<NewCalibrationWorkflowProps> = ({
  initialLoggerId,
  onCalibrationFinished,
}) => {
  const { user } = useAuth();
  const [step, setStep] = useState<number>(1);
  const [loggers, setLoggers] = useState<TemperatureLogger[]>([]);
  const [references, setReferences] = useState<ReferenceInstrument[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Form selections
  const [selectedLoggerId, setSelectedLoggerId] = useState<number | null>(
    initialLoggerId ? parseInt(initialLoggerId) : null
  );
  const [selectedRefId, setSelectedRefId] = useState<number | null>(null);

  // Metadata step
  const [metadata, setMetadata] = useState({
    record_number: '',
    location: 'Primary Environmental Calibration Lab #2',
    ambient_temperature: 22.4,
    ambient_humidity: 45.0,
    procedure_code: 'SOP-CAL-001',
    equipment_used: 'Fluke 5628 secondary PRT and stirred calibration bath',
    configured_tolerance: 0.5,
    tolerance_source: 'Manufacturer Standard Spec ±0.5°C',
    calibration_interval_months: 12,
    notes: 'Standard periodic calibration verification test routine.',
  });

  // Measurement points step
  const [points, setPoints] = useState<MeasurementPoint[]>([
    { sequence: 1, nominal_temperature: -20.0, reference_reading: -20.005, logger_reading: -20.08, unit: '°C', allowed_tolerance: 0.5, ref_uncertainty: 0.01 },
    { sequence: 2, nominal_temperature: 0.0, reference_reading: 0.002, logger_reading: 0.04, unit: '°C', allowed_tolerance: 0.5, ref_uncertainty: 0.01 },
    { sequence: 3, nominal_temperature: 25.0, reference_reading: 25.001, logger_reading: 25.12, unit: '°C', allowed_tolerance: 0.5, ref_uncertainty: 0.01 },
    { sequence: 4, nominal_temperature: 50.0, reference_reading: 49.998, logger_reading: 50.15, unit: '°C', allowed_tolerance: 0.5, ref_uncertainty: 0.01 },
  ]);

  // Submission & Results
  const [savedDraft, setSavedDraft] = useState<CalibrationRecord | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadPrerequisites = async () => {
      try {
        setLoadingInitial(true);
        const [lRes, rRes] = await Promise.all([
          api.get('/loggers'),
          api.get('/reference-instruments'),
        ]);
        setLoggers(lRes.data);
        setReferences(rRes.data);

        // Pre-select first valid reference instrument
        const activeRef = rRes.data.find((r: ReferenceInstrument) => !r.is_expired);
        if (activeRef) {
          setSelectedRefId(activeRef.id);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingInitial(false);
      }
    };
    loadPrerequisites();
  }, []);

  const selectedLogger = loggers.find((l) => l.id === selectedLoggerId);
  const selectedRef = references.find((r) => r.id === selectedRefId);

  // Dynamic calculation for measurement points
  const evaluatedPoints = points.map((p) => {
    const error = Math.round((p.logger_reading - p.reference_reading) * 10000) / 10000;
    const abs_error = Math.abs(error);
    const tol = p.allowed_tolerance || metadata.configured_tolerance;
    const outcome: 'pass' | 'fail' = abs_error <= tol ? 'pass' : 'fail';
    return {
      ...p,
      error,
      abs_error,
      outcome,
    };
  });

  const overallOutcome: 'pass' | 'fail' = evaluatedPoints.every((p) => p.outcome === 'pass') ? 'pass' : 'fail';
  const maxError = evaluatedPoints.length > 0 ? Math.max(...evaluatedPoints.map((p) => p.abs_error)) : 0;

  const handleAddPoint = () => {
    setPoints([
      ...points,
      {
        sequence: points.length + 1,
        nominal_temperature: 10.0,
        reference_reading: 10.0,
        logger_reading: 10.0,
        unit: '°C',
        allowed_tolerance: metadata.configured_tolerance,
        ref_uncertainty: 0.01,
      },
    ]);
  };

  const handleRemovePoint = (index: number) => {
    if (points.length <= 1) return;
    const updated = points.filter((_, i) => i !== index).map((p, idx) => ({ ...p, sequence: idx + 1 }));
    setPoints(updated);
  };

  const handlePointChange = (index: number, field: keyof MeasurementPoint, val: any) => {
    const updated = [...points];
    updated[index] = { ...updated[index], [field]: val };
    setPoints(updated);
  };

  // Step 5 Save Draft
  const handleSaveDraft = async () => {
    if (!selectedLoggerId || !selectedRefId) return;
    setSubmitting(true);
    setErrorMessage(null);
    try {
      const payload = {
        logger_id: selectedLoggerId,
        reference_instrument_id: selectedRefId,
        record_number: metadata.record_number || undefined,
        location: metadata.location,
        ambient_temperature: metadata.ambient_temperature,
        ambient_humidity: metadata.ambient_humidity,
        procedure_code: metadata.procedure_code,
        equipment_used: metadata.equipment_used,
        configured_tolerance: metadata.configured_tolerance,
        tolerance_source: metadata.tolerance_source,
        calibration_interval_months: metadata.calibration_interval_months,
        notes: metadata.notes,
        measurement_points: points.map((p, idx) => ({
          sequence: idx + 1,
          nominal_temperature: p.nominal_temperature,
          reference_reading: p.reference_reading,
          logger_reading: p.logger_reading,
          unit: p.unit || '°C',
          ref_uncertainty: p.ref_uncertainty || 0.01,
          allowed_tolerance: p.allowed_tolerance || metadata.configured_tolerance,
        })),
      };

      const res = await api.post('/calibrations/draft', payload);
      setSavedDraft(res.data);
      return res.data;
    } catch (err: any) {
      setErrorMessage(err.response?.data?.detail || 'Failed to save calibration draft.');
      return null;
    } finally {
      setSubmitting(false);
    }
  };

  // Finalize Record
  const handleFinalize = async () => {
    setSubmitting(true);
    setErrorMessage(null);
    try {
      let draftId = savedDraft?.id;
      if (!draftId) {
        const created = await handleSaveDraft();
        if (!created) return;
        draftId = created.id;
      }
      const res = await api.post(`/calibrations/${draftId}/finalize`);
      setSavedDraft(res.data);
      setStep(6); // Success step
    } catch (err: any) {
      setErrorMessage(err.response?.data?.detail || 'Error finalizing record.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!savedDraft) return;
    try {
      const res = await api.get(`/calibrations/${savedDraft.id}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Calibration_Report_${savedDraft.record_number}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (err) {
      alert('Could not download PDF report.');
    }
  };

  const steps = [
    { num: 1, title: 'Select Logger' },
    { num: 2, title: 'Reference Instrument' },
    { num: 3, title: 'Metadata & Environment' },
    { num: 4, title: 'Measurement Points' },
    { num: 5, title: 'Calculations & Review' },
    { num: 6, title: 'Finalized Provenance' },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="border-b border-slate-200 pb-3">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Guided Calibration Workflow</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Step-by-step metrology comparison, error determination, provenance fingerprinting, and report generation
        </p>
      </div>

      {/* Stepper Wizard Indicator */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between">
          {steps.map((s, idx) => (
            <React.Fragment key={s.num}>
              <div className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    step === s.num
                      ? 'bg-teal-600 text-white ring-4 ring-teal-100'
                      : step > s.num
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {step > s.num ? <Check size={14} /> : s.num}
                </div>
                <span
                  className={`text-xs hidden md:inline font-semibold ${
                    step === s.num ? 'text-teal-700' : 'text-slate-500'
                  }`}
                >
                  {s.title}
                </span>
              </div>
              {idx < steps.length - 1 && <div className="flex-1 h-[2px] bg-slate-200 mx-2" />}
            </React.Fragment>
          ))}
        </div>
      </div>

      {errorMessage && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2">
          <AlertTriangle size={16} className="shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* STEP 1: SELECT LOGGER */}
      {step === 1 && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Step 1: Select Temperature Logger Under Test</h2>
            <p className="text-xs text-slate-500">
              Choose an active sensor from the laboratory inventory to calibrate
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[420px] overflow-y-auto p-1">
            {loggers.map((l) => (
              <div
                key={l.id}
                onClick={() => setSelectedLoggerId(l.id)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  selectedLoggerId === l.id
                    ? 'border-teal-600 bg-teal-50/50 ring-2 ring-teal-500'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="font-mono font-bold text-teal-800 text-sm">{l.logger_id}</span>
                  <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                    {l.status}
                  </span>
                </div>
                <div className="text-xs font-semibold text-slate-900">{l.manufacturer} {l.model}</div>
                <div className="text-[11px] text-slate-500 font-mono mt-0.5">S/N: {l.serial_number}</div>
                <div className="text-xs text-slate-600 mt-2 flex items-center justify-between">
                  <span>Range: {l.measurement_range}</span>
                  <span className="font-semibold text-teal-700">Spec: {l.accuracy_spec}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button
              disabled={!selectedLoggerId}
              onClick={() => setStep(2)}
              className="px-5 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm"
            >
              Continue to Reference Instrument <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: SELECT REFERENCE INSTRUMENT */}
      {step === 2 && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Step 2: Select Reference Instrument</h2>
            <p className="text-xs text-slate-500">
              Calibration must be conducted against an active secondary standard with valid certificate traceability
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {references.map((r) => (
              <div
                key={r.id}
                onClick={() => setSelectedRefId(r.id)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  selectedRefId === r.id
                    ? 'border-teal-600 bg-teal-50/50 ring-2 ring-teal-500'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="font-mono font-bold text-slate-900 text-sm">{r.instrument_id}</span>
                  {r.is_expired ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 flex items-center gap-1">
                      <AlertTriangle size={11} /> EXPIRED
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700">
                      CERTIFIED ACTIVE
                    </span>
                  )}
                </div>
                <div className="text-xs font-bold text-slate-800">{r.manufacturer} {r.model}</div>
                <div className="text-[11px] text-slate-500 mt-1">Cert: {r.certificate_number}</div>
                <div className="text-[11px] text-slate-600 font-semibold mt-1">Uncertainty: {r.stated_uncertainty}</div>
                <div className="text-[11px] text-slate-500 mt-2 p-2 bg-slate-50 rounded border border-slate-100 line-clamp-2">
                  {r.traceability_details}
                </div>
              </div>
            ))}
          </div>

          {selectedRef?.is_expired && (
            <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg text-amber-800 text-xs flex items-center gap-2">
              <AlertTriangle size={16} className="shrink-0 text-amber-600" />
              <span>
                <strong>Warning:</strong> Selected reference instrument {selectedRef.instrument_id} is expired. Calibrating with an expired standard will invalidate metrological compliance!
              </span>
            </div>
          )}

          <div className="flex justify-between pt-4 border-t border-slate-100">
            <button
              onClick={() => setStep(1)}
              className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-semibold flex items-center gap-1"
            >
              <ChevronLeft size={14} /> Back
            </button>
            <button
              disabled={!selectedRefId}
              onClick={() => setStep(3)}
              className="px-5 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm"
            >
              Configure Environment & Metadata <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: METADATA & ENVIRONMENT */}
      {step === 3 && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Step 3: Calibration Environmental Metadata & SOP</h2>
            <p className="text-xs text-slate-500">
              Record laboratory environmental ambient conditions and applicable procedure
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Calibration Record # (Auto-assigned if blank)
              </label>
              <input
                type="text"
                placeholder="e.g. CAL-2026-0042"
                value={metadata.record_number}
                onChange={(e) => setMetadata({ ...metadata, record_number: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Ambient Temp (°C)
              </label>
              <input
                type="number"
                step="0.1"
                value={metadata.ambient_temperature}
                onChange={(e) => setMetadata({ ...metadata, ambient_temperature: parseFloat(e.target.value) || 20 })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Ambient Humidity (% RH)
              </label>
              <input
                type="number"
                step="0.1"
                value={metadata.ambient_humidity}
                onChange={(e) => setMetadata({ ...metadata, ambient_humidity: parseFloat(e.target.value) || 45 })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Laboratory Location
              </label>
              <input
                type="text"
                value={metadata.location}
                onChange={(e) => setMetadata({ ...metadata, location: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Calibration SOP / Procedure
              </label>
              <input
                type="text"
                value={metadata.procedure_code}
                onChange={(e) => setMetadata({ ...metadata, procedure_code: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Acceptance Tolerance (±°C) *
              </label>
              <input
                type="number"
                step="0.05"
                value={metadata.configured_tolerance}
                onChange={(e) => setMetadata({ ...metadata, configured_tolerance: parseFloat(e.target.value) || 0.5 })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 font-bold text-teal-800"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Tolerance Basis / Standard Source *
              </label>
              <input
                type="text"
                value={metadata.tolerance_source}
                onChange={(e) => setMetadata({ ...metadata, tolerance_source: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
              Equipment & Calibration Baths Used
            </label>
            <input
              type="text"
              value={metadata.equipment_used}
              onChange={(e) => setMetadata({ ...metadata, equipment_used: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="flex justify-between pt-4 border-t border-slate-100">
            <button
              onClick={() => setStep(2)}
              className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-semibold flex items-center gap-1"
            >
              <ChevronLeft size={14} /> Back
            </button>
            <button
              onClick={() => setStep(4)}
              className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm"
            >
              Enter Measurement Points <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: MULTI-POINT MEASUREMENT ENTRY */}
      {step === 4 && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Step 4: Enter Multi-Point Temperature Readings</h2>
              <p className="text-xs text-slate-500">
                Record nominal setpoints, reference readings, and observed logger readings
              </p>
            </div>
            <button
              onClick={handleAddPoint}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
            >
              <Plus size={14} /> Add Test Point
            </button>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Point</th>
                  <th className="py-2.5 px-3">Nominal Setpoint (°C)</th>
                  <th className="py-2.5 px-3">Reference Standard (°C)</th>
                  <th className="py-2.5 px-3">Logger Reading (°C)</th>
                  <th className="py-2.5 px-3">Tolerance Limit (±°C)</th>
                  <th className="py-2.5 px-3">Calculated Error</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {evaluatedPoints.map((pt, index) => (
                  <tr key={index} className="hover:bg-slate-50">
                    <td className="py-2 px-3 font-bold font-mono">#{pt.sequence}</td>
                    <td className="py-2 px-3">
                      <input
                        type="number"
                        step="0.01"
                        value={pt.nominal_temperature}
                        onChange={(e) =>
                          handlePointChange(index, 'nominal_temperature', parseFloat(e.target.value) || 0)
                        }
                        className="w-24 px-2 py-1 border border-slate-300 rounded font-mono text-xs focus:ring-1 focus:ring-teal-500"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="number"
                        step="0.001"
                        value={pt.reference_reading}
                        onChange={(e) =>
                          handlePointChange(index, 'reference_reading', parseFloat(e.target.value) || 0)
                        }
                        className="w-28 px-2 py-1 border border-slate-300 rounded font-mono text-xs focus:ring-1 focus:ring-teal-500"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="number"
                        step="0.001"
                        value={pt.logger_reading}
                        onChange={(e) =>
                          handlePointChange(index, 'logger_reading', parseFloat(e.target.value) || 0)
                        }
                        className="w-28 px-2 py-1 border border-slate-300 rounded font-mono text-xs focus:ring-1 focus:ring-teal-500 font-bold"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="number"
                        step="0.01"
                        value={pt.allowed_tolerance}
                        onChange={(e) =>
                          handlePointChange(index, 'allowed_tolerance', parseFloat(e.target.value) || metadata.configured_tolerance)
                        }
                        className="w-24 px-2 py-1 border border-slate-300 rounded font-mono text-xs focus:ring-1 focus:ring-teal-500"
                      />
                    </td>
                    <td className="py-2 px-3 font-mono font-bold">
                      {pt.error >= 0 ? `+${pt.error.toFixed(3)}` : pt.error.toFixed(3)} °C
                    </td>
                    <td className="py-2 px-3">
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
                    <td className="py-2 px-3 text-right">
                      <button
                        onClick={() => handleRemovePoint(index)}
                        className="text-slate-400 hover:text-rose-600 p-1"
                        title="Remove point"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between pt-4 border-t border-slate-100">
            <button
              onClick={() => setStep(3)}
              className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-semibold flex items-center gap-1"
            >
              <ChevronLeft size={14} /> Back
            </button>
            <button
              onClick={() => setStep(5)}
              className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm"
            >
              Review Results & Finalize <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 5: CALCULATIONS & REVIEW */}
      {step === 5 && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Step 5: Review Calibration Verification & Provenance</h2>
              <p className="text-xs text-slate-500">
                Formula applied: <code>Error = Logger Reading - Reference Reading</code>
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Overall Result</span>
              <span
                className={`text-sm font-bold px-3 py-1 rounded-full ${
                  overallOutcome === 'pass' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                }`}
              >
                {overallOutcome.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Unit & Reference Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
              <span className="font-bold text-slate-800 uppercase text-[10px] block">Unit Under Test</span>
              <div className="font-bold text-slate-900 text-sm">{selectedLogger?.logger_id}</div>
              <div className="text-slate-600">{selectedLogger?.manufacturer} {selectedLogger?.model} (S/N: {selectedLogger?.serial_number})</div>
              <div className="text-slate-500">Range: {selectedLogger?.measurement_range}</div>
              <div className="text-slate-500">Location: {selectedLogger?.location}</div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
              <span className="font-bold text-slate-800 uppercase text-[10px] block">Reference Standard</span>
              <div className="font-bold text-slate-900 text-sm">{selectedRef?.instrument_id}</div>
              <div className="text-slate-600">{selectedRef?.manufacturer} {selectedRef?.model}</div>
              <div className="text-slate-500">Cert: {selectedRef?.certificate_number}</div>
              <div className="text-slate-500">Uncertainty: {selectedRef?.stated_uncertainty}</div>
            </div>
          </div>

          {/* Evaluation Table */}
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 font-semibold">
                <tr>
                  <th className="p-2.5">Point</th>
                  <th className="p-2.5">Nominal (°C)</th>
                  <th className="p-2.5">Reference (°C)</th>
                  <th className="p-2.5">Logger (°C)</th>
                  <th className="p-2.5">Error (°C)</th>
                  <th className="p-2.5">Tolerance Limit</th>
                  <th className="p-2.5">Point Outcome</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {evaluatedPoints.map((pt) => (
                  <tr key={pt.sequence} className="hover:bg-slate-50">
                    <td className="p-2.5 font-bold">#{pt.sequence}</td>
                    <td className="p-2.5 font-mono">{pt.nominal_temperature.toFixed(2)}</td>
                    <td className="p-2.5 font-mono">{pt.reference_reading.toFixed(3)}</td>
                    <td className="p-2.5 font-mono font-bold">{pt.logger_reading.toFixed(3)}</td>
                    <td className="p-2.5 font-mono font-bold">
                      {pt.error >= 0 ? `+${pt.error.toFixed(3)}` : pt.error.toFixed(3)}
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

          {/* Max Error Summary Banner */}
          <div className="p-4 bg-teal-50 border border-teal-200 rounded-xl flex items-center justify-between text-xs">
            <div>
              <span className="font-bold text-teal-900 block">Max Absolute Error: {maxError.toFixed(4)} °C</span>
              <span className="text-teal-700 text-[11px]">
                Acceptance criteria: |Error| ≤ {metadata.configured_tolerance} °C based on {metadata.tolerance_source}
              </span>
            </div>
            <div className="font-semibold text-slate-600">
              Technician: <span className="text-slate-900">{user?.full_name}</span>
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t border-slate-100">
            <button
              onClick={() => setStep(4)}
              className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-semibold flex items-center gap-1"
            >
              <ChevronLeft size={14} /> Back
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={submitting}
                onClick={handleSaveDraft}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold flex items-center gap-1.5"
              >
                <Save size={14} /> Save Draft
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleFinalize}
                className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm"
              >
                <Send size={14} /> {submitting ? 'Finalizing Record...' : 'Finalize & Sign Certificate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 6: SUCCESS & PROVENANCE FINGERPRINT */}
      {step === 6 && savedDraft && (
        <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-xs text-center space-y-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 shadow-sm">
            <ShieldCheck size={36} />
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-900">Calibration Record Successfully Finalized</h2>
            <p className="text-xs text-slate-500 mt-1">
              Record has been committed to the immutable audit trail and logger validity schedule has been renewed.
            </p>
          </div>

          <div className="max-w-xl mx-auto p-4 bg-slate-50 border border-slate-200 rounded-xl text-left text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-500">Record Number:</span>
              <span className="font-mono font-bold text-teal-800">{savedDraft.record_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Final Outcome:</span>
              <span
                className={`font-bold uppercase ${
                  savedDraft.overall_outcome === 'pass' ? 'text-emerald-700' : 'text-rose-700'
                }`}
              >
                {savedDraft.overall_outcome}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Max Error:</span>
              <span className="font-mono font-bold text-slate-900">{savedDraft.max_error} °C</span>
            </div>
            <div>
              <span className="text-slate-500 block mb-1">Cryptographic Provenance Hash (SHA-256):</span>
              <span className="font-mono text-[10px] bg-white border border-slate-200 p-2 rounded block break-all text-teal-700">
                {savedDraft.provenance_hash || 'CALCULATED_BLOCK_HASH'}
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex justify-center gap-3 pt-2">
            <button
              onClick={handleDownloadPDF}
              className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-sm"
            >
              <Download size={15} /> Download PDF Calibration Certificate
            </button>
            <button
              onClick={() => onCalibrationFinished(savedDraft.id)}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold"
            >
              View Record Details
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
