import { useEffect } from 'react';
import type { FolderKey } from '../types';
import { useStore } from '../store';

type WatchEntry = { id: string; path: string };

export function useElectronFolderWatcher(enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    const api = (window as any).electronAPI;
    if (!api?.watchFolder) return;

    const watches: WatchEntry[] = [];
    const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();

    const register = async () => {
      const { folders } = useStore.getState();
      for (const [key, folder] of Object.entries(folders) as [FolderKey, any][]) {
        const path = folder?.data?.source?.kind === 'electron' ? folder.data.source.path : null;
        if (!path) continue;
        const id = `watch-${key}`;
        watches.push({ id, path });
        await api.watchFolder.add(id, path);
      }
    };

    register();

    const handler = async (payload: any) => {
      const { id } = payload || {};
      if (!id) return;
      const key = id.replace('watch-', '') as FolderKey;
      const { refreshFolder } = useStore.getState();
      const existing = debounceTimers.get(id);
      if (existing) clearTimeout(existing);
      const t = setTimeout(() => {
        refreshFolder(key);
        debounceTimers.delete(id);
      }, 500);
      debounceTimers.set(id, t);
    };

    api.watchFolder.onChange(handler);

    return () => {
      api.watchFolder.removeAllListeners?.();
      watches.forEach(({ id }) => api.watchFolder.remove(id));
      debounceTimers.forEach((t) => clearTimeout(t));
      debounceTimers.clear();
    };
  }, [enabled]);
}
