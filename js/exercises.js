// Exercise database — everything maps to Luke & Kristen's home gym.
// cat: squat | hinge | lunge | hpush | vpush | hpull | vpull | arms | shoulder_acc | glute | core | cond
// unit: lb (load logged) | bw (bodyweight, reps only) | time (seconds/cal, circuit use)
const EXERCISES = {
  // ---- Squat pattern ----
  bb_back_squat:   { name: 'Barbell Back Squat', cat: 'squat', equip: 'Barbell + rack', reps: [6, 8], unit: 'lb', cue: 'Brace hard, sit down between your hips, drive the floor away.' },
  bb_front_squat:  { name: 'Barbell Front Squat', cat: 'squat', equip: 'Barbell + rack', reps: [5, 8], unit: 'lb', cue: 'Elbows high, stay tall — the bar rides on your shoulders, not your wrists.' },
  goblet_squat:    { name: 'Goblet Squat', cat: 'squat', equip: 'KB or DB', reps: [8, 12], unit: 'lb', cue: 'Hold the bell at your chest, elbows inside knees at the bottom.' },
  db_front_squat:  { name: 'DB Front Squat', cat: 'squat', equip: 'Dumbbells', reps: [8, 10], unit: 'lb', cue: 'DBs on shoulders, chest proud the whole way down.' },
  box_squat:       { name: 'Box Squat', cat: 'squat', equip: 'Barbell + plyo box (16-20")', reps: [6, 8], unit: 'lb', cue: 'Sit back to a light touch on the box — no plopping — then drive up.' },

  // ---- Hinge pattern ----
  bb_deadlift:     { name: 'Barbell Deadlift', cat: 'hinge', equip: 'Barbell', reps: [5, 6], unit: 'lb', cue: 'Bar over mid-foot, push the floor away, hips and shoulders rise together.' },
  bb_rdl:          { name: 'Barbell RDL', cat: 'hinge', equip: 'Barbell', reps: [8, 10], unit: 'lb', cue: 'Soft knees, push hips back until hamstrings scream, bar stays close.' },
  db_rdl:          { name: 'DB Romanian Deadlift', cat: 'hinge', equip: 'Dumbbells', reps: [8, 12], unit: 'lb', cue: 'Hips back, flat back, feel the stretch — squeeze glutes to stand.' },
  kb_deadlift:     { name: 'KB Deadlift', cat: 'hinge', equip: 'Kettlebell', reps: [8, 12], unit: 'lb', cue: 'Bell between feet, hinge and grip, stand tall.' },
  kb_swing:        { name: 'KB Swing', cat: 'hinge', equip: 'Kettlebell', reps: [12, 15], unit: 'lb', cue: 'It\'s a hip snap, not a squat — arms are just ropes.' },
  bb_goodmorning:  { name: 'Barbell Good Morning', cat: 'hinge', equip: 'Barbell + rack', reps: [8, 10], unit: 'lb', cue: 'Light weight, hips way back, feel the hamstrings load.' },

  // ---- Lunge / single-leg ----
  db_rev_lunge:    { name: 'DB Reverse Lunge', cat: 'lunge', equip: 'Dumbbells', reps: [8, 10], unit: 'lb', cue: 'Step back, drop the knee straight down, push through the front heel. Reps per leg.' },
  db_walking_lunge:{ name: 'DB Walking Lunge', cat: 'lunge', equip: 'Dumbbells', reps: [8, 10], unit: 'lb', cue: 'Long steps, torso tall. Reps per leg.' },
  bulgarian_ss:    { name: 'Bulgarian Split Squat', cat: 'lunge', equip: 'DBs + bench', reps: [8, 10], unit: 'lb', cue: 'Back foot on bench, most of your weight on the front leg. Reps per leg.' },
  db_stepup:       { name: 'DB Step-Up', cat: 'lunge', equip: 'DBs + plyo box (16-20")', reps: [8, 10], unit: 'lb', cue: 'Drive through the top foot — don\'t bounce off the bottom leg. Reps per leg.' },
  lateral_lunge:   { name: 'Lateral Lunge', cat: 'lunge', equip: 'DB or KB', reps: [8, 10], unit: 'lb', cue: 'Sit into one hip, other leg straight. Reps per side.' },

  // ---- Horizontal push ----
  bb_bench:        { name: 'Barbell Bench Press', cat: 'hpush', equip: 'Barbell + bench + rack', reps: [6, 8], unit: 'lb', cue: 'Shoulder blades pinned, bar to mid-chest, press slightly back toward your face.' },
  db_bench:        { name: 'DB Bench Press', cat: 'hpush', equip: 'DBs + flat bench', reps: [8, 10], unit: 'lb', cue: 'Elbows about 45° from your body, full stretch at the bottom.' },
  db_incline_bench:{ name: 'Incline DB Bench Press', cat: 'hpush', equip: 'DBs + incline bench', reps: [8, 10], unit: 'lb', cue: 'Bench at ~30°, press up and slightly back.' },
  pushup:          { name: 'Push-Up (stands)', cat: 'hpush', equip: 'Push-up stands', reps: [10, 15], unit: 'bw', cue: 'Body in one line, chest below the stands for extra range.' },
  db_floor_press:  { name: 'DB Floor Press', cat: 'hpush', equip: 'Dumbbells', reps: [8, 12], unit: 'lb', cue: 'Lying on the floor — pause when triceps touch, then press.' },

  // ---- Vertical push ----
  bb_ohp:          { name: 'Barbell Overhead Press', cat: 'vpush', equip: 'Barbell + rack', reps: [6, 8], unit: 'lb', cue: 'Squeeze glutes, press straight up, head through at the top.' },
  db_shoulder_press:{ name: 'DB Shoulder Press', cat: 'vpush', equip: 'DBs, seated or standing', reps: [8, 10], unit: 'lb', cue: 'Don\'t arch the low back — ribs down, press to lockout.' },
  arnold_press:    { name: 'Arnold Press', cat: 'vpush', equip: 'Dumbbells', reps: [8, 12], unit: 'lb', cue: 'Start palms facing you, rotate out as you press.' },
  db_push_press:   { name: 'DB Push Press', cat: 'vpush', equip: 'Dumbbells', reps: [6, 8], unit: 'lb', cue: 'Small knee dip, then drive the bells overhead with your legs.' },

  // ---- Horizontal pull ----
  bb_row:          { name: 'Barbell Row', cat: 'hpull', equip: 'Barbell', reps: [8, 10], unit: 'lb', cue: 'Hinge to ~45°, pull to your lower ribs, no body English.' },
  db_row:          { name: 'One-Arm DB Row', cat: 'hpull', equip: 'DB + bench', reps: [8, 12], unit: 'lb', cue: 'Hand and knee on bench, pull elbow to hip. Reps per arm.' },
  chest_sup_row:   { name: 'Chest-Supported DB Row', cat: 'hpull', equip: 'DBs + incline bench', reps: [10, 12], unit: 'lb', cue: 'Chest on the incline bench — no cheating possible. Squeeze at the top.' },
  cable_row:       { name: 'Cable Row', cat: 'hpull', equip: 'Rack pulleys', reps: [10, 12], unit: 'lb', cue: 'Tall chest, pull to your sternum, control the return.' },
  band_row:        { name: 'Band Row', cat: 'hpull', equip: 'Resistance band', reps: [12, 15], unit: 'bw', cue: 'Anchor the band, squeeze shoulder blades together each rep.' },

  // ---- Vertical pull ----
  pullup:          { name: 'Pull-Up', cat: 'vpull', equip: 'Pull-up bar (band-assist if needed)', reps: [5, 10], unit: 'bw', cue: 'Full hang to chin over bar. Loop a band over the bar for assistance.' },
  lat_pulldown:    { name: 'Lat Pulldown', cat: 'vpull', equip: 'Rack pulleys', reps: [8, 12], unit: 'lb', cue: 'Pull the bar to your collarbone, elbows down and back.' },
  chinup:          { name: 'Chin-Up', cat: 'vpull', equip: 'Pull-up bar', reps: [5, 10], unit: 'bw', cue: 'Palms facing you — more biceps. Band-assist is fine.' },
  band_pulldown:   { name: 'Band Kneeling Pulldown', cat: 'vpull', equip: 'Band over pull-up bar', reps: [12, 15], unit: 'bw', cue: 'Kneel, pull the band to your chest, control up.' },

  // ---- Arms ----
  ez_curl:         { name: 'EZ Bar Curl', cat: 'arms', equip: 'EZ curl bar', reps: [8, 12], unit: 'lb', cue: 'Elbows glued to your sides, no swinging.' },
  db_curl:         { name: 'DB Curl', cat: 'arms', equip: 'Dumbbells', reps: [10, 12], unit: 'lb', cue: 'Alternate arms, full turn of the palm on the way up.' },
  hammer_curl:     { name: 'Hammer Curl', cat: 'arms', equip: 'Dumbbells', reps: [10, 12], unit: 'lb', cue: 'Palms facing each other the whole rep.' },
  cable_curl:      { name: 'Cable Curl', cat: 'arms', equip: 'Rack pulleys', reps: [10, 15], unit: 'lb', cue: 'Constant tension — don\'t rest at the bottom.' },
  tricep_pushdown: { name: 'Tricep Pushdown', cat: 'arms', equip: 'Rack pulleys', reps: [10, 15], unit: 'lb', cue: 'Elbows pinned, press to full lockout.' },
  skullcrusher:    { name: 'EZ Bar Skullcrusher', cat: 'arms', equip: 'EZ bar + bench', reps: [10, 12], unit: 'lb', cue: 'Lower to your forehead, elbows pointing at the ceiling.' },
  oh_tricep_ext:   { name: 'Overhead DB Tricep Extension', cat: 'arms', equip: 'One dumbbell', reps: [10, 15], unit: 'lb', cue: 'Both hands on one DB behind your head, extend to lockout.' },

  // ---- Shoulder / upper-back accessories ----
  lateral_raise:   { name: 'DB Lateral Raise', cat: 'shoulder_acc', equip: 'Light dumbbells', reps: [12, 15], unit: 'lb', cue: 'Lead with the elbows, stop at shoulder height, go light.' },
  rear_delt_fly:   { name: 'Rear Delt Fly', cat: 'shoulder_acc', equip: 'Light DBs, hinged over', reps: [12, 15], unit: 'lb', cue: 'Hinge over, raise out to the sides, thumbs slightly down.' },
  band_face_pull:  { name: 'Band Face Pull', cat: 'shoulder_acc', equip: 'Band at face height', reps: [15, 20], unit: 'bw', cue: 'Pull to your face, elbows high, squeeze the rear delts.' },
  band_pull_apart: { name: 'Band Pull-Apart', cat: 'shoulder_acc', equip: 'Resistance band', reps: [15, 20], unit: 'bw', cue: 'Arms straight, stretch the band across your chest.' },
  db_shrug:        { name: 'DB Shrug', cat: 'shoulder_acc', equip: 'Dumbbells', reps: [12, 15], unit: 'lb', cue: 'Straight up, hold 1 second at the top.' },

  // ---- Glute / posterior accessories ----
  bb_hip_thrust:   { name: 'Barbell Hip Thrust', cat: 'glute', equip: 'Barbell + bench', reps: [8, 12], unit: 'lb', cue: 'Upper back on the bench, chin tucked, squeeze hard at the top.' },
  glute_bridge:    { name: 'DB Glute Bridge', cat: 'glute', equip: 'DB on hips', reps: [12, 15], unit: 'lb', cue: 'Floor version — drive through heels, 2-second squeeze.' },
  sl_glute_bridge: { name: 'Single-Leg Glute Bridge', cat: 'glute', equip: 'Bodyweight', reps: [10, 12], unit: 'bw', cue: 'One foot down, hips level. Reps per leg.' },
  stability_ham_curl: { name: 'Stability Ball Hamstring Curl', cat: 'glute', equip: 'Stability ball', reps: [10, 15], unit: 'bw', cue: 'Bridge up, curl the ball in with your heels, hips stay high.' },
  banded_walk:     { name: 'Banded Lateral Walk', cat: 'glute', equip: 'Resistance band', reps: [12, 15], unit: 'bw', cue: 'Band around knees, stay low, steps per direction.' },

  // ---- Core ----
  ab_wheel:        { name: 'Ab Wheel Rollout', cat: 'core', equip: 'Ab wheel', reps: [8, 12], unit: 'bw', cue: 'From knees, roll out only as far as you can keep your back flat.' },
  plank:           { name: 'Plank', cat: 'core', equip: 'Yoga mat', reps: [30, 60], unit: 'time', cue: 'Squeeze glutes and abs — a plank is a full-body hold, not a sag.' },
  side_plank:      { name: 'Side Plank', cat: 'core', equip: 'Yoga mat', reps: [20, 40], unit: 'time', cue: 'Straight line from head to feet. Seconds per side.' },
  dead_bug:        { name: 'Dead Bug', cat: 'core', equip: 'Yoga mat', reps: [8, 12], unit: 'bw', cue: 'Low back pressed into the floor, opposite arm and leg. Reps per side.' },
  hanging_knee_raise: { name: 'Hanging Knee Raise', cat: 'core', equip: 'Pull-up bar', reps: [8, 12], unit: 'bw', cue: 'Curl knees to chest without swinging.' },
  situp_abmat:     { name: 'Sit-Up (ab mat)', cat: 'core', equip: 'Ab mat', reps: [12, 20], unit: 'bw', cue: 'Ab mat under the low back, full range each rep.' },
  russian_twist:   { name: 'Med Ball Russian Twist', cat: 'core', equip: 'Med ball', reps: [10, 15], unit: 'lb', cue: 'Lean back, rotate the ball side to side. Reps per side.' },
  pallof_press:    { name: 'Band Pallof Press', cat: 'core', equip: 'Band anchored at chest height', reps: [10, 12], unit: 'bw', cue: 'Press the band straight out and resist the twist. Reps per side.' },
  hollow_hold:     { name: 'Hollow Hold', cat: 'core', equip: 'Yoga mat', reps: [20, 40], unit: 'time', cue: 'Low back glued to the floor, arms and legs hovering.' },
  stir_the_pot:    { name: 'Stability Ball Stir-the-Pot', cat: 'core', equip: 'Stability ball', reps: [8, 10], unit: 'bw', cue: 'Forearms on the ball in plank, draw slow circles. Circles per direction.' },
  vups:            { name: 'V-Up', cat: 'core', equip: 'Yoga mat', reps: [10, 15], unit: 'bw', cue: 'Reach hands to toes, control the way down.' },
  bird_dog:        { name: 'Bird Dog', cat: 'core', equip: 'Yoga mat', reps: [8, 10], unit: 'bw', cue: 'Slow and controlled, don\'t let hips rotate. Reps per side.' },

  // ---- Conditioning / circuit stations ----
  slam_ball:       { name: 'Slam Ball Slam', cat: 'cond', equip: 'Slam ball', reps: [10, 15], unit: 'lb', cue: 'Full extension overhead, slam through the floor, catch and repeat.' },
  box_jump:        { name: 'Box Jump', cat: 'cond', equip: 'Plyo box (start 16-20")', reps: [8, 10], unit: 'bw', cue: 'Land soft and quiet, step down — don\'t jump down.' },
  box_stepover:    { name: 'Box Step-Over', cat: 'cond', equip: 'Plyo box 16"', reps: [10, 12], unit: 'bw', cue: 'Step up, over, and down the other side. Fast but controlled.' },
  jump_rope:       { name: 'Jump Rope', cat: 'cond', equip: 'Jump rope', reps: [40, 60], unit: 'time', cue: 'Small hops, wrists do the work.' },
  row_sprint:      { name: 'Rower Sprint', cat: 'cond', equip: 'Row machine', reps: [40, 60], unit: 'time', cue: 'Legs, then body, then arms. Hard pace you can barely hold.' },
  bike_sprint:     { name: 'Bike Sprint', cat: 'cond', equip: 'Yesoul bike', reps: [40, 60], unit: 'time', cue: 'Crank the resistance up, out of the saddle if you want.' },
  burpee:          { name: 'Burpee', cat: 'cond', equip: 'Bodyweight', reps: [8, 12], unit: 'bw', cue: 'Chest to floor, jump and clap overhead. Pace yourself.' },
  mountain_climber:{ name: 'Mountain Climber', cat: 'cond', equip: 'Bodyweight', reps: [30, 40], unit: 'time', cue: 'Hands under shoulders, drive knees fast, hips low.' },
  farmer_carry:    { name: 'Farmer Carry', cat: 'cond', equip: 'Heavy DBs or KBs', reps: [30, 45], unit: 'time', cue: 'Heaviest bells you can hold — walk tall, no leaning.' },
  agility_ladder:  { name: 'Agility Ladder', cat: 'cond', equip: 'Agility ladder', reps: [30, 40], unit: 'time', cue: 'Pick a pattern (two-in, lateral, in-in-out-out) and move fast.' },
  wall_ball_thruster: { name: 'Med Ball Thruster', cat: 'cond', equip: 'Med ball', reps: [10, 15], unit: 'lb', cue: 'Squat with the ball at your chest, drive up and press overhead.' },
  kb_goblet_pulse: { name: 'KB Goblet Squat (circuit)', cat: 'cond', equip: 'Kettlebell', reps: [10, 15], unit: 'lb', cue: 'Moderate bell, smooth reps, no lockout rest.' },
  db_thruster:     { name: 'DB Thruster', cat: 'cond', equip: 'Light dumbbells', reps: [10, 12], unit: 'lb', cue: 'Front squat into overhead press, one fluid motion.' },
  bosu_squat:      { name: 'Bosu Squat', cat: 'cond', equip: 'Bosu ball (dome up)', reps: [10, 15], unit: 'bw', cue: 'Find your balance first, then squat slow.' },
  kb_swing_circuit:{ name: 'KB Swing (circuit)', cat: 'cond', equip: 'Kettlebell', reps: [15, 20], unit: 'lb', cue: 'Crisp hip snaps, breathe with the rhythm.' },
  med_ball_chest_pass: { name: 'Med Ball Chest Pass (to floor/wall)', cat: 'cond', equip: 'Med ball', reps: [10, 15], unit: 'lb', cue: 'Explosive throw, catch or pick up, repeat.' },
  treadmill_incline: { name: 'Treadmill Incline Walk/Run', cat: 'cond', equip: 'Treadmill', reps: [40, 60], unit: 'time', cue: 'Steep incline, brisk pace — no hands on the rails.' },
};

// Demo link: YouTube search never goes stale.
function demoUrl(exId) {
  const ex = EXERCISES[exId];
  return 'https://www.youtube.com/results?search_query=' + encodeURIComponent('how to ' + ex.name + ' proper form');
}
