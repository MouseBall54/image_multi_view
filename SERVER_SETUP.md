# Generic Server Setup for CompareX Auto-Updates

## 서버 요구사항

### 1. 기본 HTTP 서버
- **IP**: `192.168.0.88`
- **Port**: `8000`
- **Protocol**: HTTP (개발용), HTTPS (운영용)

### 2. 디렉토리 구조
```
/updates/
├── latest.yml          # 최신 버전 메타데이터
├── CompareX-1.0.0-setup.exe
├── CompareX-1.0.1-setup.exe
└── ...
```

### 3. latest.yml 파일 형식
```yaml
version: 1.0.1
files:
  - url: CompareX-1.0.1-setup.exe
    sha512: [SHA512 해시값]
    size: 45234567
path: CompareX-1.0.1-setup.exe
sha512: [SHA512 해시값]
releaseDate: '2025-09-03T10:30:00.000Z'
releaseNotes: |
  ## 변경사항 v1.0.1
  
  ### 새로운 기능
  - 자동 업데이트 시스템 추가
  - 향상된 이미지 처리 성능
  
  ### 버그 수정
  - 메모리 누수 문제 해결
  - 크래시 안정성 개선
```

## 서버 설정 방법

### Option 1: Node.js Express 서버

```javascript
const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = 8000;

// CORS 설정
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// Static files serving
app.use('/updates', express.static(path.join(__dirname, 'updates')));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 업데이트 체크 엔드포인트
app.get('/updates/latest.yml', (req, res) => {
  const filePath = path.join(__dirname, 'updates', 'latest.yml');
  
  if (fs.existsSync(filePath)) {
    res.setHeader('Content-Type', 'text/yaml');
    res.sendFile(filePath);
  } else {
    res.status(404).json({ error: 'Update metadata not found' });
  }
});

// 파일 다운로드 (진행률 지원)
app.get('/updates/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, 'updates', filename);
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }
  
  const stat = fs.statSync(filePath);
  const range = req.headers.range;
  
  if (range) {
    // Range 요청 처리 (다운로드 진행률 지원)
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
    const chunksize = (end - start) + 1;
    
    res.status(206);
    res.setHeader('Content-Range', `bytes ${start}-${end}/${stat.size}`);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Content-Length', chunksize);
    res.setHeader('Content-Type', 'application/octet-stream');
    
    const stream = fs.createReadStream(filePath, { start, end });
    stream.pipe(res);
  } else {
    // 전체 파일 다운로드
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Update server running on http://0.0.0.0:${PORT}`);
  console.log(`Update endpoint: http://192.168.0.88:${PORT}/updates/`);
});
```

### Option 2: Python Flask 서버

```python
from flask import Flask, send_file, request, jsonify, send_from_directory
from flask_cors import CORS
import os
import hashlib

app = Flask(__name__)
CORS(app)

UPDATE_DIR = 'updates'
PORT = 8000

@app.route('/health')
def health_check():
    return jsonify({'status': 'ok', 'timestamp': datetime.utcnow().isoformat()})

@app.route('/updates/latest.yml')
def get_latest_yml():
    file_path = os.path.join(UPDATE_DIR, 'latest.yml')
    if os.path.exists(file_path):
        return send_file(file_path, mimetype='text/yaml')
    else:
        return jsonify({'error': 'Update metadata not found'}), 404

@app.route('/updates/<filename>')
def download_file(filename):
    file_path = os.path.join(UPDATE_DIR, filename)
    if os.path.exists(file_path):
        return send_file(file_path, as_attachment=True, download_name=filename)
    else:
        return jsonify({'error': 'File not found'}), 404

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=PORT, debug=True)
```

### Option 3: Nginx Static Server

```nginx
server {
    listen 8000;
    server_name 192.168.0.88;
    
    root /path/to/updates;
    
    # CORS 설정
    add_header Access-Control-Allow-Origin *;
    add_header Access-Control-Allow-Methods 'GET, POST, OPTIONS';
    add_header Access-Control-Allow-Headers 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range';
    
    location /updates/ {
        alias /path/to/updates/;
        autoindex off;
        
        # Range 요청 지원 (다운로드 진행률)
        add_header Accept-Ranges bytes;
    }
    
    location /health {
        return 200 '{"status":"ok"}';
        add_header Content-Type application/json;
    }
}
```

## 업데이트 파일 배포 스크립트

### Windows PowerShell 스크립트

```powershell
# deploy-update.ps1
param(
    [Parameter(Mandatory=$true)]
    [string]$Version,
    [string]$ServerPath = "\\192.168.0.88\updates",
    [string]$BuildPath = "dist-electron"
)

# 빌드된 파일 찾기
$setupFile = Get-ChildItem -Path $BuildPath -Filter "*setup.exe" | Select-Object -First 1

if (-not $setupFile) {
    Write-Error "Setup file not found in $BuildPath"
    exit 1
}

# SHA512 해시 계산
$hash = Get-FileHash -Path $setupFile.FullName -Algorithm SHA512

# latest.yml 파일 생성
$yamlContent = @"
version: $Version
files:
  - url: $($setupFile.Name)
    sha512: $($hash.Hash.ToLower())
    size: $($setupFile.Length)
path: $($setupFile.Name)
sha512: $($hash.Hash.ToLower())
releaseDate: '$(Get-Date -Format "yyyy-MM-ddTHH:mm:ss.fffZ")'
releaseNotes: |
  ## 변경사항 v$Version
  
  ### 새로운 기능
  - 자동 업데이트 시스템 개선
  
  ### 버그 수정
  - 안정성 향상
"@

# 서버에 파일 복사
Copy-Item -Path $setupFile.FullName -Destination $ServerPath
Set-Content -Path "$ServerPath\latest.yml" -Value $yamlContent

Write-Host "Update deployed successfully!"
Write-Host "Version: $Version"
Write-Host "File: $($setupFile.Name)"
Write-Host "Hash: $($hash.Hash.ToLower())"
```

## 테스트 방법

### 1. 서버 연결 테스트
```bash
curl -I http://192.168.0.88:8000/health
curl -I http://192.168.0.88:8000/updates/latest.yml
```

### 2. electron-updater 로그 확인
개발자 도구 콘솔에서 다음 로그 확인:
```
Checking for update...
Update available: { version: '1.0.1', ... }
Download progress: 25%
Update downloaded: { version: '1.0.1' }
```

### 3. 수동 업데이트 체크
앱 메뉴 > File > Check for Updates...

## 보안 고려사항

### 1. HTTPS 사용 (운영 환경)
```javascript
// HTTPS 설정 예시
const https = require('https');
const fs = require('fs');

const options = {
  key: fs.readFileSync('path/to/private-key.pem'),
  cert: fs.readFileSync('path/to/certificate.pem')
};

https.createServer(options, app).listen(8000);
```

### 2. 파일 무결성 검증
- SHA512 해시 검증 필수
- 코드 서명 인증서 사용 권장

### 3. 액세스 제한
```nginx
# IP 기반 제한
location /updates/ {
    allow 192.168.0.0/24;
    deny all;
}
```

## 트러블슈팅

### 1. 업데이트 체크 실패
- 서버 연결 상태 확인
- CORS 설정 확인
- latest.yml 파일 형식 검증

### 2. 다운로드 실패
- 파일 권한 확인
- 디스크 용량 확인
- 방화벽/안티바이러스 확인

### 3. 설치 실패
- 관리자 권한 확인
- 기존 프로세스 종료
- Windows Defender 예외 설정