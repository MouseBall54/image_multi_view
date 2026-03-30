// @ts-nocheck
import cv from 'opencv-ts';

let opencvReady = false;
let opencvInitAttempted = false;
let opencvInitFailed = false;
let opencvInitError: string | null = null;
let opencvInitPromise: Promise<void> | null = null;

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
};

export const initializeOpenCV = async (): Promise<void> => {
  if (opencvReady || opencvInitFailed) return;
  if (opencvInitPromise) {
    await opencvInitPromise;
    return;
  }

  opencvInitAttempted = true;
  opencvInitPromise = (async () => {
    try {
      // Wait for OpenCV to be ready
      if (cv && cv.ready && typeof cv.ready.then === 'function') {
        await cv.ready;
      } else if (cv && cv.onRuntimeInitialized) {
        await new Promise<void>((resolve) => {
          cv.onRuntimeInitialized = () => resolve();
        });
      }
      opencvReady = true;
      opencvInitFailed = false;
      opencvInitError = null;
      console.log('OpenCV initialized successfully');
    } catch (error) {
      // Don't throw error, just continue without OpenCV
      opencvReady = false;
      opencvInitFailed = true;
      opencvInitError = getErrorMessage(error);
      console.warn('OpenCV acceleration unavailable. Falling back to non-OpenCV behavior.', {
        error: opencvInitError
      });
    } finally {
      opencvInitPromise = null;
    }
  })();

  await opencvInitPromise;
};

export const isOpenCVReady = (): boolean => opencvReady;

export const getOpenCVInitState = () => ({
  attempted: opencvInitAttempted,
  ready: opencvReady,
  failed: opencvInitFailed,
  error: opencvInitError
});

export const resetOpenCVInitStateForTests = (): void => {
  opencvReady = false;
  opencvInitAttempted = false;
  opencvInitFailed = false;
  opencvInitError = null;
  opencvInitPromise = null;
};

export const getOpenCV = () => {
  if (!opencvReady) {
    throw new Error('OpenCV not initialized. Call initializeOpenCV() first.');
  }
  return cv;
};

export default cv;
// @ts-nocheck
