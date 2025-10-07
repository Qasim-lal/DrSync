'use client';

import React, { useState, useEffect } from 'react';
import { WizardStepProps } from '../../../../../components/wizard/WizardContainer';

export function WebhookStep({ data, onDataChange, onValidationChange }: WizardStepProps) {
  const [webhookUrl, setWebhookUrl] = useState(data.webhookUrl || '');
  const [verifyToken, setVerifyToken] = useState(data.verifyToken || '');
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Auto-generate webhook URL on component mount if not already set
  useEffect(() => {
    if (!webhookUrl) {
      // Generate a unique webhook URL for this organization
      const generatedUrl = `https://yourdomain.com/api/webhooks/whatsapp/${generateUniqueId()}`;
      setWebhookUrl(generatedUrl);
    }
  }, [webhookUrl]);
  
  // Auto-generate verify token if not already set
  useEffect(() => {
    if (!verifyToken) {
      const generatedToken = generateSecureToken();
      setVerifyToken(generatedToken);
    }
  }, [verifyToken]);

  useEffect(() => {
    onDataChange({ 
      webhookUrl, 
      verifyToken,
      webhookConfigured: !!(webhookUrl && verifyToken)
    });
  }, [webhookUrl, verifyToken, onDataChange]);

  useEffect(() => {
    const errors = [];
    const warnings = [];
    
    // Required field validations
    if (!webhookUrl) {
      errors.push('Webhook URL is required');
    } else if (!/^https:\/\//.test(webhookUrl)) {
      errors.push('Webhook URL must use HTTPS');
    } else if (!isValidUrl(webhookUrl)) {
      errors.push('Please enter a valid webhook URL');
    }
    
    if (!verifyToken) {
      errors.push('Verify Token is required');
    } else if (verifyToken.length < 10) {
      warnings.push('Verify Token should be at least 10 characters for security');
    }
    
    onValidationChange({
      isValid: errors.length === 0,
      errors,
      warnings
    });
  }, [webhookUrl, verifyToken, onValidationChange]);
  
  // Helper function to generate unique ID
  const generateUniqueId = () => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  };
  
  // Helper function to generate secure token
  const generateSecureToken = () => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 32; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  };
  
  // Helper function to validate URL
  const isValidUrl = (string) => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };
  
  const handleGenerateNewToken = () => {
    setIsGenerating(true);
    setTimeout(() => {
      const newToken = generateSecureToken();
      setVerifyToken(newToken);
      setIsGenerating(false);
    }, 500);
  };
  
  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text).then(() => {
      alert(`${type} copied to clipboard!`);
    }).catch(err => {
      console.error('Failed to copy: ', err);
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-lg font-medium text-blue-900">Webhook Configuration</h3>
        <p className="text-sm text-blue-800 mt-2">
          Configure the webhook URL that WhatsApp will use to send messages to your application.
        </p>
      </div>

      {/* Instructions */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-900 mb-2">How to configure in Facebook Developer Portal:</h4>
        <ol className="text-xs text-gray-600 space-y-1 list-decimal list-inside">
          <li>Go to Facebook Developer Portal → Your App → WhatsApp → Configuration</li>
          <li>Click "Edit" next to Webhook</li>
          <li>Enter the Callback URL and Verify Token below</li>
          <li>Subscribe to "messages" webhook field</li>
          <li>Click "Verify and Save"</li>
        </ol>
      </div>
      
      {/* Webhook Configuration Form */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Webhook URL (Callback URL) <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-2">
            <input
              type="url"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value.trim())}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
              placeholder="https://yourdomain.com/api/webhooks/whatsapp/..."
              required
            />
            <button
              type="button"
              onClick={() => copyToClipboard(webhookUrl, 'Webhook URL')}
              className="px-3 py-2 bg-gray-100 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              Copy
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">This URL will receive WhatsApp messages. Must use HTTPS.</p>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Verify Token <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={verifyToken}
              onChange={(e) => setVerifyToken(e.target.value.trim())}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
              placeholder="Enter or generate verify token"
              required
            />
            <button
              type="button"
              onClick={() => copyToClipboard(verifyToken, 'Verify Token')}
              className="px-3 py-2 bg-gray-100 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              Copy
            </button>
            <button
              type="button"
              onClick={handleGenerateNewToken}
              disabled={isGenerating}
              className="px-3 py-2 bg-blue-100 text-blue-700 border border-blue-300 rounded-md hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm disabled:opacity-50"
            >
              {isGenerating ? 'Generating...' : 'Generate New'}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">Secret token for webhook verification. Keep this secure.</p>
        </div>
      </div>
      
      {/* Webhook Testing */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-green-900 mb-2">Webhook Configuration Ready</h4>
        <p className="text-sm text-green-800">
          Copy the values above to your Facebook Developer Portal webhook configuration. 
          After saving in Facebook, WhatsApp will verify the webhook automatically.
        </p>
      </div>
      
      {/* Security Notice */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
        <div className="flex items-start">
          <svg className="icon-small text-yellow-600 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.498 0L4.316 15.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <div>
            <p className="text-sm text-yellow-800">
              <strong>Important:</strong> Your verify token is used for webhook security. 
              Don't share it publicly and ensure your webhook endpoint validates it correctly.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
