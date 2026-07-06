// On-demand cardio generator. Not a program — Luke runs with a friend 2-3x/week,
// so this is a grab-bag button: pick a time and a toy, get a workout, log it.

const CARDIO_MODES = {
  mix:   { label: '🎲 Mix it up' },
  bike:  { label: '🚴 Bike' },
  row:   { label: '🚣 Rower' },
  tread: { label: '🏃 Treadmill' },
  rope:  { label: '⏭ Rope + Ladder' },
  drive: { label: '🛣 Driveway' },
  pool:  { label: '🏊 Pool' },
  hoops: { label: '🏀 Hoops' },
};

function machineCardio(mode, name) {
  return [
    { dur: 10, mode, title: `${name} 30/30s`, steps: ['2 min easy to warm up', '8 × 30s hard / 30s easy', 'Hard = could not chat. Done — spicy, not destroyed.'] },
    { dur: 10, mode, title: `${name} Minute Repeats`, steps: ['2 min easy', '4 × 1 min strong / 1 min easy', 'Each strong minute a touch harder than the last.'] },
    { dur: 15, mode, title: `${name} 90s Repeats`, steps: ['3 min easy', '5 × 90s strong / 60s easy', '1 min cool-down spin.'] },
    { dur: 15, mode, title: `${name} Pyramid`, steps: ['2 min easy', 'Hard for 1-2-3-2-1 min with 1 min easy between', 'The 3-minute one is the whole workout. Respect it.'] },
    { dur: 20, mode, title: `${name} 2-Minute Grinders`, steps: ['3 min easy', '6 × 2 min strong / 1 min easy', 'Pick a pace you can barely repeat 6 times.'] },
    { dur: 20, mode, title: `${name} Sprint Stack`, steps: ['3 min easy', '10 × 45s sprint / 60s easy', '2 min cool-down.'] },
    { dur: 30, mode, title: `${name} 5-Minute Blocks`, steps: ['5 min easy', '3 × 5 min strong / 2 min easy', '4 min cool-down. Strong = comfortably uncomfortable.'] },
    { dur: 30, mode, title: `${name} Steady + Surges`, steps: ['5 min easy', '20 min steady conversational pace', 'Sprinkle in 6 × 30s surges whenever a song chorus hits', '2 min cool-down.'] },
  ];
}

const CARDIO_TEMPLATES = [
  ...machineCardio('bike', 'Bike'),
  ...machineCardio('row', 'Rower'),
  ...machineCardio('tread', 'Treadmill'),

  // rope + ladder
  { dur: 10, mode: 'rope', title: 'Rope Rounds', steps: ['10 × 40s jump rope / 20s rest', 'Trip? That rep just keeps going. Small hops, relaxed shoulders.'] },
  { dur: 10, mode: 'rope', title: 'Rope + Ladder Combo', steps: ['5 rounds:', '· 1 min jump rope', '· 30s ladder drill (two-in, lateral, in-in-out-out — rotate)', '· 30s rest'] },
  { dur: 15, mode: 'rope', title: 'Feet Circuit', steps: ['3 rounds:', '· 3 min jump rope (break as needed)', '· 1 min ladder drills', '· 1 min rest'] },
  { dur: 20, mode: 'rope', title: 'Big Feet Circuit', steps: ['4 rounds:', '· 3 min jump rope (break as needed)', '· 1 min ladder drills', '· 1 min rest'] },

  // driveway (down & back ×3 = 1 mile, so one down-&-back ≈ ⅓ mile)
  { dur: 10, mode: 'drive', title: 'Driveway Repeats', steps: ['3 × down-&-back at a strong jog', '45s rest between each', 'Down & back ×3 = a mile — you just ran one.'] },
  { dur: 10, mode: 'drive', title: 'Driveway Sprint Ladder', steps: ['Sprint ¼ of the driveway, walk back', 'Sprint ½, walk back', 'Sprint the full length, walk back', 'Repeat ×2'] },
  { dur: 15, mode: 'drive', title: 'The Mile', steps: ['1 easy down-&-back to warm up', 'Then 3 × down-&-back at a strong pace — that\'s the mile', '60s rest between each'] },
  { dur: 20, mode: 'drive', title: 'Driveway + Iron', steps: ['4 rounds:', '· Down & back at a run', '· 15 KB swings at the garage', '· 10 push-ups', 'Rest only as needed.'] },
  { dur: 30, mode: 'drive', title: 'Driveway 5K-ish', steps: ['9 down-&-backs = 3 miles', 'Steady pace, tick them off one by one', 'Pick it up on the home stretch of every 3rd one.'] },

  // mixed equipment
  { dur: 10, mode: 'mix', title: 'Triple Threat', steps: ['3 rounds, no rest:', '· 1 min row', '· 1 min bike', '· 1 min jump rope', 'Transition fast — that\'s the workout.'] },
  { dur: 15, mode: 'mix', title: 'Machine Medley', steps: ['3 rounds:', '· 2 min row', '· 2 min bike', '· 1 min jump rope', '· 40s rest'] },
  { dur: 20, mode: 'mix', title: 'Engine EMOM', steps: ['Every minute on the minute, 20 min:', '· Min 1: 12-15 cal row', '· Min 2: 15 KB swings', '· Min 3: 40s jump rope', '· Min 4: rest', '· Repeat ×5'] },
  { dur: 30, mode: 'mix', title: 'The Tour', steps: ['3 rounds:', '· 4 min bike', '· 3 min row', '· 2 min steep incline treadmill walk', '· 1 min rest'] },

  // pool
  { dur: 10, mode: 'pool', title: 'Splash Intervals', steps: ['10 × 30s hard swim / 30s rest at the wall', 'Any stroke. Hard means hard.'] },
  { dur: 15, mode: 'pool', title: 'Continuous Swims', steps: ['5 × 2 min continuous easy-medium swim / 1 min rest', 'Focus on long, smooth strokes.'] },
  { dur: 20, mode: 'pool', title: 'Swim + Tread', steps: ['4 rounds:', '· 3 min swim', '· 1 min tread water', '· 1 min rest', 'Treading water is sneaky-hard core work.'] },
  { dur: 30, mode: 'pool', title: 'Pool Ladder', steps: ['Swim 1-2-3-4-3-2-1 minutes', '45s rest between each', 'Feeling strong? Tread water during the rests.'] },

  // hoops
  { dur: 10, mode: 'hoops', title: 'Make 3, Sprint', steps: ['5 rounds:', '· Sprint to half court and back', '· Shoot until you make 3', 'Chase your own rebounds at full speed.'] },
  { dur: 15, mode: 'hoops', title: 'Layup Engine', steps: ['3 rounds:', '· 2 min continuous layups, alternating hands', '· 10 free throws (your rest)', '· 1 suicide'] },
  { dur: 20, mode: 'hoops', title: 'Around the World', steps: ['Around the world ×2 — sprint for every rebound', '20 makes from the elbows', '3 suicides to finish'] },
  { dur: 30, mode: 'hoops', title: 'Open Gym', steps: ['10 min: spot shooting, sprint every rebound', '10 min: cone dribble drills at speed', '10 min: free play — just don\'t stand still'] },
];

// Deterministic-per-tap: same day + same tap count = same pick, shuffle advances it.
function genCardio(mode, dur, shuffle) {
  const opts = CARDIO_TEMPLATES.filter(t => t.dur === dur && (mode === 'any' || t.mode === mode));
  if (!opts.length) return null;
  const daySeed = new Date().getDate() + new Date().getMonth() * 31;
  return opts[(daySeed + shuffle) % opts.length];
}
