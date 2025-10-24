/**
 * Skill Scalper - Popup Script
 * Handles the UI interactions and communicates with background service worker
 */

// State management
const state = {
  currentRepo: null,
  skills: [],
  selectedSkills: new Set(),
  isScanning: false,
  isInstalling: false
};

// DOM element references
const elements = {
  repoName: document.getElementById('repoName'),
  repoUrl: document.getElementById('repoUrl'),
  scanBtn: document.getElementById('scanBtn'),
  loadingSection: document.getElementById('loadingSection'),
  loadingText: document.getElementById('loadingText'),
  skillsSection: document.getElementById('skillsSection'),
  skillsList: document.getElementById('skillsList'),
  skillCount: document.getElementById('skillCount'),
  selectAllBtn: document.getElementById('selectAllBtn'),
  installBtn: document.getElementById('installBtn'),
  statusSection: document.getElementById('statusSection'),
  statusMessage: document.getElementById('statusMessage'),
  emptyState: document.getElementById('emptyState'),
  instructions: document.getElementById('instructions')
};

/**
 * Initialize the popup
 */
async function initialize() {
  try {
    // Get current tab info
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (tab?.url) {
      const repoInfo = parseGitHubUrl(tab.url);

      if (repoInfo) {
        state.currentRepo = repoInfo;
        updateRepoDisplay(repoInfo);
        elements.scanBtn.disabled = false;
      } else {
        updateRepoDisplay(null);
        elements.scanBtn.disabled = true;
      }
    }

    // Attach event listeners
    attachEventListeners();

    // Check for cached skills
    await checkCachedSkills();

    // Check if skills are present and make button glow
    if (tab?.id) {
      const key = `skills_present_${tab.id}`;
      const result = await chrome.storage.local.get(key);
      if (result[key]) {
        elements.scanBtn.classList.add('glowing');
      }
    }

  } catch (error) {
    console.error('Initialization error:', error);
    showStatus('Failed to initialize extension', 'error');
  }
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
    const branch = pathParts[2] === 'tree' ? pathParts[3] : 'main';

    return {
      owner,
      repo,
      branch,
      fullName: `${owner}/${repo}`,
      url: `https://github.com/${owner}/${repo}`
    };
  } catch (error) {
    console.error('URL parsing error:', error);
    return null;
  }
}

/**
 * Update repository display in UI
 */
function updateRepoDisplay(repoInfo) {
  if (repoInfo) {
    elements.repoName.textContent = repoInfo.fullName;
    elements.repoUrl.textContent = repoInfo.url;
  } else {
    elements.repoName.textContent = 'Not on a GitHub repository';
    elements.repoUrl.textContent = '';
  }
}

/**
 * Attach event listeners to UI elements
 */
function attachEventListeners() {
  elements.scanBtn.addEventListener('click', handleScanClick);
  elements.selectAllBtn.addEventListener('click', handleSelectAllClick);
  elements.installBtn.addEventListener('click', handleInstallClick);
}

/**
 * Handle scan button click
 */
async function handleScanClick() {
  if (!state.currentRepo || state.isScanning) {
    return;
  }

  try {
    state.isScanning = true;
    showLoading('Scanning repository for skills...');
    hideSkills();
    hideStatus();
    hideEmptyState();

    // Send message to background script to scan repository
    const response = await chrome.runtime.sendMessage({
      action: 'scanRepository',
      data: state.currentRepo
    });

    if (response.success) {
      state.skills = response.skills;

      if (state.skills.length > 0) {
        // Pre-select all skills
        state.selectedSkills = new Set(state.skills.map(skill => skill.path));
        displaySkills(state.skills);
        showStatus(`Found ${state.skills.length} skill${state.skills.length !== 1 ? 's' : ''}`, 'success');
        showInstructions();
      } else {
        showEmptyState();
      }
    } else {
      showStatus(response.error || 'Failed to scan repository', 'error');
    }

  } catch (error) {
    console.error('Scan error:', error);
    showStatus('An error occurred while scanning', 'error');
  } finally {
    state.isScanning = false;
    hideLoading();
  }
}

/**
 * Handle select all button click
 */
function handleSelectAllClick() {
  const allSelected = state.selectedSkills.size === state.skills.length;

  if (allSelected) {
    // Deselect all
    state.selectedSkills.clear();
    elements.selectAllBtn.textContent = 'Select All';
  } else {
    // Select all
    state.selectedSkills = new Set(state.skills.map(skill => skill.path));
    elements.selectAllBtn.textContent = 'Deselect All';
  }

  updateSkillCheckboxes();
}

/**
 * Handle install button click
 */
async function handleInstallClick() {
  if (state.isInstalling || state.selectedSkills.size === 0) {
    return;
  }

  try {
    state.isInstalling = true;
    elements.installBtn.disabled = true;

    const selectedSkillsArray = state.skills.filter(skill =>
      state.selectedSkills.has(skill.path)
    );

    showStatus(`Installing ${selectedSkillsArray.length} skill${selectedSkillsArray.length !== 1 ? 's' : ''}...`, 'info');

    // Send message to background script to install skills
    const response = await chrome.runtime.sendMessage({
      action: 'installSkills',
      data: {
        repo: state.currentRepo,
        skills: selectedSkillsArray
      }
    });

    if (response.success) {
      showStatus(
        `Successfully downloaded ${selectedSkillsArray.length} skill${selectedSkillsArray.length !== 1 ? 's' : ''} to your Downloads folder. Please follow the installation instructions below.`,
        'success'
      );
      showInstructions();
    } else {
      showStatus(response.error || 'Failed to install skills', 'error');
    }

  } catch (error) {
    console.error('Install error:', error);
    showStatus('An error occurred during installation', 'error');
  } finally {
    state.isInstalling = false;
    elements.installBtn.disabled = false;
  }
}

/**
 * Display skills in the UI
 */
function displaySkills(skills) {
  elements.skillsList.innerHTML = '';
  elements.skillCount.textContent = skills.length;

  skills.forEach(skill => {
    const skillElement = createSkillElement(skill);
    elements.skillsList.appendChild(skillElement);
  });

  showSkills();
  updateSelectAllButton();
}

/**
 * Create a skill list item element
 */
function createSkillElement(skill) {
  const item = document.createElement('div');
  item.className = 'skill-item selected';
  item.dataset.path = skill.path;

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.className = 'skill-checkbox';
  checkbox.checked = state.selectedSkills.has(skill.path);
  checkbox.addEventListener('change', (e) => handleSkillToggle(skill.path, e.target.checked));

  const info = document.createElement('div');
  info.className = 'skill-info';

  const name = document.createElement('div');
  name.className = 'skill-name';
  name.textContent = skill.name;

  const path = document.createElement('div');
  path.className = 'skill-path';
  path.textContent = skill.path;

  info.appendChild(name);
  info.appendChild(path);

  if (skill.description) {
    const description = document.createElement('div');
    description.className = 'skill-description';
    description.textContent = skill.description;
    info.appendChild(description);
  }

  item.appendChild(checkbox);
  item.appendChild(info);

  // Make the whole item clickable
  item.addEventListener('click', (e) => {
    if (e.target !== checkbox) {
      checkbox.checked = !checkbox.checked;
      handleSkillToggle(skill.path, checkbox.checked);
    }
  });

  return item;
}

/**
 * Handle skill selection toggle
 */
function handleSkillToggle(path, checked) {
  if (checked) {
    state.selectedSkills.add(path);
  } else {
    state.selectedSkills.delete(path);
  }

  updateSkillCheckboxes();
  updateSelectAllButton();
  updateInstallButton();
}

/**
 * Update skill checkboxes and visual state
 */
function updateSkillCheckboxes() {
  const items = elements.skillsList.querySelectorAll('.skill-item');

  items.forEach(item => {
    const path = item.dataset.path;
    const checkbox = item.querySelector('.skill-checkbox');
    const isSelected = state.selectedSkills.has(path);

    checkbox.checked = isSelected;
    item.classList.toggle('selected', isSelected);
  });
}

/**
 * Update select all button text
 */
function updateSelectAllButton() {
  const allSelected = state.selectedSkills.size === state.skills.length;
  elements.selectAllBtn.textContent = allSelected ? 'Deselect All' : 'Select All';
}

/**
 * Update install button state
 */
function updateInstallButton() {
  elements.installBtn.disabled = state.selectedSkills.size === 0;
}

/**
 * Show loading state
 */
function showLoading(message = 'Loading...') {
  elements.loadingText.textContent = message;
  elements.loadingSection.style.display = 'flex';
  elements.scanBtn.disabled = true;
}

/**
 * Hide loading state
 */
function hideLoading() {
  elements.loadingSection.style.display = 'none';
  elements.scanBtn.disabled = false;
}

/**
 * Show skills section
 */
function showSkills() {
  elements.skillsSection.style.display = 'flex';
}

/**
 * Hide skills section
 */
function hideSkills() {
  elements.skillsSection.style.display = 'none';
}

/**
 * Show status message
 */
function showStatus(message, type = 'info') {
  elements.statusMessage.textContent = message;
  elements.statusSection.className = `status-section ${type}`;
  elements.statusSection.style.display = 'block';
}

/**
 * Hide status message
 */
function hideStatus() {
  elements.statusSection.style.display = 'none';
}

/**
 * Show empty state
 */
function showEmptyState() {
  elements.emptyState.style.display = 'flex';
}

/**
 * Hide empty state
 */
function hideEmptyState() {
  elements.emptyState.style.display = 'none';
}

/**
 * Show installation instructions
 */
function showInstructions() {
  elements.instructions.style.display = 'block';
}

/**
 * Hide installation instructions
 */
function hideInstructions() {
  elements.instructions.style.display = 'none';
}

/**
 * Check for cached skills from previous scan
 */
async function checkCachedSkills() {
  if (!state.currentRepo) {
    return;
  }

  try {
    const cacheKey = `skills_${state.currentRepo.fullName}`;
    const result = await chrome.storage.local.get(cacheKey);

    if (result[cacheKey]) {
      const cachedData = result[cacheKey];
      state.skills = cachedData.skills;

      if (state.skills.length > 0) {
        state.selectedSkills = new Set(state.skills.map(skill => skill.path));
        displaySkills(state.skills);
        showStatus(`Loaded ${state.skills.length} cached skill${state.skills.length !== 1 ? 's' : ''}`, 'info');
      }
    }
  } catch (error) {
    console.error('Cache check error:', error);
  }
}

// Initialize when popup opens
document.addEventListener('DOMContentLoaded', initialize);
