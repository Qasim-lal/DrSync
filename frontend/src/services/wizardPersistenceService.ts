/**
 * Wizard Persistence Service
 * Handles saving and retrieving wizard progress from the backend database
 */

export interface WizardProgress {
  organizationId: string;
  wizardType: 'whatsapp' | 'google-sheets' | 'staff-management';
  currentStep: number;
  stepData: Record<string, any>;
  isCompleted: boolean;
  lastUpdated: Date;
}

export interface WizardProgressRequest {
  wizardType: string;
  currentStep: number;
  stepData: Record<string, any>;
  isCompleted?: boolean;
}

export interface WizardProgressResponse {
  success: boolean;
  data?: WizardProgress;
  error?: string;
}

class WizardPersistenceService {
  private baseUrl = '/api/wizard-progress';

  /**
   * Save wizard progress to database
   */
  async saveProgress(
    wizardType: WizardProgress['wizardType'], 
    currentStep: number, 
    stepData: Record<string, any>,
    isCompleted: boolean = false
  ): Promise<WizardProgressResponse> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wizardType,
          currentStep,
          stepData,
          isCompleted
        } as WizardProgressRequest),
      });

      if (!response.ok) {
        throw new Error(`Failed to save wizard progress: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        success: true,
        data: {
          ...data,
          lastUpdated: new Date(data.lastUpdated)
        }
      };
    } catch (error) {
      console.error('Error saving wizard progress:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Load wizard progress from database
   */
  async loadProgress(wizardType: WizardProgress['wizardType']): Promise<WizardProgressResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/${wizardType}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 404) {
        // No progress found - this is expected for new wizards
        return {
          success: true,
          data: undefined
        };
      }

      if (!response.ok) {
        throw new Error(`Failed to load wizard progress: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        success: true,
        data: {
          ...data,
          lastUpdated: new Date(data.lastUpdated)
        }
      };
    } catch (error) {
      console.error('Error loading wizard progress:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Delete wizard progress (e.g., when wizard is completed or reset)
   */
  async deleteProgress(wizardType: WizardProgress['wizardType']): Promise<WizardProgressResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/${wizardType}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok && response.status !== 404) {
        throw new Error(`Failed to delete wizard progress: ${response.statusText}`);
      }

      return {
        success: true
      };
    } catch (error) {
      console.error('Error deleting wizard progress:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Check if wizard is completed
   */
  async isWizardCompleted(wizardType: WizardProgress['wizardType']): Promise<boolean> {
    try {
      const result = await this.loadProgress(wizardType);
      return result.success && result.data?.isCompleted === true;
    } catch (error) {
      console.error('Error checking wizard completion:', error);
      return false;
    }
  }

  /**
   * Get all wizard completion status for organization
   */
  async getWizardStatuses(): Promise<Record<string, boolean>> {
    try {
      const response = await fetch(`${this.baseUrl}/status`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get wizard statuses: ${response.statusText}`);
      }

      const data = await response.json();
      return data.statuses || {};
    } catch (error) {
      console.error('Error getting wizard statuses:', error);
      return {};
    }
  }

  /**
   * Merge localStorage data with database data
   * Returns the most recent data based on timestamp
   */
  mergeWithLocalStorage(
    wizardType: string,
    databaseData?: WizardProgress,
    localStorageData?: any
  ): WizardProgress | null {
    if (!databaseData && !localStorageData) {
      return null;
    }

    // If only one source has data, use it
    if (!databaseData && localStorageData) {
      return {
        organizationId: 'current', // Will be set by backend
        wizardType: wizardType as WizardProgress['wizardType'],
        currentStep: localStorageData.currentStep || 0,
        stepData: localStorageData.data || {},
        isCompleted: false,
        lastUpdated: new Date(localStorageData.timestamp || Date.now())
      };
    }

    if (databaseData && !localStorageData) {
      return databaseData;
    }

    // Both sources have data - use the most recent
    const localTimestamp = new Date(localStorageData.timestamp || 0);
    const databaseTimestamp = new Date(databaseData!.lastUpdated);

    if (localTimestamp > databaseTimestamp) {
      // Local data is more recent
      return {
        organizationId: databaseData!.organizationId,
        wizardType: wizardType as WizardProgress['wizardType'],
        currentStep: localStorageData.currentStep || 0,
        stepData: { ...databaseData!.stepData, ...localStorageData.data },
        isCompleted: databaseData!.isCompleted,
        lastUpdated: localTimestamp
      };
    } else {
      // Database data is more recent
      return databaseData!;
    }
  }

  /**
   * Enhanced save with automatic localStorage sync
   */
  async saveProgressWithLocalSync(
    wizardType: WizardProgress['wizardType'], 
    currentStep: number, 
    stepData: Record<string, any>,
    isCompleted: boolean = false
  ): Promise<WizardProgressResponse> {
    // Save to database
    const result = await this.saveProgress(wizardType, currentStep, stepData, isCompleted);
    
    if (result.success) {
      // Also update localStorage for offline access
      const localData = {
        currentStep,
        data: stepData,
        timestamp: Date.now()
      };
      
      try {
        localStorage.setItem(`wizard_${wizardType}`, JSON.stringify(localData));
      } catch (error) {
        console.warn('Failed to save to localStorage:', error);
        // Don't fail the entire operation if localStorage fails
      }
    }
    
    return result;
  }

  /**
   * Enhanced load with automatic localStorage fallback
   */
  async loadProgressWithLocalFallback(wizardType: WizardProgress['wizardType']): Promise<WizardProgress | null> {
    // Try to load from database first
    const databaseResult = await this.loadProgress(wizardType);
    
    // Try to load from localStorage
    let localStorageData = null;
    try {
      const saved = localStorage.getItem(`wizard_${wizardType}`);
      if (saved) {
        localStorageData = JSON.parse(saved);
      }
    } catch (error) {
      console.warn('Failed to read from localStorage:', error);
    }

    // Merge the data sources
    const mergedData = this.mergeWithLocalStorage(
      wizardType,
      databaseResult.data,
      localStorageData
    );

    // If we have merged data that's different from database, save it back
    if (mergedData && databaseResult.success && (!databaseResult.data || 
        mergedData.lastUpdated > databaseResult.data.lastUpdated)) {
      // Async save without waiting
      this.saveProgress(wizardType, mergedData.currentStep, mergedData.stepData, mergedData.isCompleted);
    }

    return mergedData;
  }
}

// Export singleton instance
export const wizardPersistenceService = new WizardPersistenceService();