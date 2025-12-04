import { useEffect } from 'react';
import type { FolderKey } from '../types';
import { useStore } from '../store';
import { ensureMeta } from '../utils/folderSync';

export function useFolderSync(intervalMs = 5000) {
  const addToast = useStore(state => state.addToast);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    let running = false;

    const tick = async () => {
      if (running) return;
      running = true;
      try {
        const { folders, refreshFolder, setFolder } = useStore.getState();
        const entries = Object.entries(folders) as [FolderKey, any][];
        for (const [key, folder] of entries) {
          if (!folder || !folder.data?.source || folder.data.source.kind !== 'picker') continue;
          // Ensure meta exists before refresh to avoid false positives
          if (!folder.data.meta) {
            setFolder(key, { ...folder, data: ensureMeta(folder.data) });
          }
          const result = await refreshFolder(key);
          if (result && (result.added || result.updated || result.removed)) {
            const summary: string[] = [];
            if (result.added) summary.push(`+${result.added}`);
            if (result.updated) summary.push(`~${result.updated}`);
            if (result.removed) summary.push(`-${result.removed}`);
            addToast?.({
              type: 'info',
              title: 'Folder Synced',
              message: `${folder.alias} 업데이트 (${summary.join(' ')})`,
              duration: 2000
            });
          }
        }
      } finally {
        running = false;
      }
    };

    timer = setInterval(tick, intervalMs);

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [intervalMs, addToast]);
}
