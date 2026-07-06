// Program generator. Deterministic: the same calendar week always produces the
// same workouts on every device, so Luke's and Kristen's phones stay in sync
// with no server.
//
// Structure: 4-week blocks. Anchor lifts stay fixed within a block (that's how
// you progress), accessories rotate every week (that's how it stays fun).

// Monday 2026-01-05 = week 0. Every week is anchored to its Monday.
const PROGRAM_EPOCH = new Date(2026, 0, 5);

function mondayOf(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay(); // 0 Sun ... 6 Sat
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return d;
}

function weekNum(date) {
  return Math.round((mondayOf(date) - PROGRAM_EPOCH) / (7 * 24 * 3600 * 1000));
}

function weekKey(date) {
  const m = mondayOf(date);
  return m.getFullYear() + '-' + String(m.getMonth() + 1).padStart(2, '0') + '-' + String(m.getDate()).padStart(2, '0');
}

// ---- Blocks: anchors are fixed for 4 weeks so weights can climb ----
const BLOCKS = [
  {
    name: 'Foundation',
    focus: 'Re-grooving the big patterns. Leave 2-3 reps in the tank on everything week 1.',
    anchors: { squat: 'bb_back_squat', hinge: 'bb_rdl', hpush: 'db_bench', pull: 'lat_pulldown' },
    anchorSets: { luke: 3, kristen: 3 },
  },
  {
    name: 'Build',
    focus: 'New anchors, slightly heavier and lower reps. Push the last set of each anchor.',
    anchors: { squat: 'goblet_squat', hinge: 'bb_deadlift', hpush: 'bb_ohp', pull: 'bb_row' },
    anchorSets: { luke: 4, kristen: 3 },
  },
  {
    name: 'Strength',
    focus: 'Heaviest block of the cycle. Rest a full 2 minutes between anchor sets.',
    anchors: { squat: 'bb_back_squat', hinge: 'bb_hip_thrust', hpush: 'db_incline_bench', pull: 'pullup' },
    anchorSets: { luke: 4, kristen: 3 },
  },
  {
    name: 'Athletic',
    focus: 'More single-leg and pressing power. Move the weights with intent.',
    anchors: { squat: 'db_front_squat', hinge: 'bb_deadlift', hpush: 'bb_bench', pull: 'cable_row' },
    anchorSets: { luke: 4, kristen: 3 },
  },
];

// ---- Weekly-rotating accessory pools (offset keeps pairs from syncing up) ----
const POOLS = {
  lunge:        ['db_rev_lunge', 'bulgarian_ss', 'db_stepup', 'db_walking_lunge', 'lateral_lunge'],
  glute:        ['bb_hip_thrust', 'glute_bridge', 'stability_ham_curl', 'sl_glute_bridge', 'banded_walk'],
  push2:        ['db_shoulder_press', 'pushup', 'arnold_press', 'db_floor_press', 'db_push_press'],
  pull2:        ['db_row', 'chest_sup_row', 'cable_row', 'band_row', 'chinup'],
  shoulder_acc: ['lateral_raise', 'band_face_pull', 'rear_delt_fly', 'band_pull_apart', 'db_shrug'],
  biceps:       ['ez_curl', 'db_curl', 'hammer_curl', 'cable_curl'],
  triceps:      ['tricep_pushdown', 'skullcrusher', 'oh_tricep_ext'],
  coreA:        ['ab_wheel', 'dead_bug', 'hanging_knee_raise', 'pallof_press', 'stir_the_pot', 'vups'],
  coreB:        ['plank', 'side_plank', 'situp_abmat', 'russian_twist', 'hollow_hold', 'bird_dog'],
  // circuit station pools — one pick per slot each week
  c_lower:      ['kb_goblet_pulse', 'db_thruster', 'box_stepover', 'bosu_squat', 'wall_ball_thruster'],
  c_power:      ['kb_swing_circuit', 'slam_ball', 'box_jump', 'med_ball_chest_pass'],
  c_push:       ['pushup', 'db_floor_press', 'db_push_press', 'arnold_press'],
  c_pull:       ['band_row', 'db_row', 'band_pulldown', 'chest_sup_row'],
  c_engine:     ['row_sprint', 'bike_sprint', 'jump_rope', 'agility_ladder', 'treadmill_incline'],
  c_core:       ['mountain_climber', 'russian_twist', 'plank', 'vups', 'hollow_hold', 'situp_abmat'],
  c_carry:      ['farmer_carry', 'burpee', 'kb_swing_circuit', 'slam_ball'],
};

function pick(poolName, week, offset) {
  const pool = POOLS[poolName];
  return pool[((week + (offset || 0)) % pool.length + pool.length) % pool.length];
}

// ---- Circuit formats rotate weekly for the F45 flavor ----
const CIRCUIT_FORMATS = [
  { name: 'Classic Stations', desc: '6 stations · 40s work / 20s rest · 3 rounds', work: 40, rest: 20, rounds: 3, stations: 6 },
  { name: 'Long Grind', desc: '6 stations · 45s work / 15s rest · 3 rounds', work: 45, rest: 15, rounds: 3, stations: 6 },
  { name: 'Power Intervals', desc: '6 stations · 30s hard / 30s rest · 3 rounds', work: 30, rest: 30, rounds: 3, stations: 6 },
  { name: 'The Gauntlet', desc: '6 stations · 40s work / 20s rest · 3 rounds, station order reverses each round', work: 40, rest: 20, rounds: 3, stations: 6 },
];

const WARMUPS = [
  '3 min easy bike or row, then 10 bodyweight squats + 10 band pull-aparts',
  '3 min jump rope (break as needed), then 10 walking lunges + 10 arm circles each way',
  '3 min brisk incline treadmill walk, then 10 glute bridges + 10 push-ups to a comfortable depth',
  '2 min row + 1 trip down the agility ladder x2, then 10 KB deadlifts with a light bell',
];

// Week 4 of every block = deload
function isDeloadWeek(week) { return week % 4 === 3; }

/**
 * Build the full week: { week, weekKey, block, blockName, weekOfBlock, deload, days: {A, B, C} }
 * Each day: { type, title, warmup, slots: [...] }
 * Slot: { exId, sets: {luke, kristen}, reps: [lo, hi], anchor, bonus, superset, note }
 *   bonus: true → Kristen (30-min cap) skips it; Luke does it.
 * Circuit day instead has: { format, stations: [exId...], finisher: {...} }
 */
function buildWeek(date) {
  const week = weekNum(date);
  const blockIdx = ((Math.floor(week / 4) % BLOCKS.length) + BLOCKS.length) % BLOCKS.length;
  const block = BLOCKS[blockIdx];
  const weekOfBlock = ((week % 4) + 4) % 4 + 1; // 1..4
  const deload = isDeloadWeek(week);
  const aSets = block.anchorSets;

  const dayA = {
    type: 'A', title: 'Lower Body + Core',
    warmup: WARMUPS[((week % WARMUPS.length) + WARMUPS.length) % WARMUPS.length],
    slots: [
      { exId: block.anchors.squat, sets: aSets, reps: EXERCISES[block.anchors.squat].reps, anchor: true, rest: 120 },
      { exId: block.anchors.hinge, sets: aSets, reps: EXERCISES[block.anchors.hinge].reps, anchor: true, rest: 120 },
      { exId: pick('lunge', week, 0), sets: { luke: 3, kristen: 2 }, reps: null, superset: 1, rest: 60 },
      { exId: pick('glute', week, 2), sets: { luke: 3, kristen: 2 }, reps: null, superset: 1, rest: 60 },
      { exId: pick('coreA', week, 0), sets: { luke: 3, kristen: 2 }, reps: null, superset: 2, rest: 45 },
      { exId: pick('coreB', week, 3), sets: { luke: 3, kristen: 2 }, reps: null, superset: 2, rest: 45, bonus: true },
    ],
  };
  // avoid the same hip-thrust twice in one day when the block anchor is hip thrust
  if (dayA.slots[1].exId === dayA.slots[3].exId || dayA.slots[3].exId === block.anchors.hinge) {
    dayA.slots[3].exId = pick('glute', week + 1, 2) === dayA.slots[1].exId ? 'stability_ham_curl' : pick('glute', week + 1, 2);
  }

  const dayB = {
    type: 'B', title: 'Upper Body',
    warmup: WARMUPS[((week + 1) % WARMUPS.length + WARMUPS.length) % WARMUPS.length],
    slots: [
      { exId: block.anchors.hpush, sets: aSets, reps: EXERCISES[block.anchors.hpush].reps, anchor: true, rest: 120 },
      { exId: block.anchors.pull, sets: aSets, reps: EXERCISES[block.anchors.pull].reps, anchor: true, rest: 120 },
      { exId: pick('push2', week, 0), sets: { luke: 3, kristen: 2 }, reps: null, superset: 1, rest: 60 },
      { exId: pick('pull2', week, 1), sets: { luke: 3, kristen: 2 }, reps: null, superset: 1, rest: 60 },
      { exId: pick('biceps', week, 0), sets: { luke: 3, kristen: 2 }, reps: null, superset: 2, rest: 45 },
      { exId: pick('triceps', week, 0), sets: { luke: 3, kristen: 2 }, reps: null, superset: 2, rest: 45 },
      { exId: pick('shoulder_acc', week, 0), sets: { luke: 2, kristen: 2 }, reps: null, rest: 45, bonus: true },
    ],
  };
  // don't double up if a rotating pick collides with an anchor
  for (const slot of dayB.slots.slice(2)) {
    if (slot.exId === block.anchors.hpush || slot.exId === block.anchors.pull) {
      const poolName = slot === dayB.slots[2] ? 'push2' : slot === dayB.slots[3] ? 'pull2' : null;
      if (poolName) slot.exId = pick(poolName, week + 1, 0);
    }
  }

  const fmt = CIRCUIT_FORMATS[((week % CIRCUIT_FORMATS.length) + CIRCUIT_FORMATS.length) % CIRCUIT_FORMATS.length];
  const dayC = {
    type: 'C', title: 'Total Body Circuit',
    warmup: WARMUPS[((week + 2) % WARMUPS.length + WARMUPS.length) % WARMUPS.length],
    format: fmt,
    stations: [
      pick('c_lower', week, 0),
      pick('c_power', week, 0),
      pick('c_push', week, 1),
      pick('c_pull', week, 2),
      pick('c_engine', week, 0),
      pick('c_core', week, 1),
    ],
    // Luke-only finisher to fill his extra 10 minutes
    finisher: { exId: pick('c_carry', week, 1), desc: '3 rounds: 30-45s on / 30s off. Luke only — Kristen is done!' },
  };
  // no duplicate stations
  const seen = new Set();
  const backups = ['burpee', 'jump_rope', 'mountain_climber', 'farmer_carry', 'box_stepover', 'dead_bug'];
  dayC.stations = dayC.stations.map(id => {
    if (!seen.has(id)) { seen.add(id); return id; }
    const alt = backups.find(b => !seen.has(b));
    seen.add(alt); return alt;
  });
  if (seen.has(dayC.finisher.exId)) dayC.finisher.exId = backups.find(b => !seen.has(b)) || 'farmer_carry';

  // fill default reps from the exercise DB
  for (const day of [dayA, dayB]) {
    for (const s of day.slots) if (!s.reps) s.reps = EXERCISES[s.exId].reps;
  }

  return {
    week, weekKey: weekKey(date), block: blockIdx, blockName: block.name,
    blockFocus: block.focus, weekOfBlock, deload,
    days: { A: dayA, B: dayB, C: dayC },
  };
}

// ---- Progression suggestion ----
// Looks at the user's last logged session for this exercise:
//  - all sets at/above the top of the rep range → suggest adding load
//  - any set below the bottom of the range → suggest holding
//  - otherwise → same weight, chase more reps
function suggestProgress(lastSets, reps, exId) {
  if (!lastSets || !lastSets.length) return null;
  const ex = EXERCISES[exId];
  if (ex.unit !== 'lb') {
    const top = reps[1];
    const allTop = lastSets.every(s => (s.r || 0) >= top);
    return allTop ? { msg: 'You maxed the rep range last time — add a rep or two, or slow the tempo.' } : null;
  }
  const [lo, hi] = reps;
  const weights = lastSets.map(s => s.w || 0).filter(w => w > 0);
  if (!weights.length) return null;
  const topWeight = Math.max(...weights);
  const allAtTop = lastSets.every(s => (s.r || 0) >= hi && (s.w || 0) >= topWeight);
  const anyBelow = lastSets.some(s => (s.r || 0) > 0 && (s.r || 0) < lo);
  const lowerBody = ['squat', 'hinge', 'lunge', 'glute'].includes(ex.cat);
  const inc = lowerBody ? 10 : 5;
  if (allAtTop) return { msg: `You hit ${hi}+ reps on every set at ${topWeight} lb. Go ${topWeight + inc} lb today. 📈`, target: topWeight + inc };
  if (anyBelow) return { msg: `Stay at ${topWeight} lb and own the rep range first.`, target: topWeight };
  return { msg: `${topWeight} lb again — try to beat last time's reps.`, target: topWeight };
}
