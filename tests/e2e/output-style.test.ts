/**
 * E2E tests for specguard output style validation
 */

import { describe, it, expect } from 'vitest';
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

describe('Specguard Output Style Tests', () => {
  describe('Indentation and Grouping', () => {
    it('should display scenarios with correct indentation', async () => {
      // step("Run specguard against the indentation fixture")
      const result = await runSpecguard([
        '--verbose',
        '--specguard-folder-name',
        'specs',
        'tests/fixtures/indentation',
      ]);

      const lines = result.stdout.split('\n');

      // step("Each scenario line is indented 2 spaces")
      const scenarioLines = lines.filter(line => 
        line.includes('First Scenario') || 
        line.includes('Second Scenario') || 
        line.includes('Third Scenario')
      );
      
      for (const line of scenarioLines) {
        const cleanLine = line.replace(/\x1b\[[0-9;]*m/g, '');
        expect(cleanLine).toMatch(/^  \S/);
      }

      // step("Each step line is indented 4 spaces")
      const stepLines = lines.filter(line => 
        line.includes('Step one') || 
        line.includes('Step two') || 
        line.includes('Step three')
      );
      
      for (const line of stepLines) {
        const cleanLine = line.replace(/\x1b\[[0-9;]*m/g, '');
        expect(cleanLine).toMatch(/^    \S/);
      }

      // step("Steps are grouped by scenario")
      const firstScenarioIndex = result.stdout.indexOf('First Scenario');
      const firstStepIndex = result.stdout.indexOf('Step one of first scenario');
      const secondScenarioIndex = result.stdout.indexOf('Second Scenario');
      const secondStepIndex = result.stdout.indexOf('Step one of second scenario');
      
      expect(firstScenarioIndex).toBeGreaterThan(-1);
      expect(firstStepIndex).toBeGreaterThan(firstScenarioIndex);
      expect(secondScenarioIndex).toBeGreaterThan(firstStepIndex);
      expect(secondStepIndex).toBeGreaterThan(secondScenarioIndex);
    });
  });
});
