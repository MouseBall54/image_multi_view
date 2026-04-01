import type { ReviewType } from "../types";
import {
  createFolderIntakeCandidate,
  isImageFile,
  type FolderIntakeCandidate
} from "./folder";

export type ReviewFolderRole = "images" | "annotations";

const isDetectionAnnotationFile = (filename: string): boolean => {
  return filename.toLowerCase().endsWith(".txt");
};

const isAcceptedReviewFile = (filename: string, role: ReviewFolderRole, reviewType: ReviewType): boolean => {
  if (role === "images") {
    return isImageFile(filename);
  }

  if (reviewType === "detection") {
    return isDetectionAnnotationFile(filename);
  }

  return isImageFile(filename);
};

const inferFolderNameFromFileList = (fileList: FileList): string => {
  const firstFile = Array.from(fileList)[0];
  if (!firstFile) {
    return "Unknown";
  }

  const relativePath = firstFile.webkitRelativePath || firstFile.name;
  return relativePath.split("/")[0] || "Unknown";
};

export const getReviewFolderFormatLabel = (role: ReviewFolderRole, reviewType: ReviewType): string => {
  if (role === "images") {
    return "Supported image files";
  }

  if (reviewType === "detection") {
    return "YOLO .txt files plus optional classes.txt";
  }

  return "Supported image masks";
};

export async function pickReviewDirectoryForIntake(
  role: ReviewFolderRole,
  reviewType: ReviewType
): Promise<FolderIntakeCandidate> {
  const handle: FileSystemDirectoryHandle = await (window as Window & typeof globalThis & {
    showDirectoryPicker: () => Promise<FileSystemDirectoryHandle>;
  }).showDirectoryPicker();

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

    if (!isAcceptedReviewFile(name, role, reviewType)) {
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
    { kind: "picker", handle },
    { scannedEntryCount, unsupportedFileCount, unreadableFileCount }
  );
}

export function filesFromInputForReviewIntake(
  fileList: FileList,
  role: ReviewFolderRole,
  reviewType: ReviewType
): FolderIntakeCandidate | null {
  if (fileList.length === 0) {
    return null;
  }

  const files = new Map<string, File>();
  let unsupportedFileCount = 0;

  Array.from(fileList).forEach((file) => {
    if (isAcceptedReviewFile(file.name, role, reviewType)) {
      files.set(file.name, file);
      return;
    }
    unsupportedFileCount += 1;
  });

  return createFolderIntakeCandidate(
    inferFolderNameFromFileList(fileList),
    files.entries(),
    { kind: "files" },
    {
      scannedEntryCount: fileList.length,
      unsupportedFileCount,
      unreadableFileCount: 0
    }
  );
}
