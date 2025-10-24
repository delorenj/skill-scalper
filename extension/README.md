# Skill Scalper - Chrome Extension

A Chrome extension for discovering and installing Claude skills from GitHub repositories.

## Features

- 🔍 **Automatic Skill Discovery**: Recursively scans GitHub repositories for SKILL.md files
- 📦 **Easy Installation**: Downloads skills as ZIP files for manual installation
- 🎨 **Clean UI**: Modern, responsive interface with real-time status updates
- 🚀 **Performance**: Concurrent requests and caching for fast scanning
- 🔖 **Visual Badges**: Highlights SKILL.md files directly on GitHub pages
- ✅ **Batch Operations**: Select and install multiple skills at once

## Installation

### From Source

1. Clone this repository:
   ```bash
   git clone https://github.com/delorenj/skill-scalper.git
   cd skill-scalper/extension
   ```

2. Open Chrome and navigate to `chrome://extensions/`

3. Enable "Developer mode" (toggle in top-right corner)

4. Click "Load unpacked" and select the `extension` directory

5. The Skill Scalper extension should now appear in your extensions list

### Creating Icons

Before loading the extension, you need to create icon files. You can use any image editor or online tool:

1. Create icons in the following sizes:
   - 16x16 px
   - 32x32 px
   - 48x48 px
   - 128x128 px

2. Save them in `extension/icons/` as:
   - `icon16.png`
   - `icon32.png`
   - `icon48.png`
   - `icon128.png`

3. Recommended: Use a book/library icon to represent "skills"

## Usage

### Scanning for Skills

1. Navigate to any GitHub repository in Chrome

2. Click the Skill Scalper extension icon in your toolbar

3. Click the "Scan for Skills" button

4. The extension will recursively search the repository for SKILL.md files

5. Discovered skills will be displayed with their names, paths, and descriptions

### Installing Skills

1. After scanning, skills are automatically pre-selected (check the boxes to customize)

2. Click "Install Selected Skills"

3. Skills will be downloaded as ZIP files to your Downloads folder

4. Follow the installation instructions:
   - Extract each ZIP file
   - Move the extracted folder to `~/.claude/skills/`
   - Restart Claude to load the new skills

### GitHub Page Integration

When viewing GitHub pages, the extension:

- Adds visual badges next to SKILL.md files in file listings
- Shows an "Install Skill" button when viewing a SKILL.md file
- Provides quick access to skill installation without opening the popup

## Architecture

### Files Overview

- **manifest.json**: Extension configuration and permissions
- **popup.html**: Extension popup UI structure
- **popup.js**: Popup UI logic and state management
- **background.js**: Service worker for GitHub API integration and downloads
- **content.js**: Content script for GitHub page integration
- **styles.css**: Modern, responsive CSS styling

### Key Features

#### GitHub API Integration
- Uses GitHub Contents API to traverse repository structure
- Implements retry logic with exponential backoff
- Handles rate limiting gracefully
- Supports both public and private repositories (with authentication)

#### Skill Discovery
- Recursive directory scanning with depth limiting
- Concurrent file fetching for performance
- Metadata extraction from SKILL.md files
- Caching of scan results (5-minute TTL)

#### Download System
- Downloads entire skill directories as ZIP archives
- Preserves directory structure
- Automatic filename sanitization
- Downloads organized in `claude-skills/` subfolder

#### Error Handling
- Comprehensive error messages for users
- Retry logic for network failures
- Graceful degradation for API limits
- Console logging for debugging

## Permissions

The extension requires the following permissions:

- **activeTab**: To detect current GitHub repository
- **downloads**: To download skill ZIP files
- **storage**: To cache scan results and settings
- **scripting**: To inject content scripts on GitHub pages
- **host_permissions**: Access to github.com, api.github.com, and raw.githubusercontent.com

## Development

### Prerequisites

- Chrome/Chromium browser
- Basic understanding of Chrome Extension APIs
- Node.js (optional, for potential build scripts)

### Project Structure

```
extension/
├── manifest.json          # Extension manifest
├── popup.html            # Popup UI
├── popup.js              # Popup logic
├── background.js         # Service worker
├── content.js            # Content script
├── styles.css            # Styles
├── icons/                # Extension icons
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
└── README.md            # This file
```

### Adding Features

1. **Popup Features**: Edit `popup.js` and `popup.html`
2. **GitHub Integration**: Edit `content.js`
3. **API/Download Logic**: Edit `background.js`
4. **Styling**: Edit `styles.css`

### Debugging

- **Popup**: Right-click extension icon → Inspect popup
- **Background**: Go to `chrome://extensions/` → Details → Inspect service worker
- **Content Script**: Open DevTools on GitHub page, check Console

## Configuration

### Settings (Future Feature)

The extension currently uses sensible defaults, but you can modify these in `background.js`:

```javascript
const CONFIG = {
  GITHUB_API_BASE: 'https://api.github.com',
  RAW_CONTENT_BASE: 'https://raw.githubusercontent.com',
  SKILL_FILENAME: 'SKILL.md',
  MAX_DEPTH: 10,               // Maximum recursion depth
  CACHE_DURATION: 5 * 60 * 1000, // 5 minutes
  CONCURRENT_REQUESTS: 5        // Parallel requests
};
```

## Limitations

1. **GitHub Rate Limiting**: Unauthenticated requests limited to 60/hour
   - Future: Add GitHub authentication for 5,000/hour

2. **ZIP Creation**: Uses simplified archive format
   - Future: Integrate proper ZIP library (e.g., fflate)

3. **Manual Installation**: Cannot write directly to `~/.claude/skills/`
   - Chrome security restriction

4. **Private Repositories**: Requires GitHub authentication
   - Future: Add OAuth integration

## Roadmap

- [ ] GitHub authentication (OAuth)
- [ ] Proper ZIP file creation with compression
- [ ] Skill update detection
- [ ] Skill rating and reviews
- [ ] Direct Claude integration (if API available)
- [ ] Skill marketplace integration
- [ ] One-click installation automation
- [ ] Skill dependency management
- [ ] Version control for installed skills
- [ ] Settings page with customization options

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - See LICENSE file for details

## Support

For issues, questions, or suggestions:
- GitHub Issues: https://github.com/delorenj/skill-scalper/issues
- Email: support@skillscalper.com (future)

## Acknowledgments

- Built for the Claude AI community
- Inspired by package managers like npm, cargo, and pip
- Uses GitHub's excellent API for repository access

---

**Note**: This extension is not officially affiliated with Anthropic or Claude AI.
