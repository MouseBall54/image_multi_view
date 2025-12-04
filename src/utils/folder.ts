// src/utils/folder.ts

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg', '.tif', '.tiff']);

function isImageFile(filename: string): boolean {
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
  | { kind: 'files' }
  | { kind: 'electron'; path: string };

export type FolderData = {
  name: string;
  files: Map<string, File>;
  meta?: Map<string, FileMeta>;
  source?: FolderSource;
};

function buildMeta(files: Iterable<[string, File]>): Map<string, FileMeta> {
  const meta = new Map<string, FileMeta>();
  for (const [name, file] of files) {
    meta.set(name, { mtime: file.lastModified, size: file.size });
  }
  return meta;
}

export async function pickDirectory(): Promise<FolderData> {
  // File System Access API
  // @ts-ignore
  const handle: FileSystemDirectoryHandle = await (window as any).showDirectoryPicker();
  const files = new Map<string, File>();
  for await (const [name, entry] of (handle as any).entries()) {
    if (entry.kind === "file" && isImageFile(name)) {
      const file = await entry.getFile();
      files.set(name, file);
    }
  }
  const meta = buildMeta(files.entries());
  return { name: handle.name, files, meta, source: { kind: 'picker', handle } };
}

// <input webkitdirectory> fallback 처리
export function filesFromInput(fileList: FileList): FolderData | null {
  if (fileList.length === 0) return null;

  const files = new Map<string, File>();
  Array.from(fileList).forEach(f => {
    if (isImageFile(f.name)) {
      files.set(f.name, f);
    }
  });

  if (files.size === 0) return null;

  const firstFile = Array.from(fileList).find(f => isImageFile(f.name));
  const folderName = firstFile ? firstFile.webkitRelativePath.split('/')[0] : "Unknown";
  const meta = buildMeta(files.entries());
  
  return { name: folderName, files, meta, source: { kind: 'files' } };
}

// 확장자 제외 매칭을 원하면 아래 유틸 활용
export function normalizeName(name: string, stripExt = false) {
  if (!stripExt) return name;
  const i = name.lastIndexOf(".");
  return i > 0 ? name.slice(0, i) : name;
}
