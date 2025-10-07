'use client';

// Updated: 2025-09-19 23:33

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { WizardContainer, WizardConfig, WizardStep } from '../../../../components/wizard/WizardContainer';
import Link from 'next/link';

// Import wizard step components (we'll create these next)
import { OAuthStep } from './steps/OAuthStep';
import { SheetSelectionStep } from './steps/SheetSelectionStep';
import { StructureSetupStep } from './steps/StructureSetupStep';
import { PermissionsStep } from './steps/PermissionsStep';
import { TestOperationsStep } from './steps/TestOperationsStep';
import { SyncActivationStep } from './steps/SyncActivationStep';

export default function GoogleSheetsSetupWizard() {
  const router = useRouter();
  const [isCompleting, setIsCompleting] = useState(false);

  // Define the wizard steps
  const wizardSteps: WizardStep[] = [
    {
      id: 'oauth-authorization',
      title: 'Google Authorization',
      description: 'Connect your Google account and authorize access to Google Sheets',
      component: OAuthStep,
      isComplete: false,
      isOptional: false,
      canSkip: false,
      validation: (data) => {
        const errors = [];
        
        if (!data.googleAccessToken) {
          errors.push('Google authorization is required');
        }
        
        if (!data.googleRefreshToken) {
          errors.push('Google refresh token is missing');
        }
        
        if (!data.authorizedEmail) {
          errors.push('Authorized email is required');
        }

        return {
          isValid: errors.length === 0,
          errors,
          warnings: []
        };
      }
    },
    {
      id: 'sheet-selection',
      title: 'Select or Create Sheet',
      description: 'Choose an existing Google Sheet or create a new one for your appointment data',
      component: SheetSelectionStep,
      isComplete: false,
      isOptional: false,
      canSkip: false,
      validation: (data) => {
        const errors = [];
        const warnings = [];
        
        if (!data.selectedSheetId && !data.createNewSheet) {
          errors.push('You must select an existing sheet or choose to create a new one');
        }
        
        if (data.selectedSheetId && data.existingSheetHasData) {
          warnings.push('The selected sheet contains existing data. Make sure this won\'t conflict with DrSync data structure.');
        }
        
        if (data.createNewSheet && !data.newSheetName) {
          errors.push('Sheet name is required for new sheet creation');
        }

        return {
          isValid: errors.length === 0,
          errors,
          warnings
        };
      }
    },
    {
      id: 'structure-setup',
      title: 'Configure Sheet Structure',
      description: 'Set up the optimal sheet structure for DrSync appointment data',
      component: StructureSetupStep,
      isComplete: false,
      isOptional: false,
      canSkip: false,
      validation: (data) => {
        const errors = [];
        const warnings = [];
        
        if (!data.structureType) {
          errors.push('Please select a sheet structure type');
        }
        
        if (!data.headersConfigured) {
          errors.push('Column headers must be configured');
        }
        
        if (data.customStructure && !data.customColumns) {
          errors.push('Custom columns configuration is required');
        }
        
        if (!data.sampleDataInserted) {
          warnings.push('We recommend inserting sample data to verify the structure works correctly');
        }

        return {
          isValid: errors.length === 0,
          errors,
          warnings
        };
      }
    },
    {
      id: 'permissions-verification',
      title: 'Verify Permissions',
      description: 'Ensure DrSync has the necessary permissions to read and write to your sheet',
      component: PermissionsStep,
      isComplete: false,
      isOptional: false,
      canSkip: false,
      validation: (data) => {
        const errors = [];
        
        if (!data.readPermissionVerified) {
          errors.push('Read permission verification failed');
        }
        
        if (!data.writePermissionVerified) {
          errors.push('Write permission verification failed');
        }
        
        if (!data.sharePermissionVerified) {
          errors.push('Sheet sharing permissions need to be configured');
        }

        return {
          isValid: errors.length === 0,
          errors,
          warnings: []
        };
      }
    },
    {
      id: 'test-operations',
      title: 'Test Data Operations',
      description: 'Test reading, writing, and updating data in your Google Sheet',
      component: TestOperationsStep,
      isComplete: false,
      isOptional: true,
      canSkip: true,
      validation: (data) => {
        const warnings = [];
        
        if (!data.testDataInserted) {
          warnings.push('We recommend testing data insertion to ensure everything works correctly');
        }
        
        if (!data.testDataRetrieved) {
          warnings.push('Test data retrieval to verify read operations work properly');
        }
        
        if (!data.testDataUpdated) {
          warnings.push('Test data updates to ensure modification operations work correctly');
        }
        
        if (!data.performanceTested && data.expectedDataVolume > 1000) {
          warnings.push('Consider testing performance with larger datasets');
        }

        return {
          isValid: true,
          errors: [],
          warnings
        };
      }
    },
    {
      id: 'sync-activation',
      title: 'Activate Sync Service',
      description: 'Configure and activate the Google Sheets synchronization service',
      component: SyncActivationStep,
      isComplete: false,
      isOptional: false,
      canSkip: false,
      validation: (data) => {
        const errors = [];
        
        if (!data.syncServiceConfigured) {
          errors.push('Sync service must be configured');
        }
        
        if (!data.initialSyncCompleted) {
          errors.push('Initial synchronization must be completed');
        }
        
        if (!data.syncScheduleSet) {
          errors.push('Sync schedule must be configured');
        }
        
        if (!data.conflictResolutionSet) {
          errors.push('Conflict resolution rules must be configured');
        }

        return {
          isValid: errors.length === 0,
          errors,
          warnings: []
        };
      }
    }
  ];

  // Handle wizard completion
  const handleWizardComplete = useCallback(async (data: any) => {
    try {
      setIsCompleting(true);

      // Save configuration to backend
      const response = await fetch('/api/configuration/google-sheets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          organizationId: data.organizationId || 'current', // This would come from auth context
        }),
      });

      if (!response.ok) {
        throw new Error(`Configuration failed: ${response.statusText}`);
      }

      const result = await response.json();

      // Show success message and redirect
      alert('Google Sheets configuration completed successfully! Your appointment data will now sync with your Google Sheet.');
      
      // Redirect to dashboard or next setup step
      router.push('/dashboard');
    } catch (error) {
      console.error('Google Sheets configuration error:', error);
      throw error; // Let the wizard handle the error display
    } finally {
      setIsCompleting(false);
    }
  }, [router]);

  // Handle wizard errors
  const handleWizardError = useCallback((error: Error) => {
    console.error('Wizard error:', error);
    alert(`Configuration error: ${error.message}`);
  }, []);

  // Handle step changes
  const handleStepChange = useCallback((stepIndex: number) => {
    console.log(`Navigated to step ${stepIndex + 1}: ${wizardSteps[stepIndex].title}`);
  }, [wizardSteps]);

  // Create wizard configuration
  const wizardConfig: WizardConfig = {
    steps: wizardSteps,
    currentStep: 0,
    data: {},
    onComplete: handleWizardComplete,
    onError: handleWizardError,
    onStepChange: handleStepChange,
    allowStepJumping: false, // For sequential setup process
    persistKey: 'google-sheets-setup' // For localStorage persistence
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link 
              href="/dashboard"
              className="inline-flex items-center text-sm text-gray-600 hover:text-blue-600 mb-4"
            >
              <svg className="icon-small mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Dashboard
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">Google Sheets Integration</h1>
            <p className="text-gray-600 mt-2">
              Connect your Google Sheets to store and manage your appointment data
            </p>
          </div>
          
          {/* Setup Guide Link */}
          <div className="text-right">
            <a 
              href="https://developers.google.com/sheets/api/guides/concepts" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700"
            >
              <svg className="icon-small mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              API Documentation
            </a>
            <div className="text-xs text-gray-500 mt-1">
              Need help? Check Google's documentation
            </div>
          </div>
        </div>

        {/* Benefits Card */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8">
          <div className="flex items-start">
            <svg className="icon-small text-green-600 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="text-lg font-medium text-green-900 mb-2">
                Why Google Sheets Integration?
              </h3>
              <ul className="text-sm text-green-800 space-y-2">
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span><strong>You own your data:</strong> All appointment data is stored in your own Google Sheet</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span><strong>Easy access:</strong> View and analyze your data using familiar Google Sheets interface</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span><strong>Real-time sync:</strong> Changes in DrSync are automatically reflected in your sheet</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span><strong>Backup & export:</strong> Your data is always accessible, even outside DrSync</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span><strong>Team collaboration:</strong> Share and collaborate on appointment data with your team</span>
                </li>
              </ul>
              <p className="text-xs text-green-700 mt-3">
                This integration ensures your appointment data remains under your complete control.
              </p>
            </div>
          </div>
        </div>

        {/* Prerequisites Card */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <div className="flex items-start">
            <svg className="icon-small text-blue-600 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="text-lg font-medium text-blue-900 mb-2">
                Before You Begin
              </h3>
              <ul className="text-sm text-blue-800 space-y-2">
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>A Google account with access to Google Sheets</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Admin permissions for your clinic's Google Workspace (if applicable)</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Decide whether to use an existing sheet or create a new one</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Consider who else in your team needs access to the sheet</span>
                </li>
              </ul>
              <p className="text-xs text-blue-700 mt-3">
                This wizard will handle the technical setup and guide you through each step.
              </p>
            </div>
          </div>
        </div>

        {/* Wizard Container */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <WizardContainer 
            config={wizardConfig}
            className="max-w-none" // Override default max-width for this specific wizard
            showProgress={true}
            showNavigation={true}
          />
        </div>

        {/* Footer Help */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600">
            Having trouble with setup? Contact our support team at{' '}
            <a href="mailto:support@drsync.com" className="text-blue-600 hover:text-blue-700">
              support@drsync.com
            </a>
          </p>
        </div>
      </div>

      {/* Loading Overlay */}
      {isCompleting && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 text-center">
            <svg className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-gray-700">Completing Google Sheets integration...</p>
          </div>
        </div>
      )}
    </div>
  );
}