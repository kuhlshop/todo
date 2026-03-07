#!/bin/bash
# Daily Todo Rollover - runs at 12:00 AM UTC via cron
# This script:
# 1. Commits current state of todos/
# 2. Invokes Claude Code to create tomorrow's todo file with carried-over items
# 3. Invokes Claude Code to update the month's SUMMARY.md
#
# Cron entry (add with `crontab -e`):
#   0 0 * * * TZ=UTC /home/user/todo/scripts/daily-rollover.sh >> /home/user/todo/scripts/rollover.log 2>&1

set -e

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_DIR"

# Get today's date in UTC
export TZ="UTC"
TODAY=$(date +%Y-%m-%d)
YESTERDAY=$(date -d "yesterday" +%Y-%m-%d)
MONTH=$(date +%Y-%m)
YESTERDAY_MONTH=$(date -d "yesterday" +%Y-%m)

echo "=== Daily Rollover: $(date) ==="
echo "Yesterday: $YESTERDAY | Today: $TODAY | Month: $MONTH"

# Step 1: Git commit current state
echo "--- Step 1: Committing current todos ---"
cd "$REPO_DIR"
git add todos/
if git diff --cached --quiet; then
  echo "No changes to commit."
else
  git commit -m "Daily snapshot: $YESTERDAY"
  echo "Committed."
fi

# Step 2: Use Claude Code to carry over incomplete todos and create today's file
echo "--- Step 2: Creating today's todo file with carryover ---"

YESTERDAY_FILE="todos/${YESTERDAY_MONTH}/TODO-${YESTERDAY}.md"
TODAY_FILE="todos/${MONTH}/TODO-${TODAY}.md"

# Create month directory if needed
mkdir -p "todos/${MONTH}"

if [ -f "$YESTERDAY_FILE" ]; then
  # Use Claude Code (Opus) to create today's list from yesterday's incomplete items
  claude -p "You are managing a todo list system. Read the file at '${YESTERDAY_FILE}' and create a new file at '${TODAY_FILE}'.

The new file should:
1. Have a header: '# TODO - <full date formatted like: Monday, March 2, 2026>'
2. Carry over ALL incomplete todos (lines starting with '- [ ]') from yesterday
3. Do NOT carry over completed todos (lines starting with '- [x]')
4. Keep the same markdown checkbox format: '- [ ] task text'

If there are no incomplete todos, still create the file with just the header and an empty line.
Only write the file, no other output needed." --allowedTools Write Read
else
  echo "No yesterday file found at $YESTERDAY_FILE, creating empty today file."
  claude -p "Create a new todo file at '${TODAY_FILE}' with header '# TODO - $(date +"%A, %B %-d, %Y")' and an empty line after it. Only write the file." --allowedTools Write
fi

# Step 3: Update SUMMARY.md for the month
echo "--- Step 3: Updating SUMMARY.md ---"

SUMMARY_FILE="todos/${MONTH}/SUMMARY.md"

claude -p "You are managing a todo list system. Look at all the TODO-*.md files in the 'todos/${MONTH}/' directory. Read each one, then create or update '${SUMMARY_FILE}' with a well-organized summary.

The summary should include:
1. A header: '# Summary - $(date +"%B %Y")'
2. **Overview**: A brief paragraph about what's been going on this month
3. **Stats**: Total tasks created, completed, still pending across all days
4. **Key Items**: Notable or recurring todos worth highlighting
5. **Completion Rate**: Overall percentage

Keep it concise and useful. Write the file." --allowedTools Write Read Glob

# Step 4: Commit the new files
echo "--- Step 4: Committing new files ---"
cd "$REPO_DIR"
git add todos/
if git diff --cached --quiet; then
  echo "No new changes to commit."
else
  git commit -m "Daily rollover: $TODAY"
  echo "Committed rollover."
fi

echo "=== Rollover complete ==="
