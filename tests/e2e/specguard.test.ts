/**
 * E2E tests for specguard CLI
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { execa } from 'execa';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../..');
const SPECGUARD_CLI = path.join(PROJECT_ROOT, 'src/index.ts');

/**
 * Run specguard CLI with arguments
 */
async function runSpecguard(
  args: string[],
  options?: { cwd?: string; reject?: boolean }
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  try {
    const result = await execa('bun', ['run', SPECGUARD_CLI, ...args], {
      cwd: options?.cwd || PROJECT_ROOT,
      reject: options?.reject ?? false,
    });
    return {
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode,
    };
  } catch (error: any) {
    return {
      stdout: error.stdout || '',
      stderr: error.stderr || '',
      exitCode: error.exitCode || 1,
    };
  }
}

describe('Specguard E2E Tests', () => {
  describe('Success Case', () => {
    it('should exit with 0 for passing tests', async () => {
      // step("Run specguard against success fixture")
      const result = await runSpecguard([
        '--specguard-folder-name',
        'specs',
        'tests/fixtures/success',
      ]);

      // step("Assert exit code is 0 for passing tests")
      expect(result.exitCode).toBe(0);

      // step("Assert output contains passed test file")
      expect(result.stdout).toContain('tests/fixtures/success/unit/auth.test.ts');

      // step("Assert summary shows 1 passed test")
      expect(result.stdout).toMatch(/Passed:.*1/);
    });
  });

  describe('Verbose Mode', () => {
    it('should show implemented and non-implemented steps in verbose mode', async () => {
      // step("Run specguard against the verbose fixture")
      const result = await runSpecguard([
        '--verbose',
        '--specguard-folder-name',
        'specs',
        'tests/fixtures/missing-steps',
      ]);

      // step("Implemented steps are rendered in green")
      expect(result.stdout).toContain('\x1b[0;32m✓\x1b[0m');

      // step("Not implemented steps are rendered in red")
      expect(result.stdout).toContain('\x1b[0;31m✗\x1b[0m');
    });
  });

  describe('Missing Steps', () => {
    it('should exit with 1 for tests with missing steps', async () => {
      // step("Run specguard against missing-steps fixture")
      const result = await runSpecguard([
        '--specguard-folder-name',
        'specs',
        'tests/fixtures/missing-steps',
      ]);

      // step("Assert exit code is 1 for failing tests")
      expect(result.exitCode).toBe(1);

      // step("Assert output indicates steps mismatch")
      expect(result.stdout).toContain('steps mismatch');

      // step("Assert summary shows 1 failed test")
      expect(result.stdout).toMatch(/Failed:.*1/);
    });
  });

  describe('Wrong Order', () => {
    it('should exit with 1 for tests with steps in wrong order', async () => {
      // step("Run specguard against wrong-order fixture")
      const result = await runSpecguard([
        '--specguard-folder-name',
        'specs',
        'tests/fixtures/wrong-order',
      ]);

      // step("Assert exit code is 1 for failing tests")
      expect(result.exitCode).toBe(1);

      // step("Assert output indicates steps mismatch")
      expect(result.stdout).toContain('steps mismatch');
    });
  });

  describe('Missing File', () => {
    it('should exit with 1 for missing test implementation', async () => {
      // step("Run specguard against missing-file fixture")
      const result = await runSpecguard([
        '--specguard-folder-name',
        'specs',
        'tests/fixtures/missing-file',
      ]);

      // step("Assert exit code is 1 for missing implementation")
      expect(result.exitCode).toBe(1);

      // step("Assert output indicates not implemented")
      expect(result.stdout).toContain('not implemented');

      // step("Assert summary shows 1 not implemented")
      expect(result.stdout).toMatch(/Not implemented:.*1/);
    });
  });

  describe('Extra Steps', () => {
    it('should exit with 1 for tests with extra steps', async () => {
      // step("Run specguard against extra-steps fixture")
      const result = await runSpecguard([
        '--specguard-folder-name',
        'specs',
        'tests/fixtures/extra-steps',
      ]);

      // step("Assert exit code is 1 for step count mismatch")
      expect(result.exitCode).toBe(1);

      // step("Assert output indicates steps mismatch")
      expect(result.stdout).toContain('steps mismatch');
    });
  });

  describe('Help', () => {
    it('should show help message with --help', async () => {
      const result = await runSpecguard(['--help']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Usage: specguard');
      expect(result.stdout).toContain('--verbose');
      expect(result.stdout).toContain('--specguard-folder-name');
    });
  });

  describe('Custom Folder Name', () => {
    it('should support custom specguard folder names', async () => {
      const result = await runSpecguard([
        '--specguard-folder-name',
        'specs',
        'tests/fixtures/success',
      ]);

      expect(result.stdout).toContain('Searching for specs files');
    });
  });
});
