/**
 * Skill Scalper - Background Service Worker
 * Handles GitHub API interactions, skill discovery, and download coordination
 */

// Import fflate for proper ZIP creation
import * as fflate from 'https://cdn.skypack.dev/fflate@0.8.2?min';

// Configuration
const CONFIG = {
  GITHUB_API_BASE: 'https://api.github.com',
  RAW_CONTENT_BASE: 'https://raw.githubusercontent.com',
  SKILL_FILENAME: 'SKILL.md',
  MAX_DEPTH: 10,
  CONCURRENT_REQUESTS: 5
};

// Rate limit tracking
let rateLimitInfo = {
  remaining: null,
  limit: null,
  reset: null,
  lastChecked: null
};

/**
 * Message handler for communication with popup
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const { action, data } = request;

  switch (action) {
    case 'scanRepository':
      handleScanRepository(data)
        .then(sendResponse)
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true; // Keep channel open for async response

    case 'installSkills':
      handleInstallSkills(data)
        .then(sendResponse)
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;

    case 'getRateLimitStatus':
      getRateLimitStatus()
        .then(status => sendResponse({ success: true, data: status }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;

    case 'setGitHubToken':
      chrome.storage.sync.set({ githubToken: data.token })
        .then(() => sendResponse({ success: true, message: 'GitHub token saved' }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;

    case 'clearGitHubToken':
      chrome.storage.sync.remove('githubToken')
        .then(() => sendResponse({ success: true, message: 'GitHub token cleared' }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;

    default:
      sendResponse({ success: false, error: 'Unknown action' });
  }
});

/**
 * Handle repository scan request
 */
async function handleScanRepository(repoInfo) {
  try {
    console.log('Scanning repository:', repoInfo);

    const skills = await scanRepositoryForSkills(repoInfo);

    // Cache the results
    const cacheKey = `skills_${repoInfo.fullName}`;
    await chrome.storage.local.set({
      [cacheKey]: {
        skills,
      }
    });

    return {
      success: true,
      skills
    };
  } catch (error) {
    console.error('Scan error:', error);
    return {
      success: false,
      error: error.message || 'Failed to scan repository'
    };
  }
}

/**
 * Scan repository for SKILL.md files
 */
async function scanRepositoryForSkills(repoInfo) {
  const { owner, repo, branch } = repoInfo;
  const skills = [];
  const visited = new Set();

  // Start scanning from root
  await scanDirectory(owner, repo, branch, '', skills, visited, 0);

  // Fetch skill metadata for each discovered skill
  const skillsWithMetadata = await Promise.all(
    skills.map(skill => enrichSkillMetadata(owner, repo, branch, skill))
  );

  return skillsWithMetadata;
}

/**
 * Recursively scan directory for SKILL.md files
 */
async function scanDirectory(owner, repo, branch, path, skills, visited, depth) {
  // Prevent infinite recursion
  if (depth > CONFIG.MAX_DEPTH) {
    return;
  }

  // Prevent visiting same path twice
  const pathKey = `${owner}/${repo}/${branch}/${path}`;
  if (visited.has(pathKey)) {
    return;
  }
  visited.add(pathKey);

  try {
    const url = `${CONFIG.GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${path}?ref=${branch}`;
    const response = await fetchWithRetry(url);

    if (!response.ok) {
      if (response.status === 404) {
        // Try default branch
        if (branch !== 'main' && branch !== 'master') {
          return await scanDirectory(owner, repo, 'main', path, skills, visited, depth);
        }
      }
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const contents = await response.json();

    if (!Array.isArray(contents)) {
      return;
    }

    // Process contents in batches
    const batches = chunkArray(contents, CONFIG.CONCURRENT_REQUESTS);

    for (const batch of batches) {
      await Promise.all(
        batch.map(async (item) => {
          if (item.type === 'file' && item.name === CONFIG.SKILL_FILENAME) {
            // Found a SKILL.md file
            const skillPath = item.path.replace(`/${CONFIG.SKILL_FILENAME}`, '') || '/';
            skills.push({
              name: getSkillName(skillPath),
              path: skillPath,
              url: item.html_url,
              downloadUrl: item.download_url,
              sha: item.sha
            });
          } else if (item.type === 'dir') {
            // Recursively scan subdirectory
            await scanDirectory(owner, repo, branch, item.path, skills, visited, depth + 1);
          }
        })
      );
    }

  } catch (error) {
    console.error(`Error scanning directory ${path}:`, error);
  }
}

/**
 * Enrich skill with metadata from SKILL.md
 */
async function enrichSkillMetadata(owner, repo, branch, skill) {
  try {
    const skillMdPath = skill.path === '/' ? CONFIG.SKILL_FILENAME : `${skill.path}/${CONFIG.SKILL_FILENAME}`;
    const url = `${CONFIG.RAW_CONTENT_BASE}/${owner}/${repo}/${branch}/${skillMdPath}`;

    const response = await fetchWithRetry(url);

    if (!response.ok) {
      return skill;
    }

    const content = await response.text();
    const metadata = parseSkillMetadata(content);

    return {
      ...skill,
      ...metadata
    };
  } catch (error) {
    console.error(`Error enriching skill ${skill.path}:`, error);
    return skill;
  }
}

/**
 * Parse SKILL.md content to extract metadata
 */
function parseSkillMetadata(content) {
  const metadata = {};

  // Extract description from first paragraph
  const descriptionMatch = content.match(/^#.*\n\n(.+?)(?:\n\n|$)/s);
  if (descriptionMatch) {
    metadata.description = descriptionMatch[1].trim().replace(/\n/g, ' ');
  }

  // Extract title from first heading
  const titleMatch = content.match(/^#\s+(.+)$/m);
  if (titleMatch) {
    metadata.title = titleMatch[1].trim();
  }

  return metadata;
}

/**
 * Get skill name from path
 */
function getSkillName(path) {
  if (path === '/' || path === '') {
    return 'Root Skill';
  }

  const parts = path.split('/').filter(Boolean);
  const lastName = parts[parts.length - 1];

  // Convert kebab-case or snake_case to Title Case
  return lastName
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());
}

/**
 * Handle skill installation request
 * Supports both individual and batch download modes
 */
async function handleInstallSkills(data) {
  const { repo, skills, batchMode = true } = data;
  const { owner, repo: repoName, branch } = repo;

  try {
    console.log('Installing skills:', skills);

    if (batchMode && skills.length > 1) {
      // Batch mode: Download all skills in one combined ZIP
      await downloadAllSkillsAsZip(owner, repoName, branch, skills);
      return {
        success: true,
        message: `Successfully downloaded ${skills.length} skill(s) in batch package`
      };
    } else {
      // Individual mode: Download each skill separately
      for (const skill of skills) {
        await downloadSkillAsZip(owner, repoName, branch, skill);
      }
      return {
        success: true,
        message: `Successfully downloaded ${skills.length} skill(s)`
      };
    }
  } catch (error) {
    console.error('Install error:', error);
    return {
      success: false,
      error: error.message || 'Failed to install skills'
    };
  }
}

/**
 * Download all skills in a single combined ZIP package
 * This is more efficient and user-friendly than individual downloads
 */
async function downloadAllSkillsAsZip(owner, repo, branch, skills) {
  try {
    // Collect all files from all skills in parallel
    const allSkillFiles = await Promise.all(
      skills.map(async (skill) => {
        const files = await collectSkillFiles(owner, repo, branch, skill.path);
        return {
          skillName: skill.name,
          files: files
        };
      })
    );

    // Build a nested structure for the combined ZIP
    const zipStructure = {};

    for (const { skillName, files } of allSkillFiles) {
      // Sanitize skill name for directory
      const sanitizedName = skillName.replace(/[^a-z0-9-_]/gi, '_').toLowerCase();

      // Download all file contents for this skill
      const fileContents = await Promise.all(
        files.map(async (file) => {
          const response = await fetchWithRetry(file.downloadUrl);
          const content = await response.arrayBuffer();
          return {
            relativePath: file.path.replace(file.path.split('/')[0] + '/', ''), // Remove skill dir prefix
            content: new Uint8Array(content)
          };
        })
      );

      // Add files to ZIP structure under skill directory
      for (const { relativePath, content } of fileContents) {
        zipStructure[`${sanitizedName}/${relativePath}`] = content;
      }
    }

    // Create proper ZIP using fflate
    const zipData = fflate.zipSync(zipStructure, {
      level: 6, // Balanced compression
      mem: 8    // Memory level
    });

    // Convert to Blob
    const zipBlob = new Blob([zipData], { type: 'application/zip' });

    // Create filename with timestamp
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `claude-skills-batch-${timestamp}.zip`;

    // Convert Blob to data URL for service worker compatibility
    const reader = new FileReader();
    const dataUrlPromise = new Promise((resolve, reject) => {
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(zipBlob);
    });

    const downloadUrl = await dataUrlPromise;

    // Trigger download
    await chrome.downloads.download({
      url: downloadUrl,
      filename: `claude-skills/${filename}`,
      saveAs: false
    });

    console.log(`✅ Batch download complete: ${filename}`);

  } catch (error) {
    console.error('Error creating batch ZIP:', error);
    throw error;
  }
}

/**
 * Download skill directory as ZIP file
 */
async function downloadSkillAsZip(owner, repo, branch, skill) {
  try {
    // Collect all files in the skill directory
    const files = await collectSkillFiles(owner, repo, branch, skill.path);

    // Create ZIP file using JSZip-like approach (we'll use native browser APIs)
    const zipBlob = await createZipFromFiles(owner, repo, branch, files);

    // Sanitize skill name for filename
    const sanitizedName = skill.name.replace(/[^a-z0-9-_]/gi, '_').toLowerCase();
    const filename = `${sanitizedName}_skill.zip`;

    // Download the ZIP file
    // Note: URL.createObjectURL() doesn't work in service worker context (MV3)
    // Convert Blob to data URL for service worker compatibility
    const reader = new FileReader();
    const dataUrlPromise = new Promise((resolve, reject) => {
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(zipBlob);
    });

    const downloadUrl = await dataUrlPromise;

    await chrome.downloads.download({
      url: downloadUrl,
      filename: `claude-skills/${filename}`,
      saveAs: false
    });

  } catch (error) {
    console.error(`Error downloading skill ${skill.name}:`, error);
    throw error;
  }
}

/**
 * Collect all files in a skill directory
 */
async function collectSkillFiles(owner, repo, branch, path) {
  const files = [];
  const visited = new Set();

  await collectFilesRecursive(owner, repo, branch, path, files, visited, 0);

  return files;
}

/**
 * Recursively collect files from directory
 */
async function collectFilesRecursive(owner, repo, branch, path, files, visited, depth) {
  if (depth > CONFIG.MAX_DEPTH) {
    return;
  }

  const pathKey = `${owner}/${repo}/${branch}/${path}`;
  if (visited.has(pathKey)) {
    return;
  }
  visited.add(pathKey);

  try {
    const url = `${CONFIG.GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${path}?ref=${branch}`;
    const response = await fetchWithRetry(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch directory: ${response.status}`);
    }

    const contents = await response.json();

    if (!Array.isArray(contents)) {
      return;
    }

    for (const item of contents) {
      if (item.type === 'file') {
        files.push({
          path: item.path,
          name: item.name,
          downloadUrl: item.download_url,
          size: item.size
        });
      } else if (item.type === 'dir') {
        await collectFilesRecursive(owner, repo, branch, item.path, files, visited, depth + 1);
      }
    }

  } catch (error) {
    console.error(`Error collecting files from ${path}:`, error);
  }
}

/**
 * Create ZIP file from collected files using fflate
 * Properly creates valid ZIP archives
 */
async function createZipFromFiles(owner, repo, branch, files) {
  if (files.length === 0) {
    throw new Error('No files to archive');
  }

  if (files.length === 1) {
    // Single file - just download as-is (no ZIP needed)
    const response = await fetchWithRetry(files[0].downloadUrl);
    return await response.blob();
  }

  // For multiple files, create a proper ZIP using fflate
  const zipData = await createProperZip(files);
  return new Blob([zipData], { type: 'application/zip' });
}

/**
 * Create a proper ZIP archive using fflate
 * This creates standards-compliant ZIP files
 */
async function createProperZip(files) {
  // Download all file contents in parallel
  const fileContents = await Promise.all(
    files.map(async (file) => {
      const response = await fetchWithRetry(file.downloadUrl);
      const content = await response.arrayBuffer();
      return {
        name: file.name,
        path: file.path,
        content: new Uint8Array(content)
      };
    })
  );

  // Build ZIP structure for fflate
  // fflate expects an object where keys are file paths and values are Uint8Array
  const zipStructure = {};

  for (const file of fileContents) {
    // Use relative path within skill directory
    const relativePath = file.path.split('/').slice(1).join('/') || file.name;
    zipStructure[relativePath] = file.content;
  }

  // Create ZIP using fflate's synchronous method
  // This is safe for reasonable file sizes in a service worker
  const zipData = fflate.zipSync(zipStructure, {
    level: 6, // Balanced compression (0=none, 9=max)
    mem: 8    // Memory level (balance between speed and memory)
  });

  return zipData;
}

/**
 * Fetch with retry logic and rate limit handling
 */
async function fetchWithRetry(url, options = {}, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      // Get GitHub token from storage if available
      const { githubToken } = await chrome.storage.sync.get('githubToken');

      const response = await fetch(url, {
        ...options,
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          ...(githubToken ? { 'Authorization': `token ${githubToken}` } : {}),
          ...options.headers
        }
      });

      // Update rate limit info from response headers
      updateRateLimitInfo(response);

      // Handle rate limiting
      if (response.status === 403 || response.status === 429) {
        const rateLimitRemaining = response.headers.get('X-RateLimit-Remaining');
        const resetTime = response.headers.get('X-RateLimit-Reset');

        // Check if this is rate limiting (remaining = 0)
        if (rateLimitRemaining === '0' && resetTime) {
          const waitTime = (parseInt(resetTime) * 1000) - Date.now();
          const waitMinutes = Math.ceil(waitTime / 60000);

          console.warn(`⚠️ GitHub API rate limit exceeded. Reset in ${waitMinutes} minute(s).`);

          if (waitTime > 0 && waitTime < 300000) { // Wait max 5 minutes
            console.log(`⏳ Waiting ${waitMinutes} minute(s) for rate limit reset...`);
            await sleep(waitTime + 1000); // Add 1 second buffer
            continue;
          } else {
            // Rate limit reset too far in future
            throw new Error(
              `GitHub API rate limit exceeded. Please wait ${waitMinutes} minutes or add a GitHub token. ` +
              `Unauthenticated: 60 req/hour. Authenticated: 5,000 req/hour.`
            );
          }
        }

        // Other 403 errors (permissions, etc.)
        if (response.status === 403) {
          const message = await response.text();
          throw new Error(`GitHub API forbidden (403): ${message}`);
        }
      }

      return response;
    } catch (error) {
      if (i === retries - 1) {
        throw error;
      }
      await sleep(1000 * Math.pow(2, i)); // Exponential backoff
    }
  }
}

/**
 * Update rate limit tracking from response headers
 */
function updateRateLimitInfo(response) {
  const remaining = response.headers.get('X-RateLimit-Remaining');
  const limit = response.headers.get('X-RateLimit-Limit');
  const reset = response.headers.get('X-RateLimit-Reset');

  if (remaining !== null) {
    rateLimitInfo = {
      remaining: parseInt(remaining),
      limit: parseInt(limit),
      reset: parseInt(reset) * 1000, // Convert to milliseconds
      lastChecked: Date.now()
    };

    // Log warning if getting low on requests
    if (rateLimitInfo.remaining < 10) {
      const resetDate = new Date(rateLimitInfo.reset);
      console.warn(
        `⚠️ GitHub API rate limit low: ${rateLimitInfo.remaining}/${rateLimitInfo.limit} remaining. ` +
        `Resets at ${resetDate.toLocaleTimeString()}`
      );
    }
  }
}

/**
 * Get current rate limit status
 */
async function getRateLimitStatus() {
  try {
    const { githubToken } = await chrome.storage.sync.get('githubToken');
    const url = `${CONFIG.GITHUB_API_BASE}/rate_limit`;

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        ...(githubToken ? { 'Authorization': `token ${githubToken}` } : {})
      }
    });

    if (response.ok) {
      const data = await response.json();
      return data.rate;
    }
  } catch (error) {
    console.error('Error fetching rate limit status:', error);
  }

  return rateLimitInfo;
}

/**
 * Utility: Sleep for specified milliseconds
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Utility: Chunk array into smaller arrays
 */
function chunkArray(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Installation listener
 */
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    console.log('Skill Scalper installed');

    // Set default settings
    await chrome.storage.local.set({
      settings: {
        autoScan: false,
        cacheEnabled: true,
        concurrentDownloads: 3
      }
    });
  } else if (details.reason === 'update') {
    console.log('Skill Scalper updated to version', chrome.runtime.getManifest().version);
  }
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && tab.url.startsWith('https://github.com/')) {
    const url = new URL(tab.url);
    const pathParts = url.pathname.split('/').filter(Boolean);

    if (pathParts.length >= 2) {
      const owner = pathParts[0];
      const repo = pathParts[1];
      const branch = 'main'; // Or detect from page content later if needed
      const fullName = `${owner}/${repo}`;

      const cacheKey = `skills_${fullName}`;
      const cachedData = await chrome.storage.local.get(cacheKey);

      if (cachedData[cacheKey]) {
        const skills = cachedData[cacheKey].skills;
        // Skills are already in cache, notify content script
        chrome.tabs.sendMessage(tabId, {
          action: 'skillsDiscovered',
          data: skills
        });
        if (skills.length > 0) {
          chrome.storage.local.set({ [`skills_present_${tabId}`]: true });
        } else {
          chrome.storage.local.remove(`skills_present_${tabId}`);
        }
      } else {
        // Not in cache, so scan the repository
        const result = await handleScanRepository({ owner, repo, branch, fullName });
        if (result.success) {
          chrome.tabs.sendMessage(tabId, {
            action: 'skillsDiscovered',
            data: result.skills
          });
          if (result.skills.length > 0) {
            chrome.storage.local.set({ [`skills_present_${tabId}`]: true });
          } else {
            chrome.storage.local.remove(`skills_present_${tabId}`);
          }
        }
      }
    }
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  chrome.storage.local.remove(`skills_present_${tabId}`);
});

console.log('Skill Scalper background service worker loaded');
