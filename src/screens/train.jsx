// ── TRAIN: templates → live workout → history / records (works like Strong) ──
// Exercise types: wr = weight × reps, r = reps only, d = duration, dt = distance + time
const PARTS = ['All', 'Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core', 'Cardio', 'Full Body', 'Olympic', 'Other'];
const S = (n, r) => Array.from({ length: n }, () => ({ w: null, r }));
const TAG_TEMPLATES = {
  PUSH: [['bench', S(4, 6)], ['ohp', S(3, 8)], ['incline-db', S(3, 10)], ['lateral', S(3, 12)], ['pushdown', S(3, 12)]],
  PULL: [['pullup', S(4, 8)], ['row-bb', S(4, 8)], ['pulldown', S(3, 10)], ['facepull', S(3, 15)], ['curl-db', S(3, 12)]],
  LEGS: [['squat', S(4, 6)], ['rdl', S(3, 8)], ['leg-press', S(3, 10)], ['leg-curl', S(3, 12)], ['calf', S(3, 15)]],
  UPPER: [['bench', S(4, 6)], ['row-bb', S(4, 8)], ['ohp', S(3, 8)], ['pulldown', S(3, 10)], ['curl-db', S(2, 12)], ['pushdown', S(2, 12)]],
  LOWER: [['squat', S(4, 6)], ['rdl', S(3, 8)], ['split-squat', S(3, 10)], ['leg-curl', S(3, 12)], ['calf', S(3, 15)], ['hlr', S(3, 12)]],
  FULL: [['squat', S(3, 5)], ['bench', S(3, 5)], ['row-bb', S(3, 8)], ['ohp', S(2, 8)], [ 'plank', [{ t: 60 }, { t: 60 }, { t: 60 }]]],
  CARDIO: [['run', [{ d: 5, t: 1800 }]], ['mobility', [{ t: 900 }]]],
  'ZONE 2': [['bike-int', [{ t: 360 }, { t: 360 }, { t: 360 }, { t: 360 }, { t: 360 }]], ['goblet', S(3, 12)], ['calf', S(3, 15)]],
  CARRY: [['ruck', [{ d: 6, t: 4500 }]], ['farmer', [{ d: 0.04 }, { d: 0.04 }, { d: 0.04 }, { d: 0.04 }]], ['sled', [{ d: 0.02 }, { d: 0.02 }, { d: 0.02 }, { d: 0.02 }]]],
  RESET: [['walk', [{ d: 4, t: 3600 }]], ['squat-hold', [{ t: 90 }, { t: 90 }, { t: 90 }, { t: 90 }]]]
};
// map the design's Hybrid 7-day plan names onto the library
const PLAN_NAME_MAP = { 'Bench press': 'bench', 'Overhead press': 'ohp', 'Incline DB press': 'incline-db', 'Cable triceps': 'pushdown', 'Bike intervals': 'bike-int', 'Goblet squat': 'goblet',
  'Calf raise': 'calf', 'Weighted pull-up': 'pullup-w', 'Barbell row': 'row-bb', 'Face pull': 'facepull', 'EZ curl': 'curl-ez', 'Back squat': 'squat', 'Romanian deadlift': 'rdl',
  'Split squat': 'split-squat', 'Hanging leg raise': 'hlr', 'Trap bar jump': 'trap-jump', 'Push press': 'push-press', 'Chin-up': 'chinup', 'Ruck march': 'ruck', 'Farmer carry': 'farmer',
  'Sled push': 'sled', 'Easy walk': 'walk', 'Deep squat hold': 'squat-hold' };
const REST_DEFAULT = { wr: 120, r: 90, d: 60, dt: 0 };
// Mobility block for each workout day (the design's "Mobility · 30 min" card), editable per template.
function defaultMobility(day) { const P = window.SH && window.SH.PLAN; return day != null && P && P[day] && P[day].mobility ? [{ name: P[day].mobility, min: 30 }] : []; }
const mobOf = t => (t.mobility != null ? t.mobility : defaultMobility(t.day));
const mobMin = list => (list || []).reduce((a, m) => a + (m.done === false ? 0 : Number(m.min) || 0), 0);

// ── trends ──
const METRICS = {
  wr: [['e1rm', 'EST. 1RM'], ['heavy', 'HEAVIEST'], ['setvol', 'BEST SET VOL'], ['vol', 'SESSION VOL'], ['reps', 'TOTAL REPS']],
  r: [['best', 'BEST SET'], ['reps', 'TOTAL REPS']],
  d: [['longest', 'LONGEST'], ['total', 'TOTAL TIME']],
  dt: [['dist', 'LONGEST'], ['totald', 'TOTAL DIST'], ['total', 'TOTAL TIME']]
};
function seriesFor(st, exId, metric) {
  const out = [];
  for (const w of st.workouts || []) {
    const sets = w.exercises.filter(e => e.exId === exId).flatMap(e => e.sets.filter(x => x.done !== false && x.kind !== 'w'));
    if (!sets.length) continue;
    const mx = f => Math.max(0, ...sets.map(f)), sm = f => sets.reduce((a, x) => a + (f(x) || 0), 0);
    const y = metric === 'e1rm' ? mx(est1rm) : metric === 'heavy' ? mx(x => x.w || 0) : metric === 'setvol' ? mx(x => (x.w || 0) * (x.r || 0)) : metric === 'vol' ? sm(x => (x.w || 0) * (x.r || 0))
      : metric === 'reps' ? sm(x => x.r) : metric === 'best' ? mx(x => x.r || 0) : metric === 'longest' ? mx(x => x.t || 0) : metric === 'total' ? sm(x => x.t) : metric === 'dist' ? mx(x => x.d || 0) : sm(x => x.d);
    if (y > 0) out.push({ x: w.date, y });
  }
  return out;
}
function metricFmt(st, metric) {
  return ['e1rm', 'heavy', 'setvol', 'vol'].includes(metric) ? v => wDisp(st, r1(v)) + ' ' + wUnit(st) : ['longest', 'total'].includes(metric) ? v => fmtDur(v) : ['dist', 'totald'].includes(metric) ? v => r2(v) + ' km' : v => String(Math.round(v));
}
function trendText(st, pts, metric) {
  if (pts.length < 2) return '';
  const a = pts[0].y, b = pts[pts.length - 1].y, d = b - a, f = metricFmt(st, metric);
  if (Math.abs(d) < 1e-9) return '± 0 SINCE ' + shortDate(pts[0].x).toUpperCase();
  return (d > 0 ? '▲ +' : '▼ −') + f(Math.abs(d)).replace(/^−/, '') + (a ? ' (' + (d > 0 ? '+' : '−') + Math.abs(Math.round(100 * d / a)) + '%)' : '') + ' SINCE ' + shortDate(pts[0].x).toUpperCase();
}
function ExFilters({ q, setQ, part, setPart, equip, setEquip, right }) {
  return <>
    <div style={{ display: 'flex', gap: 8 }}><Field value={q} onChange={setQ} placeholder="Search exercises" style={{ flex: 1 }} />{right}</div>
    <div style={{ display: 'flex', gap: 6, overflowX: 'auto', margin: '10px -16px 0', padding: '0 16px' }}>{PARTS.map(p => <Chip key={p} on={part === p} tone={C.olive} ink={C.oliveInk} onClick={() => setPart(p)}>{p.toUpperCase()}</Chip>)}</div>
    <div style={{ display: 'flex', gap: 6, overflowX: 'auto', margin: '6px -16px 4px', padding: '0 16px' }}>{EQUIPS.map(p => <Chip key={p} on={equip === p} tone={C.text} ink={C.bg} onClick={() => setEquip(p)} style={{ padding: '7px 10px', fontSize: 10 }}>{p.toUpperCase()}</Chip>)}</div>
  </>;
}
const exMatch = (e, q, part, equip) => (part === 'All' || e.part === part) && (equip === 'Any' || e.equip === equip || (!e.equip && equip === 'Other')) && (!q || e.name.toLowerCase().includes(q.toLowerCase()));
function plates(st, total, bar) {
  const kg = !st.imperial, sizes = kg ? [25, 20, 15, 10, 5, 2.5, 1.25] : [45, 35, 25, 10, 5, 2.5];
  let side = (total - bar) / 2; const out = [];
  if (side < 0) return null;
  for (const p of sizes) { while (side >= p - 1e-9) { out.push(p); side = Math.round((side - p) * 100) / 100; } }
  return { out, left: side };
}

function allExercises(st) { return EX_LIB.concat(st.exLib || []); }
function exById(st, id) { return allExercises(st).find(e => e.id === id) || { id, name: 'Exercise', part: 'Other', type: 'wr' }; }
const kgToLb = kg => kg * 2.20462;
function wDisp(st, kg) { if (kg == null) return ''; return String(st.imperial ? r1(kgToLb(kg)) : r2(kg)); }
function wParse(st, v) { const n = num(v); if (n == null) return null; return r2(st.imperial ? n / 2.20462 : n); }
const wUnit = st => st.imperial ? 'lb' : 'kg';
function setText(st, type, s) {
  if (!s) return '';
  if (type === 'wr') return (s.w != null ? wDisp(st, s.w) + ' ' + wUnit(st) : '—') + ' × ' + (s.r != null ? s.r : '—');
  if (type === 'r') return (s.r != null ? s.r : '—') + ' reps';
  if (type === 'd') return s.t != null ? fmtDur(s.t) : '—';
  return (s.d != null ? r2(s.d) + ' km' : '—') + (s.t != null ? ' · ' + fmtDur(s.t) : '');
}
const est1rm = s => s.w && s.r ? s.w * (1 + Math.min(s.r, 12) / 30) : 0;
// what a set's empty boxes suggest: the template's own targets win, otherwise last time's numbers
function phOf(prev, target) { const o = { ...(prev || {}) }; if (target) ['w', 'r', 't', 'd'].forEach(k => { if (target[k] != null) o[k] = target[k]; }); return o; }
// Finished workouts can be edited (or added for a missed day) for this many days after the date.
const EDIT_DAYS = 14;
const daysAgo = (st, iso) => Math.round((dOf(st.curDate) - dOf(iso)) / 864e5);
const canEdit = (st, w) => daysAgo(st, w.date) <= EDIT_DAYS;
function workoutVolume(w) { let v = 0; w.exercises.forEach(e => e.sets.forEach(s => { if (s.done && s.w && s.r) v += s.w * s.r; })); return Math.round(v); }
function doneSets(w) { let n = 0; w.exercises.forEach(e => e.sets.forEach(s => { if (s.done) n++; })); return n; }

// Templates generated from the split picked in setup (and the day names in planEdit).
function buildTemplates(st) {
  const SH = window.SH, out = [];
  for (let i = 0; i < 7; i++) {
    const base = SH.PLAN[i], pe = (st.planEdit || {})[i] || {};
    const tag = pe.tag != null ? pe.tag : base.tag;
    if (!tag || tag === 'REST') continue;
    const usePlan = !(st.planEdit && st.planEdit[i] && st.planEdit[i].tag) || pe.tag === base.tag;
    let exs;
    if (usePlan) {
      exs = base.ex.map(e => ({ exId: PLAN_NAME_MAP[e.name] || 'bench', sets: e.w.map((w, j) => ({ w: null, r: ['kg', 'bw'].includes(e.u) ? e.r[j] : null, t: e.u === 'time' || e.u === 'watt' ? e.r[j] * 60 : e.u === 'hold' ? e.r[j] : null, d: e.u === 'dist' ? e.r[j] / 1000 : null })) }));
    } else {
      exs = (TAG_TEMPLATES[tag] || TAG_TEMPLATES.FULL).map(([exId, sets]) => ({ exId, sets: sets.map(x => ({ ...x })) }));
    }
    out.push({ id: 't' + i + uid(), name: pe.name || base.name, day: i, mobility: defaultMobility(i), exercises: exs.map(e => ({ ...e, rest: REST_DEFAULT[exById(st, e.exId).type] })) });
  }
  return out;
}

function lastPerformance(st, exId, skipWorkoutId) {
  const ws = (st.workouts || []);
  for (let i = ws.length - 1; i >= 0; i--) {
    const w = ws[i]; if (w.id === skipWorkoutId) continue;
    const e = w.exercises.find(x => x.exId === exId);
    if (e && e.sets.some(s => s.done)) return { date: w.date, sets: e.sets.filter(s => s.done) };
  }
  return null;
}
function records(st, exId, beforeWorkoutId) {
  const r = { e1rm: 0, heavy: 0, vol: 0, reps: 0, dist: 0, time: 0 };
  for (const w of st.workouts || []) {
    if (w.id === beforeWorkoutId) break;
    for (const e of w.exercises) if (e.exId === exId) for (const s of e.sets) if (s.done) {
      r.e1rm = Math.max(r.e1rm, est1rm(s)); r.heavy = Math.max(r.heavy, s.w || 0); r.vol = Math.max(r.vol, (s.w || 0) * (s.r || 0));
      r.reps = Math.max(r.reps, s.r || 0); r.dist = Math.max(r.dist, s.d || 0); r.time = Math.max(r.time, s.t || 0);
    }
  }
  return r;
}
function findPRs(st, w) {
  const prs = [];
  for (const e of w.exercises) {
    const before = records(st, e.exId, w.id), ex = exById(st, e.exId), best = { e1rm: 0, heavy: 0, vol: 0, reps: 0, dist: 0, time: 0 };
    for (const s of e.sets) if (s.done) { best.e1rm = Math.max(best.e1rm, est1rm(s)); best.heavy = Math.max(best.heavy, s.w || 0); best.vol = Math.max(best.vol, (s.w || 0) * (s.r || 0)); best.reps = Math.max(best.reps, s.r || 0); best.dist = Math.max(best.dist, s.d || 0); best.time = Math.max(best.time, s.t || 0); }
    const had = before.e1rm || before.heavy || before.reps || before.dist || before.time;
    if (!had) continue; // first time isn't a record
    if (ex.type === 'wr') {
      if (best.heavy > before.heavy) prs.push({ ex: ex.name, what: 'Heaviest weight', val: wDisp(st, best.heavy) + ' ' + wUnit(st) });
      if (best.e1rm > before.e1rm + 0.01) prs.push({ ex: ex.name, what: 'Est. 1RM', val: wDisp(st, r1(best.e1rm)) + ' ' + wUnit(st) });
      if (best.vol > before.vol) prs.push({ ex: ex.name, what: 'Best set volume', val: wDisp(st, best.vol) + ' ' + wUnit(st) });
    } else if (ex.type === 'r' && best.reps > before.reps) prs.push({ ex: ex.name, what: 'Most reps', val: best.reps + ' reps' });
    else if (ex.type === 'd' && best.time > before.time) prs.push({ ex: ex.name, what: 'Longest', val: fmtDur(best.time) });
    else if (ex.type === 'dt' && best.dist > before.dist) prs.push({ ex: ex.name, what: 'Longest distance', val: r2(best.dist) + ' km' });
  }
  return prs;
}

function TrainScreen({ app, st }) {
  const [tab, setTab] = useState('start');
  const [preview, setPreview] = useState(null);      // template id
  const [histOpen, setHistOpen] = useState(null);    // workout id
  const [exOpen, setExOpen] = useState(null);        // exercise id
  const [tplEdit, setTplEdit] = useState(null);      // template draft
  const [summary, setSummary] = useState(null);      // finished workout summary
  const [menu, setMenu] = useState(null);
  const [q, setQ] = useState(''); const [part, setPart] = useState('All'); const [equip, setEquip] = useState('Any');
  const [creating, setCreating] = useState(null);
  const [presets, setPresets] = useState(false);
  const [mobPick, setMobPick] = useState(false);
  const [strongImp, setStrongImp] = useState(false);
  const [allTime, setAllTime] = useState(false);
  const [dataFix, setDataFix] = useState(false);
  const oddCount = useMemo(() => tab === 'history' ? openOddSets(st).length : 0, [tab, st.workouts, st.dataFixIgnored]);
  const SH = window.SH;
  const today = st.curDate;
  const aw = st.activeWorkout;
  const [minimized, setMinimized] = useState(!!aw);
  useTick(!!aw);

  // first use (or after re-running setup): templates from the chosen split
  useEffect(() => { if (st.setup && st.setup.done && !st.templates) app.setState(s => ({ templates: buildTemplates(s) })); }, [st.setup && st.setup.done, !!st.templates]);
  const templates = st.templates || [];
  const todayIdx = SH.weekdayIdx(today);
  const todays = templates.find(t => t.day === todayIdx);

  const upd = fn => app.setState(s => ({ activeWorkout: s.activeWorkout ? fn(s.activeWorkout) : s.activeWorkout }));
  const startMobility = items => {
    if (aw) { setMinimized(false); return; }
    app.setState({ activeWorkout: { id: 'w' + uid(), name: items.title || 'Mobility', templateId: null, start: Date.now(), date: today, exercises: [], mobility: items.list.map(m => ({ ...m, done: false })) } });
    setMobPick(false); setMinimized(false);
  };
  const startWorkout = (tpl, forDate) => {
    if (aw) { setMinimized(false); return; }
    const h = new Date().getHours();
    const w = {
      id: 'w' + uid(), name: tpl ? tpl.name : (h < 11 ? 'Morning' : h < 17 ? 'Afternoon' : 'Evening') + ' workout', templateId: tpl ? tpl.id : null,
      start: Date.now(), date: today,
      mobility: tpl ? mobOf(tpl).map(m => ({ name: m.name, min: m.min, cue: m.cue, done: false })) : [],
      exercises: tpl ? tpl.exercises.map(e => ({ uid: uid(), exId: e.exId, rest: e.rest, note: e.note || '', sets: e.sets.map(s => ({ w: null, r: null, t: null, d: null, target: { w: s.w, r: s.r, t: s.t, d: s.d }, kind: s.kind || 'n', done: false })) })) : []
    };
    if (forDate) Object.assign(w, { date: forDate, start: dOf(forDate).getTime(), end: dOf(forDate).getTime() + 3600e3, editOf: w.id, name: tpl ? tpl.name : 'Workout' });
    app.setState({ activeWorkout: w }); setMinimized(false); setPreview(null);
  };
  const editHistory = (w) => {
    if (aw) { alert('Finish or cancel the workout in progress first.'); return; }
    app.setState({ activeWorkout: { ...JSON.parse(JSON.stringify(w)), editOf: w.id, exercises: w.exercises.map(e => ({ ...e, uid: uid(), sets: e.sets.map(s => ({ ...s })) })) } });
    setHistOpen(null); setMinimized(false);
  };
  const cancelWorkout = () => {
    if (!confirm(aw.editOf ? 'Discard your changes to this workout?' : 'Cancel this workout? Nothing from it will be saved.')) return;
    app.setState({ activeWorkout: null, restUntil: null }); setMinimized(false);
  };
  const finishWorkout = () => {
    const w = aw, mobDone = (w.mobility || []).filter(m => m.done).length, total = doneSets(w) + mobDone, open = w.exercises.reduce((a, e) => a + e.sets.filter(s => !s.done).length, 0);
    if (!total) { if (confirm('Nothing is checked off yet. Cancel this workout instead?')) app.setState({ activeWorkout: null, restUntil: null }); return; }
    if (open && !confirm(open + (open === 1 ? ' set isn’t' : ' sets aren’t') + ' checked off. Finish anyway? Unchecked sets are dropped.')) return;
    const end = w.editOf ? w.end : Date.now();
    const clean = { id: w.editOf || w.id, name: w.name.trim() || 'Workout', templateId: w.templateId, date: w.date, start: w.start, end,
      exercises: w.exercises.map(e => ({ exId: e.exId, name: exById(st, e.exId).name, type: exById(st, e.exId).type, rest: e.rest, note: e.note, sets: e.sets.filter(s => s.done).map(({ target, ...s }) => s) })).filter(e => e.sets.length) };
    clean.mobility = (w.mobility || []).filter(m => (m.name || '').trim()).map(m => ({ name: m.name.trim(), min: Number(m.min) || 0, done: !!m.done, cue: m.cue }));
    clean.volume = workoutVolume(clean);
    const list = (st.workouts || []).filter(x => x.id !== clean.id).concat(clean).sort((a, b) => a.start - b.start);
    clean.prs = findPRs({ ...st, workouts: list }, clean);
    const isToday = clean.date === st.curDate;
    app.setState(s => ({
      workouts: (s.workouts || []).filter(x => x.id !== clean.id).concat(clean).sort((a, b) => a.start - b.start),
      activeWorkout: null, restUntil: null,
      ...(() => {
        if (!isToday || w.editOf) return {};
        const keys = [];
        if (s.ruleDefs.some(r => r.k === 'strength' && r.on) && doneSets(clean)) keys.push('strength');
        const mob = clean.mobility || [];
        if (mob.length && mob.every(m => m.done)) s.ruleDefs.filter(r => r.on && /stretch|mobility|yoga/i.test(r.name)).forEach(r => keys.push(r.k));
        if (!keys.length) return {};
        const done = { ...s.done }, doneAt = { ...s.doneAt };
        keys.forEach(k => { done[k] = true; doneAt[k] = doneAt[k] || SH.nowHM(); });
        return { done, doneAt };
      })()
    }));
    setMinimized(false);
    if (!w.editOf) setSummary({ w: clean, fromTpl: w.templateId, changed: w });
    if (!w.editOf && clean.prs && clean.prs.length) setTimeout(() => celebrate(clean.prs.length + (clean.prs.length === 1 ? ' new PR' : ' new PRs'), clean.prs.map(p => p.ex + ' · ' + p.what.toLowerCase() + ' ' + p.val)), 350);
  };
  const updateTemplateFrom = (sum) => {
    app.setState(s => ({ templates: (s.templates || []).map(t => t.id !== sum.fromTpl ? t : { ...t, mobility: (sum.w.mobility || []).map(m => ({ name: m.name, min: m.min })), exercises: sum.w.exercises.map(e => ({ exId: e.exId, rest: e.rest, sets: e.sets.map(x => ({ w: x.w, r: x.r, t: x.t, d: x.d })) })) }) }));
    setSummary(null);
  };

  // ── pieces ──
  const tplCard = (t, highlight) => {
    const last = (st.workouts || []).slice().reverse().find(w => w.templateId === t.id);
    return <SwipeRow key={t.id} radius={14} bg={C.card} style={{ marginBottom: 8 }} actions={[
      { label: 'DELETE', run: () => { if (confirm('Delete the template “' + (t.name || 'Untitled') + '”? Past workouts stay.')) app.setState(s => ({ templates: (s.templates || []).filter(x => x.id !== t.id) })); } },
      { label: 'EDIT', tone: C.olive, ink: C.oliveInk, run: () => setTplEdit(JSON.parse(JSON.stringify(t))) }]}>
    <Card onClick={() => setPreview(t.id)} accent={highlight ? C.olive : null}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
        <div style={{ font: `700 19px/1.1 ${F.head}`, textTransform: 'uppercase', letterSpacing: '.04em' }}>{t.name || 'Untitled'}</div>
        <div style={{ ...T.label, flex: 'none' }}>{t.day != null ? SH.PLAN[t.day].abbr : ''}{last ? ' · ' + agoText(last.date, today).toUpperCase() : ''}</div>
      </div>
      <div style={{ font: `400 13px/1.45 ${F.body}`, color: C.dim, marginTop: 6 }}>{t.exercises.map(e => e.sets.length + ' × ' + exById(st, e.exId).name).join(' · ') || 'No exercises yet'}</div>
      {mobOf(t).length ? <div style={{ ...T.label, marginTop: 6, color: C.olive }}>MOBILITY · {mobOf(t).map(m => m.name + ' ' + m.min + ' MIN').join(' · ')}</div> : null}
    </Card></SwipeRow>;
  };

  let body;
  if (tab === 'start') {
    body = <div style={{ padding: '16px 22px 24px' }}>
      <div style={{ ...T.label, marginBottom: 8 }}>QUICK START</div>
      <Btn onClick={() => startWorkout(null)} tone={C.olive} ink={C.oliveInk}>{aw ? 'Resume workout · ' + fmtDur((Date.now() - aw.start) / 1000) : 'Start an empty workout'}</Btn>
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <Btn kind="ghost" tone={C.olive} onClick={() => setPresets(true)} style={{ flex: 1, fontSize: 12 }}>PRESET WORKOUTS</Btn>
        <Btn kind="ghost" tone={C.olive} onClick={() => aw ? setMinimized(false) : setMobPick(true)} style={{ flex: 1, fontSize: 12 }}>MOBILITY SESSION</Btn>
      </div>
      {todays ? <>
        <div style={{ ...T.label, margin: '22px 0 8px' }}>TODAY · {SH.PLAN[todayIdx].abbr}</div>
        {tplCard(todays, true)}
      </> : <div style={{ ...T.label, margin: '22px 0 0', color: C.faint }}>TODAY IS A REST DAY IN YOUR SPLIT</div>}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '22px 0 8px' }}>
        <span style={T.h2}>My templates</span>
        <TopLink tone={C.olive} onClick={() => setTplEdit({ id: null, name: 'New template', day: null, exercises: [] })}>+ TEMPLATE</TopLink>
      </div>
      {templates.filter(t => t !== todays).map(t => tplCard(t))}
      {!templates.length ? <Empty>NO TEMPLATES YET · TAP + TEMPLATE</Empty> : null}
    </div>;
  } else if (tab === 'history') {
    const ws = (st.workouts || []).slice().reverse();
    let lastMonth = '';
    body = <div style={{ padding: '14px 22px 24px' }}>
      <div role="button" onClick={() => setStrongImp(true)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 14px', marginBottom: 14, background: '#20252c', borderRadius: 12, cursor: 'pointer' }}>
        <span style={{ ...T.name, fontSize: 14 }}>Have workouts in Strong?</span><span style={{ ...T.mono, fontSize: 11, color: C.olive }}>IMPORT ›</span></div>
      <WorkoutCalendar st={st} onDay={(iso, list) => {
        if (list.length === 1) { setHistOpen(list[0].id); return; }
        const old = daysAgo(st, iso) > EDIT_DAYS, future = iso > st.curDate;
        setMenu({ title: niceDate(iso), actions: list.map(w => ({ label: w.name + ' · ' + fmtMin((w.end - w.start) / 1000), run: () => setHistOpen(w.id) }))
          .concat(old || future || aw ? [] : [{ label: '+ Log a workout for this day', run: () => startWorkout(null, iso) }].concat(templates.slice(0, 6).map(t => ({ label: '+ Log “' + t.name + '” for this day', run: () => startWorkout(t, iso) }))))
          .concat(!list.length && (old || future) ? [{ label: future ? 'This day is still ahead' : 'Older than ' + EDIT_DAYS + ' days — can’t add workouts', run: () => {} }] : []) });
      }} />
      {oddCount ? <div role="button" onClick={() => setDataFix(true)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '11px 14px', marginBottom: 14, background: C.card, border: '1px solid ' + C.amber, borderRadius: 12, cursor: 'pointer' }}>
        <span style={{ ...T.name, fontSize: 14 }}>🧹 {oddCount} {oddCount === 1 ? 'lift looks' : 'lifts look'} converted wrong</span><span style={{ ...T.mono, fontSize: 11, color: C.amber, flex: 'none' }}>REVIEW ›</span></div> : null}
      {ws.length ? <HistoryProgress st={st} onExercise={setExOpen} /> : null}
      {ws.length ? <div style={{ ...T.h2, margin: '22px 0 4px' }}>All workouts</div> : null}
      {!ws.length ? <Empty>FINISHED WORKOUTS SHOW UP HERE</Empty> : null}
      {ws.map(w => {
        const d = dOf(w.date), m = MON[d.getMonth()].toUpperCase() + ' ' + d.getFullYear(), head = m !== lastMonth; lastMonth = m;
        return <div key={w.id}>
          {head ? <div style={{ ...T.label, margin: '10px 0 8px' }}>{m}</div> : null}
          <SwipeRow radius={14} bg={C.card} style={{ marginBottom: 8 }} actions={[
            { label: 'DELETE', run: () => { if (confirm('Delete “' + w.name + '” (' + niceDate(w.date) + ') from your history?')) app.setState(s => ({ workouts: s.workouts.filter(x => x.id !== w.id) })); } },
            canEdit(st, w) ? { label: 'EDIT', tone: C.olive, ink: C.oliveInk, run: () => editHistory(w) } : null]}>
          <Card onClick={() => setHistOpen(w.id)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <div style={{ font: `700 18px/1.1 ${F.head}`, textTransform: 'uppercase' }}>{w.name}</div>
              {w.prs && w.prs.length ? <div style={{ ...T.mono, fontSize: 11, color: C.amber }}>🏆 {w.prs.length} PR</div> : null}
            </div>
            <div style={{ ...T.label, marginTop: 5 }}>{niceDate(w.date).toUpperCase()} · {fmtMin((w.end - w.start) / 1000)} · {w.volume ? wDisp(st, w.volume) + ' ' + wUnit(st) : doneSets(w) + ' SETS'}</div>
            <div style={{ marginTop: 9, display: 'flex', flexDirection: 'column', gap: 3 }}>
              {w.exercises.map((e, i) => { const best = e.sets.reduce((b, s) => (est1rm(s) > est1rm(b || {}) ? s : b), e.sets[0]);
                return <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, font: `400 13px/1.35 ${F.body}`, color: C.dim }}><span>{e.sets.length} × {e.name}</span><span style={{ color: C.text, flex: 'none' }}>{setText(st, e.type, best)}</span></div>; })}
            </div>
          </Card></SwipeRow>
        </div>;
      })}
    </div>;
  } else {
    const list = allExercises(st).filter(e => exMatch(e, q, part, equip)).sort((a, b) => a.name.localeCompare(b.name));
    body = <div style={{ padding: '14px 22px 24px' }}>
      <ExFilters q={q} setQ={setQ} part={part} setPart={setPart} equip={equip} setEquip={setEquip} right={<Btn kind="ghost" tone={C.olive} onClick={() => setCreating({ name: q, part: part === 'All' ? 'Other' : part, type: 'wr' })} style={{ minHeight: 44 }}>+ NEW</Btn>} />
      <div style={{ ...T.label, margin: '8px 0 0' }}>{list.length} EXERCISES</div>
      {list.map(e => { const lp = lastPerformance(st, e.id); return <div key={e.id} role="button" onClick={() => setExOpen(e.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0', borderBottom: '1px solid #272c34', cursor: 'pointer' }}>
        <div style={{ flex: 1, minWidth: 0 }}><div style={T.name}>{e.name}</div><div style={{ ...T.label, marginTop: 3 }}>{e.part}{e.equip ? ' · ' + e.equip : ''}{e.custom ? ' · MINE' : ''}</div></div>
        <div style={{ ...T.label, color: lp ? C.dim : C.faint }}>{lp ? agoText(lp.date, today).toUpperCase() : ''}</div>
      </div>; })}
    </div>;
  }

  const previewTpl = templates.find(t => t.id === preview);
  const histW = (st.workouts || []).find(w => w.id === histOpen);

  return <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: C.bg, fontFamily: F.body, color: C.text }}>
    <div style={{ flex: 1, overflow: 'auto' }}>
      <div style={{ padding: '58px 22px 14px', borderBottom: '1px solid ' + C.line }}>
        <div style={{ ...T.label, marginBottom: 4 }}>DAY {app.dayNum()} · TRAIN</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}><div style={T.h1}>Workout</div>
          {tab === 'history' ? <div role="button" aria-label="All-time stats and records" onClick={() => setAllTime(true)} style={{ width: 44, height: 44, borderRadius: 12, border: '1px solid ' + C.line2, display: 'flex', alignItems: 'center', justifyContent: 'center', font: `400 21px/1 ${F.body}`, cursor: 'pointer' }}>🏆</div> : null}</div>
        <div style={{ marginTop: 14 }}><Seg items={[['start', 'START'], ['history', 'HISTORY'], ['exercises', 'EXERCISES']]} value={tab} onChange={setTab} tone={C.olive} ink={C.oliveInk} /></div>
      </div>
      {body}
    </div>

    {aw && minimized ? ReactDOM.createPortal(
      <div role="button" onClick={() => setMinimized(false)} style={{ position: 'fixed', left: 10, right: 10, bottom: 'calc(max(4px, env(safe-area-inset-bottom, 0px) - 18px) + 45px - var(--vgap, 0px))', zIndex: 30, background: C.olive, color: C.oliveInk, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', boxShadow: '0 6px 20px rgba(0,0,0,.5)' }}>
        <div style={{ flex: 1, minWidth: 0 }}><div style={{ font: `700 16px/1.1 ${F.head}`, letterSpacing: '.08em', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{aw.editOf ? 'Editing · ' : ''}{aw.name}</div>
          <div style={{ font: `600 11px/1.2 ${F.mono}`, marginTop: 2 }}>{aw.editOf ? 'TAP TO CONTINUE EDITING' : fmtDur((Date.now() - aw.start) / 1000) + ' · ' + doneSets(aw) + ' SETS DONE'}</div></div>
        <div style={{ ...T.mono, fontSize: 12 }}>OPEN ▲</div>
      </div>, document.body) : null}

    {aw && !minimized ? <WorkoutEditor app={app} st={st} aw={aw} upd={upd} onMin={() => setMinimized(true)} onCancel={cancelWorkout} onFinish={finishWorkout} /> : null}

    {previewTpl ? <Sheet title={previewTpl.name} sub={previewTpl.day != null ? SH.PLAN[previewTpl.day].abbr + ' IN YOUR SPLIT' : 'TEMPLATE'} left={<TopLink onClick={() => setPreview(null)}>‹ BACK</TopLink>}
      right={<TopLink tone={C.olive} onClick={() => setMenu({ title: previewTpl.name, actions: [
        { label: 'Edit template', run: () => { setTplEdit(JSON.parse(JSON.stringify(previewTpl))); setPreview(null); } },
        { label: 'Duplicate', run: () => app.setState(s => ({ templates: (s.templates || []).concat({ ...JSON.parse(JSON.stringify(previewTpl)), id: 't' + uid(), name: previewTpl.name + ' (copy)', day: null }) })) },
        { label: 'Delete template', danger: true, run: () => { if (confirm('Delete “' + previewTpl.name + '”?')) { app.setState(s => ({ templates: s.templates.filter(t => t.id !== previewTpl.id) })); setPreview(null); } } }
      ] })}>•••</TopLink>}
      footer={<Btn tone={C.olive} ink={C.oliveInk} onClick={() => startWorkout(previewTpl)}>{aw ? 'Workout in progress · resume' : 'Start workout'}</Btn>}>
      <div style={{ padding: '10px 18px 20px' }}>
        {previewTpl.exercises.map((e, i) => { const ex = exById(st, e.exId), lp = lastPerformance(st, e.exId); return <div key={i} style={{ padding: '12px 0', borderBottom: '1px solid #272c34' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><span style={T.name}>{e.sets.length} × {ex.name}</span><span style={{ ...T.label }}>{ex.part}</span></div>
          <div style={{ ...T.label, marginTop: 4, color: C.dim }}>{lp ? 'LAST: ' + lp.sets.map(s => setText(st, ex.type, s)).join(' · ') : 'NOT DONE YET'}</div>
        </div>; })}
        {!previewTpl.exercises.length ? <Empty>NO EXERCISES · EDIT THE TEMPLATE TO ADD SOME</Empty> : null}
        {mobOf(previewTpl).length ? <><div style={{ ...T.label, margin: '18px 0 4px', color: C.olive }}>MOBILITY · {mobMin(mobOf(previewTpl))} MIN</div>
          {mobOf(previewTpl).map((m, i) => <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #272c34' }}><span style={T.name}>{m.name}</span><span style={T.label}>{m.min} MIN</span></div>)}</> : null}
      </div>
    </Sheet> : null}

    {histW ? <Sheet title={histW.name} sub={niceDate(histW.date).toUpperCase() + ' · ' + fmtMin((histW.end - histW.start) / 1000)} left={<TopLink onClick={() => setHistOpen(null)}>‹ BACK</TopLink>}
      right={<TopLink tone={C.olive} onClick={() => setMenu({ title: histW.name, actions: [
        canEdit(st, histW) ? { label: 'Edit workout', run: () => editHistory(histW) } : null,
        { label: 'Save as template', run: () => { app.setState(s => ({ templates: (s.templates || []).concat({ id: 't' + uid(), name: histW.name, day: null, mobility: (histW.mobility || []).map(m => ({ name: m.name, min: m.min })), exercises: histW.exercises.map(e => ({ exId: e.exId, rest: e.rest, sets: e.sets.map(x => ({ w: x.w, r: x.r, t: x.t, d: x.d })) })) }) })); alert('Saved as a template.'); } },
        { label: 'Delete workout', danger: true, run: () => { if (confirm('Delete this workout from your history?')) { app.setState(s => ({ workouts: s.workouts.filter(w => w.id !== histW.id) })); setHistOpen(null); } } }
      ] })}>•••</TopLink>}>
      <div style={{ padding: '12px 18px 24px' }}>
        {canEdit(st, histW) ? <div role="button" onClick={() => editHistory(histW)} style={{ ...T.mono, fontSize: 11, color: C.olive, marginBottom: 10, cursor: 'pointer' }}>EDITABLE FOR {EDIT_DAYS - daysAgo(st, histW.date)} MORE {EDIT_DAYS - daysAgo(st, histW.date) === 1 ? 'DAY' : 'DAYS'} · EDIT ›</div>
          : <div style={{ ...T.label, color: C.faint, marginBottom: 10 }}>LOCKED · WORKOUTS CAN BE EDITED FOR {EDIT_DAYS} DAYS</div>}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 7, marginBottom: 14 }}>
          {[['DURATION', fmtMin((histW.end - histW.start) / 1000)], ['VOLUME', histW.volume ? wDisp(st, histW.volume) + ' ' + wUnit(st) : '—'], ['PRS', String((histW.prs || []).length)]].map(([l, v]) =>
            <Card key={l} style={{ padding: '10px 11px' }}><div style={T.label}>{l}</div><div style={{ font: `700 20px/1.1 ${F.head}`, marginTop: 4 }}>{v}</div></Card>)}
        </div>
        {(histW.prs || []).map((p, i) => <div key={i} style={{ ...T.mono, fontSize: 11, color: C.amber, marginBottom: 6 }}>🏆 {p.ex.toUpperCase()} · {p.what.toUpperCase()} {p.val}</div>)}
        {(histW.mobility || []).length ? <div style={{ padding: '4px 0 10px', borderBottom: '1px solid #272c34' }}><div style={{ ...T.label, color: C.olive }}>MOBILITY</div>
          {histW.mobility.map((m, i) => <div key={i} style={{ display: 'flex', gap: 10, marginTop: 6, ...T.mono, fontSize: 12, color: m.done ? C.text : C.faint }}><span style={{ color: m.done ? C.olive : C.faint }}>{m.done ? '✓' : '–'}</span><span style={{ flex: 1 }}>{m.name}</span><span>{m.min} MIN</span></div>)}</div> : null}
        {histW.exercises.map((e, i) => <div key={i} style={{ padding: '12px 0', borderBottom: '1px solid #272c34' }}>
          <div role="button" onClick={() => setExOpen(e.exId)} style={{ display: 'flex', justifyContent: 'space-between', cursor: 'pointer' }}><span style={T.name}>{e.name}</span><span style={{ ...T.mono, fontSize: 11, color: C.olive }}>TREND ›</span></div>
          {e.note ? <div style={{ font: `italic 400 13px/1.4 ${F.body}`, color: C.dim, marginTop: 3 }}>{e.note}</div> : null}
          {e.sets.map((s, j) => <div key={j} style={{ display: 'flex', gap: 12, marginTop: 5, ...T.mono, fontSize: 12, color: C.dim }}><span style={{ width: 18, color: s.kind === 'w' ? C.amber : s.kind === 'd' ? C.blue : s.kind === 'f' ? C.red : C.mute }}>{s.kind && s.kind !== 'n' ? s.kind.toUpperCase() : j + 1}</span><span style={{ color: C.text }}>{setText(st, e.type, s)}</span>{e.type === 'wr' && s.r ? <span>· 1RM {wDisp(st, r1(est1rm(s)))}</span> : null}</div>)}
        </div>)}
      </div>
    </Sheet> : null}

    {exOpen ? <ExerciseDetail st={st} app={app} exId={exOpen} onClose={() => setExOpen(null)} /> : null}
    {tplEdit ? <TemplateEditor app={app} st={st} draft={tplEdit} setDraft={setTplEdit} onClose={() => setTplEdit(null)} /> : null}
    {creating ? <CreateExercise app={app} draft={creating} setDraft={setCreating} onDone={() => setCreating(null)} /> : null}
    {allTime ? <AllTime st={st} onClose={() => setAllTime(false)} onExercise={setExOpen} onCheck={() => setDataFix(true)} /> : null}
    {dataFix ? <DataFix app={app} st={st} onClose={() => setDataFix(false)} /> : null}
    {strongImp ? <StrongImport app={app} st={st} onClose={() => setStrongImp(false)} /> : null}
    {presets ? <PresetBrowser st={st} app={app} onClose={() => setPresets(false)} onStart={t => { setPresets(false); startWorkout(t); }} /> : null}
    {mobPick ? <MobilityPicker title="Mobility session" routinesOnly onClose={() => setMobPick(false)} onAdd={(list, title) => startMobility({ list, title })} /> : null}
    {summary ? <Sheet title="Workout complete" sub={summary.w.name} left={<span />} footer={<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {summary.fromTpl ? <Btn kind="ghost" tone={C.olive} onClick={() => updateTemplateFrom(summary)}>UPDATE TEMPLATE WITH TODAY’S SETS</Btn> : null}
      <Btn tone={C.olive} ink={C.oliveInk} onClick={() => setSummary(null)}>Done</Btn></div>}>
      <div style={{ padding: '22px 18px' }}>
        <div style={{ font: `800 52px/0.9 ${F.head}`, textTransform: 'uppercase', color: C.olive }}>Logged.</div>
        <div style={{ ...T.body, color: C.dim, marginTop: 10 }}>{niceDate(summary.w.date)} · {fmtMin((summary.w.end - summary.w.start) / 1000)} · {doneSets(summary.w)} sets{(summary.w.mobility || []).some(m => m.done) ? ' · ' + mobMin((summary.w.mobility || []).filter(m => m.done)) + ' min mobility' : ''}{summary.w.volume ? ' · ' + wDisp(st, summary.w.volume) + ' ' + wUnit(st) + ' lifted' : ''}. The workout rule is cleared for today.</div>
        <div style={{ ...T.label, margin: '22px 0 8px' }}>PERSONAL RECORDS</div>
        {(summary.w.prs || []).length ? summary.w.prs.map((p, i) => <Card key={i} accent={C.amber} style={{ marginBottom: 7 }}><div style={T.name}>🏆 {p.ex}</div><div style={{ ...T.label, marginTop: 4, color: C.amber }}>{p.what} · {p.val}</div></Card>) : <div style={{ ...T.body, color: C.faint }}>No new records this time.</div>}
      </div>
    </Sheet> : null}
    {menu ? <ActionSheet title={menu.title} actions={menu.actions} onClose={() => setMenu(null)} /> : null}
  </div>;
}

// ── live workout (also used to edit a finished one) ──
function WorkoutEditor({ app, st, aw, upd, onMin, onCancel, onFinish }) {
  const [menu, setMenu] = useState(null);
  const [picker, setPicker] = useState(null); // { mode: 'add' | 'replace', uid }
  const [noteFor, setNoteFor] = useState(null);
  const [plateFor, setPlateFor] = useState(null);
  const [reorder, setReorder] = useState(false);
  // keep the screen on while training (iOS 16.4+ / Android Chrome)
  useEffect(() => {
    if (aw.editOf || !('wakeLock' in navigator)) return;
    let lock = null, alive = true;
    const get = () => navigator.wakeLock.request('screen').then(l => { if (alive) lock = l; else l.release(); }).catch(() => {});
    const vis = () => { if (!document.hidden) get(); };
    get(); document.addEventListener('visibilitychange', vis);
    return () => { alive = false; document.removeEventListener('visibilitychange', vis); if (lock) lock.release().catch(() => {}); };
  }, [aw.editOf]);
  const restUntil = st.restUntil, restLeft = restUntil ? Math.ceil((restUntil.end - Date.now()) / 1000) : 0;
  useTick(true, 500);
  useEffect(() => { if (restUntil && restLeft <= 0) { vib([200, 100, 200]); app.setState({ restUntil: null }); } }, [restLeft <= 0 && !!restUntil]);

  const updEx = (u, fn) => upd(w => ({ ...w, exercises: w.exercises.map(e => e.uid === u ? fn(e) : e) }));
  const updSet = (u, i, fn) => updEx(u, e => ({ ...e, sets: e.sets.map((s, j) => j === i ? fn(s) : s) }));
  const move = (u, d) => upd(w => { const a = w.exercises.slice(), i = a.findIndex(e => e.uid === u), j = i + d; if (j < 0 || j >= a.length) return w; [a[i], a[j]] = [a[j], a[i]]; return { ...w, exercises: a }; });

  const toggleDone = (e, i, prev) => {
    const ex = exById(st, e.exId), s = e.sets[i];
    if (s.done) { updSet(e.uid, i, x => ({ ...x, done: false })); return; }
    const ph = phOf(prev, s.target);
    const filled = { ...s, w: s.w != null ? s.w : ph.w != null ? ph.w : null, r: s.r != null ? s.r : ph.r != null ? ph.r : null, t: s.t != null ? s.t : ph.t != null ? ph.t : null, d: s.d != null ? s.d : ph.d != null ? ph.d : null };
    const ok = ex.type === 'wr' ? filled.r != null : ex.type === 'r' ? filled.r != null : ex.type === 'd' ? filled.t != null : (filled.d != null || filled.t != null);
    if (!ok) { alert('Enter ' + (ex.type === 'd' ? 'a time' : ex.type === 'dt' ? 'a distance or time' : 'the reps') + ' first.'); return; }
    // new personal record? compare with every finished workout plus the sets already done today
    const hist = records(st, e.exId, aw.editOf || '__none__'), sess = { heavy: 0, e1rm: 0, reps: 0, time: 0, dist: 0 };
    e.sets.forEach((x, j) => { if (j !== i && x.done) { sess.heavy = Math.max(sess.heavy, x.w || 0); sess.e1rm = Math.max(sess.e1rm, est1rm(x)); sess.reps = Math.max(sess.reps, x.r || 0); sess.time = Math.max(sess.time, x.t || 0); sess.dist = Math.max(sess.dist, x.d || 0); } });
    const had = hist.heavy || hist.reps || hist.time || hist.dist, lines = [];
    if (had && filled.kind !== 'w') {
      if (ex.type === 'wr') {
        if ((filled.w || 0) > Math.max(hist.heavy, sess.heavy)) lines.push(ex.name + ' · heaviest ' + wDisp(st, filled.w) + ' ' + wUnit(st));
        else if (est1rm(filled) > Math.max(hist.e1rm, sess.e1rm) + 0.01) lines.push(ex.name + ' · est. 1RM ' + wDisp(st, r1(est1rm(filled))) + ' ' + wUnit(st));
      } else if (ex.type === 'r' && (filled.r || 0) > Math.max(hist.reps, sess.reps)) lines.push(ex.name + ' · ' + filled.r + ' reps');
      else if (ex.type === 'd' && (filled.t || 0) > Math.max(hist.time, sess.time)) lines.push(ex.name + ' · ' + fmtDur(filled.t));
      else if (ex.type === 'dt' && (filled.d || 0) > Math.max(hist.dist, sess.dist)) lines.push(ex.name + ' · ' + r2(filled.d) + ' km');
    }
    updSet(e.uid, i, () => ({ ...filled, done: true, pr: lines.length ? true : undefined }));
    if (lines.length) celebrate('New PR!', lines); else vib(30);
    if (!aw.editOf && e.rest) app.setState({ restUntil: { end: Date.now() + e.rest * 1000, total: e.rest, ex: ex.name } });
  };
  const addExercises = ids => upd(w => ({ ...w, exercises: w.exercises.concat(ids.map(id => { const ex = exById(st, id), lp = lastPerformance(st, id, aw.editOf); const n = lp ? lp.sets.length : 3;
    return { uid: uid(), exId: id, rest: REST_DEFAULT[ex.type], note: '', sets: Array.from({ length: n }, () => ({ w: null, r: null, t: null, d: null, kind: 'n', done: false })) }; })) }));

  const elapsed = aw.editOf ? (aw.end - aw.start) / 1000 : (Date.now() - aw.start) / 1000;
  const cols = type => type === 'wr' ? [wUnit(st).toUpperCase(), 'REPS'] : type === 'r' ? ['REPS'] : type === 'd' ? ['TIME'] : ['KM', 'TIME'];
  const cellIn = { width: '100%', boxSizing: 'border-box', background: '#282d36', border: '1px solid transparent', color: C.text, textAlign: 'center', font: `600 16px/1 ${F.body}`, padding: '9px 2px', outline: 'none' };

  return <Sheet z={45} title={aw.editOf ? 'Edit workout' : fmtDur(elapsed)} sub={aw.editOf ? niceDate(aw.date).toUpperCase() : 'ELAPSED · ' + doneSets(aw) + ' SETS DONE'}
    left={<TopLink onClick={onMin}>▼ HIDE</TopLink>}
    right={<Btn tone={C.olive} ink={C.oliveInk} onClick={onFinish} style={{ minHeight: 36, padding: '0 14px', fontSize: 15 }}>{aw.editOf ? 'Save' : 'Finish'}</Btn>}
    footer={restUntil && restLeft > 0 ? <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ flex: 1 }}><div style={T.label}>REST · {restUntil.ex}</div><div style={{ font: `800 30px/1 ${F.head}`, color: C.olive, marginTop: 3 }}>{fmtDur(restLeft)}</div></div>
        <Btn kind="ghost" tone={C.text} onClick={() => app.setState(s => ({ restUntil: { ...s.restUntil, end: s.restUntil.end - 15000 } }))} style={{ minHeight: 42, padding: '0 12px' }}>−15</Btn>
        <Btn kind="ghost" tone={C.text} onClick={() => app.setState(s => ({ restUntil: { ...s.restUntil, end: s.restUntil.end + 15000, total: s.restUntil.total + 15 } }))} style={{ minHeight: 42, padding: '0 12px' }}>+15</Btn>
        <Btn tone={C.olive} ink={C.oliveInk} onClick={() => app.setState({ restUntil: null })} style={{ minHeight: 42, padding: '0 14px', fontSize: 14 }}>Skip</Btn>
      </div>
      <div style={{ marginTop: 8 }}><Bar pct={100 * restLeft / restUntil.total} tone={C.olive} h={4} /></div>
    </div> : null}>
    <div style={{ padding: '14px 16px 30px' }}>
      <input value={aw.name} onChange={e => { const v = e.target.value; upd(w => ({ ...w, name: v })); }} style={{ width: '100%', boxSizing: 'border-box', background: 'transparent', border: 'none', borderBottom: '1px dotted ' + C.line2, color: C.text, font: `800 28px/1.1 ${F.head}`, textTransform: 'uppercase', padding: '4px 0 6px', outline: 'none' }} />
      {aw.exercises.length > 1 ? <div style={{ ...T.label, color: C.faint, marginTop: 8 }}>{reorder ? 'DROP IT WHERE IT SHOULD GO' : 'HOLD AN EXERCISE NAME OR DRAG ≡ TO REORDER'}</div> : null}
      <DragList items={aw.exercises} keyOf={e => e.uid} onActive={setReorder} onMove={(a, b) => upd(w => { const x = w.exercises.slice(); const [m] = x.splice(a, 1); x.splice(b, 0, m); return { ...w, exercises: x }; })} render={(e, ei, dg) => {
        const ex = exById(st, e.exId), lp = lastPerformance(st, e.exId, aw.editOf), cs = cols(ex.type), gridCols = `34px 1fr ${cs.map(() => '64px').join(' ')} 44px`;
        if (reorder) return <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, background: dg.dragging ? '#2a3037' : C.card, border: '1px solid ' + (dg.dragging ? C.olive : C.line), borderRadius: 14, padding: '6px 12px 6px 4px' }}>
          <Grip h={dg.handle} color={C.olive} /><div style={{ flex: 1, minWidth: 0, font: `700 16px/1.2 ${F.body}`, color: C.olive }}>{ex.name}</div><span style={T.label}>{e.sets.length} SETS</span></div>;
        return <div style={{ marginTop: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {aw.exercises.length > 1 ? <Grip h={dg.handle} /> : null}
            <div {...dg.press} style={{ ...dg.press.style, flex: 1, minWidth: 0, font: `700 17px/1.2 ${F.body}`, color: C.olive, padding: '6px 0' }}>{ex.name}</div>
            <span role="button" onClick={() => setMenu({ title: ex.name, actions: [
              { label: e.note ? 'Edit note' : 'Add note', run: () => setNoteFor(e.uid) },
              { label: 'Rest timer · ' + (e.rest ? fmtDur(e.rest) : 'off'), run: () => setMenu({ title: 'Rest after each set', actions: [0, 60, 90, 120, 150, 180, 240].map(t => ({ label: t ? fmtDur(t) : 'Off', run: () => updEx(e.uid, x => ({ ...x, rest: t })) })) }) },
              ex.equip === 'Barbell' && ex.type === 'wr' ? { label: 'Plate calculator', run: () => setPlateFor({ w: (e.sets.slice().reverse().find(x => x.w != null) || {}).w }) } : null,
              { label: 'Replace exercise', run: () => setPicker({ mode: 'replace', uid: e.uid }) },
              ei > 0 ? { label: 'Move up', run: () => move(e.uid, -1) } : null,
              ei < aw.exercises.length - 1 ? { label: 'Move down', run: () => move(e.uid, 1) } : null,
              { label: 'Remove exercise', danger: true, run: () => upd(w => ({ ...w, exercises: w.exercises.filter(x => x.uid !== e.uid) })) }
            ] })} style={{ ...T.mono, color: C.olive, padding: '6px 4px 6px 12px', cursor: 'pointer' }}>•••</span>
          </div>
          {e.note ? <div style={{ font: `italic 400 13px/1.4 ${F.body}`, color: C.dim, marginTop: 2 }}>{e.note}</div> : null}
          <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: 6, alignItems: 'center', marginTop: 8 }}>
            <div style={{ ...T.label, textAlign: 'center' }}>SET</div><div style={T.label}>PREVIOUS</div>
            {cs.map(c => <div key={c} style={{ ...T.label, textAlign: 'center' }}>{c}</div>)}<div style={{ ...T.label, textAlign: 'center' }}>✓</div>
          </div>
            {e.sets.map((s, i) => {
              const prev = lp && lp.sets[i] ? lp.sets[i] : null, ph = phOf(prev, s.target);
              const kindCol = s.kind === 'w' ? C.amber : s.kind === 'd' ? C.blue : s.kind === 'f' ? C.red : C.text;
              const rowBg = s.done ? 'rgba(163,196,110,.18)' : 'transparent';
              const inStyle = { ...cellIn, background: s.done ? 'transparent' : '#282d36' };
              const numIdx = e.sets.slice(0, i + 1).filter(x => x.kind !== 'w').length;
              return <SwipeRow key={i} bg={C.bg} style={{ marginTop: 6 }} actions={[{ label: 'DELETE', run: () => updEx(e.uid, x => ({ ...x, sets: x.sets.filter((_, j) => j !== i) })) }]}>
                <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: 6, alignItems: 'center' }}>
                <div role="button" onClick={() => setMenu({ title: 'Set ' + (i + 1), actions: [
                  { label: 'Normal set', run: () => updSet(e.uid, i, x => ({ ...x, kind: 'n' })) }, { label: 'Warm-up set (W)', run: () => updSet(e.uid, i, x => ({ ...x, kind: 'w' })) },
                  { label: 'Drop set (D)', run: () => updSet(e.uid, i, x => ({ ...x, kind: 'd' })) }, { label: 'Failure set (F)', run: () => updSet(e.uid, i, x => ({ ...x, kind: 'f' })) },
                  { label: 'Delete set', danger: true, run: () => updEx(e.uid, x => ({ ...x, sets: x.sets.filter((_, j) => j !== i) })) }] })}
                  style={{ background: rowBg, textAlign: 'center', padding: '9px 0', cursor: 'pointer', font: `700 14px/1 ${F.mono}`, color: kindCol }}>{s.kind && s.kind !== 'n' ? s.kind.toUpperCase() : numIdx}</div>
                <div role="button" onClick={() => prev && updSet(e.uid, i, x => ({ ...x, w: prev.w, r: prev.r, t: prev.t, d: prev.d }))} style={{ background: rowBg, padding: '9px 0', ...T.mono, fontSize: 11, letterSpacing: '.02em', color: C.faint, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: prev ? 'pointer' : 'default' }}>{prev ? setText(st, ex.type, prev) : '—'}</div>
                {ex.type === 'wr' || ex.type === 'dt' ? <input inputMode="decimal" style={inStyle} value={ex.type === 'wr' ? wDisp(st, s.w) : (s.d == null ? '' : s.d)} placeholder={ex.type === 'wr' ? wDisp(st, ph.w) : (ph.d != null ? String(r2(ph.d)) : '')}
                  onChange={ev => { const v = ev.target.value; updSet(e.uid, i, x => ex.type === 'wr' ? { ...x, w: v === '' ? null : wParse(st, v) } : { ...x, d: num(v) }); }} /> : null}
                {ex.type === 'wr' || ex.type === 'r' ? <input inputMode="numeric" style={inStyle} value={s.r == null ? '' : s.r} placeholder={ph.r != null ? String(ph.r) : ''} onChange={ev => { const v = ev.target.value; updSet(e.uid, i, x => ({ ...x, r: v === '' ? null : Math.max(0, Math.round(num(v) || 0)) })); }} /> : null}
                {ex.type === 'd' || ex.type === 'dt' ? <input inputMode="numbers-and-punctuation" style={inStyle} value={s.tRaw != null ? s.tRaw : s.t == null ? '' : fmtDur(s.t)} placeholder={ph.t != null ? fmtDur(ph.t) : 'm:ss'}
                  onChange={ev => { const v = ev.target.value; updSet(e.uid, i, x => ({ ...x, tRaw: v, t: parseTime(v) })); }} onBlur={() => updSet(e.uid, i, x => ({ ...x, tRaw: undefined }))} /> : null}
                <div role="button" onClick={() => toggleDone(e, i, prev)} style={{ height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: s.done ? C.olive : '#282d36', color: s.done ? C.oliveInk : C.faint, font: `700 16px/1 ${F.mono}` }}>{s.pr ? '🏆' : '✓'}</div>
                </div>
              </SwipeRow>;
            })}
          <div role="button" onClick={() => updEx(e.uid, x => ({ ...x, sets: x.sets.concat({ w: null, r: null, t: null, d: null, kind: 'n', done: false, target: x.sets.length ? { ...x.sets[x.sets.length - 1], done: false } : undefined }) }))}
            style={{ marginTop: 8, padding: '10px', textAlign: 'center', background: '#20252c', cursor: 'pointer', ...T.mono, fontSize: 12, color: C.dim }}>+ ADD SET{e.rest ? ' · REST ' + fmtDur(e.rest) : ''}</div>
        </div>;
      }} />
      <MobilityBlock list={aw.mobility || []} onChange={fn => upd(w => ({ ...w, mobility: fn(w.mobility || []) }))} live />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 26 }}>
        <Btn kind="ghost" tone={C.olive} onClick={() => setPicker({ mode: 'add' })}>+ ADD EXERCISES</Btn>
        <Btn kind="danger" onClick={onCancel}>{aw.editOf ? 'DISCARD CHANGES' : 'CANCEL WORKOUT'}</Btn>
      </div>
    </div>
    {picker ? <ExercisePicker st={st} app={app} multi={picker.mode === 'add'} onClose={() => setPicker(null)} onPick={ids => {
      if (picker.mode === 'add') addExercises(ids);
      else { const ex = exById(st, ids[0]); updEx(picker.uid, x => ({ ...x, exId: ids[0], rest: REST_DEFAULT[ex.type], sets: x.sets.map(s => ({ ...s, w: null, r: null, t: null, d: null, done: false })) })); }
      setPicker(null);
    }} /> : null}
    {noteFor ? <NoteEditor value={(aw.exercises.find(x => x.uid === noteFor) || {}).note || ''} onSave={v => { updEx(noteFor, x => ({ ...x, note: v })); setNoteFor(null); }} onClose={() => setNoteFor(null)} /> : null}
    {menu ? <ActionSheet title={menu.title} actions={menu.actions} onClose={() => setMenu(null)} /> : null}
    {plateFor ? <PlateCalc st={st} start={plateFor.w} onClose={() => setPlateFor(null)} /> : null}
  </Sheet>;
}

function NoteEditor({ value, onSave, onClose }) {
  const [v, setV] = useState(value);
  return ReactDOM.createPortal(<div style={{ position: 'fixed', inset: 0, zIndex: 90, background: 'rgba(0,0,0,.6)', display: 'flex', alignItems: 'flex-end' }} onClick={onClose}>
    <div onClick={e => e.stopPropagation()} style={{ width: '100%', background: '#1a1e24', padding: '16px 16px calc(env(safe-area-inset-bottom, 0px) + 14px)', borderTop: '1px solid ' + C.line2 }}>
      <div style={{ ...T.label, marginBottom: 8 }}>NOTE FOR THIS EXERCISE</div>
      <textarea autoFocus value={v} onChange={e => setV(e.target.value)} rows={3} placeholder="e.g. seat height 4, pause at the bottom" style={{ width: '100%', boxSizing: 'border-box', background: C.card, border: '1px solid ' + C.line2, color: C.text, font: `400 16px/1.4 ${F.body}`, padding: 10, outline: 'none', resize: 'none' }} />
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}><Btn kind="ghost" tone={C.dim} onClick={onClose} style={{ flex: 1 }}>CANCEL</Btn><Btn tone={C.olive} ink={C.oliveInk} onClick={() => onSave(v.trim())} style={{ flex: 2 }}>Save note</Btn></div>
    </div></div>, document.body);
}

function ExercisePicker({ st, app, multi, onPick, onClose }) {
  const [q, setQ] = useState(''), [part, setPart] = useState('All'), [equip, setEquip] = useState('Any'), [sel, setSel] = useState([]), [creating, setCreating] = useState(null);
  const list = allExercises(st).filter(e => exMatch(e, q, part, equip)).sort((a, b) => a.name.localeCompare(b.name));
  const pick = id => { if (!multi) return onPick([id]); setSel(s => s.includes(id) ? s.filter(x => x !== id) : s.concat(id)); };
  return <Sheet z={60} title={multi ? 'Add exercises' : 'Replace exercise'} left={<TopLink onClick={onClose}>‹ BACK</TopLink>} right={<TopLink tone={C.olive} onClick={() => setCreating({ name: q, part: part === 'All' ? 'Other' : part, type: 'wr' })}>+ NEW</TopLink>}
    footer={multi ? <Btn tone={C.olive} ink={C.oliveInk} disabled={!sel.length} onClick={() => onPick(sel)}>{sel.length ? 'Add ' + sel.length + (sel.length === 1 ? ' exercise' : ' exercises') : 'Pick exercises'}</Btn> : null}>
    <div style={{ padding: '12px 16px 20px' }}>
      <ExFilters q={q} setQ={setQ} part={part} setPart={setPart} equip={equip} setEquip={setEquip} />
      {list.map(e => { const on = sel.includes(e.id); return <div key={e.id} role="button" onClick={() => pick(e.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 4px', borderBottom: '1px solid #272c34', cursor: 'pointer', background: on ? 'rgba(163,196,110,.14)' : 'transparent' }}>
        <div style={{ flex: 1 }}><div style={T.name}>{e.name}</div><div style={{ ...T.label, marginTop: 3 }}>{e.part}{e.equip ? ' · ' + e.equip : ''} · {({ wr: 'WEIGHT × REPS', r: 'REPS', d: 'TIME', dt: 'DISTANCE + TIME' })[e.type]}</div></div>
        {multi ? <div style={{ width: 22, height: 22, border: '1.5px solid ' + (on ? C.olive : C.line2), background: on ? C.olive : 'transparent', color: C.oliveInk, display: 'flex', alignItems: 'center', justifyContent: 'center', font: `700 13px/1 ${F.mono}` }}>{on ? '✓' : ''}</div> : null}
      </div>; })}
      {!list.length ? <Empty>NOTHING MATCHES · TAP + NEW TO CREATE “{q.toUpperCase()}”</Empty> : null}
    </div>
    {creating ? <CreateExercise app={app} draft={creating} setDraft={setCreating} onDone={id => { setCreating(null); if (id) pick(id); }} /> : null}
  </Sheet>;
}

function CreateExercise({ app, draft, setDraft, onDone }) {
  const save = () => {
    const name = (draft.name || '').trim(); if (!name) { alert('Give the exercise a name.'); return; }
    const id = 'x' + uid();
    app.setState(s => ({ exLib: (s.exLib || []).concat({ id, name, part: draft.part, type: draft.type, custom: true }) }));
    onDone(id);
  };
  return <Sheet z={70} title="New exercise" left={<TopLink onClick={() => onDone(null)}>‹ BACK</TopLink>} footer={<Btn tone={C.olive} ink={C.oliveInk} onClick={save}>Save exercise</Btn>}>
    <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Field label="NAME" value={draft.name} onChange={v => setDraft({ ...draft, name: v })} placeholder="e.g. Cable Lateral Raise" autoFocus />
      <div><div style={{ ...T.label, marginBottom: 6 }}>BODY PART</div><div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{PARTS.slice(1).map(p => <Chip key={p} on={draft.part === p} tone={C.olive} ink={C.oliveInk} onClick={() => setDraft({ ...draft, part: p })}>{p.toUpperCase()}</Chip>)}</div></div>
      <div><div style={{ ...T.label, marginBottom: 6 }}>WHAT YOU LOG</div><div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{[['wr', 'WEIGHT × REPS'], ['r', 'REPS ONLY'], ['d', 'TIME'], ['dt', 'DISTANCE + TIME']].map(([v, l]) => <Chip key={v} on={draft.type === v} tone={C.olive} ink={C.oliveInk} onClick={() => setDraft({ ...draft, type: v })}>{l}</Chip>)}</div></div>
    </div>
  </Sheet>;
}

function TemplateEditor({ app, st, draft, setDraft, onClose }) {
  const [picker, setPicker] = useState(null);   // { mode: 'add' | 'replace', k }
  const [presets, setPresets] = useState(false);
  const [open, setOpen] = useState(null);       // key of the exercise being edited
  const [reorder, setReorder] = useState(false);
  const [menu, setMenu] = useState(null);
  const SH = window.SH;
  // every exercise gets a stable key so rows can be dragged and expanded
  const exs = draft.exercises.map(e => e.k ? e : { ...e, k: uid() });
  useEffect(() => { if (draft.exercises.some(e => !e.k)) setDraft(d => ({ ...d, exercises: d.exercises.map(e => e.k ? e : { ...e, k: uid() }) })); }, [draft.exercises]);
  const put = list => setDraft(d => ({ ...d, exercises: list }));
  const setEx = (k, fn) => setDraft(d => ({ ...d, exercises: d.exercises.map(e => e.k === k ? fn(e) : e) }));
  const setSet = (k, i, patch) => setEx(k, x => ({ ...x, sets: x.sets.map((z, j) => j === i ? { ...z, ...patch } : z) }));
  const newEx = id => { const ex = exById(st, id); return { k: uid(), exId: id, rest: REST_DEFAULT[ex.type], note: '', sets: S(3, ex.type === 'wr' || ex.type === 'r' ? 10 : null).map(z => ({ ...z, t: ex.type === 'd' ? 30 : null })) }; };
  const save = () => {
    const t = { ...draft, id: draft.id || 't' + uid(), name: draft.name.trim() || 'Untitled template', exercises: exs,
      mobility: mobOf(draft).filter(m => (m.name || '').trim()).map(m => ({ name: m.name.trim(), min: Number(m.min) || 0, cue: m.cue })) };
    app.setState(s => ({ templates: (s.templates || []).some(x => x.id === t.id) ? s.templates.map(x => x.id === t.id ? t : x) : (s.templates || []).concat(t) }));
    onClose();
  };
  const summary = (ex, e) => {
    const n = e.sets.filter(z => z.kind !== 'w').length, w = e.sets.filter(z => z.kind === 'w').length, f = e.sets.find(z => z.kind !== 'w') || e.sets[0] || {};
    const t = setText(st, ex.type, f).replace('— × ', '').replace(/^—$/, '');
    return (w ? w + 'W + ' : '') + n + ' × ' + (t || '—') + (e.rest ? ' · REST ' + fmtDur(e.rest) : '');
  };
  const cell = { width: '100%', boxSizing: 'border-box', background: '#282d36', border: 'none', color: C.text, textAlign: 'center', font: `600 16px/1 ${F.body}`, padding: '9px 2px', outline: 'none', borderRadius: 8 };
  const kindCol = k => k === 'w' ? C.amber : k === 'd' ? C.blue : k === 'f' ? C.red : C.text;
  return <Sheet z={50} title={draft.id ? 'Edit template' : 'New template'} left={<TopLink onClick={onClose}>‹ BACK</TopLink>} right={<TopLink tone={C.olive} onClick={save}>SAVE</TopLink>}>
    <div style={{ padding: '14px 18px 30px' }}>
      <Field label="TEMPLATE NAME" value={draft.name} onChange={v => setDraft(d => ({ ...d, name: v }))} />
      <div style={{ ...T.label, margin: '14px 0 6px' }}>SPLIT DAY</div>
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>{[null, 0, 1, 2, 3, 4, 5, 6].map(d => <Chip key={String(d)} on={draft.day === d} tone={C.olive} ink={C.oliveInk} onClick={() => setDraft(x => ({ ...x, day: d }))}>{d == null ? 'ANY' : SH.PLAN[d].abbr}</Chip>)}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', margin: '20px 0 2px' }}>
        <span style={{ font: `700 17px/1.2 ${F.body}`, color: C.olive }}>Exercises</span>
        <span style={{ ...T.label, color: C.faint }}>{reorder ? 'DROP TO PLACE' : exs.length > 1 ? 'TAP TO EDIT · DRAG ≡ TO MOVE' : 'TAP TO EDIT'}</span>
      </div>
      {!exs.length ? <Empty>NO EXERCISES YET · ADD SOME OR LOAD A PRESET</Empty> : null}
      <DragList items={exs} keyOf={e => e.k} onActive={v => { setReorder(v); if (v) setOpen(null); }} onMove={(a, b) => { const x = exs.slice(); const [m] = x.splice(a, 1); x.splice(b, 0, m); put(x); }} render={(e, i, dg) => {
        const ex = exById(st, e.exId), isOpen = open === e.k && !reorder;
        return <div style={{ marginTop: 8, background: dg.dragging ? '#2a3037' : C.card, border: '1px solid ' + (isOpen || dg.dragging ? C.olive : C.line), borderRadius: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px 6px 4px' }}>
            <Grip h={dg.handle} color={exs.length > 1 ? C.dim : C.line2} />
            <div role="button" {...dg.press} onClick={() => setOpen(isOpen ? null : e.k)} style={{ ...dg.press.style, flex: 1, minWidth: 0, cursor: 'pointer', padding: '4px 0' }}>
              <div style={{ ...T.name, color: C.olive }}>{ex.name}</div>
              <div style={{ ...T.label, marginTop: 3 }}>{summary(ex, e)}</div>
            </div>
            <span role="button" onClick={() => setOpen(isOpen ? null : e.k)} style={{ ...T.mono, fontSize: 11, color: isOpen ? C.olive : C.dim, padding: '8px 4px', cursor: 'pointer' }}>{isOpen ? 'DONE' : 'EDIT'}</span>
          </div>
          {isOpen ? <div style={{ padding: '2px 12px 12px', borderTop: '1px solid ' + C.line }}>
            <div style={{ display: 'grid', gridTemplateColumns: `38px ${ex.type === 'wr' || ex.type === 'dt' ? '1fr ' : ''}${ex.type === 'wr' || ex.type === 'r' ? '1fr ' : ''}${ex.type === 'd' || ex.type === 'dt' ? '1fr ' : ''}34px`, gap: 6, alignItems: 'center', marginTop: 10 }}>
              <div style={{ ...T.label, textAlign: 'center' }}>SET</div>
              {ex.type === 'wr' ? <div style={{ ...T.label, textAlign: 'center' }}>{wUnit(st).toUpperCase()}</div> : null}
              {ex.type === 'dt' ? <div style={{ ...T.label, textAlign: 'center' }}>KM</div> : null}
              {ex.type === 'wr' || ex.type === 'r' ? <div style={{ ...T.label, textAlign: 'center' }}>REPS</div> : null}
              {ex.type === 'd' || ex.type === 'dt' ? <div style={{ ...T.label, textAlign: 'center' }}>TIME</div> : null}
              <div />
              {e.sets.map((z, j) => { const numIdx = e.sets.slice(0, j + 1).filter(x => x.kind !== 'w').length; return <React.Fragment key={j}>
                <div role="button" onClick={() => setMenu({ title: 'Set ' + (j + 1), actions: [
                  { label: 'Normal set', run: () => setSet(e.k, j, { kind: 'n' }) }, { label: 'Warm-up set (W)', run: () => setSet(e.k, j, { kind: 'w' }) },
                  { label: 'Drop set (D)', run: () => setSet(e.k, j, { kind: 'd' }) }, { label: 'Failure set (F)', run: () => setSet(e.k, j, { kind: 'f' }) }] })}
                  style={{ textAlign: 'center', padding: '9px 0', cursor: 'pointer', font: `700 14px/1 ${F.mono}`, color: kindCol(z.kind), background: '#20252c', borderRadius: 8 }}>{z.kind && z.kind !== 'n' ? z.kind.toUpperCase() : numIdx}</div>
                {ex.type === 'wr' ? <input inputMode="decimal" placeholder="—" value={wDisp(st, z.w)} onChange={ev => setSet(e.k, j, { w: ev.target.value === '' ? null : wParse(st, ev.target.value) })} style={cell} /> : null}
                {ex.type === 'dt' ? <input inputMode="decimal" placeholder="—" value={z.d == null ? '' : z.d} onChange={ev => setSet(e.k, j, { d: num(ev.target.value) })} style={cell} /> : null}
                {ex.type === 'wr' || ex.type === 'r' ? <input inputMode="numeric" placeholder="—" value={z.r == null ? '' : z.r} onChange={ev => setSet(e.k, j, { r: ev.target.value === '' ? null : Math.max(0, Math.round(num(ev.target.value) || 0)) })} style={cell} /> : null}
                {ex.type === 'd' || ex.type === 'dt' ? <input inputMode="numbers-and-punctuation" placeholder="m:ss" value={z.tRaw != null ? z.tRaw : z.t == null ? '' : fmtDur(z.t)} onChange={ev => setSet(e.k, j, { tRaw: ev.target.value, t: parseTime(ev.target.value) })} onBlur={() => setSet(e.k, j, { tRaw: undefined })} style={cell} /> : null}
                <span role="button" onClick={() => setEx(e.k, x => ({ ...x, sets: x.sets.length > 1 ? x.sets.filter((_, q) => q !== j) : x.sets }))} style={{ ...T.mono, fontSize: 14, color: e.sets.length > 1 ? C.faint : C.line2, textAlign: 'center', padding: '8px 0', cursor: 'pointer' }}>✕</span>
              </React.Fragment>; })}
            </div>
            <div role="button" onClick={() => setEx(e.k, x => ({ ...x, sets: x.sets.concat({ ...(x.sets[x.sets.length - 1] || { w: null, r: null }), kind: 'n' }) }))} style={{ marginTop: 8, padding: 10, textAlign: 'center', background: '#20252c', cursor: 'pointer', ...T.mono, fontSize: 12, color: C.dim }}>+ ADD SET</div>
            <div style={{ ...T.label, margin: '14px 0 6px' }}>REST AFTER EACH SET</div>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>{[0, 60, 90, 120, 150, 180, 240].map(t => <Chip key={t} on={(e.rest || 0) === t} tone={C.olive} ink={C.oliveInk} onClick={() => setEx(e.k, x => ({ ...x, rest: t }))}>{t ? fmtDur(t) : 'OFF'}</Chip>)}</div>
            <div style={{ marginTop: 12 }}><Field label="NOTE (SHOWS DURING THE WORKOUT)" value={e.note || ''} onChange={v => setEx(e.k, x => ({ ...x, note: v }))} placeholder="e.g. seat height 4, pause at the bottom" /></div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <Btn kind="ghost" tone={C.olive} onClick={() => setPicker({ mode: 'replace', k: e.k })} style={{ flex: 1, minHeight: 42 }}>REPLACE</Btn>
              <Btn kind="ghost" tone={C.text} onClick={() => { const c = { ...e, k: uid(), sets: e.sets.map(z => ({ ...z })) }; const x = exs.slice(); x.splice(i + 1, 0, c); put(x); }} style={{ flex: 1, minHeight: 42 }}>DUPLICATE</Btn>
              <Btn kind="danger" onClick={() => { put(exs.filter(x => x.k !== e.k)); setOpen(null); }} style={{ flex: 1, minHeight: 42 }}>REMOVE</Btn>
            </div>
          </div> : null}
        </div>;
      }} />
      <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
        <Btn kind="ghost" tone={C.olive} onClick={() => setPicker({ mode: 'add' })} style={{ flex: 1 }}>+ EXERCISES</Btn>
        <Btn kind="ghost" tone={C.olive} onClick={() => setPresets(true)} style={{ flex: 1 }}>LOAD A PRESET</Btn>
      </div>
      <MobilityBlock list={mobOf(draft)} onChange={fn => setDraft(d => ({ ...d, mobility: fn(mobOf(d)) }))} />
    </div>
    {picker ? <ExercisePicker st={st} app={app} multi={picker.mode === 'add'} onClose={() => setPicker(null)} onPick={ids => {
      if (picker.mode === 'add') put(exs.concat(ids.map(newEx)));
      else { const ex = exById(st, ids[0]), fresh = newEx(ids[0]); setEx(picker.k, x => ({ ...x, exId: ids[0], rest: REST_DEFAULT[ex.type], sets: x.sets.map(z => ({ ...z, w: null, r: fresh.sets[0].r, t: fresh.sets[0].t, d: null })) })); }
      setPicker(null);
    }} /> : null}
    {presets ? <PresetBrowser st={st} app={app} pick onClose={() => setPresets(false)} onUse={(t, how) => {
      const incoming = t.exercises.map(e => ({ ...e, k: uid(), note: '' }));
      setDraft(d => ({ ...d, name: how === 'replace' && (!d.name || /^new template$|^untitled/i.test(d.name)) ? t.name : d.name, exercises: how === 'replace' ? incoming : exs.concat(incoming),
        mobility: how === 'replace' && t.mobility.length ? t.mobility : mobOf(d) }));
      setPresets(false);
    }} /> : null}
    {menu ? <ActionSheet title={menu.title} actions={menu.actions} onClose={() => setMenu(null)} /> : null}
  </Sheet>;
}

function ExerciseDetail({ st, app, exId, onClose }) {
  const ex = exById(st, exId), rec = records(st, exId, null);
  const metrics = METRICS[ex.type] || METRICS.wr;
  const [metric, setMetric] = useState(metrics[0][0]);
  const [range, setRange] = useState('all');
  const since = { '1m': 30, '3m': 91, '6m': 182, '1y': 365 }[range];
  const all = seriesFor(st, exId, metric), pts = since ? all.filter(p => p.x >= addDaysIso(st.curDate, -since)) : all;
  const hist = (st.workouts || []).filter(w => w.exercises.some(e => e.exId === exId && e.sets.some(s => s.done))).slice().reverse();
  const tiles = ex.type === 'wr' ? [['EST. 1RM', rec.e1rm ? wDisp(st, r1(rec.e1rm)) + ' ' + wUnit(st) : '—'], ['HEAVIEST', rec.heavy ? wDisp(st, rec.heavy) + ' ' + wUnit(st) : '—'], ['BEST SET VOL', rec.vol ? wDisp(st, rec.vol) + ' ' + wUnit(st) : '—']]
    : ex.type === 'r' ? [['MOST REPS', rec.reps || '—'], ['SESSIONS', hist.length]] : ex.type === 'd' ? [['LONGEST', rec.time ? fmtDur(rec.time) : '—'], ['SESSIONS', hist.length]] : [['LONGEST', rec.dist ? r2(rec.dist) + ' km' : '—'], ['LONGEST TIME', rec.time ? fmtDur(rec.time) : '—']];
  const tt = trendText(st, pts, metric);
  return <Sheet z={58} title={ex.name} sub={ex.part.toUpperCase() + (ex.equip ? ' · ' + ex.equip.toUpperCase() : '')} left={<TopLink onClick={onClose}>‹ BACK</TopLink>}
    right={ex.custom ? <TopLink tone={C.red} onClick={() => { if (confirm('Delete this custom exercise? Past workouts keep their records.')) { app.setState(s => ({ exLib: (s.exLib || []).filter(e => e.id !== exId) })); onClose(); } }}>DELETE</TopLink> : null}>
    <div style={{ padding: '14px 18px 26px' }}>
      <div style={{ ...T.label, marginBottom: 8 }}>PERSONAL RECORDS</div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${tiles.length}, 1fr)`, gap: 7 }}>{tiles.map(([l, v]) => <Card key={l} style={{ padding: '10px 11px' }}><div style={T.label}>{l}</div><div style={{ font: `700 20px/1.1 ${F.head}`, marginTop: 4, color: C.text }}>{v}</div></Card>)}</div>
      <div style={{ ...T.label, margin: '20px 0 8px' }}>TREND</div>
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', margin: '0 -18px', padding: '0 18px' }}>{metrics.map(([k, l]) => <Chip key={k} on={metric === k} tone={C.olive} ink={C.oliveInk} onClick={() => setMetric(k)}>{l}</Chip>)}</div>
      <div style={{ display: 'flex', gap: 6, margin: '6px 0 12px' }}>{[['1m', '1M'], ['3m', '3M'], ['6m', '6M'], ['1y', '1Y'], ['all', 'ALL']].map(([k, l]) => <Chip key={k} on={range === k} tone={C.text} ink={C.bg} onClick={() => setRange(k)} style={{ flex: 1, textAlign: 'center', padding: '7px 0', fontSize: 10 }}>{l}</Chip>)}</div>
      <Card style={{ padding: '12px 12px 6px' }}>
        <LineChart points={pts} tone={C.olive} fmt={metricFmt(st, metric)} />
        {tt ? <div style={{ ...T.mono, fontSize: 11, margin: '6px 0 4px', color: tt.startsWith('▲') ? C.olive : tt.startsWith('▼') ? C.red : C.dim }}>{tt}</div> : null}
      </Card>
      <div style={{ ...T.label, margin: '18px 0 4px' }}>HISTORY · {hist.length} SESSIONS</div>
      {hist.map(w => { const es = w.exercises.filter(x => x.exId === exId); return <div key={w.id} style={{ padding: '10px 0', borderBottom: '1px solid #272c34' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={T.name}>{w.name}</span><span style={T.label}>{niceDate(w.date).toUpperCase()}</span></div>
        <div style={{ ...T.mono, fontSize: 11, color: C.dim, marginTop: 5, lineHeight: 1.6 }}>{es.flatMap(e => e.sets.filter(s => s.done)).map(s => (s.kind === 'w' ? 'W ' : '') + setText(st, ex.type, s)).join('  ·  ')}</div>
      </div>; })}
      {!hist.length ? <Empty>NOT LOGGED YET</Empty> : null}
    </div>
  </Sheet>;
}

function MobilityBlock({ list, onChange, live }) {
  const [pick, setPick] = useState(false);
  const [cueOpen, setCueOpen] = useState(null);
  const set = (i, patch) => onChange(l => l.map((m, j) => j === i ? { ...m, ...patch } : m));
  const inp = { boxSizing: 'border-box', background: '#282d36', border: 'none', color: C.text, font: `500 15px/1.2 ${F.body}`, padding: '10px 8px', outline: 'none', minWidth: 0 };
  return <div style={{ marginTop: 24 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
      <span style={{ font: `700 17px/1.2 ${F.body}`, color: C.olive }}>Mobility</span>
      <span style={{ ...T.label }}>{mobMin(list.map(m => ({ ...m, done: live ? m.done : true })))} {live ? 'OF ' + mobMin(list.map(m => ({ ...m, done: true }))) + ' ' : ''}MIN</span>
    </div>
    <DragList items={list} onMove={(a, b) => { setCueOpen(null); onChange(l => { const x = l.slice(); const [m] = x.splice(a, 1); x.splice(b, 0, m); return x; }); }} render={(m, i, dg) => <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 7, background: dg.dragging ? '#2a3037' : 'transparent', borderRadius: 10 }}>
      {list.length > 1 ? <Grip h={dg.handle} /> : null}
      {live ? <div role="button" onClick={() => set(i, { done: !m.done })} style={{ width: 40, height: 40, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: m.done ? C.olive : '#282d36', color: m.done ? C.oliveInk : C.faint, font: `700 16px/1 ${F.mono}` }}>✓</div> : null}
      <input value={m.name} placeholder="e.g. Hip flow" onChange={e => set(i, { name: e.target.value })} style={{ ...inp, flex: 1, textDecoration: live && m.done ? 'line-through' : 'none', color: live && m.done ? C.dim : C.text }} />
      <input value={m.min == null ? '' : m.min} inputMode="numeric" onChange={e => set(i, { min: e.target.value === '' ? '' : Math.max(0, Math.round(num(e.target.value) || 0)) })} style={{ ...inp, width: 52, textAlign: 'center' }} />
      <span style={{ ...T.label, width: 26 }}>MIN</span>
      {m.cue ? <span role="button" onClick={() => setCueOpen(cueOpen === i ? null : i)} style={{ ...T.mono, fontSize: 13, color: cueOpen === i ? C.olive : C.dim, padding: '8px 2px', cursor: 'pointer' }}>ⓘ</span> : null}
      <span role="button" onClick={() => onChange(l => l.filter((_, j) => j !== i))} style={{ ...T.mono, fontSize: 14, color: C.faint, padding: '8px 4px', cursor: 'pointer' }}>✕</span>
    </div>} />
    {cueOpen != null && list[cueOpen] && list[cueOpen].cue ? <div style={{ font: `400 13px/1.45 ${F.body}`, color: C.dim, background: C.card, borderLeft: '3px solid ' + C.olive, padding: '8px 10px', marginTop: 6 }}>{list[cueOpen].name}: {list[cueOpen].cue}</div> : null}
    {!list.length ? <div style={{ ...T.label, color: C.faint, marginTop: 8 }}>NO MOBILITY ON THIS DAY</div> : null}
    <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
      <div role="button" onClick={() => setPick(true)} style={{ flex: 1, padding: '10px', textAlign: 'center', background: '#20252c', cursor: 'pointer', ...T.mono, fontSize: 12, color: C.olive }}>+ FROM LIBRARY</div>
      <div role="button" onClick={() => onChange(l => l.concat({ name: '', min: 10, done: false }))} style={{ flex: 1, padding: '10px', textAlign: 'center', background: '#20252c', cursor: 'pointer', ...T.mono, fontSize: 12, color: C.dim }}>+ CUSTOM</div>
    </div>
    {pick ? <MobilityPicker onClose={() => setPick(false)} onAdd={items => { onChange(l => l.concat(items.map(m => ({ ...m, done: false })))); setPick(false); }} /> : null}
  </div>;
}

function PlateCalc({ st, start, onClose }) {
  const kg = !st.imperial, bars = kg ? [20, 15, 10] : [45, 35, 25];
  const [total, setTotal] = useState(start != null ? wDisp(st, start) : '');
  const [bar, setBar] = useState(bars[0]);
  const t = num(total), res = t != null ? plates(st, t, bar) : null;
  const colors = { 25: C.red, 20: C.blue, 15: C.amber, 10: C.olive, 45: C.blue, 35: C.amber };
  return ReactDOM.createPortal(<div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 90, background: 'rgba(0,0,0,.6)', display: 'flex', alignItems: 'flex-end' }}>
    <div onClick={e => e.stopPropagation()} style={{ width: '100%', background: '#1a1e24', borderTop: '1px solid ' + C.line2, padding: '16px 16px calc(env(safe-area-inset-bottom, 0px) + 16px)' }}>
      <div style={{ ...T.h2, marginBottom: 12 }}>Plate calculator</div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
        <Field label={'TOTAL · ' + wUnit(st).toUpperCase()} value={total} onChange={setTotal} inputMode="decimal" style={{ flex: 1 }} autoFocus />
        <div><div style={{ ...T.label, marginBottom: 5 }}>BAR</div><div style={{ display: 'flex', gap: 5 }}>{bars.map(b => <Chip key={b} on={bar === b} tone={C.olive} ink={C.oliveInk} onClick={() => setBar(b)}>{b}</Chip>)}</div></div>
      </div>
      <div style={{ marginTop: 16, minHeight: 70 }}>
        {!res ? <div style={{ ...T.label, color: C.faint }}>{t != null ? 'LESS THAN THE BAR' : 'ENTER A WEIGHT'}</div> : <>
          <div style={{ ...T.label, marginBottom: 8 }}>EACH SIDE{res.out.length ? '' : ': JUST THE BAR'}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
            {res.out.map((p, i) => <div key={i} style={{ width: p >= 10 ? 30 : 22, height: p >= 20 ? 70 : p >= 10 ? 56 : 40, background: colors[p] || C.dim, color: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', font: `700 11px/1 ${F.mono}`, writingMode: 'vertical-rl' }}>{p}</div>)}
          </div>
          <div style={{ ...T.mono, fontSize: 12, color: C.text, marginTop: 10 }}>{res.out.length ? res.out.join(' + ') + ' ' + wUnit(st) + ' per side' : ''}{res.left > 0 ? ' · ' + res.left + ' ' + wUnit(st) + ' can’t be made per side' : ''}</div>
        </>}
      </div>
      <Btn kind="ghost" tone={C.dim} onClick={onClose} style={{ marginTop: 12 }}>CLOSE</Btn>
    </div></div>, document.body);
}

function MobilityPicker({ title = 'Add mobility', routinesOnly, onClose, onAdd }) {
  const [tab, setTab] = useState('routines'), [area, setArea] = useState('All'), [q, setQ] = useState(''), [sel, setSel] = useState([]);
  const drills = MOB_LIB.filter(d => (area === 'All' || d.area === area) && (!q || d.name.toLowerCase().includes(q.toLowerCase())));
  const toggle = id => setSel(s => s.includes(id) ? s.filter(x => x !== id) : s.concat(id));
  const [open, setOpen] = useState(null);
  return <Sheet z={75} title={title} left={<TopLink onClick={onClose}>‹ BACK</TopLink>}
    footer={tab === 'drills' ? <Btn tone={C.olive} ink={C.oliveInk} disabled={!sel.length} onClick={() => onAdd(sel.map(id => { const d = MOB_LIB.find(x => x.id === id); return { name: d.name, min: d.min, cue: d.cue }; }), 'Mobility')}>{sel.length ? 'Add ' + sel.length + (sel.length === 1 ? ' drill' : ' drills') : 'Pick drills'}</Btn> : null}>
    <div style={{ padding: '12px 16px 24px' }}>
      <Seg items={[['routines', 'ROUTINES · ' + MOB_ROUTINES.length], ['drills', 'DRILLS · ' + MOB_LIB.length]]} value={tab} onChange={setTab} tone={C.olive} ink={C.oliveInk} />
      {tab === 'routines' ? MOB_ROUTINES.map(r => { const items = routineItems(r), isOpen = open === r.id; return <Card key={r.id} style={{ marginTop: 9 }}>
        <div role="button" onClick={() => setOpen(isOpen ? null : r.id)} style={{ cursor: 'pointer' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><span style={{ font: `700 18px/1.1 ${F.head}`, textTransform: 'uppercase' }}>{r.name}</span><span style={{ ...T.label, flex: 'none' }}>{items.reduce((a, m) => a + m.min, 0)} MIN</span></div>
          <div style={{ font: `400 13px/1.4 ${F.body}`, color: C.dim, marginTop: 4 }}>{r.note}</div>
        </div>
        {isOpen ? <div style={{ marginTop: 8 }}>{items.map((m, i) => <div key={i} style={{ padding: '7px 0', borderTop: '1px solid #272c34' }}><div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={T.name}>{m.name}</span><span style={T.label}>{m.min} MIN</span></div><div style={{ font: `400 12px/1.4 ${F.body}`, color: C.dim, marginTop: 2 }}>{m.cue}</div></div>)}</div> : null}
        <Btn tone={C.olive} ink={C.oliveInk} onClick={() => onAdd(items, r.name)} style={{ marginTop: 10, minHeight: 42, fontSize: 14 }}>{routinesOnly ? 'Start ' + r.name : 'Add routine'}</Btn>
      </Card>; }) : <>
        <div style={{ marginTop: 10 }}><Field value={q} onChange={setQ} placeholder="Search drills" /></div>
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', margin: '8px -16px 4px', padding: '0 16px' }}>{MOB_AREAS.map(a => <Chip key={a} on={area === a} tone={C.olive} ink={C.oliveInk} onClick={() => setArea(a)}>{a.toUpperCase()}</Chip>)}</div>
        {drills.map(d => { const on = sel.includes(d.id); return <div key={d.id} role="button" onClick={() => toggle(d.id)} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '11px 4px', borderBottom: '1px solid #272c34', cursor: 'pointer', background: on ? 'rgba(163,196,110,.14)' : 'transparent' }}>
          <div style={{ flex: 1 }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><span style={T.name}>{d.name}</span><span style={{ ...T.label, flex: 'none' }}>{d.area} · {d.min} MIN</span></div><div style={{ font: `400 12px/1.4 ${F.body}`, color: C.dim, marginTop: 3 }}>{d.cue}</div></div>
          <div style={{ width: 22, height: 22, flex: 'none', border: '1.5px solid ' + (on ? C.olive : C.line2), background: on ? C.olive : 'transparent', color: C.oliveInk, display: 'flex', alignItems: 'center', justifyContent: 'center', font: `700 13px/1 ${F.mono}` }}>{on ? '✓' : ''}</div>
        </div>; })}
      </>}
      {tab === 'routines' && routinesOnly ? <Btn kind="ghost" tone={C.olive} onClick={() => setTab('drills')} style={{ marginTop: 12 }}>OR PICK SINGLE DRILLS</Btn> : null}
    </div>
  </Sheet>;
}

function PresetBrowser({ st, app, onClose, onStart, pick, onUse }) {
  const [open, setOpen] = useState(null);
  const groups = Array.from(new Set(PRESETS.map(p => p.group)));
  const toTemplate = p => ({ id: 't' + uid(), name: p.name, day: null, mobility: p.mob ? routineItems(MOB_ROUTINES.find(r => r.id === p.mob)) : [],
    exercises: p.ex.map(([exId, sets]) => ({ exId, rest: REST_DEFAULT[exById(st, exId).type], sets: sets.map(x => ({ ...x })) })) });
  const p = PRESETS.find(x => x.id === open);
  return <Sheet z={pick ? 72 : 50} title="Preset workouts" sub={pick ? 'PICK ONE TO LOAD INTO THIS TEMPLATE' : PRESETS.length + ' WORKOUTS'} left={<TopLink onClick={onClose}>‹ BACK</TopLink>}>
    <div style={{ padding: '10px 18px 24px' }}>
      {groups.map(g => <div key={g}>
        <div style={{ ...T.label, margin: '16px 0 8px' }}>{g.toUpperCase()}</div>
        {PRESETS.filter(x => x.group === g).map(x => <Card key={x.id} onClick={() => setOpen(x.id)} style={{ marginBottom: 8 }}>
          <div style={{ font: `700 18px/1.1 ${F.head}`, textTransform: 'uppercase' }}>{x.name}</div>
          <div style={{ font: `400 13px/1.4 ${F.body}`, color: C.dim, marginTop: 4 }}>{x.note}</div>
          <div style={{ ...T.label, marginTop: 6 }}>{x.ex.map(([id, sets]) => sets.length + '× ' + exById(st, id).name).join(' · ').toUpperCase()}</div>
        </Card>)}
      </div>)}
    </div>
    {p ? <Sheet z={pick ? 74 : 52} title={p.name} sub={p.group.toUpperCase()} left={<TopLink onClick={() => setOpen(null)}>‹ BACK</TopLink>}
      footer={pick ? <div style={{ display: 'flex', gap: 8 }}>
        <Btn kind="ghost" tone={C.olive} onClick={() => onUse(toTemplate(p), 'add')} style={{ flex: 1 }}>ADD TO LIST</Btn>
        <Btn tone={C.olive} ink={C.oliveInk} onClick={() => onUse(toTemplate(p), 'replace')} style={{ flex: 1 }}>Use preset</Btn></div> : <div style={{ display: 'flex', gap: 8 }}>
        <Btn kind="ghost" tone={C.olive} onClick={() => { app.setState(s => ({ templates: (s.templates || []).concat(toTemplate(p)) })); alert('Added “' + p.name + '” to your templates.'); setOpen(null); }} style={{ flex: 1 }}>ADD TO MY TEMPLATES</Btn>
        <Btn tone={C.olive} ink={C.oliveInk} onClick={() => onStart(toTemplate(p))} style={{ flex: 1 }}>Start now</Btn></div>}>
      <div style={{ padding: '12px 18px 24px' }}>
        <div style={{ ...T.body, color: C.dim }}>{p.note}</div>
        {p.ex.map(([id, sets], i) => { const ex = exById(st, id); return <div key={i} style={{ padding: '12px 0', borderBottom: '1px solid #272c34', display: 'flex', justifyContent: 'space-between', gap: 8 }}>
          <div><div style={T.name}>{ex.name}</div><div style={{ ...T.label, marginTop: 3 }}>{ex.part} · {ex.equip}</div></div>
          <div style={{ ...T.mono, fontSize: 12, color: C.text, flex: 'none' }}>{sets.length} × {setText(st, ex.type, sets[0]).replace('— × ', '').replace('—', '')}</div>
        </div>; })}
        {p.mob ? <div style={{ ...T.label, marginTop: 14, color: C.olive }}>INCLUDES MOBILITY · {MOB_ROUTINES.find(r => r.id === p.mob).name.toUpperCase()}</div> : null}
      </div>
    </Sheet> : null}
  </Sheet>;
}

function HistoryProgress({ st, onExercise }) {
  const ws = st.workouts || [], today = st.curDate;
  const monday = iso => addDaysIso(iso, -((dOf(iso).getDay() + 6) % 7));
  const w0 = monday(today), weeks = Array.from({ length: 8 }, (_, i) => addDaysIso(w0, -7 * (7 - i)));
  const inWeek = (w, wk) => w.date >= wk && w.date < addDaysIso(wk, 7);
  const count = weeks.map(wk => ({ label: 'Week of ' + shortDate(wk), tick: shortDate(wk).split(' ')[1], y: ws.filter(w => inWeek(w, wk)).length }));
  const vol = weeks.map(wk => ({ label: 'Week of ' + shortDate(wk), tick: shortDate(wk).split(' ')[1], y: ws.filter(w => inWeek(w, wk)).reduce((a, w) => a + (w.volume || 0), 0) }));
  const freq = {};
  ws.forEach(w => w.exercises.forEach(e => { if (e.sets.some(x => x.done !== false)) freq[e.exId] = (freq[e.exId] || 0) + 1; }));
  const top = Object.keys(freq).sort((a, b) => freq[b] - freq[a]).slice(0, 8);
  const thisWeek = count[count.length - 1].y, lastWeek = count[count.length - 2].y;
  return <div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 7, margin: '4px 0 12px' }}>
      {[['THIS WEEK', thisWeek + (thisWeek === 1 ? ' workout' : ' workouts')], ['LAST WEEK', String(lastWeek)], ['ALL TIME', String(ws.length)]].map(([l, v]) =>
        <Card key={l} style={{ padding: '10px 11px' }}><div style={T.label}>{l}</div><div style={{ font: `700 18px/1.1 ${F.head}`, marginTop: 4 }}>{v}</div></Card>)}
    </div>
    <Card style={{ padding: '12px 12px 6px' }}><div style={{ ...T.label, marginBottom: 6 }}>WORKOUTS PER WEEK · LAST 8 WEEKS</div><BarChart bars={count} tone={C.olive} fmt={v => String(Math.round(v))} height={120} /></Card>
    {vol.some(b => b.y) ? <Card style={{ padding: '12px 12px 6px', marginTop: 8 }}><div style={{ ...T.label, marginBottom: 6 }}>VOLUME PER WEEK · {wUnit(st).toUpperCase()}</div><BarChart bars={vol} tone={C.olive} fmt={v => v >= 10000 ? r1(v / 1000) + 'k' : wDisp(st, Math.round(v))} height={120} /></Card> : null}
    <ExerciseTrends st={st} freq={freq} onExercise={onExercise} />
  </div>;
}

// ── Import from Strong ──
// Strong: Settings → Export Strong Data → a CSV with one row per set. Column names vary a little between Strong
// versions (units in the header or in their own columns, comma or semicolon), so columns are found by name.
function parseCsv(text) {
  text = text.replace(/^﻿/, '');
  const first = text.split(/\r?\n/, 1)[0] || '', delim = (first.match(/;/g) || []).length > (first.match(/,/g) || []).length ? ';' : ',';
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += ch; }
    else if (ch === '"') q = true;
    else if (ch === delim) { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter(r => r.some(c => c.trim()));
}
const normName = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
function strongDate(s) {
  const m = String(s || '').trim().match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})[ T]?(\d{1,2})?:?(\d{2})?:?(\d{2})?/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 12), +(m[5] || 0), +(m[6] || 0));
  const d = new Date(s); return isNaN(d) ? null : d;
}
function strongDuration(s) {
  s = String(s || '').trim(); if (!s) return 0;
  if (/^\d+(\.\d+)?$/.test(s)) return +s;                                   // seconds
  if (/^\d+:\d{2}(:\d{2})?$/.test(s)) { const p = s.split(':').map(Number); return p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p[0] * 60 + p[1]; }
  const h = s.match(/(\d+)\s*h/), m = s.match(/(\d+)\s*m(?!s)/), sec = s.match(/(\d+)\s*s/);
  return (h ? +h[1] * 3600 : 0) + (m ? +m[1] * 60 : 0) + (sec ? +sec[1] : 0);
}
function parseStrong(text) {
  const rows = parseCsv(text);
  if (rows.length < 2) throw new Error('That file is empty.');
  const head = rows[0].map(h => h.trim().toLowerCase());
  const col = (...names) => head.findIndex(h => names.some(n => h === n || h.startsWith(n + ' (')));
  const C_ = { date: col('date'), name: col('workout name'), dur: col('duration'), ex: col('exercise name'), order: col('set order'), w: col('weight'), r: col('reps'),
    dist: col('distance'), sec: col('seconds'), note: col('notes'), wnote: col('workout notes'), wUnit: col('weight unit'), dUnit: col('distance unit') };
  if (C_.date < 0 || C_.ex < 0) throw new Error('This doesn’t look like a Strong export (no Date / Exercise Name columns).');
  const wHead = C_.w >= 0 ? head[C_.w] : '', dHead = C_.dist >= 0 ? head[C_.dist] : '';
  const weightUnit = /lb/.test(wHead) ? 'lb' : /kg/.test(wHead) ? 'kg' : null;       // null = ask
  const distUnit = /mile|\(mi\)/.test(dHead) ? 'mi' : /\(km\)/.test(dHead) ? 'km' : /meter|\(m\)/.test(dHead) ? 'm' : null;
  const get = (r, i) => i >= 0 ? String(r[i] == null ? '' : r[i]).trim() : '';
  const num = v => { const n = parseFloat(String(v).replace(',', '.')); return isNaN(n) ? null : n; };
  const byKey = new Map();
  for (const r of rows.slice(1)) {
    const exName = get(r, C_.ex), order = get(r, C_.order);
    if (!exName || /rest/i.test(order) || /^rest( timer)?$/i.test(exName)) continue;   // Strong logs rest timers as rows too
    const when = strongDate(get(r, C_.date)); if (!when) continue;
    const wname = get(r, C_.name) || 'Workout', key = get(r, C_.date) + '|' + wname;
    if (!byKey.has(key)) byKey.set(key, { name: wname, start: when.getTime(), dur: strongDuration(get(r, C_.dur)), note: get(r, C_.wnote), ex: new Map() });
    const w = byKey.get(key);
    if (!w.ex.has(exName)) w.ex.set(exName, { name: exName, note: '', sets: [] });
    const e = w.ex.get(exName);
    if (get(r, C_.note) && !e.note) e.note = get(r, C_.note);
    const wu = (get(r, C_.wUnit) || '').toLowerCase(), du = (get(r, C_.dUnit) || '').toLowerCase();
    e.sets.push({ w: num(get(r, C_.w)), wu: /lb/.test(wu) ? 'lb' : /kg/.test(wu) ? 'kg' : null, r: num(get(r, C_.r)), d: num(get(r, C_.dist)), du: /mi/.test(du) ? 'mi' : /km/.test(du) ? 'km' : /^m$|met/.test(du) ? 'm' : null,
      t: num(get(r, C_.sec)), kind: /^w/i.test(order) ? 'w' : /^d/i.test(order) ? 'd' : /^f/i.test(order) ? 'f' : 'n' });
  }
  const workouts = [...byKey.values()].map(w => ({ ...w, ex: [...w.ex.values()] })).sort((a, b) => a.start - b.start);
  const hasRowUnits = workouts.some(w => w.ex.some(e => e.sets.some(s => s.wu)));
  return { workouts, weightUnit: weightUnit || (hasRowUnits ? 'row' : null), distUnit };
}

function StrongImport({ app, st, onClose }) {
  const [parsed, setParsed] = useState(null), [err, setErr] = useState(''), [unit, setUnit] = useState(st.imperial ? 'lb' : 'kg'), [busy, setBusy] = useState(false);
  const fileRef = useRef(null);
  const pick = ev => {
    const f = ev.target.files && ev.target.files[0]; ev.target.value = '';
    if (!f) return;
    const rd = new FileReader();
    rd.onload = () => { try { setErr(''); setParsed(parseStrong(String(rd.result))); } catch (e) { setParsed(null); setErr(e.message || 'Couldn’t read that file.'); } };
    rd.readAsText(f);
  };
  // match Strong's exercise names to the app's list; anything unknown becomes a custom exercise
  const plan = useMemo(() => {
    if (!parsed) return null;
    const lib = new Map(allExercises(st).map(e => [normName(e.name), e]));
    const names = [...new Set(parsed.workouts.flatMap(w => w.ex.map(e => e.name)))];
    const newEx = [], map = {};
    for (const n of names) {
      const hit = lib.get(normName(n)) || lib.get(normName(n.replace(/\s*\(.*\)\s*$/, '')));
      if (hit) { map[n] = hit.id; continue; }
      const sets = parsed.workouts.flatMap(w => w.ex.filter(e => e.name === n).flatMap(e => e.sets));
      const type = sets.some(s => s.w > 0) ? 'wr' : sets.some(s => s.d > 0) ? 'dt' : sets.some(s => s.r > 0) ? 'r' : sets.some(s => s.t > 0) ? 'd' : 'wr';
      const eq = (n.match(/\(([^)]+)\)\s*$/) || [])[1] || '';
      const ex = { id: 'x' + uid(), name: n, part: 'Other', type, equip: EQUIPS.includes(eq) ? eq : eq ? 'Other' : undefined, custom: true };
      newEx.push(ex); map[n] = ex.id;
    }
    const existing = st.workouts || [];
    const dup = w => existing.some(x => Math.abs(x.start - w.start) < 90000 && normName(x.name) === normName(w.name));
    const fresh = parsed.workouts.filter(w => !dup(w));
    return { map, newEx, fresh, dups: parsed.workouts.length - fresh.length, matched: names.length - newEx.length, total: names.length };
  }, [parsed, st.workouts, st.exLib]);

  const run = () => {
    if (!plan || !plan.fresh.length) return;
    setBusy(true);
    setTimeout(() => {
      const kgOf = (v, su) => { if (v == null) return null; const u = parsed.weightUnit === 'row' ? (su || unit) : (parsed.weightUnit || unit); return r2(u === 'lb' ? v / 2.20462 : v); };
      const kmOf = (v, su) => { if (v == null) return null; const u = su || parsed.distUnit || 'm'; return r2(u === 'mi' ? v * 1.60934 : u === 'km' ? v : v / 1000); };
      const typeOf = id => (plan.newEx.find(e => e.id === id) || exById(st, id)).type;
      const made = plan.fresh.map(w => {
        const d = new Date(w.start), out = { id: 'strong-' + w.start, name: w.name, date: isoOf(d), start: w.start, end: w.start + (w.dur || 3600) * 1000, imported: 'strong', note: w.note || undefined,
          exercises: w.ex.map(e => { const id = plan.map[e.name], type = typeOf(id);
            return { exId: id, name: (plan.newEx.find(x => x.id === id) || exById(st, id)).name, type, rest: REST_DEFAULT[type], note: e.note,
              sets: e.sets.map(s => ({ w: type === 'wr' ? kgOf(s.w, s.wu) : null, r: type === 'wr' || type === 'r' ? (s.r != null ? Math.round(s.r) : null) : null,
                d: type === 'dt' ? kmOf(s.d, s.du) : null, t: type === 'd' || type === 'dt' ? (s.t != null ? Math.round(s.t) : null) : null, kind: s.kind, done: true }))
                .filter(s => s.w != null || s.r != null || s.d != null || s.t != null) }; }).filter(e => e.sets.length), mobility: [] };
        out.volume = workoutVolume(out); return out;
      }).filter(w => w.exercises.length);
      const exLib = (st.exLib || []).concat(plan.newEx);
      const all = (st.workouts || []).concat(made).sort((a, b) => a.start - b.start);
      // PRs in date order, as if each workout had just been finished
      const view = { ...st, exLib, workouts: all };
      for (const w of made) { const upTo = { ...view, workouts: all.filter(x => x.start <= w.start) }; w.prs = findPRs(upTo, w); }
      try { app.setState({ exLib, workouts: all }); }
      catch (e) { setBusy(false); alert('Your phone ran out of space for that many workouts.'); return; }
      setBusy(false);
      alert('Imported ' + made.length + ' workouts from Strong.' + (plan.newEx.length ? ' ' + plan.newEx.length + (plan.newEx.length === 1 ? ' new exercise was' : ' new exercises were') + ' added to your list.' : ''));
      onClose();
    }, 30);
  };
  const first = parsed && parsed.workouts[0], last = parsed && parsed.workouts[parsed.workouts.length - 1];
  return <Sheet z={60} title="Import from Strong" left={<TopLink onClick={onClose}>‹ BACK</TopLink>}
    footer={plan ? <Btn tone={C.olive} ink={C.oliveInk} disabled={!plan.fresh.length || busy} onClick={run}>{busy ? 'Importing…' : plan.fresh.length ? 'Import ' + plan.fresh.length + ' workouts' : 'Nothing new to import'}</Btn> : null}>
    <div style={{ padding: '14px 18px 26px' }}>
      <div style={{ ...T.body, color: C.dim, fontSize: 14 }}>Bring your Strong history in so your graphs, records and “previous” numbers include it.</div>
      <Card style={{ marginTop: 12 }}>
        <div style={{ ...T.label, marginBottom: 6 }}>IN THE STRONG APP</div>
        <div style={{ font: `400 14px/1.5 ${F.body}`, color: C.text }}>1. Open <b>Profile → Settings</b> (gear icon)<br />2. Tap <b>Export Strong Data</b><br />3. Save the file to <b>Files</b>, then choose it below</div>
      </Card>
      <input ref={fileRef} type="file" accept=".csv,text/csv,text/plain" onChange={pick} style={{ display: 'none' }} />
      <Btn kind="ghost" tone={C.olive} onClick={() => fileRef.current && fileRef.current.click()} style={{ marginTop: 12 }}>{parsed ? 'CHOOSE A DIFFERENT FILE' : 'CHOOSE STRONG CSV FILE'}</Btn>
      {err ? <div style={{ ...T.body, color: C.red, marginTop: 12, fontSize: 14 }}>{err}</div> : null}
      {plan ? <>
        <div style={{ display: 'flex', gap: 7, marginTop: 14 }}>
          {[['WORKOUTS', parsed.workouts.length], ['EXERCISES', plan.total], ['NEW', plan.fresh.length]].map(([l, v]) => <Card key={l} style={{ flex: 1, padding: '10px 10px' }}><div style={T.label}>{l}</div><div style={{ font: `700 22px/1.1 ${F.head}`, marginTop: 3 }}>{v}</div></Card>)}
        </div>
        {first ? <div style={{ ...T.label, marginTop: 10 }}>{niceDate(isoOf(new Date(first.start))).toUpperCase()} → {niceDate(isoOf(new Date(last.start))).toUpperCase()}{plan.dups ? ' · ' + plan.dups + ' ALREADY HERE, SKIPPED' : ''}</div> : null}
        {!parsed.weightUnit ? <div style={{ marginTop: 16 }}>
          <div style={{ ...T.label, marginBottom: 6 }}>WEIGHTS IN THIS FILE ARE IN</div>
          <div style={{ display: 'flex', gap: 6 }}>{[['kg', 'KG'], ['lb', 'LB']].map(([v, l]) => <Chip key={v} on={unit === v} tone={C.olive} ink={C.oliveInk} onClick={() => setUnit(v)} style={{ flex: 1, textAlign: 'center' }}>{l}</Chip>)}</div>
        </div> : <div style={{ ...T.label, marginTop: 8 }}>WEIGHTS READ AS {parsed.weightUnit === 'row' ? 'THE UNIT ON EACH ROW' : parsed.weightUnit.toUpperCase()}</div>}
        <div style={{ ...T.label, margin: '16px 0 6px' }}>{plan.matched} OF {plan.total} EXERCISES MATCHED YOUR LIST</div>
        {plan.newEx.length ? <Card>
          <div style={{ ...T.label, marginBottom: 6 }}>WILL BE ADDED AS YOUR OWN EXERCISES</div>
          {plan.newEx.map(e => <div key={e.id} style={{ ...T.name, fontSize: 14, padding: '3px 0' }}>{e.name} <span style={{ ...T.label }}>· {({ wr: 'WEIGHT × REPS', r: 'REPS', d: 'TIME', dt: 'DISTANCE' })[e.type]}</span></div>)}
        </Card> : null}
        <div style={{ ...T.label, marginTop: 14, color: C.faint, lineHeight: 1.6 }}>IMPORTED WORKOUTS DON’T CHANGE YOUR 70-DAY BOARD OR STREAK. IMPORTING THE SAME FILE AGAIN SKIPS WORKOUTS YOU ALREADY HAVE.</div>
      </> : null}
    </div>
  </Sheet>;
}


// Month calendar of completed workouts (History tab). Tap a day to open its workout, or add one within 14 days.
function WorkoutCalendar({ st, onDay }) {
  const [month, setMonth] = useState(() => st.curDate.slice(0, 7));   // 'YYYY-MM'
  const byDate = {};
  for (const w of st.workouts || []) (byDate[w.date] = byDate[w.date] || []).push(w);
  const [y, m] = month.split('-').map(Number), first = new Date(y, m - 1, 1), days = new Date(y, m, 0).getDate();
  const lead = (first.getDay() + 6) % 7;                                // Monday first
  const cells = Array.from({ length: lead }, () => null).concat(Array.from({ length: days }, (_, i) => y + '-' + pad2(m) + '-' + pad2(i + 1)));
  const shift = d => { const t = new Date(y, m - 1 + d, 1); setMonth(t.getFullYear() + '-' + pad2(t.getMonth() + 1)); };
  const count = cells.filter(c => c && byDate[c]).length;
  const earliest = Object.keys(byDate).sort()[0];
  const canBack = !earliest || month > earliest.slice(0, 7), canFwd = month < st.curDate.slice(0, 7);
  return <Card style={{ marginBottom: 16, padding: '12px 12px 10px' }}>
    <div {...swipeNav(() => canFwd && shift(1), () => canBack && shift(-1))}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span role="button" onClick={() => (!earliest || month > earliest.slice(0, 7)) && shift(-1)} style={{ ...T.mono, fontSize: 16, color: earliest && month > earliest.slice(0, 7) ? C.olive : C.faint, padding: '6px 12px', cursor: 'pointer' }}>‹</span>
      <div style={{ textAlign: 'center' }}><div style={{ font: `700 16px/1 ${F.head}`, letterSpacing: '.12em', textTransform: 'uppercase' }}>{MON[m - 1]} {y}</div>
        <div style={{ ...T.label, marginTop: 4 }}>{count} {count === 1 ? 'WORKOUT DAY' : 'WORKOUT DAYS'}</div></div>
      <span role="button" onClick={() => month < st.curDate.slice(0, 7) && shift(1)} style={{ ...T.mono, fontSize: 16, color: month < st.curDate.slice(0, 7) ? C.olive : C.faint, padding: '6px 12px', cursor: 'pointer' }}>›</span>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginTop: 10 }}>
      {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <div key={i} style={{ ...T.label, textAlign: 'center', fontSize: 9 }}>{d}</div>)}
      {cells.map((c, i) => {
        if (!c) return <div key={i} />;
        const list = byDate[c] || [], isToday = c === st.curDate, future = c > st.curDate, editable = !future && daysAgo(st, c) <= EDIT_DAYS;
        return <div key={i} role="button" onClick={() => !future && onDay(c, list)} style={{ aspectRatio: '1', borderRadius: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, cursor: future ? 'default' : 'pointer',
          background: list.length ? C.olive : 'transparent', border: '1px solid ' + (isToday ? C.amber : list.length ? C.olive : editable ? C.line2 : 'transparent'),
          color: list.length ? C.oliveInk : future ? C.line2 : editable ? C.text : C.faint, font: `600 13px/1 ${F.mono}` }}>
          {Number(c.slice(8))}
          {list.length > 1 ? <span style={{ font: `700 8px/1 ${F.mono}` }}>×{list.length}</span> : null}
        </div>;
      })}
    </div>
    </div>
    <div style={{ ...T.label, marginTop: 9, color: C.faint, lineHeight: 1.5 }}>FILLED = WORKOUT DONE · OUTLINED DAYS (LAST {EDIT_DAYS}) CAN STILL BE EDITED OR ADDED TO</div>
  </Card>;
}

// ── All-time stats & records (🏆 on the History tab) ──
function AllTime({ st, onClose, onExercise, onCheck }) {
  const [showAll, setShowAll] = useState(false);
  const ws = st.workouts || [];
  const tot = { time: 0, vol: 0, sets: 0, reps: 0, dist: 0 }, per = {}, weeks = {};
  let biggest = null, longest = null;
  for (const w of ws) {
    const v = w.volume != null ? w.volume : workoutVolume(w), dur = (w.end - w.start) / 1000;
    tot.time += dur; tot.vol += v;
    if (!biggest || v > biggest.v) biggest = { v, w };
    if (!longest || dur > longest.d) longest = { d: dur, w };
    const d = dOf(w.date), mon = isoOf(new Date(d.getFullYear(), d.getMonth(), d.getDate() - (d.getDay() + 6) % 7)); weeks[mon] = (weeks[mon] || 0) + 1;
    for (const e of w.exercises) {
      const R = per[e.exId] || (per[e.exId] = { exId: e.exId, name: e.name, type: e.type, n: 0, heavy: 0, heavyD: '', e1rm: 0, e1rmD: '', vol: 0, reps: 0, time: 0, dist: 0 });
      R.n++;
      for (const s of e.sets) {
        if (s.done === false) continue;
        tot.sets++; tot.reps += s.r || 0; tot.dist += s.d || 0;
        if ((s.w || 0) > R.heavy) { R.heavy = s.w; R.heavyD = w.date; }
        const e1 = est1rm(s); if (e1 > R.e1rm) { R.e1rm = e1; R.e1rmD = w.date; }
        R.vol = Math.max(R.vol, (s.w || 0) * (s.r || 0)); R.reps = Math.max(R.reps, s.r || 0); R.time = Math.max(R.time, s.t || 0); R.dist = Math.max(R.dist, s.d || 0);
      }
    }
  }
  const prs = ws.flatMap(w => (w.prs || []).map(p => ({ ...p, date: w.date }))).reverse();
  const bestWeek = Object.entries(weeks).sort((a, b) => b[1] - a[1])[0];
  const recs = Object.values(per).sort((a, b) => b.n - a.n);
  const unit = wUnit(st), W = kg => Math.round(st.imperial ? kg * 2.20462 : kg).toLocaleString();
  const tile = (l, v, sub) => <Card style={{ padding: '10px 11px' }}><div style={T.label}>{l}</div><div style={{ font: `700 21px/1.1 ${F.head}`, marginTop: 4 }}>{v}</div>{sub ? <div style={{ ...T.label, marginTop: 3 }}>{sub}</div> : null}</Card>;
  const recLine = R => R.type === 'wr' ? [['HEAVIEST', wDisp(st, R.heavy) + ' ' + unit, R.heavyD], ['EST. 1RM', wDisp(st, r1(R.e1rm)) + ' ' + unit, R.e1rmD], ['BEST SET', wDisp(st, R.vol) + ' ' + unit]]
    : R.type === 'r' ? [['MOST REPS', R.reps + '']] : R.type === 'd' ? [['LONGEST', fmtDur(R.time)]] : [['LONGEST', r2(R.dist) + ' km'], ['LONGEST TIME', fmtDur(R.time)]];
  const lastSat = (() => { const d = dOf(st.curDate); d.setDate(d.getDate() - ((d.getDay() + 1) % 7 || 7)); return isoOf(d); })();
  const reports = Array.from({ length: 8 }, (_, i) => addDaysIso(lastSat, -6 - 7 * i)).filter(s0 => ws.some(w => w.date >= s0 && w.date <= addDaysIso(s0, 6)) || Object.keys(st.diary || {}).some(d => d >= s0 && d <= addDaysIso(s0, 6)));
  return <Sheet z={55} title="All time" sub={ws.length ? 'SINCE ' + niceDate(ws[0].date).toUpperCase() : 'NO WORKOUTS YET'} left={<TopLink onClick={onClose}>‹ BACK</TopLink>}>
    <div style={{ padding: '14px 18px 30px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
        {tile('TOTAL LIFTED', W(tot.vol) + ' ' + unit, tot.vol >= 1000 ? r1(tot.vol / 1000).toLocaleString() + ' TONNES' : null)}
        {tile('WORKOUTS', ws.length.toLocaleString(), fmtMin(tot.time).toUpperCase() + ' TRAINING')}
        {tile('SETS · REPS', tot.sets.toLocaleString() + ' · ' + tot.reps.toLocaleString())}
        {tile('PERSONAL RECORDS', prs.length.toLocaleString(), tot.dist ? r1(tot.dist) + ' KM COVERED' : null)}
      </div>
      {ws.length ? <>
        <div style={{ ...T.h2, margin: '22px 0 8px' }}>Milestones</div>
        {[biggest && ['Biggest session', W(biggest.v) + ' ' + unit, biggest.w.name + ' · ' + niceDate(biggest.w.date)],
          longest && ['Longest workout', fmtMin(longest.d), longest.w.name + ' · ' + niceDate(longest.w.date)],
          bestWeek && ['Most in a week', bestWeek[1] + ' workouts', 'Week of ' + niceDate(bestWeek[0])],
          ['First workout', niceDate(ws[0].date), ws[0].name]].filter(Boolean).map(([l, v, sub]) =>
          <div key={l} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '10px 0', borderBottom: '1px solid #272c34' }}>
            <div><div style={T.name}>{l}</div><div style={{ ...T.label, marginTop: 3 }}>{sub.toUpperCase()}</div></div><div style={{ font: `700 18px/1.2 ${F.head}`, flex: 'none' }}>{v}</div></div>)}

        <div style={{ ...T.h2, margin: '22px 0 8px' }}>Records</div>
        {(showAll ? recs : recs.slice(0, 10)).map(R => <div key={R.exId} role="button" onClick={() => onExercise(R.exId)} style={{ padding: '10px 0', borderBottom: '1px solid #272c34', cursor: 'pointer' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={T.name}>{R.name}</span><span style={{ ...T.label }}>{R.n} {R.n === 1 ? 'SESSION' : 'SESSIONS'} ›</span></div>
          <div style={{ display: 'flex', gap: 14, marginTop: 5, flexWrap: 'wrap' }}>{recLine(R).map(([l, v]) => <div key={l}><div style={{ ...T.label, fontSize: 9 }}>{l}</div><div style={{ ...T.mono, fontSize: 13, color: C.text, marginTop: 2 }}>{v}</div></div>)}</div>
        </div>)}
        {recs.length > 10 ? <Btn kind="ghost" tone={C.olive} onClick={() => setShowAll(!showAll)} style={{ marginTop: 10, minHeight: 42 }}>{showAll ? 'SHOW FEWER' : 'SHOW ALL ' + recs.length + ' EXERCISES'}</Btn> : null}

        <div style={{ ...T.h2, margin: '22px 0 8px' }}>Recent PRs</div>
        {prs.length ? prs.slice(0, 15).map((p, i) => <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '8px 0', borderBottom: '1px solid #272c34' }}>
          <div><div style={{ ...T.name, fontSize: 14 }}>🏆 {p.ex}</div><div style={{ ...T.label, marginTop: 2 }}>{p.what.toUpperCase()} · {niceDate(p.date).toUpperCase()}</div></div>
          <div style={{ ...T.mono, fontSize: 13, color: C.amber, flex: 'none' }}>{p.val}</div></div>) : <Empty>BEAT A PREVIOUS BEST AND IT SHOWS UP HERE</Empty>}
      </> : <Empty>FINISH A WORKOUT (OR IMPORT FROM STRONG) TO START YOUR RECORDS</Empty>}

      {ws.length ? <Btn kind="ghost" tone={C.olive} onClick={onCheck} style={{ marginTop: 20 }}>🧹 CHECK LIFT DATA FOR MISTAKES</Btn> : null}
      {reports.length ? <>
        <div style={{ ...T.h2, margin: '22px 0 8px' }}>Weekly reports</div>
        {reports.map(s0 => <div key={s0} role="button" onClick={() => window.SHReport && window.SHReport.open(s0)} style={{ display: 'flex', justifyContent: 'space-between', padding: '11px 0', borderBottom: '1px solid #272c34', cursor: 'pointer' }}>
          <span style={T.name}>{weekLabel(s0)}</span><span style={{ ...T.mono, fontSize: 11, color: C.olive }}>VIEW ›</span></div>)}
      </> : null}
    </div>
  </Sheet>;
}
const weekLabel = s0 => { const a = dOf(s0), b = dOf(addDaysIso(s0, 6)); return MON[a.getMonth()] + ' ' + a.getDate() + ' – ' + (a.getMonth() === b.getMonth() ? '' : MON[b.getMonth()] + ' ') + b.getDate(); };


// Exercise trends: search any exercise, or (no search) the top 5 core lifts for a body part.
const CORE_LIFTS = {
  Chest: ['bench', 'incline-bb', 'bench-db', 'incline-db', 'dip', 'chest-press', 'fly-cable'],
  Back: ['deadlift', 'row-bb', 'pullup', 'pulldown', 'row-cable', 'row-db', 'chinup'],
  Legs: ['squat', 'rdl', 'leg-press', 'front-squat', 'hip-thrust', 'split-squat', 'leg-curl'],
  Shoulders: ['ohp', 'ohp-db', 'lateral', 'push-press', 'arnold', 'facepull', 'rear-delt'],
  Arms: ['curl-bb', 'cgbp', 'curl-db', 'skull', 'hammer', 'pushdown', 'oh-tri'],
  Core: ['hlr', 'ab-wheel', 'cable-crunch', 'plank', 'pallof', 'dead-bug', 'side-plank'],
  Cardio: ['run', 'row-erg', 'cycle', 'bike-int', 'incline-walk', 'swim', 'stairs'],
  'Full Body': ['farmer', 'kb-swing', 'sled', 'thruster', 'burpee', 'kb-tgu', 'box-jump'],
  Olympic: ['clean', 'snatch', 'clean-jerk', 'hang-clean', 'trap-jump']
};
function TrendRow({ st, id, n, onExercise }) {
  const ex = exById(st, id), M = METRICS[ex.type] || METRICS.wr, metric = M[0][0], pts = n ? seriesFor(st, id, metric) : [], tt = pts.length ? trendText(st, pts, metric) : '';
  return <div role="button" onClick={() => onExercise(id)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid #272c34', cursor: 'pointer' }}>
    <div style={{ flex: 1, minWidth: 0 }}><div style={{ ...T.name, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: pts.length ? C.text : C.dim }}>{ex.name}</div>
      <div style={{ ...T.label, marginTop: 3, color: tt.startsWith('▲') ? C.olive : tt.startsWith('▼') ? C.red : C.mute }}>{pts.length ? M[0][1] + ' ' + metricFmt(st, metric)(pts[pts.length - 1].y) + ' · ' + tt : 'NOT LOGGED YET'}</div></div>
    {pts.length > 1 ? <Sparkline values={pts.map(p => p.y)} tone={C.olive} /> : null}
    <span style={{ ...T.mono, color: C.dim }}>›</span>
  </div>;
}
function ExerciseTrends({ st, freq, onExercise }) {
  const [q, setQ] = useState('');
  const partOf = id => exById(st, id).part;
  const parts = Object.keys(CORE_LIFTS).concat('Other').filter(p => p !== 'Other' || Object.keys(freq).some(id => partOf(id) === 'Other'));
  const byPart = p => Object.keys(freq).filter(id => partOf(id) === p).reduce((a, id) => a + freq[id], 0);
  const [part, setPart] = useState(() => parts.slice().sort((a, b) => byPart(b) - byPart(a))[0] || 'Chest');
  // top five: your most-trained lifts for that body part, topped up with the standard core lifts
  const top5 = (() => {
    const mine = Object.keys(freq).filter(id => partOf(id) === part).sort((a, b) => freq[b] - freq[a]);
    return mine.concat((CORE_LIFTS[part] || []).filter(id => !mine.includes(id) && EX_LIB.some(e => e.id === id))).slice(0, 5);
  })();
  const found = q.trim() ? allExercises(st).filter(e => exMatch(e, q, 'All', 'Any')).sort((a, b) => ((freq[b.id] || 0) - (freq[a.id] || 0)) || a.name.localeCompare(b.name)).slice(0, 40) : [];
  return <div>
    <div style={{ ...T.h2, margin: '20px 0 8px' }}>Exercise trends</div>
    <Field value={q} onChange={setQ} placeholder="🔍  Search any exercise for its trend" />
    {q.trim() ? <>
      <div style={{ ...T.label, margin: '10px 0 2px' }}>{found.length ? found.length + (found.length === 40 ? '+' : '') + ' MATCHES · LOGGED ONES FIRST' : 'NO EXERCISE MATCHES “' + q.trim().toUpperCase() + '”'}</div>
      {found.map(e => <TrendRow key={e.id} st={st} id={e.id} n={freq[e.id] || 0} onExercise={onExercise} />)}
    </> : <>
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', margin: '10px -22px 2px', padding: '0 22px 4px' }}>
        {parts.map(p => <Chip key={p} on={part === p} tone={C.olive} ink={C.oliveInk} onClick={() => setPart(p)}>{p.toUpperCase()}</Chip>)}
      </div>
      <div style={{ ...T.label, margin: '8px 0 2px' }}>TOP 5 {part.toUpperCase()} LIFTS · TAP FOR THE FULL GRAPH</div>
      {top5.map(id => <TrendRow key={id} st={st} id={id} n={freq[id] || 0} onExercise={onExercise} />)}
    </>}
  </div>;
}

// ── Data check: find lifts that were probably converted wrong (lb ↔ kg, a slipped decimal, miles/metres) ──
// Each session's top weight is compared with the median of the nearby sessions of the same exercise. A session
// that is ~2.2× (or ~0.45×) your usual and lands back in range after a lb↔kg conversion gets a suggested fix.
const LB = 0.45359237;
const median = a => { const b = a.slice().sort((x, y) => x - y), m = b.length >> 1; return b.length ? (b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2) : 0; };
function findOddSets(st) {
  const ws = (st.workouts || []).slice().sort((a, b) => a.start - b.start), byEx = {}, issues = [];
  ws.forEach(w => w.exercises.forEach((e, ei) => {
    if (e.type !== 'wr' && e.type !== 'dt') return;
    const val = s => e.type === 'wr' ? s.w : s.d;
    const work = e.sets.filter(s => s.done !== false && s.kind !== 'w' && val(s) > 0);
    if (!work.length) return;
    (byEx[e.exId] = byEx[e.exId] || { name: e.name, type: e.type, list: [] }).list.push({ w, ei, top: median(work.map(val)), vals: e.sets.map(val), kinds: e.sets.map(s => s.kind), work: e.sets.map(s => s.done !== false && s.kind !== 'w' && val(s) > 0) });
  }));
  const near = (x, lo, hi) => x >= lo && x <= hi;
  for (const exId in byEx) {
    const { name, type, list } = byEx[exId];
    if (list.length < 3) continue;
    list.forEach((S, i) => {
      const nb = list.filter((_, j) => j !== i && Math.abs(j - i) <= 6).map(x => x.top);
      if (nb.length < 2) return;
      const ref = median(nb), r = S.top / ref;
      let fix = null;
      if (type === 'wr') {
        if (near(r, 1.8, 2.8) && near(S.top * LB / ref, 0.75, 1.3)) fix = { f: LB, why: 'about 2.2× your usual — looks like pounds saved as kg' };
        else if (near(r, 0.33, 0.56) && near(S.top / LB / ref, 0.75, 1.3)) fix = { f: 1 / LB, why: 'about 0.45× your usual — looks like kg saved as pounds' };
        else if (near(r, 7, 13) && near(S.top / 10 / ref, 0.7, 1.3)) fix = { f: 0.1, why: 'about 10× your usual — looks like a slipped decimal' };
        else if (near(r, 0.07, 0.14) && near(S.top * 10 / ref, 0.7, 1.3)) fix = { f: 10, why: 'about a tenth of your usual — looks like a missing digit' };
      } else {
        if (near(r, 500, 2000)) fix = { f: 0.001, why: 'about 1000× your usual — looks like metres saved as km' };
        else if (near(r, 1.45, 1.8) && near(S.top / 1.609344 / ref, 0.8, 1.25)) fix = { f: 1 / 1.609344, why: 'about 1.6× your usual — looks like km saved as miles' };
        else if (near(r, 0.55, 0.69) && near(S.top * 1.609344 / ref, 0.8, 1.25)) fix = { f: 1.609344, why: 'about 0.6× your usual — looks like miles saved as km' };
      }
      if (fix) { issues.push({ key: S.w.id + ':' + S.ei, wid: S.w.id, ei: S.ei, exId, name, type, date: S.w.date, top: S.top, ref, ...fix, kind: 'session' }); return; }
      // one set way off from the rest of the same session (e.g. 850 among 85s, or 38 among 85s)
      if (type === 'wr') S.vals.forEach((v, si) => {
        if (!(v > 0) || S.kinds[si] === 'd') return;   // drop sets are meant to be lighter
        if (!S.work[si]) return;
        const others = S.vals.filter((x, k) => k !== si && x > 0 && S.work[k]);
        if (others.length < 2) return;
        const m = median(others), rr = v / m;
        let f = null, why = '';
        if (near(rr, 1.9, 2.6) && near(v * LB / m, 0.8, 1.2)) { f = LB; why = 'one set ~2.2× the rest — pounds saved as kg?'; }
        else if (near(rr, 8, 12) && near(v / 10 / m, 0.8, 1.2)) { f = 0.1; why = 'one set ~10× the rest — slipped decimal?'; }
        else if (near(rr, 0.38, 0.52) && near(v / LB / m, 0.85, 1.15)) { f = 1 / LB; why = 'one set ~0.45× the rest — kg saved as pounds?'; }
        else if (near(rr, 0.08, 0.12) && near(v * 10 / m, 0.85, 1.15)) { f = 10; why = 'one set ~a tenth of the rest — missing digit?'; }
        if (f) issues.push({ key: S.w.id + ':' + S.ei + ':' + si, wid: S.w.id, ei: S.ei, si, exId, name, type, date: S.w.date, top: v, ref: m, f, why, kind: 'set' });
      });
    });
  }
  return issues;
}
// Suggestions you've already dealt with (fixed, or unticked as “that was real”) don't come back.
const openOddSets = st => { const ig = new Set(st.dataFixIgnored || []); return findOddSets(st).filter(i => !ig.has(i.key)); };
// Rebuild volume and PRs for every workout, in date order (after fixes or undo).
function recomputeWorkouts(st, workouts) {
  const all = workouts.slice().sort((a, b) => a.start - b.start).map(w => { const x = { ...w }; x.volume = workoutVolume(x); return x; });
  const view = { ...st, workouts: all };
  all.forEach(w => { w.prs = findPRs(view, w); });
  return all;
}
function DataFix({ app, st, onClose }) {
  const issues = useMemo(() => openOddSets(st), [st.workouts, st.dataFixIgnored]);
  const [off, setOff] = useState({});
  const unitOf = t => t === 'wr' ? wUnit(st) : 'km', show = (t, v) => t === 'wr' ? wDisp(st, r2(v)) : r2(v);
  const apply = () => {
    const pick = issues.filter(i => !off[i.key]), keep = issues.filter(i => off[i.key]).map(i => i.key);
    if (!pick.length) { markReal(); return; }
    const log = [];
    const ws = (st.workouts || []).map(w => {
      const mine = pick.filter(i => i.wid === w.id); if (!mine.length) return w;
      return { ...w, exercises: w.exercises.map((e, ei) => {
        const fx = mine.filter(i => i.ei === ei); if (!fx.length) return e;
        return { ...e, sets: e.sets.map((s, si) => {
          const hit = fx.find(i => i.kind === 'session' || i.si === si); if (!hit) return s;
          const k = e.type === 'wr' ? 'w' : 'd'; if (!(s[k] > 0)) return s;
          // whole-session fix: only touch sets that land in a believable range (keeps a real 40 kg warm-up from becoming 400)
          if (hit.kind === 'session' && !(s[k] * hit.f >= hit.ref * 0.15 && s[k] * hit.f <= hit.ref * 1.35)) return s;
          log.push({ wid: w.id, ei, si, k, from: s[k] });
          return { ...s, [k]: r2(s[k] * hit.f) };
        }) };
      }) };
    });
    app.setState({ workouts: recomputeWorkouts(st, ws), dataFixUndo: log, dataFixIgnored: (st.dataFixIgnored || []).concat(keep) });
    alert('Fixed ' + log.length + (log.length === 1 ? ' set' : ' sets') + '. Graphs, records and PRs have been recalculated.');
    onClose();
  };
  const markReal = () => { app.setState({ dataFixIgnored: (st.dataFixIgnored || []).concat(issues.map(i => i.key)) }); onClose(); };
  const undo = () => {
    const log = st.dataFixUndo || []; if (!log.length) return;
    const ws = (st.workouts || []).map(w => { const mine = log.filter(l => l.wid === w.id); if (!mine.length) return w;
      return { ...w, exercises: w.exercises.map((e, ei) => ({ ...e, sets: e.sets.map((s, si) => { const l = mine.find(x => x.ei === ei && x.si === si); return l ? { ...s, [l.k]: l.from } : s; }) })) }; });
    app.setState({ workouts: recomputeWorkouts(st, ws), dataFixUndo: null });
    alert('Undone — your ' + log.length + ' sets are back to how they were.');
  };
  const groups = {};
  issues.forEach(i => (groups[i.name] = groups[i.name] || []).push(i));
  const n = issues.filter(i => !off[i.key]).length;
  return <Sheet z={57} title="Check lift data" sub={issues.length ? issues.length + ' THINGS LOOK OFF' : 'NOTHING LOOKS OFF'} left={<TopLink onClick={onClose}>‹ BACK</TopLink>}
    footer={issues.length ? <div style={{ display: 'flex', gap: 8 }}>
      <Btn kind="ghost" tone={C.dim} onClick={markReal} style={{ flex: 1, padding: '0 8px' }}>ALL CORRECT</Btn>
      <Btn tone={C.olive} ink={C.oliveInk} onClick={apply} style={{ flex: 2 }}>{n ? 'Fix ' + n + (n < issues.length ? ' · keep ' + (issues.length - n) : '') : 'Keep all as they are'}</Btn></div> : null}>
    <div style={{ padding: '14px 18px 30px' }}>
      <div style={{ ...T.body, color: C.dim, fontSize: 14 }}>Each session is compared with your nearby sessions of the same exercise. When a number only makes sense after a pounds↔kilograms (or decimal) correction, it’s listed here. Untick anything that was real — it won’t be suggested again.</div>
      {!issues.length ? <Empty>ALL YOUR LIFTS LINE UP · NOTHING TO FIX</Empty> : null}
      {Object.entries(groups).map(([name, list]) => <div key={name}>
        <div style={{ ...T.h2, margin: '20px 0 6px' }}>{name}</div>
        {list.map(i => { const on = !off[i.key]; return <div key={i.key} role="button" onClick={() => setOff(o => ({ ...o, [i.key]: on }))} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 0', borderBottom: '1px solid #272c34', cursor: 'pointer' }}>
          <div style={{ width: 22, height: 22, flex: 'none', marginTop: 2, borderRadius: 7, border: '1.5px solid ' + (on ? C.olive : C.line2), background: on ? C.olive : 'transparent', color: C.oliveInk, display: 'flex', alignItems: 'center', justifyContent: 'center', font: `700 13px/1 ${F.mono}` }}>{on ? '✓' : ''}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><span style={T.name}>{niceDate(i.date)}{i.kind === 'set' ? ' · set ' + (i.si + 1) : ' · whole session'}</span>
              <span style={{ ...T.mono, fontSize: 12, color: C.text, flex: 'none' }}><span style={{ color: C.red, textDecoration: 'line-through' }}>{show(i.type, i.top)}</span>{i.kind === 'session' ? <span style={{ color: C.dim }}> typ.</span> : null} → <span style={{ color: C.olive }}>{show(i.type, i.top * i.f)}</span> {unitOf(i.type)}</span></div>
            <div style={{ ...T.label, marginTop: 3, lineHeight: 1.45 }}>{i.why.toUpperCase()} ({i.kind === 'set' ? 'REST OF THE SESSION' : 'NEARBY SESSIONS'} ≈ {show(i.type, i.ref)} {unitOf(i.type).toUpperCase()})</div>
          </div>
        </div>; })}
      </div>)}
      {(st.dataFixUndo || []).length ? <Btn kind="ghost" tone={C.dim} onClick={undo} style={{ marginTop: 20 }}>UNDO LAST FIX ({st.dataFixUndo.length} SETS)</Btn> : null}
    </div>
  </Sheet>;
}
