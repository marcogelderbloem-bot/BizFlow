#!/bin/sh
set -e

branch="chore/ci-readme-docker"

# Safety checks
if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "ERROR: This is not a git repository. Run this from the repo root." >&2
  exit 1
fi

if [ -n "$(git status --porcelain)" ]; then
  echo "ERROR: You have uncommitted changes. Commit or stash them before running this script." >&2
  git status --porcelain
  exit 1
fi

if git rev-parse --verify "$branch" >/dev/null 2>&1 || git ls-remote --exit-code --heads origin "$branch" >/dev/null 2>&1; then
  echo "ERROR: Branch $branch already exists locally or remotely. Please remove or pick another branch name." >&2
  exit 1
fi

echo "Creating branch $branch..."
git checkout -b "$branch"

echo "Adding README.md..."
cat > README.md <<'EOF'
# BizFlow — Frontend

Vite + React + TypeScript frontend for BizFlow (quotations, invoices, payments).

Quickstart (local)
1. Clone
   git clone https://github.com/marcogelderbloem-bot/BizFlow.git
   cd BizFlow
2. Install
   npm ci
3. Dev (hot reload)
   npm run dev
4. Build
   npm run build
   # output: ./dist
5. Preview built site
   npm run preview

Environment
- Copy `.env.example` -> `.env`
- Required:
  - VITE_SUPABASE_URL
  - VITE_SUPABASE_ANON_KEY

Bolt.new deployment
- Build command: `npm ci && npm run build`
- Publish directory: `dist`
- Deploy branch: `main`
- Add environment variables in Bolt.new dashboard (do not commit secrets).

Development notes
- This project uses Vite, TypeScript and Tailwind. Frontend state/auth uses Supabase (client).
EOF

echo "Adding .env.example..."
cat > .env.example <<'EOF'
VITE_SUPABASE_URL=https://your-supabase-url.supabase.co
VITE_SUPABASE_ANON_KEY=public-anon-key
# Add other VITE_ variables used by the app
EOF

echo "Adding .gitignore..."
cat > .gitignore <<'EOF'
node_modules/
dist/
.env
.env.local
.DS_Store
.vscode/
EOF

echo "Adding LICENSE (MIT)..."
cat > LICENSE <<'EOF'
MIT License

Copyright (c) 2026 marcogelderbloem-bot

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
EOF

echo "Adding CI workflow..."
mkdir -p .github/workflows
cat > .github/workflows/ci.yml <<'EOF'
name: CI — lint, typecheck, build

on:
  pull_request:
    branches: [ main ]
  push:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Use Node 20
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Typecheck
        run: npm run typecheck

      - name: Build
        run: npm run build

      - name: Upload dist (artifact)
        uses: actions/upload-artifact@v4
        with:
          name: dist
          path: dist
EOF

echo "Adding Dependabot config..."
cat > .github/dependabot.yml <<'EOF'
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
EOF

echo "Adding PR template and CODEOWNERS..."
cat > .github/PULL_REQUEST_TEMPLATE.md <<'EOF'
## Summary

Describe your changes and why they are needed.

## Checklist
- [ ] Lint passed
- [ ] Typecheck passed
- [ ] Build succeeds
- [ ] Docs updated (if applicable)
EOF

cat > .github/CODEOWNERS <<'EOF'
/src/ @marcogelderbloem-bot
EOF

echo "Adding Dockerfile..."
cat > Dockerfile <<'EOF'
# build stage
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# runtime stage
FROM nginx:stable-alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
EOF

echo "Staging files..."
git add README.md .env.example .gitignore LICENSE .github Dockerfile

echo "Committing..."
git commit -m "chore: add README, CI, Dockerfile, dependabot, templates"

echo "Pushing branch to origin..."
git push -u origin "$branch"

echo "Done. Branch pushed: $branch"
echo "Open a PR from $branch -> main and use the provided PR title/body."
