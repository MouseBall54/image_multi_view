import { useEffect, useRef } from 'react';
import type { FolderKey } from '../types';
import { useStore } from '../store';
import type { FolderRescanIssue } from '../utils/folderSync';
import { reportStartupWarningOnce } from '../utils/startupRuntimeGuards';

type WatchEntry = { id: string; key: FolderKey; path: string };

type WatchFolderApi = {
  add: (id: string, folderPath: string) => Promise<{ success?: boolean; error?: string } | void>;
  remove: (id: string) => Promise<{ success?: boolean; error?: string } | void>;
  onChange: (callback: (payload: any) => void) => void;
  removeAllListeners?: () => void;
};

type WatchDiff = {
  toAdd: WatchEntry[];
  toUpdate: WatchEntry[];
  toRemove: WatchEntry[];
};

const WATCH_EVENT_DEBOUNCE_MS = 400;
const DUPLICATE_EVENT_WINDOW_MS = 250;

const getWatchErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return String(error);
};

const getResultError = (result: unknown): string | null => {
  if (!result || typeof result !== 'object') return null;
  const candidate = result as { success?: boolean; error?: unknown };
  if (candidate.success === false) {
    return candidate.error ? getWatchErrorMessage(candidate.error) : 'Unknown watcher IPC error';
  }
  return null;
};

const reportWatcherRuntimeWarning = (reason: string, details: string[]) => {
  reportStartupWarningOnce({
    code: 'watcher-runtime-warning',
    title: 'Folder Watcher Warning',
    message: reason,
    details
  });
};

const toWatchEntry = (key: FolderKey, path: string): WatchEntry => ({
  id: `watch-${key}`,
  key,
  path
});

export const getElectronWatchEntries = (folders: Partial<Record<FolderKey, any>>): WatchEntry[] => {
  const entries: WatchEntry[] = [];
  for (const [rawKey, folder] of Object.entries(folders) as [FolderKey, any][]) {
    const path = folder?.data?.source?.kind === 'electron'
      ? folder.data.source.path
      : null;
    if (!path || typeof path !== 'string') continue;
    entries.push(toWatchEntry(rawKey, path));
  }
  entries.sort((a, b) => a.id.localeCompare(b.id));
  return entries;
};

const toWatchMap = (entries: WatchEntry[]) => {
  const mapped = new Map<string, WatchEntry>();
  for (const entry of entries) {
    mapped.set(entry.id, entry);
  }
  return mapped;
};

export const diffWatchEntries = (
  currentEntries: Map<string, WatchEntry>,
  nextEntries: WatchEntry[]
): WatchDiff => {
  const nextById = toWatchMap(nextEntries);
  const toAdd: WatchEntry[] = [];
  const toUpdate: WatchEntry[] = [];
  const toRemove: WatchEntry[] = [];

  for (const nextEntry of nextEntries) {
    const current = currentEntries.get(nextEntry.id);
    if (!current) {
      toAdd.push(nextEntry);
      continue;
    }
    if (current.path !== nextEntry.path) {
      toUpdate.push(nextEntry);
    }
  }

  for (const currentEntry of currentEntries.values()) {
    if (!nextById.has(currentEntry.id)) {
      toRemove.push(currentEntry);
    }
  }

  return { toAdd, toUpdate, toRemove };
};

const getFolderSignature = (folders: Partial<Record<FolderKey, any>>): string => {
  return getElectronWatchEntries(folders)
    .map((entry) => `${entry.id}:${entry.path}`)
    .join('|');
};

const isFolderUnavailableIssue = (issue?: FolderRescanIssue): boolean => {
  if (!issue) return false;
  return issue.code === 'electron-folder-list-failed';
};

export function useElectronFolderWatcher(enabled = true) {
  const registeredWatchesRef = useRef<Map<string, WatchEntry>>(new Map());
  const debounceTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const recentEventTokensRef = useRef<Map<string, { token: string; at: number }>>(new Map());
  const refreshInFlightRef = useRef<Set<FolderKey>>(new Set());

  useEffect(() => {
    if (!enabled) return;
    if (typeof window === 'undefined') return;

    const api = (window as any).electronAPI;
    const watchFolder = api?.watchFolder as WatchFolderApi | undefined;
    if (!watchFolder) return;

    const canWatch = (
      typeof watchFolder.add === 'function' &&
      typeof watchFolder.remove === 'function' &&
      typeof watchFolder.onChange === 'function'
    );

    if (!canWatch) {
      reportStartupWarningOnce({
        code: 'watcher-ipc-unavailable',
        message: 'Watcher IPC is unavailable. Automatic folder refresh is disabled.',
        details: ['Required preload methods: watchFolder.add/remove/onChange']
      });
      return;
    }

    let disposed = false;
    let syncRunning = false;
    let syncQueued = false;
    let latestFolderSignature = getFolderSignature(useStore.getState().folders);

    const unregisterWatch = async (entry: WatchEntry) => {
      try {
        const result = await watchFolder.remove(entry.id);
        const resultError = getResultError(result);
        if (resultError) {
          reportWatcherRuntimeWarning(
            'Folder watcher cleanup encountered an issue. compareX will continue in degraded mode.',
            [`${entry.path}: ${resultError}`]
          );
        }
      } catch (error) {
        reportWatcherRuntimeWarning(
          'Folder watcher cleanup encountered an issue. compareX will continue in degraded mode.',
          [`${entry.path}: ${getWatchErrorMessage(error)}`]
        );
      }
      registeredWatchesRef.current.delete(entry.id);
    };

    const registerWatch = async (entry: WatchEntry) => {
      try {
        const result = await watchFolder.add(entry.id, entry.path);
        const resultError = getResultError(result);
        if (resultError) {
          reportWatcherRuntimeWarning(
            'Folder watcher registration failed. compareX will continue and allow manual refresh.',
            [`${entry.path}: ${resultError}`]
          );
          registeredWatchesRef.current.delete(entry.id);
          return;
        }
        registeredWatchesRef.current.set(entry.id, entry);
      } catch (error) {
        reportWatcherRuntimeWarning(
          'Folder watcher registration failed. compareX will continue and allow manual refresh.',
          [`${entry.path}: ${getWatchErrorMessage(error)}`]
        );
        registeredWatchesRef.current.delete(entry.id);
      }
    };

    const flushSync = async () => {
      if (syncRunning || disposed) {
        syncQueued = true;
        return;
      }

      syncRunning = true;
      do {
        syncQueued = false;
        const nextEntries = getElectronWatchEntries(useStore.getState().folders);
        const diff = diffWatchEntries(registeredWatchesRef.current, nextEntries);

        for (const entry of diff.toRemove) {
          if (disposed) break;
          await unregisterWatch(entry);
        }

        for (const entry of diff.toUpdate) {
          if (disposed) break;
          await unregisterWatch(entry);
          if (disposed) break;
          await registerWatch(entry);
        }

        for (const entry of diff.toAdd) {
          if (disposed) break;
          await registerWatch(entry);
        }
      } while (syncQueued && !disposed);

      syncRunning = false;
    };

    const refreshForWatch = async (entry: WatchEntry) => {
      const key = entry.key;
      if (refreshInFlightRef.current.has(key)) {
        return;
      }

      refreshInFlightRef.current.add(key);
      try {
        const { refreshFolder } = useStore.getState();
        const result = await refreshFolder(key);
        if (result?.issue) {
          reportWatcherRuntimeWarning(
            'Watched folder is unavailable or unreadable. Automatic watch has been paused for this folder.',
            result.issue.details && result.issue.details.length > 0
              ? result.issue.details
              : [result.issue.message]
          );
          if (isFolderUnavailableIssue(result.issue)) {
            await unregisterWatch(entry);
          }
        }
      } finally {
        refreshInFlightRef.current.delete(key);
      }
    };

    const handler = (payload: any) => {
      if (disposed) return;
      const id = payload?.id;
      if (!id || typeof id !== 'string') return;

      const watchEntry = registeredWatchesRef.current.get(id);
      if (!watchEntry) return;

      const eventToken = `${payload?.eventType ?? 'unknown'}:${payload?.filename ?? ''}`;
      const now = Date.now();
      const recent = recentEventTokensRef.current.get(id);
      if (recent && recent.token === eventToken && now - recent.at < DUPLICATE_EVENT_WINDOW_MS) {
        return;
      }
      recentEventTokensRef.current.set(id, { token: eventToken, at: now });

      const existing = debounceTimersRef.current.get(id);
      if (existing) {
        clearTimeout(existing);
      }

      const timer = setTimeout(() => {
        debounceTimersRef.current.delete(id);
        void refreshForWatch(watchEntry);
      }, WATCH_EVENT_DEBOUNCE_MS);
      debounceTimersRef.current.set(id, timer);
    };

    const storeUnsubscribe = useStore.subscribe((state) => {
      const signature = getFolderSignature(state.folders);
      if (signature === latestFolderSignature) {
        return;
      }
      latestFolderSignature = signature;
      void flushSync();
    });

    watchFolder.onChange(handler);
    void flushSync();

    return () => {
      disposed = true;
      storeUnsubscribe();
      watchFolder.removeAllListeners?.();

      debounceTimersRef.current.forEach((timer) => clearTimeout(timer));
      debounceTimersRef.current.clear();
      recentEventTokensRef.current.clear();
      refreshInFlightRef.current.clear();

      const cleanupEntries = Array.from(registeredWatchesRef.current.values());
      registeredWatchesRef.current.clear();
      cleanupEntries.forEach((entry) => {
        Promise.resolve(watchFolder.remove(entry.id)).catch((error: unknown) => {
          reportWatcherRuntimeWarning(
            'Folder watcher cleanup failed. compareX will continue without watcher integration.',
            [`${entry.path}: ${getWatchErrorMessage(error)}`]
          );
        });
      });
    };
  }, [enabled]);
}
