
import { useRef } from 'react';
import { pickDirectoryForIntake, filesFromInputForIntake } from '../utils/folder';
import type { FolderKey } from '../types';
import { useStore } from '../store';
import { ALL_FOLDER_KEYS, applyFolderIntake } from '../utils/folderIntake';

export function useFolderPickers() {
  const { folders, setFolder, updateFolderAlias: updateAliasInStore, addToast } = useStore();

  const inputRefs = ALL_FOLDER_KEYS.reduce((acc, key) => {
    acc[key] = useRef<HTMLInputElement>(null);
    return acc;
  }, {} as Record<FolderKey, React.RefObject<HTMLInputElement>>);

  const pick = async (key: FolderKey) => {
    try {
      const intake = await pickDirectoryForIntake();
      applyFolderIntake({
        candidate: intake,
        getFolders: () => useStore.getState().folders,
        setFolder,
        addToast,
        targetKey: key
      });
    } catch (error) {
      const err = error as Error;
      if (err.name === 'AbortError') {
        console.log("Directory picker was dismissed.");
      } else {
        console.error("Error picking directory:", error);
        // Fallback to input click if the picker fails for other reasons
        if (inputRefs[key].current) {
          inputRefs[key].current?.click();
        }
      }
    }
  };

  const onInput = (key: FolderKey, e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const intake = filesFromInputForIntake(e.target.files);
    if (!intake) return;
    applyFolderIntake({
      candidate: intake,
      getFolders: () => useStore.getState().folders,
      setFolder,
      addToast,
      targetKey: key
    });
  };

  const updateAlias = (key: FolderKey, newAlias: string) => {
    updateAliasInStore(key, newAlias);
  };

  return { ...folders, pick, inputRefs, onInput, updateAlias, allFolders: folders };
}
