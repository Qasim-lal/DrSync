import React from 'react';
import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/outline';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    trend: 'up' | 'down';
  };
  icon?: React.ReactNode;
  subtitle?: string;
  loading?: boolean;
  className?: string;
}

export default function StatCard({
  title,
  value,
  change,
  icon,
  subtitle,
  loading = false,
  className = '',
}: StatCardProps) {
  if (loading) {
    return (
      <div
        className={`animate-pulse rounded-lg bg-white p-6 shadow-sm ${className}`}
      >
        <div className="h-4 w-24 rounded bg-gray-200"></div>
        <div className="mt-4 h-8 w-32 rounded bg-gray-200"></div>
        <div className="mt-2 h-3 w-16 rounded bg-gray-200"></div>
      </div>
    );
  }

  return (
    <div className={`rounded-lg bg-white p-6 shadow-sm ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="mt-2 text-3xl font-semibold text-gray-900">{value}</p>

          {change && (
            <div className="mt-2 flex items-center">
              {change.trend === 'up' ? (
                <ArrowUpIcon className="h-4 w-4 text-green-500" />
              ) : (
                <ArrowDownIcon className="h-4 w-4 text-red-500" />
              )}
              <span
                className={`ml-1 text-sm font-medium ${
                  change.trend === 'up' ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {Math.abs(change.value)}%
              </span>
              {subtitle && (
                <span className="ml-2 text-sm text-gray-500">{subtitle}</span>
              )}
            </div>
          )}

          {!change && subtitle && (
            <p className="mt-2 text-sm text-gray-500">{subtitle}</p>
          )}
        </div>

        {icon && (
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
