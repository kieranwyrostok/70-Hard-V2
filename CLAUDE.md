# Seventy Hard — notes for Claude Code

Installable PWA (iPhone home screen) for a 70-day habit challenge, hosted on Netlify. Owner: Kieran, a student
learning to edit this himself — explain changes plainly and keep them small and safe.

## Build / run
- `npm run build` → compiles `src/` into `public/` (gitignored). Netlify runs the same build on deploy.
- `npm run dev` → build + serve http://localhost:8888 + rebuild on save. `/api/*` returns a stub locally.
- No test runner; verify by building and loading the page (check the browser console for errors).
- Workflow: work on a branch → push → GitHub PR gives a free Netlify deploy preview; merging to main publishes
  (costs production-deploy credits, so don't suggest merging unfinished work).

## Architecture
**src/index.html** — the original Claude Design canvas turned into the app. Runs on `src/static/vendor/dc-runtime.js`.
- Screens are `<div id="s01".."s12" class="screen">`; hash routing (`#s02`) picks the visible one.
  s01 welcome+setup · s02 Today · s03 Fuel · s04 Train · s05 Board · s06 Log/debrief · s07 Stats · s08 Photos ·
  s09 Day missed · s10 Habits & reminders · s11 Body tape · s12 Coach. Each has its own copy of the tab bar.
- Markup binds with `{{ name }}` to values returned by `renderVals()` of `class Component extends DCLogic`
  inside `<script type="text/x-dc">`. Loops: `<sc-for list="{{ arr }}" as="x">`. Events:
  `sc-camel-on-click="{{ handler }}"` / `sc-camel-on-change` (handlers are functions in renderVals' return).
  Show/hide is done with style values such as `display:{{ x.show }}`.
- State: `this.state`, persisted to localStorage `seventyhard.v1` by the `setState` override (keys in `TRANSIENT`
  aren't saved). `loadState()` merges saved data over `defaultState()` — new fields need defaults there.
  `rollover()` archives each finished day into `history[dayNum]` and the food diary into `diary[date]`.
  Photos are in IndexedDB (`PhotoDB`). `exportData`/`importData` = backup file.
- `window.SH` exposes PLAN, FOODS, helpers to the React screens.
- s03/s04/s12 bodies are `<x-import component-from-global-scope="FuelScreen|TrainScreen|CoachScreen"
  from="screens.js" dc-props="{{ fuelProps|trainProps|coachProps }}">` → props `{ app, st }` where `app` is the
  Component instance (call `app.setState(...)`) and `st` is its state.

**src/screens/*.jsx** — React 18 (global `React`/`ReactDOM`, no imports). Concatenated in the order
ui → library → train → fuel → coach and compiled into one IIFE, so later files use earlier globals.
- ui.jsx: colour tokens `C`, fonts `F`, text styles `T`, Btn/Chip/Seg/Card/Sheet/ActionSheet/Field, charts
  (LineChart/BarChart/Sparkline), `DragList` + `Grip` (pointer-event drag-to-reorder), `aiPost`.
- Overlays are `Sheet`s rendered through portals with z-index layers (40–95).
- Meal sections: `st.mealSlots` [{id,name,pct}] (defaults BREAKFAST/LUNCH/DINNER/SNACK); global `SLOTS`
  refreshed via `useSlots(st)`.
- Train data: `st.workouts`, `st.templates`, `st.exLib` (custom exercises), `st.activeWorkout`.

**netlify/functions/** — Netlify Functions v2 (ESM, `export const config = { path: '/api/...' }`).
food-search (USDA), food-barcode (Open Food Facts), coach + food-photo (Anthropic Messages API with tools;
model via ANTHROPIC_MODEL, default claude-haiku-4-5-20251001), push-* (web-push + Netlify Blobs, cron every 5 min).
Env vars live in Netlify only: ANTHROPIC_API_KEY, USDA_API_KEY, COACH_CODE, ANTHROPIC_MODEL.

## Rules
- Never break saved data: don't rename the storage key or existing state fields; migrate in `loadState()`.
- Keep it working offline (the service worker caches everything in public/; build.mjs regenerates it).
- Phone-first: 390px wide, safe-area insets, tap targets ≥ 40px, inputs 16px (stops iOS zoom).
- Don't commit secrets or `public/`.
