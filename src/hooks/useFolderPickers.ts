
import { useRef } from 'react';
import { pickDirectory, filesFromInput } from '../utils/folder';
import type { FolderKey } from '../types';
import { useStore } from '../store';

export function useFolderPickers() {
  const { folders, setFolder, updateFolderAlias: updateAliasInStore } = useStore();

  const pick = async (key: FolderKey) => {
    try {
      const folderData = await pickDirectory();
      const newState = { data: folderData, alias: folderData.name };
      setFolder(key, newState);
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

  const inputRefs = {
    A: useRef<HTMLInputElement>(null),
    B: useRef<HTMLInputElement>(null),
    C: useRef<HTMLInputElement>(null),
    D: useRef<HTMLInputElement>(null),
  };

  const onInput = (key: FolderKey, e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const folderData = filesFromInput(e.target.files);
    if (!folderData) return;
    const newState = { data: folderData, alias: folderData.name };
    setFolder(key, newState);
  };

  const updateAlias = (key: FolderKey, newAlias: string) => {
    updateAliasInStore(key, newAlias);
  };

  return { ...folders, pick, inputRefs, onInput, updateAlias, allFolders: folders };
}
