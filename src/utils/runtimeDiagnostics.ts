import type { ToastMessage } from "../components/Toast";

export type RuntimeDiagnosticScope = "renderer";

export type RuntimeDiagnosticInput = {
  scope: RuntimeDiagnosticScope;
  error: unknown;
  componentStack?: string;
  addToast?: (toast: Omit<ToastMessage, "id">) => void;
};

export type RuntimeDiagnosticResult = {
  scope: RuntimeDiagnosticScope;
  error: Error;
  details: string[];
};

const toError = (error: unknown): Error => {
  if (error instanceof Error) {
    return error;
  }
  if (typeof error === "string") {
    return new Error(error);
  }
  return new Error("Unknown runtime error");
};

const trimComponentStack = (value?: string): string | undefined => {
  if (!value) {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

export const reportRuntimeDiagnostic = ({
  scope,
  error,
  componentStack,
  addToast
}: RuntimeDiagnosticInput): RuntimeDiagnosticResult => {
  const resolvedError = toError(error);
  const details: string[] = [
    `name: ${resolvedError.name}`,
    `message: ${resolvedError.message}`
  ];

  const normalizedComponentStack = trimComponentStack(componentStack);
  if (normalizedComponentStack) {
    details.push(`componentStack: ${normalizedComponentStack}`);
  }

  console.error(`[runtime:${scope}]`, resolvedError, normalizedComponentStack ?? "");

  addToast?.({
    type: "error",
    title: "Runtime Error",
    message: "A renderer exception occurred. You can retry without restarting the app.",
    details,
    duration: 8000
  });

  return {
    scope,
    error: resolvedError,
    details
  };
};
