# Seventy Hard — source

The 70-day habit app you install on your phone. This folder is the **editable source**: you change files in `src/`,
Netlify builds and publishes the app when you push to GitHub.

```
src/index.html        Today, Progress, Log, setup, habits & reminders — plus ALL app logic and saved state
src/screens/ui.jsx     shared look (colours, buttons, cards, charts, drag-to-reorder)
src/screens/library.jsx exercise list, mobility drills/routines, preset workouts
src/screens/train.jsx  Train tab (workouts, templates, history, graphs)
src/screens/fuel.jsx   Fuel tab (food diary, search/scan/photo, meals, water, goals)
src/screens/coach.jsx  Coach tab (AI chat)
src/static/            fonts, icons, React, design runtime, scanner + push helpers (rarely touched)
netlify/functions/     server code: food search, barcode, AI coach, photo estimate, push reminders
build.mjs              turns src/ into public/ (the finished app)
dev.mjs                local preview with auto-rebuild
```

## One-time setup on your Mac

1. **Install Node.js** (LTS) from https://nodejs.org — then in Terminal `node -v` should print v20 or newer.
2. **Git** comes with Apple's developer tools: run `xcode-select --install` if `git --version` doesn't work.
3. **GitHub login for Terminal** (easiest way): `brew install gh` (needs https://brew.sh) then `gh auth login`
   → GitHub.com → HTTPS → log in with a browser.
4. Get your repo and put this source in it (replace YOUR-USERNAME):
   ```bash
   cd ~/Desktop
   git clone https://github.com/YOUR-USERNAME/seventy-hard-v2.git
   cd seventy-hard-v2
   git checkout -b source-setup
   rm -rf public netlify netlify.toml package.json README.md .gitignore   # old built files
   cp -R ~/Desktop/seventy-hard-src/. .
   npm install
   npm run build          # should end with ✓ built public/
   git add -A && git commit -m "Switch to editable source; Netlify builds the app"
   git push -u origin source-setup
   ```
   On GitHub open a pull request for `source-setup` → Netlify makes a free **deploy preview**. If it works, merge it.
   From then on you never upload files by hand again.

## Everyday editing

```bash
cd ~/Desktop/seventy-hard-v2
git checkout main && git pull           # start from the latest
git checkout -b my-change               # a branch = free preview, main = live
npm run dev                             # open http://localhost:8888 — saves rebuild automatically, just refresh
```
Make your edits (VS Code: `code .`, or ask Claude Code — run `claude` in this folder; it reads CLAUDE.md).
Food search, AI coach, photo logging and push only work on Netlify, not in `npm run dev`.

When you're happy:
```bash
git add -A && git commit -m "what you changed"
git push -u origin my-change
```
Open the pull request on GitHub → check the deploy preview on your phone → **Merge** to publish (that's the only
step that uses production-deploy credits). Pushing more commits to the same branch updates the preview.

**Undo a bad change:** `git checkout -- path/to/file` (before committing) or revert the merge on GitHub.

## Things to know

- Saved data lives on the phone (browser storage key `seventyhard.v1`), not on a server. Don't rename that key or
  existing data disappears. Add new fields with sensible defaults instead of changing old ones.
- The welcome screen shows `APP VERSION <date time>` — the time of the build, so you can see which version you're on.
- Secrets (ANTHROPIC_API_KEY, USDA_API_KEY, COACH_CODE, optional ANTHROPIC_MODEL) stay in Netlify → Project
  configuration → Environment variables. Never put them in these files.
- If the build fails, it names the file and line (for `.jsx` files).
