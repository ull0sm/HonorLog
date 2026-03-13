# Backend Portal Implementation Plan

This file is the execution plan for building the backend operations portal discussed for HonorLog and EntryDesk-style event management.

The purpose of this document is simple:

- break the work into safe, sequential implementation steps
- avoid another oversized all-at-once change
- keep the current public HonorLog student portal stable while we build admin functionality separately
- give you copy-paste prompts that you can send one by one so each phase is implemented cleanly

This plan is written for the current repository state:

- Next.js App Router frontend
- Tailwind CSS UI
- Supabase client already present
- current schema only supports public student/event/result browsing
- no authentication, no role system, no admin portal, no upload pipeline yet

---

## 1. Product Scope

We are building an internal portal with two controlled access modes.

### Role 1: Super Admin

Super admin manages everything.

Permissions:

- create, edit, archive, lock, and delete events
- import registrations for an event
- manage event categories and event metadata
- create restricted login access for event staff
- view and edit prize/result data for all events
- reset registrar credentials or disable them
- review audit history
- access every event in the system

### Role 2: Event Registrar

Registrar is restricted to one assigned event.

Permissions:

- log in using credentials defined by admin
- access only the assigned event
- view event participants/categories relevant to prize entry
- enter or update prize/result information only
- optionally mark divisions as completed

Restrictions:

- cannot create events
- cannot delete events
- cannot access other events
- cannot manage users
- cannot edit imports unless explicitly enabled later
- cannot alter global settings
- cannot remove participants

### Core Product Flow

1. Admin logs in.
2. Admin creates an event.
3. Admin configures that event.
4. Admin uploads a structured data file for that event.
5. System validates and previews the import.
6. Admin confirms import.
7. Admin optionally creates a registrar login for that event.
8. Registrar logs in.
9. Registrar sees only that event.
10. Registrar enters prize/result information.
11. Admin reviews, locks, and audits the event.

---

## 2. Implementation Strategy

We should not build this directly inside the current public pages.

### Separation of concerns

Keep two product areas inside the same app:

- public portal
  - existing HonorLog student search and profile browsing
- internal portal
  - admin and registrar workflows

### Proposed route structure

- `/portal/login`
- `/portal/logout`
- `/portal`
- `/portal/events`
- `/portal/events/new`
- `/portal/events/[eventId]`
- `/portal/events/[eventId]/access`
- `/portal/events/[eventId]/import`
- `/portal/events/[eventId]/results`

Optional later split:

- `/portal/admin/...`
- `/portal/registrar/...`

For v1, one login page is enough. The backend decides whether the user is a super admin or a registrar and routes them accordingly.

---

## 3. Architecture Decisions

### Recommended auth model

Use one authentication system, not two separate login systems.

Recommended setup:

- Supabase Auth for identity
- `profiles` table for user metadata
- `event_access` table for event-scoped permissions

This gives:

- one email/password login flow
- clean password reset handling
- event-level authorization
- no duplicated login logic
- proper auditability

### Recommended import model

Support both JSON and Excel eventually, but do not treat them equally.

Recommendation:

- JSON is the primary ingestion format
- Excel is a supported convenience format through a strict template only
- all uploads are converted into one normalized internal shape before import

Why:

- JSON is easier to validate and more predictable
- Excel is better for human editing but causes more data-shape problems
- the backend should validate one normalized format, not maintain two completely separate pipelines

### Recommended permission model

Keep permissions simple in v1.

Global roles:

- `super_admin`

Event-scoped roles:

- `event_registrar`

Possible later roles:

- `event_manager`
- `viewer`

Do not add those until the first two roles are stable.

---

## 4. Proposed Data Model

The current schema is too small for internal operations. We need to extend it.

### Existing tables already in repo

- `students`
- `events`
- `participations`
- `results`

### New tables to add

#### `profiles`

Purpose:

- one row per authenticated user
- stores display name and global role

Suggested fields:

- `id uuid primary key` references auth user id
- `email text unique not null`
- `full_name text`
- `global_role text not null check (global_role in ('super_admin', 'staff'))`
- `is_active boolean not null default true`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

#### `event_access`

Purpose:

- assigns a user to a specific event with a restricted role

Suggested fields:

- `id uuid primary key`
- `event_id uuid not null references events(id) on delete cascade`
- `user_id uuid not null references profiles(id) on delete cascade`
- `role text not null check (role in ('event_registrar'))`
- `is_active boolean not null default true`
- `can_edit_results boolean not null default true`
- `expires_at timestamptz null`
- `created_by uuid null references profiles(id)`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- unique `(event_id, user_id, role)`

#### `event_import_batches`

Purpose:

- tracks every upload and import attempt

Suggested fields:

- `id uuid primary key`
- `event_id uuid not null references events(id) on delete cascade`
- `uploaded_by uuid not null references profiles(id)`
- `source_type text not null check (source_type in ('json', 'excel'))`
- `source_filename text not null`
- `storage_path text null`
- `status text not null check (status in ('uploaded', 'parsed', 'validated', 'confirmed', 'failed'))`
- `row_count integer not null default 0`
- `error_summary jsonb not null default '[]'::jsonb`
- `created_at timestamptz not null default now()`

#### `event_import_rows`

Purpose:

- stores normalized preview rows before confirmation

Suggested fields:

- `id uuid primary key`
- `batch_id uuid not null references event_import_batches(id) on delete cascade`
- `row_index integer not null`
- `payload jsonb not null`
- `validation_status text not null check (validation_status in ('valid', 'warning', 'error', 'duplicate'))`
- `messages jsonb not null default '[]'::jsonb`
- `created_at timestamptz not null default now()`

#### `event_categories`

Purpose:

- explicit category/division model for an event

Suggested fields:

- `id uuid primary key`
- `event_id uuid not null references events(id) on delete cascade`
- `name text not null`
- `age_group text null`
- `belt_group text null`
- `division_type text null`
- `gender text null`
- `sort_order integer not null default 0`
- `is_locked boolean not null default false`
- `created_at timestamptz not null default now()`

#### `event_registrations`

Purpose:

- event-level imported registration records

Suggested fields:

- `id uuid primary key`
- `event_id uuid not null references events(id) on delete cascade`
- `student_id uuid null references students(id) on delete set null`
- `participant_name text not null`
- `participant_identifier text null`
- `dojo text null`
- `belt_rank text null`
- `gender text null`
- `age integer null`
- `category_id uuid null references event_categories(id) on delete set null`
- `raw_payload jsonb not null default '{}'::jsonb`
- `created_at timestamptz not null default now()`

#### `event_results`

Purpose:

- registrar/admin managed prize entries at event/category level

Suggested fields:

- `id uuid primary key`
- `event_id uuid not null references events(id) on delete cascade`
- `category_id uuid not null references event_categories(id) on delete cascade`
- `registration_id uuid null references event_registrations(id) on delete set null`
- `placement integer not null`
- `medal text null check (medal in ('GOLD', 'SILVER', 'BRONZE', 'PARTICIPATION'))`
- `participant_name_snapshot text not null`
- `dojo_snapshot text null`
- `entered_by uuid null references profiles(id)`
- `updated_at timestamptz not null default now()`
- unique `(event_id, category_id, placement)`

#### `audit_logs`

Purpose:

- track security-sensitive and operationally important changes

Suggested fields:

- `id uuid primary key`
- `actor_user_id uuid null references profiles(id)`
- `action text not null`
- `entity_type text not null`
- `entity_id uuid null`
- `event_id uuid null references events(id) on delete set null`
- `before_state jsonb null`
- `after_state jsonb null`
- `created_at timestamptz not null default now()`

### Additional event fields to add on `events`

Add these fields to existing `events` table:

- `slug text unique null`
- `status text not null default 'draft' check (status in ('draft', 'open', 'active', 'completed', 'locked', 'archived'))`
- `description text null`
- `import_status text not null default 'not_started'`
- `results_locked boolean not null default false`
- `created_by uuid null references profiles(id)`
- `updated_at timestamptz not null default now()`

---

## 5. Security Model

Do not rely on UI-only restrictions. All sensitive access must be enforced in the backend.

### Core security rules

1. Super admin can access everything.
2. Registrar can access only rows for the event assigned in `event_access`.
3. Registrar can only mutate prize/result records, not event definitions.
4. Registrar should not be allowed to delete result records unless that is explicitly allowed later.
5. Locked events must reject further result edits even if the registrar still has event access.

### Supabase RLS direction

Every sensitive internal table should have RLS enabled.

Key idea:

- policies should check `auth.uid()`
- join to `profiles` and `event_access`
- allow only the minimum required action

Example policy intent:

- `profiles`: user can view own profile, super admin can view all
- `events`: super admin full access, registrar select only assigned event
- `event_access`: super admin full access, registrar can read only their own active assignment
- `event_results`: super admin full access, registrar select/update/insert only within assigned event when `results_locked = false`
- `event_registrations`: super admin full access, registrar read-only within assigned event
- `audit_logs`: super admin only

---

## 6. Implementation Order

Build this in phases. Do not skip ahead.

### Phase 0: Prep and hardening

Goal:

- create the technical foundation without changing public student portal behavior

Scope:

- install/auth dependencies if needed
- add server/client Supabase helpers for authenticated portal work
- add environment variable validation
- define internal route layout for `/portal`

Why this first:

- current repo only has a public anon Supabase client
- protected workflows need a proper structure before feature work starts

Acceptance criteria:

- public pages still work
- portal route scaffolding exists
- auth helpers are ready for later steps

### Phase 1: Database migration for users, event access, imports, categories, results, audit

Goal:

- create the backend schema that supports the portal

Scope:

- add new tables
- extend `events`
- add indexes
- add triggers for timestamps if needed
- prepare seed-safe migration strategy

Acceptance criteria:

- schema is additive and does not break current public pages
- new tables are present and documented

### Phase 2: Authentication and profile bootstrap

Goal:

- implement the shared portal login system

Scope:

- login page
- logout action
- session-aware portal layout
- authenticated profile lookup
- route guards for internal pages

Acceptance criteria:

- unauthenticated user is redirected to `/portal/login`
- authenticated user reaches the portal shell

### Phase 3: Super admin role and admin dashboard shell

Goal:

- allow only super admins into full management area

Scope:

- admin landing page
- event list table
- event status indicators
- top-level portal navigation

Acceptance criteria:

- super admin can enter dashboard
- non-admin is denied

### Phase 4: Event CRUD

Goal:

- let admin create and manage events cleanly

Scope:

- create event form
- edit event form
- archive/lock controls
- event detail page tabs

Acceptance criteria:

- admin can create a draft event and edit it later

### Phase 5: Access control management for registrar accounts

Goal:

- let admin create restricted access for one event

Scope:

- create registrar user flow
- assign event-specific role
- temporary password flow or invite flow
- disable/reset credentials

Acceptance criteria:

- admin can create a registrar login tied to one event
- registrar cannot access anything outside that event

### Phase 6: Registrar portal experience

Goal:

- give registrar a minimal and safe workspace

Scope:

- route registrar after login
- show one-event dashboard
- restrict nav to prize-entry tasks only

Acceptance criteria:

- registrar sees only assigned event
- no admin navigation leaks into that UI

### Phase 7: File import pipeline with JSON first

Goal:

- support event registration import safely

Scope:

- upload UI
- server-side JSON parse
- validation and normalization
- preview rows before confirmation
- confirm import into event registration tables

Acceptance criteria:

- invalid rows are clearly flagged
- import is not finalized until confirmed

### Phase 8: Excel support through strict template

Goal:

- support human-friendly uploads without destabilizing import logic

Scope:

- `.xlsx` parsing
- template enforcement
- convert to same normalized internal payload as JSON

Acceptance criteria:

- Excel uses same validation pipeline as JSON
- malformed sheets are rejected with precise errors

### Phase 9: Prize entry workflow

Goal:

- give registrar/admin a controlled result entry surface

Scope:

- list categories
- open category detail
- assign placements
- update medals and winner rows
- prevent duplicates for same placement

Acceptance criteria:

- registrar can enter results only for assigned event
- duplicate placements and invalid medals are prevented

### Phase 10: Locking, audit trail, and review

Goal:

- harden the workflow for real usage

Scope:

- event result lock
- audit log capture
- admin review tools
- changed-by metadata

Acceptance criteria:

- locked event rejects edits
- important changes are auditable

### Phase 11: QA, error handling, and deployment readiness

Goal:

- make the portal safe to operate in production

Scope:

- empty state handling
- permission failure handling
- malformed uploads
- stale session handling
- mobile layout checks
- production auth and storage setup notes

Acceptance criteria:

- common failure modes are covered
- production runbook is documented

---

## 7. Edge Cases We Must Explicitly Handle

This section exists so we do not build a happy-path-only system.

### Authentication edge cases

- wrong password
- inactive user
- registrar exists but has no active event assignment
- registrar has expired event access
- user opens portal route after session expiration
- admin deletes assignment while registrar is logged in

### Event access edge cases

- registrar tries to open another event by URL
- registrar account assigned twice accidentally
- event is archived or locked but registrar still has active assignment
- admin deactivates registrar after login

### Upload edge cases

- file missing
- unsupported file type
- empty file
- invalid JSON
- broken Excel workbook
- wrong sheet name
- missing required columns
- duplicate participants in upload
- duplicate identifiers in upload
- event categories in file do not exist
- same batch uploaded twice
- upload too large
- partial parse failure

### Import edge cases

- student already exists but with mismatched name
- participant without existing student match
- category missing
- dojo value inconsistent
- belt rank missing or malformed
- medal value outside allowed set
- confirmation called twice
- admin refreshes during import confirm

### Prize entry edge cases

- duplicate placement in same category
- same participant assigned to multiple placements in same category
- category locked while registrar is editing
- stale browser tab overwrites newer data
- participant removed from category after prize entry begins

### Operational edge cases

- admin resets registrar password during event
- audit log insert fails
- storage upload succeeds but parsing fails
- import succeeds but UI preview refresh fails
- browser back button after logout

---

## 8. Recommended UX Rules

### Admin UX rules

- admin should always know event state: draft, imported, active, locked, archived
- destructive actions must require confirmation
- access-control actions must show exactly who can access what
- upload preview must show row counts and errors before final import
- lock action must clearly communicate that registrar edits will stop

### Registrar UX rules

- registrar should see a very small surface area
- one assigned event should open automatically
- only prize-entry relevant information should be visible
- invalid saves should explain exactly which category/placement failed
- locked event should be read-only with a clear banner

### Shared UX rules

- all write actions should show success/error feedback
- loading states should be explicit
- empty states should be explicit
- permission failures should not look like generic crashes

---

## 9. Recommended JSON Shape for Import

Use a normalized payload shape like this for backend validation.

```json
{
  "event": {
    "name": "National Karate Championship 2026",
    "date": "2026-08-14",
    "location": "Bengaluru"
  },
  "participants": [
    {
      "participantIdentifier": "SK-0001",
      "participantName": "Aarav Patel",
      "dojo": "Main Dojo",
      "beltRank": "Black",
      "gender": "Male",
      "age": 15,
      "category": "Individual Kata U16 Black"
    }
  ]
}
```

Required import validation rules:

- event must exist or be explicitly selected in portal
- participant name required
- category required
- placement not part of registration import
- age must be numeric if provided
- identifier must be normalized and trimmed
- dojo and belt rank should be normalized to known values where possible

---

## 10. Recommended Excel Strategy

Excel is not bad. Uncontrolled Excel is bad.

### Decision

- JSON remains the preferred format
- Excel is accepted only through a downloadable template

### Template requirements

- one workbook
- one expected sheet name
- fixed header names
- no merged cells
- no formulas in key identity columns
- no hidden dependency on formatting

### Suggested columns

- `participant_identifier`
- `participant_name`
- `dojo`
- `belt_rank`
- `gender`
- `age`
- `category`

### Processing rule

Excel should be converted to the same normalized structure as JSON and then sent through the same validation path.

---

## 11. Step-by-Step Copy-Paste Prompts

Each prompt below is intended to be pasted back into chat later. Use them in order.

### Prompt 1: Foundation and route scaffolding

```text
Build Phase 0 of the backend portal in this repo without touching the public HonorLog student search behavior.

Scope:
- create a protected internal portal route structure under /portal
- add server/client Supabase helpers suitable for authenticated portal work
- keep the existing public Supabase client working for public pages
- add environment validation for required Supabase variables
- scaffold portal layout, login page shell, and placeholder dashboard page

Constraints:
- do not implement business features yet
- do not change existing public search/profile behavior
- preserve current UI quality and styling consistency
- keep changes minimal but production-oriented

Edge cases to handle:
- missing env vars should fail clearly
- portal pages should not accidentally expose public-only logic
- public pages must still build and run

Deliverables:
- route scaffolding
- reusable auth-aware Supabase helpers
- clear file organization for later phases
- brief summary of what was added and what remains
```

Frontend expectations for Prompt 1:

- portal layout should feel visually consistent with the existing HonorLog product shell
- login page should be a real UI shell, not a raw placeholder or unstyled form dump
- protected dashboard placeholder should clearly communicate that business tooling is not built yet
- portal routes should look intentionally separated from public student browsing without breaking shared branding

### Prompt 2: Database schema and migration plan

```text
Build Phase 1 of the backend portal.

Scope:
- extend the database design from the current schema.sql
- add tables for profiles, event_access, event_import_batches, event_import_rows, event_categories, event_registrations, event_results, and audit_logs
- extend events with status, locking, metadata, and ownership fields
- add indexes and constraints needed for correctness
- update schema.sql in a way that is clear, additive, and safe

Constraints:
- do not break existing public HonorLog pages that read students/events/participations/results
- prefer additive schema changes over destructive rewrites
- design for Supabase and future RLS

Edge cases to handle:
- duplicate event access assignments
- duplicate placements in same category
- import batch replay
- nullable student matching for external participants

Deliverables:
- updated schema.sql
- explanation of each new table and key relationship
- notes about what later phases will rely on
```

### Prompt 3: Shared login and session protection

```text
Build Phase 2 of the backend portal.

Scope:
- implement /portal/login and logout flow
- add session-aware route protection for internal routes
- bootstrap authenticated user profile lookup
- redirect unauthenticated users to /portal/login
- keep public pages outside portal accessible as they are today

Constraints:
- use one login system for both super_admin and event_registrar
- do not implement admin CRUD yet
- do not expose sensitive portal routes without session checks

Edge cases to handle:
- invalid credentials
- expired session
- authenticated user with no profile row
- inactive user

Deliverables:
- working portal login flow
- protected internal route layout
- clear user/session state handling
```

Frontend expectations for Prompt 3:

- login page must provide usable email/password inputs with loading and error feedback
- protected portal header should show authenticated identity context (name/email + role)
- session expiry should redirect with a clear message instead of a blank failure state
- inactive/no-profile users should be signed out and shown a human-readable reason
- public pages (outside /portal) should remain unchanged and accessible

### Prompt 4: Super admin dashboard shell

```text
Build Phase 3 of the backend portal.

Scope:
- implement super_admin role checks
- create the admin dashboard shell under /portal
- show an event listing view with statuses and basic metadata
- add portal navigation for events and future sections

Constraints:
- super_admin gets full portal shell
- non-admin users must not access admin dashboard
- keep UI consistent with the current product design language

Edge cases to handle:
- user logged in but not authorized as super_admin
- empty event list
- archived/locked event states

Deliverables:
- admin dashboard shell
- event list page
- access denied handling for non-admin users
```

Frontend expectations for Prompt 4:

- super admin landing page should show summary cards and a clear dashboard entry state
- event list should expose status, import state, lock state, and basic metadata at a glance
- non-admin users should see a clear access denied state instead of a broken or blank screen
- empty event state should explain that admin shell is ready even before CRUD is implemented
- future portal sections should appear in navigation as intentional placeholders, not dead-looking UI

### Prompt 5: Event CRUD

```text
Build Phase 4 of the backend portal.

Scope:
- create event creation flow
- build event edit form
- allow status updates such as draft, active, completed, locked, archived
- add event detail page structure for future tabs: overview, access, import, results

Constraints:
- admin only
- do not implement importer yet
- do not implement registrar creation yet

Edge cases to handle:
- duplicate event slug if slug is used
- invalid dates
- missing required metadata
- locked events should restrict destructive edits

Deliverables:
- event CRUD pages/forms
- validation handling
- event detail shell ready for later phases
```

Frontend expectations for Prompt 5:

- event create and edit forms should feel production-usable, not like temporary admin scaffolding
- status controls should make draft, active, completed, locked, and archived states easy to understand at a glance
- destructive actions such as archive or delete should require explicit confirmation UI
- event detail page should introduce a tab or section shell that makes later access, import, and results areas feel connected
- validation errors should render inline and clearly map to the affected fields

### Prompt 6: Registrar account assignment and access control

```text
Build Phase 5 of the backend portal.

Scope:
- add an Access Control section inside an event
- let super_admin create or assign a registrar login for one event
- support setting email and temporary password for registrar in v1
- store event-scoped access in event_access
- support disable and reset actions

Constraints:
- registrar role is event-specific only
- do not create a separate auth system
- keep access model simple: super_admin and event_registrar only

Edge cases to handle:
- registrar assigned twice to same event
- same email reused incorrectly
- inactive registrar
- expired access
- admin removes access while registrar is active

Deliverables:
- access control UI
- registrar account creation/assignment flow
- backend enforcement structure for event-scoped access
```

Frontend expectations for Prompt 6:

- access control screen should clearly show who can access the event and with what status
- registrar creation and assignment UI should make event-specific scope obvious so admins do not confuse it with global access
- reset, disable, and expiry actions should be visible and understandable without reading backend details
- duplicate or conflicting assignments should surface as clear UI errors instead of generic failures
- sensitive actions should use confirmation affordances where appropriate

### Prompt 7: Registrar portal experience

```text
Build Phase 6 of the backend portal.

Scope:
- build the event_registrar experience after login
- if registrar has exactly one active event assignment, route directly into that event
- show only the assigned event and only the pages needed for result entry
- hide admin-only navigation and management controls

Constraints:
- registrar must never see unrelated events
- registrar must not see event creation, access management, or import management in v1

Edge cases to handle:
- registrar with no active assignment
- registrar with expired assignment
- registrar manually changing URL to another event
- locked event should become read-only

Deliverables:
- registrar-specific portal flow
- event-scoped access checks in UI and backend data access
```

Frontend expectations for Prompt 7:

- registrar landing flow should feel intentionally smaller and simpler than the super admin dashboard
- if exactly one active event exists, the UI should route directly into that event without extra selection friction
- admin-only navigation and controls should be absent, not merely disabled-looking
- no-assignment, expired-assignment, and locked-event states should each have clear explanatory UI
- registrar pages should focus tightly on the data needed for result entry only

### Prompt 8: JSON upload, validation, and preview

```text
Build Phase 7 of the backend portal.

Scope:
- add an import page for an event
- support JSON upload first
- parse JSON on the server
- validate against required participant/event/category rules
- store preview rows in event_import_batches and event_import_rows
- show a UI preview with valid, warning, duplicate, and error states
- add an explicit confirm import action

Constraints:
- super_admin only in v1
- do not silently import invalid rows
- do not finalize data until confirmation

Edge cases to handle:
- invalid JSON
- empty file
- duplicate participants
- missing required fields
- unknown categories
- repeated confirm requests
- stale preview state after refresh

Deliverables:
- upload UI
- parse/validate pipeline
- preview table
- confirm import path into normalized event registration records
```

Frontend expectations for Prompt 8:

- upload screen should clearly separate file selection, validation status, preview, and final confirmation
- preview UI should make valid, warning, duplicate, and error rows visually distinct
- row counts and summary metrics should be visible before confirmation
- repeated confirm attempts or stale preview state should produce explicit UI feedback
- invalid files should fail with actionable messages, not generic upload errors

### Prompt 9: Excel template support

```text
Build Phase 8 of the backend portal.

Scope:
- add Excel .xlsx support to the existing import flow
- enforce a strict workbook template
- convert Excel rows into the same normalized payload used by JSON imports
- reuse the exact same validation and preview pipeline

Constraints:
- do not create a separate import system for Excel
- reject malformed templates with clear messages

Edge cases to handle:
- wrong sheet name
- missing headers
- formulas in key columns
- blank rows
- duplicate identifiers
- non-numeric age values

Deliverables:
- Excel upload support
- template validation
- no duplication of core import validation logic
```

Frontend expectations for Prompt 9:

- Excel upload should feel like an extension of the existing import screen, not a separate workflow
- template requirements should be explained in the UI before upload begins
- malformed workbook errors should point to sheet/header/template problems in plain language
- users should be able to understand that Excel and JSON share the same downstream validation path
- any downloadable template link or guidance should be visually prominent and easy to find

### Prompt 10: Prize entry workflow

```text
Build Phase 9 of the backend portal.

Scope:
- create a results/prize entry UI for event categories
- allow admin and registrar to enter placements and medal results
- enforce one placement per category slot
- use event-scoped access checks so registrars can only edit their assigned event

Constraints:
- registrar can edit only results/prizes
- registrar cannot create/delete events or manage access
- use current event lock state to block edits when locked

Edge cases to handle:
- duplicate placements
- same participant assigned twice in same category
- stale edit collision
- locked category/event while editing
- participant/category mismatch

Deliverables:
- category list and result entry screens
- save/update behavior
- permission-safe mutation flow
```

Frontend expectations for Prompt 10:

- category list should help users quickly identify which division they are entering results for
- result entry screens should make placement order and medal assignment obvious and hard to mis-enter
- duplicate placement and participant mismatch errors should be shown inline near the affected entry rows
- locked category or event state should switch the UI into a clearly read-only presentation
- admin and registrar should share the same core result-entry experience unless role differences are necessary

### Prompt 11: Audit logs, locking, and operational hardening

```text
Build Phase 10 of the backend portal.

Scope:
- add audit logging for important actions
- log event creation, registrar assignment, imports, result edits, lock/unlock actions
- add event lock controls that prevent registrar writes after finalization
- surface admin review history where useful

Constraints:
- super_admin can review logs
- registrar should not access audit history
- lock enforcement must happen in backend logic, not only UI

Edge cases to handle:
- user loses access after page load
- concurrent edits near lock time
- audit insert failures
- lock toggled during active registrar session

Deliverables:
- audit pipeline
- event locking controls
- hardened mutation protections
```

Frontend expectations for Prompt 11:

- lock and unlock controls should clearly communicate operational impact before confirmation
- audit history should be readable, filterable, and obviously admin-only
- review surfaces should show who changed what and when without requiring raw JSON inspection for common cases
- mutation failures near lock time or permission loss should render as controlled UX states, not broken forms
- important hardening states should emphasize clarity over visual flourish

### Prompt 12: Final QA and production-readiness pass

```text
Build Phase 11 of the backend portal.

Scope:
- review all portal flows end to end
- tighten error handling, loading states, and empty states
- verify mobile behavior for admin and registrar flows
- add any missing guards, validation, and cleanup
- document deployment requirements for auth, storage, and environment setup

Constraints:
- do not introduce unrelated UI churn in the public portal
- focus on correctness, safety, and operational readiness

Edge cases to handle:
- broken uploads
- permission drift
- expired sessions
- missing event data
- malformed imported records
- locked events in stale browser tabs

Deliverables:
- polished portal behavior
- deployment/runbook notes
- summary of residual risks if any remain
```

Frontend expectations for Prompt 12:

- all admin and registrar flows should have explicit loading, empty, success, and failure states
- mobile layouts should remain usable for critical tasks, especially login, event navigation, imports, and result entry
- stale-session and permission-drift issues should surface as clear UX transitions instead of confusing partial renders
- final polish should improve clarity and resilience without introducing broad redesign churn into the public portal
- deployment notes should call out any frontend environment or browser-behavior assumptions that matter in production

---

## 12. Recommended Build Discipline

Use this process for every phase:

1. implement only the current phase
2. keep unrelated code untouched
3. validate types/lint/build where relevant
4. explain assumptions and edge cases covered
5. stop after the phase is complete

Do not combine multiple phases unless explicitly requested.

---

## 13. Immediate Next Step

Start with Prompt 1.

Do not jump to uploads or registrar flows first. The repo needs protected portal foundations before feature work.