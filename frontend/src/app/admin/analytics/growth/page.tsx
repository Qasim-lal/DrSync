'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/shared';
import {
  ArrowLeftIcon,
  ArrowTrendingUpIcon,
  UserGroupIcon,
  GlobeAltIcon,
} from '@heroicons/react/24/outline';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  FunnelChart,
  Funnel,
  LabelList,
} from 'recharts';

type Period = '7d' | '30d' | '90d';

export default function GrowthAnalyticsPage() {
  const router = useRouter();
  const [period, setPeriod] = useState<Period>('30d');

  // Mock data
  const signupMetrics = {
    total: 1245,
    growth: 18.5,
  };

  const signupsBySource = [
    { source: 'Organic Search', count: 485, percentage: 39 },
    { source: 'Referral', count: 374, percentage: 30 },
    { source: 'Social Media', count: 249, percentage: 20 },
    { source: 'Direct', count: 137, percentage: 11 },
  ];

  const signupsByRegion = [
    { region: 'North America', count: 520, percentage: 41.8 },
    { region: 'Europe', count: 412, percentage: 33.1 },
    { region: 'Asia Pacific', count: 249, percentage: 20 },
    { region: 'Other', count: 64, percentage: 5.1 },
  ];

  const conversionFunnel = [
    { step: 'Visited Site', users: 10000, conversionRate: 100 },
    { step: 'Signed Up', users: 2500, conversionRate: 25 },
    { step: 'Completed Onboarding', users: 1875, conversionRate: 75 },
    { step: 'First Integration', users: 1312, conversionRate: 70 },
    { step: 'Active User', users: 1050, conversionRate: 80 },
  ];

  const retentionMetrics = {
    day1: 78.5,
    day7: 52.3,
    day30: 38.7,
  };

  const cohortData = [
    { cohort: 'Jan 2024', users: 450, week0: 100, week1: 75, week2: 62, week3: 54, week4: 48 },
    { cohort: 'Feb 2024', users: 520, week0: 100, week1: 78, week2: 65, week3: 57, week4: 52 },
    { cohort: 'Mar 2024', users: 1245, week0: 100, week1: 80, week2: 68, week3: 60, week4: 55 },
  ];

  const activationMetrics = {
    rate: 74.5,
    timeToActivation: 3.2,
  };

  const activationSteps = [
    { step: 'Profile Setup', completionRate: 92, avgTime: 5 },
    { step: 'WhatsApp Connection', completionRate: 85, avgTime: 8 },
    { step: 'Google Sheets Setup', completionRate: 78, avgTime: 12 },
    { step: 'First Patient Added', completionRate: 74, avgTime: 15 },
  ];

  const viralMetrics = {
    viralCoefficient: 1.3,
    invitesSent: 3850,
    invitesAccepted: 1245,
    conversionRate: 32.3,
  };

  const signupTrend = [
    { date: 'Week 1', signups: 180, conversions: 135 },
    { date: 'Week 2', signups: 220, conversions: 165 },
    { date: 'Week 3', signups: 250, conversions: 188 },
    { date: 'Week 4', signups: 295, conversions: 220 },
    { date: 'Week 5', signups: 300, conversions: 225 },
  ];

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="rounded-lg p-2 hover:bg-gray-100"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Growth Analytics</h1>
            <p className="mt-2 text-sm text-gray-600">
              Track signups, retention, activation, and viral growth
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <div className="flex rounded-lg border border-gray-300 bg-white">
            {(['7d', '30d', '90d'] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-2 text-sm font-medium transition ${
                  period === p
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:bg-gray-50'
                } ${p === '7d' ? 'rounded-l-lg' : ''} ${
                  p === '90d' ? 'rounded-r-lg' : ''
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <Button variant="outline">Export</Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-sm font-medium text-gray-500">Total Signups</h3>
          <p className="mt-2 text-3xl font-semibold text-gray-900">
            {formatNumber(signupMetrics.total)}
          </p>
          <p className="mt-1 flex items-center text-sm text-green-600">
            <ArrowTrendingUpIcon className="mr-1 h-4 w-4" />
            +{signupMetrics.growth}% growth
          </p>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-sm font-medium text-gray-500">Activation Rate</h3>
          <p className="mt-2 text-3xl font-semibold text-blue-600">
            {activationMetrics.rate}%
          </p>
          <p className="mt-1 text-sm text-gray-600">
            {activationMetrics.timeToActivation} days avg
          </p>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-sm font-medium text-gray-500">Day 30 Retention</h3>
          <p className="mt-2 text-3xl font-semibold text-green-600">
            {retentionMetrics.day30}%
          </p>
          <p className="mt-1 text-sm text-gray-600">Monthly cohort</p>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-sm font-medium text-gray-500">Viral Coefficient</h3>
          <p className="mt-2 text-3xl font-semibold text-purple-600">
            {viralMetrics.viralCoefficient}x
          </p>
          <p className="mt-1 text-sm text-gray-600">
            {viralMetrics.conversionRate}% invite conversion
          </p>
        </div>
      </div>

      {/* Signup Trend */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">
          Signup & Conversion Trend
        </h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={signupTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="date" stroke="#6b7280" tick={{ fill: '#6b7280' }} />
            <YAxis stroke="#6b7280" tick={{ fill: '#6b7280' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '0.5rem',
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="signups"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ r: 4 }}
              name="Signups"
            />
            <Line
              type="monotone"
              dataKey="conversions"
              stroke="#10b981"
              strokeWidth={2}
              dot={{ r: 4 }}
              name="Activated Users"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Signup Sources and Regions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* By Source */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">
            Signups by Source
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={signupsBySource}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ source, percentage }) => `${source} (${percentage}%)`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="count"
              >
                {signupsBySource.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => formatNumber(value)} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 space-y-2">
            {signupsBySource.map((source, index) => (
              <div key={source.source} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-sm text-gray-700">{source.source}</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">
                  {formatNumber(source.count)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* By Region */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">
            Signups by Region
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={signupsByRegion}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="region"
                stroke="#6b7280"
                tick={{ fill: '#6b7280', fontSize: 12 }}
                angle={-15}
                textAnchor="end"
                height={80}
              />
              <YAxis stroke="#6b7280" tick={{ fill: '#6b7280' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.5rem',
                }}
                formatter={(value: number) => formatNumber(value)}
              />
              <Bar dataKey="count" fill="#10b981" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Conversion Funnel */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">
          Conversion Funnel
        </h3>
        <div className="space-y-3">
          {conversionFunnel.map((stage, index) => {
            const dropoff = index > 0
              ? ((conversionFunnel[index - 1].users - stage.users) / conversionFunnel[index - 1].users * 100).toFixed(1)
              : 0;
            return (
              <div key={stage.step} className="relative">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-600">
                      {index + 1}
                    </div>
                    <span className="font-medium text-gray-900">{stage.step}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-900">
                      {formatNumber(stage.users)} users
                    </span>
                    <span className="min-w-[60px] text-right text-sm font-semibold text-blue-600">
                      {stage.conversionRate}%
                    </span>
                  </div>
                </div>
                <div className="mt-2">
                  <div className="h-2 w-full rounded-full bg-gray-200">
                    <div
                      className="h-2 rounded-full bg-blue-600"
                      style={{ width: `${stage.conversionRate}%` }}
                    />
                  </div>
                </div>
                {index > 0 && (
                  <p className="mt-1 text-xs text-red-600">
                    {dropoff}% drop-off from previous step
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Retention and Activation */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Retention Metrics */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">
            Retention Metrics
          </h3>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Day 1</span>
                <span className="text-sm font-semibold text-gray-900">
                  {retentionMetrics.day1}%
                </span>
              </div>
              <div className="mt-2 h-2 w-full rounded-full bg-gray-200">
                <div
                  className="h-2 rounded-full bg-green-600"
                  style={{ width: `${retentionMetrics.day1}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Day 7</span>
                <span className="text-sm font-semibold text-gray-900">
                  {retentionMetrics.day7}%
                </span>
              </div>
              <div className="mt-2 h-2 w-full rounded-full bg-gray-200">
                <div
                  className="h-2 rounded-full bg-green-600"
                  style={{ width: `${retentionMetrics.day7}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Day 30</span>
                <span className="text-sm font-semibold text-gray-900">
                  {retentionMetrics.day30}%
                </span>
              </div>
              <div className="mt-2 h-2 w-full rounded-full bg-gray-200">
                <div
                  className="h-2 rounded-full bg-green-600"
                  style={{ width: `${retentionMetrics.day30}%` }}
                />
              </div>
            </div>
          </div>

          <div className="mt-6">
            <h4 className="mb-3 text-sm font-semibold text-gray-900">
              Cohort Analysis
            </h4>
            <div className="space-y-2">
              {cohortData.map((cohort) => (
                <div key={cohort.cohort} className="rounded-lg border border-gray-200 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">
                      {cohort.cohort}
                    </span>
                    <span className="text-xs text-gray-600">
                      {cohort.users} users
                    </span>
                  </div>
                  <div className="mt-2 flex gap-1">
                    {[cohort.week0, cohort.week1, cohort.week2, cohort.week3, cohort.week4].map(
                      (retention, idx) => (
                        <div
                          key={idx}
                          className="flex-1 h-6 rounded"
                          style={{
                            backgroundColor: `rgba(34, 197, 94, ${retention / 100})`,
                          }}
                          title={`Week ${idx}: ${retention}%`}
                        />
                      )
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Activation Steps */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">
            Activation Journey
          </h3>
          <div className="space-y-4">
            {activationSteps.map((step, index) => (
              <div key={step.step}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{step.step}</p>
                    <p className="text-xs text-gray-500">
                      Avg time: {step.avgTime} min
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">
                    {step.completionRate}%
                  </span>
                </div>
                <div className="mt-2 h-2 w-full rounded-full bg-gray-200">
                  <div
                    className="h-2 rounded-full bg-purple-600"
                    style={{ width: `${step.completionRate}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-lg bg-purple-50 p-4">
            <div className="flex items-center gap-3">
              <UserGroupIcon className="h-6 w-6 text-purple-600" />
              <div>
                <p className="text-sm font-semibold text-purple-900">
                  Viral Growth
                </p>
                <p className="text-xs text-purple-700">
                  {formatNumber(viralMetrics.invitesSent)} invites sent •{' '}
                  {formatNumber(viralMetrics.invitesAccepted)} accepted
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
