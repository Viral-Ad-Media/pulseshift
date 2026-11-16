# PulseShift

React/TypeScript healthcare workspace for timed staff assignments, availability and leave requests, draft/published schedules, staffing targets, in-app notifications and team management. The companion API is `Viral-Ad-Media/pulseshift-server`.

## Run locally

Use Node 22.22.2 from `.nvmrc` or supported Node 24.15+. Run `npm ci`, copy `.env.example` to `.env.local` and point `VITE_API_URL` at the API. `npm run dev` starts Vite on port 3000. Start the sibling API with `npm run dev:server` after following its setup and migration instructions.

`npm run build` type-checks before producing the `dist` static bundle. Deploy with `VITE_API_URL` set at build time to the HTTPS API URL and serve `dist`. A missing production API URL displays a configuration error; it never silently directs users to localhost. Tailwind 4 utilities are compiled by the local Vite plugin. No remote runtime styling/compiler script is loaded.

Font Awesome CSS and the Manrope font are optional external presentation assets; normal text and native controls remain functional if they are blocked. API secrets and service-role credentials must never be provided as VITE variables.

## Coordinated API upgrade

Deploy with the companion Neon/Better Auth API changes after running `npm run db:migrate` against its dedicated Neon database. Apply the new `20261111_scheduling.sql` migration before starting this release. Old APIs do not supply the scheduling, inbox or history endpoints; the frontend is not compatible with an unmigrated API. Old JWT sessions require sign-in again after the Better Auth migration. Existing account IDs, memberships and passwords are supported by the legacy import tooling.

There are no prefilled demo credentials. Create a workspace using a password of at least twelve characters. An invitation link preloads its token at signup; existing account holders can select sign-in to accept that invitation.

## Teams and privacy

The Team button lets admins create and revoke email-bound invitations, change roles and remove members. Copy the generated link and share it manually with the invited person. Invitations expire after seven days, are single-use and reserve a seat. Existing signed-in users can also paste an invitation token to join another workspace. The API protects the last administrator and enforces seats.

Coworkers' approved date-only availability is visible in dispatch; private notes and replies are supplied only to the owner and administrators. Clicking a coworker's request opens that request's details. It never opens the viewer's own request on that date.

## Scheduling and plans

The Shift planner displays timed assignments in day, Monday–Sunday week and month views. Managers create private drafts, set department/location and a required role/count per shift, assign staff and stagger breaks. Use separate shifts for different required roles (for example three nurses and one supervisor). Published shifts remain visible while managers edit the next draft. Publishing applies all draft changes across the workspace together.

Before publishing, the API checks current membership, manager-maintained role eligibility, overlapping assignments across workspaces, approved leave, and configured rest/weekly-hour limits. Zero means no configured rest/hour limit. These settings are not a legal compliance or independently verified licensing guarantee. Weekly hours use elapsed work time less scheduled breaks, split at Monday midnight in the relevant workspace timezone. Missing and ambiguous local clock times are rejected instead of guessed. Shifts may cross midnight and last at most 24 elapsed hours.

Coverage includes break intervals. A manager can explicitly publish coverage gaps for follow-up, but cannot override other conflicts. Coverage is a per-shift staffing target, not patient-demand forecasting. Templates capture seven days of draft shifts, optionally including assignments and breaks, and repeat them for up to twelve weeks with fresh IDs and date-specific validation. Each workspace supports 1,000 retained shifts and 50 templates; the planner is intended for small-team pilots rather than hospital-wide scheduling scale.

Approved WORK requests indicate date-only availability and never create assignments. Existing records remain unchanged. Scheduled Today counts distinct staff with published assignments that overlap today. Today and schedule times use the workspace timezone. Request forms retain drafts on failure; versions prevent stale decisions. Timed schedule mutations also use workspace revisions and stable operation IDs to avoid duplicate saves after uncertain network responses.

Inbox & history contains personal assignment updates, request updates and cancellation history. Reading a notification does not acknowledge an assignment. Changed published assignments require a fresh acknowledgement if enabled. Inbox badges refresh every 30 seconds while the page is visible. Upcoming-shift reminders are persisted on inbox polling within 24 hours of a shift; they are not background push/email/SMS delivery. The inbox shows the latest 100 items; history shows the latest 200 requests, restricted to the owner or administrators. Refresh the planner to load other managers’ schedule changes; the API always rechecks before publishing.

New Team trials run for fourteen days and then use Essentials entitlements. Request limits are active retained-record capacity (40/120/500), not monthly throughput. AI allowances are lifetime workspace credits (0/80/200), not a renewable subscription allocation. Each provider attempt consumes one reserved credit, including failed attempts; no provider configuration means no charge. AI insights are advisory and do not guarantee staffing availability.

The plan modal compares tiers and opens a sales email. Automatic payment collection, billing changes, password recovery and notification email delivery are not integrated. Approval replies are visible in the app.

## Checks

- `npm test`: component and state regression tests with Vitest/Testing Library.
- `npm run build`: TypeScript check and production asset compilation.
- `npm audit --audit-level=low`: dependency advisory scan.

CI performs these checks for every pull request. Backend tests separately cover actual HTTP authorization/privacy, onboarding and PostgreSQL transaction functions.

## Better Auth accounts

The API now owns authentication through Better Auth, stored in Neon PostgreSQL. The SPA uses opaque Better Auth bearer sessions so sign-in remains reliable across separate Render domains. The native Better Auth endpoints are under `/api/auth/*`. No Supabase client, URL or API key is needed in the browser or API.

If account creation succeeds but workspace setup needs a retry (for example an expired invitation), reload or sign in again to resume setup. The account is retained. The Account button changes the password using the current password and revokes other sessions. Password recovery emails and OAuth providers are not configured yet.


## Local sign-in troubleshooting

The dev server uses port 3000 with strictPort enabled so it does not silently switch to an origin the API has not approved. If port 3000 is occupied, stop the other dev server and retry. Open http://localhost:3000 when using an API configured for that origin; 127.0.0.1 and a LAN IP are different origins.

A configured remote API may be older than this frontend. Missing scheduling/inbox routes no longer block a valid login or core workspace access: the app explains which feature is unavailable and offers the existing availability/leave screens. Failed optional requests never turn into an empty schedule or a zero staffing count. Authentication/authorization failures still fail normally. Apply the scheduling migration and deploy the matching backend to use the planner, notifications and history. The local backend requires its own private .env configuration if you point VITE_API_URL at localhost:4000.


## Workforce upgrade and local testing

Start the isolated test API with `npm run dev:local` from the sibling server, then `npm run dev` here. The frontend local environment points at `http://localhost:4000`; its earlier API configuration is saved in an ignored backup. Create a local account: hosted accounts are not copied into this isolated database.

The monthly Dashboard separates planned, explicitly accepted, elapsed scheduled estimates and recorded attendance. The profile opens a side panel. Workforce centre includes replacements, safe swaps, time records/corrections, credentials, manager reports, department access, explainable draft building, what-if previews, CSV imports, calendar export and configuration-aware subscription controls. Explicit acceptance is separate from the original seen/acknowledgement record.

See [USER_GUIDE.md](./USER_GUIDE.md) for the complete staff and manager walkthrough. Offline downloads include a standalone read-only HTML file and an optional browser snapshot. The browser snapshot is cleared on sign-out; downloaded files remain the user's responsibility. No API responses or tokens are stored by the static service worker.

Billing keys, reset-email delivery and independent credential verification are not activated in local testing. Avoid treating unconfigured pay policies as zero overtime. Dollar amounts are reviewable USD gross estimates, not payroll disbursements or statutory-compliance advice.
