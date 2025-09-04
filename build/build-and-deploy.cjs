#!/usr/bin/env node

/**
 * CompareX Build and Deploy Script
 * Builds the application and prepares update files for the Generic Server
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

// Configuration
const CONFIG = {
  version: require('../package.json').version,
  serverUrl: 'http://192.168.0.88:8000/updates/',
  buildDir: 'dist-electron',
  outputDir: 'updates',
  productName: 'CompareX'
};

console.log(`🚀 Building CompareX v${CONFIG.version}...`);

// Helper functions
function calculateSHA512(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  const hashSum = crypto.createHash('sha512');
  hashSum.update(fileBuffer);
  return hashSum.digest('hex').toLowerCase();
}

function formatBytes(bytes) {
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function createUpdateMetadata(setupFile) {
  const stats = fs.statSync(setupFile);
  const sha512 = calculateSHA512(setupFile);
  const filename = path.basename(setupFile);
  
  const metadata = {
    version: CONFIG.version,
    files: [
      {
        url: filename,
        sha512: sha512,
        size: stats.size
      }
    ],
    path: filename,
    sha512: sha512,
    releaseDate: new Date().toISOString(),
    releaseNotes: generateReleaseNotes()
  };
  
  return metadata;
}

function generateReleaseNotes() {
  // In real scenario, this could read from CHANGELOG.md or git commits
  return `## CompareX v${CONFIG.version} 업데이트


### 개선사항
- pinpoint 모드 배율 UI 변경, 최종 배율 정보 독립적으로 표시
- 메인 메뉴 아이콘화 및 툴팁 추가
- class 부재 UI 개선
- 주요 기능 UI 프로그램 최상단으로 배치
- analysis 모드 초기 화면 다른 모드와 동일하게 변경
- pinpoint 모드 D&D 이미지뷰에 적용

### 버그 수정
- 이미지 추가 시 temp 폴더 배치 로직 개선
- 네트워크 연결 오류 처리 개선`;
}

function yamlStringify(obj, indent = 0) {
  let yaml = '';
  const spaces = ' '.repeat(indent);
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'object' && !Array.isArray(value) && value !== null) {
      yaml += `${spaces}${key}:\n`;
      yaml += yamlStringify(value, indent + 2);
    } else if (Array.isArray(value)) {
      yaml += `${spaces}${key}:\n`;
      for (const item of value) {
        if (typeof item === 'object') {
          yaml += `${spaces}  - `;
          // Convert the first property to same line
          const entries = Object.entries(item);
          if (entries.length > 0) {
            const [firstKey, firstValue] = entries[0];
            yaml += `${firstKey}: ${typeof firstValue === 'string' ? `'${firstValue}'` : firstValue}\n`;
            
            // Add remaining properties with proper indentation
            for (let i = 1; i < entries.length; i++) {
              const [k, v] = entries[i];
              yaml += `${spaces}    ${k}: ${typeof v === 'string' ? `'${v}'` : v}\n`;
            }
          }
        } else {
          yaml += `${spaces}  - ${item}\n`;
        }
      }
    } else if (typeof value === 'string' && value.includes('\n')) {
      yaml += `${spaces}${key}: |\n`;
      const lines = value.split('\n');
      for (const line of lines) {
        yaml += `${spaces}  ${line}\n`;
      }
    } else {
      yaml += `${spaces}${key}: ${typeof value === 'string' ? `'${value}'` : value}\n`;
    }
  }
  
  return yaml;
}

try {
  // Step 1: Clean previous builds
  console.log('📁 Cleaning previous builds...');
  if (fs.existsSync(CONFIG.buildDir)) {
    execSync(`rimraf ${CONFIG.buildDir}`, { stdio: 'inherit' });
  }
  
  // Step 2: Build the application
  console.log('🔨 Building application...');
  execSync('npm run electron:pack:win', { stdio: 'inherit' });
  
  // Step 3: Find the setup file
  console.log('🔍 Locating setup file...');
  const buildFiles = fs.readdirSync(CONFIG.buildDir);
  const setupFile = buildFiles.find(file => file.includes('setup.exe'));
  
  if (!setupFile) {
    throw new Error('Setup file not found in build directory');
  }
  
  const setupPath = path.join(CONFIG.buildDir, setupFile);
  const stats = fs.statSync(setupPath);
  
  console.log(`✅ Found setup file: ${setupFile}`);
  console.log(`📦 File size: ${formatBytes(stats.size)}`);
  
  // Step 4: Create update metadata
  console.log('📝 Generating update metadata...');
  const metadata = createUpdateMetadata(setupPath);
  
  // Step 5: Create updates directory
  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
  }
  
  // Step 6: Copy setup file and blockmap to updates directory
  console.log('📂 Copying files to updates directory...');
  const destSetupPath = path.join(CONFIG.outputDir, setupFile);
  fs.copyFileSync(setupPath, destSetupPath);
  
  // Copy blockmap file for differential updates
  const blockmapFile = setupFile + '.blockmap';
  const blockmapPath = path.join(CONFIG.buildDir, blockmapFile);
  if (fs.existsSync(blockmapPath)) {
    const destBlockmapPath = path.join(CONFIG.outputDir, blockmapFile);
    fs.copyFileSync(blockmapPath, destBlockmapPath);
    console.log(`✅ Copied blockmap: ${blockmapFile}`);
  } else {
    console.log(`⚠️ Blockmap file not found: ${blockmapFile}`);
  }
  
  // Step 7: Generate latest.yml
  const yamlContent = yamlStringify(metadata);
  const yamlPath = path.join(CONFIG.outputDir, 'latest.yml');
  fs.writeFileSync(yamlPath, yamlContent, 'utf8');
  
  // Step 8: Generate deployment summary
  console.log('\n🎉 Build and deployment preparation completed!\n');
  console.log('📋 Deployment Summary:');
  console.log('═══════════════════════');
  console.log(`Version: ${CONFIG.version}`);
  console.log(`Setup File: ${setupFile}`);
  console.log(`File Size: ${formatBytes(stats.size)}`);
  console.log(`SHA512: ${metadata.sha512}`);
  console.log(`Server URL: ${CONFIG.serverUrl}`);
  console.log(`Output Directory: ${path.resolve(CONFIG.outputDir)}`);
  
  console.log('\n📤 Files created:');
  console.log(`  - ${destSetupPath}`);
  if (fs.existsSync(path.join(CONFIG.outputDir, setupFile + '.blockmap'))) {
    console.log(`  - ${path.join(CONFIG.outputDir, setupFile + '.blockmap')}`);
  }
  console.log(`  - ${yamlPath}`);
  
  console.log('\n🚀 Next steps:');
  console.log('  1. Copy files from updates/ directory to your server');
  console.log(`  2. Ensure server is running on ${CONFIG.serverUrl}`);
  console.log('  3. Test update mechanism with previous version');
  
  console.log('\n🌐 Server deployment commands:');
  console.log(`  # Copy to server (adjust path as needed)`);
  console.log(`  scp updates/* user@192.168.0.88:/path/to/updates/`);
  console.log(`  # Or use Windows copy`);
  console.log(`  copy updates\\* \\\\192.168.0.88\\updates\\`);
  
} catch (error) {
  console.error('\n❌ Build failed:', error.message);
  process.exit(1);
}