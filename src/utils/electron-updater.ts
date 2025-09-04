/**
 * Electron-Updater Integration Module
 * Provides a clean interface to electron-updater functionality
 */

export interface UpdateInfo {
  version: string;
  releaseDate?: string;
  releaseNotes?: string;
  files?: any[];
}

export interface DownloadProgress {
  percent: number;
  transferred: number;
  total: number;
  bytesPerSecond: number;
}

export interface VersionInfo {
  current: string;
  isDev: boolean;
}

export class ElectronUpdater {
  private updateInfo: UpdateInfo | null = null;
  private isChecking = false;
  private isDownloading = false;
  private isDownloaded = false;

  constructor() {
    this.setupEventListeners();
  }

  /**
   * Setup electron-updater event listeners
   */
  private setupEventListeners() {
    if (!window.electronAPI?.updater) return;

    const { updater } = window.electronAPI;

    updater.onUpdateChecking(() => {
      console.log('Checking for updates...');
      this.isChecking = true;
    });

    updater.onUpdateAvailable((info: UpdateInfo) => {
      console.log('Update available:', info);
      this.updateInfo = info;
      this.isChecking = false;
    });

    updater.onUpdateNotAvailable(() => {
      console.log('No updates available');
      this.isChecking = false;
      this.updateInfo = null;
    });

    updater.onUpdateError((error: string) => {
      console.error('Update error:', error);
      this.isChecking = false;
      this.isDownloading = false;
    });

    updater.onDownloadProgress((progress: DownloadProgress) => {
      console.log(`Download progress: ${progress.percent}%`);
      // Progress events are handled by components directly
    });

    updater.onUpdateDownloaded((info: UpdateInfo) => {
      console.log('Update downloaded:', info);
      this.isDownloading = false;
      this.isDownloaded = true;
    });
  }

  /**
   * Check for available updates
   */
  async checkForUpdates(): Promise<{ success: boolean; error?: string; updateInfo?: UpdateInfo }> {
    if (!window.electronAPI?.updater) {
      return { success: false, error: 'Updater not available' };
    }

    try {
      this.isChecking = true;
      const result = await window.electronAPI.updater.checkForUpdates();
      
      if (result.error) {
        this.isChecking = false;
        return { success: false, error: result.error };
      }

      // Ensure internal state is populated even if external listeners were reset
      if (result.updateInfo) {
        this.updateInfo = result.updateInfo;
      }
      return { success: true, updateInfo: result.updateInfo };
    } catch (error) {
      this.isChecking = false;
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Download available update
   */
  async downloadUpdate(): Promise<{ success: boolean; error?: string }> {
    if (!window.electronAPI?.updater) {
      return { success: false, error: 'Updater not available' };
    }

    if (!this.updateInfo) {
      return { success: false, error: 'No update available' };
    }

    try {
      this.isDownloading = true;
      const result = await window.electronAPI.updater.downloadUpdate();
      
      if (result.error) {
        this.isDownloading = false;
        return { success: false, error: result.error };
      }

      // In case renderer-level listeners were removed and we miss the
      // 'update-downloaded' event, mark state here on successful completion.
      this.isDownloading = false;
      this.isDownloaded = true;
      return { success: true };
    } catch (error) {
      this.isDownloading = false;
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Install downloaded update and restart application
   */
  async quitAndInstall(): Promise<{ success: boolean; error?: string; action?: string }> {
    if (!window.electronAPI?.updater) {
      return { success: false, error: 'Updater not available' };
    }

    if (!this.isDownloaded) {
      return { success: false, error: 'No update downloaded' };
    }

    try {
      const result = await window.electronAPI.updater.quitAndInstall();
      
      if (result.error) {
        return { success: false, error: result.error };
      }

      return { success: true, action: result.action };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Get current app version information
   */
  async getVersion(): Promise<VersionInfo | null> {
    if (!window.electronAPI?.updater) {
      return null;
    }

    try {
      return await window.electronAPI.updater.getVersion();
    } catch (error) {
      console.error('Failed to get version:', error);
      return null;
    }
  }

  /**
   * Set custom update server URL
   */
  async setFeedURL(feedUrl: string): Promise<{ success: boolean; error?: string }> {
    if (!window.electronAPI?.updater) {
      return { success: false, error: 'Updater not available' };
    }

    try {
      const result = await window.electronAPI.updater.setFeedURL(feedUrl);
      
      if (result.error) {
        return { success: false, error: result.error };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Get current update state
   */
  getState() {
    return {
      isChecking: this.isChecking,
      isDownloading: this.isDownloading,
      isDownloaded: this.isDownloaded,
      updateInfo: this.updateInfo
    };
  }

  /**
   * Clean up event listeners
   */
  cleanup() {
    if (window.electronAPI?.updater) {
      window.electronAPI.updater.removeAllListeners();
    }
  }
}

// Global instance
export const electronUpdater = new ElectronUpdater();

// Type definitions for global window object
declare global {
  interface Window {
    electronAPI?: {
      saveImage: (imageData: string, fileName: string) => Promise<any>;
      showInputDialog: (title: string, placeholder: string) => Promise<any>;
      isElectron: () => boolean;
      platform: string;
      updater: {
        checkForUpdates: () => Promise<{ success?: boolean; error?: string; updateInfo?: UpdateInfo }>;
        downloadUpdate: () => Promise<{ success?: boolean; error?: string }>;
        quitAndInstall: () => Promise<{ success?: boolean; error?: string; action?: string }>;
        getVersion: () => Promise<VersionInfo>;
        setFeedURL: (feedUrl: string) => Promise<{ success?: boolean; error?: string }>;
        onUpdateChecking: (callback: () => void) => void;
        onUpdateAvailable: (callback: (info: UpdateInfo) => void) => void;
        onUpdateNotAvailable: (callback: () => void) => void;
        onUpdateError: (callback: (error: string) => void) => void;
        onDownloadProgress: (callback: (progress: DownloadProgress) => void) => void;
        onUpdateDownloaded: (callback: (info: UpdateInfo) => void) => void;
        removeAllListeners: () => void;
      };
    };
  }
}
