/**
 * Core types for specguard
 */

/**
 * A single step definition from a specguard file
 */
export type Step = string;

/**
 * Test levels (e.g., unit, integration, e2e)
 */
export type TestLevel = string;

/**
 * A scenario with its levels and steps
 */
export interface Scenario {
  name: string;
  levels: TestLevel[];
  steps: Step[];
}

/**
 * Result of step verification for a scenario
 */
export interface ScenarioVerificationResult {
  scenarioName: string;
  stepVerification: StepVerificationResult;
}

/**
 * Result of step verification
 */
export interface StepVerificationResult {
  passed: boolean;
  reason?: 'missing-file' | 'step-mismatch' | 'step-count-mismatch';
  expectedSteps: Step[];
  actualSteps: Step[];
  missingSteps?: Step[];
  extraSteps?: Step[];
  mismatchedSteps?: Array<{
    expected: Step;
    actual: Step;
    index: number;
  }>;
}

/**
 * A specguard file with its extracted metadata
 */
export interface SpecGuardFile {
  filePath: string;
  levels: TestLevel[];
  steps: Step[];
  scenarios: Scenario[];
  baseDir: string;
  relativePathNoExt: string;
}

/**
 * Result of processing a single test file
 */
export interface TestFileResult {
  testFile: string;
  specFile: string;
  level: TestLevel;
  passed: boolean;
  reason?: 'missing-file' | 'step-mismatch';
  verification?: StepVerificationResult;
  scenarioResults?: ScenarioVerificationResult[];
}

/**
 * Summary of all test results
 */
export interface TestSummary {
  totalFiles: number;
  passedFiles: number;
  failedFiles: number;
  missingFiles: number;
  results: TestFileResult[];
}

/**
 * CLI options
 */
export interface CliOptions {
  verbose: boolean;
  specguardFolderName: string;
  searchDir: string;
  help: boolean;
}

/**
 * ANSI color codes
 */
export const Colors = {
  RED: '\x1b[0;31m',
  GREEN: '\x1b[0;32m',
  YELLOW: '\x1b[1;33m',
  NC: '\x1b[0m', // No Color
} as const;

/**
 * Installation options
 */
export interface InstallOptions {
  installPath?: string;
  localSource?: string;
  help: boolean;
}
