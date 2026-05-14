'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface FormData {
  organizationName: string;
  organizationType: 'CLINIC' | 'HOSPITAL' | 'PRACTICE';
  adminUser: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    confirmPassword: string;
    phone: string;
  };
  address: {
    street: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
  };
  phoneVerificationCode: string;
  acceptedTerms: boolean;
  marketingConsent: boolean;
}

interface ApiError {
  success: boolean;
  error: string;
  message: string;
  code: string;
  requiresPhoneVerification?: boolean;
}

interface RegistrationResponse {
  success: boolean;
  message: string;
  data?: {
    organization: any;
    adminUser: any;
    tokens: {
      accessToken: string;
      refreshToken: string;
    };
    trial: {
      trialEndDate: string;
      maxPatients: number;
      maxAppointments: number;
      daysRemaining: number;
    };
  };
  requiresPhoneVerification?: boolean;
  error?: string;
  code?: string;
}

export default function SignupPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPhoneVerification, setShowPhoneVerification] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    organizationName: '',
    organizationType: 'CLINIC',
    adminUser: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
      phone: '',
    },
    address: {
      street: '',
      city: '',
      state: '',
      country: 'Pakistan',
      postalCode: '',
    },
    phoneVerificationCode: '',
    acceptedTerms: false,
    marketingConsent: false,
  });

  const [availability, setAvailability] = useState({
    organizationNameAvailable: true,
    emailAvailable: true,
  });

  // Debounced availability check
  useEffect(() => {
    const checkAvailability = async () => {
      if (!formData.organizationName && !formData.adminUser.email) return;

      try {
        const params = new URLSearchParams();
        if (formData.organizationName.trim().length > 2) {
          params.append('organizationName', formData.organizationName);
        }
        if (formData.adminUser.email.includes('@')) {
          params.append('email', formData.adminUser.email);
        }

        if (params.toString()) {
        const response = await fetch(`/api/organizations/check-availability?${params}`);
          const result = await response.json();
          
          if (result.success) {
            setAvailability(prev => ({
              ...prev,
              ...result.data,
            }));
          }
        }
      } catch (error) {
        console.error('Availability check failed:', error);
      }
    };

    const timeout = setTimeout(checkAvailability, 500);
    return () => clearTimeout(timeout);
  }, [formData.organizationName, formData.adminUser.email]);

  const handleInputChange = (field: string, value: any) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent as keyof typeof prev] as object,
          [child]: value,
        },
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value,
      }));
    }
    setError('');
  };

  const validateStep = (step: number): string[] => {
    const errors: string[] = [];

    switch (step) {
      case 1:
        if (!formData.organizationName.trim()) {
          errors.push('Organization name is required');
        }
        if (!availability.organizationNameAvailable) {
          errors.push('Organization name is already taken');
        }
        break;

      case 2:
        if (!formData.adminUser.firstName.trim()) {
          errors.push('First name is required');
        }
        if (!formData.adminUser.lastName.trim()) {
          errors.push('Last name is required');
        }
        if (!formData.adminUser.email.trim()) {
          errors.push('Email is required');
        } else if (!/\S+@\S+\.\S+/.test(formData.adminUser.email)) {
          errors.push('Please enter a valid email address');
        }
        if (!availability.emailAvailable) {
          errors.push('Email address is already registered');
        }
        if (!formData.adminUser.password) {
          errors.push('Password is required');
        } else if (formData.adminUser.password.length < 8) {
          errors.push('Password must be at least 8 characters long');
        }
        if (formData.adminUser.password !== formData.adminUser.confirmPassword) {
          errors.push('Passwords do not match');
        }
        if (!formData.adminUser.phone.trim()) {
          errors.push('Phone number is required');
        }
        break;

      case 3:
        if (!formData.acceptedTerms) {
          errors.push('You must accept the terms and conditions');
        }
        break;
    }

    return errors;
  };

  const nextStep = () => {
    const errors = validateStep(currentStep);
    if (errors.length > 0) {
      setError(errors.join(', '));
      return;
    }
    setCurrentStep(prev => prev + 1);
    setError('');
    
    // Auto-focus first input of next step
    setTimeout(() => {
      const firstInput = document.querySelector('input');
      if (firstInput) {
        (firstInput as HTMLInputElement).focus();
      }
    }, 100);
  };

  const prevStep = () => {
    setCurrentStep(prev => prev - 1);
    setError('');
  };

  const handlePhoneVerification = async () => {
    if (!formData.phoneVerificationCode.trim()) {
      setError('Please enter the verification code');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/organizations/verify-phone', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: formData.adminUser.phone,
          verificationCode: formData.phoneVerificationCode,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setShowPhoneVerification(false);
        await submitRegistration();
      } else {
        setError(result.message || 'Phone verification failed');
      }
    } catch (error) {
      setError('Phone verification failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resendVerificationCode = async () => {
    try {
      const response = await fetch('/api/organizations/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: formData.adminUser.phone,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setSuccess('Verification code sent successfully');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(result.message || 'Failed to resend verification code');
      }
    } catch (error) {
      setError('Failed to resend verification code. Please try again.');
    }
  };

  const submitRegistration = async () => {
    setIsSubmitting(true);
    setError('');

    try {
      const registrationData = {
        organizationName: formData.organizationName,
        organizationType: formData.organizationType,
        adminUser: {
          firstName: formData.adminUser.firstName,
          lastName: formData.adminUser.lastName,
          email: formData.adminUser.email,
          password: formData.adminUser.password,
          phone: formData.adminUser.phone,
        },
        address: {
          street: formData.address.street || undefined,
          city: formData.address.city || undefined,
          state: formData.address.state || undefined,
          country: formData.address.country,
          postalCode: formData.address.postalCode || undefined,
        },
        phoneVerificationCode: formData.phoneVerificationCode,
        acceptedTerms: formData.acceptedTerms,
        marketingConsent: formData.marketingConsent,
      };

      const response = await fetch('/api/organizations/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(registrationData),
      });

      const result: RegistrationResponse = await response.json();

      if (result.success && result.data) {
        // Store authentication tokens
        localStorage.setItem('token', result.data.tokens.accessToken);
        localStorage.setItem('refreshToken', result.data.tokens.refreshToken);
        
        // Store user data
        localStorage.setItem('user', JSON.stringify(result.data.adminUser));
        localStorage.setItem('organization', JSON.stringify(result.data.organization));
        
        // Success - redirect to dashboard
        setSuccess('Registration successful! Redirecting to dashboard...');
        setTimeout(() => {
          router.push('/dashboard');
        }, 2000);

      } else if (result.requiresPhoneVerification) {
        setShowPhoneVerification(true);
        // Mock: In development, show that verification code is "123456"
        if (process.env.NODE_ENV === 'development') {
          setSuccess('Development Mode: Use verification code "123456"');
        }
      } else {
        setError(result.message || result.error || 'Registration failed');
      }
    } catch (error) {
      setError('Registration failed. Please check your internet connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const errors = validateStep(currentStep);
    if (errors.length > 0) {
      setError(errors.join(', '));
      return;
    }

    await submitRegistration();
  };

  if (showPhoneVerification) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Verify Phone Number</h2>
            <p className="text-gray-600 mt-2">
              We've sent a verification code to {formData.adminUser.phone}
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4">
              {success}
            </div>
          )}

          <form onSubmit={(e) => { e.preventDefault(); handlePhoneVerification(); }}>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Verification Code
              </label>
              <input
                type="text"
                value={formData.phoneVerificationCode}
                onChange={(e) => handleInputChange('phoneVerificationCode', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-2xl tracking-widest"
                placeholder="123456"
                maxLength={6}
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-3 rounded-lg font-medium transition-colors mb-4"
            >
              {isSubmitting ? 'Verifying...' : 'Verify Phone Number'}
            </button>

            <button
              type="button"
              onClick={resendVerificationCode}
              className="w-full text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              Resend verification code
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Join DrSync
          </h1>
          <p className="text-gray-600">
            Start your 14-day free trial - no credit card required
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    currentStep >= step
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {step}
                </div>
                {step < 3 && (
                  <div
                    className={`w-16 h-1 mx-2 ${
                      currentStep > step ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-sm text-gray-600">
            <span>Organization</span>
            <span>Admin Details</span>
            <span>Confirm</span>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Step 1: Organization Info */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Organization Information
                </h2>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Organization Name *
                  </label>
                  <input
                    type="text"
                    value={formData.organizationName}
                    onChange={(e) => handleInputChange('organizationName', e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      !availability.organizationNameAvailable ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Dr. Smith's Clinic"
                  />
                  {!availability.organizationNameAvailable && (
                    <p className="text-red-600 text-sm mt-1">This name is already taken</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Organization Type
                  </label>
                  <select
                    value={formData.organizationType}
                    onChange={(e) => handleInputChange('organizationType', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="CLINIC">Clinic</option>
                    <option value="HOSPITAL">Hospital</option>
                    <option value="PRACTICE">Practice</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      City
                    </label>
                    <input
                      type="text"
                      value={formData.address.city}
                      onChange={(e) => handleInputChange('address.city', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Karachi"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      State/Province
                    </label>
                    <input
                      type="text"
                      value={formData.address.state}
                      onChange={(e) => handleInputChange('address.state', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Sindh"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Admin User Info */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Administrator Details
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      First Name *
                    </label>
                    <input
                      type="text"
                      value={formData.adminUser.firstName}
                      onChange={(e) => handleInputChange('adminUser.firstName', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="John"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      value={formData.adminUser.lastName}
                      onChange={(e) => handleInputChange('adminUser.lastName', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Smith"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    value={formData.adminUser.email}
                    onChange={(e) => handleInputChange('adminUser.email', e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      !availability.emailAvailable ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="john.smith@example.com"
                  />
                  {!availability.emailAvailable && (
                    <p className="text-red-600 text-sm mt-1">This email is already registered</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    value={formData.adminUser.phone}
                    onChange={(e) => handleInputChange('adminUser.phone', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="+92 300 1234567"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Password *
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={formData.adminUser.password}
                        onChange={(e) => handleInputChange('adminUser.password', e.target.value)}
                        className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showPassword ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Confirm Password *
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        value={formData.adminUser.confirmPassword}
                        onChange={(e) => handleInputChange('adminUser.confirmPassword', e.target.value)}
                        className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showConfirmPassword ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Confirmation */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Review & Confirm
                </h2>

                <div className="bg-gray-50 p-6 rounded-lg space-y-4">
                  <div>
                    <h3 className="font-medium text-gray-900">Organization</h3>
                    <p className="text-gray-600">{formData.organizationName}</p>
                    <p className="text-gray-600 capitalize">{formData.organizationType.toLowerCase()}</p>
                  </div>
                  
                  <div>
                    <h3 className="font-medium text-gray-900">Administrator</h3>
                    <p className="text-gray-600">
                      {formData.adminUser.firstName} {formData.adminUser.lastName}
                    </p>
                    <p className="text-gray-600">{formData.adminUser.email}</p>
                    <p className="text-gray-600">{formData.adminUser.phone}</p>
                  </div>
                  
                  <div>
                    <h3 className="font-medium text-gray-900">Trial Information</h3>
                    <p className="text-gray-600">• 14-day free trial</p>
                    <p className="text-gray-600">• Up to 25 patients</p>
                    <p className="text-gray-600">• Up to 50 appointments</p>
                    <p className="text-gray-600">• All premium features included</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      checked={formData.acceptedTerms}
                      onChange={(e) => handleInputChange('acceptedTerms', e.target.checked)}
                      className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-700">
                      I agree to the{' '}
                      <Link href="/terms" className="text-blue-600 hover:text-blue-700">
                        Terms of Service
                      </Link>{' '}
                      and{' '}
                      <Link href="/privacy" className="text-blue-600 hover:text-blue-700">
                        Privacy Policy
                      </Link>
                    </span>
                  </label>

                  <label className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      checked={formData.marketingConsent}
                      onChange={(e) => handleInputChange('marketingConsent', e.target.checked)}
                      className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-700">
                      Send me helpful emails about new features and best practices (optional)
                    </span>
                  </label>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8">
              <div>
                {currentStep > 1 && (
                  <button
                    type="button"
                    onClick={prevStep}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                  >
                    Previous
                  </button>
                )}
              </div>

              <div>
                {currentStep < 3 ? (
                  <button
                    type="button"
                    onClick={nextStep}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
                  >
                    Next
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg font-medium"
                  >
                    {isSubmitting ? 'Creating Account...' : 'Create Account'}
                  </button>
                )}
              </div>
            </div>
          </form>

          {/* Login Link */}
          <div className="mt-8 text-center">
            <p className="text-gray-600">
              Already have an account?{' '}
              <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}