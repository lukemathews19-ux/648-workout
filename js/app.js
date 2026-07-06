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

function renderCircuitDay(v, day, status) {
  const fmt = shortMode
    ? { ...day.format, rounds: 2, desc: day.format.desc.replace(/3 rounds/, '2 rounds') }
    : day.format;
  const existing = getDayLog(user, status[selectedDay] || todayISO());
  const completed = !!(existing && existing.day === 'C' && existing.completedAt);

  v.appendChild(el(`<div class="card"><h3>🔄 ${esc(fmt.name)}</h3><div class="muted small">${esc(fmt.desc)}. Move station to station — write nothing down, just work. ${user === 'kristen' ? 'Kristen: you\'re done after the 3 rounds.' : ''}</div></div>`));

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
        <a class="demo-link" href="${demoUrl(exId)}" target="_blank">🎬</a>
      </div>`));
  });
  v.appendChild(listCard);

  if (user === 'luke' && !shortMode) {
    const fex = EXERCISES[day.finisher.exId];
    v.appendChild(el(`<div class="card"><h3>🥵 Finisher: ${esc(fex.name)}</h3><div class="muted small">${esc(day.finisher.desc)}</div><div class="cue">💡 ${esc(fex.cue)}</div></div>`));
  }

  // Timer card
  const totalPerRound = fmt.stations * (fmt.work + fmt.rest);
  const totalMin = Math.round(fmt.rounds * totalPerRound / 60);
  const timer = el(`
    <div class="card">
      <div class="timer-wrap">
        <div class="timer-phase" id="t-phase">READY · ~${totalMin} MIN</div>
        <div class="timer-clock" id="t-clock">${fmt.work}</div>
        <div class="timer-sub" id="t-sub">Round 1 of ${fmt.rounds} · Station 1 of ${fmt.stations}</div>
        <div class="btn-row">
          <button class="btn" id="t-start">▶ Start circuit</button>
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
  if (shortMode) log.short = true;
  shortMode = false;
  save();
  const status = weekStatus(user);
  const n = ['A', 'B', 'C'].filter(d => status[d]).length;
  const name = user === 'luke' ? 'Luke' : 'Kristen';
  if (n >= 3) toast(`🎉 ${name}: that's 3 for 3 this week. Streak: ${streak(user)} week${streak(user) === 1 ? '' : 's'}!`);
  else toast(`💪 Nice work, ${name}! ${n}/3 this week — ${3 - n} to go.`);
  if (navigator.vibrate) navigator.vibrate([80, 40, 80]);
  selectedDay = null;
  render();
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

let wakeLock = null;
async function keepAwake(on) {
  try {
    if (on && 'wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen');
    else if (wakeLock) { wakeLock.release(); wakeLock = null; }
  } catch (err) { /* not fatal */ }
}

function wireCircuitTimer(timerEl, fmt, stations, listCard) {
  const phaseEl = timerEl.querySelector('#t-phase');
  const clockEl = timerEl.querySelector('#t-clock');
  const subEl = timerEl.querySelector('#t-sub');
  const startBtn = timerEl.querySelector('#t-start');
  const resetBtn = timerEl.querySelector('#t-reset');
  let running = false, iv = null;
  let round = 1, station = 1, phase = 'prep', left = 10;

  function stationOrder(r) {
    // "The Gauntlet" reverses station order on even rounds
    const idx = [...Array(fmt.stations).keys()];
    return (fmt.name === 'The Gauntlet' && r % 2 === 0) ? idx.reverse() : idx;
  }
  function highlight() {
    const order = stationOrder(round);
    const exIdx = order[station - 1];
    listCard.querySelectorAll('.station').forEach((s, i) => s.classList.toggle('current', i === exIdx));
    const ex = EXERCISES[stations[exIdx]];
    subEl.textContent = `Round ${round} of ${fmt.rounds} · Station ${station}: ${ex.name}`;
  }
  function tickUI() {
    clockEl.textContent = left;
    phaseEl.textContent = phase === 'prep' ? 'GET READY' : phase === 'work' ? 'WORK' : 'REST';
    phaseEl.className = 'timer-phase ' + (phase === 'work' ? 'work' : phase === 'rest' ? 'rest' : '');
  }
  function advance() {
    if (phase === 'prep') { phase = 'work'; left = fmt.work; beep(880, 0.35); }
    else if (phase === 'work') {
      if (station === fmt.stations && round === fmt.rounds) return finish();
      phase = 'rest'; left = fmt.rest; beep(440, 0.5);
    } else {
      station++;
      if (station > fmt.stations) { station = 1; round++; }
      phase = 'work'; left = fmt.work; beep(880, 0.35);
    }
    highlight(); tickUI();
  }
  function finish() {
    clearInterval(iv); running = false;
    phase = 'done';
    phaseEl.textContent = 'DONE 🎉'; phaseEl.className = 'timer-phase work';
    clockEl.textContent = '✓';
    subEl.textContent = 'Circuit complete — hit Finish workout below.';
    beep(880, 0.3); setTimeout(() => beep(1100, 0.3), 350); setTimeout(() => beep(1320, 0.5), 700);
    if (navigator.vibrate) navigator.vibrate([150, 80, 150, 80, 300]);
    listCard.querySelectorAll('.station').forEach(s => s.classList.remove('current'));
    keepAwake(false);
    startBtn.style.display = 'none';
  }
  startBtn.onclick = () => {
    if (running) { // pause
      clearInterval(iv); running = false;
      startBtn.textContent = '▶ Resume';
      keepAwake(false);
      return;
    }
    running = true;
    startBtn.textContent = '⏸ Pause';
    resetBtn.style.display = '';
    keepAwake(true);
    if (phase === 'prep') { highlight(); tickUI(); }
    beep(660, 0.15);
    iv = setInterval(() => {
      left--;
      if (left <= 3 && left > 0) beep(660, 0.12);
      if (left <= 0) advance();
      else tickUI();
    }, 1000);
  };
  resetBtn.onclick = () => {
    clearInterval(iv); running = false;
    round = 1; station = 1; phase = 'prep'; left = 10;
    startBtn.style.display = ''; startBtn.textContent = '▶ Start circuit';
    phaseEl.textContent = 'READY'; phaseEl.className = 'timer-phase';
    clockEl.textContent = fmt.work;
    subEl.textContent = `Round 1 of ${fmt.rounds} · Station 1 of ${fmt.stations}`;
    listCard.querySelectorAll('.station').forEach(s => s.classList.remove('current'));
    keepAwake(false);
  };
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
    a.download = 'iron-together-backup-' + todayISO() + '.json';
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

  v.appendChild(el(`<div class="card"><div class="muted small">Iron Together v1 · data lives on this phone only — use Export now and then for a backup. Built with 💪 by Claude for Luke &amp; Kristen.</div></div>`));
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
