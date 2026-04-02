# Missing & Incomplete Functionality — Project X Web App

> Audit date: 2026-04-03  
> Scope: packages/web-app  
> Method: Full code review of every page, action, query, and component

This document lists every piece of functionality that is either **broken** (UI exists but nothing happens), **not wired up** (backend exists but UI doesn't call it), or **completely missing** (neither UI nor backend). Each item includes a Codex implementation prompt.

---

## Priority 1 — Broken UI (Backend Exists, Frontend Doesn't Call It)

These are visible to every user, create a bad impression, and the server-side code already exists.

---

### 1. Individual Invoice "Send Reminder" Button Does Nothing

**Where:** `app/(dashboard)/invoices/[id]/page-client.tsx` line 272  
**What:** The "Send Reminder" button renders with a `Send` icon but has no `onClick` handler and no action wired up.  
**Backend ready:** `bulkSendInvoiceRemindersAction` in `lib/actions/bulk.ts` already sends email reminders. It accepts an array of IDs — calling it with a single ID works immediately.

**Codex prompt:**
```
In packages/web-app, wire up the "Send Reminder" button on the invoice detail page.

File: app/(dashboard)/invoices/[id]/page-client.tsx

The button at line ~272 renders with a Send icon but has no onClick. 

1. Import `bulkSendInvoiceRemindersAction` from `@/lib/actions/bulk`.
2. Add a `handleSendReminder` async function that calls `bulkSendInvoiceRemindersAction({ ids: [invoice.id] })`.
3. Show a loading state using the existing `pendingAction` / `setPendingAction` pattern already in this component.
4. On success, show `toast.success("Reminder sent to customer")`. On failure, show `toast.error(result.error)`.
5. Only show the button for invoices where status is "issued", "overdue", or "partial" (not "paid", "draft", or "cancelled").
6. Disable the button while any other action is pending.
```

---

### 2. Collections Page "Send Reminder" Buttons Do Nothing

**Where:** `app/(dashboard)/collections/page-client.tsx` line 231  
**What:** Each row in the collections table has a "Send Reminder" button that renders but has no click handler.  
**Backend ready:** Same `bulkSendInvoiceRemindersAction` works per-invoice.

**Codex prompt:**
```
In packages/web-app, wire up the per-row "Send Reminder" button on the Collections page.

File: app/(dashboard)/collections/page-client.tsx

The button at line ~231 in each table row has no onClick.

1. Add a `sendingId` state (string | null) to track which invoice is currently sending.
2. Add a `handleSendReminder(invoiceId: string)` async function that:
   - Sets `sendingId` to the invoice ID.
   - Calls `bulkSendInvoiceRemindersAction({ ids: [invoiceId] })` (import from `@/lib/actions/bulk`).
   - Shows `toast.success("Reminder sent")` or `toast.error(result.error)`.
   - Resets `sendingId` to null.
3. Pass `onClick={() => handleSendReminder(invoice.id)}` and `disabled={sendingId === invoice.id}` to the button.
4. Show "Sending..." text when `sendingId === invoice.id`.
5. Add `import { toast } from "sonner"` at the top.
```

---

### 3. Service Plans "Add Plan" and "Edit" Buttons Are Unresponsive

**Where:** `app/(dashboard)/settings/page-client.tsx` — `PlansTab` component  
**What:** "Add Plan" button and "Edit" buttons on each plan card have no `onClick` handlers. Users cannot create or edit service plans from the UI.  
**Backend ready:** `createPlanAction`, `updatePlanAction`, `deletePlanAction` all exist in `lib/actions/plans.ts` with full validation.

**Codex prompt:**
```
In packages/web-app, implement the Service Plans tab in Settings so users can create and edit plans.

File: app/(dashboard)/settings/page-client.tsx — PlansTab component

The "Add Plan" button and "Edit" button on each plan card have no handlers.

1. Add state for a modal: `const [planModal, setPlanModal] = useState<{ open: boolean; plan: Plan | null }>({ open: false, plan: null })`.
2. Create a `PlanFormModal` component inside the file with fields:
   - Name (text, required)
   - Type (select: AMC | Warranty)
   - Description (textarea, optional)
   - Price (number, INR)
   - Duration in months (number)
   - Visits covered (number)
   - Active (toggle)
3. On submit, call `createPlanAction(formData)` for new plans or `updatePlanAction(formData)` for edits (import from `@/lib/actions/plans`).
4. On success, call `router.refresh()` to reload the plans list. Show `toast.success`.
5. Add a "Delete" button on each plan card that calls `deletePlanAction(plan.id)` with a confirmation modal.
6. Wire "Add Plan" button to open modal with `plan: null`.
7. Wire "Edit" button on each card to open modal with the plan data pre-filled.
8. Use the existing `Modal`, `FormField`, `SubmitButton` components from `@/components/ui/`.
```

---

### 4. Notification Preferences Are Not Persisted

**Where:** `app/(dashboard)/settings/page-client.tsx` — `NotificationsTab` component  
**What:** Toggle switches use local `useState` only. When the user leaves the page and returns, all toggles reset to hardcoded defaults. Nothing is saved to the database.  
**Backend needed:** Needs a new `notificationSettings` field on the `Organization` model and a `updateNotificationSettingsAction`.

**Codex prompt:**
```
In packages/web-app, implement persistence for Notification Settings in the Settings page.

Step 1 — Database:
In prisma/schema.prisma, add a `notificationSettings` Json field to the Organization model:
  notificationSettings Json? @default("{}")

Run `prisma generate` and `prisma db push`.

Step 2 — Server action:
Create `lib/actions/notifications-settings.ts`:
  - Export `updateNotificationSettingsAction(settings: object)` that:
    - Calls `requireRole([ADMIN, MANAGER])`.
    - Updates `organization.notificationSettings` via `db.organization.update`.
    - Revalidates `/settings`.
    - Returns actionSuccess/actionFailure.

Step 3 — Query:
In `lib/queries/settings.ts`, include `notificationSettings` in `getSettingsData()` return.

Step 4 — UI:
In `app/(dashboard)/settings/page-client.tsx`:
  - Pass `initialNotificationSettings` from `data.org.notificationSettings` as a prop to `NotificationsTab`.
  - Initialize state from these props instead of hardcoded values.
  - Add a "Save Preferences" button below the toggles.
  - On click, call `updateNotificationSettingsAction(settings)` and show toast.
```

---

### 5. Header Search Bar Is Non-Functional

**Where:** `components/layout/Header.tsx` line 38  
**What:** The search input has a placeholder "Search customers, invoices, tickets..." but no `onChange`, no state, and no action. Typing does nothing.

**Codex prompt:**
```
In packages/web-app, implement global search in the Header.

File: components/layout/Header.tsx

The search input at line ~38 has no handler. Implement a command-palette style global search:

1. Add state: `const [query, setQuery] = useState("")` and `const [results, setResults] = useState([])`.
2. Create a debounced search (200ms delay) that calls a new server action `globalSearchAction(query)`.
3. Create `lib/actions/search.ts` with `globalSearchAction(query: string)`:
   - Requires authentication.
   - Searches across 4 entities with `contains` (case-insensitive):
     - Customers: name, phone (return id, name, city)
     - Invoices: invoiceNumber (return id, invoiceNumber, customerName, status)
     - Tickets: ticketNumber, subject (return id, subject, priority)
     - Jobs: jobNumber, scheduledDate (return id, jobNumber, type)
   - Returns up to 3 results per entity type, max 12 total.
4. Show a floating dropdown below the search bar with results grouped by entity type (icons: Users, Receipt, AlertCircle, Wrench).
5. Each result is a clickable link navigating to /customers/[id], /invoices/[id], /complaints/[id], /jobs/[id].
6. Close the dropdown on blur or Escape key.
7. Show "No results" if query is 2+ characters and nothing is found.
8. Clear and close on navigation (usePathname effect).
```

---

### 6. Notification Bell Has No Panel

**Where:** `components/layout/Header.tsx` line 50  
**What:** The notification bell renders with an animated red dot indicator (implying unread notifications) but clicking it does nothing. There is no panel, no list, and no mark-as-read functionality. The `Notification` model exists in the database schema and `lib/notifications.ts` already creates notification records on every important event.

**Codex prompt:**
```
In packages/web-app, implement the notifications panel triggered by the bell icon in the Header.

File: components/layout/Header.tsx

The bell button at line ~50 has no onClick. The Notification model already exists in the DB and records are created on events.

1. Create `lib/actions/notifications.ts` with:
   - `getNotificationsAction()`: Returns latest 20 notifications for current user's org, ordered by createdAt desc. Include `id, title, body, type, isRead, createdAt, entityId`.
   - `markNotificationsReadAction(ids: string[])`: Sets `isRead: true` for given IDs.
   - `markAllNotificationsReadAction()`: Marks all unread notifications as read for the user's org.

2. Add state to Header: `const [notifOpen, setNotifOpen] = useState(false)`, `const [notifications, setNotifications] = useState([])`, `const [unreadCount, setUnreadCount] = useState(0)`.

3. On bell click:
   - Toggle `notifOpen`.
   - If opening, call `getNotificationsAction()` and set state.
   - Call `markAllNotificationsReadAction()` after fetching to reset the badge.

4. Show a dropdown panel (same style as the user menu) with:
   - Header: "Notifications" + "Mark all read" button.
   - List of notifications: icon (based on type), title, body (truncated to 1 line), relative time (e.g. "2 hours ago").
   - Each notification is clickable and navigates to the relevant entity (e.g. /invoices/[entityId]).
   - Empty state: "You're all caught up."

5. The red dot should reflect `unreadCount > 0`. Update it after marking as read.

6. Close panel on outside click (same pattern as user menu overlay).
```

---

## Priority 2 — Missing Features Required for Core Business Flow

These are workflows the platform promises but doesn't have. Without them, users fall back to WhatsApp/Excel for critical tasks.

---

### 7. Invoice Record Payment Modal Missing

**Where:** `app/(dashboard)/invoices/page-client.tsx` and `app/(dashboard)/invoices/[id]/page-client.tsx`  
**What:** There is no "Record Payment" button on the invoice detail page. Users cannot mark an invoice as paid or record a partial payment from the UI. The action `recordInvoicePaymentAction` exists in `lib/actions/invoices.ts` but nothing calls it.

**Codex prompt:**
```
In packages/web-app, add a "Record Payment" button and modal to the invoice detail page.

File: app/(dashboard)/invoices/[id]/page-client.tsx

The `recordInvoicePaymentAction` already exists in `lib/actions/invoices.ts`.

1. Add a "Record Payment" button in the page header actions, visible when invoice status is "issued", "overdue", or "partial" and balance > 0.
2. Add state: `const [isPaymentOpen, setIsPaymentOpen] = useState(false)`.
3. Create a payment modal using the existing `Modal` component with:
   - Field: Amount (number input, pre-filled with remaining balance, min 1, max balance)
   - Field: Payment Date (date input, pre-filled with today)
   - Field: Payment Method (select: Cash, Bank Transfer, UPI, Cheque, Online)
   - Field: Reference/Notes (text, optional)
4. On submit, call `recordInvoicePaymentAction({ invoiceId: invoice.id, amount, paymentDate, method, notes })`.
5. On success: show toast.success("Payment recorded"), close modal, call router.refresh().
6. If amount equals remaining balance, the status updates to "paid". If less, it becomes "partial". This logic is already in the action.
7. Also add this button to the invoice list page (actions column) opening the same modal inline.
```

---

### 8. Contract Detail Page Missing

**Where:** `app/(dashboard)/contracts/[id]/`  
**What:** The contracts list links to contract detail pages, but the detail page likely exists as a basic page. Verify it shows: contract info, linked invoices, renewal history, job history, and has actions for renew, cancel, add notes.

**Codex prompt:**
```
In packages/web-app, audit and complete the contract detail page.

File: app/(dashboard)/contracts/[id]/page-client.tsx

Check the current implementation and ensure it has:
1. Contract header: contract number, status badge, type (AMC/Warranty), billing cycle.
2. Key dates: start date, end date, next billing date, days until expiry (with colour coding: red if <30 days).
3. Visit tracking: progress bar showing visits used / visits covered (e.g. "3 of 4 visits used").
4. Financial summary: total contract value, amount billed to date, amount paid.
5. Action buttons:
   - "Renew Contract": calls `renewContractAction`, opens a modal to confirm new end date and generate renewal invoice.
   - "Cancel Contract": calls `updateContractAction` with status "cancelled", with confirmation.
6. Related tabs at the bottom:
   - Invoices tab: all invoices generated for this contract.
   - Jobs tab: all jobs associated with this contract/asset.
7. Link to the associated customer and asset pages.
8. Edit mode: all fields editable inline (customer, asset, plan, dates, billing cycle).

If any of these sections are missing, add them. Use existing patterns from the customer detail page.
```

---

### 9. Recurring Invoice Schedule Preview Missing on Contract

**Where:** Contract creation and detail pages  
**What:** When creating a contract with a billing cycle (monthly/quarterly/yearly), users have no way to see when invoices will be generated. There's no preview of the billing schedule, making it hard to set the right start date.

**Codex prompt:**
```
In packages/web-app, add a billing schedule preview to the contract creation and detail pages.

Files: 
- app/(dashboard)/contracts/new/page-client.tsx
- app/(dashboard)/contracts/[id]/page-client.tsx

1. Create a `BillingSchedulePreview` component in `components/ui/BillingSchedulePreview.tsx`.
2. It accepts: `startDate: string`, `endDate: string`, `billingCycle: "monthly" | "quarterly" | "half_yearly" | "yearly"`, `price: number`.
3. It computes the list of billing dates using the same logic as `lib/billing.ts` (replicate the date arithmetic for the preview).
4. Renders a compact table showing: Invoice #, Billing Date, Amount for each upcoming invoice within the contract period.
5. Show it below the billing cycle selector in the contract creation form as a collapsible "View billing schedule" section.
6. On the contract detail page, show it in a "Billing Schedule" tab alongside the invoices tab.
```

---

### 10. Technician Detail Page Is Incomplete

**Where:** `app/(dashboard)/technicians/[id]/page-client.tsx`  
**What:** Based on the technician list page design, the detail page should show performance stats, assigned jobs, availability, skills, and allow editing. Verify all these exist and the job assignment from the technician page works.

**Codex prompt:**
```
In packages/web-app, ensure the technician detail page is complete.

File: app/(dashboard)/technicians/[id]/page-client.tsx

Verify and add the following:
1. Profile section: name, phone, email, specialization, territory, status badge, avatar with initials.
2. Performance metrics: Active Jobs (count), Completed Today, Completed This Week, Completed This Month, Rating.
3. Availability toggle: button to change technician status between Available/Off Duty (calls updateTechnicianAction).
4. Edit mode: all profile fields editable inline (name, phone, email, specialization, territory, status).
5. Jobs tab: paginated list of this technician's jobs filtered by status with links to job detail pages.
6. Delete button with confirmation (calls deleteTechnicianAction, only visible to ADMIN role).
7. A "Assign Job" quick action button that links to /jobs/new?technicianId=[id].

If any of these are missing, implement them using the existing patterns from customer detail page.
```

---

### 11. Customer Import from CSV/Excel

**Where:** `app/(dashboard)/customers/` — list page  
**What:** Most users migrating from spreadsheets need to bulk import customers. There is no import functionality. Export exists but import does not.

**Codex prompt:**
```
In packages/web-app, add bulk customer import from CSV/Excel to the Customers list page.

Files to create/modify:
- app/(dashboard)/customers/page-client.tsx (add Import button)
- components/ui/ImportModal.tsx (new component)
- lib/actions/customers.ts (add bulkImportCustomersAction)

1. Create `ImportModal` component:
   - File upload input accepting .csv and .xlsx files.
   - Parse CSV using the native File API. For XLSX, use the existing `xlsx` package already in package.json.
   - Expected columns: Name (required), Phone (required), Email, Address, City, GST, Category (Commercial/Residential).
   - Show a preview table of the first 5 rows before import.
   - Show validation errors per row (missing name/phone).
   - "Import N Customers" confirm button.

2. Create `bulkImportCustomersAction(customers: Array<...>)` in lib/actions/customers.ts:
   - Validates each row with customerSchema (zod).
   - Uses `db.customer.createMany` with `skipDuplicates: true` (skip on phone match).
   - Returns { imported: number, skipped: number, errors: string[] }.

3. Add "Import" button next to "Add Customer" on the customers list page that opens ImportModal.

4. On success, show toast with counts and call router.refresh().

5. Provide a downloadable CSV template with the correct column headers.
```

---

### 12. Renewal Quote Generation from Contract

**Where:** Contract detail and contracts list  
**What:** A core business workflow is: contract expires → generate a renewal proposal/quote → send to customer. There is no way to generate a renewal quote/invoice from a contract. `renewContractAction` just extends dates without creating a renewal invoice.

**Codex prompt:**
```
In packages/web-app, implement a "Generate Renewal Quote" workflow for contracts.

This is a two-step flow: first generate a renewal invoice (as draft), then optionally send it.

1. Add a "Generate Renewal Quote" button on the contract detail page, visible when status is "expiring_soon" or "expired".

2. Clicking it opens a modal with:
   - New start date (pre-filled: day after current end date)
   - New end date (pre-filled: current start date + plan duration)
   - Price (pre-filled from plan price, editable)
   - Notes (optional, for custom terms)

3. On confirm, create a new invoice (status: DRAFT) linked to this contract:
   - Type: RECURRING
   - Line item: "[Plan Name] Renewal - [start date] to [end date]"
   - Amount: the price from modal
   - Due date: new start date

4. Add a new server action `generateRenewalQuoteAction` in lib/actions/contracts.ts that:
   - Creates the draft invoice.
   - Creates a notification for the admin.
   - Optionally calls `notifyInvoiceCreated` to email the customer.
   - Does NOT yet renew the contract (contract renews only after payment is recorded).

5. After generating, show a success toast with a link to the new draft invoice.
```

---

### 13. Dashboard Date Range Selector for Revenue Chart

**Where:** `app/(dashboard)/page-client.tsx`  
**What:** The revenue chart always shows the last 6 months with no way to change the date range. Users cannot view yearly trends or specific quarters.

**Codex prompt:**
```
In packages/web-app, add a date range selector to the dashboard revenue chart.

Files:
- app/(dashboard)/page-client.tsx
- lib/queries/dashboard.ts

1. Add a `period` prop to the dashboard: "3m" | "6m" | "12m" | "ytd", defaulting to "6m".
2. Add UI: a set of pill buttons (3M, 6M, 12M, YTD) above the revenue chart section.
3. When period changes, update the URL search param `?period=6m` and trigger a server-side data refresh (use `useListUrlState` or `router.push`).
4. In `lib/queries/dashboard.ts`, modify `getRevenueChartData` to accept `period` and compute the correct start date:
   - "3m": last 3 months
   - "6m": last 6 months  
   - "12m": last 12 months
   - "ytd": January 1st of current year to today
5. The chart should render the correct number of bars (3, 6, 12, or variable for YTD).
6. The chart tooltip should show month + year label.
```

---

### 14. Reports Page Date Range Filtering

**Where:** `app/(dashboard)/reports/page-client.tsx`  
**What:** All charts and metrics on the Reports page show all-time data with no date filter. Users cannot run a "last month" or "Q1 2025" report.

**Codex prompt:**
```
In packages/web-app, add date range filtering to the Reports page.

Files:
- app/(dashboard)/reports/page-client.tsx
- lib/queries/reports.ts

1. Add a date range picker at the top of the Reports page with:
   - Preset buttons: This Month, Last Month, This Quarter, Last Quarter, This Year, Custom.
   - For "Custom": two date inputs (from, to).
   - Default: "This Month".
2. Store the selected range in URL params `?from=2025-01-01&to=2025-01-31`.
3. Pass `from` and `to` to all query functions in `lib/queries/reports.ts`.
4. Modify each query to filter by `createdAt >= from AND createdAt <= to`.
5. Show the selected date range label in a subtitle below the "Reports" page heading.
6. All 4 tabs (Overview, Collections, Service, Contracts) should respect the date range.
```

---

### 15. Reports Export to PDF/Excel

**Where:** `app/(dashboard)/reports/page-client.tsx`  
**What:** The Reports page has rich data (revenue, collections aging, technician performance, contract pipeline) but no way to export it. Users cannot share reports externally.

**Codex prompt:**
```
In packages/web-app, add export functionality to the Reports page.

File: app/(dashboard)/reports/page-client.tsx

1. Add an "Export" dropdown button at the top-right of the Reports page (next to the date range selector) using the existing `ExportMenu` component pattern.
2. Options: "Export as Excel (.xlsx)", "Export as PDF".
3. For Excel export:
   - Use the existing `xlsx` package.
   - Create separate worksheets for each tab: Overview, Collections, Service, Contracts.
   - Include all table data (top customers, technician performance, renewal pipeline, etc.).
   - Filename: `report-YYYY-MM-DD.xlsx`.
4. For PDF export:
   - Create a new API route `GET /api/reports/pdf` that generates a PDF using `@react-pdf/renderer` (already installed).
   - Create a `lib/pdf-templates/report.tsx` template with all 4 sections.
   - The route accepts `from` and `to` query params.
5. Both exports should include the selected date range as a header in the document.
```

---

### 16. Job Calendar / Schedule View

**Where:** `app/(dashboard)/jobs/`  
**What:** Jobs have scheduled dates and technician assignments, but there is only a list view. Operations managers need to see a weekly/daily calendar of jobs to understand technician workload and avoid scheduling conflicts.

**Codex prompt:**
```
In packages/web-app, add a calendar view to the Jobs page.

File: app/(dashboard)/jobs/page-client.tsx

1. Add a view toggle at the top of the Jobs page: "List" and "Calendar" tabs (default: List).
2. Store view preference in URL param `?view=calendar`.
3. Create a `JobCalendar` component in `components/ui/JobCalendar.tsx`:
   - Shows a weekly calendar (Mon–Sun) with navigation arrows for prev/next week.
   - Each day column shows jobs scheduled for that day.
   - Each job shown as a colored card (color by status: pending=gray, assigned=blue, in_progress=amber, completed=green).
   - Card shows: technician initials, customer name, job type, time if available.
   - Clicking a job card navigates to /jobs/[id].
4. Add a "Technician" filter dropdown so manager can view one technician's schedule at a time.
5. Fetch jobs for the displayed week from the existing `listJobsAction` filtered by scheduled date range.
6. Build this without external calendar libraries — use CSS grid for the layout.
```

---

### 17. Asset Service History & Next Service Scheduling

**Where:** `app/(dashboard)/assets/[id]/`  
**What:** Assets track `lastServiceDate` and `nextServiceDate` but there's no workflow to: (a) log a service visit against an asset and update these dates, or (b) auto-schedule the next preventive maintenance based on contract intervals.

**Codex prompt:**
```
In packages/web-app, implement service history logging and next-service scheduling for assets.

Files:
- app/(dashboard)/assets/[id]/page-client.tsx
- lib/actions/assets.ts

1. Add a "Log Service" button on the asset detail page (visible to ADMIN, MANAGER, AGENT).
2. Opens a modal with:
   - Service Date (date, required, defaults to today)
   - Service Type (select: Preventive Maintenance, Repair, Inspection, Part Replacement)
   - Technician (select from active technicians)
   - Notes (textarea)
   - Next Service Date (date, optional - if set, updates asset.nextServiceDate)
3. Create `logAssetServiceAction` in lib/actions/assets.ts that:
   - Creates a Job record (type: SCHEDULED, status: COMPLETED) linked to the asset.
   - Updates `asset.lastServiceDate` to the service date.
   - Updates `asset.nextServiceDate` if provided.
   - Creates an audit log entry.
4. On the asset detail page, show the full service history in the existing "Service History" section, including the new logged services.
5. Show a warning banner on the asset detail page if `nextServiceDate` is within 7 days or already past.
```

---

### 18. Customer Communication Log

**Where:** Customer detail page  
**What:** No way to log calls, WhatsApp messages, or meetings with customers. When multiple team members interact with a customer, there's no shared record of what was discussed.

**Codex prompt:**
```
In packages/web-app, add a communication log to the customer detail page.

Files:
- app/(dashboard)/customers/[id]/page-client.tsx
- prisma/schema.prisma
- lib/actions/customers.ts

Step 1 — Database:
Add a new model to schema.prisma:
  model CustomerNote {
    id             String   @id @default(cuid())
    organizationId String
    customerId     String
    userId         String
    type           String   // "call", "meeting", "email", "whatsapp", "note"
    note           String
    createdAt      DateTime @default(now())
    organization   Organization @relation(fields: [organizationId], references: [id])
    customer       Customer @relation(fields: [customerId], references: [id])
    user           User @relation(fields: [userId], references: [id])
  }
  
Also add `notes CustomerNote[]` to Customer and User models.

Step 2 — Server actions:
In lib/actions/customers.ts, add:
  - `addCustomerNoteAction({ customerId, type, note })`: Creates a CustomerNote record.
  - `getCustomerNotesAction(customerId)`: Returns all notes for a customer, newest first.

Step 3 — UI:
In the customer detail page, add a "Communication" tab alongside Assets, Invoices, Complaints, Contracts.
  - Shows a timeline of all notes/calls/messages.
  - Each entry shows: type icon (phone, message, mail), note text, user name, relative timestamp.
  - At the top, a quick-add form: type selector (icon buttons) + text input + "Log" button.
  - Updates in real time using router.refresh() after adding.
```

---

## Priority 3 — Polish & Experience Gaps

---

### 19. Settings → Team: Can't Edit or Remove Members

**Where:** `app/(dashboard)/settings/page-client.tsx` — TeamTab  
**What:** Team members can be added and have their password reset, but there's no way to change their role, deactivate them, or remove them from the platform. An admin who needs to offboard a team member has no path.

**Codex prompt:**
```
In packages/web-app, add Edit and Deactivate/Remove actions for team members in Settings → Team.

File: app/(dashboard)/settings/page-client.tsx — TeamTab component

1. Add a kebab menu (⋮) or action buttons on each team member row: "Edit Role", "Deactivate", "Remove".
2. "Edit Role" opens a small modal to change the member's role (ADMIN/MANAGER/AGENT/TECHNICIAN) and status (ACTIVE/INACTIVE).
3. Create `updateTeamMemberAction({ id, role?, status? })` in lib/actions/settings.ts.
4. "Deactivate" calls `updateTeamMemberAction({ id, status: "inactive" })` with a confirmation dialog. Active sessions remain valid — this just prevents future logins.
5. "Remove" (ADMIN only) permanently deletes the user with a strong confirmation ("Type the member's name to confirm"). Call a new `removeTeamMemberAction(id)` that:
   - Checks no active jobs are assigned to this user.
   - Soft-deletes or hard-deletes based on business rules.
6. The current user should not be able to edit or remove themselves.
```

---

### 20. Invoice "Issued" Status Not Set on Creation

**Where:** `lib/actions/invoices.ts` — `createInvoiceAction`  
**What:** When an invoice is created, it may be set to "draft" status requiring a manual status change to "issued" before sending. For most workflows, newly created invoices should be "issued" immediately. Users are confused by draft invoices not appearing in collections.

**Codex prompt:**
```
In packages/web-app, review the invoice creation flow and ensure new invoices default to ISSUED status.

File: lib/actions/invoices.ts — createInvoiceAction

1. Check what status is set when creating a new invoice manually vs. via the recurring billing cron.
2. For manually created invoices: change the default status from DRAFT to ISSUED.
3. Add a "Save as Draft" option on the create invoice form so users can optionally save drafts.
4. Add a "Issue Invoice" button on the invoice detail page (visible when status is DRAFT) that changes status to ISSUED and optionally triggers the notifyInvoiceCreated email.
5. Update invoice list page so the default filter doesn't hide DRAFT invoices (currently might be filtered).
```

---

### 21. Complaint → Job Auto-Creation Flow

**Where:** `app/(dashboard)/complaints/[id]/`  
**What:** When a complaint is created or assigned, there is no automatic or one-click creation of a related field job. The connection between complaints and jobs exists in the data model but the UI has no "Create Job for this Complaint" button on the complaint detail page.

**Codex prompt:**
```
In packages/web-app, add a "Create Job" quick action on the Complaint detail page.

File: app/(dashboard)/complaints/[id]/page-client.tsx

1. Add a "Create Job" button in the complaint actions bar, visible when complaint status is OPEN, ASSIGNED, or IN_PROGRESS and no job is currently linked.
2. Opens a modal pre-filled with:
   - Customer: from complaint.customerId (read-only)
   - Asset: from complaint.assetId if available
   - Type: "complaint" (read-only)
   - Notes: pre-filled with complaint subject
   - Technician: dropdown (pre-filled with complaint.assignedToId if set)
   - Scheduled Date: date picker (default today)
3. On confirm, call `createJobAction` with these values and set `ticketId: complaint.id` on the job.
4. Update the complaint status to IN_PROGRESS automatically.
5. After creation, show the linked job in a "Linked Jobs" section on the complaint detail page.
6. If a job already exists for this complaint, show its status instead of the "Create Job" button.
```

---

### 22. Dashboard "Action Required" Quick Wins Panel

**Where:** `app/(dashboard)/page.tsx`  
**What:** The dashboard shows metrics but lacks a prioritised "action required" list — the most important thing a business owner needs when they open their app. What needs their attention RIGHT NOW?

**Codex prompt:**
```
In packages/web-app, add an "Action Required" panel to the dashboard.

File: app/(dashboard)/page-client.tsx and lib/queries/dashboard.ts

1. Add a new section on the dashboard (below metrics, before charts) titled "Action Required".
2. It shows up to 5 prioritised items, each with an action button:
   - 🔴 Invoices overdue > 30 days: "[N] invoices overdue" → button "View Collections"
   - 🔴 Complaints critical priority unassigned: "[N] critical complaints unassigned" → button "Assign Now" → links to /complaints filtered
   - 🟡 Contracts expiring in ≤ 7 days: "[N] contracts expiring this week" → button "View Contracts"
   - 🟡 Jobs with no technician assigned: "[N] jobs unassigned" → button "Assign Jobs"
   - 🟡 Invoices in draft status: "[N] draft invoices not yet issued" → button "Review"
3. If all items are zero, show a green "Everything is on track" state.
4. Fetch this data in `getDashboardData()` — it's mostly already computed, just surface it as actionable items.
5. Each item links directly to the relevant filtered list view.
```

---

## Summary Table

| # | Feature | Severity | Backend Ready? | Effort |
|---|---------|----------|----------------|--------|
| 1 | Invoice "Send Reminder" button wired | Critical | ✅ Yes | 30 min |
| 2 | Collections "Send Reminder" wired | Critical | ✅ Yes | 30 min |
| 3 | Service Plans Add/Edit UI | High | ✅ Yes | 2 hr |
| 4 | Notification preferences persisted | High | ❌ Need DB field | 3 hr |
| 5 | Header global search | High | ❌ Need action | 4 hr |
| 6 | Notification bell panel | High | ✅ DB model exists | 3 hr |
| 7 | Invoice Record Payment modal | Critical | ✅ Action exists | 2 hr |
| 8 | Contract detail page completeness | High | ✅ Queries exist | 3 hr |
| 9 | Billing schedule preview | Medium | — | 2 hr |
| 10 | Technician detail page completeness | Medium | ✅ Queries exist | 2 hr |
| 11 | Customer import from CSV/Excel | High | ❌ Need action | 4 hr |
| 12 | Renewal quote generation | High | ❌ Need action | 3 hr |
| 13 | Dashboard date range selector | Medium | Partial | 2 hr |
| 14 | Reports date range filtering | Medium | ❌ Need params | 3 hr |
| 15 | Reports export to PDF/Excel | Medium | Partial (PDF infra) | 4 hr |
| 16 | Job calendar/schedule view | Medium | ✅ Data available | 4 hr |
| 17 | Asset service history & scheduling | Medium | Partial | 3 hr |
| 18 | Customer communication log | Medium | ❌ Need DB model | 4 hr |
| 19 | Team member edit/remove | High | Partial | 2 hr |
| 20 | Invoice ISSUED default + draft flow | Medium | Partial | 1 hr |
| 21 | Complaint → Job auto-creation | High | ✅ Actions exist | 2 hr |
| 22 | Dashboard "Action Required" panel | High | Mostly ready | 2 hr |

**Start with items 1, 2, 7** — they are fully backed by existing server actions and just need the UI wired up. Each takes under 1 hour and immediately makes the platform more usable for the core payment collection workflow.
