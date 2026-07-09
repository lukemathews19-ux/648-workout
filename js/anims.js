// Animated exercise demos — silhouette loops for the circuit board.
// Each anim is a set of keyframe poses; the engine tweens between them forever.
// Joints (all [x,y] in a 0-100 viewBox, ground at y=90, figure faces right):
//   h head · n neck/shoulder · p pelvis · e1/w1 near arm · e2/w2 far arm
//   k1/f1 near leg · k2/f2 far leg
// pr: held/moving props per pose (same count+order in every pose — they tween too)
//   {t:'c',x,y,r} circle · {t:'l',pts:[[x,y],...]} polyline · {t:'r',x,y,w,h} rect
// statics: fixed scenery (box, bench, rower...) drawn behind the figure.

const ANIMS = {
  kb_goblet_pulse: {
    durs: [650, 650],
    poses: [
      { h:[50,24], n:[50,33], p:[50,56], e1:[54,43], w1:[58,39], e2:[52,44], w2:[56,40], k1:[51,73], f1:[51,90], k2:[47,73], f2:[47,90], pr:[{t:'c',x:61,y:40,r:4.5}] },
      { h:[56,37], n:[54,46], p:[44,69], e1:[58,54], w1:[61,50], e2:[56,55], w2:[59,51], k1:[55,76], f1:[51,90], k2:[51,77], f2:[47,90], pr:[{t:'c',x:64,y:51,r:4.5}] },
    ],
  },
  db_thruster: {
    durs: [420, 650],
    poses: [
      { h:[54,36], n:[53,45], p:[45,68], e1:[57,52], w1:[56,42], e2:[55,53], w2:[54,43], k1:[56,75], f1:[51,90], k2:[52,76], f2:[47,90], pr:[{t:'c',x:56,y:39,r:2.8},{t:'c',x:54,y:40,r:2.8}] },
      { h:[50,24], n:[50,33], p:[50,56], e1:[52,24], w1:[52,15], e2:[48,25], w2:[48,16], k1:[51,73], f1:[51,90], k2:[48,73], f2:[48,90], pr:[{t:'c',x:52,y:12,r:2.8},{t:'c',x:48,y:13,r:2.8}] },
    ],
  },
  box_stepover: {
    durs: [520, 520, 520, 520],
    statics: [{t:'r',x:54,y:74,w:20,h:16}],
    poses: [
      { h:[40,24], n:[40,33], p:[40,56], e1:[44,44], w1:[47,50], e2:[36,44], w2:[33,50], k1:[50,68], f1:[57,73], k2:[38,73], f2:[38,90] },
      { h:[62,11], n:[62,20], p:[62,42], e1:[66,31], w1:[68,38], e2:[58,31], w2:[56,38], k1:[63,58], f1:[63,74], k2:[56,52], f2:[58,62] },
      { h:[82,24], n:[82,33], p:[82,56], e1:[85,44], w1:[86,52], e2:[79,44], w2:[78,52], k1:[83,73], f1:[83,90], k2:[80,73], f2:[80,90] },
      { h:[62,11], n:[62,20], p:[62,42], e1:[66,31], w1:[68,38], e2:[58,31], w2:[56,38], k1:[63,58], f1:[63,74], k2:[70,52], f2:[68,62] },
    ],
  },
  bosu_squat: {
    durs: [700, 700],
    statics: [{t:'l',pts:[[38,90],[40,86],[45,83],[50,82],[55,83],[60,86],[62,90]]}],
    poses: [
      { h:[50,20], n:[50,29], p:[50,52], e1:[57,36], w1:[64,36], e2:[55,37], w2:[62,37], k1:[51,68], f1:[50,83], k2:[48,68], f2:[48,84] },
      { h:[54,33], n:[53,42], p:[45,64], e1:[60,48], w1:[67,46], e2:[58,49], w2:[65,47], k1:[55,71], f1:[50,83], k2:[52,72], f2:[48,84] },
    ],
  },
  wall_ball_thruster: {
    durs: [420, 650],
    poses: [
      { h:[54,36], n:[53,45], p:[45,68], e1:[57,52], w1:[56,44], e2:[55,53], w2:[57,43], k1:[56,75], f1:[51,90], k2:[52,76], f2:[47,90], pr:[{t:'c',x:59,y:41,r:4}] },
      { h:[50,24], n:[50,33], p:[50,56], e1:[52,24], w1:[50,15], e2:[48,25], w2:[52,15], k1:[51,73], f1:[51,90], k2:[48,73], f2:[48,90], pr:[{t:'c',x:51,y:10,r:4}] },
    ],
  },
  kb_swing_circuit: {
    durs: [550, 550],
    poses: [
      { h:[59,35], n:[57,44], p:[44,60], e1:[58,53], w1:[57,62], e2:[56,54], w2:[55,63], k1:[52,74], f1:[50,90], k2:[48,75], f2:[46,90], pr:[{t:'c',x:57,y:67,r:4.5}] },
      { h:[50,24], n:[50,33], p:[50,56], e1:[57,36], w1:[64,37], e2:[55,37], w2:[62,38], k1:[51,73], f1:[50,90], k2:[48,73], f2:[46,90], pr:[{t:'c',x:68,y:39,r:4.5}] },
    ],
  },
  slam_ball: {
    durs: [420, 580],
    poses: [
      { h:[51,23], n:[51,32], p:[50,55], e1:[54,22], w1:[53,14], e2:[50,23], w2:[49,15], k1:[51,72], f1:[51,90], k2:[48,72], f2:[48,90], pr:[{t:'c',x:51,y:10,r:4}] },
      { h:[54,37], n:[53,46], p:[46,68], e1:[57,55], w1:[56,64], e2:[55,56], w2:[54,65], k1:[55,75], f1:[51,90], k2:[51,76], f2:[47,90], pr:[{t:'c',x:56,y:81,r:4}] },
    ],
  },
  box_jump: {
    durs: [480, 700],
    statics: [{t:'r',x:58,y:72,w:22,h:18}],
    poses: [
      { h:[47,37], n:[46,46], p:[38,66], e1:[42,54], w1:[36,60], e2:[40,55], w2:[34,61], k1:[47,74], f1:[42,90], k2:[43,75], f2:[38,90] },
      { h:[68,14], n:[68,23], p:[68,46], e1:[73,33], w1:[75,40], e2:[63,33], w2:[61,40], k1:[69,60], f1:[69,72], k2:[66,60], f2:[66,72] },
    ],
  },
  med_ball_chest_pass: {
    durs: [350, 650],
    poses: [
      { h:[48,24], n:[48,33], p:[48,56], e1:[53,42], w1:[55,38], e2:[51,43], w2:[53,39], k1:[52,72], f1:[54,90], k2:[45,73], f2:[42,90], pr:[{t:'c',x:58,y:39,r:4}] },
      { h:[52,25], n:[52,34], p:[49,56], e1:[59,37], w1:[66,38], e2:[57,38], w2:[64,39], k1:[53,72], f1:[54,90], k2:[46,73], f2:[42,90], pr:[{t:'c',x:71,y:40,r:4}] },
    ],
  },
  pushup: {
    durs: [620, 620],
    poses: [
      { h:[70,65], n:[62,68], p:[40,72], e1:[62,78], w1:[62,88], e2:[60,79], w2:[60,88], k1:[29,76], f1:[18,88], k2:[27,77], f2:[16,88] },
      { h:[71,77], n:[62,80], p:[40,82], e1:[55,79], w1:[62,88], e2:[53,80], w2:[60,88], k1:[29,82], f1:[18,88], k2:[27,83], f2:[16,88] },
    ],
  },
  db_floor_press: {
    durs: [550, 550],
    poses: [
      { h:[68,83], n:[60,84], p:[44,84], e1:[60,73], w1:[60,63], e2:[58,74], w2:[58,64], k1:[36,70], f1:[28,88], k2:[33,71], f2:[25,88], pr:[{t:'c',x:60,y:60,r:2.8},{t:'c',x:58,y:61,r:2.8}] },
      { h:[68,83], n:[60,84], p:[44,84], e1:[53,84], w1:[56,73], e2:[51,84], w2:[54,74], k1:[36,70], f1:[28,88], k2:[33,71], f2:[25,88], pr:[{t:'c',x:56,y:70,r:2.8},{t:'c',x:54,y:71,r:2.8}] },
    ],
  },
  db_push_press: {
    durs: [350, 650],
    poses: [
      { h:[50,29], n:[50,38], p:[50,60], e1:[55,46], w1:[54,37], e2:[52,47], w2:[51,38], k1:[52,74], f1:[50,90], k2:[48,74], f2:[47,90], pr:[{t:'c',x:54,y:34,r:2.8},{t:'c',x:51,y:35,r:2.8}] },
      { h:[50,23], n:[50,32], p:[50,55], e1:[53,22], w1:[53,13], e2:[49,23], w2:[49,14], k1:[51,72], f1:[50,90], k2:[48,72], f2:[47,90], pr:[{t:'c',x:53,y:10,r:2.8},{t:'c',x:49,y:11,r:2.8}] },
    ],
  },
  arnold_press: {
    durs: [600, 600],
    poses: [
      { h:[50,24], n:[50,33], p:[50,56], e1:[54,44], w1:[52,36], e2:[52,45], w2:[50,37], k1:[51,73], f1:[51,90], k2:[48,73], f2:[48,90], pr:[{t:'c',x:52,y:33,r:2.8},{t:'c',x:50,y:34,r:2.8}] },
      { h:[50,24], n:[50,33], p:[50,56], e1:[54,24], w1:[53,14], e2:[50,25], w2:[49,15], k1:[51,73], f1:[51,90], k2:[48,73], f2:[48,90], pr:[{t:'c',x:53,y:11,r:2.8},{t:'c',x:49,y:12,r:2.8}] },
    ],
  },
  band_row: {
    durs: [500, 600],
    statics: [{t:'l',pts:[[88,40],[88,60]]}],
    poses: [
      { h:[44,26], n:[44,35], p:[42,58], e1:[52,42], w1:[60,45], e2:[50,43], w2:[58,46], k1:[46,74], f1:[44,90], k2:[41,74], f2:[39,90], pr:[{t:'l',pts:[[88,50],[60,45]]}] },
      { h:[41,26], n:[42,35], p:[41,58], e1:[43,50], w1:[51,49], e2:[41,51], w2:[49,50], k1:[45,74], f1:[44,90], k2:[40,74], f2:[39,90], pr:[{t:'l',pts:[[88,50],[51,49]]}] },
    ],
  },
  db_row: {
    durs: [500, 600],
    statics: [{t:'r',x:56,y:70,w:24,h:3},{t:'l',pts:[[59,73],[59,90]]},{t:'l',pts:[[77,73],[77,90]]}],
    poses: [
      { h:[64,47], n:[58,51], p:[40,58], e1:[57,62], w1:[56,72], e2:[60,60], w2:[62,70], k1:[42,73], f1:[42,90], k2:[37,73], f2:[36,90], pr:[{t:'c',x:56,y:75,r:3}] },
      { h:[64,47], n:[58,51], p:[40,58], e1:[52,54], w1:[53,63], e2:[60,60], w2:[62,70], k1:[42,73], f1:[42,90], k2:[37,73], f2:[36,90], pr:[{t:'c',x:53,y:66,r:3}] },
    ],
  },
  band_pulldown: {
    durs: [550, 550],
    statics: [{t:'l',pts:[[60,10],[80,10]]}],
    poses: [
      { h:[48,39], n:[48,48], p:[46,72], e1:[54,36], w1:[60,24], e2:[52,37], w2:[58,25], k1:[48,88], f1:[38,88], k2:[45,88], f2:[35,88], pr:[{t:'l',pts:[[70,10],[60,24]]}] },
      { h:[48,39], n:[48,48], p:[46,72], e1:[52,50], w1:[57,44], e2:[50,51], w2:[55,45], k1:[48,88], f1:[38,88], k2:[45,88], f2:[35,88], pr:[{t:'l',pts:[[70,10],[57,44]]}] },
    ],
  },
  chest_sup_row: {
    durs: [500, 600],
    statics: [{t:'l',pts:[[38,80],[62,58]]},{t:'l',pts:[[50,69],[50,90]]}],
    poses: [
      { h:[64,54], n:[58,60], p:[42,74], e1:[58,68], w1:[57,76], e2:[56,69], w2:[55,77], k1:[36,82], f1:[32,90], k2:[33,83], f2:[29,90], pr:[{t:'c',x:57,y:79,r:2.8},{t:'c',x:55,y:80,r:2.8}] },
      { h:[64,54], n:[58,60], p:[42,74], e1:[53,60], w1:[54,68], e2:[51,61], w2:[52,69], k1:[36,82], f1:[32,90], k2:[33,83], f2:[29,90], pr:[{t:'c',x:54,y:71,r:2.8},{t:'c',x:52,y:72,r:2.8}] },
    ],
  },
  row_sprint: {
    durs: [480, 700],
    statics: [{t:'l',pts:[[18,84],[80,84]]},{t:'c',x:78,y:77,r:6},{t:'l',pts:[[68,76],[72,84]]}],
    poses: [
      { h:[54,57], n:[50,63], p:[40,80], e1:[58,68], w1:[66,70], e2:[56,69], w2:[64,71], k1:[54,68], f1:[66,76], k2:[52,69], f2:[64,77], pr:[{t:'l',pts:[[66,70],[73,76]]}] },
      { h:[22,54], n:[25,61], p:[31,80], e1:[35,71], w1:[31,66], e2:[33,72], w2:[29,67], k1:[48,78], f1:[66,76], k2:[46,79], f2:[64,77], pr:[{t:'l',pts:[[31,66],[73,76]]}] },
    ],
  },
  bike_sprint: {
    durs: [200, 200, 200, 200],
    statics: [
      {t:'l',pts:[[30,90],[74,90]]},
      {t:'c',x:64,y:80,r:9},                       // flywheel
      {t:'l',pts:[[36,63],[45,63]]},               // seat
      {t:'l',pts:[[41,63],[43,76]]},               // seat post
      {t:'l',pts:[[43,76],[50,76]]},               // bottom bracket
      {t:'l',pts:[[50,76],[62,58]]},               // down tube to bars
      {t:'l',pts:[[60,56],[68,59]]},               // handlebars
      {t:'l',pts:[[50,76],[64,80]]},               // chain stay
    ],
    poses: [
      { h:[55,36], n:[52,44], p:[40,61], e1:[58,50], w1:[63,57], e2:[56,51], w2:[61,58], k1:[50,66], f1:[56,76], k2:[42,68], f2:[44,76] },
      { h:[55,36], n:[52,44], p:[40,61], e1:[58,50], w1:[63,57], e2:[56,51], w2:[61,58], k1:[46,70], f1:[50,82], k2:[47,63], f2:[50,70] },
      { h:[55,36], n:[52,44], p:[40,61], e1:[58,50], w1:[63,57], e2:[56,51], w2:[61,58], k1:[42,68], f1:[44,76], k2:[50,66], f2:[56,76] },
      { h:[55,36], n:[52,44], p:[40,61], e1:[58,50], w1:[63,57], e2:[56,51], w2:[61,58], k1:[47,63], f1:[50,70], k2:[46,70], f2:[50,82] },
    ],
  },
  jump_rope: {
    durs: [270, 270],
    poses: [
      { h:[50,26], n:[50,35], p:[50,58], e1:[57,46], w1:[61,50], e2:[43,46], w2:[39,50], k1:[51,74], f1:[50,90], k2:[48,74], f2:[47,90], pr:[{t:'l',pts:[[39,50],[34,30],[50,12],[66,30],[61,50]]}] },
      { h:[50,22], n:[50,31], p:[50,54], e1:[57,42], w1:[61,46], e2:[43,42], w2:[39,46], k1:[51,70], f1:[50,84], k2:[48,70], f2:[47,84], pr:[{t:'l',pts:[[39,46],[32,70],[50,88],[68,70],[61,46]]}] },
    ],
  },
  agility_ladder: {
    durs: [260, 260],
    statics: [
      {t:'l',pts:[[25,87],[25,90]]}, {t:'l',pts:[[35,87],[35,90]]}, {t:'l',pts:[[45,87],[45,90]]},
      {t:'l',pts:[[55,87],[55,90]]}, {t:'l',pts:[[65,87],[65,90]]}, {t:'l',pts:[[75,87],[75,90]]},
    ],
    poses: [
      { h:[51,25], n:[50,34], p:[48,58], e1:[44,44], w1:[40,50], e2:[57,43], w2:[62,47], k1:[58,58], f1:[56,70], k2:[47,74], f2:[46,90] },
      { h:[51,25], n:[50,34], p:[48,58], e1:[57,42], w1:[62,46], e2:[44,45], w2:[40,51], k1:[47,74], f1:[46,90], k2:[57,58], f2:[55,70] },
    ],
  },
  treadmill_incline: {
    durs: [270, 270],
    statics: [{t:'l',pts:[[24,88],[76,74]]},{t:'l',pts:[[76,74],[84,54]]},{t:'l',pts:[[80,54],[90,54]]}],
    poses: [
      { h:[53,23], n:[52,32], p:[50,55], e1:[45,42], w1:[42,48], e2:[58,41], w2:[62,46], k1:[56,66], f1:[58,79], k2:[44,68], f2:[40,84] },
      { h:[53,23], n:[52,32], p:[50,55], e1:[58,41], w1:[62,46], e2:[45,43], w2:[42,49], k1:[44,68], f1:[41,83], k2:[56,66], f2:[57,79] },
    ],
  },
  mountain_climber: {
    durs: [300, 300],
    poses: [
      { h:[70,63], n:[62,66], p:[42,70], e1:[62,76], w1:[62,87], e2:[60,77], w2:[60,88], k1:[54,72], f1:[52,82], k2:[30,76], f2:[18,86] },
      { h:[70,63], n:[62,66], p:[42,70], e1:[62,76], w1:[62,87], e2:[60,77], w2:[60,88], k1:[30,75], f1:[18,85], k2:[54,73], f2:[52,83] },
    ],
  },
  russian_twist: {
    durs: [400, 400],
    poses: [
      { h:[36,49], n:[38,58], p:[48,74], e1:[46,62], w1:[54,60], e2:[44,63], w2:[52,61], k1:[58,66], f1:[68,62], k2:[57,68], f2:[67,64], pr:[{t:'c',x:58,y:61,r:3.5}] },
      { h:[36,49], n:[38,58], p:[48,74], e1:[42,68], w1:[46,72], e2:[40,69], w2:[44,73], k1:[58,66], f1:[68,62], k2:[57,68], f2:[67,64], pr:[{t:'c',x:49,y:74,r:3.5}] },
    ],
  },
  plank: {
    durs: [900, 900],
    poses: [
      { h:[68,69], n:[60,72], p:[40,74], e1:[58,84], w1:[66,84], e2:[56,85], w2:[64,85], k1:[28,77], f1:[16,86], k2:[26,78], f2:[14,87] },
      { h:[68,68], n:[60,71], p:[40,72.5], e1:[58,84], w1:[66,84], e2:[56,85], w2:[64,85], k1:[28,76.5], f1:[16,86], k2:[26,77.5], f2:[14,87] },
    ],
  },
  vups: {
    durs: [480, 620],
    poses: [
      { h:[74,84], n:[66,85], p:[48,85], e1:[74,85], w1:[82,85], e2:[72,86], w2:[80,86], k1:[36,86], f1:[24,86], k2:[34,87], f2:[22,87] },
      { h:[61,54], n:[58,62], p:[48,80], e1:[46,62], w1:[36,60], e2:[44,63], w2:[34,61], k1:[38,68], f1:[30,58], k2:[36,69], f2:[28,59] },
    ],
  },
  hollow_hold: {
    durs: [850, 850],
    poses: [
      { h:[70,72], n:[62,76], p:[48,82], e1:[70,70], w1:[78,66], e2:[68,71], w2:[76,67], k1:[34,78], f1:[22,72], k2:[32,79], f2:[20,73] },
      { h:[70,70.5], n:[62,74.5], p:[48,82], e1:[70,68], w1:[78,64], e2:[68,69], w2:[76,65], k1:[34,76.5], f1:[22,70], k2:[32,77.5], f2:[20,71] },
    ],
  },
  situp_abmat: {
    durs: [550, 550],
    statics: [{t:'l',pts:[[46,88],[54,84],[54,88]]}],
    poses: [
      { h:[66,82], n:[58,84], p:[44,86], e1:[62,78], w1:[66,76], e2:[60,79], w2:[64,77], k1:[34,72], f1:[26,88], k2:[32,73], f2:[24,88] },
      { h:[52,55], n:[50,64], p:[44,84], e1:[42,70], w1:[36,70], e2:[40,71], w2:[34,71], k1:[34,72], f1:[26,88], k2:[32,73], f2:[24,88] },
    ],
  },
  farmer_carry: {
    durs: [400, 400],
    poses: [
      { h:[50,23], n:[50,32], p:[50,55], e1:[55,44], w1:[56,54], e2:[44,44], w2:[43,54], k1:[56,70], f1:[58,88], k2:[45,72], f2:[40,89], pr:[{t:'c',x:56,y:59,r:3.5},{t:'c',x:43,y:59,r:3.5}] },
      { h:[50,23], n:[50,32], p:[50,55], e1:[55,44], w1:[56,54], e2:[44,44], w2:[43,54], k1:[45,71], f1:[40,88], k2:[56,71], f2:[58,89], pr:[{t:'c',x:56,y:59,r:3.5},{t:'c',x:43,y:59,r:3.5}] },
    ],
  },
  burpee: {
    durs: [420, 420, 420, 420],
    poses: [
      { h:[50,17], n:[50,26], p:[50,48], e1:[54,16], w1:[53,8], e2:[47,16], w2:[46,8], k1:[51,66], f1:[50,80], k2:[48,66], f2:[47,80] },
      { h:[57,55], n:[54,62], p:[42,72], e1:[56,74], w1:[57,86], e2:[54,75], w2:[55,87], k1:[52,78], f1:[46,89], k2:[49,79], f2:[43,89] },
      { h:[66,65], n:[58,68], p:[38,72], e1:[58,78], w1:[58,88], e2:[56,79], w2:[56,88], k1:[26,76], f1:[15,85], k2:[24,77], f2:[13,86] },
      { h:[57,55], n:[54,62], p:[42,72], e1:[56,74], w1:[57,86], e2:[54,75], w2:[55,87], k1:[52,78], f1:[46,89], k2:[49,79], f2:[43,89] },
    ],
  },
  dead_bug: {
    durs: [600, 600],
    poses: [
      { h:[70,82], n:[62,84], p:[48,84], e1:[62,74], w1:[62,66], e2:[60,74], w2:[60,66], k1:[46,70], f1:[37,71], k2:[44,71], f2:[35,72] },
      { h:[70,82], n:[62,84], p:[48,84], e1:[70,76], w1:[78,80], e2:[60,74], w2:[60,66], k1:[34,76], f1:[24,80], k2:[44,71], f2:[35,72] },
    ],
  },
};

// ---- Engine ----
const ANIM_NS = 'http://www.w3.org/2000/svg';
const ANIM_FAR = '#4a5568';
const ANIM_STATIC = '#5b667a';

function animLerp(a, b, t) { return a + (b - a) * t; }
function animEase(t) { return 0.5 - 0.5 * Math.cos(Math.PI * t); }

function animEl(tag, attrs) {
  const e = document.createElementNS(ANIM_NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  return e;
}

function animProp(spec, color) {
  if (spec.t === 'c') return animEl('circle', { fill: color, cx: spec.x, cy: spec.y, r: spec.r });
  if (spec.t === 'r') return animEl('rect', { fill: 'none', stroke: color, 'stroke-width': 2.5, rx: 2, x: spec.x, y: spec.y, width: spec.w, height: spec.h });
  return animEl('polyline', { fill: 'none', stroke: color, 'stroke-width': 2.5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', points: spec.pts.map(p => p.join(',')).join(' ') });
}

function animUpdateProp(node, a, b, t) {
  if (a.t === 'c') {
    node.setAttribute('cx', animLerp(a.x, b.x, t));
    node.setAttribute('cy', animLerp(a.y, b.y, t));
    node.setAttribute('r', animLerp(a.r, b.r, t));
  } else if (a.t === 'r') {
    node.setAttribute('x', animLerp(a.x, b.x, t));
    node.setAttribute('y', animLerp(a.y, b.y, t));
  } else {
    node.setAttribute('points', a.pts.map((p, i) => animLerp(p[0], b.pts[i][0], t) + ',' + animLerp(p[1], b.pts[i][1], t)).join(' '));
  }
}

// Mounts a looping demo into `container`. Returns { exId, stop() }.
// The loop also self-cancels if the container leaves the DOM.
function mountAnim(container, exId) {
  const def = ANIMS[exId];
  if (!def) {
    container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;font-size:2.5em">🏋️</div>';
    return { exId, stop() {} };
  }
  const svg = animEl('svg', { viewBox: '0 0 100 100', preserveAspectRatio: 'xMidYMid meet' });
  svg.style.width = '100%';
  svg.style.height = '100%';

  // ground + scenery behind the figure
  svg.appendChild(animEl('line', { x1: 6, y1: 90, x2: 94, y2: 90, stroke: '#2a3342', 'stroke-width': 1.5, 'stroke-linecap': 'round' }));
  for (const s of def.statics || []) svg.appendChild(animProp(s, ANIM_STATIC));

  const lineAttrs = (color, w) => ({ fill: 'none', stroke: color, 'stroke-width': w, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
  const farArm = animEl('polyline', lineAttrs(ANIM_FAR, 4.2));
  const farLeg = animEl('polyline', lineAttrs(ANIM_FAR, 4.2));
  const torso = animEl('polyline', lineAttrs('#e8ecf2', 5));
  const head = animEl('circle', { fill: '#e8ecf2', r: 5.5 });
  const nearLeg = animEl('polyline', lineAttrs('#e8ecf2', 4.2));
  const nearArm = animEl('polyline', lineAttrs('#e8ecf2', 4.2));
  svg.appendChild(farArm); svg.appendChild(farLeg);
  svg.appendChild(torso); svg.appendChild(head);
  svg.appendChild(nearLeg); svg.appendChild(nearArm);

  const propNodes = (def.poses[0].pr || []).map(spec => { const n = animProp(spec, '#4ade80'); svg.appendChild(n); return n; });

  container.innerHTML = '';
  container.appendChild(svg);

  const durs = def.durs || def.poses.map(() => 600);
  const total = durs.reduce((a, b) => a + b, 0);
  const t0 = performance.now() - Math.random() * total; // desync multiple panels slightly
  let raf = null, wasConnected = false, stopped = false;

  function pt(a, b, t) { return [animLerp(a[0], b[0], t), animLerp(a[1], b[1], t)]; }
  function frame(now) {
    if (stopped) return;
    if (svg.isConnected) wasConnected = true;
    else if (wasConnected) { stopped = true; return; } // container was removed — stop looping
    let tc = (now - t0) % total;
    let seg = 0;
    while (tc >= durs[seg]) { tc -= durs[seg]; seg++; }
    const A = def.poses[seg], B = def.poses[(seg + 1) % def.poses.length];
    const t = animEase(tc / durs[seg]);

    const n = pt(A.n, B.n, t), p = pt(A.p, B.p, t), h = pt(A.h, B.h, t);
    const j = (key) => pt(A[key], B[key], t);
    const pts = (arr) => arr.map(q => q.join(',')).join(' ');
    farArm.setAttribute('points', pts([n, j('e2'), j('w2')]));
    farLeg.setAttribute('points', pts([p, j('k2'), j('f2')]));
    torso.setAttribute('points', pts([n, p]));
    head.setAttribute('cx', h[0]); head.setAttribute('cy', h[1]);
    nearLeg.setAttribute('points', pts([p, j('k1'), j('f1')]));
    nearArm.setAttribute('points', pts([n, j('e1'), j('w1')]));
    if (A.pr) A.pr.forEach((spec, i) => animUpdateProp(propNodes[i], spec, B.pr[i], t));

    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);

  return { exId, stop() { stopped = true; if (raf) cancelAnimationFrame(raf); } };
}
