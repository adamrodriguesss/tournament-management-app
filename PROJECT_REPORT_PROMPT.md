# Tournament Management System — Project Documentation

> **Purpose**: This document serves as a comprehensive technical reference for the Tournament Management System. Use it to generate a detailed academic/technical report covering architecture, database design, business logic, and frontend implementation.

---

## 1. Project Overview

A full-stack web application for managing inter-departmental university tournaments. It supports multi-event tournaments with both **bracket (single-elimination)** and **judged** event formats, for both **team-based** and **individual** competitions.

### Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend Framework | React 19 + React Router 7.13 (SSR-capable) |
| Styling | Tailwind CSS 4.2 |
| Backend / Database | Supabase (PostgreSQL + Auth + REST API) |
| Language | TypeScript 5.9 |
| Build Tool | Vite 7.1 |
| Hosting | Supabase (DB), local dev server |

### Design Theme
The UI follows a **retro pixel-art / arcade** aesthetic using custom pixel fonts (`--font-pixel`, `--font-vt`) and a dark-mode color palette (`pixel-gold`, `pixel-cyan`, `pixel-slate`, etc.).

---

## 2. User Roles & Access Control

Four roles defined via the `user_role` PostgreSQL enum:

| Role | Capabilities |
|------|-------------|
| `admin` | Full CRUD on tournaments, events, teams, participants. Generate brackets, record scores, assign event managers. |
| `event_manager` | Manage assigned events only. Record bracket scores, submit judged results. |
| `participant` | Sign up, join teams via token, view dashboard, manage event rosters (if captain), view public pages. |
| `referee` | Legacy role, currently unused. |

Authentication is handled by **Supabase Auth** (email + password). On signup, a PostgreSQL trigger (`handle_new_user`) automatically creates a row in `public.users` from `auth.users` metadata.

---

## 3. Database Schema

### 3.1 Custom Enum Types

```
user_role:          admin, referee, participant, event_manager
tournament_status:  draft, registration_open, ongoing, completed
event_status:       upcoming, ongoing, completed, cancelled
event_type:         team, individual
event_format:       bracket, judged
match_status:       scheduled, ongoing, completed, cancelled
team_status:        pending, confirmed, disqualified
registration_status: pending, confirmed, rejected
department:         IMBA, MBA, MCA, MSC DATA SCIENCE, MSC AI, ... (47 departments)
```

### 3.2 Tables

#### `users`
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid (PK) | FK → auth.users.id |
| email | text | UNIQUE, NOT NULL |
| full_name | text | NOT NULL |
| role | user_role | DEFAULT 'participant' |
| department | department | NULLABLE |
| roll_number | text | UNIQUE, NULLABLE |
| phone | text | NULLABLE |
| created_at | timestamptz | DEFAULT now() |

#### `tournaments`
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid (PK) | DEFAULT gen_random_uuid() |
| name | text | NOT NULL |
| description | text | NULLABLE |
| start_date | date | NULLABLE |
| end_date | date | NULLABLE |
| status | tournament_status | DEFAULT 'draft' |
| created_by | uuid | FK → users.id |
| created_at | timestamptz | DEFAULT now() |

#### `teams`
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid (PK) | DEFAULT gen_random_uuid() |
| tournament_id | uuid | FK → tournaments.id (CASCADE) |
| name | text | NOT NULL |
| department | department | NOT NULL |
| registration_token | text | UNIQUE, auto-generated (8-char MD5) |
| status | team_status | DEFAULT 'pending' |
| created_by | uuid | FK → users.id |
| created_at | timestamptz | DEFAULT now() |

**Unique constraint**: `(tournament_id, department)` — one team per department per tournament.

#### `participants`
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid (PK) | DEFAULT gen_random_uuid() |
| user_id | uuid | FK → users.id (CASCADE) |
| team_id | uuid | FK → teams.id (CASCADE) |
| tournament_id | uuid | FK → tournaments.id (CASCADE) |
| role_in_team | text | CHECK ('captain', 'member'), DEFAULT 'member' |
| status | registration_status | DEFAULT 'pending' |
| approved_by | uuid | FK → users.id, NULLABLE |
| approved_at | timestamptz | NULLABLE |
| registered_at | timestamptz | DEFAULT now() |

**Unique constraint**: `(user_id, tournament_id)` — one participation per user per tournament.

#### `events`
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid (PK) | DEFAULT gen_random_uuid() |
| tournament_id | uuid | FK → tournaments.id (CASCADE) |
| name | text | NOT NULL |
| description | text | NULLABLE |
| type | event_type | DEFAULT 'team' |
| format | event_format | DEFAULT 'bracket' |
| points_first | integer | DEFAULT 10 |
| points_second | integer | DEFAULT 6 |
| points_third | integer | DEFAULT 3 |
| venue | text | NULLABLE |
| scheduled_at | timestamptz | NULLABLE |
| status | event_status | DEFAULT 'upcoming' |
| max_participants_per_team | integer | NULLABLE |
| assigned_to | uuid | FK → users.id (SET NULL), NULLABLE |
| created_by | uuid | FK → users.id |
| created_at | timestamptz | DEFAULT now() |

#### `event_registrations`
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid (PK) | DEFAULT gen_random_uuid() |
| event_id | uuid | FK → events.id (CASCADE) |
| team_id | uuid | FK → teams.id (CASCADE), NULLABLE |
| participant_id | uuid | FK → participants.id (CASCADE), NULLABLE |
| status | registration_status | DEFAULT 'pending' |
| registered_at | timestamptz | DEFAULT now() |

> For **team events**, `team_id` is populated. For **individual events**, `participant_id` is populated.

#### `event_team_participants`
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid (PK) | DEFAULT gen_random_uuid() |
| event_registration_id | uuid | FK → event_registrations.id (CASCADE) |
| participant_id | uuid | FK → participants.id (CASCADE) |

**Unique constraint**: `(event_registration_id, participant_id)` — no duplicate roster entries.

#### `matches`
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid (PK) | DEFAULT gen_random_uuid() |
| event_id | uuid | FK → events.id (CASCADE) |
| round_number | integer | NOT NULL |
| team_a_id | uuid | FK → teams.id, NULLABLE |
| team_b_id | uuid | FK → teams.id, NULLABLE |
| participant_a_id | uuid | FK → participants.id (SET NULL), NULLABLE |
| participant_b_id | uuid | FK → participants.id (SET NULL), NULLABLE |
| score_a | integer | NULLABLE |
| score_b | integer | NULLABLE |
| winner_id | uuid | FK → teams.id, NULLABLE |
| winner_participant_id | uuid | FK → participants.id (SET NULL), NULLABLE |
| status | match_status | DEFAULT 'scheduled' |
| venue | text | NULLABLE |
| scheduled_at | timestamptz | NULLABLE |
| entered_by | uuid | FK → users.id, NULLABLE |
| updated_at | timestamptz | DEFAULT now() |
| next_match_id | uuid | FK → matches.id (SET NULL), self-referencing |

> The `next_match_id` column creates a **linked-list** structure forming the bracket tree. Each match points to the match the winner advances to.

#### `event_results`
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid (PK) | DEFAULT gen_random_uuid() |
| event_id | uuid | FK → events.id (CASCADE) |
| team_id | uuid | FK → teams.id (CASCADE) |
| position | integer | CHECK (1–3) |
| points_awarded | integer | NOT NULL |
| recorded_at | timestamptz | DEFAULT now() |
| recorded_by | uuid | FK → users.id, NULLABLE |

**Unique constraints**: `(event_id, position)` and `(event_id, team_id)`.

### 3.3 Entity-Relationship Summary

```
tournaments 1──* teams
tournaments 1──* events
tournaments 1──* participants
teams       1──* participants
users       1──* participants
events      1──* event_registrations
events      1──* matches
events      1──* event_results
teams       1──* event_registrations
participants 1──* event_registrations
event_registrations 1──* event_team_participants
matches     *──1 matches (self-ref via next_match_id)
```

---

## 4. Database Triggers

### 4.1 `handle_new_user` (on `auth.users`)
**Fires**: AFTER INSERT on `auth.users`
**Purpose**: Automatically creates a `public.users` row when a new user signs up via Supabase Auth, extracting `full_name` and `department` from signup metadata.

```sql
INSERT INTO public.users (id, email, full_name, role, department)
VALUES (
  new.id, new.email,
  coalesce(new.raw_user_meta_data->>'full_name', 'Unknown'),
  'participant',
  (new.raw_user_meta_data->>'department')::public.department
)
ON CONFLICT (id) DO NOTHING;
```

### 4.2 `enforce_bracket_format` (on `matches`)
**Fires**: BEFORE INSERT on `matches`
**Purpose**: Prevents matches from being created for non-bracket events.

```sql
IF (SELECT format FROM events WHERE id = new.event_id) != 'bracket' THEN
  RAISE EXCEPTION 'Matches can only be created for bracket events';
END IF;
```

### 4.3 `trigger_update_tournament_status` (on `events`)
**Fires**: AFTER UPDATE on `events`
**Purpose**: Automatically transitions the parent tournament to `ongoing` when any of its events moves from `upcoming` to `ongoing` or `completed`.

```sql
IF (NEW.status = 'ongoing' OR NEW.status = 'completed')
   AND (OLD.status = 'upcoming' OR OLD.status IS NULL) THEN
  UPDATE tournaments
  SET status = 'ongoing'
  WHERE id = NEW.tournament_id AND status IN ('draft', 'registration_open');
END IF;
```

---

## 5. Stored Procedures (RPC Functions)

### 5.1 `join_team(p_user_id UUID, p_token TEXT)`
**Purpose**: Allows a participant to join a team using a registration token.
**Validations**:
1. Token must be valid (maps to an existing team)
2. Team must not be disqualified
3. Tournament must still be in `draft` or `registration_open` status
4. User must exist in `public.users`
5. User must not already be registered in the tournament
6. User's department must match the team's department

**Returns**: JSON with `success`/`error` and team details.

### 5.2 `record_judged_results(p_event_id, p_first_team_id, p_second_team_id, p_third_team_id, p_recorded_by)`
**Purpose**: Records podium results (1st, 2nd, 3rd) for judged-format events.
**Validations**:
1. Event must exist and be `judged` format
2. No duplicate placements
3. All placed teams must be confirmed registrations (supports both team and individual events via JOIN on participants)

**Logic**:
- Uses `UPSERT` (INSERT ... ON CONFLICT DO UPDATE) on `event_results` to allow re-recording
- Cleans up stale results (e.g., if a team was moved from 2nd to 1st, deletes the old 2nd-place row)
- Marks the event as `completed` after recording

---

## 6. Application-Level Business Logic

### 6.1 Bracket Generation (`generateBracket`)
**Algorithm**: Single-elimination bracket with power-of-2 padding and bye handling.

1. Fetch confirmed registrations (team_id or participant_id depending on event type)
2. Shuffle registrations randomly for fair seeding
3. Calculate total slots: `p = 2^ceil(log2(n))` where `n` = number of registrations
4. Pad with `null` entries to fill `p` slots
5. Generate `p - 1` total matches across `log2(p)` rounds
6. Link matches via `next_match_id` (winner of match `i` advances to match `floor(i/2)` in next round)
7. **Bye handling**: If one side is `null`, automatically mark the match as completed with the non-null side as winner, and advance them to the next round

### 6.2 Match Scoring (`recordMatchScore`)
1. Fetch the match with its event details (type, status, points)
2. Determine winner/loser based on scores (ties are rejected)
3. Update the match as `completed`
4. **Action-triggered status transition**: Atomically update event from `upcoming` → `ongoing` (triggers tournament status update via DB trigger)
5. **Advance winner**: Place winner into the next match (via `next_match_id`)
6. **Score correction**: If editing a previously completed match, cascade-reset all downstream matches that the old winner had advanced through
7. **Finals handling**: If no `next_match_id`, this is the final — automatically create `event_results` for 1st and 2nd place and mark event as `completed`

### 6.3 Bracket Regeneration (`regenerateBracket`)
- Safety check: Only allowed if no matches have scores recorded
- Deletes all existing matches for the event
- Re-runs `generateBracket` to create a fresh bracket with new random seeding

---

## 7. Frontend Architecture

### 7.1 Route Structure

| Route | Page | Access |
|-------|------|--------|
| `/` | Landing page | Public |
| `/login` | Login form | Public |
| `/signup` | Registration form | Public |
| `/dashboard` | Participant dashboard | Authenticated |
| `/dashboard/team/:teamId` | Team management | Captain |
| `/dashboard/event-roster/:registrationId` | Event roster management | Captain |
| `/admin/dashboard` | Admin dashboard | Admin |
| `/admin/tournaments` | Tournament CRUD | Admin |
| `/admin/tournaments/:id/teams` | Team management | Admin |
| `/admin/tournaments/:id/events` | Event CRUD | Admin |
| `/admin/events/:id/bracket` | Bracket management + scoring | Admin / Event Manager |
| `/admin/events/:id/results` | Judged results recording | Admin / Event Manager |
| `/event-manager` | Event manager dashboard | Event Manager |
| `/tournaments` | Public tournament listing | Public |
| `/tournaments/:id` | Tournament detail + standings | Public |
| `/tournaments/:id/events/:eventId` | Event detail + bracket/results | Public |

### 7.2 Service Layer

| File | Responsibility |
|------|---------------|
| `auth.ts` | Session management, login, signup, logout, profile fetching |
| `tournaments.ts` | Tournament CRUD operations |
| `teams.ts` | Team creation, token-based join |
| `participants.ts` | Participant listing, approval, rejection |
| `events.ts` | Event CRUD, registration, roster management, judged results |
| `bracket.ts` | Bracket generation, match scoring, downstream cascading |
| `public.ts` | Public read-only queries (tournaments, standings, matches, results) |

### 7.3 Reusable UI Components

| Component | Purpose |
|-----------|---------|
| `Button` | Styled button (primary, secondary, danger variants) |
| `Input` | Styled text input |
| `Select` | Styled dropdown |
| `DatePicker` | Date input component |
| `TimePicker` | Time input component |
| `Badge` | Status badge with color coding |
| `Bracket` | Full bracket visualization (renders match tree with team/participant names) |
| `ConfirmModal` | Retro-styled confirmation dialog (replaces `window.confirm`) |
| `EventInfoCard` | Reusable sidebar card showing event details and registrations |
| `StandingsCard` | Tournament leaderboard display |
| `EmptyState` | Placeholder for empty data states |
| `Spinner` | Loading indicator |

### 7.4 Layout Components
- `AdminLayout` — Sidebar navigation for admin/event-manager pages
- `AuthLayout` — Centered card layout for login/signup

---

## 8. Key Data Flows

### 8.1 Tournament Lifecycle
```
draft → registration_open → ongoing → completed
         (admin action)      (auto: trigger)  (auto: all events done)
```

### 8.2 Event Lifecycle
```
upcoming → ongoing → completed
           (auto: first score recorded)  (auto: final match scored OR judged results submitted)
```

### 8.3 Team Registration Flow
1. Admin creates tournament + teams (one per department)
2. Each team gets an auto-generated `registration_token`
3. Participant signs up → calls `join_team(token)` RPC
4. Admin approves participant → status changes to `confirmed`
5. Captain manages event rosters from dashboard

### 8.4 Bracket Event Flow
1. Admin creates bracket event → registers teams/participants
2. Admin clicks "Generate Bracket" → `generateBracket()` creates seeded matches
3. Admin records scores → `recordMatchScore()` advances winners
4. Final match scored → `event_results` auto-created, event marked `completed`

### 8.5 Judged Event Flow
1. Admin creates judged event → registers teams/participants
2. Admin/event manager selects 1st, 2nd, 3rd from dropdowns
3. Submits → `record_judged_results` RPC validates and upserts results
4. Event marked `completed`

---

## 9. Cascading Delete Strategy

The schema uses `ON DELETE CASCADE` extensively to ensure referential integrity:

| Parent | Child | Delete Rule |
|--------|-------|-------------|
| tournaments | teams, events, participants | CASCADE |
| teams | participants, event_registrations, event_results | CASCADE |
| events | matches, event_registrations, event_results | CASCADE |
| event_registrations | event_team_participants | CASCADE |
| participants | event_registrations | CASCADE |
| users → participants | CASCADE |
| matches.next_match_id | SET NULL |
| events.assigned_to | SET NULL |

This means deleting a tournament will automatically clean up all teams, events, participants, matches, results, and registrations.

---

## 10. Migration History

| Version | Name | Description |
|---------|------|-------------|
| 20260320120449 | add_event_registration_tables | Created event_registrations, event_team_participants |
| 20260320185846 | add_event_manager_enum_value | Added 'event_manager' to user_role enum |
| 20260320185851 | update_referee_rows_to_event_manager | Migrated existing referee users |
| 20260320192748 | add_event_assigned_to | Added assigned_to column to events |
| 20260320193204 | cascade_delete_events | Set CASCADE on event foreign keys |
| 20260320194101 | fix_record_judged_results_optional_positions | Made 2nd/3rd place optional in RPC |
| 20260320194405 | fix_judged_results_individual_events | Added individual event support to RPC |
| 20260423105416 | tournament_status_trigger | Created auto status transition trigger |
| 20260423110214 | fix_tournament_status_trigger_enums | Fixed trigger to use correct tournament statuses |

---

## 11. Points & Standings System

- Each event has configurable point values: `points_first` (default 10), `points_second` (default 6), `points_third` (default 3)
- Points are stored in `event_results.points_awarded`
- The public standings page aggregates points per team across all events in a tournament
- Standings are sorted by total points, with gold/silver/bronze medal counts as tiebreakers
