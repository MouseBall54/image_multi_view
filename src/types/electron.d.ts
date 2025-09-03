export interface ElectronAPI {
  saveImage: (imageData: string, fileName: string) => Promise<{
    success: boolean;
    path?: string;
    message: string;
  }>;
  showInputDialog: (title: string, placeholder: string) => Promise<{
    success: boolean;
    value: string | null;
  }>;
  isElectron: () => boolean;
  platform: string;
  updater?: {
    checkForUpdates: () => Promise<any>;
    downloadUpdate?: () => Promise<any>;
    quitAndInstall?: () => Promise<any>;
    getVersion?: () => Promise<any>;
    setFeedURL?: (feedUrl: string) => Promise<any>;
  };
  windowActions?: {
    quit: () => Promise<void> | void;
    toggleDevTools: () => Promise<void> | void;
    toggleFullscreen: () => Promise<void> | void;
  };
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
