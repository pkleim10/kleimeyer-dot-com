#!/usr/bin/env node

/**
 * Version Bump Script for SEMVER
 * 
 * This script automatically bumps the version in package.json and creates a git tag
 * based on the type of changes detected in the commit messages.
 * 
 * Usage:
 *   node scripts/version-bump.js [patch|minor|major]
 *   node scripts/version-bump.js auto  # Auto-detect from commit messages
 */

const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function getCurrentVersion() {
  const packagePath = path.join(process.cwd(), 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  return packageJson.version;
}

function parseVersion(version) {
  const [major, minor, patch] = version.split('.').map(Number);
  return { major, minor, patch };
}

function bumpVersion(currentVersion, type) {
  const { major, minor, patch } = parseVersion(currentVersion);
  
  switch (type) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'patch':
      return `${major}.${minor}.${patch + 1}`;
    default:
      throw new Error(`Invalid version type: ${type}`);
  }
}

function getCommitMessages() {
  try {
    // Get commit messages from the last commit
    const lastCommit = execSync('git log -1 --pretty=%B', { encoding: 'utf8' }).trim();
    return [lastCommit];
  } catch (error) {
    log('Warning: Could not get commit messages', 'yellow');
    return [];
  }
}

function detectVersionType(commitMessages) {
  const messages = commitMessages.join(' ').toLowerCase();
  
  // Major version indicators
  const majorIndicators = [
    'breaking change',
    'breaking:',
    'feat!:',
    'major:',
    'remove',
    'deprecate',
    'incompatible'
  ];
  
  // Minor version indicators
  const minorIndicators = [
    'feat:',
    'feature:',
    'new:',
    'add:',
    'enhancement:',
    'improve:',
    'minor:'
  ];
  
  // Patch version indicators
  const patchIndicators = [
    'fix:',
    'bug:',
    'patch:',
    'update:',
    'refactor:',
    'style:',
    'docs:',
    'test:',
    'chore:'
  ];
  
  // Check for major version indicators
  if (majorIndicators.some(indicator => messages.includes(indicator))) {
    return 'major';
  }
  
  // Check for minor version indicators
  if (minorIndicators.some(indicator => messages.includes(indicator))) {
    return 'minor';
  }
  
  // Check for patch version indicators
  if (patchIndicators.some(indicator => messages.includes(indicator))) {
    return 'patch';
  }
  
  // Default to patch for any other changes
  return 'patch';
}

function updatePackageJson(newVersion) {
  const packagePath = path.join(process.cwd(), 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  
  packageJson.version = newVersion;
  
  fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');
  log(`Updated package.json to version ${newVersion}`, 'green');
}

function createGitTag(version) {
  try {
    execSync(`git tag -a v${version} -m "Release version ${version}"`, { stdio: 'inherit' });
    log(`Created git tag v${version}`, 'green');
  } catch (error) {
    log(`Warning: Could not create git tag: ${error.message}`, 'yellow');
  }
}

function updateChangelog(version, versionType) {
  const changelogPath = path.join(process.cwd(), 'CHANGELOG.md');
  
  if (!fs.existsSync(changelogPath)) {
    log('Warning: CHANGELOG.md not found, skipping update', 'yellow');
    return;
  }
  
  const changelog = fs.readFileSync(changelogPath, 'utf8');
  const today = new Date().toISOString().split('T')[0];
  
  // Create version entry
  const versionEntry = `## [${version}] - ${today}

### ${versionType === 'major' ? 'BREAKING CHANGES' : versionType === 'minor' ? 'Added' : 'Fixed'}
- See commit history for detailed changes

`;
  
  // Replace [Unreleased] with the new version
  const updatedChangelog = changelog.replace(
    /## \[Unreleased\]/,
    versionEntry + '## [Unreleased]'
  );
  
  fs.writeFileSync(changelogPath, updatedChangelog);
  log(`Updated CHANGELOG.md with version ${version}`, 'green');
}

function main() {
  const args = process.argv.slice(2);
  const versionType = args[0] || 'auto';
  
  log('🚀 Version Bump Script', 'cyan');
  log('====================', 'cyan');
  
  try {
    const currentVersion = getCurrentVersion();
    log(`Current version: ${currentVersion}`, 'blue');
    
    let newVersion;
    
    if (versionType === 'auto') {
      const commitMessages = getCommitMessages();
      const detectedType = detectVersionType(commitMessages);
      log(`Auto-detected version type: ${detectedType}`, 'blue');
      newVersion = bumpVersion(currentVersion, detectedType);
    } else {
      newVersion = bumpVersion(currentVersion, versionType);
    }
    
    log(`New version: ${newVersion}`, 'green');
    
    // Update package.json
    updatePackageJson(newVersion);
    
    // Update CHANGELOG.md
    updateChangelog(newVersion, versionType);
    
    // Create git tag
    createGitTag(newVersion);
    
    log('✅ Version bump completed successfully!', 'green');
    log(`Next steps:`, 'cyan');
    log(`  1. Review the changes: git diff`, 'blue');
    log(`  2. Commit the changes: git add . && git commit -m "Bump version to ${newVersion}"`, 'blue');
    log(`  3. Push with tags: git push && git push --tags`, 'blue');
    
  } catch (error) {
    log(`❌ Error: ${error.message}`, 'red');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { bumpVersion, detectVersionType, getCurrentVersion };
