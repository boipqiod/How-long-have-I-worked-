# Work Time Tracker - 구현 계획

## 1. 프로젝트 구조

### 1.1 디렉토리 구조
```
work-time-tracker/
├── package.json
├── tsconfig.json
├── electron-builder.json
├── src/
│   ├── main/                 # Main process (Node.js)
│   │   ├── index.ts         # Entry point
│   │   ├── tray.ts          # System tray management
│   │   ├── menu.ts          # Context menu creation
│   │   └── store.ts         # Data persistence
│   ├── renderer/            # Renderer process (UI)
│   │   ├── index.html       # Settings window HTML
│   │   ├── index.ts         # Settings window logic
│   │   └── styles.css       # Styling
│   ├── shared/              # Shared types and utilities
│   │   ├── types.ts         # TypeScript interfaces
│   │   └── constants.ts     # App constants
│   └── assets/              # Icons and resources
│       ├── icon.png         # App icon
│       ├── tray-idle.png    # Tray icon (idle)
│       └── tray-active.png  # Tray icon (active)
├── dist/                    # Build output
└── docs/
    ├── plan.md
    ├── requirements.md
    ├── implementation-plan.md
    └── task-history.md
```

## 2. 기술 스택 상세

### 2.1 Core Dependencies
- **electron**: ^27.0.0 (메인 프레임워크)
- **typescript**: ^5.0.0 (타입 안전성)
- **electron-builder**: ^24.0.0 (빌드/패키징)

### 2.2 Development Dependencies
- **@types/node**: Node.js 타입 정의
- **ts-node**: TypeScript 실행
- **nodemon**: 개발 중 자동 재시작

### 2.3 Utilities
- **electron-store**: 설정 저장
- **node-cron**: 스케줄링 (선택사항)

## 3. 개발 단계별 계획

### Phase 1: 기본 구조 설정
1. **프로젝트 초기화**
   - `pnpm init`
   - TypeScript 설정
   - Electron 기본 설정

2. **기본 Tray 앱 구현**
   - Main process 기본 구조
   - System tray 생성
   - 기본 메뉴 표시

3. **데이터 모델 정의**
   - 타입 정의 (WorkSession, AppSettings 등)
   - 설정 저장/로드 로직

### Phase 2: 핵심 기능 구현
1. **시간 추적 로직**
   - 작업 시작/일시정지/정지
   - 시간 계산 (남은 시간/경과 시간)
   - 타이머 업데이트 (1초마다)

2. **Tray 메뉴 동적 생성**
   - 상태별 메뉴 항목 변경
   - 설정값 반영
   - 메뉴 액션 핸들링

3. **설정 기능**
   - 설정 창 UI (HTML/CSS)
   - 설정값 검증 및 저장
   - 실시간 설정 반영

### Phase 3: 고급 기능 및 완성
1. **알림 및 상태 표시**
   - 작업 완료 알림
   - Tray 아이콘 상태 변경
   - 색상 코딩 (정상/경고/위험)

2. **자동 시작 기능**
   - 시스템 부팅 시 자동 실행
   - 앱 실행 시 자동 작업 시작

3. **데이터 지속성**
   - 일별 작업 기록 저장
   - 앱 재시작 시 상태 복원

## 4. 주요 컴포넌트 설계

### 4.1 Main Process (src/main/index.ts)
```typescript
// Core responsibilities:
// - App lifecycle management
// - Tray creation and management
// - IPC communication setup
// - Settings persistence

class WorkTimeTrackerApp {
  private tray: Tray;
  private workSession: WorkSession | null;
  private settings: AppSettings;
  
  // Main methods:
  // - initialize()
  // - createTray()
  // - updateTrayDisplay()
  // - handleMenuAction()
}
```

### 4.2 Work Session Manager (src/main/workSession.ts)
```typescript
// Core responsibilities:
// - Time tracking logic
// - Session state management
// - Timer updates

class WorkSessionManager {
  // Properties:
  // - startTime, pausedTime, totalPausedDuration
  // - isRunning, isPaused
  // - settings (work duration/end time)
  
  // Methods:
  // - start(), pause(), resume(), stop()
  // - getElapsedTime(), getRemainingTime()
  // - isCompleted()
}
```

### 4.3 Tray Manager (src/main/tray.ts)
```typescript
// Core responsibilities:
// - System tray creation
// - Menu generation based on state
// - Icon updates

class TrayManager {
  // Methods:
  // - createTray()
  // - updateMenu(state, session)
  // - updateIcon(state)
  // - updateTitle(text)
}
```

### 4.4 Settings Manager (src/main/store.ts)
```typescript
// Core responsibilities:
// - Settings persistence
// - Default values
// - Validation

interface AppSettings {
  displayMode: 'remaining' | 'elapsed';
  workMode: 'totalHours' | 'endTime';
  totalHours: number;
  endTime: string;
  autoStartOnBoot: boolean;
  autoStartOnLaunch: boolean;
}
```

## 5. 개발 환경 설정

### 5.1 Scripts (package.json)
```json
{
  "scripts": {
    "dev": "electron src/main/index.ts",
    "build": "tsc && electron-builder",
    "start": "electron dist/main/index.js",
    "pack": "electron-builder --dir",
    "dist": "electron-builder"
  }
}
```

### 5.2 TypeScript 설정
- Strict mode 활성화
- Electron 타입 지원
- Source maps 생성

### 5.3 Electron Builder 설정
- macOS 전용 빌드
- 메뉴바 앱 설정
- Code signing (선택사항)

## 6. 테스트 전략

### 6.1 Unit Tests
- 시간 계산 로직 테스트
- 설정 검증 로직 테스트
- 상태 전환 테스트

### 6.2 Manual Testing
- UI 인터랙션 테스트
- 시스템 통합 테스트
- 성능 테스트 (메모리, CPU 사용량)

## 7. 배포 계획

### 7.1 개발 빌드
- 로컬 테스트용 빌드
- 개발자 서명 없이

### 7.2 프로덕션 빌드
- DMG 파일 생성
- macOS Gatekeeper 호환
- 자동 업데이트 지원 (선택사항)

## 8. 예상 개발 일정

- **Day 1**: 프로젝트 설정 + 기본 Tray 앱
- **Day 2**: 시간 추적 로직 + 메뉴 시스템
- **Day 3**: 설정 UI + 데이터 저장
- **Day 4**: 고급 기능 + 테스트
- **Day 5**: 최적화 + 빌드/배포

## 9. 잠재적 도전 과제

### 9.1 기술적 도전
- Electron 앱 메모리 최적화
- macOS 권한 처리
- 시스템 sleep/wake 이벤트 처리

### 9.2 UX 도전
- 제한된 메뉴바 공간에서의 정보 표시
- 직관적인 설정 인터페이스 설계
- 상태 전환의 명확한 피드백

### 9.3 해결 방안
- Electron의 경량화 패턴 적용
- 네이티브 API 활용
- 사용자 테스트를 통한 UX 개선