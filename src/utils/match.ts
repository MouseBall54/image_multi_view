// src/utils/match.ts
import type { FolderKey, MatchedItem } from "../types";

export function matchFilenames(
  folders: Partial<Record<FolderKey, Map<string, File>>>,
  stripExt = false,
  mode: "intersect" | "union" = "intersect" // New parameter
): MatchedItem[] {
  const keys = Object.keys(folders).filter(k => folders[k as FolderKey]) as FolderKey[];
  if (keys.length === 0) {
    return [];
  }
  const nameSets = keys.map(k => new Set(
    Array.from(folders[k]!.keys()).map(n => stripExt ? n.replace(/\.[^/.]+$/, "") : n)
  ));

  let uniqueFilenames: Set<string>;
  if (mode === "intersect") {
    uniqueFilenames = nameSets.reduce((acc, s) =>
      acc ? new Set([...acc].filter(x => s.has(x))) : s
    , undefined as Set<string> | undefined) ?? new Set<string>();
  } else { // mode === "union"
    uniqueFilenames = new Set<string>();
    nameSets.forEach(s => {
      s.forEach(filename => uniqueFilenames.add(filename));
    });
  }

  const list: MatchedItem[] = [];
  for (const filename of uniqueFilenames) {
    const has: any = { A: false, B: false, C: false, D: false };
    keys.forEach(k => {
      const map = folders[k]!;
      // stripExt 매칭 시 실제 파일명 다시 찾아 매핑(간단화: 첫 일치)
      const found = Array.from(map.keys()).find(n =>
        stripExt ? n.replace(/\.[^/.]+$/, "") === filename : n === filename
      );
      has[k] = !!found;
    });
    list.push({ filename, has });
  }
  return list.sort((a, b) => a.filename.localeCompare(b.filename, undefined, { numeric: true }));
}
