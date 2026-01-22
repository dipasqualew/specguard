/**
 * Utility functions for specguard
 */

import { Colors } from './types';

/**
 * Trim whitespace from a string
 */
export function trim(str: string): string {
  return str.trim();
}

/**
 * Check if a file exists
 */
export async function fileExists(path: string): Promise<boolean> {
  try {
    const file = Bun.file(path);
    return await file.exists();
  } catch {
    return false;
  }
}

/**
 * Read file contents as text
 */
export async function readFile(path: string): Promise<string> {
  const file = Bun.file(path);
  return await file.text();
}

/**
 * Find files matching a glob pattern
 */
export async function findFiles(pattern: string): Promise<string[]> {
  const glob = new Bun.Glob(pattern);
  const files: string[] = [];
  
  for await (const file of glob.scan('.')) {
    files.push(file);
  }
  
  return files;
}

/**
 * Find files in a directory with a specific pattern
 */
export async function findFilesInDir(
  dir: string,
  pattern: string
): Promise<string[]> {
  const glob = new Bun.Glob(pattern);
  const files: string[] = [];
  
  for await (const file of glob.scan(dir)) {
    files.push(file);
  }
  
  return files;
}

/**
 * Colorize text
 */
export function colorize(color: keyof typeof Colors, text: string): string {
  return `${Colors[color]}${text}${Colors.NC}`;
}

/**
 * Log with color
 */
export function log(message: string): void {
  console.log(message);
}

/**
 * Log error
 */
export function logError(message: string): void {
  console.error(colorize('RED', message));
}

/**
 * Log success
 */
export function logSuccess(message: string): void {
  console.log(colorize('GREEN', message));
}

/**
 * Log warning
 */
export function logWarning(message: string): void {
  console.log(colorize('YELLOW', message));
}

/**
 * Get directory name from path
 */
export function dirname(path: string): string {
  const parts = path.split('/');
  parts.pop();
  return parts.join('/') || '.';
}

/**
 * Get basename from path (with optional extension removal)
 */
export function basename(path: string, ext?: string): string {
  const parts = path.split('/');
  let base = parts[parts.length - 1] || '';
  
  if (ext && base.endsWith(ext)) {
    base = base.slice(0, -ext.length);
  }
  
  return base;
}

/**
 * Join path components
 */
export function joinPath(...parts: string[]): string {
  return parts
    .filter(Boolean)
    .join('/')
    .replace(/\/+/g, '/');
}

/**
 * Resolve a path to absolute
 */
export function resolvePath(path: string): string {
  if (path.startsWith('/')) {
    return path;
  }
  
  if (path.startsWith('./')) {
    path = path.slice(2);
  }
  
  return joinPath(process.cwd(), path);
}

/**
 * Find the closest .git directory by walking up from a given path
 */
export async function findGitRoot(startPath: string): Promise<string | null> {
  let currentPath = startPath;
  let previousPath = '';
  
  // Keep going up until we hit root or can't go further
  while (currentPath !== '/' && currentPath !== '.' && currentPath !== previousPath) {
    const gitPath = joinPath(currentPath, '.git');
    if (await fileExists(gitPath)) {
      return currentPath;
    }
    
    // Move up one directory
    previousPath = currentPath;
    currentPath = dirname(currentPath);
  }
  
  // Check root directory as well
  if (currentPath === '/') {
    const gitPath = joinPath(currentPath, '.git');
    if (await fileExists(gitPath)) {
      return currentPath;
    }
  }
  
  return null;
}

/**
 * Convert an absolute path to a relative path from the closest .git repo or pwd
 */
export async function makePathRelative(absolutePath: string): Promise<string> {
  // Try to find git root from the file's directory
  const fileDir = dirname(absolutePath);
  const gitRoot = await findGitRoot(fileDir);
  
  // Use git root if found, otherwise use current working directory
  const basePath = gitRoot || process.cwd();
  
  // Make path relative to base
  if (absolutePath.startsWith(basePath + '/')) {
    return absolutePath.slice(basePath.length + 1);
  }
  
  // If the path doesn't start with base path, return as is
  return absolutePath;
}
