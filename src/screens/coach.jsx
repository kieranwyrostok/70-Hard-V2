// ── COACH: chat with Claude about your food, training and habits; it can log and adjust things ──
const DEF_REM = { on: true, t: 1200, days: [1, 1, 1, 1, 1, 1, 1] };
const hhmmToMin = s => { const m = String(s || '').match(/^(\d{1,2}):(\d{2})$/); return m ? (parseInt(m[1], 10) % 24) * 60 + (parseInt(m[2], 10) % 60) : null; };
const minToHhmm = t => pad2(Math.floor(t / 60) % 24) + ':' + pad2(t % 60);

// A compact picture of the user's data for Claude.
function coachContext(app, st) {
  const SH = window.SH, today = st.curDate, dn = app.dayNum();
  const rules = (st.ruleDefs || []).filter(r => r.on);
  const rname = r => (app.hLabel ? app.hLabel(r).name : r.name) || r.name;
  const tot = list => sumN(list || []);
  const days = [];
  for (let i = 13; i >= 1; i--) {
    const d = addDaysIso(today, -i), diary = (st.diary || {})[d];
    const h = Object.values(st.history || {}).find(x => x.date === d);
    if (!diary && !h) continue;
    const t = diary ? tot(diary.meals) : { kcal: h.kcal || 0, p: h.p || 0, c: 0, f: 0 };
    days.push({ date: d, kcal: Math.round(t.kcal), protein_g: r1(t.p), carbs_g: r1(t.c), fat_g: r1(t.f), items_logged: diary ? diary.meals.length : (h.meals || 0), water_l: r1(((diary ? diary.waterMl : h.waterMl) || 0) / 1000),
      missed_rules: h ? (h.rules || []).filter(k => !(h.done || {})[k]).map(k => { const r = (st.ruleDefs || []).find(x => x.k === k); return r ? rname(r) : k; }) : undefined,
      workouts: (st.workouts || []).filter(w => w.date === d).map(w => w.name) });
  }
  const wlog = ((st.measLog || {}).weight) || {};
  const weight = (st.meas || []).find(m => m.k === 'weight');
  const weightLog = [{ day: 1, kg: weight ? weight.start : null }].concat(Object.keys(wlog).map(Number).sort((a, b) => a - b).map(n => ({ day: n, kg: wlog[n] })));
  const food = f => { const nf = normFood(f); return { name: nf.name, brand: nf.brand || undefined, serving: nf.servLabel, grams_per_serving: nf.servG || undefined, kcal: Math.round(nf.perServ.kcal), protein_g: r1(nf.perServ.p), carbs_g: r1(nf.perServ.c), fat_g: r1(nf.perServ.f) }; };
  const t0 = tot(st.meals);
  return {
    now: niceDate(today) + ' ' + SH.nowHM(),
    challenge: { day: dn, of: 70, start_date: st.startDate },
    profile: st.setup ? { name: st.setup.name, sex: st.setup.sex, age: st.setup.age, height_cm: st.setup.height, start_weight_kg: st.setup.weight, goal: st.setup.goal, units: st.imperial ? 'imperial' : 'metric' } : undefined,
    meal_sections: slotsOf(st).map(([id, name, sh]) => ({ id, name, kcal_goal: Math.round(st.targets.kcal * sh) })),
    targets: { kcal: st.targets.kcal, protein_g: st.targets.p, carbs_g: st.targets.c, fat_g: st.targets.f, water_ml: st.waterGoal },
    today: {
      eaten: { kcal: Math.round(t0.kcal), protein_g: r1(t0.p), carbs_g: r1(t0.c), fat_g: r1(t0.f) }, water_ml: st.waterMl,
      meals: (st.meals || []).map(m => ({ slot: m.slot, time: m.time, name: m.name, kcal: Math.round(m.kcal), protein_g: m.p })),
      rules: rules.map(r => ({ key: r.k, name: rname(r), done: !!(st.done || {})[r.k], reminder: (st.rem || {})[r.k] ? ((st.rem[r.k].on ? minToHhmm(st.rem[r.k].t) : 'off')) : undefined }))
    },
    previous_days: days,
    weight_log_kg: weightLog.filter(x => x.kg != null),
    measurements: (st.meas || []).filter(m => m.k !== 'weight').map(m => ({ site: m.name, unit: m.u, day1: m.start, now: m.cur })),
    saved_meals: (st.regulars || []).map(r => { const t = tot(r.items); return { name: r.name, slot: r.slot, kcal: Math.round(t.kcal), protein_g: r1(t.p), items: r.items.map(i => i.name) }; }),
    my_foods: (st.customFoods || []).slice(0, 30).map(food),
    recent_foods: (st.recentFoods || []).slice(0, 20).map(food),
    training: {
      templates: (st.templates || []).map(t => ({ name: t.name, day: t.day != null ? SH.PLAN[t.day].abbr : 'any', exercises: t.exercises.map(e => exById(st, e.exId).name) })),
      recent_workouts: (st.workouts || []).slice(-8).map(w => ({ date: w.date, name: w.name, minutes: Math.round((w.end - w.start) / 60000), volume_kg: w.volume, exercises: w.exercises.map(e => e.name + ' ' + e.sets.map(s => setText({ imperial: false }, e.type, s)).join(', ')) }))
    }
  };
}

// Carry out Claude's requested actions. Returns human-readable lines.
function runCoachActions(app, actions) {
  const SH = window.SH, lines = [];
  const st = app.state, today = st.curDate;
  const dateOf = d => d === 'yesterday' ? addDaysIso(today, -1) : today;
  const addMeals = (date, entries) => app.setState(s => {
    if (date === s.curDate) return { meals: (s.meals || []).concat(entries) };
    const d = (s.diary || {})[date] || { meals: [], waterMl: 0 }, nd = { ...d, meals: d.meals.concat(entries) };
    let history = s.history; const n = Object.keys(history || {}).find(k => history[k].date === date);
    if (n) { const t = sumN(nd.meals); history = { ...history, [n]: { ...history[n], kcal: Math.round(t.kcal), p: r1(t.p), meals: nd.meals.length } }; }
    return { diary: { ...(s.diary || {}), [date]: nd }, history };
  });
  useSlots(st);
  const slotName = s => slotLabel(s);
  // Claude may name a section by id or by name; fall back to the time of day
  const fixSlot = v => { if (!v) return null; const q = String(v).toLowerCase(); const m = SLOTS.find(x => x[0].toLowerCase() === q) || SLOTS.find(x => x[1].toLowerCase() === q) || SLOTS.find(x => x[1].toLowerCase().startsWith(q.replace(/s$/, ''))); return m ? m[0] : null; };
  const guessSlot = () => { const h = new Date().getHours(), want = h < 11 ? 'BREAKFAST' : h < 15 ? 'LUNCH' : h < 21 ? 'DINNER' : 'SNACK'; return fixSlot(want) || (h < 11 ? SLOTS[0][0] : SLOTS[SLOTS.length - 1][0]); };
  const findRule = key => (app.state.ruleDefs || []).find(r => r.on && (r.k === key || (r.name || '').toLowerCase() === String(key).toLowerCase()));
  for (const a of actions || []) {
    const x = a.input || {};
    try {
      if (a.name === 'log_saved_meal') {
        const q = String(x.meal_name || '').toLowerCase().trim();
        const r = (st.regulars || []).find(m => m.name.toLowerCase() === q) || (st.regulars || []).find(m => m.name.toLowerCase().includes(q) || q.includes(m.name.toLowerCase()));
        if (!r) { lines.push('Couldn’t find a saved meal called “' + x.meal_name + '”'); continue; }
        const slot = fixSlot(x.slot) || fixSlot(r.slot) || guessSlot(), date = dateOf(x.day);
        addMeals(date, r.items.map(m => ({ ...m, id: 'm' + uid(), time: SH.nowHM(), slot })));
        lines.push('Logged ' + r.name + ' → ' + slotName(slot) + (date !== today ? ' (yesterday)' : '') + ' · ' + Math.round(sumN(r.items).kcal) + ' kcal');
      } else if (a.name === 'log_foods') {
        const date = dateOf(x.day), items = (x.items || []).slice(0, 20);
        const entries = items.map(i => ({ id: 'm' + uid(), time: SH.nowHM(), slot: fixSlot(i.slot) || guessSlot(), name: String(i.name || 'Food'), serv: i.amount || (i.grams ? i.grams + ' g' : '1 serving'), g: i.grams || null, src: 'COACH',
          kcal: Math.round(Number(i.kcal) || 0), p: r1(i.protein_g), c: r1(i.carbs_g), f: r1(i.fat_g) }));
        if (!entries.length) continue;
        addMeals(date, entries);
        const t = sumN(entries);
        lines.push('Logged ' + entries.map(e => e.name).join(', ') + ' → ' + [...new Set(entries.map(e => slotName(e.slot)))].join(' + ') + (date !== today ? ' (yesterday)' : '') + ' · ' + Math.round(t.kcal) + ' kcal · P ' + r1(t.p) + ' g');
      } else if (a.name === 'set_targets') {
        const n = v => (v == null || isNaN(Number(v)) ? null : Math.max(0, Math.round(Number(v))));
        app.setState(s => ({ targets: { kcal: n(x.kcal) ?? s.targets.kcal, p: n(x.protein_g) ?? s.targets.p, c: n(x.carbs_g) ?? s.targets.c, f: n(x.fat_g) ?? s.targets.f }, setup: { ...s.setup, targetsTouched: true } }));
        const t = app.state.targets;
        lines.push('Targets now ' + t.kcal.toLocaleString() + ' kcal · P ' + t.p + ' · C ' + t.c + ' · F ' + t.f);
      } else if (a.name === 'set_water_goal') {
        const ml = Math.max(1000, Math.min(8000, Math.round(Number(x.ml) || 0)));
        app.setState({ waterGoal: ml }); lines.push('Water goal now ' + (ml / 1000).toFixed(2) + ' L');
      } else if (a.name === 'add_water') {
        const ml = Math.max(0, Math.min(3000, Math.round(Number(x.ml) || 0))); if (!ml) continue;
        app.addWater(ml); lines.push('Added ' + ml + ' ml water');
      } else if (a.name === 'complete_rule') {
        const r = findRule(x.rule_key); if (!r) { lines.push('Couldn’t find the rule “' + x.rule_key + '”'); continue; }
        app.setState(s => ({ done: { ...s.done, [r.k]: true }, doneAt: { ...s.doneAt, [r.k]: s.doneAt[r.k] || SH.nowHM() } }));
        lines.push('Cleared ' + ((app.hLabel && app.hLabel(r).name) || r.name));
      } else if (a.name === 'set_reminder') {
        const r = findRule(x.rule_key); if (!r) { lines.push('Couldn’t find the rule “' + x.rule_key + '”'); continue; }
        const t = hhmmToMin(x.time);
        app.setState(s => { const cur = (s.rem || {})[r.k] || DEF_REM; return { rem: { ...s.rem, [r.k]: { ...cur, t: t != null ? t : cur.t, on: x.on != null ? !!x.on : true } } }; });
        const cur = app.state.rem[r.k];
        lines.push('Reminder for ' + ((app.hLabel && app.hLabel(r).name) || r.name) + ': ' + (cur.on ? minToHhmm(cur.t) : 'off'));
      } else if (a.name === 'save_meal') {
        const items = (x.items || []).map(i => ({ name: i.name, serv: i.amount || (i.grams ? i.grams + ' g' : '1 serving'), g: i.grams || null, kcal: Math.round(Number(i.kcal) || 0), p: r1(i.protein_g), c: r1(i.carbs_g), f: r1(i.fat_g), src: 'COACH' }));
        if (!items.length) continue;
        app.setState(s => ({ regulars: (s.regulars || []).filter(r => r.name.toLowerCase() !== String(x.name).toLowerCase()).concat({ id: 'r' + uid(), name: String(x.name), slot: fixSlot(x.slot) || guessSlot(), items }) }));
        lines.push('Saved meal “' + x.name + '” · ' + Math.round(sumN(items).kcal) + ' kcal');
      }
    } catch (e) { lines.push('Couldn’t do ' + a.name + ': ' + e.message); }
  }
  return lines;
}

function Rich({ text }) {
  const inline = s => String(s).split(/(\*\*[^*]+\*\*)/g).map((p, i) => p.startsWith('**') && p.endsWith('**') ? <b key={i} style={{ color: C.text }}>{p.slice(2, -2)}</b> : p);
  return <div>{String(text || '').split('\n').map((l, i) => {
    const t = l.trim();
    if (!t) return <div key={i} style={{ height: 8 }} />;
    const b = t.match(/^([-•*]|\d+[.)])\s+(.*)$/);
    if (b) return <div key={i} style={{ display: 'flex', gap: 8, marginTop: 3 }}><span style={{ color: C.blue, flex: 'none' }}>{/\d/.test(b[1]) ? b[1] : '•'}</span><span>{inline(b[2])}</span></div>;
    if (/^#+\s/.test(t)) return <div key={i} style={{ font: `700 15px/1.3 ${F.head}`, letterSpacing: '.08em', textTransform: 'uppercase', color: C.text, marginTop: 6 }}>{t.replace(/^#+\s/, '')}</div>;
    return <div key={i} style={{ marginTop: i ? 3 : 0 }}>{inline(t)}</div>;
  })}</div>;
}

const UNDO_KEYS = ['meals', 'diary', 'history', 'targets', 'waterGoal', 'waterMl', 'done', 'doneAt', 'rem', 'regulars', 'setup'];

function CoachScreen({ app, st }) {
  useSlots(st);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const scroller = useRef(null);
  const undos = useRef({});
  const chat = st.coachChat || [];
  useEffect(() => { const el = scroller.current; if (el) el.scrollTop = el.scrollHeight; }, [chat.length, busy]);
  const push = m => app.setState(s => ({ coachChat: (s.coachChat || []).concat({ id: 'c' + uid(), ...m }).slice(-60) }));

  const send = async (text, retried) => {
    text = String(text || '').trim(); if (!text || busy) return;
    if (!retried) { push({ role: 'user', content: text }); setInput(''); }
    setBusy(true);
    const history = (app.state.coachChat || []).filter(m => m.role !== 'error').slice(-14).map(m => ({ role: m.role, content: m.content + (m.done && m.done.length ? '\n(Done in the app: ' + m.done.join('; ') + ')' : '') }));
    let code = null; try { code = localStorage.getItem('coachCode'); } catch (e) { /* ignore */ }
    try {
      const r = await fetch('/api/coach', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ messages: history, context: coachContext(app, app.state), code }) });
      let j = {}; try { j = await r.json(); } catch (e) { /* ignore */ }
      if (r.status === 401 && j.error === 'code') {
        const c = prompt('Coach passcode (the COACH_CODE you set in Netlify):');
        setBusy(false);
        if (c) { try { localStorage.setItem('coachCode', c.trim()); } catch (e) { /* ignore */ } return send(text, true); }
        push({ role: 'error', content: 'The coach needs its passcode.' }); return;
      }
      if (!r.ok) { push({ role: 'error', content: j.message || ('Something went wrong (' + r.status + ').'), setup: j.error === 'no_key' }); setBusy(false); return; }
      const snap = {}; UNDO_KEYS.forEach(k => { snap[k] = app.state[k]; });
      const done = runCoachActions(app, j.actions);
      const id = 'c' + uid();
      if (done.length) undos.current[id] = snap;
      app.setState(s => ({ coachChat: (s.coachChat || []).concat({ id, role: 'assistant', content: j.text || (done.length ? 'Done.' : 'Hmm, I didn’t get that — try rephrasing?'), done }).slice(-60) }));
    } catch (e) {
      push({ role: 'error', content: navigator.onLine === false ? 'You’re offline — the coach needs internet.' : 'Couldn’t reach the coach. Try again.' });
    }
    setBusy(false);
  };
  const undo = id => { const snap = undos.current[id]; if (!snap) return; app.setState({ ...snap, coachChat: (app.state.coachChat || []).map(m => m.id === id ? { ...m, undone: true } : m) }); delete undos.current[id]; };

  const reg = (st.regulars || [])[0];
  const ideas = [reg ? 'Log my ' + reg.name.toLowerCase() : 'Log 2 eggs and toast for breakfast', 'Why am I not gaining weight?', 'How’s my protein been this week?', 'Plan the rest of today’s food to hit my targets', 'I drank 500 ml of water', 'Move my reading reminder to 21:00'];

  return <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'transparent', fontFamily: F.body, color: C.text }}>
    <div style={{ padding: '58px 22px 12px', borderBottom: '1px solid ' + C.line, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
      <div><div style={{ ...T.label, marginBottom: 4 }}>DAY {app.dayNum()} · ASK, OR TELL IT WHAT YOU DID</div><div style={T.h1}>Coach</div></div>
      {chat.length ? <TopLink tone={C.dim} onClick={() => { if (confirm('Clear the conversation?')) app.setState({ coachChat: [] }); }}>CLEAR</TopLink> : null}
    </div>
    <div ref={scroller} style={{ flex: 1, overflow: 'auto', padding: '14px 16px 10px' }}>
      {!chat.length ? <div>
        <div style={{ ...T.body, color: C.dim, lineHeight: 1.5 }}>I can see your food diary, targets, training, rules and measurements. Tell me what you ate and I’ll log it, or ask why something isn’t moving and I’ll dig into your numbers.</div>
        <div style={{ ...T.label, margin: '18px 0 8px' }}>TRY</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>{ideas.map(t => <div key={t} role="button" onClick={() => send(t)} style={{ border: '1px solid ' + C.line2, padding: '12px 13px', cursor: 'pointer', font: `500 15px/1.3 ${F.body}` }}>{t}</div>)}</div>
      </div> : null}
      {chat.map(m => m.role === 'user'
        ? <div key={m.id} style={{ display: 'flex', justifyContent: 'flex-end', margin: '10px 0' }}><div style={{ maxWidth: '82%', background: C.blue, color: C.blueInk, padding: '10px 12px', font: `500 15px/1.4 ${F.body}`, whiteSpace: 'pre-wrap' }}>{m.content}</div></div>
        : m.role === 'error'
          ? <div key={m.id} style={{ margin: '10px 0', border: '1px solid #6e3638', padding: '11px 12px', font: `400 14px/1.45 ${F.body}`, color: '#e0a89a' }}>{m.content}{m.setup ? <div style={{ ...T.label, marginTop: 8, color: C.dim, lineHeight: 1.6 }}>SET-UP: CREATE AN API KEY AT CONSOLE.ANTHROPIC.COM → ADD IT IN NETLIFY AS ANTHROPIC_API_KEY → REDEPLOY.</div> : null}</div>
          : <div key={m.id} style={{ margin: '10px 0', maxWidth: '92%' }}>
            <div style={{ ...T.label, color: C.blue, marginBottom: 4 }}>COACH</div>
            <div style={{ font: `400 15px/1.5 ${F.body}`, color: '#d3d7df' }}><Rich text={m.content} /></div>
            {(m.done || []).length ? <div style={{ marginTop: 8, background: C.card, borderLeft: '3px solid ' + (m.undone ? C.faint : C.olive), padding: '9px 11px' }}>
              {m.done.map((d, i) => <div key={i} style={{ ...T.mono, fontSize: 11, lineHeight: 1.5, letterSpacing: '.04em', color: m.undone ? C.faint : C.text, textDecoration: m.undone ? 'line-through' : 'none' }}>✓ {d}</div>)}
              {!m.undone && undos.current[m.id] ? <span role="button" onClick={() => undo(m.id)} style={{ display: 'inline-block', marginTop: 6, ...T.mono, fontSize: 11, color: C.amber, cursor: 'pointer' }}>UNDO</span> : m.undone ? <div style={{ ...T.label, marginTop: 4 }}>UNDONE</div> : null}
            </div> : null}
          </div>)}
      {busy ? <div style={{ ...T.label, color: C.blue, margin: '12px 0' }}>COACH IS THINKING…</div> : null}
    </div>
    <div style={{ borderTop: '1px solid ' + C.line, padding: '10px 12px', display: 'flex', gap: 8, alignItems: 'flex-end', background: '#111419' }}>
      <textarea value={input} onChange={e => setInput(e.target.value)} rows={Math.min(4, Math.max(1, input.split('\n').length))} placeholder="Log food, or ask anything"
        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); } }}
        style={{ flex: 1, minWidth: 0, boxSizing: 'border-box', background: C.card, border: '1px solid ' + C.line2, color: C.text, font: `400 16px/1.35 ${F.body}`, padding: '11px 10px', outline: 'none', resize: 'none' }} />
      <Btn tone={C.blue} ink={C.blueInk} disabled={busy || !input.trim()} onClick={() => send(input)} style={{ minHeight: 46, padding: '0 16px', fontSize: 15 }}>Send</Btn>
    </div>
  </div>;
}
window.CoachScreen = CoachScreen;

// ── Daily AI suggestions ──
// Once a day (first time the app is opened with a connection) a small summary of the last 7 days goes to
// /api/tips and up to 3 suggestions come back; they show on the Today screen. Turned off in Habits & reminders.
function tipsContext(app, st) {
  const today = st.curDate, days = [];
  for (let i = 7; i >= 1; i--) {
    const d = addDaysIso(today, -i), diary = (st.diary || {})[d], h = Object.values(st.history || {}).find(x => x.date === d);
    const ws = (st.workouts || []).filter(w => w.date === d);
    if (!diary && !h && !ws.length) continue;
    const t = diary ? sumN(diary.meals) : null;
    days.push({ date: d, kcal: t ? Math.round(t.kcal) : h && h.kcal != null ? Math.round(h.kcal) : null, protein_g: t ? Math.round(t.p) : h && h.p != null ? Math.round(h.p) : null,
      carbs_g: t ? Math.round(t.c) : undefined, fat_g: t ? Math.round(t.f) : undefined, items_logged: diary ? diary.meals.length : h ? h.meals : 0,
      water_l: r1(((diary ? diary.waterMl : h && h.waterMl) || 0) / 1000),
      missed_rules: h ? (h.rules || []).filter(k => !(h.done || {})[k]).map(k => { const r = (st.ruleDefs || []).find(x => x.k === k); return r ? ((app.hLabel ? app.hLabel(r).name : r.name) || r.name) : k; }) : undefined,
      workouts: ws.map(w => w.name + ' (' + doneSets(w) + ' sets)'), sleep_hours: sleepDur((st.sleepLog || {})[d]) != null ? r1(sleepDur(st.sleepLog[d]) / 60) : undefined });
  }
  const weight = (st.meas || []).find(m => m.k === 'weight'), wlog = ((st.measLog || {}).weight) || {}, wDays = Object.keys(wlog).map(Number).sort((a, b) => a - b);
  // strongest lifts: best estimated 1RM in the last 4 weeks vs the 4 weeks before
  const cut = Date.now() - 28 * 864e5, cut2 = cut - 28 * 864e5, lifts = {};
  for (const w of st.workouts || []) for (const e of w.exercises) if (e.type === 'wr') for (const s of e.sets) {
    const v = est1rm(s); if (!v) continue;
    const L = lifts[e.name] || (lifts[e.name] = { recent: 0, before: 0, n: 0 });
    if (w.start >= cut) { L.recent = Math.max(L.recent, v); L.n++; } else if (w.start >= cut2) L.before = Math.max(L.before, v);
  }
  const top = Object.entries(lifts).filter(([, L]) => L.recent).sort((a, b) => b[1].n - a[1].n).slice(0, 4)
    .map(([name, L]) => ({ exercise: name, best_e1rm_kg_last_4wk: r1(L.recent), best_e1rm_kg_prior_4wk: L.before ? r1(L.before) : null }));
  return {
    day_of_challenge: app.dayNum ? app.dayNum() : undefined, today: niceDate(today),
    profile: st.setup ? { sex: st.setup.sex, age: st.setup.age, height_cm: st.setup.height, goal: st.setup.goal } : undefined,
    targets: { kcal: st.targets.kcal, protein_g: st.targets.p, carbs_g: st.targets.c, fat_g: st.targets.f, water_l: r1((st.waterGoal || 0) / 1000) },
    rules: (st.ruleDefs || []).filter(r => r.on).map(r => (app.hLabel ? app.hLabel(r).name : r.name) || r.name),
    last_days: days,
    weight_kg: weight ? { start: weight.start, latest: wDays.length ? wlog[wDays[wDays.length - 1]] : weight.cur } : undefined,
    workouts_last_14_days: (st.workouts || []).filter(w => w.start >= Date.now() - 14 * 864e5).length,
    lifts: top.length ? top : undefined,
    current_injuries: (st.injuries || []).filter(i => !i.healed).length ? (st.injuries || []).filter(i => !i.healed).map(i => { const f = injFeel(i);
      return { name: i.name + (i.side ? ' (' + i.side + ')' : ''), day: injDay(i, today), feels_out_of_10: f ? f.feel : null, rehab_days_last_7: injRehabDays(i, today) }; }) : undefined
  };
}
let tipsBusy = false;
async function tipsMaybe(app, force) {
  const st = app && app.state;
  if (!st || tipsBusy || st.aiTipsOn === false || !(st.setup && st.setup.done)) return;
  if (!force && st.aiTips && st.aiTips.date === st.curDate) return;          // already done today
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
  let last = 0; try { last = +localStorage.getItem('sh.tipsTry') || 0; } catch (e) { /* ignore */ }
  if (!force && Date.now() - last < 3 * 3600e3) return;                      // failed/empty recently: wait 3 h
  const ctx = tipsContext(app, st);
  if (!force && !ctx.last_days.length && !(st.workouts || []).length) return; // nothing to go on yet
  tipsBusy = true;
  try { localStorage.setItem('sh.tipsTry', String(Date.now())); } catch (e) { /* ignore */ }
  try {
    let code = null; try { code = localStorage.getItem('coachCode'); } catch (e) { /* ignore */ }
    const r = await fetch('/api/tips', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ctx, code }) });
    const j = await r.json().catch(() => ({}));
    if (r.ok) app.setState({ aiTips: { date: app.state.curDate, items: j.items || [], at: Date.now(), tokens: j.tokens, dismissed: false } });
    else if (j.error === 'code') app.setState({ aiTips: { date: app.state.curDate, items: [], at: Date.now(), needsCode: true } });
  } catch (e) { /* offline or server down: try again later */ }
  tipsBusy = false;
}
window.SHTips = { maybe: tipsMaybe };
if (!window.__tipsHooked) {
  window.__tipsHooked = true;
  setTimeout(() => window.__app && tipsMaybe(window.__app), 4000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) setTimeout(() => window.__app && tipsMaybe(window.__app), 2500); });
}

// ── Board → tap a day → full stats for that day ──
// Mounted once on its own; the board's day squares call window.SHDay.open(dayNumber).
function DayDetail({ app, st, n, onClose, onNav }) {
  const dayNum = app.dayNum(), date = st.startDate ? addDaysIso(st.startDate, n - 1) : st.curDate;
  const isToday = n === dayNum, ahead = n > dayNum, rec = !isToday && !ahead ? (st.history || {})[n] : null, skipped = !isToday && !ahead && !rec;
  const TONES = { BODY: C.blue, FUEL: C.amber, MIND: C.olive };
  const defs = st.ruleDefs || [], defOf = k => defs.find(d => d.k === k);
  const nameOf = k => { const d = defOf(k); return d ? ((app.hLabel ? app.hLabel(d).name : d.name) || d.name || 'Rule') : k; };
  const keys = isToday ? defs.filter(d => d.on).map(d => d.k) : rec ? (rec.rules || []) : [];
  const done = isToday ? (st.done || {}) : rec ? (rec.done || {}) : {}, doneAt = isToday ? (st.doneAt || {}) : rec ? (rec.doneAt || {}) : {};
  const cleared = keys.filter(k => done[k]).length;
  const diary = isToday ? { meals: st.meals || [], waterMl: st.waterMl || 0 } : (st.diary || {})[date];
  const meals = diary ? diary.meals : [], tot = sumN(meals), tg = st.targets || {};
  const kcal = diary ? tot.kcal : rec ? rec.kcal || 0 : 0, prot = diary ? tot.p : rec ? rec.p || 0 : 0;
  const water = diary ? diary.waterMl : rec ? rec.waterMl || 0 : 0, goalW = st.waterGoal || 3500;
  const ws = (st.workouts || []).filter(w => w.date === date);
  const photo = app.photoUrls && app.photoUrls['d' + n];
  const wkg = (((st.measLog || {}).weight) || {})[n];
  const note = isToday ? st.dayNote : rec ? rec.note : '';
  const status = ahead ? ['STILL AHEAD', C.faint] : isToday ? [cleared + ' OF ' + keys.length + ' CLEARED SO FAR', C.amber] : skipped ? ['NO CHECK-IN · MISSED', C.red]
    : cleared === keys.length ? ['ALL ' + keys.length + ' CLEARED', C.blue] : ['MISSED · ' + (keys.length - cleared) + ' OPEN', C.red];
  const tile = (l, v, sub, tone) => <Card style={{ flex: 1, padding: '10px 11px' }}><div style={{ ...T.label, color: tone || C.mute }}>{l}</div>
    <div style={{ font: `700 21px/1.1 ${F.head}`, marginTop: 4 }}>{v}</div>{sub ? <div style={{ ...T.label, marginTop: 3 }}>{sub}</div> : null}</Card>;
  const section = t => <div style={{ ...T.h2, margin: '22px 0 8px' }}>{t}</div>;
  return <Sheet z={70} title={'Day ' + n} sub={niceDate(date).toUpperCase()} left={<TopLink onClick={onClose}>‹ BOARD</TopLink>}
    right={<div style={{ display: 'flex' }}>{[[-1, '‹', n > 1], [1, '›', n < 70]].map(([d, l, ok]) => <span key={d} role="button" onClick={() => ok && onNav(n + d)} style={{ font: `600 22px/1 ${F.mono}`, color: ok ? C.blue : C.faint, padding: '6px 12px', cursor: 'pointer' }}>{l}</span>)}</div>}>
    <div {...swipeNav(() => n < 70 && onNav(n + 1), () => n > 1 && onNav(n - 1))} style={{ padding: '14px 18px 30px', minHeight: '70vh', touchAction: 'pan-y' }}>
      <div style={{ ...T.mono, fontSize: 12, color: status[1] }}>{status[0]}</div>
      {ahead ? <Empty>THIS DAY HASN’T HAPPENED YET</Empty> : <>
        <div style={{ display: 'flex', gap: 7, marginTop: 12 }}>
          {tile('KCAL', Math.round(kcal).toLocaleString(), 'OF ' + (tg.kcal || 0).toLocaleString(), C.amber)}
          {tile('PROTEIN', r1(prot) + ' g', 'OF ' + (tg.p || 0) + ' G', C.blue)}
          {tile('WATER', (water / 1000).toFixed(2) + ' L', 'OF ' + (goalW / 1000).toFixed(1) + ' L', C.blue)}
        </div>

        {section('Rules')}
        {skipped ? <div style={{ ...T.body, color: C.dim, fontSize: 14 }}>The app wasn’t opened this day, so nothing was checked off.</div> : null}
        {keys.map(k => { const d = defOf(k), ok = !!done[k]; return <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid #272c34' }}>
          <span style={{ width: 22, height: 22, flex: 'none', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', background: ok ? (TONES[d && d.g] || C.blue) : 'transparent', border: '1.5px solid ' + (ok ? (TONES[d && d.g] || C.blue) : C.line2), color: C.solid, font: `700 12px/1 ${F.mono}` }}>{ok ? '✓' : ''}</span>
          <span style={{ ...T.name, flex: 1, color: ok ? C.text : C.dim }}>{nameOf(k)}</span>
          <span style={{ ...T.mono, fontSize: 11, color: ok ? C.dim : C.red }}>{ok ? (doneAt[k] || '✓') : isToday ? 'OPEN' : 'MISSED'}</span>
        </div>; })}

        {section('Food')}
        {diary && meals.length ? <>
          <div style={{ ...T.label, marginBottom: 6 }}>C {r1(tot.c)} G · F {r1(tot.f)} G · {meals.length} ITEMS</div>
          {(typeof slotsOf === 'function' ? slotsOf(st) : [['', '', 0]]).map(([id, label]) => { const items = meals.filter(m => (typeof slotKey === 'function' ? slotKey(m) : m.slot) === id); if (!items.length) return null;
            return <div key={id} style={{ marginBottom: 8 }}><div style={{ ...T.label, color: C.amber, marginBottom: 2 }}>{label.toUpperCase()} · {Math.round(sumN(items).kcal)} KCAL</div>
              {items.map(m => <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '4px 0', font: `400 14px/1.35 ${F.body}` }}><span style={{ color: C.text }}>{m.name}</span><span style={{ color: C.dim, flex: 'none' }}>{Math.round(m.kcal)}</span></div>)}</div>; })}
        </> : <div style={{ ...T.body, color: C.dim, fontSize: 14 }}>{rec && rec.meals ? rec.meals + ' items logged · ' + Math.round(kcal) + ' kcal' : 'Nothing logged.'}</div>}

        {section('Training')}
        {ws.length ? ws.map(w => <Card key={w.id} style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><span style={{ font: `700 17px/1.1 ${F.head}`, textTransform: 'uppercase' }}>{w.name}</span><span style={T.label}>{fmtMin((w.end - w.start) / 1000)}</span></div>
          {w.exercises.map((e, i) => <div key={i} style={{ font: `400 13px/1.4 ${F.body}`, color: C.dim, marginTop: 4 }}>{e.sets.length} × {e.name} · <span style={{ color: C.text }}>{e.sets.map(s => setText(st, e.type, s)).slice(0, 4).join(', ')}{e.sets.length > 4 ? '…' : ''}</span></div>)}
          {(w.mobility || []).filter(m => m.done).length ? <div style={{ ...T.label, marginTop: 6, color: C.olive }}>MOBILITY · {w.mobility.filter(m => m.done).map(m => m.name).join(', ').toUpperCase()}</div> : null}
        </Card>) : <div style={{ ...T.body, color: C.dim, fontSize: 14 }}>{rec && rec.sets ? rec.sets + ' sets logged.' : 'No workout logged.'}</div>}

        {(st.sleepLog || {})[date] ? <>{section('Sleep')}<div style={{ ...T.body, marginBottom: 6 }}>{(() => { const e = st.sleepLog[date]; return durText(sleepDur(e)) + '  ·  ' + hhmmOf(e.bed) + ' → ' + hhmmOf(e.wake) + (e.q ? '  ' + QUAL[e.q - 1] : ''); })()}</div></> : null}
        {photo || wkg != null || note ? section('Notes & body') : null}
        {wkg != null ? <div style={{ ...T.body, marginBottom: 8 }}>Weight: <b>{st.imperial ? r1(wkg * 2.20462) + ' lb' : wkg + ' kg'}</b></div> : null}
        {note ? <div style={{ font: `italic 400 14px/1.45 ${F.body}`, color: C.text, marginBottom: 10 }}>“{note}”</div> : null}
        {photo ? <img src={photo} alt={'Day ' + n} style={{ width: '100%', borderRadius: 14, display: 'block' }} /> : null}
      </>}
    </div>
  </Sheet>;
}
function DayHost() {
  const [n, setN] = useState(null), [rep, setRep] = useState(null);
  useEffect(() => {
    window.SHDay = { open: d => setN(d) };
    window.SHReport = { open: s0 => setRep(s0 || (window.__app && lastWeekStart(window.__app.state))) };
    // opened from the Sunday notification (…/?report=1)
    if (/[?&]report=1/.test(location.search)) { setTimeout(() => window.__app && setRep(lastWeekStart(window.__app.state)), 900); try { history.replaceState(null, '', location.pathname + location.hash); } catch (e) { /* ignore */ } }
  }, []);
  useTick(n != null || rep != null, 1000);   // keep in step with changes made elsewhere while open
  const app = window.__app;
  if (!app) return null;
  return <>
    {n != null ? <DayDetail app={app} st={app.state} n={n} onClose={() => setN(null)} onNav={setN} /> : null}
    {rep ? <WeeklyReport app={app} st={app.state} s0={rep} onClose={() => setRep(null)} /> : null}
  </>;
}
if (!window.__dayHost) {
  window.__dayHost = document.createElement('div');
  document.body.appendChild(window.__dayHost);
  ReactDOM.createRoot(window.__dayHost).render(<DayHost />);
}

// ── Weekly report (Sunday → the 7 days Sunday–Saturday that just ended) ──
const lastWeekStart = st => { const d = dOf(st.curDate); d.setDate(d.getDate() - ((d.getDay() + 1) % 7 || 7) - 6); return isoOf(d); };
function weekStats(app, st, s0) {
  const dates = Array.from({ length: 7 }, (_, i) => addDaysIso(s0, i)), inWk = d => d >= s0 && d <= dates[6];
  const prevS = addDaysIso(s0, -7), inPrev = d => d >= prevS && d < s0;
  const ws = (st.workouts || []).filter(w => inWk(w.date)), prevWs = (st.workouts || []).filter(w => inPrev(w.date));
  const vol = list => list.reduce((a, w) => a + (w.volume != null ? w.volume : workoutVolume(w)), 0);
  const days = dates.map(d => { const diary = d === st.curDate ? { meals: st.meals || [], waterMl: st.waterMl || 0 } : (st.diary || {})[d];
    const n = st.startDate ? Math.round((dOf(d) - dOf(st.startDate)) / 864e5) + 1 : null, h = n ? (st.history || {})[n] : null;
    return { d, n, h, diary, t: diary && diary.meals.length ? sumN(diary.meals) : null, water: diary ? diary.waterMl : h ? h.waterMl || 0 : 0 }; });
  const logged = days.filter(x => x.t), avg = k => logged.length ? logged.reduce((a, x) => a + x.t[k], 0) / logged.length : 0;
  const ch = days.filter(x => x.n >= 1 && x.n <= 70 && x.d < st.curDate);
  const cleared = ch.filter(x => x.h && (x.h.rules || []).every(k => (x.h.done || {})[k])).length;
  const missedNames = {}; ch.forEach(x => { if (!x.h) missedNames['No check-in'] = (missedNames['No check-in'] || 0) + 1; else (x.h.rules || []).filter(k => !(x.h.done || {})[k]).forEach(k => { const r = (st.ruleDefs || []).find(q => q.k === k); const nm = r ? ((app.hLabel ? app.hLabel(r).name : r.name) || r.name) : k; missedNames[nm] = (missedNames[nm] || 0) + 1; }); });
  const wlog = ((st.measLog || {}).weight) || {}, wIn = days.filter(x => x.n && wlog[x.n] != null).map(x => wlog[x.n]);
  const tg = st.targets || {}, goalW = st.waterGoal || 3500;
  return { s0, dates, ws, prevWs, vol: vol(ws), prevVol: vol(prevWs), sets: ws.reduce((a, w) => a + doneSets(w), 0), time: ws.reduce((a, w) => a + (w.end - w.start) / 1000, 0),
    prs: ws.flatMap(w => (w.prs || []).map(p => ({ ...p, date: w.date }))), logged: logged.length, kcal: avg('kcal'), p: avg('p'),
    onTarget: logged.filter(x => tg.kcal && Math.abs(x.t.kcal - tg.kcal) <= tg.kcal * 0.1).length, water: days.reduce((a, x) => a + (x.water || 0), 0) / 7, waterDays: days.filter(x => x.water >= goalW).length,
    chDays: ch.length, cleared, missed: Object.entries(missedNames).sort((a, b) => b[1] - a[1]), wStart: wIn[0], wEnd: wIn[wIn.length - 1], wCount: wIn.length, tg, goalW };
}
function WeeklyReport({ app, st, s0, onClose }) {
  const R = weekStats(app, st, s0), unit = wUnit(st), W = kg => Math.round(st.imperial ? kg * 2.20462 : kg).toLocaleString();
  const pct = (a, b) => b ? Math.round((a - b) / b * 100) : null, vp = pct(R.vol, R.prevVol);
  const tile = (l, v, sub, tone) => <Card style={{ flex: 1, padding: '10px 11px' }}><div style={{ ...T.label, color: tone || C.mute }}>{l}</div><div style={{ font: `700 22px/1.1 ${F.head}`, marginTop: 4 }}>{v}</div>{sub ? <div style={{ ...T.label, marginTop: 3 }}>{sub}</div> : null}</Card>;
  const row = (l, v, tone) => <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '9px 0', borderBottom: '1px solid #272c34' }}><span style={{ ...T.body, fontSize: 14, color: C.dim }}>{l}</span><span style={{ ...T.mono, fontSize: 13, color: tone || C.text, textAlign: 'right' }}>{v}</span></div>;
  const h2 = t => <div style={{ ...T.h2, margin: '22px 0 6px' }}>{t}</div>;
  return <Sheet z={72} title="Weekly report" sub={weekLabel(s0).toUpperCase()} left={<TopLink onClick={onClose}>‹ BACK</TopLink>}>
    <div style={{ padding: '14px 18px 30px' }}>
      <div style={{ display: 'flex', gap: 7 }}>
        {tile('WORKOUTS', R.ws.length, R.prevWs.length !== R.ws.length ? (R.ws.length > R.prevWs.length ? '▲ ' : '▼ ') + Math.abs(R.ws.length - R.prevWs.length) + ' VS WEEK BEFORE' : 'SAME AS WEEK BEFORE', C.olive)}
        {tile('PRS', R.prs.length, R.prs.length ? 'NEW BESTS' : 'NONE THIS WEEK', C.amber)}
      </div>
      {R.chDays ? <>{h2('Challenge')}
        {row('Days fully cleared', R.cleared + ' of ' + R.chDays, R.cleared === R.chDays ? C.blue : C.text)}
        {R.missed.slice(0, 4).map(([nm, c]) => row('Missed: ' + nm, c + (c === 1 ? ' day' : ' days'), C.red))}</> : null}
      {h2('Training')}
      {row('Volume lifted', W(R.vol) + ' ' + unit + (vp != null ? '  ' + (vp >= 0 ? '▲' : '▼') + ' ' + Math.abs(vp) + '%' : ''), vp == null ? C.text : vp >= 0 ? C.olive : C.red)}
      {row('Sets · time', R.sets + ' sets · ' + fmtMin(R.time))}
      {R.ws.map(w => row(niceDate(w.date), w.name + ((w.prs || []).length ? ' · 🏆' + w.prs.length : '')))}
      {R.prs.map((p, i) => <div key={i} style={{ ...T.mono, fontSize: 11, color: C.amber, marginTop: 6 }}>🏆 {p.ex.toUpperCase()} · {p.what.toUpperCase()} {p.val}</div>)}
      {h2('Food & water')}
      {row('Days logged', R.logged + ' of 7')}
      {R.logged ? <>{row('Average calories', Math.round(R.kcal).toLocaleString() + ' / ' + (R.tg.kcal || 0).toLocaleString(), Math.abs(R.kcal - R.tg.kcal) <= R.tg.kcal * 0.1 ? C.olive : C.amber)}
        {row('Average protein', Math.round(R.p) + ' / ' + R.tg.p + ' g', R.p >= R.tg.p * 0.9 ? C.olive : C.amber)}
        {row('Days within 10% of calories', R.onTarget + ' of ' + R.logged)}</> : null}
      {row('Average water', (R.water / 1000).toFixed(2) + ' L · goal hit ' + R.waterDays + '/7', R.waterDays >= 5 ? C.olive : C.text)}
      {(() => { const n = R.dates.map(d => sleepDur((st.sleepLog || {})[d])).filter(x => x != null); return n.length ? <>{h2('Sleep')}{row('Average sleep', durText(Math.round(n.reduce((a, b) => a + b, 0) / n.length)) + ' · ' + n.length + '/7 nights logged')}</> : null; })()}
      {R.wCount >= 2 ? <>{h2('Body')}{row('Weight', (st.imperial ? r1(R.wStart * 2.20462) + ' → ' + r1(R.wEnd * 2.20462) + ' lb' : R.wStart + ' → ' + R.wEnd + ' kg') + ' (' + (R.wEnd - R.wStart >= 0 ? '+' : '') + r1(st.imperial ? (R.wEnd - R.wStart) * 2.20462 : R.wEnd - R.wStart) + ')')}</> : null}
      <a href="#s12" onClick={onClose} style={{ display: 'block', marginTop: 20, ...T.mono, fontSize: 12, color: C.blue, textDecoration: 'none' }}>ASK COACH ABOUT THIS WEEK ›</a>
    </div>
  </Sheet>;
}
