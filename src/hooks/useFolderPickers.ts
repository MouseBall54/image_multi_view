
import { useState, useRef } from 'react';
import { pickDirectory, filesFromInput, FolderData } from '../utils/folder';
import type { FolderKey } from '../types';

export interface FolderState {
  data: FolderData;
  alias: string;
}

export function useFolderPickers() {
  const [A, setA] = useState<FolderState | undefined>();
  const [B, setB] = useState<FolderState | undefined>();
  const [C, setC] = useState<FolderState | undefined>();
  const [D, setD] = useState<FolderState | undefined>();

  const pick = async (key: FolderKey) => {
    try {
      const folderData = await pickDirectory();
      const newState = { data: folderData, alias: folderData.name };
      if (key === "A") setA(newState);
      if (key === "B") setB(newState);
      if (key === "C") setC(newState);
      if (key === "D") setD(newState);
    } catch (error) {
      console.error("Error picking directory:", error);
      if (inputRefs[key].current) {
        inputRefs[key].current?.click();
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
    if (key === "A") setA(newState);
    if (key === "B") setB(newState);
    if (key === "C") setC(newState);
    if (key === "D") setD(newState);
  };

  const updateAlias = (key: FolderKey, newAlias: string) => {
    if (key === "A") setA(prev => prev ? { ...prev, alias: newAlias } : undefined);
    if (key === "B") setB(prev => prev ? { ...prev, alias: newAlias } : undefined);
    if (key === "C") setC(prev => prev ? { ...prev, alias: newAlias } : undefined);
    if (key === "D") setD(prev => prev ? { ...prev, alias: newAlias } : undefined);
  };

  const allFolders = { A, B, C, D };

  return { A, B, C, D, pick, inputRefs, onInput, updateAlias, allFolders };
}
