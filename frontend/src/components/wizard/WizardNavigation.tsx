'use client';

import React from 'react';
import { ValidationResult } from './WizardContainer';

interface WizardNavigationProps {
  isFirstStep: boolean;
  isLastStep: boolean;
  canSkip?: boolean;
  isLoading: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onSkip?: () => void;
  validation?: ValidationResult;
  className?: string;
  customActions?: React.ReactNode;
  showValidationSummary?: boolean;
}

export function WizardNavigation({
  isFirstStep,
  isLastStep,
  canSkip = false,
  isLoading,
  onPrevious,
  onNext,
  onSkip,
  validation,
  className = '',
  customActions,
  showValidationSummary = true
}: WizardNavigationProps) {
  // BUG FIX: Validation state handling
  // When validation is undefined (initial mount), treat it as having errors to disable Continue.
  // When validation exists, check if it's valid.
  // This prevents users from clicking Continue before the step validates on mount.
  // Fixed: October 7, 2025
  const hasValidationErrors = !validation || !validation.isValid;
  const hasValidationWarnings = validation && validation.warnings && validation.warnings.length > 0;
  // BUG FIX: Only show error panel if there are actual error messages, not just isValid=false
  // This prevents empty error panels when fields are filled but not validated yet
  const showErrorSummary = validation && !validation.isValid && validation.errors && validation.errors.length > 0;

  const getNextButtonText = () => {
    if (isLoading) {
      return isLastStep ? 'Completing...' : 'Processing...';
    }
    return isLastStep ? 'Complete Configuration' : 'Continue';
  };

  const getNextButtonIcon = () => {
    if (isLoading) {
      return (
        <svg className="animate-spin icon-small text-white" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      );
    }

    return isLastStep ? (
      <svg className="icon-small text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ) : (
      <svg className="icon-small text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
      </svg>
    );
  };

  return (
    <div className={`wizard-navigation ${className}`}>
      {/* Validation Summary */}
      {showValidationSummary && (showErrorSummary || hasValidationWarnings) && (
        <div className="mb-6">
          {/* Validation Errors */}
          {showErrorSummary && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <div className="flex items-start">
                <svg className="icon-small text-red-600 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h3 className="text-sm font-medium text-red-800">
                    Please fix the following errors:
                  </h3>
                  <ul className="text-sm text-red-700 mt-2 space-y-1">
                    {validation!.errors.map((error, index) => (
                      <li key={index} className="flex items-start">
                        <span className="mr-2">•</span>
                        <span>{error}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Validation Warnings */}
          {hasValidationWarnings && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <div className="flex items-start">
                <svg className="icon-small text-yellow-600 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.664-.833-2.464 0L5.232 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div>
                  <h3 className="text-sm font-medium text-yellow-800">
                    Please review the following warnings:
                  </h3>
                  <ul className="text-sm text-yellow-700 mt-2 space-y-1">
                    {validation!.warnings!.map((warning, index) => (
                      <li key={index} className="flex items-start">
                        <span className="mr-2">•</span>
                        <span>{warning}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-yellow-600 mt-2">
                    You can continue despite these warnings, but we recommend addressing them if possible.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between p-6 bg-gray-50 border-t border-gray-200 rounded-b-lg">
        {/* Left Side - Previous Button */}
        <div className="flex items-center space-x-4">
          {!isFirstStep ? (
            <button
              type="button"
              onClick={onPrevious}
              disabled={isLoading}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              <svg className="icon-small text-gray-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
              </svg>
              Previous
            </button>
          ) : (
            <div></div> // Spacer for consistent layout
          )}
        </div>

        {/* Center - Custom Actions */}
        {customActions && (
          <div className="flex items-center space-x-2">
            {customActions}
          </div>
        )}

        {/* Right Side - Skip and Next Buttons */}
        <div className="flex items-center space-x-4">
          {/* Skip Button */}
          {canSkip && onSkip && (
            <button
              type="button"
              onClick={onSkip}
              disabled={isLoading}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              <svg className="icon-small text-gray-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 9l3 3m0 0l-3 3m3-3H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Skip This Step
            </button>
          )}

          {/* Next/Complete Button */}
          <button
            type="button"
            onClick={onNext}
            disabled={isLoading || hasValidationErrors}
            className={`inline-flex items-center px-6 py-2 border border-transparent rounded-lg text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 ${
              isLastStep 
                ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500' 
                : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
            } ${hasValidationErrors ? 'opacity-50' : ''}`}
          >
            <span className="mr-2">{getNextButtonText()}</span>
            {getNextButtonIcon()}
          </button>
        </div>
      </div>

      {/* Progress Indicator for Loading */}
      {isLoading && (
        <div className="mt-4">
          <div className="flex items-center justify-center text-sm text-gray-600">
            <svg className="animate-spin icon-small text-blue-600 mr-2" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Processing your request...</span>
          </div>
        </div>
      )}

      {/* Help Text */}
      <div className="mt-4 text-center">
        <p className="text-xs text-gray-500">
          {isFirstStep ? (
            "Click 'Continue' to proceed to the next step."
          ) : isLastStep ? (
            hasValidationErrors ? (
              "Please fix validation errors before completing the configuration."
            ) : (
              "Review your settings and click 'Complete Configuration' to finish setup."
            )
          ) : (
            "Use 'Previous' to go back or 'Continue' to proceed to the next step."
          )}
          {canSkip && " You can skip this step if it's not applicable to your setup."}
        </p>
      </div>

      {/* Keyboard Shortcuts Help */}
      <div className="mt-2 text-center">
        <p className="text-xs text-gray-400">
          💡 Tip: Use Tab to navigate, Enter to continue, or Escape to go back
        </p>
      </div>
    </div>
  );
}