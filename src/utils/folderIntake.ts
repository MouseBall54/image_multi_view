import type { FolderKey } from "../types";
import type { FolderData, FolderIntakeCandidate } from "./folder";

export const ALL_FOLDER_KEYS: FolderKey[] = [
  "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M",
  "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"
];

export type FolderStateLike = {
  data: FolderData;
  alias: string;
};

type FolderMapLike = Partial<Record<FolderKey, FolderStateLike>>;

type ToastPayload = {
  type: "success" | "error" | "warning" | "info";
  title: string;
  message: string;
  details?: string[];
  duration?: number;
};

type AddToast = (toast: ToastPayload) => void;

type ApplyFolderIntakeOptions = {
  candidate: FolderIntakeCandidate;
  getFolders: () => FolderMapLike;
  setFolder: (key: FolderKey, folderState: FolderStateLike) => void;
  addToast?: AddToast;
  targetKey?: FolderKey;
  showSuccessToast?: boolean;
};

const buildFolderSignature = (data: FolderData): string => {
  const rows = Array.from(data.files.entries())
    .map(([name, file]) => `${name}:${file.size}:${file.lastModified}`)
    .sort();
  return `${data.name}::${rows.join("|")}`;
};

const isDuplicateAgainst = (candidate: FolderData, existing: FolderData): boolean => {
  const candidateSource = candidate.source;
  const existingSource = existing.source;

  if (candidateSource?.kind === "electron" && existingSource?.kind === "electron") {
    return candidateSource.path === existingSource.path;
  }

  if (candidateSource?.kind === "picker" && existingSource?.kind === "picker") {
    return candidateSource.handle === existingSource.handle;
  }

  return buildFolderSignature(candidate) === buildFolderSignature(existing);
};

const findDuplicateFolder = (
  candidate: FolderData,
  folders: FolderMapLike,
  excludeKey?: FolderKey
): FolderKey | null => {
  for (const key of ALL_FOLDER_KEYS) {
    if (excludeKey && key === excludeKey) {
      continue;
    }
    const existing = folders[key];
    if (!existing) {
      continue;
    }
    if (isDuplicateAgainst(candidate, existing.data)) {
      return key;
    }
  }
  return null;
};

export const findFirstEmptyFolderKey = (folders: FolderMapLike): FolderKey | null => {
  for (const key of ALL_FOLDER_KEYS) {
    if (!folders[key]) {
      return key;
    }
  }
  return null;
};

const notifyMixedContent = (candidate: FolderIntakeCandidate, addToast?: AddToast): void => {
  const unsupported = candidate.stats.unsupportedFileCount;
  const unreadable = candidate.stats.unreadableFileCount;
  if (!addToast || (unsupported === 0 && unreadable === 0) || candidate.data.files.size === 0) {
    return;
  }

  const details: string[] = [];
  if (unsupported > 0) {
    details.push(`${unsupported} unsupported file${unsupported > 1 ? "s" : ""} skipped`);
  }
  if (unreadable > 0) {
    details.push(`${unreadable} unreadable file${unreadable > 1 ? "s" : ""} skipped`);
  }

  addToast({
    type: "warning",
    title: "Partial Folder Import",
    message: `Loaded ${candidate.data.files.size} supported image${candidate.data.files.size > 1 ? "s" : ""} from "${candidate.data.name}"`,
    details,
    duration: 5000
  });
};

export const applyFolderIntake = ({
  candidate,
  getFolders,
  setFolder,
  addToast,
  targetKey,
  showSuccessToast = false
}: ApplyFolderIntakeOptions): { accepted: boolean; key?: FolderKey } => {
  const folders = getFolders();
  const validCount = candidate.data.files.size;
  if (validCount === 0) {
    const details: string[] = [];
    if (candidate.stats.unsupportedFileCount > 0) {
      details.push(`${candidate.stats.unsupportedFileCount} unsupported file${candidate.stats.unsupportedFileCount > 1 ? "s" : ""} detected`);
    }
    if (candidate.stats.unreadableFileCount > 0) {
      details.push(`${candidate.stats.unreadableFileCount} unreadable file${candidate.stats.unreadableFileCount > 1 ? "s" : ""} detected`);
    }

    addToast?.({
      type: "warning",
      title: "Empty Folder",
      message: `Folder "${candidate.data.name}" has no supported images`,
      details: details.length > 0 ? details : undefined,
      duration: 5000
    });
    return { accepted: false };
  }

  const duplicateKey = findDuplicateFolder(candidate.data, folders, targetKey);
  if (duplicateKey) {
    addToast?.({
      type: "warning",
      title: "Duplicate Folder",
      message: `Folder "${candidate.data.name}" is already loaded in slot ${duplicateKey}`,
      duration: 5000
    });
    return { accepted: false };
  }

  const resolvedKey = targetKey ?? findFirstEmptyFolderKey(folders);
  if (!resolvedKey) {
    addToast?.({
      type: "error",
      title: "No Empty Slots",
      message: "All folder slots are in use. Please clear a folder first.",
      duration: 5000
    });
    return { accepted: false };
  }

  setFolder(resolvedKey, {
    data: candidate.data,
    alias: candidate.data.name
  });

  if (showSuccessToast) {
    const fileNames = Array.from(candidate.data.files.keys());
    addToast?.({
      type: "success",
      title: "Folder Added",
      message: `Folder "${candidate.data.name}" added with ${validCount} image${validCount > 1 ? "s" : ""}`,
      details: [
        `Assigned to slot ${resolvedKey}`,
        `Images: ${fileNames.slice(0, 5).join(", ")}${fileNames.length > 5 ? ` and ${fileNames.length - 5} more...` : ""}`
      ],
      duration: 5000
    });
  }

  notifyMixedContent(candidate, addToast);
  return { accepted: true, key: resolvedKey };
};
