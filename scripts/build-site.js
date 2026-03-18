#!/usr/bin/env node

/**
 * Build website and copy data files
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(__dirname, '..');
const SITE_DIR = path.join(ROOT_DIR, 'site');
const DATA_DIR = path.join(ROOT_DIR, 'data');

console.log('Building website...');

// Run mkdocs build
try {
  execSync('mkdocs build', {
    cwd: ROOT_DIR,
    stdio: 'inherit'
  });
} catch (error) {
  console.error('Build failed:', error.message);
  process.exit(1);
}

// Copy data files to site directory
console.log('\nCopying data files to site...');
fs.mkdirSync(path.join(SITE_DIR, 'data'), { recursive: true });

const dataFiles = ['latest.json', 'history.json', 'schema.json'];
for (const file of dataFiles) {
  const srcPath = path.join(DATA_DIR, file);
  const destPath = path.join(SITE_DIR, 'data', file);

  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, destPath);
    console.log(`  ✓ Copied ${file}`);
  } else {
    console.log(`  ⚠ ${file} not found, skipping`);
  }
}

console.log('\n✅ Website built successfully with data files!');
console.log(`   Site: ${SITE_DIR}`);
