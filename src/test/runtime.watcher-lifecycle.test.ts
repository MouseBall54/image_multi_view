// @vitest-environment jsdom

import React from 'react';
import ReactDOM from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useElectronFolderWatcher, diffWatchEntries, getElectronWatchEntries } from '../hooks/useElectronFolderWatcher';
import { useStore } from '../store';
import type { FolderKey } from '../types';
import type { FolderState } from '../store';
import * as startupRuntimeGuards from '../utils/startupRuntimeGuards';

type MountedRoot = {
  host: HTMLDivElement;
  root: ReactDOM.Root;
};

type MockWatchFolderApi = {
  add: ReturnType<typeof vi.fn>;
  remove: ReturnType<typeof vi.fn>;
  onChange: ReturnType<typeof vi.fn>;
  removeAllListeners: ReturnType<typeof vi.fn>;
  emitChange: (payload: unknown) => void;
};

const mountedRoots: MountedRoot[] = [];

const flushAsync = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

const mountHookHost = async (): Promise<MountedRoot> => {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOM.createRoot(host);
  const mounted = { host, root };
  mountedRoots.push(mounted);

  const HookHost = (): React.ReactElement | null => {
    useElectronFolderWatcher(true);
    return null;
  };

  await act(async () => {
    root.render(React.createElement(HookHost));
  });

  return mounted;
};

const createMockWatchFolderApi = (): MockWatchFolderApi => {
  let changeHandler: ((payload: unknown) => void) | null = null;
  const add = vi.fn().mockResolvedValue({ success: true });
  const remove = vi.fn().mockResolvedValue({ success: true });
  const onChange = vi.fn((handler: (payload: unknown) => void) => {
    changeHandler = handler;
  });
  const removeAllListeners = vi.fn();

  return {
    add,
    remove,
    onChange,
    removeAllListeners,
    emitChange: (payload: unknown) => {
      changeHandler?.(payload);
    }
  };
};

const createFolderState = (key: FolderKey, path: string): FolderState => {
  return {
    alias: `Folder ${key}`,
    data: {
      name: `folder-${key}`,
      files: new Map<string, File>(),
      source: { kind: 'electron', path }
    }
  };
};

const setElectronFolder = (key: FolderKey, path: string) => {
  useStore.getState().setFolder(key, createFolderState(key, path));
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.restoreAllMocks();
  (window as any).electronAPI = undefined;
  useStore.setState({ folders: {} });
});

afterEach(async () => {
  while (mountedRoots.length > 0) {
    const mounted = mountedRoots.pop();
    if (!mounted) break;
    await act(async () => {
      mounted.root.unmount();
    });
    mounted.host.remove();
  }

  useStore.setState({ folders: {} });
  (window as any).electronAPI = undefined;
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('runtime watcher lifecycle hardening', () => {
  it('diffs watcher registration entries by add/update/remove', () => {
    const current = new Map([
      ['watch-A', { id: 'watch-A', key: 'A', path: '/a' }],
      ['watch-B', { id: 'watch-B', key: 'B', path: '/b' }]
    ]);

    const next = getElectronWatchEntries({
      A: createFolderState('A', '/a2'),
      C: createFolderState('C', '/c')
    } as any);

    const diff = diffWatchEntries(current as any, next);

    expect(diff.toAdd.map((entry) => entry.id)).toEqual(['watch-C']);
    expect(diff.toUpdate.map((entry) => `${entry.id}:${entry.path}`)).toEqual(['watch-A:/a2']);
    expect(diff.toRemove.map((entry) => entry.id)).toEqual(['watch-B']);
  });

  it('re-registers watchers when folder set changes and cleans up on unmount', async () => {
    const watchFolder = createMockWatchFolderApi();
    (window as any).electronAPI = { watchFolder };

    await mountHookHost();
    await flushAsync();

    setElectronFolder('A', '/tmp/folder-a');
    await flushAsync();
    expect(watchFolder.add).toHaveBeenCalledWith('watch-A', '/tmp/folder-a');

    setElectronFolder('B', '/tmp/folder-b');
    await flushAsync();
    expect(watchFolder.add).toHaveBeenCalledWith('watch-B', '/tmp/folder-b');

    setElectronFolder('A', '/tmp/folder-a-v2');
    await flushAsync();
    expect(watchFolder.remove).toHaveBeenCalledWith('watch-A');
    expect(watchFolder.add).toHaveBeenCalledWith('watch-A', '/tmp/folder-a-v2');

    useStore.getState().clearFolder('B');
    await flushAsync();
    expect(watchFolder.remove).toHaveBeenCalledWith('watch-B');

    while (mountedRoots.length > 0) {
      const mounted = mountedRoots.pop();
      if (!mounted) break;
      await act(async () => {
        mounted.root.unmount();
      });
      mounted.host.remove();
    }

    expect(watchFolder.removeAllListeners).toHaveBeenCalledTimes(1);
    expect(watchFolder.remove).toHaveBeenCalledWith('watch-A');
  });

  it('debounces duplicate change events and stops watching unavailable folders', async () => {
    const watchFolder = createMockWatchFolderApi();
    (window as any).electronAPI = { watchFolder };
    const warningSpy = vi.spyOn(startupRuntimeGuards, 'reportStartupWarningOnce').mockReturnValue(true);
    const refreshFolder = vi.fn().mockResolvedValue({
      changed: false,
      added: 0,
      updated: 0,
      removed: 0,
      issue: {
        code: 'electron-folder-list-failed',
        message: 'Failed to read watched folder contents.',
        details: ['ENOENT: no such file or directory']
      }
    });
    useStore.setState({ refreshFolder: refreshFolder as any });

    setElectronFolder('A', '/tmp/folder-a');
    await mountHookHost();
    await flushAsync();

    watchFolder.emitChange({ id: 'watch-A', eventType: 'rename', filename: 'x.png' });
    watchFolder.emitChange({ id: 'watch-A', eventType: 'rename', filename: 'x.png' });

    await act(async () => {
      vi.advanceTimersByTime(450);
      await Promise.resolve();
    });
    await flushAsync();

    expect(refreshFolder).toHaveBeenCalledTimes(1);
    expect(watchFolder.remove).toHaveBeenCalledWith('watch-A');
    expect(warningSpy).toHaveBeenCalledWith(expect.objectContaining({
      code: 'watcher-runtime-warning'
    }));
  });
});
