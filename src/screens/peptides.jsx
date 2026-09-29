// ── Peptides (Train → PEPTIDE tab): reconstitution calculator + weekly schedule + dose log ──
// st.peptides [{ id, name, syringe (ml: 0.3|0.5|1), vialMg, waterMl, doseMcg, days [Sun..Sat 0/1], log [{date, mcg, units}],
// vialStart (date the current vial was mixed) }]. Insulin syringes are U-100: 100 units = 1 ml.
// Units to draw = dose ÷ concentration × 100, where concentration = vial mcg ÷ water ml.
const PEP_DEFAULT = { name: '', syringe: 0.5, vialMg: 5, waterMl: 1, doseMcg: 1000, days: [0, 1, 0, 0, 0, 0, 0], log: [], vialStart: null };
const pepMath = p => {
  const conc = p.vialMg * 1000 / p.waterMl, ml = p.doseMcg / conc, units = ml * 100, max = p.syringe * 100;
  return { conc, ml, units, max, perVial: Math.floor(p.vialMg * 1000 / p.doseMcg + 1e-9) };
};
const unitsText = u => (Math.abs(u - Math.round(u)) < 0.05 ? String(Math.round(u)) : u.toFixed(1));
const WD_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// the syringe scale, like the calculator: ticks every unit, numbers every 5 (every 10 on a 1 ml syringe), filled to the dose
function SyringeScale({ units, max }) {
  const W = 340, H = 64, L = 8, R = 8, x = u => L + (W - L - R) * Math.min(1, u / max), step = max >= 100 ? 10 : 5;
  const ticks = []; for (let u = 0; u <= max; u += max >= 100 ? 2 : 1) ticks.push(u);
  return <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }} aria-label={'Syringe filled to ' + unitsText(units) + ' units'}>
    <rect x={L} y={6} width={W - L - R} height={34} rx={4} fill={C.card2} stroke={C.line2} />
    <rect x={L} y={6} width={Math.max(0, x(units) - L)} height={34} rx={4} fill={units > max ? C.red : C.blue} opacity=".9" />
    {ticks.map(u => { const big = u % step === 0; return <line key={u} x1={x(u)} x2={x(u)} y1={6} y2={big ? 30 : 18} stroke={C.text} strokeOpacity={big ? 0.9 : 0.5} strokeWidth={big ? 1.6 : 1} />; })}
    {ticks.filter(u => u % step === 0 && u > 0).map(u => <text key={'t' + u} x={x(u)} y={56} textAnchor={u === max ? 'end' : 'middle'} fill={C.dim} style={{ font: `600 11px ${F.mono}` }}>{u}</text>)}
  </svg>;
}

function PeptidesTab({ app, st }) {
  const list = st.peptides || [];
  const [edit, setEdit] = useState(null);
  const today = st.curDate, wd = dOf(today).getDay();
  const put = (id, ch) => app.setState(s => ({ peptides: (s.peptides || []).map(p => p.id === id ? { ...p, ...(typeof ch === 'function' ? ch(p) : ch) } : p) }));
  const add = () => { const id = 'pp' + uid(); app.setState(s => ({ peptides: (s.peptides || []).concat({ ...PEP_DEFAULT, id, vialStart: today }) })); setEdit(id); vib(8); };
  const nextDue = p => { for (let k = 1; k <= 7; k++) { const d = addDaysIso(today, k); if ((p.days || [])[dOf(d).getDay()]) return { d, k }; } return null; };
  const chips = (vals, cur, fmt, onPick) => <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
    {vals.map(v => <span key={v} role="button" onClick={() => onPick(v)} style={{ minWidth: 58, minHeight: 40, padding: '0 10px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 10, cursor: 'pointer', ...T.mono, fontSize: 12,
      background: cur === v ? C.blue : 'transparent', color: cur === v ? C.blueInk : C.dim, border: '1px solid ' + (cur === v ? C.blue : C.line2) }}>{fmt(v)}</span>)}
  </div>;
  const numRow = (label, p, key, vals, fmt, unit) => <div style={{ marginTop: 14 }}>
    <div style={{ ...T.label, marginBottom: 6 }}>{label}</div>
    {chips(vals, p[key], fmt, v => put(p.id, { [key]: v }))}
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
      <span style={{ ...T.label, color: C.faint }}>OTHER</span>
      <DecInput value={p[key]} onText={t => { const v = num(t); if (v > 0) put(p.id, { [key]: v }); }} aria-label={label}
        style={{ width: 110, boxSizing: 'border-box', background: C.bg, border: '1px solid ' + C.line2, borderRadius: 10, color: C.text, font: `600 16px/1.2 ${F.body}`, padding: '8px 10px', outline: 'none' }} />
      <span style={{ ...T.mono, color: C.dim }}>{unit}</span>
    </div>
  </div>;

  return <div style={{ padding: '14px 22px 30px' }}>
    {!list.length ? <Card>
      <div style={{ font: `700 20px/1.1 ${F.head}`, textTransform: 'uppercase' }}>Peptide tracker</div>
      <div style={{ ...T.body, color: C.dim, fontSize: 14, marginTop: 6, lineHeight: 1.45 }}>Works out how far to pull an insulin syringe for your dose, reminds you which day it’s due, and keeps a log of each dose and how much is left in the vial.</div>
      <Btn tone={C.olive} ink={C.oliveInk} onClick={add} style={{ marginTop: 12 }}>+ Add a peptide</Btn>
    </Card> : null}

    {list.map(p => { const M = pepMath(p), open = edit === p.id, doneToday = (p.log || []).some(l => l.date === today), dueToday = !!(p.days || [])[wd];
      const nx = nextDue(p), since = (p.log || []).filter(l => !p.vialStart || l.date >= p.vialStart).length, left = Math.max(0, M.perVial - since);
      const dayNames = WD_LONG.filter((_, i) => (p.days || [])[i]);
      const sched = dayNames.length === 7 ? 'EVERY DAY' : dayNames.length ? 'EVERY ' + dayNames.map(d => d.slice(0, 3)).join(', ').toUpperCase() : 'NO DAYS SET';
      const status = doneToday ? ['DONE TODAY ✓', C.olive] : dueToday ? ['DUE TODAY', C.amber] : nx ? ['NEXT: ' + WD_LONG[dOf(nx.d).getDay()].toUpperCase() + ' · ' + (nx.k === 1 ? 'TOMORROW' : 'IN ' + nx.k + ' DAYS'), C.mute] : ['NOT SCHEDULED', C.faint];
      const logDose = () => { put(p.id, q => ({ log: (q.log || []).filter(l => l.date !== today).concat({ date: today, mcg: q.doseMcg, units: Math.round(pepMath(q).units * 10) / 10 }).sort((a, b) => a.date < b.date ? -1 : 1) })); vib(12); };
      const undo = () => put(p.id, q => ({ log: (q.log || []).filter(l => l.date !== today) }));
      return <Card key={p.id} accent={doneToday ? C.olive : dueToday ? C.amber : C.blue} style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
          <div style={{ minWidth: 0 }}><div style={{ font: `700 20px/1.1 ${F.head}`, textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>💉 {p.name || 'Peptide'}</div>
            <div style={{ ...T.label, marginTop: 4 }}>{sched}</div></div>
          <TopLink tone={C.blue} onClick={() => setEdit(open ? null : p.id)}>{open ? 'DONE' : 'EDIT'}</TopLink>
        </div>
        <div style={{ ...T.mono, fontSize: 12, color: status[1], marginTop: 8 }}>{status[0]}</div>

        <div style={{ font: `400 17px/1.35 ${F.body}`, marginTop: 12 }}>To have a dose of <b>{p.doseMcg.toLocaleString()}</b> mcg pull the syringe to <b style={{ font: `800 30px/1 ${F.head}`, color: M.units > M.max ? C.red : C.blue }}>{unitsText(M.units)}</b> units</div>
        <div style={{ marginTop: 10 }}><SyringeScale units={M.units} max={M.max} /></div>
        <div style={{ ...T.label, marginTop: 6, lineHeight: 1.6 }}>{r2(M.ml)} ML · {Math.round(M.conc).toLocaleString()} MCG PER ML · {p.vialMg} MG VIAL + {p.waterMl} ML WATER · {p.syringe} ML SYRINGE</div>
        {M.units > M.max ? <div style={{ ...T.label, color: C.red, marginTop: 6 }}>THAT DOSE DOESN’T FIT IN A {p.syringe} ML SYRINGE · USE A BIGGER SYRINGE OR LESS WATER</div>
          : M.units < 2 ? <div style={{ ...T.label, color: C.amber, marginTop: 6 }}>UNDER 2 UNITS IS HARD TO MEASURE ACCURATELY · MORE WATER MAKES IT EASIER</div> : null}

        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          {doneToday ? <Btn kind="ghost" tone={C.dim} onClick={undo} style={{ flex: 1, minHeight: 46 }}>UNDO TODAY’S DOSE</Btn>
            : <Btn tone={dueToday ? C.amber : C.olive} ink={dueToday ? C.amberInk : C.oliveInk} onClick={logDose} style={{ flex: 1, minHeight: 46 }}>{dueToday ? 'Log today’s dose' : 'Log a dose today'}</Btn>}
        </div>

        <div style={{ display: 'flex', gap: 7, marginTop: 12 }}>
          {[['PER VIAL', M.perVial + ' DOSES'], ['LEFT', left + (left === 1 ? ' DOSE' : ' DOSES')], ['MIXED', p.vialStart ? shortDate(p.vialStart).toUpperCase() : '—']].map(([l, v]) =>
            <div key={l} style={{ flex: 1, minWidth: 0, border: '1px solid ' + C.line, borderRadius: 10, padding: '8px 9px' }}><div style={T.label}>{l}</div><div style={{ font: `700 16px/1.1 ${F.head}`, marginTop: 4, color: l === 'LEFT' && left <= 1 ? C.amber : C.text }}>{v}</div></div>)}
        </div>
        <div role="button" onClick={() => { if (confirm('Start counting a freshly mixed vial from today?')) put(p.id, { vialStart: today }); }} style={{ ...T.mono, fontSize: 11, color: C.blue, marginTop: 8, padding: '8px 0', cursor: 'pointer' }}>↻ I MIXED A NEW VIAL TODAY</div>

        {(p.log || []).length ? <div style={{ marginTop: 6 }}><div style={T.label}>RECENT DOSES</div>
          {(p.log || []).slice(-6).reverse().map(l => <div key={l.date} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid ' + C.line, font: `400 14px/1.3 ${F.body}` }}>
            <span>{niceDate(l.date)}</span><span style={{ color: C.dim }}>{l.mcg.toLocaleString()} mcg · {unitsText(l.units)} units</span></div>)}
        </div> : null}

        {open ? <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid ' + C.line }}>
          <Field label="NAME (OPTIONAL)" value={p.name} onChange={v => put(p.id, { name: v.slice(0, 30) })} placeholder="e.g. BPC-157" />
          <div style={{ marginTop: 14 }}><div style={{ ...T.label, marginBottom: 6 }}>SYRINGE SIZE</div>
            {chips([0.3, 0.5, 1], p.syringe, v => v.toFixed(1) + ' ml · ' + v * 100 + ' U', v => put(p.id, { syringe: v }))}</div>
          {numRow('PEPTIDE IN THE VIAL', p, 'vialMg', [5, 10, 15], v => v + ' mg', 'MG')}
          {numRow('BACTERIOSTATIC WATER ADDED', p, 'waterMl', [1, 2, 3, 5], v => v + ' ml', 'ML')}
          {numRow('DOSE EACH TIME', p, 'doseMcg', [50, 100, 250, 500, 1000], v => v.toLocaleString() + ' mcg', 'MCG')}
          <div style={{ marginTop: 14 }}><div style={{ ...T.label, marginBottom: 6 }}>WHICH DAYS</div>
            <div style={{ display: 'flex', gap: 5 }}>{['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((l, i) => { const on = !!(p.days || [])[i];
              return <span key={i} role="button" aria-pressed={on} aria-label={WD_LONG[i]} onClick={() => put(p.id, q => ({ days: (q.days || [0, 0, 0, 0, 0, 0, 0]).map((v, j) => j === i ? (v ? 0 : 1) : v) }))}
                style={{ flex: 1, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', ...T.mono, fontSize: 13,
                  background: on ? C.blue : 'transparent', color: on ? C.blueInk : C.dim, border: '1px solid ' + (on ? C.blue : C.line2) }}>{l}</span>; })}</div></div>
          <Btn kind="ghost" tone={C.red} onClick={() => { if (confirm('Delete this peptide and its dose log?')) { app.setState(s => ({ peptides: (s.peptides || []).filter(q => q.id !== p.id) })); setEdit(null); } }} style={{ marginTop: 14, minHeight: 44, width: '100%' }}>DELETE</Btn>
        </div> : null}
      </Card>; })}

    {list.length ? <Btn kind="ghost" tone={C.olive} onClick={add}>+ ADD ANOTHER PEPTIDE</Btn> : null}
    <div style={{ ...T.label, marginTop: 12, color: C.faint, lineHeight: 1.6 }}>MATHS FOR U-100 INSULIN SYRINGES (100 UNITS = 1 ML). FOLLOW YOUR PRESCRIBER’S DOSING AND DOUBLE-CHECK BEFORE EACH INJECTION.</div>
  </div>;
}
window.PeptidesTab = PeptidesTab;
