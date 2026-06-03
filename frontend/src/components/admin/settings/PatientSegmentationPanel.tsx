/**
 * Patient Segmentation Panel - TASK-040C
 */

'use client';

import { useEffect, useState } from 'react';
import { UserGroupIcon } from '@heroicons/react/24/outline';
import notificationSettingsService, {
  PatientSegmentationSummary,
  PatientSegment,
} from '@/services/notificationSettingsService';

interface PatientSegmentationPanelProps {
  organizationId: string;
}

const SEGMENT_LABELS: Record<PatientSegment, string> = {
  NEW: 'New',
  REGULAR: 'Regular',
  VIP: 'VIP',
  AT_RISK: 'At Risk',
  INACTIVE: 'Inactive',
};

const SEGMENT_BADGES: Record<PatientSegment, string> = {
  NEW: 'bg-blue-100 text-blue-800',
  REGULAR: 'bg-gray-100 text-gray-800',
  VIP: 'bg-purple-100 text-purple-800',
  AT_RISK: 'bg-orange-100 text-orange-800',
  INACTIVE: 'bg-red-100 text-red-800',
};

export default function PatientSegmentationPanel({ organizationId }: PatientSegmentationPanelProps) {
  const [summary, setSummary] = useState<PatientSegmentationSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSegments();
  }, [organizationId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadSegments = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await notificationSettingsService.getPatientSegments(organizationId);
      setSummary(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load patient segments');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-sm text-red-700">{error}</p>
        <button
          onClick={loadSegments}
          className="mt-2 text-sm font-medium text-red-700 hover:text-red-600"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!summary) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="flex items-center text-lg font-medium text-gray-900">
          <UserGroupIcon className="mr-2 h-5 w-5 text-blue-600" />
          Patient Segmentation
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          {summary.totalPatients.toLocaleString()} patients classified from appointment history
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {(Object.keys(SEGMENT_LABELS) as PatientSegment[]).map((segment) => (
          <div key={segment} className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              {SEGMENT_LABELS[segment]}
            </p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">
              {(summary.counts[segment] || 0).toLocaleString()}
            </p>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
          <h4 className="text-sm font-medium text-gray-900">Recent Classifications</h4>
        </div>
        {summary.patients.length === 0 ? (
          <p className="px-4 py-6 text-sm text-gray-500">No patients found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Patient
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Segment
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Reason
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                    Appointments
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {summary.patients.slice(0, 8).map((patient) => (
                  <tr key={patient.patientId}>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">{patient.patientName}</p>
                      <p className="text-xs text-gray-500">{patient.phone}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-1 text-xs font-medium ${SEGMENT_BADGES[patient.segment]}`}>
                        {SEGMENT_LABELS[patient.segment]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{patient.reason}</td>
                    <td className="px-4 py-3 text-right text-sm text-gray-500">
                      {patient.appointmentCount.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
