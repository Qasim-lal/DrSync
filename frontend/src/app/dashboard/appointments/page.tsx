'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  getAppointments, createAppointment, updateAppointment,
  confirmAppointment, cancelAppointment,
  getPatients, getProviders,
  type Appointment, type AppointmentStatus, type Patient, type Provider,
} from '@/lib/api/dashboard';

const STATUS_COLORS: Record<AppointmentStatus, string> = {
  SCHEDULED: 'bg-yellow-100 text-yellow-800',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  IN_PROGRESS: 'bg-purple-100 text-purple-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
  NO_SHOW: 'bg-gray-100 text-gray-600',
  RESCHEDULED: 'bg-orange-100 text-orange-800',
};

const EMPTY_FORM = {
  patientId: '', providerId: '', scheduledAt: '',
  duration: 30, description: '',
};

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const LIMIT = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAppointments({ page, limit: LIMIT, status: statusFilter || undefined });
      setAppointments(res.data || []);
      setTotal(res.pagination?.total ?? res.data?.length ?? 0);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    Promise.all([getPatients({ limit: 100 }), getProviders()]).then(([p, pr]) => {
      setPatients(p.data || []);
      setProviders(pr.data || []);
    }).catch(() => {});
  }, []);

  async function handleCreate() {
    if (!form.patientId || !form.providerId || !form.scheduledAt) {
      setError('Patient, provider and date/time are required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const scheduledAt = new Date(form.scheduledAt).toISOString();
      const endTime = new Date(new Date(form.scheduledAt).getTime() + form.duration * 60000).toISOString();
      await createAppointment({
        patientId: form.patientId,
        providerId: form.providerId,
        scheduledAt,
        endTime,
        duration: form.duration,
        description: form.description,
        bookingSource: 'DASHBOARD',
      });
      setShowModal(false);
      setForm(EMPTY_FORM);
      load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirm(id: string) {
    try { await confirmAppointment(id); load(); } catch (e: any) { setError(e.message); }
  }

  async function handleCancel(id: string) {
    try { await cancelAppointment(id); load(); } catch (e: any) { setError(e.message); }
  }

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Appointments</h1>
          <p className="text-gray-500 text-sm mt-1">{total} appointments</p>
        </div>
        <button onClick={() => { setError(''); setShowModal(true); }}
          className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm font-medium">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>Book Appointment</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex space-x-2 mb-4 flex-wrap gap-2">
        {(['', 'SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as const).map(s => (
          <button key={s}
            onClick={() => { setStatusFilter(s); setPage(1); }}
            className={`px-3 py-1 text-xs rounded-full border transition-colors ${
              statusFilter === s
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'text-gray-600 border-gray-300 hover:border-indigo-400'
            }`}>
            {s || 'All'}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
          </div>
        ) : appointments.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <svg className="h-12 w-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p>No appointments found</p>
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Patient</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Provider</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Scheduled</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Duration</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {appointments.map(a => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">
                        {a.patient?.firstName} {a.patient?.lastName}
                      </p>
                      {a.patient?.phone && <p className="text-xs text-gray-400">{a.patient.phone}</p>}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {a.provider?.firstName} {a.provider?.lastName}
                      {a.provider?.specialization && (
                        <p className="text-xs text-gray-400">{a.provider.specialization}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {new Date(a.scheduledAt).toLocaleDateString()}<br />
                      <span className="text-xs">{new Date(a.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{a.duration} min</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[a.status] || 'bg-gray-100 text-gray-600'}`}>
                        {a.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      {a.status === 'SCHEDULED' && (
                        <button onClick={() => handleConfirm(a.id)}
                          className="text-blue-600 hover:text-blue-800 text-xs font-medium">Confirm</button>
                      )}
                      {(a.status === 'SCHEDULED' || a.status === 'CONFIRMED') && (
                        <button onClick={() => handleCancel(a.id)}
                          className="text-red-500 hover:text-red-700 text-xs font-medium">Cancel</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
                <p className="text-xs text-gray-500">Page {page} of {totalPages}</p>
                <div className="flex space-x-2">
                  <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                    className="px-3 py-1 text-xs border border-gray-300 rounded disabled:opacity-40 hover:bg-gray-50">Prev</button>
                  <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                    className="px-3 py-1 text-xs border border-gray-300 rounded disabled:opacity-40 hover:bg-gray-50">Next</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Book Appointment Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Book Appointment</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="px-6 py-4 space-y-4">
              {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{error}</p>}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Patient *</label>
                <select value={form.patientId} onChange={e => setForm(f => ({ ...f, patientId: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                  <option value="">Select patient</option>
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>{p.firstName} {p.lastName} — {p.phone}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Provider *</label>
                <select value={form.providerId} onChange={e => setForm(f => ({ ...f, providerId: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                  <option value="">Select provider</option>
                  {providers.filter(p => p.isActive).map(p => (
                    <option key={p.id} value={p.id}>Dr. {p.firstName} {p.lastName}{p.specialization ? ` — ${p.specialization}` : ''}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Date & Time *</label>
                <input type="datetime-local" value={form.scheduledAt}
                  onChange={e => setForm(f => ({ ...f, scheduledAt: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Duration (minutes)</label>
                <select value={form.duration} onChange={e => setForm(f => ({ ...f, duration: Number(e.target.value) }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                  {[15, 30, 45, 60, 90, 120].map(d => <option key={d} value={d}>{d} min</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
            </div>
            <div className="flex justify-end space-x-3 px-6 py-4 border-t">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Cancel</button>
              <button onClick={handleCreate} disabled={saving}
                className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
                {saving ? 'Booking...' : 'Book Appointment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
