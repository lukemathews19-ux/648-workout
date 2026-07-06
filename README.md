# Iron Together 🏋️

Luke & Kristen's home-gym lifting program and tracker. No accounts, no subscriptions, no server — a small web app that lives on your phones.

## What it does

- **Generates your 3 workouts every week** — Day A (Lower + Core), Day B (Upper), Day C (Total-Body Circuit, F45 style). Any 3 days you want.
- **Rotates for variety, holds steady for progress.** Accessories change every week. The two ⭐ anchor lifts per day stay fixed for a 4-week block so the weights can climb — then a new block starts with new anchors. Four blocks (Foundation → Build → Strength → Athletic) = a 16-week cycle before anything repeats.
- **Nudges you heavier.** It remembers every set. Hit the top of the rep range on all sets and next time it tells you the new weight and pre-fills it.
- **Built-in circuit timer** for Day C — station intervals with beeps and vibration, phone stays awake, F45 without the membership.
- **Both of you, one app.** Toggle Luke/Kristen at the top. Same workout, different dose: Luke ~40 min (extra sets + bonus block + finisher), Kristen ~30 min.
- **Deload every 4th week** — go ~10% lighter, on purpose. That's what makes the next block go up.
- Core work lands on Days A and C (2x/week). Demo link (🎬) on every exercise. Streaks and charts under Progress.

Each phone stores its own logs (in the browser's local storage). The weekly workout is computed from the calendar, so both phones always show the same plan without syncing anything.

## Getting it on your phones

The app is just static files — host it anywhere. Easiest good option, **GitHub Pages** (free, ~5 minutes, gives you a private-ish URL with HTTPS so the app can be installed and work offline):

1. In this folder: `git init` (already done), then create a GitHub repo and push.
2. On GitHub: repo → Settings → Pages → Source: `main` branch, root folder. Save.
3. Wait a minute, then open `https://<your-username>.github.io/<repo-name>/` on each phone.
4. **iPhone:** Share button → *Add to Home Screen*. It installs like a real app, works offline, full screen.
5. In the app: More → set whose phone it is, and paste your Apple Music playlist link.

(Ask Claude to do steps 1–2 for you — it just needs your OK to create the repo.)

To preview on the computer meanwhile: `npx http-server . -p 8321` in this folder, then open `http://localhost:8321`.

## Updating / changing the program

Everything lives in three small files:

- `js/exercises.js` — the exercise database (names, cues, rep ranges, your equipment)
- `js/program.js` — blocks, anchor lifts, weekly rotation pools, circuit formats, progression rules
- `js/app.js` — the app itself

Want different anchors, a 4th day, new circuit formats, cardio days? Ask Claude to edit and re-push — phones pick up updates on next open (the service worker is network-first).

## Backups

Data lives per-phone. Every few weeks: More → Export → the JSON file goes wherever you like (iCloud, email it to yourself). Import restores it.

## Coach's notes (why it's built this way)

- **Consistency beats optimal.** The only non-negotiable is 3 sessions/week. A 20-minute version (anchors only, leave) still counts — the app says so.
- **Progressive overload is the whole game.** Constant novelty is fun but keeps you weak; total repetition is effective but boring. Fixed anchors + rotating accessories is the compromise that works.
- **Deloads aren't optional.** Week 4 feels too easy on purpose. Skipping deloads is how months of progress stall.
- **The circuit day is the retention day.** It's the fun one. If life blows up a week, do Day C — it keeps the habit alive.
