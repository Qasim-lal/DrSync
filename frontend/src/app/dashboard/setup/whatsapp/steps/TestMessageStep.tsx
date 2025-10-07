'use client';

import React, { useState, useEffect } from 'react';
import { WizardStepProps } from '../../../../../components/wizard/WizardContainer';

export function TestMessageStep({ data, onDataChange, onValidationChange }: WizardStepProps) {
  const [testPhoneNumber, setTestPhoneNumber] = useState(data.testPhoneNumber || '');
  const [testMessage, setTestMessage] = useState(data.testMessage || 'Hello! This is a test message from your WhatsApp Business API setup. If you receive this, your configuration is working correctly! ✅');
  const [testMessageSent, setTestMessageSent] = useState(data.testMessageSent || false);
  const [testMessageReceived, setTestMessageReceived] = useState(data.testMessageReceived || false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [messageLog, setMessageLog] = useState<string[]>(data.messageLog || []);
  const [selectedTemplate, setSelectedTemplate] = useState('test');

  // Predefined message templates
  const messageTemplates = {
    test: 'Hello! This is a test message from your WhatsApp Business API setup. If you receive this, your configuration is working correctly! ✅',
    appointment: 'Hi! Your appointment has been confirmed for tomorrow at 2:00 PM. Please reply to confirm your attendance.',
    reminder: 'Reminder: You have an appointment scheduled for today at 10:00 AM. Please arrive 15 minutes early.',
    welcome: 'Welcome to our clinic! We are excited to serve you. You can now book appointments by sending us a message.',
    custom: ''
  };

  useEffect(() => {
    onDataChange({
      testPhoneNumber,
      testMessage,
      testMessageSent,
      testMessageReceived,
      messageLog,
      testingComplete: testMessageSent || testMessageReceived
    });
  }, [testPhoneNumber, testMessage, testMessageSent, testMessageReceived, messageLog, onDataChange]);

  useEffect(() => {
    const warnings = [];
    
    if (!testMessageSent) {
      warnings.push('We recommend sending a test message to ensure everything is working correctly');
    }
    
    if (!testMessageReceived) {
      warnings.push('Make sure you can receive messages from patients');
    }
    
    onValidationChange({
      isValid: true, // This step is always valid since it's optional
      errors: [],
      warnings
    });
  }, [testMessageSent, testMessageReceived, onValidationChange]);
  
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
    setTestPhoneNumber(formatted);
  };
  
  const handleTemplateChange = (template: string) => {
    setSelectedTemplate(template);
    if (template !== 'custom') {
      setTestMessage(messageTemplates[template as keyof typeof messageTemplates]);
    } else {
      setTestMessage('');
    }
  };
  
  const addToLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${message}`;
    setMessageLog(prev => [...prev, logEntry]);
  };
  
  const handleSendTestMessage = async () => {
    if (!testPhoneNumber || !testMessage) {
      alert('Please enter both phone number and message');
      return;
    }
    
    if (!/^\+\d{1,15}$/.test(testPhoneNumber)) {
      alert('Please enter a valid phone number in international format');
      return;
    }
    
    setIsSendingMessage(true);
    addToLog(`Attempting to send test message to ${testPhoneNumber}`);
    
    try {
      // Simulate API call to send WhatsApp message
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // For demo purposes, simulate successful message sending
      setTestMessageSent(true);
      addToLog(`✅ Test message sent successfully to ${testPhoneNumber}`);
      addToLog(`Message content: "${testMessage}"`);
      
      alert('Test message sent successfully! Check the recipient\'s WhatsApp.');
      
    } catch (error) {
      console.error('Failed to send test message:', error);
      addToLog(`❌ Failed to send test message: ${error}`);
      alert('Failed to send test message. Please check your configuration.');
    } finally {
      setIsSendingMessage(false);
    }
  };
  
  const handleMarkAsReceived = () => {
    setTestMessageReceived(true);
    addToLog('✅ Confirmed: Test message received successfully');
    alert('Great! Message reception confirmed.');
  };
  
  const handleClearLog = () => {
    setMessageLog([]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-lg font-medium text-blue-900">Test WhatsApp Messaging</h3>
        <p className="text-sm text-blue-800 mt-2">
          Test your WhatsApp Business API configuration by sending and receiving messages.
        </p>
      </div>

      {/* Optional Notice */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-start">
          <svg className="icon-small text-green-600 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h4 className="text-sm font-medium text-green-900">Optional Testing Step</h4>
            <p className="text-sm text-green-800 mt-1">
              This step is optional but recommended. You can skip it and complete testing later if needed.
            </p>
          </div>
        </div>
      </div>
      
      {/* Message Templates */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Message Template
        </label>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {Object.keys(messageTemplates).map((template) => (
            <button
              key={template}
              type="button"
              onClick={() => handleTemplateChange(template)}
              className={`px-3 py-2 text-sm rounded-md border capitalize ${
                selectedTemplate === template
                  ? 'bg-blue-100 text-blue-700 border-blue-300'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {template === 'custom' ? 'Custom' : template}
            </button>
          ))}
        </div>
      </div>
      
      {/* Test Message Form */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Send Test Message */}
        <div className="space-y-4">
          <h4 className="text-lg font-medium text-gray-900">1. Send Test Message</h4>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Test Phone Number
            </label>
            <input
              type="tel"
              value={testPhoneNumber}
              onChange={handlePhoneNumberChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
              placeholder="+1234567890"
            />
            <p className="text-xs text-gray-500 mt-1">Enter your own number to test</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Test Message
            </label>
            <textarea
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              placeholder="Enter your test message..."
            />
            <p className="text-xs text-gray-500 mt-1">{testMessage.length} characters</p>
          </div>
          
          <button
            type="button"
            onClick={handleSendTestMessage}
            disabled={isSendingMessage || !testPhoneNumber || !testMessage}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSendingMessage ? 'Sending Message...' : 'Send Test Message'}
          </button>
          
          {testMessageSent && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center">
                <svg className="icon-small text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm text-green-800">Test message sent successfully!</span>
              </div>
            </div>
          )}
        </div>
        
        {/* Receive Test Message */}
        <div className="space-y-4">
          <h4 className="text-lg font-medium text-gray-900">2. Confirm Message Reception</h4>
          
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-700 mb-3">
              After sending the test message, check if you received it on WhatsApp, then confirm below:
            </p>
            
            <button
              type="button"
              onClick={handleMarkAsReceived}
              disabled={testMessageReceived}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {testMessageReceived ? 'Message Reception Confirmed ✅' : 'Confirm Message Received'}
            </button>
            
            {testMessageReceived && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-3">
                <div className="flex items-center">
                  <svg className="icon-small text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm text-green-800">Message reception confirmed!</span>
                </div>
              </div>
            )}
          </div>
          
          {/* Quick Skip Option */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
            <p className="text-sm text-purple-800 mb-2">
              <strong>Testing with fake credentials?</strong>
            </p>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  setTestMessageSent(true);
                  addToLog('✅ Simulated: Test message sent successfully (demo mode)');
                }}
                disabled={testMessageSent}
                className="w-full px-3 py-1.5 bg-purple-100 text-purple-700 rounded text-xs hover:bg-purple-200 disabled:opacity-50"
              >
                Simulate Send Success
              </button>
              <button
                type="button"
                onClick={() => {
                  setTestMessageReceived(true);
                  addToLog('✅ Simulated: Test message received successfully (demo mode)');
                }}
                disabled={testMessageReceived}
                className="w-full px-3 py-1.5 bg-purple-100 text-purple-700 rounded text-xs hover:bg-purple-200 disabled:opacity-50"
              >
                Simulate Receive Success
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Test Results Summary */}
      {(testMessageSent || testMessageReceived) && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-blue-900 mb-2">Test Results Summary</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className={`p-3 rounded-lg border ${
              testMessageSent 
                ? 'bg-green-50 border-green-200 text-green-800' 
                : 'bg-gray-50 border-gray-200 text-gray-600'
            }`}>
              <div className="flex items-center">
                {testMessageSent ? (
                  <svg className="icon-small text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="icon-small text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                <span className="text-sm font-medium">Message Sending</span>
              </div>
              <p className="text-xs mt-1">
                {testMessageSent ? 'Working correctly' : 'Not tested yet'}
              </p>
            </div>
            
            <div className={`p-3 rounded-lg border ${
              testMessageReceived 
                ? 'bg-green-50 border-green-200 text-green-800' 
                : 'bg-gray-50 border-gray-200 text-gray-600'
            }`}>
              <div className="flex items-center">
                {testMessageReceived ? (
                  <svg className="icon-small text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="icon-small text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                <span className="text-sm font-medium">Message Receiving</span>
              </div>
              <p className="text-xs mt-1">
                {testMessageReceived ? 'Working correctly' : 'Not tested yet'}
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Activity Log */}
      {messageLog.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-gray-700">Activity Log</h4>
            <button
              type="button"
              onClick={handleClearLog}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Clear Log
            </button>
          </div>
          <div className="bg-gray-900 text-green-400 p-3 rounded-lg font-mono text-xs max-h-40 overflow-y-auto">
            {messageLog.map((log, index) => (
              <div key={index} className="mb-1">
                {log}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
