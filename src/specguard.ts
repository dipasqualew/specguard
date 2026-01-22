/**
 * Core specguard parsing and verification logic
 */

import type { Step, SpecGuardFile, StepVerificationResult, Scenario } from './types';
import { fileExists, readFile, trim } from './utils';

/**
 * Extract scenarios from a specguard markdown file
 * Each scenario is an H2 heading with levels and steps
 */
export async function extractScenarios(filePath: string): Promise<Scenario[]> {
  const content = await readFile(filePath);
  const lines = content.split('\n');
  const scenarios: Scenario[] = [];
  
  let currentScenario: Scenario | null = null;
  let inCodeblock = false;
  let currentSteps: Step[] = [];
  
  for (const line of lines) {
    // Check for H2 heading (scenario name)
    const h2Match = line.match(/^##\s+(.+)/);
    if (h2Match) {
      // Save previous scenario if it exists
      if (currentScenario && currentSteps.length > 0) {
        currentScenario.steps = currentSteps;
        scenarios.push(currentScenario);
      }
      
      // Start new scenario
      currentScenario = {
        name: h2Match[1]?.trim() || '',
        levels: [],
        steps: [],
      };
      currentSteps = [];
      inCodeblock = false;
      continue;
    }
    
    // Check for levels declaration
    if (currentScenario) {
      const levelsMatch = line.match(/^levels:\s*(.*)/);
      if (levelsMatch) {
        const levelsStr = trim(levelsMatch[1] || '');
        currentScenario.levels = levelsStr
          .split(',')
          .map(trim)
          .filter(Boolean);
        continue;
      }
    }
    
    // Check for specguard codeblock start
    if (line.match(/^```specguard/)) {
      inCodeblock = true;
      continue;
    }
    
    // Check for codeblock end
    if (line.match(/^```/) && inCodeblock) {
      inCodeblock = false;
      continue;
    }
    
    // Capture steps inside codeblock
    if (inCodeblock && currentScenario && trim(line)) {
      currentSteps.push(line);
    }
  }
  
  // Save last scenario if it exists
  if (currentScenario && currentSteps.length > 0) {
    currentScenario.steps = currentSteps;
    scenarios.push(currentScenario);
  }
  
  return scenarios;
}

/**
 * Extract steps from a specguard markdown file
 * Looks for ```specguard code blocks and extracts non-empty lines
 */
export async function extractSteps(filePath: string): Promise<Step[]> {
  const content = await readFile(filePath);
  const lines = content.split('\n');
  const steps: Step[] = [];
  let inCodeblock = false;

  for (const line of lines) {
    // Check for specguard codeblock start
    if (line.match(/^```specguard/)) {
      inCodeblock = true;
      continue;
    }

    // Check for codeblock end
    if (line.match(/^```/) && inCodeblock) {
      inCodeblock = false;
      continue;
    }

    // Capture steps inside codeblock
    if (inCodeblock && trim(line)) {
      steps.push(line);
    }
  }

  return steps;
}

/**
 * Extract test levels from a specguard markdown file
 * Looks for lines like: levels: unit, integration, e2e
 */
export async function extractLevels(filePath: string): Promise<string[]> {
  const content = await readFile(filePath);
  const lines = content.split('\n');

  for (const line of lines) {
    const match = line.match(/^levels:\s*(.*)/);
    if (match) {
      const levelsStr = trim(match[1] || '');
      return levelsStr
        .split(',')
        .map(trim)
        .filter(Boolean);
    }
  }

  return [];
}

/**
 * Find step markers in a test file
 * Looks for patterns like: // step("...") or # step("...")
 */
export async function findStepsInTest(filePath: string): Promise<Step[]> {
  if (!(await fileExists(filePath))) {
    return [];
  }

  const content = await readFile(filePath);
  const lines = content.split('\n');
  const steps: Step[] = [];

  // Regex to match: // step("...") or # step("...")
  const stepRegex = /^\s*(#|\/\/)\s*step\("(.+)"\)/;

  for (const line of lines) {
    const match = line.match(stepRegex);
    if (match) {
      steps.push(match[2] || '');
    }
  }

  return steps;
}

/**
 * Find steps grouped by describe blocks in a test file
 * Returns a map of describe block names to their steps
 */
export async function findStepsByScenario(filePath: string): Promise<Map<string, Step[]>> {
  if (!(await fileExists(filePath))) {
    return new Map();
  }

  const content = await readFile(filePath);
  const scenarioSteps = new Map<string, Step[]>();

  // Use multiline regex to match describe blocks with their steps
  // This matches: describe('Name', () => { ... steps ... })
  const describeRegex = /describe\(['"](.*?)['"],[\s\S]*?\{([\s\S]*?)(?=\n\s*describe\(|\n\s*\}\s*\)\s*;?\s*$)/g;
  
  let match;
  while ((match = describeRegex.exec(content)) !== null) {
    const scenarioName = match[1] || '';
    const blockContent = match[2] || '';
    
    // Find all steps within this describe block
    const stepRegex = /^\s*(#|\/\/)\s*step\("(.+)"\)/gm;
    const steps: Step[] = [];
    
    let stepMatch;
    while ((stepMatch = stepRegex.exec(blockContent)) !== null) {
      steps.push(stepMatch[2] || '');
    }
    
    if (steps.length > 0) {
      scenarioSteps.set(scenarioName, steps);
    }
  }

  return scenarioSteps;
}

/**
 * Verify that test file contains expected steps in order
 */
export async function verifySteps(
  testFile: string,
  expectedSteps: Step[]
): Promise<StepVerificationResult> {
  if (!(await fileExists(testFile))) {
    return {
      passed: false,
      reason: 'missing-file',
      expectedSteps,
      actualSteps: [],
      missingSteps: expectedSteps,
    };
  }

  const actualSteps = await findStepsInTest(testFile);

  // Normalize steps (trim whitespace)
  const normalizedExpected = expectedSteps.map(trim);
  const normalizedActual = actualSteps.map(trim);

  // Check step count
  if (normalizedExpected.length !== normalizedActual.length) {
    const missingSteps: Step[] = [];
    const extraSteps: Step[] = [];

    // Find missing steps
    for (let i = 0; i < normalizedExpected.length; i++) {
      if (i >= normalizedActual.length) {
        missingSteps.push(normalizedExpected[i] || '');
      }
    }

    // Find extra steps
    for (let i = normalizedExpected.length; i < normalizedActual.length; i++) {
      extraSteps.push(normalizedActual[i] || '');
    }

    return {
      passed: false,
      reason: 'step-count-mismatch',
      expectedSteps,
      actualSteps,
      missingSteps,
      extraSteps,
    };
  }

  // Check steps in order with exact matching
  const mismatchedSteps: Array<{ expected: Step; actual: Step; index: number }> = [];

  for (let i = 0; i < normalizedExpected.length; i++) {
    const expected = normalizedExpected[i];
    const actual = normalizedActual[i];

    if (expected !== actual) {
      mismatchedSteps.push({
        expected: expected || '',
        actual: actual || '',
        index: i,
      });
    }
  }

  if (mismatchedSteps.length > 0) {
    return {
      passed: false,
      reason: 'step-mismatch',
      expectedSteps,
      actualSteps,
      mismatchedSteps,
    };
  }

  return {
    passed: true,
    expectedSteps,
    actualSteps,
  };
}

/**
 * Verify steps for a specific scenario
 */
export async function verifyScenarioSteps(
  testFile: string,
  scenarioName: string,
  expectedSteps: Step[]
): Promise<StepVerificationResult> {
  if (!(await fileExists(testFile))) {
    return {
      passed: false,
      reason: 'missing-file',
      expectedSteps,
      actualSteps: [],
      missingSteps: expectedSteps,
    };
  }

  const scenarioStepsMap = await findStepsByScenario(testFile);
  const actualSteps = scenarioStepsMap.get(scenarioName) || [];

  // Normalize steps (trim whitespace)
  const normalizedExpected = expectedSteps.map(trim);
  const normalizedActual = actualSteps.map(trim);

  // Check step count
  if (normalizedExpected.length !== normalizedActual.length) {
    const missingSteps: Step[] = [];
    const extraSteps: Step[] = [];

    // Find missing steps
    for (let i = 0; i < normalizedExpected.length; i++) {
      if (i >= normalizedActual.length) {
        missingSteps.push(normalizedExpected[i] || '');
      }
    }

    // Find extra steps
    for (let i = normalizedExpected.length; i < normalizedActual.length; i++) {
      extraSteps.push(normalizedActual[i] || '');
    }

    return {
      passed: false,
      reason: 'step-count-mismatch',
      expectedSteps,
      actualSteps,
      missingSteps,
      extraSteps,
    };
  }

  // Check steps in order with exact matching
  const mismatchedSteps: Array<{ expected: Step; actual: Step; index: number }> = [];

  for (let i = 0; i < normalizedExpected.length; i++) {
    const expected = normalizedExpected[i];
    const actual = normalizedActual[i];

    if (expected !== actual) {
      mismatchedSteps.push({
        expected: expected || '',
        actual: actual || '',
        index: i,
      });
    }
  }

  if (mismatchedSteps.length > 0) {
    return {
      passed: false,
      reason: 'step-mismatch',
      expectedSteps,
      actualSteps,
      mismatchedSteps,
    };
  }

  return {
    passed: true,
    expectedSteps,
    actualSteps,
  };
}
