export interface ElectronAPI {
  saveImage: (imageData: string, fileName: string) => Promise<{
    success: boolean;
    path?: string;
    message: string;
  }>;
  isElectron: () => boolean;
  platform: string;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};