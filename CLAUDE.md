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
- Files: `js/exercises.js` (exercise DB + form cues), `js/anims.js` (animated silhouette demo loops for circuit exercises — keyframe poses tweened by a tiny SVG engine; every circuit-pool exercise needs an entry), `js/program.js` (blocks/rotation/progression), `js/cardio.js` (cardio generator), `js/app.js` (all UI). New JS files must be added to `index.html` AND the `ASSETS` list in `sw.js`.

## Program design (the coaching logic)

- 3 days/week, flexible days: A = Lower + Core, B = Upper, C = F45-style circuit (they love F45). Core lands 2x/week (A + C).
- Day C supports 1-3 people (F45-style staggered stations: everyone rotates on the same beep, offset by one station so machines never double-book). 60s skippable water break between rounds. TV mode shows one color-coded panel per person with animated demos. Audio cues are deliberately distinct: short chirp = 3-2-1, rising two-tone = GO, falling = rest, chime = round break, fanfare = circuit done.
- 4-week blocks; **anchor lifts stay fixed within a block** (progressive overload), accessories rotate weekly (variety). Week 4 = deload. Four blocks cycle: Foundation → Build → Strength → Athletic.
- Time caps: **Luke ≤40 min** (bonus slots, finisher), **Kristen ≤30 min** (fewer sets, skips `bonus: true` slots). ⚡ 20-min bare-minimum mode still counts as a full workout — that's intentional psychology, keep it.
- Cardio is **bonus-only, never programmed**: Luke runs with a friend 2-3x/week (5k-ish + a hill day). The cardio generator (10/15/20/30 min; bike/rower/treadmill/rope+ladder/pool/hoops/mix) must never count toward or against the 3 lifting days.
- Progression nudges compare last session vs rep-range top; +10 lb lower body, +5 lb upper.

## Their equipment (only program what they own)

DBs 5-52.5 lb · KBs 10-50 lb · barbell + squat rack with pulleys (lat pulldown, rows, curls, pushdowns) · EZ bar · plates to 45 · incline/decline bench · pull-up bar · bands · slam balls 10-40 · med balls 4-12 · plyo boxes 16/20/24" · bosu · stability balls · ab wheel + mat · rower · Yesoul bike · Sole treadmill · jump rope · agility ladder · cones · push-up stands · foam rollers. Also: swimming pool and basketball goal (Kristen doesn't play basketball).

## Roadmap (agreed with Luke)

Push notifications, shared streak visibility between phones, and inviting friends — all blocked on adding a backend (plan: free-tier Supabase, set up with Luke present since it needs his account). The in-app weekly recap card is the interim substitute.
