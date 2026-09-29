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
- Visual setup (Habits & reminders): localStorage `sh.style` = neon|glass|matte → `html[data-look]` (head script; only
  neon injects the glow CSS). Glass/matte rules live in tools/glass.mjs. `LookWidget` (ui.jsx) applies a whole setup
  (style + `sh.colors` + `sh.theme`); `ColourMixer` is the "any other colour" picker.
- Screens are `position:fixed` to all four edges; both pages use the black-translucent status bar with a coloured strip
  behind the clock / Dynamic Island (glass.mjs `body::before`, colours --sb1/--sb2 from the head script, darkened until
  white text has ≥4.5:1 contrast). Tested on Kieran's iPhone: 100dvh is already the full screen there, so don't
  add the status-bar height back (it pushes the tab bar off-screen). `--vgap` is kept at 0 as a hook.
- Today header: date row, big gradient day number (var(--n1)) with a 70-day bar (`topDayPct`, `topToGo`), rules-open pill
  (`topPillTone`), streak / best tiles.
- Tab bars (one per screen, 10 copies) have an SVG line icon above each label (`.tabicon`); the active one glows.
  Section titles get a neon dash (glass.mjs `::after`); `#aurora` also holds twinkling specks (`<b>`).
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
  Photos are in IndexedDB (`PhotoDB`): key `d<day>` = the day's cover (grid + day-1 comparison), extra photos that day
  `d<day>x<time>` (`photoExtras(n)`, `makeCover`, `deletePhoto`); tap a day on the Photos grid → `PhotoDay` folder
  (coach.jsx, `window.SHPhotos.open(n)`). Timer camera: `TimerCamera` (coach.jsx, `window.SHCamera.open(day)`, getUserMedia,
  3–15 s countdown with beeps, flip, Day 1 overlay, Keep/Retake) saves via `savePhoto(blob, day)` like `addPhoto`.
  `exportData`/`importData` = backup file.
- `window.SH` exposes PLAN, FOODS, helpers to the React screens.
- s03/s04/s12 bodies are `<x-import component-from-global-scope="FuelScreen|TrainScreen|CoachScreen"
  from="screens.js" dc-props="{{ fuelProps|trainProps|coachProps }}">` → props `{ app, st }` where `app` is the
  Component instance (call `app.setState(...)`) and `st` is its state.

**src/screens/*.jsx** — React 18 (global `React`/`ReactDOM`, no imports). Concatenated in the order
ui → library → train → injuries → peptides → fuel → coach and compiled into one IIFE, so later files use earlier globals.
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
- Tab swipe (ui.jsx `tabSwipe`, document capture listeners): sideways swipe on a main screen → next/previous tab
  (Today, Fuel, Train, Progress group, Log, Coach). Tolerates up/down wobble (decides at 12 px, sideways if |dx| > 1.1·|dy|;
  a touchmove listener stops iOS from starting a vertical scroll once it's sideways). Skips anything marked `data-hswipe` (SwipeRow, swipeNav areas, charts),
  inputs, `touch-action:none`, sideways-scrolling rows, and whenever a full-screen sheet is open.
- Data check suggestions left unticked (or 'All correct') go into `dataFixIgnored` and never come back.
- Strong import (train.jsx, `StrongImport`): reads Strong's CSV export (columns found by name; kg/lb and m/km/mi in
  headers or per row; rest-timer rows skipped), matches exercise names to the list, adds unknown ones to `exLib`,
  skips workouts already present (same name within 90 s), computes volume + PRs in date order. Ids `strong-<start>`.

**netlify/functions/** — Netlify Functions v2 (ESM, `export const config = { path: '/api/...' }`).
food-search (Health Canada CNF via netlify/lib/cnf.mjs + Open Food Facts products sold in Canada + USDA, merged
Canadian-first), food-barcode (Open Food Facts, then USDA), coach + food-photo (Anthropic Messages API with tools;
model via ANTHROPIC_MODEL, default claude-haiku-4-5-20251001), push-* (web-push + Netlify Blobs, cron every 5 min).
Hercules chats (coach.jsx): `st.coachChat` = current chat; opening Hercules after 10 min idle files it into
`st.coachChats` [{id,start,last,msgs}] (CHATS side drawer), pruned 21 days after the last message.
tips (daily AI suggestions: coach.jsx `tipsMaybe` sends a ~1.8 KB 7-day summary once per day, forced `give_tips` tool,
max 500 tokens out; state `aiTips`, toggle `aiTipsOn`; card on Today, setting in Habits & reminders).
Env vars live in Netlify only: ANTHROPIC_API_KEY, USDA_API_KEY, COACH_CODE, ANTHROPIC_MODEL.

**Today extras (ui.jsx):** `RingsWidget` (neon ropes: thicker rings on their own radii (local `GEO`), each spinning on its own
tilted axis via glass.mjs `ropeA/B/C` keyframes, 3 stacked slices for thickness, rope shading via `shade()`, moving light strands
(`ropeFlow`, masked to the lit arc); drag/flick tumbles the whole set toward/away
from you (up-down) or turns it (sideways), finishes the turn in the flick's direction; flies in from depth on opening Today),
`WeightWidget` (Today card: log today's weight → `measLog.weight[day]` + meas `cur`, sparkline, GRAPH sheet) and
`WeightStats` (Record/stats page: LineChart 2W/4W/ALL, start/now/change/7-day avg/weekly trend/lowest), both via
`weightSeries(st)` (day 1 = meas `start` if not logged; lb when `st.imperial`),
Body tape body-fat card (index.html renderVals `bf*`): US Navy tape formula (neck, waist, +hips for F; height from setup),
Deurenberg BMI formula as second opinion; lean/fat mass; `bfLog` saves it into the 'bf' measurement for today.
Body tape tiles: Bodyweight (full row), then Shoulder : Waist (`swr*`, vs day 1, goal ≈ 1.6) and Waist : Hip.
Workout weight/distance boxes use train.jsx `DecInput` (keeps typed text like "22." while editing; comma → dot).
`SleepWidget` (state `sleepLog[date] = {bed, wake, q}`, minutes after midnight; shown in DayDetail, weekly report, tips).
**Custom colours:** localStorage `sh.colors` = {core, secondary, accent}, set in Habits & reminders → App colours
(`CustomizeWidget`). `window.__SH_PALETTE()` (head script in index.html) returns a hex swap map for the current page;
a script right after `</x-dc>` swaps it in the markup before boot and ui.jsx swaps the `C` tokens. Reset = remove the key.
Named setups the user saves: localStorage `sh.colorSets` [{name, core, secondary, accent}] (swatch grid `SWATCHES`;
hexes there are written `HX('…')` so the light build leaves them alone).
**Liquid glass (tools/glass.mjs, run by build.mjs after the light swap):** surface colours inside `<x-dc>` and in
screens.js become translucent (background:/border colours, gradients, and `bg`/`border` values in the logic code);
adds `#aurora` (drifting blurred colour blobs from CSS vars --n1/--n2/--n3), frosted tab bar, card highlights, screen
and sheet entrance animations, press effect. ui.jsx sets glass `C.bg/card/line…` (C.solid = old opaque page colour,
use it for text on accent fills). Neon glows for the accent colours: head script in index.html builds `#neon` CSS.
New solid surface colours need an entry in glass.mjs SURF (dark + light).
**Timed rules** (index.html `ruleMins/ruleTap/ruleStart/rulePause/ruleAdd/ruleFinish`, `td_timer` in renderVals): a rule
whose spec/name has minutes ("10 MIN") gets a ⏱ badge; tapping opens a dropdown countdown (state `ruleTimer` {k, dur, end,
left when paused}, transient `ruleOpen`); `_tick` clears the rule when it hits 0. Training (`strength`, names with
workout/training/gym) and sleep never get one. Sound: ui.jsx `chime()` / `audioUnlock()` (window.shChime/shAudioUnlock).
**Workout suggestions** (train.jsx `suggestFor`): the grey placeholders = today's target from the last 2 sessions — all reps
hit → +`weightStep` (kg: 2.5 upper barbell, 5 legs/deadlift, 2 dumbbell; lb: 5/10), some short → same weight +1 rep,
stalled twice → −10%. Template targets win. ✓ on an empty set fills the suggestion. PREVIOUS column = last time.
**Rest circle** (`RestDial`, bottom-right of an active workout): uses `st.restUntil` (also auto-started after each set
with that exercise's rest); idle tap starts `st.restSec` (default 120, ⚙ to change).
**Injuries** (src/screens/injuries.jsx, Train → INJURY tab): `INJ_LIB` guide (21 common injuries: signs, 3 stages of
care, train-around lists, rehab exercises, red flags, `watch` words that flag exercises in a workout via `InjuryWarn`).
State `st.injuries` [{id, key, name, area, side, start, note, rehab [{id,n,dose,how}], log {date: {feel 1-10, note, done
[rehab ids]}}, healed}]. Main page = current injuries once one exists; `injCheer` writes the encouragement. The daily AI
tips get `current_injuries`.
**Peptides** (src/screens/peptides.jsx, Train → PEPTIDE tab, `PeptidesTab`): U-100 reconstitution calculator (units = dose ÷
(vial mcg ÷ water ml) × 100, `SyringeScale` graphic), weekly days (default Monday), dose log, doses left since `vialStart`.
State `st.peptides` [{id,name,syringe,vialMg,waterMl,doseMcg,days,log [{date,mcg,units}],vialStart}]; tab shows • when due.
**Hercules** = the AI assistant (tab s12, was "Coach"; internal names coach.jsx / /api/coach / COACH_CODE unchanged).
Gym-bro personality lives in netlify/functions/coach.mjs `systemPrompt` and tips.mjs `SYSTEM`; safety rules unchanged.
**Archives** (bottom of Today): `ReportArchive` (coach.jsx) lists every finished Sun–Sat week → `SHReport.open(s0)`.
**Personal injury entry**: `INJ_LIB` 'my-shoulders' (`mine: true`, `detail` cards) holds Kieran's MRI findings — no names,
dates of birth or clinic details, because public/ files are downloadable from the site.
**Fuel meals** fold up: tap the meal name to show/hide items; a section opens itself when food is added.
A meal's ••• menu → "Edit <meal> calories" types a new total (`setMealTotal`, fuel.jsx): items are scaled together
(amount, g, kcal, macros); an empty meal gets one 'Quick calories' quick-add entry.
**Lift data check (train.jsx `findOddSets`):** flags sessions/sets that look ~2.2×, ~0.45×, ~10× or ~0.1× your usual
(unit or decimal mistakes); whole-session fixes only scale sets that land in a believable range (warm-ups stay).
Fixed or dismissed ones go in `dataFixIgnored`; `dataFixUndo` holds the last fix.

## Rules
- Never break saved data: don't rename the storage key or existing state fields; migrate in `loadState()`.
- Keep it working offline (the service worker caches everything in public/; build.mjs regenerates it).
- Phone-first: 390px wide, safe-area insets, tap targets ≥ 40px, inputs 16px (stops iOS zoom).
- Don't commit secrets or `public/`.
