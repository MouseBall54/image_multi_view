// Helper function to replace window.prompt() in Electron environment
export const getInputFromUser = async (message: string, defaultValue?: string): Promise<string | null> => {
  // Check if running in Electron
  if (window.electronAPI) {
    try {
      const result = await window.electronAPI.showInputDialog(message, defaultValue || '');
      return result.success ? result.value : null;
    } catch (error) {
      console.error('Error showing input dialog:', error);
      // Fallback to default value
      return defaultValue || null;
    }
  } else {
    // Fallback to window.prompt for web environment
    return window.prompt(message, defaultValue || '') || null;
  }
};