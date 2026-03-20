# FestFlow — Tournament Management System
## Project Specification

---

## 1. Overview

FestFlow is a web-based college fest management system that allows a college to run a multi-event tournament across departments. Each department fields a single team. That team registers once and can send different members to different events — sports, cultural, or academic. Points are tallied across all events to produce an overall leaderboard, with the highest-scoring department declared the winner.

**Tech stack**
- Frontend: React Router 7 (framework mode), TypeScript, Tailwind CSS v4
- Backend: Supabase (Postgres, Auth, Realtime, Edge Functions)
- Hosting: To be decided

---

## 2. User Roles

| Role | Description |
|---|---|
| `admin` | Full access. Creates tournaments, events, approves teams, manages everything. |
| `referee` | Can enter match scores for bracket events and record judged event results. |
| `participant` | Can sign up, join a team, register for events, and view their own data. |

Roles are stored in the `users` table. Supabase Auth handles authentication. There is no public access — every page requires a logged-in session.

---

## 3. Database Schema

### 3.1 Enums

```sql
user_role:         admin | referee | participant
tournament_status: draft | registration_open | ongoing | completed
team_status:       pending | confirmed | disqualified
event_type:        team | individual
event_format:      bracket | judged
event_status:      upcoming | ongoing | completed | cancelled
registration_status: pending | confirmed | rejected
match_status:      scheduled | ongoing | completed | cancelled
```

### 3.2 Tables

#### `users`
Mirrors `auth.users`, adds college-specific fields.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | References `auth.users(id)` |
| email | text | Unique |
| full_name | text | |
| role | user_role | Default: `participant` |
| department | text | |
| roll_number | text | Unique, nullable |
| phone | text | Nullable |
| created_at | timestamptz | |

#### `tournaments`
Top-level container for the entire fest.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| name | text | |
| description | text | Nullable |
| start_date | date | Nullable |
| end_date | date | Nullable |
| status | tournament_status | Default: `draft` |
| created_by | uuid FK | References `users(id)` |
| created_at | timestamptz | |

#### `teams`
One team per department per tournament. Created by a captain. Reused across all events — no member limit.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| tournament_id | uuid FK | References `tournaments(id)` |
| name | text | |
| department | text | |
| registration_token | text | Unique 8-char code for members to join |
| status | team_status | Default: `pending` |
| created_by | uuid FK | References `users(id)` — the captain |
| created_at | timestamptz | |

Unique constraint: `(tournament_id, department)` — one team per department per tournament.

#### `participants`
Students who have signed up, joined a team, and been approved by an admin.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK | References `users(id)` |
| team_id | uuid FK | References `teams(id)` |
| tournament_id | uuid FK | References `tournaments(id)` |
| role_in_team | text | `captain` or `member` |
| status | registration_status | Default: `pending` |
| approved_by | uuid FK | References `users(id)`, nullable |
| approved_at | timestamptz | Nullable |
| registered_at | timestamptz | |

Unique constraint: `(user_id, tournament_id)` — one participation record per person per tournament.

#### `events`
Individual competitions within a tournament (cricket, dance, debate, etc.).

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| tournament_id | uuid FK | References `tournaments(id)` |
| name | text | |
| description | text | Nullable |
| type | event_type | `team` or `individual` |
| max_participants_per_team | int | Nullable, only used if `type = 'team'` |
| format | event_format | `bracket` or `judged` |
| points_first | int | Default: 10 |
| points_second | int | Default: 6 |
| points_third | int | Default: 3 |
| venue | text | Nullable |
| scheduled_at | timestamptz | Nullable, not strict |
| status | event_status | Default: `upcoming` |
| created_by | uuid FK | References `users(id)` |
| created_at | timestamptz | |

#### `event_registrations`
Junction table — records which team or participant is competing in which event.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| event_id | uuid FK | References `events(id)` |
| team_id | uuid FK | References `teams(id)`, nullable |
| participant_id | uuid FK | References `participants(id)`, nullable |
| status | registration_status | Default: `pending` |
| registered_at | timestamptz | |

Check constraint: either `team_id` or `participant_id` must be set, not both, not neither. For team events, `team_id` is set. For individual events, `participant_id` is set.

#### `event_team_participants`
Mapping table that links specific team members to a team's event registration.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| event_registration_id | uuid FK | References `event_registrations(id)` |
| participant_id | uuid FK | References `participants(id)` |

Unique constraint: `(event_registration_id, participant_id)` — a member can only be added once per registration.

#### `matches`
Single elimination bracket rows. Only created for `format = 'bracket'` events (enforced by a database trigger).

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| event_id | uuid FK | References `events(id)` |
| round_number | int | 1 = first round |
| team_a_id | uuid FK | References `teams(id)`, nullable |
| team_b_id | uuid FK | References `teams(id)`, nullable |
| score_a | int | Nullable until entered |
| score_b | int | Nullable until entered |
| winner_id | uuid FK | References `teams(id)`, nullable |
| status | match_status | Default: `scheduled` |
| venue | text | Nullable |
| scheduled_at | timestamptz | Nullable |
| entered_by | uuid FK | References `users(id)` — admin or referee |
| updated_at | timestamptz | |

#### `event_results`
Final placements (1st, 2nd, 3rd) per event. Works for both bracket and judged events. This is what feeds the leaderboard.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| event_id | uuid FK | References `events(id)` |
| team_id | uuid FK | References `teams(id)` |
| position | int | 1, 2, or 3 |
| points_awarded | int | Copied from event at time of recording |
| recorded_at | timestamptz | |
| recorded_by | uuid FK | References `users(id)` |

Unique constraints: `(event_id, position)` and `(event_id, team_id)`.

### 3.3 Views

#### `team_leaderboard`
Auto-tallies points per team per tournament. Query this directly — never calculate totals in the frontend.

```sql
select
  t.tournament_id,
  t.id as team_id,
  t.name as team_name,
  t.department,
  coalesce(sum(er.points_awarded), 0) as total_points,
  count(case when er.position = 1 then 1 end) as gold,
  count(case when er.position = 2 then 1 end) as silver,
  count(case when er.position = 3 then 1 end) as bronze
from teams t
left join event_results er on er.team_id = t.id
group by t.tournament_id, t.id, t.name, t.department
order by total_points desc;
```

### 3.4 Database Functions

#### `join_team(p_token, p_user_id, p_full_name, p_roll_number)`
Atomically validates the join code, checks for duplicate joins, and inserts the participant row. Returns a JSON object with either `{ success: true, team_name }` or `{ error: "message" }`.

#### `record_judged_results(p_event_id, p_first_team_id, p_second_team_id, p_third_team_id, p_recorded_by)`
Records 1st, 2nd, and 3rd place for a judged event in a single atomic transaction. Uses `on conflict ... do update` so results can be corrected after submission. Validates that the event format is `judged` before inserting.

### 3.5 Triggers

#### `on_auth_user_created` (on `auth.users`)
Safety net — creates a minimal `users` row when Supabase Auth creates an account. The app also inserts the full profile row directly with all fields. The trigger uses `on conflict do nothing` so it never overwrites the app's insert.

#### `enforce_bracket_format` (on `matches`)
Prevents inserting a match row for an event whose `format` is not `bracket`. Raises an exception if violated.

---

## 4. Application Routes

```
/                   → Redirect to /login
/login              → Login page
/signup             → Signup page
/dashboard          → Participant home (protected)
/admin              → Admin home (admin only)
/admin/tournaments  → Tournament list and creation
/admin/tournaments/:id          → Tournament detail
/admin/tournaments/:id/events   → Event list and creation
/admin/tournaments/:id/teams    → Team approval queue
/admin/events/:id/bracket       → Bracket management (bracket events)
/admin/events/:id/results       → Result entry (judged events)
/referee/events/:id/scores      → Score entry for referees
/t/:id              → Public tournament view (leaderboard + schedule)
/join               → Join a team via code
```

---

## 5. Feature Specifications

### 5.1 Auth Flow

**Signup**
1. User fills in: full name, department, roll number (optional), phone (optional), email, password, confirm password.
2. Frontend validates passwords match and are at least 6 characters.
3. `supabase.auth.signUp()` creates the auth user.
4. Frontend immediately inserts a row into `public.users` with all profile fields.
5. If email confirmation is enabled, user sees a "check your email" screen. For local dev, disable email confirmation in Supabase dashboard.
6. On success, redirect to `/dashboard`.

**Login**
1. User fills in email and password.
2. `supabase.auth.signInWithPassword()` signs them in.
3. `AuthContext` fetches their `users` row and stores it as `profile`.
4. Redirect to `/dashboard`.

**Session persistence**
- `AuthContext` calls `supabase.auth.getSession()` on mount to restore an existing session.
- `onAuthStateChange` listener keeps the context in sync.
- Protected routes check `user` and `loading` from `AuthContext`. If not authed after loading, redirect to `/login`.

**Sign out**
- Calls `supabase.auth.signOut()`, clears context, redirects to `/login`.

### 5.2 Team Registration Flow

**Captain creates a team**
1. Captain is an approved participant.
2. On the dashboard, captain sees a "Create team" option if no team exists for their department in this tournament.
3. Fills in team name (department is auto-filled from their profile).
4. A row is inserted into `teams` with a generated `registration_token`.
5. Captain's `role_in_team` is set to `captain`.
6. Team status starts as `pending` until an admin confirms it.

**Member joins a team**
1. Member signs up and has a `users` account.
2. Goes to `/join`, enters the 8-character join code shared by the captain.
3. Frontend calls `supabase.rpc('join_team', { ... })`.
4. The function atomically validates the code and inserts the `participants` row with status `pending`.
5. Member sees a confirmation screen: "You've joined [Team Name] — awaiting captain approval."

**Admin approves participants**
1. Admin goes to `/admin/tournaments/:id/teams`.
2. Sees a list of all teams with pending participant counts.
3. Can approve or reject individual participants.
4. Approving sets `status = 'confirmed'`, `approved_by`, and `approved_at`.

### 5.3 Event Registration Flow

**For team events (e.g., cricket, football)**
1. Admin creates the event with `type = 'team'`.
2. Confirmed teams can register for the event via their dashboard.
3. Team captain must add each participant for the event.
4. Each event must have a maximum amount of participants from each team.
5. An `event_registrations` row is created with `team_id` set.

**For individual events (e.g., chess, solo dance)**
1. Admin creates the event with `type = 'individual'`.
2. Team captain registers specific confirmed team members for individual events from the team view dashboard.
3. An `event_registrations` row is created with `participant_id` set (corresponding to the selected team member).
4. Points earned by a participant are credited to their team (found via their `participant_id`).

### 5.4 Bracket Events (Single Elimination)

**Bracket generation**
1. Admin opens the event and clicks "Generate bracket".
2. The system takes all confirmed `event_registrations` for the event, shuffles (or seeds) the teams, and writes the first round of `matches` rows.
3. If the number of teams is not a power of 2, byes are handled by creating matches with `team_b_id = null` — the non-null team auto-advances.
4. Subsequent rounds are created as matches complete.

**Score entry**
1. Admin or referee navigates to the match.
2. Enters `score_a` and `score_b`.
3. System sets `winner_id` to whichever team scored higher.
4. Match status set to `completed`.
5. If this completes a round, the next round's match is updated with the winner as a participant.

**Final result**
When the final match is completed, `event_results` rows are inserted automatically for 1st (winner) and 2nd (runner-up). 3rd place requires a separate match or can be entered manually.

### 5.5 Judged Events

**Result entry**
1. Admin or referee navigates to `/admin/events/:id/results`.
2. Sees three dropdowns: 1st place, 2nd place, 3rd place — each populated with confirmed event registrations.
3. Submits by calling `supabase.rpc('record_judged_results', { ... })`.
4. Points are automatically read from the event's `points_first/second/third` and written to `event_results`.
5. Results can be corrected before the tournament is marked complete — the function uses `on conflict ... do update`.

### 5.6 Leaderboard

- Queries the `team_leaderboard` view filtered by `tournament_id`.
- Displays rank, team name, department, total points, and medal counts (gold/silver/bronze).
- Updates in near-real-time using Supabase Realtime subscribed to the `event_results` table.
- Accessible at `/t/:id` publicly (no login required — implement separately if needed).

---

## 6. Component Structure

```
app/
  root.tsx                  — AuthProvider wraps entire app
  routes.ts                 — Route definitions
  lib/
    supabase.ts             — Supabase client
  types/
    db.ts                   — TypeScript interfaces for all tables
  context/
    AuthContext.tsx          — user, profile, signUp, signIn, signOut
  hooks/
    useAuth.ts              — Re-export from AuthContext
  components/
    AuthLayout.tsx           — Split-panel auth page layout
    ProtectedRoute.tsx       — Redirects if not authed / wrong role
    Spinner.tsx              — Loading indicator
    Badge.tsx                — Status pill (pending/confirmed/rejected)
    EmptyState.tsx           — Empty list placeholder
  routes/
    home.tsx
    login.tsx
    signup.tsx
    dashboard.tsx
    join.tsx                 — Join team via code
    admin/
      index.tsx
      tournaments.tsx
      tournament-detail.tsx
      events.tsx
      teams.tsx
      bracket.tsx
      judged-results.tsx
    referee/
      scores.tsx
    tournament/
      public.tsx             — Public leaderboard view
```

---

## 7. State Management

No external state library. All state is managed through:

- **`AuthContext`** — session, user, profile, auth methods
- **Route-level data fetching** — each route fetches its own data from Supabase on mount using `useEffect`
- **Supabase Realtime** — for live score/leaderboard updates, subscribe to `event_results` and `matches` tables using `supabase.channel()`

---

## 8. Key Business Rules

1. One team per department per tournament — enforced by a unique constraint on `(tournament_id, department)`.
2. One participation record per person per tournament — enforced by a unique constraint on `(user_id, tournament_id)`.
3. Matches can only be created for `bracket` format events — enforced by a database trigger.
4. Event results use `on conflict ... do update` — results can be corrected until the tournament is marked `completed`.
5. Points are copied from the event at the time of recording, not dynamically read — changing an event's point values after results are recorded does not retroactively change scores.
6. `record_judged_results` is atomic — all three placements are written in one transaction or none at all.
7. The `join_team` function is atomic — race conditions between two members joining simultaneously are handled server-side.
8. A participant's `status` must be `confirmed` before they can register for an event.
9. A team's `status` must be `confirmed` before it can be seeded into a bracket.

---

## 9. Build Sequence

The recommended order to build features, based on dependencies:

1. **Supabase setup** — run schema SQL, run auth trigger SQL, disable email confirmation for dev.
2. **Auth flow** — signup, login, session persistence, protected routes. ✅ Done
3. **Admin: tournament creation** — create and list tournaments, set status.
4. **Admin: event creation** — create events inside a tournament, set format and type.
5. **Team registration** — captain creates team, members join via code, admin approves.
6. **Event registration** — teams/participants register for specific events.
7. **Bracket generation** — generate and display bracket, enter scores, advance winners.
8. **Judged event results** — three-dropdown result entry form.
9. **Leaderboard** — query `team_leaderboard` view, display rankings.
10. **Realtime updates** — subscribe to `event_results` and `matches` for live updates.
11. **Referee role** — scoped score entry page, role-based route guard.
12. **Public tournament page** — leaderboard and schedule visible without login.
13. **RLS policies** — add row-level security before deploying to production.

---

## 10. Environment Variables

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Both are found in Supabase dashboard → Settings → API.

---

## 11. Local Development Notes

- Disable **email confirmation** in Supabase → Authentication → Settings for local dev. Re-enable before going live.
- To seed an admin user: sign up normally, then run `update users set role = 'admin' where email = 'your@email.com'` in the Supabase SQL editor.
- RLS is intentionally disabled for local development. All tables are publicly readable and writable while working locally. Add RLS policies before deploying.
- The `team_leaderboard` view is a regular Postgres view — query it like any table via the Supabase client.
