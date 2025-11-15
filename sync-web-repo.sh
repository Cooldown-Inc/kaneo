#!/usr/bin/env bash
set -e

echo "Syncing apps/web → kaneo-web..."

git checkout main
git pull origin main

git branch -D web-only-branch 2>/dev/null || true
git subtree split --prefix=apps/web -b web-only-branch

git push kaneo-web web-only-branch:main --force

echo "Done!"