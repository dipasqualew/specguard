/**
 * CLI output formatting and display
 */

import type { TestFileResult, TestSummary, StepVerificationResult, ScenarioVerificationResult } from './types';
import { colorize, makePathRelative } from './utils';

/**
 * Print verbose step verification details
 */
export function printVerboseVerification(
  testFile: string,
  result: StepVerificationResult,
  indent: string = '  '
): void {
  if (result.reason === 'missing-file') {
    console.log(`${indent}${colorize('YELLOW', 'File does not exist')}`);
    for (const step of result.expectedSteps) {
      console.log(`${indent}  ${colorize('YELLOW', '○')} ${step.trim()}`);
    }
    return;
  }

  const normalizedExpected = result.expectedSteps.map((s) => s.trim());
  const normalizedActual = result.actualSteps.map((s) => s.trim());

  // Show each step with its status
  for (let i = 0; i < normalizedExpected.length; i++) {
    const expected = normalizedExpected[i];
    const actual = normalizedActual[i];

    if (!actual) {
      console.log(
        `${indent}  ${colorize('RED', '✗')} ${expected} ${colorize('RED', '(missing)')}`
      );
    } else if (expected === actual) {
      console.log(`${indent}  ${colorize('GREEN', '✓')} ${expected}`);
    } else {
      console.log(`${indent}  ${colorize('RED', '✗')} ${expected}`);
    }
  }

  // Show extra steps if any
  if (normalizedActual.length > normalizedExpected.length) {
    for (let i = normalizedExpected.length; i < normalizedActual.length; i++) {
      const extra = normalizedActual[i];
      console.log(
        `${indent}  ${colorize('YELLOW', '+')} ${extra} ${colorize('YELLOW', '(extra)')}`
      );
    }
  }
}

/**
 * Print test file result
 */
export async function printTestResult(result: TestFileResult, verbose: boolean): Promise<void> {
  const displayPath = await makePathRelative(result.testFile);
  
  if (result.passed) {
    console.log(`${colorize('GREEN', '✓')} ${displayPath}`);
    if (verbose && result.scenarioResults) {
      for (const scenarioResult of result.scenarioResults) {
        const scenarioIcon = scenarioResult.stepVerification.passed 
          ? colorize('GREEN', '✓') 
          : colorize('RED', '✗');
        console.log(`  ${scenarioIcon} ${scenarioResult.scenarioName}`);
        printVerboseVerification(result.testFile, scenarioResult.stepVerification, '  ');
      }
    }
  } else if (result.reason === 'missing-file') {
    console.log(
      `${colorize('RED', '✗')} ${displayPath} ${colorize('RED', '(not implemented)')}`
    );
    if (verbose && result.scenarioResults) {
      for (const scenarioResult of result.scenarioResults) {
        const scenarioIcon = scenarioResult.stepVerification.passed 
          ? colorize('GREEN', '✓') 
          : colorize('RED', '✗');
        console.log(`  ${scenarioIcon} ${scenarioResult.scenarioName}`);
        printVerboseVerification(result.testFile, scenarioResult.stepVerification, '  ');
      }
    }
  } else {
    console.log(
      `${colorize('RED', '✗')} ${displayPath} ${colorize('RED', '(steps mismatch)')}`
    );
    if (verbose && result.scenarioResults) {
      for (const scenarioResult of result.scenarioResults) {
        const scenarioIcon = scenarioResult.stepVerification.passed 
          ? colorize('GREEN', '✓') 
          : colorize('RED', '✗');
        console.log(`  ${scenarioIcon} ${scenarioResult.scenarioName}`);
        printVerboseVerification(result.testFile, scenarioResult.stepVerification, '  ');
      }
    }
  }
}

/**
 * Print summary of all results
 */
export function printSummary(summary: TestSummary): void {
  console.log('');
  console.log('========================================');
  console.log('Summary:');
  console.log('========================================');
  console.log(`Total test files:    ${summary.totalFiles}`);
  console.log(`${colorize('GREEN', 'Passed:')}              ${summary.passedFiles}`);
  console.log(`${colorize('RED', 'Failed:')}              ${summary.failedFiles}`);
  console.log(`${colorize('YELLOW', 'Not implemented:')}     ${summary.missingFiles}`);
  console.log('');
}

/**
 * Print help message
 */
export function printHelp(): void {
  console.log('Usage: specguard [OPTIONS] [DIRECTORY]');
  console.log('');
  console.log('Options:');
  console.log('  -v, --verbose                    Show detailed step-by-step output');
  console.log('  --specguard-folder-name NAME     Use NAME instead of \'specguard\' as folder name');
  console.log('  -h, --help                       Show this help message');
  console.log('');
  console.log('Arguments:');
  console.log('  DIRECTORY                        Directory to search (default: current directory)');
}
