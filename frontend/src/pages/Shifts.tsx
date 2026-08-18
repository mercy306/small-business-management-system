import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Shift } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  Clock,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Lock,
  Unlock,
  History,
  ArrowRight,
} from 'lucide-react';

export const Shifts: React.FC = () => {
  const { user } = useAuth();
  const [currentShift, setCurrentShift] = useState<Shift | null>(null);
  const [shiftsHistory, setShiftsHistory] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isOpenModalVisible, setIsOpenModalVisible] = useState(false);
  const [isCloseModalVisible, setIsCloseModalVisible] = useState(false);

  // Form states
  const [startingCash, setStartingCash] = useState('100.00');
  const [endingCash, setEndingCash] = useState('0.00');
  const [notes, setNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchShifts = async () => {
    setLoading(true);
    try {
      const [curRes, histRes] = await Promise.all([
        api.get('/api/shifts/current'),
        api.get('/api/shifts?limit=50'),
      ]);
      if (curRes.data.success) setCurrentShift(curRes.data.data);
      if (histRes.data.success) setShiftsHistory(histRes.data.data);
    } catch (err: any) {
      console.error('Error fetching shifts', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShifts();
  }, []);

  const handleOpenShift = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setError(null);
    try {
      const res = await api.post('/api/shifts/open', {
        starting_cash: parseFloat(startingCash) || 0,
        notes: notes || null,
      });
      if (res.data.success) {
        setIsOpenModalVisible(false);
        setNotes('');
        fetchShifts();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to open shift.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCloseShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentShift) return;
    setActionLoading(true);
    setError(null);
    try {
      const res = await api.post(`/api/shifts/${currentShift.id}/close`, {
        ending_cash: parseFloat(endingCash) || 0,
        notes: notes || null,
      });
      if (res.data.success) {
        setIsCloseModalVisible(false);
        setNotes('');
        fetchShifts();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to close shift.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Shift &amp; Register Management</h1>
          <p className="text-sm text-slate-500">
            Open daily register shifts, record starting float, and reconcile closing cash drawers
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="font-bold">✕</button>
        </div>
      )}

      {/* Current Active Shift Banner */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className={`h-12 w-12 rounded-xl flex items-center justify-center ${
                currentShift
                  ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                  : 'bg-slate-100 text-slate-400'
              }`}
            >
              {currentShift ? <Unlock className="h-6 w-6" /> : <Lock className="h-6 w-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-lg">
                  {currentShift ? 'Active Register Shift' : 'No Active Shift'}
                </h3>
                <span
                  className={`badge text-[10px] ${
                    currentShift
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {currentShift ? 'OPEN' : 'CLOSED'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {currentShift
                  ? `Opened at ${new Date(currentShift.opened_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} by ${currentShift.user?.name || user?.name}`
                  : 'Start a shift before processing cash sales to track drawer balance.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {currentShift && (
              <div className="text-right hidden sm:block">
                <span className="text-[11px] font-semibold text-slate-400 uppercase">Starting Float</span>
                <div className="text-lg font-bold text-slate-900 font-mono">
                  ${Number(currentShift.starting_cash).toFixed(2)}
                </div>
              </div>
            )}

            {currentShift ? (
              <button
                onClick={() => {
                  setEndingCash(String(currentShift.starting_cash));
                  setIsCloseModalVisible(true);
                }}
                className="btn-secondary !bg-rose-50 !text-rose-700 !border-rose-200 hover:!bg-rose-100 flex items-center gap-2"
              >
                <Lock className="h-4 w-4" /> Close Shift &amp; Reconcile
              </button>
            ) : (
              <button
                onClick={() => setIsOpenModalVisible(true)}
                className="btn-primary flex items-center gap-2 shadow-md shadow-emerald-600/20"
              >
                <Unlock className="h-4 w-4" /> Start New Shift
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Shifts History Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center gap-2">
          <History className="h-4 w-4 text-emerald-600" />
          <h3 className="font-bold text-slate-900 text-sm">Recent Shift Logs &amp; Discrepancies</h3>
        </div>

        {loading ? (
          <div className="py-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
          </div>
        ) : shiftsHistory.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            No past shift records found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-semibold text-slate-500 uppercase">
                  <th className="py-3 px-4">Staff Member</th>
                  <th className="py-3 px-4">Opened</th>
                  <th className="py-3 px-4">Closed</th>
                  <th className="py-3 px-4">Starting Float</th>
                  <th className="py-3 px-4">Expected Cash</th>
                  <th className="py-3 px-4">Counted Cash</th>
                  <th className="py-3 px-4">Difference</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {shiftsHistory.map((s) => {
                  const diff = Number(s.cash_difference || 0);
                  const isClosed = s.status === 'closed';

                  return (
                    <tr key={s.id} className="hover:bg-slate-50/60 font-sans">
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {s.user?.name || `User #${s.user_id}`}
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                        {new Date(s.opened_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                        {s.closed_at
                          ? new Date(s.closed_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                          : '—'}
                      </td>
                      <td className="py-3 px-4 font-mono font-medium text-slate-700">
                        ${Number(s.starting_cash).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">
                        {s.expected_cash != null ? `$${Number(s.expected_cash).toFixed(2)}` : '—'}
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                        {s.ending_cash != null ? `$${Number(s.ending_cash).toFixed(2)}` : '—'}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold">
                        {!isClosed ? (
                          <span className="text-slate-400">—</span>
                        ) : diff === 0 ? (
                          <span className="text-emerald-600">Balanced ($0.00)</span>
                        ) : diff > 0 ? (
                          <span className="text-emerald-600">+${diff.toFixed(2)} (Over)</span>
                        ) : (
                          <span className="text-rose-600">-${Math.abs(diff).toFixed(2)} (Short)</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`badge text-[10px] ${
                            s.status === 'open'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {s.status.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Open Shift Modal */}
      {isOpenModalVisible && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900">Open Register Shift</h3>
            <form onSubmit={handleOpenShift} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Starting Cash Float ($) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={startingCash}
                  onChange={(e) => setStartingCash(e.target.value)}
                  className="input text-base font-bold font-mono"
                  placeholder="100.00"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Shift Notes (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="input text-xs"
                  rows={2}
                  placeholder="Morning shift / Register #1"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOpenModalVisible(false)}
                  className="flex-1 btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 btn-primary text-xs font-bold"
                >
                  {actionLoading ? 'Starting...' : 'Open Shift'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Close Shift Modal */}
      {isCloseModalVisible && currentShift && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900">Reconcile &amp; Close Shift</h3>
            <p className="text-xs text-slate-500">
              Count all physical cash in the drawer (including the starting float) and enter the total.
            </p>

            <form onSubmit={handleCloseShift} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Counted Cash in Drawer ($) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={endingCash}
                  onChange={(e) => setEndingCash(e.target.value)}
                  className="input text-base font-bold font-mono"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Closing Notes (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="input text-xs"
                  rows={2}
                  placeholder="Any drawer notes, petty cash receipts..."
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCloseModalVisible(false)}
                  className="flex-1 btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 btn-primary !bg-rose-600 hover:!bg-rose-700 text-xs font-bold"
                >
                  {actionLoading ? 'Closing...' : 'Close & Finalize Shift'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
