'use client';

import React, { useState, useEffect } from 'react';
import { WizardStepProps } from '../../../../../components/wizard/WizardContainer';

interface PermissionCheck {
  type: 'read' | 'write' | 'share';
  label: string;
  description: string;
  status: 'pending' | 'checking' | 'success' | 'failed';
  errorMessage?: string;
}

export function PermissionsStep({ data, onDataChange, onValidationChange }: WizardStepProps) {
  const [permissionChecks, setPermissionChecks] = useState<PermissionCheck[]>([
    {
      type: 'read',
      label: 'Read Permission',
      description: 'Ability to read data from the sheet',
      status: 'pending',
    },
    {
      type: 'write',
      label: 'Write Permission',
      description: 'Ability to add and modify data in the sheet',
      status: 'pending',
    },
    {
      type: 'share',
      label: 'Share Permission',
      description: 'Ability to manage sharing settings',
      status: 'pending',
    },
  ]);
  const [verifying, setVerifying] = useState(false);
  const [allChecksComplete, setAllChecksComplete] = useState(false);
  const [error, setError] = useState('');

  // Automatically verify permissions on mount if sheet is selected
  useEffect(() => {
    if (data.selectedSheetId && !allChecksComplete) {
      verifyAllPermissions();
    }
  }, [data.selectedSheetId]);

  const verifyAllPermissions = async () => {
    if (!data.selectedSheetId) {
      setError('No sheet selected');
      return;
    }

    setVerifying(true);
    setError('');

    // Mark all as checking
    setPermissionChecks(checks =>
      checks.map(check => ({ ...check, status: 'checking' as const }))
    );

    try {
      const response = await fetch('/api/configuration/google-sheets/permissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          sheetId: data.selectedSheetId,
        }),
      });
      
      const result = await response.json();
      
      if (result.success && result.data.details?.permissions) {
        const perms = result.data.details.permissions;
        
        setPermissionChecks(checks =>
          checks.map(check => ({
            ...check,
            status: perms[check.type] ? 'success' : 'failed',
            errorMessage: perms[check.type] ? undefined : `${check.label} is missing`,
          }))
        );

        const allSuccess = perms.read && perms.write && perms.share;
        setAllChecksComplete(allSuccess);
        
        onDataChange({
          permissions: perms,
          permissionsVerified: allSuccess,
        });

        if (!allSuccess) {
          setError('Some permissions are missing. Please check the sheet sharing settings.');
        }
      } else {
        setError(result.data.errors?.[0] || 'Failed to verify permissions');
        setPermissionChecks(checks =>
          checks.map(check => ({ ...check, status: 'failed' }))
        );
      }
    } catch (err: any) {
      setError('Error verifying permissions: ' + err.message);
      setPermissionChecks(checks =>
        checks.map(check => ({ ...check, status: 'failed' }))
      );
    } finally {
      setVerifying(false);
    }
  };

  const getStatusIcon = (status: PermissionCheck['status']) => {
    switch (status) {
      case 'pending':
        return (
          <svg className="icon text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'checking':
        return (
          <svg className="animate-spin icon text-blue-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        );
      case 'success':
        return (
          <svg className="icon text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'failed':
        return (
          <svg className="icon text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  // Validation
  useEffect(() => {
    const errors = [];
    const warnings = [];

    if (!data.selectedSheetId) {
      errors.push('No sheet selected');
    }

    const failedChecks = permissionChecks.filter(check => check.status === 'failed');
    if (failedChecks.length > 0) {
      errors.push(...failedChecks.map(check => check.errorMessage || `${check.label} check failed`));
    }

    const pendingChecks = permissionChecks.filter(check => check.status === 'pending');
    if (pendingChecks.length > 0) {
      warnings.push('Permissions have not been verified yet');
    }

    onValidationChange({
      isValid: errors.length === 0 && allChecksComplete,
      errors,
      warnings,
    });
  }, [permissionChecks, allChecksComplete, data.selectedSheetId, onValidationChange]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
        <h3 className="text-lg font-medium text-indigo-900">Verify Sheet Permissions</h3>
        <p className="text-sm text-indigo-800 mt-2">
          Checking that you have the necessary permissions to read, write, and share the Google Sheet.
        </p>
      </div>

      {/* Permission Checks */}
      <div className="space-y-3">
        {permissionChecks.map((check, index) => (
          <div
            key={check.type}
            className={`border-2 rounded-lg p-4 transition-all ${
              check.status === 'success'
                ? 'border-green-300 bg-green-50'
                : check.status === 'failed'
                ? 'border-red-300 bg-red-50'
                : check.status === 'checking'
                ? 'border-blue-300 bg-blue-50'
                : 'border-gray-300 bg-white'
            }`}
          >
            <div className="flex items-start">
              <div className="flex-shrink-0 mt-1">{getStatusIcon(check.status)}</div>
              <div className="ml-3 flex-1">
                <h4 className="text-sm font-medium text-gray-900">{check.label}</h4>
                <p className="text-sm text-gray-600 mt-1">{check.description}</p>
                {check.errorMessage && (
                  <p className="text-sm text-red-700 mt-2 font-medium">{check.errorMessage}</p>
                )}
                {check.status === 'checking' && (
                  <p className="text-sm text-blue-700 mt-2">Checking...</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Verify Button */}
      <button
        onClick={verifyAllPermissions}
        disabled={verifying || allChecksComplete}
        className="w-full py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
      >
        {verifying ? (
          <span className="flex items-center justify-center">
            <svg className="animate-spin icon-small mr-2" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Verifying Permissions...
          </span>
        ) : allChecksComplete ? (
          'All Permissions Verified ✓'
        ) : (
          'Verify Permissions'
        )}
      </button>

      {/* Success Message */}
      {allChecksComplete && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start">
            <svg className="icon text-green-600 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h4 className="text-sm font-medium text-green-900">All Permissions Verified!</h4>
              <p className="text-sm text-green-800 mt-1">
                You have full access to read, write, and manage the Google Sheet.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <svg className="icon-small text-red-600 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm text-red-800">{error}</p>
              <a
                href={data.sheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline mt-2 inline-block"
              >
                Open sheet to fix permissions ↗
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Info */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
        <p className="text-xs text-gray-600">
          <strong>Note:</strong> If permission checks fail, make sure you've shared the sheet
          with the service account or that your OAuth token has the necessary scopes.
        </p>
      </div>
    </div>
  );
}
