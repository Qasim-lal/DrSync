'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

interface InvitationData {
  email: string;
  role: string;
  firstName: string;
  lastName: string;
  organization: {
    id: string;
    name: string;
    email: string;
  };
}

export default function AccountSetupPage() {
  const router = useRouter();
  const params = useParams();
  const token = params.token as string;

  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [tokenError, setTokenError] = useState('');
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    password: '',
    confirmPassword: '',
    phone: '',
  });

  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    message: '',
    color: '',
  });

  useEffect(() => {
    validateToken();
  }, [token]);

  useEffect(() => {
    if (formData.password) {
      checkPasswordStrength(formData.password);
    } else {
      setPasswordStrength({ score: 0, message: '', color: '' });
    }
  }, [formData.password]);

  const validateToken = async () => {
    try {
      const response = await fetch(`/api/invitations/validate/${token}`);
      const result = await response.json();

      if (!response.ok || !result.success) {
        setTokenError(result.data?.errors?.[0] || 'Invalid or expired invitation link');
        setLoading(false);
        return;
      }

      setInvitation(result.data);
      // Pre-fill firstName and lastName from invitation
      setFormData((prev) => ({
        ...prev,
        firstName: result.data.firstName || '',
        lastName: result.data.lastName || '',
      }));
      setLoading(false);
    } catch (err: any) {
      setTokenError('Failed to validate invitation. Please try again.');
      setLoading(false);
    }
  };

  const checkPasswordStrength = (password: string) => {
    let score = 0;
    let message = '';
    let color = '';

    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;

    if (score <= 2) {
      message = 'Weak password';
      color = 'text-red-600';
    } else if (score <= 4) {
      message = 'Fair password';
      color = 'text-yellow-600';
    } else {
      message = 'Strong password';
      color = 'text-green-600';
    }

    setPasswordStrength({ score, message, color });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      setError('First name and last name are required');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (passwordStrength.score < 3) {
      setError('Please use a stronger password with uppercase, lowercase, numbers, and special characters');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/invitations/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          password: formData.password,
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone || undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.data?.errors?.[0] || 'Failed to complete account setup');
      }

      // Show success and redirect to login
      alert('Account setup completed successfully! Please log in with your email and password.');
      router.push('/login');
    } catch (err: any) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin h-12 w-12 text-indigo-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-gray-600">Validating your invitation...</p>
        </div>
      </div>
    );
  }

  if (tokenError || !invitation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Invalid Invitation</h2>
          <p className="text-gray-600 mb-6">{tokenError}</p>
          <p className="text-sm text-gray-500 mb-6">
            The invitation link may have expired (7 days validity) or has already been used.
            Please contact your organization administrator for a new invitation.
          </p>
          <Link
            href="/"
            className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Go to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Complete Your Account</h1>
          <p className="text-gray-600">
            You've been invited to join <strong>{invitation.organization.name}</strong>
          </p>
        </div>

        {/* Account Setup Form */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Invitation Info */}
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-8">
            <h3 className="text-sm font-semibold text-indigo-900 mb-3">Your Account Details:</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-indigo-700 font-medium">Email:</span>
                <p className="text-indigo-900">{invitation.email}</p>
              </div>
              <div>
                <span className="text-indigo-700 font-medium">Role:</span>
                <p className="text-indigo-900">{invitation.role}</p>
              </div>
              <div className="col-span-2">
                <span className="text-indigo-700 font-medium">Organization:</span>
                <p className="text-indigo-900">{invitation.organization.name}</p>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-red-600 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            )}

            {/* Name Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  placeholder="Enter your first name"
                  required
                />
              </div>
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
                  placeholder="Enter your last name"
                  required
                />
              </div>
            </div>
            <p className="text-xs text-gray-500 -mt-3">
              Pre-filled from invitation. You can edit if needed.
            </p>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Create Password <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                id="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                placeholder="Enter a strong password"
                required
                minLength={8}
              />
              {formData.password && (
                <div className="mt-2">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className={`font-medium ${passwordStrength.color}`}>
                      {passwordStrength.message}
                    </span>
                    <span className="text-gray-500">{passwordStrength.score}/6</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        passwordStrength.score <= 2
                          ? 'bg-red-500'
                          : passwordStrength.score <= 4
                          ? 'bg-yellow-500'
                          : 'bg-green-500'
                      }`}
                      style={{ width: `${(passwordStrength.score / 6) * 100}%` }}
                    ></div>
                  </div>
                </div>
              )}
              <p className="text-xs text-gray-500 mt-2">
                Use at least 8 characters with uppercase, lowercase, numbers, and special characters
              </p>
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                id="confirmPassword"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                placeholder="Re-enter your password"
                required
                minLength={8}
              />
              {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                <p className="text-sm text-red-600 mt-1">Passwords do not match</p>
              )}
            </div>

            {/* Phone (Optional) */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number (Optional)
              </label>
              <input
                type="tel"
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                placeholder="+92 300 1234567"
              />
              <p className="text-xs text-gray-500 mt-1">
                Include your phone number for account recovery and notifications
              </p>
            </div>

            {/* Terms */}
            <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
              <p>
                By completing your account setup, you agree to the{' '}
                <Link href="/terms" className="text-indigo-600 hover:text-indigo-700 font-medium">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link href="/privacy" className="text-indigo-600 hover:text-indigo-700 font-medium">
                  Privacy Policy
                </Link>
                .
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting || formData.password !== formData.confirmPassword || passwordStrength.score < 3}
              className="w-full py-4 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 text-lg"
            >
              {submitting ? (
                <>
                  <svg className="animate-spin h-6 w-6" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating Account...
                </>
              ) : (
                <>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Complete Account Setup
                </>
              )}
            </button>
          </form>
        </div>

        {/* Help Text */}
        <div className="mt-6 text-center text-sm text-gray-600">
          <p>
            Need help?{' '}
            <Link href="/contact" className="text-indigo-600 hover:text-indigo-700 font-medium">
              Contact Support
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
