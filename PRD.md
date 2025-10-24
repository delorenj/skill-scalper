# Skill Scalper - PRD

Skill Scalper is my idea for a chrome extension that simply allows you to easily install Claude Skills right from your browser.

## Pre-Task

First, familiarize yourself with the Chrome extension ecosystem and documentation. You will need a firm grasp to implement this.

## How to Install a Claude Skill

Installing a claude skill is as simple as downloading the root directory of the skill and placing it in the ~/.claude/skills/ directory

## Extension Requirements

- [ ] From any github page, clicking the main button will attempt a skill discovery by scanning/searching/crawling/whatever for any `SKILL.md` files and returning a list of their root skill folders
  - From `https://github.com/anthropics/skills/tree/main/skill-creator` it will download and install `skill-creator`
  - From `https://github.com/anthropics/skills` it will discover

```txt
algorithmic-art
artifacts-builder
brand-guidelines
canvas-design
document-skills
internal-comms
mcp-builder
skill-creator
slack-gif-creator
template-skill
theme-factory
webapp-testing
```

- If more than one skill is found, a dialog with a checkbox list is presented, pre-checked for all.
