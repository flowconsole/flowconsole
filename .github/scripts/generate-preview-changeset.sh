#!/usr/bin/env bash
set -euo pipefail

PACKAGE=""
PATHS=()
TAG_PATTERN=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --package)
      PACKAGE="$2"
      shift 2
      ;;
    --paths)
      shift
      while [[ $# -gt 0 && ! "$1" == --* ]]; do
        PATHS+=("$1")
        shift
      done
      ;;
    --tag-pattern)
      TAG_PATTERN="$2"
      shift 2
      ;;
    *)
      echo "Unknown option: $1" >&2
      exit 1
      ;;
  esac
done

if [[ -z "$PACKAGE" || ${#PATHS[@]} -eq 0 || -z "$TAG_PATTERN" ]]; then
  echo "Usage: $0 --package <name> --paths <glob...> --tag-pattern <pattern>" >&2
  exit 1
fi

HEAD_COMMIT=$(git rev-parse HEAD)
PREV_TAG=""
while IFS= read -r tag; do
  [[ -z "$tag" ]] && continue
  TAG_COMMIT=$(git rev-parse "$tag^{commit}" 2>/dev/null || true)
  if [[ "$TAG_COMMIT" != "$HEAD_COMMIT" ]]; then
    PREV_TAG="$tag"
    break
  fi
  echo "Skipping tag $tag (points to HEAD)"
done < <(git tag --sort=-creatordate --list "$TAG_PATTERN" 2>/dev/null || true)

if [[ -n "$PREV_TAG" ]]; then
  echo "Previous tag: $PREV_TAG"
  COMMITS=$(git log --oneline "$PREV_TAG..HEAD" -- "${PATHS[@]}" || true)
  FULL_LOG=$(git log --format="%B" "$PREV_TAG..HEAD" -- "${PATHS[@]}" || true)
else
  echo "No previous tag matching '$TAG_PATTERN' found; using last 50 commits"
  COMMITS=$(git log --oneline -50 -- "${PATHS[@]}" || true)
  FULL_LOG=$(git log --format="%B" -50 -- "${PATHS[@]}" || true)
fi

if [[ -z "$COMMITS" ]]; then
  echo "No changes found for paths: ${PATHS[*]}"
  if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
    echo "no_changes=true" >> "$GITHUB_OUTPUT"
  fi
  exit 0
fi

COMMIT_COUNT=$(echo "$COMMITS" | wc -l | tr -d ' ')
echo "Found $COMMIT_COUNT commit(s) since ${PREV_TAG:-HEAD~50}"

BUMP_TYPE="patch"
if echo "$FULL_LOG" | grep -qE 'BREAKING CHANGE:|BREAKING-CHANGE:'; then
  BUMP_TYPE="major"
fi

if [[ "$BUMP_TYPE" != "major" ]]; then
  while IFS= read -r line; do
    MSG="${line#* }"

    if echo "$MSG" | grep -qE '^[a-z]+(\(.+\))?!:'; then
      BUMP_TYPE="major"
      break
    fi

    if echo "$MSG" | grep -qE '^feat(\(.+\))?:'; then
      BUMP_TYPE="minor"
    fi
  done <<< "$COMMITS"
fi

echo "Bump type: $BUMP_TYPE"

CHANGESET_DIR=".changeset"
mkdir -p "$CHANGESET_DIR"

find "$CHANGESET_DIR" -maxdepth 1 -name '*.md' ! -name 'README.md' -delete 2>/dev/null || true

BULLETS=""
while IFS= read -r line; do
  [[ -z "$line" ]] && continue
  BULLETS+="- $line
"
done <<< "$COMMITS"

printf -- '---\n"%s": %s\n---\n\n%s\n' "$PACKAGE" "$BUMP_TYPE" "$BULLETS" > "$CHANGESET_DIR/auto-preview.md"
echo "Generated $CHANGESET_DIR/auto-preview.md"

echo "$BULLETS" > "preview-notes.md"
echo "Generated preview-notes.md"

if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
  echo "no_changes=false" >> "$GITHUB_OUTPUT"
fi
