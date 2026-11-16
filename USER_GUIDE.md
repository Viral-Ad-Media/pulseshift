# Using PulseShift

PulseShift helps a healthcare team plan assignments, manage availability and leave, respond to shift changes, and record working time. Availability means someone can work; an assignment says when and where they will work. Accepting an assignment confirms it. Clocking in and out records actual attendance.

## Start the local test website

The local test database is separate from the hosted Taiwo/Lamie account. Existing hosted credentials do not automatically exist locally. Your hosted data has not been changed.

1. In `pulseshift-server`, run `npm run dev:local`. Keep that terminal open. This starts the API at `http://localhost:4000` and applies migrations to the isolated local database.
2. In the frontend `pulseshift` folder, run `npm run dev`. Keep that terminal open.
3. Open **http://localhost:3000**. Port 3000 is deliberate; the backend approves that origin.
4. Select **Need a workspace? Create one**, enter your name, a workspace name, your email, and a password of at least 12 characters. The first member is the administrator.
5. To try both sides of an approval, invite a second local account and use a separate browser profile/private window for it.

The local database persists between restarts under the backend's ignored `.local-data` directory. The previous frontend API setting is saved in `.env.local.before-local-testing`. Do not delete the local database unless you intend to reset its test data.

## Read the dashboard

The dashboard opens to the current month in your workspace timezone. Use the arrows to change month, choose **My assignments** or **Whole team**, and click a day to inspect all its assignments. An overnight shift can appear on both dates, but its hours are counted only once.

- **Planned this month:** published assignment time, less scheduled breaks, within the viewed month.
- **Accepted this month:** planned hours for assignments you explicitly accepted in their current published version.
- **Estimated hours to date:** elapsed scheduled time, less scheduled breaks. This grows as time passes and refreshes while the dashboard is open. It is an estimate, not proof you attended work.
- **Recorded working hours:** clock-in/clock-out time less actual recorded breaks. Some records may still need manager approval.
- **Approved recorded hours:** actual time that a different manager has approved.

Managers also see pending team requests, published coverage gaps and open replacement searches. Recent updates and your credential expiry dates appear alongside the calendar. Missing records or configuration are marked unknown/unavailable rather than presented as a successful check.

## Request leave or record availability

1. Choose the appropriate day in the dashboard calendar (or open a date in **Availability**). The selected day is used by **Create request**.
2. Open **Approvals**, choose the **Request date**, then select **Create request**.
3. Choose **PTO** for vacation/time off, **SICK** for sick leave, or **Available** to say you could work that day.
4. Add a short note and submit. Private notes are visible only to you and administrators.
5. Review the result in **Approvals** (your requests) or **Inbox & history → Request history**. Pending requests can be edited. Cancellations remain in history.

Requests currently cover one date at a time. An approved availability request does not assign you to a shift. If a leave approval conflicts with a published assignment, the manager must resolve the assignment first.

## Approve or reject a request

Open **Approvals** in the sidebar. Administrators read the request and use **Approve** or **Reject**. The staff member gets an in-app update and can read the manager's reply. Approval checks the current request version; if someone has already changed it, refresh before deciding again.

## Invite staff

1. Click your name/initials at the top right. This opens the account side panel.
2. Choose **Team & invitations**.
3. Enter the person's email, choose the intended role, and create an invitation.
4. In the green success panel, click **Copy invitation link** and share it yourself. Invitation email delivery is not automatic in this release.
5. If you closed the panel before copying, reopen **Team & invitations**, find the pending invitation and click **Generate new link**. Confirm, then copy the new link. Any previous unused link for that person stops working.
6. The invited person opens the link and creates an account with that same email, or signs in to accept it. Invitations expire after seven days and reserve a seat.

Do not mark someone as an administrator unless they should control the whole workspace. Department-manager access is configured separately in **Settings** in the sidebar.

## Create and publish assignments

1. Open **Shift planner → Staff eligibility & limits**. Select a member, enter eligible scheduling roles such as `Nurse`, and configure any rest/weekly-hour limits that your organization requires. Zero means no limit has been configured.
2. Choose **Add shift**. Enter its title, department, location, required role, required staff count, start and end. Times are in the displayed workspace timezone.
3. Select staff and set their individual breaks if needed. Break start is the number of elapsed minutes after the assignment begins.
4. Save the draft. Staff still see the previous published schedule.
5. Review conflicts and staffing gaps. Adjust assignments or breaks. You can explicitly publish a staffing gap for follow-up, but blocking conflicts cannot be overridden.
6. Choose **Review & publish**, review the whole-workspace changes, and publish. Affected staff receive in-app notifications.

Use an end date on the next day for overnight work. Nonexistent or ambiguous clock-change times are rejected rather than guessed. Shifts are limited to 24 elapsed hours. To require three nurses and one supervisor, create requirements/shift records for those separate roles.

## Accept or decline a delegated assignment

1. Open **Dashboard** and find your next assignment or select its day.
2. Choose **Accept assignment** to confirm that published version.
3. Choose **Decline assignment** if you cannot take it, and confirm the choice. You are removed from that assignment, managers are notified, and a replacement vacancy opens.
4. If an assignment is meaningfully changed and republished, respond to the updated version again.

The older planner's acknowledgement means “seen”; the dashboard's explicit acceptance is what contributes to accepted hours. Neither counts as actual attendance.

## Fill an emergency vacancy

Managers use **Workforce centre → Open shifts**. Open a replacement search for an unfilled slot or remove an absent assignee. Choose **Contact next 3 eligible staff**. The system sends in-app offers in a small round, with an expiry time. Wait for the current round to expire or all its recipients to decline before contacting the next group.

Invited staff open **Open shifts** and choose **Accept open shift** or **Decline offer**. Eligibility is rechecked when accepting, and a filled opening cannot be claimed again. This does not make telephone calls or send SMS/email messages.

## Offer or trade a shift

Open **Workforce centre → Swaps**, select your assignment and a colleague. Optionally select one of that colleague's assignments to trade in the same department. Send the request. The colleague accepts or declines it. A different manager must then use **Check and approve swap**. The schedule changes only after fresh eligibility, leave, rest and overlap checks pass. If either assignment changed in the meantime, submit a fresh request.

## Use the schedule builder and templates

- **Templates & repeats** saves a seven-day draft pattern, optionally with staff/breaks, and creates repeated drafts for up to 12 weeks. Validate and publish them for their actual dates.
- **Workforce centre → Builder** suggests staff for unfilled draft slots and explains its decisions. By default it requires approved day availability. You can explicitly allow unknown availability. Applying suggestions saves a draft; it never publishes automatically.
- **What if** previews an absence/leave day or an extra shift. It shows conflicts, coverage effects and base-cost estimates without committing a change.

The builder follows defined rules and a deterministic workload-based heuristic. It does not claim a mathematically optimal schedule or guaranteed clinical coverage.

## Record working time and correct mistakes

1. Open **Workforce centre → My work**.
2. Choose **Clock in to shift** from one hour before its start until it ends. You must be assigned, and you cannot have another active clock-in.
3. Use **Start break** and **End break** when the actual break happens.
4. Choose **Clock out**. The record awaits review.
5. If there is a mistake, use **Request a time correction** with the corrected workspace-local times, total actual break minutes and a reason.
6. Another authorized manager reviews it in **Team time**. You cannot approve your own time.

A correction to approved time stays a proposal until reviewed; it does not silently rewrite the approved record. Timesheet versions prevent stale edits.

## Credentials and expiry

Open **Workforce centre → Credentials**, optionally upload a supporting PDF/PNG/JPEG, then enter the credential type and expiry. Another manager can review it.

- **Uploaded:** a record/document was submitted.
- **Reviewed:** a manager checked it.
- **Verified:** reserved for an independent verification integration; no such provider is connected locally.

Administrators configure required credential types by scheduling role in **Settings** from the sidebar. A required credential must be reviewed, unexpired and cover the assignment date before publication. Uploads are private to the owner and authorized reviewers. Manager review is not independent license verification.

## Pay estimates and reports

Administrators configure each staff member's hourly rate in **USD**, and an overtime threshold/multiplier appropriate to the organization. No country-wide statutory policy is assumed. Unconfigured rates or overtime policies remain unknown.

**Reports**, opened directly from the sidebar, separates planned, accepted and approved actual hours, staffing gaps, vacancies and fill time. Fairness reports show planned night minutes (22:00–06:00), weekend minutes and configured overtime; managers can record explanations for exceptions. These are workload indicators, not clinical fatigue scores or legal-compliance certification.

Approved time preserves the rate/policy used at approval. Payroll CSV exports contain reviewable gross estimates split by local date and overtime week. They do not calculate withholding/taxes or send money. Reports and exports must be reviewed before use in a payroll provider.

## Locations and department managers

Administrators add locations and department labels under **Settings** in the sidebar, record staff department membership, and grant department-manager access. Department managers use **Department** to change and publish draft assignments in their authorized departments, and can review the corresponding time records, swaps, reports and activity. Workspace-wide settings, billing and staff import remain administrator-only. Assignment overlap checks include shared staff across workspaces.

## Import a spreadsheet

Export Excel or Google Sheets as **CSV**, then open **Imports**.

- Staff header: `name,email`. Import creates ordinary staff invitations, not administrator accounts.
- Shift header: `title,department,location,role,requiredCount,localStart,localEnd,emails`.
- Date/time example: `2026-12-01T08:00`. Separate assigned staff emails with semicolons.

Preview the file, fix every reported row error, then confirm the current preview. Shift imports create private drafts. The import is limited to 200 rows and available workspace seats/capacity. Copy staff invitation links after a successful staff import; they are not emailed automatically.

## Offline schedules and external services

**Download offline schedule** saves a clearly dated, read-only copy in this browser and downloads a standalone HTML file you can open without an internet connection. Reconnect to make changes. Signing out clears the browser copy, but cannot delete a file you downloaded; keep it private. **Export my calendar** downloads an ICS file for calendar applications; it is not two-way live synchronization.

Automatic subscription checkout uses the prepared Stripe integration only after an administrator/operator configures its keys, plan price IDs, webhook and frontend URL. Password-reset emails use the prepared Resend integration only after configuring a verified sender and credentials. They are explicitly unavailable in isolated local mode by default. There is no live payment or independent credential-verification provider activated locally.

## Account and security

Click your profile to open the side panel for **Account & security**, **Team & invitations**, **Plan & workspace usage**, help and **Sign out**. These actions are not a dropdown menu.

You can change your password with your current password. To enable authenticator verification, choose **Two-step verification**, confirm your password, add the displayed setup URI/key to an authenticator app, save the backup codes and verify a generated code. Later sign-ins require an authenticator or one-use backup code. Do not share the setup URI or backup codes.

**Forgot your password?** is available on the sign-in screen, but actual reset emails require the configured email provider. A valid reset link is single-use, expires after one hour and revokes prior sessions when used.

## Common problems

- **My hosted account cannot sign in locally:** local test accounts are separate; create a local workspace or use a local invitation.
- **The planner says unavailable:** confirm the local API terminal is running and the frontend uses `http://localhost:4000`, then refresh.
- **Port 3000 is occupied:** use the already-running frontend or stop the other frontend process before starting another.
- **A save says the record changed:** refresh, review the current record and retry. Do not assume an uncertain save failed; operation IDs protect identical retries.
- **A colleague cannot see a shift:** check that it was published and assigned to the correct team member.
- **Leave approval is blocked:** unassign/reschedule the conflicting published assignment first.
- **Hours look different:** planned/accepted/estimated hours are not actual recorded hours. Breaks, month boundaries, overnight work and workspace timezone affect totals.

## The sidebar and homepage

The sidebar starts with **Dashboard**, then **Shift planner**, **Inbox & history**, **Approvals**, **Availability**, **Workforce centre**, and **Team & invitations**. Authorized managers also see **Reports** and **Audit history**. Administrators see **Imports**, **Integrations**, and **Settings** as their own pages. These management tools are no longer tabs inside Workforce centre. The profile panel still includes Team & invitations, Account & security, Plan, and Sign out.

**Create request** appears only on **Approvals**. Choose its Request date before opening the form. Selecting an availability entry takes you to Approvals; it does not create a request from the calendar. On a small screen, use **Open navigation** at the top left to reveal the sidebar.

The public homepage has Features, How it works, About, FAQs, and a working sign-in/create-workspace form. The animated calendar is an illustration with demonstration data. Use **Pause illustration** to stop it; it also respects your device’s reduced-motion setting.

## Confirm whether an accepted assignment was worked

Open **Workforce centre → Team time**. Choose the **Attendance month**, optionally select a team member, and use **Refresh attendance** to fetch the latest records. Each published assignment appears even if nobody has clocked in. You can filter for accepted assignments, missing attendance, records awaiting approval, or records with approved time.

- **Accepted** means the person accepted the current published assignment. It does not establish attendance.
- **Clock-in / Clock-out** show the recorded timestamps. **Not recorded** means no corresponding record exists. An unfinished record remains **Still clocked in**.
- **Recorded hours** are clock-out minus clock-in, less actual recorded breaks. They do not come from the estimated schedule.
- **Time approval** shows no time submitted, awaiting clock-out, awaiting approval, rejected, or approved. Approved records show the approved hours and reviewer when available.

For an ended shift with no clock-in, the page says **No attendance recorded** and asks you to confirm attendance. It does not automatically mark the person absent or invent working hours. Review through your workplace’s normal process. Another manager must approve your own time. A pending correction remains separate from the existing approved time until reviewed. Historical time records remain visible if an assignment is later removed from the published plan.

Team time also retains saved responses for staff removed from a shift that remains in the published plan. **Accepted earlier version** confirms the saved acceptance, while **Removed from current assignment** explains that the person is no longer assigned. An earlier acceptance does not count as acceptance of a later changed assignment. Use **Accepted (current or earlier)** to find both, and check the assignment version note. Earlier responses without a remaining published shift or a time record do not provide enough schedule details to display as an attendance row.

## Try the public product example

The public homepage includes an interactive example under **The product**. Select **Make the plan**, **Get a response**, or **Follow the hours**. Use **Publish example → Accept example assignment → View example attendance → Record example time → Approve example time** to follow a sample assignment through the whole workflow. **Reset example** clears the demonstration. All names, shifts, and hours in this example are illustrative and never change your workspace.

Use **Log in** in the header to jump to the sign-in form. **Plan your next week**, **Get started**, and **Create your workspace** open the create-workspace form. **Pause motion** stops the decorative photography movement; the homepage also respects the reduced-motion setting on your device.
