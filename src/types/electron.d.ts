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
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};