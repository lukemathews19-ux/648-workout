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
- **⚡ 20-minute mode** — a toggle on any workout day. Strength days become anchors-only (3 sets); circuit day drops to 2 rounds, no finisher. Still counts as a full workout for the week.
- **🏃 Quick cardio generator** — bottom of the Today tab. Pick 10/15/20/30 min and a toy (bike, rower, treadmill, rope + ladder, pool, hoops, or a mix) and it hands you a workout. Logged separately as bonus work — it never counts toward (or against) the 3 lifting days, because Luke's running covers the cardio base.
- **📬 Weekly recap** — first open of a new week shows last week's report card: lifts done, bonus cardio, new PRs, streak.

Each phone stores its own logs (in the browser's local storage). The weekly workout is computed from the calendar, so both phones always show the same plan without syncing anything.

## Getting it on your phones

**Live at: https://lukemathews19-ux.github.io/iron-together/**

1. Open that link on each phone.
2. **iPhone:** Share button → *Add to Home Screen*. It installs like a real app, works offline, full screen.
3. In the app: More → set whose phone it is, and paste your Apple Music playlist link.

Pushing to `main` redeploys automatically (GitHub Pages). Phones pick up updates the next time they open the app.

To preview on the computer meanwhile: `npx http-server . -p 8321` in this folder, then open `http://localhost:8321`.

## Updating / changing the program

Everything lives in three small files:

- `js/exercises.js` — the exercise database (names, cues, rep ranges, your equipment)
- `js/program.js` — blocks, anchor lifts, weekly rotation pools, circuit formats, progression rules
- `js/app.js` — the app itself

Want different anchors, a 4th day, new circuit formats, cardio days? Ask Claude to edit and re-push — phones pick up updates on next open (the service worker is network-first).

## Backups

Data lives per-phone. Every few weeks: More → Export → the JSON file goes wherever you like (iCloud, email it to yourself). Import restores it.

## Roadmap (needs a tiny backend)

Push notifications (weekly recap on the phone), shared visibility into each other's streaks, and inviting friends all require the phones to talk to a shared datastore. Plan: a free Supabase project (5-min setup) + a small sync layer. Until then, the recap appears in-app at the start of each week, and each phone tracks its own person.

## Coach's notes (why it's built this way)

- **Consistency beats optimal.** The only non-negotiable is 3 sessions/week. A 20-minute version (anchors only, leave) still counts — the app says so.
- **Progressive overload is the whole game.** Constant novelty is fun but keeps you weak; total repetition is effective but boring. Fixed anchors + rotating accessories is the compromise that works.
- **Deloads aren't optional.** Week 4 feels too easy on purpose. Skipping deloads is how months of progress stall.
- **The circuit day is the retention day.** It's the fun one. If life blows up a week, do Day C — it keeps the habit alive.
