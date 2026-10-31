import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Settings as SettingsIcon,
  Shield,
  Database,
  Sliders,
  User,
  CheckCircle2,
  Bell,
  Save,
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { user } = useAuth();
  const [dueThreshold, setDueThreshold] = useState(30);
  const [criticalThreshold, setCriticalThreshold] = useState(7);
  const [defaultTolerance, setDefaultTolerance] = useState(0.50);
  const [savedMsg, setSavedMsg] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="border-b border-slate-200 pb-2">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">System & Metrology Settings</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Configure default acceptance limits, notification thresholds, and laboratory user profile
        </p>
      </div>

      {savedMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-600" />
          <span>System configuration parameters updated successfully.</span>
        </div>
      )}

      {/* User Persona Profile Card */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-slate-900 text-teal-400 font-bold flex items-center justify-center text-lg">
            {user?.full_name.charAt(0)}
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">{user?.full_name}</h3>
            <p className="text-xs text-slate-500">{user?.email}</p>
            <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-teal-100 text-teal-800">
              Role: {user?.role}
            </span>
          </div>
        </div>
      </div>

      {/* Metrology Tolerances and Alert Thresholds Form */}
      <form onSubmit={handleSave} className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-6">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-1">
            <Sliders size={16} className="text-teal-600" />
            Metrology Acceptance Criteria Defaults
          </h3>
          <p className="text-xs text-slate-500">
            Standard tolerance assigned to newly registered measurement test routines
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 uppercase mb-1 text-[11px]">
              Default Acceptance Tolerance (±°C)
            </label>
            <input
              type="number"
              step="0.05"
              value={defaultTolerance}
              onChange={(e) => setDefaultTolerance(parseFloat(e.target.value) || 0.5)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 font-mono font-semibold"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 uppercase mb-1 text-[11px]">
              Standard Reference Uncertainty Default (U)
            </label>
            <input
              type="text"
              readOnly
              value="±0.008 °C (k=2, 95% CL)"
              className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg text-slate-600 font-mono"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-1">
            <Bell size={16} className="text-teal-600" />
            Calibration Expiry Alert Thresholds
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Days remaining before recalibration when system alerts are triggered
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1 text-[11px]">
                Due Soon Warning Threshold (Days)
              </label>
              <input
                type="number"
                value={dueThreshold}
                onChange={(e) => setDueThreshold(parseInt(e.target.value) || 30)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1 text-[11px]">
                Critical Expiry Threshold (Days)
              </label>
              <input
                type="number"
                value={criticalThreshold}
                onChange={(e) => setCriticalThreshold(parseInt(e.target.value) || 7)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 flex justify-end">
          <button
            type="submit"
            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm"
          >
            <Save size={14} /> Save Configuration
          </button>
        </div>
      </form>
    </div>
  );
};
