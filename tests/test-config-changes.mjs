#!/usr/bin/env node
/**
 * Tests for configuration file changes introduced in the PR:
 *  - .stylelintrc.json: "reference" added to at-rule-no-unknown ignoreAtRules
 *  - .prettierignore: "src/data/events" added to ignore list
 *  - .github/workflows/import-events.yml: new workflow file validation
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');

let passed = 0;
let failed = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`  ✓ ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${testName}`);
    failed++;
  }
}

function assertEqual(actual, expected, testName) {
  if (actual === expected) {
    console.log(`  ✓ ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${testName}`);
    console.error(`    Expected: ${JSON.stringify(expected)}`);
    console.error(`    Actual:   ${JSON.stringify(actual)}`);
    failed++;
  }
}

// ─── .stylelintrc.json ───────────────────────────────────────────────────────
console.log('\n── .stylelintrc.json ──');

const stylelintConfigPath = path.join(PROJECT_ROOT, '.stylelintrc.json');
const stylelintConfig = JSON.parse(fs.readFileSync(stylelintConfigPath, 'utf-8'));

// Verify structure
assert(typeof stylelintConfig === 'object', 'config is a valid JSON object');
assert(Array.isArray(stylelintConfig.extends), 'config has extends array');
assert(typeof stylelintConfig.rules === 'object', 'config has rules object');

// Verify at-rule-no-unknown configuration
const atRuleRule = stylelintConfig.rules['at-rule-no-unknown'];
assert(Array.isArray(atRuleRule), 'at-rule-no-unknown rule is configured as an array');
assertEqual(atRuleRule[0], true, 'at-rule-no-unknown is enabled (true)');

const ignoreAtRules = atRuleRule[1]?.ignoreAtRules;
assert(Array.isArray(ignoreAtRules), 'ignoreAtRules is an array');

// PR change: "reference" must be in the list (Tailwind 4 @reference support)
assert(ignoreAtRules.includes('reference'), '"reference" is in ignoreAtRules (PR change)');

// Verify pre-existing Tailwind at-rules are still present
assert(ignoreAtRules.includes('tailwindcss'), '"tailwindcss" at-rule is still ignored');
assert(ignoreAtRules.includes('tailwind'), '"tailwind" at-rule is still ignored');
assert(ignoreAtRules.includes('apply'), '"apply" at-rule is still ignored');
assert(ignoreAtRules.includes('layer'), '"layer" at-rule is still ignored');
assert(ignoreAtRules.includes('theme'), '"theme" at-rule is still ignored');
assert(ignoreAtRules.includes('utility'), '"utility" at-rule is still ignored');
assert(ignoreAtRules.includes('custom-variant'), '"custom-variant" at-rule is still ignored');
assert(ignoreAtRules.includes('plugin'), '"plugin" at-rule is still ignored');
assert(ignoreAtRules.includes('variants'), '"variants" at-rule is still ignored');
assert(ignoreAtRules.includes('responsive'), '"responsive" at-rule is still ignored');
assert(ignoreAtRules.includes('screen'), '"screen" at-rule is still ignored');

// Verify "reference" is placed after "layer" (order matches the PR diff)
{
  const layerIdx = ignoreAtRules.indexOf('layer');
  const referenceIdx = ignoreAtRules.indexOf('reference');
  assert(layerIdx !== -1, '"layer" exists in ignoreAtRules');
  assert(referenceIdx !== -1, '"reference" exists in ignoreAtRules');
  assert(referenceIdx > layerIdx, '"reference" comes after "layer" in the list');
}

// Verify function-no-unknown still has "theme" ignored
const functionRule = stylelintConfig.rules['function-no-unknown'];
assert(Array.isArray(functionRule), 'function-no-unknown rule is configured');
assert(functionRule[1]?.ignoreFunctions?.includes('theme'), '"theme" function is still ignored');

// Verify other existing rules are intact
assertEqual(stylelintConfig.rules['no-descending-specificity'], null, 'no-descending-specificity is null');
assertEqual(stylelintConfig.rules['selector-class-pattern'], null, 'selector-class-pattern is null');
assertEqual(stylelintConfig.rules['custom-property-pattern'], null, 'custom-property-pattern is null');

// ─── .prettierignore ────────────────────────────────────────────────────────
console.log('\n── .prettierignore ──');

const prettierIgnorePath = path.join(PROJECT_ROOT, '.prettierignore');
const prettierIgnoreContent = fs.readFileSync(prettierIgnorePath, 'utf-8');
const prettierIgnoreLines = prettierIgnoreContent.split('\n').map((l) => l.trim()).filter(Boolean);

// PR change: "src/data/events" added to ignore list
assert(prettierIgnoreLines.includes('src/data/events'), '"src/data/events" is in .prettierignore (PR change)');

// Verify pre-existing ignores are still present
assert(prettierIgnoreLines.includes('dist'), '"dist" is still in .prettierignore');
assert(prettierIgnoreLines.includes('node_modules'), '"node_modules" is still in .prettierignore');
assert(prettierIgnoreLines.includes('.github'), '".github" is still in .prettierignore');
assert(prettierIgnoreLines.includes('.changeset'), '".changeset" is still in .prettierignore');

// Verify exact count (5 entries total: dist, node_modules, .github, .changeset, src/data/events)
assertEqual(prettierIgnoreLines.length, 5, '.prettierignore has exactly 5 entries');

// ─── .github/workflows/import-events.yml ───────────────────────────────────
console.log('\n── .github/workflows/import-events.yml ──');

const workflowPath = path.join(PROJECT_ROOT, '.github', 'workflows', 'import-events.yml');
assert(fs.existsSync(workflowPath), 'import-events.yml workflow file exists');

const workflowContent = fs.readFileSync(workflowPath, 'utf-8');

// Validate key workflow properties
assert(workflowContent.includes('name: Import MTBO Events'), 'workflow has correct name');
assert(workflowContent.includes('repository_dispatch:'), 'workflow triggers on repository_dispatch');
assert(workflowContent.includes('types: [scraper-update]'), 'workflow triggers on scraper-update event type');
assert(workflowContent.includes('workflow_dispatch:'), 'workflow supports manual trigger');
assert(workflowContent.includes('runs-on: ubuntu-latest'), 'job runs on ubuntu-latest');
assert(workflowContent.includes('contents: write'), 'job has contents:write permission for pushing');

// Validate checkout steps
assert(
  workflowContent.includes('repository: blaudden/mtbo-scraper'),
  'workflow checks out the mtbo-scraper repository'
);
assert(workflowContent.includes('path: _scraper'), 'scraper is checked out to _scraper path');
assert(workflowContent.includes('sparse-checkout: data/events'), 'uses sparse-checkout for efficiency');

// Validate the import script invocation
assert(
  workflowContent.includes('node scripts/import-events.mjs --scraper-path _scraper'),
  'workflow calls import script with correct --scraper-path argument'
);

// Validate change detection step
assert(workflowContent.includes('id: changes'), 'change detection step has id "changes"');
assert(
  workflowContent.includes('git diff --quiet src/data/events/ public/images/events/og/'),
  'change detection checks both events data and OG images'
);
assert(
  workflowContent.includes('echo "changed=false" >> $GITHUB_OUTPUT'),
  'change detection outputs changed=false when no changes'
);
assert(
  workflowContent.includes('echo "changed=true" >> $GITHUB_OUTPUT'),
  'change detection outputs changed=true when changes detected'
);

// Validate commit step
assert(
  workflowContent.includes("if: steps.changes.outputs.changed == 'true'"),
  'commit step only runs when changes are detected'
);
assert(
  workflowContent.includes('git config user.name "github-actions[bot]"'),
  'commit uses github-actions bot user name'
);
assert(
  workflowContent.includes('git config user.email "github-actions[bot]@users.noreply.github.com"'),
  'commit uses github-actions bot email'
);
assert(
  workflowContent.includes('git add src/data/events/ public/images/events/og/'),
  'commit stages both events data and OG images'
);
assert(
  workflowContent.includes('git commit -m "chore: update MTBO event data from scraper"'),
  'commit message follows chore: convention'
);
assert(workflowContent.includes('git push'), 'workflow pushes commits');

// Validate Node.js version
assert(workflowContent.includes("node-version: '20'"), 'workflow uses Node.js 20');

// Validate actions versions
assert(workflowContent.includes('actions/checkout@v4'), 'uses actions/checkout@v4');
assert(workflowContent.includes('actions/setup-node@v4'), 'uses actions/setup-node@v4');

// ─── package.json: sharp dependency ─────────────────────────────────────────
console.log('\n── package.json: sharp dependency ──');

const packageJsonPath = path.join(PROJECT_ROOT, 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

assert(typeof packageJson.dependencies === 'object', 'package.json has dependencies object');
assert('sharp' in packageJson.dependencies, '"sharp" is listed in production dependencies (PR change)');

// Verify sharp version matches the PR change (^0.34.5)
const sharpVersion = packageJson.dependencies.sharp;
assert(typeof sharpVersion === 'string', 'sharp version is a string');
assert(sharpVersion.startsWith('^0.34'), 'sharp version is ^0.34.x as added in PR');

// Verify the import:events script is present in package.json
assert(typeof packageJson.scripts === 'object', 'package.json has scripts');
assert('import:events' in packageJson.scripts, '"import:events" script is defined');
assert(
  packageJson.scripts['import:events'].includes('import-events.mjs'),
  '"import:events" script calls import-events.mjs'
);

// ────────────────────────────────────────────────────────────────────────────────
// Summary
// ────────────────────────────────────────────────────────────────────────────────
console.log(`\n────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  process.exit(1);
} else {
  console.log('SUCCESS: All config change tests passed.');
}