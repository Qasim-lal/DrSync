'use client';

import React, { useState, useEffect } from 'react';
import { WizardStepProps } from '../../../../../components/wizard/WizardContainer';

interface TestOperation {
  type: 'insert' | 'read' | 'update' | 'delete';
  label: string;
  description: string;
  status: 'pending' | 'running' | 'success' | 'failed';
  details?: string;
  errorMessage?: string;
}

export function TestOperationsStep({ data, onDataChange, onValidationChange }: WizardStepProps) {
  const [operations, setOperations] = useState<TestOperation[]>([
    {
      type: 'insert',
      label: 'Insert Test Data',
      description: 'Inserting a test appointment record',
      status: 'pending',
    },
    {
      type: 'read',
      label: 'Read Test Data',
      description: 'Reading the inserted test record',
      status: 'pending',
    },
    {
      type: 'update',
      label: 'Update Test Data',
      description: 'Updating the test record',
      status: 'pending',
    },
    {
      type: 'delete',
      label: 'Delete Test Data',
      description: 'Cleaning up test record',
      status: 'pending',
    },
  ]);
  const [testing, setTesting] = useState(false);
  const [allTestsComplete, setAllTestsComplete] = useState(false);
  const [error, setError] = useState('');

  // Auto-run tests if sheet is configured
  useEffect(() => {
    if (data.selectedSheetId && data.structureConfigured && data.permissionsVerified && !allTestsComplete) {
      runAllTests();
    }
  }, [data.selectedSheetId, data.structureConfigured, data.permissionsVerified]);

  const runAllTests = async () => {
    if (!data.selectedSheetId) {
      setError('No sheet selected');
      return;
    }

    setTesting(true);
    setError('');

    try {
      const response = await fetch('/api/configuration/google-sheets/test', {
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
      
      if (result.success && result.data.details?.testResults) {
        const testResults = result.data.details.testResults;
        
        setOperations(ops =>
          ops.map(op => {
            const testResult = testResults[op.type];
            return {
              ...op,
              status: testResult?.success ? 'success' : 'failed',
              details: testResult?.details,
              errorMessage: testResult?.error,
            };
          })
        );

        const allSuccess = Object.values(testResults).every((r: any) => r.success);
        setAllTestsComplete(allSuccess);
        
        onDataChange({
          testResults,
          operationsTested: allSuccess,
        });

        if (!allSuccess) {
          setError('Some operations failed. Please check the details above.');
        }
      } else {
        setError(result.data.errors?.[0] || 'Failed to run tests');
        setOperations(ops =>
          ops.map(op => ({ ...op, status: 'failed' }))
        );
      }
    } catch (err: any) {
      setError('Error running tests: ' + err.message);
      setOperations(ops =>
        ops.map(op => ({ ...op, status: 'failed' }))
      );
    } finally {
      setTesting(false);
    }
  };

  const getStatusIcon = (status: TestOperation['status']) => {
    switch (status) {
      case 'pending':
        return (
          <svg className="icon text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'running':
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

    if (!data.structureConfigured) {
      errors.push('Sheet structure not configured');
    }

    if (!data.permissionsVerified) {
      errors.push('Permissions not verified');
    }

    const failedOps = operations.filter(op => op.status === 'failed');
    if (failedOps.length > 0) {
      errors.push(...failedOps.map(op => op.errorMessage || `${op.label} failed`));
    }

    const pendingOps = operations.filter(op => op.status === 'pending');
    if (pendingOps.length > 0) {
      warnings.push('Operations have not been tested yet');
    }

    onValidationChange({
      isValid: errors.length === 0 && allTestsComplete,
      errors,
      warnings,
    });
  }, [operations, allTestsComplete, data, onValidationChange]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
        <h3 className="text-lg font-medium text-teal-900">Test Sheet Operations</h3>
        <p className="text-sm text-teal-800 mt-2">
          Running tests to verify data insertion, retrieval, updates, and deletion.
        </p>
      </div>

      {/* Prerequisites Check */}
      {(!data.structureConfigured || !data.permissionsVerified) && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start">
            <svg className="icon text-yellow-600 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <h4 className="text-sm font-medium text-yellow-900">Prerequisites Required</h4>
              <p className="text-sm text-yellow-800 mt-1">
                Please complete the previous steps (structure setup and permissions verification) before running tests.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Test Operations */}
      <div className="space-y-3">
        {operations.map((op, index) => (
          <div
            key={op.type}
            className={`border-2 rounded-lg p-4 transition-all ${
              op.status === 'success'
                ? 'border-green-300 bg-green-50'
                : op.status === 'failed'
                ? 'border-red-300 bg-red-50'
                : op.status === 'running'
                ? 'border-blue-300 bg-blue-50'
                : 'border-gray-300 bg-white'
            }`}
          >
            <div className="flex items-start">
              <div className="flex-shrink-0 mt-1">{getStatusIcon(op.status)}</div>
              <div className="ml-3 flex-1">
                <h4 className="text-sm font-medium text-gray-900">{op.label}</h4>
                <p className="text-sm text-gray-600 mt-1">{op.description}</p>
                {op.details && (
                  <p className="text-sm text-gray-700 mt-2 bg-white rounded px-2 py-1 font-mono text-xs">
                    {op.details}
                  </p>
                )}
                {op.errorMessage && (
                  <p className="text-sm text-red-700 mt-2 font-medium">{op.errorMessage}</p>
                )}
                {op.status === 'running' && (
                  <p className="text-sm text-blue-700 mt-2">Running...</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Run Tests Button */}
      <button
        onClick={runAllTests}
        disabled={testing || allTestsComplete || !data.structureConfigured || !data.permissionsVerified}
        className="w-full py-3 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
      >
        {testing ? (
          <span className="flex items-center justify-center">
            <svg className="animate-spin icon-small mr-2" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Running Tests...
          </span>
        ) : allTestsComplete ? (
          'All Tests Passed ✓'
        ) : (
          'Run All Tests'
        )}
      </button>

      {/* Success Message */}
      {allTestsComplete && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start">
            <svg className="icon text-green-600 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h4 className="text-sm font-medium text-green-900">All Tests Passed Successfully!</h4>
              <p className="text-sm text-green-800 mt-1">
                All data operations are working correctly. Your sheet is ready for use.
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
            </div>
          </div>
        </div>
      )}

      {/* Info */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
        <p className="text-xs text-gray-600">
          <strong>Note:</strong> These tests will insert and then clean up a test record.
          No permanent data will be added to your sheet.
        </p>
      </div>
    </div>
  );
}
