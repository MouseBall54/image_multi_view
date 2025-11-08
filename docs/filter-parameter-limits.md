# Filter Parameter Limits (4K Safety)

고해상도(특히 4K) 이미지에서 연산량이 폭증할 수 있는 필터 파라미터의 현재 상한과 권장 상한을 정리했습니다. 권장치 이하로 조정하면 프리뷰/필터 체인 적용 시 GPU·CPU 사용량을 안정적으로 유지할 수 있습니다. 슬라이더의 상한을 바꾸려면 `src/components/FilterControls.tsx`의 해당 `<input type="range">`와 `InlineNumber` 설정을 함께 수정하면 됩니다.

| 필터 | 파라미터 | 현재 상한 | 권장 상한 | 수정 위치 |
| --- | --- | --- | --- | --- |
| Edge Preserving/Bilateral | `kernelSize` | 21 | 15 | `src/components/FilterControls.tsx:669` & `src/components/FilterControls.tsx:671` |
|  | `sigmaColor` | 100 | 50 | `src/components/FilterControls.tsx:674-676` |
|  | `sigmaSpace` | 100 | 40 | `src/components/FilterControls.tsx:678-680` |
| Morphology (`morph_*`) | `kernelSize` | 25 | 15 | `src/components/FilterControls.tsx:685-695` |
| Box/Median/Weighted Median/Local Histogram EQ | `kernelSize` | 21 | 13–15 | `src/components/FilterControls.tsx:713-735` |
| Gaussian Blur / LoG / DoG / Marr-Hildreth | `kernelSize` | 21 | 15 | `src/components/FilterControls.tsx:748-909` (각 섹션 공통) |
|  | `sigma`, `sigma2` | 10 | 5 | `src/components/FilterControls.tsx:771-905` |
| Gabor | `kernelSize` | 31 | 21 | `src/components/FilterControls.tsx:1257-1269` |
|  | `lambda` | 20 | 15 | `src/components/FilterControls.tsx:1284-1286` |
|  | `sigma` | 10 | 6 | `src/components/FilterControls.tsx:1279-1281` |
|  | `gamma` | 1 | 0.8 | `src/components/FilterControls.tsx:1289-1291` |
| Laws Texture Energy | `kernelSize` | 25 | 17 | `src/components/FilterControls.tsx:1301-1330` |
| Guided Filter | `kernelSize`(radius) | 20 | 12 | `src/components/FilterControls.tsx:1335-1354` |
|  | `epsilon` | 0.2 | 0.2 (유지) | – |
| CLAHE | `gridSize` | 16 | 12 | `src/components/FilterControls.tsx:1132-1171` |
|  | `clipLimit` | 10 | 6 | `src/components/FilterControls.tsx:1135-1151` |
| Local Histogram Equalization | `kernelSize` | 21 | 13–15 | `src/components/FilterControls.tsx:713-735` |

## 적용 방법
1. 각 파라미터의 `max` 속성(및 필요 시 `min`/`step`)을 권장치로 변경합니다.
2. 동일 블록의 `InlineNumber` 컴포넌트 `max` 값도 동일하게 맞춰 사용자가 직접 숫자를 입력할 때도 동일한 제한이 적용되도록 합니다.
3. 무거운 필터일수록 `PERFORMANCE` 설정(`src/config.ts`)에서 추가적인 `HEAVY_FILTER_THROTTLE`에 포함되는지 확인해 필요하면 목록을 확장합니다.

이 가이드를 유지보수하면서 새로운 필터가 추가될 때도 동일한 방식으로 상한을 검토해 주세요.*** End Patch
