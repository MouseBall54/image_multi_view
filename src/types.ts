// src/types.ts
export type FolderKey = "A" | "B" | "C" | "D";
export type AppMode = "compare" | "toggle";

export interface PickedFolder {
  key: FolderKey;
  name: string;
  files: Map<string, File>; // filename -> File
}

export interface MatchedItem {
  filename: string;
  has: Record<FolderKey, boolean>;
}

export interface Viewport {
  scale: number;     // zoom
  cx: number;        // center x (image coords)
  cy: number;        // center y (image coords)
}

export type SyncMode = "locked" | "unlocked";
