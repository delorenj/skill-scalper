# CRUSH.md - Skill Scalper Development Guide

## Project Overview
Chrome Extension (Manifest V3) for discovering and installing Claude skills from GitHub repositories. Uses vanilla JavaScript with no external dependencies.

## Development Commands
```bash
./verify.sh                    # Verify all files are present and valid
open extension/generate-icons.html  # Generate required extension icons
open extension/test.html       # Run comprehensive test suite
# Load in Chrome: chrome://extensions/ → Load unpacked → extension/
```

## Code Style Guidelines

### JavaScript
- Use ES2024+ syntax (async/await, arrow functions, destructuring)
- JSDoc comments for all functions with descriptions
- Configuration objects at top of files
- Try/catch blocks with meaningful error messages
- Modular function-based architecture

### File Structure
```
extension/
├── manifest.json     # Manifest V3 configuration
├── background.js     # Service worker (GitHub API, caching)
├── popup.html/js     # Extension popup UI and state management
├── content.js        # GitHub page integration
├── styles.css        # Modern CSS with custom properties
└── icons/            # Extension icons (16, 32, 48, 128px)
```

### CSS Conventions
- CSS custom properties for theming
- BEM-style naming conventions
- Modern flexbox/grid layouts
- Mobile-first responsive design

### Key Configuration
```javascript
const CONFIG = {
  GITHUB_API_BASE: 'https://api.github.com',
  SKILL_FILENAME: 'SKILL.md',
  MAX_DEPTH: 10,
  CACHE_DURATION: 5 * 60 * 1000,
  CONCURRENT_REQUESTS: 5
};
```

### Testing & Debugging
- Use Chrome DevTools for popup, background, and content script debugging
- Test with extension/test.html for comprehensive functionality
- Verify with ./verify.sh before loading extension
- Check Chrome extension permissions and API usage

### Important Rules
- No external dependencies (vanilla JS only)
- All icons must be generated before loading extension
- Follow Manifest V3 security requirements
- Use Chrome storage API for data persistence
- Implement proper error handling for GitHub API calls