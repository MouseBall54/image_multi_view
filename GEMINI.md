# ✅ 개요(요점 정리)

- **목표:** React + TypeScript로 *서버 없이* 로컬 폴더(전·후 2~3개)를 불러와 **동일 파일명** 이미지의 **동기화된 zoom/pan** 비교 뷰어 구현
- **핵심 포인트:** File System Access API(또는 `input[webkitdirectory]`)로 폴더 로드 → 파일명 매칭 → 각 뷰어의 **viewport**(scale, center)를 **sync**
- **우선 구현 기능:** 폴더 선택(2~3개), 파일 매칭 리스트, 이미지 전환, **wheel zoom(커서 기준)**, drag pan, **sync on/off**, zoom/position reset
- **테스트 편의:** 상단 `config.ts`에서 **배율/속도/성능 옵션** 즉시 조정
- **확장 아이디어:** difference/blend 모드, minimap, ruler/crosshair, blink, split slider

------

# 1) 프로젝트 초기화

```bash
# Vite + React + TypeScript
npm create vite@latest image-compare-viewer -- --template react-ts
cd image-compare-viewer
npm i
npm i zustand
npm run dev
```

> **이유:** Vite는 빠르고, TypeScript 기본, SPA로 충분합니다. 상태관리는 간단·고성능인 **Zustand** 권장(필수 아님).

------

# 2) 디렉터리 로딩 전략(완전 프론트엔드)

- **우선권:** **File System Access API** (`showDirectoryPicker`) – *Chrome/Edge/Opera/Arc 등 Chromium 계열에서 사용 가능*
- **대안:** `<input type="file" webkitdirectory multiple>` – *Firefox/Safari에서 대체경로*

> 두 방식 모두 로컬에서만 동작하며 서버 업로드 없음.

------

# 3) 파일 매칭 규칙

- 기준: **파일명(확장자 포함 또는 제외 택1)**
- 전/후 폴더가 2~3개일 때 **교집합** 기준으로 리스트 구성
- 파일명 충돌/중복은 **가장 최근 수정본 우선** 또는 첫 항목 우선(옵션화)

------

# 4) 핵심 데이터 모델(Types)

```ts
// src/types.ts
export type FolderKey = "A" | "B" | "C";

export interface PickedFolder {
  key: FolderKey;
  name: string;
  files: Map<string, File>; // filename -> File
}

export interface MatchedItem {
  filename: string;
  has: Record<FolderKey, boolean>;
}

export interface Viewport {
  scale: number;     // zoom
  cx: number;        // center x (image coords)
  cy: number;        // center y (image coords)
}

export type SyncMode = "locked" | "unlocked";
```

------

# 5) 전역 설정(테스트/성능 파라미터 한 곳에서 관리)

```ts
// src/config.ts
export const MIN_ZOOM = 0.25;
export const MAX_ZOOM = 8;
export const WHEEL_ZOOM_STEP = 1.12;  // 휠 한 칸당 배율
export const PAN_SPEED = 1.0;         // drag 거리 보정
export const DEFAULT_VIEWPORT: { scale: number } = { scale: 1 };

export const CURSOR_ZOOM_CENTERED = true; // 커서 기준 zoom
export const RESPECT_EXIF = true;         // EXIF 회전 처리(createImageBitmap 옵션)
export const USE_OFFSCREEN = true;        // OffscreenCanvas 사용(지원시)
```

> **여기만 수정**하면 느낌 확 바뀝니다.

------

# 6) 폴더 선택 UI + 파일 인덱싱

```tsx
// src/utils/folder.ts
export async function pickDirectory(): Promise<Map<string, File>> {
  // File System Access API
  // @ts-ignore
  const handle: FileSystemDirectoryHandle = await (window as any).showDirectoryPicker();
  const map = new Map<string, File>();
  for await (const [name, entry] of (handle as any).entries()) {
    if (entry.kind === "file") {
      const file = await entry.getFile();
      map.set(name, file);
    }
  }
  return map;
}

// <input webkitdirectory> fallback 처리
export function filesFromInput(fileList: FileList): Map<string, File> {
  const map = new Map<string, File>();
  Array.from(fileList).forEach(f => map.set(f.name, f));
  return map;
}

// 확장자 제외 매칭을 원하면 아래 유틸 활용
export function normalizeName(name: string, stripExt = false) {
  if (!stripExt) return name;
  const i = name.lastIndexOf(".");
  return i > 0 ? name.slice(0, i) : name;
}
// src/utils/match.ts
import type { FolderKey, MatchedItem } from "../types";

export function matchFilenames(
  folders: Partial<Record<FolderKey, Map<string, File>>>,
  stripExt = false
): MatchedItem[] {
  const keys = Object.keys(folders).filter(k => folders[k as FolderKey]) as FolderKey[];
  const nameSets = keys.map(k => new Set(
    Array.from(folders[k]!.keys()).map(n => stripExt ? n.replace(/\.[^/.]+$/, "") : n)
  ));
  const intersect = nameSets.reduce((acc, s) =>
    acc ? new Set([...acc].filter(x => s.has(x))) : s
  , undefined as Set<string> | undefined) ?? new Set<string>();

  const list: MatchedItem[] = [];
  for (const filename of intersect) {
    const has: any = { A: false, B: false, C: false };
    keys.forEach(k => {
      const map = folders[k]!;
      // stripExt 매칭 시 실제 파일명 다시 찾아 매핑(간단화: 첫 일치)
      const found = Array.from(map.keys()).find(n =>
        stripExt ? n.replace(/\.[^/.]+$/, "") === filename : n === filename
      );
      has[k] = !!found;
    });
    list.push({ filename, has });
  }
  return list.sort((a, b) => a.filename.localeCompare(b.filename));
}
```

------

# 7) Viewport 동기화(전역 상태)

```ts
// src/store.ts
import create from "zustand";
import type { FolderKey, Viewport, SyncMode } from "./types";
import { DEFAULT_VIEWPORT } from "./config";

interface State {
  syncMode: SyncMode;
  viewport: Viewport;              // 기준 viewport
  setSyncMode: (m: SyncMode) => void;
  setViewport: (vp: Partial<Viewport>) => void;
  // 각 뷰어가 로컬 보정이 필요하면 per-view 로컬 상태를 추가
}

export const useStore = create<State>((set) => ({
  syncMode: "locked",
  viewport: { scale: DEFAULT_VIEWPORT.scale, cx: 0.5, cy: 0.5 },
  setSyncMode: (m) => set({ syncMode: m }),
  setViewport: (vp) => set(s => ({ viewport: { ...s.viewport, ...vp } })),
}));
```

> **원리:** 어느 하나의 뷰어에서 zoom/pan이 바뀌면 `syncMode==="locked"`일 때 전역 `viewport`를 바꾸고, **다른 뷰어는 동일 좌표계 기준**으로 재렌더링합니다(상대 좌표 **[0~1] center 비율** 유지 추천).

------

# 8) Canvas 뷰어 구현(zoom/pan 동기화)

```tsx
// src/components/ImageCanvas.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "../store";
import { CURSOR_ZOOM_CENTERED, MAX_ZOOM, MIN_ZOOM, PAN_SPEED, RESPECT_EXIF, WHEEL_ZOOM_STEP, USE_OFFSCREEN } from "../config";

type Props = {
  file?: File;     // 없는 폴더면 undefined 가능
  label: string;   // "A" | "B" | "C"
};

export const ImageCanvas: React.FC<Props> = ({ file, label }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [bitmap, setBitmap] = useState<ImageBitmap | null>(null);
  const { viewport, setViewport, syncMode } = useStore();

  // 이미지 로드
  useEffect(() => {
    let revoked = false;
    if (!file) { setBitmap(null); return; }
    (async () => {
      const opts: ImageBitmapOptions = RESPECT_EXIF ? { imageOrientation: "from-image" as any } : {};
      const bmp = await createImageBitmap(file, opts);
      if (!revoked) setBitmap(bmp);
    })();
    return () => { revoked = true; };
  }, [file]);

  // 렌더링
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !bitmap) return;
    const ctx = canvas.getContext("2d")!;
    const { width, height } = canvas.getBoundingClientRect();
    // 실제 pixel size 반영
    canvas.width = Math.round(width);
    canvas.height = Math.round(height);

    // viewport -> 화면 변환
    const scale = viewport.scale;
    const cx = viewport.cx * bitmap.width;
    const cy = viewport.cy * bitmap.height;

    const drawW = bitmap.width * scale;
    const drawH = bitmap.height * scale;

    const x = Math.round((canvas.width / 2) - (cx * scale));
    const y = Math.round((canvas.height / 2) - (cy * scale));

    // 성능: OffscreenCanvas 사용 (선택)
    if (USE_OFFSCREEN && (canvas as any).transferControlToOffscreen) {
      // 단순도 위해 여기서는 2D 동기 렌더
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, x, y, drawW, drawH);
  }, [bitmap, viewport]);

  // 상호작용: wheel zoom / drag pan
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !bitmap) return;

    let isDown = false;
    let lastX = 0, lastY = 0;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const { left, top, width, height } = canvas.getBoundingClientRect();
      const mx = e.clientX - left;
      const my = e.clientY - top;

      const preScale = viewport.scale;
      const delta = e.deltaY < 0 ? WHEEL_ZOOM_STEP : (1 / WHEEL_ZOOM_STEP);
      let next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, preScale * delta));
      if (next === preScale) return;

      let { cx, cy } = viewport;

      if (CURSOR_ZOOM_CENTERED) {
        // 화면좌표(mx,my)를 이미지 정규좌표로 역변환 → center 보정
        const imgW = bitmap.width, imgH = bitmap.height;
        const drawW = imgW * preScale, drawH = imgH * preScale;
        const x = (canvas.width / 2) - (cx * imgW * preScale);
        const y = (canvas.height / 2) - (cy * imgH * preScale);
        const imgX = (mx - x) / drawW; // [0..1]
        const imgY = (my - y) / drawH;

        // 새 scale에 맞춰 center 유지
        const drawW2 = imgW * next, drawH2 = imgH * next;
        const x2 = mx - imgX * drawW2;
        const y2 = my - imgY * drawH2;
        const newCxPx = ( (canvas.width/2) - x2 ) / next; // px
        const newCyPx = ( (canvas.height/2) - y2 ) / next;
        cx = newCxPx / imgW;
        cy = newCyPx / imgH;
      }
      // 동기화 모드일 때 전역 변경
      if (syncMode === "locked") {
        setViewport({ scale: next, cx, cy });
      }
    };

    const onDown = (e: MouseEvent) => { isDown = true; lastX = e.clientX; lastY = e.clientY; };
    const onUp = () => { isDown = false; };
    const onMove = (e: MouseEvent) => {
      if (!isDown) return;
      e.preventDefault();
      const dx = (e.clientX - lastX) * PAN_SPEED;
      const dy = (e.clientY - lastY) * PAN_SPEED;
      lastX = e.clientX; lastY = e.clientY;

      // 화면 이동 → center 보정
      const imgW = bitmap.width, imgH = bitmap.height;
      const dpX = -dx / (viewport.scale * imgW);
      const dpY = -dy / (viewport.scale * imgH);
      let cx = viewport.cx + dpX;
      let cy = viewport.cy + dpY;

      // 경계 제한(여유 허용 가능)
      cx = Math.min(1.2, Math.max(-0.2, cx));
      cy = Math.min(1.2, Math.max(-0.2, cy));

      if (syncMode === "locked") setViewport({ cx, cy });
    };

    canvas.addEventListener("wheel", onWheel, { passive: false });
    canvas.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("mousemove", onMove);

    return () => {
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("mousemove", onMove);
    };
  }, [bitmap, viewport, syncMode, setViewport]);

  return (
    <div className="viewer">
      <div className="viewer__label">{label}</div>
      <canvas ref={canvasRef} className="viewer__canvas" />
      {!file && <div className="viewer__placeholder">No Image</div>}
    </div>
  );
};
```

> 한 뷰어에서 변경 시 `syncMode==="locked"`이면 전역 `viewport`가 갱신되어 **모든 뷰어가 같은 위치/배율**을 따라갑니다.

------

# 9) App 구성(폴더 선택 + 매칭 + 리스트 + 뷰어 2~3개)

```tsx
// src/App.tsx
import React, { useMemo, useRef, useState } from "react";
import { filesFromInput, matchFilenames, pickDirectory } from "./utils";
import { ImageCanvas } from "./components/ImageCanvas";
import { useStore } from "./store";
import type { FolderKey, MatchedItem } from "./types";

function useFolderPickers() {
  const [A, setA] = useState<Map<string, File> | undefined>();
  const [B, setB] = useState<Map<string, File> | undefined>();
  const [C, setC] = useState<Map<string, File> | undefined>();

  const pick = async (key: FolderKey) => {
    const map = await pickDirectory();
    if (key === "A") setA(map);
    if (key === "B") setB(map);
    if (key === "C") setC(map);
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
          <label> or load via input:
            <input ref={inputRefs.A} type="file" webkitdirectory="true" multiple onChange={(e)=>onInput("A", e)} />
            <input ref={inputRefs.B} type="file" webkitdirectory="true" multiple onChange={(e)=>onInput("B", e)} />
            <input ref={inputRefs.C} type="file" webkitdirectory="true" multiple onChange={(e)=>onInput("C", e)} />
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
```

------

# 10) 기본 스타일(CSS, 반응형 2–3열)

```css
/* src/app.css (임의) */
.app { display:flex; flex-direction: column; gap: 8px; height: 100vh; }
header { display:flex; flex-direction: column; gap: 8px; padding: 8px; border-bottom: 1px solid #ddd; }
.controls { display:flex; gap: 8px; flex-wrap: wrap; align-items:center; }
main { flex:1; display:flex; min-height: 0; }

.filelist { width: 280px; border-right: 1px solid #eee; overflow:auto; padding: 8px; }
.filelist ul { list-style:none; padding:0; margin:0; }
.filelist li { padding: 6px 8px; cursor:pointer; display:flex; justify-content:space-between; }
.filelist li.active { background:#eef7ff; }

.viewers { flex:1; display:grid; grid-template-columns: repeat(3, 1fr); gap: 8px; padding: 8px; min-width:0; }
.viewer { position: relative; background:#111; border-radius: 6px; overflow:hidden; }
.viewer__canvas { width: 100%; height: 100%; display:block; }
.viewer__label { position:absolute; top:6px; left:6px; color:#fff; font-weight:bold; background:rgba(0,0,0,.4); padding:2px 6px; border-radius:4px; }
.viewer__placeholder { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; color:#999; }

@media (max-width: 1200px) {
  .viewers { grid-template-columns: repeat(2, 1fr); }
}
```

> 필요 시 2개의 뷰어만 쓰면 2열, 3개면 3열, CSS grid로 자동 대응.

------

# 11) 주요 동작 검증 체크리스트

-  서로 다른 크기의 이미지에서도 **동일 위치**가 보이는가? (center 비율 기반이면 OK)
-  **휠 zoom** 시 커서 기준으로 확대/축소가 유지되는가?
-  **drag pan** 시 다른 뷰어와 **동기화**가 즉시 반영되는가?
-  **Reset**이 모든 뷰어를 원점으로 복구하는가?
-  **확장자 제거 매칭** 옵션 ON/OFF 시 매칭 결과가 기대대로인가?
-  A/B/C 중 일부 폴더가 비어도 UI가 깨지지 않는가?

------

# 12) 성능/안정성 팁

- **createImageBitmap({ imageOrientation: 'from-image' })**로 EXIF 회전 자동 처리(설정 `RESPECT_EXIF`).
- 큰 이미지 연속 렌더 시 **requestAnimationFrame** 배치, **debounce**(wheel/drag) 고려.
- 매우 거대한 이미지(수만×수만)는 **tile pyramid**(Deep Zoom)로 확장 설계.
- **OffscreenCanvas** 지원 시 worker 렌더 파이프라인 고려(현재 코드는 단순 동기).
- 필요하면 `imageSmoothingEnabled=false` 옵션으로 pixel-accurate 확인 모드 제공.
- 뷰어별 **blend mode**(CSS `mix-blend-mode: difference`) 추가하면 미세 차이 확인에 유용.

------

# 13) 확장 기능 로드맵(선택)

1. **Sync axis lock:** X만 동기화 / Y만 동기화
2. **Minimap:** 전체 썸네일 + viewport rect
3. **Split slider / wipe:** 한 캔버스에 A/B overlay + 슬라이더
4. **Blink:** A/B 빠르게 토글(키보드 `space`)
5. **Ruler / crosshair / delta readout:** 동일 좌표 픽셀값 비교
6. **Hotkeys:** `+/-` zoom, `R` reset, `L` lock toggle 등

------

# 14) 빠른 변수 조정 가이드

- **배율 범위:** `MIN_ZOOM`, `MAX_ZOOM`
- **휠 민감도:** `WHEEL_ZOOM_STEP`
- **pan 속도:** `PAN_SPEED`
- **zoom 중심:** `CURSOR_ZOOM_CENTERED=true/false`
- **EXIF 회전 반영:** `RESPECT_EXIF=true/false`

------

# 15) 마무리

위 스텝을 그대로 적용하시면 **폴더 2~3개 로딩 → 파일명 매칭 → 동기화 zoom/pan 뷰어**를 깔끔하게 구현하실 수 있습니다.
 원하시면 **difference/blend** 혹은 **split slider** 버전 코드도 바로 붙여드리겠습니다.