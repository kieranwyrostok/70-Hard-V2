// Train + Fuel screens. Source: screens/*.jsx (compiled).
(function () {
// Shared look + helpers for the Train and Fuel screens (compiled to public/screens.js at build time).
const {
  useState,
  useEffect,
  useRef,
  useMemo
} = React;
const C = {
  bg: '#101109',
  card: '#191b12',
  card2: '#12160c',
  line: '#262a1b',
  line2: '#3a4029',
  text: '#e8e9e0',
  dim: '#8b8f7e',
  mute: '#6f7a4b',
  faint: '#5c6150',
  blue: '#4d7cff',
  blueInk: '#06122e',
  amber: '#d9a02b',
  amberInk: '#1a1500',
  olive: '#8a9757',
  oliveInk: '#0d1005',
  red: '#c9432a'
};
const F = {
  head: "'Saira Condensed',sans-serif",
  mono: "'IBM Plex Mono',monospace",
  body: 'Barlow,system-ui,sans-serif'
};
const T = {
  h1: {
    font: `800 40px/0.95 ${F.head}`,
    textTransform: 'uppercase',
    color: C.text
  },
  h2: {
    font: `700 17px/1 ${F.head}`,
    letterSpacing: '.16em',
    textTransform: 'uppercase',
    color: C.text
  },
  label: {
    font: `500 10px/1.2 ${F.mono}`,
    letterSpacing: '.14em',
    color: C.mute,
    textTransform: 'uppercase'
  },
  mono: {
    font: `600 12px/1 ${F.mono}`,
    letterSpacing: '.1em'
  },
  body: {
    font: `400 15px/1.35 ${F.body}`,
    color: C.text
  },
  name: {
    font: `600 15px/1.25 ${F.body}`,
    color: C.text
  }
};
const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
const r1 = v => Math.round((Number(v) || 0) * 10) / 10;
const r2 = v => Math.round((Number(v) || 0) * 100) / 100;
const pad2 = n => String(n).padStart(2, '0');
const fmtDur = sec => {
  sec = Math.max(0, Math.floor(sec));
  const h = Math.floor(sec / 3600),
    m = Math.floor(sec % 3600 / 60),
    s = sec % 60;
  return h ? h + ':' + pad2(m) + ':' + pad2(s) : m + ':' + pad2(s);
};
const fmtMin = sec => {
  const m = Math.round(sec / 60);
  return m >= 60 ? Math.floor(m / 60) + 'h ' + m % 60 + 'm' : m + 'm';
};
const parseTime = v => {
  v = String(v || '').trim();
  if (!v) return null;
  if (v.includes(':')) {
    const [a, b] = v.split(':');
    return (parseInt(a, 10) || 0) * 60 + (parseInt(b, 10) || 0);
  }
  const n = parseFloat(v);
  return isNaN(n) ? null : Math.round(n);
};
const num = v => {
  if (v === '' || v == null) return null;
  const n = parseFloat(String(v).replace(',', '.'));
  return isNaN(n) ? null : n;
};
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const isoOf = d => d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
const dOf = iso => new Date(iso + 'T12:00:00');
const addDaysIso = (iso, n) => {
  const d = dOf(iso);
  d.setDate(d.getDate() + n);
  return isoOf(d);
};
const niceDate = iso => {
  const d = dOf(iso);
  return WD[d.getDay()] + ', ' + MON[d.getMonth()] + ' ' + d.getDate();
};
const agoText = (iso, today) => {
  const n = Math.round((dOf(today) - dOf(iso)) / 864e5);
  return n <= 0 ? 'today' : n === 1 ? 'yesterday' : n < 7 ? n + ' days ago' : n < 14 ? '1 week ago' : Math.floor(n / 7) + ' weeks ago';
};
const vib = ms => {
  try {
    navigator.vibrate && navigator.vibrate(ms);
  } catch (e) {/* no-op */}
};

// ── primitives ──
function Btn({
  children,
  onClick,
  kind = 'primary',
  tone = C.blue,
  ink = C.blueInk,
  style,
  disabled
}) {
  const base = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 48,
    padding: '0 16px',
    boxSizing: 'border-box',
    cursor: disabled ? 'default' : 'pointer',
    userSelect: 'none',
    opacity: disabled ? 0.45 : 1,
    ...T.mono,
    fontSize: 13
  };
  const k = kind === 'primary' ? {
    background: tone,
    color: ink,
    border: '1px solid ' + tone,
    font: `700 17px/1 ${F.head}`,
    letterSpacing: '.14em',
    textTransform: 'uppercase'
  } : kind === 'ghost' ? {
    background: 'transparent',
    color: tone,
    border: '1px solid ' + C.line2
  } : kind === 'danger' ? {
    background: 'transparent',
    color: C.red,
    border: '1px solid #5c2b2e'
  } : {
    background: 'transparent',
    color: tone,
    border: 'none'
  };
  return /*#__PURE__*/React.createElement("div", {
    role: "button",
    onClick: disabled ? undefined : onClick,
    style: {
      ...base,
      ...k,
      ...style
    }
  }, children);
}
function Chip({
  on,
  children,
  onClick,
  tone = C.blue,
  ink = C.blueInk,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    role: "button",
    onClick: onClick,
    style: {
      flex: 'none',
      padding: '9px 12px',
      cursor: 'pointer',
      ...T.mono,
      fontSize: 11,
      background: on ? tone : 'transparent',
      color: on ? ink : C.dim,
      border: '1px solid ' + (on ? tone : C.line2),
      ...style
    }
  }, children);
}
function Seg({
  items,
  value,
  onChange,
  tone = C.blue,
  ink = C.blueInk
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      border: '1px solid #2a2e1f'
    }
  }, items.map(([v, l], i) => /*#__PURE__*/React.createElement("div", {
    key: v,
    role: "button",
    onClick: () => onChange(v),
    style: {
      flex: 1,
      textAlign: 'center',
      padding: '13px 0',
      cursor: 'pointer',
      ...T.mono,
      fontSize: 11,
      background: value === v ? tone : 'transparent',
      color: value === v ? ink : C.dim,
      borderLeft: i ? '1px solid #2a2e1f' : 'none'
    }
  }, l)));
}
function Card({
  children,
  style,
  onClick,
  accent
}) {
  return /*#__PURE__*/React.createElement("div", {
    onClick: onClick,
    style: {
      background: C.card,
      border: '1px solid ' + C.line,
      borderLeft: accent ? '3px solid ' + accent : '1px solid ' + C.line,
      padding: 14,
      cursor: onClick ? 'pointer' : 'default',
      ...style
    }
  }, children);
}
// Full-screen layer above the whole app (tab bar included).
function Sheet({
  title,
  sub,
  left,
  right,
  children,
  footer,
  z = 40,
  bg = C.bg,
  onTitle
}) {
  return ReactDOM.createPortal(/*#__PURE__*/React.createElement("div", {
    style: {
      position: 'fixed',
      inset: 0,
      zIndex: z,
      background: bg,
      display: 'flex',
      flexDirection: 'column',
      fontFamily: F.body,
      color: C.text
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 'calc(env(safe-area-inset-top, 0px) + 14px) 16px 12px',
      borderBottom: '1px solid ' + C.line,
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      minHeight: 44
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 70
    }
  }, left), /*#__PURE__*/React.createElement("div", {
    onClick: onTitle,
    style: {
      flex: 1,
      minWidth: 0,
      textAlign: 'center',
      cursor: onTitle ? 'pointer' : 'default'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: `700 18px/1.1 ${F.head}`,
      letterSpacing: '.1em',
      textTransform: 'uppercase',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, title), sub ? /*#__PURE__*/React.createElement("div", {
    style: {
      ...T.label,
      marginTop: 3
    }
  }, sub) : null), /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 70,
      display: 'flex',
      justifyContent: 'flex-end'
    }
  }, right)), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflow: 'auto',
      WebkitOverflowScrolling: 'touch'
    }
  }, children), footer ? /*#__PURE__*/React.createElement("div", {
    style: {
      borderTop: '1px solid ' + C.line,
      padding: '10px 16px calc(env(safe-area-inset-bottom, 0px) + 12px)',
      background: '#0d0e08'
    }
  }, footer) : null), document.body);
}
function TopLink({
  children,
  onClick,
  tone = C.blue
}) {
  return /*#__PURE__*/React.createElement("span", {
    role: "button",
    onClick: onClick,
    style: {
      ...T.mono,
      fontSize: 12,
      color: tone,
      cursor: 'pointer',
      padding: '10px 4px',
      display: 'inline-block'
    }
  }, children);
}
// Bottom action sheet (menus).
function ActionSheet({
  title,
  actions,
  onClose
}) {
  return ReactDOM.createPortal(/*#__PURE__*/React.createElement("div", {
    onClick: onClose,
    style: {
      position: 'fixed',
      inset: 0,
      zIndex: 80,
      background: 'rgba(0,0,0,.55)',
      display: 'flex',
      alignItems: 'flex-end'
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: e => e.stopPropagation(),
    style: {
      width: '100%',
      background: '#15170e',
      borderTop: '1px solid ' + C.line2,
      padding: '8px 0 calc(env(safe-area-inset-bottom, 0px) + 10px)'
    }
  }, title ? /*#__PURE__*/React.createElement("div", {
    style: {
      ...T.label,
      padding: '10px 18px 8px'
    }
  }, title) : null, actions.filter(Boolean).map((a, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    role: "button",
    onClick: () => {
      onClose();
      a.run();
    },
    style: {
      padding: '15px 18px',
      cursor: 'pointer',
      font: `500 16px/1.2 ${F.body}`,
      color: a.danger ? C.red : C.text,
      borderTop: i ? '1px solid #1f2216' : 'none'
    }
  }, a.label)), /*#__PURE__*/React.createElement("div", {
    role: "button",
    onClick: onClose,
    style: {
      margin: '8px 16px 0',
      padding: 14,
      textAlign: 'center',
      border: '1px solid ' + C.line2,
      cursor: 'pointer',
      ...T.mono,
      color: C.dim
    }
  }, "CANCEL"))), document.body);
}
function Field({
  label,
  value,
  onChange,
  placeholder,
  inputMode,
  style,
  autoFocus
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0,
      ...style
    }
  }, label ? /*#__PURE__*/React.createElement("div", {
    style: {
      ...T.label,
      marginBottom: 5
    }
  }, label) : null, /*#__PURE__*/React.createElement("input", {
    value: value == null ? '' : value,
    onChange: e => onChange(e.target.value),
    placeholder: placeholder,
    inputMode: inputMode,
    autoFocus: autoFocus,
    style: {
      width: '100%',
      boxSizing: 'border-box',
      background: C.card,
      border: '1px solid ' + C.line2,
      color: C.text,
      font: `500 16px/1.2 ${F.body}`,
      padding: '11px 10px',
      outline: 'none',
      borderRadius: 0
    }
  }));
}
function Empty({
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '26px 18px',
      textAlign: 'center',
      ...T.mono,
      fontSize: 11,
      lineHeight: 1.6,
      color: C.faint
    }
  }, children);
}
function Bar({
  pct,
  tone,
  h = 7
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      height: h,
      background: '#23271a',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      width: Math.max(0, Math.min(100, pct)) + '%',
      background: tone
    }
  }));
}
// re-render every `ms` while `on`
function useTick(on, ms = 1000) {
  const [, set] = useState(0);
  useEffect(() => {
    if (!on) return;
    const t = setInterval(() => set(x => x + 1), ms);
    return () => clearInterval(t);
  }, [on, ms]);
}

// POST to one of the AI functions, handling the optional coach passcode (asked once, remembered).
async function aiPost(path, body, retried) {
  let code = null;
  try {
    code = localStorage.getItem('coachCode');
  } catch (e) {/* ignore */}
  const r = await fetch(path, {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      ...body,
      code
    })
  });
  let j = {};
  try {
    j = await r.json();
  } catch (e) {/* ignore */}
  if (r.status === 401 && j.error === 'code' && !retried) {
    const c = prompt('Coach passcode (the COACH_CODE you set in Netlify):');
    if (c) {
      try {
        localStorage.setItem('coachCode', c.trim());
      } catch (e) {/* ignore */}
      return aiPost(path, body, true);
    }
  }
  return {
    ok: r.ok,
    status: r.status,
    j
  };
}
// Downscale a photo to a JPEG (keeps uploads small and fast). Resolves { b64, url }.
function shrinkToJpeg(file, maxSide = 1280) {
  return new Promise((res, rej) => {
    const img = new Image(),
      src = URL.createObjectURL(file);
    img.onload = () => {
      const k = Math.min(1, maxSide / Math.max(img.width, img.height));
      const cv = document.createElement('canvas');
      cv.width = Math.round(img.width * k);
      cv.height = Math.round(img.height * k);
      cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
      URL.revokeObjectURL(src);
      const url = cv.toDataURL('image/jpeg', 0.82);
      res({
        b64: url.split(',')[1],
        url
      });
    };
    img.onerror = () => {
      URL.revokeObjectURL(src);
      rej(new Error('Couldn’t read that image'));
    };
    img.src = src;
  });
}

// ── TRAIN: templates → live workout → history / records (works like Strong) ──
// Exercise types: wr = weight × reps, r = reps only, d = duration, dt = distance + time
const EX_LIB = [['bench', 'Bench Press (Barbell)', 'Chest', 'wr'], ['bench-db', 'Bench Press (Dumbbell)', 'Chest', 'wr'], ['incline-db', 'Incline Bench Press (Dumbbell)', 'Chest', 'wr'], ['incline-bb', 'Incline Bench Press (Barbell)', 'Chest', 'wr'], ['chest-press', 'Chest Press (Machine)', 'Chest', 'wr'], ['fly-cable', 'Cable Fly', 'Chest', 'wr'], ['dip', 'Chest Dip', 'Chest', 'r'], ['pushup', 'Push Up', 'Chest', 'r'], ['deadlift', 'Deadlift (Barbell)', 'Back', 'wr'], ['row-bb', 'Bent Over Row (Barbell)', 'Back', 'wr'], ['row-db', 'Dumbbell Row', 'Back', 'wr'], ['row-cable', 'Seated Cable Row', 'Back', 'wr'], ['row-chest', 'Chest Supported Row', 'Back', 'wr'], ['pulldown', 'Lat Pulldown (Cable)', 'Back', 'wr'], ['pullup', 'Pull Up', 'Back', 'r'], ['pullup-w', 'Pull Up (Weighted)', 'Back', 'wr'], ['chinup', 'Chin Up', 'Back', 'r'], ['facepull', 'Face Pull', 'Shoulders', 'wr'], ['ohp', 'Overhead Press (Barbell)', 'Shoulders', 'wr'], ['ohp-db', 'Seated Overhead Press (Dumbbell)', 'Shoulders', 'wr'], ['arnold', 'Arnold Press', 'Shoulders', 'wr'], ['lateral', 'Lateral Raise (Dumbbell)', 'Shoulders', 'wr'], ['rear-delt', 'Reverse Fly (Machine)', 'Shoulders', 'wr'], ['landmine', 'Landmine Press', 'Shoulders', 'wr'], ['curl-bb', 'Bicep Curl (Barbell)', 'Arms', 'wr'], ['curl-db', 'Bicep Curl (Dumbbell)', 'Arms', 'wr'], ['curl-ez', 'EZ Bar Curl', 'Arms', 'wr'], ['hammer', 'Hammer Curl', 'Arms', 'wr'], ['pushdown', 'Triceps Pushdown', 'Arms', 'wr'], ['skull', 'Skullcrusher', 'Arms', 'wr'], ['oh-tri', 'Overhead Triceps Extension', 'Arms', 'wr'], ['cgbp', 'Close-Grip Bench Press', 'Arms', 'wr'], ['squat', 'Squat (Barbell)', 'Legs', 'wr'], ['front-squat', 'Front Squat', 'Legs', 'wr'], ['goblet', 'Goblet Squat', 'Legs', 'wr'], ['leg-press', 'Leg Press', 'Legs', 'wr'], ['hack', 'Hack Squat', 'Legs', 'wr'], ['rdl', 'Romanian Deadlift', 'Legs', 'wr'], ['split-squat', 'Bulgarian Split Squat', 'Legs', 'wr'], ['lunge', 'Walking Lunge', 'Legs', 'wr'], ['leg-curl', 'Leg Curl (Machine)', 'Legs', 'wr'], ['leg-ext', 'Leg Extension (Machine)', 'Legs', 'wr'], ['hip-thrust', 'Hip Thrust', 'Legs', 'wr'], ['calf', 'Standing Calf Raise', 'Legs', 'wr'], ['step-up', 'Step Up', 'Legs', 'wr'], ['plank', 'Plank', 'Core', 'd'], ['hlr', 'Hanging Leg Raise', 'Core', 'r'], ['cable-crunch', 'Cable Crunch', 'Core', 'wr'], ['ab-wheel', 'Ab Wheel', 'Core', 'r'], ['dead-bug', 'Dead Bug', 'Core', 'r'], ['squat-hold', 'Deep Squat Hold', 'Core', 'd'], ['run', 'Running', 'Cardio', 'dt'], ['cycle', 'Cycling', 'Cardio', 'dt'], ['bike-int', 'Bike Intervals', 'Cardio', 'd'], ['row-erg', 'Rowing (Machine)', 'Cardio', 'dt'], ['walk', 'Walking', 'Cardio', 'dt'], ['incline-walk', 'Incline Walk', 'Cardio', 'd'], ['ruck', 'Ruck March', 'Cardio', 'dt'], ['stairs', 'Stair Climber', 'Cardio', 'd'], ['farmer', 'Farmer Carry', 'Full Body', 'dt'], ['sled', 'Sled Push', 'Full Body', 'dt'], ['kb-swing', 'Kettlebell Swing', 'Full Body', 'wr'], ['clean', 'Power Clean', 'Olympic', 'wr'], ['trap-jump', 'Trap Bar Jump', 'Olympic', 'wr'], ['push-press', 'Push Press', 'Olympic', 'wr'], ['burpee', 'Burpee', 'Full Body', 'r'], ['mobility', 'Mobility Flow', 'Other', 'd']].map(([id, name, part, type]) => ({
  id,
  name,
  part,
  type
}));
const PARTS = ['All', 'Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core', 'Cardio', 'Full Body', 'Olympic', 'Other'];
const S = (n, r) => Array.from({
  length: n
}, () => ({
  w: null,
  r
}));
const TAG_TEMPLATES = {
  PUSH: [['bench', S(4, 6)], ['ohp', S(3, 8)], ['incline-db', S(3, 10)], ['lateral', S(3, 12)], ['pushdown', S(3, 12)]],
  PULL: [['pullup', S(4, 8)], ['row-bb', S(4, 8)], ['pulldown', S(3, 10)], ['facepull', S(3, 15)], ['curl-db', S(3, 12)]],
  LEGS: [['squat', S(4, 6)], ['rdl', S(3, 8)], ['leg-press', S(3, 10)], ['leg-curl', S(3, 12)], ['calf', S(3, 15)]],
  UPPER: [['bench', S(4, 6)], ['row-bb', S(4, 8)], ['ohp', S(3, 8)], ['pulldown', S(3, 10)], ['curl-db', S(2, 12)], ['pushdown', S(2, 12)]],
  LOWER: [['squat', S(4, 6)], ['rdl', S(3, 8)], ['split-squat', S(3, 10)], ['leg-curl', S(3, 12)], ['calf', S(3, 15)], ['hlr', S(3, 12)]],
  FULL: [['squat', S(3, 5)], ['bench', S(3, 5)], ['row-bb', S(3, 8)], ['ohp', S(2, 8)], ['plank', [{
    t: 60
  }, {
    t: 60
  }, {
    t: 60
  }]]],
  CARDIO: [['run', [{
    d: 5,
    t: 1800
  }]], ['mobility', [{
    t: 900
  }]]],
  'ZONE 2': [['bike-int', [{
    t: 360
  }, {
    t: 360
  }, {
    t: 360
  }, {
    t: 360
  }, {
    t: 360
  }]], ['goblet', S(3, 12)], ['calf', S(3, 15)]],
  CARRY: [['ruck', [{
    d: 6,
    t: 4500
  }]], ['farmer', [{
    d: 0.04
  }, {
    d: 0.04
  }, {
    d: 0.04
  }, {
    d: 0.04
  }]], ['sled', [{
    d: 0.02
  }, {
    d: 0.02
  }, {
    d: 0.02
  }, {
    d: 0.02
  }]]],
  RESET: [['walk', [{
    d: 4,
    t: 3600
  }]], ['squat-hold', [{
    t: 90
  }, {
    t: 90
  }, {
    t: 90
  }, {
    t: 90
  }]]]
};
// map the design's Hybrid 7-day plan names onto the library
const PLAN_NAME_MAP = {
  'Bench press': 'bench',
  'Overhead press': 'ohp',
  'Incline DB press': 'incline-db',
  'Cable triceps': 'pushdown',
  'Bike intervals': 'bike-int',
  'Goblet squat': 'goblet',
  'Calf raise': 'calf',
  'Weighted pull-up': 'pullup-w',
  'Barbell row': 'row-bb',
  'Face pull': 'facepull',
  'EZ curl': 'curl-ez',
  'Back squat': 'squat',
  'Romanian deadlift': 'rdl',
  'Split squat': 'split-squat',
  'Hanging leg raise': 'hlr',
  'Trap bar jump': 'trap-jump',
  'Push press': 'push-press',
  'Chin-up': 'chinup',
  'Ruck march': 'ruck',
  'Farmer carry': 'farmer',
  'Sled push': 'sled',
  'Easy walk': 'walk',
  'Deep squat hold': 'squat-hold'
};
const REST_DEFAULT = {
  wr: 120,
  r: 90,
  d: 60,
  dt: 0
};
// Mobility block for each workout day (the design's "Mobility · 30 min" card), editable per template.
function defaultMobility(day) {
  const P = window.SH && window.SH.PLAN;
  return day != null && P && P[day] && P[day].mobility ? [{
    name: P[day].mobility,
    min: 30
  }] : [];
}
const mobOf = t => t.mobility != null ? t.mobility : defaultMobility(t.day);
const mobMin = list => (list || []).reduce((a, m) => a + (m.done === false ? 0 : Number(m.min) || 0), 0);
function allExercises(st) {
  return EX_LIB.concat(st.exLib || []);
}
function exById(st, id) {
  return allExercises(st).find(e => e.id === id) || {
    id,
    name: 'Exercise',
    part: 'Other',
    type: 'wr'
  };
}
const kgToLb = kg => kg * 2.20462;
function wDisp(st, kg) {
  if (kg == null) return '';
  return String(st.imperial ? r1(kgToLb(kg)) : r2(kg));
}
function wParse(st, v) {
  const n = num(v);
  if (n == null) return null;
  return r2(st.imperial ? n / 2.20462 : n);
}
const wUnit = st => st.imperial ? 'lb' : 'kg';
function setText(st, type, s) {
  if (!s) return '';
  if (type === 'wr') return (s.w != null ? wDisp(st, s.w) + ' ' + wUnit(st) : '—') + ' × ' + (s.r != null ? s.r : '—');
  if (type === 'r') return (s.r != null ? s.r : '—') + ' reps';
  if (type === 'd') return s.t != null ? fmtDur(s.t) : '—';
  return (s.d != null ? r2(s.d) + ' km' : '—') + (s.t != null ? ' · ' + fmtDur(s.t) : '');
}
const est1rm = s => s.w && s.r ? s.w * (1 + Math.min(s.r, 12) / 30) : 0;
function workoutVolume(w) {
  let v = 0;
  w.exercises.forEach(e => e.sets.forEach(s => {
    if (s.done && s.w && s.r) v += s.w * s.r;
  }));
  return Math.round(v);
}
function doneSets(w) {
  let n = 0;
  w.exercises.forEach(e => e.sets.forEach(s => {
    if (s.done) n++;
  }));
  return n;
}

// Templates generated from the split picked in setup (and the day names in planEdit).
function buildTemplates(st) {
  const SH = window.SH,
    out = [];
  for (let i = 0; i < 7; i++) {
    const base = SH.PLAN[i],
      pe = (st.planEdit || {})[i] || {};
    const tag = pe.tag != null ? pe.tag : base.tag;
    if (!tag || tag === 'REST') continue;
    const usePlan = !(st.planEdit && st.planEdit[i] && st.planEdit[i].tag) || pe.tag === base.tag;
    let exs;
    if (usePlan) {
      exs = base.ex.map(e => ({
        exId: PLAN_NAME_MAP[e.name] || 'bench',
        sets: e.w.map((w, j) => ({
          w: null,
          r: ['kg', 'bw'].includes(e.u) ? e.r[j] : null,
          t: e.u === 'time' || e.u === 'watt' ? e.r[j] * 60 : e.u === 'hold' ? e.r[j] : null,
          d: e.u === 'dist' ? e.r[j] / 1000 : null
        }))
      }));
    } else {
      exs = (TAG_TEMPLATES[tag] || TAG_TEMPLATES.FULL).map(([exId, sets]) => ({
        exId,
        sets: sets.map(x => ({
          ...x
        }))
      }));
    }
    out.push({
      id: 't' + i + uid(),
      name: pe.name || base.name,
      day: i,
      mobility: defaultMobility(i),
      exercises: exs.map(e => ({
        ...e,
        rest: REST_DEFAULT[exById(st, e.exId).type]
      }))
    });
  }
  return out;
}
function lastPerformance(st, exId, skipWorkoutId) {
  const ws = st.workouts || [];
  for (let i = ws.length - 1; i >= 0; i--) {
    const w = ws[i];
    if (w.id === skipWorkoutId) continue;
    const e = w.exercises.find(x => x.exId === exId);
    if (e && e.sets.some(s => s.done)) return {
      date: w.date,
      sets: e.sets.filter(s => s.done)
    };
  }
  return null;
}
function records(st, exId, beforeWorkoutId) {
  const r = {
    e1rm: 0,
    heavy: 0,
    vol: 0,
    reps: 0,
    dist: 0,
    time: 0
  };
  for (const w of st.workouts || []) {
    if (w.id === beforeWorkoutId) break;
    for (const e of w.exercises) if (e.exId === exId) for (const s of e.sets) if (s.done) {
      r.e1rm = Math.max(r.e1rm, est1rm(s));
      r.heavy = Math.max(r.heavy, s.w || 0);
      r.vol = Math.max(r.vol, (s.w || 0) * (s.r || 0));
      r.reps = Math.max(r.reps, s.r || 0);
      r.dist = Math.max(r.dist, s.d || 0);
      r.time = Math.max(r.time, s.t || 0);
    }
  }
  return r;
}
function findPRs(st, w) {
  const prs = [];
  for (const e of w.exercises) {
    const before = records(st, e.exId, w.id),
      ex = exById(st, e.exId),
      best = {
        e1rm: 0,
        heavy: 0,
        vol: 0,
        reps: 0,
        dist: 0,
        time: 0
      };
    for (const s of e.sets) if (s.done) {
      best.e1rm = Math.max(best.e1rm, est1rm(s));
      best.heavy = Math.max(best.heavy, s.w || 0);
      best.vol = Math.max(best.vol, (s.w || 0) * (s.r || 0));
      best.reps = Math.max(best.reps, s.r || 0);
      best.dist = Math.max(best.dist, s.d || 0);
      best.time = Math.max(best.time, s.t || 0);
    }
    const had = before.e1rm || before.heavy || before.reps || before.dist || before.time;
    if (!had) continue; // first time isn't a record
    if (ex.type === 'wr') {
      if (best.heavy > before.heavy) prs.push({
        ex: ex.name,
        what: 'Heaviest weight',
        val: wDisp(st, best.heavy) + ' ' + wUnit(st)
      });
      if (best.e1rm > before.e1rm + 0.01) prs.push({
        ex: ex.name,
        what: 'Est. 1RM',
        val: wDisp(st, r1(best.e1rm)) + ' ' + wUnit(st)
      });
      if (best.vol > before.vol) prs.push({
        ex: ex.name,
        what: 'Best set volume',
        val: wDisp(st, best.vol) + ' ' + wUnit(st)
      });
    } else if (ex.type === 'r' && best.reps > before.reps) prs.push({
      ex: ex.name,
      what: 'Most reps',
      val: best.reps + ' reps'
    });else if (ex.type === 'd' && best.time > before.time) prs.push({
      ex: ex.name,
      what: 'Longest',
      val: fmtDur(best.time)
    });else if (ex.type === 'dt' && best.dist > before.dist) prs.push({
      ex: ex.name,
      what: 'Longest distance',
      val: r2(best.dist) + ' km'
    });
  }
  return prs;
}
function TrainScreen({
  app,
  st
}) {
  const [tab, setTab] = useState('start');
  const [preview, setPreview] = useState(null); // template id
  const [histOpen, setHistOpen] = useState(null); // workout id
  const [exOpen, setExOpen] = useState(null); // exercise id
  const [tplEdit, setTplEdit] = useState(null); // template draft
  const [summary, setSummary] = useState(null); // finished workout summary
  const [menu, setMenu] = useState(null);
  const [q, setQ] = useState('');
  const [part, setPart] = useState('All');
  const [creating, setCreating] = useState(null);
  const SH = window.SH;
  const today = st.curDate;
  const aw = st.activeWorkout;
  const [minimized, setMinimized] = useState(!!aw);
  useTick(!!aw);

  // first use (or after re-running setup): templates from the chosen split
  useEffect(() => {
    if (st.setup && st.setup.done && !st.templates) app.setState(s => ({
      templates: buildTemplates(s)
    }));
  }, [st.setup && st.setup.done, !!st.templates]);
  const templates = st.templates || [];
  const todayIdx = SH.weekdayIdx(today);
  const todays = templates.find(t => t.day === todayIdx);
  const upd = fn => app.setState(s => ({
    activeWorkout: s.activeWorkout ? fn(s.activeWorkout) : s.activeWorkout
  }));
  const startWorkout = tpl => {
    if (aw) {
      setMinimized(false);
      return;
    }
    const h = new Date().getHours();
    const w = {
      id: 'w' + uid(),
      name: tpl ? tpl.name : (h < 11 ? 'Morning' : h < 17 ? 'Afternoon' : 'Evening') + ' workout',
      templateId: tpl ? tpl.id : null,
      start: Date.now(),
      date: today,
      mobility: tpl ? mobOf(tpl).map(m => ({
        name: m.name,
        min: m.min,
        done: false
      })) : [],
      exercises: tpl ? tpl.exercises.map(e => ({
        uid: uid(),
        exId: e.exId,
        rest: e.rest,
        note: '',
        sets: e.sets.map(s => ({
          w: null,
          r: null,
          t: null,
          d: null,
          target: {
            ...s
          },
          kind: 'n',
          done: false
        }))
      })) : []
    };
    app.setState({
      activeWorkout: w
    });
    setMinimized(false);
    setPreview(null);
  };
  const editHistory = w => {
    if (aw) {
      alert('Finish or cancel the workout in progress first.');
      return;
    }
    app.setState({
      activeWorkout: {
        ...JSON.parse(JSON.stringify(w)),
        editOf: w.id,
        exercises: w.exercises.map(e => ({
          ...e,
          uid: uid(),
          sets: e.sets.map(s => ({
            ...s
          }))
        }))
      }
    });
    setHistOpen(null);
    setMinimized(false);
  };
  const cancelWorkout = () => {
    if (!confirm(aw.editOf ? 'Discard your changes to this workout?' : 'Cancel this workout? Nothing from it will be saved.')) return;
    app.setState({
      activeWorkout: null,
      restUntil: null
    });
    setMinimized(false);
  };
  const finishWorkout = () => {
    const w = aw,
      mobDone = (w.mobility || []).filter(m => m.done).length,
      total = doneSets(w) + mobDone,
      open = w.exercises.reduce((a, e) => a + e.sets.filter(s => !s.done).length, 0);
    if (!total) {
      if (confirm('Nothing is checked off yet. Cancel this workout instead?')) app.setState({
        activeWorkout: null,
        restUntil: null
      });
      return;
    }
    if (open && !confirm(open + (open === 1 ? ' set isn’t' : ' sets aren’t') + ' checked off. Finish anyway? Unchecked sets are dropped.')) return;
    const end = w.editOf ? w.end : Date.now();
    const clean = {
      id: w.editOf || w.id,
      name: w.name.trim() || 'Workout',
      templateId: w.templateId,
      date: w.date,
      start: w.start,
      end,
      exercises: w.exercises.map(e => ({
        exId: e.exId,
        name: exById(st, e.exId).name,
        type: exById(st, e.exId).type,
        rest: e.rest,
        note: e.note,
        sets: e.sets.filter(s => s.done).map(({
          target,
          ...s
        }) => s)
      })).filter(e => e.sets.length)
    };
    clean.mobility = (w.mobility || []).filter(m => (m.name || '').trim()).map(m => ({
      name: m.name.trim(),
      min: Number(m.min) || 0,
      done: !!m.done
    }));
    clean.volume = workoutVolume(clean);
    const list = (st.workouts || []).filter(x => x.id !== clean.id).concat(clean).sort((a, b) => a.start - b.start);
    clean.prs = findPRs({
      ...st,
      workouts: list
    }, clean);
    const isToday = clean.date === st.curDate;
    app.setState(s => ({
      workouts: (s.workouts || []).filter(x => x.id !== clean.id).concat(clean).sort((a, b) => a.start - b.start),
      activeWorkout: null,
      restUntil: null,
      ...(() => {
        if (!isToday || w.editOf) return {};
        const keys = [];
        if (s.ruleDefs.some(r => r.k === 'strength' && r.on) && doneSets(clean)) keys.push('strength');
        const mob = clean.mobility || [];
        if (mob.length && mob.every(m => m.done)) s.ruleDefs.filter(r => r.on && /stretch|mobility|yoga/i.test(r.name)).forEach(r => keys.push(r.k));
        if (!keys.length) return {};
        const done = {
            ...s.done
          },
          doneAt = {
            ...s.doneAt
          };
        keys.forEach(k => {
          done[k] = true;
          doneAt[k] = doneAt[k] || SH.nowHM();
        });
        return {
          done,
          doneAt
        };
      })()
    }));
    setMinimized(false);
    if (!w.editOf) setSummary({
      w: clean,
      fromTpl: w.templateId,
      changed: w
    });
  };
  const updateTemplateFrom = sum => {
    app.setState(s => ({
      templates: (s.templates || []).map(t => t.id !== sum.fromTpl ? t : {
        ...t,
        mobility: (sum.w.mobility || []).map(m => ({
          name: m.name,
          min: m.min
        })),
        exercises: sum.w.exercises.map(e => ({
          exId: e.exId,
          rest: e.rest,
          sets: e.sets.map(x => ({
            w: x.w,
            r: x.r,
            t: x.t,
            d: x.d
          }))
        }))
      })
    }));
    setSummary(null);
  };

  // ── pieces ──
  const tplCard = (t, highlight) => {
    const last = (st.workouts || []).slice().reverse().find(w => w.templateId === t.id);
    return /*#__PURE__*/React.createElement(Card, {
      key: t.id,
      onClick: () => setPreview(t.id),
      accent: highlight ? C.olive : null,
      style: {
        marginBottom: 8
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        font: `700 19px/1.1 ${F.head}`,
        textTransform: 'uppercase',
        letterSpacing: '.04em'
      }
    }, t.name || 'Untitled'), /*#__PURE__*/React.createElement("div", {
      style: {
        ...T.label,
        flex: 'none'
      }
    }, t.day != null ? SH.PLAN[t.day].abbr : '', last ? ' · ' + agoText(last.date, today).toUpperCase() : '')), /*#__PURE__*/React.createElement("div", {
      style: {
        font: `400 13px/1.45 ${F.body}`,
        color: C.dim,
        marginTop: 6
      }
    }, t.exercises.map(e => e.sets.length + ' × ' + exById(st, e.exId).name).join(' · ') || 'No exercises yet'), mobOf(t).length ? /*#__PURE__*/React.createElement("div", {
      style: {
        ...T.label,
        marginTop: 6,
        color: C.olive
      }
    }, "MOBILITY \xB7 ", mobOf(t).map(m => m.name + ' ' + m.min + ' MIN').join(' · ')) : null);
  };
  let body;
  if (tab === 'start') {
    body = /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '16px 22px 24px'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        ...T.label,
        marginBottom: 8
      }
    }, "QUICK START"), /*#__PURE__*/React.createElement(Btn, {
      onClick: () => startWorkout(null),
      tone: C.olive,
      ink: C.oliveInk
    }, aw ? 'Resume workout · ' + fmtDur((Date.now() - aw.start) / 1000) : 'Start an empty workout'), todays ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      style: {
        ...T.label,
        margin: '22px 0 8px'
      }
    }, "TODAY \xB7 ", SH.PLAN[todayIdx].abbr), tplCard(todays, true)) : /*#__PURE__*/React.createElement("div", {
      style: {
        ...T.label,
        margin: '22px 0 0',
        color: C.faint
      }
    }, "TODAY IS A REST DAY IN YOUR SPLIT"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        margin: '22px 0 8px'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: T.h2
    }, "My templates"), /*#__PURE__*/React.createElement(TopLink, {
      tone: C.olive,
      onClick: () => setTplEdit({
        id: null,
        name: 'New template',
        day: null,
        exercises: []
      })
    }, "+ TEMPLATE")), templates.filter(t => t !== todays).map(t => tplCard(t)), !templates.length ? /*#__PURE__*/React.createElement(Empty, null, "NO TEMPLATES YET \xB7 TAP + TEMPLATE") : null);
  } else if (tab === 'history') {
    const ws = (st.workouts || []).slice().reverse();
    let lastMonth = '';
    body = /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '14px 22px 24px'
      }
    }, !ws.length ? /*#__PURE__*/React.createElement(Empty, null, "FINISHED WORKOUTS SHOW UP HERE") : null, ws.map(w => {
      const d = dOf(w.date),
        m = MON[d.getMonth()].toUpperCase() + ' ' + d.getFullYear(),
        head = m !== lastMonth;
      lastMonth = m;
      return /*#__PURE__*/React.createElement("div", {
        key: w.id
      }, head ? /*#__PURE__*/React.createElement("div", {
        style: {
          ...T.label,
          margin: '10px 0 8px'
        }
      }, m) : null, /*#__PURE__*/React.createElement(Card, {
        onClick: () => setHistOpen(w.id),
        style: {
          marginBottom: 8
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          display: 'flex',
          justifyContent: 'space-between',
          gap: 8
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          font: `700 18px/1.1 ${F.head}`,
          textTransform: 'uppercase'
        }
      }, w.name), w.prs && w.prs.length ? /*#__PURE__*/React.createElement("div", {
        style: {
          ...T.mono,
          fontSize: 11,
          color: C.amber
        }
      }, "\uD83C\uDFC6 ", w.prs.length, " PR") : null), /*#__PURE__*/React.createElement("div", {
        style: {
          ...T.label,
          marginTop: 5
        }
      }, niceDate(w.date).toUpperCase(), " \xB7 ", fmtMin((w.end - w.start) / 1000), " \xB7 ", w.volume ? wDisp(st, w.volume) + ' ' + wUnit(st) : doneSets(w) + ' SETS'), /*#__PURE__*/React.createElement("div", {
        style: {
          marginTop: 9,
          display: 'flex',
          flexDirection: 'column',
          gap: 3
        }
      }, w.exercises.map((e, i) => {
        const best = e.sets.reduce((b, s) => est1rm(s) > est1rm(b || {}) ? s : b, e.sets[0]);
        return /*#__PURE__*/React.createElement("div", {
          key: i,
          style: {
            display: 'flex',
            justifyContent: 'space-between',
            gap: 8,
            font: `400 13px/1.35 ${F.body}`,
            color: C.dim
          }
        }, /*#__PURE__*/React.createElement("span", null, e.sets.length, " \xD7 ", e.name), /*#__PURE__*/React.createElement("span", {
          style: {
            color: C.text,
            flex: 'none'
          }
        }, setText(st, e.type, best)));
      }))));
    }));
  } else {
    const list = allExercises(st).filter(e => (part === 'All' || e.part === part) && (!q || e.name.toLowerCase().includes(q.toLowerCase()))).sort((a, b) => a.name.localeCompare(b.name));
    body = /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '14px 22px 24px'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement(Field, {
      value: q,
      onChange: setQ,
      placeholder: "Search exercises",
      style: {
        flex: 1
      }
    }), /*#__PURE__*/React.createElement(Btn, {
      kind: "ghost",
      tone: C.olive,
      onClick: () => setCreating({
        name: q,
        part: part === 'All' ? 'Other' : part,
        type: 'wr'
      }),
      style: {
        minHeight: 44
      }
    }, "+ NEW")), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 6,
        overflowX: 'auto',
        margin: '10px -22px 6px',
        padding: '0 22px'
      }
    }, PARTS.map(p => /*#__PURE__*/React.createElement(Chip, {
      key: p,
      on: part === p,
      tone: C.olive,
      ink: C.oliveInk,
      onClick: () => setPart(p)
    }, p.toUpperCase()))), list.map(e => {
      const lp = lastPerformance(st, e.id);
      return /*#__PURE__*/React.createElement("div", {
        key: e.id,
        role: "button",
        onClick: () => setExOpen(e.id),
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '12px 0',
          borderBottom: '1px solid #1f2216',
          cursor: 'pointer'
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          flex: 1,
          minWidth: 0
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: T.name
      }, e.name), /*#__PURE__*/React.createElement("div", {
        style: {
          ...T.label,
          marginTop: 3
        }
      }, e.part, e.custom ? ' · MINE' : '')), /*#__PURE__*/React.createElement("div", {
        style: {
          ...T.label,
          color: lp ? C.dim : C.faint
        }
      }, lp ? agoText(lp.date, today).toUpperCase() : ''));
    }));
  }
  const previewTpl = templates.find(t => t.id === preview);
  const histW = (st.workouts || []).find(w => w.id === histOpen);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: C.bg,
      fontFamily: F.body,
      color: C.text
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflow: 'auto'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '58px 22px 14px',
      borderBottom: '1px solid ' + C.line
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      ...T.label,
      marginBottom: 4
    }
  }, "DAY ", app.dayNum(), " \xB7 TRAIN"), /*#__PURE__*/React.createElement("div", {
    style: T.h1
  }, "Workout"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 14
    }
  }, /*#__PURE__*/React.createElement(Seg, {
    items: [['start', 'START'], ['history', 'HISTORY'], ['exercises', 'EXERCISES']],
    value: tab,
    onChange: setTab,
    tone: C.olive,
    ink: C.oliveInk
  }))), body), aw && minimized ? ReactDOM.createPortal(/*#__PURE__*/React.createElement("div", {
    role: "button",
    onClick: () => setMinimized(false),
    style: {
      position: 'fixed',
      left: 10,
      right: 10,
      bottom: 'calc(env(safe-area-inset-bottom, 0px) + 78px)',
      zIndex: 30,
      background: C.olive,
      color: C.oliveInk,
      padding: '12px 14px',
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      cursor: 'pointer',
      boxShadow: '0 6px 20px rgba(0,0,0,.5)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: `700 16px/1.1 ${F.head}`,
      letterSpacing: '.08em',
      textTransform: 'uppercase',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, aw.editOf ? 'Editing · ' : '', aw.name), /*#__PURE__*/React.createElement("div", {
    style: {
      font: `600 11px/1.2 ${F.mono}`,
      marginTop: 2
    }
  }, aw.editOf ? 'TAP TO CONTINUE EDITING' : fmtDur((Date.now() - aw.start) / 1000) + ' · ' + doneSets(aw) + ' SETS DONE')), /*#__PURE__*/React.createElement("div", {
    style: {
      ...T.mono,
      fontSize: 12
    }
  }, "OPEN \u25B2")), document.body) : null, aw && !minimized ? /*#__PURE__*/React.createElement(WorkoutEditor, {
    app: app,
    st: st,
    aw: aw,
    upd: upd,
    onMin: () => setMinimized(true),
    onCancel: cancelWorkout,
    onFinish: finishWorkout
  }) : null, previewTpl ? /*#__PURE__*/React.createElement(Sheet, {
    title: previewTpl.name,
    sub: previewTpl.day != null ? SH.PLAN[previewTpl.day].abbr + ' IN YOUR SPLIT' : 'TEMPLATE',
    left: /*#__PURE__*/React.createElement(TopLink, {
      onClick: () => setPreview(null)
    }, "\u2039 BACK"),
    right: /*#__PURE__*/React.createElement(TopLink, {
      tone: C.olive,
      onClick: () => setMenu({
        title: previewTpl.name,
        actions: [{
          label: 'Edit template',
          run: () => {
            setTplEdit(JSON.parse(JSON.stringify(previewTpl)));
            setPreview(null);
          }
        }, {
          label: 'Duplicate',
          run: () => app.setState(s => ({
            templates: (s.templates || []).concat({
              ...JSON.parse(JSON.stringify(previewTpl)),
              id: 't' + uid(),
              name: previewTpl.name + ' (copy)',
              day: null
            })
          }))
        }, {
          label: 'Delete template',
          danger: true,
          run: () => {
            if (confirm('Delete “' + previewTpl.name + '”?')) {
              app.setState(s => ({
                templates: s.templates.filter(t => t.id !== previewTpl.id)
              }));
              setPreview(null);
            }
          }
        }]
      })
    }, "\u2022\u2022\u2022"),
    footer: /*#__PURE__*/React.createElement(Btn, {
      tone: C.olive,
      ink: C.oliveInk,
      onClick: () => startWorkout(previewTpl)
    }, aw ? 'Workout in progress · resume' : 'Start workout')
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '10px 18px 20px'
    }
  }, previewTpl.exercises.map((e, i) => {
    const ex = exById(st, e.exId),
      lp = lastPerformance(st, e.exId);
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        padding: '12px 0',
        borderBottom: '1px solid #1f2216'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: T.name
    }, e.sets.length, " \xD7 ", ex.name), /*#__PURE__*/React.createElement("span", {
      style: {
        ...T.label
      }
    }, ex.part)), /*#__PURE__*/React.createElement("div", {
      style: {
        ...T.label,
        marginTop: 4,
        color: C.dim
      }
    }, lp ? 'LAST: ' + lp.sets.map(s => setText(st, ex.type, s)).join(' · ') : 'NOT DONE YET'));
  }), !previewTpl.exercises.length ? /*#__PURE__*/React.createElement(Empty, null, "NO EXERCISES \xB7 EDIT THE TEMPLATE TO ADD SOME") : null, mobOf(previewTpl).length ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      ...T.label,
      margin: '18px 0 4px',
      color: C.olive
    }
  }, "MOBILITY \xB7 ", mobMin(mobOf(previewTpl)), " MIN"), mobOf(previewTpl).map((m, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      padding: '10px 0',
      borderBottom: '1px solid #1f2216'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: T.name
  }, m.name), /*#__PURE__*/React.createElement("span", {
    style: T.label
  }, m.min, " MIN")))) : null)) : null, histW ? /*#__PURE__*/React.createElement(Sheet, {
    title: histW.name,
    sub: niceDate(histW.date).toUpperCase() + ' · ' + fmtMin((histW.end - histW.start) / 1000),
    left: /*#__PURE__*/React.createElement(TopLink, {
      onClick: () => setHistOpen(null)
    }, "\u2039 BACK"),
    right: /*#__PURE__*/React.createElement(TopLink, {
      tone: C.olive,
      onClick: () => setMenu({
        title: histW.name,
        actions: [{
          label: 'Edit workout',
          run: () => editHistory(histW)
        }, {
          label: 'Save as template',
          run: () => {
            app.setState(s => ({
              templates: (s.templates || []).concat({
                id: 't' + uid(),
                name: histW.name,
                day: null,
                mobility: (histW.mobility || []).map(m => ({
                  name: m.name,
                  min: m.min
                })),
                exercises: histW.exercises.map(e => ({
                  exId: e.exId,
                  rest: e.rest,
                  sets: e.sets.map(x => ({
                    w: x.w,
                    r: x.r,
                    t: x.t,
                    d: x.d
                  }))
                }))
              })
            }));
            alert('Saved as a template.');
          }
        }, {
          label: 'Delete workout',
          danger: true,
          run: () => {
            if (confirm('Delete this workout from your history?')) {
              app.setState(s => ({
                workouts: s.workouts.filter(w => w.id !== histW.id)
              }));
              setHistOpen(null);
            }
          }
        }]
      })
    }, "\u2022\u2022\u2022")
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '12px 18px 24px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr 1fr',
      gap: 7,
      marginBottom: 14
    }
  }, [['DURATION', fmtMin((histW.end - histW.start) / 1000)], ['VOLUME', histW.volume ? wDisp(st, histW.volume) + ' ' + wUnit(st) : '—'], ['PRS', String((histW.prs || []).length)]].map(([l, v]) => /*#__PURE__*/React.createElement(Card, {
    key: l,
    style: {
      padding: '10px 11px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: T.label
  }, l), /*#__PURE__*/React.createElement("div", {
    style: {
      font: `700 20px/1.1 ${F.head}`,
      marginTop: 4
    }
  }, v)))), (histW.prs || []).map((p, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      ...T.mono,
      fontSize: 11,
      color: C.amber,
      marginBottom: 6
    }
  }, "\uD83C\uDFC6 ", p.ex.toUpperCase(), " \xB7 ", p.what.toUpperCase(), " ", p.val)), (histW.mobility || []).length ? /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '4px 0 10px',
      borderBottom: '1px solid #1f2216'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      ...T.label,
      color: C.olive
    }
  }, "MOBILITY"), histW.mobility.map((m, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: 'flex',
      gap: 10,
      marginTop: 6,
      ...T.mono,
      fontSize: 12,
      color: m.done ? C.text : C.faint
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: m.done ? C.olive : C.faint
    }
  }, m.done ? '✓' : '–'), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }, m.name), /*#__PURE__*/React.createElement("span", null, m.min, " MIN")))) : null, histW.exercises.map((e, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      padding: '12px 0',
      borderBottom: '1px solid #1f2216'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: T.name
  }, e.name), e.note ? /*#__PURE__*/React.createElement("div", {
    style: {
      font: `italic 400 13px/1.4 ${F.body}`,
      color: C.dim,
      marginTop: 3
    }
  }, e.note) : null, e.sets.map((s, j) => /*#__PURE__*/React.createElement("div", {
    key: j,
    style: {
      display: 'flex',
      gap: 12,
      marginTop: 5,
      ...T.mono,
      fontSize: 12,
      color: C.dim
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 18,
      color: s.kind === 'w' ? C.amber : s.kind === 'd' ? C.blue : s.kind === 'f' ? C.red : C.mute
    }
  }, s.kind && s.kind !== 'n' ? s.kind.toUpperCase() : j + 1), /*#__PURE__*/React.createElement("span", {
    style: {
      color: C.text
    }
  }, setText(st, e.type, s)), e.type === 'wr' && s.r ? /*#__PURE__*/React.createElement("span", null, "\xB7 1RM ", wDisp(st, r1(est1rm(s)))) : null)))))) : null, exOpen ? /*#__PURE__*/React.createElement(ExerciseDetail, {
    st: st,
    app: app,
    exId: exOpen,
    onClose: () => setExOpen(null)
  }) : null, tplEdit ? /*#__PURE__*/React.createElement(TemplateEditor, {
    app: app,
    st: st,
    draft: tplEdit,
    setDraft: setTplEdit,
    onClose: () => setTplEdit(null)
  }) : null, creating ? /*#__PURE__*/React.createElement(CreateExercise, {
    app: app,
    draft: creating,
    setDraft: setCreating,
    onDone: () => setCreating(null)
  }) : null, summary ? /*#__PURE__*/React.createElement(Sheet, {
    title: "Workout complete",
    sub: summary.w.name,
    left: /*#__PURE__*/React.createElement("span", null),
    footer: /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 8
      }
    }, summary.fromTpl ? /*#__PURE__*/React.createElement(Btn, {
      kind: "ghost",
      tone: C.olive,
      onClick: () => updateTemplateFrom(summary)
    }, "UPDATE TEMPLATE WITH TODAY\u2019S SETS") : null, /*#__PURE__*/React.createElement(Btn, {
      tone: C.olive,
      ink: C.oliveInk,
      onClick: () => setSummary(null)
    }, "Done"))
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '22px 18px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: `800 52px/0.9 ${F.head}`,
      textTransform: 'uppercase',
      color: C.olive
    }
  }, "Logged."), /*#__PURE__*/React.createElement("div", {
    style: {
      ...T.body,
      color: C.dim,
      marginTop: 10
    }
  }, niceDate(summary.w.date), " \xB7 ", fmtMin((summary.w.end - summary.w.start) / 1000), " \xB7 ", doneSets(summary.w), " sets", (summary.w.mobility || []).some(m => m.done) ? ' · ' + mobMin((summary.w.mobility || []).filter(m => m.done)) + ' min mobility' : '', summary.w.volume ? ' · ' + wDisp(st, summary.w.volume) + ' ' + wUnit(st) + ' lifted' : '', ". The workout rule is cleared for today."), /*#__PURE__*/React.createElement("div", {
    style: {
      ...T.label,
      margin: '22px 0 8px'
    }
  }, "PERSONAL RECORDS"), (summary.w.prs || []).length ? summary.w.prs.map((p, i) => /*#__PURE__*/React.createElement(Card, {
    key: i,
    accent: C.amber,
    style: {
      marginBottom: 7
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: T.name
  }, "\uD83C\uDFC6 ", p.ex), /*#__PURE__*/React.createElement("div", {
    style: {
      ...T.label,
      marginTop: 4,
      color: C.amber
    }
  }, p.what, " \xB7 ", p.val))) : /*#__PURE__*/React.createElement("div", {
    style: {
      ...T.body,
      color: C.faint
    }
  }, "No new records this time."))) : null, menu ? /*#__PURE__*/React.createElement(ActionSheet, {
    title: menu.title,
    actions: menu.actions,
    onClose: () => setMenu(null)
  }) : null);
}

// ── live workout (also used to edit a finished one) ──
function WorkoutEditor({
  app,
  st,
  aw,
  upd,
  onMin,
  onCancel,
  onFinish
}) {
  const [menu, setMenu] = useState(null);
  const [picker, setPicker] = useState(null); // { mode: 'add' | 'replace', uid }
  const [noteFor, setNoteFor] = useState(null);
  const restUntil = st.restUntil,
    restLeft = restUntil ? Math.ceil((restUntil.end - Date.now()) / 1000) : 0;
  useTick(true, 500);
  useEffect(() => {
    if (restUntil && restLeft <= 0) {
      vib([200, 100, 200]);
      app.setState({
        restUntil: null
      });
    }
  }, [restLeft <= 0 && !!restUntil]);
  const updEx = (u, fn) => upd(w => ({
    ...w,
    exercises: w.exercises.map(e => e.uid === u ? fn(e) : e)
  }));
  const updSet = (u, i, fn) => updEx(u, e => ({
    ...e,
    sets: e.sets.map((s, j) => j === i ? fn(s) : s)
  }));
  const move = (u, d) => upd(w => {
    const a = w.exercises.slice(),
      i = a.findIndex(e => e.uid === u),
      j = i + d;
    if (j < 0 || j >= a.length) return w;
    [a[i], a[j]] = [a[j], a[i]];
    return {
      ...w,
      exercises: a
    };
  });
  const toggleDone = (e, i, prev) => {
    const ex = exById(st, e.exId),
      s = e.sets[i];
    if (s.done) {
      updSet(e.uid, i, x => ({
        ...x,
        done: false
      }));
      return;
    }
    const ph = prev || s.target || {};
    const filled = {
      ...s,
      w: s.w != null ? s.w : ph.w != null ? ph.w : null,
      r: s.r != null ? s.r : ph.r != null ? ph.r : null,
      t: s.t != null ? s.t : ph.t != null ? ph.t : null,
      d: s.d != null ? s.d : ph.d != null ? ph.d : null
    };
    const ok = ex.type === 'wr' ? filled.r != null : ex.type === 'r' ? filled.r != null : ex.type === 'd' ? filled.t != null : filled.d != null || filled.t != null;
    if (!ok) {
      alert('Enter ' + (ex.type === 'd' ? 'a time' : ex.type === 'dt' ? 'a distance or time' : 'the reps') + ' first.');
      return;
    }
    updSet(e.uid, i, () => ({
      ...filled,
      done: true
    }));
    vib(30);
    if (!aw.editOf && e.rest) app.setState({
      restUntil: {
        end: Date.now() + e.rest * 1000,
        total: e.rest,
        ex: ex.name
      }
    });
  };
  const addExercises = ids => upd(w => ({
    ...w,
    exercises: w.exercises.concat(ids.map(id => {
      const ex = exById(st, id),
        lp = lastPerformance(st, id, aw.editOf);
      const n = lp ? lp.sets.length : 3;
      return {
        uid: uid(),
        exId: id,
        rest: REST_DEFAULT[ex.type],
        note: '',
        sets: Array.from({
          length: n
        }, () => ({
          w: null,
          r: null,
          t: null,
          d: null,
          kind: 'n',
          done: false
        }))
      };
    }))
  }));
  const elapsed = aw.editOf ? (aw.end - aw.start) / 1000 : (Date.now() - aw.start) / 1000;
  const cols = type => type === 'wr' ? [wUnit(st).toUpperCase(), 'REPS'] : type === 'r' ? ['REPS'] : type === 'd' ? ['TIME'] : ['KM', 'TIME'];
  const cellIn = {
    width: '100%',
    boxSizing: 'border-box',
    background: '#23271a',
    border: '1px solid transparent',
    color: C.text,
    textAlign: 'center',
    font: `600 16px/1 ${F.body}`,
    padding: '9px 2px',
    outline: 'none',
    borderRadius: 0
  };
  return /*#__PURE__*/React.createElement(Sheet, {
    z: 45,
    title: aw.editOf ? 'Edit workout' : fmtDur(elapsed),
    sub: aw.editOf ? niceDate(aw.date).toUpperCase() : 'ELAPSED · ' + doneSets(aw) + ' SETS DONE',
    left: /*#__PURE__*/React.createElement(TopLink, {
      onClick: onMin
    }, "\u25BC HIDE"),
    right: /*#__PURE__*/React.createElement(Btn, {
      tone: C.olive,
      ink: C.oliveInk,
      onClick: onFinish,
      style: {
        minHeight: 36,
        padding: '0 14px',
        fontSize: 15
      }
    }, aw.editOf ? 'Save' : 'Finish'),
    footer: restUntil && restLeft > 0 ? /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: T.label
    }, "REST \xB7 ", restUntil.ex), /*#__PURE__*/React.createElement("div", {
      style: {
        font: `800 30px/1 ${F.head}`,
        color: C.olive,
        marginTop: 3
      }
    }, fmtDur(restLeft))), /*#__PURE__*/React.createElement(Btn, {
      kind: "ghost",
      tone: C.text,
      onClick: () => app.setState(s => ({
        restUntil: {
          ...s.restUntil,
          end: s.restUntil.end - 15000
        }
      })),
      style: {
        minHeight: 42,
        padding: '0 12px'
      }
    }, "\u221215"), /*#__PURE__*/React.createElement(Btn, {
      kind: "ghost",
      tone: C.text,
      onClick: () => app.setState(s => ({
        restUntil: {
          ...s.restUntil,
          end: s.restUntil.end + 15000,
          total: s.restUntil.total + 15
        }
      })),
      style: {
        minHeight: 42,
        padding: '0 12px'
      }
    }, "+15"), /*#__PURE__*/React.createElement(Btn, {
      tone: C.olive,
      ink: C.oliveInk,
      onClick: () => app.setState({
        restUntil: null
      }),
      style: {
        minHeight: 42,
        padding: '0 14px',
        fontSize: 14
      }
    }, "Skip")), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 8
      }
    }, /*#__PURE__*/React.createElement(Bar, {
      pct: 100 * restLeft / restUntil.total,
      tone: C.olive,
      h: 4
    }))) : null
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '14px 16px 30px'
    }
  }, /*#__PURE__*/React.createElement("input", {
    value: aw.name,
    onChange: e => {
      const v = e.target.value;
      upd(w => ({
        ...w,
        name: v
      }));
    },
    style: {
      width: '100%',
      boxSizing: 'border-box',
      background: 'transparent',
      border: 'none',
      borderBottom: '1px dotted ' + C.line2,
      color: C.text,
      font: `800 28px/1.1 ${F.head}`,
      textTransform: 'uppercase',
      padding: '4px 0 6px',
      outline: 'none'
    }
  }), aw.exercises.map((e, ei) => {
    const ex = exById(st, e.exId),
      lp = lastPerformance(st, e.exId, aw.editOf),
      cs = cols(ex.type);
    return /*#__PURE__*/React.createElement("div", {
      key: e.uid,
      style: {
        marginTop: 20
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0,
        font: `700 17px/1.2 ${F.body}`,
        color: C.olive
      }
    }, ex.name), /*#__PURE__*/React.createElement("span", {
      role: "button",
      onClick: () => setMenu({
        title: ex.name,
        actions: [{
          label: e.note ? 'Edit note' : 'Add note',
          run: () => setNoteFor(e.uid)
        }, {
          label: 'Rest timer · ' + (e.rest ? fmtDur(e.rest) : 'off'),
          run: () => setMenu({
            title: 'Rest after each set',
            actions: [0, 60, 90, 120, 150, 180, 240].map(t => ({
              label: t ? fmtDur(t) : 'Off',
              run: () => updEx(e.uid, x => ({
                ...x,
                rest: t
              }))
            }))
          })
        }, {
          label: 'Replace exercise',
          run: () => setPicker({
            mode: 'replace',
            uid: e.uid
          })
        }, ei > 0 ? {
          label: 'Move up',
          run: () => move(e.uid, -1)
        } : null, ei < aw.exercises.length - 1 ? {
          label: 'Move down',
          run: () => move(e.uid, 1)
        } : null, {
          label: 'Remove exercise',
          danger: true,
          run: () => upd(w => ({
            ...w,
            exercises: w.exercises.filter(x => x.uid !== e.uid)
          }))
        }]
      }),
      style: {
        ...T.mono,
        color: C.olive,
        padding: '6px 4px 6px 12px',
        cursor: 'pointer'
      }
    }, "\u2022\u2022\u2022")), e.note ? /*#__PURE__*/React.createElement("div", {
      style: {
        font: `italic 400 13px/1.4 ${F.body}`,
        color: C.dim,
        marginTop: 2
      }
    }, e.note) : null, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: `34px 1fr ${cs.map(() => '64px').join(' ')} 44px`,
        gap: 6,
        alignItems: 'center',
        marginTop: 8
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        ...T.label,
        textAlign: 'center'
      }
    }, "SET"), /*#__PURE__*/React.createElement("div", {
      style: T.label
    }, "PREVIOUS"), cs.map(c => /*#__PURE__*/React.createElement("div", {
      key: c,
      style: {
        ...T.label,
        textAlign: 'center'
      }
    }, c)), /*#__PURE__*/React.createElement("div", {
      style: {
        ...T.label,
        textAlign: 'center'
      }
    }, "\u2713"), e.sets.map((s, i) => {
      const prev = lp && lp.sets[i] ? lp.sets[i] : null,
        ph = prev || s.target || {};
      const kindCol = s.kind === 'w' ? C.amber : s.kind === 'd' ? C.blue : s.kind === 'f' ? C.red : C.text;
      const rowBg = s.done ? 'rgba(138,151,87,.18)' : 'transparent';
      const inStyle = {
        ...cellIn,
        background: s.done ? 'transparent' : '#23271a'
      };
      const numIdx = e.sets.slice(0, i + 1).filter(x => x.kind !== 'w').length;
      return /*#__PURE__*/React.createElement(React.Fragment, {
        key: i
      }, /*#__PURE__*/React.createElement("div", {
        role: "button",
        onClick: () => setMenu({
          title: 'Set ' + (i + 1),
          actions: [{
            label: 'Normal set',
            run: () => updSet(e.uid, i, x => ({
              ...x,
              kind: 'n'
            }))
          }, {
            label: 'Warm-up set (W)',
            run: () => updSet(e.uid, i, x => ({
              ...x,
              kind: 'w'
            }))
          }, {
            label: 'Drop set (D)',
            run: () => updSet(e.uid, i, x => ({
              ...x,
              kind: 'd'
            }))
          }, {
            label: 'Failure set (F)',
            run: () => updSet(e.uid, i, x => ({
              ...x,
              kind: 'f'
            }))
          }, {
            label: 'Delete set',
            danger: true,
            run: () => updEx(e.uid, x => ({
              ...x,
              sets: x.sets.filter((_, j) => j !== i)
            }))
          }]
        }),
        style: {
          background: rowBg,
          textAlign: 'center',
          padding: '9px 0',
          cursor: 'pointer',
          font: `700 14px/1 ${F.mono}`,
          color: kindCol
        }
      }, s.kind && s.kind !== 'n' ? s.kind.toUpperCase() : numIdx), /*#__PURE__*/React.createElement("div", {
        role: "button",
        onClick: () => prev && updSet(e.uid, i, x => ({
          ...x,
          w: prev.w,
          r: prev.r,
          t: prev.t,
          d: prev.d
        })),
        style: {
          background: rowBg,
          padding: '9px 0',
          ...T.mono,
          fontSize: 11,
          letterSpacing: '.02em',
          color: C.faint,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          cursor: prev ? 'pointer' : 'default'
        }
      }, prev ? setText(st, ex.type, prev) : '—'), ex.type === 'wr' || ex.type === 'dt' ? /*#__PURE__*/React.createElement("input", {
        inputMode: "decimal",
        style: inStyle,
        value: ex.type === 'wr' ? wDisp(st, s.w) : s.d == null ? '' : s.d,
        placeholder: ex.type === 'wr' ? wDisp(st, ph.w) : ph.d != null ? String(r2(ph.d)) : '',
        onChange: ev => {
          const v = ev.target.value;
          updSet(e.uid, i, x => ex.type === 'wr' ? {
            ...x,
            w: v === '' ? null : wParse(st, v)
          } : {
            ...x,
            d: num(v)
          });
        }
      }) : null, ex.type === 'wr' || ex.type === 'r' ? /*#__PURE__*/React.createElement("input", {
        inputMode: "numeric",
        style: inStyle,
        value: s.r == null ? '' : s.r,
        placeholder: ph.r != null ? String(ph.r) : '',
        onChange: ev => {
          const v = ev.target.value;
          updSet(e.uid, i, x => ({
            ...x,
            r: v === '' ? null : Math.max(0, Math.round(num(v) || 0))
          }));
        }
      }) : null, ex.type === 'd' || ex.type === 'dt' ? /*#__PURE__*/React.createElement("input", {
        inputMode: "numbers-and-punctuation",
        style: inStyle,
        value: s.tRaw != null ? s.tRaw : s.t == null ? '' : fmtDur(s.t),
        placeholder: ph.t != null ? fmtDur(ph.t) : 'm:ss',
        onChange: ev => {
          const v = ev.target.value;
          updSet(e.uid, i, x => ({
            ...x,
            tRaw: v,
            t: parseTime(v)
          }));
        },
        onBlur: () => updSet(e.uid, i, x => ({
          ...x,
          tRaw: undefined
        }))
      }) : null, /*#__PURE__*/React.createElement("div", {
        role: "button",
        onClick: () => toggleDone(e, i, prev),
        style: {
          height: 36,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          background: s.done ? C.olive : '#23271a',
          color: s.done ? C.oliveInk : C.faint,
          font: `700 16px/1 ${F.mono}`
        }
      }, "\u2713"));
    })), /*#__PURE__*/React.createElement("div", {
      role: "button",
      onClick: () => updEx(e.uid, x => ({
        ...x,
        sets: x.sets.concat({
          w: null,
          r: null,
          t: null,
          d: null,
          kind: 'n',
          done: false,
          target: x.sets.length ? {
            ...x.sets[x.sets.length - 1],
            done: false
          } : undefined
        })
      })),
      style: {
        marginTop: 8,
        padding: '10px',
        textAlign: 'center',
        background: '#1a1d12',
        cursor: 'pointer',
        ...T.mono,
        fontSize: 12,
        color: C.dim
      }
    }, "+ ADD SET", e.rest ? ' · REST ' + fmtDur(e.rest) : ''));
  }), /*#__PURE__*/React.createElement(MobilityBlock, {
    list: aw.mobility || [],
    onChange: fn => upd(w => ({
      ...w,
      mobility: fn(w.mobility || [])
    })),
    live: true
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      marginTop: 26
    }
  }, /*#__PURE__*/React.createElement(Btn, {
    kind: "ghost",
    tone: C.olive,
    onClick: () => setPicker({
      mode: 'add'
    })
  }, "+ ADD EXERCISES"), /*#__PURE__*/React.createElement(Btn, {
    kind: "danger",
    onClick: onCancel
  }, aw.editOf ? 'DISCARD CHANGES' : 'CANCEL WORKOUT'))), picker ? /*#__PURE__*/React.createElement(ExercisePicker, {
    st: st,
    app: app,
    multi: picker.mode === 'add',
    onClose: () => setPicker(null),
    onPick: ids => {
      if (picker.mode === 'add') addExercises(ids);else {
        const ex = exById(st, ids[0]);
        updEx(picker.uid, x => ({
          ...x,
          exId: ids[0],
          rest: REST_DEFAULT[ex.type],
          sets: x.sets.map(s => ({
            ...s,
            w: null,
            r: null,
            t: null,
            d: null,
            done: false
          }))
        }));
      }
      setPicker(null);
    }
  }) : null, noteFor ? /*#__PURE__*/React.createElement(NoteEditor, {
    value: (aw.exercises.find(x => x.uid === noteFor) || {}).note || '',
    onSave: v => {
      updEx(noteFor, x => ({
        ...x,
        note: v
      }));
      setNoteFor(null);
    },
    onClose: () => setNoteFor(null)
  }) : null, menu ? /*#__PURE__*/React.createElement(ActionSheet, {
    title: menu.title,
    actions: menu.actions,
    onClose: () => setMenu(null)
  }) : null);
}
function NoteEditor({
  value,
  onSave,
  onClose
}) {
  const [v, setV] = useState(value);
  return ReactDOM.createPortal(/*#__PURE__*/React.createElement("div", {
    style: {
      position: 'fixed',
      inset: 0,
      zIndex: 90,
      background: 'rgba(0,0,0,.6)',
      display: 'flex',
      alignItems: 'flex-end'
    },
    onClick: onClose
  }, /*#__PURE__*/React.createElement("div", {
    onClick: e => e.stopPropagation(),
    style: {
      width: '100%',
      background: '#15170e',
      padding: '16px 16px calc(env(safe-area-inset-bottom, 0px) + 14px)',
      borderTop: '1px solid ' + C.line2
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      ...T.label,
      marginBottom: 8
    }
  }, "NOTE FOR THIS EXERCISE"), /*#__PURE__*/React.createElement("textarea", {
    autoFocus: true,
    value: v,
    onChange: e => setV(e.target.value),
    rows: 3,
    placeholder: "e.g. seat height 4, pause at the bottom",
    style: {
      width: '100%',
      boxSizing: 'border-box',
      background: C.card,
      border: '1px solid ' + C.line2,
      color: C.text,
      font: `400 16px/1.4 ${F.body}`,
      padding: 10,
      outline: 'none',
      resize: 'none'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      marginTop: 10
    }
  }, /*#__PURE__*/React.createElement(Btn, {
    kind: "ghost",
    tone: C.dim,
    onClick: onClose,
    style: {
      flex: 1
    }
  }, "CANCEL"), /*#__PURE__*/React.createElement(Btn, {
    tone: C.olive,
    ink: C.oliveInk,
    onClick: () => onSave(v.trim()),
    style: {
      flex: 2
    }
  }, "Save note")))), document.body);
}
function ExercisePicker({
  st,
  app,
  multi,
  onPick,
  onClose
}) {
  const [q, setQ] = useState(''),
    [part, setPart] = useState('All'),
    [sel, setSel] = useState([]),
    [creating, setCreating] = useState(null);
  const list = allExercises(st).filter(e => (part === 'All' || e.part === part) && (!q || e.name.toLowerCase().includes(q.toLowerCase()))).sort((a, b) => a.name.localeCompare(b.name));
  const pick = id => {
    if (!multi) return onPick([id]);
    setSel(s => s.includes(id) ? s.filter(x => x !== id) : s.concat(id));
  };
  return /*#__PURE__*/React.createElement(Sheet, {
    z: 60,
    title: multi ? 'Add exercises' : 'Replace exercise',
    left: /*#__PURE__*/React.createElement(TopLink, {
      onClick: onClose
    }, "\u2039 BACK"),
    right: /*#__PURE__*/React.createElement(TopLink, {
      tone: C.olive,
      onClick: () => setCreating({
        name: q,
        part: part === 'All' ? 'Other' : part,
        type: 'wr'
      })
    }, "+ NEW"),
    footer: multi ? /*#__PURE__*/React.createElement(Btn, {
      tone: C.olive,
      ink: C.oliveInk,
      disabled: !sel.length,
      onClick: () => onPick(sel)
    }, sel.length ? 'Add ' + sel.length + (sel.length === 1 ? ' exercise' : ' exercises') : 'Pick exercises') : null
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '12px 16px 20px'
    }
  }, /*#__PURE__*/React.createElement(Field, {
    value: q,
    onChange: setQ,
    placeholder: "Search exercises",
    autoFocus: true
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6,
      overflowX: 'auto',
      margin: '10px -16px 4px',
      padding: '0 16px'
    }
  }, PARTS.map(p => /*#__PURE__*/React.createElement(Chip, {
    key: p,
    on: part === p,
    tone: C.olive,
    ink: C.oliveInk,
    onClick: () => setPart(p)
  }, p.toUpperCase()))), list.map(e => {
    const on = sel.includes(e.id);
    return /*#__PURE__*/React.createElement("div", {
      key: e.id,
      role: "button",
      onClick: () => pick(e.id),
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '12px 4px',
        borderBottom: '1px solid #1f2216',
        cursor: 'pointer',
        background: on ? 'rgba(138,151,87,.14)' : 'transparent'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: T.name
    }, e.name), /*#__PURE__*/React.createElement("div", {
      style: {
        ...T.label,
        marginTop: 3
      }
    }, e.part, " \xB7 ", {
      wr: 'WEIGHT × REPS',
      r: 'REPS',
      d: 'TIME',
      dt: 'DISTANCE + TIME'
    }[e.type])), multi ? /*#__PURE__*/React.createElement("div", {
      style: {
        width: 22,
        height: 22,
        border: '1.5px solid ' + (on ? C.olive : C.line2),
        background: on ? C.olive : 'transparent',
        color: C.oliveInk,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        font: `700 13px/1 ${F.mono}`
      }
    }, on ? '✓' : '') : null);
  }), !list.length ? /*#__PURE__*/React.createElement(Empty, null, "NOTHING MATCHES \xB7 TAP + NEW TO CREATE \u201C", q.toUpperCase(), "\u201D") : null), creating ? /*#__PURE__*/React.createElement(CreateExercise, {
    app: app,
    draft: creating,
    setDraft: setCreating,
    onDone: id => {
      setCreating(null);
      if (id) pick(id);
    }
  }) : null);
}
function CreateExercise({
  app,
  draft,
  setDraft,
  onDone
}) {
  const save = () => {
    const name = (draft.name || '').trim();
    if (!name) {
      alert('Give the exercise a name.');
      return;
    }
    const id = 'x' + uid();
    app.setState(s => ({
      exLib: (s.exLib || []).concat({
        id,
        name,
        part: draft.part,
        type: draft.type,
        custom: true
      })
    }));
    onDone(id);
  };
  return /*#__PURE__*/React.createElement(Sheet, {
    z: 70,
    title: "New exercise",
    left: /*#__PURE__*/React.createElement(TopLink, {
      onClick: () => onDone(null)
    }, "\u2039 BACK"),
    footer: /*#__PURE__*/React.createElement(Btn, {
      tone: C.olive,
      ink: C.oliveInk,
      onClick: save
    }, "Save exercise")
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '16px 18px',
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(Field, {
    label: "NAME",
    value: draft.name,
    onChange: v => setDraft({
      ...draft,
      name: v
    }),
    placeholder: "e.g. Cable Lateral Raise",
    autoFocus: true
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      ...T.label,
      marginBottom: 6
    }
  }, "BODY PART"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 6
    }
  }, PARTS.slice(1).map(p => /*#__PURE__*/React.createElement(Chip, {
    key: p,
    on: draft.part === p,
    tone: C.olive,
    ink: C.oliveInk,
    onClick: () => setDraft({
      ...draft,
      part: p
    })
  }, p.toUpperCase())))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      ...T.label,
      marginBottom: 6
    }
  }, "WHAT YOU LOG"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 6
    }
  }, [['wr', 'WEIGHT × REPS'], ['r', 'REPS ONLY'], ['d', 'TIME'], ['dt', 'DISTANCE + TIME']].map(([v, l]) => /*#__PURE__*/React.createElement(Chip, {
    key: v,
    on: draft.type === v,
    tone: C.olive,
    ink: C.oliveInk,
    onClick: () => setDraft({
      ...draft,
      type: v
    })
  }, l))))));
}
function TemplateEditor({
  app,
  st,
  draft,
  setDraft,
  onClose
}) {
  const [picker, setPicker] = useState(false);
  const SH = window.SH;
  const save = () => {
    const t = {
      ...draft,
      id: draft.id || 't' + uid(),
      name: draft.name.trim() || 'Untitled template',
      mobility: mobOf(draft).filter(m => (m.name || '').trim()).map(m => ({
        name: m.name.trim(),
        min: Number(m.min) || 0
      }))
    };
    app.setState(s => ({
      templates: (s.templates || []).some(x => x.id === t.id) ? s.templates.map(x => x.id === t.id ? t : x) : (s.templates || []).concat(t)
    }));
    onClose();
  };
  const setEx = (i, fn) => setDraft({
    ...draft,
    exercises: draft.exercises.map((e, j) => j === i ? fn(e) : e)
  });
  return /*#__PURE__*/React.createElement(Sheet, {
    z: 50,
    title: draft.id ? 'Edit template' : 'New template',
    left: /*#__PURE__*/React.createElement(TopLink, {
      onClick: onClose
    }, "\u2039 BACK"),
    right: /*#__PURE__*/React.createElement(TopLink, {
      tone: C.olive,
      onClick: save
    }, "SAVE")
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '14px 18px 30px'
    }
  }, /*#__PURE__*/React.createElement(Field, {
    label: "TEMPLATE NAME",
    value: draft.name,
    onChange: v => setDraft({
      ...draft,
      name: v
    })
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      ...T.label,
      margin: '14px 0 6px'
    }
  }, "SPLIT DAY"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 5,
      flexWrap: 'wrap'
    }
  }, [null, 0, 1, 2, 3, 4, 5, 6].map(d => /*#__PURE__*/React.createElement(Chip, {
    key: String(d),
    on: draft.day === d,
    tone: C.olive,
    ink: C.oliveInk,
    onClick: () => setDraft({
      ...draft,
      day: d
    })
  }, d == null ? 'ANY' : SH.PLAN[d].abbr))), draft.exercises.map((e, i) => {
    const ex = exById(st, e.exId);
    return /*#__PURE__*/React.createElement(Card, {
      key: i,
      style: {
        marginTop: 10,
        padding: 12
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        ...T.name,
        color: C.olive
      }
    }, ex.name), /*#__PURE__*/React.createElement("span", {
      role: "button",
      onClick: () => setDraft({
        ...draft,
        exercises: draft.exercises.filter((_, j) => j !== i)
      }),
      style: {
        ...T.mono,
        fontSize: 11,
        color: C.red,
        cursor: 'pointer',
        padding: 6
      }
    }, "REMOVE")), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginTop: 8
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        ...T.label,
        flex: 1
      }
    }, "SETS"), /*#__PURE__*/React.createElement(Btn, {
      kind: "ghost",
      tone: C.text,
      onClick: () => setEx(i, x => ({
        ...x,
        sets: x.sets.length > 1 ? x.sets.slice(0, -1) : x.sets
      })),
      style: {
        minHeight: 38,
        padding: '0 14px'
      }
    }, "\u2212"), /*#__PURE__*/React.createElement("span", {
      style: {
        font: `700 22px/1 ${F.head}`,
        width: 30,
        textAlign: 'center'
      }
    }, e.sets.length), /*#__PURE__*/React.createElement(Btn, {
      kind: "ghost",
      tone: C.text,
      onClick: () => setEx(i, x => ({
        ...x,
        sets: x.sets.concat({
          ...(x.sets[x.sets.length - 1] || {})
        })
      })),
      style: {
        minHeight: 38,
        padding: '0 14px'
      }
    }, "+")), ex.type === 'wr' || ex.type === 'r' ? /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginTop: 6
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        ...T.label,
        flex: 1
      }
    }, "TARGET REPS"), /*#__PURE__*/React.createElement("input", {
      inputMode: "numeric",
      value: e.sets[0] && e.sets[0].r != null ? e.sets[0].r : '',
      onChange: ev => {
        const r = ev.target.value === '' ? null : Math.round(num(ev.target.value) || 0);
        setEx(i, x => ({
          ...x,
          sets: x.sets.map(s => ({
            ...s,
            r
          }))
        }));
      },
      style: {
        width: 70,
        boxSizing: 'border-box',
        background: '#23271a',
        border: 'none',
        color: C.text,
        textAlign: 'center',
        font: `600 16px/1 ${F.body}`,
        padding: '9px 2px',
        outline: 'none'
      }
    })) : null);
  }), /*#__PURE__*/React.createElement(Btn, {
    kind: "ghost",
    tone: C.olive,
    onClick: () => setPicker(true),
    style: {
      marginTop: 14
    }
  }, "+ ADD EXERCISES"), /*#__PURE__*/React.createElement(MobilityBlock, {
    list: mobOf(draft),
    onChange: fn => setDraft({
      ...draft,
      mobility: fn(mobOf(draft))
    })
  })), picker ? /*#__PURE__*/React.createElement(ExercisePicker, {
    st: st,
    app: app,
    multi: true,
    onClose: () => setPicker(false),
    onPick: ids => {
      setDraft({
        ...draft,
        exercises: draft.exercises.concat(ids.map(id => ({
          exId: id,
          rest: REST_DEFAULT[exById(st, id).type],
          sets: S(3, exById(st, id).type === 'wr' || exById(st, id).type === 'r' ? 10 : null)
        })))
      });
      setPicker(false);
    }
  }) : null);
}
function ExerciseDetail({
  st,
  app,
  exId,
  onClose
}) {
  const ex = exById(st, exId),
    rec = records(st, exId, null);
  const hist = (st.workouts || []).filter(w => w.exercises.some(e => e.exId === exId && e.sets.some(s => s.done))).slice().reverse();
  const pts = hist.slice(0, 12).reverse().map(w => {
    const e = w.exercises.find(x => x.exId === exId);
    return ex.type === 'wr' ? Math.max(...e.sets.map(est1rm)) : ex.type === 'r' ? Math.max(...e.sets.map(s => s.r || 0)) : ex.type === 'd' ? Math.max(...e.sets.map(s => s.t || 0)) : Math.max(...e.sets.map(s => s.d || 0));
  });
  const lo = Math.min(...pts),
    hi = Math.max(...pts);
  const tiles = ex.type === 'wr' ? [['EST. 1RM', rec.e1rm ? wDisp(st, r1(rec.e1rm)) + ' ' + wUnit(st) : '—'], ['HEAVIEST', rec.heavy ? wDisp(st, rec.heavy) + ' ' + wUnit(st) : '—'], ['BEST SET VOL', rec.vol ? wDisp(st, rec.vol) + ' ' + wUnit(st) : '—']] : ex.type === 'r' ? [['MOST REPS', rec.reps || '—']] : ex.type === 'd' ? [['LONGEST', rec.time ? fmtDur(rec.time) : '—']] : [['LONGEST', rec.dist ? r2(rec.dist) + ' km' : '—'], ['LONGEST TIME', rec.time ? fmtDur(rec.time) : '—']];
  return /*#__PURE__*/React.createElement(Sheet, {
    z: 50,
    title: ex.name,
    sub: ex.part.toUpperCase(),
    left: /*#__PURE__*/React.createElement(TopLink, {
      onClick: onClose
    }, "\u2039 BACK"),
    right: ex.custom ? /*#__PURE__*/React.createElement(TopLink, {
      tone: C.red,
      onClick: () => {
        if (confirm('Delete this custom exercise? Past workouts keep their records.')) {
          app.setState(s => ({
            exLib: (s.exLib || []).filter(e => e.id !== exId)
          }));
          onClose();
        }
      }
    }, "DELETE") : null
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '14px 18px 26px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      ...T.label,
      marginBottom: 8
    }
  }, "PERSONAL RECORDS"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: `repeat(${tiles.length}, 1fr)`,
      gap: 7
    }
  }, tiles.map(([l, v]) => /*#__PURE__*/React.createElement(Card, {
    key: l,
    style: {
      padding: '10px 11px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: T.label
  }, l), /*#__PURE__*/React.createElement("div", {
    style: {
      font: `700 20px/1.1 ${F.head}`,
      marginTop: 4,
      color: C.amber
    }
  }, v)))), pts.length > 1 ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      ...T.label,
      margin: '18px 0 8px'
    }
  }, ex.type === 'wr' ? 'EST. 1RM · LAST ' + pts.length + ' SESSIONS' : 'BEST · LAST ' + pts.length + ' SESSIONS'), /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 300 90",
    style: {
      width: '100%',
      height: 90,
      display: 'block'
    }
  }, /*#__PURE__*/React.createElement("polyline", {
    fill: "none",
    stroke: C.olive,
    strokeWidth: "2.5",
    points: pts.map((v, i) => i * 300 / (pts.length - 1) + ',' + (80 - (hi - lo < 0.01 ? 35 : 70 * (v - lo) / (hi - lo)))).join(' ')
  }), pts.map((v, i) => /*#__PURE__*/React.createElement("circle", {
    key: i,
    cx: i * 300 / (pts.length - 1),
    cy: 80 - (hi - lo < 0.01 ? 35 : 70 * (v - lo) / (hi - lo)),
    r: "3.5",
    fill: C.olive
  })))) : null, /*#__PURE__*/React.createElement("div", {
    style: {
      ...T.label,
      margin: '18px 0 4px'
    }
  }, "HISTORY"), hist.map(w => {
    const e = w.exercises.find(x => x.exId === exId);
    return /*#__PURE__*/React.createElement("div", {
      key: w.id,
      style: {
        padding: '10px 0',
        borderBottom: '1px solid #1f2216'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        justifyContent: 'space-between'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: T.name
    }, w.name), /*#__PURE__*/React.createElement("span", {
      style: T.label
    }, niceDate(w.date).toUpperCase())), /*#__PURE__*/React.createElement("div", {
      style: {
        ...T.mono,
        fontSize: 11,
        color: C.dim,
        marginTop: 5,
        lineHeight: 1.6
      }
    }, e.sets.filter(s => s.done).map(s => setText(st, ex.type, s)).join('  ·  ')));
  }), !hist.length ? /*#__PURE__*/React.createElement(Empty, null, "NOT LOGGED YET") : null));
}
function MobilityBlock({
  list,
  onChange,
  live
}) {
  const set = (i, patch) => onChange(l => l.map((m, j) => j === i ? {
    ...m,
    ...patch
  } : m));
  const inp = {
    boxSizing: 'border-box',
    background: '#23271a',
    border: 'none',
    color: C.text,
    font: `500 15px/1.2 ${F.body}`,
    padding: '10px 8px',
    outline: 'none',
    borderRadius: 0,
    minWidth: 0
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 24
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'baseline'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: `700 17px/1.2 ${F.body}`,
      color: C.olive
    }
  }, "Mobility"), /*#__PURE__*/React.createElement("span", {
    style: {
      ...T.label
    }
  }, mobMin(list.map(m => ({
    ...m,
    done: live ? m.done : true
  }))), " ", live ? 'OF ' + mobMin(list.map(m => ({
    ...m,
    done: true
  }))) + ' ' : '', "MIN")), list.map((m, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: 'flex',
      gap: 6,
      alignItems: 'center',
      marginTop: 7
    }
  }, live ? /*#__PURE__*/React.createElement("div", {
    role: "button",
    onClick: () => set(i, {
      done: !m.done
    }),
    style: {
      width: 40,
      height: 40,
      flex: 'none',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      background: m.done ? C.olive : '#23271a',
      color: m.done ? C.oliveInk : C.faint,
      font: `700 16px/1 ${F.mono}`
    }
  }, "\u2713") : null, /*#__PURE__*/React.createElement("input", {
    value: m.name,
    placeholder: "e.g. Hip flow",
    onChange: e => set(i, {
      name: e.target.value
    }),
    style: {
      ...inp,
      flex: 1,
      textDecoration: live && m.done ? 'line-through' : 'none',
      color: live && m.done ? C.dim : C.text
    }
  }), /*#__PURE__*/React.createElement("input", {
    value: m.min == null ? '' : m.min,
    inputMode: "numeric",
    onChange: e => set(i, {
      min: e.target.value === '' ? '' : Math.max(0, Math.round(num(e.target.value) || 0))
    }),
    style: {
      ...inp,
      width: 52,
      textAlign: 'center'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      ...T.label,
      width: 26
    }
  }, "MIN"), /*#__PURE__*/React.createElement("span", {
    role: "button",
    onClick: () => onChange(l => l.filter((_, j) => j !== i)),
    style: {
      ...T.mono,
      fontSize: 14,
      color: C.faint,
      padding: '8px 4px',
      cursor: 'pointer'
    }
  }, "\u2715"))), !list.length ? /*#__PURE__*/React.createElement("div", {
    style: {
      ...T.label,
      color: C.faint,
      marginTop: 8
    }
  }, "NO MOBILITY ON THIS DAY") : null, /*#__PURE__*/React.createElement("div", {
    role: "button",
    onClick: () => onChange(l => l.concat({
      name: '',
      min: 10,
      done: false
    })),
    style: {
      marginTop: 8,
      padding: '10px',
      textAlign: 'center',
      background: '#1a1d12',
      cursor: 'pointer',
      ...T.mono,
      fontSize: 12,
      color: C.dim
    }
  }, "+ ADD MOBILITY"));
}

// ── FUEL: day diary with meal sections, food search / scan / detail (works like YAZIO) ──
const SLOTS = [['BREAKFAST', 'Breakfast', 0.25], ['LUNCH', 'Lunch', 0.35], ['DINNER', 'Dinner', 0.30], ['SNACK', 'Snacks', 0.10]];
const scaleN = (v, k) => ({
  kcal: (v.kcal || 0) * k,
  p: (v.p || 0) * k,
  c: (v.c || 0) * k,
  f: (v.f || 0) * k
});
const roundN = v => ({
  kcal: Math.round(v.kcal),
  p: r1(v.p),
  c: r1(v.c),
  f: r1(v.f)
});
const sumN = list => list.reduce((a, m) => ({
  kcal: a.kcal + (m.kcal || 0),
  p: a.p + (m.p || 0),
  c: a.c + (m.c || 0),
  f: a.f + (m.f || 0)
}), {
  kcal: 0,
  p: 0,
  c: 0,
  f: 0
});

// Any food shape (built-in, USDA, scanned, custom, old meal entry) → one normalized record
function normFood(f) {
  if (f.food) return f.food;
  let servG = f.servG || f.g || null,
    per100 = f.per100 || null,
    perServ;
  if (!servG) {
    const m = String(f.serv || '').match(/(\d+(?:\.\d+)?)\s*(g|ml)\b/i);
    if (m) servG = parseFloat(m[1]);
  }
  if (per100) {
    servG = servG || 100;
    perServ = scaleN(per100, servG / 100);
  } else {
    perServ = {
      kcal: f.kcal || 0,
      p: f.p || 0,
      c: f.c || 0,
      f: f.f || 0
    };
    if (servG) per100 = scaleN(perServ, 100 / servG);
  }
  const label = f.servLabel || f.serv || (servG ? servG + ' g' : '1 serving');
  return {
    key: (f.name + '|' + (f.brand || '')).toLowerCase(),
    name: f.name,
    brand: f.brand || '',
    src: f.src || f.source || '',
    servLabel: label,
    servG,
    per100,
    perServ,
    upc: f.upc
  };
}
function calcAmount(nf, amount, unit) {
  const a = Math.max(0, Number(amount) || 0);
  if ((unit === 'g' || unit === 'oz') && nf.per100) {
    const g = unit === 'oz' ? a * 28.3495 : a;
    return {
      g: r1(g),
      ...roundN(scaleN(nf.per100, g / 100))
    };
  }
  if (nf.per100 && nf.servG) {
    const g = a * nf.servG;
    return {
      g: r1(g),
      ...roundN(scaleN(nf.per100, g / 100))
    };
  }
  return {
    g: nf.servG ? r1(a * nf.servG) : null,
    ...roundN(scaleN(nf.perServ, a))
  };
}
function makeEntry(nf, amount, unit, slot) {
  const v = calcAmount(nf, amount, unit);
  return {
    id: 'm' + uid(),
    time: window.SH.nowHM(),
    slot,
    name: nf.name,
    brand: nf.brand,
    src: nf.src,
    food: nf,
    amount: Number(amount) || 0,
    unit,
    g: v.g,
    per100: nf.per100,
    kcal: v.kcal,
    p: v.p,
    c: v.c,
    f: v.f,
    serv: unit === 'serv' ? Number(amount) === 1 ? nf.servLabel : amount + ' × ' + nf.servLabel : amount + ' ' + unit
  };
}
const amountText = m => m.unit === 'g' || m.unit === 'oz' ? r1(m.amount) + ' ' + m.unit : m.unit === 'serv' ? m.amount === 1 ? m.food ? m.food.servLabel : m.serv : r1(m.amount) + ' × ' + (m.food ? m.food.servLabel : 'serving') : m.serv || (m.g ? m.g + ' g' : '');
const dbCache = new Map();
function useDbSearch(q) {
  const [, force] = useState(0);
  const key = q.trim().toLowerCase();
  useEffect(() => {
    if (key.length < 2 || dbCache.has(key)) return;
    const t = setTimeout(() => {
      dbCache.set(key, {
        status: 'loading',
        foods: []
      });
      force(x => x + 1);
      fetch('/api/food-search?q=' + encodeURIComponent(key)).then(r => r.json().then(j => r.ok ? j : Promise.reject(new Error(j.error || r.status)))).then(j => {
        dbCache.set(key, {
          status: 'ok',
          foods: (j.foods || []).map(d => ({
            name: d.name,
            brand: d.brand,
            serv: d.serv,
            g: d.g,
            per100: d.per100,
            src: d.source,
            upc: d.upc
          }))
        });
        force(x => x + 1);
      }).catch(e => {
        dbCache.set(key, {
          status: 'err',
          foods: [],
          msg: String(e.message || e)
        });
        force(x => x + 1);
        setTimeout(() => dbCache.delete(key), 20000);
      });
    }, 350);
    return () => clearTimeout(t);
  }, [key]);
  return key.length >= 2 ? dbCache.get(key) || {
    status: 'loading',
    foods: []
  } : null;
}
function Ring({
  pct,
  size = 150,
  stroke = 12,
  tone,
  children
}) {
  const r = (size - stroke) / 2,
    c = 2 * Math.PI * r,
    p = Math.max(0, Math.min(1, pct));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      width: size,
      height: size,
      flex: 'none'
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size,
    style: {
      transform: 'rotate(-90deg)'
    }
  }, /*#__PURE__*/React.createElement("circle", {
    cx: size / 2,
    cy: size / 2,
    r: r,
    fill: "none",
    stroke: "#23271a",
    strokeWidth: stroke
  }), /*#__PURE__*/React.createElement("circle", {
    cx: size / 2,
    cy: size / 2,
    r: r,
    fill: "none",
    stroke: tone,
    strokeWidth: stroke,
    strokeLinecap: "round",
    strokeDasharray: c,
    strokeDashoffset: c * (1 - p)
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center'
    }
  }, children));
}
function FuelScreen({
  app,
  st
}) {
  const SH = window.SH;
  const [date, setDate] = useState(st.curDate);
  const [adding, setAdding] = useState(null); // slot
  const [editing, setEditing] = useState(null); // entry id
  const [menu, setMenu] = useState(null);
  const [toast, setToast] = useState(null);
  const lastCur = useRef(st.curDate);
  useEffect(() => {
    if (lastCur.current !== st.curDate) {
      setDate(st.curDate);
      lastCur.current = st.curDate;
    }
  }, [st.curDate]);
  const isToday = date === st.curDate;
  const day = isToday ? {
    meals: st.meals || [],
    waterMl: st.waterMl || 0
  } : (st.diary || {})[date] || {
    meals: [],
    waterMl: 0
  };
  const tg = st.targets,
    goalW = st.waterGoal || 3500;
  const tot = sumN(day.meals),
    left = tg.kcal - tot.kcal;
  const flash = t => {
    setToast(t);
    clearTimeout(flash._t);
    flash._t = setTimeout(() => setToast(null), 1800);
  };
  const setDay = fn => app.setState(s => {
    if (date === s.curDate) {
      const d = fn({
          meals: s.meals || [],
          waterMl: s.waterMl || 0
        }),
        g = s.waterGoal || 3500,
        hit = d.waterMl >= g;
      return {
        meals: d.meals,
        waterMl: d.waterMl,
        done: {
          ...s.done,
          water: hit
        },
        doneAt: {
          ...s.doneAt,
          water: hit ? s.doneAt.water || SH.nowHM() : undefined
        }
      };
    }
    const d = fn((s.diary || {})[date] || {
      meals: [],
      waterMl: 0
    });
    let history = s.history;
    const n = Object.keys(history || {}).find(k => history[k].date === date);
    if (n) {
      const t = sumN(d.meals);
      history = {
        ...history,
        [n]: {
          ...history[n],
          kcal: Math.round(t.kcal),
          p: r1(t.p),
          meals: d.meals.length,
          waterMl: d.waterMl
        }
      };
    }
    return {
      diary: {
        ...(s.diary || {}),
        [date]: d
      },
      history
    };
  });
  const remember = nf => app.setState(s => ({
    recentFoods: [nf].concat((s.recentFoods || []).filter(x => x.key !== nf.key)).slice(0, 40)
  }));
  const addEntries = (entries, msg) => {
    setDay(d => ({
      ...d,
      meals: d.meals.concat(entries)
    }));
    entries.forEach(e => e.food && remember(e.food));
    if (msg) flash(msg);
  };
  const editEntry = (id, fn) => setDay(d => ({
    ...d,
    meals: d.meals.map(m => m.id === id ? fn(m) : m)
  }));
  const delEntry = id => setDay(d => ({
    ...d,
    meals: d.meals.filter(m => m.id !== id)
  }));
  const dayLabel = isToday ? 'Today' : date === addDaysIso(st.curDate, -1) ? 'Yesterday' : niceDate(date);
  const macro = (label, v, goal, tone) => /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      ...T.label,
      color: tone
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    style: {
      font: `700 17px/1.1 ${F.head}`,
      margin: '4px 0 6px'
    }
  }, r1(v), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: C.mute
    }
  }, " / ", goal, " g")), /*#__PURE__*/React.createElement(Bar, {
    pct: goal ? 100 * v / goal : 0,
    tone: tone,
    h: 5
  }));
  const glasses = Math.max(4, Math.round(goalW / 250)),
    filled = Math.floor(day.waterMl / 250);
  const setWater = ml => setDay(d => ({
    ...d,
    waterMl: Math.max(0, Math.min(goalW + 3000, ml))
  }));
  const editEntryObj = day.meals.find(m => m.id === editing);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: C.bg,
      fontFamily: F.body,
      color: C.text
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflow: 'auto'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '58px 22px 16px',
      borderBottom: '1px solid ' + C.line
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement(TopLink, {
    tone: C.amber,
    onClick: () => setDate(addDaysIso(date, -1))
  }, "\u2039 PREV"), /*#__PURE__*/React.createElement("div", {
    role: "button",
    onClick: () => setDate(st.curDate),
    style: {
      font: `700 20px/1 ${F.head}`,
      letterSpacing: '.12em',
      textTransform: 'uppercase',
      cursor: 'pointer'
    }
  }, dayLabel), /*#__PURE__*/React.createElement(TopLink, {
    tone: isToday ? C.faint : C.amber,
    onClick: () => !isToday && setDate(addDaysIso(date, 1))
  }, "NEXT \u203A")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      width: 76
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: `700 24px/1 ${F.head}`
    }
  }, Math.round(tot.kcal).toLocaleString()), /*#__PURE__*/React.createElement("div", {
    style: {
      ...T.label,
      marginTop: 4
    }
  }, "EATEN")), /*#__PURE__*/React.createElement(Ring, {
    pct: tg.kcal ? tot.kcal / tg.kcal : 0,
    tone: left < 0 ? C.red : C.amber
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: `800 38px/0.9 ${F.head}`,
      color: left < 0 ? C.red : C.text
    }
  }, Math.abs(Math.round(left)).toLocaleString()), /*#__PURE__*/React.createElement("div", {
    style: {
      ...T.label,
      marginTop: 5
    }
  }, left < 0 ? 'KCAL OVER' : 'KCAL LEFT')), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      width: 76
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: `700 24px/1 ${F.head}`
    }
  }, tg.kcal.toLocaleString()), /*#__PURE__*/React.createElement("div", {
    style: {
      ...T.label,
      marginTop: 4
    }
  }, "GOAL"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 14,
      marginTop: 16
    }
  }, macro('CARBS', tot.c, tg.c, C.amber), macro('PROTEIN', tot.p, tg.p, C.blue), macro('FAT', tot.f, tg.f, C.olive))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '14px 22px 8px',
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, SLOTS.map(([slot, label, share]) => {
    const items = day.meals.filter(m => (m.slot || 'SNACK') === slot),
      t = sumN(items),
      goal = Math.round(tg.kcal * share / 10) * 10;
    return /*#__PURE__*/React.createElement(Card, {
      key: slot,
      style: {
        padding: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '12px 12px 12px 14px'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        font: `700 18px/1.1 ${F.head}`,
        letterSpacing: '.08em',
        textTransform: 'uppercase'
      }
    }, label), /*#__PURE__*/React.createElement("div", {
      style: {
        ...T.label,
        marginTop: 4,
        color: t.kcal > goal * 1.15 ? C.red : C.mute
      }
    }, Math.round(t.kcal), " / ", goal, " KCAL", items.length ? ' · P ' + r1(t.p) + ' C ' + r1(t.c) + ' F ' + r1(t.f) : '')), /*#__PURE__*/React.createElement("span", {
      role: "button",
      onClick: () => setMenu({
        title: label,
        actions: [{
          label: 'Copy ' + label.toLowerCase() + ' from the day before',
          run: () => {
            const prev = ((addDaysIso(date, -1) === st.curDate ? {
              meals: st.meals
            } : (st.diary || {})[addDaysIso(date, -1)]) || {
              meals: []
            }).meals.filter(m => (m.slot || 'SNACK') === slot);
            if (!prev.length) {
              flash('NOTHING LOGGED THERE THE DAY BEFORE');
              return;
            }
            addEntries(prev.map(m => ({
              ...m,
              id: 'm' + uid(),
              time: SH.nowHM()
            })), 'COPIED ' + prev.length + ' ITEMS');
          }
        }, items.length ? {
          label: 'Save as a meal (one-tap next time)',
          run: () => {
            const name = prompt('Name this meal', 'My ' + label.toLowerCase());
            if (!name) return;
            app.setState(s => ({
              regulars: (s.regulars || []).concat({
                id: 'r' + uid(),
                name: name.trim(),
                slot,
                items: items.map(({
                  id,
                  time,
                  ...m
                }) => m)
              })
            }));
            flash('SAVED “' + name.toUpperCase() + '”');
          }
        } : null, items.length ? {
          label: 'Delete all ' + label.toLowerCase() + ' entries',
          danger: true,
          run: () => {
            if (confirm('Delete everything in ' + label + '?')) setDay(d => ({
              ...d,
              meals: d.meals.filter(m => (m.slot || 'SNACK') !== slot)
            }));
          }
        } : null]
      }),
      style: {
        ...T.mono,
        color: C.dim,
        padding: '8px 6px',
        cursor: 'pointer'
      }
    }, "\u2022\u2022\u2022"), /*#__PURE__*/React.createElement("div", {
      role: "button",
      onClick: () => setAdding(slot),
      style: {
        width: 40,
        height: 40,
        flex: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: C.amber,
        color: C.amberInk,
        font: `700 24px/1 ${F.mono}`,
        cursor: 'pointer'
      }
    }, "+")), items.map(m => /*#__PURE__*/React.createElement("div", {
      key: m.id,
      role: "button",
      onClick: () => setEditing(m.id),
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 14px',
        borderTop: '1px solid #1f2216',
        cursor: 'pointer'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        ...T.name,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
      }
    }, m.name), /*#__PURE__*/React.createElement("div", {
      style: {
        ...T.label,
        marginTop: 3,
        letterSpacing: '.06em'
      }
    }, [m.brand, amountText(m)].filter(Boolean).join(' · ').toUpperCase())), /*#__PURE__*/React.createElement("div", {
      style: {
        font: `700 17px/1 ${F.head}`,
        color: C.amber
      }
    }, Math.round(m.kcal)))));
  }), /*#__PURE__*/React.createElement(Card, {
    style: {
      padding: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'baseline'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: `700 18px/1 ${F.head}`,
      letterSpacing: '.08em',
      textTransform: 'uppercase'
    }
  }, "Water"), /*#__PURE__*/React.createElement("span", {
    style: {
      ...T.mono,
      color: C.blue
    }
  }, (day.waterMl / 1000).toFixed(2), " / ", (goalW / 1000).toFixed(2), " L")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 6,
      marginTop: 12
    }
  }, Array.from({
    length: glasses
  }, (_, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    role: "button",
    onClick: () => setWater(i < filled ? i * 250 : (i + 1) * 250),
    style: {
      width: 26,
      height: 34,
      boxSizing: 'border-box',
      border: '2px solid ' + (i < filled ? C.blue : C.line2),
      borderTop: '2px solid ' + (i < filled ? C.blue : '#2a2e1f'),
      background: i < filled ? 'linear-gradient(to top, ' + C.blue + ' 78%, transparent 78%)' : 'transparent',
      borderRadius: '0 0 5px 5px',
      cursor: 'pointer'
    }
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 7,
      marginTop: 12
    }
  }, /*#__PURE__*/React.createElement(Btn, {
    kind: "ghost",
    tone: C.text,
    onClick: () => setWater(day.waterMl - 250),
    style: {
      flex: 1,
      minHeight: 42
    }
  }, "\u2212250"), /*#__PURE__*/React.createElement(Btn, {
    kind: "ghost",
    tone: C.blue,
    onClick: () => setWater(day.waterMl + 250),
    style: {
      flex: 1,
      minHeight: 42
    }
  }, "+250"), /*#__PURE__*/React.createElement(Btn, {
    kind: "ghost",
    tone: C.blue,
    onClick: () => setWater(day.waterMl + 500),
    style: {
      flex: 1,
      minHeight: 42
    }
  }, "+500"))), /*#__PURE__*/React.createElement(TargetsCard, {
    app: app,
    st: st
  }))), adding ? /*#__PURE__*/React.createElement(AddFood, {
    app: app,
    st: st,
    slot: adding,
    setSlot: setAdding,
    dateLabel: dayLabel,
    onClose: () => setAdding(null),
    addEntries: addEntries,
    flash: flash
  }) : null, editEntryObj ? /*#__PURE__*/React.createElement(FoodDetail, {
    st: st,
    app: app,
    nf: normFood(editEntryObj),
    entry: editEntryObj,
    slot: editEntryObj.slot || 'SNACK',
    onClose: () => setEditing(null),
    onSave: (amount, unit, slot) => {
      editEntry(editEntryObj.id, m => {
        const nf = normFood(m),
          v = calcAmount(nf, amount, unit);
        return {
          ...m,
          food: nf,
          amount: Number(amount) || 0,
          unit,
          slot,
          g: v.g,
          kcal: v.kcal,
          p: v.p,
          c: v.c,
          f: v.f,
          per100: nf.per100,
          serv: undefined
        };
      });
      setEditing(null);
    },
    onDelete: () => {
      delEntry(editEntryObj.id);
      setEditing(null);
    }
  }) : null, menu ? /*#__PURE__*/React.createElement(ActionSheet, {
    title: menu.title,
    actions: menu.actions,
    onClose: () => setMenu(null)
  }) : null, toast ? ReactDOM.createPortal(/*#__PURE__*/React.createElement("div", {
    style: {
      position: 'fixed',
      left: 16,
      right: 16,
      bottom: 'calc(env(safe-area-inset-bottom, 0px) + 96px)',
      zIndex: 95,
      pointerEvents: 'none',
      background: C.amber,
      color: C.amberInk,
      padding: '12px 14px',
      ...T.mono,
      fontSize: 12,
      textAlign: 'center',
      boxShadow: '0 6px 20px rgba(0,0,0,.5)'
    }
  }, "\u2713 ", toast), document.body) : null);
}
function TargetsCard({
  app,
  st
}) {
  const [open, setOpen] = useState(false);
  const tg = st.targets;
  const bump = (k, d) => app.setState(s => ({
    targets: {
      ...s.targets,
      [k]: Math.max(0, s.targets[k] + d)
    },
    setup: {
      ...s.setup,
      targetsTouched: true
    }
  }));
  return /*#__PURE__*/React.createElement(Card, {
    style: {
      padding: 14,
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    role: "button",
    onClick: () => setOpen(!open),
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: `700 18px/1 ${F.head}`,
      letterSpacing: '.08em',
      textTransform: 'uppercase'
    }
  }, "Daily goals"), /*#__PURE__*/React.createElement("span", {
    style: {
      ...T.mono,
      fontSize: 11,
      color: C.amber
    }
  }, open ? 'DONE' : tg.kcal.toLocaleString() + ' KCAL · EDIT')), open ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 10
    }
  }, [['kcal', 'CALORIES', 50], ['p', 'PROTEIN · G', 5], ['c', 'CARBS · G', 5], ['f', 'FAT · G', 2]].map(([k, l, st2]) => /*#__PURE__*/React.createElement("div", {
    key: k,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '6px 0'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      ...T.label,
      flex: 1
    }
  }, l), /*#__PURE__*/React.createElement(Btn, {
    kind: "ghost",
    tone: C.text,
    onClick: () => bump(k, -st2),
    style: {
      minHeight: 38,
      padding: '0 14px'
    }
  }, "\u2212"), /*#__PURE__*/React.createElement("span", {
    style: {
      font: `700 20px/1 ${F.head}`,
      width: 64,
      textAlign: 'center'
    }
  }, tg[k].toLocaleString()), /*#__PURE__*/React.createElement(Btn, {
    kind: "ghost",
    tone: C.text,
    onClick: () => bump(k, st2),
    style: {
      minHeight: 38,
      padding: '0 14px'
    }
  }, "+"))), /*#__PURE__*/React.createElement("div", {
    style: {
      ...T.label,
      marginTop: 6,
      color: C.faint
    }
  }, "MEAL GOALS SPLIT 25 / 35 / 30 / 10 %")) : null);
}
function AddFood({
  app,
  st,
  slot,
  setSlot,
  dateLabel,
  onClose,
  addEntries,
  flash
}) {
  const [q, setQ] = useState(''),
    [tab, setTab] = useState('recent');
  const [detail, setDetail] = useState(null); // normalized food
  const [create, setCreate] = useState(null); // draft
  const [quick, setQuick] = useState(false);
  const [menu, setMenu] = useState(null);
  const [photo, setPhoto] = useState(null); // { status, url, b64, items, note }
  const fileRef = useRef(null);
  const db = useDbSearch(q);
  const SH = window.SH;
  const slotLabel = (SLOTS.find(s => s[0] === slot) || SLOTS[3])[1];
  const mine = (st.customFoods || []).map(f => ({
    ...f,
    src: 'MINE'
  }));
  const pools = {
    recent: st.recentFoods || [],
    favs: st.favFoods || [],
    mine
  };
  let rows;
  if (q.trim()) {
    const ql = q.trim().toLowerCase(),
      seen = new Set(),
      out = [];
    const push = f => {
      const nf = normFood(f);
      if (seen.has(nf.key)) return;
      seen.add(nf.key);
      out.push(nf);
    };
    [].concat(mine, st.favFoods || [], st.recentFoods || [], st.savedFoods || [], SH.FOODS).filter(f => (f.name + ' ' + (f.brand || '')).toLowerCase().includes(ql)).slice(0, 8).forEach(push);
    if (db && db.status === 'ok') db.foods.forEach(push);
    rows = out;
  } else rows = tab === 'meals' ? null : pools[tab].map(normFood);
  const quickAdd = nf => {
    addEntries([makeEntry(nf, 1, 'serv', slot)], nf.name.toUpperCase() + ' → ' + slotLabel.toUpperCase());
  };
  const scan = async () => {
    if (!window.Scanner) return;
    const code = await window.Scanner.open();
    if (!code) return;
    const own = (st.customFoods || []).find(f => f.upc === code);
    if (own) {
      setDetail(normFood({
        ...own,
        src: 'MINE'
      }));
      return;
    }
    flash('LOOKING UP ' + code + '…');
    try {
      const r = await fetch('/api/food-barcode?code=' + encodeURIComponent(code)),
        j = r.ok ? await r.json() : {};
      if (j.food) setDetail(normFood({
        name: j.food.name,
        brand: j.food.brand,
        serv: j.food.serv,
        g: j.food.g,
        per100: j.food.per100,
        src: j.food.source,
        upc: code
      }));else setCreate({
        name: '',
        brand: '',
        serv: '1 serving',
        g: '',
        kcal: '',
        p: '',
        c: '',
        f: '',
        upc: code,
        note: 'BARCODE ' + code + ' ISN’T IN THE DATABASES. ADD IT FROM THE LABEL ONCE AND IT SCANS NEXT TIME.'
      });
    } catch (e) {
      setCreate({
        name: '',
        brand: '',
        serv: '1 serving',
        g: '',
        kcal: '',
        p: '',
        c: '',
        f: '',
        upc: code,
        note: 'OFFLINE — ENTER IT FROM THE LABEL.'
      });
    }
  };
  const analyse = async (b64, url, hint) => {
    setPhoto({
      status: 'loading',
      url,
      b64,
      items: [],
      note: ''
    });
    try {
      const {
        ok,
        j
      } = await aiPost('/api/food-photo', {
        image: b64,
        media_type: 'image/jpeg',
        hint
      });
      if (!ok) {
        setPhoto({
          status: 'error',
          url,
          b64,
          items: [],
          note: j.message || 'Couldn’t analyse the photo.'
        });
        return;
      }
      setPhoto({
        status: 'ready',
        url,
        b64,
        note: j.note || '',
        items: (j.items || []).map(i => ({
          ...i,
          key: uid(),
          per100: i.grams ? {
            kcal: i.kcal * 100 / i.grams,
            p: i.p * 100 / i.grams,
            c: i.c * 100 / i.grams,
            f: i.f * 100 / i.grams
          } : null
        }))
      });
    } catch (e) {
      setPhoto({
        status: 'error',
        url,
        b64,
        items: [],
        note: navigator.onLine === false ? 'You’re offline — photo logging needs internet.' : 'Couldn’t reach the server.'
      });
    }
  };
  const onPhoto = async ev => {
    const file = ev.target.files && ev.target.files[0];
    ev.target.value = '';
    if (!file) return;
    try {
      const {
        b64,
        url
      } = await shrinkToJpeg(file);
      analyse(b64, url, '');
    } catch (e) {
      flash(String(e.message || e).toUpperCase());
    }
  };
  const row = nf => /*#__PURE__*/React.createElement("div", {
    key: nf.key,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '10px 0',
      borderBottom: '1px solid #1f2216'
    }
  }, /*#__PURE__*/React.createElement("div", {
    role: "button",
    onClick: () => setDetail(nf),
    style: {
      flex: 1,
      minWidth: 0,
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      ...T.name,
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, nf.name), /*#__PURE__*/React.createElement("div", {
    style: {
      ...T.label,
      marginTop: 3,
      letterSpacing: '.05em',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, [nf.src, nf.brand, nf.servLabel].filter(Boolean).join(' · ').toUpperCase())), /*#__PURE__*/React.createElement("div", {
    role: "button",
    onClick: () => setDetail(nf),
    style: {
      textAlign: 'right',
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: `700 17px/1 ${F.head}`,
      color: C.amber
    }
  }, Math.round(nf.perServ.kcal)), /*#__PURE__*/React.createElement("div", {
    style: {
      ...T.label,
      fontSize: 9
    }
  }, "KCAL")), /*#__PURE__*/React.createElement("div", {
    role: "button",
    onClick: () => quickAdd(nf),
    style: {
      width: 40,
      height: 40,
      flex: 'none',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: '1px solid ' + C.amber,
      color: C.amber,
      font: `600 20px/1 ${F.mono}`,
      cursor: 'pointer'
    }
  }, "+"));
  return /*#__PURE__*/React.createElement(Sheet, {
    z: 50,
    title: slotLabel + ' ▾',
    sub: dateLabel.toUpperCase(),
    left: /*#__PURE__*/React.createElement(TopLink, {
      tone: C.amber,
      onClick: onClose
    }, "\u2039 DONE"),
    right: /*#__PURE__*/React.createElement("span", null),
    onTitle: () => setMenu({
      title: 'Add to',
      actions: SLOTS.map(([v, l]) => ({
        label: l,
        run: () => setSlot(v)
      }))
    })
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '12px 16px 24px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(Field, {
    value: q,
    onChange: setQ,
    placeholder: "Search foods & brands",
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement(Btn, {
    tone: C.amber,
    ink: C.amberInk,
    onClick: scan,
    style: {
      minHeight: 44,
      padding: '0 12px',
      fontSize: 14
    }
  }, "\u25A5 Scan")), /*#__PURE__*/React.createElement(Btn, {
    kind: "ghost",
    tone: C.amber,
    onClick: () => fileRef.current && fileRef.current.click(),
    style: {
      marginTop: 8
    }
  }, "\uD83D\uDCF7 SNAP A PHOTO \xB7 AI ESTIMATES IT"), /*#__PURE__*/React.createElement("input", {
    ref: fileRef,
    type: "file",
    accept: "image/*",
    capture: "environment",
    onChange: onPhoto,
    style: {
      display: 'none'
    }
  }), !q.trim() ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12
    }
  }, /*#__PURE__*/React.createElement(Seg, {
    items: [['recent', 'RECENT'], ['favs', 'FAVOURITES'], ['mine', 'MY FOODS'], ['meals', 'MEALS']],
    value: tab,
    onChange: setTab,
    tone: C.amber,
    ink: C.amberInk
  })) : null, q.trim() ? /*#__PURE__*/React.createElement("div", {
    style: {
      ...T.label,
      margin: '12px 0 2px'
    }
  }, rows.length, " RESULTS", db && db.status === 'loading' ? ' · SEARCHING USDA…' : db && db.status === 'err' ? ' · ' + String(db.msg || 'DATABASE UNREACHABLE').toUpperCase().slice(0, 90) : db ? ' · INCL. USDA' : '') : null, rows ? rows.map(row) : null, rows && !rows.length ? /*#__PURE__*/React.createElement(Empty, null, q.trim() ? db && db.status === 'loading' ? 'SEARCHING…' : 'NO MATCHES · CREATE IT BELOW' : tab === 'recent' ? 'FOODS YOU LOG SHOW UP HERE' : tab === 'favs' ? 'TAP ♡ ON A FOOD TO KEEP IT HERE' : 'FOODS YOU CREATE SHOW UP HERE') : null, tab === 'meals' && !q.trim() ? /*#__PURE__*/React.createElement("div", null, (st.regulars || []).map(r => {
    const t = sumN(r.items);
    return /*#__PURE__*/React.createElement("div", {
      key: r.id,
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '11px 0',
        borderBottom: '1px solid #1f2216'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: T.name
    }, r.name), /*#__PURE__*/React.createElement("div", {
      style: {
        ...T.label,
        marginTop: 3
      }
    }, r.items.length, " ITEMS \xB7 ", r.items.map(i => i.name).join(', ').slice(0, 60).toUpperCase())), /*#__PURE__*/React.createElement("div", {
      style: {
        font: `700 17px/1 ${F.head}`,
        color: C.amber
      }
    }, Math.round(t.kcal)), /*#__PURE__*/React.createElement("div", {
      role: "button",
      onClick: () => addEntries(r.items.map(m => ({
        ...m,
        id: 'm' + uid(),
        time: SH.nowHM(),
        slot
      })), r.name.toUpperCase() + ' → ' + slotLabel.toUpperCase()),
      style: {
        width: 40,
        height: 40,
        flex: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '1px solid ' + C.amber,
        color: C.amber,
        font: `600 20px/1 ${F.mono}`,
        cursor: 'pointer'
      }
    }, "+"), /*#__PURE__*/React.createElement("span", {
      role: "button",
      onClick: () => {
        if (confirm('Delete the saved meal “' + r.name + '”?')) app.setState(s => ({
          regulars: s.regulars.filter(x => x.id !== r.id)
        }));
      },
      style: {
        ...T.mono,
        fontSize: 14,
        color: C.faint,
        padding: 6,
        cursor: 'pointer'
      }
    }, "\u2715"));
  }), !(st.regulars || []).length ? /*#__PURE__*/React.createElement(Empty, null, "LOG A MEAL, THEN USE \u2022\u2022\u2022 \u2192 \u201CSAVE AS A MEAL\u201D ON ITS SECTION") : null) : null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      marginTop: 16
    }
  }, /*#__PURE__*/React.createElement(Btn, {
    kind: "ghost",
    tone: C.amber,
    onClick: () => setCreate({
      name: q.trim(),
      brand: '',
      serv: '1 serving',
      g: '',
      kcal: '',
      p: '',
      c: '',
      f: '',
      upc: ''
    }),
    style: {
      flex: 1
    }
  }, "+ CREATE FOOD"), /*#__PURE__*/React.createElement(Btn, {
    kind: "ghost",
    tone: C.amber,
    onClick: () => setQuick(true),
    style: {
      flex: 1
    }
  }, "\u26A1 QUICK ADD"))), detail ? /*#__PURE__*/React.createElement(FoodDetail, {
    st: st,
    app: app,
    nf: detail,
    slot: slot,
    onClose: () => setDetail(null),
    onSave: (amount, unit, sl) => {
      addEntries([makeEntry(detail, amount, unit, sl)], detail.name.toUpperCase() + ' → ' + (SLOTS.find(s => s[0] === sl) || SLOTS[3])[1].toUpperCase());
      setDetail(null);
    }
  }) : null, create ? /*#__PURE__*/React.createElement(CreateFood, {
    app: app,
    draft: create,
    setDraft: setCreate,
    onClose: () => setCreate(null),
    onSaved: nf => {
      setCreate(null);
      setQ('');
      setDetail(nf);
    }
  }) : null, photo ? /*#__PURE__*/React.createElement(PhotoReview, {
    photo: photo,
    setPhoto: setPhoto,
    slot: slot,
    st: st,
    onClose: () => setPhoto(null),
    onRecheck: hint => analyse(photo.b64, photo.url, hint),
    onAdd: (items, sl) => {
      addEntries(items.map(i => makeEntry(normFood({
        name: i.name.trim() || 'Food',
        serv: i.amount || (i.grams ? i.grams + ' g' : '1 serving'),
        g: i.grams || null,
        kcal: i.kcal,
        p: i.p,
        c: i.c,
        f: i.f,
        src: 'PHOTO'
      }), 1, 'serv', sl)), items.length + (items.length === 1 ? ' ITEM' : ' ITEMS') + ' → ' + (SLOTS.find(s => s[0] === sl) || SLOTS[3])[1].toUpperCase());
      setPhoto(null);
    }
  }) : null, quick ? /*#__PURE__*/React.createElement(QuickAdd, {
    onClose: () => setQuick(false),
    onSave: v => {
      addEntries([{
        id: 'm' + uid(),
        time: SH.nowHM(),
        slot,
        name: v.name || 'Quick add',
        amount: 1,
        unit: 'quick',
        serv: 'quick add',
        kcal: v.kcal,
        p: v.p,
        c: v.c,
        f: v.f
      }], 'QUICK ADD → ' + slotLabel.toUpperCase());
      setQuick(false);
    }
  }) : null, menu ? /*#__PURE__*/React.createElement(ActionSheet, {
    title: menu.title,
    actions: menu.actions,
    onClose: () => setMenu(null)
  }) : null);
}
function FoodDetail({
  st,
  app,
  nf,
  entry,
  slot: slot0,
  onClose,
  onSave,
  onDelete
}) {
  const units = [['serv', nf.servLabel]].concat(nf.per100 ? [['g', 'g'], ['oz', 'oz']] : []);
  const [unit, setUnit] = useState(entry && entry.unit && units.some(u => u[0] === entry.unit) ? entry.unit : 'serv');
  const [amt, setAmt] = useState(entry && entry.unit !== 'quick' ? String(entry.amount != null ? entry.amount : 1) : '1');
  const [slot, setSlot] = useState(slot0);
  const quickEntry = entry && entry.unit === 'quick';
  const v = quickEntry ? {
    kcal: entry.kcal,
    p: entry.p,
    c: entry.c,
    f: entry.f,
    g: null
  } : calcAmount(nf, num(amt) || 0, unit);
  const tg = st.targets;
  const fav = (st.favFoods || []).some(f => f.key === nf.key);
  const toggleFav = () => app.setState(s => ({
    favFoods: fav ? (s.favFoods || []).filter(f => f.key !== nf.key) : [nf].concat(s.favFoods || [])
  }));
  const switchUnit = u => {
    if (u === unit) return;
    const cur = num(amt) || 0,
      g = unit === 'g' ? cur : unit === 'oz' ? cur * 28.3495 : cur * (nf.servG || 100);
    setAmt(String(u === 'g' ? Math.round(g) : u === 'oz' ? r1(g / 28.3495) : r2(g / (nf.servG || 100))));
    setUnit(u);
  };
  const tile = (l, val, goal, tone) => /*#__PURE__*/React.createElement(Card, {
    style: {
      padding: '10px 10px',
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      ...T.label,
      color: tone
    }
  }, l), /*#__PURE__*/React.createElement("div", {
    style: {
      font: `700 22px/1.1 ${F.head}`,
      marginTop: 3
    }
  }, r1(val), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: C.mute
    }
  }, " g")), /*#__PURE__*/React.createElement("div", {
    style: {
      ...T.label,
      marginTop: 2
    }
  }, goal ? Math.round(100 * val / goal) : 0, "% OF GOAL"));
  return /*#__PURE__*/React.createElement(Sheet, {
    z: 65,
    title: nf.name,
    sub: [nf.src, nf.brand].filter(Boolean).join(' · ').toUpperCase(),
    left: /*#__PURE__*/React.createElement(TopLink, {
      tone: C.amber,
      onClick: onClose
    }, "\u2039 BACK"),
    right: /*#__PURE__*/React.createElement("span", {
      role: "button",
      onClick: toggleFav,
      style: {
        font: `400 24px/1 ${F.body}`,
        color: fav ? C.red : C.dim,
        cursor: 'pointer',
        padding: '4px 6px'
      }
    }, fav ? '♥' : '♡'),
    footer: /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 8
      }
    }, onDelete ? /*#__PURE__*/React.createElement(Btn, {
      kind: "danger",
      onClick: () => {
        if (confirm('Remove this entry?')) onDelete();
      },
      style: {
        flex: 1
      }
    }, "DELETE") : null, /*#__PURE__*/React.createElement(Btn, {
      tone: C.amber,
      ink: C.amberInk,
      onClick: () => onSave(quickEntry ? 1 : num(amt) || 0, quickEntry ? 'quick' : unit, slot),
      style: {
        flex: 2
      }
    }, entry ? 'Save' : 'Add to ' + (SLOTS.find(s => s[0] === slot) || SLOTS[3])[1]))
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '18px 18px 26px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: `800 56px/0.9 ${F.head}`,
      color: C.amber
    }
  }, Math.round(v.kcal)), /*#__PURE__*/React.createElement("div", {
    style: {
      ...T.label,
      marginTop: 6
    }
  }, "KCAL \xB7 ", tg.kcal ? Math.round(100 * v.kcal / tg.kcal) : 0, "% OF DAILY GOAL", v.g ? ' · ' + r1(v.g) + ' G' : '')), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 7,
      marginTop: 16
    }
  }, tile('CARBS', v.c, tg.c, C.amber), tile('PROTEIN', v.p, tg.p, C.blue), tile('FAT', v.f, tg.f, C.olive)), !quickEntry ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      ...T.label,
      margin: '20px 0 6px'
    }
  }, "AMOUNT"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      alignItems: 'stretch'
    }
  }, /*#__PURE__*/React.createElement(Btn, {
    kind: "ghost",
    tone: C.text,
    onClick: () => setAmt(String(Math.max(0, r2((num(amt) || 0) - (unit === 'serv' ? 0.5 : unit === 'g' ? 10 : 1))))),
    style: {
      minHeight: 48,
      padding: '0 16px'
    }
  }, "\u2212"), /*#__PURE__*/React.createElement("input", {
    inputMode: "decimal",
    value: amt,
    onChange: e => setAmt(e.target.value),
    style: {
      flex: 1,
      minWidth: 0,
      boxSizing: 'border-box',
      background: C.card,
      border: '1px solid ' + C.line2,
      color: C.text,
      textAlign: 'center',
      font: `700 24px/1 ${F.head}`,
      outline: 'none'
    }
  }), /*#__PURE__*/React.createElement(Btn, {
    kind: "ghost",
    tone: C.text,
    onClick: () => setAmt(String(r2((num(amt) || 0) + (unit === 'serv' ? 0.5 : unit === 'g' ? 10 : 1)))),
    style: {
      minHeight: 48,
      padding: '0 16px'
    }
  }, "+")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6,
      flexWrap: 'wrap',
      marginTop: 8
    }
  }, units.map(([u, l]) => /*#__PURE__*/React.createElement(Chip, {
    key: u,
    on: unit === u,
    tone: C.amber,
    ink: C.amberInk,
    onClick: () => switchUnit(u)
  }, u === 'serv' ? l.toUpperCase() : l.toUpperCase()))), nf.per100 ? /*#__PURE__*/React.createElement("div", {
    style: {
      ...T.label,
      marginTop: 10,
      color: C.faint
    }
  }, "PER 100 G \xB7 ", Math.round(nf.per100.kcal), " KCAL \xB7 P ", r1(nf.per100.p), " \xB7 C ", r1(nf.per100.c), " \xB7 F ", r1(nf.per100.f)) : /*#__PURE__*/React.createElement("div", {
    style: {
      ...T.label,
      marginTop: 10,
      color: C.faint
    }
  }, "VALUES PER SERVING")) : null, /*#__PURE__*/React.createElement("div", {
    style: {
      ...T.label,
      margin: '20px 0 6px'
    }
  }, "MEAL"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6
    }
  }, SLOTS.map(([v2, l]) => /*#__PURE__*/React.createElement(Chip, {
    key: v2,
    on: slot === v2,
    tone: C.amber,
    ink: C.amberInk,
    onClick: () => setSlot(v2),
    style: {
      flex: 1,
      textAlign: 'center',
      padding: '10px 2px'
    }
  }, l.toUpperCase())))));
}
function CreateFood({
  app,
  draft,
  setDraft,
  onClose,
  onSaved
}) {
  const set = k => v => setDraft({
    ...draft,
    [k]: v
  });
  const p = num(draft.p) || 0,
    c = num(draft.c) || 0,
    f = num(draft.f) || 0;
  const kcal = num(draft.kcal) != null ? num(draft.kcal) : Math.round(p * 4 + c * 4 + f * 9);
  const save = () => {
    const name = (draft.name || '').trim();
    if (!name) {
      setDraft({
        ...draft,
        note: 'GIVE IT A NAME FIRST'
      });
      return;
    }
    const g = num(draft.g),
      serv = (draft.serv || '1 serving').trim();
    const food = {
      id: 'c' + uid(),
      name,
      brand: (draft.brand || '').trim(),
      serv: g ? serv + ' (' + g + ' g)' : serv,
      kcal: Math.round(kcal),
      p: r1(p),
      c: r1(c),
      f: r1(f),
      mine: true
    };
    if (draft.upc) food.upc = draft.upc;
    if (g) {
      food.g = g;
      food.per100 = {
        kcal: r2(kcal * 100 / g),
        p: r2(p * 100 / g),
        c: r2(c * 100 / g),
        f: r2(f * 100 / g)
      };
    }
    app.setState(s => ({
      customFoods: [food].concat((s.customFoods || []).filter(x => x.name.toLowerCase() !== name.toLowerCase())).slice(0, 300)
    }));
    onSaved(normFood({
      ...food,
      src: 'MINE'
    }));
  };
  return /*#__PURE__*/React.createElement(Sheet, {
    z: 70,
    title: "Create food",
    left: /*#__PURE__*/React.createElement(TopLink, {
      tone: C.amber,
      onClick: onClose
    }, "\u2039 BACK"),
    footer: /*#__PURE__*/React.createElement(Btn, {
      tone: C.amber,
      ink: C.amberInk,
      onClick: save
    }, "Save food")
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '14px 18px 26px',
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, draft.note ? /*#__PURE__*/React.createElement("div", {
    style: {
      ...T.mono,
      fontSize: 11,
      lineHeight: 1.5,
      color: C.amber
    }
  }, draft.note) : null, /*#__PURE__*/React.createElement(Field, {
    label: "NAME",
    value: draft.name,
    onChange: set('name'),
    placeholder: "e.g. Protein bar, chocolate",
    autoFocus: !draft.name
  }), /*#__PURE__*/React.createElement(Field, {
    label: "BRAND \xB7 OPTIONAL",
    value: draft.brand,
    onChange: set('brand'),
    placeholder: "e.g. Kirkland"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '3fr 2fr',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(Field, {
    label: "SERVING",
    value: draft.serv,
    onChange: set('serv'),
    placeholder: "1 bar"
  }), /*#__PURE__*/React.createElement(Field, {
    label: "GRAMS PER SERVING",
    value: draft.g,
    onChange: set('g'),
    placeholder: "60",
    inputMode: "decimal"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      ...T.label
    }
  }, "NUTRITION PER SERVING (FROM THE LABEL)"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4,1fr)',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement(Field, {
    label: "KCAL",
    value: draft.kcal,
    onChange: set('kcal'),
    placeholder: String(Math.round(p * 4 + c * 4 + f * 9)),
    inputMode: "decimal"
  }), /*#__PURE__*/React.createElement(Field, {
    label: "PROT",
    value: draft.p,
    onChange: set('p'),
    placeholder: "g",
    inputMode: "decimal"
  }), /*#__PURE__*/React.createElement(Field, {
    label: "CARB",
    value: draft.c,
    onChange: set('c'),
    placeholder: "g",
    inputMode: "decimal"
  }), /*#__PURE__*/React.createElement(Field, {
    label: "FAT",
    value: draft.f,
    onChange: set('f'),
    placeholder: "g",
    inputMode: "decimal"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      ...T.label,
      color: C.faint,
      lineHeight: 1.5
    }
  }, "LEAVE KCAL EMPTY TO CALCULATE IT (4/4/9). ADD GRAMS TO LOG ANY AMOUNT IN G OR OZ LATER.", draft.upc ? ' BARCODE ' + draft.upc + ' WILL SCAN TO THIS FOOD.' : '')));
}
function QuickAdd({
  onClose,
  onSave
}) {
  const [d, setD] = useState({
    name: '',
    kcal: '',
    p: '',
    c: '',
    f: ''
  });
  const set = k => v => setD({
    ...d,
    [k]: v
  });
  const p = num(d.p) || 0,
    c = num(d.c) || 0,
    f = num(d.f) || 0,
    kcal = num(d.kcal) != null ? num(d.kcal) : Math.round(p * 4 + c * 4 + f * 9);
  return /*#__PURE__*/React.createElement(Sheet, {
    z: 70,
    title: "Quick add",
    left: /*#__PURE__*/React.createElement(TopLink, {
      tone: C.amber,
      onClick: onClose
    }, "\u2039 BACK"),
    footer: /*#__PURE__*/React.createElement(Btn, {
      tone: C.amber,
      ink: C.amberInk,
      disabled: !kcal,
      onClick: () => onSave({
        name: d.name.trim(),
        kcal: Math.round(kcal),
        p: r1(p),
        c: r1(c),
        f: r1(f)
      })
    }, "Add ", Math.round(kcal) || '', " kcal")
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '14px 18px',
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(Field, {
    label: "LABEL \xB7 OPTIONAL",
    value: d.name,
    onChange: set('name'),
    placeholder: "e.g. Restaurant dinner"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4,1fr)',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement(Field, {
    label: "KCAL",
    value: d.kcal,
    onChange: set('kcal'),
    inputMode: "decimal",
    autoFocus: true
  }), /*#__PURE__*/React.createElement(Field, {
    label: "PROT",
    value: d.p,
    onChange: set('p'),
    placeholder: "g",
    inputMode: "decimal"
  }), /*#__PURE__*/React.createElement(Field, {
    label: "CARB",
    value: d.c,
    onChange: set('c'),
    placeholder: "g",
    inputMode: "decimal"
  }), /*#__PURE__*/React.createElement(Field, {
    label: "FAT",
    value: d.f,
    onChange: set('f'),
    placeholder: "g",
    inputMode: "decimal"
  }))));
}
window.TrainScreen = TrainScreen;
window.FuelScreen = FuelScreen;
function PhotoReview({
  photo,
  setPhoto,
  slot: slot0,
  st,
  onClose,
  onRecheck,
  onAdd
}) {
  const [slot, setSlot] = useState(slot0);
  const [hint, setHint] = useState('');
  const items = photo.items || [];
  const upd = (key, fn) => setPhoto(p => ({
    ...p,
    items: p.items.map(i => i.key === key ? fn(i) : i)
  }));
  const setGrams = (i, v) => upd(i.key, x => {
    const g = num(v);
    if (g == null) return {
      ...x,
      grams: ''
    };
    if (!x.per100) return {
      ...x,
      grams: g
    };
    return {
      ...x,
      grams: g,
      kcal: Math.round(x.per100.kcal * g / 100),
      p: r1(x.per100.p * g / 100),
      c: r1(x.per100.c * g / 100),
      f: r1(x.per100.f * g / 100)
    };
  });
  const setVal = (i, k, v) => upd(i.key, x => {
    const n2 = num(v);
    const nx = {
      ...x,
      [k]: n2 == null ? '' : n2
    };
    if (nx.grams) nx.per100 = {
      kcal: (Number(nx.kcal) || 0) * 100 / nx.grams,
      p: (Number(nx.p) || 0) * 100 / nx.grams,
      c: (Number(nx.c) || 0) * 100 / nx.grams,
      f: (Number(nx.f) || 0) * 100 / nx.grams
    };
    return nx;
  });
  const tot = sumN(items.map(i => ({
    kcal: Number(i.kcal) || 0,
    p: Number(i.p) || 0,
    c: Number(i.c) || 0,
    f: Number(i.f) || 0
  })));
  const cell = {
    width: '100%',
    boxSizing: 'border-box',
    background: '#23271a',
    border: 'none',
    color: C.text,
    textAlign: 'center',
    font: `600 15px/1 ${F.body}`,
    padding: '9px 2px',
    outline: 'none',
    borderRadius: 0,
    minWidth: 0
  };
  const loading = photo.status === 'loading';
  return /*#__PURE__*/React.createElement(Sheet, {
    z: 68,
    title: "Photo log",
    sub: loading ? 'ANALYSING…' : photo.status === 'error' ? 'COULDN’T ANALYSE' : items.length + ' ITEMS · CHECK AND EDIT',
    left: /*#__PURE__*/React.createElement(TopLink, {
      tone: C.amber,
      onClick: onClose
    }, "\u2039 BACK"),
    footer: /*#__PURE__*/React.createElement(Btn, {
      tone: C.amber,
      ink: C.amberInk,
      disabled: loading || !items.length,
      onClick: () => onAdd(items.filter(i => (i.name || '').trim()).map(i => ({
        ...i,
        kcal: Number(i.kcal) || 0,
        p: Number(i.p) || 0,
        c: Number(i.c) || 0,
        f: Number(i.f) || 0,
        grams: Number(i.grams) || null
      })), slot)
    }, loading ? 'Analysing…' : 'Add ' + items.length + (items.length === 1 ? ' item' : ' items') + ' · ' + Math.round(tot.kcal) + ' kcal')
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '14px 16px 26px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 12,
      alignItems: 'flex-start'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: photo.url,
    style: {
      width: 96,
      height: 96,
      objectFit: 'cover',
      flex: 'none',
      border: '1px solid ' + C.line2
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, loading ? /*#__PURE__*/React.createElement("div", {
    style: {
      ...T.mono,
      fontSize: 12,
      color: C.amber,
      lineHeight: 1.6
    }
  }, "LOOKING AT YOUR PLATE\u2026") : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      font: `800 34px/0.95 ${F.head}`,
      color: C.amber
    }
  }, Math.round(tot.kcal), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      color: C.mute
    }
  }, " KCAL")), /*#__PURE__*/React.createElement("div", {
    style: {
      ...T.label,
      marginTop: 5
    }
  }, "P ", r1(tot.p), " \xB7 C ", r1(tot.c), " \xB7 F ", r1(tot.f), " G")), photo.note ? /*#__PURE__*/React.createElement("div", {
    style: {
      font: `400 13px/1.4 ${F.body}`,
      color: photo.status === 'error' ? '#e0a89a' : C.dim,
      marginTop: 6
    }
  }, photo.note) : null)), items.map(i => /*#__PURE__*/React.createElement(Card, {
    key: i.key,
    style: {
      marginTop: 10,
      padding: 11
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("input", {
    value: i.name,
    onChange: e => {
      const v = e.target.value;
      upd(i.key, x => ({
        ...x,
        name: v
      }));
    },
    style: {
      ...cell,
      textAlign: 'left',
      flex: 1,
      padding: '9px 8px',
      font: `600 15px/1.2 ${F.body}`
    }
  }), i.confidence === 'low' ? /*#__PURE__*/React.createElement("span", {
    style: {
      ...T.label,
      color: C.amber
    }
  }, "UNSURE") : null, /*#__PURE__*/React.createElement("span", {
    role: "button",
    onClick: () => setPhoto(p => ({
      ...p,
      items: p.items.filter(x => x.key !== i.key)
    })),
    style: {
      ...T.mono,
      fontSize: 14,
      color: C.faint,
      padding: '6px 4px',
      cursor: 'pointer'
    }
  }, "\u2715")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1.4fr 1fr 1fr 1fr 1fr 1fr',
      gap: 5,
      marginTop: 7
    }
  }, [['AMOUNT', 'amount'], ['G', 'grams'], ['KCAL', 'kcal'], ['P', 'p'], ['C', 'c'], ['F', 'f']].map(([l, k]) => /*#__PURE__*/React.createElement("div", {
    key: k,
    style: {
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      ...T.label,
      fontSize: 9,
      textAlign: 'center',
      marginBottom: 3
    }
  }, l), k === 'amount' ? /*#__PURE__*/React.createElement("input", {
    value: i.amount || '',
    placeholder: "1 plate",
    onChange: e => {
      const v = e.target.value;
      upd(i.key, x => ({
        ...x,
        amount: v
      }));
    },
    style: {
      ...cell,
      fontSize: 13
    }
  }) : /*#__PURE__*/React.createElement("input", {
    inputMode: "decimal",
    value: i[k] == null ? '' : i[k],
    onChange: e => k === 'grams' ? setGrams(i, e.target.value) : setVal(i, k, e.target.value),
    style: cell
  })))))), !loading ? /*#__PURE__*/React.createElement(Btn, {
    kind: "ghost",
    tone: C.amber,
    onClick: () => setPhoto(p => ({
      ...p,
      items: p.items.concat({
        key: uid(),
        name: '',
        amount: '',
        grams: '',
        kcal: '',
        p: '',
        c: '',
        f: '',
        per100: null
      })
    })),
    style: {
      marginTop: 10
    }
  }, "+ ADD AN ITEM") : null, /*#__PURE__*/React.createElement("div", {
    style: {
      ...T.label,
      margin: '14px 0 5px'
    }
  }, "CHANGING GRAMS RESCALES THAT ITEM\u2019S NUMBERS"), /*#__PURE__*/React.createElement("div", {
    style: {
      ...T.label,
      margin: '14px 0 6px'
    }
  }, "MEAL"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6
    }
  }, SLOTS.map(([v2, l]) => /*#__PURE__*/React.createElement(Chip, {
    key: v2,
    on: slot === v2,
    tone: C.amber,
    ink: C.amberInk,
    onClick: () => setSlot(v2),
    style: {
      flex: 1,
      textAlign: 'center',
      padding: '10px 2px'
    }
  }, l.toUpperCase()))), !loading ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 16
    }
  }, /*#__PURE__*/React.createElement(Field, {
    label: "MISSED SOMETHING? TELL IT AND RE-CHECK",
    value: hint,
    onChange: setHint,
    placeholder: "e.g. cooked in 1 tbsp butter, rice is ~200 g"
  }), /*#__PURE__*/React.createElement(Btn, {
    kind: "ghost",
    tone: C.amber,
    disabled: !hint.trim(),
    onClick: () => onRecheck(hint.trim()),
    style: {
      marginTop: 8
    }
  }, "RE-CHECK PHOTO")) : null));
}

// ── COACH: chat with Claude about your food, training and habits; it can log and adjust things ──
const DEF_REM = {
  on: true,
  t: 1200,
  days: [1, 1, 1, 1, 1, 1, 1]
};
const hhmmToMin = s => {
  const m = String(s || '').match(/^(\d{1,2}):(\d{2})$/);
  return m ? parseInt(m[1], 10) % 24 * 60 + parseInt(m[2], 10) % 60 : null;
};
const minToHhmm = t => pad2(Math.floor(t / 60) % 24) + ':' + pad2(t % 60);

// A compact picture of the user's data for Claude.
function coachContext(app, st) {
  const SH = window.SH,
    today = st.curDate,
    dn = app.dayNum();
  const rules = (st.ruleDefs || []).filter(r => r.on);
  const rname = r => (app.hLabel ? app.hLabel(r).name : r.name) || r.name;
  const tot = list => sumN(list || []);
  const days = [];
  for (let i = 13; i >= 1; i--) {
    const d = addDaysIso(today, -i),
      diary = (st.diary || {})[d];
    const h = Object.values(st.history || {}).find(x => x.date === d);
    if (!diary && !h) continue;
    const t = diary ? tot(diary.meals) : {
      kcal: h.kcal || 0,
      p: h.p || 0,
      c: 0,
      f: 0
    };
    days.push({
      date: d,
      kcal: Math.round(t.kcal),
      protein_g: r1(t.p),
      carbs_g: r1(t.c),
      fat_g: r1(t.f),
      items_logged: diary ? diary.meals.length : h.meals || 0,
      water_l: r1(((diary ? diary.waterMl : h.waterMl) || 0) / 1000),
      missed_rules: h ? (h.rules || []).filter(k => !(h.done || {})[k]).map(k => {
        const r = (st.ruleDefs || []).find(x => x.k === k);
        return r ? rname(r) : k;
      }) : undefined,
      workouts: (st.workouts || []).filter(w => w.date === d).map(w => w.name)
    });
  }
  const wlog = (st.measLog || {}).weight || {};
  const weight = (st.meas || []).find(m => m.k === 'weight');
  const weightLog = [{
    day: 1,
    kg: weight ? weight.start : null
  }].concat(Object.keys(wlog).map(Number).sort((a, b) => a - b).map(n => ({
    day: n,
    kg: wlog[n]
  })));
  const food = f => {
    const nf = normFood(f);
    return {
      name: nf.name,
      brand: nf.brand || undefined,
      serving: nf.servLabel,
      grams_per_serving: nf.servG || undefined,
      kcal: Math.round(nf.perServ.kcal),
      protein_g: r1(nf.perServ.p),
      carbs_g: r1(nf.perServ.c),
      fat_g: r1(nf.perServ.f)
    };
  };
  const t0 = tot(st.meals);
  return {
    now: niceDate(today) + ' ' + SH.nowHM(),
    challenge: {
      day: dn,
      of: 70,
      start_date: st.startDate
    },
    profile: st.setup ? {
      name: st.setup.name,
      sex: st.setup.sex,
      age: st.setup.age,
      height_cm: st.setup.height,
      start_weight_kg: st.setup.weight,
      goal: st.setup.goal,
      units: st.imperial ? 'imperial' : 'metric'
    } : undefined,
    targets: {
      kcal: st.targets.kcal,
      protein_g: st.targets.p,
      carbs_g: st.targets.c,
      fat_g: st.targets.f,
      water_ml: st.waterGoal
    },
    today: {
      eaten: {
        kcal: Math.round(t0.kcal),
        protein_g: r1(t0.p),
        carbs_g: r1(t0.c),
        fat_g: r1(t0.f)
      },
      water_ml: st.waterMl,
      meals: (st.meals || []).map(m => ({
        slot: m.slot,
        time: m.time,
        name: m.name,
        kcal: Math.round(m.kcal),
        protein_g: m.p
      })),
      rules: rules.map(r => ({
        key: r.k,
        name: rname(r),
        done: !!(st.done || {})[r.k],
        reminder: (st.rem || {})[r.k] ? st.rem[r.k].on ? minToHhmm(st.rem[r.k].t) : 'off' : undefined
      }))
    },
    previous_days: days,
    weight_log_kg: weightLog.filter(x => x.kg != null),
    measurements: (st.meas || []).filter(m => m.k !== 'weight').map(m => ({
      site: m.name,
      unit: m.u,
      day1: m.start,
      now: m.cur
    })),
    saved_meals: (st.regulars || []).map(r => {
      const t = tot(r.items);
      return {
        name: r.name,
        slot: r.slot,
        kcal: Math.round(t.kcal),
        protein_g: r1(t.p),
        items: r.items.map(i => i.name)
      };
    }),
    my_foods: (st.customFoods || []).slice(0, 30).map(food),
    recent_foods: (st.recentFoods || []).slice(0, 20).map(food),
    training: {
      templates: (st.templates || []).map(t => ({
        name: t.name,
        day: t.day != null ? SH.PLAN[t.day].abbr : 'any',
        exercises: t.exercises.map(e => exById(st, e.exId).name)
      })),
      recent_workouts: (st.workouts || []).slice(-8).map(w => ({
        date: w.date,
        name: w.name,
        minutes: Math.round((w.end - w.start) / 60000),
        volume_kg: w.volume,
        exercises: w.exercises.map(e => e.name + ' ' + e.sets.map(s => setText({
          imperial: false
        }, e.type, s)).join(', '))
      }))
    }
  };
}

// Carry out Claude's requested actions. Returns human-readable lines.
function runCoachActions(app, actions) {
  const SH = window.SH,
    lines = [];
  const st = app.state,
    today = st.curDate;
  const dateOf = d => d === 'yesterday' ? addDaysIso(today, -1) : today;
  const addMeals = (date, entries) => app.setState(s => {
    if (date === s.curDate) return {
      meals: (s.meals || []).concat(entries)
    };
    const d = (s.diary || {})[date] || {
        meals: [],
        waterMl: 0
      },
      nd = {
        ...d,
        meals: d.meals.concat(entries)
      };
    let history = s.history;
    const n = Object.keys(history || {}).find(k => history[k].date === date);
    if (n) {
      const t = sumN(nd.meals);
      history = {
        ...history,
        [n]: {
          ...history[n],
          kcal: Math.round(t.kcal),
          p: r1(t.p),
          meals: nd.meals.length
        }
      };
    }
    return {
      diary: {
        ...(s.diary || {}),
        [date]: nd
      },
      history
    };
  });
  const slotName = s => (SLOTS.find(x => x[0] === s) || SLOTS[3])[1];
  const guessSlot = () => {
    const h = new Date().getHours();
    return h < 11 ? 'BREAKFAST' : h < 15 ? 'LUNCH' : h < 21 ? 'DINNER' : 'SNACK';
  };
  const findRule = key => (app.state.ruleDefs || []).find(r => r.on && (r.k === key || (r.name || '').toLowerCase() === String(key).toLowerCase()));
  for (const a of actions || []) {
    const x = a.input || {};
    try {
      if (a.name === 'log_saved_meal') {
        const q = String(x.meal_name || '').toLowerCase().trim();
        const r = (st.regulars || []).find(m => m.name.toLowerCase() === q) || (st.regulars || []).find(m => m.name.toLowerCase().includes(q) || q.includes(m.name.toLowerCase()));
        if (!r) {
          lines.push('Couldn’t find a saved meal called “' + x.meal_name + '”');
          continue;
        }
        const slot = x.slot || r.slot || guessSlot(),
          date = dateOf(x.day);
        addMeals(date, r.items.map(m => ({
          ...m,
          id: 'm' + uid(),
          time: SH.nowHM(),
          slot
        })));
        lines.push('Logged ' + r.name + ' → ' + slotName(slot) + (date !== today ? ' (yesterday)' : '') + ' · ' + Math.round(sumN(r.items).kcal) + ' kcal');
      } else if (a.name === 'log_foods') {
        const date = dateOf(x.day),
          items = (x.items || []).slice(0, 20);
        const entries = items.map(i => ({
          id: 'm' + uid(),
          time: SH.nowHM(),
          slot: i.slot || guessSlot(),
          name: String(i.name || 'Food'),
          serv: i.amount || (i.grams ? i.grams + ' g' : '1 serving'),
          g: i.grams || null,
          src: 'COACH',
          kcal: Math.round(Number(i.kcal) || 0),
          p: r1(i.protein_g),
          c: r1(i.carbs_g),
          f: r1(i.fat_g)
        }));
        if (!entries.length) continue;
        addMeals(date, entries);
        const t = sumN(entries);
        lines.push('Logged ' + entries.map(e => e.name).join(', ') + ' → ' + [...new Set(entries.map(e => slotName(e.slot)))].join(' + ') + (date !== today ? ' (yesterday)' : '') + ' · ' + Math.round(t.kcal) + ' kcal · P ' + r1(t.p) + ' g');
      } else if (a.name === 'set_targets') {
        const n = v => v == null || isNaN(Number(v)) ? null : Math.max(0, Math.round(Number(v)));
        app.setState(s => ({
          targets: {
            kcal: n(x.kcal) ?? s.targets.kcal,
            p: n(x.protein_g) ?? s.targets.p,
            c: n(x.carbs_g) ?? s.targets.c,
            f: n(x.fat_g) ?? s.targets.f
          },
          setup: {
            ...s.setup,
            targetsTouched: true
          }
        }));
        const t = app.state.targets;
        lines.push('Targets now ' + t.kcal.toLocaleString() + ' kcal · P ' + t.p + ' · C ' + t.c + ' · F ' + t.f);
      } else if (a.name === 'set_water_goal') {
        const ml = Math.max(1000, Math.min(8000, Math.round(Number(x.ml) || 0)));
        app.setState({
          waterGoal: ml
        });
        lines.push('Water goal now ' + (ml / 1000).toFixed(2) + ' L');
      } else if (a.name === 'add_water') {
        const ml = Math.max(0, Math.min(3000, Math.round(Number(x.ml) || 0)));
        if (!ml) continue;
        app.addWater(ml);
        lines.push('Added ' + ml + ' ml water');
      } else if (a.name === 'complete_rule') {
        const r = findRule(x.rule_key);
        if (!r) {
          lines.push('Couldn’t find the rule “' + x.rule_key + '”');
          continue;
        }
        app.setState(s => ({
          done: {
            ...s.done,
            [r.k]: true
          },
          doneAt: {
            ...s.doneAt,
            [r.k]: s.doneAt[r.k] || SH.nowHM()
          }
        }));
        lines.push('Cleared ' + (app.hLabel && app.hLabel(r).name || r.name));
      } else if (a.name === 'set_reminder') {
        const r = findRule(x.rule_key);
        if (!r) {
          lines.push('Couldn’t find the rule “' + x.rule_key + '”');
          continue;
        }
        const t = hhmmToMin(x.time);
        app.setState(s => {
          const cur = (s.rem || {})[r.k] || DEF_REM;
          return {
            rem: {
              ...s.rem,
              [r.k]: {
                ...cur,
                t: t != null ? t : cur.t,
                on: x.on != null ? !!x.on : true
              }
            }
          };
        });
        const cur = app.state.rem[r.k];
        lines.push('Reminder for ' + (app.hLabel && app.hLabel(r).name || r.name) + ': ' + (cur.on ? minToHhmm(cur.t) : 'off'));
      } else if (a.name === 'save_meal') {
        const items = (x.items || []).map(i => ({
          name: i.name,
          serv: i.amount || (i.grams ? i.grams + ' g' : '1 serving'),
          g: i.grams || null,
          kcal: Math.round(Number(i.kcal) || 0),
          p: r1(i.protein_g),
          c: r1(i.carbs_g),
          f: r1(i.fat_g),
          src: 'COACH'
        }));
        if (!items.length) continue;
        app.setState(s => ({
          regulars: (s.regulars || []).filter(r => r.name.toLowerCase() !== String(x.name).toLowerCase()).concat({
            id: 'r' + uid(),
            name: String(x.name),
            slot: x.slot || 'BREAKFAST',
            items
          })
        }));
        lines.push('Saved meal “' + x.name + '” · ' + Math.round(sumN(items).kcal) + ' kcal');
      }
    } catch (e) {
      lines.push('Couldn’t do ' + a.name + ': ' + e.message);
    }
  }
  return lines;
}
function Rich({
  text
}) {
  const inline = s => String(s).split(/(\*\*[^*]+\*\*)/g).map((p, i) => p.startsWith('**') && p.endsWith('**') ? /*#__PURE__*/React.createElement("b", {
    key: i,
    style: {
      color: C.text
    }
  }, p.slice(2, -2)) : p);
  return /*#__PURE__*/React.createElement("div", null, String(text || '').split('\n').map((l, i) => {
    const t = l.trim();
    if (!t) return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        height: 8
      }
    });
    const b = t.match(/^([-•*]|\d+[.)])\s+(.*)$/);
    if (b) return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        display: 'flex',
        gap: 8,
        marginTop: 3
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        color: C.blue,
        flex: 'none'
      }
    }, /\d/.test(b[1]) ? b[1] : '•'), /*#__PURE__*/React.createElement("span", null, inline(b[2])));
    if (/^#+\s/.test(t)) return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        font: `700 15px/1.3 ${F.head}`,
        letterSpacing: '.08em',
        textTransform: 'uppercase',
        color: C.text,
        marginTop: 6
      }
    }, t.replace(/^#+\s/, ''));
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        marginTop: i ? 3 : 0
      }
    }, inline(t));
  }));
}
const UNDO_KEYS = ['meals', 'diary', 'history', 'targets', 'waterGoal', 'waterMl', 'done', 'doneAt', 'rem', 'regulars', 'setup'];
function CoachScreen({
  app,
  st
}) {
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const scroller = useRef(null);
  const undos = useRef({});
  const chat = st.coachChat || [];
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chat.length, busy]);
  const push = m => app.setState(s => ({
    coachChat: (s.coachChat || []).concat({
      id: 'c' + uid(),
      ...m
    }).slice(-60)
  }));
  const send = async (text, retried) => {
    text = String(text || '').trim();
    if (!text || busy) return;
    if (!retried) {
      push({
        role: 'user',
        content: text
      });
      setInput('');
    }
    setBusy(true);
    const history = (app.state.coachChat || []).filter(m => m.role !== 'error').slice(-14).map(m => ({
      role: m.role,
      content: m.content + (m.done && m.done.length ? '\n(Done in the app: ' + m.done.join('; ') + ')' : '')
    }));
    let code = null;
    try {
      code = localStorage.getItem('coachCode');
    } catch (e) {/* ignore */}
    try {
      const r = await fetch('/api/coach', {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          messages: history,
          context: coachContext(app, app.state),
          code
        })
      });
      let j = {};
      try {
        j = await r.json();
      } catch (e) {/* ignore */}
      if (r.status === 401 && j.error === 'code') {
        const c = prompt('Coach passcode (the COACH_CODE you set in Netlify):');
        setBusy(false);
        if (c) {
          try {
            localStorage.setItem('coachCode', c.trim());
          } catch (e) {/* ignore */}
          return send(text, true);
        }
        push({
          role: 'error',
          content: 'The coach needs its passcode.'
        });
        return;
      }
      if (!r.ok) {
        push({
          role: 'error',
          content: j.message || 'Something went wrong (' + r.status + ').',
          setup: j.error === 'no_key'
        });
        setBusy(false);
        return;
      }
      const snap = {};
      UNDO_KEYS.forEach(k => {
        snap[k] = app.state[k];
      });
      const done = runCoachActions(app, j.actions);
      const id = 'c' + uid();
      if (done.length) undos.current[id] = snap;
      app.setState(s => ({
        coachChat: (s.coachChat || []).concat({
          id,
          role: 'assistant',
          content: j.text || (done.length ? 'Done.' : 'Hmm, I didn’t get that — try rephrasing?'),
          done
        }).slice(-60)
      }));
    } catch (e) {
      push({
        role: 'error',
        content: navigator.onLine === false ? 'You’re offline — the coach needs internet.' : 'Couldn’t reach the coach. Try again.'
      });
    }
    setBusy(false);
  };
  const undo = id => {
    const snap = undos.current[id];
    if (!snap) return;
    app.setState({
      ...snap,
      coachChat: (app.state.coachChat || []).map(m => m.id === id ? {
        ...m,
        undone: true
      } : m)
    });
    delete undos.current[id];
  };
  const reg = (st.regulars || [])[0];
  const ideas = [reg ? 'Log my ' + reg.name.toLowerCase() : 'Log 2 eggs and toast for breakfast', 'Why am I not gaining weight?', 'How’s my protein been this week?', 'Plan the rest of today’s food to hit my targets', 'I drank 500 ml of water', 'Move my reading reminder to 21:00'];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: C.bg,
      fontFamily: F.body,
      color: C.text
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '58px 22px 12px',
      borderBottom: '1px solid ' + C.line,
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      ...T.label,
      marginBottom: 4
    }
  }, "DAY ", app.dayNum(), " \xB7 ASK, OR TELL IT WHAT YOU DID"), /*#__PURE__*/React.createElement("div", {
    style: T.h1
  }, "Coach")), chat.length ? /*#__PURE__*/React.createElement(TopLink, {
    tone: C.dim,
    onClick: () => {
      if (confirm('Clear the conversation?')) app.setState({
        coachChat: []
      });
    }
  }, "CLEAR") : null), /*#__PURE__*/React.createElement("div", {
    ref: scroller,
    style: {
      flex: 1,
      overflow: 'auto',
      padding: '14px 16px 10px'
    }
  }, !chat.length ? /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      ...T.body,
      color: C.dim,
      lineHeight: 1.5
    }
  }, "I can see your food diary, targets, training, rules and measurements. Tell me what you ate and I\u2019ll log it, or ask why something isn\u2019t moving and I\u2019ll dig into your numbers."), /*#__PURE__*/React.createElement("div", {
    style: {
      ...T.label,
      margin: '18px 0 8px'
    }
  }, "TRY"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 7
    }
  }, ideas.map(t => /*#__PURE__*/React.createElement("div", {
    key: t,
    role: "button",
    onClick: () => send(t),
    style: {
      border: '1px solid ' + C.line2,
      padding: '12px 13px',
      cursor: 'pointer',
      font: `500 15px/1.3 ${F.body}`
    }
  }, t)))) : null, chat.map(m => m.role === 'user' ? /*#__PURE__*/React.createElement("div", {
    key: m.id,
    style: {
      display: 'flex',
      justifyContent: 'flex-end',
      margin: '10px 0'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: '82%',
      background: C.blue,
      color: C.blueInk,
      padding: '10px 12px',
      font: `500 15px/1.4 ${F.body}`,
      whiteSpace: 'pre-wrap'
    }
  }, m.content)) : m.role === 'error' ? /*#__PURE__*/React.createElement("div", {
    key: m.id,
    style: {
      margin: '10px 0',
      border: '1px solid #5c2b2e',
      padding: '11px 12px',
      font: `400 14px/1.45 ${F.body}`,
      color: '#e0a89a'
    }
  }, m.content, m.setup ? /*#__PURE__*/React.createElement("div", {
    style: {
      ...T.label,
      marginTop: 8,
      color: C.dim,
      lineHeight: 1.6
    }
  }, "SET-UP: CREATE AN API KEY AT CONSOLE.ANTHROPIC.COM \u2192 ADD IT IN NETLIFY AS ANTHROPIC_API_KEY \u2192 REDEPLOY.") : null) : /*#__PURE__*/React.createElement("div", {
    key: m.id,
    style: {
      margin: '10px 0',
      maxWidth: '92%'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      ...T.label,
      color: C.blue,
      marginBottom: 4
    }
  }, "COACH"), /*#__PURE__*/React.createElement("div", {
    style: {
      font: `400 15px/1.5 ${F.body}`,
      color: '#c9cbbc'
    }
  }, /*#__PURE__*/React.createElement(Rich, {
    text: m.content
  })), (m.done || []).length ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 8,
      background: C.card,
      borderLeft: '3px solid ' + (m.undone ? C.faint : C.olive),
      padding: '9px 11px'
    }
  }, m.done.map((d, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      ...T.mono,
      fontSize: 11,
      lineHeight: 1.5,
      letterSpacing: '.04em',
      color: m.undone ? C.faint : C.text,
      textDecoration: m.undone ? 'line-through' : 'none'
    }
  }, "\u2713 ", d)), !m.undone && undos.current[m.id] ? /*#__PURE__*/React.createElement("span", {
    role: "button",
    onClick: () => undo(m.id),
    style: {
      display: 'inline-block',
      marginTop: 6,
      ...T.mono,
      fontSize: 11,
      color: C.amber,
      cursor: 'pointer'
    }
  }, "UNDO") : m.undone ? /*#__PURE__*/React.createElement("div", {
    style: {
      ...T.label,
      marginTop: 4
    }
  }, "UNDONE") : null) : null)), busy ? /*#__PURE__*/React.createElement("div", {
    style: {
      ...T.label,
      color: C.blue,
      margin: '12px 0'
    }
  }, "COACH IS THINKING\u2026") : null), /*#__PURE__*/React.createElement("div", {
    style: {
      borderTop: '1px solid ' + C.line,
      padding: '10px 12px',
      display: 'flex',
      gap: 8,
      alignItems: 'flex-end',
      background: '#0d0e08'
    }
  }, /*#__PURE__*/React.createElement("textarea", {
    value: input,
    onChange: e => setInput(e.target.value),
    rows: Math.min(4, Math.max(1, input.split('\n').length)),
    placeholder: "Log food, or ask anything",
    onKeyDown: e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        send(input);
      }
    },
    style: {
      flex: 1,
      minWidth: 0,
      boxSizing: 'border-box',
      background: C.card,
      border: '1px solid ' + C.line2,
      color: C.text,
      font: `400 16px/1.35 ${F.body}`,
      padding: '11px 10px',
      outline: 'none',
      resize: 'none',
      borderRadius: 0
    }
  }), /*#__PURE__*/React.createElement(Btn, {
    tone: C.blue,
    ink: C.blueInk,
    disabled: busy || !input.trim(),
    onClick: () => send(input),
    style: {
      minHeight: 46,
      padding: '0 16px',
      fontSize: 15
    }
  }, "Send")));
}
window.CoachScreen = CoachScreen;
})();
