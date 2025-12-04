export function inferFolderPathFromFiles(files: Map<string, File>): string | null {
  const first = files.values().next().value as File | undefined;
  if (!first) return null;
  const anyFile = first as any;
  const rawPath: string | undefined = anyFile?.path || anyFile?.webkitRelativePath;
  if (!rawPath) return null;
  const normalized = rawPath.replace(/\\/g, '/');
  const parts = normalized.split('/');
  parts.pop(); // remove filename
  if (parts.length === 0) return null;
  return parts.join('/');
}
