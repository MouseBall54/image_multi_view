import type { FilterParams } from "../store";
import type { FilterType } from "../types";

export type FilterImageDimensions = {
  width: number;
  height: number;
};

export const isFiniteNumber = (value: unknown): value is number => {
  return typeof value === "number" && Number.isFinite(value);
};

export const isValidFilterImageDimensions = (width: number, height: number): boolean => {
  return Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0;
};

export const safeDivide = (numerator: number, denominator: number, fallback = 0): number => {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || Math.abs(denominator) < 1e-9) {
    return fallback;
  }
  return numerator / denominator;
};

const clamp = (value: number, min: number, max: number): number => {
  return Math.min(max, Math.max(min, value));
};

const toFinite = (value: unknown, fallback: number): number => {
  if (!isFiniteNumber(value)) {
    return fallback;
  }
  return value;
};

const maxOddFromDimension = (dimension: number): number => {
  if (!Number.isFinite(dimension) || dimension < 1) {
    return 1;
  }
  const asInt = Math.max(1, Math.floor(dimension));
  return asInt % 2 === 0 ? Math.max(1, asInt - 1) : asInt;
};

const toOddKernel = (
  value: unknown,
  fallback: number,
  maxDimension: number,
  minValue = 1
): number => {
  const safe = Math.floor(toFinite(value, fallback));
  const lowerBounded = Math.max(minValue, safe);
  const odd = lowerBounded % 2 === 0 ? lowerBounded + 1 : lowerBounded;
  const maxOdd = Math.max(minValue, maxOddFromDimension(maxDimension));
  if (odd > maxOdd) {
    return maxOdd;
  }
  return odd;
};

export const normalizeFilterParams = (
  _filterType: FilterType | string,
  rawParams: Partial<FilterParams> | undefined,
  dimensions?: FilterImageDimensions
): FilterParams => {
  const params = (rawParams ?? {}) as Partial<FilterParams>;
  const width = dimensions?.width ?? Number.POSITIVE_INFINITY;
  const height = dimensions?.height ?? Number.POSITIVE_INFINITY;
  const minDim = Math.max(1, Math.min(width, height));
  const maxGrid = Number.isFinite(minDim) ? Math.max(1, Math.floor(minDim)) : 1024;

  const kernelSize = toOddKernel(params.kernelSize, 5, minDim, 1);
  const kernelSizeX = toOddKernel(params.kernelSizeX ?? kernelSize, kernelSize, width, 1);
  const kernelSizeY = toOddKernel(params.kernelSizeY ?? kernelSize, kernelSize, height, 1);

  const lowThreshold = clamp(toFinite(params.lowThreshold, 50), 0, 255);
  const highThreshold = clamp(toFinite(params.highThreshold, Math.max(lowThreshold + 1, 100)), 0, 255);

  const gridSize = clamp(Math.floor(toFinite(params.gridSize, 8)), 1, maxGrid);

  return {
    ...(params as FilterParams),
    kernelSize,
    kernelSizeX,
    kernelSizeY,
    sigma: Math.max(0.0001, toFinite(params.sigma, 1.5)),
    sigmaX: Math.max(0.0001, toFinite(params.sigmaX ?? params.sigma, 1.5)),
    sigmaY: Math.max(0.0001, toFinite(params.sigmaY ?? params.sigmaX ?? params.sigma, 1.5)),
    sigma2: Math.max(0.0001, toFinite(params.sigma2 ?? 2.0, 2.0)),
    sharpenAmount: clamp(toFinite(params.sharpenAmount, 1), 0, 20),
    lowThreshold,
    highThreshold: Math.max(lowThreshold, highThreshold),
    clipLimit: Math.max(0.0001, toFinite(params.clipLimit, 2)),
    gridSize,
    gamma: Math.max(0.0001, toFinite(params.gamma, 1)),
    cutoff: clamp(toFinite(params.cutoff, 30), 0, 255),
    brightness: clamp(toFinite(params.brightness, 0), -255, 255),
    contrast: Math.max(0, toFinite(params.contrast, 100)),
    maxValue: clamp(toFinite(params.maxValue, 255), 0, 255),
    threshold: clamp(toFinite(params.threshold, 128), 0, 255),
    blockSize: toOddKernel(params.blockSize, 15, minDim, 1),
    windowSize: toOddKernel(params.windowSize, 15, minDim, 1),
    constant: toFinite(params.constant, 5),
    sauvolaK: clamp(toFinite(params.sauvolaK, 0.5), 0, 10),
    sauvolaR: Math.max(0.0001, toFinite(params.sauvolaR, 128)),
    bradleyT: clamp(toFinite(params.bradleyT, 0.15), 0, 1),
    bernsenContrast: clamp(toFinite(params.bernsenContrast, 15), 0, 255),
    phansalkarK: clamp(toFinite(params.phansalkarK, 0.25), 0, 10),
    phansalkarR: Math.max(0.0001, toFinite(params.phansalkarR, 0.5)),
    phansalkarP: toFinite(params.phansalkarP, 2),
    phansalkarQ: toFinite(params.phansalkarQ, 10),
    alpha: clamp(toFinite(params.alpha, 0.1), 0, 0.99),
    epsilon: Math.max(0.000001, toFinite(params.epsilon, 0.04)),
    kappa: Math.max(0.000001, toFinite(params.kappa, 30)),
    iterations: Math.max(1, Math.floor(toFinite(params.iterations, 5))),
    sigmaColor: Math.max(0.0001, toFinite(params.sigmaColor, 25)),
    sigmaSpace: Math.max(0.0001, toFinite(params.sigmaSpace, 25)),
    h: Math.max(0.0001, toFinite(params.h, 10)),
    patchSize: toOddKernel(params.patchSize, 7, minDim, 1),
    searchWindowSize: toOddKernel(params.searchWindowSize, 21, minDim, 1),
    theta: toFinite(params.theta, 0),
    gaborSigma: Math.max(0.0001, toFinite(params.gaborSigma, 1.5)),
    lambda: Math.max(0.0001, toFinite(params.lambda, 10)),
    psi: toFinite(params.psi, 0),
    sensitivity: Math.max(0.0001, toFinite(params.sensitivity, 1)),
    centerValue: clamp(toFinite(params.centerValue, 128), 0, 255)
  };
};

export type AsyncTaskTokenManager = {
  nextToken: () => number;
  isCurrent: (token: number) => boolean;
  invalidate: () => void;
};

export const createAsyncTaskTokenManager = (): AsyncTaskTokenManager => {
  let token = 0;
  return {
    nextToken: () => {
      token += 1;
      return token;
    },
    isCurrent: (candidateToken: number) => candidateToken === token,
    invalidate: () => {
      token += 1;
    }
  };
};
