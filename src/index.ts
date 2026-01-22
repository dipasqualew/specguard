#!/usr/bin/env bun

/**
 * specguard - Language-agnostic framework for deterministically mapping behavior expectations to tests
 */

import type { CliOptions, SpecGuardFile, TestFileResult, TestSummary, ScenarioVerificationResult, Step, StepVerificationResult } from './types';
import { extractSteps, extractLevels, verifySteps, extractScenarios, verifyScenarioSteps } from './specguard';
import { printTestResult, printSummary, printHelp } from './output';
import {
  fileExists,
  dirname,
  joinPath,
  resolvePath,
  logWarning,
  colorize,
} from './utils';
import { Glob } from 'bun';
import path from 'path';

/**
 * Parse CLI arguments
 */
function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {
    verbose: false,
    specguardFolderName: 'specguard',
    searchDir: '.',
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--verbose':
      case '-v':
        options.verbose = true;
        break;

      case '--specguard-folder-name':
        i++;
        if (i >= args.length || !args[i]) {
          console.error('Error: --specguard-folder-name requires an argument');
          process.exit(1);
        }
        options.specguardFolderName = args[i] || 'specguard';
        break;

      case '--help':
      case '-h':
        options.help = true;
        break;

      case undefined:
        break;

      default:
        if (arg.startsWith('-')) {
          console.error(`Error: Unknown option ${arg}`);
          console.error("Run 'specguard --help' for usage information");
          process.exit(1);
        } else {
          options.searchDir = arg;
        }
    }
  }

  return options;
}

/**
 * Process a single specguard file
 */
async function processSpecguardFile(
  specguardFile: string,
  baseDir: string,
  options: CliOptions
): Promise<TestFileResult[]> {
  const results: TestFileResult[] = [];

  // Extract scenarios
  const scenarios = await extractScenarios(specguardFile);
  if (scenarios.length === 0) {
    logWarning(`⚠  ${specguardFile}: No scenarios defined, skipping`);
    return results;
  }

  // Get relative path from specguard folder (without extension)
  const specFolderPattern = `/${options.specguardFolderName}/`;
  const lastIndex = specguardFile.lastIndexOf(specFolderPattern);
  const relPath = lastIndex >= 0
    ? specguardFile.substring(lastIndex + specFolderPattern.length)
    : '';
  const relPathNoExt = relPath.replace(/\.md$/, '');

  // Collect all unique levels from all scenarios
  const allLevels = new Set<string>();
  for (const scenario of scenarios) {
    for (const level of scenario.levels) {
      allLevels.add(level.trim());
    }
  }

  // Process each level
  for (const level of allLevels) {
    const levelTrimmed = level.trim();

    // Construct test file path (look for any extension)
    const testFileBase = joinPath(baseDir, levelTrimmed, relPathNoExt);
    
    // Try to find the actual test file by checking common extensions
    let testFile = '';
    const commonExtensions = ['.ts', '.test.ts', '.spec.ts', '.js', '.test.js', '.spec.js', '.sh', '.py'];
    
    for (const ext of commonExtensions) {
      const candidate = testFileBase + ext;
      if (await fileExists(candidate)) {
        testFile = candidate;
        break;
      }
    }

    // If no file found, use the pattern for error reporting
    if (!testFile) {
      testFile = testFileBase + '.*';
    }

    // Collect all steps from scenarios in this level (in order)
    const allStepsForLevel: Step[] = [];
    for (const scenario of scenarios) {
      if (scenario.levels.includes(levelTrimmed)) {
        allStepsForLevel.push(...scenario.steps);
      }
    }

    // Verify all steps
    const verification = await verifySteps(testFile, allStepsForLevel);

    // Create scenario results for display (show which steps belong to which scenario)
    const scenarioResults: ScenarioVerificationResult[] = [];
    let stepIndex = 0;
    
    for (const scenario of scenarios) {
      if (scenario.levels.includes(levelTrimmed)) {
        const scenarioStepCount = scenario.steps.length;
        const scenarioExpectedSteps = scenario.steps;
        const scenarioActualSteps = verification.actualSteps.slice(stepIndex, stepIndex + scenarioStepCount);
        
        // Create verification result for this scenario
        const scenarioVerification: StepVerificationResult = {
          passed: true,
          expectedSteps: scenarioExpectedSteps,
          actualSteps: scenarioActualSteps,
        };
        
        // Check if this scenario's steps match
        for (let i = 0; i < scenarioExpectedSteps.length; i++) {
          const expected = scenarioExpectedSteps[i]?.trim();
          const actual = scenarioActualSteps[i]?.trim();
          
          if (expected !== actual) {
            scenarioVerification.passed = false;
            scenarioVerification.reason = actual ? 'step-mismatch' : 'step-count-mismatch';
          }
        }
        
        // Handle missing file case
        if (verification.reason === 'missing-file') {
          scenarioVerification.passed = false;
          scenarioVerification.reason = 'missing-file';
          scenarioVerification.missingSteps = scenarioExpectedSteps;
        }
        
        scenarioResults.push({
          scenarioName: scenario.name,
          stepVerification: scenarioVerification,
        });
        
        stepIndex += scenarioStepCount;
      }
    }

    const result: TestFileResult = {
      testFile,
      specFile: specguardFile,
      level: levelTrimmed,
      passed: verification.passed,
      reason: verification.reason,
      scenarioResults,
    };

    await printTestResult(result, options.verbose);
    results.push(result);
  }

  return results;
}

/**
 * Main execution
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const options = parseArgs(args);

  if (options.help) {
    printHelp();
    process.exit(0);
  }

  const searchDir = resolvePath(options.searchDir);

  console.log(`Searching for ${options.specguardFolderName} files in: ${searchDir}`);
  if (options.verbose) {
    console.log('(verbose mode enabled)');
  }
  console.log('');

  // Find all specguard markdown files
  const pattern = `**/${options.specguardFolderName}/*.md`;
  const glob = new Glob(pattern);
  const allResults: TestFileResult[] = [];

  for await (const specguardFile of glob.scan(searchDir)) {
    // Construct full path (normalize to remove ./ and duplicate slashes)
    const fullPath = path.normalize(joinPath(searchDir, specguardFile));

    // Get the base directory (parent of specguard folder)
    const specguardDir = dirname(fullPath);
    const baseDir = specguardDir.replace(
      new RegExp(`/${options.specguardFolderName}$`),
      ''
    );

    const results = await processSpecguardFile(fullPath, baseDir, options);
    allResults.push(...results);
  }

  // Calculate summary
  const summary: TestSummary = {
    totalFiles: allResults.length,
    passedFiles: allResults.filter((r) => r.passed).length,
    failedFiles: allResults.filter((r) => !r.passed).length,
    missingFiles: allResults.filter((r) => r.reason === 'missing-file').length,
    results: allResults,
  };

  // Print summary
  printSummary(summary);

  // Exit with error if any failures
  if (summary.failedFiles > 0) {
    process.exit(1);
  }
}

// Run main if this is the entry point
if (import.meta.main) {
  main().catch((error) => {
    console.error(colorize('RED', `Error: ${error.message}`));
    process.exit(1);
  });
}

export { main };
