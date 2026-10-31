import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { AuditEvent } from '../types';
import {
  ShieldCheck,
  Search,
  Filter,
  Lock,
  Calendar,
  User,
  Info,
  Activity,
  Layers,
  AlertTriangle,
} from 'lucide-react';

export const AuditTrailView: React.FC = () => {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const res = await api.get('/audit-events', {
        params: {
          action: actionFilter || undefined,
        },
      });
      setEvents(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [actionFilter]);

  const filtered = events.filter(
    (e) =>
      e.action.toLowerCase().includes(search.toLowerCase()) ||
      e.entity_type.toLowerCase().includes(search.toLowerCase()) ||
      e.entity_id.toLowerCase().includes(search.toLowerCase()) ||
      (e.user_name || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 pb-2">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Immutable Audit Trail & Provenance</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Cryptographically linked append-only audit ledger with SHA-256 block hash verification
        </p>
      </div>

      {/* Technical Integrity Notice */}
      <div className="p-4 bg-slate-900 text-white rounded-xl text-xs space-y-1.5 shadow-xs">
        <div className="flex items-center gap-2 text-teal-400 font-bold">
          <ShieldCheck size={18} />
          <span>Hash-Chained Audit Ledger Architecture</span>
        </div>
        <p className="text-slate-300 leading-relaxed">
          Every sensitive action (calibration finalization, amendments, logger registration) generates an append-only block containing the SHA-256 hash of the prior block and payload.
          <em> Notice on technical limitations:</em> In single-database deployments, hash chaining guarantees tamper-evidence against silent modifications; full Byzantine fault tolerance additionally requires external distributed ledger anchoring.
        </p>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search audit events by action, entity ID, technician..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-slate-400" />
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="py-2 px-3 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-700"
          >
            <option value="">All Audit Actions</option>
            <option value="CALIBRATION_FINALIZED">Calibration Finalized</option>
            <option value="CALIBRATION_AMENDED">Calibration Amended</option>
            <option value="CALIBRATION_DRAFT_SAVED">Draft Saved</option>
            <option value="LOGGER_CREATED">Logger Created</option>
            <option value="USER_LOGIN">User Login</option>
          </select>
        </div>
      </div>

      {/* Audit Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-700 uppercase font-semibold text-[11px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Event ID</th>
                <th className="py-3 px-4">Timestamp (UTC)</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Entity</th>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Payload Details</th>
                <th className="py-3 px-4">Block Hash (SHA-256)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Loading audit events...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No matching audit records found.
                  </td>
                </tr>
              ) : (
                filtered.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50 font-mono text-[11px]">
                    <td className="py-3 px-4 font-bold text-slate-900">#{e.id}</td>
                    <td className="py-3 px-4 text-slate-500 font-sans">{e.timestamp.replace('T', ' ').slice(0, 19)}</td>
                    <td className="py-3 px-4">
                      <span className="font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-800 text-[10px]">
                        {e.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-sans">
                      {e.entity_type} ({e.entity_id})
                    </td>
                    <td className="py-3 px-4 font-sans font-semibold text-teal-800">
                      {e.user_name || 'System'}
                    </td>
                    <td className="py-3 px-4 max-w-[220px] truncate text-slate-500 font-sans" title={e.details || ''}>
                      {e.details || '{}'}
                    </td>
                    <td className="py-3 px-4 text-[10px] text-teal-700 truncate max-w-[130px]" title={`Current: ${e.current_hash}\nPrevious: ${e.previous_hash}`}>
                      {e.current_hash.substring(0, 16)}...
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
