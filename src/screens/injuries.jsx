// Injury tracker (Train → INJURIES). A built-in guide to common training injuries (works offline), your current
// injuries with a daily "how does it feel" check-in, a rehab checklist, care tips for the stage you're in, red flags,
// and what to train around. Everything is editable. General guidance only — not a diagnosis.
//
// State: st.injuries = [{ id, key (INJ_LIB key or null), name, area, side, start (iso), note,
//   rehab: [{ id, n, dose, how }], log: { [iso]: { feel 1-10, note, done: [rehab ids] } }, healed: iso | null }]

// ── The guide ──
// phases: [settle it down, rebuild, back to full]. watch: words in exercise names to flag during workouts.
const R = (n, dose, how) => ({ n, dose, how });
const INJ_LIB = [
  { k: 'low-back', name: 'Lower back strain', area: 'Back', time: [2, 6],
    what: 'Overloaded muscles or ligaments in the low back, often from lifting, bending or twisting. Scary-sore but usually settles well.',
    signs: ['Ache, tightness or spasm across the low back', 'Worse bending, lifting or sitting a long time', 'No pain, numbness or weakness down the leg past the knee'],
    phases: [['Keep moving gently — bed rest slows recovery', 'Short walks often; change position every 20–30 min', 'Heat can ease spasm', 'Pain relief: ask a pharmacist what suits you'],
      ['Daily core and hip work (below)', 'Practise the hip hinge with a broomstick before adding weight', 'Walk a little further each day'],
      ['Bring lifts back at ~50% and add 5–10% a week', 'Brace before you lift; keep the bar close', 'Leave 2–3 reps in the tank for a few weeks']],
    avoid: ['Heavy deadlifts, squats, good mornings', 'Bent-over barbell rows', 'Sit-ups and loaded twisting'], ok: ['Walking, cycling', 'Chest-supported rows, machines', 'Seated or supported upper-body work'],
    rehab: [R('Cat–cow', '2 × 10', 'Slow, within comfort'), R('Bird dog', '3 × 8 / side', 'Hold 3 s, keep hips level'), R('Glute bridge', '3 × 12', 'Squeeze glutes at the top'),
      R('Dead bug', '3 × 8 / side', 'Low back stays gently on the floor'), R('McGill curl-up', '3 × 6', '10 s holds, head and shoulders just lift'), R('Walk', '10–20 min', 'Easy pace, most days')],
    flags: ['Numbness around the groin or inner thighs, or new bladder/bowel problems — go to emergency now', 'Leg weakness that is getting worse', 'After a big fall or crash', 'Fever, unexplained weight loss, or pain that is worse at night and at rest'],
    watch: ['deadlift', 'squat', 'good morning', 'row (barbell)', 'romanian', 'back extension', 'sit-up', 'clean', 'snatch'] },
  { k: 'sciatica', name: 'Sciatica / disc-related back pain', area: 'Back', time: [6, 12],
    what: 'An irritated nerve root in the low back (often from a disc) sending pain, tingling or numbness down the leg. Most cases improve a lot within 6–12 weeks.',
    signs: ['Pain that travels down the buttock and leg, often past the knee', 'Pins and needles or numbness in the leg or foot', 'Often worse sitting, coughing or sneezing'],
    phases: [['Keep walking — short and often', 'Avoid long sitting; stand and move every 20 min', 'Find easing positions (lying with knees bent often helps)'],
      ['If back-bending eases the leg pain, keep doing press-ups (below)', 'Gentle nerve glides — stop if they make it worse', 'Start core work'],
      ['Leg pain gone before heavy lifting returns', 'Rebuild hinges and squats slowly over weeks']],
    avoid: ['Heavy deadlifts and squats', 'Loaded forward bending (e.g. stiff-leg work)', 'Jumping and running while leg symptoms are active'], ok: ['Walking, swimming', 'Upper-body machines with back support'],
    rehab: [R('Prone press-up', '2 × 10', 'Lie face down, press the top half up; stop if leg pain spreads further down'), R('Walk', '10–20 min', 'A few times a day'),
      R('Seated nerve glide', '2 × 10', 'Straighten knee while lifting head, bend knee while dropping head — gentle'), R('Bird dog', '3 × 8 / side', 'Slow and steady'), R('Glute bridge', '3 × 12', 'Pain-free range')],
    flags: ['Numbness around the groin or inner thighs, or new bladder/bowel problems — go to emergency now', 'Foot drop or leg weakness getting worse', 'Both legs affected'],
    watch: ['deadlift', 'squat', 'good morning', 'romanian', 'row (barbell)', 'jump', 'clean', 'snatch'] },
  { k: 'shoulder-cuff', name: 'Rotator cuff / shoulder impingement', area: 'Shoulder', time: [6, 12],
    what: 'An irritated rotator cuff tendon (subacromial pain). It usually comes from doing more pressing or overhead work than the tendon is ready for.',
    signs: ['Ache at the front or side of the shoulder', 'Painful arc lifting the arm out to the side', 'Hurts to lie on or reach overhead / behind you'],
    phases: [['Cut painful ranges, not all training', 'Keep moving in the pain-free range', 'Isometrics (holds) often calm tendon pain'],
      ['Strengthen the cuff and shoulder blade 3–4× a week', 'Some discomfort (≤3/10) is OK if it settles by next morning', 'Neutral-grip pressing in a comfortable range'],
      ['Bring overhead work back last, light and slow', 'Keep 1–2 cuff exercises as warm-ups for good']],
    avoid: ['Overhead press while it hurts', 'Upright rows, behind-the-neck anything', 'Dips and deep flyes'], ok: ['Neutral-grip dumbbell press, partial range', 'Rows and pulldowns in front', 'Legs and core'],
    rehab: [R('Isometric external rotation', '5 × 30 s', 'Elbow at side, push the back of your hand into a wall'), R('Side-lying external rotation', '3 × 12', 'Light dumbbell, slow'),
      R('Band external rotation', '3 × 15', 'Towel between elbow and side'), R('Band row / scapular squeeze', '3 × 12', 'Shoulder blades back and down'), R('Wall slide', '2 × 10', 'Forearms on wall, slide up in pain-free range'), R('Face pull', '3 × 15', 'Light, pull to eyes, thumbs back')],
    flags: ["Can't lift the arm at all after a fall or sudden pull (possible tear)", 'Severe night pain that stops sleep for weeks', 'Numbness or tingling down the arm', 'Fever or a hot, swollen joint'],
    watch: ['overhead press', 'shoulder press', 'military', 'upright row', 'dip', 'lateral raise', 'bench press', 'incline', 'arnold', 'push press'] },
  { k: 'shoulder-instab', name: 'Shoulder instability / dislocation (labrum, Bankart)', area: 'Shoulder', time: [6, 12],
    what: 'The ball of the shoulder slipped partly (subluxation) or fully (dislocation) out of the socket. The labrum — the rim of cartilage — can tear; a Bankart lesion is a tear at the front-bottom. After surgery, rehab is usually 4–6 months: follow your surgeon/physio protocol first.',
    signs: ['A slipping, clunking or "dead arm" feeling', 'Nervous feeling with the arm out to the side and turned back (like throwing)', 'Weakness or ache after pressing'],
    phases: [['Protect it: avoid arm out to the side AND turned back', 'Use a sling only if your clinician said so', 'Gentle movement in safe positions; isometrics'],
      ['Rotator cuff and shoulder-blade strength in safe positions', 'Work up to overhead slowly, one step at a time', 'Stick to your physio/surgeon plan — it beats any app'],
      ['Heavy pressing and contact sport only when strength is ~90% of the other side and there is no apprehension', 'Keep stability work in every warm-up']],
    avoid: ['Behind-the-neck press or pulldowns', 'Wide-grip bench, deep flyes, deep dips', 'Heavy overhead until cleared', 'Any stretch with the arm out and turned back'], ok: ['Close / neutral-grip work in a comfortable range', 'Rows, lower body, core', 'Floor press (shorter range)'],
    rehab: [R('Shoulder isometrics', '5 × 10 s each way', 'Push into a wall: out, in, forward, sideways — no movement'), R('Band external / internal rotation', '3 × 15', 'Elbow at side, slow'),
      R('Scapular row', '3 × 12', 'Squeeze shoulder blades together'), R('Serratus wall slide', '2 × 10', 'Forearms on wall, push away as you slide'), R('Prone Y and T raises', '2 × 10', 'Thumbs up, no weight at first'), R('Wall ball stabilisation', '3 × 30 s', 'Small circles with a ball against a wall')],
    flags: ['The shoulder looks deformed or is stuck out — do not force it back in; go to emergency', 'Numbness, tingling or a cold hand', 'It keeps slipping out — see an orthopaedic specialist'],
    watch: ['bench', 'fly', 'flye', 'dip', 'overhead press', 'shoulder press', 'pulldown', 'pull-up', 'chin-up', 'snatch', 'push press', 'pec deck'] },
  { k: 'tennis-elbow', name: 'Tennis elbow (outside of the elbow)', area: 'Elbow', time: [6, 12],
    what: 'An irritated tendon on the outside of the elbow (lateral elbow tendinopathy) from gripping and wrist work. Slow to settle but responds well to loading.',
    signs: ['Pain on the outside of the elbow', 'Hurts to grip, lift a kettle, or turn a doorknob', 'Tender over the bony point'],
    phases: [['Reduce painful gripping; use lifting straps', 'Isometric holds for pain relief', 'A forearm strap (counterforce brace) can help some people'],
      ['Slow wrist-extension loading most days', 'Mild pain (≤3/10) during is fine if it settles by morning'],
      ['Grip work back gradually', 'Keep one forearm exercise in your routine']],
    avoid: ['Heavy gripping without straps', 'Reverse curls, heavy wrist work', 'Pull-ups to failure'], ok: ['Straps on pulls and deadlifts', 'Neutral-grip (hammer) holds', 'Legs, pressing if pain-free'],
    rehab: [R('Isometric wrist extension', '5 × 30–45 s', 'Forearm on a table, hold a light weight still, wrist straight'), R('Slow wrist extension', '3 × 15', 'Lower for 3–4 s'),
      R('Tyler twist (FlexBar)', '3 × 15', 'If you have one'), R('Forearm rotation with hammer', '3 × 12', 'Hold the handle end, rotate slowly'), R('Light grip squeeze', '3 × 15', 'Soft ball, pain-free')],
    flags: ['Red, hot, swollen elbow with fever', 'Numbness in the fingers', 'Elbow locking or giving way'],
    watch: ['curl', 'row', 'deadlift', 'pull-up', 'chin-up', 'farmer', 'wrist'] },
  { k: 'golfer-elbow', name: "Golfer's elbow (inside of the elbow)", area: 'Elbow', time: [6, 12],
    what: 'An irritated tendon on the inside of the elbow (medial elbow tendinopathy) from gripping, curling and pulling.',
    signs: ['Pain on the inside of the elbow', 'Worse gripping, curling or with palm-up lifting', 'Tender on the inner bony point'],
    phases: [['Reduce painful curls and pulls; use straps', 'Isometric holds for pain relief'], ['Slow wrist-flexion loading most days', 'Bring curls back with neutral grip first'], ['Build grip and pulling volume back gradually']],
    avoid: ['Heavy supinated curls', 'Chin-ups to failure', 'Heavy gripping without straps'], ok: ['Straps', 'Hammer curls if pain-free', 'Legs and pressing'],
    rehab: [R('Isometric wrist flexion', '5 × 30–45 s', 'Palm up, hold a light weight still'), R('Slow wrist flexion', '3 × 15', 'Lower for 3–4 s'),
      R('Forearm rotation with hammer', '3 × 12', 'Slow, both directions'), R('Light grip squeeze', '3 × 15', 'Soft ball')],
    flags: ['Numbness or tingling in the ring and little fingers', 'Red, hot, swollen elbow with fever', 'A pop with sudden weakness'],
    watch: ['curl', 'chin-up', 'pull-up', 'row', 'deadlift', 'farmer'] },
  { k: 'wrist', name: 'Wrist sprain / wrist pain', area: 'Wrist', time: [2, 6],
    what: 'A stretched ligament or overloaded wrist, often from a fall on the hand or lots of pressing and push-ups.',
    signs: ['Pain and swelling around the wrist', 'Hurts to push up or bear weight through the hand', 'Stiff bending back'],
    phases: [['Rest from weight-bearing; wrap or brace for comfort', 'Gentle wrist circles within comfort'], ['Wrist strength with light dumbbells', 'Weight-bearing progression: wall → bench → floor'], ['Push-ups and front rack back gradually; use wraps or handles']],
    avoid: ['Flat-hand push-ups, handstands', 'Front squats / cleans (front rack)', 'Heavy pressing without wraps'], ok: ['Push-up handles or dumbbells (neutral wrist)', 'Wrist wraps', 'Legs with a safety-bar or belt squat'],
    rehab: [R('Wrist circles', '2 × 10 each way', 'Gentle'), R('Wrist flexion / extension', '3 × 12', 'Very light dumbbell'), R('Forearm rotation', '3 × 12', 'Hammer or light dumbbell'),
      R('Grip squeeze', '3 × 15', 'Soft ball'), R('Weight-bearing progression', '3 × 20 s', 'Hands on wall, then bench, then floor')],
    flags: ['After a fall on an outstretched hand with pain at the base of the thumb (possible scaphoid fracture — needs an X-ray)', 'Deformity or can’t move it', 'Numbness in the fingers'],
    watch: ['push-up', 'front squat', 'clean', 'bench', 'dip', 'handstand', 'snatch', 'jerk'] },
  { k: 'knee-pf', name: "Runner's knee (pain around the kneecap)", area: 'Knee', time: [6, 12],
    what: 'Patellofemoral pain: the joint behind the kneecap is irritated by more squatting, running or stairs than it is ready for. Very common and very treatable.',
    signs: ['Ache around or behind the kneecap', 'Worse on stairs (especially down), squatting, or sitting a long time', 'No big swelling or locking'],
    phases: [['Cut painful volume: deep squats, stairs, downhill', 'Keep moving: bike, walk, pain-free range'], ['Quads and hip strength 3× a week', 'Squat to a box at a pain-free depth; go deeper over weeks'], ['Running and deep squats back gradually (10% a week)']],
    avoid: ['Deep loaded squats and lunges through pain', 'Jumping', 'Long downhill running'], ok: ['Box squats to pain-free depth', 'Leg press in a partial range', 'Hip and hamstring work, cycling'],
    rehab: [R('Wall sit', '5 × 30–45 s', 'Pain-free depth'), R('Step-down', '3 × 10 / side', 'Slow, knee over middle toes'), R('Side-lying hip abduction', '3 × 15', 'Toes slightly down'),
      R('Clamshell', '3 × 15', 'Band above knees'), R('Straight leg raise', '3 × 12', 'Tighten thigh first'), R('Terminal knee extension', '3 × 15', 'Band behind knee, straighten fully')],
    flags: ['Large swelling, locking or giving way', 'Can’t bear weight', 'Red, hot knee with fever'],
    watch: ['squat', 'lunge', 'leg extension', 'jump', 'split squat', 'step-up', 'leg press', 'pistol'] },
  { k: 'knee-tendon', name: "Jumper's knee (patellar tendon)", area: 'Knee', time: [6, 12],
    what: 'Patellar tendinopathy: the tendon just below the kneecap is overloaded, usually from jumping or lots of squatting. Tendons love slow, heavy loading.',
    signs: ['Pain just below the kneecap', 'Worse jumping, landing, or the first reps of squats', 'Warms up then hurts after'],
    phases: [['Stop jumping for now', 'Isometric holds a few times a day to calm pain'], ['Heavy slow resistance: slow squats / leg press / leg extension', 'Pain ≤3/10 during, settled by next morning'], ['Jumps come back last: small hops → box jumps → full jumps']],
    avoid: ['Jumping and plyometrics', 'Fast, deep squats'], ok: ['Slow tempo squats and leg press', 'Upper body, hip hinges'],
    rehab: [R('Isometric leg extension', '5 × 45 s', 'Heavy-ish, knee at ~60°'), R('Spanish squat hold', '5 × 30 s', 'Band behind knees, sit back'), R('Decline slow squat', '3 × 10', '3 s down, 3 s up'),
      R('Heavy slow leg press', '3–4 × 8–15', '3 s down, 3 s up')],
    flags: ['A pop and can’t straighten the leg (possible tendon rupture — urgent)', 'Large swelling'],
    watch: ['jump', 'squat', 'lunge', 'leg extension', 'box', 'split squat', 'step-up'] },
  { k: 'itb', name: 'IT band syndrome (outside of the knee)', area: 'Knee', time: [4, 8],
    what: 'Pain on the outer knee where the IT band crosses the bone — common in runners and cyclists after a jump in mileage.',
    signs: ['Sharp pain on the outside of the knee', 'Starts at a similar point in every run', 'Worse downhill'],
    phases: [['Cut running volume and hills; swap in cycling if it’s pain-free', 'Foam rolling may ease symptoms (it doesn’t lengthen the band)'], ['Hip strength 3× a week', 'Short, flat, pain-free runs'], ['Build mileage 10% a week; mix in hills last']],
    avoid: ['Long runs and downhill', 'Big mileage jumps'], ok: ['Swimming, upper body', 'Strength work in pain-free range'],
    rehab: [R('Side plank with hip lift', '3 × 8 / side', 'Top leg lifts slowly'), R('Side-lying hip abduction', '3 × 15', 'Toes slightly down'), R('Clamshell', '3 × 15', 'Band above knees'),
      R('Single-leg glute bridge', '3 × 10 / side', 'Hips level'), R('Single-leg squat to box', '3 × 8 / side', 'Knee tracks over toes')],
    flags: ['Swelling, locking or giving way', 'Pain at rest or at night'],
    watch: ['run', 'jog', 'bike', 'cycle', 'lunge', 'stair'] },
  { k: 'hamstring', name: 'Hamstring strain', area: 'Leg', time: [2, 8],
    what: 'A tear of hamstring muscle fibres, often while sprinting or lifting fast. Mild ones heal in 2–3 weeks; bigger ones take longer.',
    signs: ['Sudden pain or a "grab" in the back of the thigh', 'Hurts to stretch or to bend the knee against resistance', 'Maybe bruising a few days later'],
    phases: [['No hard stretching for the first few days', 'Walk normally as soon as you can', 'Gentle isometric holds'], ['Bridges → single-leg bridges → light RDLs', 'Add sliders, then Nordic curls when pain-free'], ['Sprinting comes back gradually: 60% → 80% → full speed']],
    avoid: ['Sprinting', 'Heavy RDLs / deadlifts', 'Hard hamstring stretching early'], ok: ['Upper body', 'Quads and calves if pain-free', 'Cycling if pain-free'],
    rehab: [R('Isometric heel dig', '5 × 10 s', 'Lying, press heel into floor'), R('Glute bridge', '3 × 12', 'Progress to single leg'), R('Slider hamstring curl', '3 × 8', 'Slow'),
      R('Romanian deadlift (light)', '3 × 10', 'Pain-free range'), R('Nordic curl (later)', '3 × 5', 'Only when everything else is pain-free')],
    flags: ['A pop at the sit bone with big bruising (possible tendon avulsion — needs assessment within days)', 'Can’t walk', 'Numbness down the leg'],
    watch: ['deadlift', 'romanian', 'leg curl', 'sprint', 'good morning', 'lunge', 'hip thrust'] },
  { k: 'groin', name: 'Groin (adductor) strain', area: 'Hip', time: [2, 6],
    what: 'A strain of the inner-thigh muscles, often from cutting, kicking or wide squats.',
    signs: ['Pain in the inner thigh or groin', 'Hurts to squeeze the knees together', 'Worse with side steps or kicking'],
    phases: [['Avoid wide stances and side-to-side moves', 'Gentle squeezes if pain-free'], ['Squeeze isometrics → side-lying lifts → Copenhagen planks', 'Lateral lunges light'], ['Change of direction and kicking back gradually']],
    avoid: ['Sumo deadlifts, wide squats', 'Cossack / lateral lunges early', 'Sprinting and cutting'], ok: ['Narrow-stance lower body if pain-free', 'Upper body'],
    rehab: [R('Adductor squeeze', '5 × 10 s', 'Ball between knees'), R('Side-lying adduction', '3 × 12', 'Bottom leg lifts'), R('Copenhagen plank (short)', '3 × 15 s', 'Knee on bench, progress to foot'),
      R('Lateral lunge (light)', '3 × 8 / side', 'Pain-free depth')],
    flags: ['Swelling or a lump in the groin (possible hernia)', 'Pain with fever', 'Testicular pain'],
    watch: ['sumo', 'wide', 'cossack', 'lateral lunge', 'adductor', 'sprint'] },
  { k: 'hip-flexor', name: 'Hip flexor strain', area: 'Hip', time: [2, 6],
    what: 'A strain at the front of the hip, often from sprinting, kicking or lots of leg raises.',
    signs: ['Pain at the front of the hip or groin', 'Hurts to lift the knee up', 'Tight when you stretch the front of the hip'],
    phases: [['Avoid sprinting and leg raises', 'Walk in a pain-free range'], ['Isometrics → band marches → light leg raises', 'Gentle hip flexor stretch once it’s calm'], ['Sprinting and kicking back gradually']],
    avoid: ['Hanging leg raises, sit-ups', 'Sprinting and kicking'], ok: ['Upper body', 'Bridges and hinges if pain-free'],
    rehab: [R('Isometric hip flexion', '5 × 10 s', 'Seated, push knee up into your hand'), R('Band march', '3 × 10 / side', 'Band around feet, lying'), R('Dead bug', '3 × 8 / side', 'Slow'),
      R('Kneeling hip flexor stretch', '3 × 30 s', 'Gentle, tuck pelvis — once pain settles')],
    flags: ['Hip pain with fever', 'Can’t bear weight', 'Clicking with locking'],
    watch: ['leg raise', 'sit-up', 'sprint', 'knee raise', 'v-up', 'mountain climber'] },
  { k: 'ankle', name: 'Ankle sprain', area: 'Ankle', time: [2, 6],
    what: 'A stretched or torn ligament, usually on the outside of the ankle after rolling it. Getting moving early (as able) helps.',
    signs: ['Pain and swelling on the outside of the ankle', 'Bruising', 'Feels unstable'],
    phases: [['First 1–3 days: protect it, elevate, compress', 'Walk as pain allows', 'Ankle alphabet to keep it moving'], ['Calf raises and band work', 'Single-leg balance every day — this prevents the next sprain'], ['Hops → jumps → side-to-side; tape or brace for sport for a few months']],
    avoid: ['Jumping and cutting', 'Running on uneven ground'], ok: ['Upper body', 'Seated leg work', 'Cycling if pain-free'],
    rehab: [R('Ankle alphabet', '2 × a day', 'Trace letters with your toes'), R('Calf raises', '3 × 15', 'Both legs → single leg'), R('Single-leg balance', '3 × 30 s', 'Eyes closed when easy'),
      R('Band eversion', '3 × 15', 'Turn foot outwards against a band'), R('Hops (later)', '3 × 10', 'Small, controlled')],
    flags: ['Couldn’t take 4 steps right after, or can’t now', 'Tender on the back edge or tip of either ankle bone, or the base of the 5th toe bone — get an X-ray', 'Numbness, a cold or pale foot'],
    watch: ['jump', 'run', 'box', 'lunge', 'skipping', 'burpee', 'sprint'] },
  { k: 'achilles', name: 'Achilles tendinopathy', area: 'Ankle', time: [8, 12],
    what: 'An overloaded Achilles tendon, from more running or jumping than it’s ready for. Tendons get better with progressive calf loading, not rest alone.',
    signs: ['Pain and stiffness in the tendon above the heel', 'Worst first thing in the morning', 'Sore with running or hopping'],
    phases: [['Reduce running and jumping', 'Isometric calf holds for pain'], ['Heavy slow calf raises — straight and bent knee', 'Pain ≤3/10 during, settled by morning'], ['Running back with walk–jog intervals; jumps last']],
    avoid: ['Sprinting, hill running', 'Jumping and skipping'], ok: ['Cycling, swimming', 'Upper body and most lifting'],
    rehab: [R('Isometric calf hold', '5 × 45 s', 'Halfway up on a step'), R('Heavy slow calf raise', '3 × 15', '3 s up, 3 s down'), R('Seated calf raise', '3 × 15', 'Heavy'),
      R('Eccentric heel drop', '3 × 15', 'Up on two legs, lower slowly on the sore one')],
    flags: ['A sudden pop, like being kicked in the back of the ankle, and can’t push off — possible rupture, go now', 'A gap you can feel in the tendon'],
    watch: ['jump', 'run', 'calf', 'box', 'skipping', 'sprint'] },
  { k: 'shin', name: 'Shin splints', area: 'Leg', time: [2, 6],
    what: 'Medial tibial stress: sore inner shins from a jump in running or jumping load. Needs less load and stronger calves.',
    signs: ['Diffuse ache along the inside of the shin', 'Sore at the start of a run, may ease, returns after', 'Tender along a long strip of bone'],
    phases: [['Cut running volume by about half; softer surfaces', 'Swap some runs for cycling'], ['Calf and shin strength', 'Walk–jog intervals, pain-free'], ['Build back 10% a week; check your shoes']],
    avoid: ['Running through pain', 'Jumping and skipping'], ok: ['Cycling, swimming', 'Most lifting'],
    rehab: [R('Seated soleus raise', '3 × 15', 'Heavy on the knees'), R('Standing calf raise', '3 × 15', 'Slow'), R('Tibialis raise', '3 × 15', 'Back to a wall, lift toes'), R('Heel / toe walks', '2 × 20 m', 'Easy')],
    flags: ['Pinpoint pain on one spot of bone, or pain at rest / at night — possible stress fracture, get it checked', 'Numbness or a tight, swollen calf during exercise'],
    watch: ['run', 'jump', 'skipping', 'box', 'sprint', 'burpee'] },
  { k: 'plantar', name: 'Plantar heel pain (plantar fasciitis)', area: 'Foot', time: [6, 12],
    what: 'An irritated band under the foot where it attaches to the heel. Slow but it gets better with loading and good shoes.',
    signs: ['Sharp heel pain on the first steps in the morning', 'Eases after walking a bit, returns after standing', 'Tender under the heel'],
    phases: [['Supportive shoes; avoid barefoot on hard floors', 'Stretch calf and foot before the first steps'], ['High-load heel raises with a towel under the toes', 'Reduce running/standing time temporarily'], ['Gradual return to running']],
    avoid: ['Running and jumping while it’s sharp', 'Long standing in flat shoes'], ok: ['Cycling, swimming', 'Seated leg work and upper body'],
    rehab: [R('Calf stretch', '3 × 30 s', 'Straight and bent knee'), R('Plantar fascia stretch', '3 × 30 s', 'Pull toes back before getting up'), R('Towel heel raise (Rathleff)', '3 × 12', 'Towel rolled under toes, 3 s up, 2 s hold, 3 s down'),
      R('Towel scrunch', '2 × 20', 'Grab a towel with your toes')],
    flags: ['Heel pain after a fall or jump from a height', 'Numbness or burning in the foot', 'Swelling and redness with fever'],
    watch: ['run', 'jump', 'skipping', 'box', 'sprint'] },
  { k: 'neck', name: 'Neck strain / stiff neck', area: 'Neck', time: [1, 4],
    what: 'Strained neck muscles or a stiff joint, often from sleeping awkwardly, posture or heavy shrugs.',
    signs: ['Pain and stiffness turning the head', 'Tight muscles between neck and shoulder', 'No arm symptoms'],
    phases: [['Keep it moving gently; heat helps', 'Avoid holding one position a long time'], ['Chin tucks and shoulder-blade work', 'Gentle stretches'], ['Heavy shrugs and overhead work back gradually']],
    avoid: ['Heavy shrugs', 'Sit-ups with hands pulling the head'], ok: ['Legs, most machine work', 'Walking'],
    rehab: [R('Chin tuck', '2 × 10', 'Make a double chin, hold 3 s'), R('Neck rotation', '2 × 10', 'Slow, within comfort'), R('Upper trap stretch', '3 × 20 s', 'Gentle'),
      R('Scapular retraction', '3 × 12', 'Squeeze shoulder blades'), R('Neck isometrics', '5 × 10 s each way', 'Hand against head, don’t move')],
    flags: ['After a crash, fall or blow to the head — get checked before moving it', 'Arm weakness, numbness or tingling', 'Severe headache, dizziness, trouble speaking or swallowing — emergency'],
    watch: ['shrug', 'overhead press', 'upright row', 'sit-up', 'neck'] },
  { k: 'pec', name: 'Pec (chest) strain', area: 'Chest', time: [2, 6],
    what: 'A strain of the chest muscle, usually on bench or dips. Most are mild; a tendon tear near the armpit needs quick assessment.',
    signs: ['Pain in the chest or front of the shoulder when pressing', 'Hurts to stretch the arm out to the side'],
    phases: [['Stop pressing through pain', 'Gentle range of motion'], ['Light push-ups, floor press, cable press', 'Build range before load'], ['Bench back at ~50% and build over weeks']],
    avoid: ['Heavy bench, deep dips', 'Flyes and deep stretches'], ok: ['Rows, legs', 'Light pressing in a comfortable range'],
    rehab: [R('Isometric chest squeeze', '5 × 10 s', 'Press palms together'), R('Push-up (incline)', '3 × 12', 'Hands on a bench'), R('Light cable press', '3 × 15', 'Pain-free range'), R('Doorway stretch (later)', '3 × 20 s', 'Gentle')],
    flags: ['A pop on bench with bruising or a dent near the armpit — possible tendon tear; get assessed within days (timing matters)', 'Chest pain with shortness of breath, sweating or arm/jaw pain — call emergency'],
    watch: ['bench', 'fly', 'flye', 'dip', 'push-up', 'chest press', 'pec deck'] },
  { k: 'calf', name: 'Calf strain', area: 'Leg', time: [2, 6],
    what: 'A strain of the calf muscle, often when pushing off or sprinting. Gradual loading brings it back.',
    signs: ['Sudden pain in the calf, like being hit', 'Hurts to rise onto the toes', 'Tight walking'],
    phases: [['Walk as pain allows; a small heel lift in the shoe can help', 'Gentle isometric holds'], ['Seated → standing → single-leg calf raises', 'Walk further each day'], ['Jogging, then running and jumping']],
    avoid: ['Running and jumping', 'Heavy calf raises early'], ok: ['Upper body, cycling if pain-free'],
    rehab: [R('Isometric calf hold', '5 × 30 s', 'Both feet, halfway up'), R('Seated calf raise', '3 × 15', 'Light → heavy'), R('Standing calf raise', '3 × 12', 'Two legs → one'), R('Skipping (later)', '3 × 30 s', 'Easy')],
    flags: ['Calf swollen, warm and red, especially after travel or surgery — possible blood clot, go now', 'A pop at the Achilles'],
    watch: ['run', 'jump', 'calf', 'sprint', 'skipping', 'box'] },
  { k: 'biceps', name: 'Biceps tendon pain (front of shoulder)', area: 'Shoulder', time: [4, 8],
    what: 'An irritated long-head biceps tendon at the front of the shoulder, often with lots of curls, chin-ups or bench.',
    signs: ['Pain at the front of the shoulder', 'Worse with curls, chin-ups, or reaching back', 'Tender in the groove at the front'],
    phases: [['Reduce curls and chin-ups', 'Isometric holds'], ['Slow curls with neutral grip', 'Shoulder-blade and cuff strength'], ['Chin-ups and heavy curls back gradually']],
    avoid: ['Heavy supinated curls, chin-ups', 'Deep dips', 'Wide-grip bench'], ok: ['Neutral-grip work', 'Legs and core'],
    rehab: [R('Isometric curl hold', '5 × 30 s', 'Elbow at 90°'), R('Slow hammer curl', '3 × 12', '3 s down'), R('Band external rotation', '3 × 15', 'Elbow at side'), R('Scapular row', '3 × 12', 'Squeeze')],
    flags: ['A pop with a "Popeye" bulge in the upper arm', 'Sudden weakness bending the elbow'],
    watch: ['curl', 'chin-up', 'dip', 'bench', 'pull-up'] }
];
const INJ_AREAS = ['All', 'Shoulder', 'Back', 'Knee', 'Elbow', 'Wrist', 'Hip', 'Leg', 'Ankle', 'Foot', 'Neck', 'Chest'];
const injLib = k => INJ_LIB.find(x => x.k === k) || null;
const GENERAL_CARE = [
  ['Pain is a guide, not a stop sign', 'During rehab, discomfort up to about 3/10 is usually OK if it’s back to normal by the next morning.'],
  ['Train around it', 'Keep everything that doesn’t hurt. Staying strong elsewhere helps healing and your mood.'],
  ['Sleep and food', '7–9 h of sleep and enough protein (about 1.6 g per kg a day) give the tissue what it needs to repair.'],
  ['Little and often', 'Ten minutes of rehab most days beats one long session a week.'],
  ['Get it checked', 'If it isn’t improving after 2–3 weeks, or any red flag shows up, see a physio or doctor.']
];

// ── helpers ──
const injDay = (inj, today) => Math.max(1, Math.round((dOf(today) - dOf(inj.start)) / 864e5) + 1);
const injFeel = inj => { const l = inj.log || {}, ds = Object.keys(l).filter(d => l[d] && l[d].feel).sort(); return ds.length ? { date: ds[ds.length - 1], feel: l[ds[ds.length - 1]].feel } : null; };
const injAvg = (inj, from, to) => { const l = inj.log || {}; const v = Object.keys(l).filter(d => d >= from && d <= to && l[d] && l[d].feel).map(d => l[d].feel); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
const injRehabDays = (inj, today, n = 7) => { const l = inj.log || {}; let c = 0; for (let i = 0; i < n; i++) { const d = addDaysIso(today, -i); if (l[d] && (l[d].done || []).length) c++; } return c; };
const injPhase = (inj, today) => { const f = injFeel(inj), day = injDay(inj, today); if (f && f.feel >= 8) return 2; if (day <= 3 || (f && f.feel <= 4)) return 0; return 1; };
const PHASE_NAMES = ['Settle it down', 'Rebuild', 'Back to full'];
const FEEL_WORD = ['', 'Awful', 'Very bad', 'Bad', 'Sore', 'Meh', 'Okay', 'Decent', 'Good', 'Great', 'Normal'];
const feelTone = v => v >= 8 ? C.olive : v >= 5 ? C.amber : C.red;

// Encouragement: honest, specific to your numbers.
function injCheer(inj, today) {
  const lib = injLib(inj.key), day = injDay(inj, today), out = [];
  const now = injAvg(inj, addDaysIso(today, -6), today), prev = injAvg(inj, addDaysIso(today, -13), addDaysIso(today, -7)), last = injFeel(inj);
  const rd = injRehabDays(inj, today), best = Math.max(0, ...Object.values(inj.log || {}).map(x => (x && x.feel) || 0));
  if (now != null && prev != null && now - prev >= 0.8) out.push(['📈', 'Up ' + r1(now - prev) + ' points on last week', 'It’s working. Keep the rehab rolling — steady beats heroic.']);
  else if (now != null && prev != null && prev - now >= 0.8) out.push(['🧭', 'A rougher week', 'Setbacks are a normal part of healing. Ease the load a notch (not to zero), keep moving, and check the red flags below.']);
  if (last && last.feel >= 8) out.push(['🏁', 'Home stretch', 'Feeling ' + last.feel + '/10. Build load back slowly — the last 20% is where re-injury happens.']);
  else if (last && last.feel === best && best >= 5 && Object.keys(inj.log || {}).length > 2) out.push(['⭐', 'Best day yet', last.feel + '/10 is your highest since this started.']);
  if (rd >= 5) out.push(['🔥', 'Rehab ' + rd + ' of the last 7 days', 'That consistency is exactly what heals tissue.']);
  else if ((inj.rehab || []).length) out.push(['🌱', rd ? 'Rehab ' + rd + ' of the last 7 days' : 'Start small today', 'Even one exercise, most days, speeds things up. Pick the easiest one and tick it off.']);
  if (lib) {
    const [lo, hi] = lib.time, wk = day / 7;
    if (wk <= hi) out.push(['🗓', 'Day ' + day, 'Typical recovery is ' + lo + '–' + hi + ' weeks, so you’re ' + (wk < lo ? 'early in the process — be patient with it.' : 'right on schedule.')]);
    else out.push(['🩺', 'Taking longer than typical', 'Day ' + day + ' is past the usual ' + lo + '–' + hi + ' weeks. Worth seeing a physio if you haven’t — a plan made for you helps.']);
  }
  if (!out.length) out.push(['💪', 'You’re doing the right things', 'Check in daily and tick off your rehab — the trend will show up here.']);
  return out.slice(0, 3);
}

// Warn during a workout when an exercise may load a current injury.
function injuriesFor(st, exName) {
  const n = String(exName || '').toLowerCase();
  return (st.injuries || []).filter(i => !i.healed).filter(i => { const lib = injLib(i.key); return (lib ? lib.watch : []).concat(i.watch || []).some(w => w && n.includes(w)); });
}
function InjuryWarn({ st, ex }) {
  const hits = injuriesFor(st, ex && ex.name); if (!hits.length) return null;
  return <div style={{ ...T.label, fontSize: 9.5, lineHeight: 1.45, color: C.amber, marginTop: 4 }}>⚠ GO EASY · {hits.map(i => i.name + (i.side ? ' (' + i.side.toLowerCase() + ')' : '')).join(', ').toUpperCase()} — KEEP PAIN ≤3/10, STOP IF IT SHARPENS</div>;
}

// ── the tab ──
function InjuriesTab({ app, st }) {
  const list = st.injuries || [], active = list.filter(i => !i.healed), healed = list.filter(i => i.healed);
  const [browse, setBrowse] = useState(false), [area, setArea] = useState('All'), [q, setQ] = useState('');
  const [guide, setGuide] = useState(null), [adding, setAdding] = useState(null), [openId, setOpenId] = useState(null), [showHealed, setShowHealed] = useState(false), [basics, setBasics] = useState(false);
  const today = st.curDate;
  const save = fn => app.setState(s => ({ injuries: fn(s.injuries || []) }));
  const showLib = browse || !active.length;
  const libList = INJ_LIB.filter(x => (area === 'All' || x.area === area) && (!q || (x.name + ' ' + x.area + ' ' + x.what).toLowerCase().includes(q.toLowerCase())));
  const card = (inj) => { const f = injFeel(inj), l = (inj.log || {})[today], rs = inj.rehab || [], doneN = l ? (l.done || []).filter(id => rs.some(r => r.id === id)).length : 0;
    const vals = Array.from({ length: 14 }, (_, i) => { const d = addDaysIso(today, i - 13); return (inj.log || {})[d] && inj.log[d].feel; }).filter(Boolean);
    return <Card key={inj.id} accent={f ? feelTone(f.feel) : C.line2} onClick={() => setOpenId(inj.id)} style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={T.name}>{inj.name}</div>
          <div style={{ ...T.label, marginTop: 3 }}>{[inj.area, inj.side, 'DAY ' + injDay(inj, today)].filter(Boolean).join(' · ').toUpperCase()}</div>
        </div>
        {f ? <div style={{ textAlign: 'right' }}><div style={{ font: `800 26px/1 ${F.head}`, color: feelTone(f.feel) }}>{f.feel}<span style={{ fontSize: 13, color: C.mute }}>/10</span></div><div style={{ ...T.label, fontSize: 9, marginTop: 2 }}>{f.date === today ? 'TODAY' : shortDate(f.date).toUpperCase()}</div></div> : null}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
        {vals.length > 1 ? <Sparkline values={vals} tone={f ? feelTone(f.feel) : C.olive} w={90} h={26} /> : null}
        <div style={{ flex: 1, ...T.mono, fontSize: 10, color: l && l.feel ? C.dim : C.blue }}>{l && l.feel ? '✓ CHECKED IN' : 'HOW DOES IT FEEL TODAY? ›'}</div>
        {rs.length ? <div style={{ ...T.mono, fontSize: 10, color: doneN === rs.length ? C.olive : C.dim }}>REHAB {doneN}/{rs.length}</div> : null}
      </div>
    </Card>; };

  return <div style={{ padding: '16px 22px 24px' }}>
    {active.length ? <>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={T.h2}>Current injuries</div><span style={T.label}>{active.length} ACTIVE</span></div>
      {active.map(card)}
      <Btn kind="ghost" tone={C.olive} onClick={() => setBrowse(b => !b)} style={{ marginTop: 6 }}>{browse ? 'HIDE THE INJURY GUIDE' : '+ ADD ANOTHER INJURY'}</Btn>
    </> : <div style={{ marginBottom: 14 }}>
      <div style={T.h2}>Injury tracker</div>
      <div style={{ ...T.body, color: C.dim, marginTop: 6 }}>Something hurting? Find it below (or add your own) to get a care guide, a rehab checklist and a daily check-in that shows your recovery.</div>
    </div>}

    {showLib ? <div style={{ marginTop: active.length ? 18 : 0 }}>
      <div style={{ ...T.label, marginBottom: 8 }}>COMMON INJURIES · TAP FOR THE GUIDE</div>
      <Field value={q} onChange={setQ} placeholder="🔍  Search (e.g. knee, shoulder, strain)" />
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', margin: '10px -22px 10px', padding: '0 22px' }}>{INJ_AREAS.map(a => <Chip key={a} on={area === a} tone={C.olive} ink={C.oliveInk} onClick={() => setArea(a)}>{a.toUpperCase()}</Chip>)}</div>
      {libList.map(x => <div key={x.k} role="button" onClick={() => setGuide(x)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0', borderBottom: '1px solid ' + C.line, cursor: 'pointer' }}>
        <div style={{ flex: 1, minWidth: 0 }}><div style={T.name}>{x.name}</div><div style={{ ...T.label, marginTop: 3 }}>{x.area.toUpperCase()} · USUALLY {x.time[0]}–{x.time[1]} WEEKS</div></div>
        <span style={{ color: C.faint }}>›</span></div>)}
      {!libList.length ? <Empty>NOTHING MATCHES — ADD IT AS YOUR OWN BELOW</Empty> : null}
      <Btn kind="ghost" tone={C.dim} onClick={() => setAdding({ key: null, name: q || '', area: area === 'All' ? '' : area })} style={{ marginTop: 12 }}>+ SOMETHING ELSE (ADD YOUR OWN)</Btn>
    </div> : null}

    <div role="button" onClick={() => setBasics(b => !b)} style={{ marginTop: 22, display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
      <div style={T.h2}>Healing basics</div><span style={{ color: C.dim, transition: 'transform .3s', transform: basics ? 'rotate(180deg)' : 'none' }}>▾</span></div>
    {basics ? <div style={{ marginTop: 10 }}>{GENERAL_CARE.map(([h, t]) => <div key={h} style={{ marginBottom: 10 }}><div style={{ ...T.name, fontSize: 14 }}>{h}</div><div style={{ ...T.body, fontSize: 14, color: C.dim, marginTop: 2 }}>{t}</div></div>)}</div> : null}

    {healed.length ? <div style={{ marginTop: 22 }}>
      <div role="button" onClick={() => setShowHealed(v => !v)} style={{ display: 'flex', justifyContent: 'space-between', cursor: 'pointer' }}><div style={T.h2}>Healed · {healed.length}</div><span style={{ color: C.dim }}>{showHealed ? '▴' : '▾'}</span></div>
      {showHealed ? <div style={{ marginTop: 10 }}>{healed.map(inj => <Card key={inj.id} onClick={() => setOpenId(inj.id)} style={{ marginBottom: 8 }}>
        <div style={T.name}>✓ {inj.name}</div><div style={{ ...T.label, marginTop: 3 }}>{niceDate(inj.start).toUpperCase()} → {niceDate(inj.healed).toUpperCase()} · {Math.round((dOf(inj.healed) - dOf(inj.start)) / 864e5) + 1} DAYS</div></Card>)}</div> : null}
    </div> : null}

    <div style={{ ...T.label, color: C.faint, lineHeight: 1.6, marginTop: 22 }}>GENERAL GUIDANCE, NOT A DIAGNOSIS. IF IT’S SEVERE, NOT IMPROVING, OR A RED FLAG APPEARS, SEE A DOCTOR OR PHYSIO.</div>

    {guide ? <InjuryGuide lib={guide} onClose={() => setGuide(null)} onAdd={() => setAdding({ key: guide.k, name: guide.name, area: guide.area })} /> : null}
    {adding ? <InjuryEdit draft={adding} today={today} onClose={() => setAdding(null)} onSave={d => {
      const lib = injLib(d.key), inj = { id: 'inj' + uid(), key: d.key, name: d.name.trim() || 'Injury', area: d.area || (lib && lib.area) || '', side: d.side || '', start: d.start || today, note: d.note || '',
        rehab: (lib ? lib.rehab : []).map(r => ({ id: uid(), ...r })), log: d.feel ? { [today]: { feel: d.feel, done: [] } } : {}, healed: null };
      save(l => l.concat(inj)); setAdding(null); setGuide(null); setBrowse(false); setOpenId(inj.id); vib(15); }} /> : null}
    {openId && list.find(i => i.id === openId) ? <InjuryDetail inj={list.find(i => i.id === openId)} today={today} save={save} onClose={() => setOpenId(null)} /> : null}
  </div>;
}

// The full guide for one injury (from the library, or for one you're tracking).
function GuideBody({ lib, phase }) {
  const [openP, setOpenP] = useState(phase != null ? phase : 0);
  const sec = (title, children, tone) => <div style={{ marginTop: 18 }}><div style={{ ...T.label, color: tone || C.mute, marginBottom: 6 }}>{title}</div>{children}</div>;
  const bullets = (arr, mark = '•', tone = C.dim) => arr.map((t, i) => <div key={i} style={{ display: 'flex', gap: 8, ...T.body, fontSize: 14, color: C.text, marginBottom: 5 }}><span style={{ color: tone, flex: 'none' }}>{mark}</span><span>{t}</span></div>);
  return <>
    <div style={{ ...T.body, color: C.dim }}>{lib.what}</div>
    <div style={{ ...T.label, marginTop: 8 }}>USUAL RECOVERY · {lib.time[0]}–{lib.time[1]} WEEKS (MILD ONES FASTER)</div>
    {sec('COMMON SIGNS', bullets(lib.signs))}
    {sec('WHAT TO DO, STAGE BY STAGE', lib.phases.map((p, i) => <div key={i} style={{ marginBottom: 6, border: '1px solid ' + (openP === i ? C.olive : C.line), borderRadius: 12, overflow: 'hidden' }}>
      <div role="button" onClick={() => setOpenP(openP === i ? -1 : i)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 12px', cursor: 'pointer' }}>
        <span style={{ ...T.mono, fontSize: 11, color: openP === i ? C.olive : C.faint }}>{i + 1}</span><span style={{ ...T.name, flex: 1 }}>{PHASE_NAMES[i]}</span>
        {phase === i ? <span style={{ ...T.mono, fontSize: 9, color: C.oliveInk, background: C.olive, borderRadius: 99, padding: '4px 7px' }}>YOU’RE HERE</span> : null}</div>
      {openP === i ? <div style={{ padding: '0 12px 8px' }}>{bullets(p, '→', C.olive)}</div> : null}
    </div>))}
    {sec('TRAIN AROUND IT', <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
      <Card style={{ padding: 10 }}><div style={{ ...T.label, color: C.red, marginBottom: 6 }}>EASE OFF</div>{bullets(lib.avoid, '×', C.red)}</Card>
      <Card style={{ padding: 10 }}><div style={{ ...T.label, color: C.olive, marginBottom: 6 }}>USUALLY OK</div>{bullets(lib.ok, '✓', C.olive)}</Card></div>)}
    {sec('SEE A DOCTOR / PHYSIO IF', <Card accent={C.red} style={{ padding: 12 }}>{bullets(lib.flags, '!', C.red)}</Card>, C.red)}
  </>;
}
function InjuryGuide({ lib, onClose, onAdd }) {
  return <Sheet z={55} title={lib.name} sub={lib.area.toUpperCase() + ' · GUIDE'} left={<TopLink onClick={onClose}>‹ BACK</TopLink>}
    footer={<Btn tone={C.olive} ink={C.oliveInk} onClick={onAdd}>I have this · start tracking</Btn>}>
    <div style={{ padding: '14px 18px 30px' }}>
      <GuideBody lib={lib} />
      <div style={{ ...T.label, marginTop: 18, marginBottom: 6 }}>REHAB EXERCISES (ADDED TO YOUR CHECKLIST)</div>
      {lib.rehab.map((r, i) => <div key={i} style={{ padding: '9px 0', borderBottom: '1px solid ' + C.line }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><span style={T.name}>{r.n}</span><span style={{ ...T.mono, fontSize: 11, color: C.olive }}>{r.dose}</span></div><div style={{ ...T.body, fontSize: 13, color: C.dim, marginTop: 2 }}>{r.how}</div></div>)}
      <div style={{ ...T.label, color: C.faint, lineHeight: 1.6, marginTop: 16 }}>GENERAL GUIDANCE, NOT A DIAGNOSIS · IF A CLINICIAN GAVE YOU A PLAN, FOLLOW THAT FIRST</div>
    </div>
  </Sheet>;
}

// Add / edit an injury's details.
function InjuryEdit({ draft, today, onClose, onSave, onDelete }) {
  const [d, setD] = useState({ side: '', start: today, note: '', feel: 0, ...draft });
  const set = k => v => setD(x => ({ ...x, [k]: v }));
  return <Sheet z={60} title={draft.id ? 'Edit injury' : 'Track an injury'} left={<TopLink onClick={onClose}>‹ BACK</TopLink>}
    footer={<Btn tone={C.olive} ink={C.oliveInk} disabled={!String(d.name || '').trim()} onClick={() => onSave(d)}>{draft.id ? 'Save' : 'Start tracking'}</Btn>}>
    <div style={{ padding: '14px 18px 30px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Field label="NAME" value={d.name} onChange={set('name')} placeholder="e.g. Left shoulder" autoFocus={!d.name} />
      <div><div style={{ ...T.label, marginBottom: 6 }}>AREA</div><div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{INJ_AREAS.slice(1).concat('Other').map(a => <Chip key={a} on={d.area === a} tone={C.olive} ink={C.oliveInk} onClick={() => set('area')(a)}>{a.toUpperCase()}</Chip>)}</div></div>
      <div><div style={{ ...T.label, marginBottom: 6 }}>SIDE</div><Seg items={[['', 'N/A'], ['Left', 'LEFT'], ['Right', 'RIGHT'], ['Both', 'BOTH']]} value={d.side} onChange={set('side')} tone={C.olive} ink={C.oliveInk} /></div>
      <label><div style={{ ...T.label, marginBottom: 5 }}>WHEN DID IT START?</div>
        <input type="date" value={d.start} max={today} onChange={e => set('start')(e.target.value || today)} style={{ width: '100%', boxSizing: 'border-box', background: C.card, border: '1px solid ' + C.line2, color: C.text, font: `500 16px/1.2 ${F.body}`, padding: '10px', outline: 'none', borderRadius: 10 }} /></label>
      {!draft.id ? <div><div style={{ ...T.label, marginBottom: 6 }}>HOW DOES IT FEEL RIGHT NOW? (10 = NORMAL)</div><FeelPicker value={d.feel} onChange={set('feel')} /></div> : null}
      <div><div style={{ ...T.label, marginBottom: 5 }}>NOTES (WHAT HAPPENED, WHAT YOUR PHYSIO SAID…)</div>
        <textarea value={d.note} onChange={e => set('note')(e.target.value)} rows={3} style={{ width: '100%', boxSizing: 'border-box', background: C.card, border: '1px solid ' + C.line2, color: C.text, font: `400 16px/1.4 ${F.body}`, padding: 10, outline: 'none', resize: 'none', borderRadius: 10 }} /></div>
      {onDelete ? <Btn kind="danger" onClick={onDelete}>DELETE THIS INJURY</Btn> : null}
    </div>
  </Sheet>;
}
function FeelPicker({ value, onChange }) {
  return <div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 4 }}>
      {Array.from({ length: 10 }, (_, i) => i + 1).map(v => <div key={v} role="button" aria-label={'Feels ' + v + ' out of 10'} onClick={() => { onChange(value === v ? 0 : v); vib(6); }}
        style={{ height: 42, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', font: `700 15px/1 ${F.mono}`,
          background: value === v ? feelTone(v) : C.card, color: value === v ? C.solid : C.dim, border: '1px solid ' + (value === v ? feelTone(v) : C.line) }}>{v}</div>)}
    </div>
    <div style={{ display: 'flex', justifyContent: 'space-between', ...T.label, fontSize: 9, marginTop: 5 }}><span>WORST</span><span style={{ color: value ? feelTone(value) : C.faint }}>{value ? FEEL_WORD[value].toUpperCase() : ''}</span><span>NORMAL</span></div>
  </div>;
}

// One injury: daily check-in, rehab checklist, trend, encouragement, the guide, and editing.
function InjuryDetail({ inj, today, save, onClose }) {
  const lib = injLib(inj.key), [day, setDay] = useState(today), [edit, setEdit] = useState(false), [rehabEdit, setRehabEdit] = useState(false), [menu, setMenu] = useState(null);
  const log = inj.log || {}, entry = log[day] || {}, rs = inj.rehab || [], doneIds = entry.done || [];
  const upd = fn => save(l => l.map(x => x.id === inj.id ? fn(x) : x));
  const setEntry = fn => upd(x => { const e = fn({ ...((x.log || {})[day] || {}) }); return { ...x, log: { ...(x.log || {}), [day]: e } }; });
  const days = Array.from({ length: 7 }, (_, i) => addDaysIso(today, i - 6)).filter(d => d >= inj.start);
  const pts = Object.keys(log).filter(d => log[d] && log[d].feel).sort().map(d => ({ x: d, y: log[d].feel }));
  const phase = injPhase(inj, today), cheer = injCheer(inj, today);
  const updR = (id, patch) => upd(x => ({ ...x, rehab: (x.rehab || []).map(r => r.id === id ? { ...r, ...patch } : r) }));
  const inpS = { background: C.card, border: '1px solid ' + C.line2, color: C.text, font: `500 16px/1.2 ${F.body}`, padding: '8px 9px', outline: 'none', borderRadius: 9, minWidth: 0, boxSizing: 'border-box' };
  return <Sheet z={55} title={inj.name} sub={[inj.side, 'DAY ' + injDay(inj, today), inj.healed ? 'HEALED ' + niceDate(inj.healed) : 'SINCE ' + niceDate(inj.start)].filter(Boolean).join(' · ').toUpperCase()}
    left={<TopLink onClick={onClose}>‹ BACK</TopLink>} right={<TopLink tone={C.olive} onClick={() => setMenu({ title: inj.name, actions: [
      { label: 'Edit details', run: () => setEdit(true) },
      inj.healed ? { label: 'Reopen (it’s back)', run: () => upd(x => ({ ...x, healed: null })) } : { label: 'Mark as healed 🎉', run: () => { upd(x => ({ ...x, healed: today })); celebrate('Healed!', [inj.name + ' · ' + injDay(inj, today) + ' days']); onClose(); } },
      { label: 'Delete', danger: true, run: () => { if (confirm('Delete ' + inj.name + ' and its check-ins?')) { save(l => l.filter(x => x.id !== inj.id)); onClose(); } } }] })}>•••</TopLink>}>
    <div style={{ padding: '14px 18px 34px' }}>
      <div style={{ display: 'flex', gap: 5, overflowX: 'auto', margin: '0 -18px 12px', padding: '0 18px' }}>
        {days.map(d => { const f = log[d] && log[d].feel; return <div key={d} role="button" onClick={() => setDay(d)} style={{ flex: 'none', width: 44, padding: '7px 0', textAlign: 'center', borderRadius: 11, cursor: 'pointer', border: '1px solid ' + (d === day ? C.olive : C.line), background: d === day ? C.card : 'transparent' }}>
          <div style={{ ...T.label, fontSize: 8.5, color: d === day ? C.olive : C.mute }}>{d === today ? 'TODAY' : WD[dOf(d).getDay()].toUpperCase()}</div>
          <div style={{ font: `700 15px/1 ${F.head}`, marginTop: 4, color: f ? feelTone(f) : C.faint }}>{f || '·'}</div></div>; })}
      </div>

      <div style={T.label}>HOW DOES IT FEEL {day === today ? 'TODAY' : 'ON ' + niceDate(day).toUpperCase()}?</div>
      <div style={{ marginTop: 8 }}><FeelPicker value={entry.feel || 0} onChange={v => setEntry(e => ({ ...e, feel: v || undefined }))} /></div>
      <textarea value={entry.note || ''} onChange={ev => { const v = ev.target.value; setEntry(e => ({ ...e, note: v })); }} rows={2} placeholder="Note (what helped, what flared it…)"
        style={{ width: '100%', boxSizing: 'border-box', marginTop: 10, background: C.card, border: '1px solid ' + C.line2, color: C.text, font: `400 16px/1.4 ${F.body}`, padding: 10, outline: 'none', resize: 'none', borderRadius: 10 }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 18 }}>
        <div style={T.label}>REHAB {day === today ? 'TODAY' : niceDate(day).toUpperCase()} · {doneIds.filter(id => rs.some(r => r.id === id)).length}/{rs.length}</div>
        <span role="button" onClick={() => setRehabEdit(v => !v)} style={{ ...T.mono, fontSize: 11, color: C.olive, cursor: 'pointer', padding: '6px 0' }}>{rehabEdit ? 'DONE' : 'EDIT LIST'}</span></div>
      {rehabEdit ? <div style={{ marginTop: 8 }}>
        {rs.map(r => <div key={r.id} style={{ display: 'flex', gap: 6, marginBottom: 6, alignItems: 'center' }}>
          <input value={r.n} onChange={e => updR(r.id, { n: e.target.value })} style={{ ...inpS, flex: 2 }} />
          <input value={r.dose || ''} placeholder="3 × 12" onChange={e => updR(r.id, { dose: e.target.value })} style={{ ...inpS, flex: 1 }} />
          <span role="button" aria-label="Remove" onClick={() => upd(x => ({ ...x, rehab: x.rehab.filter(y => y.id !== r.id) }))} style={{ width: 36, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.red, cursor: 'pointer', fontSize: 18 }}>×</span></div>)}
        <Btn kind="ghost" tone={C.olive} onClick={() => upd(x => ({ ...x, rehab: (x.rehab || []).concat({ id: uid(), n: 'New exercise', dose: '3 × 10', how: '' }) }))} style={{ minHeight: 42 }}>+ ADD EXERCISE</Btn>
        {lib && lib.rehab.some(r => !rs.some(y => y.n === r.n)) ? <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>{lib.rehab.filter(r => !rs.some(y => y.n === r.n)).map(r => <Chip key={r.n} tone={C.olive} onClick={() => upd(x => ({ ...x, rehab: (x.rehab || []).concat({ id: uid(), ...r }) }))}>+ {r.n}</Chip>)}</div> : null}
      </div> : <div style={{ marginTop: 8 }}>
        {rs.length ? rs.map(r => { const on = doneIds.includes(r.id);
          return <div key={r.id} role="button" onClick={() => { vib(8); setEntry(e => ({ ...e, done: on ? (e.done || []).filter(x => x !== r.id) : (e.done || []).concat(r.id) })); }}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', marginBottom: 6, borderRadius: 12, cursor: 'pointer', border: '1px solid ' + (on ? C.olive : C.line), background: on ? 'rgba(168,242,92,.12)' : C.card }}>
            <div style={{ width: 24, height: 24, borderRadius: 8, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', background: on ? C.olive : 'transparent', border: '2px solid ' + (on ? C.olive : C.line2), color: C.oliveInk, font: `700 13px/1 ${F.mono}` }}>{on ? '✓' : ''}</div>
            <div style={{ flex: 1, minWidth: 0 }}><div style={{ ...T.name, fontSize: 14, textDecoration: on ? 'line-through' : 'none', color: on ? C.dim : C.text }}>{r.n}</div>{r.how ? <div style={{ ...T.body, fontSize: 12, color: C.dim, marginTop: 1 }}>{r.how}</div> : null}</div>
            <span style={{ ...T.mono, fontSize: 11, color: C.olive, flex: 'none' }}>{r.dose}</span></div>; })
          : <Empty>NO REHAB EXERCISES YET — TAP EDIT LIST TO ADD SOME</Empty>}
      </div>}

      <div style={{ marginTop: 18 }}>{cheer.map(([ic, h, t], i) => <div key={i} style={{ display: 'flex', gap: 10, padding: '11px 12px', marginBottom: 6, borderRadius: 12, background: C.card, border: '1px solid ' + C.line }}>
        <span style={{ fontSize: 20, lineHeight: 1 }}>{ic}</span><div><div style={{ ...T.name, fontSize: 14 }}>{h}</div><div style={{ ...T.body, fontSize: 13, color: C.dim, marginTop: 2 }}>{t}</div></div></div>)}</div>

      <div style={{ ...T.label, margin: '18px 0 8px' }}>HOW IT’S FELT · 10 = NORMAL · REHAB {injRehabDays(inj, today)} OF LAST 7 DAYS</div>
      <LineChart points={pts} tone={pts.length ? feelTone(pts[pts.length - 1].y) : C.olive} fmt={v => r1(v) + '/10'} height={150} />

      {inj.note ? <div style={{ marginTop: 16 }}><div style={T.label}>NOTES</div><div style={{ ...T.body, color: C.dim, marginTop: 4, whiteSpace: 'pre-wrap' }}>{inj.note}</div></div> : null}

      {lib ? <div style={{ marginTop: 22 }}><div style={{ ...T.h2, marginBottom: 10 }}>Care guide</div><GuideBody lib={lib} phase={phase} /></div>
        : <div style={{ marginTop: 22 }}><div style={{ ...T.h2, marginBottom: 10 }}>Healing basics</div>{GENERAL_CARE.map(([h, t]) => <div key={h} style={{ marginBottom: 10 }}><div style={{ ...T.name, fontSize: 14 }}>{h}</div><div style={{ ...T.body, fontSize: 14, color: C.dim, marginTop: 2 }}>{t}</div></div>)}</div>}

      {Object.keys(log).length ? <div style={{ marginTop: 22 }}><div style={{ ...T.label, marginBottom: 6 }}>CHECK-IN HISTORY · TAP A DAY ABOVE TO EDIT</div>
        {Object.keys(log).sort().reverse().slice(0, 30).map(d => { const e = log[d] || {}; const n = (e.done || []).filter(id => rs.some(r => r.id === id)).length;
          return <div key={d} role="button" onClick={() => { if (d >= addDaysIso(today, -6)) setDay(d); }} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: '1px solid ' + C.line, cursor: 'pointer' }}>
            <span style={{ ...T.mono, fontSize: 11, color: C.dim, width: 84, flex: 'none' }}>{shortDate(d).toUpperCase()}</span>
            <span style={{ ...T.mono, fontSize: 11, width: 44, flex: 'none', color: e.feel ? feelTone(e.feel) : C.faint }}>{e.feel ? e.feel + '/10' : '—'}</span>
            <span style={{ flex: 1, minWidth: 0, ...T.body, fontSize: 13, color: C.dim, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{[n ? n + ' rehab' : '', e.note].filter(Boolean).join(' · ')}</span></div>; })}
      </div> : null}
      <div style={{ ...T.label, color: C.faint, lineHeight: 1.6, marginTop: 20 }}>GENERAL GUIDANCE, NOT A DIAGNOSIS. IF IT’S SEVERE, NOT IMPROVING, OR A RED FLAG APPEARS, SEE A DOCTOR OR PHYSIO.</div>
    </div>
    {edit ? <InjuryEdit draft={inj} today={today} onClose={() => setEdit(false)} onSave={d => { upd(x => ({ ...x, name: d.name.trim() || x.name, area: d.area, side: d.side, start: d.start || x.start, note: d.note })); setEdit(false); }}
      onDelete={() => { if (confirm('Delete ' + inj.name + ' and its check-ins?')) { save(l => l.filter(x => x.id !== inj.id)); onClose(); } }} /> : null}
    {menu ? <ActionSheet {...menu} onClose={() => setMenu(null)} /> : null}
  </Sheet>;
}
window.InjuriesTab = InjuriesTab;
