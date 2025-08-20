import cv from 'opencv-ts';

let opencvReady = false;

export const initializeOpenCV = async (): Promise<void> => {
  if (opencvReady) return;
  
  try {
    if (cv && typeof cv.ready === 'function') {
      await cv.ready;
    } else {
      await new Promise((resolve) => {
        if (cv.onRuntimeInitialized) {
          cv.onRuntimeInitialized = resolve;
        } else {
          resolve(undefined);
        }
      });
    }
    opencvReady = true;
    console.log('OpenCV initialized successfully');
  } catch (error) {
    console.error('Failed to initialize OpenCV:', error);
    throw error;
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