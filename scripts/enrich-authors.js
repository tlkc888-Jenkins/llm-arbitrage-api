#!/usr/bin/env node
/**
 * Enrich author data with contact info from GitHub
 */

const fs = require('fs');
const path = require('path');

const RATE_LIMIT_DELAY = 2000; // 2 seconds between requests (respect GitHub)

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchGitHubUser(username) {
  try {
    const res = await fetch(`https://api.github.com/users/${username}`, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'AutropicAI-Outreach'
      }
    });
    
    if (!res.ok) {
      console.log(`  ⚠ API error for ${username}: ${res.status}`);
      return null;
    }
    
    return await res.json();
  } catch (e) {
    console.log(`  ⚠ Fetch error for ${username}: ${e.message}`);
    return null;
  }
}

async function enrichAuthors() {
  const outreachPath = path.join(__dirname, '..', 'marketing', 'outreach-list.json');
  const data = JSON.parse(fs.readFileSync(outreachPath, 'utf8'));
  
  console.log(`Enriching ${data.targets.length} authors...\n`);
  
  // Skip modelcontextprotocol (Anthropic's official org)
  const targets = data.targets.filter(t => t.author !== 'modelcontextprotocol');
  
  const enriched = [];
  let withEmail = 0;
  let withTwitter = 0;
  let withBlog = 0;
  
  for (let i = 0; i < targets.length; i++) {
    const target = targets[i];
    console.log(`[${i + 1}/${targets.length}] Fetching ${target.author}...`);
    
    const ghData = await fetchGitHubUser(target.author);
    
    if (ghData) {
      target.github = {
        name: ghData.name,
        email: ghData.email,
        blog: ghData.blog,
        twitter: ghData.twitter_username,
        bio: ghData.bio,
        company: ghData.company,
        location: ghData.location,
        followers: ghData.followers,
        publicRepos: ghData.public_repos,
      };
      
      if (ghData.email) withEmail++;
      if (ghData.twitter_username) withTwitter++;
      if (ghData.blog) withBlog++;
      
      console.log(`  ✓ ${ghData.name || '(no name)'} | ${ghData.email || '(no email)'}`);
    }
    
    enriched.push(target);
    
    // Rate limit
    if (i < targets.length - 1) {
      await sleep(RATE_LIMIT_DELAY);
    }
  }
  
  // Save enriched data
  const enrichedData = {
    ...data,
    enrichedAt: new Date().toISOString(),
    targets: enriched,
    stats: {
      total: enriched.length,
      withEmail,
      withTwitter,
      withBlog,
    }
  };
  
  const outputPath = path.join(__dirname, '..', 'marketing', 'outreach-enriched.json');
  fs.writeFileSync(outputPath, JSON.stringify(enrichedData, null, 2));
  
  console.log(`\n=== Summary ===`);
  console.log(`Total authors: ${enriched.length}`);
  console.log(`With email: ${withEmail}`);
  console.log(`With Twitter: ${withTwitter}`);
  console.log(`With blog/website: ${withBlog}`);
  console.log(`\nSaved to: ${outputPath}`);
  
  // Generate ready-to-send list
  const readyToSend = enriched
    .filter(t => t.github?.email)
    .map(t => ({
      author: t.author,
      name: t.github.name || t.author,
      email: t.github.email,
      repos: t.repos.length,
      profileUrl: t.profileUrl,
    }));
  
  console.log(`\n=== Ready to Email (${readyToSend.length}) ===`);
  readyToSend.forEach(t => {
    console.log(`${t.name} <${t.email}> - ${t.repos} repos`);
  });
  
  return enrichedData;
}

if (require.main === module) {
  enrichAuthors().catch(console.error);
}

module.exports = { enrichAuthors };
