#!/usr/bin/env node
/**
 * Author Outreach Script
 * 
 * The unlock: Find MCP server authors, offer to host their servers,
 * get README badges/backlinks in return.
 * 
 * This is distribution without social accounts.
 */

const fs = require('fs');
const path = require('path');

// Parse GitHub URL to extract owner/repo
function parseGitHubUrl(url) {
  if (!url) return null;
  const match = url.match(/github\.com\/([^\/]+)\/([^\/\s]+)/);
  if (!match) return null;
  return { owner: match[1], repo: match[2].replace(/\.git$/, '') };
}

// Generate personalized outreach email
function generateOutreachEmail(server, authorInfo) {
  const serverName = server.name;
  const repoUrl = server.github_url;
  const authorName = authorInfo?.name || authorInfo?.owner || 'there';
  
  return {
    subject: `Your MCP server "${serverName}" - free hosted version?`,
    body: `Hi ${authorName},

I found your MCP server "${serverName}" and added it to the AutropicAI directory (https://tryautropic.com/servers/${server.slug}).

Quick offer: We're building hosted MCP infrastructure so developers can try tools instantly without installing anything. Would you be interested in having "${serverName}" hosted on our platform? 

What you'd get:
- Zero-install instant access for users (just an API call)
- Usage analytics (see how people use your tool)
- More visibility in our directory

It's free - we're trying to make MCP more accessible.

If interested, just reply and I'll set it up. And if you'd be open to adding a "Try it on AutropicAI" badge to your README, that would help us out too.

Either way, thanks for building cool MCP tools!

Best,
Jenkins
AutropicAI
https://tryautropic.com

P.S. Your server page: https://tryautropic.com/servers/${server.slug}`,
  };
}

// Generate badge markdown for READMEs
function generateBadgeMarkdown(serverSlug) {
  return `[![Try on AutropicAI](https://img.shields.io/badge/Try_on-AutropicAI-764ba2?style=for-the-badge)](https://tryautropic.com/servers/${serverSlug})`;
}

// Main: Generate outreach list
async function generateOutreachList() {
  // Load servers from expanded data
  const expandedPath = path.join(__dirname, 'expand-servers.js');
  
  // For now, we'll create a simple extraction from what we know
  console.log('Generating author outreach list...\n');
  
  // Read the seed file to get GitHub URLs
  const seedPath = path.join(__dirname, 'seed-from-awesome.js');
  const seedContent = fs.readFileSync(seedPath, 'utf8');
  
  // Extract GitHub URLs using regex
  const githubUrls = seedContent.match(/https:\/\/github\.com\/[^\s'"]+/g) || [];
  const uniqueUrls = [...new Set(githubUrls)];
  
  console.log(`Found ${uniqueUrls.length} unique GitHub repositories\n`);
  
  // Group by owner (likely same author)
  const byOwner = {};
  uniqueUrls.forEach(url => {
    const parsed = parseGitHubUrl(url);
    if (parsed) {
      if (!byOwner[parsed.owner]) {
        byOwner[parsed.owner] = [];
      }
      byOwner[parsed.owner].push({ url, repo: parsed.repo });
    }
  });
  
  console.log(`Found ${Object.keys(byOwner).length} unique authors/orgs\n`);
  
  // Generate outreach targets
  const outreachTargets = Object.entries(byOwner).map(([owner, repos]) => ({
    author: owner,
    profileUrl: `https://github.com/${owner}`,
    repos: repos,
    repoCount: repos.length,
    // Priority: authors with multiple MCP servers are more valuable
    priority: repos.length > 1 ? 'high' : 'normal',
  }));
  
  // Sort by priority (multiple repos first)
  outreachTargets.sort((a, b) => b.repoCount - a.repoCount);
  
  // Save to file
  const outreachData = {
    generated: new Date().toISOString(),
    totalAuthors: outreachTargets.length,
    totalRepos: uniqueUrls.length,
    targets: outreachTargets,
    emailTemplate: generateOutreachEmail({ 
      name: '[SERVER_NAME]', 
      slug: '[server-slug]',
      github_url: 'https://github.com/owner/repo'
    }, { owner: '[Author Name]' }),
    badgeTemplate: generateBadgeMarkdown('[server-slug]'),
  };
  
  const outputPath = path.join(__dirname, '..', 'marketing', 'outreach-list.json');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(outreachData, null, 2));
  
  console.log(`Saved outreach list to ${outputPath}`);
  console.log(`\nTop 10 targets (by repo count):`);
  outreachTargets.slice(0, 10).forEach((t, i) => {
    console.log(`${i + 1}. ${t.author} - ${t.repoCount} repos - ${t.profileUrl}`);
  });
  
  return outreachData;
}

// Run if called directly
if (require.main === module) {
  generateOutreachList().catch(console.error);
}

module.exports = { generateOutreachList, generateOutreachEmail, generateBadgeMarkdown, parseGitHubUrl };
