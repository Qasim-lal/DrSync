'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  getProviders, createProvider, updateProvider, deleteProvider,
  type Provider,
} from '@/lib/api/dashboard';

const EMPTY_FORM: Partial<Provider> = {
  firstName: '', lastName: '', title: '', specialization: '',
  email: '', phone: '', consultationDuration: 30,
  consultationFee: '', currency: 'PKR',
};

export default function ProvidersPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Provider | null>(null);
  const [form, setForm] = useState<Partial<Provider>>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getProviders();
      setProviders(res.data || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openAdd() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setError('');
    setShowModal(true);
  }

  function openEdit(p: Provider) {
    setEditing(p);
    setForm({
      firstName: p.firstName, lastName: p.lastName, title: p.title,
      specialization: p.specialization, email: p.email, phone: p.phone,
      consultationDuration: p.consultationDuration,
      consultationFee: p.consultationFee, currency: p.currency || 'PKR',
    });
    setError('');
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.firstName || !form.lastName) {
      setError('First name and last name are required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (editing) {
        await updateProvider(editing.id, form);
      } else {
        await createProvider(form);
      }
      setShowModal(false);
      load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteProvider(id);
      setDeleteId(null);
      load();
    } catch (e: any) {
      setError(e.message);
    }
  }

  const active = providers.filter(p => p.isActive);
  const inactive = providers.filter(p => !p.isActive);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Providers</h1>
          <p className="text-gray-500 text-sm mt-1">{active.length} active · {inactive.length} inactive</p>
        </div>
        <button onClick={openAdd}
          className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 text-sm font-medium">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>Add Provider</span>
        </button>
      </div>

      {error && !showModal && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg">{error}</div>
      )}

      {/* Provider cards */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
        </div>
      ) : providers.length === 0 ? (
        <div className="bg-white rounded-lg shadow text-center py-16 text-gray-400">
          <svg className="h-12 w-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p>No providers yet. Add your first provider.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {providers.map(p => (
            <div key={p.id} className={`bg-white rounded-lg shadow p-5 ${!p.isActive ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 text-lg font-bold">
                    {p.firstName?.[0]?.toUpperCase()}{p.lastName?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">
                      {p.title || 'Dr.'} {p.firstName} {p.lastName}
                    </p>
                    {p.specialization && (
                      <p className="text-xs text-purple-600">{p.specialization}</p>
                    )}
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${p.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {p.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="space-y-1 text-sm text-gray-500 mb-4">
                {p.email && <p>✉ {p.email}</p>}
                {p.phone && <p>📞 {p.phone}</p>}
                {p.consultationFee && (
                  <p>💰 {p.currency || 'PKR'} {p.consultationFee} · {p.consultationDuration || 30} min</p>
                )}
              </div>

              <div className="flex justify-end space-x-2 border-t pt-3">
                <button onClick={() => openEdit(p)}
                  className="text-indigo-600 hover:text-indigo-800 text-xs font-medium">Edit</button>
                <button onClick={() => setDeleteId(p.id)}
                  className="text-red-500 hover:text-red-700 text-xs font-medium">
                  {p.isActive ? 'Deactivate' : 'Delete'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">{editing ? 'Edit Provider' : 'Add Provider'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="px-6 py-4 space-y-4">
              {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{error}</p>}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Title</label>
                  <input value={form.title || ''} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="Dr."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">First Name *</label>
                  <input value={form.firstName || ''} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Last Name *</label>
                  <input value={form.lastName || ''} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Specialization</label>
                <input value={form.specialization || ''} onChange={e => setForm(f => ({ ...f, specialization: e.target.value }))}
                  placeholder="e.g. Cardiology, General Medicine"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                  <input type="email" value={form.email || ''} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
                  <input value={form.phone || ''} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Fee</label>
                  <input type="number" value={form.consultationFee || ''} onChange={e => setForm(f => ({ ...f, consultationFee: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Currency</label>
                  <select value={form.currency || 'PKR'} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
                    <option value="PKR">PKR</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Duration (min)</label>
                  <select value={form.consultationDuration || 30} onChange={e => setForm(f => ({ ...f, consultationDuration: Number(e.target.value) }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
                    {[15, 20, 30, 45, 60].map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-3 px-6 py-4 border-t">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Cancel</button>
              <button onClick={handleSave} disabled={saving}
                className="px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50">
                {saving ? 'Saving...' : editing ? 'Update' : 'Add Provider'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm delete/deactivate */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-xl shadow-xl w-80 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Remove Provider?</h3>
            <p className="text-sm text-gray-500 mb-4">This will deactivate the provider. Existing appointments are preserved.</p>
            <div className="flex justify-end space-x-3">
              <button onClick={() => setDeleteId(null)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Cancel</button>
              <button onClick={() => handleDelete(deleteId)}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700">Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
