import React, { useMemo, useRef, useState, useEffect } from "react";
import { matchFilenames } from "./utils/match";
import { filesFromInput, pickDirectory, FolderData } from "./utils/folder";
import { ImageCanvas } from "./components/ImageCanvas";
import { useStore } from "./store";
import type { FolderKey, MatchedItem } from "./types";
import { MAX_ZOOM, MIN_ZOOM } from "./config";

function useFolderPickers() {
  const [A, setA] = useState<FolderData | undefined>();
  const [B, setB] = useState<FolderData | undefined>();
  const [C, setC] = useState<FolderData | undefined>();
  const [D, setD] = useState<FolderData | undefined>();

  const pick = async (key: FolderKey) => {
    try {
      const folderData = await pickDirectory();
      if (key === "A") setA(folderData);
      if (key === "B") setB(folderData);
      if (key === "C") setC(folderData);
      if (key === "D") setD(folderData);
    } catch (error) {
      console.error("Error picking directory:", error);
      if (inputRefs[key].current) {
        inputRefs[key].current?.click();
      }
    }
  };

  const inputRefs = {
    A: useRef<HTMLInputElement>(null),
    B: useRef<HTMLInputElement>(null),
    C: useRef<HTMLInputElement>(null),
    D: useRef<HTMLInputElement>(null),
  };

  const onInput = (key: FolderKey, e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const folderData = filesFromInput(e.target.files);
    if (!folderData) return;
    if (key === "A") setA(folderData);
    if (key === "B") setB(folderData);
    if (key === "C") setC(folderData);
    if (key === "D") setD(folderData);
  };

  return { A, B, C, D, pick, inputRefs, onInput };
}

function ViewportControls({ imageDimensions, onViewportSet }: {
  imageDimensions: { width: number, height: number } | null,
  onViewportSet: (vp: { scale?: number, cx?: number, cy?: number }) => void
}) {
  const { viewport, setViewport } = useStore();
  const [scaleInput, setScaleInput] = useState((viewport.scale * 100).toFixed(0));
  const [xInput, setXInput] = useState("");
  const [yInput, setYInput] = useState("");

  useEffect(() => {
    setScaleInput((viewport.scale * 100).toFixed(0));
    if (imageDimensions) {
      setXInput(Math.round(viewport.cx * imageDimensions.width).toString());
      setYInput(Math.round(viewport.cy * imageDimensions.height).toString());
    }
  }, [viewport, imageDimensions]);

  const applyChanges = () => {
    const newScale = parseFloat(scaleInput) / 100;
    const newCx = imageDimensions ? parseFloat(xInput) / imageDimensions.width : NaN;
    const newCy = imageDimensions ? parseFloat(yInput) / imageDimensions.height : NaN;

    const newViewport: { scale?: number, cx?: number, cy?: number } = {};
    if (!isNaN(newScale)) {
      newViewport.scale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newScale));
    }
    if (!isNaN(newCx)) {
      newViewport.cx = newCx;
    }
    if (!isNaN(newCy)) {
      newViewport.cy = newCy;
    }
    
    setViewport(newViewport);
    onViewportSet(newViewport);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      applyChanges();
      (e.target as HTMLInputElement).blur();
    }
  };

  return (
    <div className="viewport-controls">
      <label>
        <span>Scale:</span>
        <input
          type="text"
          value={scaleInput}
          onChange={(e) => setScaleInput(e.target.value)}
          onBlur={applyChanges}
          onKeyDown={handleKeyDown}
        />
        <span>%</span>
      </label>
      <label>
        <span>X:</span>
        <input
          type="text"
          value={xInput}
          disabled={!imageDimensions}
          onChange={(e) => setXInput(e.target.value)}
          onBlur={applyChanges}
          onKeyDown={handleKeyDown}
        />
        <span>px</span>
      </label>
      <label>
        <span>Y:</span>
        <input
          type="text"
          value={yInput}
          disabled={!imageDimensions}
          onChange={(e) => setYInput(e.target.value)}
          onBlur={applyChanges}
          onKeyDown={handleKeyDown}
        />
        <span>px</span>
      </label>
    </div>
  );
}

export default function App() {
  const { A, B, C, D, pick, inputRefs, onInput } = useFolderPickers();
  const [stripExt, setStripExt] = useState(true);
  const [current, setCurrent] = useState<MatchedItem | null>(null);
  const { syncMode, setSyncMode, setViewport, fitScaleFn } = useStore();
  const [numViewers, setNumViewers] = useState(2);
  const [imageDimensions, setImageDimensions] = useState<{ width: number, height: number } | null>(null);
  const [indicator, setIndicator] = useState<{ cx: number, cy: number, key: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const fileOf = (key: FolderKey, item: MatchedItem | null) => {
    if (!item) return undefined;
    const folder = (key === "A" ? A : key === "B" ? B : key === "C" ? C : D);
    if (!folder?.files) return undefined;
    const name = stripExt
      ? Array.from(folder.files.keys()).find(n => n.replace(/\.[^/.]+$/, "") === item.filename)
      : item.filename;
    return name ? folder.files.get(name) : undefined;
  };

  useEffect(() => {
    const fileA = fileOf("A", current);
    if (fileA) {
      let revoked = false;
      createImageBitmap(fileA).then(bmp => {
        if (!revoked) {
          setImageDimensions({ width: bmp.width, height: bmp.height });
        }
      });
      return () => { revoked = true; };
    } else {
      setImageDimensions(null);
    }
  }, [current, A]);

  const activeFolders = useMemo(() => {
    const folders: any = { A: A?.files, B: B?.files };
    if (numViewers >= 3) folders.C = C?.files;
    if (numViewers >= 4) folders.D = D?.files;
    return folders;
  }, [A, B, C, D, numViewers]);

  const matched = useMemo(
    () => matchFilenames(activeFolders, stripExt),
    [activeFolders, stripExt]
  );

  const filteredMatched = useMemo(() => {
    if (!searchQuery) {
      return matched;
    }
    return matched.filter(item =>
      item.filename.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [matched, searchQuery]);

  const resetView = () => {
    const newScale = fitScaleFn ? fitScaleFn() : 1;
    setViewport({ scale: newScale, cx: 0.5, cy: 0.5 });
  };

  const handleViewportSet = (vp: { cx?: number, cy?: number }) => {
    if (vp.cx !== undefined && vp.cy !== undefined) {
      setIndicator({ cx: vp.cx, cy: vp.cy, key: Date.now() });
      setTimeout(() => setIndicator(null), 2000);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) {
        return;
      }

      if (!current || filteredMatched.length === 0) {
        return;
      }

      const currentIndex = filteredMatched.findIndex(item => item.filename === current.filename);
      if (currentIndex === -1) {
        return;
      }

      if (e.key === 'a' || e.key === 'A') {
        const prevIndex = currentIndex - 1;
        if (prevIndex >= 0) {
          setCurrent(filteredMatched[prevIndex]);
        }
      } else if (e.key === 'd' || e.key === 'D') {
        const nextIndex = currentIndex + 1;
        if (nextIndex < filteredMatched.length) {
          setCurrent(filteredMatched[nextIndex]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [current, filteredMatched, setCurrent]);

  return (
    <div className="app">
      <header>
        <h1>Image Compare Viewer</h1>
        <div className="top-controls-wrapper">
          <div className="controls">
            <button onClick={() => pick("A")}>Pick Folder A</button>
            <button onClick={() => pick("B")}>Pick Folder B</button>
            {numViewers >= 3 && <button onClick={() => pick("C")}>Pick Folder C</button>}
            {numViewers >= 4 && <button onClick={() => pick("D")}>Pick Folder D</button>}
            <div style={{ display: 'none' }}>
              <input ref={inputRefs.A} type="file" webkitdirectory="" multiple onChange={(e)=>onInput("A", e)} />
              <input ref={inputRefs.B} type="file" webkitdirectory="" multiple onChange={(e)=>onInput("B", e)} />
              <input ref={inputRefs.C} type="file" webkitdirectory="" multiple onChange={(e)=>onInput("C", e)} />
              <input ref={inputRefs.D} type="file" webkitdirectory="" multiple onChange={(e)=>onInput("D", e)} />
            </div>
            <label>
              Viewers:
              <select value={numViewers} onChange={e => setNumViewers(Number(e.target.value))}>
                <option value={2}>2</option>
                <option value={3}>3</option>
                <option value={4}>4</option>
              </select>
            </label>
            <label>
              <input type="checkbox" checked={stripExt} onChange={(e)=>setStripExt(e.target.checked)} />
              <span>Ignore extension</span>
            </label>
            <label>
              Sync:
              <select value={syncMode} onChange={e => setSyncMode(e.target.value as any)}>
                <option value="locked">locked</option>
                <option value="unlocked">unlocked</option>
              </select>
            </label>
            <button onClick={resetView}>Reset View</button>
          </div>
          <ViewportControls imageDimensions={imageDimensions} onViewportSet={handleViewportSet} />
        </div>
      </header>
      <main>
        <aside className="filelist">
          <div className="filelist-header">
            <input
              type="text"
              placeholder="Search files..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            <div className="count">Matched: {filteredMatched.length}</div>
          </div>
          <ul>
            {filteredMatched.map(m => (
              <li key={m.filename}
                  className={current?.filename === m.filename ? "active": ""}
                  onClick={()=>setCurrent(m)}>
                {m.filename}
                <span className="has">
                  {m.has.A ? " A" : ""}{m.has.B ? " B" : ""}{m.has.C && numViewers >= 3 ? " C" : ""}{m.has.D && numViewers >= 4 ? " D" : ""}
                </span>
              </li>
            ))}
          </ul>
        </aside>
        <section className={`viewers viewers-${numViewers}`}>
          <ImageCanvas label={A?.name || 'A'} file={fileOf("A", current)} indicator={indicator} isReference={true} />
          <ImageCanvas label={B?.name || 'B'} file={fileOf("B", current)} indicator={indicator} />
          {numViewers >= 3 && <ImageCanvas label={C?.name || 'C'} file={fileOf("C", current)} indicator={indicator} />}
          {numViewers >= 4 && <ImageCanvas label={D?.name || 'D'} file={fileOf("D", current)} indicator={indicator} />}
        </section>
      </main>
    </div>
  );
}
