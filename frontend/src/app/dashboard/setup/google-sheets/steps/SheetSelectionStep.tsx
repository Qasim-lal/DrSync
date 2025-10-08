'use client';

import React, { useState, useEffect } from 'react';
import { WizardStepProps } from '../../../../../components/wizard/WizardContainer';

interface Sheet {
  id: string;
  name: string;
  url: string;
  hasData: boolean;
}

export function SheetSelectionStep({ data, onDataChange, onValidationChange }: WizardStepProps) {
  const [mode, setMode] = useState<'select' | 'create'>(data.mode || 'select');
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [selectedSheetId, setSelectedSheetId] = useState(data.selectedSheetId || '');
  const [newSheetName, setNewSheetName] = useState(data.newSheetName || '');
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch available sheets on mount
  useEffect(() => {
    if (mode === 'select') {
      fetchSheets();
    }
  }, [mode]);

  const fetchSheets = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/configuration/google-sheets/list', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      const result = await response.json();
      if (result.success && result.data.details?.sheets) {
        setSheets(result.data.details.sheets);
      } else {
        setError('Failed to load sheets');
      }
    } catch (err: any) {
      setError('Error loading sheets: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSheet = async () => {
    if (!newSheetName.trim()) {
      setError('Sheet name is required');
      return;
    }

    setCreating(true);
    setError('');
    try {
      const response = await fetch('/api/configuration/google-sheets/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ sheetName: newSheetName }),
      });
      
      const result = await response.json();
      if (result.success && result.data.details?.sheetId) {
        setSelectedSheetId(result.data.details.sheetId);
        onDataChange({
          mode: 'create',
          selectedSheetId: result.data.details.sheetId,
          sheetUrl: result.data.details.sheetUrl,
          newSheetName,
          createNewSheet: true,
        });
      } else {
        setError('Failed to create sheet: ' + (result.data.errors?.[0] || 'Unknown error'));
      }
    } catch (err: any) {
      setError('Error creating sheet: ' + err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleSelectSheet = async (sheetId: string) => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/configuration/google-sheets/select', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ sheetId }),
      });
      
      const result = await response.json();
      if (result.success) {
        setSelectedSheetId(sheetId);
        const selectedSheet = sheets.find(s => s.id === sheetId);
        onDataChange({
          mode: 'select',
          selectedSheetId: sheetId,
          sheetUrl: result.data.details?.sheetUrl,
          existingSheetHasData: result.data.warnings?.includes('existing data'),
          createNewSheet: false,
        });
      } else {
        setError('Failed to select sheet: ' + (result.data.errors?.[0] || 'Unknown error'));
      }
    } catch (err: any) {
      setError('Error selecting sheet: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Update parent data
  useEffect(() => {
    if (mode === 'create' && newSheetName) {
      onDataChange({ mode, newSheetName, createNewSheet: true });
    } else if (mode === 'select' && selectedSheetId) {
      onDataChange({ mode, selectedSheetId, createNewSheet: false });
    }
  }, [mode, newSheetName, selectedSheetId]);

  // Validation
  useEffect(() => {
    const errors = [];
    const warnings = [];
    
    if (mode === 'select' && !selectedSheetId) {
      errors.push('Please select a sheet');
    }
    
    if (mode === 'create' && !newSheetName.trim()) {
      errors.push('Sheet name is required');
    }
    
    if (mode === 'select' && selectedSheetId && data.existingSheetHasData) {
      warnings.push('Selected sheet contains existing data');
    }
    
    // BUG FIX: Only pass errors if there are actual error messages
    // This prevents empty error panels from showing
    onValidationChange({
      isValid: errors.length === 0 && (selectedSheetId || newSheetName.trim()),
      errors: errors.length > 0 ? errors : [],
      warnings,
    });
  }, [mode, selectedSheetId, newSheetName, data.existingSheetHasData, onValidationChange]);

  const filteredSheets = sheets.filter(sheet =>
    sheet.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-lg font-medium text-blue-900">Select or Create Google Sheet</h3>
        <p className="text-sm text-blue-800 mt-2">
          Choose an existing sheet or create a new one for your appointment data.
        </p>
      </div>

      {/* Mode Selection */}
      <div className="flex space-x-4">
        <button
          onClick={() => setMode('select')}
          className={`flex-1 py-3 px-4 rounded-lg border-2 transition-colors ${
            mode === 'select'
              ? 'border-blue-600 bg-blue-50 text-blue-900'
              : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
          }`}
        >
          <div className="flex items-center justify-center">
            <svg className="icon-small mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="font-medium">Use Existing Sheet</span>
          </div>
        </button>
        
        <button
          onClick={() => setMode('create')}
          className={`flex-1 py-3 px-4 rounded-lg border-2 transition-colors ${
            mode === 'create'
              ? 'border-green-600 bg-green-50 text-green-900'
              : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
          }`}
        >
          <div className="flex items-center justify-center">
            <svg className="icon-small mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="font-medium">Create New Sheet</span>
          </div>
        </button>
      </div>

      {/* Testing Mode Bypass (Development Only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <svg className="icon-small text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm text-yellow-800">
                <strong>Testing Mode:</strong> Simulate sheet selection without real Google Sheets API
              </span>
            </div>
            <button
              onClick={() => {
                const testSheetId = 'test-sheet-' + Date.now();
                setSelectedSheetId(testSheetId);
                setError('');
                onDataChange({
                  mode: 'select',
                  selectedSheetId: testSheetId,
                  sheetUrl: 'https://docs.google.com/spreadsheets/d/test',
                  sheetName: 'Test Sheet - DrSync',
                  existingSheetHasData: false,
                  createNewSheet: false,
                });
              }}
              className="px-4 py-2 bg-yellow-600 text-white text-sm font-medium rounded-lg hover:bg-yellow-700 transition-colors"
            >
              🧪 Skip (Use Test Sheet)
            </button>
          </div>
        </div>
      )}

      {/* Select Existing Sheet Mode */}
      {mode === 'select' && (
        <div className="space-y-4">
          {/* Search */}
          <div>
            <input
              type="text"
              placeholder="Search sheets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Sheets List */}
          {loading ? (
            <div className="text-center py-8">
              <svg className="animate-spin h-8 w-8 text-blue-600 mx-auto" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-sm text-gray-600 mt-2">Loading sheets...</p>
            </div>
          ) : filteredSheets.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-gray-600">No sheets found. Try creating a new one.</p>
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto space-y-2 border border-gray-200 rounded-lg p-3">
              {filteredSheets.map((sheet) => (
                <button
                  key={sheet.id}
                  onClick={() => handleSelectSheet(sheet.id)}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                    selectedSheetId === sheet.id
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{sheet.name}</h4>
                      {sheet.url && (
                        <a
                          href={sheet.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Open in Google Sheets ↗
                        </a>
                      )}
                    </div>
                    {selectedSheetId === sheet.id && (
                      <svg className="icon text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          <button
            onClick={fetchSheets}
            className="w-full py-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            ↻ Refresh Sheet List
          </button>
        </div>
      )}

      {/* Create New Sheet Mode */}
      {mode === 'create' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sheet Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={newSheetName}
              onChange={(e) => setNewSheetName(e.target.value)}
              placeholder="DrSync Appointments"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              This will create a new Google Sheet in your Drive
            </p>
          </div>

          <button
            onClick={handleCreateSheet}
            disabled={!newSheetName.trim() || creating}
            className="w-full py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {creating ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin icon-small mr-2" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating Sheet...
              </span>
            ) : (
              'Create Sheet'
            )}
          </button>

          {selectedSheetId && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start">
                <svg className="icon text-green-600 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h4 className="text-sm font-medium text-green-900">Sheet Created Successfully!</h4>
                  <p className="text-sm text-green-800 mt-1">
                    Your new sheet "{newSheetName}" has been created.
                  </p>
                </div>
              </div>
            </div>
          )}
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

      {/* Info */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
        <p className="text-xs text-gray-600">
          <strong>Note:</strong> The selected sheet will be used to store all your appointment,
          patient, and provider data. You can always access and modify this data directly in Google Sheets.
        </p>
      </div>
    </div>
  );
}
