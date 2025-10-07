'use client';

// Updated: 2025-09-19 23:33

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { WizardContainer, WizardConfig, WizardStep } from '../../../../components/wizard/WizardContainer';
import Link from 'next/link';

// Import wizard step components (we'll create these next)
import { BusinessAccountStep } from './steps/BusinessAccountStep';
import { CredentialsStep } from './steps/CredentialsStep';
import { WebhookStep } from './steps/WebhookStep';
import { PhoneNumberStep } from './steps/PhoneNumberStep';
import { TestMessageStep } from './steps/TestMessageStep';
import { ValidationStep } from './steps/ValidationStep';

export default function WhatsAppSetupWizard() {
  const router = useRouter();
  const [isCompleting, setIsCompleting] = useState(false);

  // Define the wizard steps
  const wizardSteps: WizardStep[] = [
    {
      id: 'business-account',
      title: 'Business Account Verification',
      description: 'Verify your WhatsApp Business account status and permissions',
      component: BusinessAccountStep,
      isComplete: false,
      isOptional: false,
      canSkip: false
    },
    {
      id: 'api-credentials',
      title: 'API Credentials',
      description: 'Configure your WhatsApp Business API credentials',
      component: CredentialsStep,
      isComplete: false,
      isOptional: false,
      canSkip: false,
      validation: (data) => {
        const errors = [];
        
        if (!data.appId) errors.push('App ID is required');
        if (!data.appSecret) errors.push('App Secret is required');
        if (!data.accessToken) errors.push('Access Token is required');
        if (!data.phoneNumberId) errors.push('Phone Number ID is required');
        
        // Validate formats
        if (data.appId && !/^\d+$/.test(data.appId)) {
          errors.push('App ID must contain only numbers');
        }
        
        if (data.accessToken && !data.accessToken.startsWith('EAAG')) {
          errors.push('Access Token format appears to be invalid');
        }

        return {
          isValid: errors.length === 0,
          errors,
          warnings: []
        };
      }
    },
    {
      id: 'webhook-config',
      title: 'Webhook Configuration',
      description: 'Set up webhook URL for receiving WhatsApp messages',
      component: WebhookStep,
      isComplete: false,
      isOptional: false,
      canSkip: false,
      validation: (data) => {
        const errors = [];
        const warnings = [];
        
        if (!data.webhookUrl) {
          errors.push('Webhook URL is required');
        } else if (!/^https:\/\//.test(data.webhookUrl)) {
          errors.push('Webhook URL must use HTTPS');
        }
        
        if (!data.verifyToken) {
          errors.push('Verify Token is required');
        } else if (data.verifyToken.length < 10) {
          warnings.push('Verify Token should be at least 10 characters for security');
        }

        return {
          isValid: errors.length === 0,
          errors,
          warnings
        };
      }
    },
    {
      id: 'phone-number',
      title: 'Phone Number Registration',
      description: 'Register and verify your WhatsApp Business phone number',
      component: PhoneNumberStep,
      isComplete: false,
      isOptional: false,
      canSkip: false,
      validation: (data) => {
        const errors = [];
        
        if (!data.phoneNumber) {
          errors.push('Phone number is required');
        } else if (!/^\+\d{1,15}$/.test(data.phoneNumber)) {
          errors.push('Phone number must be in international format (e.g., +1234567890)');
        }
        
        if (!data.verificationCode && data.phoneRegistrationStatus === 'pending') {
          errors.push('Verification code is required');
        }

        return {
          isValid: errors.length === 0,
          errors,
          warnings: []
        };
      }
    },
    {
      id: 'test-messages',
      title: 'Test Messaging',
      description: 'Test WhatsApp message sending and receiving functionality',
      component: TestMessageStep,
      isComplete: false,
      isOptional: true,
      canSkip: true,
      validation: (data) => {
        const warnings = [];
        
        if (!data.testMessageSent) {
          warnings.push('We recommend sending a test message to ensure everything is working correctly');
        }
        
        if (!data.testMessageReceived) {
          warnings.push('Make sure you can receive messages from patients');
        }

        return {
          isValid: true,
          errors: [],
          warnings
        };
      }
    },
    {
      id: 'final-validation',
      title: 'Final Validation',
      description: 'Complete configuration validation and activation',
      component: ValidationStep,
      isComplete: false,
      isOptional: false,
      canSkip: false,
      validation: (data) => {
        const errors = [];
        
        // Check that all required configurations are complete
        const requiredFields = ['appId', 'appSecret', 'accessToken', 'phoneNumberId', 'webhookUrl', 'phoneNumber'];
        
        for (const field of requiredFields) {
          if (!data[field]) {
            errors.push(`${field} configuration is missing`);
          }
        }
        
        if (!data.webhookVerified) {
          errors.push('Webhook verification must be completed');
        }
        
        if (!data.phoneNumberVerified) {
          errors.push('Phone number verification must be completed');
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
      const response = await fetch('/api/configuration/whatsapp', {
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
      alert('WhatsApp configuration completed successfully! You can now receive patient appointments via WhatsApp.');
      
      // Redirect to Google Sheets setup or dashboard
      router.push('/dashboard/setup/google-sheets');
    } catch (error) {
      console.error('WhatsApp configuration error:', error);
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
    persistKey: 'whatsapp-setup' // For localStorage persistence
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
            <h1 className="text-3xl font-bold text-gray-900">WhatsApp Business Setup</h1>
            <p className="text-gray-600 mt-2">
              Configure your WhatsApp Business API to enable patient appointment booking via WhatsApp
            </p>
          </div>
          
          {/* Setup Guide Link */}
          <div className="text-right">
            <a 
              href="https://developers.facebook.com/docs/whatsapp/cloud-api/get-started" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700"
            >
              <svg className="icon-small mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Cloud API Setup Guide
            </a>
            <div className="text-xs text-gray-500 mt-1">
              Need help? Check the WhatsApp Cloud API documentation
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
                  <span>A verified WhatsApp Business Account</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>A Facebook Developer Account with WhatsApp Business API access</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Your App ID, App Secret, Access Token, and Phone Number ID</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Admin access to your clinic's WhatsApp Business account</span>
                </li>
              </ul>
              <p className="text-xs text-blue-700 mt-3">
                This setup wizard will guide you through each step with detailed instructions.
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
            <p className="text-gray-700">Completing WhatsApp configuration...</p>
          </div>
        </div>
      )}
    </div>
  );
}