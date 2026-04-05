import type { ReviewType } from "../types";
import {
  createFolderIntakeCandidate,
  isImageFile,
  type FolderIntakeCandidate,
  type FolderSource
} from "./folder";

export type ReviewFolderRole = "images" | "annotations";

export type ReviewSupportSuggestion = {
  id: string;
  mode: ReviewType;
  folderName: string;
  matchedBasenameCount: number;
  acceptedFileCount: number;
  hasMetadata: boolean;
  summary: string;
  candidate: FolderIntakeCandidate;
};

export type ReviewSupportDiscovery =
  | { kind: "available"; suggestions: ReviewSupportSuggestion[] }
  | { kind: "unavailable"; message: string };

type ReviewDirectoryScan = {
  name: string;
  source: FolderSource;
  files: Array<[string, File]>;
  scannedEntryCount: number;
  nonFileCount: number;
  unreadableFileCount: number;
};

const DETECTION_METADATA_FILENAMES = new Set(["classes.txt", "classes.yaml", "classes.yml"]);

const stripExtension = (filename: string): string => filename.replace(/\.[^/.]+$/, "");

const isDetectionMetadataFile = (filename: string): boolean => {
  return DETECTION_METADATA_FILENAMES.has(filename.toLowerCase());
};

const isDetectionAnnotationFile = (filename: string): boolean => {
  return filename.toLowerCase().endsWith(".txt") && !isDetectionMetadataFile(filename);
};

const isSegmentationSidecarFile = (filename: string): boolean => {
  return filename.toLowerCase().endsWith(".seg.json");
};

export const isAcceptedReviewFile = (filename: string, role: ReviewFolderRole, reviewType: ReviewType): boolean => {
  if (role === "images") {
    return isImageFile(filename);
  }

  if (reviewType === "detection") {
    return isDetectionAnnotationFile(filename) || isDetectionMetadataFile(filename);
  }

  return isImageFile(filename) || isSegmentationSidecarFile(filename);
};

const inferFolderNameFromFiles = (files: readonly File[], fallbackName = "Unknown"): string => {
  const firstFile = files[0];
  if (!firstFile) {
    return fallbackName;
  }

  const anyFile = firstFile as File & { path?: string };
  const rawPath = anyFile.path || firstFile.webkitRelativePath || firstFile.name;
  const normalized = rawPath.replace(/\\/g, "/");
  const firstSegment = normalized.split("/")[0]?.trim();
  if (!firstSegment || firstSegment === firstFile.name) {
    return fallbackName;
  }
  return firstSegment;
};

const getReviewAnnotationRequirement = (reviewType: ReviewType): string => {
  return reviewType === "detection"
    ? "YOLO .txt labels whose basenames match the source images"
    : "supported image masks and optional .seg.json sidecars whose basenames match the source images";
};

export const getReviewFolderFormatLabel = (role: ReviewFolderRole, reviewType: ReviewType): string => {
  if (role === "images") {
    return "Supported image files";
  }

  if (reviewType === "detection") {
    return "YOLO .txt files plus optional classes.txt or classes.yaml";
  }

  return "Supported image masks plus optional .seg.json sidecars";
};

export const getReviewFolderEmptyStateMessage = (params: {
  role: ReviewFolderRole;
  reviewType: ReviewType;
  folderName: string;
  scannedEntryCount?: number;
}): string => {
  const { role, reviewType, folderName, scannedEntryCount = 0 } = params;

  if (role === "images") {
    if (scannedEntryCount === 0) {
      return `Folder "${folderName}" is empty. Choose source images to start building the review dataset.`;
    }

    return `Folder "${folderName}" does not contain supported image files for review mode.`;
  }

  if (scannedEntryCount === 0) {
    return `Folder "${folderName}" is empty. Choose ${getReviewAnnotationRequirement(reviewType)}.`;
  }

  return reviewType === "detection"
    ? `Folder "${folderName}" does not contain YOLO .txt labels for detection review. Choose labels whose basenames match the source images.`
    : `Folder "${folderName}" does not contain supported image masks for segmentation review. Choose mask images whose basenames match the source images.`;
};

export const isReviewFolderCandidateCompatible = (
  candidate: FolderIntakeCandidate,
  role: ReviewFolderRole,
  reviewType: ReviewType
): boolean => {
  if (candidate.data.files.size === 0) {
    return false;
  }

  return Array.from(candidate.data.files.keys()).every((filename) => {
    return isAcceptedReviewFile(filename, role, reviewType);
  });
};

const buildCandidateFromDirectoryScan = (
  scan: ReviewDirectoryScan,
  role: ReviewFolderRole,
  reviewType: ReviewType
): FolderIntakeCandidate => {
  const acceptedFiles = scan.files.filter(([filename]) => isAcceptedReviewFile(filename, role, reviewType));
  const unsupportedFileCount = scan.nonFileCount + Math.max(scan.files.length - acceptedFiles.length, 0);

  return createFolderIntakeCandidate(
    scan.name,
    acceptedFiles,
    scan.source,
    {
      scannedEntryCount: scan.scannedEntryCount,
      unsupportedFileCount,
      unreadableFileCount: scan.unreadableFileCount
    }
  );
};

const readDirectoryHandleScan = async (handle: FileSystemDirectoryHandle): Promise<ReviewDirectoryScan> => {
  const files: Array<[string, File]> = [];
  let scannedEntryCount = 0;
  let nonFileCount = 0;
  let unreadableFileCount = 0;

  for await (const [name, entry] of (handle as any).entries()) {
    scannedEntryCount += 1;
    if (entry.kind !== "file") {
      nonFileCount += 1;
      continue;
    }

    try {
      const file = await entry.getFile();
      files.push([name, file]);
    } catch {
      unreadableFileCount += 1;
    }
  }

  return {
    name: handle.name,
    source: { kind: "picker", handle },
    files,
    scannedEntryCount,
    nonFileCount,
    unreadableFileCount
  };
};

const readDirectoryEntryEntries = async (
  entry: FileSystemDirectoryEntry
): Promise<FileSystemEntry[]> => {
  return new Promise((resolve, reject) => {
    const reader = entry.createReader();
    const collected: FileSystemEntry[] = [];

    const readNext = () => {
      reader.readEntries((entries) => {
        if (entries.length === 0) {
          resolve(collected);
          return;
        }

        collected.push(...entries);
        readNext();
      }, reject);
    };

    readNext();
  });
};

const readDirectoryEntryScan = async (entry: FileSystemDirectoryEntry): Promise<ReviewDirectoryScan> => {
  const entries = await readDirectoryEntryEntries(entry);
  const files: Array<[string, File]> = [];
  let scannedEntryCount = 0;
  let nonFileCount = 0;
  let unreadableFileCount = 0;

  for (const child of entries) {
    scannedEntryCount += 1;
    if (!child.isFile) {
      nonFileCount += 1;
      continue;
    }

    try {
      const file = await new Promise<File>((resolve, reject) => {
        (child as FileSystemFileEntry).file(resolve, reject);
      });
      files.push([child.name, file]);
    } catch {
      unreadableFileCount += 1;
    }
  }

  return {
    name: entry.name,
    source: { kind: "directory-entry", entry },
    files,
    scannedEntryCount,
    nonFileCount,
    unreadableFileCount
  };
};

export async function readDirectoryHandleForReviewIntake(
  handle: FileSystemDirectoryHandle,
  role: ReviewFolderRole,
  reviewType: ReviewType
): Promise<FolderIntakeCandidate> {
  const scan = await readDirectoryHandleScan(handle);
  return buildCandidateFromDirectoryScan(scan, role, reviewType);
}

export async function scanDirectoryEntryForReviewIntake(
  entry: FileSystemDirectoryEntry,
  role: ReviewFolderRole,
  reviewType: ReviewType
): Promise<FolderIntakeCandidate> {
  const scan = await readDirectoryEntryScan(entry);
  return buildCandidateFromDirectoryScan(scan, role, reviewType);
}

export async function pickReviewDirectoryForIntake(
  role: ReviewFolderRole,
  reviewType: ReviewType
): Promise<FolderIntakeCandidate> {
  const handle: FileSystemDirectoryHandle = await (window as Window & typeof globalThis & {
    showDirectoryPicker: () => Promise<FileSystemDirectoryHandle>;
  }).showDirectoryPicker();

  return readDirectoryHandleForReviewIntake(handle, role, reviewType);
}

export function filesFromInputForReviewIntake(
  fileList: FileList,
  role: ReviewFolderRole,
  reviewType: ReviewType
): FolderIntakeCandidate | null {
  if (fileList.length === 0) {
    return null;
  }

  return filesFromDroppedFilesForReviewIntake(Array.from(fileList), role, reviewType, inferFolderNameFromFiles(Array.from(fileList)));
}

export function filesFromDroppedFilesForReviewIntake(
  files: File[],
  role: ReviewFolderRole,
  reviewType: ReviewType,
  folderName = "Dropped files"
): FolderIntakeCandidate | null {
  if (files.length === 0) {
    return null;
  }

  const acceptedFiles = new Map<string, File>();
  let unsupportedFileCount = 0;

  files.forEach((file) => {
    if (isAcceptedReviewFile(file.name, role, reviewType)) {
      acceptedFiles.set(file.name, file);
      return;
    }
    unsupportedFileCount += 1;
  });

  return createFolderIntakeCandidate(
    inferFolderNameFromFiles(files, folderName),
    acceptedFiles.entries(),
    { kind: "files" },
    {
      scannedEntryCount: files.length,
      unsupportedFileCount,
      unreadableFileCount: 0
    }
  );
}

export const getDroppedReviewDirectories = (
  items: DataTransferItemList | null | undefined
): FileSystemDirectoryEntry[] => {
  if (!items) {
    return [];
  }

  const directories: FileSystemDirectoryEntry[] = [];

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    if (!item || item.kind !== "file") {
      continue;
    }

    try {
      const entry = item.webkitGetAsEntry?.() || (item as DataTransferItem & {
        getAsEntry?: () => FileSystemEntry | null;
      }).getAsEntry?.();
      if (entry?.isDirectory) {
        directories.push(entry as FileSystemDirectoryEntry);
      }
    } catch {
      continue;
    }
  }

  return directories;
};

const getCandidateMatchedBasenameCount = (
  candidate: FolderIntakeCandidate,
  mode: ReviewType,
  imageBasenames: Set<string>
): number => {
  const basenames = Array.from(candidate.data.files.keys())
    .filter((filename) => {
      if (mode === "detection") {
        return isDetectionAnnotationFile(filename);
      }
      return isImageFile(filename);
    })
    .map(stripExtension);

  let matchedCount = 0;
  basenames.forEach((basename) => {
    if (imageBasenames.has(basename)) {
      matchedCount += 1;
    }
  });
  return matchedCount;
};

const buildSupportSuggestionsFromScan = (
  scan: ReviewDirectoryScan,
  imageBasenames: Set<string>
): ReviewSupportSuggestion[] => {
  const suggestions: ReviewSupportSuggestion[] = [];
  const detectionCandidate = buildCandidateFromDirectoryScan(scan, "annotations", "detection");
  const segmentationCandidate = buildCandidateFromDirectoryScan(scan, "annotations", "segmentation");

  const detectionMatchedCount = getCandidateMatchedBasenameCount(detectionCandidate, "detection", imageBasenames);
  if (detectionCandidate.data.files.size > 0) {
    suggestions.push({
      id: `detection-${scan.name}`,
      mode: "detection",
      folderName: scan.name,
      matchedBasenameCount: detectionMatchedCount,
      acceptedFileCount: detectionCandidate.data.files.size,
      hasMetadata: Array.from(detectionCandidate.data.files.keys()).some((filename) => isDetectionMetadataFile(filename)),
      summary: detectionMatchedCount > 0
        ? `${detectionMatchedCount} image match${detectionMatchedCount === 1 ? "" : "es"} ready for detection review.`
        : "Detection label files were found, but none match the loaded image basenames yet.",
      candidate: detectionCandidate
    });
  }

  const segmentationMatchedCount = getCandidateMatchedBasenameCount(segmentationCandidate, "segmentation", imageBasenames);
  if (segmentationCandidate.data.files.size > 0) {
    suggestions.push({
      id: `segmentation-${scan.name}`,
      mode: "segmentation",
      folderName: scan.name,
      matchedBasenameCount: segmentationMatchedCount,
      acceptedFileCount: Array.from(segmentationCandidate.data.files.keys()).filter((filename) => isImageFile(filename)).length,
      hasMetadata: Array.from(segmentationCandidate.data.files.keys()).some((filename) => isSegmentationSidecarFile(filename)),
      summary: segmentationMatchedCount > 0
        ? `${segmentationMatchedCount} image match${segmentationMatchedCount === 1 ? "" : "es"} ready for segmentation review.`
        : "Segmentation mask files were found, but none match the loaded image basenames yet.",
      candidate: segmentationCandidate
    });
  }

  return suggestions;
};

const compareSupportSuggestions = (left: ReviewSupportSuggestion, right: ReviewSupportSuggestion): number => {
  if (left.matchedBasenameCount !== right.matchedBasenameCount) {
    return right.matchedBasenameCount - left.matchedBasenameCount;
  }
  if (left.mode !== right.mode) {
    return left.mode.localeCompare(right.mode);
  }
  return left.folderName.localeCompare(right.folderName);
};

export async function discoverReviewSupportFromImageFolder(
  imageFolder: FolderIntakeCandidate
): Promise<ReviewSupportDiscovery | null> {
  const source = imageFolder.data.source;
  if (!source) {
    return null;
  }

  if (source.kind === "files") {
    return {
      kind: "unavailable",
      message: "Folder-based suggestions unavailable for loose files."
    };
  }

  if (source.kind === "electron") {
    return {
      kind: "unavailable",
      message: "Folder-based suggestions are unavailable for this source."
    };
  }

  const imageBasenames = new Set(
    Array.from(imageFolder.data.files.keys())
      .filter((filename) => isImageFile(filename))
      .map(stripExtension)
  );

  const suggestions: ReviewSupportSuggestion[] = [];

  if (source.kind === "picker") {
    for await (const [, entry] of (source.handle as any).entries()) {
      if (entry.kind !== "directory") {
        continue;
      }

      const scan = await readDirectoryHandleScan(entry as FileSystemDirectoryHandle);
      suggestions.push(...buildSupportSuggestionsFromScan(scan, imageBasenames));
    }
  }

  if (source.kind === "directory-entry") {
    const entries = await readDirectoryEntryEntries(source.entry);
    for (const childEntry of entries) {
      if (!childEntry.isDirectory) {
        continue;
      }

      const scan = await readDirectoryEntryScan(childEntry as FileSystemDirectoryEntry);
      suggestions.push(...buildSupportSuggestionsFromScan(scan, imageBasenames));
    }
  }

  if (suggestions.length === 0) {
    return {
      kind: "unavailable",
      message: "No detection or segmentation-ready child folders were found directly under this image folder."
    };
  }

  return {
    kind: "available",
    suggestions: suggestions.sort(compareSupportSuggestions)
  };
}
