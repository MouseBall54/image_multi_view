// src/App.tsx
import React, { useMemo, useRef, useState } from "react";
import { filesFromInput, matchFilenames } from "./utils/match";
import { pickDirectory } from "./utils/folder";
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

  const matched = useMemo(
    () => matchFilenames({ A, B, C }, stripExt),
    [A, B, C, stripExt]
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
          <button onClick={() => pick("C")}>Pick Folder C</button>

          {/* Fallbacks */}
          <div style={{ display: 'none' }}>
            <input ref={inputRefs.A} type="file" webkitdirectory="true" multiple onChange={(e)=>onInput("A", e)} />
            <input ref={inputRefs.B} type="file" webkitdirectory="true" multiple onChange={(e)=>onInput("B", e)} />
            <input ref={inputRefs.C} type="file" webkitdirectory="true" multiple onChange={(e)=>onInput("C", e)} />
          </div>

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
                  {m.has.A ? " A" : ""}{m.has.B ? " B" : ""}{m.has.C ? " C" : ""}
                </span>
              </li>
            ))}
          </ul>
        </aside>

        <section className="viewers">
          <ImageCanvas label="A" file={fileOf("A", current)} />
          <ImageCanvas label="B" file={fileOf("B", current)} />
          <ImageCanvas label="C" file={fileOf("C", current)} />
        </section>
      </main>
    </div>
  );
}
