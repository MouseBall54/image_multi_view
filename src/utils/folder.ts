// src/utils/folder.ts

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg', '.tif', '.tiff']);

function isImageFile(filename: string): boolean {
  const i = filename.lastIndexOf('.');
  if (i < 0) return false;
  const ext = filename.substring(i).toLowerCase();
  return IMAGE_EXTENSIONS.has(ext);
}

export async function pickDirectory(): Promise<Map<string, File>> {
  // File System Access API
  // @ts-ignore
  const handle: FileSystemDirectoryHandle = await (window as any).showDirectoryPicker();
  const map = new Map<string, File>();
  for await (const [name, entry] of (handle as any).entries()) {
    if (entry.kind === "file" && isImageFile(name)) {
      const file = await entry.getFile();
      map.set(name, file);
    }
  }
  return map;
}

// <input webkitdirectory> fallback 처리
export function filesFromInput(fileList: FileList): Map<string, File> {
  const map = new Map<string, File>();
  Array.from(fileList).forEach(f => {
    if (isImageFile(f.name)) {
      map.set(f.name, f);
    }
  });
  return map;
}

// 확장자 제외 매칭을 원하면 아래 유틸 활용
export function normalizeName(name: string, stripExt = false) {
  if (!stripExt) return name;
  const i = name.lastIndexOf(".");
  return i > 0 ? name.slice(0, i) : name;
}
