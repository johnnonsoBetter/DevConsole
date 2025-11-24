/**
 * Smart DataStore for Autofill Extension
 * Manages multiple datasets/personas with intelligent rotation
 * Prevents repetition by tracking usage per form
 */

import type { AutofillStats, Dataset, FormUsage, UsageMap } from './types';

export class DataStore {
  private datasets: Dataset[] = [];
  private usageMap: UsageMap = {};
  public initialized: boolean = false;

  constructor() {
    this.datasets = [];
    this.usageMap = {};
    this.initialized = false;
  }

  /**
   * Initialize the data store with default datasets
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Load from storage
      const data = await this.loadFromStorage();
      
      if (data.datasets && data.datasets.length > 0) {
        this.datasets = data.datasets;
        this.usageMap = data.usageMap || {};
      } else {
        // Initialize with default datasets
        this.datasets = this.getDefaultDatasets();
        this.usageMap = {};
        await this.saveToStorage();
      }

      // Prune old usage history on startup
      this.pruneUsageHistory();

      this.initialized = true;
      console.log('✅ DataStore initialized with', this.datasets.length, 'datasets');
    } catch (error) {
      console.error('❌ Failed to initialize DataStore:', error);
      // Fallback to defaults
      this.datasets = this.getDefaultDatasets();
      this.usageMap = {};
      this.initialized = true;
    }
  }

  /**
   * Get default datasets (personas)
   */
  private getDefaultDatasets(): Dataset[] {
    return [
      {
        id: 'john-doe-business',
        name: 'John Doe (Business)',
        category: 'business',
        data: {
          email: 'john.doe@techcorp.com',
          name: 'John Doe',
          firstName: 'John',
          lastName: 'Doe',
          phone: '+1 (555) 123-4567',
          address: '123 Main Street',
          city: 'New York',
          state: 'NY',
          zip: '10001',
          country: 'United States',
          company: 'Tech Corp',
          title: 'Software Engineer',
          website: 'https://johndoe.com',
          message: "I'm interested in learning more about this opportunity. Thank you for reaching out. I'd love to connect.",
          number: '10'
        }
      },
      {
        id: 'jane-smith-personal',
        name: 'Jane Smith (Personal)',
        category: 'personal',
        data: {
          email: 'jane.smith@email.com',
          name: 'Jane Smith',
          firstName: 'Jane',
          lastName: 'Smith',
          phone: '+1 (555) 987-6543',
          address: '456 Oak Avenue',
          city: 'San Francisco',
          state: 'CA',
          zip: '94102',
          country: 'United States',
          company: 'Innovation Labs',
          title: 'Product Manager',
          website: 'https://janesmith.io',
          message: "Could we schedule a time to discuss this further? I'm looking forward to hearing more details about this opportunity.",
          number: '5'
        }
      },
      {
        id: 'alex-johnson-testing',
        name: 'Alex Johnson (Testing)',
        category: 'testing',
        data: {
          email: 'alex.johnson@testmail.com',
          name: 'Alex Johnson',
          firstName: 'Alex',
          lastName: 'Johnson',
          phone: '+1 (555) 456-7890',
          address: '789 Pine Road',
          city: 'Austin',
          state: 'TX',
          zip: '78701',
          country: 'United States',
          company: 'Digital Solutions Inc.',
          title: 'UX Designer',
          website: 'https://alexjohnson.dev',
          message: "Thank you for the information. I'd appreciate any additional details you can share about next steps.",
          number: '99'
        }
      },
      {
        id: 'maria-garcia-creative',
        name: 'Maria Garcia (Creative)',
        category: 'creative',
        data: {
          email: 'maria.garcia@creative.studio',
          name: 'Maria Garcia',
          firstName: 'Maria',
          lastName: 'Garcia',
          phone: '+1 (555) 234-5678',
          address: '321 Elm Street',
          city: 'Seattle',
          state: 'WA',
          zip: '98101',
          country: 'United States',
          company: 'Creative Studios',
          title: 'Art Director',
          website: 'https://mariagarcia.design',
          message: "I'm excited about this opportunity and would love to contribute my creative expertise to your team.",
          number: '1'
        }
      },
      {
        id: 'robert-chen-tech',
        name: 'Robert Chen (Tech)',
        category: 'technology',
        data: {
          email: 'robert.chen@devworks.io',
          name: 'Robert Chen',
          firstName: 'Robert',
          lastName: 'Chen',
          phone: '+1 (555) 345-6789',
          address: '654 Tech Boulevard',
          city: 'Boston',
          state: 'MA',
          zip: '02101',
          country: 'United States',
          company: 'DevWorks',
          title: 'Senior Developer',
          website: 'https://robertchen.tech',
          message: "I have extensive experience in this area and would be happy to discuss how I can add value to your project.",
          number: '100'
        }
      }
    ];
  }

  /**
   * Generate a unique fingerprint for a form
   * Based on: domain + sorted field types + field count
   */
  generateFormFingerprint(inputs: Array<HTMLInputElement | HTMLTextAreaElement>): string {
    const domain = window.location.hostname;
    
    // Extract field types and names
    const fieldSignature = inputs
      .map(input => {
        const type = input instanceof HTMLInputElement ? (input.type || 'text') : 'textarea';
        const name = (input.name || input.id || '').toLowerCase();
        return `${type}:${name}`;
      })
      .sort()
      .join('|');
    
    const fingerprint = `${domain}::${fieldSignature}::${inputs.length}`;
    
    // Simple hash function (for consistent shorter keys)
    return this.hashString(fingerprint);
  }

  /**
   * Simple string hash function
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Select a dataset for a specific form
   * Intelligently avoids recently used datasets
   */
  selectDataset(formFingerprint: string): Dataset | null {
    if (this.datasets.length === 0) {
      console.warn('⚠️ No datasets available');
      return null;
    }

    // Get usage history for this form
    const formUsage: FormUsage = this.usageMap[formFingerprint] || {
      usedDatasets: [],
      lastFillTimestamp: 0,
      fillCount: 0
    };

    // Calculate time since last fill (in hours)
    const hoursSinceLastFill = (Date.now() - formUsage.lastFillTimestamp) / (1000 * 60 * 60);
    
    // Reset usage if it's been more than 24 hours
    if (hoursSinceLastFill > 24) {
      formUsage.usedDatasets = [];
      console.log('🔄 Usage history reset for form (24+ hours passed)');
    }

    // Get available datasets (not recently used)
    let availableDatasets = this.datasets.filter(
      dataset => !formUsage.usedDatasets.includes(dataset.id)
    );

    // If all datasets have been used, reset and use all
    if (availableDatasets.length === 0) {
      console.log('🔄 All datasets used, resetting pool for this form');
      availableDatasets = this.datasets;
      formUsage.usedDatasets = [];
    }

    // Randomly select from available datasets
    const selectedDataset = availableDatasets[
      Math.floor(Math.random() * availableDatasets.length)
    ];

    // Update usage tracking
    formUsage.usedDatasets.push(selectedDataset.id);
    formUsage.lastFillTimestamp = Date.now();
    formUsage.fillCount++;
    this.usageMap[formFingerprint] = formUsage;

    // Save to storage (async, non-blocking)
    this.saveToStorage().catch(err => 
      console.error('Failed to save usage:', err)
    );

    console.log(`✅ Selected dataset: ${selectedDataset.name}`);
    console.log(`📊 Usage stats: ${formUsage.usedDatasets.length}/${this.datasets.length} used, Fill count: ${formUsage.fillCount}`);

    return selectedDataset;
  }

  /**
   * Get data for a specific field type from selected dataset
   */
  getFieldData(dataset: Dataset, fieldType: string): string | null {
    if (!dataset || !dataset.data) return null;
    return dataset.data[fieldType] || null;
  }

  /**
   * Add a new dataset
   */
  async addDataset(dataset: Partial<Dataset>): Promise<Dataset> {
    // Validate dataset
    if (!dataset.name || !dataset.data) {
      throw new Error('Dataset must have name and data');
    }

    // Generate ID if not provided
    if (!dataset.id) {
      dataset.id = `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    // Set default category
    if (!dataset.category) {
      dataset.category = 'custom';
    }

    const newDataset = dataset as Dataset;
    this.datasets.push(newDataset);
    await this.saveToStorage();
    
    console.log('✅ Added new dataset:', newDataset.name);
    return newDataset;
  }

  /**
   * Update an existing dataset
   */
  async updateDataset(datasetId: string, updates: Partial<Dataset>): Promise<Dataset> {
    const index = this.datasets.findIndex(d => d.id === datasetId);
    if (index === -1) {
      throw new Error('Dataset not found');
    }

    this.datasets[index] = { ...this.datasets[index], ...updates };
    await this.saveToStorage();
    
    console.log('✅ Updated dataset:', datasetId);
    return this.datasets[index];
  }

  /**
   * Delete a dataset
   */
  async deleteDataset(datasetId: string): Promise<Dataset> {
    const index = this.datasets.findIndex(d => d.id === datasetId);
    if (index === -1) {
      throw new Error('Dataset not found');
    }

    // Don't allow deleting the last dataset
    if (this.datasets.length === 1) {
      throw new Error('Cannot delete the last dataset');
    }

    const deleted = this.datasets.splice(index, 1)[0];
    
    // Clean up usage map (remove this dataset from all histories)
    Object.keys(this.usageMap).forEach(formHash => {
      const usage = this.usageMap[formHash];
      usage.usedDatasets = usage.usedDatasets.filter(id => id !== datasetId);
    });

    await this.saveToStorage();
    
    console.log('✅ Deleted dataset:', deleted.name);
    return deleted;
  }

  /**
   * Get all datasets
   */
  getAllDatasets(): Dataset[] {
    return [...this.datasets];
  }

  /**
   * Get usage statistics
   */
  getUsageStats(): AutofillStats {
    const totalForms = Object.keys(this.usageMap).length;
    let totalFills = 0;
    
    Object.values(this.usageMap).forEach(usage => {
      totalFills += usage.fillCount;
    });

    return {
      totalDatasets: this.datasets.length,
      totalForms,
      totalFills,
      usageMap: this.usageMap
    };
  }

  /**
   * Clear usage history for all forms
   */
  async clearUsageHistory(): Promise<void> {
    this.usageMap = {};
    await this.saveToStorage();
    console.log('✅ Cleared all usage history');
  }

  /**
   * Prune usage history older than 30 days to save space
   */
  private async pruneUsageHistory(): Promise<void> {
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    let prunedCount = 0;

    const initialSize = Object.keys(this.usageMap).length;

    Object.keys(this.usageMap).forEach(key => {
      const usage = this.usageMap[key];
      if (now - usage.lastFillTimestamp > THIRTY_DAYS_MS) {
        delete this.usageMap[key];
        prunedCount++;
      }
    });

    if (prunedCount > 0) {
      console.log(`🧹 Pruned ${prunedCount} old usage records (from ${initialSize})`);
      await this.saveToStorage();
    }
  }

  /**
   * Load data from Chrome storage
   */
  private async loadFromStorage(): Promise<{ datasets: Dataset[]; usageMap: UsageMap }> {
    return new Promise((resolve) => {
      chrome.storage.local.get(['datasets', 'usageMap'], (result) => {
        resolve({
          datasets: result.datasets || [],
          usageMap: result.usageMap || {}
        });
      });
    });
  }

  /**
   * Save data to Chrome storage
   */
  private async saveToStorage(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      chrome.storage.local.set({
        datasets: this.datasets,
        usageMap: this.usageMap
      }, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Export datasets as JSON
   */
  exportDatasets(): string {
    return JSON.stringify({
      datasets: this.datasets,
      exportDate: new Date().toISOString(),
      version: '1.0'
    }, null, 2);
  }

  /**
   * Import datasets from JSON
   */
  async importDatasets(jsonString: string): Promise<Dataset[]> {
    try {
      const imported = JSON.parse(jsonString);
      
      if (!imported.datasets || !Array.isArray(imported.datasets)) {
        throw new Error('Invalid import format');
      }

      // Validate each dataset
      imported.datasets.forEach((dataset: any) => {
        if (!dataset.name || !dataset.data) {
          throw new Error('Invalid dataset format');
        }
      });

      this.datasets = imported.datasets;
      await this.saveToStorage();
      
      console.log('✅ Imported', this.datasets.length, 'datasets');
      return this.datasets;
    } catch (error) {
      console.error('❌ Failed to import datasets:', error);
      throw error;
    }
  }
}
