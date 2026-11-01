# Coloring Contest — plan

Status: draft, waiting on Supabase project + user OK
Decisions: Supabase (DB + Storage + admin auth) · `/admin` route in web · points 100/60/30 (+5 per valid entry) · premium pages 50–100 pts · contest limit = max participants · 1 entry per device per contest (resubmit replaces until end).

## Identity ("device id")
- Supabase **anonymous sign-in** on first launch → `auth.uid()` = device id. Session persisted in localStorage of the WebView.
- Why not a home-made UUID: with anonymous auth, RLS can verify the caller *is* that device. A plain id could be copied/spoofed to steal points.
- Caveat: deleting the app / clearing WebView data = new device, points lost. Later: optional "save my points" with email/Apple to upgrade the anon user.
- First launch: kid-friendly "What's your name?" sheet → `players.name`; name + points chip in home header (tap to rename).
- **Names are unique** (unique index on `lower(btrim(name))`) so rankings never show duplicates. Taken → inline message + free suggestions (`name_available()` RPC). Name typed offline is synced later; if taken by then, the sheet re-opens.

## Data model (Postgres, RLS on everything)
```
players        device_id uuid PK = auth.uid(), name text(1..24), created_at
contests       id, title, description, page_id text null (picture to color; null = free choice),
               starts_at, ends_at, max_participants int, prizes int[] default {100,60,30},
               results_published bool default false, created_at
submissions    id, contest_id, device_id, player_name (snapshot), image_path, created_at, updated_at,
               rank smallint null (1..3), UNIQUE(contest_id, device_id)
point_ledger   id, device_id, delta int, reason ('entry'|'prize'|'purchase'|'admin'), ref text, created_at
               → balance = sum(delta); view `player_points`
premium_pages  id text PK (matches bundled asset id), price int, active bool
purchases      device_id, page_id, created_at, PK(device_id, page_id)
admins         user_id uuid PK (email users allowed into /admin)
```
Rules enforced in DB (not client):
- Insert/update own submission only while `now() between starts_at and ends_at`; insert blocked when entries >= max_participants (trigger).
- First entry per contest → ledger +5 (trigger, once).
- `buy_premium_page(page_id)` RPC (security definer): checks balance >= price, inserts purchase + ledger(-price) atomically.
- `publish_results(contest_id, first, second, third)` RPC: admin only; sets ranks, ledger +prizes, `results_published = true`.
- Clients can read: contests, own player/points/purchases/submissions, and **winning** submissions of published contests (hall of fame). Admins read everything.

## Image hosting — Supabase Storage
- Bucket `submissions`: path `{contest_id}/{device_id}.webp`. Upload policy: path must contain caller's uid, contest live. Read: public URL (paths not listable) so the hall of fame loads fast on every device.
- Client compresses before upload: max 1400px, WebP q≈0.82 → ~150–300 KB. Free 1 GB ≈ 4–5k entries.
- Two copies on submit: (1) local — snapshot stored in IndexedDB with the project (+ "Submitted ✓" badge, viewable offline); (2) remote upload for judging.

## App UI (kid-first)
1. **Name sheet** on first launch; header shows "Hi, {name}!" + ⭐ points.
2. **Contest banner** on home: live → title, countdown, spots left, "Join!"; ended → "Judges are looking 👀"; published → winners.
3. **Contest page** `/contests/$id`: rules, picture, "Start coloring" → creates a project tagged `contestId` (opens the contest page in the editor).
4. **Editor**: projects with `contestId` get a "Send to contest" button → preview → grown-up gate (same as feedback) → upload → success confetti. Can resend until the end time.
5. **Star Artists** (hall of fame) section on home: medal cards (🥇🥈🥉) of winners from all published contests, tap to view large.
6. **Special pages** in the coloring book: locked tiles with ⭐ price; buy with points (grown-up gate), unlocked forever on that device.

## Admin `/admin` (email + password, must be in `admins`)
- Contests list/create/edit (title, picture, start/end, max players, prizes).
- Per contest: grid of entries (large preview, name, time), pick 1st/2nd/3rd → "Publish results" (awards points, shows in Star Artists).
- Players: search, adjust points manually (ledger 'admin').

## Premium pages (Codex-generated)
- 6 detailed pages bundled in `src/assets/premium-pages/` + thumbs; price/active in `premium_pages` table. Locked = UI gate (bundled assets are reachable by a determined user; acceptable for v1, can move to private bucket later).

## Phases
1. Supabase setup: SQL migration (`supabase/migrations/0001_contest.sql`), anon auth, client `src/lib/supabase.ts`, env `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
2. Identity + name sheet + header points.
3. Contests: banner, contest page, contest-tagged projects, submit flow (local snapshot + upload).
4. Admin route: login, contests CRUD, judging, publish.
5. Star Artists gallery.
6. Premium pages: assets (Codex), shop UI, buy RPC.
7. Test (puppeteer flows, RLS checks with two anon devices), docs.

## Needed from user
- Create Supabase project (free) → Project URL + **anon/publishable key** (safe for client). Never send the service_role key.
- Dashboard: Authentication → enable **Anonymous sign-ins**; create admin email user.
- Run the migration SQL (or give me DB access via Supabase CLI).
- Vercel + Lovable env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.

## Unresolved
- Kids' privacy (COPPA / App Store Kids): show only first name/nickname, no photos of kids; moderation is manual by admin before publish — OK?
- Should non-winning entries ever be shown publicly? Plan: no.
- Timezone shown for start/end: device local time.
