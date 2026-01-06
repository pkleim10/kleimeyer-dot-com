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
    // Get all tags sorted by version (newest first)
    const tagsOutput = execSync('git tag --sort=-version:refname', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
    const tags = tagsOutput.split('\n').filter(t => t.trim());
    
    if (tags.length === 0) {
      throw new Error('No tags found');
    }
    
    // Get the most recent tag (the last release)
    // When creating a new release, the new tag doesn't exist yet, so we use the most recent existing tag
    const lastTag = tags[0];
    
    if (!lastTag) {
      throw new Error('Could not determine last tag');
    }
    
    // Get commits since last tag, excluding merge commits
    const logOutput = execSync(`git log ${lastTag}..HEAD --no-merges --pretty=format:"%h|%s|%b"`, { 
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();
    
    if (!logOutput) {
      return [];
    }
    
    const commits = logOutput
      .split('\n')
      .filter(line => line.trim() !== '')
      .map(line => {
        const parts = line.split('|');
        const hash = parts[0] || '';
        const subject = parts[1] || '';
        const body = parts.slice(2).join('|') || '';
        return {
          hash: hash.trim(),
          subject: subject.trim(),
          body: body.trim()
        };
      })
      .filter(commit => commit.hash && commit.subject); // Filter out invalid entries
    
    return commits;
  } catch (error) {
    // If no tags exist or error getting tags, try to get recent commits
    try {
      const logOutput = execSync('git log --no-merges --pretty=format:"%h|%s|%b" -50', { 
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      }).trim();
      
      if (!logOutput) {
        return [];
      }
      
      const commits = logOutput
        .split('\n')
        .filter(line => line.trim() !== '')
        .map(line => {
          const parts = line.split('|');
          const hash = parts[0] || '';
          const subject = parts[1] || '';
          const body = parts.slice(2).join('|') || '';
          return {
            hash: hash.trim(),
            subject: subject.trim(),
            body: body.trim()
          };
        })
        .filter(commit => commit.hash && commit.subject);
      
      return commits;
    } catch (err) {
      log(`Warning: Could not get commits: ${err.message}`, 'yellow');
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
  
  // Remove "Release vX.X.X:" prefixes
  message = message.replace(/^Release v\d+\.\d+\.\d+:\s*/i, '');
  
  // Capitalize first letter
  message = message.charAt(0).toUpperCase() + message.slice(1);
  
  // Add body as detail if present and different from subject
  // Only add if body provides meaningful additional context
  if (body && body.trim()) {
    const bodyTrimmed = body.trim();
    // Don't add if body is too similar to subject or is just a list
    const bodyStart = bodyTrimmed.toLowerCase().substring(0, 30);
    const subjectLower = subject.toLowerCase();
    
    // Only include body if it adds meaningful context and isn't redundant
    if (!subjectLower.includes(bodyStart) && bodyTrimmed.length > 10) {
      // Clean up body - remove leading dashes/bullets, trim whitespace
      // Remove "Release vX.X.X:" prefixes from body too
      let cleanBody = bodyTrimmed.replace(/^[-*]\s*/, '').replace(/^Release v\d+\.\d+\.\d+:\s*/i, '').trim();
      
      // If body starts with the same words as subject, skip it
      const messageStart = message.toLowerCase().substring(0, 20);
      if (cleanBody && cleanBody.toLowerCase().substring(0, 20) !== messageStart && cleanBody !== message) {
        message += `: ${cleanBody}`;
      }
    }
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
  
  let versionEntry;
  if (commits.length === 0) {
    log('Warning: No commits found since last release', 'yellow');
    // Fall back to generic entry
    const today = new Date().toISOString().split('T')[0];
    versionEntry = `## [${version}] - ${today}\n\n### ${versionType === 'major' ? 'BREAKING CHANGES' : versionType === 'minor' ? 'Added' : 'Fixed'}\n- See commit history for detailed changes\n\n`;
  } else {
    // Format changelog entry
    versionEntry = formatChangelogEntry(commits, version, versionType);
  }
  
  // Extract header (everything up to and including the format description)
  // Match: # Changelog, blank line, description, blank line, format lines, blank line
  const headerMatch = changelog.match(/^(# Changelog\n\nAll notable changes[^\n]*\n\nThe format is based[^\n]*\nand this project[^\n]*\n\n)/);
  const header = headerMatch ? headerMatch[1] : '# Changelog\n\nAll notable changes to this project will be documented in this file.\n\nThe format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),\nand this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).\n\n';
  
  // Get everything after the header (all version entries)
  const restOfChangelog = headerMatch 
    ? changelog.substring(headerMatch[1].length)
    : changelog.replace(/^# Changelog[\s\S]*?\n\n/, '');
  
  // Remove old [Unreleased] section entirely if it exists
  const versionsOnly = restOfChangelog.replace(/## \[Unreleased\][\s\S]*?(?=\n## \[|$)/, '').trim();
  
  // Build new changelog with newest version at top
  // Structure: Header -> New Version -> Older Versions
  const updatedChangelog = header + versionEntry + (versionsOnly ? versionsOnly + '\n' : '');
  
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

module.exports = { 
  bumpVersion, 
  detectVersionType, 
  getCurrentVersion,
  categorizeCommits,
  formatCommitMessage,
  formatChangelogEntry
};
