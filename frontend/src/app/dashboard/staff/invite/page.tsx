'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface InvitationForm {
  email: string;
  role: string;
  firstName: string;
  lastName: string;
}

const STAFF_ROLES = [
  { value: 'STAFF', label: 'Staff Member', description: 'General staff with basic access' },
  { value: 'DOCTOR', label: 'Doctor', description: 'Medical professional with patient access' },
  { value: 'NURSE', label: 'Nurse', description: 'Nursing staff with patient care access' },
  { value: 'RECEPTIONIST', label: 'Receptionist', description: 'Front desk with scheduling access' },
  { value: 'ADMIN', label: 'Administrator', description: 'Full administrative access' },
];

export default function InviteStaffPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<InvitationForm>({
    email: '',
    role: 'STAFF',
    firstName: '',
    lastName: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [success, setSuccess] = useState(false);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const email = e.target.value;
    setFormData({ ...formData, email });
    
    if (email && !validateEmail(email)) {
      setEmailError('Please enter a valid email address');
    } else {
      setEmailError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.email || !validateEmail(formData.email)) {
      setError('Please enter a valid email address');
      return;
    }

    if (!formData.firstName.trim()) {
      setError('Please enter staff member\'s first name');
      return;
    }

    if (!formData.lastName.trim()) {
      setError('Please enter staff member\'s last name');
      return;
    }

    if (!formData.role) {
      setError('Please select a role');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/invitations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.data?.errors?.[0] || 'Failed to send invitation');
      }

      setSuccess(true);
      
      // Redirect after 2 seconds
      setTimeout(() => {
        router.push('/dashboard/staff');
      }, 2000);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Invitation Sent!</h2>
          <p className="text-gray-600 mb-6">
            An invitation email has been sent to <strong>{formData.email}</strong>. 
            They will receive instructions to set up their account.
          </p>
          <div className="space-y-3">
            <Link
              href="/dashboard/staff"
              className="block w-full px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
            >
              View All Invitations
            </Link>
            <button
              onClick={() => {
                setSuccess(false);
                setFormData({
                  email: '',
                  role: 'STAFF',
                  firstName: '',
                  lastName: '',
                });
              }}
              className="block w-full px-6 py-3 bg-white text-gray-700 font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              Send Another Invitation
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard/staff"
            className="inline-flex items-center text-sm text-gray-600 hover:text-indigo-600 transition-colors mb-4"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Staff Management
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Invite Staff Member</h1>
          <p className="text-gray-600 mt-2">Send an invitation to add a new team member to your organization</p>
        </div>

        {/* Info Card */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">How it works:</p>
              <ol className="list-decimal ml-4 space-y-1">
                <li>Enter the staff member's email and select their role</li>
                <li>They'll receive an email with a secure setup link</li>
                <li>The link is valid for 7 days</li>
                <li>They can set their password and complete their profile</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Invitation Form */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-red-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            )}

            {/* Staff Member Details */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Staff Member Details</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* First Name */}
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                    placeholder="John"
                    required
                  />
                </div>

                {/* Last Name */}
                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                    placeholder="Doe"
                    required
                  />
                </div>
              </div>

              {/* Email */}
              <div className="mb-6">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  id="email"
                  value={formData.email}
                  onChange={handleEmailChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 transition-colors ${
                    emailError ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-indigo-500'
                  }`}
                  placeholder="john.doe@example.com"
                  required
                />
                {emailError && (
                  <p className="text-sm text-red-600 mt-1">{emailError}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  They'll receive an invitation email at this address
                </p>
              </div>

              {/* Role Selection */}
              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
                  Role <span className="text-red-500">*</span>
                </label>
                <div className="space-y-3">
                  {STAFF_ROLES.map((roleOption) => (
                    <label
                      key={roleOption.value}
                      className={`flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        formData.role === roleOption.value
                          ? 'border-indigo-600 bg-indigo-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="role"
                        value={roleOption.value}
                        checked={formData.role === roleOption.value}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                        className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                      />
                      <div className="ml-3 flex-1">
                        <span className={`text-sm font-medium ${
                          formData.role === roleOption.value ? 'text-indigo-900' : 'text-gray-900'
                        }`}>
                          {roleOption.label}
                        </span>
                        <p className={`text-sm ${
                          formData.role === roleOption.value ? 'text-indigo-700' : 'text-gray-600'
                        }`}>
                          {roleOption.description}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-4 pt-6 border-t border-gray-200">
              <Link
                href="/dashboard/staff"
                className="px-6 py-3 text-gray-700 font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading || !!emailError}
                className="px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Sending Invitation...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Send Invitation
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
