import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { ReviewCanvas } from "../components/ReviewCanvas";
import { useStore } from "../store";
import type { ReviewFileStatusFilter, ReviewType, ReviewWarningSummary } from "../types";
import type { FolderIntakeCandidate } from "../utils/folder";
import { buildReviewDataset, type ReviewDatasetRecord, type ReviewDatasetResult } from "../utils/reviewDataset";
import {
  buildReviewDetectionSummary,
  buildReviewNavigation,
  buildReviewRecordErrorMessages,
  getReviewSelectedFilename
} from "../utils/reviewDetail";
import {
  filesFromInputForReviewIntake,
  getReviewFolderFormatLabel,
  pickReviewDirectoryForIntake,
  type ReviewFolderRole
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

const buildWarningSummary = (params: {
  imageFolder: FolderIntakeCandidate | null;
  annotationFolder: FolderIntakeCandidate | null;
  dataset: ReviewDatasetResult | null;
  reviewType: ReviewType;
  datasetError: string | null;
  isBuildingDataset: boolean;
}): ReviewWarningSummary => {
  const { imageFolder, annotationFolder, dataset, reviewType, datasetError, isBuildingDataset } = params;

  const messages: string[] = [];
  if (!imageFolder) {
    messages.push("Select an image folder to load reviewable source files.");
  }
  if (!annotationFolder) {
    messages.push(
      reviewType === "detection"
        ? "Select an annotation folder with YOLO .txt labels and optional classes.txt metadata."
        : "Select an annotation folder with supported image masks that match the source images."
    );
  }
  if (isBuildingDataset && imageFolder && annotationFolder) {
    messages.push("Preparing review dataset from the selected folders.");
  }
  if (datasetError) {
    messages.push(datasetError);
  }

  if (dataset) {
    if (dataset.mode === "detection" && !dataset.hasClassesMetadata) {
      messages.push("classes.txt was not provided, so detection overlays will show numeric class IDs.");
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

const buildEmptyState = (params: {
  imageFolder: FolderIntakeCandidate | null;
  annotationFolder: FolderIntakeCandidate | null;
  dataset: ReviewDatasetResult | null;
  reviewType: ReviewType;
  visibleRecords: ReviewDatasetRecord[];
  searchQuery: string;
  activeFilter: ReviewFileStatusFilter;
  datasetError: string | null;
  isBuildingDataset: boolean;
}): ReviewEmptyState | null => {
  const {
    imageFolder,
    annotationFolder,
    dataset,
    reviewType,
    visibleRecords,
    searchQuery,
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
      title: "Load an annotation folder to continue",
      description: reviewType === "detection"
        ? "Choose YOLO label files and optional classes.txt metadata so compareX can build detection review pairs."
        : "Choose a mask folder with supported image files whose basenames match the source images."
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
  const [datasetResult, setDatasetResult] = useState<ReviewDatasetResult | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
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

  const warningSummary = useMemo(() => {
    return buildWarningSummary({
      imageFolder,
      annotationFolder,
      dataset: datasetResult,
      reviewType,
      datasetError,
      isBuildingDataset
    });
  }, [annotationFolder, datasetError, datasetResult, imageFolder, isBuildingDataset, reviewType]);

  const visibleRecords = useMemo(() => {
    if (!datasetResult) {
      return [];
    }

    const query = searchQuery.trim().toLowerCase();
    return datasetResult.records.filter((record) => {
      if (record.status !== reviewFileStatusFilter) {
        return false;
      }
      if (!query) {
        return true;
      }

      const haystack = [
        record.basename,
        record.sourceImageName,
        record.annotationName,
        ...record.validation.reasons.map((reason) => reason.message)
      ]
        .filter((value): value is string => Boolean(value))
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [datasetResult, reviewFileStatusFilter, searchQuery]);

  const navigation = useMemo(() => {
    return buildReviewNavigation(visibleRecords, selectedReviewItemId);
  }, [selectedReviewItemId, visibleRecords]);

  const selectedRecord = navigation.selectedRecord;

  const selectedFilename = useMemo(() => getReviewSelectedFilename(selectedRecord), [selectedRecord]);

  const detectionSummary = useMemo(() => buildReviewDetectionSummary(selectedRecord), [selectedRecord]);

  const selectedRecordErrors = useMemo(() => buildReviewRecordErrorMessages(selectedRecord), [selectedRecord]);

  const emptyState = useMemo(() => {
    return buildEmptyState({
      imageFolder,
      annotationFolder,
      dataset: datasetResult,
      reviewType,
      visibleRecords,
      searchQuery,
      activeFilter: reviewFileStatusFilter,
      datasetError,
      isBuildingDataset
    });
  }, [annotationFolder, datasetError, datasetResult, imageFolder, isBuildingDataset, reviewFileStatusFilter, reviewType, searchQuery, visibleRecords]);

  const summaryMetaChips = useMemo(() => {
    const chips: ReviewInfoChip[] = [];

    if (isBuildingDataset && imageFolder && annotationFolder) {
      chips.push({ label: "Preparing dataset", tone: "neutral" });
    }

    if (datasetError) {
      chips.push({ label: "Dataset error", tone: "danger" });
    }

    if (reviewType === "detection" && reviewHasClassesMetadata) {
      const classCount = datasetResult?.classes.length ?? 0;
      chips.push({
        label: classCount > 0 ? `${classCount} classes` : "classes.txt",
        tone: "success"
      });
    }

    return chips;
  }, [annotationFolder, datasetError, datasetResult?.classes.length, imageFolder, isBuildingDataset, reviewHasClassesMetadata, reviewType]);

  useEffect(() => {
    setReviewWarningSummary(warningSummary);
    setReviewHasClassesMetadata(datasetResult?.hasClassesMetadata ?? false);
  }, [datasetResult, setReviewHasClassesMetadata, setReviewWarningSummary, warningSummary]);

  useEffect(() => {
    let cancelled = false;

    if (!imageFolder || !annotationFolder) {
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
          annotationFiles: annotationFolder.data.files
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
  }, [addToast, annotationFolder, imageFolder, reviewType]);

  useEffect(() => {
    if (!datasetResult) {
      return;
    }

    if (datasetResult.summary[reviewFileStatusFilter] > 0 || datasetResult.records.length === 0) {
      return;
    }

    const fallbackFilter = REVIEW_STATUS_ORDER.find((status) => datasetResult.summary[status] > 0);
    if (fallbackFilter && fallbackFilter !== reviewFileStatusFilter) {
      setReviewFileStatusFilter(fallbackFilter);
    }
  }, [datasetResult, reviewFileStatusFilter, setReviewFileStatusFilter]);

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
      addToast({
        type: "warning",
        title: `${folderLabel} Empty`,
        message: `Folder "${candidate.data.name}" has no supported ${role === "images" ? "images" : "annotations"} for ${reviewType} review.`,
        details: details.length > 0 ? details : [getReviewFolderFormatLabel(role, reviewType)],
        duration: 5000
      });
      return;
    }

    if (role === "images") {
      setImageFolder(candidate);
    } else {
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

  const handleSelectAdjacentRecord = (direction: "previous" | "next") => {
    const targetRecord = direction === "previous" ? navigation.previousRecord : navigation.nextRecord;
    if (!targetRecord) {
      return;
    }

    setSelectedReviewItemId(targetRecord.basename);
  };

  const showSupportRail = (reviewType === "detection" && Boolean(selectedRecord)) || selectedRecordErrors.length > 0;

  return (
    <main className="review-mode" data-testid="review-mode-root">
      <section className="review-mode-panel">
        <header className="review-mode-panel-header review-top-strip">
          <div className="review-top-main">
            <div className="review-top-left">
              <div className="review-console-header">
                {([
                  { role: "images", candidate: imageFolder },
                  { role: "annotations", candidate: annotationFolder }
                ] as const).map(({ role, candidate }) => {
                  const folderStats = formatFolderStats(candidate);
                  const hasFolder = Boolean(candidate);

                  return (
                    <div
                      key={role}
                      className={`review-source-inline ${hasFolder ? "loaded" : "unloaded"}`}
                      data-testid={role === "images" ? "review-images-folder-control" : "review-annotations-folder-control"}
                    >
                      <div className="review-source-inline-actions">
                        <button
                          type="button"
                          className="controls-main-button review-folder-picker-button"
                          onClick={() => handlePickFolder(role)}
                        >
                          {getRoleActionLabel(hasFolder)}
                        </button>
                        {candidate && (
                          <button
                            type="button"
                            className="review-folder-clear-button"
                            onClick={() => (role === "images" ? setImageFolder(null) : setAnnotationFolder(null))}
                          >
                            Clear
                          </button>
                        )}
                      </div>

                      <div className="review-source-inline-main">
                        <div className="review-source-inline-heading">
                          <span className="review-source-inline-label">{getRoleConsoleLabel(role)}</span>
                        </div>

                        <strong
                          className={`review-source-inline-name ${hasFolder ? "" : "is-placeholder"}`}
                          title={candidate?.data.name}
                        >
                          {candidate?.data.name ?? "No folder selected"}
                        </strong>

                        {folderStats.length > 0 && (
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
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <section className="review-warning-summary review-warning-summary-compact review-top-summary" data-testid="review-warning-summary">
              <div className="review-warning-summary-header">
                <h3>Dataset</h3>
                <div className="review-warning-summary-counts">
                  {REVIEW_STATUS_ORDER.map((status) => (
                    <span
                      key={status}
                      className={`review-status-chip status-${status} ${warningSummary[status] > 0 ? "" : "is-empty"}`}
                    >
                      {formatStatusLabel(status)} {warningSummary[status]}
                    </span>
                  ))}
                </div>
              </div>

              {summaryMetaChips.length > 0 && (
                <div className="review-warning-summary-meta">
                  {summaryMetaChips.map((chip) => (
                    <span key={chip.label} className={`review-inline-chip tone-${chip.tone}`}>
                      {chip.label}
                    </span>
                  ))}
                </div>
              )}

              {warningSummary.messages[0] && (
                <p className="review-warning-summary-notice">{warningSummary.messages[0]}</p>
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
                  disabled={!datasetResult && !imageFolder && !annotationFolder}
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
                  <div className="count">Showing {visibleRecords.length} {reviewFileStatusFilter}</div>
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
                />

                {showSupportRail && (
                  <aside className="review-detail-rail" data-testid="review-detail-rail">
                    {reviewType === "detection" && selectedRecord && (
                      <section className="review-detail-summary" data-testid="review-detection-summary">
                        <h3>Detection Summary</h3>
                        <p>{detectionSummary}</p>
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
