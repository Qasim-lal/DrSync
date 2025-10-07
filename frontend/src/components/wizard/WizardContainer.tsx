'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { WizardProgress } from './WizardProgress';
import { WizardNavigation } from './WizardNavigation';

export interface WizardStep {
  id: string;
  title: string;
  description: string;
  component: React.ComponentType<WizardStepProps>;
  validation?: (data: any) => ValidationResult;
  isComplete: boolean;
  isOptional: boolean;
  canSkip?: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

export interface WizardStepProps {
  data: Record<string, any>;
  onDataChange: (data: Record<string, any>) => void;
  onValidationChange: (result: ValidationResult) => void;
  isActive: boolean;
  onNext?: () => void;
  onPrevious?: () => void;
}

export interface WizardConfig {
  steps: WizardStep[];
  currentStep: number;
  data: Record<string, any>;
  onComplete: (data: any) => Promise<void>;
  onError: (error: Error) => void;
  onStepChange?: (stepIndex: number) => void;
  allowStepJumping?: boolean;
  persistKey?: string;
}

interface WizardContainerProps {
  config: WizardConfig;
  className?: string;
  showProgress?: boolean;
  showNavigation?: boolean;
}

export function WizardContainer({
  config,
  className = '',
  showProgress = true,
  showNavigation = true
}: WizardContainerProps) {
  const [currentStep, setCurrentStep] = useState(config.currentStep || 0);
  const [wizardData, setWizardData] = useState(config.data || {});
  const [stepValidation, setStepValidation] = useState<Record<number, ValidationResult>>({});
  const [wizardSteps, setWizardSteps] = useState(config.steps); // Track step completion locally
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Persist state to localStorage if persistKey is provided
  const persistState = useCallback(() => {
    if (config.persistKey) {
      const state = {
        currentStep,
        data: wizardData,
        validation: stepValidation,
        timestamp: Date.now()
      };
      localStorage.setItem(`wizard_${config.persistKey}`, JSON.stringify(state));
    }
  }, [config.persistKey, currentStep, wizardData, stepValidation]);

  // Load persisted state on mount
  useEffect(() => {
    if (config.persistKey) {
      try {
        const saved = localStorage.getItem(`wizard_${config.persistKey}`);
        if (saved) {
          const state = JSON.parse(saved);
          // Only restore if the state is recent (within 24 hours)
          if (Date.now() - state.timestamp < 24 * 60 * 60 * 1000) {
            setCurrentStep(state.currentStep || 0);
            setWizardData(state.data || {});
            setStepValidation(state.validation || {});
          }
        }
      } catch (error) {
        console.warn('Failed to restore wizard state:', error);
      }
    }
  }, [config.persistKey]);

  // Persist state when it changes
  useEffect(() => {
    persistState();
  }, [persistState]);

  const currentStepData = wizardSteps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === wizardSteps.length - 1;

  const handleDataChange = useCallback((newData: Record<string, any>) => {
    setWizardData(prev => ({ ...prev, ...newData }));
  }, []);

  const handleValidationChange = useCallback((result: ValidationResult) => {
    setStepValidation(prev => ({ ...prev, [currentStep]: result }));
    
    // Update step completion status in our local state
    setWizardSteps(prev => {
      const updatedSteps = [...prev];
      updatedSteps[currentStep] = {
        ...updatedSteps[currentStep],
        isComplete: result.isValid
      };
      return updatedSteps;
    });
  }, [currentStep]);

  const canNavigateToStep = useCallback((stepIndex: number) => {
    if (!config.allowStepJumping) {
      return stepIndex <= currentStep + 1;
    }
    
    // Check if all previous steps are complete or optional
    for (let i = 0; i < stepIndex; i++) {
      const step = wizardSteps[i];
      const validation = stepValidation[i];
      
      if (!step.isOptional && (!validation || !validation.isValid)) {
        return false;
      }
    }
    
    return true;
  }, [config.allowStepJumping, wizardSteps, currentStep, stepValidation]);

  const handleNext = useCallback(async () => {
    if (isLoading) return;

    try {
      setError(null);
      setIsLoading(true);

      // Validate current step if validation function exists
      const validation = currentStepData.validation;
      if (validation) {
        const result = validation(wizardData);
        handleValidationChange(result);
        
        if (!result.isValid) {
          setError('Please fix the validation errors before proceeding.');
          return;
        }
      }

      if (isLastStep) {
        // Complete wizard
        await config.onComplete(wizardData);
        
        // Clear persisted state on successful completion
        if (config.persistKey) {
          localStorage.removeItem(`wizard_${config.persistKey}`);
        }
      } else {
        // Move to next step
        const nextStep = currentStep + 1;
        setCurrentStep(nextStep);
        config.onStepChange?.(nextStep);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
      setError(errorMessage);
      config.onError(error instanceof Error ? error : new Error(errorMessage));
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, currentStepData, wizardData, handleValidationChange, isLastStep, config, currentStep]);

  const handlePrevious = useCallback(() => {
    if (isFirstStep || isLoading) return;
    
    const prevStep = currentStep - 1;
    setCurrentStep(prevStep);
    config.onStepChange?.(prevStep);
    setError(null);
  }, [isFirstStep, isLoading, currentStep, config]);

  const handleStepClick = useCallback((stepIndex: number) => {
    if (isLoading || stepIndex === currentStep) return;
    
    if (canNavigateToStep(stepIndex)) {
      setCurrentStep(stepIndex);
      config.onStepChange?.(stepIndex);
      setError(null);
    }
  }, [isLoading, currentStep, canNavigateToStep, config]);

  const handleSkip = useCallback(() => {
    if (isLoading || !currentStepData.canSkip) return;
    
    if (isLastStep) {
      // If skipping the last step, complete the wizard
      config.onComplete(wizardData);
    } else {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      config.onStepChange?.(nextStep);
    }
    setError(null);
  }, [isLoading, currentStepData.canSkip, isLastStep, config, wizardData, currentStep]);

  const CurrentStepComponent = currentStepData?.component;

  if (!CurrentStepComponent) {
    return (
      <div className="wizard-container max-w-4xl mx-auto p-6">
        <div className="text-center py-8">
          <div className="text-red-600 text-lg font-medium">
            Invalid wizard step configuration
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`wizard-container max-w-4xl mx-auto ${className}`}>
      {/* Progress Indicator */}
      {showProgress && (
        <WizardProgress
          steps={wizardSteps}
          currentStep={currentStep}
          onStepClick={config.allowStepJumping ? handleStepClick : undefined}
          className="mb-8"
        />
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <svg className="icon-small text-red-600 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Step Header */}
      <div className="step-header mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {currentStepData.title}
            </h1>
            <p className="text-gray-600 mt-1">
              {currentStepData.description}
            </p>
          </div>
          <div className="text-sm text-gray-500">
            Step {currentStep + 1} of {wizardSteps.length}
          </div>
        </div>
      </div>

      {/* Step Content */}
      <div className="step-content mb-8">
        <CurrentStepComponent
          data={wizardData}
          onDataChange={handleDataChange}
          onValidationChange={handleValidationChange}
          isActive={true}
          onNext={!isLastStep ? handleNext : undefined}
          onPrevious={!isFirstStep ? handlePrevious : undefined}
        />
      </div>

      {/* Navigation */}
      {showNavigation && (
        <WizardNavigation
          isFirstStep={isFirstStep}
          isLastStep={isLastStep}
          canSkip={currentStepData.canSkip}
          isLoading={isLoading}
          onPrevious={handlePrevious}
          onNext={handleNext}
          onSkip={handleSkip}
          validation={stepValidation[currentStep]}
          className="mt-8"
        />
      )}
    </div>
  );
}