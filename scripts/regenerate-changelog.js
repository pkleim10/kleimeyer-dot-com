#!/usr/bin/env node

/**
 * Regenerate Changelog Script
 * 
 * This script regenerates the entire CHANGELOG.md from git history
 * using the new detailed commit-based format.
 */

const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

// Import functions from version-bump.js
const { categorizeCommits, formatCommitMessage, formatChangelogEntry } = require('./version-bump.js');

function getCommitsBetweenTags(fromTag, toTag) {
  try {
    const logOutput = execSync(`git log ${fromTag}..${toTag} --no-merges --pretty=format:"%h|%s|%b"`, { 
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
  } catch (error) {
    return [];
  }
}

function getTagDate(tag) {
  try {
    const date = execSync(`git log -1 --format=%ai ${tag}`, { encoding: 'utf8' }).trim();
    return date.split(' ')[0]; // Get just the date part
  } catch (error) {
    return new Date().toISOString().split('T')[0];
  }
}

function generateVersionEntry(tag, commits) {
  // Remove 'v' prefix if present
  const version = tag.replace(/^v/, '');
  
  // Get date for this tag
  const date = getTagDate(tag);
  
  if (commits.length === 0) {
    return `## [${version}] - ${date}\n\n### Fixed\n- See commit history for detailed changes\n\n`;
  }
  
  // Use the same formatting logic as version-bump.js
  const categorized = categorizeCommits(commits);
  let entry = `## [${version}] - ${date}\n\n`;
  
  const categoryOrder = ['Added', 'Changed', 'Fixed', 'Security', 'Removed', 'Deprecated'];
  
  categoryOrder.forEach(category => {
    if (categorized[category] && categorized[category].length > 0) {
      entry += `### ${category}\n`;
      
      categorized[category].forEach(commit => {
        const message = formatCommitMessage(commit.subject, commit.body);
        entry += `- ${message}\n`;
      });
      
      entry += '\n';
    }
  });
  
  return entry;
}

function main() {
  console.log('🔄 Regenerating CHANGELOG.md...\n');
  
  const changelogPath = path.join(process.cwd(), 'CHANGELOG.md');
  
  // Get header from existing changelog
  let header = '# Changelog\n\nAll notable changes to this project will be documented in this file.\n\nThe format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),\nand this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).\n\n';
  if (fs.existsSync(changelogPath)) {
    const existing = fs.readFileSync(changelogPath, 'utf8');
    const headerMatch = existing.match(/^(# Changelog\n\n.*?\n\n)/);
    if (headerMatch) {
      header = headerMatch[1];
    }
  }
  
  // Get all tags sorted by version (newest first)
  const tagsOutput = execSync('git tag --sort=-version:refname', { encoding: 'utf8' }).trim();
  const tags = tagsOutput.split('\n').filter(t => t.trim());
  
  if (tags.length === 0) {
    console.log('❌ No tags found');
    process.exit(1);
  }
  
  console.log(`Found ${tags.length} tags\n`);
  
  // Generate changelog entries for each version
  const entries = [];
  
  for (let i = 0; i < tags.length; i++) {
    const tag = tags[i];
    const previousTag = i < tags.length - 1 ? tags[i + 1] : null;
    
    console.log(`Processing ${tag}...`);
    
    let commits;
    if (previousTag) {
      commits = getCommitsBetweenTags(previousTag, tag);
    } else {
      // For the oldest tag, get all commits up to that tag
      try {
        commits = getCommitsBetweenTags('', tag);
      } catch (error) {
        commits = [];
      }
    }
    
    // Filter out version bump commits
    commits = commits.filter(c => 
      !c.subject.toLowerCase().includes('bump version') && 
      !c.subject.toLowerCase().includes('chore: bump')
    );
    
    const entry = generateVersionEntry(tag, commits);
    entries.push(entry);
    
    console.log(`  ✓ ${commits.length} commits\n`);
  }
  
  // Build new changelog
  const newChangelog = header + entries.join('');
  
  // Write to file
  fs.writeFileSync(changelogPath, newChangelog);
  
  console.log('✅ CHANGELOG.md regenerated successfully!');
  console.log(`   Generated ${entries.length} version entries`);
}

if (require.main === module) {
  main();
}

module.exports = { generateVersionEntry, getCommitsBetweenTags };

