// On-demand "Extra session" circuit builder. Not part of the 3-day program —
// it's for the friend-comes-over day, a 4th session, or any time someone wants
// more. Deterministic per day + shuffle count (like the cardio generator), so
// a phone mirroring to the TV shows the same circuit as the one that built it.

const EXTRA_DURS = [20, 30, 40];

const EXTRA_FOCUS = {
  mix:     { label: '🎲 F45 mix',       blurb: 'Cardio machines woven between weights — the classic Friday feel.' },
  engine:  { label: '🫀 Cardio-heavy',  blurb: 'Rower, bike, rope, driveway. Weights are the breather.' },
  iron:    { label: '🏋️ Weights-heavy', blurb: 'KB snatches, push presses, thrusters. One engine hit to keep it honest.' },
};

const EXTRA_INTENSITY = {
  standard: { label: '💪 Standard', work: 0,  rest: 0,  breakAdj: 0,   finisher: false },
  hard:     { label: '🔥 Hard',     work: 5,  rest: -5, breakAdj: -15, finisher: true },
};

// Base formats by duration (before the intensity tweak). ~2 min under target
// so the warm-up fits.
const EXTRA_BASE = {
  20: { stations: 6, work: 40, rest: 20, rounds: 3, roundBreak: 45 },
  30: { stations: 8, work: 40, rest: 20, rounds: 3, roundBreak: 60 },
  40: { stations: 8, work: 45, rest: 15, rounds: 4, roundBreak: 60 },
};

// Slot recipes: which pool feeds each station, in order. Take the first N.
const EXTRA_RECIPES = {
  mix:    ['x_engine', 'x_power', 'x_lower', 'c_push', 'x_engine', 'x_pull', 'x_core', 'x_power', 'x_engine', 'c_carry'],
  engine: ['x_engine', 'x_power', 'x_engine', 'x_core', 'x_engine', 'x_lower', 'x_engine', 'x_power', 'x_engine', 'c_carry'],
  iron:   ['x_power', 'x_lower', 'c_push', 'x_pull', 'x_power', 'x_core', 'x_lower', 'x_engine', 'c_push', 'c_carry'],
};

// Extra-session-only pools (everything else comes from POOLS in program.js).
// Deliberately wide so the whole garage gets used: machines, driveway, rope,
// ladder, cones, KBs, DBs, med/slam balls, bosu, boxes, bands, pull-up bar,
// rack pulleys, stability ball, ab wheel.
const EXTRA_POOLS = {
  x_engine: ['row_sprint', 'bike_sprint', 'driveway_run', 'jump_rope', 'shuttle_run', 'treadmill_incline', 'agility_ladder', 'row_sprint', 'bike_sprint', 'driveway_run', 'lateral_hop', 'skater_bound'],
  x_power:  ['kb_snatch', 'db_push_press', 'kb_swing_circuit', 'db_thruster', 'kb_clean_press', 'slam_ball', 'db_snatch', 'devils_press', 'wall_ball_thruster', 'box_jump', 'med_ball_chest_pass', 'jump_squat'],
  x_lower:  ['kb_goblet_pulse', 'box_stepover', 'bosu_squat', 'sumo_squat', 'weighted_stepover', 'heel_elevated_goblet', 'db_rev_lunge', 'lateral_lunge', 'db_stepup', 'pendulum_lunge', 'glute_bridge', 'sl_rdl'],
  x_pull:   ['band_row', 'db_row', 'band_pulldown', 'chest_sup_row', 'renegade_row', 'bb_inverted_row', 'pullup', 'lat_pulldown', 'cable_row', 'band_face_pull'],
  x_core:   ['mountain_climber', 'russian_twist', 'plank', 'vups', 'hollow_hold', 'situp_abmat', 'plank_shoulder_tap', 'bicycle_crunch', 'flutter_kick', 'med_ball_chop', 'lying_leg_raise', 'ball_knee_tuck', 'stir_the_pot', 'ab_wheel', 'hanging_knee_raise', 'pallof_press', 'dead_bug', 'bear_crawl'],
};

// ---- Periodization: extras ride the same 4-week wave as the program ----
// Block sets the flavor of the wave, week-of-block sets where you are on it.
// Week 4 is always a deload — even the "hard" toggle backs off.
const EXTRA_BLOCK_MODS = {
  Foundation: { work: 0, rest: 0,  swap: null,       note: 'Foundation block — smooth reps, own every movement.' },
  Build:      { work: 5, rest: 0,  swap: null,       note: 'Build block — a touch more work per station.' },
  Strength:   { work: 5, rest: -5, swap: null,       note: 'Strength block — grab the heavier bell on loaded stations.' },
  Athletic:   { work: 5, rest: -5, swap: 'x_power',  note: 'Athletic block — power stations lead. Move fast, land soft.' },
};
const EXTRA_WEEK_MODS = {
  1: { work: -5,  rest: 0,  breakAdj: 0,   label: 'ease-in week' },
  2: { work: 0,   rest: 0,  breakAdj: 0,   label: 'build week' },
  3: { work: 5,   rest: -5, breakAdj: -15, label: 'peak week' },
  4: { work: -10, rest: 5,  breakAdj: 15,  label: 'deload — move well, no heroics' },
};

function extraPhase() {
  const plan = buildWeek(new Date());
  return {
    block: plan.blockName, week: plan.weekOfBlock, deload: plan.deload,
    blockMod: EXTRA_BLOCK_MODS[plan.blockName] || EXTRA_BLOCK_MODS.Foundation,
    weekMod: EXTRA_WEEK_MODS[plan.weekOfBlock] || EXTRA_WEEK_MODS[2],
    weekNum: plan.week,
  };
}

const EXTRA_NAMES = ['Garage Grinder', 'Friday Feels', 'The Visitor', 'Engine Room', 'Iron Lung', 'Full Send', 'Sweat Equity', 'The Neighbor', 'Overtime', 'Double Shift'];

const EXTRA_WARMUPS = [
  '2 min easy row or bike, then 10 bodyweight squats + 10 arm circles each way',
  'Driveway down & back easy, then 10 glute bridges + 10 band pull-aparts',
  '2 min jump rope, then 10 walking lunges + 10 push-ups to a comfortable depth',
];

function extraPool(name) { return EXTRA_POOLS[name] || POOLS[name]; }

// small integer hash so day/week/shuffle scramble instead of cycling
function extraHash(a, b, c) {
  let h = 2166136261;
  for (const v of [a, b, c]) { h ^= (v + 1) * 0x9E3779B1; h = Math.imul(h, 16777619); h ^= h >>> 15; }
  return (h >>> 0) % 100000;
}

/**
 * Build an extra session: { name, warmup, format, stations, finisher }
 * Same shape as a program Day C so the timer + TV code just work.
 */
function genExtra(dur, focus, intensity, shuffle) {
  const base = EXTRA_BASE[dur] || EXTRA_BASE[30];
  const inten = EXTRA_INTENSITY[intensity] || EXTRA_INTENSITY.standard;
  const ph = extraPhase();
  let recipe = (EXTRA_RECIPES[focus] || EXTRA_RECIPES.mix).slice();
  // block bias: e.g. Athletic swaps the first lower-body slot for a power slot
  if (ph.blockMod.swap) {
    const i = recipe.indexOf('x_lower');
    if (i >= 0) recipe[i] = ph.blockMod.swap;
  }

  // seed mixes calendar day, program week, and the shuffle tap, so the same
  // settings give a different circuit every day and every week
  const daySeed = new Date().getDate() + new Date().getMonth() * 31;
  const seed = extraHash(daySeed, ph.weekNum, shuffle || 0);

  const stations = [];
  const seen = new Set();
  recipe.slice(0, base.stations).forEach((poolName, i) => {
    const pool = extraPool(poolName);
    // walk the pool from a seeded start until we find something unused
    for (let k = 0; k < pool.length; k++) {
      const id = pool[(seed + i * 5 + k) % pool.length];
      if (!seen.has(id) && EXERCISES[id]) { seen.add(id); stations.push(id); return; }
    }
    // pool exhausted (unlikely) — grab any unused conditioning move
    const alt = ['burpee', 'mountain_climber', 'farmer_carry', 'jump_squat', 'skater_bound', 'bear_crawl'].find(b => !seen.has(b));
    seen.add(alt); stations.push(alt);
  });

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const work = clamp(base.work + inten.work + ph.blockMod.work + ph.weekMod.work, 25, 55);
  const rest = clamp(base.rest + inten.rest + ph.blockMod.rest + ph.weekMod.rest, 10, 30);
  const roundBreak = clamp(base.roundBreak + inten.breakAdj + ph.weekMod.breakAdj, 30, 90);
  const name = EXTRA_NAMES[(seed + dur) % EXTRA_NAMES.length];
  const format = {
    name,
    desc: `${base.stations} stations · ${work}s work / ${rest}s rest · ${base.rounds} rounds · ${roundBreak}s water break between rounds`,
    work, rest, rounds: base.rounds, stations: base.stations, roundBreak,
  };
  let finisher = null;
  if (inten.finisher && !ph.deload) {
    const finisherPool = ['burpee', 'devils_press', 'kb_swing_circuit', 'slam_ball', 'row_sprint', 'bike_sprint', 'driveway_run'];
    let finId = 'burpee';
    for (let k = 0; k < finisherPool.length; k++) {
      const id = finisherPool[(seed + k) % finisherPool.length];
      if (!seen.has(id)) { finId = id; break; }
    }
    finisher = { exId: finId, desc: 'Everyone: 3 rounds of 30s on / 30s off. Then you\'ve earned the walk down the driveway.' };
  }

  const totalSec = base.rounds * base.stations * work + base.rounds * (base.stations - 1) * rest + (base.rounds - 1) * roundBreak;
  return {
    name, dur, focus, intensity,
    warmup: EXTRA_WARMUPS[seed % EXTRA_WARMUPS.length],
    format, stations, finisher,
    estMin: Math.round(totalSec / 60) + (finisher ? 3 : 0),
    phase: `${ph.block} block · week ${ph.week} of 4 (${ph.weekMod.label})`,
    phaseNote: ph.deload ? 'Deload week: shorter work, longer rest, no finisher — even on Hard. Ride the wave.' : ph.blockMod.note,
  };
}
