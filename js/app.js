/* Iron Together — main app */

// ---------- State & storage ----------
const STORE_KEY = 'iron_together_v1';

function loadStore() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* corrupted store — start fresh */ }
  return { logs: { luke: {}, kristen: {} }, settings: { defaultUser: 'luke', playlist: '' } };
}
let store = loadStore();
function save() { localStorage.setItem(STORE_KEY, JSON.stringify(store)); }

let user = store.settings.defaultUser || 'luke';
let currentView = 'today';
let selectedDay = null;   // 'A' | 'B' | 'C'
let shortMode = false;    // ⚡ 20-minute version of today's workout
let cardio = { mode: 'any', dur: 20, shuffle: 0, open: false };
let sessTicker = null;    // interval updating the session clock
let circuitProgress = 0;  // 0..1, fed by the circuit timer
let tvOverlay = null;     // 📺 TV-mode overlay element
let tvTicker = null;
const todayISO = () => {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
};

// ---------- Helpers ----------
function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}
function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function toast(msg, ms = 2600) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._t);
  t._t = setTimeout(() => t.classList.remove('show'), ms);
}
function fmtDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
function weekKeyOfIso(iso) {
  const [y, m, d] = iso.split('#')[0].split('-').map(Number);
  return weekKey(new Date(y, m - 1, d));
}

// this week's logs for a user → { A: iso|null, B: ..., C: ... }
function weekStatus(u, date) {
  const wk = weekKey(date || new Date());
  const out = { A: null, B: null, C: null };
  for (const [iso, log] of Object.entries(store.logs[u] || {})) {
    if (log.week === wk && log.completedAt) out[log.day] = iso;
  }
  return out;
}

// most recent completed session containing this exercise (before today)
function lastSession(u, exId) {
  const dates = Object.keys(store.logs[u] || {}).sort().reverse();
  for (const iso of dates) {
    const log = store.logs[u][iso];
    const sets = log.entries && log.entries[exId];
    if (sets && sets.some(s => (s.w || s.r))) {
      if (iso === todayISO() && !log.completedAt) continue; // in-progress today doesn't count
      if (iso === todayISO()) continue;
      return { iso, sets: sets.filter(s => s.w || s.r) };
    }
  }
  return null;
}

// count of weeks (ending this week) where user hit 3+ workouts
function streak(u) {
  let n = 0;
  const now = new Date();
  for (let i = 0; i < 200; i++) {
    const d = new Date(now); d.setDate(d.getDate() - 7 * i);
    const wk = weekKey(d);
    const count = Object.values(store.logs[u] || {}).filter(l => l.week === wk && l.completedAt).length;
    if (count >= 3) n++;
    else if (i === 0) continue; // current week in progress doesn't break the streak
    else break;
  }
  return n;
}

function getDayLog(u, iso) {
  store.logs[u] = store.logs[u] || {};
  return store.logs[u][iso] || null;
}
function ensureDayLog(u, iso, dayType) {
  store.logs[u] = store.logs[u] || {};
  if (!store.logs[u][iso] || store.logs[u][iso].day !== dayType) {
    const existing = store.logs[u][iso];
    if (existing && existing.day !== dayType && existing.completedAt) {
      // completed a different day today already — keep it, key a virtual second entry
      // (rare: two workouts in one day). Suffix the iso.
      iso = iso + '#2';
    }
    if (!store.logs[u][iso]) store.logs[u][iso] = { day: dayType, week: weekKey(new Date()), entries: {} };
  }
  return { iso, log: store.logs[u][iso] };
}

// ---------- Views ----------
const main = document.getElementById('main');

function render() {
  document.querySelectorAll('nav button').forEach(b => b.classList.toggle('active', b.dataset.view === currentView));
  const luke = document.getElementById('u-luke'), kristen = document.getElementById('u-kristen');
  luke.className = user === 'luke' ? 'active-luke' : '';
  kristen.className = user === 'kristen' ? 'active-kristen' : '';
  main.querySelectorAll('.view').forEach(v => v.remove());
  if (currentView === 'today') renderToday();
  else if (currentView === 'week') renderWeek();
  else if (currentView === 'progress') renderProgress();
  else renderSettings();
  updateSessionBar();
}

// ----- Workout session: count-up timer + progress bar + screen wake lock -----
function sessionLog() {
  // a second same-day workout lives under 'YYYY-MM-DD#2' — check both
  const base = todayISO();
  for (const iso of [base, base + '#2']) {
    const log = (store.logs[user] || {})[iso];
    if (log && log.day === selectedDay && log.startedAt && !log.completedAt) return log;
  }
  return null;
}
function startWorkoutSession(rerender = true) {
  const { log } = ensureDayLog(user, todayISO(), selectedDay);
  if (!log.startedAt) { log.startedAt = Date.now(); save(); }
  keepAwake(true);
  if (rerender) render(); else updateSessionBar();
}
function fmtElapsed(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}
function updateSessionBar() {
  const bar = document.getElementById('session-bar');
  const log = currentView === 'today' ? sessionLog() : null;
  if (!log) {
    bar.hidden = true;
    document.body.classList.remove('with-session');
    if (sessTicker) { clearInterval(sessTicker); sessTicker = null; }
    return;
  }
  bar.hidden = false;
  document.body.classList.add('with-session');
  document.getElementById('sess-time').textContent = fmtElapsed(Date.now() - log.startedAt);
  if (!sessTicker) {
    sessTicker = setInterval(() => {
      const l = currentView === 'today' ? sessionLog() : null;
      if (l) document.getElementById('sess-time').textContent = fmtElapsed(Date.now() - l.startedAt);
      else updateSessionBar();
    }, 1000);
  }
  updateProgress();
}
function updateProgress() {
  let frac;
  if (selectedDay === 'C') {
    frac = circuitProgress;
  } else {
    const checks = document.querySelectorAll('.set-check').length;
    const done = document.querySelectorAll('.set-check.done').length;
    frac = checks ? done / checks : 0;
  }
  const fill = document.getElementById('prog-fill');
  if (!fill) return;
  const pct = Math.round(frac * 100);
  fill.style.width = pct + '%';
  document.getElementById('prog-pct').textContent = pct + '%';
}
// iOS releases the wake lock when the app is backgrounded — grab it back
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && (sessionLog() || tvOverlay)) keepAwake(true);
});

// ----- 📺 TV mode: big-screen layout for AirPlay mirroring to the garage TV -----
function enterTV() {
  exitTV();
  keepAwake(true);
  const plan = buildWeek(new Date());
  const day = plan.days[selectedDay];
  const weekLabel = plan.deload ? 'DELOAD WEEK' : `WEEK ${plan.weekOfBlock} OF 4 · ${plan.blockName.toUpperCase()}`;

  if (selectedDay === 'C') {
    tvOverlay = el(`
      <div id="tv-mode">
        <div class="tv-top">
          <button class="tv-exit">✕</button>
          <div class="tv-title">DAY C · ${esc(day.format.name).toUpperCase()}</div>
          <div class="tv-round" id="tv-round"></div>
        </div>
        <div class="tv-cbody" id="tv-cbody"></div>
        <div class="tv-bottom">
          <button class="btn tv-startbtn" id="tv-start">▶ Start circuit</button>
          <button class="btn secondary tv-startbtn" id="tv-skip" style="display:none">⏭ Skip break</button>
          <div class="prog-track"><div class="prog-fill" id="tv-fill"></div></div>
          <span class="tv-sess" id="tv-sess"></span>
        </div>
      </div>`);
    // forward taps to the real timer controls hidden underneath
    tvOverlay.querySelector('#tv-start').onclick = () => {
      const btn = document.getElementById('t-start');
      if (btn && btn.style.display !== 'none') btn.click();
      updateTv();
    };
    tvOverlay.querySelector('#tv-skip').onclick = () => {
      const btn = document.getElementById('t-skip');
      if (btn) btn.click();
      updateTv();
    };
  } else {
    const slots = day.slots.filter(s => user === 'luke' || !s.bonus).filter(s => !shortMode || s.anchor);
    const rows = slots.map(s => {
      const ex = EXERCISES[s.exId];
      const nSets = shortMode ? Math.min(3, s.sets[user]) : s.sets[user];
      return `<div class="tv-row ${s.superset ? 'ss' + s.superset : ''}">
        <div class="tv-ex">${s.anchor ? '⭐ ' : ''}${esc(ex.name)}${s.bonus ? ' <span class="tv-bonus">BONUS</span>' : ''}</div>
        <div class="tv-scheme">${nSets} × ${s.reps[0]}–${s.reps[1]}</div>
      </div>`;
    }).join('');
    tvOverlay = el(`
      <div id="tv-mode">
        <div class="tv-top">
          <button class="tv-exit">✕</button>
          <div class="tv-title">DAY ${selectedDay} · ${esc(day.title).toUpperCase()}</div>
          <div class="tv-round">${weekLabel}</div>
        </div>
        <div class="tv-board">
          <div class="tv-warm">🔥 ${esc(day.warmup)}</div>
          ${rows}
        </div>
        <div class="tv-bottom">
          <div class="prog-track"><div class="prog-fill" id="tv-fill"></div></div>
          <span class="tv-sess" id="tv-sess"></span>
        </div>
      </div>`);
  }

  tvOverlay.querySelector('.tv-exit').onclick = exitTV;
  document.body.appendChild(tvOverlay);
  tvTicker = setInterval(updateTv, 300);
  updateTv();
}

function exitTV() {
  if (tvTicker) { clearInterval(tvTicker); tvTicker = null; }
  if (tvOverlay) { tvOverlay.remove(); tvOverlay = null; }
  if (!sessionLog()) keepAwake(false); else keepAwake(true);
}

// (Re)build the circuit body: one big clock + demo for solo, or a shared
// clock strip over one panel per person when 2-3 are working out.
function buildTvCBody() {
  const body = tvOverlay && tvOverlay.querySelector('#tv-cbody');
  if (!body) return;
  const live = window.circuitLive;
  const n = live && live.people ? live.people.length : 1;
  if (n === 1) {
    body.innerHTML = `
      <div class="tv-solo">
        <div class="tv-solo-left">
          <div class="tv-phase" id="tv-phase">READY</div>
          <div class="tv-clock" id="tv-clock"></div>
          <div class="tv-now" id="tv-now"></div>
          <div class="tv-next" id="tv-next"></div>
        </div>
        <div class="tv-anim tv-solo-anim"></div>
      </div>`;
  } else {
    body.innerHTML = `
      <div class="tv-clockstrip">
        <div class="tv-phase" id="tv-phase">READY</div>
        <div class="tv-clock" id="tv-clock"></div>
      </div>
      <div class="tv-people">
        ${live.people.map(p => `
          <div class="tv-panel" style="--pc:${p.color}">
            <div class="tv-anim"></div>
            <div class="tv-ptext">
              <div class="tv-pname">${esc(p.name.toUpperCase())}</div>
              <div class="tv-ptag"></div>
              <div class="tv-pex"></div>
              <div class="tv-pnext"></div>
            </div>
          </div>`).join('')}
      </div>`;
  }
  body.dataset.people = n;
}

function updateTv() {
  if (!tvOverlay) return;
  const sess = sessionLog();
  const sessEl = tvOverlay.querySelector('#tv-sess');
  if (sessEl) sessEl.textContent = sess ? '⏱ ' + fmtElapsed(Date.now() - sess.startedAt) : '';

  if (selectedDay !== 'C') {
    // strength board: progress = sets checked (mirrors the phone UI underneath)
    const checks = document.querySelectorAll('.set-check').length;
    const done = document.querySelectorAll('.set-check.done').length;
    const fill = tvOverlay.querySelector('#tv-fill');
    if (fill) fill.style.width = (checks ? Math.round(done / checks * 100) : 0) + '%';
    return;
  }

  const live = window.circuitLive;
  if (!live) return;
  const body = tvOverlay.querySelector('#tv-cbody');
  if (+body.dataset.people !== (live.people ? live.people.length : 1)) buildTvCBody();

  const phaseEl = tvOverlay.querySelector('#tv-phase');
  const labels = { prep: 'GET READY', work: 'WORK', rest: 'REST', break: 'ROUND BREAK 💧', done: 'DONE 🎉' };
  phaseEl.textContent = labels[live.phase] || 'READY';
  phaseEl.className = 'tv-phase ' + (live.phase === 'work' || live.phase === 'done' ? 'work' : live.phase === 'rest' ? 'rest' : live.phase === 'break' ? 'break' : '');
  tvOverlay.querySelector('#tv-clock').textContent = live.phase === 'done' ? '✓' : live.left;
  tvOverlay.querySelector('#tv-round').textContent = live.phase === 'done' ? 'ALL ROUNDS DONE'
    : live.phase === 'break' ? `ROUND ${live.round} DONE · ${live.round + 1} UP NEXT`
    : `ROUND ${live.round}/${live.rounds}`;

  // during rest/break show where to go next, not what just finished
  const showNext = live.phase === 'rest' || live.phase === 'break';
  if (live.people.length === 1) {
    const nowEl = tvOverlay.querySelector('#tv-now'), nextEl = tvOverlay.querySelector('#tv-next');
    if (live.phase === 'done') {
      nowEl.textContent = 'Exit TV mode and hit Finish workout';
      nextEl.textContent = '';
    } else if (live.phase === 'break') {
      nowEl.textContent = '💧 Grab water!';
      nextEl.textContent = live.nextName ? 'NEXT: ' + live.nextName : '';
    } else {
      nowEl.textContent = (live.phase === 'prep' ? 'First up: ' : 'NOW: ') + live.curName;
      nextEl.textContent = live.nextName ? 'NEXT: ' + live.nextName : '';
    }
    setAnim(tvOverlay.querySelector('.tv-solo-anim'), live.phase === 'done' ? null : (showNext && live.nextId ? live.nextId : live.curId));
  } else {
    tvOverlay.querySelectorAll('.tv-panel').forEach((panel, i) => {
      const p = live.people[i];
      if (!p) return;
      const animBox = panel.querySelector('.tv-anim');
      const tag = panel.querySelector('.tv-ptag'), pex = panel.querySelector('.tv-pex'), pnext = panel.querySelector('.tv-pnext');
      if (live.phase === 'done') {
        setAnim(animBox, null);
        if (!animBox.querySelector('.tv-panel-done')) animBox.innerHTML = '<div class="tv-panel-done">🎉</div>';
        tag.textContent = '';
        pex.textContent = 'DONE!';
        pnext.textContent = '';
        return;
      }
      const useNext = showNext && p.nextId;
      setAnim(animBox, useNext ? p.nextId : p.curId);
      tag.textContent = live.phase === 'prep' ? 'FIRST UP' : useNext ? 'NEXT UP' : 'NOW';
      pex.textContent = useNext ? p.nextName : p.curName;
      pnext.textContent = !useNext && p.nextName ? 'THEN: ' + p.nextName : (live.phase === 'break' ? '💧 water!' : '');
    });
  }
  tvOverlay.querySelector('#tv-fill').style.width = Math.round(live.workDone / live.totalWork * 100) + '%';
  const sb = tvOverlay.querySelector('#tv-start');
  if (sb) {
    if (live.phase === 'done') sb.style.display = 'none';
    else sb.textContent = live.running ? '⏸ Pause' : (live.phase === 'prep' && !live.workDone ? '▶ Start circuit' : '▶ Resume');
  }
  const sk = tvOverlay.querySelector('#tv-skip');
  if (sk) sk.style.display = live.phase === 'break' ? '' : 'none';
}

// ----- TODAY -----
function renderToday() {
  const plan = buildWeek(new Date());
  const status = weekStatus(user);
  if (!selectedDay) {
    selectedDay = ['A', 'B', 'C'].find(d => !status[d]) || 'A';
  }
  const day = plan.days[selectedDay];
  const v = el('<div class="view active" id="view-today"></div>');

  renderRecap(v);

  const doneCount = ['A', 'B', 'C'].filter(d => status[d]).length;
  v.appendChild(el(`
    <div class="week-banner">
      <div>
        <div style="font-weight:800">${plan.deload ? 'Deload Week' : 'Week ' + plan.weekOfBlock + ' of 4'} · <span class="muted">${doneCount}/3 done</span></div>
        <div class="muted small">Block: ${esc(plan.blockName)}</div>
      </div>
      ${plan.deload ? '<div class="deload-pill">GO ~10% LIGHTER</div>' : `<div class="block-pill">${esc(plan.blockName).toUpperCase()}</div>`}
    </div>`));

  const tabs = el('<div class="day-tabs"></div>');
  for (const d of ['A', 'B', 'C']) {
    const t = el(`<div class="day-tab ${d === selectedDay ? 'selected' : ''} ${status[d] ? 'done' : ''}">
      <div class="d-label">Day ${d}</div><div class="d-sub">${esc(plan.days[d].title)}</div></div>`);
    t.onclick = () => { selectedDay = d; shortMode = false; render(); };
    tabs.appendChild(t);
  }
  v.appendChild(tabs);

  if (plan.deload) {
    v.appendChild(el(`<div class="card"><h3>😌 Deload week</h3><div class="muted small">Same workouts, ~10% lighter, everything moves fast and feels easy. This is what lets next block's weights go up — don't skip it, don't hero it.</div></div>`));
  } else if (plan.weekOfBlock === 1) {
    v.appendChild(el(`<div class="card"><h3>🆕 New block: ${esc(plan.blockName)}</h3><div class="muted small">${esc(plan.blockFocus)}</div></div>`));
  }

  v.appendChild(el(`<div class="card"><h3>🔥 Warm-up (~4 min)</h3><div class="muted small">${esc(day.warmup)}</div></div>`));

  if (!status[selectedDay] && !sessionLog()) {
    const sb = el('<button class="btn" style="margin-bottom:12px">▶ Start workout</button>');
    sb.onclick = () => startWorkoutSession();
    v.appendChild(sb);
    v.appendChild(el('<div class="muted small" style="text-align:center;margin:-6px 0 12px">Starts the clock and keeps your screen awake</div>'));
  }

  const music = store.settings.playlist;
  if (music) {
    const m = el(`<button class="btn secondary" style="margin-bottom:12px">🎵 Start the playlist</button>`);
    m.onclick = () => window.open(music, '_blank');
    v.appendChild(m);
  }

  // ⚡ 20-minute escape hatch — some beats none
  if (!status[selectedDay]) {
    const sm = el(`<button class="btn secondary" style="margin-bottom:12px; ${shortMode ? 'border-color:var(--warn);color:var(--warn)' : ''}">${shortMode ? '⚡ 20-min mode ON — tap for the full workout' : '⚡ Only got 20 minutes?'}</button>`);
    sm.onclick = () => { shortMode = !shortMode; render(); };
    v.appendChild(sm);
    if (shortMode) {
      v.appendChild(el(`<div class="card" style="border-color:var(--warn)"><h3>⚡ Bare minimum mode</h3><div class="muted small">${selectedDay === 'C' ? 'Two rounds instead of three, no finisher. In and out.' : 'Anchor lifts only, 3 sets each, keep rests ~90s. Done in ~20.'} This still counts as a full workout for the week — a short one beats a skipped one, every time.</div></div>`));
    }
  }

  const tv = el('<button class="btn secondary" style="margin-bottom:12px">📺 TV mode — big screen for mirroring</button>');
  tv.onclick = enterTV;
  v.appendChild(tv);

  if (selectedDay === 'C') renderCircuitDay(v, day, status);
  else renderStrengthDay(v, day, status);

  renderCardioCard(v);

  main.appendChild(v);
}

// ----- Weekly recap card (shows once, first visit of a new week) -----
function renderRecap(v) {
  const cw = weekKey(new Date());
  const lw = weekKey(new Date(Date.now() - 7 * 24 * 3600 * 1000));
  store.settings.recapSeen = store.settings.recapSeen || {};
  if (store.settings.recapSeen[user] === cw) return;

  const logs = store.logs[user] || {};
  const lifts = Object.values(logs).filter(l => l.week === lw && l.completedAt).length;
  const cd = (store.cardio || {})[user] || {};
  const cardioSessions = Object.entries(cd).filter(([iso]) => weekKeyOfIso(iso) === lw).flatMap(([, a]) => a);
  const cardioMin = cardioSessions.reduce((n, s) => n + (s.m || 0), 0);
  if (!lifts && !cardioSessions.length) return;

  // PRs: heaviest weight last week vs best-ever before last week
  const bestBefore = {}, bestLast = {};
  for (const l of Object.values(logs)) {
    if (!l.completedAt) continue;
    for (const [ex, sets] of Object.entries(l.entries || {})) {
      const w = Math.max(0, ...sets.map(s => s.w || 0));
      if (!w) continue;
      if (l.week === lw) bestLast[ex] = Math.max(bestLast[ex] || 0, w);
      else if (l.week < lw) bestBefore[ex] = Math.max(bestBefore[ex] || 0, w);
    }
  }
  const prs = Object.keys(bestLast)
    .filter(ex => bestBefore[ex] && bestLast[ex] > bestBefore[ex])
    .map(ex => `${EXERCISES[ex].name} ${bestLast[ex]} lb`)
    .slice(0, 3);

  const name = user === 'luke' ? 'Luke' : 'Kristen';
  const st = streak(user);
  const card = el(`
    <div class="card celebrate" style="border-color:var(--accent)">
      <h3>📬 ${name}'s week in review</h3>
      <div class="muted small" style="line-height:1.6">
        ${lifts >= 3 ? `<b style="color:var(--accent)">${lifts}/3 lifts — perfect week 🎉</b>` : `${lifts}/3 lifts${lifts ? ' — in the game' : ''}`}<br>
        ${cardioSessions.length ? `🏃 ${cardioSessions.length} bonus cardio session${cardioSessions.length > 1 ? 's' : ''} (${cardioMin} min)<br>` : ''}
        ${prs.length ? `🏆 New bests: ${prs.map(esc).join(' · ')}<br>` : ''}
        ${st > 1 ? `🔥 ${st}-week streak — keep the chain alive` : ''}
      </div>
      <button class="btn secondary" style="margin-top:10px;padding:9px">Got it 👍</button>
    </div>`);
  card.querySelector('button').onclick = () => {
    store.settings.recapSeen[user] = cw;
    save();
    card.remove();
  };
  v.appendChild(card);
}

// ----- Quick cardio generator -----
function renderCardioCard(v) {
  const iso = todayISO();
  store.cardio = store.cardio || { luke: {}, kristen: {} };
  const todayLogged = (store.cardio[user] || {})[iso] || [];

  const card = el(`<div class="card" style="margin-top:16px"><h3>🏃 Quick cardio ${todayLogged.length ? '<span class="muted small">· ' + todayLogged.length + ' logged today ✓</span>' : ''}</h3></div>`);

  if (!cardio.open) {
    card.appendChild(el('<div class="muted small" style="margin-bottom:10px">Bonus, not homework — your running covers the base. Grab one when you want an engine hit.</div>'));
    const open = el('<button class="btn secondary" style="padding:10px">Give me a workout</button>');
    open.onclick = () => { cardio.open = true; cardio.shuffle = 0; render(); };
    card.appendChild(open);
    v.appendChild(card);
    return;
  }

  const durs = [10, 15, 20, 30];
  const durChips = el('<div class="chips"></div>');
  durs.forEach(d => {
    const c = el(`<button class="chip ${cardio.dur === d ? 'on' : ''}">${d} min</button>`);
    c.onclick = () => { cardio.dur = d; cardio.shuffle = 0; render(); };
    durChips.appendChild(c);
  });
  card.appendChild(durChips);

  const modeChips = el('<div class="chips"></div>');
  const modes = { any: { label: '✨ Surprise me' }, ...CARDIO_MODES };
  for (const [key, m] of Object.entries(modes)) {
    const c = el(`<button class="chip ${cardio.mode === key ? 'on' : ''}">${m.label}</button>`);
    c.onclick = () => { cardio.mode = key; cardio.shuffle = 0; render(); };
    modeChips.appendChild(c);
  }
  card.appendChild(modeChips);

  const wo = genCardio(cardio.mode, cardio.dur, cardio.shuffle);
  if (wo) {
    card.appendChild(el(`
      <div style="background:var(--card2);border-radius:10px;padding:12px;margin-top:10px">
        <div style="font-weight:800">${esc(wo.title)} <span class="muted small">· ${wo.dur} min</span></div>
        <div class="muted small" style="margin-top:6px;line-height:1.6">${wo.steps.map(esc).join('<br>')}</div>
      </div>`));
    const btns = el(`<div class="btn-row" style="margin-top:10px">
      <button class="btn secondary" style="padding:10px">🔀 Another one</button>
      <button class="btn" style="padding:10px">✓ Did it — log it</button>
    </div>`);
    btns.children[0].onclick = () => { cardio.shuffle++; render(); };
    btns.children[1].onclick = () => {
      store.cardio[user][iso] = store.cardio[user][iso] || [];
      store.cardio[user][iso].push({ t: wo.title, m: wo.dur, mode: wo.mode });
      save();
      cardio.open = false;
      toast(`🏃 ${wo.dur} min of cardio banked. Bonus points.`);
      render();
    };
    card.appendChild(btns);
  } else {
    card.appendChild(el('<div class="muted small" style="margin-top:10px">Nothing at that combo — try another duration.</div>'));
  }
  v.appendChild(card);
}

function renderStrengthDay(v, day, status) {
  const iso = status[selectedDay] || todayISO();
  const existing = getDayLog(user, iso);
  const entries = (existing && existing.day === selectedDay) ? existing.entries : {};
  const completed = !!(existing && existing.day === selectedDay && existing.completedAt);

  let slots = day.slots.filter(s => user === 'luke' || !s.bonus);
  if (shortMode) slots = slots.filter(s => s.anchor);
  const supersetNames = { 1: 'Superset — alternate these two, minimal rest', 2: 'Core superset — back and forth' };
  let lastSuperset = null;

  for (const slot of slots) {
    const ex = EXERCISES[slot.exId];
    const nSets = shortMode ? Math.min(3, slot.sets[user]) : slot.sets[user];
    const saved = entries[slot.exId] || [];
    const last = lastSession(user, slot.exId);
    const sug = last ? suggestProgress(last.sets, slot.reps, slot.exId) : null;

    if (slot.superset && slot.superset !== lastSuperset) {
      v.appendChild(el(`<div class="muted small" style="margin:2px 4px 8px">↔️ ${supersetNames[slot.superset] || 'Superset'}</div>`));
    }
    lastSuperset = slot.superset || null;

    const card = el(`
      <div class="card ex-card">
        <div class="ex-head">
          <div>
            ${slot.anchor ? '<div class="anchor-tag">⭐ Anchor lift</div>' : ''}
            ${slot.bonus ? '<div class="bonus-tag">Bonus — Luke\'s extra 10 min</div>' : ''}
            <div class="ex-name">${esc(ex.name)}</div>
            <div class="ex-meta">${nSets} sets × ${slot.reps[0]}–${slot.reps[1]} ${ex.unit === 'time' ? 'sec' : 'reps'} · ${esc(ex.equip)}</div>
          </div>
          <a class="demo-link" href="${demoUrl(slot.exId)}" target="_blank" title="Watch demo">🎬</a>
        </div>
        ${sug ? `<div class="suggestion ${sug.target === undefined || /Stay|again/.test(sug.msg) ? 'hold' : ''}">${esc(sug.msg)}</div>`
             : last ? '' : `<div class="suggestion hold">First time logging this — pick a weight you could do ~3 more reps with.</div>`}
        <div class="sets"></div>
        <div class="cue">💡 ${esc(ex.cue)}</div>
        <button class="rest-btn" data-rest="${slot.rest}">⏱ Rest ${slot.rest}s</button>
      </div>`);

    const setsWrap = card.querySelector('.sets');
    const rows = [];
    for (let i = 0; i < nSets; i++) {
      const s = saved[i] || {};
      const lastSet = last && last.sets[Math.min(i, last.sets.length - 1)];
      const wPh = ex.unit === 'lb' ? (sug && sug.target ? sug.target : (lastSet && lastSet.w) || 'lb') : '—';
      const rPh = (lastSet && lastSet.r) || slot.reps[1];
      const row = el(`
        <div class="set-row">
          <div class="set-num">Set ${i + 1}</div>
          <input type="number" inputmode="decimal" class="in-w" placeholder="${wPh}" value="${s.w || ''}" ${ex.unit !== 'lb' ? 'disabled style="opacity:.35"' : ''}>
          <input type="number" inputmode="numeric" class="in-r" placeholder="${rPh}" value="${s.r || ''}">
          <button class="set-check ${s.done ? 'done' : ''}">✓</button>
        </div>`);
      const persist = () => {
        const { iso: useIso, log } = ensureDayLog(user, todayISO(), selectedDay);
        log.entries[slot.exId] = log.entries[slot.exId] || [];
        log.entries[slot.exId][i] = {
          w: parseFloat(row.querySelector('.in-w').value) || 0,
          r: parseInt(row.querySelector('.in-r').value) || 0,
          done: row.querySelector('.set-check').classList.contains('done'),
        };
        save();
      };
      row.querySelector('.in-w').addEventListener('change', persist);
      row.querySelector('.in-r').addEventListener('change', persist);
      row.querySelector('.set-check').addEventListener('click', (e) => {
        const btn = e.currentTarget;
        btn.classList.toggle('done');
        // if they tap ✓ without typing, accept the placeholder values (fast logging)
        const w = row.querySelector('.in-w'), r = row.querySelector('.in-r');
        if (btn.classList.contains('done')) {
          if (!w.value && ex.unit === 'lb' && !isNaN(parseFloat(w.placeholder))) w.value = w.placeholder;
          if (!r.value && !isNaN(parseInt(r.placeholder))) r.value = r.placeholder;
        }
        persist();
        if (!sessionLog()) startWorkoutSession(false); // logging a set = you're clearly working out
        updateProgress();
      });
      rows.push(row);
      setsWrap.appendChild(row);
    }

    // typing a weight into one set flows down as the placeholder for the
    // sets below it, so later sets can be logged with a single ✓ tap
    rows.forEach((row, i) => {
      row.querySelector('.in-w').addEventListener('input', (e) => {
        const val = e.target.value;
        if (!val) return;
        for (let j = i + 1; j < rows.length; j++) {
          const w2 = rows[j].querySelector('.in-w');
          if (!w2.value) w2.placeholder = val;
        }
      });
    });

    card.querySelector('.rest-btn').addEventListener('click', startRest);
    v.appendChild(card);
  }

  const done = el(`<button class="btn" ${completed ? 'disabled' : ''}>${completed ? '✓ Workout logged' : '🏁 Finish workout'}</button>`);
  done.onclick = () => finishWorkout(selectedDay);
  v.appendChild(done);
}

// ----- Multi-person circuit (F45-style staggered stations) -----
// Everyone rotates on the same beep, offset by one station, so two people
// never need the same machine at the same time.
const NAME_CYCLE = ['Luke', 'Kristen', 'Guest 1', 'Guest 2'];
const PERSON_COLORS = { 'Luke': '#60a5fa', 'Kristen': '#f472b6', 'Guest 1': '#fbbf24', 'Guest 2': '#a78bfa' };
function circuitCfg() {
  store.settings.circuit = store.settings.circuit || { people: 1, names: [] };
  const cfg = store.settings.circuit;
  cfg.people = Math.min(3, Math.max(1, cfg.people || 1));
  const me = user === 'luke' ? 'Luke' : 'Kristen';
  const defaults = [me, me === 'Luke' ? 'Kristen' : 'Luke', 'Guest 1'];
  const names = [];
  for (let i = 0; i < cfg.people; i++) names.push(cfg.names[i] || defaults[i]);
  return { people: cfg.people, names };
}

// ----- Animated demo mounting (remounts only when the exercise changes) -----
const animMounts = new Map(); // element -> handle from mountAnim
function setAnim(elm, exId) {
  if (!elm) return;
  const cur = animMounts.get(elm);
  if (cur && cur.exId === exId) return;
  if (cur) cur.stop();
  elm.innerHTML = '';
  animMounts.set(elm, exId ? mountAnim(elm, exId) : { exId: null, stop() {} });
  for (const [k, h] of animMounts) if (k !== elm && !k.isConnected) { h.stop(); animMounts.delete(k); }
}

function renderCircuitDay(v, day, status) {
  const fmt = shortMode
    ? { ...day.format, rounds: 2, desc: day.format.desc.replace(/3 rounds/, '2 rounds') }
    : day.format;
  const existing = getDayLog(user, status[selectedDay] || todayISO());
  const completed = !!(existing && existing.day === 'C' && existing.completedAt);

  v.appendChild(el(`<div class="card"><h3>🔄 ${esc(fmt.name)}</h3><div class="muted small">${esc(fmt.desc)}. Move station to station — write nothing down, just work. ${user === 'kristen' ? 'Kristen: you\'re done after the 3 rounds.' : ''}</div></div>`));

  // 👥 People picker — staggered stations so nobody needs the same machine
  const pplCard = el('<div class="card"><h3>👥 Who\'s doing the circuit?</h3><div class="pp-body"></div></div>');
  const ppBody = pplCard.querySelector('.pp-body');
  function renderPicker() {
    const cfg = circuitCfg();
    ppBody.innerHTML = '';
    const counts = el('<div class="chips"></div>');
    [1, 2, 3].forEach(n => {
      const c = el(`<button class="chip ${cfg.people === n ? 'on' : ''}">${n === 1 ? 'Just me' : n + ' people'}</button>`);
      c.onclick = () => {
        store.settings.circuit.people = n;
        save();
        renderPicker();
        if (window.circuitRefresh) window.circuitRefresh();
      };
      counts.appendChild(c);
    });
    ppBody.appendChild(counts);
    if (cfg.people > 1) {
      const names = el('<div class="chips"></div>');
      cfg.names.forEach((nm, i) => {
        const color = PERSON_COLORS[nm] || 'var(--accent)';
        const c = el(`<button class="chip" style="border-color:${color};color:${color}">${esc(nm)}</button>`);
        c.onclick = () => {
          store.settings.circuit.names = circuitCfg().names.slice();
          store.settings.circuit.names[i] = NAME_CYCLE[(NAME_CYCLE.indexOf(nm) + 1) % NAME_CYCLE.length];
          save();
          renderPicker();
          if (window.circuitRefresh) window.circuitRefresh();
        };
        names.appendChild(c);
      });
      ppBody.appendChild(names);
      ppBody.appendChild(el('<div class="muted small" style="margin-top:8px">F45 style: everyone starts one station apart and rotates on the same beep — no fighting over the rower. Tap a name to change it. 📺 TV mode shows a panel for each person.</div>'));
    }
  }
  renderPicker();
  v.appendChild(pplCard);

  const listCard = el('<div class="card"><h3>Stations</h3><div class="station-list"></div></div>');
  const list = listCard.querySelector('.station-list');
  day.stations.forEach((exId) => {
    const ex = EXERCISES[exId];
    list.appendChild(el(`
      <div class="station" data-ex="${exId}">
        <div class="st-num"></div>
        <div style="flex:1">
          <div class="st-name">${esc(ex.name)}</div>
          <div class="st-detail">${esc(ex.cue)}</div>
        </div>
        <div class="st-who"></div>
        <a class="demo-link" href="${demoUrl(exId)}" target="_blank">🎬</a>
      </div>`));
  });
  v.appendChild(listCard);

  if (user === 'luke' && !shortMode) {
    const fex = EXERCISES[day.finisher.exId];
    v.appendChild(el(`<div class="card"><h3>🥵 Finisher: ${esc(fex.name)}</h3><div class="muted small">${esc(day.finisher.desc)}</div><div class="cue">💡 ${esc(fex.cue)}</div></div>`));
  }

  // Timer card
  const breakLen = fmt.roundBreak || 60;
  const totalSec = fmt.rounds * fmt.stations * fmt.work + fmt.rounds * (fmt.stations - 1) * fmt.rest + (fmt.rounds - 1) * breakLen;
  const totalMin = Math.round(totalSec / 60);
  const timer = el(`
    <div class="card">
      <div class="timer-wrap">
        <div class="timer-phase" id="t-phase">READY · ~${totalMin} MIN</div>
        <div class="timer-clock" id="t-clock">${fmt.work}</div>
        <div class="timer-sub" id="t-sub">Round 1 of ${fmt.rounds} · Station 1 of ${fmt.stations}</div>
        <div id="t-anim"></div>
        <div class="btn-row">
          <button class="btn" id="t-start">▶ Start circuit</button>
          <button class="btn secondary" id="t-skip" style="display:none">⏭ Skip break</button>
          <button class="btn secondary" id="t-reset" style="display:none">↺ Reset</button>
        </div>
      </div>
    </div>`);
  v.appendChild(timer);
  wireCircuitTimer(timer, fmt, day.stations, listCard);

  const done = el(`<button class="btn" ${completed ? 'disabled' : ''}>${completed ? '✓ Workout logged' : '🏁 Finish workout'}</button>`);
  done.onclick = () => finishWorkout('C');
  v.appendChild(done);
}

function finishWorkout(dayType) {
  const { log } = ensureDayLog(user, todayISO(), dayType);
  log.completedAt = new Date().toISOString();
  if (log.startedAt) log.durationMin = Math.max(1, Math.round((Date.now() - log.startedAt) / 60000));
  if (shortMode) log.short = true;
  shortMode = false;
  save();
  keepAwake(false);
  if (navigator.vibrate) navigator.vibrate([80, 40, 80, 40, 200]);
  // distinct end-of-workout fanfare — longer and higher than any interval cue
  beep(880, 0.25); setTimeout(() => beep(1100, 0.25), 280); setTimeout(() => beep(1320, 0.45), 560);
  setTimeout(() => beep(1760, 0.8), 950);
  showCelebration(dayType, log);
}

const FINISH_LINES = [
  'GREAT WORK TODAY!',
  'THAT\'S HOW IT\'S DONE.',
  'STRONGER THAN YESTERDAY.',
  'YOU SHOWED UP. IT COUNTS.',
  'ANOTHER BRICK LAID.',
  'THE GYM DIDN\'T WIN. YOU DID.',
];

function showCelebration(dayType, log) {
  const status = weekStatus(user);
  const n = ['A', 'B', 'C'].filter(d => status[d]).length;
  const name = user === 'luke' ? 'Luke' : 'Kristen';
  const perfect = n >= 3;
  const line = perfect ? 'PERFECT WEEK — 3 FOR 3! 🏆' : FINISH_LINES[new Date().getDate() % FINISH_LINES.length];
  const setsDone = Object.values(log.entries || {}).flat().filter(s => s && (s.done || s.w || s.r)).length;

  const stats = [];
  if (log.durationMin) stats.push(`⏱ <b>${log.durationMin} min</b>`);
  if (dayType === 'C') stats.push('🔄 Circuit crushed');
  else if (setsDone) stats.push(`🏋️ <b>${setsDone}</b> sets logged`);
  stats.push(perfect ? `🔥 Streak: <b>${streak(user)} week${streak(user) === 1 ? '' : 's'}</b>` : `📅 <b>${n}/3</b> this week — ${3 - n} to go`);

  const ov = el(`
    <div id="celebration">
      <div class="c-emoji">${perfect ? '🏆' : '💪'}</div>
      <h2>${line}</h2>
      <div class="c-stats">Way to go, ${name}.<br>${stats.join(' &nbsp;·&nbsp; ')}</div>
      <button class="btn">Done 🙌</button>
    </div>`);
  // confetti burst
  const bits = ['🎉', '💚', '⭐', '🎊', '✨', '💪'];
  for (let i = 0; i < 16; i++) {
    const c = el(`<span class="confetti">${bits[i % bits.length]}</span>`);
    c.style.left = ((i * 61) % 96) + 2 + '%';
    c.style.animationDuration = (2.2 + (i * 37 % 17) / 10) + 's';
    c.style.animationDelay = ((i * 23 % 9) / 10) + 's';
    ov.appendChild(c);
  }
  ov.querySelector('.btn').onclick = () => {
    ov.remove();
    selectedDay = null;
    render();
  };
  document.body.appendChild(ov);
}

// ----- Rest timer (per-exercise) -----
let restInterval = null;
function startRest(e) {
  const btn = e.currentTarget;
  if (btn.classList.contains('running')) { // cancel
    clearInterval(restInterval);
    btn.classList.remove('running');
    btn.textContent = `⏱ Rest ${btn.dataset.rest}s`;
    return;
  }
  document.querySelectorAll('.rest-btn.running').forEach(b => {
    b.classList.remove('running');
    b.textContent = `⏱ Rest ${b.dataset.rest}s`;
  });
  clearInterval(restInterval);
  let left = parseInt(btn.dataset.rest);
  btn.classList.add('running');
  btn.textContent = `⏸ ${left}s — tap to cancel`;
  restInterval = setInterval(() => {
    left--;
    if (left <= 0) {
      clearInterval(restInterval);
      btn.classList.remove('running');
      btn.textContent = `⏱ Rest ${btn.dataset.rest}s`;
      beep(880, 0.4);
      if (navigator.vibrate) navigator.vibrate(200);
      toast('⏱ Rest over — next set!');
    } else {
      btn.textContent = `⏸ ${left}s — tap to cancel`;
    }
  }, 1000);
}

// ----- Circuit interval timer -----
let audioCtx = null;
function beep(freq, dur) {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.frequency.value = freq; o.type = 'sine';
    g.gain.setValueAtTime(0.35, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
    o.connect(g); g.connect(audioCtx.destination);
    o.start(); o.stop(audioCtx.currentTime + dur);
  } catch (err) { /* no audio available */ }
}

// Distinct audio cues so your ears know what happened without looking:
// the 3-2-1 countdown is a short chirp; the zero-mark is a two-tone pattern
// (rising = GO, falling = rest, chime = round break) and the end of the whole
// circuit gets its own victory fanfare.
const CUE = {
  count() { beep(660, 0.12); },
  work() { beep(880, 0.15); setTimeout(() => beep(1245, 0.3), 150); },
  rest() { beep(587, 0.15); setTimeout(() => beep(392, 0.35), 150); },
  brk() { beep(523, 0.18); setTimeout(() => beep(659, 0.18), 190); setTimeout(() => beep(523, 0.45), 380); },
  circuitDone() {
    [[784, 0.18, 0], [988, 0.18, 180], [1175, 0.18, 360], [1568, 0.7, 560]]
      .forEach(([f, d, at]) => setTimeout(() => beep(f, d), at));
  },
};

let wakeLock = null;
async function keepAwake(on) {
  try {
    if (on && 'wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen');
    else if (wakeLock) { wakeLock.release(); wakeLock = null; }
  } catch (err) { /* not fatal */ }
}

function wireCircuitTimer(timerEl, fmt, stations, listCard) {
  // a re-render while a circuit is running would otherwise leave a ghost
  // interval beeping against detached DOM — kill the previous one first
  if (window.circuitTimerCleanup) window.circuitTimerCleanup();
  const phaseEl = timerEl.querySelector('#t-phase');
  const clockEl = timerEl.querySelector('#t-clock');
  const subEl = timerEl.querySelector('#t-sub');
  const animBox = timerEl.querySelector('#t-anim');
  const startBtn = timerEl.querySelector('#t-start');
  const resetBtn = timerEl.querySelector('#t-reset');
  const skipBtn = timerEl.querySelector('#t-skip');
  let running = false, iv = null;
  let round = 1, station = 1, phase = 'prep', left = 10;
  let workDone = 0;
  const totalWork = fmt.rounds * fmt.stations;
  const breakLen = fmt.roundBreak || 60;
  circuitProgress = 0;
  function reportProgress() {
    circuitProgress = workDone / totalWork;
    updateProgress();
  }

  function stationOrder(r) {
    // "The Gauntlet" reverses station order on even rounds
    const idx = [...Array(fmt.stations).keys()];
    return (fmt.name === 'The Gauntlet' && r % 2 === 0) ? idx.reverse() : idx;
  }

  // who's where: person p works order[(station-1+p) % N] — staggered starts
  function personStations() {
    const N = fmt.stations;
    const order = stationOrder(round);
    return circuitCfg().names.map((name, p) => {
      const curIdx = order[(station - 1 + p) % N];
      let nextIdx = null;
      if (phase !== 'done') {
        if (station < N) nextIdx = order[(station + p) % N];
        else if (round < fmt.rounds) nextIdx = stationOrder(round + 1)[p % N];
      }
      return { name, color: PERSON_COLORS[name] || '#4ade80', curIdx, nextIdx };
    });
  }

  // publish live state for the TV-mode skin
  function publish() {
    const ppl = personStations();
    const nm = (id) => EXERCISES[id].name.replace(' (circuit)', '');
    const people = ppl.map(x => ({
      name: x.name, color: x.color,
      curName: nm(stations[x.curIdx]), curId: stations[x.curIdx],
      nextName: x.nextIdx != null ? nm(stations[x.nextIdx]) : null,
      nextId: x.nextIdx != null ? stations[x.nextIdx] : null,
    }));
    window.circuitLive = {
      fmtName: fmt.name, round, rounds: fmt.rounds, station, stationsN: fmt.stations,
      phase, left, running, workDone, totalWork, breakLen,
      curName: people[0].curName, curId: people[0].curId, curCue: EXERCISES[people[0].curId].cue,
      nextName: people[0].nextName, nextId: people[0].nextId,
      people,
    };
  }

  function highlight() {
    const ppl = personStations();
    // during rest/break light up where everyone is headed, not where they were
    const showNext = phase === 'rest' || phase === 'break';
    listCard.querySelectorAll('.station').forEach((s, i) => {
      const here = ppl.filter(x => (showNext ? x.nextIdx : x.curIdx) === i);
      s.classList.toggle('current', phase !== 'done' && here.length > 0);
      const who = s.querySelector('.st-who');
      if (who) {
        who.innerHTML = (ppl.length > 1 && phase !== 'done')
          ? here.map(x => `<span class="who-dot" style="background:${x.color}">${esc(x.name[0])}</span>`).join('')
          : '';
      }
    });
    if (phase === 'done') return;
    if (phase === 'break') {
      subEl.textContent = `💧 Water break — Round ${round + 1} of ${fmt.rounds} up next`;
    } else if (ppl.length > 1) {
      subEl.textContent = `Round ${round} of ${fmt.rounds} · ${showNext ? 'move to your lit-up station' : 'Station ' + station + ' of ' + fmt.stations}`;
    } else {
      const ex = EXERCISES[stations[ppl[0].curIdx]];
      subEl.textContent = `Round ${round} of ${fmt.rounds} · Station ${station}: ${ex.name}`;
    }
  }

  // phone demo loop: solo only (with 2-3 people the colored dots do the talking)
  function syncPhoneAnim() {
    if (!animBox) return;
    let id = null;
    if (circuitCfg().people === 1 && phase !== 'done') {
      const p0 = personStations()[0];
      const useNext = (phase === 'rest' || phase === 'break') && p0.nextIdx != null;
      id = stations[useNext ? p0.nextIdx : p0.curIdx];
    }
    setAnim(animBox, id);
    animBox.style.display = id ? '' : 'none';
  }

  function tickUI() {
    clockEl.textContent = left;
    phaseEl.textContent = phase === 'prep' ? 'GET READY' : phase === 'work' ? 'WORK' : phase === 'break' ? 'ROUND BREAK 💧' : 'REST';
    phaseEl.className = 'timer-phase ' + (phase === 'work' ? 'work' : phase === 'rest' ? 'rest' : phase === 'break' ? 'break' : '');
    skipBtn.style.display = phase === 'break' ? '' : 'none';
    syncPhoneAnim();
    publish();
  }
  function advance() {
    if (phase === 'prep') { phase = 'work'; left = fmt.work; CUE.work(); }
    else if (phase === 'work') {
      workDone++; reportProgress();
      if (station === fmt.stations && round === fmt.rounds) return finish();
      if (station === fmt.stations) { phase = 'break'; left = breakLen; CUE.brk(); } // water break between rounds
      else { phase = 'rest'; left = fmt.rest; CUE.rest(); }
    } else { // rest or break over → next station (or next round)
      station++;
      if (station > fmt.stations) { station = 1; round++; }
      phase = 'work'; left = fmt.work; CUE.work();
    }
    highlight(); tickUI();
  }
  function finish() {
    clearInterval(iv); running = false;
    phase = 'done';
    highlight(); // clears station highlights + who-dots
    phaseEl.textContent = 'DONE 🎉'; phaseEl.className = 'timer-phase work';
    clockEl.textContent = '✓';
    subEl.textContent = 'Circuit complete — hit Finish workout below.';
    CUE.circuitDone();
    if (navigator.vibrate) navigator.vibrate([150, 80, 150, 80, 300]);
    syncPhoneAnim();
    skipBtn.style.display = 'none';
    if (!sessionLog()) keepAwake(false);
    startBtn.style.display = 'none';
    publish();
  }
  startBtn.onclick = () => {
    if (running) { // pause
      clearInterval(iv); running = false;
      startBtn.textContent = '▶ Resume';
      if (!sessionLog()) keepAwake(false);
      publish();
      return;
    }
    running = true;
    startBtn.textContent = '⏸ Pause';
    resetBtn.style.display = '';
    keepAwake(true);
    if (!sessionLog()) startWorkoutSession(false); // starting the circuit starts the workout clock
    if (phase === 'prep') { highlight(); tickUI(); }
    publish();
    beep(660, 0.15);
    iv = setInterval(() => {
      left--;
      if (left <= 3 && left > 0) CUE.count();
      if (left <= 0) advance();
      else tickUI();
    }, 1000);
  };
  skipBtn.onclick = () => { if (phase === 'break') advance(); };
  resetBtn.onclick = () => {
    clearInterval(iv); running = false;
    round = 1; station = 1; phase = 'prep'; left = 10;
    workDone = 0; reportProgress();
    startBtn.style.display = ''; startBtn.textContent = '▶ Start circuit';
    skipBtn.style.display = 'none';
    phaseEl.textContent = 'READY'; phaseEl.className = 'timer-phase';
    clockEl.textContent = fmt.work;
    subEl.textContent = `Round 1 of ${fmt.rounds} · Station 1 of ${fmt.stations}`;
    highlight();
    syncPhoneAnim();
    if (!sessionLog()) keepAwake(false);
    publish();
  };
  // people picker (and TV) can nudge us when the roster changes mid-workout
  window.circuitRefresh = () => { highlight(); syncPhoneAnim(); publish(); };
  window.circuitTimerCleanup = () => { clearInterval(iv); running = false; };
  highlight();
  syncPhoneAnim();
  publish();
}

// ----- WEEK -----
function renderWeek() {
  const plan = buildWeek(new Date());
  const status = weekStatus(user);
  const v = el('<div class="view active"></div>');
  v.appendChild(el(`
    <div class="week-banner">
      <div>
        <div style="font-weight:800">This Week — ${plan.deload ? 'Deload' : 'Week ' + plan.weekOfBlock + ' of 4'}</div>
        <div class="muted small">Block: ${esc(plan.blockName)} · ${esc(plan.blockFocus)}</div>
      </div>
    </div>`));

  for (const d of ['A', 'B', 'C']) {
    const day = plan.days[d];
    let detail;
    if (d === 'C') {
      detail = day.format.desc + '<br>' + day.stations.map(id => esc(EXERCISES[id].name)).join(' · ');
    } else {
      const slots = day.slots.filter(s => user === 'luke' || !s.bonus);
      detail = slots.map(s => `${esc(EXERCISES[s.exId].name)}${s.anchor ? ' ⭐' : ''}`).join(' · ');
    }
    v.appendChild(el(`
      <div class="card">
        <div class="wk-day">
          <div class="wk-badge ${status[d] ? 'done' : ''}">${d}</div>
          <div style="flex:1">
            <div style="font-weight:800">${esc(day.title)} ${status[d] ? `<span class="muted small">· done ${fmtDate(status[d].split('#')[0])}</span>` : ''}</div>
            <div class="muted small" style="margin-top:4px">${detail}</div>
          </div>
        </div>
      </div>`));
  }

  // next week preview
  const next = buildWeek(new Date(Date.now() + 7 * 24 * 3600 * 1000));
  v.appendChild(el(`<div class="card">
    <h3>👀 Next week</h3>
    <div class="muted small">${next.deload ? 'Deload week — lighter and fast.' : next.weekOfBlock === 1 ? `New block starts: <b>${esc(next.blockName)}</b> — new anchor lifts!` : `Week ${next.weekOfBlock} of ${esc(next.blockName)} — same anchors (go heavier), fresh accessories.`}</div>
  </div>`));
  main.appendChild(v);
}

// ----- PROGRESS -----
function renderProgress() {
  const v = el('<div class="view active"></div>');
  const logs = store.logs[user] || {};
  const completedLogs = Object.entries(logs).filter(([, l]) => l.completedAt);
  const thisWeek = Object.values(logs).filter(l => l.week === weekKey(new Date()) && l.completedAt).length;

  v.appendChild(el(`
    <div class="stat-grid">
      <div class="stat"><div class="stat-num">${streak(user)}</div><div class="stat-label">WEEK STREAK</div></div>
      <div class="stat"><div class="stat-num">${thisWeek}/3</div><div class="stat-label">THIS WEEK</div></div>
      <div class="stat"><div class="stat-num">${completedLogs.length}</div><div class="stat-label">TOTAL WORKOUTS</div></div>
    </div>`));

  // cardio (bonus work, tracked separately from the 3 lifting days)
  const cd = (store.cardio || {})[user] || {};
  const allCardio = Object.values(cd).flat();
  if (allCardio.length) {
    const weekCardio = Object.entries(cd).filter(([iso]) => weekKeyOfIso(iso) === weekKey(new Date())).flatMap(([, a]) => a);
    const totalMin = allCardio.reduce((n, s) => n + (s.m || 0), 0);
    v.appendChild(el(`<div class="card"><h3>🏃 Bonus cardio</h3><div class="muted small">${weekCardio.length ? weekCardio.length + ' session' + (weekCardio.length > 1 ? 's' : '') + ' this week · ' : ''}${allCardio.length} total session${allCardio.length > 1 ? 's' : ''} · ${totalMin} total minutes</div></div>`));
  }

  // 8-week consistency bars
  const cons = el('<div class="card"><h3>Consistency — last 8 weeks</h3><div class="consistency"></div><div class="muted small" style="margin-top:6px">Green = hit all 3 workouts that week.</div></div>');
  const bars = cons.querySelector('.consistency');
  for (let i = 7; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - 7 * i);
    const wk = weekKey(d);
    const count = Object.values(logs).filter(l => l.week === wk && l.completedAt).length;
    const h = Math.max(6, Math.min(3, count) / 3 * 44);
    bars.appendChild(el(`<div class="cbar"><div class="bar ${count >= 3 ? 'hit' : ''}" style="height:${h}px"></div><div class="clabel">${i === 0 ? 'now' : i + 'w'}</div></div>`));
  }
  v.appendChild(cons);

  // per-exercise history
  const byEx = {};
  for (const [iso, log] of completedLogs) {
    for (const [exId, sets] of Object.entries(log.entries || {})) {
      const best = Math.max(0, ...sets.map(s => s.w || 0));
      const bestReps = Math.max(0, ...sets.map(s => s.r || 0));
      if (best > 0 || bestReps > 0) {
        (byEx[exId] = byEx[exId] || []).push({ iso: iso.split('#')[0], best, bestReps });
      }
    }
  }
  const exCard = el('<div class="card"><h3>Lift history</h3></div>');
  const exIds = Object.keys(byEx).sort((a, b) => EXERCISES[a].name.localeCompare(EXERCISES[b].name));
  if (!exIds.length) {
    exCard.appendChild(el('<div class="muted small">Log a workout and your lifts will show up here with trend lines.</div>'));
  }
  for (const exId of exIds) {
    const hist = byEx[exId].sort((a, b) => a.iso.localeCompare(b.iso));
    const latest = hist[hist.length - 1];
    const isLb = EXERCISES[exId].unit === 'lb';
    const row = el(`
      <div class="ex-history">
        <div class="eh-head">
          <div class="eh-name">${esc(EXERCISES[exId].name)}</div>
          <div class="eh-last">${isLb ? latest.best + ' lb' : latest.bestReps + ' reps'}</div>
        </div>
      </div>`);
    if (hist.length >= 2) {
      const vals = hist.map(h => isLb ? h.best : h.bestReps);
      const min = Math.min(...vals), max = Math.max(...vals);
      const range = (max - min) || 1;
      const pts = vals.map((val, i) => {
        const x = 4 + (i / (vals.length - 1)) * 292;
        const y = 40 - ((val - min) / range) * 32;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      }).join(' ');
      row.appendChild(el(`<svg class="sparkline" viewBox="0 0 300 46" preserveAspectRatio="none">
        <polyline points="${pts}" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`));
    }
    exCard.appendChild(row);
  }
  v.appendChild(exCard);
  main.appendChild(v);
}

// ----- SETTINGS -----
function renderSettings() {
  const v = el('<div class="view active"></div>');
  const s = store.settings;
  const card = el(`
    <div class="card">
      <h3>Settings</h3>
      <div class="settings-row">
        <label>This phone belongs to</label>
        <div class="user-toggle">
          <button id="def-luke" class="${s.defaultUser === 'luke' ? 'active-luke' : ''}">Luke</button>
          <button id="def-kristen" class="${s.defaultUser === 'kristen' ? 'active-kristen' : ''}">Kristen</button>
        </div>
      </div>
      <div class="settings-row">
        <label>Playlist link</label>
        <input type="url" id="playlist" placeholder="Apple Music URL" value="${esc(s.playlist || '')}">
      </div>
      <div class="settings-row">
        <label>Backup</label>
        <div class="btn-row" style="max-width:60%">
          <button class="btn secondary" id="exp" style="padding:8px">Export</button>
          <button class="btn secondary" id="imp" style="padding:8px">Import</button>
        </div>
      </div>
    </div>`);
  card.querySelector('#def-luke').onclick = () => { s.defaultUser = 'luke'; save(); render(); };
  card.querySelector('#def-kristen').onclick = () => { s.defaultUser = 'kristen'; save(); render(); };
  card.querySelector('#playlist').onchange = (e) => { s.playlist = e.target.value.trim(); save(); toast('Playlist saved 🎵'); };
  card.querySelector('#exp').onclick = () => {
    const blob = new Blob([JSON.stringify(store, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = '648-workout-backup-' + todayISO() + '.json';
    a.click();
  };
  card.querySelector('#imp').onclick = () => {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = '.json';
    inp.onchange = () => {
      const f = inp.files[0]; if (!f) return;
      const rd = new FileReader();
      rd.onload = () => {
        try {
          const data = JSON.parse(rd.result);
          if (!data.logs) throw new Error('bad file');
          store = data; save(); toast('Backup restored ✓'); render();
        } catch (err) { toast('That file doesn\'t look like a backup.'); }
      };
      rd.readAsText(f);
    };
    inp.click();
  };
  v.appendChild(card);

  v.appendChild(el(`
    <div class="card">
      <h3>📖 How this program works</h3>
      <div class="muted small" style="line-height:1.55">
        <b>3 days a week, any days:</b> Day A (lower + core), Day B (upper), Day C (total-body circuit + core). Order matters less than showing up.<br><br>
        <b>4-week blocks:</b> the ⭐ anchor lifts stay the same for 4 weeks so you can add weight to them — that's the whole game. Everything else rotates weekly so it never gets boring.<br><br>
        <b>Week 4 = deload:</b> go ~10% lighter and move fast. It feels too easy on purpose. That's what makes the next block's weights go up.<br><br>
        <b>The green nudge</b> on an exercise means you earned a heavier weight. Trust it.<br><br>
        <b>Time caps:</b> Luke ~40 min (does the ⚡ bonus work), Kristen ~30 min (skips bonus items, one fewer set on anchors). Same workout, different dose.<br><br>
        <b>If you only have 20 minutes:</b> do the two anchor lifts and leave. A short workout beats a skipped one, every time.
      </div>
    </div>`));

  v.appendChild(el(`<div class="card"><div class="muted small">648 Workout · data lives on this phone only — use Export now and then for a backup. Built with 💪 by Claude for Luke &amp; Kristen.</div></div>`));
  main.appendChild(v);
}

// ---------- Wire up ----------
document.getElementById('u-luke').onclick = () => { user = 'luke'; selectedDay = null; shortMode = false; render(); };
document.getElementById('u-kristen').onclick = () => { user = 'kristen'; selectedDay = null; shortMode = false; render(); };
document.querySelectorAll('nav button').forEach(b => {
  b.onclick = () => { currentView = b.dataset.view; render(); };
});

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

render();
