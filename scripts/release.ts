#!/usr/bin/env bun

/**
 * Release script for creating and pushing version tags
 * 
 * Usage:
 *   bun run scripts/release.ts v1.2.3
 *   bun run scripts/release.ts 1.2.3
 *   bun run scripts/release.ts +major
 *   bun run scripts/release.ts +minor
 *   bun run scripts/release.ts +patch
 */

import { $ } from 'bun';
import fs from 'fs-extra';
import path from 'path';
import pc from 'picocolors';

interface Version {
  major: number;
  minor: number;
  patch: number;
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    showHelp();
    process.exit(0);
  }

  const input = args[0];

  // Check for uncommitted changes
  await checkGitStatus();

  // Get current version from package.json
  const currentVersion = await getCurrentVersion();
  console.log(pc.blue(`Current version: ${currentVersion}`));
  console.log();

  // Parse or calculate new version
  let newVersion: string;
  let bumpType: 'major' | 'minor' | 'patch' | 'custom';

  if (input.startsWith('+')) {
    const increment = input.slice(1).toLowerCase();
    if (!['major', 'minor', 'patch'].includes(increment)) {
      console.error(pc.red(`Error: Invalid increment type "${increment}"`));
      console.log('Valid options: +major, +minor, +patch');
      process.exit(1);
    }
    bumpType = increment as 'major' | 'minor' | 'patch';
    newVersion = incrementVersion(currentVersion, bumpType);
  } else {
    bumpType = 'custom';
    newVersion = normalizeVersion(input);
    validateVersion(newVersion);
    
    // Determine bump type for custom version
    const current = parseVersion(currentVersion);
    const next = parseVersion(newVersion);
    bumpType = detectBumpType(current, next);
  }

  // Check if version is valid progression
  validateVersionProgression(currentVersion, newVersion);

  // Check if tag already exists
  await checkTagExists(newVersion);

  // Show confirmation
  const bumpTypeLabel = bumpType.toUpperCase();
  console.log(pc.bold(`${bumpTypeLabel} release:`));
  console.log(`  ${pc.dim(currentVersion)} → ${pc.green('v' + newVersion)}`);
  console.log();

  const confirmed = await confirm('Create and push this tag?');
  
  if (!confirmed) {
    console.log(pc.yellow('Release cancelled.'));
    process.exit(0);
  }

  // Update package.json version
  await updatePackageVersion(newVersion);

  // Create and push tag
  await createAndPushTag(newVersion);

  console.log();
  console.log(pc.green('✓ Release tag created and pushed successfully!'));
  console.log();
  console.log(`GitHub Actions will now build and publish the release.`);
  console.log(pc.dim(`View progress: https://github.com/dipasqualew/specguard/actions`));
}

function showHelp() {
  console.log('Release Script - Create and push version tags');
  console.log();
  console.log('Usage:');
  console.log('  bun run scripts/release.ts <version>');
  console.log('  bun run scripts/release.ts <increment>');
  console.log();
  console.log('Examples:');
  console.log('  bun run scripts/release.ts v1.2.3    # Specific version');
  console.log('  bun run scripts/release.ts 1.2.3     # Without v prefix');
  console.log('  bun run scripts/release.ts +major    # Bump major version');
  console.log('  bun run scripts/release.ts +minor    # Bump minor version');
  console.log('  bun run scripts/release.ts +patch    # Bump patch version');
}

async function checkGitStatus() {
  try {
    const status = await $`git status --porcelain`.text();
    if (status.trim()) {
      console.error(pc.red('Error: Working directory has uncommitted changes'));
      console.log();
      console.log('Please commit or stash your changes before creating a release.');
      process.exit(1);
    }
  } catch (error) {
    console.error(pc.red('Error: Failed to check git status'));
    process.exit(1);
  }
}

async function getCurrentVersion(): Promise<string> {
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  const pkg = await fs.readJson(packageJsonPath);
  return pkg.version;
}

function normalizeVersion(input: string): string {
  // Remove 'v' prefix if present
  return input.startsWith('v') ? input.slice(1) : input;
}

function validateVersion(version: string) {
  const semverRegex = /^\d+\.\d+\.\d+$/;
  if (!semverRegex.test(version)) {
    console.error(pc.red(`Error: Invalid version format "${version}"`));
    console.log('Expected format: X.Y.Z (e.g., 1.2.3)');
    process.exit(1);
  }
}

function parseVersion(version: string): Version {
  const normalized = normalizeVersion(version);
  const [major, minor, patch] = normalized.split('.').map(Number);
  return { major, minor, patch };
}

function incrementVersion(current: string, type: 'major' | 'minor' | 'patch'): string {
  const version = parseVersion(current);
  
  switch (type) {
    case 'major':
      return `${version.major + 1}.0.0`;
    case 'minor':
      return `${version.major}.${version.minor + 1}.0`;
    case 'patch':
      return `${version.major}.${version.minor}.${version.patch + 1}`;
  }
}

function detectBumpType(current: Version, next: Version): 'major' | 'minor' | 'patch' | 'custom' {
  if (next.major > current.major) return 'major';
  if (next.minor > current.minor) return 'minor';
  if (next.patch > current.patch) return 'patch';
  return 'custom';
}

function validateVersionProgression(current: string, next: string) {
  const currentVer = parseVersion(current);
  const nextVer = parseVersion(next);

  // Check if version is moving backward
  if (nextVer.major < currentVer.major) {
    console.error(pc.red(`Error: Cannot decrease major version (${current} → ${next})`));
    process.exit(1);
  }
  
  if (nextVer.major === currentVer.major && nextVer.minor < currentVer.minor) {
    console.error(pc.red(`Error: Cannot decrease minor version (${current} → ${next})`));
    process.exit(1);
  }
  
  if (
    nextVer.major === currentVer.major &&
    nextVer.minor === currentVer.minor &&
    nextVer.patch <= currentVer.patch
  ) {
    console.error(pc.red(`Error: New version must be greater than current version`));
    console.log(`Current: ${current}`);
    console.log(`New:     ${next}`);
    process.exit(1);
  }
}

async function checkTagExists(version: string) {
  try {
    const tags = await $`git tag -l v${version}`.text();
    if (tags.trim()) {
      console.error(pc.red(`Error: Tag v${version} already exists`));
      console.log();
      console.log('Use a different version or delete the existing tag:');
      console.log(pc.dim(`  git tag -d v${version}`));
      console.log(pc.dim(`  git push origin :refs/tags/v${version}`));
      process.exit(1);
    }
  } catch (error) {
    // Tag doesn't exist, which is what we want
  }
}

async function updatePackageVersion(version: string) {
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  const pkg = await fs.readJson(packageJsonPath);
  pkg.version = version;
  await fs.writeJson(packageJsonPath, pkg, { spaces: 2 });
  
  console.log();
  console.log(pc.dim('Updated package.json version'));
  
  // Commit the version change
  await $`git add package.json`;
  await $`git commit -m ${'chore: bump version to v' + version}`;
  console.log(pc.dim('Committed version change'));
}

async function createAndPushTag(version: string) {
  const tag = `v${version}`;
  
  try {
    await $`git tag -a ${tag} -m ${'Release ' + tag}`;
    console.log(pc.dim(`Created tag ${tag}`));
    
    await $`git push origin main`;
    console.log(pc.dim('Pushed commit to main'));
    
    await $`git push origin ${tag}`;
    console.log(pc.dim(`Pushed tag ${tag}`));
  } catch (error) {
    console.error(pc.red('Error: Failed to create or push tag'));
    console.log();
    console.log('Rolling back...');
    
    // Try to clean up
    try {
      await $`git tag -d ${tag}`.quiet();
    } catch {}
    
    throw error;
  }
}

async function confirm(question: string): Promise<boolean> {
  console.log(pc.yellow(`${question} (y/n) `));
  
  for await (const line of console) {
    const answer = line.trim().toLowerCase();
    if (answer === 'y' || answer === 'yes') {
      return true;
    }
    if (answer === 'n' || answer === 'no') {
      return false;
    }
    console.log(pc.dim('Please answer y or n: '));
  }
  
  return false;
}

// Run the script
main().catch((error) => {
  console.error();
  console.error(pc.red('Release failed:'), error.message);
  process.exit(1);
});
