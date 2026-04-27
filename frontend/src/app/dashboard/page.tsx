'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  getPatients, getAppointments, getProviders,
  getLocalUser, type Patient, type Appointment, type Provider,
} from '@/lib/api/dashboard';

export default function DashboardPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const user = getLocalUser();

  useEffect(() => {
    async function load() {
      try {
        const [p, a, pr] = await Promise.all([
          getPatients({ limit: 5 }),
          getAppointments({ limit: 10 }),
          getProviders(),
        ]);
        setPatients(p.data || []);
        setAppointments(a.data || []);
        setProviders(pr.data || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const todayStr = new Date().toISOString().split('T')[0];
  const todayAppts = appointments.filter(a => a.scheduledAt?.startsWith(todayStr));
  const pendingAppts = appointments.filter(a =>
    a.status === 'SCHEDULED' || a.status === 'CONFIRMED'
  );

  const stats = [
    { label: 'Total Patients', value: patients.length, href: '/dashboard/patients', color: 'bg-blue-500' },
    { label: 'Today', value: todayAppts.length, href: '/dashboard/appointments', color: 'bg-green-500' },
    { label: 'Pending', value: pendingAppts.length, href: '/dashboard/appointments', color: 'bg-yellow-500' },
    { label: 'Providers', value: providers.length, href: '/dashboard/providers', color: 'bg-purple-500' },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user?.first_name || 'Doctor'}
        </h1>
        <p className="text-gray-500 mt-1">{"Here's what's happening today"}</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {stats.map((s) => (
              <Link key={s.label} href={s.href}
                className="bg-white rounded-lg shadow p-5 hover:shadow-md transition-shadow">
                <div className={`inline-flex h-10 w-10 items-center justify-center rounded-lg ${s.color} mb-3`}>
                  <span className="text-white text-lg font-bold">{s.value}</span>
                </div>
                <p className="text-sm text-gray-500">{s.label}</p>
              </Link>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Recent Appointments</h2>
                <Link href="/dashboard/appointments" className="text-sm text-indigo-600 hover:underline">View all</Link>
              </div>
              {appointments.length === 0 ? (
                <p className="text-gray-400 text-sm">No appointments yet</p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {appointments.slice(0, 5).map((a) => (
                    <li key={a.id} className="py-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {a.patient?.firstName} {a.patient?.lastName}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(a.scheduledAt).toLocaleString()}
                          </p>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          a.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                          a.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                          a.status === 'CONFIRMED' ? 'bg-blue-100 text-blue-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {a.status}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Recent Patients</h2>
                <Link href="/dashboard/patients" className="text-sm text-indigo-600 hover:underline">View all</Link>
              </div>
              {patients.length === 0 ? (
                <p className="text-gray-400 text-sm">No patients yet</p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {patients.slice(0, 5).map((p) => (
                    <li key={p.id} className="py-3 flex items-center space-x-3">
                      <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-sm font-semibold">
                        {p.firstName?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{p.firstName} {p.lastName}</p>
                        <p className="text-xs text-gray-500">{p.phone}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link href="/dashboard/patients"
          className="flex items-center space-x-2 bg-indigo-600 text-white rounded-lg px-4 py-3 hover:bg-indigo-700 transition-colors">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span className="text-sm font-medium">New Patient</span>
        </Link>
        <Link href="/dashboard/appointments"
          className="flex items-center space-x-2 bg-green-600 text-white rounded-lg px-4 py-3 hover:bg-green-700 transition-colors">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-sm font-medium">Book Appointment</span>
        </Link>
        <Link href="/dashboard/providers"
          className="flex items-center space-x-2 bg-purple-600 text-white rounded-lg px-4 py-3 hover:bg-purple-700 transition-colors">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span className="text-sm font-medium">Providers</span>
        </Link>
        <Link href="/dashboard/staff"
          className="flex items-center space-x-2 bg-gray-700 text-white rounded-lg px-4 py-3 hover:bg-gray-800 transition-colors">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <span className="text-sm font-medium">Staff</span>
        </Link>
      </div>
    </div>
  );
}
