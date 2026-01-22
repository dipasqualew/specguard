#!/usr/bin/env bun

/**
 * Build script for creating standalone executables
 */

import { $ } from 'bun';
import fs from 'fs-extra';
import path from 'path';

const DIST_DIR = 'dist';

async function build() {
  console.log('Building specguard...\n');

  // Create dist directory
  await fs.ensureDir(DIST_DIR);

  // Build main CLI
  console.log('Building specguard CLI...');
  await $`bun build src/index.ts --compile --outfile ${DIST_DIR}/specguard`;
  console.log('✓ Built dist/specguard\n');

  // Build installer
  console.log('Building installer...');
  await $`bun build src/install.ts --compile --outfile ${DIST_DIR}/specguard-install`;
  console.log('✓ Built dist/specguard-install\n');

  // Make executables
  await fs.chmod(path.join(DIST_DIR, 'specguard'), 0o755);
  await fs.chmod(path.join(DIST_DIR, 'specguard-install'), 0o755);

  console.log('Build complete!');
  console.log('\nExecutables:');
  console.log(`  ${DIST_DIR}/specguard`);
  console.log(`  ${DIST_DIR}/specguard-install`);
}

build().catch((error) => {
  console.error('Build failed:', error);
  process.exit(1);
});
