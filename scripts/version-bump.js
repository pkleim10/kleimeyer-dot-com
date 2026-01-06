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

function getCommitsSinceLastRelease() {
  try {
    // Get the last tag
    const lastTag = execSync('git describe --tags --abbrev=0', { encoding: 'utf8' }).trim();
    // Get commits since last tag
    const commits = execSync(`git log ${lastTag}..HEAD --pretty=format:"%h|%s|%b"`, { encoding: 'utf8' })
      .trim()
      .split('\n')
      .filter(line => line.trim() !== '')
      .map(line => {
        const [hash, subject, ...bodyParts] = line.split('|');
        return {
          hash: hash.trim(),
          subject: subject.trim(),
          body: bodyParts.join('|').trim()
        };
      });
    return commits;
  } catch (error) {
    // If no tags exist, get all commits
    try {
      const commits = execSync('git log --pretty=format:"%h|%s|%b"', { encoding: 'utf8' })
        .trim()
        .split('\n')
        .filter(line => line.trim() !== '')
        .map(line => {
          const [hash, subject, ...bodyParts] = line.split('|');
          return {
            hash: hash.trim(),
            subject: subject.trim(),
            body: bodyParts.join('|').trim()
          };
        });
      return commits.slice(0, 50); // Limit to last 50 commits if no tags
    } catch (err) {
      log('Warning: Could not get commits', 'yellow');
      return [];
    }
  }
}

function categorizeCommits(commits) {
  const categories = {
    Added: [],
    Changed: [],
    Fixed: [],
    Security: [],
    Removed: [],
    Deprecated: []
  };

  commits.forEach(commit => {
    const subjectLower = commit.subject.toLowerCase();
    const message = `${commit.subject} ${commit.body}`.toLowerCase();
    
    // Skip version bump commits
    if (subjectLower.includes('bump version') || subjectLower.includes('chore: bump')) {
      return;
    }

    // Categorize based on conventional commit prefix first (most reliable)
    if (subjectLower.match(/^(feat|add|new):/)) {
      categories.Added.push(commit);
    } else if (subjectLower.match(/^(fix|bug):/)) {
      categories.Fixed.push(commit);
    } else if (subjectLower.match(/^(change|update|refactor|improve|chore):/)) {
      categories.Changed.push(commit);
    } else if (subjectLower.match(/^(remove|delete|rm):/)) {
      categories.Removed.push(commit);
    } else if (message.includes('security') || message.includes('vulnerability') || message.includes('rls') || message.includes('permission')) {
      categories.Security.push(commit);
    } else if (subjectLower.match(/^(deprecate):/)) {
      categories.Deprecated.push(commit);
    } else {
      // Fallback: categorize by keywords in subject (more specific patterns)
      if (subjectLower.match(/\b(add|new|create|implement|introduce)\b/) && !subjectLower.match(/\b(fix|remove|delete)\b/)) {
        categories.Added.push(commit);
      } else if (subjectLower.match(/\b(fix|bug|error|issue|resolve|correct)\b/)) {
        categories.Fixed.push(commit);
      } else if (subjectLower.match(/\b(change|update|refactor|improve|enhance|modify|optimize)\b/)) {
        categories.Changed.push(commit);
      } else if (subjectLower.match(/\b(remove|delete|rm|drop)\b/)) {
        categories.Removed.push(commit);
      } else {
        // Default to Fixed for unknown types
        categories.Fixed.push(commit);
      }
    }
  });

  // Remove empty categories
  return Object.fromEntries(
    Object.entries(categories).filter(([_, commits]) => commits.length > 0)
  );
}

function formatCommitMessage(subject, body) {
  // Remove conventional commit prefix if present
  let message = subject.replace(/^(feat|fix|chore|docs|style|refactor|test|perf|ci|build|revert):\s*/i, '');
  
  // Capitalize first letter
  message = message.charAt(0).toUpperCase() + message.slice(1);
  
  // Add body as detail if present and different from subject
  if (body && body.trim() && !subject.toLowerCase().includes(body.toLowerCase().substring(0, 20))) {
    message += `: ${body.trim()}`;
  }
  
  return message;
}

function formatChangelogEntry(commits, version, versionType) {
  const categorized = categorizeCommits(commits);
  const today = new Date().toISOString().split('T')[0];
  
  let entry = `## [${version}] - ${today}\n\n`;
  
  // Add sections for each category
  const categoryOrder = ['Added', 'Changed', 'Fixed', 'Security', 'Removed', 'Deprecated'];
  
  categoryOrder.forEach(category => {
    if (categorized[category] && categorized[category].length > 0) {
      entry += `### ${category}\n`;
      
      categorized[category].forEach(commit => {
        // Format commit message
        const message = formatCommitMessage(commit.subject, commit.body);
        entry += `- ${message}\n`;
      });
      
      entry += '\n';
    }
  });
  
  return entry;
}

function updateChangelog(version, versionType) {
  const changelogPath = path.join(process.cwd(), 'CHANGELOG.md');
  
  if (!fs.existsSync(changelogPath)) {
    log('Warning: CHANGELOG.md not found, skipping update', 'yellow');
    return;
  }
  
  const changelog = fs.readFileSync(changelogPath, 'utf8');
  
  // Get commits since last release
  const commits = getCommitsSinceLastRelease();
  
  if (commits.length === 0) {
    log('Warning: No commits found since last release', 'yellow');
    // Fall back to generic entry
    const today = new Date().toISOString().split('T')[0];
    const versionEntry = `## [${version}] - ${today}\n\n### ${versionType === 'major' ? 'BREAKING CHANGES' : versionType === 'minor' ? 'Added' : 'Fixed'}\n- See commit history for detailed changes\n\n`;
    const updatedChangelog = changelog.replace(/## \[Unreleased\]/, versionEntry + '## [Unreleased]');
    fs.writeFileSync(changelogPath, updatedChangelog);
    return;
  }
  
  // Format changelog entry
  const versionEntry = formatChangelogEntry(commits, version, versionType);
  
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
