# PulseShift

React/TypeScript workspace for healthcare date-only work, PTO and sick requests, private leave notes, administrator decisions and staff invitations. The companion API is `Viral-Ad-Media/pulseshift-server`.

## Run locally

Use Node 22.22.2 from `.nvmrc` or supported Node 24.15+. Run `npm ci`, copy `.env.example` to `.env.local` and point `VITE_API_URL` at the API. `npm run dev` starts Vite on port 3000. Start the sibling API with `npm run dev:server` after following its setup and migration instructions.

`npm run build` type-checks before producing the `dist` static bundle. Deploy with `VITE_API_URL` set at build time to the HTTPS API URL and serve `dist`. A missing production API URL displays a configuration error; it never silently directs users to localhost. Tailwind 4 utilities are compiled by the local Vite plugin. No remote runtime styling/compiler script is loaded.

Font Awesome CSS and the Manrope font are optional external presentation assets; normal text and native controls remain functional if they are blocked. API secrets and service-role credentials must never be provided as VITE variables.

## Coordinated API upgrade

Deploy with the companion API audit-fix pull request after applying its `supabase/migrations/20261005_audit.sql`. Old APIs do not supply versions or the invitation endpoints; the frontend is not compatible with an unmigrated API. Old sessions require sign-in again after the JWT changes.

There are no prefilled demo credentials. Create a workspace using a password of at least twelve characters. An invitation link preloads its token at signup; existing account holders can select sign-in to accept that invitation.

## Teams and privacy

The Team button lets admins create and revoke email-bound invitations, change roles and remove members. Copy the generated link and share it manually with the invited person. Invitations expire after seven days, are single-use and reserve a seat. Existing signed-in users can also paste an invitation token to join another workspace. The API protects the last administrator and enforces seats.

Coworkers' approved date-only availability is visible in dispatch; private notes and replies are supplied only to the owner and administrators. Clicking a coworker's request opens that request's details. It never opens the viewer's own request on that date.

## Scheduling and plans

Dispatch displays date-only coverage. No shift start/end times exist in the current model, so no timed shift blocks are invented. Scheduled Today counts approved WORK requests only. Today uses the active workspace timezone. Request forms preserve drafts on save failure and prevent duplicate submits. Requests and decisions send an expected version; a conflict requires refreshing before retrying.

New Team trials run for fourteen days and then use Essentials entitlements. Request limits are active retained-record capacity (40/120/500), not monthly throughput. AI allowances are lifetime workspace credits (0/80/200), not a renewable subscription allocation. Each provider attempt consumes one reserved credit, including failed attempts; no provider configuration means no charge. AI insights are advisory and do not guarantee staffing availability.

The plan modal compares tiers and opens a sales email. Automatic payment collection, billing changes, password recovery and notification email delivery are not integrated. Approval replies are visible in the app.

## Checks

- `npm test`: component and state regression tests with Vitest/Testing Library.
- `npm run build`: TypeScript check and production asset compilation.
- `npm audit --audit-level=low`: dependency advisory scan.

CI performs these checks for every pull request. Backend tests separately cover actual HTTP authorization/privacy, onboarding and PostgreSQL transaction functions.
