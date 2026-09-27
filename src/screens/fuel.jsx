// ── FUEL: day diary with meal sections, food search / scan / detail (works like YAZIO) ──
// Meal sections are the user's own: names, order, how many, and each one's share of the calorie goal.
const DEF_SLOTS = [['BREAKFAST', 'Breakfast', 0.25], ['LUNCH', 'Lunch', 0.35], ['DINNER', 'Dinner', 0.30], ['SNACK', 'Snacks', 0.10]];
const DEF_MEALS = () => DEF_SLOTS.map(([id, name, sh]) => ({ id, name, pct: sh * 100 }));
function slotsOf(st) { const m = st && st.mealSlots; return Array.isArray(m) && m.length ? m.map(x => [x.id, x.name || 'Meal', (Number(x.pct) || 0) / 100]) : DEF_SLOTS; }
let SLOTS = DEF_SLOTS;   // refreshed from state on every Fuel/Coach render
const useSlots = st => { SLOTS = slotsOf(st); return SLOTS; };
const slotKey = m => SLOTS.some(s => s[0] === m.slot) ? m.slot : SLOTS[SLOTS.length - 1][0];   // entries from a deleted section show in the last one
const slotLabel = id => (SLOTS.find(s => s[0] === id) || SLOTS[SLOTS.length - 1])[1];
const scaleN = (v, k) => ({ kcal: (v.kcal || 0) * k, p: (v.p || 0) * k, c: (v.c || 0) * k, f: (v.f || 0) * k });
const roundN = v => ({ kcal: Math.round(v.kcal), p: r1(v.p), c: r1(v.c), f: r1(v.f) });
const sumN = list => list.reduce((a, m) => ({ kcal: a.kcal + (m.kcal || 0), p: a.p + (m.p || 0), c: a.c + (m.c || 0), f: a.f + (m.f || 0) }), { kcal: 0, p: 0, c: 0, f: 0 });

// Any food shape (built-in, USDA, scanned, custom, old meal entry) → one normalized record
function normFood(f) {
  if (f.food) return f.food;
  let servG = f.servG || f.g || null, per100 = f.per100 || null, perServ;
  if (!servG) { const m = String(f.serv || '').match(/(\d+(?:\.\d+)?)\s*(g|ml)\b/i); if (m) servG = parseFloat(m[1]); }
  if (per100) { servG = servG || 100; perServ = scaleN(per100, servG / 100); }
  else { perServ = { kcal: f.kcal || 0, p: f.p || 0, c: f.c || 0, f: f.f || 0 }; if (servG) per100 = scaleN(perServ, 100 / servG); }
  const label = f.servLabel || f.serv || (servG ? servG + ' g' : '1 serving');
  return { key: (f.name + '|' + (f.brand || '')).toLowerCase(), name: f.name, brand: f.brand || '', src: f.src || f.source || '', servLabel: label, servG, per100, perServ, upc: f.upc };
}
function calcAmount(nf, amount, unit) {
  const a = Math.max(0, Number(amount) || 0);
  if ((unit === 'g' || unit === 'oz') && nf.per100) { const g = unit === 'oz' ? a * 28.3495 : a; return { g: r1(g), ...roundN(scaleN(nf.per100, g / 100)) }; }
  if (nf.per100 && nf.servG) { const g = a * nf.servG; return { g: r1(g), ...roundN(scaleN(nf.per100, g / 100)) }; }
  return { g: nf.servG ? r1(a * nf.servG) : null, ...roundN(scaleN(nf.perServ, a)) };
}
function makeEntry(nf, amount, unit, slot) {
  const v = calcAmount(nf, amount, unit);
  return { id: 'm' + uid(), time: window.SH.nowHM(), slot, name: nf.name, brand: nf.brand, src: nf.src, food: nf, amount: Number(amount) || 0, unit, g: v.g, per100: nf.per100, kcal: v.kcal, p: v.p, c: v.c, f: v.f,
    serv: unit === 'serv' ? (Number(amount) === 1 ? nf.servLabel : amount + ' × ' + nf.servLabel) : amount + ' ' + unit };
}
const amountText = m => m.unit === 'g' || m.unit === 'oz' ? r1(m.amount) + ' ' + m.unit : m.unit === 'serv' ? (m.amount === 1 ? (m.food ? m.food.servLabel : m.serv) : r1(m.amount) + ' × ' + (m.food ? m.food.servLabel : 'serving')) : (m.serv || (m.g ? m.g + ' g' : ''));

const dbCache = new Map();
function useDbSearch(q) {
  const [, force] = useState(0);
  const key = q.trim().toLowerCase();
  useEffect(() => {
    if (key.length < 2 || dbCache.has(key)) return;
    const t = setTimeout(() => {
      dbCache.set(key, { status: 'loading', foods: [] }); force(x => x + 1);
      fetch('/api/food-search?q=' + encodeURIComponent(key)).then(r => r.json().then(j => r.ok ? j : Promise.reject(new Error(j.error || r.status))))
        .then(j => { dbCache.set(key, { status: 'ok', foods: (j.foods || []).map(d => ({ name: d.name, brand: d.brand, serv: d.serv, g: d.g, per100: d.per100, src: d.source, upc: d.upc })) }); force(x => x + 1); })
        .catch(e => { dbCache.set(key, { status: 'err', foods: [], msg: String(e.message || e) }); force(x => x + 1); setTimeout(() => dbCache.delete(key), 20000); });
    }, 350);
    return () => clearTimeout(t);
  }, [key]);
  return key.length >= 2 ? dbCache.get(key) || { status: 'loading', foods: [] } : null;
}

function Ring({ pct, size = 150, stroke = 12, tone, children }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, p = Math.max(0, Math.min(1, pct));
  return <div style={{ position: 'relative', width: size, height: size, flex: 'none' }}>
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#282d36" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={tone} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - p)} />
    </svg>
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>{children}</div>
  </div>;
}

function FuelScreen({ app, st }) {
  const SH = window.SH;
  useSlots(st);
  const [mealEdit, setMealEdit] = useState(false);
  const [date, setDate] = useState(st.curDate);
  const [adding, setAdding] = useState(null);   // slot
  const [editing, setEditing] = useState(null); // entry id
  const [menu, setMenu] = useState(null);
  const [toast, setToast] = useState(null);
  const lastCur = useRef(st.curDate);
  useEffect(() => { if (lastCur.current !== st.curDate) { setDate(st.curDate); lastCur.current = st.curDate; } }, [st.curDate]);
  const isToday = date === st.curDate;
  const day = isToday ? { meals: st.meals || [], waterMl: st.waterMl || 0 } : ((st.diary || {})[date] || { meals: [], waterMl: 0 });
  const tg = st.targets, goalW = st.waterGoal || 3500;
  const tot = sumN(day.meals), left = tg.kcal - tot.kcal;

  const flash = t => { setToast(t); clearTimeout(flash._t); flash._t = setTimeout(() => setToast(null), 1800); };
  const setDay = (fn) => app.setState(s => {
    if (date === s.curDate) {
      const d = fn({ meals: s.meals || [], waterMl: s.waterMl || 0 }), g = s.waterGoal || 3500, hit = d.waterMl >= g;
      return { meals: d.meals, waterMl: d.waterMl, done: { ...s.done, water: hit }, doneAt: { ...s.doneAt, water: hit ? (s.doneAt.water || SH.nowHM()) : undefined } };
    }
    const d = fn((s.diary || {})[date] || { meals: [], waterMl: 0 });
    let history = s.history; const n = Object.keys(history || {}).find(k => history[k].date === date);
    if (n) { const t = sumN(d.meals); history = { ...history, [n]: { ...history[n], kcal: Math.round(t.kcal), p: r1(t.p), meals: d.meals.length, waterMl: d.waterMl } }; }
    return { diary: { ...(s.diary || {}), [date]: d }, history };
  });
  const remember = nf => app.setState(s => ({ recentFoods: [nf].concat((s.recentFoods || []).filter(x => x.key !== nf.key)).slice(0, 40) }));
  const addEntries = (entries, msg) => { setDay(d => ({ ...d, meals: d.meals.concat(entries) })); entries.forEach(e => e.food && remember(e.food)); if (msg) flash(msg); };
  const editEntry = (id, fn) => setDay(d => ({ ...d, meals: d.meals.map(m => m.id === id ? fn(m) : m) }));
  const delEntry = id => setDay(d => ({ ...d, meals: d.meals.filter(m => m.id !== id) }));

  const dayLabel = isToday ? 'Today' : date === addDaysIso(st.curDate, -1) ? 'Yesterday' : niceDate(date);
  const macro = (label, v, goal, tone) => <div style={{ flex: 1, minWidth: 0 }}>
    <div style={{ ...T.label, color: tone }}>{label}</div>
    <div style={{ font: `700 17px/1.1 ${F.head}`, margin: '4px 0 6px' }}>{r1(v)}<span style={{ fontSize: 12, color: C.mute }}> / {goal} g</span></div>
    <Bar pct={goal ? 100 * v / goal : 0} tone={tone} h={5} />
  </div>;
  const glasses = Math.max(4, Math.round(goalW / 250)), filled = Math.floor(day.waterMl / 250);
  const setWater = ml => setDay(d => ({ ...d, waterMl: Math.max(0, Math.min(goalW + 3000, ml)) }));
  const editEntryObj = day.meals.find(m => m.id === editing);

  return <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: C.bg, fontFamily: F.body, color: C.text }}>
    <div style={{ flex: 1, overflow: 'auto' }}>
      <div {...swipeNav(() => !isToday && setDate(addDaysIso(date, 1)), () => setDate(addDaysIso(date, -1)))} style={{ padding: '58px 22px 16px', borderBottom: '1px solid ' + C.line, touchAction: 'pan-y' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <TopLink tone={C.amber} onClick={() => setDate(addDaysIso(date, -1))}>‹ PREV</TopLink>
          <div role="button" onClick={() => setDate(st.curDate)} style={{ font: `700 20px/1 ${F.head}`, letterSpacing: '.12em', textTransform: 'uppercase', cursor: 'pointer' }}>{dayLabel}</div>
          <TopLink tone={isToday ? C.faint : C.amber} onClick={() => !isToday && setDate(addDaysIso(date, 1))}>NEXT ›</TopLink>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
          <div style={{ textAlign: 'center', width: 76 }}><div style={{ font: `700 24px/1 ${F.head}` }}>{Math.round(tot.kcal).toLocaleString()}</div><div style={{ ...T.label, marginTop: 4 }}>EATEN</div></div>
          <Ring pct={tg.kcal ? tot.kcal / tg.kcal : 0} tone={left < 0 ? C.red : C.amber}>
            <div style={{ font: `800 38px/0.9 ${F.head}`, color: left < 0 ? C.red : C.text }}>{Math.abs(Math.round(left)).toLocaleString()}</div>
            <div style={{ ...T.label, marginTop: 5 }}>{left < 0 ? 'KCAL OVER' : 'KCAL LEFT'}</div>
          </Ring>
          <div style={{ textAlign: 'center', width: 76 }}><div style={{ font: `700 24px/1 ${F.head}` }}>{tg.kcal.toLocaleString()}</div><div style={{ ...T.label, marginTop: 4 }}>GOAL</div></div>
        </div>
        <div style={{ display: 'flex', gap: 14, marginTop: 16 }}>{macro('CARBS', tot.c, tg.c, C.amber)}{macro('PROTEIN', tot.p, tg.p, C.blue)}{macro('FAT', tot.f, tg.f, C.olive)}</div>
      </div>

      <div style={{ padding: '14px 22px 8px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {SLOTS.map(([slot, label, share]) => {
          const items = day.meals.filter(m => slotKey(m) === slot), t = sumN(items), goal = Math.round(tg.kcal * share);
          return <Card key={slot} style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 12px 12px 14px' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ font: `700 18px/1.1 ${F.head}`, letterSpacing: '.08em', textTransform: 'uppercase' }}>{label}</div>
                <div style={{ ...T.label, marginTop: 4, color: t.kcal > goal * 1.15 ? C.red : C.mute }}>{Math.round(t.kcal)} / {goal} KCAL{items.length ? ' · P ' + r1(t.p) + ' C ' + r1(t.c) + ' F ' + r1(t.f) : ''}</div>
              </div>
              <span role="button" onClick={() => setMenu({ title: label, actions: [
                { label: 'Copy ' + label.toLowerCase() + ' from the day before', run: () => { const prev = ((addDaysIso(date, -1) === st.curDate ? { meals: st.meals } : (st.diary || {})[addDaysIso(date, -1)]) || { meals: [] }).meals.filter(m => slotKey(m) === slot);
                  if (!prev.length) { flash('NOTHING LOGGED THERE THE DAY BEFORE'); return; } addEntries(prev.map(m => ({ ...m, id: 'm' + uid(), time: SH.nowHM() })), 'COPIED ' + prev.length + ' ITEMS'); } },
                items.length ? { label: 'Save as a meal (one-tap next time)', run: () => { const name = prompt('Name this meal', 'My ' + label.toLowerCase()); if (!name) return;
                  app.setState(s => ({ regulars: (s.regulars || []).concat({ id: 'r' + uid(), name: name.trim(), slot, items: items.map(({ id, time, ...m }) => m) }) })); flash('SAVED “' + name.toUpperCase() + '”'); } } : null,
                items.length ? { label: 'Delete all ' + label.toLowerCase() + ' entries', danger: true, run: () => { if (confirm('Delete everything in ' + label + '?')) setDay(d => ({ ...d, meals: d.meals.filter(m => slotKey(m) !== slot) })); } } : null,
                { label: 'Edit meals & calorie split', run: () => setMealEdit(true) }
              ] })} style={{ ...T.mono, color: C.dim, padding: '8px 6px', cursor: 'pointer' }}>•••</span>
              <div role="button" onClick={() => setAdding(slot)} style={{ width: 40, height: 40, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.amber, color: C.amberInk, font: `700 24px/1 ${F.mono}`, cursor: 'pointer' }}>+</div>
            </div>
            {items.map(m => <SwipeRow key={m.id} bg={C.card} actions={[{ label: 'DELETE', run: () => { delEntry(m.id); flash('REMOVED ' + m.name.toUpperCase()); } }, { label: 'COPY', tone: C.blue, run: () => { addEntries([{ ...m, id: 'm' + uid(), time: SH.nowHM() }], 'ADDED ANOTHER ' + m.name.toUpperCase()); } }]}>
            <div role="button" onClick={() => setEditing(m.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderTop: '1px solid #272c34', cursor: 'pointer' }}>
              <div style={{ flex: 1, minWidth: 0 }}><div style={{ ...T.name, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.name}</div>
                <div style={{ ...T.label, marginTop: 3, letterSpacing: '.06em' }}>{[m.brand, amountText(m)].filter(Boolean).join(' · ').toUpperCase()}</div></div>
              <div style={{ font: `700 17px/1 ${F.head}`, color: C.amber }}>{Math.round(m.kcal)}</div>
            </div></SwipeRow>)}
          </Card>;
        })}

        <Card style={{ padding: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ font: `700 18px/1 ${F.head}`, letterSpacing: '.08em', textTransform: 'uppercase' }}>Water</span>
            <span style={{ ...T.mono, color: C.blue }}>{(day.waterMl / 1000).toFixed(2)} / {(goalW / 1000).toFixed(2)} L</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 8 }}>
            <Pail ml={day.waterMl} goal={goalW} onTap={() => setWater(day.waterMl + 250)} />
            <div style={{ flex: 1 }}>
              <div style={{ font: `700 30px/1 ${F.head}` }}>{(day.waterMl / 1000).toFixed(2)}<span style={{ fontSize: 15, color: C.mute }}> L</span></div>
              <div style={{ ...T.label, marginTop: 5 }}>{day.waterMl >= goalW ? 'GOAL REACHED 💧' : ((goalW - day.waterMl) / 1000).toFixed(2) + ' L TO GO · ' + Math.ceil((goalW - day.waterMl) / 250) + ' GLASSES'}</div>
              <div style={{ ...T.label, marginTop: 8, color: C.faint }}>TAP THE PAIL FOR +250 ML</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 7, marginTop: 12 }}>
            <Btn kind="ghost" tone={C.text} onClick={() => setWater(day.waterMl - 250)} style={{ flex: 1, minHeight: 42 }}>−250</Btn>
            <Btn kind="ghost" tone={C.blue} onClick={() => setWater(day.waterMl + 250)} style={{ flex: 1, minHeight: 42 }}>+250</Btn>
            <Btn kind="ghost" tone={C.blue} onClick={() => setWater(day.waterMl + 500)} style={{ flex: 1, minHeight: 42 }}>+500</Btn>
          </div>
        </Card>
        <WeekCard st={st} date={date} onPick={setDate} />
        <TargetsCard app={app} st={st} onMeals={() => setMealEdit(true)} />
      </div>
    </div>

    {adding ? <AddFood app={app} st={st} slot={adding} setSlot={setAdding} dateLabel={dayLabel} onClose={() => setAdding(null)} addEntries={addEntries} flash={flash} /> : null}
    {editEntryObj ? <FoodDetail st={st} app={app} nf={normFood(editEntryObj)} entry={editEntryObj} slot={slotKey(editEntryObj)} onClose={() => setEditing(null)}
      onSave={(amount, unit, slot) => { editEntry(editEntryObj.id, m => { const nf = normFood(m), v = calcAmount(nf, amount, unit); return { ...m, food: nf, amount: Number(amount) || 0, unit, slot, g: v.g, kcal: v.kcal, p: v.p, c: v.c, f: v.f, per100: nf.per100, serv: undefined }; }); setEditing(null); }}
      onDelete={() => { delEntry(editEntryObj.id); setEditing(null); }} /> : null}
    {menu ? <ActionSheet title={menu.title} actions={menu.actions} onClose={() => setMenu(null)} /> : null}
    {mealEdit ? <MealSlotsEditor app={app} st={st} onClose={() => setMealEdit(false)} /> : null}
    {toast ? ReactDOM.createPortal(<div style={{ position: 'fixed', left: 16, right: 16, bottom: 'calc(max(4px, env(safe-area-inset-bottom, 0px) - 18px) + 56px - var(--vgap, 0px))', zIndex: 95, pointerEvents: 'none', background: C.amber, color: C.amberInk, padding: '12px 14px', ...T.mono, fontSize: 12, textAlign: 'center', boxShadow: '0 6px 20px rgba(0,0,0,.5)' }}>✓ {toast}</div>, document.body) : null}
  </div>;
}

function TargetsCard({ app, st, onMeals }) {
  const [open, setOpen] = useState(false);
  const tg = st.targets;
  const bump = (k, d) => app.setState(s => ({ targets: { ...s.targets, [k]: Math.max(0, s.targets[k] + d) }, setup: { ...s.setup, targetsTouched: true } }));
  return <Card style={{ padding: 14, marginBottom: 14 }}>
    <div role="button" onClick={() => setOpen(!open)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
      <span style={{ font: `700 18px/1 ${F.head}`, letterSpacing: '.08em', textTransform: 'uppercase' }}>Daily goals</span>
      <span style={{ ...T.mono, fontSize: 11, color: C.amber }}>{open ? 'DONE' : tg.kcal.toLocaleString() + ' KCAL · EDIT'}</span>
    </div>
    {open ? <div style={{ marginTop: 10 }}>
      {[['kcal', 'CALORIES', 50], ['p', 'PROTEIN · G', 5], ['c', 'CARBS · G', 5], ['f', 'FAT · G', 2]].map(([k, l, st2]) => <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0' }}>
        <span style={{ ...T.label, flex: 1 }}>{l}</span>
        <Btn kind="ghost" tone={C.text} onClick={() => bump(k, -st2)} style={{ minHeight: 38, padding: '0 14px' }}>−</Btn>
        <span style={{ font: `700 20px/1 ${F.head}`, width: 64, textAlign: 'center' }}>{tg[k].toLocaleString()}</span>
        <Btn kind="ghost" tone={C.text} onClick={() => bump(k, st2)} style={{ minHeight: 38, padding: '0 14px' }}>+</Btn>
      </div>)}
      <div role="button" onClick={onMeals} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginTop: 10, padding: '12px 12px', background: '#20252c', borderRadius: 10, cursor: 'pointer' }}>
        <div style={{ minWidth: 0 }}><div style={T.label}>MEALS</div><div style={{ ...T.name, fontSize: 14, marginTop: 3 }}>{SLOTS.map(([, l, sh]) => l + ' ' + Math.round(tg.kcal * sh)).join(' · ')}</div></div>
        <span style={{ ...T.mono, fontSize: 11, color: C.amber, flex: 'none' }}>EDIT ›</span>
      </div>
    </div> : null}
  </Card>;
}

function AddFood({ app, st, slot, setSlot, dateLabel, onClose, addEntries, flash }) {
  const [q, setQ] = useState(''), [tab, setTab] = useState('recent');
  const [detail, setDetail] = useState(null);   // normalized food
  const [create, setCreate] = useState(null);   // draft
  const [quick, setQuick] = useState(false);
  const [menu, setMenu] = useState(null);
  const [photo, setPhoto] = useState(null);   // { status, url, b64, items, note }
  const fileRef = useRef(null);
  const db = useDbSearch(q);
  const SH = window.SH;
  const slotLabel = (SLOTS.find(s => s[0] === slot) || SLOTS[SLOTS.length - 1])[1];
  const mine = (st.customFoods || []).map(f => ({ ...f, src: 'MINE' }));
  const pools = { recent: (st.recentFoods || []), favs: (st.favFoods || []), mine };
  let rows;
  if (q.trim()) {
    const ql = q.trim().toLowerCase(), seen = new Set(), out = [];
    const push = f => { const nf = normFood(f); if (seen.has(nf.key)) return; seen.add(nf.key); out.push(nf); };
    [].concat(mine, st.favFoods || [], st.recentFoods || [], st.savedFoods || [], SH.FOODS).filter(f => (f.name + ' ' + (f.brand || '')).toLowerCase().includes(ql)).slice(0, 8).forEach(push);
    if (db && db.status === 'ok') db.foods.forEach(push);
    rows = out;
  } else rows = tab === 'meals' ? null : pools[tab].map(normFood);

  const quickAdd = nf => { addEntries([makeEntry(nf, 1, 'serv', slot)], nf.name.toUpperCase() + ' → ' + slotLabel.toUpperCase()); };
  const scan = async () => {
    if (!window.Scanner) return;
    const code = await window.Scanner.open(); if (!code) return;
    const own = (st.customFoods || []).find(f => f.upc === code);
    if (own) { setDetail(normFood({ ...own, src: 'MINE' })); return; }
    flash('LOOKING UP ' + code + '…');
    try {
      const r = await fetch('/api/food-barcode?code=' + encodeURIComponent(code)), j = r.ok ? await r.json() : {};
      if (j.food) setDetail(normFood({ name: j.food.name, brand: j.food.brand, serv: j.food.serv, g: j.food.g, per100: j.food.per100, src: j.food.source, upc: code }));
      else setCreate({ name: '', brand: '', serv: '1 serving', g: '', kcal: '', p: '', c: '', f: '', upc: code, note: 'BARCODE ' + code + ' ISN’T IN THE DATABASES. ADD IT FROM THE LABEL ONCE AND IT SCANS NEXT TIME.' });
    } catch (e) { setCreate({ name: '', brand: '', serv: '1 serving', g: '', kcal: '', p: '', c: '', f: '', upc: code, note: 'OFFLINE — ENTER IT FROM THE LABEL.' }); }
  };
  const [voice, setVoice] = useState(false);
  // photo (b64) or voice (said) → the AI lists foods → editable review
  const analyse = async (b64, url, hint, said) => {
    setPhoto({ status: 'loading', url, b64, said, items: [], note: '' });
    try {
      const { ok, j } = await aiPost('/api/food-photo', said ? { text: said, hint } : { image: b64, media_type: 'image/jpeg', hint });
      if (!ok) { setPhoto({ status: 'error', url, b64, said, items: [], note: j.message || 'Couldn’t analyse that.' }); return; }
      setPhoto({ status: 'ready', url, b64, said, note: j.note || '', items: (j.items || []).map(i => ({ ...i, key: uid(), per100: i.grams ? { kcal: i.kcal * 100 / i.grams, p: i.p * 100 / i.grams, c: i.c * 100 / i.grams, f: i.f * 100 / i.grams } : null })) });
    } catch (e) { setPhoto({ status: 'error', url, b64, said, items: [], note: navigator.onLine === false ? 'You’re offline — AI logging needs internet.' : 'Couldn’t reach the server.' }); }
  };
  const onPhoto = async ev => {
    const file = ev.target.files && ev.target.files[0]; ev.target.value = '';
    if (!file) return;
    try { const { b64, url } = await shrinkToJpeg(file); analyse(b64, url, ''); } catch (e) { flash(String(e.message || e).toUpperCase()); }
  };
  const row = nf => <div key={nf.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid #272c34' }}>
    <div role="button" onClick={() => setDetail(nf)} style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}>
      <div style={{ ...T.name, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{nf.name}</div>
      <div style={{ ...T.label, marginTop: 3, letterSpacing: '.05em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{[nf.src, nf.brand, nf.servLabel].filter(Boolean).join(' · ').toUpperCase()}</div>
    </div>
    <div role="button" onClick={() => setDetail(nf)} style={{ textAlign: 'right', cursor: 'pointer' }}><div style={{ font: `700 17px/1 ${F.head}`, color: C.amber }}>{Math.round(nf.perServ.kcal)}</div><div style={{ ...T.label, fontSize: 9 }}>KCAL</div></div>
    <div role="button" onClick={() => quickAdd(nf)} style={{ width: 40, height: 40, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid ' + C.amber, color: C.amber, font: `600 20px/1 ${F.mono}`, cursor: 'pointer' }}>+</div>
  </div>;

  return <Sheet z={50} title={slotLabel + ' ▾'} sub={dateLabel.toUpperCase()} left={<TopLink tone={C.amber} onClick={onClose}>‹ DONE</TopLink>}
    right={<span />} onTitle={() => setMenu({ title: 'Add to', actions: SLOTS.map(([v, l]) => ({ label: l, run: () => setSlot(v) })) })}>
    <div style={{ padding: '12px 16px 24px' }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <Field value={q} onChange={setQ} placeholder="Search foods & brands" style={{ flex: 1 }} />
        <Btn tone={C.amber} ink={C.amberInk} onClick={scan} style={{ minHeight: 44, padding: '0 12px', fontSize: 14 }}>▥ Scan</Btn>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <Btn kind="ghost" tone={C.amber} onClick={() => fileRef.current && fileRef.current.click()} style={{ flex: 1, padding: '0 8px' }}>📷 PHOTO</Btn>
        <Btn kind="ghost" tone={C.amber} onClick={() => setVoice(true)} style={{ flex: 1, padding: '0 8px' }}>🎤 SAY IT</Btn>
      </div>
      <div style={{ ...T.label, marginTop: 5, color: C.faint, textAlign: 'center' }}>AI WORKS OUT THE FOODS · YOU CHECK BEFORE ADDING</div>
      <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={onPhoto} style={{ display: 'none' }} />
      {!q.trim() ? <div style={{ marginTop: 12 }}><Seg items={[['recent', 'RECENT'], ['favs', 'FAVOURITES'], ['mine', 'MY FOODS'], ['meals', 'MEALS']]} value={tab} onChange={setTab} tone={C.amber} ink={C.amberInk} /></div> : null}
      {q.trim() ? <div style={{ ...T.label, margin: '12px 0 2px' }}>{rows.length} RESULTS{db && db.status === 'loading' ? ' · SEARCHING CANADIAN + USDA FOODS…' : db && db.status === 'err' ? ' · ' + String(db.msg || 'DATABASE UNREACHABLE').toUpperCase().slice(0, 90) : db ? ' · INCL. USDA' : ''}</div> : null}
      {rows ? rows.map(row) : null}
      {rows && !rows.length ? <Empty>{q.trim() ? (db && db.status === 'loading' ? 'SEARCHING…' : 'NO MATCHES · CREATE IT BELOW') : tab === 'recent' ? 'FOODS YOU LOG SHOW UP HERE' : tab === 'favs' ? 'TAP ♡ ON A FOOD TO KEEP IT HERE' : 'FOODS YOU CREATE SHOW UP HERE'}</Empty> : null}
      {tab === 'meals' && !q.trim() ? <div>
        {(st.regulars || []).map(r => { const t = sumN(r.items); return <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 0', borderBottom: '1px solid #272c34' }}>
          <div style={{ flex: 1, minWidth: 0 }}><div style={T.name}>{r.name}</div><div style={{ ...T.label, marginTop: 3 }}>{r.items.length} ITEMS · {r.items.map(i => i.name).join(', ').slice(0, 60).toUpperCase()}</div></div>
          <div style={{ font: `700 17px/1 ${F.head}`, color: C.amber }}>{Math.round(t.kcal)}</div>
          <div role="button" onClick={() => addEntries(r.items.map(m => ({ ...m, id: 'm' + uid(), time: SH.nowHM(), slot })), r.name.toUpperCase() + ' → ' + slotLabel.toUpperCase())} style={{ width: 40, height: 40, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid ' + C.amber, color: C.amber, font: `600 20px/1 ${F.mono}`, cursor: 'pointer' }}>+</div>
          <span role="button" onClick={() => { if (confirm('Delete the saved meal “' + r.name + '”?')) app.setState(s => ({ regulars: s.regulars.filter(x => x.id !== r.id) })); }} style={{ ...T.mono, fontSize: 14, color: C.faint, padding: 6, cursor: 'pointer' }}>✕</span>
        </div>; })}
        {!(st.regulars || []).length ? <Empty>LOG A MEAL, THEN USE ••• → “SAVE AS A MEAL” ON ITS SECTION</Empty> : null}
      </div> : null}
      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <Btn kind="ghost" tone={C.amber} onClick={() => setCreate({ name: q.trim(), brand: '', serv: '1 serving', g: '', kcal: '', p: '', c: '', f: '', upc: '' })} style={{ flex: 1 }}>+ CREATE FOOD</Btn>
        <Btn kind="ghost" tone={C.amber} onClick={() => setQuick(true)} style={{ flex: 1 }}>⚡ QUICK ADD</Btn>
      </div>
    </div>
    {detail ? <FoodDetail st={st} app={app} nf={detail} slot={slot} onClose={() => setDetail(null)} onSave={(amount, unit, sl) => { addEntries([makeEntry(detail, amount, unit, sl)], detail.name.toUpperCase() + ' → ' + (SLOTS.find(s => s[0] === sl) || SLOTS[SLOTS.length - 1])[1].toUpperCase()); setDetail(null); }} /> : null}
    {create ? <CreateFood app={app} draft={create} setDraft={setCreate} onClose={() => setCreate(null)} onSaved={nf => { setCreate(null); setQ(''); setDetail(nf); }} /> : null}
    {voice ? <VoiceCapture onClose={() => setVoice(false)} onDone={text => { setVoice(false); analyse(null, null, '', text); }} /> : null}
    {photo ? <PhotoReview photo={photo} setPhoto={setPhoto} slot={slot} st={st} onClose={() => setPhoto(null)} onRecheck={hint => analyse(photo.b64, photo.url, hint, photo.said)}
      onAdd={(items, sl) => { addEntries(items.map(i => makeEntry(normFood({ name: i.name.trim() || 'Food', serv: i.amount || (i.grams ? i.grams + ' g' : '1 serving'), g: i.grams || null, kcal: i.kcal, p: i.p, c: i.c, f: i.f, src: 'PHOTO' }), 1, 'serv', sl)),
        items.length + (items.length === 1 ? ' ITEM' : ' ITEMS') + ' → ' + (SLOTS.find(s => s[0] === sl) || SLOTS[SLOTS.length - 1])[1].toUpperCase()); setPhoto(null); }} /> : null}
    {quick ? <QuickAdd onClose={() => setQuick(false)} onSave={v => { addEntries([{ id: 'm' + uid(), time: SH.nowHM(), slot, name: v.name || 'Quick add', amount: 1, unit: 'quick', serv: 'quick add', kcal: v.kcal, p: v.p, c: v.c, f: v.f }], 'QUICK ADD → ' + slotLabel.toUpperCase()); setQuick(false); }} /> : null}
    {menu ? <ActionSheet title={menu.title} actions={menu.actions} onClose={() => setMenu(null)} /> : null}
  </Sheet>;
}

function FoodDetail({ st, app, nf, entry, slot: slot0, onClose, onSave, onDelete }) {
  const units = [['serv', nf.servLabel]].concat(nf.per100 ? [['g', 'g'], ['oz', 'oz']] : []);
  const [unit, setUnit] = useState(entry && entry.unit && units.some(u => u[0] === entry.unit) ? entry.unit : 'serv');
  const [amt, setAmt] = useState(entry && entry.unit !== 'quick' ? String(entry.amount != null ? entry.amount : 1) : '1');
  const [slot, setSlot] = useState(slot0);
  const quickEntry = entry && entry.unit === 'quick';
  const v = quickEntry ? { kcal: entry.kcal, p: entry.p, c: entry.c, f: entry.f, g: null } : calcAmount(nf, num(amt) || 0, unit);
  const tg = st.targets;
  const fav = (st.favFoods || []).some(f => f.key === nf.key);
  const toggleFav = () => app.setState(s => ({ favFoods: fav ? (s.favFoods || []).filter(f => f.key !== nf.key) : [nf].concat(s.favFoods || []) }));
  const switchUnit = u => {
    if (u === unit) return;
    const cur = num(amt) || 0, g = unit === 'g' ? cur : unit === 'oz' ? cur * 28.3495 : cur * (nf.servG || 100);
    setAmt(String(u === 'g' ? Math.round(g) : u === 'oz' ? r1(g / 28.3495) : r2(g / (nf.servG || 100))));
    setUnit(u);
  };
  const tile = (l, val, goal, tone) => <Card style={{ padding: '10px 10px', flex: 1 }}><div style={{ ...T.label, color: tone }}>{l}</div><div style={{ font: `700 22px/1.1 ${F.head}`, marginTop: 3 }}>{r1(val)}<span style={{ fontSize: 12, color: C.mute }}> g</span></div><div style={{ ...T.label, marginTop: 2 }}>{goal ? Math.round(100 * val / goal) : 0}% OF GOAL</div></Card>;
  return <Sheet z={65} title={nf.name} sub={[nf.src, nf.brand].filter(Boolean).join(' · ').toUpperCase()} left={<TopLink tone={C.amber} onClick={onClose}>‹ BACK</TopLink>}
    right={<span role="button" onClick={toggleFav} style={{ font: `400 24px/1 ${F.body}`, color: fav ? C.red : C.dim, cursor: 'pointer', padding: '4px 6px' }}>{fav ? '♥' : '♡'}</span>}
    footer={<div style={{ display: 'flex', gap: 8 }}>{onDelete ? <Btn kind="danger" onClick={() => { if (confirm('Remove this entry?')) onDelete(); }} style={{ flex: 1 }}>DELETE</Btn> : null}
      <Btn tone={C.amber} ink={C.amberInk} onClick={() => onSave(quickEntry ? 1 : num(amt) || 0, quickEntry ? 'quick' : unit, slot)} style={{ flex: 2 }}>{entry ? 'Save' : 'Add to ' + (SLOTS.find(s => s[0] === slot) || SLOTS[SLOTS.length - 1])[1]}</Btn></div>}>
    <div style={{ padding: '18px 18px 26px' }}>
      <div style={{ textAlign: 'center' }}><div style={{ font: `800 56px/0.9 ${F.head}`, color: C.amber }}>{Math.round(v.kcal)}</div><div style={{ ...T.label, marginTop: 6 }}>KCAL · {tg.kcal ? Math.round(100 * v.kcal / tg.kcal) : 0}% OF DAILY GOAL{v.g ? ' · ' + r1(v.g) + ' G' : ''}</div></div>
      <div style={{ display: 'flex', gap: 7, marginTop: 16 }}>{tile('CARBS', v.c, tg.c, C.amber)}{tile('PROTEIN', v.p, tg.p, C.blue)}{tile('FAT', v.f, tg.f, C.olive)}</div>
      {!quickEntry ? <>
        <div style={{ ...T.label, margin: '20px 0 6px' }}>AMOUNT</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
          <Btn kind="ghost" tone={C.text} onClick={() => setAmt(String(Math.max(0, r2((num(amt) || 0) - (unit === 'serv' ? 0.5 : unit === 'g' ? 10 : 1)))))} style={{ minHeight: 48, padding: '0 16px' }}>−</Btn>
          <input inputMode="decimal" value={amt} onChange={e => setAmt(e.target.value)} style={{ flex: 1, minWidth: 0, boxSizing: 'border-box', background: C.card, border: '1px solid ' + C.line2, color: C.text, textAlign: 'center', font: `700 24px/1 ${F.head}`, outline: 'none' }} />
          <Btn kind="ghost" tone={C.text} onClick={() => setAmt(String(r2((num(amt) || 0) + (unit === 'serv' ? 0.5 : unit === 'g' ? 10 : 1))))} style={{ minHeight: 48, padding: '0 16px' }}>+</Btn>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>{units.map(([u, l]) => <Chip key={u} on={unit === u} tone={C.amber} ink={C.amberInk} onClick={() => switchUnit(u)}>{u === 'serv' ? l.toUpperCase() : l.toUpperCase()}</Chip>)}</div>
        {nf.per100 ? <div style={{ ...T.label, marginTop: 10, color: C.faint }}>PER 100 G · {Math.round(nf.per100.kcal)} KCAL · P {r1(nf.per100.p)} · C {r1(nf.per100.c)} · F {r1(nf.per100.f)}</div> : <div style={{ ...T.label, marginTop: 10, color: C.faint }}>VALUES PER SERVING</div>}
      </> : null}
      <div style={{ ...T.label, margin: '20px 0 6px' }}>MEAL</div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{SLOTS.map(([v2, l]) => <Chip key={v2} on={slot === v2} tone={C.amber} ink={C.amberInk} onClick={() => setSlot(v2)} style={{ flex: '1 0 22%', textAlign: 'center', padding: '10px 4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.toUpperCase()}</Chip>)}</div>
    </div>
  </Sheet>;
}

function CreateFood({ app, draft, setDraft, onClose, onSaved }) {
  const set = k => v => setDraft({ ...draft, [k]: v });
  const p = num(draft.p) || 0, c = num(draft.c) || 0, f = num(draft.f) || 0;
  const kcal = num(draft.kcal) != null ? num(draft.kcal) : Math.round(p * 4 + c * 4 + f * 9);
  const save = () => {
    const name = (draft.name || '').trim(); if (!name) { setDraft({ ...draft, note: 'GIVE IT A NAME FIRST' }); return; }
    const g = num(draft.g), serv = (draft.serv || '1 serving').trim();
    const food = { id: 'c' + uid(), name, brand: (draft.brand || '').trim(), serv: g ? serv + ' (' + g + ' g)' : serv, kcal: Math.round(kcal), p: r1(p), c: r1(c), f: r1(f), mine: true };
    if (draft.upc) food.upc = draft.upc;
    if (g) { food.g = g; food.per100 = { kcal: r2(kcal * 100 / g), p: r2(p * 100 / g), c: r2(c * 100 / g), f: r2(f * 100 / g) }; }
    app.setState(s => ({ customFoods: [food].concat((s.customFoods || []).filter(x => x.name.toLowerCase() !== name.toLowerCase())).slice(0, 300) }));
    onSaved(normFood({ ...food, src: 'MINE' }));
  };
  return <Sheet z={70} title="Create food" left={<TopLink tone={C.amber} onClick={onClose}>‹ BACK</TopLink>} footer={<Btn tone={C.amber} ink={C.amberInk} onClick={save}>Save food</Btn>}>
    <div style={{ padding: '14px 18px 26px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {draft.note ? <div style={{ ...T.mono, fontSize: 11, lineHeight: 1.5, color: C.amber }}>{draft.note}</div> : null}
      <Field label="NAME" value={draft.name} onChange={set('name')} placeholder="e.g. Protein bar, chocolate" autoFocus={!draft.name} />
      <Field label="BRAND · OPTIONAL" value={draft.brand} onChange={set('brand')} placeholder="e.g. Kirkland" />
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 8 }}><Field label="SERVING" value={draft.serv} onChange={set('serv')} placeholder="1 bar" /><Field label="GRAMS PER SERVING" value={draft.g} onChange={set('g')} placeholder="60" inputMode="decimal" /></div>
      <div style={{ ...T.label }}>NUTRITION PER SERVING (FROM THE LABEL)</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6 }}>
        <Field label="KCAL" value={draft.kcal} onChange={set('kcal')} placeholder={String(Math.round(p * 4 + c * 4 + f * 9))} inputMode="decimal" />
        <Field label="PROT" value={draft.p} onChange={set('p')} placeholder="g" inputMode="decimal" />
        <Field label="CARB" value={draft.c} onChange={set('c')} placeholder="g" inputMode="decimal" />
        <Field label="FAT" value={draft.f} onChange={set('f')} placeholder="g" inputMode="decimal" />
      </div>
      <div style={{ ...T.label, color: C.faint, lineHeight: 1.5 }}>LEAVE KCAL EMPTY TO CALCULATE IT (4/4/9). ADD GRAMS TO LOG ANY AMOUNT IN G OR OZ LATER.{draft.upc ? ' BARCODE ' + draft.upc + ' WILL SCAN TO THIS FOOD.' : ''}</div>
    </div>
  </Sheet>;
}

function QuickAdd({ onClose, onSave }) {
  const [d, setD] = useState({ name: '', kcal: '', p: '', c: '', f: '' });
  const set = k => v => setD({ ...d, [k]: v });
  const p = num(d.p) || 0, c = num(d.c) || 0, f = num(d.f) || 0, kcal = num(d.kcal) != null ? num(d.kcal) : Math.round(p * 4 + c * 4 + f * 9);
  return <Sheet z={70} title="Quick add" left={<TopLink tone={C.amber} onClick={onClose}>‹ BACK</TopLink>} footer={<Btn tone={C.amber} ink={C.amberInk} disabled={!kcal} onClick={() => onSave({ name: d.name.trim(), kcal: Math.round(kcal), p: r1(p), c: r1(c), f: r1(f) })}>Add {Math.round(kcal) || ''} kcal</Btn>}>
    <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Field label="LABEL · OPTIONAL" value={d.name} onChange={set('name')} placeholder="e.g. Restaurant dinner" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6 }}>
        <Field label="KCAL" value={d.kcal} onChange={set('kcal')} inputMode="decimal" autoFocus />
        <Field label="PROT" value={d.p} onChange={set('p')} placeholder="g" inputMode="decimal" />
        <Field label="CARB" value={d.c} onChange={set('c')} placeholder="g" inputMode="decimal" />
        <Field label="FAT" value={d.f} onChange={set('f')} placeholder="g" inputMode="decimal" />
      </div>
    </div>
  </Sheet>;
}

window.TrainScreen = TrainScreen;
window.FuelScreen = FuelScreen;

function PhotoReview({ photo, setPhoto, slot: slot0, st, onClose, onRecheck, onAdd }) {
  const [slot, setSlot] = useState(slot0);
  const [hint, setHint] = useState('');
  const items = photo.items || [];
  const upd = (key, fn) => setPhoto(p => ({ ...p, items: p.items.map(i => i.key === key ? fn(i) : i) }));
  const setGrams = (i, v) => upd(i.key, x => {
    const g = num(v);
    if (g == null) return { ...x, grams: '' };
    if (!x.per100) return { ...x, grams: g };
    return { ...x, grams: g, kcal: Math.round(x.per100.kcal * g / 100), p: r1(x.per100.p * g / 100), c: r1(x.per100.c * g / 100), f: r1(x.per100.f * g / 100) };
  });
  const setVal = (i, k, v) => upd(i.key, x => { const n2 = num(v); const nx = { ...x, [k]: n2 == null ? '' : n2 }; if (nx.grams) nx.per100 = { kcal: (Number(nx.kcal) || 0) * 100 / nx.grams, p: (Number(nx.p) || 0) * 100 / nx.grams, c: (Number(nx.c) || 0) * 100 / nx.grams, f: (Number(nx.f) || 0) * 100 / nx.grams }; return nx; });
  const tot = sumN(items.map(i => ({ kcal: Number(i.kcal) || 0, p: Number(i.p) || 0, c: Number(i.c) || 0, f: Number(i.f) || 0 })));
  const cell = { width: '100%', boxSizing: 'border-box', background: '#282d36', border: 'none', color: C.text, textAlign: 'center', font: `600 15px/1 ${F.body}`, padding: '9px 2px', outline: 'none', minWidth: 0 };
  const loading = photo.status === 'loading';
  return <Sheet z={68} title={photo.said ? 'Voice log' : 'Photo log'} sub={loading ? 'ANALYSING…' : photo.status === 'error' ? 'COULDN’T ANALYSE' : items.length + ' ITEMS · CHECK AND EDIT'} left={<TopLink tone={C.amber} onClick={onClose}>‹ BACK</TopLink>}
    footer={<Btn tone={C.amber} ink={C.amberInk} disabled={loading || !items.length} onClick={() => onAdd(items.filter(i => (i.name || '').trim()).map(i => ({ ...i, kcal: Number(i.kcal) || 0, p: Number(i.p) || 0, c: Number(i.c) || 0, f: Number(i.f) || 0, grams: Number(i.grams) || null })), slot)}>
      {loading ? 'Analysing…' : 'Add ' + items.length + (items.length === 1 ? ' item' : ' items') + ' · ' + Math.round(tot.kcal) + ' kcal'}</Btn>}>
    <div style={{ padding: '14px 16px 26px' }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        {photo.said ? <div style={{ width: 96, flex: 'none', font: `italic 400 13px/1.4 ${F.body}`, color: C.text, background: C.card, border: '1px solid ' + C.line2, borderRadius: 10, padding: 8, boxSizing: 'border-box' }}>🎤 “{photo.said}”</div>
          : <img src={photo.url} style={{ width: 96, height: 96, objectFit: 'cover', flex: 'none', border: '1px solid ' + C.line2 }} />}
        <div style={{ flex: 1, minWidth: 0 }}>
          {loading ? <div style={{ ...T.mono, fontSize: 12, color: C.amber, lineHeight: 1.6 }}>{photo.said ? 'WORKING OUT WHAT YOU ATE…' : 'LOOKING AT YOUR PLATE…'}</div>
            : <><div style={{ font: `800 34px/0.95 ${F.head}`, color: C.amber }}>{Math.round(tot.kcal)}<span style={{ fontSize: 14, color: C.mute }}> KCAL</span></div>
              <div style={{ ...T.label, marginTop: 5 }}>P {r1(tot.p)} · C {r1(tot.c)} · F {r1(tot.f)} G</div></>}
          {photo.note ? <div style={{ font: `400 13px/1.4 ${F.body}`, color: photo.status === 'error' ? '#e0a89a' : C.dim, marginTop: 6 }}>{photo.note}</div> : null}
        </div>
      </div>
      {items.map(i => <Card key={i.key} style={{ marginTop: 10, padding: 11 }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input value={i.name} onChange={e => { const v = e.target.value; upd(i.key, x => ({ ...x, name: v })); }} style={{ ...cell, textAlign: 'left', flex: 1, padding: '9px 8px', font: `600 15px/1.2 ${F.body}` }} />
          {i.confidence === 'low' ? <span style={{ ...T.label, color: C.amber }}>UNSURE</span> : null}
          <span role="button" onClick={() => setPhoto(p => ({ ...p, items: p.items.filter(x => x.key !== i.key) }))} style={{ ...T.mono, fontSize: 14, color: C.faint, padding: '6px 4px', cursor: 'pointer' }}>✕</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr 1fr 1fr', gap: 5, marginTop: 7 }}>
          {[['AMOUNT', 'amount'], ['G', 'grams'], ['KCAL', 'kcal'], ['P', 'p'], ['C', 'c'], ['F', 'f']].map(([l, k]) => <div key={k} style={{ minWidth: 0 }}>
            <div style={{ ...T.label, fontSize: 9, textAlign: 'center', marginBottom: 3 }}>{l}</div>
            {k === 'amount' ? <input value={i.amount || ''} placeholder="1 plate" onChange={e => { const v = e.target.value; upd(i.key, x => ({ ...x, amount: v })); }} style={{ ...cell, fontSize: 13 }} />
              : <input inputMode="decimal" value={i[k] == null ? '' : i[k]} onChange={e => k === 'grams' ? setGrams(i, e.target.value) : setVal(i, k, e.target.value)} style={cell} />}
          </div>)}
        </div>
      </Card>)}
      {!loading ? <Btn kind="ghost" tone={C.amber} onClick={() => setPhoto(p => ({ ...p, items: p.items.concat({ key: uid(), name: '', amount: '', grams: '', kcal: '', p: '', c: '', f: '', per100: null }) }))} style={{ marginTop: 10 }}>+ ADD AN ITEM</Btn> : null}
      <div style={{ ...T.label, margin: '14px 0 5px' }}>CHANGING GRAMS RESCALES THAT ITEM’S NUMBERS</div>
      <div style={{ ...T.label, margin: '14px 0 6px' }}>MEAL</div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{SLOTS.map(([v2, l]) => <Chip key={v2} on={slot === v2} tone={C.amber} ink={C.amberInk} onClick={() => setSlot(v2)} style={{ flex: '1 0 22%', textAlign: 'center', padding: '10px 4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.toUpperCase()}</Chip>)}</div>
      {!loading ? <div style={{ marginTop: 16 }}>
        <Field label="MISSED SOMETHING? TELL IT AND RE-CHECK" value={hint} onChange={setHint} placeholder="e.g. cooked in 1 tbsp butter, rice is ~200 g" />
        <Btn kind="ghost" tone={C.amber} disabled={!hint.trim()} onClick={() => onRecheck(hint.trim())} style={{ marginTop: 8 }}>{photo.said ? 'RE-CHECK' : 'RE-CHECK PHOTO'}</Btn>
      </div> : null}
    </div>
  </Sheet>;
}

function WeekCard({ st, date, onPick }) {
  const tg = st.targets;
  const dayOf = d => d === st.curDate ? { meals: st.meals || [] } : ((st.diary || {})[d] || { meals: [] });
  const days = Array.from({ length: 7 }, (_, i) => addDaysIso(date, i - 6)).map(d => { const t = sumN(dayOf(d).meals); return { d, kcal: t.kcal, p: t.p, n: dayOf(d).meals.length }; });
  const logged = days.filter(x => x.n);
  const avg = k => logged.length ? logged.reduce((a, x) => a + x[k], 0) / logged.length : 0;
  const bars = days.map(x => ({ label: niceDate(x.d) + (x.n ? '' : ' · nothing logged'), tick: WD[dOf(x.d).getDay()].charAt(0), y: Math.round(x.kcal),
    tone: x.kcal > tg.kcal * 1.1 ? C.red : C.amber }));
  return <Card style={{ padding: '12px 12px 8px' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
      <span style={{ font: `700 18px/1 ${F.head}`, letterSpacing: '.08em', textTransform: 'uppercase' }}>Last 7 days</span>
      <span style={{ ...T.label }}>{logged.length}/7 DAYS LOGGED</span>
    </div>
    <div style={{ display: 'flex', gap: 14, margin: '10px 0 4px' }}>
      <div><div style={T.label}>AVG KCAL</div><div style={{ font: `700 20px/1.1 ${F.head}`, marginTop: 3 }}>{Math.round(avg('kcal')).toLocaleString()}<span style={{ fontSize: 12, color: C.mute }}> / {tg.kcal.toLocaleString()}</span></div></div>
      <div><div style={T.label}>AVG PROTEIN</div><div style={{ font: `700 20px/1.1 ${F.head}`, marginTop: 3 }}>{r1(avg('p'))}<span style={{ fontSize: 12, color: C.mute }}> / {tg.p} g</span></div></div>
    </div>
    <BarChart bars={bars} tone={C.amber} goal={tg.kcal} fmt={v => Math.round(v).toLocaleString()} height={130} />
  </Card>;
}

// Rename, add, remove, reorder meal sections and set each one's calories.
function MealSlotsEditor({ app, st, onClose }) {
  const goal = st.targets.kcal || 0;
  const [list, setList] = useState(() => (Array.isArray(st.mealSlots) && st.mealSlots.length ? st.mealSlots : DEF_MEALS()).map(m => ({ ...m, kc: String(Math.round(goal * (Number(m.pct) || 0) / 100)) })));
  const total = list.reduce((a, m) => a + (num(m.kc) || 0), 0), diff = Math.round(total - goal);
  const set = (id, patch) => setList(l => l.map(m => m.id === id ? { ...m, ...patch } : m));
  const bump = (id, d) => setList(l => l.map(m => m.id === id ? { ...m, kc: String(Math.max(0, (num(m.kc) || 0) + d)) } : m));
  const balance = () => { if (!total) return; setList(l => { const out = l.map(m => ({ ...m, kc: String(Math.round((num(m.kc) || 0) * goal / total)) })); const t = out.reduce((a, m) => a + num(m.kc), 0); if (out.length) out[out.length - 1].kc = String(num(out[out.length - 1].kc) + goal - t); return out; }); };
  const save = () => {
    const clean = list.map(m => ({ id: m.id, name: (m.name || '').trim() || 'Meal', pct: goal ? (num(m.kc) || 0) / goal * 100 : 0 }));
    if (!clean.length) { alert('Keep at least one meal.'); return; }
    app.setState({ mealSlots: clean }); onClose();
  };
  const inp = { boxSizing: 'border-box', background: '#282d36', border: 'none', color: C.text, font: `600 16px/1.2 ${F.body}`, padding: '10px 9px', outline: 'none', borderRadius: 10, minWidth: 0 };
  return <Sheet z={60} title="Meals" sub={'CALORIE GOAL ' + goal.toLocaleString() + ' KCAL'} left={<TopLink tone={C.amber} onClick={onClose}>‹ BACK</TopLink>} right={<TopLink tone={C.amber} onClick={save}>SAVE</TopLink>}
    footer={<div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ ...T.mono, fontSize: 12, color: diff === 0 ? C.olive : C.amber }}>{total.toLocaleString()} / {goal.toLocaleString()} KCAL{diff === 0 ? ' ✓' : diff > 0 ? ' · ' + diff + ' OVER' : ' · ' + (-diff) + ' UNPLANNED'}</span>
        {diff !== 0 && total ? <span role="button" onClick={balance} style={{ ...T.mono, fontSize: 11, color: C.amber, cursor: 'pointer', padding: '6px 2px' }}>FIT TO GOAL</span> : null}
      </div>
      <Btn tone={C.amber} ink={C.amberInk} onClick={save}>Save meals</Btn></div>}>
    <div style={{ padding: '12px 16px 24px' }}>
      <div style={{ ...T.body, color: C.dim, fontSize: 14 }}>Name your meals, set how many calories each one gets, drag ≡ to change the order. Food you already logged stays where it is.</div>
      <div style={{ display: 'flex', gap: 6, margin: '14px 0 2px', padding: '0 4px 0 36px' }}><span style={{ ...T.label, flex: 1 }}>NAME</span><span style={{ ...T.label, width: 150, textAlign: 'center' }}>KCAL · % OF GOAL</span><span style={{ width: 26 }} /></div>
      <DragList items={list} keyOf={m => m.id} onMove={(a, b) => setList(l => { const x = l.slice(); const [m] = x.splice(a, 1); x.splice(b, 0, m); return x; })} render={(m, i, dg) =>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 8, padding: '6px 6px 6px 2px', background: dg.dragging ? '#2a3037' : C.card, border: '1px solid ' + C.line, borderRadius: 14 }}>
          <Grip h={dg.handle} />
          <input value={m.name} placeholder="Meal name" onChange={e => set(m.id, { name: e.target.value })} style={{ ...inp, flex: 1 }} />
          <div style={{ width: 150, flex: 'none' }}>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <span role="button" onClick={() => bump(m.id, -25)} style={{ ...T.mono, fontSize: 16, color: C.dim, padding: '8px 6px', cursor: 'pointer' }}>−</span>
              <input inputMode="numeric" value={m.kc} onChange={e => set(m.id, { kc: e.target.value.replace(/[^\d]/g, '') })} style={{ ...inp, width: 64, textAlign: 'center', padding: '10px 2px' }} />
              <span role="button" onClick={() => bump(m.id, 25)} style={{ ...T.mono, fontSize: 16, color: C.dim, padding: '8px 6px', cursor: 'pointer' }}>+</span>
            </div>
            <div style={{ ...T.label, textAlign: 'center', marginTop: 3 }}>{goal ? r1((num(m.kc) || 0) / goal * 100) : 0} %</div>
          </div>
          <span role="button" onClick={() => setList(l => l.length > 1 ? l.filter(x => x.id !== m.id) : l)} style={{ ...T.mono, fontSize: 14, color: list.length > 1 ? C.faint : C.line2, padding: '8px 4px', cursor: 'pointer', width: 18, textAlign: 'center' }}>✕</span>
        </div>} />
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <Btn kind="ghost" tone={C.amber} onClick={() => setList(l => l.concat({ id: 'M' + uid(), name: '', kc: '0' }))} style={{ flex: 1 }}>+ ADD A MEAL</Btn>
        <Btn kind="ghost" tone={C.dim} onClick={() => setList(DEF_MEALS().map(m => ({ ...m, kc: String(Math.round(goal * m.pct / 100)) })))} style={{ flex: 1 }}>RESET</Btn>
      </div>
      <div style={{ ...T.label, color: C.faint, marginTop: 14, lineHeight: 1.6 }}>MEAL CALORIES FOLLOW YOUR DAILY GOAL: IF YOU CHANGE THE GOAL, EACH MEAL KEEPS ITS SHARE.</div>
    </div>
  </Sheet>;
}


// Listen with the phone's speech recognition (Safari/Chrome); if it isn't available, type or use the keyboard's 🎤.
function VoiceCapture({ onClose, onDone }) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const [text, setText] = useState(''), [live, setLive] = useState(''), [on, setOn] = useState(false), [err, setErr] = useState('');
  const rec = useRef(null), finalRef = useRef('');
  const start = () => {
    if (!SR) return;
    try {
      const r = new SR(); rec.current = r;
      r.lang = 'en-CA'; r.interimResults = true; r.continuous = true;
      r.onresult = e => { let fin = '', mid = ''; for (let i = 0; i < e.results.length; i++) { const t = e.results[i][0].transcript; if (e.results[i].isFinal) fin += t + ' '; else mid += t; } finalRef.current = fin; setText(fin.trim()); setLive(mid); };
      r.onerror = e => { setOn(false); setErr(e.error === 'not-allowed' ? 'Microphone access is blocked — allow it in Settings, or type below.' : e.error === 'no-speech' ? 'Didn’t hear anything — tap the mic and try again.' : 'Voice didn’t work here — type below or use the 🎤 on your keyboard.'); };
      r.onend = () => setOn(false);
      r.start(); setOn(true); setErr(''); vib(15);
    } catch (e) { setErr('Voice didn’t work here — type below or use the 🎤 on your keyboard.'); }
  };
  const stop = () => { try { rec.current && rec.current.stop(); } catch (e) { /* ignore */ } setOn(false); };
  useEffect(() => { if (SR) start(); return () => { try { rec.current && rec.current.abort(); } catch (e) { /* ignore */ } }; }, []);
  const said = (text + ' ' + live).trim();
  return <Sheet z={66} title="Say what you ate" left={<TopLink tone={C.amber} onClick={() => { stop(); onClose(); }}>‹ BACK</TopLink>}
    footer={<Btn tone={C.amber} ink={C.amberInk} disabled={!said} onClick={() => { stop(); onDone(said); }}>Work it out</Btn>}>
    <div style={{ padding: '22px 18px', textAlign: 'center' }}>
      {SR ? <div role="button" onClick={on ? stop : start} style={{ width: 112, height: 112, margin: '6px auto 0', borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', font: `400 44px/1 ${F.body}`, cursor: 'pointer',
        background: on ? C.amber : C.card, border: '2px solid ' + C.amber, boxShadow: on ? '0 0 0 10px rgba(244,181,68,.18), 0 0 0 22px rgba(244,181,68,.08)' : 'none', transition: 'box-shadow .3s' }}>🎤</div> : null}
      <div style={{ ...T.mono, fontSize: 12, color: on ? C.amber : C.dim, marginTop: 16 }}>{SR ? (on ? 'LISTENING… TAP TO STOP' : 'TAP THE MIC TO TALK') : 'TYPE IT, OR TAP 🎤 ON YOUR KEYBOARD'}</div>
      <div style={{ ...T.body, color: C.dim, fontSize: 14, marginTop: 8 }}>e.g. “two eggs, a slice of whole wheat toast with peanut butter and a large coffee with milk”</div>
      {err ? <div style={{ ...T.body, color: C.red, fontSize: 14, marginTop: 10 }}>{err}</div> : null}
      <textarea value={on ? said : text} onChange={e => { setText(e.target.value); setLive(''); }} rows={4} placeholder="What did you eat?"
        style={{ width: '100%', boxSizing: 'border-box', marginTop: 16, background: C.card, border: '1px solid ' + C.line2, borderRadius: 12, color: C.text, font: `400 16px/1.45 ${F.body}`, padding: 12, outline: 'none', resize: 'none', textAlign: 'left' }} />
    </div>
  </Sheet>;
}
