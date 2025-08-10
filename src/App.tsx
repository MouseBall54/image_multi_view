// src/App.tsx
import React, { useMemo, useRef, useState } from "react";
import { matchFilenames } from "./utils/match";
import { filesFromInput, pickDirectory } from "./utils/folder";
import { ImageCanvas } from "./components/ImageCanvas";
import { useStore } from "./store";
import type { FolderKey, MatchedItem } from "./types";

function useFolderPickers() {
  const [A, setA] = useState<Map<string, File> | undefined>();
  const [B, setB] = useState<Map<string, File> | undefined>();
  const [C, setC] = useState<Map<string, File> | undefined>();

  const pick = async (key: FolderKey) => {
    try {
      const map = await pickDirectory();
      if (key === "A") setA(map);
      if (key === "B") setB(map);
      if (key === "C") setC(map);
    } catch (error) {
      console.error("Error picking directory:", error);
      // Fallback for browsers that do not support showDirectoryPicker
      if (inputRefs[key].current) {
        inputRefs[key].current?.click();
      }
    }
  };

  const inputRefs = {
    A: useRef<HTMLInputElement>(null),
    B: useRef<HTMLInputElement>(null),
    C: useRef<HTMLInputElement>(null),
  };

  const onInput = (key: FolderKey, e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const map = filesFromInput(e.target.files);
    if (key === "A") setA(map);
    if (key === "B") setB(map);
    if (key === "C") setC(map);
  };

  return { A, B, C, pick, inputRefs, onInput };
}

export default function App() {
  const { A, B, C, pick, inputRefs, onInput } = useFolderPickers();
  const [stripExt, setStripExt] = useState(false);
  const [current, setCurrent] = useState<MatchedItem | null>(null);
  const { syncMode, setSyncMode, setViewport } = useStore();
  const [numViewers, setNumViewers] = useState(3);

  const activeFolders = useMemo(() => {
    const folders: any = { A, B };
    if (numViewers === 3) {
      folders.C = C;
    }
    return folders;
  }, [A, B, C, numViewers]);

  const matched = useMemo(
    () => matchFilenames(activeFolders, stripExt),
    [activeFolders, stripExt]
  );

  const fileOf = (key: FolderKey, item: MatchedItem | null) => {
    if (!item) return undefined;
    const map = (key === "A" ? A : key === "B" ? B : C);
    if (!map) return undefined;
    // stripExt일 때 실제 파일명 찾아 매핑
    const name = stripExt
      ? Array.from(map.keys()).find(n => n.replace(/\.[^/.]+$/, "") === item.filename)
      : item.filename;
    return name ? map.get(name) : undefined;
  };

  const resetView = () => setViewport({ scale: 1, cx: 0.5, cy: 0.5 });

  return (
    <div className="app">
      <header>
        <h1>Image Compare Viewer</h1>
        <div className="controls">
          <button onClick={() => pick("A")}>Pick Folder A</button>
          <button onClick={() => pick("B")}>Pick Folder B</button>
          {numViewers === 3 && <button onClick={() => pick("C")}>Pick Folder C</button>}

          {/* Fallbacks */}
          <div style={{ display: 'none' }}>
            <input ref={inputRefs.A} type="file" webkitdirectory="" multiple onChange={(e)=>onInput("A", e)} />
            <input ref={inputRefs.B} type="file" webkitdirectory="" multiple onChange={(e)=>onInput("B", e)} />
            <input ref={inputRefs.C} type="file" webkitdirectory="" multiple onChange={(e)=>onInput("C", e)} />
          </div>

          <label>
            Viewers:
            <select value={numViewers} onChange={e => setNumViewers(Number(e.target.value))}>
              <option value={2}>2</option>
              <option value={3}>3</option>
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
      </header>

      <main>
        <aside className="filelist">
          <div className="count">Matched: {matched.length}</div>
          <ul>
            {matched.map(m => (
              <li key={m.filename}
                  className={current?.filename === m.filename ? "active": ""}
                  onClick={()=>setCurrent(m)}>
                {m.filename}
                <span className="has">
                  {m.has.A ? " A" : ""}{m.has.B ? " B" : ""}{m.has.C && numViewers === 3 ? " C" : ""}
                </span>
              </li>
            ))}
          </ul>
        </aside>

        <section className={`viewers viewers-${numViewers}`}>
          <ImageCanvas label="A" file={fileOf("A", current)} />
          <ImageCanvas label="B" file={fileOf("B", current)} />
          {numViewers === 3 && <ImageCanvas label="C" file={fileOf("C", current)} />}
        </section>
      </main>
    </div>
  );
}
