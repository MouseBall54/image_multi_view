// src/types.ts
export type FolderKey = "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H" | "I";
export type AppMode = "compare" | "toggle" | "pinpoint";
export type PinpointMouseMode = "pin" | "pan";

export interface PickedFolder {
  key: FolderKey;
  name: string;
  files: Map<string, File>; // filename -> File
}

export interface MatchedItem {
  filename: string;
  has: Record<FolderKey, boolean>;
}

export interface Pinpoint {
  x: number; // normalized image coordinate
  y: number; // normalized image coordinate
}

export interface Viewport {
  scale: number;
  cx?: number;        // center x (image coords)
  cy?: number;        // center y (image coords)
  refScreenX?: number; // For pinpoint mode: screen x of the common reference point
  refScreenY?: number; // For pinpoint mode: screen y of the common reference point
}

export type SyncMode = "locked" | "unlocked";

export type FilterType = "none" | "grayscale" | "invert" | "sepia" | "sobel";
