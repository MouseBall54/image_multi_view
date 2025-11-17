# 사용 로그 파이프라인 가이드

compareX는 FastAPI + MySQL 조합으로 사용자 행동(앱 실행/업데이트 요청 등)을 기록할 수 있도록 준비되어 있습니다. 앱/업데이트 실행 시 어느 IP에서 사용되는지 추적하는 것이 목적이며, 서버가 준비되지 않은 상태에서도 프론트엔드에서 로그 전송 경로를 미리 구성했습니다.

## 개념

1. `package.json` 의 `usageLogging` 섹션에서 채널(dev/prod) 별 로그 수집 API 엔드포인트를 정의합니다. 배포 환경에 따라 `.env` / 환경변수(`VITE_USAGE_LOG_ENDPOINT[_PROD|_DEV]`, `USAGE_LOG_ENDPOINT[_PROD|_DEV]`)로도 덮어쓸 수 있습니다.
2. 렌더러에서 `logUsageEvent()` (src/utils/usageLogger.ts)를 호출하면 현재 빌드 채널, 사용자 브라우저/OS 정보, 뷰포트 크기 등을 함께 수집합니다.
3. Electron 환경이라면 `preload.js` → `ipcMain` → `electron.js` 경로로 FastAPI 서버에 POST 요청을 보내고, Web 빌드에서는 fetch를 통해 동일한 페이로드를 보냅니다.
4. FastAPI 서버에서 수신한 내용을 MySQL에 적재하면, IP는 서버 측에서 자연스럽게 확인할 수 있습니다(요청 헤더의 `client.host` 값).

> **이벤트 종류**  
> - `app_launch` (렌더러가 최초 마운트)  
> - `app_ready` (Electron 메인 프로세스 준비 완료)  
> - `update_*` 계열: 업데이트 확인/성공/실패/다운로드/설치 요청 등  
> 필요 시 `logUsageEvent()` 호출 위치를 추가해 확장할 수 있습니다.

## 데이터 흐름

```text
React(App) ---> useUsageLogging/useUpdaterTelemetry
            \                                  |
             +--> window.electronAPI.logUsageEvent (Electron 모드)
                      |
                      v
                 ipcMain('log-usage-event')
                      |
             FastAPI POST /api/logs  ---> MySQL INSERT
```

- Electron 외부(웹) 빌드에서도 동일한 페이로드를 FastAPI로 직접 전송합니다.
- 로그는 `{ eventType, timestamp, channel, platform, details, clientContext }` 형태로 전달됩니다.

## 설정 방법

1. `package.json` > `usageLogging` 에 dev/prod 엔드포인트를 등록합니다.
2. 운영 중 동적으로 바꾸고 싶다면 `VITE_USAGE_LOG_ENDPOINT[_PROD|_DEV]` 또는 `USAGE_LOG_ENDPOINT[_PROD|_DEV]` 환경변수를 사용합니다.
3. 서버가 준비되지 않았다면 기본값(`http://localhost:8000/api/logs`)이 사용됩니다.

## FastAPI + MySQL 연동 단계

1. **DB 테이블 정의 예시**
   ```sql
   CREATE TABLE usage_logs (
     id BIGINT AUTO_INCREMENT PRIMARY KEY,
     event_type VARCHAR(50) NOT NULL,
     app_version VARCHAR(50),
     channel VARCHAR(10),
     platform VARCHAR(20),
     arch VARCHAR(10),
     ip_address VARCHAR(45),
     payload JSON,
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   );
   ```
2. **FastAPI 엔드포인트 스텁**
   ```python
   from fastapi import FastAPI, Request
   from pydantic import BaseModel

   app = FastAPI()

   class UsageLog(BaseModel):
       eventType: str
       timestamp: str
       appVersion: str | None = None
       channel: str | None = None
       platform: str | None = None
       arch: str | None = None
       details: dict | None = None
       clientContext: dict | None = None

   @app.post("/api/logs")
   async def store_log(log: UsageLog, request: Request):
       ip = request.client.host
       # TODO: insert into MySQL using preferred ORM/driver
       return {"ok": True}
   ```
3. **MySQL 연동**
   - SQLAlchemy 혹은 asyncmy를 이용해 커넥션 풀 생성
   - INSERT 시 `ip`, `log.dict()` 내용을 JSON으로 저장
4. **운영 고려 사항**
   - 요청 실패 시 Electron 측에서 에러 로그만 남기고 앱 UX는 유지합니다.
   - FastAPI에 rate limit / auth 토큰을 추가하고 싶다면 `usageLogger.ts` 와 `electron.js` 헤더 설정 위치에서 토큰을 함께 전송하면 됩니다.

## 단계별 구현 요약

1. URL/채널 별 설정 → `package.json` + 환경변수
2. 렌더러 공통 유틸 → `src/utils/usageLogger.ts`
3. Electron ↔ 렌더러 IPC → `preload.js`, `electron.js`
4. 앱/업데이트 이벤트 트리거 → `src/hooks/useUsageLogging.ts`, `src/components/ElectronUpdateManager.tsx`
5. FastAPI/MySQL 서버 준비 → 위 예시 코드 + 스키마 참고

위 순서대로 진행하면 서버가 준비되는 즉시 로그가 기록되며, 추가 이벤트도 손쉽게 확장할 수 있습니다.
