'use client';

import React from 'react';
import { WizardStep } from './WizardContainer';

interface WizardProgressProps {
  steps: WizardStep[];
  currentStep: number;
  onStepClick?: (stepIndex: number) => void;
  className?: string;
  showLabels?: boolean;
  showPercentage?: boolean;
}

export function WizardProgress({
  steps,
  currentStep,
  onStepClick,
  className = '',
  showLabels = true,
  showPercentage = true
}: WizardProgressProps) {
  const completedSteps = steps.filter(step => step.isComplete).length;
  const progressPercentage = Math.round((completedSteps / steps.length) * 100);

  const getStepStatus = (stepIndex: number) => {
    if (stepIndex < currentStep) {
      return steps[stepIndex].isComplete ? 'completed' : 'skipped';
    } else if (stepIndex === currentStep) {
      return 'current';
    } else {
      return 'upcoming';
    }
  };

  const getStepIcon = (stepIndex: number, status: string) => {
    switch (status) {
      case 'completed':
        return (
          <svg className="icon-small text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'skipped':
        return (
          <svg className="icon-small text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      case 'current':
        return (
          <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
        );
      default:
        return (
          <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
        );
    }
  };

  const getStepStyles = (stepIndex: number, status: string) => {
    const baseStyles = "flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-200";
    
    switch (status) {
      case 'completed':
        return `${baseStyles} bg-green-600 border-green-600 text-white`;
      case 'skipped':
        return `${baseStyles} bg-yellow-500 border-yellow-500 text-white`;
      case 'current':
        return `${baseStyles} bg-white border-blue-600 text-blue-600 ring-2 ring-blue-200`;
      default:
        return `${baseStyles} bg-white border-gray-300 text-gray-400`;
    }
  };

  const canClickStep = (stepIndex: number) => {
    return onStepClick && (stepIndex <= currentStep || steps[stepIndex].isComplete);
  };

  return (
    <div className={`wizard-progress ${className}`}>
      {/* Overall Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-700">Configuration Progress</h3>
          {showPercentage && (
            <span className="text-sm font-medium text-gray-700">{progressPercentage}% Complete</span>
          )}
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
      </div>

      {/* Step Indicators */}
      <div className="relative">
        {/* Progress Line */}
        <div className="absolute top-5 left-0 w-full h-0.5 bg-gray-200 -z-10">
          <div 
            className="h-full bg-blue-600 transition-all duration-500 ease-out"
            style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
          ></div>
        </div>

        {/* Steps */}
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const status = getStepStatus(index);
            const clickable = canClickStep(index);
            
            return (
              <div key={step.id} className="flex flex-col items-center max-w-xs">
                {/* Step Circle */}
                <button
                  type="button"
                  onClick={() => clickable ? onStepClick?.(index) : undefined}
                  disabled={!clickable}
                  className={`${getStepStyles(index, status)} ${
                    clickable ? 'cursor-pointer hover:scale-105' : 'cursor-default'
                  } ${!clickable ? 'opacity-60' : ''}`}
                  aria-label={`Step ${index + 1}: ${step.title}`}
                  title={clickable ? `Click to go to ${step.title}` : step.title}
                >
                  {getStepIcon(index, status)}
                </button>

                {/* Step Label */}
                {showLabels && (
                  <div className="mt-3 text-center">
                    <div className={`text-xs font-medium ${
                      status === 'current' ? 'text-blue-600' : 
                      status === 'completed' ? 'text-green-600' :
                      status === 'skipped' ? 'text-yellow-600' :
                      'text-gray-500'
                    }`}>
                      {step.title}
                    </div>
                    {step.isOptional && (
                      <div className="text-xs text-gray-400 mt-1">Optional</div>
                    )}
                  </div>
                )}

                {/* Step Status Indicators */}
                <div className="mt-1 flex items-center space-x-1">
                  {step.isComplete && (
                    <div className="status-indicator status-success">
                      <svg className="icon-small" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="ml-1">Complete</span>
                    </div>
                  )}
                  {step.canSkip && index === currentStep && (
                    <div className="status-indicator status-info">
                      <span>Skippable</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Current Step Details */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start">
          <div className="flex-shrink-0 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center mr-3">
            <span className="text-xs font-bold text-white">{currentStep + 1}</span>
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-medium text-blue-900">
              Current Step: {steps[currentStep]?.title}
            </h4>
            <p className="text-sm text-blue-700 mt-1">
              {steps[currentStep]?.description}
            </p>
            {steps[currentStep]?.isOptional && (
              <p className="text-xs text-blue-600 mt-2">
                ℹ️ This step is optional and can be skipped if needed.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="mt-4 grid grid-cols-3 gap-4 text-center">
        <div className="bg-white p-3 rounded-lg border">
          <div className="text-lg font-bold text-green-600">{completedSteps}</div>
          <div className="text-xs text-gray-600">Completed</div>
        </div>
        <div className="bg-white p-3 rounded-lg border">
          <div className="text-lg font-bold text-blue-600">{currentStep + 1}</div>
          <div className="text-xs text-gray-600">Current</div>
        </div>
        <div className="bg-white p-3 rounded-lg border">
          <div className="text-lg font-bold text-gray-600">{steps.length - currentStep - 1}</div>
          <div className="text-xs text-gray-600">Remaining</div>
        </div>
      </div>
    </div>
  );
}