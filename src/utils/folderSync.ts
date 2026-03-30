import type { FolderData, FileMeta } from './folder';
import { isImageFile } from './folder';

type ElectronFolderApi = {
  list: (folderPath: string) => Promise<{ success: boolean; files?: { name: string; mtimeMs: number; size: number }[]; error?: string }>;
  readFile: (folderPath: string, name: string) => Promise<{ success: boolean; base64?: string; mtimeMs?: number; size?: number; error?: string }>;
};

type DiffCounts = { added: number; updated: number; removed: number };

export type FolderRescanIssue = {
  code: 'electron-folder-list-failed' | 'electron-folder-read-failed';
  message: string;
  details?: string[];
};

export type FolderRescanResult = {
  data: FolderData;
  changed: boolean;
  diff: DiffCounts;
  issue?: FolderRescanIssue;
};

type ElectronRescanResult =
  | {
    files: Map<string, File>;
    meta: Map<string, FileMeta>;
    diff: DiffCounts;
    issue?: FolderRescanIssue;
  }
  | {
    issue: FolderRescanIssue;
  };

export function ensureMeta(folderData: FolderData): FolderData {
  if (folderData.meta) return folderData;
  const meta = new Map<string, FileMeta>();
  for (const [name, file] of folderData.files.entries()) {
    meta.set(name, { mtime: file.lastModified, size: file.size });
  }
  return { ...folderData, meta };
}

function mimeFromName(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'gif':
      return 'image/gif';
    case 'webp':
      return 'image/webp';
    case 'bmp':
      return 'image/bmp';
    case 'svg':
      return 'image/svg+xml';
    case 'tif':
    case 'tiff':
      return 'image/tiff';
    default:
      return 'application/octet-stream';
  }
}

async function rescanPicker(folderData: FolderData) {
  const handle = folderData.source?.kind === 'picker' ? folderData.source.handle : null;
  // `entries()` is available at runtime in Chromium-based environments, but
  // TypeScript's File System Access types may omit it depending on lib version.
  const handleWithEntries = handle as (FileSystemDirectoryHandle & {
    entries?: () => AsyncIterableIterator<[string, any]>;
  }) | null;
  if (!handleWithEntries || typeof handleWithEntries.entries !== 'function') return null;

  const prevMeta = folderData.meta ?? new Map<string, FileMeta>();
  const prevFiles = folderData.files;
  const nextFiles = new Map<string, File>();
  const nextMeta = new Map<string, FileMeta>();
  let added = 0;
  let updated = 0;

  for await (const [name, entry] of handleWithEntries.entries()) {
    if (entry.kind !== 'file') continue;
    if (!isImageFile(name)) continue;
    const file = await entry.getFile();
    const meta: FileMeta = { mtime: file.lastModified, size: file.size };
    nextMeta.set(name, meta);
    const prev = prevMeta.get(name);
    const unchanged = prev && prev.mtime === meta.mtime && prev.size === meta.size;
    if (unchanged && prevFiles.has(name)) {
      nextFiles.set(name, prevFiles.get(name)!);
    } else {
      nextFiles.set(name, file);
      if (prev) {
        updated++;
      } else {
        added++;
      }
    }
  }
  let removed = 0;
  for (const key of prevMeta.keys()) {
    if (!nextMeta.has(key)) removed++;
  }
  if (added + updated + removed === 0) return null;
  return { files: nextFiles, meta: nextMeta, diff: { added, updated, removed } };
}

async function rescanElectron(folderData: FolderData, api: ElectronFolderApi): Promise<ElectronRescanResult | null> {
  if (!api || folderData.source?.kind !== 'electron') return null;
  const folderPath = folderData.source.path;
  const list = await api.list(folderPath);
  if (!list?.success || !list.files) {
    return {
      issue: {
        code: 'electron-folder-list-failed' as const,
        message: 'Failed to read watched folder contents.',
        details: [list?.error || `Path unavailable: ${folderPath}`]
      }
    };
  }
  const prevMeta = folderData.meta ?? new Map<string, FileMeta>();
  const prevFiles = folderData.files;
  const nextFiles = new Map<string, File>();
  const nextMeta = new Map<string, FileMeta>();
  let added = 0;
  let updated = 0;
  let readErrorCount = 0;
  let firstReadError: string | undefined;

  for (const entry of list.files) {
    const meta: FileMeta = { mtime: entry.mtimeMs, size: entry.size };
    nextMeta.set(entry.name, meta);
    const prev = prevMeta.get(entry.name);
    const unchanged = prev && prev.mtime === meta.mtime && prev.size === meta.size;
    if (unchanged && prevFiles.has(entry.name)) {
      nextFiles.set(entry.name, prevFiles.get(entry.name)!);
      continue;
    }
    const read = await api.readFile(folderPath, entry.name);
    if (!read?.success || !read.base64) {
      readErrorCount += 1;
      if (!firstReadError) {
        firstReadError = read?.error || `Failed to read ${entry.name}`;
      }
      continue;
    }
    const binary = Uint8Array.from(atob(read.base64), c => c.charCodeAt(0));
    const file = new File([binary], entry.name, { type: mimeFromName(entry.name), lastModified: entry.mtimeMs ?? Date.now() });
    nextFiles.set(entry.name, file);
    if (prev) updated++; else added++;
  }
  let removed = 0;
  for (const key of prevMeta.keys()) {
    if (!nextMeta.has(key)) removed++;
  }
  const issue: FolderRescanIssue | undefined = readErrorCount > 0
    ? {
      code: 'electron-folder-read-failed',
      message: 'Some files could not be read while rescanning the folder.',
      details: [firstReadError || `Read failures: ${readErrorCount}`]
    }
    : undefined;

  if (added + updated + removed === 0) {
    if (issue) {
      return { issue };
    }
    return null;
  }
  return { files: nextFiles, meta: nextMeta, diff: { added, updated, removed }, issue };
}

export async function rescanFolderData(folderData: FolderData, opts?: { electronApi?: ElectronFolderApi }): Promise<FolderRescanResult | null> {
  const pickerResult = await rescanPicker(folderData);
  if (pickerResult) {
    return {
      data: { ...folderData, files: pickerResult.files, meta: pickerResult.meta },
      changed: true,
      diff: pickerResult.diff
    };
  }

  const electronResult = await rescanElectron(folderData, opts?.electronApi as ElectronFolderApi);
  if (electronResult) {
    if (!('files' in electronResult)) {
      return {
        data: folderData,
        changed: false,
        diff: { added: 0, updated: 0, removed: 0 },
        issue: electronResult.issue
      };
    }
    return {
      data: { ...folderData, files: electronResult.files, meta: electronResult.meta },
      changed: true,
      diff: electronResult.diff,
      issue: electronResult.issue
    };
  }

  return null;
}
