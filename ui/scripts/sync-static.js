import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sourceDir = path.resolve(__dirname, '../../server/static');
const targetPackageDir = path.resolve(__dirname, '../../server/src/lecturewhisper/static');
const targetUserDir = path.resolve(os.homedir(), '.lecturewhisper/static');

function syncDir(src, dest) {
  if (!fs.existsSync(src)) {
    console.warn(`[sync-static] Source directory not found: ${src}`);
    return;
  }
  fs.mkdirSync(dest, { recursive: true });
  // Clean destination
  fs.rmSync(dest, { recursive: true, force: true });
  fs.mkdirSync(dest, { recursive: true });
  // Copy all files
  fs.cpSync(src, dest, { recursive: true });
  console.log(`[sync-static] Synced ${src} -> ${dest}`);
}

syncDir(sourceDir, targetPackageDir);
if (fs.existsSync(path.resolve(os.homedir(), '.lecturewhisper'))) {
  syncDir(sourceDir, targetUserDir);
}
