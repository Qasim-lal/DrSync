'use client';

import React, { useState, useEffect } from 'react';
import { WizardStepProps } from '../../../../../components/wizard/WizardContainer';

interface ColumnMapping {
  field: string;
  header: string;
  required: boolean;
  type: 'string' | 'number' | 'date' | 'boolean';
  description: string;
}

const defaultColumnMappings: ColumnMapping[] = [
  { field: 'appointmentId', header: 'Appointment ID', required: true, type: 'string', description: 'Unique appointment identifier' },
  { field: 'patientName', header: 'Patient Name', required: true, type: 'string', description: 'Full patient name' },
  { field: 'patientPhone', header: 'Patient Phone', required: true, type: 'string', description: 'Patient contact number' },
  { field: 'patientEmail', header: 'Patient Email', required: false, type: 'string', description: 'Patient email address' },
  { field: 'providerName', header: 'Provider Name', required: true, type: 'string', description: 'Healthcare provider name' },
  { field: 'appointmentDate', header: 'Appointment Date', required: true, type: 'date', description: 'Date of appointment' },
  { field: 'appointmentTime', header: 'Appointment Time', required: true, type: 'string', description: 'Time of appointment' },
  { field: 'status', header: 'Status', required: true, type: 'string', description: 'Appointment status (scheduled, confirmed, cancelled, etc.)' },
  { field: 'notes', header: 'Notes', required: false, type: 'string', description: 'Additional notes or comments' },
];

export function StructureSetupStep({ data, onDataChange, onValidationChange }: WizardStepProps) {
  const [mode, setMode] = useState<'auto' | 'manual'>(data.structureMode || 'auto');
  const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>(data.columnMappings || defaultColumnMappings);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [existingStructure, setExistingStructure] = useState<any>(null);
  const [structureAction, setStructureAction] = useState<'create' | 'update' | 'keep'>(data.structureAction || 'create');

  // Fetch existing structure on mount
  useEffect(() => {
    if (data.selectedSheetId) {
      checkExistingStructure();
    }
  }, [data.selectedSheetId]);

  const checkExistingStructure = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/configuration/google-sheets/structure?sheetId=${data.selectedSheetId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      const result = await response.json();
      if (result.success && result.data.details?.existingStructure) {
        setExistingStructure(result.data.details.existingStructure);
        if (result.data.details.existingStructure.headers && result.data.details.existingStructure.headers.length > 0) {
          setStructureAction('update');
        }
      }
    } catch (err: any) {
      console.error('Error checking structure:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSetupStructure = async () => {
    setLoading(true);
    setError('');
    setSuccess(false);

    const payload: any = {
      sheetId: data.selectedSheetId,
      action: structureAction,
    };

    if (mode === 'manual') {
      payload.customHeaders = columnMappings.map(col => col.header);
      payload.columnMappings = columnMappings;
    }

    try {
      const response = await fetch('/api/configuration/google-sheets/structure', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(payload),
      });
      
      const result = await response.json();
      if (result.success) {
        setSuccess(true);
        onDataChange({
          structureMode: mode,
          structureAction,
          columnMappings,
          structureConfigured: true,
        });
      } else {
        setError(result.data.errors?.[0] || 'Failed to setup structure');
      }
    } catch (err: any) {
      setError('Error setting up structure: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleColumnChange = (index: number, field: keyof ColumnMapping, value: any) => {
    const updated = [...columnMappings];
    updated[index] = { ...updated[index], [field]: value };
    setColumnMappings(updated);
  };

  const addColumn = () => {
    setColumnMappings([...columnMappings, {
      field: 'customField' + (columnMappings.length + 1),
      header: 'Custom Field ' + (columnMappings.length + 1),
      required: false,
      type: 'string',
      description: 'Custom field',
    }]);
  };

  const removeColumn = (index: number) => {
    if (columnMappings[index].required) {
      setError('Cannot remove required columns');
      return;
    }
    setColumnMappings(columnMappings.filter((_, i) => i !== index));
  };

  // Update parent data
  useEffect(() => {
    onDataChange({
      structureMode: mode,
      structureAction,
      columnMappings,
      structureConfigured: success,
    });
  }, [mode, structureAction, columnMappings, success]);

  // Validation
  useEffect(() => {
    const errors = [];
    const warnings = [];

    if (!data.selectedSheetId) {
      errors.push('No sheet selected');
    }

    if (mode === 'manual') {
      const requiredMissing = columnMappings.filter(col => col.required && !col.header.trim());
      if (requiredMissing.length > 0) {
        errors.push('Required column headers cannot be empty');
      }

      const duplicateHeaders = columnMappings.filter((col, i) =>
        columnMappings.findIndex(c => c.header === col.header) !== i
      );
      if (duplicateHeaders.length > 0) {
        errors.push('Duplicate column headers found');
      }
    }

    if (existingStructure?.headers?.length > 0 && structureAction === 'update') {
      warnings.push('Updating structure will modify existing headers');
    }

    onValidationChange({
      isValid: errors.length === 0 && success,
      errors,
      warnings,
    });
  }, [mode, columnMappings, success, existingStructure, structureAction, data.selectedSheetId, onValidationChange]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <h3 className="text-lg font-medium text-purple-900">Configure Sheet Structure</h3>
        <p className="text-sm text-purple-800 mt-2">
          Set up the column headers and data structure for your Google Sheet.
        </p>
      </div>

      {/* Existing Structure Warning */}
      {existingStructure?.headers?.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start">
            <svg className="icon text-yellow-600 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <h4 className="text-sm font-medium text-yellow-900">Existing Structure Found</h4>
              <p className="text-sm text-yellow-800 mt-1">
                This sheet already has headers: {existingStructure.headers.join(', ')}
              </p>
              <div className="mt-3 flex space-x-3">
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={structureAction === 'keep'}
                    onChange={() => setStructureAction('keep')}
                    className="mr-2"
                  />
                  <span className="text-sm text-yellow-900">Keep existing structure</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={structureAction === 'update'}
                    onChange={() => setStructureAction('update')}
                    className="mr-2"
                  />
                  <span className="text-sm text-yellow-900">Update/overwrite headers</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mode Selection */}
      <div className="flex space-x-4">
        <button
          onClick={() => setMode('auto')}
          className={`flex-1 py-3 px-4 rounded-lg border-2 transition-colors ${
            mode === 'auto'
              ? 'border-purple-600 bg-purple-50 text-purple-900'
              : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
          }`}
        >
          <div className="flex items-center justify-center">
            <svg className="icon-small mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span className="font-medium">Auto Setup (Recommended)</span>
          </div>
        </button>
        
        <button
          onClick={() => setMode('manual')}
          className={`flex-1 py-3 px-4 rounded-lg border-2 transition-colors ${
            mode === 'manual'
              ? 'border-purple-600 bg-purple-50 text-purple-900'
              : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
          }`}
        >
          <div className="flex items-center justify-center">
            <svg className="icon-small mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            <span className="font-medium">Custom Setup</span>
          </div>
        </button>
      </div>

      {/* Auto Mode */}
      {mode === 'auto' && (
        <div className="space-y-4">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Standard Structure</h4>
            <p className="text-xs text-gray-600 mb-3">
              The following standard columns will be created automatically:
            </p>
            <div className="grid grid-cols-2 gap-2">
              {defaultColumnMappings.map((col, i) => (
                <div key={i} className="flex items-center text-sm">
                  <svg className="icon-small text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700">{col.header}</span>
                  {col.required && <span className="ml-1 text-red-500 text-xs">*</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Manual Mode */}
      {mode === 'manual' && (
        <div className="space-y-4">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-sm font-medium text-gray-900">Column Mappings</h4>
              <button
                onClick={addColumn}
                className="text-sm text-purple-600 hover:text-purple-700 font-medium flex items-center"
              >
                <svg className="icon-small mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Column
              </button>
            </div>
            
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {columnMappings.map((col, index) => (
                <div key={index} className="bg-white border border-gray-200 rounded-lg p-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Field Name {col.required && <span className="text-red-500">*</span>}
                      </label>
                      <input
                        type="text"
                        value={col.field}
                        onChange={(e) => handleColumnChange(index, 'field', e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                        disabled={col.required}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Header {col.required && <span className="text-red-500">*</span>}
                      </label>
                      <input
                        type="text"
                        value={col.header}
                        onChange={(e) => handleColumnChange(index, 'header', e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <p className="text-xs text-gray-500">{col.description}</p>
                    {!col.required && (
                      <button
                        onClick={() => removeColumn(index)}
                        className="text-xs text-red-600 hover:text-red-700 font-medium"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Testing Mode Bypass (Development Only) */}
      {process.env.NODE_ENV === 'development' && !success && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <svg className="icon-small text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm text-yellow-800">
                <strong>Testing Mode:</strong> Simulate structure setup without real Google Sheets API
              </span>
            </div>
            <button
              onClick={() => {
                setSuccess(true);
                setError('');
                onDataChange({
                  structureMode: mode,
                  structureAction,
                  columnMappings,
                  structureConfigured: true,
                  headersConfigured: true,
                });
              }}
              className="px-4 py-2 bg-yellow-600 text-white text-sm font-medium rounded-lg hover:bg-yellow-700 transition-colors"
            >
              🧪 Skip (Simulate Setup)
            </button>
          </div>
        </div>
      )}

      {/* Setup Button */}
      <button
        onClick={handleSetupStructure}
        disabled={loading || success}
        className="w-full py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? (
          <span className="flex items-center justify-center">
            <svg className="animate-spin icon-small mr-2" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Setting Up Structure...
          </span>
        ) : success ? (
          'Structure Configured ✓'
        ) : (
          'Setup Structure'
        )}
      </button>

      {/* Success Message */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start">
            <svg className="icon-small text-green-600 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h4 className="text-sm font-medium text-green-900">Structure Configured Successfully!</h4>
              <p className="text-sm text-green-800 mt-1">
                Sheet headers have been set up and are ready for data.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-start">
            <svg className="icon-small text-red-600 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-red-800">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
}
