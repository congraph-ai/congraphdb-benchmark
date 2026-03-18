#!/usr/bin/env node

/**
 * Serve website with data files support
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(__dirname, '..');
const SITE_DIR = path.join(ROOT_DIR, 'site');
const DATA_DIR = path.join(ROOT_DIR, 'data');

// Function to copy data files
function copyDataFiles() {
  fs.mkdirSync(path.join(SITE_DIR, 'data'), { recursive: true });

  const dataFiles = ['latest.json', 'history.json', 'schema.json'];
  for (const file of dataFiles) {
    const srcPath = path.join(DATA_DIR, file);
    const destPath = path.join(SITE_DIR, 'data', file);

    if (fs.existsSync(srcPath)) {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Initial build and copy
console.log('Building website...');
const mkdocs = spawn('mkdocs', ['build'], { cwd: ROOT_DIR, stdio: 'inherit' });

mkdocs.on('close', () => {
  copyDataFiles();
  console.log('\n✅ Initial build complete. Copying data files...');

  // Start the serve process
  console.log('\nStarting development server...\n');

  const serve = spawn('mkdocs', ['serve', '--no-strict'], {
    cwd: ROOT_DIR,
    stdio: 'inherit'
  });

  // Watch for data file changes and re-copy them
  let timeout = null;
  const dataWatcher = fs.watch(DATA_DIR, (eventType, filename) => {
    if (filename && filename.endsWith('.json')) {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        console.log(`\n📁 Data file changed: ${filename}, copying to site...`);
        copyDataFiles();
      }, 500);
    }
  });

  // Handle shutdown
  process.on('SIGINT', () => {
    dataWatcher.close();
    serve.kill();
    process.exit();
  });

  serve.on('close', (code) => {
    dataWatcher.close();
    process.exit(code);
  });
});
