// src/utils/folder.ts

export const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg', '.tif', '.tiff']);

export function isImageFile(filename: string): boolean {
  const i = filename.lastIndexOf('.');
  if (i < 0) return false;
  const ext = filename.substring(i).toLowerCase();
  return IMAGE_EXTENSIONS.has(ext);
}

export type FileMeta = {
  mtime: number;
  size: number;
};

export type FolderSource =
  | { kind: 'picker'; handle: FileSystemDirectoryHandle }
  | { kind: 'directory-entry'; entry: FileSystemDirectoryEntry }
  | { kind: 'files' }
  | { kind: 'electron'; path: string };

export type FolderData = {
  name: string;
  files: Map<string, File>;
  meta?: Map<string, FileMeta>;
  source?: FolderSource;
};

export type FolderIntakeStats = {
  scannedEntryCount: number;
  unsupportedFileCount: number;
  unreadableFileCount: number;
};

export type FolderIntakeCandidate = {
  data: FolderData;
  stats: FolderIntakeStats;
};

function buildMeta(files: Iterable<[string, File]>): Map<string, FileMeta> {
  const meta = new Map<string, FileMeta>();
  for (const [name, file] of files) {
    meta.set(name, { mtime: file.lastModified, size: file.size });
  }
  return meta;
}

export function createFolderIntakeCandidate(
  name: string,
  files: Iterable<[string, File]>,
  source: FolderSource,
  stats?: Partial<FolderIntakeStats>
): FolderIntakeCandidate {
  const mappedFiles = new Map<string, File>(files);
  const scannedEntryCount = stats?.scannedEntryCount ?? mappedFiles.size;
  return {
    data: {
      name,
      files: mappedFiles,
      meta: buildMeta(mappedFiles.entries()),
      source
    },
    stats: {
      scannedEntryCount,
      unsupportedFileCount: stats?.unsupportedFileCount ?? Math.max(scannedEntryCount - mappedFiles.size, 0),
      unreadableFileCount: stats?.unreadableFileCount ?? 0
    }
  };
}

export async function pickDirectory(): Promise<FolderData> {
  const intake = await pickDirectoryForIntake();
  return intake.data;
}

export async function pickDirectoryForIntake(): Promise<FolderIntakeCandidate> {
  // File System Access API
  // @ts-ignore
  const handle: FileSystemDirectoryHandle = await (window as any).showDirectoryPicker();
  const files = new Map<string, File>();
  let scannedEntryCount = 0;
  let unsupportedFileCount = 0;
  let unreadableFileCount = 0;

  for await (const [name, entry] of (handle as any).entries()) {
    scannedEntryCount += 1;
    if (entry.kind !== "file") {
      unsupportedFileCount += 1;
      continue;
    }

    if (!isImageFile(name)) {
      unsupportedFileCount += 1;
      continue;
    }

    try {
      const file = await entry.getFile();
      files.set(name, file);
    } catch {
      unreadableFileCount += 1;
    }
  }

  return createFolderIntakeCandidate(
    handle.name,
    files.entries(),
    { kind: 'picker', handle },
    { scannedEntryCount, unsupportedFileCount, unreadableFileCount }
  );
}

// <input webkitdirectory> fallback 처리
export function filesFromInput(fileList: FileList): FolderData | null {
  const intake = filesFromInputForIntake(fileList);
  if (!intake || intake.data.files.size === 0) {
    return null;
  }
  return intake.data;
}

export function filesFromInputForIntake(fileList: FileList): FolderIntakeCandidate | null {
  if (fileList.length === 0) return null;

  const files = new Map<string, File>();
  let unsupportedFileCount = 0;
  Array.from(fileList).forEach(f => {
    if (isImageFile(f.name)) {
      files.set(f.name, f);
    } else {
      unsupportedFileCount += 1;
    }
  });

  const firstFile = Array.from(fileList).find(f => isImageFile(f.name));
  const folderName = firstFile ? firstFile.webkitRelativePath.split('/')[0] : "Unknown";

  return createFolderIntakeCandidate(
    folderName,
    files.entries(),
    { kind: 'files' },
    {
      scannedEntryCount: fileList.length,
      unsupportedFileCount,
      unreadableFileCount: 0
    }
  );
}

// 확장자 제외 매칭을 원하면 아래 유틸 활용
export function normalizeName(name: string, stripExt = false) {
  if (!stripExt) return name;
  const i = name.lastIndexOf(".");
  return i > 0 ? name.slice(0, i) : name;
}
