import { useDeferredValue, useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { ReviewCanvas } from "../components/ReviewCanvas";
import { useStore } from "../store";
import type { ReviewFileStatusFilter, ReviewType, ReviewWarningSummary } from "../types";
import type { FolderIntakeCandidate } from "../utils/folder";
import {
  buildReviewDataset,
  type ReviewClassCatalogEntry,
  type ReviewDatasetRecord,
  type ReviewDatasetResult
} from "../utils/reviewDataset";
import {
  buildReviewDetectionSummary,
  buildReviewNavigation,
  buildReviewRecordErrorMessages,
  getReviewSelectedFilename
} from "../utils/reviewDetail";
import {
  discoverReviewSupportFromImageFolder,
  filesFromDroppedFilesForReviewIntake,
  filesFromInputForReviewIntake,
  getDroppedReviewDirectories,
  getReviewFolderEmptyStateMessage,
  getReviewFolderFormatLabel,
  isReviewFolderCandidateCompatible,
  pickReviewDirectoryForIntake,
  scanDirectoryEntryForReviewIntake,
  type ReviewFolderRole,
  type ReviewSupportDiscovery,
  type ReviewSupportSuggestion
} from "../utils/reviewFolderIntake";

type ReviewEmptyState = {
  title: string;
  description: string;
};

type ReviewInfoChip = {
  label: string;
  tone: "neutral" | "success" | "warning" | "danger";
};

const REVIEW_FILTER_CONFIG: Array<{ status: ReviewFileStatusFilter; testId: string }> = [
  { status: "matched", testId: "review-filter-matched" },
  { status: "unmatched", testId: "review-filter-unmatched" },
  { status: "invalid", testId: "review-filter-invalid" }
];

const REVIEW_STATUS_ORDER: ReviewFileStatusFilter[] = REVIEW_FILTER_CONFIG.map(({ status }) => status);

const EMPTY_WARNING_SUMMARY: ReviewWarningSummary = {
  matched: 0,
  unmatched: 0,
  invalid: 0,
  messages: []
};

const EMPTY_CLASS_CATALOG: ReviewClassCatalogEntry[] = [];

const getRoleLabel = (role: ReviewFolderRole): string => {
  return role === "images" ? "Image Folder" : "Annotation Folder";
};

const getRoleConsoleLabel = (role: ReviewFolderRole): string => {
  return role === "images" ? "Images" : "Annotations";
};

const getRoleActionLabel = (hasFolder: boolean): string => {
  if (hasFolder) {
    return "Change";
  }
  return "Select";
};

const getRoleHelperText = (
  role: ReviewFolderRole,
  reviewType: ReviewType,
  hasFolder: boolean,
  annotationMismatchMessage: string | null = null
): string => {
  if (hasFolder) {
    if (role === "images") {
      return "Source imagery is ready for pairing and canvas review.";
    }

    return reviewType === "detection"
      ? "YOLO labels will be matched to images by basename."
      : "Mask images will be matched to source files by basename.";
  }

  if (role === "images") {
    return "Load the source images that should appear on the review canvas. Drop a folder or select image files to begin.";
  }

  if (annotationMismatchMessage) {
    return annotationMismatchMessage;
  }

  return reviewType === "detection"
    ? "Choose YOLO .txt labels and optional classes.txt metadata. You can also drop classes.yaml metadata when it is available."
    : "Choose segmentation mask images that match the source images. Optional .seg.json sidecars can be dropped alongside the masks.";
};

const getRoleStateMeta = (params: {
  role: ReviewFolderRole;
  hasFolder: boolean;
  annotationMismatchMessage: string | null;
}): { label: string; tone: ReviewInfoChip["tone"] } => {
  const { role, hasFolder, annotationMismatchMessage } = params;

  if (hasFolder) {
    return { label: "Loaded", tone: "success" };
  }

  if (role === "annotations" && annotationMismatchMessage) {
    return { label: "Mismatch", tone: "warning" };
  }

  return { label: "Required", tone: "neutral" };
};

type ReviewHeaderStatus = {
  label: string;
  description: string;
  tone: ReviewInfoChip["tone"];
};

type ReviewAnnotationMismatchNotice = {
  reviewType: ReviewType;
  folderName: string;
  message: string;
};

const formatReviewTypeLabel = (reviewType: ReviewType): string => {
  return reviewType === "detection" ? "Detection" : "Segmentation";
};

const toggleNumberInList = (items: number[], target: number): number[] => {
  if (items.includes(target)) {
    return items.filter((item) => item !== target);
  }

  return [...items, target].sort((left, right) => left - right);
};

const areNumberListsEqual = (left: number[], right: number[]): boolean => {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((value, index) => value === right[index]);
};

const formatClassCountLabel = (count: number): string => {
  return `${count} class${count === 1 ? "" : "es"}`;
};

const formatSupportSummary = (suggestion: ReviewSupportSuggestion): string => {
  const parts = [
    `${suggestion.matchedBasenameCount} match${suggestion.matchedBasenameCount === 1 ? "" : "es"}`,
    `${suggestion.acceptedFileCount} file${suggestion.acceptedFileCount === 1 ? "" : "s"}`,
    suggestion.hasMetadata ? "metadata" : "no metadata"
  ];

  return parts.join(" \u00b7 ");
};

const buildWarningSummary = (params: {
  imageFolder: FolderIntakeCandidate | null;
  annotationFolder: FolderIntakeCandidate | null;
  annotationMismatchMessage: string | null;
  dataset: ReviewDatasetResult | null;
  reviewType: ReviewType;
  datasetError: string | null;
  isBuildingDataset: boolean;
}): ReviewWarningSummary => {
  const {
    imageFolder,
    annotationFolder,
    annotationMismatchMessage,
    dataset,
    reviewType,
    datasetError,
    isBuildingDataset
  } = params;

  const messages: string[] = [];
  if (!imageFolder) {
    messages.push("Select an image folder to load reviewable source files.");
  }
  if (!annotationFolder) {
    messages.push(annotationMismatchMessage ?? (
      reviewType === "detection"
        ? "Select an annotation folder with YOLO .txt labels and optional classes.txt or classes.yaml metadata."
        : "Select an annotation folder with supported image masks and optional .seg.json sidecars that match the source images."
    ));
  }
  if (isBuildingDataset && imageFolder && annotationFolder) {
    messages.push("Preparing review dataset from the selected folders.");
  }
  if (datasetError) {
    messages.push(datasetError);
  }

  if (dataset) {
    if (dataset.mode === "detection" && !dataset.hasClassesMetadata) {
      messages.push("classes metadata was not provided, so detection overlays will show numeric class IDs.");
    }
    if (dataset.summary.unmatched > 0) {
      messages.push(`${dataset.summary.unmatched} file${dataset.summary.unmatched > 1 ? "s are" : " is"} missing an image or annotation partner.`);
    }
    if (dataset.summary.invalid > 0) {
      messages.push(`${dataset.summary.invalid} file${dataset.summary.invalid > 1 ? "s have" : " has"} validation issues and remain listed without blocking the rest of the dataset.`);
    }
    if (dataset.records.length === 0) {
      messages.push(
        reviewType === "detection"
          ? "No reviewable basenames were found. Detection annotations must be YOLO .txt files named after the source images."
          : "No reviewable basenames were found. Segmentation annotations must be supported image masks named after the source images."
      );
    } else if (dataset.summary.matched === 0 && dataset.summary.invalid > 0 && dataset.summary.unmatched === 0) {
      messages.push("Every paired file is currently invalid, so nothing can be reviewed on the canvas yet.");
    } else if (dataset.summary.matched === 0) {
      messages.push("No matched image and annotation pairs are ready for review yet.");
    }
  }

  return {
    matched: dataset?.summary.matched ?? 0,
    unmatched: dataset?.summary.unmatched ?? 0,
    invalid: dataset?.summary.invalid ?? 0,
    messages
  };
};

const buildReviewSourceCaption = (params: {
  imageFolder: FolderIntakeCandidate | null;
  annotationFolder: FolderIntakeCandidate | null;
  annotationMismatchMessage: string | null;
  reviewType: ReviewType;
}): string => {
  const { imageFolder, annotationFolder, annotationMismatchMessage, reviewType } = params;

  if (imageFolder && annotationFolder) {
    return reviewType === "detection"
      ? "Images and YOLO annotations will be paired automatically by basename."
      : "Images and mask annotations will be paired automatically by basename.";
  }

  if (imageFolder && annotationMismatchMessage) {
    return "Replace the annotation folder with a compatible source to continue review.";
  }

  if (imageFolder || annotationFolder) {
    return "Add the remaining folder to complete a reviewable dataset.";
  }

  return "Load source images and matching annotations to prepare reviewable pairs.";
};

const buildReviewHeaderStatus = (params: {
  imageFolder: FolderIntakeCandidate | null;
  annotationFolder: FolderIntakeCandidate | null;
  annotationMismatchMessage: string | null;
  dataset: ReviewDatasetResult | null;
  reviewType: ReviewType;
  datasetError: string | null;
  isBuildingDataset: boolean;
}): ReviewHeaderStatus => {
  const {
    imageFolder,
    annotationFolder,
    annotationMismatchMessage,
    dataset,
    reviewType,
    datasetError,
    isBuildingDataset
  } = params;

  if (datasetError) {
    return {
      label: "Dataset error",
      description: datasetError,
      tone: "danger"
    };
  }

  if (isBuildingDataset && imageFolder && annotationFolder) {
    return {
      label: "Preparing",
      description: "Pairing files and validating annotations for the next review pass.",
      tone: "neutral"
    };
  }

  if (!imageFolder && !annotationFolder) {
    return {
      label: "Waiting for sources",
      description: "Load both folders to unlock the file list, status counts, and overlay canvas.",
      tone: "neutral"
    };
  }

  if (!imageFolder) {
    return {
      label: "Waiting for images",
      description: "Add the image folder to provide the source imagery for review.",
      tone: "neutral"
    };
  }

  if (!annotationFolder) {
    if (annotationMismatchMessage) {
      return {
        label: "Wrong annotation folder",
        description: annotationMismatchMessage,
        tone: "warning"
      };
    }

    return {
      label: "Waiting for annotations",
      description: reviewType === "detection"
        ? "Add the annotation folder with YOLO labels to complete matching."
        : "Add the annotation folder with masks to complete matching.",
      tone: "neutral"
    };
  }

  if (dataset && dataset.summary.matched > 0) {
    return {
      label: "Ready to review",
      description: dataset.summary.invalid > 0 || dataset.summary.unmatched > 0
        ? "Matched files are ready now while incomplete items remain visible for cleanup."
        : "Matched files are ready on the canvas with no blocking issues detected.",
      tone: "success"
    };
  }

  if (dataset && dataset.summary.invalid > 0) {
    return {
      label: "Needs attention",
      description: "Fix the current validation issues to unlock reviewable pairs.",
      tone: "warning"
    };
  }

  return {
    label: "Needs attention",
    description: "No matched source and annotation pairs are ready yet.",
    tone: "warning"
  };
};

const buildEmptyState = (params: {
  imageFolder: FolderIntakeCandidate | null;
  annotationFolder: FolderIntakeCandidate | null;
  annotationMismatchMessage: string | null;
  dataset: ReviewDatasetResult | null;
  reviewType: ReviewType;
  visibleRecords: ReviewDatasetRecord[];
  searchQuery: string;
  showOnlySelectedClasses: boolean;
  selectedClassCount: number;
  activeFilter: ReviewFileStatusFilter;
  datasetError: string | null;
  isBuildingDataset: boolean;
}): ReviewEmptyState | null => {
  const {
    imageFolder,
    annotationFolder,
    annotationMismatchMessage,
    dataset,
    reviewType,
    visibleRecords,
    searchQuery,
    showOnlySelectedClasses,
    selectedClassCount,
    activeFilter,
    datasetError,
    isBuildingDataset
  } = params;

  if (!imageFolder) {
    return {
      title: "Load an image folder to begin review",
      description: "Review mode needs source imagery before it can pair annotations, build statuses, or render the overlay canvas."
    };
  }

  if (!annotationFolder) {
    return {
      title: annotationMismatchMessage ? "Load a compatible annotation folder to continue" : "Load an annotation folder to continue",
      description: annotationMismatchMessage ?? (
        reviewType === "detection"
          ? "Choose YOLO label files and optional classes.txt or classes.yaml metadata so compareX can build detection review pairs."
          : "Choose a mask folder with supported image files and optional .seg.json sidecars whose basenames match the source images."
      )
    };
  }

  if (isBuildingDataset) {
    return {
      title: "Preparing review dataset",
      description: "compareX is pairing source images with annotations and validating the current review folder roles."
    };
  }

  if (datasetError) {
    return {
      title: "Review dataset could not be prepared",
      description: datasetError
    };
  }

  if (!dataset || dataset.records.length === 0) {
    return {
      title: "Nothing is reviewable yet",
      description: reviewType === "detection"
        ? "No matching image and YOLO annotation basenames were found in the selected folders."
        : "No matching image and mask basenames were found in the selected folders."
    };
  }

  if (visibleRecords.length > 0) {
    return null;
  }

  if (dataset.summary.matched === 0 && dataset.summary.invalid > 0 && dataset.summary.unmatched === 0) {
    return {
      title: "Only invalid pairs were found",
      description: "The selected image and annotation files pair by basename, but every pair failed validation so the review canvas has nothing ready to inspect."
    };
  }

  if (dataset.summary.matched === 0) {
    return {
      title: "No matched files are ready for review",
      description: "The file list still shows unmatched or invalid entries so you can identify why the dataset is not reviewable yet."
    };
  }

  return {
    title: `No ${activeFilter} records in the current view`,
    description: searchQuery.trim().length > 0
      ? `No ${activeFilter} files match "${searchQuery.trim()}". Adjust the search or switch status filters to continue.`
      : showOnlySelectedClasses && selectedClassCount > 0
        ? "No records match the currently selected class filter. Clear or widen the class selection to continue."
      : `There are no ${activeFilter} files available with the current dataset selection.`
  };
};

const formatStatusLabel = (status: ReviewFileStatusFilter): string => {
  return status.charAt(0).toUpperCase() + status.slice(1);
};

const formatFolderStats = (candidate: FolderIntakeCandidate | null): ReviewInfoChip[] => {
  if (!candidate) {
    return [];
  }

  const chips: ReviewInfoChip[] = [];
  chips.push({
    label: `${candidate.data.files.size} file${candidate.data.files.size === 1 ? "" : "s"}`,
    tone: "success"
  });

  const skipped = candidate.stats.unsupportedFileCount + candidate.stats.unreadableFileCount;
  if (skipped > 0) {
    chips.push({
      label: `${skipped} skipped`,
      tone: "warning"
    });
  }

  return chips;
};

const buildRecordSearchHaystack = (
  record: ReviewDatasetRecord,
  classCatalogById: Map<number, ReviewClassCatalogEntry>
): string => {
  return [
    record.basename,
    record.sourceImageName,
    record.annotationName,
    ...record.classIds.map((classId) => classCatalogById.get(classId)?.label ?? String(classId)),
    ...record.validation.reasons.map((reason) => reason.message)
  ]
    .filter((value): value is string => Boolean(value))
    .join(" ")
    .toLowerCase();
};

const buildSelectedRecordClassSummary = (
  record: ReviewDatasetRecord | null,
  reviewType: ReviewType,
  classCatalogById: Map<number, ReviewClassCatalogEntry>
): string => {
  if (!record) {
    return "No review record selected.";
  }

  if (record.classIds.length === 0) {
    if (record.status === "unmatched") {
      return reviewType === "detection"
        ? "No class information is available until a matching YOLO label is present."
        : "No class information is available until a matching segmentation mask is present.";
    }

    if (record.status === "invalid") {
      return "Class coverage is unavailable because the selected record failed validation.";
    }

    return "No class information is available for the selected record.";
  }

  const labels = record.classIds.map((classId) => classCatalogById.get(classId)?.label ?? String(classId));
  const sidecarState = record.segmentation?.sidecarState;
  const activeClassLabel = sidecarState?.activeClassId !== null && sidecarState?.activeClassId !== undefined
    ? classCatalogById.get(sidecarState.activeClassId)?.label ?? String(sidecarState.activeClassId)
    : null;
  const hiddenCount = sidecarState?.hiddenClassIds.length ?? 0;

  return `${formatClassCountLabel(record.classIds.length)} · ${labels.join(", ")}${activeClassLabel ? ` · active ${activeClassLabel}` : ""}${hiddenCount > 0 ? ` · ${hiddenCount} hidden in sidecar` : ""}`;
};

const isEditableReviewNavigationTarget = (target: EventTarget | null): boolean => {
  if (typeof Element === "undefined" || !(target instanceof Element)) {
    return false;
  }

  if (target.closest("input, select, textarea")) {
    return true;
  }

  const editableElement = target.closest("[contenteditable]");
  if (!editableElement) {
    return false;
  }

  const contentEditableValue = editableElement.getAttribute("contenteditable");
  return contentEditableValue !== "false";
};

const getReviewKeyboardDirection = (event: KeyboardEvent): "previous" | "next" | null => {
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
    return null;
  }

  switch (event.key) {
    case "ArrowLeft":
    case "ArrowUp":
      return "previous";
    case "ArrowRight":
    case "ArrowDown":
      return "next";
    default:
      return null;
  }
};

export const ReviewMode = () => {
  const reviewType = useStore((state) => state.reviewType);
  const reviewFileStatusFilter = useStore((state) => state.reviewFileStatusFilter);
  const reviewHasClassesMetadata = useStore((state) => state.reviewHasClassesMetadata);
  const selectedReviewItemId = useStore((state) => state.selectedReviewItemId);
  const showFilelist = useStore((state) => state.showFilelist);
  const setReviewFileStatusFilter = useStore((state) => state.setReviewFileStatusFilter);
  const setReviewHasClassesMetadata = useStore((state) => state.setReviewHasClassesMetadata);
  const setReviewWarningSummary = useStore((state) => state.setReviewWarningSummary);
  const setSelectedReviewItemId = useStore((state) => state.setSelectedReviewItemId);
  const addToast = useStore((state) => state.addToast);

  const [imageFolder, setImageFolder] = useState<FolderIntakeCandidate | null>(null);
  const [annotationFolder, setAnnotationFolder] = useState<FolderIntakeCandidate | null>(null);
  const [annotationMismatchNotice, setAnnotationMismatchNotice] = useState<ReviewAnnotationMismatchNotice | null>(null);
  const [datasetResult, setDatasetResult] = useState<ReviewDatasetResult | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [classSearchQuery, setClassSearchQuery] = useState("");
  const deferredClassSearchQuery = useDeferredValue(classSearchQuery);
  const [selectedClassIds, setSelectedClassIds] = useState<number[]>([]);
  const [hiddenClassIds, setHiddenClassIds] = useState<number[]>([]);
  const [activeClassId, setActiveClassId] = useState<number | null>(null);
  const [showOnlyRecordsWithSelectedClasses, setShowOnlyRecordsWithSelectedClasses] = useState(false);
  const [supportDiscovery, setSupportDiscovery] = useState<ReviewSupportDiscovery | null>(null);
  const [isDiscoveringSupport, setIsDiscoveringSupport] = useState(false);
  const [dragOverRole, setDragOverRole] = useState<ReviewFolderRole | null>(null);
  const [datasetError, setDatasetError] = useState<string | null>(null);
  const [isBuildingDataset, setIsBuildingDataset] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const annotationInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    document.body.classList.remove("viewer-dragging");
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }, []);

  const activeAnnotationFolder = useMemo(() => {
    if (!annotationFolder) {
      return null;
    }

    return isReviewFolderCandidateCompatible(annotationFolder, "annotations", reviewType)
      ? annotationFolder
      : null;
  }, [annotationFolder, reviewType]);

  const activeAnnotationMismatchMessage = annotationMismatchNotice?.reviewType === reviewType
    ? annotationMismatchNotice.message
    : null;
  const activeDatasetResult = imageFolder && activeAnnotationFolder ? datasetResult : null;
  const classCatalog = activeDatasetResult?.classCatalog ?? EMPTY_CLASS_CATALOG;
  const classCatalogById = useMemo(() => {
    return new Map(classCatalog.map((entry) => [entry.id, entry] as [number, ReviewClassCatalogEntry]));
  }, [classCatalog]);
  const selectedClassIdSet = useMemo(() => new Set(selectedClassIds), [selectedClassIds]);
  const hiddenClassIdSet = useMemo(() => new Set(hiddenClassIds), [hiddenClassIds]);
  const visibleClassIds = useMemo(() => {
    return classCatalog
      .map((entry) => entry.id)
      .filter((classId) => !hiddenClassIdSet.has(classId));
  }, [classCatalog, hiddenClassIdSet]);
  const filteredClassCatalog = useMemo(() => {
    const query = deferredClassSearchQuery.trim().toLowerCase();
    if (!query) {
      return classCatalog;
    }

    return classCatalog.filter((entry) => {
      return entry.label.toLowerCase().includes(query) || String(entry.id).includes(query);
    });
  }, [classCatalog, deferredClassSearchQuery]);

  const warningSummary = useMemo(() => {
    return buildWarningSummary({
      imageFolder,
      annotationFolder: activeAnnotationFolder,
      annotationMismatchMessage: activeAnnotationMismatchMessage,
      dataset: activeDatasetResult,
      reviewType,
      datasetError,
      isBuildingDataset
    });
  }, [
    activeAnnotationFolder,
    activeAnnotationMismatchMessage,
    activeDatasetResult,
    datasetError,
    imageFolder,
    isBuildingDataset,
    reviewType
  ]);

  const visibleRecords = useMemo(() => {
    if (!activeDatasetResult) {
      return [];
    }

    const query = deferredSearchQuery.trim().toLowerCase();
    const shouldFilterBySelectedClasses = showOnlyRecordsWithSelectedClasses && selectedClassIds.length > 0;

    return activeDatasetResult.records.filter((record) => {
      if (record.status !== reviewFileStatusFilter) {
        return false;
      }

      if (shouldFilterBySelectedClasses) {
        const matchesSelectedClass = record.classIds.some((classId) => selectedClassIdSet.has(classId));
        if (!matchesSelectedClass) {
          return false;
        }
      }

      if (!query) {
        return true;
      }

      const haystack = buildRecordSearchHaystack(record, classCatalogById);

      return haystack.includes(query);
    });
  }, [
    activeDatasetResult,
    classCatalogById,
    deferredSearchQuery,
    reviewFileStatusFilter,
    selectedClassIdSet,
    selectedClassIds.length,
    showOnlyRecordsWithSelectedClasses
  ]);

  const navigation = useMemo(() => {
    return buildReviewNavigation(visibleRecords, selectedReviewItemId);
  }, [selectedReviewItemId, visibleRecords]);

  const selectedRecord = navigation.selectedRecord;

  const selectedFilename = useMemo(() => getReviewSelectedFilename(selectedRecord), [selectedRecord]);

  const detectionSummary = useMemo(() => {
    return buildReviewDetectionSummary(selectedRecord, { visibleClassIds });
  }, [selectedRecord, visibleClassIds]);

  const selectedRecordClassSummary = useMemo(() => {
    return buildSelectedRecordClassSummary(selectedRecord, reviewType, classCatalogById);
  }, [classCatalogById, reviewType, selectedRecord]);

  const supportSuggestions = supportDiscovery?.kind === "available"
    ? supportDiscovery.suggestions
    : [];
  const hasSupportSuggestions = supportSuggestions.length > 0;
  const supportDiscoveryMessage = supportDiscovery?.kind === "unavailable"
    ? supportDiscovery.message
    : null;

  const selectedRecordErrors = useMemo(() => buildReviewRecordErrorMessages(selectedRecord), [selectedRecord]);

  const emptyState = useMemo(() => {
    return buildEmptyState({
      imageFolder,
      annotationFolder: activeAnnotationFolder,
      annotationMismatchMessage: activeAnnotationMismatchMessage,
      dataset: activeDatasetResult,
      reviewType,
      visibleRecords,
      searchQuery,
      showOnlySelectedClasses: showOnlyRecordsWithSelectedClasses,
      selectedClassCount: selectedClassIds.length,
      activeFilter: reviewFileStatusFilter,
      datasetError,
      isBuildingDataset
    });
  }, [
    activeAnnotationFolder,
    activeAnnotationMismatchMessage,
    activeDatasetResult,
    datasetError,
    imageFolder,
    isBuildingDataset,
    reviewFileStatusFilter,
    reviewType,
    searchQuery,
    selectedClassIds.length,
    showOnlyRecordsWithSelectedClasses,
    visibleRecords
  ]);

  const summaryMetaChips = useMemo(() => {
    const chips: ReviewInfoChip[] = [];

    if (isBuildingDataset && imageFolder && activeAnnotationFolder) {
      chips.push({ label: "Preparing dataset", tone: "neutral" });
    }

    if (datasetError) {
      chips.push({ label: "Dataset error", tone: "danger" });
    }

    if (activeAnnotationMismatchMessage) {
      chips.push({ label: "Annotation mismatch", tone: "warning" });
    }

    if (activeDatasetResult && activeDatasetResult.classCatalog.length > 0) {
      const classCount = activeDatasetResult.classCatalog.length;
      chips.push({
        label: `${classCount} classes`,
        tone: reviewType === "detection" && reviewHasClassesMetadata ? "success" : "neutral"
      });
    }

    if (reviewType === "detection" && reviewHasClassesMetadata) {
      chips.push({
        label: "Metadata loaded",
        tone: "success"
      });
    }

    return chips;
  }, [
    activeAnnotationFolder,
    activeAnnotationMismatchMessage,
    activeDatasetResult,
    datasetError,
    imageFolder,
    isBuildingDataset,
    reviewHasClassesMetadata,
    reviewType
  ]);

  const reviewSourceCaption = useMemo(() => {
    return buildReviewSourceCaption({
      imageFolder,
      annotationFolder: activeAnnotationFolder,
      annotationMismatchMessage: activeAnnotationMismatchMessage,
      reviewType
    });
  }, [activeAnnotationFolder, activeAnnotationMismatchMessage, imageFolder, reviewType]);

  const reviewHeaderStatus = useMemo(() => {
    return buildReviewHeaderStatus({
      imageFolder,
      annotationFolder: activeAnnotationFolder,
      annotationMismatchMessage: activeAnnotationMismatchMessage,
      dataset: activeDatasetResult,
      reviewType,
      datasetError,
      isBuildingDataset
    });
  }, [
    activeAnnotationFolder,
    activeAnnotationMismatchMessage,
    activeDatasetResult,
    datasetError,
    imageFolder,
    isBuildingDataset,
    reviewType
  ]);

  const reviewHeaderNotice = useMemo(() => {
    if (!warningSummary.messages[0]) {
      return null;
    }

    const shouldSurfaceNotice = Boolean(
      datasetError ||
      isBuildingDataset ||
      warningSummary.matched > 0 ||
      warningSummary.unmatched > 0 ||
      warningSummary.invalid > 0
    );

    if (!shouldSurfaceNotice) {
      return null;
    }

    return warningSummary.messages[0] === reviewHeaderStatus.description ? null : warningSummary.messages[0];
  }, [datasetError, isBuildingDataset, reviewHeaderStatus.description, warningSummary]);

  useEffect(() => {
    setReviewWarningSummary(warningSummary);
    setReviewHasClassesMetadata(activeDatasetResult?.hasClassesMetadata ?? false);
  }, [activeDatasetResult, setReviewHasClassesMetadata, setReviewWarningSummary, warningSummary]);

  useEffect(() => {
    const availableClassIds = new Set(classCatalog.map((entry) => entry.id));

    setSelectedClassIds((current) => {
      const next = current.filter((classId) => availableClassIds.has(classId));
      return areNumberListsEqual(current, next) ? current : next;
    });
    setHiddenClassIds((current) => {
      const next = current.filter((classId) => availableClassIds.has(classId));
      return areNumberListsEqual(current, next) ? current : next;
    });
    setActiveClassId((current) => {
      if (current === null) {
        return null;
      }
      return availableClassIds.has(current) ? current : null;
    });
  }, [classCatalog]);

  useEffect(() => {
    if (selectedClassIds.length > 0) {
      return;
    }

    setShowOnlyRecordsWithSelectedClasses(false);
  }, [selectedClassIds]);

  useEffect(() => {
    let cancelled = false;

    if (!imageFolder) {
      setSupportDiscovery(null);
      setIsDiscoveringSupport(false);
      return () => {
        cancelled = true;
      };
    }

    const discoverSupport = async () => {
      setIsDiscoveringSupport(true);

      try {
        const nextSupport = await discoverReviewSupportFromImageFolder(imageFolder);
        if (!cancelled) {
          setSupportDiscovery(nextSupport);
        }
      } catch (error) {
        if (cancelled) {
          return;
        }

        setSupportDiscovery({
          kind: "unavailable",
          message: "Child folder support could not be inspected for the current image source."
        });
        addToast({
          type: "warning",
          title: "Support Discovery Failed",
          message: error instanceof Error
            ? error.message
            : "Child folder support could not be inspected for the current image source.",
          duration: 5000
        });
      } finally {
        if (!cancelled) {
          setIsDiscoveringSupport(false);
        }
      }
    };

    discoverSupport();

    return () => {
      cancelled = true;
    };
  }, [addToast, imageFolder]);

  useEffect(() => {
    if (!annotationFolder || activeAnnotationFolder) {
      return;
    }

    const folderName = annotationFolder.data.name;
    const message = getReviewFolderEmptyStateMessage({
      role: "annotations",
      reviewType,
      folderName,
      scannedEntryCount: annotationFolder.stats.scannedEntryCount
    });

    setAnnotationFolder(null);
    setAnnotationMismatchNotice({
      reviewType,
      folderName,
      message
    });
    addToast({
      type: "warning",
      title: "Annotation Folder Cleared",
      message,
      details: [getReviewFolderFormatLabel("annotations", reviewType)],
      duration: 5000
    });
  }, [activeAnnotationFolder, addToast, annotationFolder, reviewType]);

  useEffect(() => {
    let cancelled = false;

    if (!imageFolder || !activeAnnotationFolder) {
      setDatasetResult(null);
      setDatasetError(null);
      setIsBuildingDataset(false);
      return () => {
        cancelled = true;
      };
    }

    const buildDataset = async () => {
      setIsBuildingDataset(true);
      setDatasetError(null);

      try {
        const nextDataset = await buildReviewDataset({
          mode: reviewType,
          imageFiles: imageFolder.data.files,
          annotationFiles: activeAnnotationFolder.data.files
        });

        if (cancelled) {
          return;
        }

        setDatasetResult(nextDataset);
      } catch (error) {
        if (cancelled) {
          return;
        }

        const message = error instanceof Error
          ? `Failed to prepare review dataset: ${error.message}`
          : "Failed to prepare review dataset.";
        setDatasetResult(null);
        setDatasetError(message);
        addToast({
          type: "error",
          title: "Review Dataset Error",
          message,
          duration: 5000
        });
      } finally {
        if (!cancelled) {
          setIsBuildingDataset(false);
        }
      }
    };

    buildDataset();

    return () => {
      cancelled = true;
    };
  }, [activeAnnotationFolder, addToast, imageFolder, reviewType]);

  useEffect(() => {
    if (!activeDatasetResult) {
      return;
    }

    if (activeDatasetResult.summary[reviewFileStatusFilter] > 0 || activeDatasetResult.records.length === 0) {
      return;
    }

    const fallbackFilter = REVIEW_STATUS_ORDER.find((status) => activeDatasetResult.summary[status] > 0);
    if (fallbackFilter && fallbackFilter !== reviewFileStatusFilter) {
      setReviewFileStatusFilter(fallbackFilter);
    }
  }, [activeDatasetResult, reviewFileStatusFilter, setReviewFileStatusFilter]);

  useEffect(() => {
    const nextSelectedId = visibleRecords[0]?.basename ?? null;
    if (!selectedReviewItemId && nextSelectedId) {
      setSelectedReviewItemId(nextSelectedId);
      return;
    }

    const isSelectedVisible = visibleRecords.some((record) => record.basename === selectedReviewItemId);
    if (!isSelectedVisible) {
      setSelectedReviewItemId(nextSelectedId);
    }
  }, [selectedReviewItemId, setSelectedReviewItemId, visibleRecords]);

  useEffect(() => {
    return () => {
      setReviewHasClassesMetadata(false);
      setReviewWarningSummary(EMPTY_WARNING_SUMMARY);
      setSelectedReviewItemId(null);
    };
  }, [setReviewHasClassesMetadata, setReviewWarningSummary, setSelectedReviewItemId]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const direction = getReviewKeyboardDirection(event);
      if (!direction) {
        return;
      }

      if (isEditableReviewNavigationTarget(event.target)) {
        return;
      }

      const targetRecord = direction === "previous" ? navigation.previousRecord : navigation.nextRecord;
      if (!targetRecord) {
        return;
      }

      event.preventDefault();
      setSelectedReviewItemId(targetRecord.basename);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [navigation.nextRecord, navigation.previousRecord, setSelectedReviewItemId]);

  const clearAnnotationFolder = () => {
    setAnnotationFolder(null);
    setAnnotationMismatchNotice(null);
  };

  const handleFolderCandidate = (role: ReviewFolderRole, candidate: FolderIntakeCandidate | null) => {
    if (!candidate) {
      return;
    }

    const folderLabel = getRoleLabel(role);
    const acceptedCount = candidate.data.files.size;
    const details: string[] = [];
    if (candidate.stats.unsupportedFileCount > 0) {
      details.push(`${candidate.stats.unsupportedFileCount} unsupported file${candidate.stats.unsupportedFileCount > 1 ? "s" : ""} skipped`);
    }
    if (candidate.stats.unreadableFileCount > 0) {
      details.push(`${candidate.stats.unreadableFileCount} unreadable file${candidate.stats.unreadableFileCount > 1 ? "s" : ""} skipped`);
    }

    if (acceptedCount === 0) {
      const message = getReviewFolderEmptyStateMessage({
        role,
        reviewType,
        folderName: candidate.data.name,
        scannedEntryCount: candidate.stats.scannedEntryCount
      });

      if (role === "annotations") {
        clearAnnotationFolder();
        setAnnotationMismatchNotice({
          reviewType,
          folderName: candidate.data.name,
          message
        });
      }

      addToast({
        type: "warning",
        title: role === "annotations" ? "Annotation Folder Not Compatible" : `${folderLabel} Empty`,
        message,
        details: details.length > 0 ? details : [getReviewFolderFormatLabel(role, reviewType)],
        duration: 5000
      });
      return;
    }

    if (role === "images") {
      setImageFolder(candidate);
    } else {
      setAnnotationMismatchNotice(null);
      setAnnotationFolder(candidate);
    }

    addToast({
      type: details.length > 0 ? "warning" : "success",
      title: `${folderLabel} Loaded`,
      message: `Loaded ${acceptedCount} file${acceptedCount > 1 ? "s" : ""} from "${candidate.data.name}".`,
      details: details.length > 0 ? details : [getReviewFolderFormatLabel(role, reviewType)],
      duration: 4000
    });
  };

  const handlePickFolder = async (role: ReviewFolderRole) => {
    try {
      const candidate = await pickReviewDirectoryForIntake(role, reviewType);
      handleFolderCandidate(role, candidate);
    } catch (error) {
      const err = error as Error;
      if (err.name === "AbortError") {
        return;
      }

      const targetRef = role === "images" ? imageInputRef : annotationInputRef;
      targetRef.current?.click();
    }
  };

  const handleInputChange = (role: ReviewFolderRole, event: ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files) {
      return;
    }

    const candidate = filesFromInputForReviewIntake(event.target.files, role, reviewType);
    handleFolderCandidate(role, candidate);
    event.target.value = "";
  };

  const handleUseSupportSuggestion = (suggestion: ReviewSupportSuggestion) => {
    if (suggestion.mode !== reviewType) {
      addToast({
        type: "warning",
        title: "Review Type Mismatch",
        message: `"${suggestion.folderName}" is prepared for ${formatReviewTypeLabel(suggestion.mode)} review.`,
        details: [`Switch the review type to ${formatReviewTypeLabel(suggestion.mode)} to connect this folder.`],
        duration: 4500
      });
      return;
    }

    handleFolderCandidate("annotations", suggestion.candidate);
  };

  const handleSourceDragOver = (role: ReviewFolderRole, event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "copy";
    }
    setDragOverRole(role);
  };

  const handleSourceDragLeave = (role: ReviewFolderRole, event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (
      typeof Element !== "undefined"
      && event.relatedTarget instanceof Element
      && event.currentTarget.contains(event.relatedTarget)
    ) {
      return;
    }

    if (dragOverRole === role) {
      setDragOverRole(null);
    }
  };

  const handleSourceDrop = async (role: ReviewFolderRole, event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragOverRole(null);

    try {
      const directories = getDroppedReviewDirectories(event.dataTransfer?.items);
      if (directories.length > 0) {
        if (directories.length > 1) {
          addToast({
            type: "warning",
            title: "Multiple Folders Dropped",
            message: "Review mode accepts one source folder at a time, so only the first dropped folder was used.",
            duration: 4500
          });
        }

        const candidate = await scanDirectoryEntryForReviewIntake(directories[0] as FileSystemDirectoryEntry, role, reviewType);
        handleFolderCandidate(role, candidate);
        return;
      }

      const droppedFiles = Array.from(event.dataTransfer?.files ?? []);
      if (droppedFiles.length === 0) {
        addToast({
          type: "warning",
          title: "Nothing Dropped",
          message: "Drop a folder or relevant files onto the selected review source.",
          duration: 3500
        });
        return;
      }

      const candidate = filesFromDroppedFilesForReviewIntake(droppedFiles, role, reviewType);
      handleFolderCandidate(role, candidate);
    } catch (error) {
      addToast({
        type: "error",
        title: "Drop Import Failed",
        message: error instanceof Error
          ? error.message
          : "Dropped review source could not be loaded.",
        duration: 5000
      });
    }
  };

  const handleClassSelection = (classId: number) => {
    setActiveClassId(classId);
    setSelectedClassIds((current) => toggleNumberInList(current, classId));
  };

  const handleClassVisibility = (classId: number) => {
    setHiddenClassIds((current) => toggleNumberInList(current, classId));
  };

  const handleShowAllClasses = () => {
    setHiddenClassIds([]);
  };

  const handleShowOnlySelectedClasses = () => {
    if (selectedClassIds.length === 0) {
      return;
    }

    const selectedSet = new Set(selectedClassIds);
    setHiddenClassIds(
      classCatalog
        .map((entry) => entry.id)
        .filter((classId) => !selectedSet.has(classId))
    );
  };

  const handleClearClassFilters = () => {
    setClassSearchQuery("");
    setSelectedClassIds([]);
    setHiddenClassIds([]);
    setActiveClassId(null);
    setShowOnlyRecordsWithSelectedClasses(false);
  };

  const handleSelectAdjacentRecord = (direction: "previous" | "next") => {
    const targetRecord = direction === "previous" ? navigation.previousRecord : navigation.nextRecord;
    if (!targetRecord) {
      return;
    }

    setSelectedReviewItemId(targetRecord.basename);
  };

  const showSupportRail = Boolean(activeDatasetResult) || selectedRecordErrors.length > 0;

  return (
    <main className="review-mode" data-testid="review-mode-root">
      <section className="review-mode-panel">
        <header className="review-mode-panel-header review-top-strip">
          <div className="review-top-main">
            <div className="review-top-left">
              <div className="review-console-header">
                <div className="review-console-header-copy">
                  <span className="review-console-header-label">Sources</span>
                  <p className="review-console-header-caption">{reviewSourceCaption}</p>
                </div>

                <div className="review-console-sources">
                  {([
                    { role: "images", candidate: imageFolder },
                    { role: "annotations", candidate: activeAnnotationFolder }
                  ] as const).map(({ role, candidate }) => {
                    const folderStats = formatFolderStats(candidate);
                    const hasFolder = Boolean(candidate);
                    const annotationMismatchMessage = role === "annotations" ? activeAnnotationMismatchMessage : null;
                    const helperText = getRoleHelperText(role, reviewType, hasFolder, annotationMismatchMessage);
                    const stateMeta = getRoleStateMeta({ role, hasFolder, annotationMismatchMessage });

                    return (
                      <div
                        key={role}
                        className={`review-source-inline ${hasFolder ? "loaded" : "unloaded"} ${annotationMismatchMessage ? "has-warning" : ""} ${dragOverRole === role ? "is-drag-active" : ""}`}
                        data-testid={role === "images" ? "review-images-folder-control" : "review-annotations-folder-control"}
                        onDragOver={(event) => handleSourceDragOver(role, event)}
                        onDragLeave={(event) => handleSourceDragLeave(role, event)}
                        onDrop={(event) => {
                          void handleSourceDrop(role, event);
                        }}
                      >
                        <div className="review-source-inline-head">
                          <div className="review-source-inline-heading">
                            <span className="review-source-inline-label">{getRoleConsoleLabel(role)}</span>
                            <span className={`review-source-inline-state tone-${stateMeta.tone}`}>
                              {stateMeta.label}
                            </span>
                          </div>

                          <button
                            type="button"
                            className="controls-main-button review-folder-picker-button"
                            onClick={() => handlePickFolder(role)}
                          >
                            {getRoleActionLabel(hasFolder)}
                          </button>
                        </div>

                        <div className="review-source-inline-main">
                          <strong
                            className={`review-source-inline-name ${hasFolder ? "" : "is-placeholder"}`}
                            title={candidate?.data.name}
                          >
                            {candidate?.data.name ?? "No folder selected"}
                          </strong>
                          <p className="review-source-inline-helper">{helperText}</p>
                        </div>

                        {(folderStats.length > 0 || candidate) && (
                          <div className="review-source-inline-footer">
                            {folderStats.length > 0 ? (
                              <div className="review-source-inline-chips">
                                {folderStats.map((chip) => (
                                  <span
                                    key={`${role}-${chip.label}`}
                                    className={`review-inline-chip tone-${chip.tone}`}
                                  >
                                    {chip.label}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="review-source-inline-footer-spacer" />
                            )}

                            {candidate && (
                              <button
                                type="button"
                                className="review-folder-clear-button"
                                onClick={() => (role === "images" ? setImageFolder(null) : clearAnnotationFolder())}
                              >
                                Clear
                              </button>
                            )}
                          </div>
                        )}

                        {role === "images" && hasFolder && (isDiscoveringSupport || supportDiscoveryMessage) && (
                          <div className="review-source-inline-note-row" data-testid="review-image-support-discovery">
                            <span className="review-inline-chip tone-neutral">
                              {isDiscoveringSupport ? "Inspecting child folders" : "Child folder scan"}
                            </span>
                            <span className="review-source-inline-note">
                              {isDiscoveringSupport
                                ? "Checking immediate child folders for detection and segmentation-ready data."
                                : supportDiscoveryMessage}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {imageFolder && hasSupportSuggestions && (
                  <div className="review-source-support review-source-support-strip" data-testid="review-image-support-discovery">
                    <div className="review-source-support-head">
                      <span className="review-source-support-label">Child Folder Support</span>
                      <span className="review-source-support-caption">
                        Detection and segmentation-ready folders found directly under the selected image folder.
                      </span>
                    </div>

                    <div className="review-source-support-list">
                      {supportSuggestions.map((suggestion) => {
                        const isCurrentReview = suggestion.mode === reviewType;
                        const isReady = suggestion.matchedBasenameCount > 0;
                        const suggestionTone = isReady ? "success" : "warning";

                        return (
                          <div
                            key={suggestion.id}
                            className={`review-source-support-item ${isCurrentReview ? "is-current-review" : ""}`}
                            data-testid={`review-support-suggestion-${suggestion.id}`}
                          >
                            <span className={`review-inline-chip tone-${suggestionTone}`}>
                              {`${formatReviewTypeLabel(suggestion.mode)} ${isReady ? "available" : "found"}`}
                            </span>
                            <strong className="review-source-support-name">{suggestion.folderName}</strong>
                            <span className="review-source-support-meta">{formatSupportSummary(suggestion)}</span>
                            {isCurrentReview && (
                              <>
                                <span className="review-inline-chip tone-neutral">Current review</span>
                                <button
                                  type="button"
                                  className="review-source-support-action"
                                  onClick={() => handleUseSupportSuggestion(suggestion)}
                                  data-testid={`review-support-action-${suggestion.id}`}
                                >
                                  Use as annotations
                                </button>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <section className="review-warning-summary review-warning-summary-compact review-top-summary" data-testid="review-warning-summary">
              <div className="review-warning-summary-header">
                <div className="review-warning-summary-title">
                  <span className={`review-warning-summary-state tone-${reviewHeaderStatus.tone}`}>
                    {reviewHeaderStatus.label}
                  </span>
                  <h3>Dataset</h3>
                </div>
                <div className="review-warning-summary-counts">
                  {REVIEW_STATUS_ORDER.map((status) => (
                    <div
                      key={status}
                      className={`review-status-chip status-${status} ${warningSummary[status] > 0 ? "" : "is-empty"}`}
                    >
                      <span className="review-status-chip-label">{formatStatusLabel(status)}</span>
                      <strong className="review-status-chip-value">{warningSummary[status]}</strong>
                    </div>
                  ))}
                </div>
              </div>

              <p className="review-warning-summary-lede">{reviewHeaderStatus.description}</p>

              {summaryMetaChips.length > 0 && (
                <div className="review-warning-summary-meta">
                  {summaryMetaChips.map((chip) => (
                    <span key={chip.label} className={`review-inline-chip tone-${chip.tone}`}>
                      {chip.label}
                    </span>
                  ))}
                </div>
              )}

              {reviewHeaderNotice && (
                <p className="review-warning-summary-notice">{reviewHeaderNotice}</p>
              )}
            </section>
          </div>

          <div className="review-hidden-inputs" aria-hidden="true">
            <input
              ref={imageInputRef}
              type="file"
              multiple
              onChange={(event) => handleInputChange("images", event)}
              data-testid="review-images-input"
              {...({ webkitdirectory: "" } as any)}
            />
            <input
              ref={annotationInputRef}
              type="file"
              multiple
              onChange={(event) => handleInputChange("annotations", event)}
              data-testid="review-annotations-input"
              {...({ webkitdirectory: "" } as any)}
            />
          </div>
        </header>

        <div className={`review-mode-main ${showFilelist ? "" : "filelist-hidden"}`}>
          {showFilelist && (
            <aside className="filelist review-filelist" data-testid="review-filelist">
              <div className="filelist-header">
                <input
                  type="text"
                  placeholder="Search review files..."
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  disabled={!activeDatasetResult && !imageFolder && !activeAnnotationFolder}
                />
                <div className="review-filter-group">
                  {REVIEW_FILTER_CONFIG.map(({ status, testId }) => (
                    <button
                      key={status}
                      type="button"
                      className={`review-filter-button ${reviewFileStatusFilter === status ? "active" : ""}`}
                      onClick={() => setReviewFileStatusFilter(status)}
                      data-testid={testId}
                    >
                      {formatStatusLabel(status)}
                    </button>
                  ))}
                </div>
                <div className="filelist-options">
                  <div className="count">
                    Showing {visibleRecords.length} {reviewFileStatusFilter}
                    {showOnlyRecordsWithSelectedClasses && selectedClassIds.length > 0 ? " · class filtered" : ""}
                  </div>
                </div>
              </div>
              <ul>
                {visibleRecords.length === 0 ? (
                  <li className="empty-state">
                    <div className="empty-state-content">
                      <p>No {reviewFileStatusFilter} files to list</p>
                      <small>
                        {searchQuery.trim().length > 0
                          ? "Try a broader search or another status filter."
                          : "Load both review folders or switch the current status filter."}
                      </small>
                    </div>
                  </li>
                ) : (
                  visibleRecords.map((record) => (
                    <li
                      key={record.basename}
                      className={selectedRecord?.basename === record.basename ? "active" : ""}
                      onClick={() => setSelectedReviewItemId(record.basename)}
                    >
                      <div className="file-info">
                        <div className="file-name">{record.basename}</div>
                        <div className="file-source">
                          {record.sourceImageName ?? "No image"} · {record.annotationName ?? "No annotation"}
                        </div>
                      </div>
                      <span className={`review-status-badge status-${record.status}`}>{formatStatusLabel(record.status)}</span>
                    </li>
                  ))
                )}
              </ul>
            </aside>
          )}

          <section className="review-workspace">
            {emptyState ? (
              <section className="review-empty-state" data-testid="review-empty-state">
                <div className="review-empty-state-content">
                  <h3>{emptyState.title}</h3>
                  <p>{emptyState.description}</p>
                </div>
              </section>
            ) : (
              <section className={`review-detail-shell ${showSupportRail ? "" : "no-support-rail"}`}>
                <header className="review-detail-header">
                  <div className="review-detail-meta">
                    <span className="review-detail-eyebrow">Selected file</span>
                    <strong className="review-detail-filename" data-testid="review-selected-filename">{selectedFilename}</strong>
                    <p className="review-detail-subcopy">
                      {selectedRecord?.basename ?? "Review"} · {formatStatusLabel(selectedRecord?.status ?? reviewFileStatusFilter)}
                      {selectedRecord?.annotationName ? ` · ${selectedRecord.annotationName}` : ""}
                    </p>
                  </div>

                  <div className="review-detail-navigation">
                    <span className="review-detail-position">
                      {navigation.selectedIndex >= 0 ? `${navigation.selectedIndex + 1} / ${visibleRecords.length}` : `0 / ${visibleRecords.length}`}
                    </span>
                    <button
                      type="button"
                      className="controls-main-button"
                      onClick={() => handleSelectAdjacentRecord("previous")}
                      disabled={!navigation.previousRecord}
                      data-testid="review-prev-item"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      className="controls-main-button"
                      onClick={() => handleSelectAdjacentRecord("next")}
                      disabled={!navigation.nextRecord}
                      data-testid="review-next-item"
                    >
                      Next
                    </button>
                  </div>
                </header>

                <ReviewCanvas
                  record={selectedRecord}
                  reviewType={reviewType}
                  label={selectedRecord?.basename ?? "Review"}
                  visibleClassIds={visibleClassIds}
                />

                {showSupportRail && (
                  <aside className="review-detail-rail" data-testid="review-detail-rail">
                    <section className="review-class-explorer" data-testid="review-class-explorer">
                      <div className="review-class-explorer-header">
                        <div className="review-class-explorer-copy">
                          <h3>Class Explorer</h3>
                          <p>Filter visible overlays and optionally narrow the file list to selected classes.</p>
                        </div>
                        {activeClassId !== null && (
                          <span className="review-inline-chip tone-neutral">
                            {classCatalogById.get(activeClassId)?.label ?? String(activeClassId)}
                          </span>
                        )}
                      </div>

                      {classCatalog.length > 0 ? (
                        <>
                          <input
                            type="text"
                            className="review-class-search"
                            placeholder="Search classes..."
                            value={classSearchQuery}
                            onChange={(event) => setClassSearchQuery(event.target.value)}
                            data-testid="review-class-search"
                          />

                          <div className="review-class-actions">
                            <button
                              type="button"
                              className="controls-main-button"
                              onClick={handleShowAllClasses}
                              data-testid="review-class-show-all"
                            >
                              All
                            </button>
                            <button
                              type="button"
                              className="controls-main-button"
                              onClick={handleShowOnlySelectedClasses}
                              disabled={selectedClassIds.length === 0}
                              data-testid="review-class-only-selected"
                            >
                              Only selected
                            </button>
                            <button
                              type="button"
                              className="controls-main-button"
                              onClick={handleClearClassFilters}
                              data-testid="review-class-clear-filters"
                            >
                              Clear filters
                            </button>
                          </div>

                          <label className="review-class-record-filter">
                            <input
                              type="checkbox"
                              checked={showOnlyRecordsWithSelectedClasses && selectedClassIds.length > 0}
                              onChange={(event) => setShowOnlyRecordsWithSelectedClasses(event.target.checked)}
                              disabled={selectedClassIds.length === 0}
                              data-testid="review-class-record-filter-toggle"
                            />
                            <span>Show only records containing selected classes</span>
                          </label>

                          <ul className="review-class-list">
                            {filteredClassCatalog.map((entry) => {
                              const isSelected = selectedClassIdSet.has(entry.id);
                              const isHidden = hiddenClassIdSet.has(entry.id);
                              const isActive = activeClassId === entry.id;

                              return (
                                <li
                                  key={entry.id}
                                  className={`review-class-item ${isSelected ? "is-selected" : ""} ${isActive ? "is-active" : ""} ${isHidden ? "is-hidden" : ""}`}
                                  data-testid={`review-class-item-${entry.id}`}
                                >
                                  <button
                                    type="button"
                                    className="review-class-item-main"
                                    onClick={() => handleClassSelection(entry.id)}
                                  >
                                    <span className="review-class-item-label-row">
                                      <strong className="review-class-item-label">{entry.label}</strong>
                                      <span className="review-class-item-id">ID {entry.id}</span>
                                    </span>
                                    <span className="review-class-item-meta">
                                      {entry.recordCount} file{entry.recordCount === 1 ? "" : "s"}
                                      {entry.hasMetadata ? " · metadata" : " · inferred"}
                                    </span>
                                  </button>
                                  <button
                                    type="button"
                                    className="review-class-visibility-button"
                                    onClick={() => handleClassVisibility(entry.id)}
                                    data-testid={`review-class-visibility-${entry.id}`}
                                  >
                                    {isHidden ? "Show" : "Hide"}
                                  </button>
                                </li>
                              );
                            })}

                            {filteredClassCatalog.length === 0 && (
                              <li className="review-class-empty">No classes match the current class search.</li>
                            )}
                          </ul>
                        </>
                      ) : (
                        <p className="review-class-empty">
                          No class information is available for the current dataset yet.
                        </p>
                      )}
                    </section>

                    {selectedRecord && (
                      <section
                        className="review-detail-summary"
                        data-testid={reviewType === "detection" ? "review-detection-summary" : "review-selected-class-summary"}
                      >
                        <h3>{reviewType === "detection" ? "Detection Summary" : "Selected Classes"}</h3>
                        <p>{reviewType === "detection" ? detectionSummary : selectedRecordClassSummary}</p>
                      </section>
                    )}

                    {selectedRecordErrors.length > 0 && (
                      <section className="review-record-error" data-testid="review-record-error">
                        <div className="review-record-error-header">
                          <h3>{selectedRecord?.status === "invalid" ? "Selected annotation needs attention" : "Selected record is incomplete"}</h3>
                          <span className={`review-status-badge status-${selectedRecord?.status ?? reviewFileStatusFilter}`}>
                            {formatStatusLabel(selectedRecord?.status ?? reviewFileStatusFilter)}
                          </span>
                        </div>
                        <ul>
                          {selectedRecordErrors.map((message) => (
                            <li key={message}>{message}</li>
                          ))}
                        </ul>
                      </section>
                    )}
                  </aside>
                )}
              </section>
            )}
          </section>
        </div>
      </section>
    </main>
  );
};
