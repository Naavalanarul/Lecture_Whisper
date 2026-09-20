#!/usr/bin/env bash
#
# Pre-commit hook: Blocks media and real transcripts from being committed to public repository.
# Data and media live ONLY under `data/` (gitignored).
#
set -euo pipefail

STAGED_FILES=$(git diff --cached --name-only)

if [[ -z "$STAGED_FILES" ]]; then
    exit 0
fi

VIOLATIONS=()

# Blocked extensions: Media and real caption/transcript formats
BLOCKED_EXTS="mp4|mov|mkv|webm|avi|m4a|mp3|wav|aac|flac|ogg|opus|srt|vtt|sub|sbv"

for file in $STAGED_FILES; do
    # 1. Block anything in data/ or review/
    if [[ "$file" =~ ^(data|review)/ ]]; then
        VIOLATIONS+=("$file (data/ and review/ directories must remain gitignored)")
        continue
    fi

    # 2. Check for synthetic test fixtures allowance
    if [[ "$file" =~ ^server/tests/fixtures/synthetic_ ]] || [[ "$file" =~ ^tests/fixtures/synthetic_ ]] || [[ "$file" =~ ^samples/synthetic_ ]]; then
        continue
    fi

    # 3. Block media and transcript extensions
    if [[ "$file" =~ \.($BLOCKED_EXTS)$ ]]; then
        VIOLATIONS+=("$file (media/transcript extension detected)")
        continue
    fi

    # 4. Check for excessively large files (> 5MB) staged by mistake
    if [[ -f "$file" ]]; then
        FILESIZE=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null || echo 0)
        if (( FILESIZE > 5242880 )); then
            VIOLATIONS+=("$file (file size $((FILESIZE / 1048576))MB exceeds 5MB limit)")
            continue
        fi
    fi
done

if [ ${#VIOLATIONS[@]} -ne 0 ]; then
    echo "======================================================================"
    echo "❌ PRE-COMMIT ERROR: Staged changes contain blocked media/transcripts!"
    echo "======================================================================"
    echo "Lecture Whisper is a PUBLIC repository. Real classroom audio, lecture"
    echo "recordings, and unverified transcripts must live ONLY in data/."
    echo ""
    echo "The following staged files violated safety rules:"
    for v in "${VIOLATIONS[@]}"; do
        echo "  - $v"
    done
    echo ""
    echo "To fix: unstage these files ('git reset HEAD <file>') and move them to data/."
    echo "======================================================================"
    exit 1
fi

echo "✓ Pre-commit check passed: No media or real transcripts detected in staged changes."
exit 0
