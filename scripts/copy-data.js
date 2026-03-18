#!/usr/bin/env node

/**
 * Copy data files from data/ to docs/data/
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const DOCS_DATA_DIR = path.join(ROOT_DIR, 'docs', 'data');

// Create docs/data directory
fs.mkdirSync(DOCS_DATA_DIR, { recursive: true });

// Copy data files
const dataFiles = ['latest.json', 'history.json', 'schema.json'];
for (const file of dataFiles) {
  const srcPath = path.join(DATA_DIR, file);
  const destPath = path.join(DOCS_DATA_DIR, file);

  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, destPath);
  }
}
