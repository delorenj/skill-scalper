#!/bin/bash

# Skill Scalper - Verification Script
# Checks that all necessary files are present and valid

echo "🔍 Skill Scalper - Pre-Installation Verification"
echo "================================================"
echo ""

ERRORS=0
WARNINGS=0

# Function to check file exists
check_file() {
    if [ -f "$1" ]; then
        echo "✓ $1"
    else
        echo "✗ $1 - MISSING"
        ((ERRORS++))
    fi
}

# Function to check directory exists
check_dir() {
    if [ -d "$1" ]; then
        echo "✓ $1/"
    else
        echo "✗ $1/ - MISSING"
        ((ERRORS++))
    fi
}

# Function to check file has content
check_content() {
    if [ -s "$1" ]; then
        lines=$(wc -l < "$1")
        echo "✓ $1 ($lines lines)"
    else
        echo "⚠ $1 - EMPTY"
        ((WARNINGS++))
    fi
}

echo "📁 Checking Directory Structure..."
check_dir "extension"
check_dir "extension/icons"
echo ""

echo "📄 Checking Core Extension Files..."
check_file "extension/manifest.json"
check_file "extension/popup.html"
check_file "extension/popup.js"
check_file "extension/background.js"
check_file "extension/content.js"
check_file "extension/styles.css"
echo ""

echo "🎨 Checking Icon Files..."
if [ -f "extension/icons/icon16.png" ] && \
   [ -f "extension/icons/icon32.png" ] && \
   [ -f "extension/icons/icon48.png" ] && \
   [ -f "extension/icons/icon128.png" ]; then
    echo "✓ All icon files present"
else
    echo "⚠ Icons missing - run generate-icons.html to create them"
    echo "  Missing icons:"
    [ ! -f "extension/icons/icon16.png" ] && echo "    - icon16.png"
    [ ! -f "extension/icons/icon32.png" ] && echo "    - icon32.png"
    [ ! -f "extension/icons/icon48.png" ] && echo "    - icon48.png"
    [ ! -f "extension/icons/icon128.png" ] && echo "    - icon128.png"
    ((WARNINGS++))
fi
echo ""

echo "📚 Checking Documentation..."
check_file "README.md"
check_file "INSTALLATION.md"
check_file "QUICK_START.md"
check_file "extension/README.md"
echo ""

echo "🧪 Checking Tools..."
check_file "extension/generate-icons.html"
check_file "extension/test.html"
echo ""

echo "🔧 Checking Support Files..."
check_file "LICENSE"
check_file ".gitignore"
echo ""

echo "📊 File Statistics..."
echo "================================"

# Count lines in JavaScript files
js_lines=$(find extension -name "*.js" -type f -exec wc -l {} + 2>/dev/null | tail -1 | awk '{print $1}')
echo "JavaScript Lines: ~$js_lines"

# Count lines in HTML files
html_lines=$(find extension -name "*.html" -type f -exec wc -l {} + 2>/dev/null | tail -1 | awk '{print $1}')
echo "HTML Lines: ~$html_lines"

# Count lines in CSS files
css_lines=$(find extension -name "*.css" -type f -exec wc -l {} + 2>/dev/null | tail -1 | awk '{print $1}')
echo "CSS Lines: ~$css_lines"

# Count markdown files
md_count=$(find . -name "*.md" -type f | wc -l)
echo "Documentation Files: $md_count"

echo ""
echo "📋 Summary"
echo "================================"
echo "Errors: $ERRORS"
echo "Warnings: $WARNINGS"
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo "✅ All checks passed! Extension is ready to load."
    echo ""
    echo "Next steps:"
    echo "1. Generate icons: open extension/generate-icons.html"
    echo "2. Load extension in Chrome: chrome://extensions/"
    echo "3. Enable Developer mode and click 'Load unpacked'"
    echo "4. Select the 'extension' folder"
elif [ $ERRORS -eq 0 ]; then
    echo "⚠️  No errors, but $WARNINGS warning(s) found."
    echo "Most likely you need to generate icons."
    echo ""
    echo "To fix:"
    echo "1. Open extension/generate-icons.html in your browser"
    echo "2. Click 'Download All Icons'"
    echo "3. Move PNG files to extension/icons/"
else
    echo "❌ $ERRORS error(s) found. Please fix before loading extension."
fi

exit $ERRORS
