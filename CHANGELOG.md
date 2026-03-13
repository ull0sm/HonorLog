# Changelog

## 2026-03-11

### Overview

This update was delivered across two large commits:

- `4d71202` - major ui refactoring
- `ef2225a` - refactored dashboard and added entrydesk redirect

The goal of this work was to replace the original utility-first portal look with the redesigned HonorLog interface, while preserving the existing Supabase-backed student search and profile functionality.

---

## Change Set 1: Major UI Refactoring

### Commit

- `4d71202` - major ui refactoring

### Why

- The existing UI worked functionally, but it did not match the redesigned visual direction created in the restructure folder.
- The redesign needed to be applied inside the current Next.js app without changing the existing search, student profile routing, or Supabase data flow.
- The site also needed a more polished product feel across mobile and desktop.

### What Changed

- Rebuilt the global visual theme with updated dark/light tokens, surface styling, panel treatments, nav blur, and footer utilities.
- Restyled the shared application shell including the top navigation and footer.
- Restyled the homepage to match the new product-style landing layout while keeping the student search flow intact.
- Restyled the student profile page without changing profile data behavior.
- Fixed theme rendering behavior to avoid hydration mismatch between server and client.

### Where

- `app/globals.css`
- `app/layout.tsx`
- `app/page.tsx`
- `app/student/[id]/page.tsx`
- `components/ThemeToggle.tsx`
- `lib/ThemeContext.tsx`

### When

- Commit date: 2026-03-11 12:49:28 +0530

### How

#### Global styling

- Added a more opinionated design system in `app/globals.css` using reusable classes like `.panel`, `.panel-soft`, `.surface-strong`, and `.nav-blur`.
- Reworked background, border, shadow, and muted text treatment to create a more dashboard-oriented look.

#### Layout and navigation

- Updated `app/layout.tsx` to align the header and footer with the redesign.
- Tightened spacing and uppercase tracking values so labels looked less stretched.

#### Homepage redesign

- Replaced the earlier homepage presentation with a stronger hero, clearer search presentation, and more structured feature sections.
- Preserved fuzzy search and navigation into student detail pages.

#### Student profile redesign

- Updated the profile page presentation in `app/student/[id]/page.tsx` while keeping the existing student/result/event retrieval logic unchanged.

#### Theme hydration fix

- Reworked `components/ThemeToggle.tsx` and `lib/ThemeContext.tsx` so the server-rendered and client-rendered output stayed consistent.
- This addressed the hydration mismatch caused by theme-dependent icon and label rendering.

### Result

- HonorLog now uses the redesigned UI across the main routes.
- Existing student lookup and profile functionality remained intact.
- Lint and build were validated after the refactor.

---

## Change Set 2: Dashboard, EntryDesk Promotion, and Navigation UX

### Commit

- `ef2225a` - refactored dashboard and added entrydesk redirect

### Why

- The homepage needed a stronger statistics section that highlighted organization-wide visibility.
- The user wanted EntryDesk marketed from HonorLog without replacing HonorLog's main function.
- The top navigation needed to work more precisely, especially the Search action.
- Footer and CTA links needed clearer outbound-link styling.

### What Changed

- Added a dashboard-style metrics section on the homepage.
- Added count-up animation for students, dojos, events, and belt counts.
- Ensured the stats animation triggers once and does not reset after scrolling.
- Added EntryDesk promotional CTA content near the end of the homepage.
- Added a dedicated search navigation component so clicking Search scrolls to and focuses the actual input.
- Added outbound arrow indicators to the promo CTA and footer links.
- Expanded the top nav to include `Home`, `Search`, `Contact`, and `EntryDesk`.

### Where

- `app/layout.tsx`
- `app/page.tsx`
- `components/SearchNavLink.tsx`

### When

- Commit date: 2026-03-11 14:13:29 +0530

### How

#### Scoreboard section

- Added a dedicated metrics presentation on the homepage that reads more like a compact operations dashboard.
- The metrics include:
  - total students
  - total dojos
  - total events
  - black belts
  - brown belts
  - green belts
  - yellow belts
  - white belts

#### Animated numbers

- Implemented count-up animation with `requestAnimationFrame`.
- Used `IntersectionObserver` so the animation begins when the stats section becomes visible.
- Disconnected the observer after the first trigger so the numbers do not restart on later scrolls.

#### Search navigation behavior

- Added `components/SearchNavLink.tsx`.
- This component intercepts nav clicks on the homepage, scrolls the search input into view, updates the hash, and focuses the field.
- The homepage also listens for `#search` and `#search-input` so direct navigation still works.

#### EntryDesk promotion

- Added a dedicated promotional card near the footer to route users to EntryDesk for event registration and organizer workflows.
- This preserves HonorLog as the student records portal while promoting EntryDesk as the operations platform.

#### Footer and link affordances

- Added arrow indicators to footer and promotional outbound links.
- Updated footer links so `Home`, `Search`, `EntryDesk`, and `GitHub repository` read consistently.

### Result

- The homepage now presents real organizational data in a more compelling way.
- Search navigation is more reliable and user-friendly.
- EntryDesk is now integrated as a marketing destination inside HonorLog.
- The footer and CTA links better communicate navigation intent.

---

## Notes

- These changes were intentionally focused on UI and interaction polish.
- Core data behavior, search logic, routing, and Supabase integration were preserved.
- For external sharing, production mode (`next build` + `next start`) is preferred over a dev tunnel to avoid dev chunk-loading issues.

---

## 2026-03-13

### Overview

This update delivers **Phase 0: foundation and route scaffolding** for the internal backend portal.

- Internal portal route structure was scaffolded under `/portal` with protected and public portal boundaries.
- Supabase helpers were split into public and auth-aware variants for future authenticated portal workflows.
- Required Supabase environment variables were validated centrally so missing configuration fails clearly.
- Public student search/profile behavior was preserved.

---

## Change Set 3: Portal Foundation and Auth-Ready Scaffolding

### Commit

- `25c6ad9` — Portal Foundation and Auth-Ready Scaffolding

### Why

- The repo needed a safe technical base for admin and registrar workflows before feature development.
- Existing public student search pages needed to continue using a stable public Supabase client.
- Internal portal routes needed early structure to prevent future cross-contamination between public and protected logic.

### What Changed

- Added central environment validation for required Supabase public keys.
- Added Supabase helper modules for:
  - browser client usage in authenticated portal contexts
  - server client usage with cookie-aware auth handling
  - explicitly separated public anon client for public routes
- Updated legacy `lib/supabaseClient.ts` to reuse the dedicated public client.
- Added portal layout scaffolding and a protected route group that enforces session presence.
- Added portal placeholder pages for dashboard and future event routes (events list/new/detail/access/import/results).
- Added portal logout route scaffold.
- Added `@supabase/ssr` dependency to support Next.js server/browser auth-aware clients.

### Where

- `lib/env.ts`
- `lib/supabase/client.ts`
- `lib/supabase/server.ts`
- `lib/supabase/publicClient.ts`
- `lib/supabaseClient.ts`
- `app/portal/layout.tsx`
- `app/portal/(protected)/layout.tsx`
- `app/portal/(protected)/page.tsx`
- `app/portal/(protected)/_components/PortalScaffoldCard.tsx`
- `app/portal/(protected)/events/page.tsx`
- `app/portal/(protected)/events/new/page.tsx`
- `app/portal/(protected)/events/[eventId]/page.tsx`
- `app/portal/(protected)/events/[eventId]/access/page.tsx`
- `app/portal/(protected)/events/[eventId]/import/page.tsx`
- `app/portal/(protected)/events/[eventId]/results/page.tsx`
- `app/portal/logout/route.ts`
- `package.json`

### When

- Date logged: 2026-03-13

### How

#### Environment hardening

- Added `lib/env.ts` with strict checks for `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Missing values now throw explicit startup-time errors instead of silently using placeholders.

#### Supabase helper separation

- Kept public pages on a dedicated `publicSupabase` client.
- Added `createBrowserSupabaseClient()` for portal browser-side authenticated workflows.
- Added `createServerSupabaseClient()` using `@supabase/ssr` with Next.js cookie integration.

#### Portal route scaffolding

- Introduced `/portal` root layout for shared portal container styling.
- Added `(protected)` route group with an auth gate (`supabase.auth.getUser()` + redirect to `/portal/login` when absent).
- Added placeholder pages only, with no business mutations or role-specific logic yet.

### Result

- Phase 0 foundations are in place for upcoming authentication and admin feature phases.
- Public HonorLog student search/profile behavior remains untouched.
- Clear route and helper organization now exists for future portal iterations.

### Remaining For Next Phases

- Implement real login UI behavior and session lifecycle handling (Phase 2).
- Add profile/role bootstrap and authorization rules (Phase 2-3).
- Build event CRUD, access control, import pipeline, and results workflows (Phase 4+).

---

## Change Set 4: Phase 1 – Backend Portal Schema Migration

### Commit

- Working tree update (not yet committed)

### Why

- Phase 1 requires new and extended database tables before portal feature phases can begin.
- The core `schema.sql` is reserved as the install reference for fresh databases; live databases need an additive migration instead.
- All portal tables must exist before access control, import pipeline, and prize-entry logic can be wired in Phase 2–10.

### What Changed

- Created `migrations/001_phase1_portal_schema.sql` — a standalone, idempotent SQL migration.
- Added `profiles` table to store Supabase Auth users with name, email, global role, and active flag.
- Extended `events` table with workflow columns: `slug`, `status`, `description`, `import_status`, `results_locked`, `created_by`, `updated_at`.
- Added idempotent constraints on `events`: `events_slug_unique`, `events_status_check`, `events_import_status_check`, `events_created_by_fkey`.
- Added `event_access` table — event-scoped staff assignment with unique (event_id, user_id, role).
- Added `event_import_batches` table — upload tracking with a partial unique index on (event_id, import_fingerprint).
- Added `event_import_rows` table — per-row preview records from import parse, unique by (batch_id, row_index).
- Added `event_categories` table — explicit per-event divisions; expression-based dedup index on all nullable dimension fields.
- Added `event_registrations` table — confirmed import records; student_id nullable (on delete set null) for external participants.
- Added `event_results` table — portal-native prize entries; unique (event_id, category_id, placement) enforces no duplicate placements.
- Added `audit_logs` table — append-only action log for privileged operations.
- Added 22 `create index if not exists` statements across all new tables and extended events columns.
- Added `set_updated_at_timestamp()` trigger function and attached it to all mutable portal tables.

### Where

- `migrations/001_phase1_portal_schema.sql` (new file)

### When

- Date logged: 2026-03-13

### How

#### Separation from schema.sql

- `schema.sql` remains the definitive reference for fresh installs (4 original tables + seed data, unchanged).
- `migrations/001_phase1_portal_schema.sql` applies the Phase 1 delta to existing databases without touching schema.sql.

#### Idempotency design

- All new tables use `create table if not exists`.
- `alter table events add column if not exists` guards each column addition.
- Constraints added via `do $$ ... end $$` block with `pg_constraint` existence checks.
- Unique indexes use `create unique index if not exists`.
- Triggers use `drop trigger if exists` + `create trigger` to ensure clean re-runs.

#### Table dependency order

1. `profiles` (no table dependencies, auth FK target)
2. `events` column extensions (references profiles)
3. `event_access` (references events + profiles)
4. `event_import_batches` (references events + profiles)
5. `event_import_rows` (references event_import_batches)
6. `event_categories` (references events)
7. `event_registrations` (references events + students + event_categories)
8. `event_results` (references events + event_categories + event_registrations + profiles)
9. `audit_logs` (references events + profiles)

### Result

- All Phase 1 database objects exist and can be created incrementally against any existing HonorLog database.
- `schema.sql` remains clean and unmodified for fresh-install use.
- Phase 2 (login / profile bootstrap) and Phase 3 (authorization) can now reference the `profiles` and `event_access` tables.
- Phase 4+ feature phases have the full table surface they need.

### Remaining For Next Phases

- Update `schema.sql` with the full merged schema once all Phase 1 objects are stable (optional, separate housekeeping step).
- Implement Row Level Security policies for all portal tables (Phase 3).
- Implement login UI, session lifecycle, and profile bootstrap (Phase 2).