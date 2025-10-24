/**
 * Skill Scalper - Content Script
 * Runs on GitHub pages to provide additional integration features
 */

// Configuration
const CONFIG = {
  SKILL_FILENAME: 'SKILL.md',
  BADGE_CLASS: 'skill-scalper-badge',
  INJECT_DELAY: 1000
};

// State
let isInitialized = false;
let currentUrl = window.location.href;

/**
 * Initialize content script
 */
function initialize() {
  if (isInitialized) {
    return;
  }

  console.log('Skill Scalper: Initializing content script');

  // Inject badges on SKILL.md files
  injectSkillBadges();

  // Listen for URL changes (GitHub uses pushState)
  observeUrlChanges();

  // Listen for messages from popup
  chrome.runtime.onMessage.addListener(handleMessage);

  isInitialized = true;
}

/**
 * Inject skill badges on GitHub pages
 */
function injectSkillBadges() {
  // Find SKILL.md files in file listings
  const fileLinks = document.querySelectorAll('a[href*="SKILL.md"]');

  fileLinks.forEach(link => {
    if (link.querySelector(`.${CONFIG.BADGE_CLASS}`)) {
      return; // Already has badge
    }

    const badge = createSkillBadge();

    // Insert badge next to the link
    const parent = link.parentElement;
    if (parent) {
      parent.style.position = 'relative';
      parent.appendChild(badge);
    }
  });

  // Check if we're viewing a SKILL.md file
  if (window.location.pathname.includes('SKILL.md')) {
    injectFileViewBadge();
  }
}

/**
 * Create skill badge element
 */
function createSkillBadge() {
  const badge = document.createElement('span');
  badge.className = CONFIG.BADGE_CLASS;
  badge.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
    Claude Skill
  `;

  // Style the badge
  Object.assign(badge.style, {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '2px 8px',
    fontSize: '12px',
    fontWeight: '500',
    color: '#6366f1',
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    border: '1px solid rgba(99, 102, 241, 0.3)',
    borderRadius: '12px',
    marginLeft: '8px',
    verticalAlign: 'middle'
  });

  return badge;
}

/**
 * Inject badge on SKILL.md file view
 */
function injectFileViewBadge() {
  // Find the file header
  const fileHeader = document.querySelector('.Box-header, .file-header');

  if (!fileHeader || fileHeader.querySelector(`.${CONFIG.BADGE_CLASS}`)) {
    return;
  }

  const badge = createSkillBadge();
  badge.style.marginLeft = '12px';

  const title = fileHeader.querySelector('strong, .file-info');
  if (title) {
    title.appendChild(badge);
  }

  // Add install button
  const installButton = createInstallButton();
  fileHeader.appendChild(installButton);
}

/**
 * Create install button for file view
 */
function createInstallButton() {
  const button = document.createElement('button');
  button.className = 'skill-scalper-install-btn';
  button.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M8.75 1.75a.75.75 0 00-1.5 0v6.69L5.03 6.22a.75.75 0 00-1.06 1.06l3.5 3.5a.75.75 0 001.06 0l3.5-3.5a.75.75 0 00-1.06-1.06L8.75 8.44V1.75z"/>
      <path d="M3.5 9.75a.75.75 0 00-1.5 0v1.5A2.75 2.75 0 004.75 14h6.5A2.75 2.75 0 0014 11.25v-1.5a.75.75 0 00-1.5 0v1.5c0 .69-.56 1.25-1.25 1.25h-6.5c-.69 0-1.25-.56-1.25-1.25v-1.5z"/>
    </svg>
    Install Skill
  `;

  // Style the button
  Object.assign(button.style, {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#ffffff',
    backgroundColor: '#6366f1',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    marginLeft: 'auto',
    transition: 'all 0.2s ease-in-out'
  });

  // Add hover effect
  button.addEventListener('mouseenter', () => {
    button.style.backgroundColor = '#4f46e5';
    button.style.transform = 'translateY(-1px)';
    button.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
  });

  button.addEventListener('mouseleave', () => {
    button.style.backgroundColor = '#6366f1';
    button.style.transform = 'translateY(0)';
    button.style.boxShadow = 'none';
  });

  // Handle click
  button.addEventListener('click', async () => {
    button.disabled = true;
    button.textContent = 'Installing...';

    try {
      await installCurrentSkill();
      button.textContent = 'Installed!';
      button.style.backgroundColor = '#10b981';
    } catch (error) {
      console.error('Install error:', error);
      button.textContent = 'Install Failed';
      button.style.backgroundColor = '#ef4444';
    }

    setTimeout(() => {
      button.disabled = false;
      button.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8.75 1.75a.75.75 0 00-1.5 0v6.69L5.03 6.22a.75.75 0 00-1.06 1.06l3.5 3.5a.75.75 0 001.06 0l3.5-3.5a.75.75 0 00-1.06-1.06L8.75 8.44V1.75z"/>
          <path d="M3.5 9.75a.75.75 0 00-1.5 0v1.5A2.75 2.75 0 004.75 14h6.5A2.75 2.75 0 0014 11.25v-1.5a.75.75 0 00-1.5 0v1.5c0 .69-.56 1.25-1.25 1.25h-6.5c-.69 0-1.25-.56-1.25-1.25v-1.5z"/>
        </svg>
        Install Skill
      `;
      button.style.backgroundColor = '#6366f1';
    }, 2000);
  });

  return button;
}

/**
 * Install the current skill being viewed
 */
async function installCurrentSkill() {
  const repoInfo = parseGitHubUrl(window.location.href);

  if (!repoInfo) {
    throw new Error('Not on a valid GitHub repository');
  }

  // Get the skill path from URL
  const pathMatch = window.location.pathname.match(/\/blob\/[^/]+\/(.+)\/SKILL\.md/);
  const skillPath = pathMatch ? pathMatch[1] : '';

  const skill = {
    name: skillPath.split('/').pop() || 'root-skill',
    path: skillPath,
    url: window.location.href
  };

  // Send message to background script
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({
      action: 'installSkills',
      data: {
        repo: repoInfo,
        skills: [skill]
      }
    }, (response) => {
      if (response.success) {
        resolve(response);
      } else {
        reject(new Error(response.error));
      }
    });
  });
}

/**
 * Parse GitHub URL to extract repository information
 */
function parseGitHubUrl(url) {
  try {
    const urlObj = new URL(url);

    if (!urlObj.hostname.includes('github.com')) {
      return null;
    }

    const pathParts = urlObj.pathname.split('/').filter(Boolean);

    if (pathParts.length < 2) {
      return null;
    }

    const [owner, repo] = pathParts;
    const branch = pathParts[2] === 'tree' || pathParts[2] === 'blob' ? pathParts[3] : 'main';

    return {
      owner,
      repo,
      branch,
      fullName: `${owner}/${repo}`,
      url: `https://github.com/${owner}/${repo}`
    };
  } catch (error) {
    return null;
  }
}

/**
 * Observe URL changes for single-page navigation
 */
function observeUrlChanges() {
  // GitHub uses pushState for navigation
  const observer = new MutationObserver(() => {
    if (currentUrl !== window.location.href) {
      currentUrl = window.location.href;

      // Debounce the injection
      setTimeout(() => {
        injectSkillBadges();
      }, CONFIG.INJECT_DELAY);
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // Also listen for popstate events
  window.addEventListener('popstate', () => {
    setTimeout(() => {
      injectSkillBadges();
    }, CONFIG.INJECT_DELAY);
  });
}

/**
 * Handle messages from popup or background script
 */
function handleMessage(request, sender, sendResponse) {
  const { action, data } = request;

  switch (action) {
    case 'getPageInfo':
      sendResponse({
        url: window.location.href,
        title: document.title,
        repoInfo: parseGitHubUrl(window.location.href)
      });
      break;

    case 'refreshBadges':
      injectSkillBadges();
      sendResponse({ success: true });
      break;

    default:
      sendResponse({ success: false, error: 'Unknown action' });
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}

console.log('Skill Scalper: Content script loaded');
