# Okinawa Shorin Kai Karate Do - Student Profile Portal

A modern, responsive web portal for inquiring about student profiles, achievements, and tournament history for **Okinawa Shorin Kai Karate Do**. This system provides a streamlined interface for parents, students, and administrators to access performance records.

## Features

- **Student Search**: Fast, fuzzy-search enabled directory to find students by name or unique ID (e.g., SK-0001).
- **Comprehensive Profiles**: Detailed views showcasing belt ranks, dojo affiliation, and participation history.
- **Tournament Records**: Track medals (Gold, Silver, Bronze) and event participation over time.
- **Responsive Design**: Optimized for both mobile devices and desktop screens.
- **Theme Support**: Includes a dark/light mode toggle for comfortable viewing in any environment.

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (React)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Database**: [Supabase](https://supabase.com/)
- **Search Engine**: [Fuse.js](https://fusejs.io/)

## Open Source

This is an open source project. We welcome the community to review the code and suggest improvements.

**Repository**: [https://github.com/ull0sm/HonorLog.git](https://github.com/ull0sm/HonorLog.git)

## Getting Started

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/ull0sm/HonorLog.git
    cd HonorLog
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Environment Setup**:
    Create a `.env.local` file in the root directory with your Supabase credentials:
    ```env
    NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
    NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
    ```
    *Note: Database schema is available in `schema.sql`.*

4.  **Run Development Server**:
    ```bash
    npm run dev
    ```
    Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Internal Portal Deployment Notes (Phase 11)

These notes are for deploying the `/portal` admin/registrar workflows safely.

### Required environment variables

Set all of the following in your deployment environment:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

Important:

- `SUPABASE_SERVICE_ROLE_KEY` is server-only and must never be exposed via `NEXT_PUBLIC_*`.
- Portal registrar creation and password reset require the service-role key.

### Supabase auth configuration

In Supabase Authentication settings:

- Set the Site URL to your production app URL.
- Add Redirect URLs used by portal login/logout flows.
- Keep email/password auth enabled for staff login.

### Database and migration requirements

Before enabling portal users in production:

- Apply `migrations/001_phase1_portal_schema.sql`.
- Verify portal tables exist (`profiles`, `event_access`, `event_import_*`, `event_categories`, `event_registrations`, `event_results`, `audit_logs`).
- Ensure at least one active `super_admin` profile row exists.

### Storage assumptions

Current portal import flow parses uploads in-memory and writes normalized preview rows to DB tables.

- No Supabase Storage bucket is required for current JSON/XLSX import behavior.
- If you later persist uploaded files, create a private bucket and update server actions accordingly.

### Operational checks before go-live

- Confirm `npm run build` succeeds in production mode.
- Verify `/portal/login` works for both super admin and registrar accounts.
- Verify registrar cannot access unrelated event URLs.
- Verify lock/unlock controls and audit log page (`/portal/audit`) work for super admin.
- Verify locked events reject result edits from stale registrar tabs.

## Contact

For inquiries regarding the project or the karate school, please contact us:

📧 **Email**: [contact@shorinkai.in](mailto:contact@shorinkai.in)

---
&copy; 2026 Okinawa Shorin Kai Karate Do. All rights reserved.
