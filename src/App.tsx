import React, { useMemo, useRef, useState, useEffect } from "react";
import { matchFilenames } from "./utils/match";
import { filesFromInput, pickDirectory } from "./utils/folder";
import { ImageCanvas } from "./components/ImageCanvas";
import { useStore } from "./store";
import type { FolderKey, MatchedItem } from "./types";
import { MAX_ZOOM, MIN_ZOOM } from "./config";

function useFolderPickers() {
  const [A, setA] = useState<Map<string, File> | undefined>();
  const [B, setB] = useState<Map<string, File> | undefined>();
  const [C, setC] = useState<Map<string, File> | undefined>();
  const [D, setD] = useState<Map<string, File> | undefined>();

  const pick = async (key: FolderKey) => {
    try {
      const map = await pickDirectory();
      if (key === "A") setA(map);
      if (key === "B") setB(map);
      if (key === "C") setC(map);
      if (key === "D") setD(map);
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
    const map = filesFromInput(e.target.files);
    if (key === "A") setA(map);
    if (key === "B") setB(map);
    if (key === "C") setC(map);
    if (key === "D") setD(map);
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
        Scale:
        <input
          type="text"
          value={scaleInput}
          onChange={(e) => setScaleInput(e.target.value)}
          onBlur={applyChanges}
          onKeyDown={handleKeyDown}
        />
        %
      </label>
      <label>
        X:
        <input
          type="text"
          value={xInput}
          disabled={!imageDimensions}
          onChange={(e) => setXInput(e.target.value)}
          onBlur={applyChanges}
          onKeyDown={handleKeyDown}
        />
        px
      </label>
      <label>
        Y:
        <input
          type="text"
          value={yInput}
          disabled={!imageDimensions}
          onChange={(e) => setYInput(e.target.value)}
          onBlur={applyChanges}
          onKeyDown={handleKeyDown}
        />
        px
      </label>
    </div>
  );
}

export default function App() {
  const { A, B, C, D, pick, inputRefs, onInput } = useFolderPickers();
  const [stripExt, setStripExt] = useState(false);
  const [current, setCurrent] = useState<MatchedItem | null>(null);
  const { syncMode, setSyncMode, setViewport } = useStore();
  const [numViewers, setNumViewers] = useState(2);
  const [imageDimensions, setImageDimensions] = useState<{ width: number, height: number } | null>(null);
  const [indicator, setIndicator] = useState<{ cx: number, cy: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const fileOf = (key: FolderKey, item: MatchedItem | null) => {
    if (!item) return undefined;
    const map = (key === "A" ? A : key === "B" ? B : key === "C" ? C : D);
    if (!map) return undefined;
    const name = stripExt
      ? Array.from(map.keys()).find(n => n.replace(/\.[^/.]+$/, "") === item.filename)
      : item.filename;
    return name ? map.get(name) : undefined;
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
    const folders: any = { A, B };
    if (numViewers >= 3) folders.C = C;
    if (numViewers >= 4) folders.D = D;
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

  const resetView = () => setViewport({ scale: 1, cx: 0.5, cy: 0.5 });

  const handleViewportSet = (vp: { cx?: number, cy?: number }) => {
    if (vp.cx !== undefined && vp.cy !== undefined) {
      setIndicator({ cx: vp.cx, cy: vp.cy });
      setTimeout(() => setIndicator(null), 1000);
    }
  };

  return (
    <div className="app">
      <header>
        <h1>Image Compare Viewer</h1>
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
            match by filename (no extension)
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
          <ImageCanvas label="A" file={fileOf("A", current)} indicator={indicator} />
          <ImageCanvas label="B" file={fileOf("B", current)} indicator={indicator} />
          {numViewers >= 3 && <ImageCanvas label="C" file={fileOf("C", current)} indicator={indicator} />}
          {numViewers >= 4 && <ImageCanvas label="D" file={fileOf("D", current)} indicator={indicator} />}
        </section>
      </main>
    </div>
  );
}
