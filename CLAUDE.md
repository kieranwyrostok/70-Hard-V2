# Seventy Hard — notes for Claude Code

Installable PWA (iPhone home screen) for a 70-day habit challenge, hosted on Netlify. Owner: Kieran, a student
learning to edit this himself — explain changes plainly and keep them small and safe.

## Build / run
- `npm run build` → compiles `src/` into `public/` (gitignored). Netlify runs the same build on deploy.
- `npm run dev` → build + serve http://localhost:8888 + rebuild on save. `/api/*` returns a stub locally.
- No test runner; verify by building and loading the page (check the browser console for errors).
- Two apps: `main` = live app (merging costs production-deploy credits). `dev` = Netlify branch deploy at
  dev--<site>.netlify.app, installed as "70 Hard Dev": free, auto-updates on push, DEV badge.
  Push changes to `dev`; publish by merging dev → main.
- Light/dark: build.mjs writes index.html (dark) and light.html + screens-light.js (every dark colour swapped via
  tools/light-theme.mjs). A script at the top of the page reads localStorage `sh.theme` (dark|light|system, set in
  Habits & reminders → Appearance) and switches page. Same origin, so both share the saved data. The dev app
  defaults to light, the live app to dark. New colours in src/ need a light partner in tools/light-theme.mjs.
- Screens are `position:fixed` to all four edges; both pages use the black-translucent status bar (the light page
  adds a dark strip behind the clock). Tested on Kieran's iPhone: 100dvh is already the full screen there, so don't
  add the status-bar height back (it pushes the tab bar off-screen). `--vgap` is kept at 0 as a hook.
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
- Board → tap a day: `DayDetail` (coach.jsx, own React root, `window.SHDay.open(n)`) shows rules, food, water,
  training, weight, note and photo for that day. History tab has `WorkoutCalendar`; finished workouts are editable
  (and missed days can be back-logged) for `EDIT_DAYS` = 14 days after the date. Back-logged workouts don't change rules.
- 🏆 on the History tab → `AllTime` (totals, milestones, per-exercise records, recent PRs, links to weekly reports).
- Weekly report (coach.jsx `WeeklyReport`/`weekStats`, opened via `window.SHReport.open(sundayIso)`): covers Sun–Sat
  that just ended; Today shows a card on Sundays (`reportHidden` = dismissed week); push schedule has a fixed
  `weekly` entry (Sun 9:00) and shared.mjs opens `./?report=1#s02`.
- PRs: `celebrate(title, lines)` (ui.jsx, confetti + banner) fires when a checked set beats history + today's sets
  (set gets `pr: true`) and again on finish. Gestures (ui.jsx): `SwipeRow` (swipe left for actions, long swipe runs
  the first), `swipeNav(onLeft,onRight)`, Sheet edge-swipe = back, ActionSheet swipe-down = close.
- Today (s02): Schedule = rules with a reminder time today, as a timeline (DUE/NEXT/✓ time badges; `td_*` vars in
  renderVals feed `schedItems`), "Anytime today" = rules whose reminder is off, "Today's targets" = water pail +
  calories + protein + training card. The pail is React (`PailWidget` via x-import, `Pail` in ui.jsx) because the
  template can't bind values inside that SVG. Keep the s02 wrapper depth: overflow div must close before the tab bar.
- Voice food logging: fuel.jsx `VoiceCapture` (Web Speech API, typing fallback) → /api/food-photo with `{ text }`.
- History "Exercise trends": `ExerciseTrends` — search any exercise, else body-part chips with top 5 (most-trained,
  topped up from `CORE_LIFTS`).
- Lift data check (train.jsx `findOddSets`/`DataFix`): per exercise, each session's typical working set vs the median of
  up to 6 sessions either side; suggests ×0.4536 / ×2.2046 (lb↔kg), ÷10 (decimal), km↔mi/m fixes only when the result
  lands back in range; single odd sets checked against the rest of their session. Applies only after review; `dataFixUndo`
  keeps the originals; `recomputeWorkouts` rebuilds volume + PRs. Banner on History when anything is found.
- Strong import (train.jsx, `StrongImport`): reads Strong's CSV export (columns found by name; kg/lb and m/km/mi in
  headers or per row; rest-timer rows skipped), matches exercise names to the list, adds unknown ones to `exLib`,
  skips workouts already present (same name within 90 s), computes volume + PRs in date order. Ids `strong-<start>`.

**netlify/functions/** — Netlify Functions v2 (ESM, `export const config = { path: '/api/...' }`).
food-search (Health Canada CNF via netlify/lib/cnf.mjs + Open Food Facts products sold in Canada + USDA, merged
Canadian-first), food-barcode (Open Food Facts, then USDA), coach + food-photo (Anthropic Messages API with tools;
model via ANTHROPIC_MODEL, default claude-haiku-4-5-20251001), push-* (web-push + Netlify Blobs, cron every 5 min).
tips (daily AI suggestions: coach.jsx `tipsMaybe` sends a ~1.8 KB 7-day summary once per day, forced `give_tips` tool,
max 500 tokens out; state `aiTips`, toggle `aiTipsOn`; card on Today, setting in Habits & reminders).
Env vars live in Netlify only: ANTHROPIC_API_KEY, USDA_API_KEY, COACH_CODE, ANTHROPIC_MODEL.

## Rules
- Never break saved data: don't rename the storage key or existing state fields; migrate in `loadState()`.
- Keep it working offline (the service worker caches everything in public/; build.mjs regenerates it).
- Phone-first: 390px wide, safe-area insets, tap targets ≥ 40px, inputs 16px (stops iOS zoom).
- Don't commit secrets or `public/`.
