'use client';

import React, { useState, useEffect } from 'react';
import { WizardStepProps } from '../../../../../components/wizard/WizardContainer';

export function OAuthStep({ data, onDataChange, onValidationChange }: WizardStepProps) {
  const [authorizing, setAuthorizing] = useState(false);
  const [authorized, setAuthorized] = useState(data.googleAccessToken ? true : false);
  const [authorizedEmail, setAuthorizedEmail] = useState(data.authorizedEmail || '');
  const [error, setError] = useState('');
  const [authUrl, setAuthUrl] = useState('');

  // Fetch auth URL on mount
  useEffect(() => {
    if (!authorized) {
      fetchAuthUrl();
    }
  }, [authorized]);

  const fetchAuthUrl = async () => {
    try {
      const response = await fetch('/api/configuration/google-sheets/auth-url', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      const result = await response.json();
      if (result.success && result.data.authUrl) {
        setAuthUrl(result.data.authUrl);
      }
    } catch (err: any) {
      console.error('Failed to fetch auth URL:', err);
      setError('Failed to generate authorization URL');
    }
  };

  const handleAuthorize = () => {
    if (authUrl) {
      setAuthorizing(true);
      // Open OAuth flow in popup
      const width = 600;
      const height = 700;
      const left = (window.screen.width / 2) - (width / 2);
      const top = (window.screen.height / 2) - (height / 2);
      
      const popup = window.open(
        authUrl,
        'Google Authorization',
        `width=${width},height=${height},left=${left},top=${top}`
      );
      
      // Listen for OAuth callback
      const checkPopup = setInterval(() => {
        if (popup && popup.closed) {
          clearInterval(checkPopup);
          setAuthorizing(false);
          // Check if authorization was successful
          checkAuthStatus();
        }
      }, 1000);
    }
  };

  const checkAuthStatus = async () => {
    try {
      const response = await fetch('/api/configuration/google-sheets/validate', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      const result = await response.json();
      if (result.success && result.data.details?.configurations?.authorized) {
        setAuthorized(true);
        // Fetch the authorized email (mock for now, should come from API)
        setAuthorizedEmail('user@example.com');
        setError('');
      } else {
        setError('Authorization was not completed. Please try again.');
      }
    } catch (err: any) {
      console.error('Failed to check auth status:', err);
      setError('Failed to verify authorization');
    }
  };

  const handleTestMode = () => {
    // For testing purposes
    setAuthorized(true);
    setAuthorizedEmail('test@example.com');
    onDataChange({
      googleAccessToken: 'test_access_token',
      googleRefreshToken: 'test_refresh_token',
      authorizedEmail: 'test@example.com',
    });
  };

  // Update parent data
  useEffect(() => {
    if (authorized && authorizedEmail) {
      onDataChange({
        googleAccessToken: data.googleAccessToken || 'authorized',
        googleRefreshToken: data.googleRefreshToken || 'authorized',
        authorizedEmail,
      });
    }
  }, [authorized, authorizedEmail]);

  // Validation
  useEffect(() => {
    const errors = [];
    const warnings = [];
    
    if (!authorized) {
      errors.push('Google authorization is required');
    }
    
    if (authorized && !authorizedEmail) {
      errors.push('Authorized email is missing');
    }
    
    onValidationChange({
      isValid: errors.length === 0,
      errors,
      warnings,
    });
  }, [authorized, authorizedEmail, onValidationChange]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h3 className="text-lg font-medium text-green-900">Google Account Authorization</h3>
        <p className="text-sm text-green-800 mt-2">
          Authorize DrSync to access your Google Sheets for storing appointment data.
        </p>
      </div>

      {/* Authorization Status */}
      {!authorized ? (
        <div className="space-y-4">
          {/* Instructions */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2">What permissions will be requested:</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li className="flex items-start">
                <svg className="icon-small text-green-600 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>View and manage your Google Sheets</span>
              </li>
              <li className="flex items-start">
                <svg className="icon-small text-green-600 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Create new spreadsheets in your Google Drive</span>
              </li>
              <li className="flex items-start">
                <svg className="icon-small text-green-600 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>View your email address (for account identification)</span>
              </li>
            </ul>
          </div>

          {/* Authorize Button */}
          <div className="text-center">
            <button
              onClick={handleAuthorize}
              disabled={authorizing || !authUrl}
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {authorizing ? (
                <>
                  <svg className="animate-spin icon-small mr-2" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Waiting for authorization...
                </>
              ) : (
                <>
                  <svg className="icon-small mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Authorize with Google
                </>
              )}
            </button>
            
            {/* Test Mode Button (for development) */}
            {process.env.NODE_ENV === 'development' && (
              <button
                onClick={handleTestMode}
                className="ml-3 inline-flex items-center px-4 py-2 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 transition-colors"
              >
                Test Mode (Skip OAuth)
              </button>
            )}
          </div>

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
      ) : (
        <div className="space-y-4">
          {/* Success Message */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start">
              <svg className="icon-small text-green-600 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h4 className="text-sm font-medium text-green-900">Authorization Successful!</h4>
                <p className="text-sm text-green-800 mt-1">
                  Authorized as: <strong>{authorizedEmail}</strong>
                </p>
                <p className="text-sm text-green-700 mt-1">
                  You can now create or select Google Sheets for your appointment data.
                </p>
              </div>
            </div>
          </div>

          {/* Re-authorize option */}
          <div className="text-center">
            <button
              onClick={() => {
                setAuthorized(false);
                setAuthorizedEmail('');
                setError('');
              }}
              className="text-sm text-blue-600 hover:text-blue-700 underline"
            >
              Re-authorize with a different Google account
            </button>
          </div>
        </div>
      )}

      {/* Security Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="flex items-start">
          <svg className="icon-small text-blue-600 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-sm text-blue-800">
              <strong>Privacy & Security:</strong> DrSync will only access sheets you explicitly share. 
              Your Google account credentials are never stored by DrSync.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
