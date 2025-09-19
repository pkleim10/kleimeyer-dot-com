#!/usr/bin/env node

/**
 * Release Script for SEMVER
 * 
 * This script automates the release process:
 * 1. Bumps version based on commit messages
 * 2. Updates CHANGELOG.md
 * 3. Creates git tag
 * 4. Commits and pushes changes
 * 
 * Usage:
 *   node scripts/release.js [patch|minor|major]
 *   node scripts/release.js auto  # Auto-detect from commit messages
 */

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

function runCommand(command, description) {
  try {
    log(`🔄 ${description}...`, 'blue');
    execSync(command, { stdio: 'inherit' });
    log(`✅ ${description} completed`, 'green');
  } catch (error) {
    log(`❌ Error during ${description}: ${error.message}`, 'red');
    throw error;
  }
}

function checkGitStatus() {
  try {
    const status = execSync('git status --porcelain', { encoding: 'utf8' });
    if (status.trim()) {
      log('⚠️  Working directory has uncommitted changes:', 'yellow');
      log(status, 'yellow');
      return false;
    }
    return true;
  } catch (error) {
    log(`❌ Error checking git status: ${error.message}`, 'red');
    return false;
  }
}

function checkBranch() {
  try {
    const branch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
    if (branch !== 'main') {
      log(`⚠️  Current branch is '${branch}', not 'main'`, 'yellow');
      log('   Releases should typically be made from the main branch', 'yellow');
      return false;
    }
    return true;
  } catch (error) {
    log(`❌ Error checking branch: ${error.message}`, 'red');
    return false;
  }
}

function main() {
  const args = process.argv.slice(2);
  const versionType = args[0] || 'auto';
  
  log('🚀 Release Script', 'cyan');
  log('=================', 'cyan');
  
  try {
    // Pre-flight checks
    log('🔍 Running pre-flight checks...', 'blue');
    
    if (!checkGitStatus()) {
      log('❌ Please commit or stash your changes before releasing', 'red');
      process.exit(1);
    }
    
    if (!checkBranch()) {
      log('❌ Please switch to the main branch before releasing', 'red');
      process.exit(1);
    }
    
    // Run version bump
    log('📦 Bumping version...', 'blue');
    runCommand(`node scripts/version-bump.js ${versionType}`, 'Version bump');
    
    // Get the new version
    const packageJson = require(path.join(process.cwd(), 'package.json'));
    const newVersion = packageJson.version;
    
    // Commit changes
    log('💾 Committing changes...', 'blue');
    runCommand(
      `git add . && git commit -m "chore: bump version to ${newVersion}"`,
      'Commit version bump'
    );
    
    // Push changes
    log('🚀 Pushing changes...', 'blue');
    runCommand('git push', 'Push commits');
    
    // Push tags
    log('🏷️  Pushing tags...', 'blue');
    runCommand('git push --tags', 'Push tags');
    
    log('🎉 Release completed successfully!', 'green');
    log(`📋 Version ${newVersion} has been released`, 'green');
    log('🔗 Check your repository for the new tag and release', 'blue');
    
  } catch (error) {
    log(`❌ Release failed: ${error.message}`, 'red');
    log('💡 You may need to manually resolve any issues and try again', 'yellow');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
