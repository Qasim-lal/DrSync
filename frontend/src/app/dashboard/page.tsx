'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  getPatients, getAppointments, getProviders,
  getLocalUser, type Patient, type Appointment, type Provider,
} from '@/lib/api/dashboard';
// Dashboard page — replaces old placeholder

export default function DashboardPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const user = getLocalUser();
  const todayStr = new Date().toISOString().split('T')[0];
  const todayAppts = appointments.filter(a =>
    a.scheduledAt?.startsWith(todayStr)
  );
  const pendingAppts = appointments.filter(a =>
    a.status === 'SCHEDULED' || a.status === 'CONFIRMED'
  );

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

  const stats = [
    { label: 'Total Patients', value: patients.length, href: '/dashboard/patients', color: 'bg-blue-500' },
    { label: 'Appointments Today', value: todayAppts.length, href: '/dashboard/appointments', color: 'bg-green-500' },
    { label: 'Pending', value: pendingAppts.length, href: '/dashboard/appointments', color: 'bg-yellow-500' },
    { label: 'Providers', value: providers.length, href: '/dashboard/providers', color: 'bg-purple-500' },
  ];

  return (
    <div>
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user?.first_name || 'Doctor'} 👋
        </h1>
        <p className="text-gray-500 mt-1">Here&apos;s what&apos;s happening today</p>
      </div>

      {/* Stats */}
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

          {/* Recent appointments */}
          <div className="grid md:grid-cols-2 gap-6">
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
                            {new Date(a.scheduledAt).toLocaleString()} · {a.provider?.firstName} {a.provider?.lastName}
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

            {/* Recent patients */}
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

      {/* Quick actions */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link href="/dashboard/patients" className="flex items-center space-x-2 bg-indigo-600 text-white rounded-lg px-4 py-3 hover:bg-indigo-700 transition-colors">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span className="text-sm font-medium">New Patient</span>
        </Link>
        <Link href="/dashboard/appointments" className="flex items-center space-x-2 bg-green-600 text-white rounded-lg px-4 py-3 hover:bg-green-700 transition-colors">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-sm font-medium">Book Appointment</span>
        </Link>
        <Link href="/dashboard/providers" className="flex items-center space-x-2 bg-purple-600 text-white rounded-lg px-4 py-3 hover:bg-purple-700 transition-colors">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span className="text-sm font-medium">Manage Providers</span>
        </Link>
        <Link href="/dashboard/setup/whatsapp" className="flex items-center space-x-2 bg-gray-700 text-white rounded-lg px-4 py-3 hover:bg-gray-800 transition-colors">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          </svg>
          <span className="text-sm font-medium">Settings</span>
        </Link>
      </div>

      <div style={{ display: 'none' }}>
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <Link 
                href="/"
                className="inline-flex items-center text-sm text-gray-600 hover:text-blue-600 mb-4"
              >
                <svg className="icon-small mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Home
              </Link>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600 mt-2">Healthcare Appointment Management</p>
            </div>
          </div>

          {/* Configuration Status Card */}
          <div className="bg-white rounded-lg shadow-md p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="icon-medium text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Welcome to DrSync!
              </h2>
              
              <p className="text-gray-600 mb-8">
                Let's get your clinic set up with WhatsApp appointment booking and Google Sheets integration.
              </p>
            </div>

            {/* Configuration Wizards */}
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              {/* WhatsApp Setup */}
              <div className="border border-gray-200 rounded-lg p-6">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <svg className="icon-small text-green-600" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.886 3.75"/>
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4 flex-1">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      WhatsApp Business Setup
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Connect your WhatsApp Business API to enable patients to book appointments via WhatsApp messages.
                    </p>
                    <Link
                      href="/dashboard/setup/whatsapp"
                      className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors duration-200"
                    >
                      <svg className="icon-small mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      </svg>
                      Start Setup
                    </Link>
                  </div>
                </div>
              </div>

              {/* Google Sheets Setup */}
              <div className="border border-gray-200 rounded-lg p-6">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <svg className="icon-small text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M19.44 3H4.56C3.7 3 3 3.7 3 4.56v14.88c0 .86.7 1.56 1.56 1.56h14.88c.86 0 1.56-.7 1.56-1.56V4.56c0-.86-.7-1.56-1.56-1.56zM14 17H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4 flex-1">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Google Sheets Integration
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Connect your Google Sheets to store and manage appointment data in your own spreadsheets.
                    </p>
                    <Link
                      href="/dashboard/setup/google-sheets"
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200"
                    >
                      <svg className="icon-small mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      </svg>
                      Start Setup
                    </Link>
                  </div>
                </div>
              </div>

              {/* Staff Management */}
              <div className="border border-gray-200 rounded-lg p-6">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <svg className="icon-small text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4 flex-1">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Staff Management
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Manage your clinic staff members and send invitations to join your team.
                    </p>
                    <Link
                      href="/dashboard/staff"
                      className="inline-flex items-center px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors duration-200"
                    >
                      <svg className="icon-small mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                      Manage Staff
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Planned Features:
              </h3>
              <div className="grid md:grid-cols-2 gap-3 text-left">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">Patient Management</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">Appointment Scheduling</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">WhatsApp Integration</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">Analytics & Reports</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-pink-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">Google Sheets Sync</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">Provider Management</span>
                </div>
              </div>
            </div>

            <div className="text-sm text-gray-500">
              <p>Currently in Phase 1: Foundation ✅</p>
              <p>Next: Phase 2 - Backend API Development 🚧</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
