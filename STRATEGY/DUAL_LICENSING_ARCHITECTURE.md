# compareX 듀얼 라이센싱 아키텍처 설계서

## 📋 개요

compareX의 상업화를 위한 **듀얼 라이센싱 모델** 구현 설계서입니다. Community Edition(MIT)과 Enterprise Edition(Commercial) 두 버전으로 분리하여 오픈소스 커뮤니티를 유지하면서 상업적 수익을 창출하는 구조를 제시합니다.

### 핵심 설계 원칙
- **Monorepo 아키텍처**: 단일 저장소에서 코드 중복 최소화
- **기능 기반 분리**: Community/Enterprise 기능 명확한 구분
- **확장 가능한 구조**: 향후 에디션 추가 용이
- **보안 중심**: Enterprise 코드 보안 및 라이센스 검증

---

## 🏗️ Git 저장소 관리 전략

### **권장: Monorepo 접근법**

```
📁 compareX/ (단일 저장소)
├── 🔓 packages/community/     # MIT 라이센스 (공개)
├── 🔐 packages/enterprise/    # Commercial 라이센스 (비공개)  
├── 🤝 packages/shared/        # 공통 라이브러리
├── 🚀 scripts/               # 빌드/배포 스크립트
├── 🔧 tools/                 # 개발 도구
├── 📚 docs/                  # 문서
└── 🧪 tests/                 # 통합 테스트
```

**장점**:
- 코드 중복 최소화 (공통 기능은 shared에서 관리)
- 공통 버그 수정 시 양쪽에 자동 반영
- CI/CD 파이프라인 통합 관리
- 개발 생산성 향상

---

## 📂 상세 프로젝트 구조

### 전체 구조
```
📁 compareX/
├── 📦 packages/
│   ├── 🤝 shared/                    # 공통 라이브러리
│   │   ├── package.json
│   │   ├── src/
│   │   │   ├── core/               # 핵심 로직
│   │   │   │   ├── types.ts
│   │   │   │   ├── config.ts
│   │   │   │   └── store-base.ts
│   │   │   ├── components/         # 기본 UI
│   │   │   │   ├── LoadingSpinner.tsx
│   │   │   │   ├── Toast.tsx
│   │   │   │   └── ImageInfoPanel.tsx
│   │   │   └── utils/              # 유틸리티
│   │   │       ├── folder.ts
│   │   │       ├── match.ts
│   │   │       └── viewTransforms.ts
│   │   └── dist/                   # 빌드 결과물
│   │
│   ├── 🔓 community/                 # Community Edition
│   │   ├── package.json             # MIT 라이센스
│   │   ├── src/
│   │   │   ├── main.tsx
│   │   │   ├── App.tsx
│   │   │   ├── store.ts            # Community 상태관리
│   │   │   ├── modes/
│   │   │   │   └── CompareMode.tsx  # Compare 모드만
│   │   │   ├── components/
│   │   │   │   ├── ImageCanvas.tsx  # 기본 캔버스
│   │   │   │   └── FilterControls.tsx # 기본 필터 15개
│   │   │   └── utils/
│   │   │       └── filters-basic.ts # Community 필터
│   │   ├── public/
│   │   ├── dist/
│   │   └── electron/
│   │
│   └── 🔐 enterprise/               # Enterprise Edition  
│       ├── package.json            # Commercial 라이센스
│       ├── src/
│       │   ├── main.tsx
│       │   ├── App.tsx
│       │   ├── store.ts           # Enterprise 상태관리
│       │   ├── modes/             # 모든 모드
│       │   │   ├── CompareMode.tsx
│       │   │   ├── PinpointMode.tsx
│       │   │   └── AnalysisMode.tsx
│       │   ├── components/        # 고급 컴포넌트
│       │   │   ├── ImageCanvas.tsx    # 확장된 캔버스
│       │   │   ├── FilterControls.tsx # 모든 필터 60+
│       │   │   ├── FilterCart.tsx
│       │   │   └── Minimap.tsx
│       │   ├── utils/
│       │   │   ├── filters-advanced.ts
│       │   │   ├── opencvFilters.ts
│       │   │   └── licensing.ts    # 라이센스 검증
│       │   ├── server/            # API 서버
│       │   │   ├── api/
│       │   │   └── routes/
│       │   └── batch/             # 배치 처리
│       ├── public/
│       ├── dist/
│       └── electron/
│
├── 🚀 scripts/                      # 빌드 및 배포 스크립트
│   ├── build-community.js
│   ├── build-enterprise.js
│   ├── deploy-community.js
│   └── deploy-enterprise.js
│
├── 🔧 tools/                        # 개발 도구
│   ├── license-generator/          # 라이센스 키 생성
│   ├── migration/                  # 기존 코드 마이그레이션
│   └── testing/                   # 공통 테스트 도구
│
├── 📚 docs/                         # 문서
│   ├── community/                 # Community 문서
│   ├── enterprise/                # Enterprise 문서
│   └── development/               # 개발 문서
│
├── 🧪 tests/                        # 통합 테스트
│   ├── community/
│   ├── enterprise/
│   └── shared/
│
├── 📦 releases/                     # 배포 파일
│   ├── community/
│   └── enterprise/
│
├── .github/                        # CI/CD
│   └── workflows/
│       ├── build-community.yml
│       ├── build-enterprise.yml
│       └── security-scan.yml
│
├── package.json                    # 루트 워크스페이스
├── lerna.json                      # Monorepo 관리
└── README.md
```

---

## 🔧 코드 분리 매트릭스

### SHARED 모듈 (공통 사용)
```typescript
const SHARED_MODULES = {
  core: [
    'src/types.ts',           // 기본 타입 정의
    'src/config.ts',          // 기본 설정
    'src/store.ts',           // 상태 관리 (기본 기능만)
    'src/utils/folder.ts',    // 폴더 관리
    'src/utils/naturalSort.ts', // 정렬
    'src/utils/match.ts',     // 파일 매칭
  ],
  components: [
    'src/components/LoadingSpinner.tsx',
    'src/components/Toast.tsx',
    'src/components/ToastContainer.tsx',
    'src/components/ImageInfoPanel.tsx',
    'src/components/FolderControl.tsx',
  ],
  utils: [
    'src/utils/viewTransforms.ts',
    'src/utils/electronHelpers.ts',
    'src/utils/utif.ts',      // TIFF 지원
  ]
};
```

### COMMUNITY 전용 (15개 기본 필터)
```typescript
const COMMUNITY_MODULES = {
  filters: [
    'Grayscale', 'Invert', 'Brightness', 'Contrast',
    'Gaussian Blur', 'Sharpen', 'Emboss', 'Edge Detection',
    'Sepia', 'Vintage', 'Noise', 'Pixelate',
    'Oil Painting', 'Posterize', 'Vignette'
  ],
  modes: [
    'src/modes/CompareMode.tsx'  // Compare 모드만
  ],
  components: [
    'src/components/ImageCanvas.tsx',  // 기본 캔버스
    'src/components/FilterControls.tsx', // 기본 필터만
    'src/components/LayoutGridSelector.tsx',
  ]
};
```

### ENTERPRISE 전용 (고급 기능)
```typescript
const ENTERPRISE_MODULES = {
  advancedFilters: [
    // OpenCV 고급 필터 45개
    'Bilateral Filter', 'Non-local Means', 'Anisotropic Diffusion',
    'Gabor Filter', 'LBP', 'CLAHE', 'Morphology Operations',
    // 과학적 Colormap
    'Viridis', 'Inferno', 'Plasma', 'Magma', 'Turbo'
  ],
  modes: [
    'src/modes/PinpointMode.tsx',  // 정밀 정렬
    'src/modes/AnalysisMode.tsx'   // 심층 분석
  ],
  components: [
    'src/components/FilterCart.tsx',        // 고급 필터 체인
    'src/components/FilterPreviewModal.tsx', // 실시간 미리보기
    'src/components/Minimap.tsx',           // 고급 네비게이션
    'src/components/PinpointViewerControls.tsx',
    'src/components/PinpointScaleControl.tsx',
  ],
  features: [
    'Batch Processing',    // 배치 처리
    'API Server',         // REST API
    'Advanced Export',    // PDF, Excel 내보내기
    'Project Management', // 프로젝트 저장/로드
  ]
};
```

---

## 📦 빌드 시스템 설계

### 루트 package.json (워크스페이스 관리)
```json
{
  "name": "compareX",
  "version": "2.0.0",
  "private": true,
  "workspaces": [
    "packages/shared",
    "packages/community", 
    "packages/enterprise"
  ],
  "scripts": {
    "build:all": "lerna run build",
    "build:community": "npm run build --workspace=packages/community",
    "build:enterprise": "npm run build --workspace=packages/enterprise",
    "test:all": "lerna run test",
    "dev:community": "npm run dev --workspace=packages/community",
    "dev:enterprise": "npm run dev --workspace=packages/enterprise",
    
    // 패키징
    "package:community": "npm run package --workspace=packages/community",
    "package:enterprise": "npm run package --workspace=packages/enterprise",
    
    // 배포
    "deploy:community": "scripts/deploy-community.js",
    "deploy:enterprise": "scripts/deploy-enterprise.js"
  },
  "devDependencies": {
    "lerna": "^7.0.0",
    "husky": "^8.0.0",
    "lint-staged": "^13.0.0"
  }
}
```

### Community Edition package.json
```json
{
  "name": "@compareX/community",
  "version": "2.0.0",
  "license": "MIT",
  "main": "dist/electron/main.js",
  "scripts": {
    "dev": "concurrently \"vite\" \"electron .\"",
    "build": "vite build && electron-builder",
    "package": "electron-builder --dir",
    "dist": "electron-builder --publish=never"
  },
  "dependencies": {
    "@compareX/shared": "workspace:*",
    "react": "^18.2.0",
    "electron": "^27.0.0"
  },
  "build": {
    "appId": "com.compareX.community",
    "productName": "compareX Community",
    "directories": {
      "output": "../../releases/community"
    },
    "files": ["dist/**/*"],
    "publish": {
      "provider": "github",
      "repo": "compareX-community",
      "releaseType": "release"
    }
  }
}
```

### Enterprise Edition package.json
```json
{
  "name": "@compareX/enterprise",
  "version": "2.0.0", 
  "license": "COMMERCIAL",
  "main": "dist/electron/main.js",
  "scripts": {
    "dev": "concurrently \"vite\" \"electron .\"",
    "build": "vite build && electron-builder", 
    "package": "electron-builder --dir",
    "dist": "electron-builder --publish=never"
  },
  "dependencies": {
    "@compareX/shared": "workspace:*",
    "react": "^18.2.0",
    "electron": "^27.0.0",
    "opencv-ts": "^1.3.6"
  },
  "build": {
    "appId": "com.compareX.enterprise",
    "productName": "compareX Enterprise",
    "directories": {
      "output": "../../releases/enterprise"
    },
    "files": ["dist/**/*"],
    "publish": {
      "provider": "s3",
      "bucket": "compareX-enterprise-releases",
      "region": "us-east-1"
    }
  }
}
```

---

## 🔐 라이센스 검증 시스템

### RSA 기반 라이센스 관리
```typescript
// packages/enterprise/src/utils/licensing.ts
export interface LicenseInfo {
  version: string;
  companyName: string;
  email: string;
  userId: string;
  userCount: number;
  features: string[];
  issuedAt: number;
  expiresAt?: number;
  signature: string;
  hardwareId?: string;
}

export class LicenseManager {
  // RSA 공개키로 라이센스 서명 검증
  static validateLicense(licenseKey: string): LicenseValidationResult {
    try {
      const decoded = Buffer.from(licenseKey, 'base64').toString('utf8');
      const license: LicenseInfo = JSON.parse(decoded);

      // 서명 검증
      if (!this.verifySignature(license)) {
        return { valid: false, error: 'Invalid license signature' };
      }

      // 만료일 확인
      if (license.expiresAt && Date.now() > license.expiresAt) {
        return { valid: false, error: 'License expired' };
      }

      // 하드웨어 ID 확인
      if (license.hardwareId && !this.verifyHardwareId(license.hardwareId)) {
        return { valid: false, error: 'Hardware mismatch' };
      }

      return { valid: true, license };
    } catch (error) {
      return { valid: false, error: 'Invalid license format' };
    }
  }

  // 기능 활성화 확인
  static hasFeature(license: LicenseInfo | null, feature: string): boolean {
    if (!license) return false;
    return license.features.includes(feature) || license.features.includes('*');
  }
}
```

### 기능 게이팅 시스템
```typescript
// packages/shared/src/core/features.ts
export enum FeatureFlags {
  // 기본 기능 (Community + Enterprise)
  BASIC_FILTERS = 'basic_filters',
  COMPARE_MODE = 'compare_mode',
  BASIC_EXPORT = 'basic_export',

  // Enterprise 전용
  ADVANCED_FILTERS = 'advanced_filters',
  PINPOINT_MODE = 'pinpoint_mode', 
  ANALYSIS_MODE = 'analysis_mode',
  SCIENTIFIC_COLORMAP = 'scientific_colormap',
  BATCH_PROCESSING = 'batch_processing',
  API_SERVER = 'api_server',
  ADVANCED_EXPORT = 'advanced_export',
  TECHNICAL_SUPPORT = 'technical_support',
  UNLIMITED_USAGE = 'unlimited_usage'
}

// Community 기본 제공 기능
export const COMMUNITY_FEATURES = [
  FeatureFlags.BASIC_FILTERS,
  FeatureFlags.COMPARE_MODE, 
  FeatureFlags.BASIC_EXPORT
];

// Enterprise 전체 기능
export const ENTERPRISE_FEATURES = [
  ...COMMUNITY_FEATURES,
  FeatureFlags.ADVANCED_FILTERS,
  FeatureFlags.PINPOINT_MODE,
  FeatureFlags.ANALYSIS_MODE,
  FeatureFlags.SCIENTIFIC_COLORMAP,
  FeatureFlags.BATCH_PROCESSING,
  FeatureFlags.API_SERVER,
  FeatureFlags.ADVANCED_EXPORT,
  FeatureFlags.TECHNICAL_SUPPORT,
  FeatureFlags.UNLIMITED_USAGE
];
```

### React 컴포넌트 라이센스 체크
```typescript
// 기능별 라이센스 체크 훅
export const useLicenseFeature = (feature: string) => {
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkLicense = () => {
      const result = LicenseManager.loadSavedLicense();
      if (result.valid && result.license) {
        setHasAccess(LicenseManager.hasFeature(result.license, feature));
      } else {
        setHasAccess(false);
      }
      setLoading(false);
    };

    checkLicense();
  }, [feature]);

  return { hasAccess, loading };
};

// 컴포넌트에서 사용 예시
const PinpointMode = () => {
  const { hasAccess, loading } = useLicenseFeature(FeatureFlags.PINPOINT_MODE);
  
  if (loading) return <LoadingSpinner />;
  
  if (!hasAccess) {
    return <UpgradePrompt feature="Pinpoint Mode" />;
  }
  
  return <PinpointModeComponent />;
};
```

---

## 🎯 Community vs Enterprise 기능 비교

### Community Edition 제한사항
```typescript
const COMMUNITY_LIMITS = {
  // 기능 제한
  maxImageSize: 50 * 1024 * 1024, // 50MB
  maxFiltersPerChain: 5,
  maxSimultaneousViewers: 4,
  maxProjectSize: 100,
  
  // 고급 기능 제한
  advancedFilters: false,
  batchProcessing: false,
  apiServer: false,
  cloudSync: false,
  technicalSupport: false,
  
  // 내보내기 제한
  exportFormats: ['PNG', 'JPEG'], // PDF, TIFF 등 제외
  exportQuality: 'standard', // high, lossless 제외
  
  // 사용 제한
  watermark: true, // Community 워터마크
  maxSessionTime: 2 * 60 * 60 * 1000, // 2시간 세션 제한
};
```

### Enterprise Edition 전용 기능
```typescript
const ENTERPRISE_FEATURES = {
  // 무제한 사용
  unlimitedImageSize: true,
  unlimitedFilters: true,
  unlimitedViewers: true,
  unlimitedProjects: true,
  
  // 고급 분석 기능
  advancedFilters: {
    scientificColormap: ['viridis', 'inferno', 'plasma', 'magma'],
    morphologyOperations: ['opening', 'closing', 'tophat', 'blackhat'],
    frequencyDomain: ['dft', 'dct', 'wavelet'],
    textureAnalysis: ['gabor', 'laws', 'lbp'],
    edgePreserving: ['bilateral', 'guided', 'nonlocalmeans'],
  },
  
  // 자동화 및 통합
  batchProcessing: {
    folderProcessing: true,
    scriptableWorkflows: true,
    scheduledTasks: true,
    commandLineInterface: true,
  },
  
  // 협업 기능
  cloudSync: true,
  projectSharing: true,
  versionControl: true,
  teamManagement: true,
  
  // 고급 내보내기
  exportFormats: ['PNG', 'JPEG', 'TIFF', 'PDF', 'SVG', 'Excel', 'CSV'],
  exportQuality: ['standard', 'high', 'lossless'],
  customReports: true,
  
  // 지원 및 서비스
  technicalSupport: {
    email: true,
    chat: true,
    phone: true,
    onsite: true, // Enterprise Plus
  },
  
  // API 및 통합
  restApi: true,
  webhooks: true,
  ssoIntegration: true,
  ldapSync: true,
  
  // 보안 및 규정 준수
  auditLogs: true,
  dataEncryption: true,
  gdprCompliance: true,
  hipaaCompliance: true, // Healthcare
};
```

---

## 🚀 구현 로드맵

### Phase 1: 프로젝트 구조 생성 (1주)
```bash
# 1. 새로운 Monorepo 프로젝트 생성
mkdir compareX
cd compareX

# 2. 워크스페이스 초기화  
npm init -y
npm install -D lerna @types/node typescript

# 3. 기본 폴더 구조 생성
mkdir -p packages/{shared,community,enterprise}
mkdir -p {scripts,tools,docs,tests,releases}
mkdir -p .github/workflows

# 4. Lerna 설정
npx lerna init --independent
```

### Phase 2: 코드 마이그레이션 (2-3주)
```bash
# 1. Shared 라이브러리 구축
# - 공통 타입, 유틸리티 함수 추출
# - 기본 컴포넌트 분리

# 2. Community 버전 구축  
# - 기본 15개 필터만 포함
# - Compare 모드만 활성화
# - MIT 라이센스 적용

# 3. Enterprise 버전 구축
# - 모든 고급 기능 포함
# - 라이센스 검증 시스템 통합
# - Commercial 라이센스 적용
```

### Phase 3: 빌드/배포 시스템 (1주)
```bash  
# 1. CI/CD 파이프라인 구축
# - Community: GitHub Releases
# - Enterprise: Private S3 배포

# 2. 자동화 스크립트 작성
# - 버전 관리 자동화
# - 크로스 플랫폼 빌드
# - 코드 사이닝 자동화
```

---

## 💰 비즈니스 모델

### 가격 정책
- **Community Edition**: 무료 (MIT 라이센스)
- **Enterprise Edition**: $299/사용자/년
- **볼륨 라이센싱**: 5-19명 17% 할인, 20-99명 33% 할인, 100명+ 50% 할인

### 수익 예측
- **Year 1**: $100,000 (25개 Enterprise 고객)
- **Year 2**: $400,000 (100개 Enterprise 고객) 
- **Year 3**: $1,000,000 (200개 Enterprise 고객)

---

## ✅ 주요 장점

### 기술적 장점
- **코드 중복 최소화**: 공통 코드는 shared에서 관리
- **독립적 배포**: Community/Enterprise 각각 독립 릴리즈  
- **확장성**: 새로운 에디션 추가 용이
- **보안**: Enterprise 코드는 비공개 유지
- **개발 효율성**: Monorepo로 통합 개발 환경

### 비즈니스 장점
- **리드 생성**: Community 버전으로 잠재 고객 확보
- **업그레이드 유도**: 기능 제한으로 자연스러운 업셀링
- **브랜드 구축**: 오픈소스 커뮤니티를 통한 인지도 상승
- **시장 검증**: Community 버전으로 시장 반응 테스트
- **지속 가능성**: 오픈소스와 상업적 수익의 균형

---

## 📋 결론

이 듀얼 라이센싱 아키텍처를 통해 현재의 **19,894 LOC 코드베이스**를 효과적으로 분리하면서도 개발 생산성과 코드 품질을 유지할 수 있습니다. **Monorepo 접근법**을 통해 공통 버그 수정이나 기능 개선이 양쪽 에디션에 자동으로 반영되어 유지보수 비용을 크게 절약할 수 있습니다.

특히 **Community Edition을 통한 마케팅 효과**와 **Enterprise Edition의 수익성**을 동시에 확보할 수 있어, compareX의 상업적 성공 확률을 크게 높일 수 있는 전략입니다.