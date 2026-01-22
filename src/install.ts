#!/usr/bin/env bun

/**
 * Installation script for specguard
 */

import type { InstallOptions } from './types';
import { colorize, fileExists } from './utils';
import { existsSync } from 'fs';
import { mkdir } from 'fs/promises';
import path from 'path';

const REPO_URL = 'https://raw.githubusercontent.com/dipasqualew/stepguard/main/dist/specguard';
const INSTALL_NAME = 'specguard';

/**
 * Parse installation arguments
 */
function parseInstallArgs(args: string[]): InstallOptions {
  const options: InstallOptions = {
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--install-path':
        i++;
        if (i >= args.length || !args[i]) {
          console.error('Error: --install-path requires an argument');
          process.exit(1);
        }
        options.installPath = args[i];
        break;

      case '--local-source':
        i++;
        if (i >= args.length || !args[i]) {
          console.error('Error: --local-source requires an argument');
          process.exit(1);
        }
        options.localSource = args[i];
        break;

      case '--help':
      case '-h':
        options.help = true;
        break;

      default:
        console.error(`Unknown option: ${arg}`);
        console.error("Run 'install.ts --help' for usage");
        process.exit(1);
    }
  }

  return options;
}

/**
 * Print installation help
 */
function printInstallHelp(): void {
  console.log('Usage: bun run src/install.ts [OPTIONS]');
  console.log('');
  console.log('Options:');
  console.log('  --install-path PATH    Install to specific path (for testing)');
  console.log('  --local-source FILE    Use local file instead of downloading (for testing)');
  console.log('  -h, --help            Show this help message');
}

/**
 * Determine install location
 */
async function determineInstallLocation(
  customInstallPath?: string
): Promise<{ installPath: string; installDir: string; needsSudo: boolean }> {
  if (customInstallPath) {
    // step("Parse command line arguments for custom install path")
    const installDir = path.dirname(customInstallPath);

    // step("Create custom install directory if needed")
    if (!existsSync(installDir)) {
      await mkdir(installDir, { recursive: true });
    }

    return {
      installPath: customInstallPath,
      installDir,
      needsSudo: false,
    };
  }

  // step("Determine default install location")
  const homeLocalBin = path.join(process.env.HOME || '~', '.local', 'bin');

  // Prefer ~/.local/bin (no sudo needed), fallback to /usr/local/bin
  try {
    if (existsSync(homeLocalBin) || (await mkdir(homeLocalBin, { recursive: true }), true)) {
      return {
        installPath: path.join(homeLocalBin, INSTALL_NAME),
        installDir: homeLocalBin,
        needsSudo: false,
      };
    }
  } catch {
    // Fall through to /usr/local/bin
  }

  const usrLocalBin = '/usr/local/bin';
  console.log(colorize('YELLOW', `Note: Installing to ${usrLocalBin} requires sudo`));

  return {
    installPath: path.join(usrLocalBin, INSTALL_NAME),
    installDir: usrLocalBin,
    needsSudo: true,
  };
}

/**
 * Download or build the executable
 */
async function getInstallSource(localSource?: string): Promise<Uint8Array> {
  if (localSource) {
    // step("Use local source file for installation")
    console.log(`Building from local source: ${localSource}`);
    
    // Build a temporary executable from the TypeScript source
    const tmpBuildPath = `/tmp/specguard-build-${Date.now()}`;
    
    try {
      const buildProc = Bun.spawn([
        'bun',
        'build',
        localSource,
        '--compile',
        '--outfile',
        tmpBuildPath,
      ]);
      
      await buildProc.exited;
      
      if (buildProc.exitCode !== 0) {
        throw new Error('Failed to build executable from source');
      }
      
      // Read the built executable
      const file = Bun.file(tmpBuildPath);
      const content = new Uint8Array(await file.arrayBuffer());
      
      // Clean up temp file
      await Bun.spawn(['rm', tmpBuildPath]).exited;
      
      return content;
    } catch (error) {
      throw new Error(`Failed to build from source: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // step("Download script from GitHub")
  console.log('Downloading specguard from GitHub...');

  try {
    const response = await fetch(REPO_URL);
    if (!response.ok) {
      throw new Error(`Failed to download: ${response.statusText}`);
    }
    return new Uint8Array(await response.arrayBuffer());
  } catch (error) {
    console.error(colorize('RED', 'Error: Failed to download specguard'));
    throw error;
  }
}

/**
 * Install the script
 */
async function installScript(
  content: Uint8Array,
  installPath: string,
  needsSudo: boolean
): Promise<void> {
  // step("Copy script to install location")
  console.log(`Installing to ${installPath}...`);

  if (needsSudo) {
    // Write to temp file first, then use sudo to move
    const tmpFile = `/tmp/specguard-${Date.now()}`;
    await Bun.write(tmpFile, content);

    const moveProc = Bun.spawn(['sudo', 'mv', tmpFile, installPath]);
    await moveProc.exited;

    if (moveProc.exitCode !== 0) {
      throw new Error('Failed to install with sudo');
    }

    // step("Make script executable")
    const chmodProc = Bun.spawn(['sudo', 'chmod', '+x', installPath]);
    await chmodProc.exited;

    if (chmodProc.exitCode !== 0) {
      throw new Error('Failed to make script executable');
    }
  } else {
    await Bun.write(installPath, content);

    // step("Make script executable")
    const chmodProc = Bun.spawn(['chmod', '+x', installPath]);
    await chmodProc.exited;

    if (chmodProc.exitCode !== 0) {
      throw new Error('Failed to make script executable');
    }
  }
}

/**
 * Verify installation
 */
async function verifyInstallation(
  installPath: string,
  installDir: string,
  customInstallPath?: string
): Promise<void> {
  // step("Verify installation succeeded")
  const isExecutable = existsSync(installPath);

  if (isExecutable) {
    console.log(colorize('GREEN', '✓') + ' specguard installed successfully!');
    console.log('');
    console.log(`Installation location: ${installPath}`);

    // step("Check if install directory is in PATH")
    const pathEnv = process.env.PATH || '';
    const pathDirs = pathEnv.split(':');

    if (!customInstallPath && !pathDirs.includes(installDir)) {
      console.log('');
      console.log(colorize('YELLOW', `Warning: ${installDir} is not in your PATH`));
      console.log('Add this to your shell profile (~/.bashrc, ~/.zshrc, etc.):');
      console.log('');
      console.log(`  export PATH="${installDir}:$PATH"`);
      console.log('');
    } else {
      console.log('');
      if (!customInstallPath) {
        console.log('You can now run: specguard --help');
      }
    }
  } else {
    throw new Error('Installation failed - file not executable');
  }
}

/**
 * Main installation routine
 */
async function install(): Promise<void> {
  const args = process.argv.slice(2);
  const options = parseInstallArgs(args);

  if (options.help) {
    printInstallHelp();
    process.exit(0);
  }

  console.log('Installing specguard...');
  console.log('');

  try {
    const { installPath, installDir, needsSudo } = await determineInstallLocation(
      options.installPath
    );

    const content = await getInstallSource(options.localSource);

    await installScript(content, installPath, needsSudo);

    await verifyInstallation(installPath, installDir, options.installPath);
  } catch (error) {
    console.error(colorize('RED', `Error: ${error instanceof Error ? error.message : 'Installation failed'}`));
    process.exit(1);
  }
}

// Run if this is the entry point
if (import.meta.main) {
  install();
}

export { install };
