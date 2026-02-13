/**
 * File output utilities
 */

import * as fs from 'fs';
import * as path from 'path';
import type { GeneratedData } from '../generator/config';

/**
 * Write generated data to JSON file
 */
export async function writeJSON(filePath: string, data: GeneratedData): Promise<void> {
  const dir = path.dirname(filePath);

  // Create directory if it doesn't exist
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Write JSON file
  const json = JSON.stringify(
    {
      metadata: {
        generatedAt: new Date().toISOString(),
        version: '1.0.0'
      },
      data
    },
    null,
    2
  );

  fs.writeFileSync(filePath, json, 'utf-8');
}

/**
 * Format file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Get file stats as string
 */
export function getFileStats(filePath: string): string {
  if (!fs.existsSync(filePath)) {
    return 'File not found';
  }

  const stats = fs.statSync(filePath);
  return `${formatFileSize(stats.size)}`;
}
