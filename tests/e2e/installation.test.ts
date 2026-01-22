/**
 * E2E tests for installation script
 */

import { describe, it, expect, afterEach } from 'vitest';
import { execa } from 'execa';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs-extra';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../..');
const INSTALL_SCRIPT = path.join(PROJECT_ROOT, 'src/install.ts');
const SPECGUARD_SOURCE = path.join(PROJECT_ROOT, 'src/index.ts');

describe('Installation E2E Tests', () => {
  let testDirs: string[] = [];

  afterEach(async () => {
    // Cleanup test directories
    for (const dir of testDirs) {
      await fs.remove(dir);
    }
    testDirs = [];
  });

  it('should install to custom path with local source', async () => {
    // step("Parse command line arguments for custom install path")
    const testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'specguard-test-'));
    testDirs.push(testDir);

    const installPath = path.join(testDir, 'bin', 'specguard');

    // step("Use local source file for installation")
    const result = await execa(
      'bun',
      [
        'run',
        INSTALL_SCRIPT,
        '--install-path',
        installPath,
        '--local-source',
        SPECGUARD_SOURCE,
      ],
      { reject: false }
    );

    // step("Copy script to install location")
    // step("Make script executable")
    expect(await fs.pathExists(installPath)).toBe(true);

    const stats = await fs.stat(installPath);
    expect(stats.mode & 0o111).toBeTruthy(); // Check if executable bit is set

    // step("Verify installation succeeded")
    const helpResult = await execa(installPath, ['--help'], { reject: false });
    expect(helpResult.exitCode).toBe(0);
    expect(helpResult.stdout).toContain('Usage: specguard');
  });

  it('should show help message', async () => {
    const result = await execa('bun', ['run', INSTALL_SCRIPT, '--help'], {
      reject: false,
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Usage:');
    expect(result.stdout).toContain('--install-path');
    expect(result.stdout).toContain('--local-source');
  });

  it('should create directory if it does not exist', async () => {
    // step("Create custom install directory if needed")
    const testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'specguard-test-'));
    testDirs.push(testDir);

    const installPath = path.join(testDir, 'nested', 'bin', 'specguard');

    // Verify directory doesn't exist initially
    expect(await fs.pathExists(path.dirname(installPath))).toBe(false);

    await execa(
      'bun',
      [
        'run',
        INSTALL_SCRIPT,
        '--install-path',
        installPath,
        '--local-source',
        SPECGUARD_SOURCE,
      ],
      { reject: false }
    );

    // Verify directory was created
    expect(await fs.pathExists(path.dirname(installPath))).toBe(true);
    expect(await fs.pathExists(installPath)).toBe(true);
  });

  it('should fail gracefully with invalid options', async () => {
    const result = await execa(
      'bun',
      ['run', INSTALL_SCRIPT, '--invalid-option'],
      { reject: false }
    );

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('Unknown option');
  });
});
