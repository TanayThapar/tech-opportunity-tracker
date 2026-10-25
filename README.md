# Tech Opportunity Tracker & Automated Discovery Pipeline

A modern, deadline-first web platform tracking verified tech opportunities worldwide: **hackathons**, **computer science conferences** (with CORE A*, A, B tiers), **workshops**, **internships**, and **regular job openings** (e.g. JPMorgan Chase, Samsung).

Live Production: [https://tech-opportunity-tracker.vercel.app](https://tech-opportunity-tracker.vercel.app)

---

## 🌟 Highlights & Key Features

### 1. "Radar" Dashboard & Interactive Calendar
- **Deadline-First Radar Layout**: Charcoal background (`#0c1015`), readable off-white typography, monospace dates, and electric-lime accents.
- **Closing Soon Spotlight**: Immediate visibility into opportunities with deadlines approaching within 45 days.
- **Interactive Calendar View**: Full monthly grid with color-coded category pills, urgency alerts, detail drawer, and a **Month-Year selector dropdown (Oct 2026 – Dec 2027)** for jumping directly to any future conference month.
- **Card & Calendar Toggle**: Switch between visual opportunity cards and monthly calendar view with a single click.

### 2. Novelty Engines: Collision Radar, Live Calendar Feed & Tech Stack Matcher
- **Feature #1: Personal Deadline Collision Radar**:
  - Automatically identifies high-stress clusters where 2 or more paper submission deadlines or job application dates collide within a tight window (e.g. 5–6 days).
  - Categorizes severity (`Critical Crunch` with pulse animation, `High Congestion`, `Deadline Overlap`).
  - Displays a dedicated **Collision Alert Banner** above the main feed and dynamic **⚡ Crunch Alert** badges on colliding opportunity cards.
- **Feature #2: Live RFC 5545 iCalendar (`.ics`) & WebCal Subscription Feed**:
  - Live, dynamic calendar feed endpoint at [`/api/calendar/feed`](./src/app/api/calendar/feed/route.ts).
  - RFC 5545 compliant with line folding (75 octets), CRLF delimiters, character escaping, and standard `VEVENT` definitions.
  - Automatically equips each submission deadline with dual `VALARM` notifications (24-hour urgent warning and 7-day preparation reminder).
  - 1-click **"Sync Calendar"** modal supporting **Google Calendar**, **Apple Calendar**, **Microsoft Outlook**, and offline `.ics` downloads with customizable presets (All, Saved Deadlines, ACM/IEEE, Conferences).
- **Feature #7: Skill & Tech Stack Matcher Engine**:
  - Automatically extracts core technical skills, frameworks, and domains (`Python`, `Rust`, `Go`, `TypeScript`, `PyTorch & Deep Learning`, `LLMs & Generative AI`, `Distributed Systems`, `Kubernetes & Cloud Native`, `Zero-Knowledge & Cryptography`, etc.) from opportunity metadata.
  - Calculates personalized match percentages against the user's selected tech stack.
  - Displays **🔥 {X}% Match** badges and skill tags on cards, with a quick **"Matches Only"** filter toggle.

### 3. Dedicated ACM & IEEE Conferences and Workshops
- **Prominent Society Filters**: One-click quick filter buttons for **ACM Events**, **IEEE Events**, **USENIX**, and **All Societies** with live item count badges.
- **Visual Society Badges**: Distinctive badges on opportunity cards and calendar entries highlighting ACM (sky-blue), IEEE (deep royal blue), and USENIX (indigo) sponsorships. Joint conferences (e.g., *MICRO*, *ASPLOS*, *ICSE*) display both.
- **Comprehensive Workshop Catalog**: Dedicated tracking for high-impact workshops including *ACM HotOS*, *ACM HotNets*, *ACM HotStorage*, *ACM WPES*, *ACM AISEC*, *ACM PLAS*, *ACM APSys*, *IEEE SpaAI*, *IEEE DLSP*, *IEEE IWST*, *IEEE SLT*, *IEEE ICRA Workshops*, *IEEE VIS Workshops*, and *IEEE GLOBECOM Workshops*.
- **Flagship Academic Conferences**: Full CORE A* and CORE A coverage across all computer science disciplines (*INFOCOM*, *ICRA*, *IROS*, *FOCS*, *MICRO*, *HPCA*, *IPDPS*, *VIS*, *CDC*, *Quantum Week QCE*, *CIKM*, *RecSys*, *MobiCom*, *SenSys*, *WSDM*, *EMNLP*, *ASSETS*, *CCS*, etc.).

### 3. Computer Science Subfield Categorization
Dedicated track filtering dropdown on the dashboard:
- `AI / Machine Learning`
- `Systems & Architecture`
- `Security & Privacy`
- `Software Engineering & PL`
- `Databases & Data Mining`
- `Computer Networks & Mobile`
- `Theory & Algorithms`
- `HCI & Computer Graphics`

### 4. AI Auto-Fill with Google Gemini
- **In-Browser Gemini Key Configuration**: Users can input their Gemini API Key directly inside the **"Submit Opportunity"** modal. The key is securely saved in their browser (`localStorage`), never exposed to other users or logged.
- **URL & Announcement Extractor** (`/api/ai/extract`): Paste any official conference URL or announcement text. Gemini automatically parses and populates the title, category, tier, organizer, dates, deadlines, format, location, and description.
- **Safe & Sandboxed**: All page fetches use SSRF-protected HTTP clients (`safeFetch`), strict Zod validation schema (`AIExtractedOpportunitySchema`), and prompt injection sanitization.
- **Strict Publication Rule**: AI-extracted opportunities are quarantined to `status: 'needs_review'` with `origin: 'ai_extracted'` and never auto-publish without human review.

### 5. Automated Discovery Adapters & Refresh Scheduler
- **Configurable Refresh Intervals**: Automated scraping cycles configurable to **1 hour, 6 hours, 12 hours, or 24 hours** (default: 6 hours) via [`/api/pipeline/schedule`](./src/app/api/pipeline/schedule/route.ts).
- **Vercel Cron & Stale-While-Revalidate Hybrid**: Accommodates Vercel's Hobby plan limit (1 cron execution per day: `0 2 * * *` hitting `/api/pipeline/run`) alongside client-side stale-while-revalidate background refreshes and manual on-demand triggers (**"Scrape Feeds Now"**).
- **Multi-Source Structured Ingestion**:
  1. **CCF-Deadlines Adapter**: Fetches open-source community conference datasets with CORE rankings, normalizing timezones, dates, and workshop classifications.
  2. **AI-Deadlines Adapter**: JSON endpoint ingestion with AoE (Anywhere on Earth) and timezone normalization to UTC.
  3. **Curated Job Feeds**: Official verified career listings from major tech employers (JPMorgan Chase, Samsung) with reachability verification.
  4. **MLH Hackathons Crawler**: Discovers hackathons from official Major League Hacking feeds.
  5. **Open Tech Internships Crawler**: Ingests student and graduate software internships.
- **Fault-Tolerant & Isolated**: Failures or rate-limits in any single source are logged and do not abort the discovery run.

### 6. Strict Confidence & Provenance Rules
- **Claims Match Reality**: Verifiable checks only. Generic "Official domain verified" claims are banned; entries specify exact evidence (e.g., `dates from community-maintained dataset`, `source URL reachable at fetch time (HTTP 200)`).
- **Anti-Bot Challenge Handling**: Academic publishers (ACM, IEEE, USENIX) returning HTTP 403/401 Cloudflare verification are recognized as live web servers rather than dead links.
- **Quarantine Queue** (`/needs-review`): Low-confidence, user-submitted, and AI-extracted items remain hidden from public feeds until approved by a moderator.

### 7. Verified Authentication, Email OTP & Admin Account Access Controls
- **Email OTP Confirmation System**:
  - Sign-up enforces real email confirmation using a 6-digit cryptographic verification code (`/api/auth/signup`, `/api/auth/verify-otp`, `/api/auth/resend-otp`).
  - Account is activated (`emailVerified: true`) only upon entering the valid OTP code within the 10-minute validity window.
  - Rate-limited to max 5 failed attempts per OTP code before automatic invalidation.
  - Zero paid dependencies: supports standard SMTP via Nodemailer or development fallback logging.
- **Strict Prior Registration Requirement**:
  - Unrecognized identifiers can no longer sign in without prior account creation (HTTP 404: `"Account not found. Please create an account before signing in."`).
- **Password Protection for Root Admins**:
  - `@TanayThapar` and `@Sanvi850` accounts require the authorized password (`Manipal`) to authenticate.
  - Public registration claiming root admin usernames/emails is strictly blocked (HTTP 403).
  - Root admin roles are permanently locked in source code and cannot be modified or demoted.
- **Admin Account Revocation & Complete Erasure Controls** (`/admin`):
  - **Account Revocation**: Admins can suspend/revoke any user account (`role: 'revoked'`). Revoked users are immediately blocked from logging in (HTTP 403) and active cryptographic sessions are invalidated (HTTP 401).
  - **Account Erasure**: Admins can permanently delete accounts via `DELETE /api/admin/roles?userId=...` with confirmation dialogs. Completely wipes user profile, saved watchlists, email records, and notification preferences.
  - **Immutable Root Admin Immunity**: Both root administrator accounts are permanently protected against revocation and deletion.
  - **Self-Destruction Protection**: Admins cannot revoke or erase their own active accounts.

### 8. Real-Time System Audit Trail & Activity Logs
- **100% Action Visibility**: Every single action across the application is recorded in a tamper-resistant, chronological audit log:
  - **Authentication Events**: Root admin logins, standard user logins, failed password attempts, blocked revoked attempts, unknown user sign-ins, and user logouts.
  - **Email OTP Events**: Registration requests, OTP code dispatches, successful OTP verifications, invalid OTP attempts, and code resends.
  - **Administrative Actions**: Role updates, account revocations/suspensions, account restorations, and permanent account erasures.
  - **Content & Moderator Actions**: Community opportunity submissions, moderator approvals into published radar, status updates, and rejections.
  - **Pipeline & AI Actions**: Manual crawler pipeline executions, scheduled Vercel Cron runs, scraper refresh interval modifications, and Gemini AI extractions.
- **Dual-View Logs Hub** (`/pipeline-logs`):
  - **System Activity & Audit Trail Tab**: Interactive search, category filters (Admin, Auth & OTP, Security, Pipeline, Submissions), status badges, actor attribution, and expandable metadata JSON inspector.
  - **Crawler Pipeline Runs Tab**: Historical crawler logs with event counts, added/duplicate metrics, and detailed error traces.
- **Live Admin Dashboard Stream** (`/admin`):
  - Real-time audit widget displaying the most recent administrative and security events with live color-coded status badges and instant drill-down.

### 9. Personal Watchlist & Notifications
- **Watchlist (Bookmark)**: Save opportunities to a personal watchlist.
- **Attending / RSVP Status**: Mark events as attending to track personal schedules.
- **Community Comments**: Add comments and discussion to opportunities.
- **Updates Feed**: Track newly added listings and changed submission deadlines.

---

## 🛠️ Tech Stack & Dependencies

- **Framework**: Next.js 16 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS v4
- **Icons & UI**: Lucide React, Motion (`motion/react`)
- **Date Handling**: `date-fns`
- **Validation**: Zod
- **Deduplication**: Fast-Levenshtein with normalized title, date, and organizer containment
- **Testing**: Vitest (101 tests across 18 suites)
- **Zero Paid Dependencies**: 100% open-source libraries, free community feeds, and self-hostable tools.

---

## 📋 Free-Tier Hosting & Plan Limits

> [!NOTE]
> All services used adhere strictly to free, self-hostable, or zero-cost tiers:
>
> 1. **Vercel Hobby Plan**:
>    - **Cron Limit**: Enforces a strict maximum of **1 cron execution per day**. Configured in `vercel.json` as `0 2 * * *`. Intraday periodic scraping (1h, 6h, 12h) is handled in-app via stale-while-revalidate detection.
>    - **Serverless Execution**: 10-second default function execution timeout (extended to 60s for pipeline route where supported).
> 2. **Google Gemini API (Google AI Studio Free Tier)**:
>    - **Model**: `gemini-1.5-flash`
>    - **Rate Limits**: 15 Requests Per Minute (RPM), 1,500 Requests Per Day (RPD), 1,000,000 Tokens Per Minute (TPM). Free of charge without credit card requirement.
> 3. **CCF-Deadlines & GitHub Raw**:
>    - Unauthenticated raw GitHub user content with in-run caching (10-minute TTL) to avoid hitting GitHub rate limits.

---

## 🚀 Getting Started

### Prerequisites
- Node.js 20+ (Node.js 22 or 26 recommended)
- npm or pnpm

### 1. Clone & Install
```bash
git clone https://github.com/TanayThapar/tech-opportunity-tracker.git
cd tech-opportunity-tracker
npm install
```

### 2. Environment Variables (Optional)
Create a `.env.local` file in the root directory:

```bash
# Authentication & Security
AUTH_SECRET="your-secure-random-secret-at-least-32-chars-long"

# Cron Pipeline Security
CRON_SECRET="your-vercel-cron-secret"

# Optional: Server-wide Google Gemini API Key
GEMINI_API_KEY="AIzaSy..."

# Optional: Supabase PostgreSQL Persistence (if deploying with durable database)
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
```

> [!TIP]
> The application functions fully out-of-the-box in local development and demo mode without requiring any external database or paid API keys. Users can also enter their Gemini API key directly in the web UI.

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Run Unit Tests
```bash
npm test
```
Executes all 66 automated tests verifying auth security, session validation, cron authorization, crawlers, deduplication, Gemini extraction, and society filters.

### 5. Build for Production
```bash
npm run build
```

---

## 📡 API Reference

| Endpoint | Method | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `/api/opportunities` | `GET` | Fetch opportunities (filterable by `type`, `tier`, `subfield`, `status`) | Public |
| `/api/opportunities` | `POST` | Submit a new opportunity (quarantined to `needs_review`) | Verified Session |
| `/api/pipeline/run` | `GET` / `POST` | Trigger discovery pipeline & web scrapers | `CRON_SECRET` or Admin/Moderator |
| `/api/pipeline/schedule` | `GET` | Get current scraping interval, last run time, and stale status | Public |
| `/api/pipeline/schedule` | `POST` | Update scraping frequency (1h, 6h, 12h, 24h) | Admin/Moderator |
| `/api/pipeline/logs` | `GET` | View audit logs and crawl reports of previous pipeline runs | Public |
| `/api/ai/extract` | `POST` | Extract opportunity details from URL or text using Google Gemini | Valid Gemini API Key |
| `/api/auth/login` | `POST` | Authenticate user with password or demo identity | Public |
| `/api/auth/me` | `GET` | Get authenticated user profile and roles | Verified Session |
| `/api/admin/roles` | `GET` / `POST` | List users and manage RBAC role assignments | Admin / Root Admin |
| `/api/user/interactions`| `GET` / `POST` | Sync personal saved opportunities, attendance, and comments | Verified Session |

---

## 🛡️ Security & Integrity Guarantees

1. **Anti-Hallucination Policy**: Every single listing is verified against real sources at pipeline runtime or manually entered by authenticated users. Events and deadlines are never fabricated.
2. **SSRF Guard**: All server-side URL probes and page extractions validate destination IP addresses to prevent Server-Side Request Forgery against internal, private, or cloud metadata endpoints (`169.254.169.254`, loopback, RFC1918).
3. **Prompt Injection Protection**: Unstructured content submitted to AI extraction endpoints is stripped of HTML/scripts and wrapped in strict delimiter boundaries.
4. **Root Administrator Protection**: `@TanayThapar` and `@Sanvi850` retain permanent immutable root administrator rights in source code that cannot be overridden by client requests or database tampering.

---

## 📄 License & Attribution

- Open-source under the [MIT License](./LICENSE).
- Computer Science conference data and CORE rankings sourced from the open-source [CCF-Deadlines](https://github.com/ccfddl/ccf-deadlines) dataset (MIT License, Copyright (c) 2021 CCFDDL).
- AI conference deadlines dataset sourced from [ai-deadlines](https://github.com/mlciv/ai-deadlines).
