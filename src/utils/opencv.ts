// @ts-nocheck
import cv from 'opencv-ts';

let opencvReady = false;

export const initializeOpenCV = async (): Promise<void> => {
  if (opencvReady) return;
  
  try {
    // Wait for OpenCV to be ready
    if (cv && typeof cv.ready === 'function') {
      await cv.ready;
    } else if (cv.onRuntimeInitialized) {
      await new Promise<void>((resolve) => {
        cv.onRuntimeInitialized = () => resolve();
      });
    }
    opencvReady = true;
    console.log('OpenCV initialized successfully');
  } catch (error) {
    console.error('Failed to initialize OpenCV:', error);
    // Don't throw error, just continue without OpenCV
    opencvReady = false;
  }
};

export const isOpenCVReady = (): boolean => opencvReady;

export const getOpenCV = () => {
  if (!opencvReady) {
    throw new Error('OpenCV not initialized. Call initializeOpenCV() first.');
  }
  return cv;
};

export default cv;
// @ts-nocheck
