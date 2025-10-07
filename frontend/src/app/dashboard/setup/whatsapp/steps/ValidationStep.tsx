'use client';

import React, { useState, useEffect } from 'react';
import { WizardStepProps } from '../../../../../components/wizard/WizardContainer';

interface ValidationCheck {
  id: string;
  label: string;
  status: 'pending' | 'checking' | 'success' | 'error' | 'warning';
  message: string;
}

export function ValidationStep({ data, onDataChange, onValidationChange }: WizardStepProps) {
  const [isValidating, setIsValidating] = useState(false);
  const [validationComplete, setValidationComplete] = useState(data.validationComplete || false);
  const [allChecksValid, setAllChecksValid] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [activationSuccess, setActivationSuccess] = useState(data.activationSuccess || false);
  const [activationError, setActivationError] = useState('');
  
  const [validationChecks, setValidationChecks] = useState<ValidationCheck[]>([
    { id: 'credentials', label: 'API Credentials', status: 'pending', message: 'Not checked yet' },
    { id: 'webhook', label: 'Webhook Configuration', status: 'pending', message: 'Not checked yet' },
    { id: 'phone', label: 'Phone Number', status: 'pending', message: 'Not checked yet' },
    { id: 'message', label: 'Message Capability', status: 'pending', message: 'Not checked yet' },
  ]);

  // Update check status
  const updateCheck = (id: string, status: ValidationCheck['status'], message: string) => {
    setValidationChecks(prev => prev.map(check => 
      check.id === id ? { ...check, status, message } : check
    ));
  };

  // Run validation checks
  const runValidation = async () => {
    setIsValidating(true);
    setValidationComplete(false);
    setActivationError('');
    
    // Reset all checks to checking
    setValidationChecks(prev => prev.map(check => ({ 
      ...check, 
      status: 'checking', 
      message: 'Validating...' 
    })));

    try {
      // Check 1: API Credentials
      if (data.credentialsValidated && data.appId && data.appSecret && data.accessToken && data.phoneNumberId) {
        updateCheck('credentials', 'success', 'Credentials validated successfully');
      } else {
        updateCheck('credentials', 'error', 'Credentials not validated or missing');
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));

      // Check 2: Webhook Configuration
      if (data.webhookUrl && data.verifyToken) {
        if (data.webhookTested) {
          updateCheck('webhook', 'success', 'Webhook configured and tested');
        } else {
          updateCheck('webhook', 'warning', 'Webhook configured but not tested');
        }
      } else {
        updateCheck('webhook', 'error', 'Webhook URL or verify token missing');
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));

      // Check 3: Phone Number
      if (data.phoneNumber) {
        if (data.phoneVerified) {
          updateCheck('phone', 'success', `Phone number ${data.phoneNumber} verified`);
        } else {
          updateCheck('phone', 'warning', `Phone number ${data.phoneNumber} registered but not verified`);
        }
      } else {
        updateCheck('phone', 'error', 'Phone number not registered');
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));

      // Check 4: Message Capability
      if (data.testMessageSent || data.testingComplete) {
        updateCheck('message', 'success', 'Test message sent successfully');
      } else {
        updateCheck('message', 'warning', 'Message testing not completed (optional)');
      }

      setValidationComplete(true);
      
    } catch (error: any) {
      console.error('Validation error:', error);
      updateCheck('credentials', 'error', 'Validation failed: ' + error.message);
    } finally {
      setIsValidating(false);
    }
  };

  // Check if all critical validations passed
  useEffect(() => {
    const criticalChecks = validationChecks.filter(c => c.id !== 'message');
    const allValid = criticalChecks.every(check => check.status === 'success' || check.status === 'warning');
    setAllChecksValid(allValid);
  }, [validationChecks]);

  // Activate WhatsApp configuration
  const handleActivate = async () => {
    if (!allChecksValid) {
      setActivationError('Please fix all critical validation errors before activating');
      return;
    }

    if (!window.confirm('Are you sure you want to activate WhatsApp Business API integration? This will make the service live for your organization.')) {
      return;
    }

    setIsActivating(true);
    setActivationError('');

    try {
      // Save final configuration
      const response = await fetch('/api/configuration/whatsapp/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          appId: data.appId,
          appSecret: data.appSecret,
          accessToken: data.accessToken,
          phoneNumberId: data.phoneNumberId,
          webhookUrl: data.webhookUrl,
          verifyToken: data.verifyToken,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setActivationSuccess(true);
        onDataChange({ 
          validationComplete: true,
          activationSuccess: true,
          activatedAt: new Date().toISOString()
        });
      } else {
        setActivationError(result.data?.errors?.[0] || result.message || 'Activation failed');
      }
    } catch (error: any) {
      console.error('Activation error:', error);
      setActivationError('Error activating configuration: ' + error.message);
    } finally {
      setIsActivating(false);
    }
  };

  // Auto-run validation on mount
  useEffect(() => {
    if (!validationComplete && !isValidating) {
      runValidation();
    }
  }, []);

  // Update wizard validation state
  useEffect(() => {
    const errors = [];
    const warnings = [];

    if (!allChecksValid && validationComplete) {
      errors.push('Some configuration checks failed');
    }

    if (!activationSuccess && validationComplete && allChecksValid) {
      warnings.push('Configuration validated but not yet activated');
    }

    onValidationChange({
      isValid: activationSuccess,
      errors,
      warnings
    });
  }, [allChecksValid, validationComplete, activationSuccess, onValidationChange]);

  const getStatusIcon = (status: ValidationCheck['status']) => {
    switch (status) {
      case 'success':
        return (
          <svg className="icon-small text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'error':
        return (
          <svg className="icon-small text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'warning':
        return (
          <svg className="icon-small text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      case 'checking':
        return (
          <svg className="icon-small text-blue-500 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        );
      default:
        return (
          <svg className="icon-small text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  const getStatusColor = (status: ValidationCheck['status']) => {
    switch (status) {
      case 'success': return 'bg-green-50 border-green-200';
      case 'error': return 'bg-red-50 border-red-200';
      case 'warning': return 'bg-yellow-50 border-yellow-200';
      case 'checking': return 'bg-blue-50 border-blue-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-lg font-medium text-blue-900">Final Validation & Activation</h3>
        <p className="text-sm text-blue-800 mt-2">
          We're checking your WhatsApp Business API configuration to ensure everything is set up correctly.
        </p>
      </div>

      {/* Validation Checks */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-900">Configuration Validation</h4>
        
        {validationChecks.map((check) => (
          <div
            key={check.id}
            className={`rounded-lg border p-4 transition-colors ${getStatusColor(check.status)}`}
          >
            <div className="flex items-start">
              <div className="flex-shrink-0 mr-3">
                {getStatusIcon(check.status)}
              </div>
              <div className="flex-1">
                <h5 className="text-sm font-medium text-gray-900">{check.label}</h5>
                <p className="text-sm text-gray-600 mt-1">{check.message}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Retry Button */}
      {validationComplete && !allChecksValid && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={runValidation}
            disabled={isValidating}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isValidating ? 'Re-validating...' : 'Retry Validation'}
          </button>
        </div>
      )}

      {/* Configuration Summary */}
      {validationComplete && allChecksValid && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start">
            <svg className="icon-small text-green-500 flex-shrink-0 mt-0.5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <h4 className="text-sm font-medium text-green-900">Configuration Validated Successfully!</h4>
              <p className="text-sm text-green-800 mt-1">
                All checks passed. Your WhatsApp Business API is ready to be activated.
              </p>
              
              {/* Configuration Details */}
              <div className="mt-3 text-xs text-green-800 space-y-1">
                <p>• App ID: {data.appId}</p>
                <p>• Phone Number ID: {data.phoneNumberId}</p>
                {data.phoneNumber && <p>• Phone: {data.phoneNumber}</p>}
                {data.webhookUrl && <p>• Webhook: {data.webhookUrl.substring(0, 50)}...</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Activation Error */}
      {activationError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <svg className="icon-small text-red-500 flex-shrink-0 mt-0.5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h4 className="text-sm font-medium text-red-900">Activation Failed</h4>
              <p className="text-sm text-red-800 mt-1">{activationError}</p>
            </div>
          </div>
        </div>
      )}

      {/* Activation Button */}
      {validationComplete && allChecksValid && !activationSuccess && (
        <div className="border-t pt-6">
          <div className="flex flex-col items-center space-y-4">
            <button
              type="button"
              onClick={handleActivate}
              disabled={isActivating}
              className="px-6 py-3 bg-green-600 text-white text-base font-medium rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {isActivating ? (
                <span className="flex items-center">
                  <svg className="icon-small animate-spin -ml-1 mr-3 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Activating...
                </span>
              ) : (
                '🚀 Activate WhatsApp Business API'
              )}
            </button>
            <p className="text-xs text-gray-500 text-center max-w-md">
              By activating, you confirm that all configurations are correct and you're ready to start using WhatsApp Business API for patient communications.
            </p>
          </div>
        </div>
      )}

      {/* Activation Success */}
      {activationSuccess && (
        <div className="bg-green-50 border-2 border-green-300 rounded-lg p-6">
          <div className="text-center">
            <svg className="mx-auto text-green-500" style={{width: '64px', height: '64px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="mt-4 text-xl font-bold text-green-900">WhatsApp Business API Activated! 🎉</h3>
            <p className="mt-2 text-sm text-green-800">
              Your WhatsApp Business API integration is now live and ready to use.
            </p>
            <p className="mt-3 text-sm text-green-700">
              You can now start receiving appointment bookings and communicating with patients via WhatsApp.
            </p>
            <div className="mt-6">
              <a
                href="/dashboard"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                Go to Dashboard
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Help Section */}
      {!activationSuccess && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Need Help?</h4>
          <ul className="text-xs text-gray-600 space-y-1">
            <li>• If validation fails, go back to previous steps and verify your configuration</li>
            <li>• Ensure your WhatsApp Business API credentials are active and not expired</li>
            <li>• Check that your webhook URL is accessible from the internet</li>
            <li>• For support, contact your system administrator or WhatsApp Business team</li>
          </ul>
        </div>
      )}
    </div>
  );
}
