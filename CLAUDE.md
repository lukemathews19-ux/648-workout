# 648 Workout

Luke & Kristen's home-gym workout PWA (648 = their house address). Luke is not a developer — he describes changes in plain English; make the edit, verify it, and deploy it for him.

## Deploying (how edits reach their phones)

- Live app: **https://lukemathews19-ux.github.io/648-workout/** (GitHub Pages, repo `lukemathews19-ux/648-workout`, main branch root).
- `git push` to main = deploy. Pages usually rebuilds in ~1 min; if it stalls, POST to the Pages builds API to kick a fresh build.
- `gh` CLI is NOT installed. For GitHub API calls, pull the stored token with `git credential fill` (Bash, `printf 'protocol=https\nhost=github.com\n\n'` piped in — PowerShell mangles the line endings).
- Their phones pick up changes on next app open (service worker is deliberately **network-first**; don't change it to cache-first — that blocked updates once already).
- After any change, bump nothing — there's no build step. Just test locally (`npx http-server . -p 8321`) and push.

## Architecture (deliberate choices — don't "upgrade" them casually)

- **No build step, no framework, no server, no accounts.** Plain HTML/CSS/JS. Each phone stores its own logs in `localStorage` (key `iron_together_v1` — historical name, kept so data survives; never rename it).
- **Workouts are generated deterministically from the calendar date** (`js/program.js`), so both phones show identical workouts with zero syncing. `PROGRAM_EPOCH` = Monday 2026-07-06, their real start date = Week 1, Foundation block. Don't move it — it would silently reshuffle everyone's current week.
- Files: `js/exercises.js` (exercise DB + form cues), `js/anims.js` (animated silhouette demo loops — keyframe poses tweened by a tiny SVG engine; EVERY exercise id needs an `ANIMS` entry or an `ANIM_ALIASES` alias to a look-alike), `js/program.js` (blocks/rotation/progression), `js/cardio.js` (cardio generator), `js/app.js` (all UI). New JS files must be added to `index.html` AND the `ASSETS` list in `sw.js`.
- **Adding an exercise** (Luke asks for these regularly, e.g. from the r/f45 weekly intel posts — Reddit is not fetchable from here, he pastes the text): (1) add the `EXERCISES` entry with a form cue and only equipment he owns, (2) add an `ANIMS` pose set or alias, (3) drop it into the right `POOLS` list(s) in program.js. Note: changing a pool's length reshuffles which exercise the current week picks (deterministic modulo) — deploy early in the week if possible.

## Program design (the coaching logic)

- 3 days/week, flexible days: A = Lower + Core, B = Upper, C = F45-style circuit (they love F45). Core lands 2x/week (A + C).
- Day C supports 1-3 people (F45-style staggered stations: everyone rotates on the same beep, offset by one station so machines never double-book). 60s skippable water break between rounds. TV mode shows one color-coded panel per person with animated demos. Audio cues are deliberately distinct: short chirp = 3-2-1, rising two-tone = GO, falling = rest, chime = round break, fanfare = circuit done.
- **+ Extra tab** (`js/extra.js`, `selectedDay === 'X'`): on-demand circuit builder for friend days / 4th sessions (Luke's running buddy comes 1x/wk in lieu of a run). Duration 20/30/40 × flavor (F45 mix / cardio-heavy / weights-heavy) × intensity (standard/hard). Periodized on the program's block + week-of-block (ease-in/build/peak/deload; deload drops the finisher even on Hard). Seeded by day+week+shuffle via `extraHash`. Logged to `store.extras` (like cardio) — NEVER into `store.logs`, so it can't touch the 3/3 count or streaks; the temporary in-progress 'X' log is deleted in `finishExtra()`. Reuses `renderPeoplePicker` / `renderCircuitBody` / timer / TV panels; `isCircuitDay()` = C or X.
- Strength-day TV mode is an interactive board: exercise list + focus panel with the animated demo, and you log weights/reps/✓ right on it. The hidden phone UI stays the single source of truth — TV inputs/taps forward events to the phone's `.in-w`/`.in-r`/`.set-check` elements (never duplicate that logic), and `syncTvStrength()` mirrors state back on the 300ms TV ticker.
- 4-week blocks; **anchor lifts stay fixed within a block** (progressive overload), accessories rotate weekly (variety). Week 4 = deload. Four blocks cycle: Foundation → Build → Strength → Athletic.
- Time caps: **Luke ≤40 min** (bonus slots, Day C heavy pair), **Kristen ≤30 min** (fewer sets, skips `bonus: true` slots). ⚡ 20-min bare-minimum mode still counts as a full workout — that's intentional psychology, keep it.
- **Day C heavy pair (Luke only, Nov 2026 fat-loss phase):** Luke's old Day C finisher slot is now 3 heavy sets of two block anchors, alternating weekly (even weeks squat + hpush, odd weeks hinge + pull), so each anchor gets a second heavy day. Built in `buildWeek` as `dayC.heavy`, rendered with the shared `buildSlotCard()` and logged into the Day C log like strength sets (feeds progression + Progress tab). No "go heavier" nudge on these: they repeat the week's anchor weight. Hidden in ⚡ 20-min mode and for Kristen. `dayC.finisher` is still generated but not shown on Day C.
- Cardio is **bonus-only, never programmed**: Luke does Zone 2 Tue/Thu on the Greenway and logs it with the 💚 Zone 2 mode (30/45 min). The cardio generator (10/15/20/30/45 min; Zone 2/bike/rower/treadmill/rope+ladder/pool/hoops/mix) must never count toward or against the 3 lifting days.
- Progression nudges compare last session vs rep-range top; +10 lb for barbell lower-body lifts, +5 lb for everything else (DB/KB lower body included).

## 🙋 Me tab (Luke only, `js/me.js`, Nov 2026)

- Luke's personal plan hub: four collapsible cards. **Today** (daily habit taps: training, protein, sleep, alcohol + drink counter, morning weight, doses due), **Sunday check-in** (auto score /5, 7-day avg weight, waist, Hume BF%, drinks, 8-week trends), **Peptides** (compound tracker), **Reference** (sleep rules + doc links).
- Visible only when the header is on Luke **and** More → "This phone belongs to" = Luke. Kristen's app must stay pixel-identical (nav button is `hidden`; `meVisible()` gates it).
- **PRIVACY: the repo is public. Never put Luke's compounds, doses, body numbers, labs or doc links in code.** All of it is typed in on his phone (or imported from a setup file sent outside the repo) and stored in `store.me` inside `iron_together_v1`. Schema is documented at the top of `js/me.js`.
- Training check is read from the workout log (finished A/B/C day, or a 💚 Zone 2 cardio log); a tap stores a manual override in `days[iso].move`. Score: lift 3 + Zone 2 2 (from logs) · protein and sleep 6 of 7 days · alcohol 7 of 7.
- Peptide schedules: days of week (default Mon–Fri = 5 on/2 off) or every N days counted from the last checked dose. Start date + length in weeks; blank length = ongoing.
- Import: a full backup (`logs` present) replaces the store but keeps this phone's `me` if the backup predates it; a `me`-only file is merged by `meMergeSetup()` (match by id, then name) and never touches workout logs.
- Zone 2 row's 30/45 buttons write a real `store.cardio.luke` entry (mode `z2`), so the recap, Week card and Progress see it. "Last dose" on every-N compounds edits the most recent dose entry. The check-in card force-opens on Sunday until saved (`meCard(..., forceOpen)`; doesn't change the saved open state).
- **🍽️ Meal ideas card** (2nd card): `ME_MEALS` in me.js, generic high-protein meals from common household foods (no personal data), one chip at a time (Breakfast / Lunch / Dinner / Snacks / On the road). Opens to the next meal by time of day; dinners carry a weekday and tonight's sorts first. Empty Peptides card also offers "📋 Paste setup" (same merge as a setup file).
- Luke-only touches elsewhere: Week tab Zone 2 card (`user === 'luke'`), Monday recap shows last week's habit score + a check-in shortcut, and the finish screen shows a refuel line (both gated on `meVisible()`).

## UI notes (Nov 2026 review)

- `#session-bar` only shows during a workout. Its CSS is `display:flex`, so `#session-bar[hidden] { display:none }` is what makes `bar.hidden = true` work. Don't drop it.
- Today/Extra: Start workout stays full width; Playlist / ⚡ 20 min / 📺 TV live in one `quickRow()` so the first lift is above the fold.
- Progress: ⭐ anchor lifts first (this block's tagged), with sparkline + change since first log; every other lift is in a collapsed "All other lifts" card (`progressShowAll`, not persisted).

## Their driveway

Down & back = ⅓ mile ≈ **2.5 min** at a strong pace (×3 = a mile). Too long for a 40-60s circuit station — `driveway_run` is the *half*-driveway sprint; `driveway_full` (the real ⅓ mile) is finisher/cardio-generator only.

## Their equipment (only program what they own)

DBs 5-52.5 lb · KBs 10-50 lb · barbell + squat rack with pulleys (lat pulldown, rows, curls, pushdowns) · EZ bar · plates to 45 · incline/decline bench · pull-up bar · bands · slam balls 10-40 · med balls 4-12 · plyo boxes 16/20/24" · bosu · stability balls · ab wheel + mat · rower · Yesoul bike · Sole treadmill · jump rope · agility ladder · cones · push-up stands · foam rollers. Also: swimming pool and basketball goal (Kristen doesn't play basketball).

## Roadmap (agreed with Luke)

Push notifications, shared streak visibility between phones, and inviting friends — all blocked on adding a backend (plan: free-tier Supabase, set up with Luke present since it needs his account). The in-app weekly recap card is the interim substitute.
