import type { FolderData, FileMeta } from './folder';

type DiffCounts = { added: number; updated: number; removed: number };

export function ensureMeta(folderData: FolderData): FolderData {
  if (folderData.meta) return folderData;
  const meta = new Map<string, FileMeta>();
  for (const [name, file] of folderData.files.entries()) {
    meta.set(name, { mtime: file.lastModified, size: file.size });
  }
  return { ...folderData, meta };
}

export async function rescanFolderData(folderData: FolderData): Promise<{ data: FolderData; changed: boolean; diff: DiffCounts } | null> {
  if (!folderData.source || folderData.source.kind !== 'picker') return null;
  const handle = folderData.source.handle;
  if (!handle || typeof handle.entries !== 'function') return null;

  const prevMeta = folderData.meta ?? new Map<string, FileMeta>();
  const prevFiles = folderData.files;

  const nextFiles = new Map<string, File>();
  const nextMeta = new Map<string, FileMeta>();
  let added = 0;
  let updated = 0;

  for await (const [name, entry] of handle.entries()) {
    if (entry.kind !== 'file') continue;
    const file = await entry.getFile();
    const meta: FileMeta = { mtime: file.lastModified, size: file.size };
    nextMeta.set(name, meta);

    const prev = prevMeta.get(name);
    const unchanged = prev && prev.mtime === meta.mtime && prev.size === meta.size;
    if (unchanged && prevFiles.has(name)) {
      // Reuse previous File object to avoid unnecessary allocations
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
    if (!nextMeta.has(key)) {
      removed++;
    }
  }

  const changed = added + updated + removed > 0;
  if (!changed) return null;

  return {
    data: { ...folderData, files: nextFiles, meta: nextMeta },
    changed: true,
    diff: { added, updated, removed }
  };
}
