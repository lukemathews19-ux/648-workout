/* Me tab: Luke's plan hub (habits, Sunday check-in, peptide tracker, reference).

   Shown only when the header is on Luke AND this phone is set to Luke
   (More -> "This phone belongs to"), so Kristen's app looks and works exactly
   as before.

   PRIVACY: this repo is public. Nothing personal goes in this file: no
   compounds, doses, body numbers, labs or links. All of that is typed in on
   the phone (or imported from a setup file) and lives in localStorage under
   store.me, inside the same iron_together_v1 key, so Export/Import carry it.

   store.me = {
     days:     { 'YYYY-MM-DD': { move, protein, sleep, alcohol (true when checked), drinks, wt } },
     checkins: { '<Monday ISO of the week>': { waist, bf, savedAt } },
     peptides: [ { id, name, dose, mode: 'days'|'every', days: [0-6, 0 = Sun], every, timing: 'AM'|'PM'|'', start, weeks } ],
     doses:    { 'YYYY-MM-DD': { <peptide id>: true } },
     links:    { plan, meal },
     open:     { today, checkin, peptides, ref },  // which cards are expanded
   }
   `move` is only stored when tapped by hand. Otherwise it's read from the
   workout log: a finished A/B/C day, or a 💚 Zone 2 cardio log. */

const ME_SLEEP_RULES = [
  'Same wake time every day, weekends included. It anchors everything else.',
  '9:30 pm wind-down alarm: screens down, lights low.',
  'Phone charges outside the bedroom.',
  'No caffeine after 1 pm.',
  'No alcohol within 3 hours of bed.',
  'Cool, dark room, around 65–67°F.',
  '10 minutes of morning daylight.',
];
const ME_DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

let meCheckWeek = null;  // 'this' | 'last' (check-in card week chips)
let meEdit = null;       // draft of the compound being added/edited, or null
let meDelArm = false;    // two-tap delete on the compound form
let meLinkEdit = false;  // show the link inputs on the Reference card

function meVisible() {
  return user === 'luke' && (store.settings.defaultUser || 'luke') === 'luke';
}

function ensureMe() {
  const m = store.me = store.me || {};
  m.days = m.days || {};
  m.checkins = m.checkins || {};
  m.peptides = m.peptides || [];
  m.doses = m.doses || {};
  m.links = m.links || {};
  m.open = m.open || { today: true };
  return m;
}

// ---------- dates (local time, 'YYYY-MM-DD') ----------
function meIso(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function meDate(iso) { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); }
function meAdd(iso, n) { const d = meDate(iso); d.setDate(d.getDate() + n); return meIso(d); }
function meDiff(a, b) { return Math.round((meDate(a) - meDate(b)) / 86400000); } // a minus b, in days
function meWeekDates(iso) { const mon = weekKey(meDate(iso)); return [0, 1, 2, 3, 4, 5, 6].map(i => meAdd(mon, i)); }

function meDayGet(iso) { return store.me.days[iso] || {}; }
function meDaySet(iso) { return (store.me.days[iso] = store.me.days[iso] || {}); }

// ---------- training: read from the workout log ----------
function meTrainingFor(iso) {
  const dow = meDate(iso).getDay();
  if (dow === 1 || dow === 3 || dow === 5) return 'lift';
  if (dow === 2 || dow === 4) return 'z2';
  return dow === 6 ? 'sat' : 'rest';
}
function meLiftLogged(iso) {
  const logs = store.logs.luke || {};
  return [iso, iso + '#2'].some(k => logs[k] && logs[k].completedAt && ['A', 'B', 'C'].includes(logs[k].day));
}
function meZ2Logged(iso) {
  const list = ((store.cardio || {}).luke || {})[iso] || [];
  return list.some(s => s.mode === 'z2');
}
function meLiftsThisWeek(iso) {
  const st = weekStatus('luke', meDate(iso));
  return ['A', 'B', 'C'].filter(d => st[d]).length;
}
function meMoveAuto(iso) {
  if (meLiftLogged(iso) || meZ2Logged(iso)) return true;
  return meTrainingFor(iso) === 'lift' && meLiftsThisWeek(iso) >= 3; // 3/3 already banked
}
function meMoveDone(iso) {
  const o = meDayGet(iso).move;
  return o === undefined ? meMoveAuto(iso) : o;
}

// ---------- weekly score (1 point each, out of 5) ----------
// Lift = 3 program days logged · Zone 2 = 2 logged · protein and sleep = 6 of 7
// days · alcohol = all 7. Each pill is green when earned, red once it can't be
// earned this week, gray while still in play.
function meWeekScore(anyIso) {
  const dates = meWeekDates(anyIso);
  const today = todayISO();
  const D = meDayGet;
  const left = dates.filter(d => d >= today).length;
  const lifts = Math.min(3, meLiftsThisWeek(anyIso) +
    dates.filter(d => meTrainingFor(d) === 'lift' && D(d).move === true && !meLiftLogged(d)).length);
  const z2 = Math.min(2, dates.filter(d =>
    (meZ2Logged(d) && D(d).move !== false) || (meTrainingFor(d) === 'z2' && D(d).move === true)).length);
  const habit = (key, label, need) => {
    const c = dates.filter(d => D(d)[key]).length;
    const missed = dates.filter(d => d < today && !D(d)[key]).length;
    return { key, label, txt: c + '/7', st: c >= need ? 'yes' : missed > 7 - need ? 'no' : 'open' };
  };
  const items = [
    { key: 'lift', label: 'Lift', txt: lifts + '/3', st: lifts >= 3 ? 'yes' : lifts + left < 3 ? 'no' : 'open' },
    { key: 'z2', label: 'Zone 2', txt: z2 + '/2', st: z2 >= 2 ? 'yes' : z2 + left < 2 ? 'no' : 'open' },
    habit('protein', 'Protein', 6),
    habit('sleep', 'Sleep', 6),
    habit('alcohol', 'Alcohol', 7),
  ];
  return { items, score: items.filter(i => i.st === 'yes').length, final: today > dates[6], dates };
}

function meWeekBody(anyIso) {
  const dates = meWeekDates(anyIso);
  const wts = dates.map(d => meDayGet(d).wt).filter(w => w > 0);
  const tracked = dates.some(d => store.me.days[d]);
  return {
    avg: wts.length ? wts.reduce((a, b) => a + b, 0) / wts.length : null,
    n: wts.length,
    drinks: tracked ? dates.reduce((n, d) => n + (meDayGet(d).drinks || 0), 0) : null,
  };
}
function meTrailingAvg(iso) {
  const wts = [0, 1, 2, 3, 4, 5, 6].map(i => meDayGet(meAdd(iso, -i)).wt).filter(w => w > 0);
  return wts.length ? { avg: wts.reduce((a, b) => a + b, 0) / wts.length, n: wts.length } : null;
}

// last n weeks (oldest first), for trend lines
function meHistory(n) {
  const thisMon = weekKey(new Date());
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const mon = meAdd(thisMon, -7 * i);
    const body = meWeekBody(mon);
    const ci = store.me.checkins[mon] || {};
    const tracked = meWeekDates(mon).some(d => store.me.days[d]);
    out.push({
      mon, avg: body.avg, drinks: body.drinks,
      waist: ci.waist || null, bf: ci.bf || null,
      score: tracked ? meWeekScore(mon).score : null,
    });
  }
  return out;
}

function meSpark(vals) {
  const v = vals.filter(x => x != null);
  if (v.length < 2) return '';
  const min = Math.min(...v), max = Math.max(...v), range = (max - min) || 1;
  const pts = v.map((val, i) => `${(2 + i / (v.length - 1) * 96).toFixed(1)},${(21 - (val - min) / range * 18).toFixed(1)}`).join(' ');
  return `<svg class="sparkline me-spark" viewBox="0 0 100 24" preserveAspectRatio="none"><polyline points="${pts}" fill="none" stroke="var(--accent)" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}
function meDelta(vals, unit) {
  const v = vals.filter(x => x != null);
  if (v.length < 2) return '';
  const d = v[v.length - 1] - v[0];
  const sign = d > 0 ? '+' : d < 0 ? '−' : '±';
  return `<div class="me-delta">${sign}${Math.abs(d).toFixed(1)}${unit} over ${v.length} wks</div>`;
}
function meNum(n, dp = 1) { return n == null ? '—' : (Math.round(n * 10 ** dp) / 10 ** dp).toFixed(dp); }

// ---------- peptides ----------
function meLastDose(id, beforeIso) {
  let best = null;
  for (const [d, m] of Object.entries(store.me.doses)) {
    if (m[id] && d < beforeIso && (!best || d > best)) best = d;
  }
  return best;
}
function mePepEnd(p) { return p.start && p.weeks ? meAdd(p.start, p.weeks * 7) : null; } // first day after the run
function mePepStatus(p, iso) {
  const taken = !!(store.me.doses[iso] || {})[p.id];
  if (p.start && iso < p.start) return { state: 'before', taken, inDays: meDiff(p.start, iso) };
  const end = mePepEnd(p);
  if (end && iso >= end) return { state: 'done', taken };
  const week = p.start ? Math.floor(meDiff(iso, p.start) / 7) + 1 : null;
  if (p.mode === 'every') {
    const last = meLastDose(p.id, iso);
    const next = last ? meAdd(last, p.every || 7) : (p.start || iso);
    const late = meDiff(iso, next);
    return { state: late >= 0 ? 'due' : 'off', taken, week, last, next, late };
  }
  return { state: (p.days || []).includes(meDate(iso).getDay()) ? 'due' : 'off', taken, week };
}
function meSchedText(p) {
  if (p.mode === 'every') return `Every ${p.every} day${p.every == 1 ? '' : 's'}`;
  const d = (p.days || []).slice().sort((a, b) => a - b);
  if (d.length === 7) return 'Every day';
  if (d.join() === '1,2,3,4,5') return 'Mon–Fri';
  return d.length ? d.map(i => ME_DAY_NAMES[i]).join(', ') : 'No days picked';
}
function mePepLine(p, iso) {
  const s = mePepStatus(p, iso);
  const end = mePepEnd(p);
  if (s.state === 'before') return `${meSchedText(p)} · starts ${fmtDate(p.start)} (in ${s.inDays} day${s.inDays === 1 ? '' : 's'})`;
  if (s.state === 'done') return `Finished ${fmtDate(meAdd(end, -1))}`;
  const parts = [meSchedText(p)];
  if (p.weeks && s.week) parts.push(`week ${s.week} of ${p.weeks}`);
  if (p.mode === 'every') {
    parts.push(s.last ? `last ${fmtDate(s.last)}` : 'no dose logged yet');
    if (s.late > 0) parts.push(`${s.late} day${s.late === 1 ? '' : 's'} late`);
    else if (s.late < 0) parts.push(`next ${fmtDate(s.next)}`);
  }
  if (end) parts.push(`ends ${fmtDate(meAdd(end, -1))}`);
  return parts.join(' · ');
}
function meToggleDose(id, iso) {
  const m = store.me.doses[iso] = store.me.doses[iso] || {};
  if (m[id]) delete m[id]; else m[id] = true;
  if (!Object.keys(m).length) delete store.me.doses[iso];
  save();
  render();
}
function meNewId() { return 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

// Setup-file import (More -> Import with a file that has `me` but no `logs`):
// merges into store.me and never touches workout logs. Compounds match by id,
// then by name, so re-importing updates instead of duplicating.
function meMergeSetup(inc) {
  ensureMe();
  for (const p of inc.peptides || []) {
    if (!p || !p.name) continue;
    const i = store.me.peptides.findIndex(x => (p.id && x.id === p.id) || x.name.toLowerCase() === String(p.name).toLowerCase());
    if (i >= 0) store.me.peptides[i] = { ...store.me.peptides[i], ...p, id: store.me.peptides[i].id };
    else store.me.peptides.push({ ...p, id: p.id || meNewId() });
  }
  for (const k of ['plan', 'meal']) if (inc.links && inc.links[k]) store.me.links[k] = inc.links[k];
  for (const k of ['days', 'checkins', 'doses']) if (inc[k]) Object.assign(store.me[k], inc[k]);
}

// ---------- UI building blocks ----------
// forceOpen: opens the card for this visit (e.g. check-in on Sunday) without
// changing the saved open/closed choice; tapping the header closes it again.
let meAutoClosed = {};
function meCard(key, title, summary, hot, build, forceOpen) {
  const forced = forceOpen && !store.me.open[key] && !meAutoClosed[key];
  const open = forced || !!store.me.open[key];
  const card = el(`<div class="card me-card ${open ? 'open' : ''}">
    <div class="me-head"><h3>${title}</h3><div class="me-sum ${hot ? 'hot' : ''}">${summary} <span class="me-chev">▾</span></div></div>
  </div>`);
  card.querySelector('.me-head').onclick = () => {
    if (forced) meAutoClosed[key] = true;
    else { store.me.open[key] = !open; save(); }
    render();
  };
  if (open) {
    const body = el('<div class="me-body"></div>');
    build(body);
    card.appendChild(body);
  }
  return card;
}
function meCheckRow(on, label, sub, onTap, extra) {
  const row = el(`<div class="me-row ${on ? 'on' : ''}">
    <div class="me-check">✓</div>
    <div class="me-label">${label}${sub ? `<span class="muted small">${sub}</span>` : ''}</div>
    ${extra || ''}
  </div>`);
  row.onclick = onTap;
  return row;
}

// ---------- the tab ----------
function renderMe() {
  ensureMe();
  const today = todayISO();
  const v = el('<div class="view active" id="view-me"></div>');
  v.appendChild(meTodayCard(today));
  v.appendChild(meCheckinCard(today));
  v.appendChild(mePeptideCard(today));
  v.appendChild(meRefCard());
  v.appendChild(el('<div class="muted small" style="text-align:center;margin:2px 0 10px">Saved on this phone only. Export in More backs it up.</div>'));
  main.appendChild(v);
}

// 1) Today: the daily habit taps + doses due
function meTodayCard(today) {
  const d = meDayGet(today);
  const type = meTrainingFor(today);
  const due = store.me.peptides
    .map(p => ({ p, s: mePepStatus(p, today) }))
    .filter(x => (x.s.state === 'due' || x.s.taken) && x.s.state !== 'before')
    .sort((a, b) => ({ AM: 0, '': 1, PM: 2 }[a.p.timing || ''] - { AM: 0, '': 1, PM: 2 }[b.p.timing || '']));

  const counted = [d.protein, d.sleep, d.alcohol, ...due.map(x => x.s.taken)];
  if (type === 'lift' || type === 'z2') counted.unshift(meMoveDone(today));
  const done = counted.filter(Boolean).length;
  const dateLbl = new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });

  return meCard('today', `☀️ Today <span class="muted small">· ${esc(dateLbl)}</span>`,
    `${done} of ${counted.length} done`, done === counted.length, (body) => {
      const tog = (key) => () => {
        const day = meDaySet(today);
        if (day[key]) delete day[key]; else day[key] = true;
        save(); render();
      };

      // training row (auto-checked from the workout log, tap to override)
      if (type === 'rest') {
        body.appendChild(el('<div class="me-row static"><div class="me-check rest">😌</div><div class="me-label">Rest day<span class="muted small">Sunday: meal prep and the check-in below</span></div></div>'));
      } else {
        const auto = meDayGet(today).move === undefined && meMoveAuto(today);
        let label, sub;
        if (type === 'lift') {
          const st = weekStatus('luke');
          const plan = buildWeek(new Date());
          const todays = ['A', 'B', 'C'].find(x => st[x] && st[x].split('#')[0] === today);
          const next = todays || ['A', 'B', 'C'].find(x => !st[x]);
          label = next ? `🏋️ Lift · Day ${next}` : '🏋️ Lift';
          sub = auto ? (meLiftLogged(today) ? 'Checked from your workout log' : '3/3 lifts done this week')
            : next ? esc(plan.days[next].title) : '';
        } else if (type === 'z2') {
          label = '💚 Zone 2 · Greenway';
          sub = auto ? 'Logged in your cardio ✓' : 'Tap 30 or 45 to log it';
        } else {
          label = '🚶 Walk, hike or intervals';
          sub = 'Bonus, not scored';
        }
        // Zone 2 not logged yet: 30/45 buttons write a real 💚 Zone 2 cardio log,
        // so it also shows in the weekly recap, Week tab and Progress
        const z2Btns = type === 'z2' && !meMoveDone(today)
          ? '<div class="me-count"><button class="me-mini wide" data-m="30">30</button><button class="me-mini wide" data-m="45">45</button></div>' : '';
        const trow = meCheckRow(meMoveDone(today), label, sub, () => {
          const day = meDaySet(today);
          const nv = !meMoveDone(today);
          if (nv === meMoveAuto(today)) delete day.move; else day.move = nv;
          save(); render();
        }, z2Btns);
        trow.querySelectorAll('[data-m]').forEach(b => b.onclick = (e) => {
          e.stopPropagation();
          const m = Number(b.dataset.m);
          store.cardio = store.cardio || { luke: {}, kristen: {} };
          store.cardio.luke = store.cardio.luke || {};
          (store.cardio.luke[today] = store.cardio.luke[today] || []).push({ t: m === 45 ? 'Zone 2 · Long Greenway' : 'Zone 2 · Greenway', m, mode: 'z2' });
          const day = meDaySet(today);
          delete day.move;
          save();
          toast(`💚 ${m} min of Zone 2 logged`);
          render();
        });
        body.appendChild(trow);
      }

      body.appendChild(meCheckRow(d.protein, '🥩 Protein ~160 g', '', tog('protein')));
      body.appendChild(meCheckRow(d.sleep, '😴 Up 5:30 · lights out 10', '', tog('sleep')));

      const drinks = d.drinks || 0;
      const alc = meCheckRow(d.alcohol, '🍺 Alcohol rules held', `${drinks} drink${drinks === 1 ? '' : 's'} today`, tog('alcohol'),
        `<div class="me-count"><button class="me-mini" data-d="-1" aria-label="One less drink">−</button><button class="me-mini" data-d="1" aria-label="Add a drink">+</button></div>`);
      alc.querySelectorAll('.me-mini').forEach(b => b.onclick = (e) => {
        e.stopPropagation();
        const day = meDaySet(today);
        day.drinks = Math.max(0, (day.drinks || 0) + Number(b.dataset.d));
        save(); render();
      });
      body.appendChild(alc);

      // morning weigh-in (feeds the 7-day average)
      const tr = meTrailingAvg(today);
      const wrow = el(`<div class="me-row static">
        <div class="me-check scale">⚖️</div>
        <div class="me-label">Morning weight<span class="muted small">${tr ? `7-day avg ${meNum(tr.avg)} lb (${tr.n} weigh-in${tr.n === 1 ? '' : 's'})` : 'Same time daily, after the bathroom'}</span></div>
        <input type="number" inputmode="decimal" step="0.1" class="me-input me-num" placeholder="lb" value="${d.wt || ''}">
      </div>`);
      wrow.querySelector('input').onchange = (e) => {
        const val = parseFloat(e.target.value);
        const day = meDaySet(today);
        if (val > 0) day.wt = Math.round(val * 10) / 10; else delete day.wt;
        save(); render();
      };
      body.appendChild(wrow);

      body.appendChild(el('<div class="me-section">Doses due today</div>'));
      if (!store.me.peptides.length) {
        body.appendChild(el('<div class="muted small" style="padding:6px 0">Add compounds in the Peptides card below.</div>'));
      } else if (!due.length) {
        body.appendChild(el('<div class="muted small" style="padding:6px 0">Nothing due today.</div>'));
      }
      for (const { p, s } of due) {
        const tag = (s.late > 0 ? `<span class="me-tag late">${s.late}d late</span>` : '') +
          (p.timing ? `<span class="me-tag">${esc(p.timing)}</span>` : '');
        body.appendChild(meCheckRow(s.taken, `💉 ${esc(p.name)}${p.dose ? ' · ' + esc(p.dose) : ''}`,
          s.state === 'due' ? '' : 'Off-schedule dose', () => meToggleDose(p.id, today), tag));
      }
    });
}

// 2) Sunday check-in: auto score + body numbers + trends
function meCheckinCard(today) {
  const thisMon = weekKey(new Date());
  const lastMon = meAdd(thisMon, -7);
  if (meCheckWeek === null) {
    const unsavedLast = !(store.me.checkins[lastMon] || {}).savedAt && meWeekDates(lastMon).some(d => store.me.days[d]);
    meCheckWeek = new Date().getDay() === 1 && unsavedLast ? 'last' : 'this';
  }
  const mon = meCheckWeek === 'last' ? lastMon : thisMon;
  const sc = meWeekScore(mon);
  const cur = meWeekScore(thisMon);
  const isSunday = new Date().getDay() === 0;
  const savedThis = !!(store.me.checkins[thisMon] || {}).savedAt;
  const summary = isSunday && !savedThis ? `Due today · ${cur.score}/5` : `This week ${cur.score}/5`;

  return meCard('checkin', '📋 Sunday check-in', summary, isSunday && !savedThis, (body) => {
    const chips = el('<div class="chips" style="margin-top:0"></div>');
    for (const [key, lbl, m] of [['this', 'This week', thisMon], ['last', 'Last week', lastMon]]) {
      const c = el(`<button class="chip ${meCheckWeek === key ? 'on' : ''}">${lbl} · ${fmtDate(m)}–${fmtDate(meAdd(m, 6))}</button>`);
      c.onclick = () => { meCheckWeek = key; render(); };
      chips.appendChild(c);
    }
    body.appendChild(chips);

    body.appendChild(el(`<div class="me-score"><span class="big">${sc.score}/5</span>
      <span class="muted">${sc.final ? (sc.score >= 4 ? 'a winning week 🎉' : 'week score') : 'so far · 4/5 is a win'}</span></div>`));
    body.appendChild(el(`<div class="me-pills">${sc.items.map(i => `<span class="me-pill ${i.st}">${i.label} ${i.txt}</span>`).join('')}</div>`));

    const hist = meHistory(8);
    const ci = store.me.checkins[mon] || {};
    const body8 = meWeekBody(mon);
    const tiles = el(`<div class="me-tiles">
      <div class="me-tile"><div class="lbl">7-day avg weight</div><div class="val">${meNum(body8.avg)}<span class="muted small"> lb</span></div>
        <div class="me-delta">${body8.n} weigh-in${body8.n === 1 ? '' : 's'}</div>${meSpark(hist.map(h => h.avg))}${meDelta(hist.map(h => h.avg), ' lb')}</div>
      <div class="me-tile"><div class="lbl">Waist at navel (in)</div>
        <input type="number" inputmode="decimal" step="0.1" class="me-input" data-k="waist" placeholder="in" value="${ci.waist || ''}">
        ${meSpark(hist.map(h => h.waist))}${meDelta(hist.map(h => h.waist), ' in')}</div>
      <div class="me-tile"><div class="lbl">Hume body fat %</div>
        <input type="number" inputmode="decimal" step="0.1" class="me-input" data-k="bf" placeholder="%" value="${ci.bf || ''}">
        ${meSpark(hist.map(h => h.bf))}${meDelta(hist.map(h => h.bf), '%')}</div>
      <div class="me-tile"><div class="lbl">Drinks this week</div><div class="val">${body8.drinks == null ? '—' : body8.drinks}</div>
        <div class="me-delta">From the daily counter</div>${meSpark(hist.map(h => h.drinks))}</div>
    </div>`);
    tiles.querySelectorAll('input[data-k]').forEach(inp => inp.onchange = () => {
      const c = store.me.checkins[mon] = store.me.checkins[mon] || {};
      const val = parseFloat(inp.value);
      if (val > 0) c[inp.dataset.k] = Math.round(val * 10) / 10; else delete c[inp.dataset.k];
      save(); render();
    });
    body.appendChild(tiles);

    // 8-week score bars (green = 4/5 or better)
    const bars = el('<div><div class="me-section">Score, last 8 weeks</div><div class="consistency"></div></div>');
    hist.forEach((h, i) => {
      const s = h.score;
      bars.querySelector('.consistency').appendChild(el(`<div class="cbar"><div class="bar ${s >= 4 ? 'hit' : ''}" style="height:${s == null ? 4 : Math.max(6, s / 5 * 44)}px"></div><div class="clabel">${i === hist.length - 1 ? 'now' : s == null ? '·' : s}</div></div>`));
    });
    body.appendChild(bars);

    const saved = (store.me.checkins[mon] || {}).savedAt;
    const btn = el(`<button class="btn ${saved ? 'secondary' : ''}" style="margin-top:12px">${saved ? `✓ Saved ${fmtDate(saved.slice(0, 10))} · tap to update` : '✓ Save check-in'}</button>`);
    btn.onclick = () => {
      const c = store.me.checkins[mon] = store.me.checkins[mon] || {};
      c.savedAt = todayISO();
      save();
      toast(`📋 Week saved: ${sc.score}/5${sc.score >= 4 ? ' — a win' : ''}`);
      render();
    };
    body.appendChild(btn);
  }, isSunday && !savedThis);
}

// 3) Peptide tracker
function mePeptideCard(today) {
  const list = store.me.peptides;
  const st = list.map(p => mePepStatus(p, today));
  const dueN = st.filter(s => s.state === 'due').length;
  const leftN = st.filter(s => s.state === 'due' && !s.taken).length;
  const summary = !list.length ? 'Not set up' : !dueN ? 'None due today' : leftN ? `${leftN} due today` : 'All done today ✓';

  return meCard('peptides', '💉 Peptides', summary, dueN > 0 && !leftN, (body) => {
    if (meEdit) { mePepForm(body); return; }
    if (!list.length) body.appendChild(el('<div class="muted small" style="padding-bottom:8px">Add each compound with its dose, days, start date and length. It shows up under Today on the days it\'s due.</div>'));
    const order = (p) => ({ due: 0, off: 1, before: 2, done: 3 }[mePepStatus(p, today).state]);
    list.slice().sort((a, b) => order(a) - order(b)).forEach(p => {
      const s = mePepStatus(p, today);
      const row = el(`<div class="me-pep ${s.state === 'done' ? 'done-pep' : ''}">
        <button class="me-check-btn ${s.taken ? 'on' : ''}" aria-label="Log today's dose">✓</button>
        <div class="me-label">${esc(p.name)}${p.dose ? ' · ' + esc(p.dose) : ''}${p.timing ? ` <span class="me-tag">${esc(p.timing)}</span>` : ''}
          <span class="muted small">${esc(mePepLine(p, today))}</span></div>
        <button class="me-mini" aria-label="Edit">✏️</button>
      </div>`);
      const [chk, edit] = row.querySelectorAll('button');
      chk.onclick = () => meToggleDose(p.id, today);
      edit.onclick = () => { meEdit = JSON.parse(JSON.stringify(p)); meDelArm = false; render(); };
      body.appendChild(row);
    });
    const add = el('<button class="btn secondary" style="margin-top:10px;padding:11px">＋ Add compound</button>');
    add.onclick = () => {
      meEdit = { name: '', dose: '', mode: 'days', days: [1, 2, 3, 4, 5], every: 7, timing: '', start: today, weeks: '' };
      meDelArm = false;
      render();
    };
    body.appendChild(add);
    if (list.length) body.appendChild(el('<div class="muted small" style="margin-top:8px">✓ logs today\'s dose, even off-schedule. "Every N days" compounds count from your last checked dose and show as due until you check them.</div>'));
  });
}

function mePepForm(body) {
  const d = meEdit;
  const f = el(`<div class="me-form">
    <div style="font-weight:800">${d.id ? 'Edit compound' : 'Add a compound'}</div>
    <label>Name</label>
    <input class="me-input" data-f="name" placeholder="Compound name" autocomplete="off" value="${esc(d.name || '')}">
    <label>Dose</label>
    <input class="me-input" data-f="dose" placeholder="e.g. 1 mg" autocomplete="off" value="${esc(d.dose || '')}">
    <label>Schedule</label>
    <div class="chips" style="margin-top:0" id="mf-mode"></div>
    <div id="mf-sched"></div>
    <label>Time of day</label>
    <div class="chips" style="margin-top:0" id="mf-time"></div>
    <div class="me-two">
      <div><label>Start date</label><input type="date" class="me-input" data-f="start" value="${esc(d.start || '')}"></div>
      <div><label>Length (weeks)</label><input type="number" inputmode="numeric" class="me-input" data-f="weeks" placeholder="Ongoing" value="${d.weeks || ''}"></div>
    </div>
    <div class="me-err" id="mf-err"></div>
    <div class="btn-row" style="margin-top:12px">
      <button class="btn secondary" id="mf-cancel">Cancel</button>
      <button class="btn" id="mf-save">Save</button>
    </div>
    ${d.id ? `<button class="btn secondary me-del" id="mf-del">${meDelArm ? 'Tap again to delete' : 'Delete compound'}</button>` : ''}
  </div>`);

  f.querySelectorAll('[data-f]').forEach(inp => inp.addEventListener('input', () => {
    d[inp.dataset.f] = inp.value;
    f.querySelector('#mf-err').textContent = '';
  }));

  const chip = (wrap, text, on, fn) => {
    const c = el(`<button class="chip ${on ? 'on' : ''}">${text}</button>`);
    c.onclick = fn;
    wrap.appendChild(c);
  };
  const modeWrap = f.querySelector('#mf-mode');
  chip(modeWrap, 'Days of the week', d.mode !== 'every', () => { d.mode = 'days'; render(); });
  chip(modeWrap, 'Every N days', d.mode === 'every', () => { d.mode = 'every'; render(); });

  const sched = f.querySelector('#mf-sched');
  if (d.mode === 'every') {
    if (d.last === undefined) d.last = d.origLast = (d.id && meLastDose(d.id, '9999-12-31')) || '';
    const w = el(`<div><div class="me-two">
        <div><label>Every how many days?</label>
          <input type="number" inputmode="numeric" class="me-input" data-k="every" value="${d.every || 7}"></div>
        <div><label>Last dose (optional)</label>
          <input type="date" class="me-input" data-k="last" value="${esc(d.last || '')}"></div>
      </div>
      <div class="muted small" style="margin-top:6px">Counted from your last dose, so a late dose resets the clock. Set the last dose once if you've already started.</div></div>`);
    w.querySelectorAll('input').forEach(inp => inp.addEventListener('input', () => { d[inp.dataset.k] = inp.value; }));
    sched.appendChild(w);
  } else {
    const days = d.days = d.days || [];
    const dow = el('<div class="chips me-dow"></div>');
    [1, 2, 3, 4, 5, 6, 0].forEach(i => chip(dow, ME_DAY_NAMES[i].slice(0, 2), days.includes(i), () => {
      d.days = days.includes(i) ? days.filter(x => x !== i) : days.concat(i);
      render();
    }));
    sched.appendChild(dow);
    const quick = el('<div class="chips"></div>');
    chip(quick, '5 on / 2 off (Mon–Fri)', false, () => { d.days = [1, 2, 3, 4, 5]; render(); });
    chip(quick, 'Every day', false, () => { d.days = [0, 1, 2, 3, 4, 5, 6]; render(); });
    sched.appendChild(quick);
  }

  const timeWrap = f.querySelector('#mf-time');
  for (const [k, t] of [['AM', 'Morning'], ['PM', 'Evening'], ['', 'Any time']]) {
    chip(timeWrap, t, (d.timing || '') === k, () => { d.timing = k; render(); });
  }

  f.querySelector('#mf-cancel').onclick = () => { meEdit = null; meDelArm = false; render(); };
  f.querySelector('#mf-save').onclick = () => {
    const err = f.querySelector('#mf-err');
    const name = String(d.name || '').trim();
    const every = parseInt(d.every, 10);
    const weeks = parseInt(d.weeks, 10);
    if (!name) { err.textContent = 'Give it a name first.'; return; }
    if (d.mode !== 'every' && !(d.days || []).length) { err.textContent = 'Pick at least one day.'; return; }
    if (d.mode === 'every' && !(every >= 1)) { err.textContent = 'Enter how many days between doses.'; return; }
    if (d.weeks !== '' && d.weeks != null && !(weeks >= 1)) { err.textContent = 'Length should be 1 week or more, or blank for ongoing.'; return; }
    const p = {
      id: d.id || meNewId(), name, dose: String(d.dose || '').trim(),
      mode: d.mode === 'every' ? 'every' : 'days', timing: d.timing || '',
      start: d.start || todayISO(), weeks: weeks >= 1 ? weeks : '',
    };
    if (p.mode === 'every') p.every = every; else p.days = d.days.slice().sort((a, b) => a - b);
    // "Last dose" edits the most recent dose entry, which anchors the countdown
    if (p.mode === 'every' && (d.last || '') !== (d.origLast || '') && !(d.last > todayISO())) {
      if (d.origLast && store.me.doses[d.origLast]) {
        delete store.me.doses[d.origLast][p.id];
        if (!Object.keys(store.me.doses[d.origLast]).length) delete store.me.doses[d.origLast];
      }
      if (d.last) (store.me.doses[d.last] = store.me.doses[d.last] || {})[p.id] = true;
    }
    const i = store.me.peptides.findIndex(x => x.id === p.id);
    if (i >= 0) store.me.peptides[i] = p; else store.me.peptides.push(p);
    meEdit = null; meDelArm = false;
    save();
    toast(`💉 ${name} saved`);
    render();
  };
  const del = f.querySelector('#mf-del');
  if (del) del.onclick = () => {
    if (!meDelArm) { meDelArm = true; render(); return; }
    store.me.peptides = store.me.peptides.filter(x => x.id !== d.id);
    meEdit = null; meDelArm = false;
    save();
    toast('Compound deleted');
    render();
  };
  body.appendChild(f);
}

// 4) Reference: sleep rules + links to the plan docs
function meRefCard() {
  return meCard('ref', '📖 Reference', 'Sleep + plan docs', false, (body) => {
    body.appendChild(el(`<div class="me-section" style="padding-top:0">Sleep</div>`));
    body.appendChild(el(`<ul class="me-rules">${ME_SLEEP_RULES.map(r => `<li>${esc(r)}</li>`).join('')}</ul>`));
    body.appendChild(el('<div class="me-section">Plan docs</div>'));
    const L = store.me.links;
    const docs = [['plan', 'Health Reset Plan'], ['meal', 'Meal Plan']];
    if (meLinkEdit || !L.plan || !L.meal) {
      for (const [k, name] of docs) {
        const row = el(`<div style="margin-top:8px"><div class="muted small" style="margin-bottom:4px">${name} link</div>
          <input type="url" class="me-input" placeholder="https://…" value="${esc(L[k] || '')}"></div>`);
        row.querySelector('input').onchange = (e) => {
          const u = e.target.value.trim();
          if (u && !/^https?:\/\//i.test(u)) { toast('Paste the full link, starting with https://'); return; }
          if (u) L[k] = u; else delete L[k];
          save();
          toast('Link saved');
        };
        body.appendChild(row);
      }
      const done = el('<button class="btn secondary" style="margin-top:10px;padding:10px">Done</button>');
      done.onclick = () => { meLinkEdit = false; render(); };
      body.appendChild(done);
    } else {
      const row = el('<div class="btn-row" style="margin-top:8px"></div>');
      for (const [k, name] of docs) {
        const b = el(`<button class="btn secondary" style="padding:11px">${name} ↗</button>`);
        b.onclick = () => window.open(L[k], '_blank');
        row.appendChild(b);
      }
      body.appendChild(row);
      const ed = el('<button class="rest-btn" style="margin-top:10px">Edit links</button>');
      ed.onclick = () => { meLinkEdit = true; render(); };
      body.appendChild(ed);
    }
  });
}
