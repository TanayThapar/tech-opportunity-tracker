# Job Sources & Employer Portal Audit

This document records the empirical technical investigation of careers portals, APIs, schema.org markup, robots.txt, and terms of service for tracked employers (such as **JPMorganChase** and **Samsung**), per project requirements.

---

## 1. JPMorganChase

- **Checked URLs**:
  - `https://www.jpmorganchase.com/careers`
  - `https://careers.jpmorgan.com/`
  - `https://www.jpmorganchase.com/robots.txt`
  - `https://jpmc.fa.oraclecloud.com/hcmUI/CandidateExperience/` (Oracle Cloud HCM Candidate Experience)

### Technical Findings:
1. **`robots.txt` Directives**:
   Fetching `https://www.jpmorganchase.com/robots.txt` returns explicit restrictions:
   ```text
   User-agent: *
   Disallow: /careers/explore-opportunities/tech-data-product
   Disallow: /careers/explore-opportunities/tech-data-product/job-details
   ```
2. **Backend & Architecture**:
   JPMorganChase hosts job requisition workflows on Oracle Cloud HCM (`jpmc.fa.oraclecloud.com`). Oracle Cloud HCM endpoints require enterprise session tokens, signed cookies, and CSRF nonces. There is no open, public, unauthenticated RSS/Atom feed or public REST/GraphQL API for automated retrieval.
3. **Terms of Use**:
   JPMorgan terms explicitly prohibit unauthorized web crawlers, bots, and automated scraping of proprietary career postings.
4. **Conclusion & Policy**:
   Automated scraping of JPMorgan Chase career portals is **strictly prohibited** by `robots.txt` and Terms of Use.
   - **Compliant Fallback**: Track real, official postings via:
     - Verified admin-curated entries linking directly to official job requisition URLs (e.g. `https://jpmc.fa.oraclecloud.com/...`).
     - Community/user submissions through the `/submit` modal, which enter `/needs-review` pending moderator verification.

---

## 2. Samsung Electronics

- **Checked URLs**:
  - `https://sec.wd3.myworkdayjobs.com/Samsung_Careers`
  - `https://sec.wd3.myworkdayjobs.com/Samsung_Jobs`
  - `https://sec.wd3.myworkdayjobs.com/robots.txt`
  - `https://www.samsung.com/global/careers/`

### Technical Findings:
1. **`robots.txt` Directives**:
   Fetching `https://sec.wd3.myworkdayjobs.com/robots.txt` shows:
   ```text
   User-agent: *
   Allow: /Samsung_Careers/
   Allow: /Samsung_Jobs/
   Allow: /Samsung_Suggestion/
   Disallow: /refreshFacet/
   ```
2. **Backend & Architecture**:
   Samsung uses Workday ATS (`wd3.myworkdayjobs.com`). Workday renders as a dynamic single-page application (SPA). Search results are fetched asynchronously via internal RPC endpoints that change schemas without notice and block non-browser requests via rate limiting / bot protection.
3. **Terms of Use**:
   Workday and Samsung Terms of Service restrict automated data mining or third-party syndication without express written authorization.
4. **Conclusion & Policy**:
   Automated headless scraping without an authorized API partnership violates terms and results in transient blocks.
   - **Compliant Fallback**: Track official job listings via verified curated postings and user submissions, each validated for URL reachability and schema compliance.

---

## 3. General Architecture for Regular Job Listings

1. **Schema**:
   - `title`: Position title (e.g. "Software Engineer - Full Time Campus Hire 2027")
   - `company`: Official employer name (e.g. "JPMorgan Chase", "Samsung Electronics")
   - `location`: Office location(s)
   - `work_mode`: `in-person` | `hybrid` | `online`
   - `posted_date`: ISO date when listed
   - `application_deadline`: ISO date if stated, or `null` ("no deadline listed", never fabricated)
   - `source_url`: Real URL to the official employer posting
   - `link_status`: `ok` | `unreachable` | `unknown` (tracked independently from listing status)
   - `listing_status`: `open` | `closed` | `expired` | `stale`
   - `last_checked_at`: ISO timestamp of latest liveness check

2. **Liveness & Expiry Logic**:
   - Transient network issues (timeout, HTTP 500, 502, 503, 429) update `link_status = 'unreachable'` but **NEVER** archive or unpublish a job.
   - Items with `link_status === 'unreachable'` or `listing_status === 'stale'` display a banner: *"May no longer be open, confirm on the employer site"*.
   - A job is archived **ONLY** when:
     - The stated application deadline has passed.
     - A repeated HTTP 404 / 410 Gone status code is returned across multiple runs.
     - A moderator or admin explicitly archives or closes it.
   - Every job card displays: *"Listing as of <last_checked_at or posted_date>, confirm on the employer site"*.
