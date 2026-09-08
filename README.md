# Tech Opportunity Tracker & Automated Discovery Pipeline

A public web application tracking upcoming tech opportunities: **hackathons** (company-run & collegiate), **conferences** (with Core A*, Core A, Core B tiering), **skill-building workshops**, and **internship openings**. 

Includes a public interactive month calendar & list view, fuzzy deduplication discovery pipeline, and transparent audit logging.

---

## 1. Tech Stack & Hosting Approach

- **Frontend & Framework**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4.
- **Components & Icons**: Lucide React, `date-fns` for calendar arithmetic.
- **Deduplication Engine**: Weighted Levenshtein ratio (`fast-levenshtein`) over normalized `[title + date + organizer]` with containment detection and candidate tolerance window.
- **Persistence**: Server-side storage engine with fallback JSON state and ready-to-plug Supabase PostgreSQL client (`@supabase/supabase-js`).
- **Hosting**: Native zero-config deployment on **Vercel** or **Netlify**.

---

## 2. Cron Schedule Configuration

The automated pipeline schedule is configured in [`vercel.json`](./vercel.json):

```json
{
  "crons": [
    {
      "path": "/api/pipeline/run",
      "schedule": "0 2 * * *"
    }
  ]
}
```

- **Default Schedule**: `0 2 * * *` (Runs automatically once daily at 02:00 UTC).
- **To change the interval**:
  - Weekly on Mondays: `"schedule": "0 2 * * 1"`
  - Every 12 hours: `"schedule": "0 */12 * * *"`
  - Every 6 hours: `"schedule": "0 */6 * * *"`
- **Manual Trigger**: Click the **"Run Pipeline"** button in the top navigation bar or send a `POST` request to `/api/pipeline/run`.

---

## 3. Data Model & Architecture

Each opportunity conforms to the following schema:
- `title`: string
- `type`: `hackathon` | `conference` | `workshop` | `internship`
- `conference_tier`: `Core A*` | `Core A` | `Core B` | `Core C` | `Industry / Non-Academic` (customizable)
- `organizer`: string
- `start_date`, `end_date`: ISO format (or application deadline for internships)
- `format`: `online` | `in-person` | `hybrid`
- `location`: string (if in-person or hybrid)
- `source_url`: Mandatory URL where the opportunity was discovered (never fabricated)
- `description`: 2-3 sentence overview
- `discovery_confidence`: `high` | `low`
- `confidence_reasons`: Array of diagnostic reasons if flagged for review
- `status`: `published` | `needs_review` | `archived`

### Key Design Tenet: Auto-Publishing with Review Backlog
- **ALL events auto-publish immediately (`status: 'published'`)** regardless of confidence.
- Events with tentative dates, unverified community sources, or near-duplicate similarities receive `discovery_confidence: 'low'` and appear in both the main calendar and the dedicated **"/needs-review"** backlog for spot-checking.
- Past events are automatically transitioned to `status: 'archived'` by the pipeline on each run.

---

## 4. Local Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

Open [http://localhost:3000](http://localhost:3000) to view the calendar, feed, and pipeline controls.
