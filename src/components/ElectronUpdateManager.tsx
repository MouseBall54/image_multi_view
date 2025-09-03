import React, { useState, useEffect } from 'react';
import { electronUpdater, UpdateInfo, DownloadProgress, VersionInfo } from '../utils/electron-updater';

interface ElectronUpdateManagerProps {
  autoCheck?: boolean;
  checkIntervalMs?: number;
}

export const ElectronUpdateManager: React.FC<ElectronUpdateManagerProps> = ({
  autoCheck = true,
  checkIntervalMs = 4 * 60 * 60 * 1000 // 4 hours
}) => {
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Initialize version info
    electronUpdater.getVersion().then(version => {
      setVersionInfo(version);
    });

    // Setup event listeners
    if (window.electronAPI?.updater) {
      const { updater } = window.electronAPI;

      updater.onUpdateChecking(() => {
        setIsChecking(true);
        setError(null);
      });

      updater.onUpdateAvailable((info: UpdateInfo) => {
        setUpdateInfo(info);
        setIsChecking(false);
        setShowUpdateDialog(true);
      });

      updater.onUpdateNotAvailable(() => {
        setUpdateInfo(null);
        setIsChecking(false);
      });

      updater.onUpdateError((error: string) => {
        setError(error);
        setIsChecking(false);
        setIsDownloading(false);
      });

      updater.onDownloadProgress((progress: DownloadProgress) => {
        setDownloadProgress(progress);
      });

      updater.onUpdateDownloaded((info: UpdateInfo) => {
        setIsDownloading(false);
        setIsDownloaded(true);
        setDownloadProgress(null);
      });
    }

    // Auto check for updates
    if (autoCheck && !versionInfo?.isDev) {
      checkForUpdates();
      
      // Set up periodic checks
      const interval = setInterval(() => {
        if (!versionInfo?.isDev) {
          checkForUpdates();
        }
      }, checkIntervalMs);

      return () => clearInterval(interval);
    }

    return () => {
      electronUpdater.cleanup();
    };
  }, [autoCheck, checkIntervalMs, versionInfo?.isDev]);

  const checkForUpdates = async () => {
    if (isChecking || versionInfo?.isDev) return;
    
    setIsChecking(true);
    setError(null);
    
    try {
      const result = await electronUpdater.checkForUpdates();
      if (result.error) {
        setError(result.error);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Update check failed');
    } finally {
      setIsChecking(false);
    }
  };

  const handleDownloadUpdate = async () => {
    if (!updateInfo || isDownloading) return;
    
    setIsDownloading(true);
    setError(null);
    
    try {
      const result = await electronUpdater.downloadUpdate();
      if (result.error) {
        setError(result.error);
        setIsDownloading(false);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Download failed');
      setIsDownloading(false);
    }
  };

  const handleInstallUpdate = async () => {
    if (!isDownloaded) return;
    
    try {
      const result = await electronUpdater.quitAndInstall();
      if (result.error) {
        setError(result.error);
      } else if (result.action === 'later') {
        setShowUpdateDialog(false);
      }
      // If action is 'restart', the app will restart automatically
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Installation failed');
    }
  };

  const handleCancel = () => {
    if (!isDownloading) {
      setShowUpdateDialog(false);
      setUpdateInfo(null);
      setError(null);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatSpeed = (bytesPerSecond: number): string => {
    return `${formatBytes(bytesPerSecond)}/s`;
  };

  // Don't show anything in development mode
  if (versionInfo?.isDev || (!showUpdateDialog && !error)) {
    return null;
  }

  return (
    <>
      <style>{`
        .update-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(26, 26, 26, 0.9);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          animation: fadeIn 0.2s ease-out;
        }

        .update-modal-content {
          background-color: var(--bg-med);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 24px;
          min-width: 480px;
          max-width: 600px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
          color: var(--text-primary);
          font-family: 'Noto Sans', 'Noto Sans KR', sans-serif;
          animation: slideUp 0.3s ease-out;
        }

        .update-modal-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 20px;
        }

        .update-modal-icon {
          width: 24px;
          height: 24px;
          stroke: var(--accent-primary);
        }

        .update-modal-title {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .update-modal-title.error {
          color: var(--danger-color);
        }

        .update-info-grid {
          display: grid;
          grid-template-columns: auto 1fr;
          gap: 12px 16px;
          margin-bottom: 20px;
          font-size: 0.9rem;
        }

        .update-info-label {
          color: var(--text-secondary);
          font-weight: 500;
        }

        .update-info-value {
          color: var(--text-primary);
        }

        .update-changelog {
          background-color: var(--bg-light);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: 16px;
          margin: 16px 0;
          max-height: 200px;
          overflow-y: auto;
          font-size: 0.85rem;
          line-height: 1.6;
          white-space: pre-wrap;
          color: var(--text-primary);
        }

        .update-progress-container {
          margin: 20px 0;
          padding: 16px;
          background-color: var(--bg-light);
          border: 1px solid var(--border-color);
          border-radius: 8px;
        }

        .update-progress-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .update-progress-status {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--text-primary);
          font-weight: 500;
        }

        .update-progress-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid var(--border-color);
          border-top: 2px solid var(--accent-primary);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .update-progress-percent {
          color: var(--accent-primary);
          font-weight: 600;
        }

        .update-progress-bar {
          width: 100%;
          height: 8px;
          background-color: var(--bg-dark);
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 8px;
        }

        .update-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--accent-primary), var(--accent-hover));
          border-radius: 4px;
          transition: width 0.3s ease;
          position: relative;
        }

        .update-progress-fill::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.2),
            transparent
          );
          animation: shimmer 2s infinite;
        }

        .update-progress-details {
          display: flex;
          justify-content: space-between;
          font-size: 0.8rem;
          color: var(--text-secondary);
        }

        .update-modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 24px;
        }

        .update-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background-color: var(--bg-light);
          border: 1px solid var(--border-color);
          color: var(--text-primary);
          padding: 10px 18px;
          border-radius: 8px;
          font-size: 0.9rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: inherit;
        }

        .update-btn:hover:not(:disabled) {
          background-color: var(--accent-primary);
          border-color: var(--accent-hover);
          color: white;
          transform: translateY(-1px);
        }

        .update-btn:disabled {
          background-color: var(--bg-dark);
          border-color: var(--border-color);
          color: var(--text-secondary);
          cursor: not-allowed;
          opacity: 0.6;
        }

        .update-btn.primary {
          background-color: var(--accent-primary);
          border-color: var(--accent-hover);
          color: white;
        }

        .update-btn.primary:hover:not(:disabled) {
          background-color: var(--accent-hover);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 123, 255, 0.3);
        }

        .update-btn.success {
          background-color: var(--success-color);
          border-color: #1e7e34;
          color: white;
        }

        .update-btn.success:hover:not(:disabled) {
          background-color: #1e7e34;
        }

        .update-btn.secondary {
          background-color: var(--bg-light);
          border-color: var(--border-color);
        }

        .update-error-message {
          background-color: rgba(220, 53, 69, 0.1);
          border: 1px solid var(--danger-color);
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 20px;
          color: var(--danger-color);
          font-size: 0.9rem;
          line-height: 1.5;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>

      <div className="update-modal-overlay" onClick={(e) => e.target === e.currentTarget && handleCancel()}>
        <div className="update-modal-content">
          {error ? (
            <>
              <div className="update-modal-header">
                <svg className="update-modal-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="15" y1="9" x2="9" y2="15"/>
                  <line x1="9" y1="9" x2="15" y2="15"/>
                </svg>
                <h3 className="update-modal-title error">업데이트 오류</h3>
              </div>
              
              <div className="update-error-message">
                {error}
              </div>

              <div className="update-modal-actions">
                <button className="update-btn primary" onClick={() => setError(null)}>
                  확인
                </button>
              </div>
            </>
          ) : isChecking ? (
            <>
              <div className="update-modal-header">
                <svg className="update-modal-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                </svg>
                <h3 className="update-modal-title">업데이트 확인 중...</h3>
              </div>
              
              <div className="update-progress-container">
                <div className="update-progress-status">
                  <div className="update-progress-spinner" />
                  서버에서 새로운 업데이트를 확인하고 있습니다...
                </div>
              </div>
            </>
          ) : updateInfo ? (
            <>
              <div className="update-modal-header">
                <svg className="update-modal-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14.828 14.828a4 4 0 0 1-5.656 0M9 10h1m4 0h1"/>
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
                <h3 className="update-modal-title">CompareX 업데이트 ({updateInfo.version})</h3>
              </div>
              
              <div className="update-info-grid">
                <span className="update-info-label">새 버전:</span>
                <span className="update-info-value">{updateInfo.version}</span>
                
                {updateInfo.releaseDate && (
                  <>
                    <span className="update-info-label">릴리즈 날짜:</span>
                    <span className="update-info-value">
                      {new Date(updateInfo.releaseDate).toLocaleDateString('ko-KR')}
                    </span>
                  </>
                )}
              </div>

              {updateInfo.releaseNotes && (
                <>
                  <div className="update-info-label" style={{ marginBottom: '8px' }}>
                    <strong>변경사항:</strong>
                  </div>
                  <div className="update-changelog">
                    {updateInfo.releaseNotes}
                  </div>
                </>
              )}

              {isDownloading && downloadProgress && (
                <div className="update-progress-container">
                  <div className="update-progress-header">
                    <div className="update-progress-status">
                      <div className="update-progress-spinner" />
                      다운로드 중...
                    </div>
                    <div className="update-progress-percent">
                      {downloadProgress.percent.toFixed(1)}%
                    </div>
                  </div>
                  
                  <div className="update-progress-bar">
                    <div 
                      className="update-progress-fill" 
                      style={{ width: `${downloadProgress.percent}%` }}
                    />
                  </div>
                  
                  <div className="update-progress-details">
                    <span>
                      {formatBytes(downloadProgress.transferred)} / {formatBytes(downloadProgress.total)}
                    </span>
                    <span>{formatSpeed(downloadProgress.bytesPerSecond)}</span>
                  </div>
                </div>
              )}

              <div className="update-modal-actions">
                <button
                  className="update-btn secondary"
                  onClick={handleCancel}
                  disabled={isDownloading}
                >
                  {isDownloading ? '다운로드 중...' : '나중에'}
                </button>
                
                {!isDownloaded ? (
                  <button
                    className="update-btn primary"
                    onClick={handleDownloadUpdate}
                    disabled={isDownloading}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="7,10 12,15 17,10"/>
                      <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    {isDownloading ? '다운로드 중...' : '다운로드'}
                  </button>
                ) : (
                  <button
                    className="update-btn success"
                    onClick={handleInstallUpdate}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 12l2 2 4-4"/>
                      <path d="M12 2v20"/>
                    </svg>
                    지금 설치 및 재시작
                  </button>
                )}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </>
  );
};

export default ElectronUpdateManager;