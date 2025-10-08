'use client';

import React, { useState, useEffect } from 'react';
import { WizardStepProps } from '../../../../../components/wizard/WizardContainer';

export function PhoneNumberStep({ data, onDataChange, onValidationChange }: WizardStepProps) {
  const [phoneNumber, setPhoneNumber] = useState(data.phoneNumber || '');
  const [verificationCode, setVerificationCode] = useState(data.verificationCode || '');
  const [phoneRegistrationStatus, setPhoneRegistrationStatus] = useState(
    data.phoneRegistrationStatus || 'not-started'
  );
  const [isRegistering, setIsRegistering] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [codeResendCount, setCodeResendCount] = useState(0);

  useEffect(() => {
    onDataChange({
      phoneNumber,
      verificationCode,
      phoneRegistrationStatus,
      phoneNumberVerified: phoneRegistrationStatus === 'verified',
      phoneConfigured: phoneRegistrationStatus === 'verified'
    });
  }, [phoneNumber, verificationCode, phoneRegistrationStatus, onDataChange]);

  useEffect(() => {
    const errors = [];
    const warnings = [];
    
    // Required field validations
    if (!phoneNumber) {
      errors.push('Phone number is required');
    } else if (!/^\+\d{1,15}$/.test(phoneNumber)) {
      errors.push('Phone number must be in international format (e.g., +1234567890)');
    }
    
    if (phoneRegistrationStatus === 'pending' && !verificationCode) {
      errors.push('Verification code is required');
    }
    
    if (phoneRegistrationStatus === 'pending') {
      warnings.push('Please complete phone number verification to proceed');
    }
    
    onValidationChange({
      isValid: errors.length === 0 && phoneRegistrationStatus === 'verified',
      errors,
      warnings
    });
  }, [phoneNumber, verificationCode, phoneRegistrationStatus, onValidationChange]);
  
  const formatPhoneNumber = (value: string) => {
    // Remove all non-digits
    let cleaned = value.replace(/\D/g, '');
    
    // Add + if not present and has digits
    if (cleaned.length > 0 && !value.startsWith('+')) {
      cleaned = '+' + cleaned;
    } else if (value.startsWith('+')) {
      cleaned = '+' + cleaned;
    }
    
    return cleaned;
  };
  
  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhoneNumber(formatted);
  };
  
  const handleRegisterPhone = async () => {
    if (!phoneNumber || !/^\+\d{1,15}$/.test(phoneNumber)) {
      return;
    }
    
    setIsRegistering(true);
    
    try {
      // Simulate API call to register phone number
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // For demo purposes, we'll assume registration is successful
      setPhoneRegistrationStatus('pending');
      
      // Auto-send verification code
      await handleSendVerificationCode();
      
    } catch (error) {
      console.error('Phone registration failed:', error);
      alert('Phone number registration failed. Please try again.');
    } finally {
      setIsRegistering(false);
    }
  };
  
  const handleSendVerificationCode = async () => {
    setIsSendingCode(true);
    
    try {
      // Simulate API call to send verification code
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setCodeResendCount(prev => prev + 1);
      alert('Verification code sent to your WhatsApp Business number!');
      
    } catch (error) {
      console.error('Failed to send verification code:', error);
      alert('Failed to send verification code. Please try again.');
    } finally {
      setIsSendingCode(false);
    }
  };
  
  const handleVerifyCode = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      alert('Please enter a valid 6-digit verification code');
      return;
    }
    
    setIsVerifying(true);
    
    try {
      // Simulate API call to verify code
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Accept test code "123456" or any 6-digit code for demo purposes
      if (/^\d{6}$/.test(verificationCode)) {
        setPhoneRegistrationStatus('verified');
        if (verificationCode === '123456') {
          alert('Phone number verified successfully using test code!');
        } else {
          alert('Phone number verified successfully!');
        }
      } else {
        alert('Invalid verification code. Please try again.');
      }
      
    } catch (error) {
      console.error('Verification failed:', error);
      alert('Verification failed. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-lg font-medium text-blue-900">Phone Number Registration</h3>
        <p className="text-sm text-blue-800 mt-2">
          Register and verify your WhatsApp Business phone number to enable message receiving.
        </p>
      </div>

      {/* Instructions */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Registration Process:</h4>
        <ol className="text-xs text-gray-600 space-y-1 list-decimal list-inside">
          <li>Enter your WhatsApp Business phone number in international format</li>
          <li>Click "Register Phone Number" to initiate registration</li>
          <li>Check your WhatsApp for a verification code SMS</li>
          <li>Enter the 6-digit verification code to complete registration</li>
        </ol>
      </div>
      
      {/* Phone Number Input */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            WhatsApp Business Phone Number <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-2">
            <input
              type="tel"
              value={phoneNumber}
              onChange={handlePhoneNumberChange}
              disabled={phoneRegistrationStatus === 'verified'}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm disabled:bg-gray-100"
              placeholder="+1234567890"
              required
            />
            {phoneRegistrationStatus === 'not-started' && (
              <>
                <button
                  type="button"
                  onClick={handleRegisterPhone}
                  disabled={isRegistering || !phoneNumber || !/^\+\d{1,15}$/.test(phoneNumber)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isRegistering ? 'Registering...' : 'Register Phone'}
                </button>
                {/* Testing Mode - Skip Registration */}
                {process.env.NODE_ENV === 'development' && phoneNumber && (
                  <button
                    type="button"
                    onClick={() => {
                      setPhoneRegistrationStatus('verified');
                    }}
                    disabled={isRegistering}
                    className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Testing Mode: Skip phone verification"
                  >
                    🧪 Skip
                  </button>
                )}
              </>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1">Enter in international format (e.g., +1234567890)</p>
        </div>
        
        {/* Verification Code Input */}
        {phoneRegistrationStatus === 'pending' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Verification Code <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-center text-lg tracking-widest"
                placeholder="000000"
                maxLength={6}
                required
              />
              <button
                type="button"
                onClick={handleVerifyCode}
                disabled={isVerifying || !verificationCode || verificationCode.length !== 6}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isVerifying ? 'Verifying...' : 'Verify Code'}
              </button>
              <button
                type="button"
                onClick={handleSendVerificationCode}
                disabled={isSendingCode || codeResendCount >= 3}
                className="px-4 py-2 bg-gray-100 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSendingCode ? 'Sending...' : 'Resend Code'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setPhoneRegistrationStatus('verified');
                  alert('Phone verification skipped for testing purposes!');
                }}
                className="px-4 py-2 bg-purple-100 text-purple-700 border border-purple-300 rounded-md hover:bg-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
              >
                Skip for Testing
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Enter the 6-digit code sent to your WhatsApp Business number
              {codeResendCount > 0 && ` • Resent ${codeResendCount} time${codeResendCount > 1 ? 's' : ''}`}
            </p>
            
            {/* Demo Instructions */}
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mt-3">
              <div className="flex items-start">
                <svg className="icon-small text-purple-600 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-sm text-purple-800">
                    <strong>Testing Mode:</strong> Use test code <code className="bg-purple-100 px-1 rounded">123456</code> 
                    or click "Skip for Testing" to bypass verification during development.
                  </p>
                </div>
              </div>
            </div>
            
            {codeResendCount >= 3 && (
              <p className="text-xs text-red-600 mt-1">
                ⚠️ Maximum resend attempts reached. Please contact support if you need help.
              </p>
            )}
          </div>
        )}
        
        {/* Verified Status */}
        {phoneRegistrationStatus === 'verified' && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start">
              <svg className="icon-small text-green-600 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h4 className="text-sm font-medium text-green-900">
                  Phone Number Verified Successfully!
                </h4>
                <p className="text-sm text-green-800 mt-1">
                  Your WhatsApp Business number <strong>{phoneNumber}</strong> is now registered and verified.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Status Information */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
        <div className="flex items-start">
          <svg className="icon-small text-yellow-600 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-sm text-yellow-800">
              <strong>Important:</strong> This phone number will be used to receive appointment booking messages from patients. 
              Make sure it's the same number configured in your WhatsApp Business API credentials.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
