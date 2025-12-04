#!/usr/bin/env node

/**
 * compareX Build and Deploy Script
 * Builds the application and prepares update files for the Generic Server
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');
const { URL } = require('url');
const pkg = require('../package.json');

// Configuration
const deployTargets = pkg.deployTargets || {};

const CONFIG = {
  version: pkg.version,
  serverUrl: deployTargets.prod?.serverUrl || 'http://192.168.0.88:8000/updates/',
  buildDir: 'dist-electron',
  outputDir: deployTargets.prod?.outputDir || 'updates',
  productName: 'compareX'
};

const argMode = (process.env.BUILD_MODE ||
  process.argv.slice(2).find((arg) => arg.startsWith('--mode='))?.split('=')[1] ||
  'prod').toLowerCase();

const TARGETS = {
  dev: {
    electronCommand: 'npm run electron:pack:dev',
    serverUrl: deployTargets.dev?.serverUrl || 'http://localhost:8000/updates/',
    outputDir: deployTargets.dev?.outputDir || path.join('updates', 'dev')
  },
  prod: {
    electronCommand: 'npm run electron:pack:win',
    serverUrl: deployTargets.prod?.serverUrl || CONFIG.serverUrl,
    outputDir: deployTargets.prod?.outputDir || path.join('updates', 'prod')
  }
};

if (!TARGETS[argMode]) {
  console.error(`❌ Unknown mode "${argMode}". Supported modes: ${Object.keys(TARGETS).join(', ')}`);
  process.exit(1);
}

const ACTIVE_TARGET = TARGETS[argMode];
CONFIG.serverUrl = ACTIVE_TARGET.serverUrl;
CONFIG.outputDir = ACTIVE_TARGET.outputDir;

console.log(`🎯 Running deploy script in "${argMode}" mode (output -> ${CONFIG.outputDir})`);

console.log(`🚀 Building compareX v${CONFIG.version}...`);

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
  return `

  ## compareX v${CONFIG.version} 업데이트

  ### 개선사항
  - 캡처 창 grid 초기 설정 로직 개선 (bug fix)
`;
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
  console.log(`🔨 Building application with ${ACTIVE_TARGET.electronCommand}...`);
  execSync(ACTIVE_TARGET.electronCommand, { stdio: 'inherit' });
  
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
  const serverHints = (() => {
    const fallback = {
      host: 'server',
      posixPath: '/path/to/updates',
      windowsPath: 'updates'
    };
    try {
      const parsed = new URL(CONFIG.serverUrl);
      const host = parsed.hostname || fallback.host;
      const trimmedPath = parsed.pathname.replace(/\/$/, '') || fallback.posixPath;
      return {
        host,
        posixPath: trimmedPath,
        windowsPath: trimmedPath.replace(/^\//, '').replace(/\//g, '\\') || fallback.windowsPath
      };
    } catch (e) {
      return fallback;
    }
  })();
  const remotePosixPath = `${serverHints.posixPath}/${argMode}`.replace(/\/+/g, '/');
  console.log(`  # Copy to server (adjust path as needed)`);
  console.log(`  scp ${CONFIG.outputDir}/* user@${serverHints.host}:${remotePosixPath}/`);
  console.log(`  # Or use Windows copy`);
  const windowsOutput = CONFIG.outputDir.replace(/\//g, '\\');
  const remoteWindowsPath = `${serverHints.windowsPath}\\${argMode}`.replace(/\\\\+/g, '\\');
  console.log(`  xcopy ${windowsOutput}\\* \\\\${serverHints.host}\\${remoteWindowsPath}\\ /Y /I`);
  
} catch (error) {
  console.error('\n❌ Build failed:', error.message);
  process.exit(1);
}
