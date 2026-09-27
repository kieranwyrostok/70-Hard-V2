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

  return <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: C.bg, fontFamily: F.body, color: C.text }}>
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
      workouts: ws.map(w => w.name + ' (' + doneSets(w) + ' sets)') });
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
    lifts: top.length ? top : undefined
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
