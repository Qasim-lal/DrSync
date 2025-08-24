'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  services: {
    database: string;
    redis: string;
    server: string;
  };
  uptime: number;
  environment: string;
}

export default function HomePage() {
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkBackendHealth = async () => {
      try {
        const response = await fetch('http://localhost:3001/health');
        const data = await response.json();
        setHealthStatus(data.data);
      } catch (error) {
        console.error('Failed to check backend health:', error);
        setHealthStatus({
          status: 'unhealthy',
          services: {
            database: 'error',
            redis: 'error',
            server: 'disconnected',
          },
          uptime: 0,
          environment: 'unknown',
        });
      } finally {
        setLoading(false);
      }
    };

    checkBackendHealth();
    const interval = setInterval(checkBackendHealth, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
      case 'running':
        return (
          <svg className="icon-small text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'error':
      case 'disconnected':
        return (
          <svg className="icon-small text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return (
          <svg className="icon-small text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 15.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        );
    }
  };

  const formatUptime = (uptime: number) => {
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);
    return `${hours}h ${minutes}m ${seconds}s`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Welcome to <span className="text-blue-600">DrSync</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Healthcare Appointment Management System with intelligent WhatsApp automation
          </p>
        </div>

        {/* Status Cards */}
        <div className="max-w-4xl mx-auto mb-12">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6 text-center">
            System Status
          </h2>
          
          {loading ? (
            <div className="bg-white rounded-lg shadow-md p-6 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Checking system status...</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {/* Overall Status */}
              <div className={`bg-white rounded-lg shadow-md p-6 border-l-4 ${
                healthStatus?.status === 'healthy' ? 'border-green-500' : 'border-red-500'
              }`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Overall Status</h3>
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                    healthStatus?.status === 'healthy' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {healthStatus?.status || 'Unknown'}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Environment</span>
                    <span className="font-medium">{healthStatus?.environment || 'Unknown'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Uptime</span>
                    <span className="font-medium">
                      {healthStatus ? formatUptime(healthStatus.uptime) : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Services Status */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Services</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <svg className="icon-small text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                      </svg>
                      <span className="text-gray-600">Database</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(healthStatus?.services?.database || 'unknown')}
                      <span className="text-sm font-medium capitalize">
                        {healthStatus?.services?.database || 'Unknown'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <svg className="icon-small text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h6l2 2h6a2 2 0 012 2v4a2 2 0 01-2 2H5z" />
                      </svg>
                      <span className="text-gray-600">Redis Cache</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(healthStatus?.services?.redis || 'unknown')}
                      <span className="text-sm font-medium capitalize">
                        {healthStatus?.services?.redis || 'Unknown'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <svg className="icon-small text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.829a5 5 0 010-7.07m7.072 0a5 5 0 010 7.07M13 12a1 1 0 11-2 0 1 1 0 012 0z" />
                      </svg>
                      <span className="text-gray-600">API Server</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(healthStatus?.services?.server || 'unknown')}
                      <span className="text-sm font-medium capitalize">
                        {healthStatus?.services?.server || 'Unknown'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Features Grid */}
        <div className="max-w-6xl mx-auto mb-12">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6 text-center">
            Coming Soon
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white rounded-lg shadow-md p-6 text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="icon-medium text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Patient Management</h3>
              <p className="text-gray-600">Comprehensive patient database with search and filtering capabilities</p>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6 text-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="icon-medium text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Appointment Scheduling</h3>
              <p className="text-gray-600">Smart scheduling system with conflict detection and availability management</p>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6 text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="icon-medium text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">WhatsApp Integration</h3>
              <p className="text-gray-600">Automated appointment reminders and booking through WhatsApp</p>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">
            Quick Links
          </h2>
          <div className="flex flex-wrap justify-center gap-4">
            <Link 
              href="http://localhost:3001/health"
              target="_blank"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              API Health Check
            </Link>
            <Link 
              href="http://localhost:3001/api/docs"
              target="_blank"
              className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              API Documentation
            </Link>
            <Link 
              href="/dashboard"
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              Dashboard (Coming Soon)
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-16 text-center text-gray-500">
          <p>DrSync Healthcare Appointment Management System</p>
          <p className="text-sm mt-1">Phase 1: Foundation Complete ✅ | Phase 2: Backend Development In Progress 🚧</p>
        </div>
      </div>
    </div>
  );
}
