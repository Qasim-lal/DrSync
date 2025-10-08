'use client';

import React, { useState, useEffect } from 'react';
import { WizardStepProps } from '../../../../../components/wizard/WizardContainer';

export function BusinessAccountStep({
  data,
  onDataChange,
  onValidationChange,
  isActive
}: WizardStepProps) {
  const [hasBusinessAccount, setHasBusinessAccount] = useState(data.hasBusinessAccount || false);
  const [businessAccountId, setBusinessAccountId] = useState(data.businessAccountId || '');
  const [verificationStatus, setVerificationStatus] = useState<'pending' | 'verifying' | 'verified' | 'failed'>(data.verificationStatus || 'pending');
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [verificationDetails, setVerificationDetails] = useState<any>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Verify business account via API
  const handleVerifyAccount = async () => {
    if (!businessAccountId.trim()) {
      setError('Please enter your Business Account ID');
      return;
    }

    setVerifying(true);
    setError('');
    setVerificationStatus('verifying');

    try {
      const response = await fetch('/api/configuration/whatsapp/verify-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ businessAccountId }),
      });

      const result = await response.json();

      if (result.success && result.data.details?.verified) {
        setVerificationStatus('verified');
        setVerificationDetails(result.data.details);
        setHasBusinessAccount(true);
      } else {
        setVerificationStatus('failed');
        setError(result.data.errors?.[0] || 'Business account verification failed');
      }
    } catch (err: any) {
      setVerificationStatus('failed');
      setError('Error verifying business account: ' + err.message);
    } finally {
      setVerifying(false);
    }
  };

  // Poll verification status
  useEffect(() => {
    let pollInterval: NodeJS.Timeout;

    if (verificationStatus === 'verifying' && businessAccountId) {
      pollInterval = setInterval(async () => {
        try {
          const response = await fetch(
            `/api/configuration/whatsapp/verify-account/status?accountId=${businessAccountId}`,
            {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
              },
            }
          );

          const result = await response.json();

          if (result.success && result.data.details?.verified) {
            setVerificationStatus('verified');
            setVerificationDetails(result.data.details);
            setHasBusinessAccount(true);
            clearInterval(pollInterval);
          }
        } catch (err) {
          console.error('Polling error:', err);
        }
      }, 5000); // Poll every 5 seconds
    }

    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [verificationStatus, businessAccountId]);

  // Update parent data when local state changes
  useEffect(() => {
    onDataChange({
      hasBusinessAccount,
      businessAccountId,
      verificationStatus,
      verificationDetails,
      accountVerified: verificationStatus === 'verified'
    });
  }, [hasBusinessAccount, businessAccountId, verificationStatus, verificationDetails, onDataChange]);

  // Validate step data
  useEffect(() => {
    const errors = [];
    const warnings = [];
    
    if (!hasBusinessAccount) {
      errors.push('You must have a verified WhatsApp Business Account to continue');
    }
    
    if (hasBusinessAccount && !businessAccountId.trim()) {
      errors.push('Business Account ID is required');
    }

    if (businessAccountId && verificationStatus === 'pending') {
      warnings.push('Please verify your Business Account ID');
    }

    if (verificationStatus === 'failed') {
      errors.push('Business account verification failed');
    }

    // BUG FIX: Always call onValidationChange, even on initial mount
    // This ensures the Continue button is properly disabled when the page loads
    // Previously, validation was undefined on mount, making the button incorrectly enabled
    onValidationChange({
      isValid: errors.length === 0 && verificationStatus === 'verified',
      errors,
      warnings
    });
    
    // Mark as initialized after first validation
    if (!isInitialized) {
      setIsInitialized(true);
    }
  }, [hasBusinessAccount, businessAccountId, verificationStatus, onValidationChange, isInitialized]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h3 className="text-lg font-medium text-green-900">WhatsApp Business Account Verification</h3>
        <p className="text-sm text-green-800 mt-2">
          Verify your WhatsApp Business Account to begin configuration.
        </p>
      </div>

      {/* Step Content */}
      <div className="space-y-4">
        {/* Business Account Check */}
        <div>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={hasBusinessAccount}
              onChange={(e) => setHasBusinessAccount(e.target.checked)}
              disabled={verificationStatus === 'verified'}
              className="rounded border-gray-300 text-green-600 focus:ring-green-500 disabled:opacity-50"
            />
            <span className="ml-3 text-sm text-gray-700">
              I have a WhatsApp Business Account
            </span>
          </label>
        </div>

        {/* Business Account ID */}
        {hasBusinessAccount && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Business Account ID <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={businessAccountId}
                onChange={(e) => setBusinessAccountId(e.target.value)}
                disabled={verificationStatus === 'verified'}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100 font-mono text-sm"
                placeholder="Enter your Business Account ID"
              />
              {verificationStatus !== 'verified' && (
                <>
                  <button
                    type="button"
                    onClick={handleVerifyAccount}
                    disabled={verifying || !businessAccountId.trim()}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {verifying ? 'Verifying...' : 'Verify Account'}
                  </button>
                  {/* Testing Mode - Skip Verification */}
                  {process.env.NODE_ENV === 'development' && (
                    <button
                      type="button"
                      onClick={() => {
                        setVerificationStatus('verified');
                        setVerificationDetails({ businessName: 'Test Business', verified: true });
                        setError('');
                      }}
                      disabled={verifying}
                      className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Testing Mode: Skip verification"
                    >
                      🧪 Skip (Testing)
                    </button>
                  )}
                </>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Find this in Meta Business Manager → Business Settings → WhatsApp Accounts
            </p>
          </div>
        )}

        {/* Verification Status */}
        {verificationStatus === 'verifying' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <svg className="animate-spin icon-small text-blue-600 mt-0.5 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <div>
                <h4 className="text-sm font-medium text-blue-900">Verifying Account...</h4>
                <p className="text-sm text-blue-800 mt-1">
                  Checking your WhatsApp Business Account status with Meta.
                </p>
              </div>
            </div>
          </div>
        )}

        {verificationStatus === 'verified' && verificationDetails && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start">
              <svg className="icon-small text-green-600 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <h4 className="text-sm font-medium text-green-900">Account Verified Successfully!</h4>
                <p className="text-sm text-green-800 mt-1">
                  Your WhatsApp Business Account is verified and ready for configuration.
                </p>
                {verificationDetails.businessName && (
                  <p className="text-sm text-green-700 mt-2">
                    <strong>Business Name:</strong> {verificationDetails.businessName}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {verificationStatus === 'failed' && error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start">
              <svg className="icon-small text-red-600 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h4 className="text-sm font-medium text-red-900">Verification Failed</h4>
                <p className="text-sm text-red-800 mt-1">{error}</p>
                <button
                  type="button"
                  onClick={() => {
                    setVerificationStatus('pending');
                    setError('');
                  }}
                  className="text-sm text-red-700 hover:text-red-900 font-medium mt-2 underline"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Help Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">
          Need help finding your Business Account ID?
        </h4>
        <div className="text-sm text-blue-800 space-y-2">
          <p>1. Go to <a href="https://business.facebook.com/" target="_blank" rel="noopener noreferrer" className="underline font-medium">Meta Business Manager</a></p>
          <p>2. Navigate to Business Settings → Accounts → WhatsApp Accounts</p>
          <p>3. Your Business Account ID is displayed next to your business name</p>
          <p>4. Copy the ID and paste it in the field above</p>
        </div>
      </div>

      {/* Info */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
        <p className="text-xs text-gray-600">
          <strong>Note:</strong> Your WhatsApp Business Account must be verified by Meta before you can proceed. 
          If you don't have an account yet, visit the{' '}
          <a 
            href="https://developers.facebook.com/docs/whatsapp/cloud-api/get-started" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-blue-600 hover:underline"
          >
            WhatsApp Cloud API documentation
          </a>{' '}
          to get started.
        </p>
      </div>
    </div>
  );
}
