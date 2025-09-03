import { useEffect, useState } from "react";

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

const isElectron = typeof window !== "undefined" && (window as any).electronAPI;

export function AppMenuBar() {
  const [openMenu, setOpenMenu] = useState<string | null>(null);

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
      if (isElectron) {
        await (window as any).electronAPI.updater.checkForUpdates();
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
    alert("CompareX\nAdvanced image comparison and analysis tool");
  };

  const menus: MenuGroup[] = [
    {
      label: "File",
      items: [
        { label: "Check for Updates...", action: handleCheckUpdates, disabled: !isElectron },
        { separator: true, label: "sep" },
        { label: "Exit", action: handleQuit, danger: true },
      ],
    },
    {
      label: "View",
      items: [
        { label: "Reload", action: handleReload },
        { label: "Toggle DevTools", action: handleToggleDevTools, disabled: !isElectron },
        { separator: true, label: "sep" },
        { label: "Toggle Fullscreen", action: handleToggleFullscreen },
      ],
    },
    {
      label: "Help",
      items: [
        { label: "About CompareX", action: handleAbout },
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

