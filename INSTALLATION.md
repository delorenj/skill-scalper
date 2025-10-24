# Skill Scalper - Installation Guide

Complete installation guide for the Skill Scalper Chrome extension.

## Quick Start

1. **Generate Icons** (required before loading extension)
2. **Load Extension in Chrome**
3. **Start Discovering Skills**

## Detailed Installation Steps

### Step 1: Generate Icons

Before you can load the extension, you need to create the required icon files.

#### Method A: Using the Icon Generator (Recommended)

1. Open `extension/generate-icons.html` in your web browser
2. Click the "Download All Icons" button
3. Create the icons folder (if it doesn't exist):
   ```bash
   mkdir -p extension/icons
   ```
4. Move all downloaded PNG files into `extension/icons/`

#### Method B: Create Custom Icons

Create PNG files in the following sizes and save them in `extension/icons/`:
- `icon16.png` (16x16 pixels)
- `icon32.png` (32x32 pixels)
- `icon48.png` (48x48 pixels)
- `icon128.png` (128x128 pixels)

### Step 2: Load Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`

2. Enable "Developer mode" using the toggle in the top-right corner

3. Click "Load unpacked"

4. Navigate to and select the `extension` directory from this repository

5. The Skill Scalper extension should now appear in your extensions list

6. (Optional) Pin the extension to your toolbar by clicking the puzzle piece icon and pinning Skill Scalper

### Step 3: Verify Installation

1. Click the Skill Scalper icon in your toolbar
2. Navigate to any GitHub repository
3. The extension popup should display the repository name
4. Click "Scan for Skills" to test functionality

## Troubleshooting

### Icons Not Found Error

**Problem**: Extension fails to load with "Could not load icon" error

**Solution**:
1. Verify all 4 icon files exist in `extension/icons/`
2. Check that files are named exactly: `icon16.png`, `icon32.png`, `icon48.png`, `icon128.png`
3. Ensure files are valid PNG format
4. Reload the extension after adding icons

### Extension Not Detecting GitHub Repository

**Problem**: Extension shows "Not on a GitHub repository"

**Solution**:
1. Make sure you're on a GitHub.com URL
2. Refresh the page and try again
3. Check that the extension has permissions for github.com

### Scan Button Disabled

**Problem**: "Scan for Skills" button is grayed out

**Solution**:
1. Navigate to a valid GitHub repository page
2. Make sure the URL contains `github.com/owner/repo`
3. Refresh the extension popup

### Skills Not Downloading

**Problem**: "Install Selected Skills" doesn't download files

**Solution**:
1. Check Chrome's download settings (Settings → Downloads)
2. Ensure downloads are allowed for the extension
3. Check Chrome's console for error messages
4. Verify you have write permissions to Downloads folder

### GitHub Rate Limiting

**Problem**: Error message about GitHub API rate limits

**Solution**:
1. Wait for rate limit to reset (check error message for time)
2. For higher limits, consider adding GitHub authentication (future feature)
3. Unauthenticated requests limited to 60/hour

## Permissions Explained

The extension requests the following permissions:

- **activeTab**: Detect current GitHub repository URL
- **downloads**: Download skill ZIP files to your Downloads folder
- **storage**: Cache scan results for better performance
- **scripting**: Inject badges on GitHub pages
- **github.com**: Access GitHub repositories
- **api.github.com**: Use GitHub API for scanning
- **raw.githubusercontent.com**: Download skill file contents

All permissions are necessary for core functionality.

## Manual Installation of Skills

After downloading skills:

1. Navigate to your Downloads folder
2. Locate the downloaded skill ZIP files (in `claude-skills/` subfolder)
3. Extract each ZIP file
4. Move/copy the extracted folders to `~/.claude/skills/`
5. Restart Claude to load the new skills

### Linux/macOS
```bash
# Extract and move skill
cd ~/Downloads/claude-skills
unzip skill_name_skill.zip
mv skill_name ~/.claude/skills/

# Restart Claude
claude restart
```

### Windows
```powershell
# Extract ZIP manually or using PowerShell
Expand-Archive -Path "Downloads\claude-skills\skill_name_skill.zip" -DestinationPath "Downloads\claude-skills\skill_name"

# Move to Claude skills folder
Move-Item -Path "Downloads\claude-skills\skill_name" -Destination "$env:USERPROFILE\.claude\skills\"
```

## Uninstalling

To remove the extension:

1. Go to `chrome://extensions/`
2. Find "Skill Scalper"
3. Click "Remove"
4. Confirm removal

To clean up installed skills:

```bash
# Remove all installed skills
rm -rf ~/.claude/skills/*

# Or remove specific skills
rm -rf ~/.claude/skills/skill-name
```

## Next Steps

After successful installation:

1. Read the [README.md](extension/README.md) for usage instructions
2. Browse GitHub repositories with SKILL.md files
3. Scan and install skills to enhance your Claude experience
4. Join the community to share discovered skills

## Getting Help

If you encounter issues:

1. Check the [README.md](extension/README.md) for common solutions
2. Open DevTools and check the Console for errors
3. File an issue on GitHub with details and screenshots
4. Include your Chrome version and OS in bug reports

## Development

For development and customization:

1. See [extension/README.md](extension/README.md) for architecture
2. Edit files in `extension/` directory
3. Reload extension in Chrome after changes
4. Use Chrome DevTools to debug

---

**Version**: 1.0.0
**Last Updated**: 2025-10-22
**Minimum Chrome Version**: 88+
