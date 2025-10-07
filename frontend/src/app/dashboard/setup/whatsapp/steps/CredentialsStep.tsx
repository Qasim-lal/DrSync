'use client';

import React, { useState, useEffect } from 'react';
import { WizardStepProps } from '../../../../../components/wizard/WizardContainer';

export function CredentialsStep({ data, onDataChange, onValidationChange }: WizardStepProps) {
  const [appId, setAppId] = useState(data.appId || '');
  const [appSecret, setAppSecret] = useState(data.appSecret || '');
  const [accessToken, setAccessToken] = useState(data.accessToken || '');
  const [phoneNumberId, setPhoneNumberId] = useState(data.phoneNumberId || '');
  const [validating, setValidating] = useState(false);
  const [testing, setTesting] = useState(false);
  const [validated, setValidated] = useState(data.credentialsValidated || false);
  const [validationError, setValidationError] = useState('');
  const [validationDetails, setValidationDetails] = useState<any>(data.validationDetails || null);
  const [showSecrets, setShowSecrets] = useState({appSecret: false, accessToken: false});

  // Validate credentials via API
  const handleValidateCredentials = async () => {
    if (!appId || !appSecret || !accessToken || !phoneNumberId) {
      setValidationError('All fields are required for validation');
      return;
    }

    setValidating(true);
    setValidationError('');
    setValidated(false);

    try {
      const response = await fetch('/api/configuration/whatsapp/validate-credentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          appId,
          appSecret,
          accessToken,
          phoneNumberId
        }),
      });

      const result = await response.json();

      if (result.success && result.data.details?.valid) {
        setValidated(true);
        setValidationDetails(result.data.details);
      } else {
        setValidated(false);
        setValidationError(result.data.errors?.[0] || 'Credential validation failed');
      }
    } catch (err: any) {
      setValidated(false);
      setValidationError('Error validating credentials: ' + err.message);
    } finally {
      setValidating(false);
    }
  };

  // Test connection to WhatsApp API
  const handleTestConnection = async () => {
    setTesting(true);
    setValidationError('');

    try {
      const response = await fetch('/api/configuration/whatsapp/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          appId,
          appSecret,
          accessToken,
          phoneNumberId
        }),
      });

      const result = await response.json();

      if (result.success) {
        setValidated(true);
        setValidationDetails({ ...validationDetails, connectionTested: true });
      } else {
        setValidationError(result.data.errors?.[0] || 'Connection test failed');
      }
    } catch (err: any) {
      setValidationError('Error testing connection: ' + err.message);
    } finally {
      setTesting(false);
    }
  };

  useEffect(() => {
    onDataChange({ 
      appId, 
      appSecret, 
      accessToken, 
      phoneNumberId,
      credentialsValidated: validated,
      validationDetails
    });
  }, [appId, appSecret, accessToken, phoneNumberId, validated, validationDetails, onDataChange]);

  useEffect(() => {
    const errors = [];
    const warnings = [];
    
    // Required field validations
    if (!appId) errors.push('App ID is required');
    if (!appSecret) errors.push('App Secret is required');
    if (!accessToken) errors.push('Access Token is required');
    if (!phoneNumberId) errors.push('Phone Number ID is required');
    
    // Format validations (only if fields have values)
    if (appId && !/^\d+$/.test(appId)) {
      errors.push('App ID must contain only numbers');
    }
    
    if (accessToken && !accessToken.startsWith('EAAG')) {
      warnings.push('Access Token should typically start with "EAAG"');
    }
    
    if (phoneNumberId && !/^\d+$/.test(phoneNumberId)) {
      errors.push('Phone Number ID must contain only numbers');
    }

    // Validation status
    if (appId && appSecret && accessToken && phoneNumberId && !validated) {
      warnings.push('Please validate your credentials with WhatsApp API');
    }
    
    onValidationChange({
      isValid: errors.length === 0 && validated,
      errors,
      warnings
    });
  }, [appId, appSecret, accessToken, phoneNumberId, validated, onValidationChange]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-lg font-medium text-blue-900">WhatsApp Business API Credentials</h3>
        <p className="text-sm text-blue-800 mt-2">
          Enter your WhatsApp Business API credentials. You can find these in your Facebook Developer Portal.
        </p>
      </div>

      {/* Instructions */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Where to find your credentials:</h4>
        <ul className="text-xs text-gray-600 space-y-1">
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span><strong>App ID & App Secret:</strong> Facebook Developer Portal → Your App → Basic Settings</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span><strong>Access Token:</strong> Developer Portal → WhatsApp → Configuration → Temporary Access Token</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span><strong>Phone Number ID:</strong> Developer Portal → WhatsApp → Configuration → Phone Number ID</span>
          </li>
        </ul>
      </div>
      
      {/* Credentials Form */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              App ID <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={appId}
              onChange={(e) => setAppId(e.target.value.trim())}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., 123456789012345"
              required
            />
            <p className="text-xs text-gray-500 mt-1">Numeric ID from Facebook Developer Portal</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              App Secret <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              value={appSecret}
              onChange={(e) => setAppSecret(e.target.value.trim())}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter App Secret"
              required
            />
            <p className="text-xs text-gray-500 mt-1">Keep this secret secure</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Access Token <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value.trim())}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="EAAG..."
              required
            />
            <p className="text-xs text-gray-500 mt-1">Usually starts with "EAAG"</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number ID <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={phoneNumberId}
              onChange={(e) => setPhoneNumberId(e.target.value.trim())}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., 987654321098765"
              required
            />
            <p className="text-xs text-gray-500 mt-1">Numeric ID for your WhatsApp Business number</p>
          </div>
        </div>
      </div>

      {/* Validation Actions */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleValidateCredentials}
          disabled={validating || !appId || !appSecret || !accessToken || !phoneNumberId}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          {validating ? 'Validating...' : 'Validate Credentials'}
        </button>
        <button
          type="button"
          onClick={handleTestConnection}
          disabled={testing || !validated}
          className="flex-1 px-4 py-2 bg-white text-blue-600 border border-blue-600 rounded-md hover:bg-blue-50 disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          {testing ? 'Testing...' : 'Test Connection'}
        </button>
      </div>

      {/* Validation Status Messages */}
      {validated && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-start">
            <svg className="icon-small text-green-600 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="font-medium text-green-900">Credentials Validated</p>
              {validationDetails && (
                <p className="text-sm text-green-700 mt-1">{validationDetails}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {validationError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start">
            <svg className="icon-small text-red-600 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="font-medium text-red-900">Validation Failed</p>
              <p className="text-sm text-red-700 mt-1">{validationError}</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Security Notice */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
        <div className="flex items-start">
          <svg className="icon-small text-yellow-600 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.498 0L4.316 15.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <div>
            <p className="text-sm text-yellow-800">
              <strong>Security:</strong> Your credentials are encrypted and stored securely. Never share these with unauthorized parties.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
