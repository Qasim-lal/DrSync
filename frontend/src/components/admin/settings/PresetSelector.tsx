/**
 * Preset Selector Component - TASK-040A Phase 2
 * 
 * Allows administrators to select between BUDGET, RECOMMENDED, and PREMIUM
 * notification presets. Shows current selection and brief descriptions.
 * 
 * @version 1.0
 * @date October 20, 2025
 */

'use client';

import { useState } from 'react';
import { CheckCircleIcon, SparklesIcon, BanknotesIcon, TrophyIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import notificationSettingsService from '@/services/notificationSettingsService';

interface PresetOption {
  id: 'BUDGET' | 'RECOMMENDED' | 'PREMIUM';
  name: string;
  description: string;
  features: string[];
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

const presetOptions: PresetOption[] = [
  {
    id: 'BUDGET',
    name: 'Budget',
    description: 'Essential notifications only - minimize costs',
    features: [
      'Appointment reminders only',
      'No follow-ups or wellness checks',
      'Lowest messaging costs',
    ],
    icon: BanknotesIcon,
    color: 'text-green-600 bg-green-50 border-green-200',
  },
  {
    id: 'RECOMMENDED',
    name: 'Recommended',
    description: 'Balanced approach for most clinics',
    features: [
      'Booking confirmations & reminders',
      'Rescheduling & cancellations',
      'Moderate messaging costs',
    ],
    icon: SparklesIcon,
    color: 'text-blue-600 bg-blue-50 border-blue-200',
  },
  {
    id: 'PREMIUM',
    name: 'Premium',
    description: 'Comprehensive patient communication',
    features: [
      'All confirmation & reminder types',
      'Pre/post appointment instructions',
      'Payment reminders & no-show follow-ups',
    ],
    icon: TrophyIcon,
    color: 'text-purple-600 bg-purple-50 border-purple-200',
  },
];

interface PresetSelectorProps {
  organizationId: string;
  currentPreset: 'BUDGET' | 'RECOMMENDED' | 'PREMIUM' | 'CUSTOM';
  onPresetChange?: (preset: 'BUDGET' | 'RECOMMENDED' | 'PREMIUM') => void;
}

export default function PresetSelector({
  organizationId,
  currentPreset,
  onPresetChange,
}: PresetSelectorProps) {
  const [selectedPreset, setSelectedPreset] = useState<'BUDGET' | 'RECOMMENDED' | 'PREMIUM' | null>(
    currentPreset !== 'CUSTOM' ? currentPreset : null
  );
  const [isApplying, setIsApplying] = useState(false);

  const handlePresetSelect = async (preset: 'BUDGET' | 'RECOMMENDED' | 'PREMIUM') => {
    if (preset === selectedPreset || isApplying) return;

    try {
      setIsApplying(true);
      await notificationSettingsService.applyPreset(organizationId, preset);
      
      setSelectedPreset(preset);
      toast.success(`${preset} preset applied successfully`);
      
      if (onPresetChange) {
        onPresetChange(preset);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to apply preset');
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium text-gray-900">Notification Presets</h3>
        <p className="mt-1 text-sm text-gray-500">
          Choose a preset configuration or customize your settings
          {currentPreset === 'CUSTOM' && (
            <span className="ml-1 text-blue-600 font-medium">(Currently customized)</span>
          )}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {presetOptions.map((option) => {
          const Icon = option.icon;
          const isSelected = selectedPreset === option.id;
          const isCurrent = currentPreset === option.id;

          return (
            <button
              key={option.id}
              onClick={() => handlePresetSelect(option.id)}
              disabled={isApplying}
              className={`
                relative flex flex-col p-4 border-2 rounded-lg text-left transition-all
                ${isSelected ? option.color : 'border-gray-200 hover:border-gray-300'}
                ${isApplying ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                ${isCurrent && !isApplying ? 'ring-2 ring-offset-2 ring-blue-500' : ''}
              `}
            >
              {/* Current indicator */}
              {isCurrent && (
                <div className="absolute top-2 right-2">
                  <CheckCircleIcon className="h-5 w-5 text-blue-600" />
                </div>
              )}

              {/* Icon */}
              <div className="flex items-center space-x-3 mb-3">
                <div className={`p-2 rounded-lg ${isSelected ? option.color : 'bg-gray-100'}`}>
                  <Icon className={`h-6 w-6 ${isSelected ? '' : 'text-gray-600'}`} />
                </div>
                <div>
                  <h4 className="text-base font-semibold text-gray-900">{option.name}</h4>
                </div>
              </div>

              {/* Description */}
              <p className="text-sm text-gray-600 mb-3">{option.description}</p>

              {/* Features */}
              <ul className="space-y-1">
                {option.features.map((feature, index) => (
                  <li key={index} className="flex items-start text-xs text-gray-500">
                    <span className="mr-1">•</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              {/* Loading indicator */}
              {isApplying && (
                <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 rounded-lg">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Help text */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-700">
          <strong>Tip:</strong> Start with the Recommended preset, then customize individual settings if needed.
          The cost calculator below will help you understand the financial impact of your choices.
        </p>
      </div>
    </div>
  );
}
