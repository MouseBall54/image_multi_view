import { useEffect, useMemo, useState } from "react";
import { isDevChannel } from "../utils/environment";

type MenuItem = {
  label: string;
  action?: () => void;
  danger?: boolean;
  disabled?: boolean;
  separator?: boolean;
};

type MenuGroup = {
  label: string;
  items: MenuItem[];
};

export function AppMenuBar() {
  const electronApi = typeof window !== "undefined" ? (window as any).electronAPI : undefined;
  const isElectron = Boolean(electronApi);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [isDevBuild, setIsDevBuild] = useState(false);
  const devChannelFallback = useMemo(() => isDevChannel(), []);

  useEffect(() => {
    let cancelled = false;

    if (!electronApi?.updater) {
      setIsDevBuild(devChannelFallback);
      return;
    }

    (async () => {
      try {
        const info = await electronApi.updater.getVersion();
        if (!cancelled) {
          const resolvedDev = Boolean(info?.isDev) || devChannelFallback;
          setIsDevBuild(resolvedDev);
        }
      } catch {
        if (!cancelled) {
          setIsDevBuild(devChannelFallback);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [devChannelFallback, electronApi]);

  const showDevControls = isDevBuild || devChannelFallback;

  useEffect(() => {
    const onDocClick = () => setOpenMenu(null);
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  const handleReload = () => {
    window.location.reload();
  };

  const handleCheckUpdates = async () => {
    try {
      if (electronApi?.updater) {
        await electronApi.updater.checkForUpdates();
      }
    } catch (e) {
      // no-op
    }
  };

  const handleQuit = () => {
    if (isElectron) {
      (window as any).electronAPI.windowActions.quit();
    } else {
      window.close();
    }
  };

  const handleToggleDevTools = () => {
    if (isElectron) {
      (window as any).electronAPI.windowActions.toggleDevTools();
    }
  };

  const handleToggleFullscreen = () => {
    if (isElectron) {
      (window as any).electronAPI.windowActions.toggleFullscreen();
    } else {
      // web fallback
      const doc: any = document;
      if (!document.fullscreenElement) {
        doc.documentElement.requestFullscreen?.();
      } else {
        document.exitFullscreen?.();
      }
    }
  };

  const handleAbout = () => {
    // For now, simple alert in web; in Electron, native dialog already exists in main menu
    alert("compareX\nAdvanced image comparison and analysis tool");
  };

  const menus: MenuGroup[] = [
    {
      label: "File",
      items: [
        ...(showDevControls ? [{ label: "Check for Updates...", action: handleCheckUpdates, disabled: !electronApi?.updater }] : []),
        ...(showDevControls ? [{ separator: true, label: "sep" }] : []),
        { label: "Exit", action: handleQuit, danger: true },
      ],
    },
    {
      label: "View",
      items: [
        { label: "Reload", action: handleReload },
        ...(showDevControls ? [{ label: "Toggle DevTools", action: handleToggleDevTools, disabled: !electronApi?.windowActions }] : []),
        ...(showDevControls ? [{ separator: true, label: "sep" }] : []),
        { label: "Toggle Fullscreen", action: handleToggleFullscreen },
      ],
    },
    {
      label: "Help",
      items: [
        { label: "About compareX", action: handleAbout },
      ],
    },
  ];

  return (
    <div className="menu-bar" onClick={(e) => e.stopPropagation()}>
      {menus.map((group) => (
        <div
          key={group.label}
          className={`menu-item ${openMenu === group.label ? "open" : ""}`}
          onClick={() => setOpenMenu(openMenu === group.label ? null : group.label)}
        >
          <span className="menu-label">{group.label}</span>
          {openMenu === group.label && (
            <div className="dropdown-menu">
              {group.items.map((it, idx) =>
                it.separator ? (
                  <div key={idx} className="menu-separator" />
                ) : (
                  <button
                    key={idx}
                    className={`dropdown-item ${it.danger ? "danger" : ""}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      it.action?.();
                      setOpenMenu(null);
                    }}
                    disabled={!!it.disabled}
                  >
                    {it.label}
                  </button>
                )
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default AppMenuBar;

