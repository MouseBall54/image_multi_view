import React from "react";
import { useStore } from "../store";
import ToastContainer from "./ToastContainer";
import { reportRuntimeDiagnostic } from "../utils/runtimeDiagnostics";

type RendererErrorBoundaryState = {
  error: Error | null;
  recoveryKey: number;
};

type RendererErrorBoundaryProps = {
  children?: React.ReactNode;
  onReportRuntimeError?: (error: unknown, errorInfo: React.ErrorInfo) => void;
};

const fallbackContainerStyle: React.CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "16px",
  boxSizing: "border-box"
};

const fallbackCardStyle: React.CSSProperties = {
  width: "min(640px, 100%)",
  border: "1px solid rgba(255, 255, 255, 0.18)",
  borderRadius: "8px",
  background: "rgba(13, 18, 28, 0.92)",
  color: "#e6edf3",
  padding: "16px",
  display: "grid",
  gap: "12px"
};

const fallbackActionsStyle: React.CSSProperties = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap"
};

const fallbackButtonStyle: React.CSSProperties = {
  border: "1px solid rgba(255, 255, 255, 0.25)",
  borderRadius: "6px",
  background: "rgba(255, 255, 255, 0.08)",
  color: "inherit",
  padding: "8px 12px",
  cursor: "pointer"
};

export class RendererErrorBoundary extends React.Component<
  RendererErrorBoundaryProps,
  RendererErrorBoundaryState
> {
  public state: RendererErrorBoundaryState = {
    error: null,
    recoveryKey: 0
  };

  static getDerivedStateFromError(error: Error): Partial<RendererErrorBoundaryState> {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    if (this.props.onReportRuntimeError) {
      this.props.onReportRuntimeError(error, errorInfo);
      return;
    }

    reportRuntimeDiagnostic({
      scope: "renderer",
      error,
      componentStack: errorInfo.componentStack ?? undefined,
      addToast: useStore.getState().addToast
    });
  }

  private handleRetry = (): void => {
    this.setState((prev) => ({
      error: null,
      recoveryKey: prev.recoveryKey + 1
    }));
  };

  private handleReload = (): void => {
    const electronReload = (typeof window !== "undefined" && (window as any).electronAPI?.windowActions?.reload)
      ? (window as any).electronAPI.windowActions.reload
      : null;

    if (electronReload) {
      electronReload();
      return;
    }

    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  render(): React.ReactNode {
    const { error, recoveryKey } = this.state;
    if (!error) {
      return <React.Fragment key={recoveryKey}>{this.props.children}</React.Fragment>;
    }

    return (
      <>
        <div style={fallbackContainerStyle} role="alert" aria-live="assertive" data-testid="runtime-error-fallback">
          <div style={fallbackCardStyle}>
            <h2 style={{ margin: 0 }}>Renderer runtime error</h2>
            <p style={{ margin: 0 }}>
              A render-time exception occurred. The app is still running, and you can retry rendering immediately.
            </p>
            <code style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }} data-testid="runtime-error-message">
              {error.message}
            </code>
            <div style={fallbackActionsStyle}>
              <button type="button" style={fallbackButtonStyle} onClick={this.handleRetry} data-testid="runtime-error-retry">
                Retry render
              </button>
              <button type="button" style={fallbackButtonStyle} onClick={this.handleReload}>
                Reload app
              </button>
            </div>
          </div>
        </div>
        <ToastContainer />
      </>
    );
  }
}
