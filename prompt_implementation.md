# Project X: Web App - Backend & Infrastructure Implementation Guide

## Current State

The web app (`packages/web-app`) is a **fully built Next.js 14 frontend** with 25 routes, 10 modules, and complete UI. All data currently comes from `lib/mock-data.ts` (in-memory arrays). There is **zero backend, zero database, zero auth, zero infrastructure**.

**What exists:**
- 10 modules: Dashboard, Customers, Assets, Contracts, Jobs, Invoices, Complaints, Collections, Technicians, Reports, Settings
- 8 entity types with TypeScript interfaces (Customer, Asset, Invoice, Ticket, Job, Technician, Contract, Plan)
- Reusable UI components (DataTable, FilterBar, PageHeader, MetricCard, StatusBadge, Tabs, Modal, EmptyState)
- Client-side filtering, search, and navigation
- INR currency formatting, Indian date formats
- Responsive sidebar layout with mobile support

---

## What Needs to Be Built (Ordered by Priority)

### Phase 1: Database & ORM

**Goal:** Replace mock-data.ts with a real database.

**Schema needed (derived from existing TypeScript interfaces):**

```
Tables:
- organizations (multi-tenant support)
- users (auth + roles: admin, manager, agent, technician)
- customers (name, phone, email, address, city, gst, status, category)
- assets (linked to customer; name, model, serial_number, category, installation_date, warranty_end, status)
- contracts (linked to customer + asset + plan; type: amc/warranty, start_date, end_date, status, value, visits_covered, visits_used)
- plans (name, type, duration_months, price, visits_covered, description, is_active)
- invoices (linked to customer; invoice_number, amount, paid_amount, due_date, issued_date, status, type)
- invoice_items (linked to invoice; description, qty, rate, amount)
- tickets (linked to customer + asset; ticket_number, subject, description, category, priority, status, assigned_to, sla_deadline, resolved_at)
- ticket_timeline (linked to ticket; action, by, note, created_at)
- jobs (linked to ticket + customer + asset + technician; job_number, type, status, scheduled_date, completed_at, notes, service_report)
- technicians (linked to user; territory, specialization, skills[], status)
- team_members (linked to organization; role, status)
- notifications (linked to user; type, title, message, read, created_at)
- audit_log (who did what, when)
```

**Tech choices to make:**
- ORM: Prisma vs Drizzle
- Database: PostgreSQL (recommended) vs MySQL
- Hosting: Supabase, Neon, PlanetScale, or self-hosted

---

### Phase 2: Authentication & Authorization

**Goal:** Secure the app with login, roles, and protected routes.

**Requirements:**
- Login/signup (email + password, Google OAuth optional)
- Role-based access: Admin, Manager, Agent, Technician
- Protected routes via Next.js middleware
- Session management (JWT or database sessions)
- Organization/tenant scoping (all queries filtered by org_id)

**Tech choices:**
- NextAuth.js (Auth.js) v5 - most flexible, self-hosted
- Clerk - fastest to implement, managed service
- Supabase Auth - if using Supabase for DB

---

### Phase 3: API Layer

**Goal:** Server-side data fetching, mutations, and validation.

**Approach options:**
1. **Next.js Server Actions** (recommended for this app) - colocated with components, type-safe
2. **Next.js API Routes** (`app/api/`) - REST endpoints for mobile app compatibility
3. **tRPC** - end-to-end type safety if staying TypeScript only

**APIs needed per module:**

```
Customers:
  - GET    /api/customers          (list with search, filter, pagination)
  - GET    /api/customers/:id      (detail with assets, contracts, invoices)
  - POST   /api/customers          (create)
  - PATCH  /api/customers/:id      (update)
  - DELETE /api/customers/:id      (soft delete)

Assets:
  - GET    /api/assets             (list with search, filter, pagination)
  - GET    /api/assets/:id         (detail with service history)
  - POST   /api/assets             (create, linked to customer)
  - PATCH  /api/assets/:id         (update)
  - DELETE /api/assets/:id         (soft delete)

Contracts:
  - GET    /api/contracts          (list with expiry filters)
  - GET    /api/contracts/:id      (detail with visit history)
  - POST   /api/contracts          (create, linked to customer + asset + plan)
  - PATCH  /api/contracts/:id      (update, renew)
  - POST   /api/contracts/:id/renew (renewal flow)

Jobs:
  - GET    /api/jobs               (list with status, type, date filters)
  - GET    /api/jobs/:id           (detail with timeline)
  - POST   /api/jobs               (create/schedule)
  - PATCH  /api/jobs/:id           (update status, assign technician)
  - PATCH  /api/jobs/:id/complete  (mark complete with service report)

Invoices:
  - GET    /api/invoices           (list with status filters)
  - GET    /api/invoices/:id       (detail with line items)
  - POST   /api/invoices           (create with items)
  - PATCH  /api/invoices/:id       (update)
  - POST   /api/invoices/:id/payment (record payment)
  - GET    /api/invoices/:id/pdf   (generate PDF)

Tickets (Complaints):
  - GET    /api/tickets            (list with priority, status filters)
  - GET    /api/tickets/:id        (detail with timeline)
  - POST   /api/tickets            (create)
  - PATCH  /api/tickets/:id        (update status, assign)
  - POST   /api/tickets/:id/timeline (add timeline entry)

Technicians:
  - GET    /api/technicians        (list with availability)
  - GET    /api/technicians/:id    (detail with job history, stats)
  - PATCH  /api/technicians/:id    (update status, territory)

Plans:
  - GET    /api/plans              (list active plans)
  - POST   /api/plans              (create)
  - PATCH  /api/plans/:id          (update)
  - DELETE /api/plans/:id          (deactivate)

Dashboard:
  - GET    /api/dashboard/metrics  (aggregated KPIs)
  - GET    /api/dashboard/charts   (chart data: revenue trend, job breakdown)

Reports:
  - GET    /api/reports/overview   (revenue, collection rate, contracts)
  - GET    /api/reports/collections (aging analysis, trends)
  - GET    /api/reports/service    (job stats, technician performance)
  - GET    /api/reports/contracts  (renewal pipeline, utilization)

Settings:
  - GET    /api/settings/business  (business profile)
  - PATCH  /api/settings/business  (update profile)
  - GET    /api/settings/team      (team members)
  - POST   /api/settings/team      (invite member)
  - PATCH  /api/settings/team/:id  (update role/status)
```

---

### Phase 4: Form Validation & Error Handling

**Goal:** Validate all form inputs server-side and show proper errors.

**Requirements:**
- Schema validation with Zod (pairs with both Prisma and Server Actions)
- Client-side validation for immediate feedback
- Server-side validation as source of truth
- Toast notifications for success/error states (add react-hot-toast or sonner)
- Loading states on all form submissions
- Optimistic updates where appropriate

**Validation schemas needed:**
- `createCustomerSchema` (name required, email format, phone format, GST format)
- `createAssetSchema` (customer required, name required, category required)
- `createContractSchema` (customer + asset + plan required, start date required)
- `createJobSchema` (customer + technician + date required)
- `createInvoiceSchema` (customer required, at least 1 line item, amounts > 0)
- `createTicketSchema` (customer required, subject required, priority required)
- `createPlanSchema` (name, type, duration, price, visits required)
- `updateBusinessProfileSchema`
- `inviteTeamMemberSchema`

---

### Phase 5: Infrastructure & Deployment

**Goal:** Deploy the app to production.

**Required files:**
```
/.env.example              (template for env vars)
/.env.local                (local dev - gitignored)
/docker-compose.yml        (local PostgreSQL + Redis)
/Dockerfile                (production container)
/.github/workflows/ci.yml  (lint, type-check, test, build)
/.github/workflows/cd.yml  (deploy on merge to main)
/packages/web-app/middleware.ts  (auth protection, redirects)
```

**Environment variables needed:**
```
# Database
DATABASE_URL=postgresql://...

# Auth
NEXTAUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3001
GOOGLE_CLIENT_ID=...      (optional)
GOOGLE_CLIENT_SECRET=...  (optional)

# Email (for notifications, invoice sending)
SMTP_HOST=...
SMTP_PORT=...
SMTP_USER=...
SMTP_PASSWORD=...
FROM_EMAIL=...

# Payments (for online collection)
RAZORPAY_KEY_ID=...
RAZORPAY_KEY_SECRET=...

# File Storage (for service reports, attachments)
S3_BUCKET=...
S3_REGION=...
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...

# Monitoring
SENTRY_DSN=...

# App
NEXT_PUBLIC_APP_URL=...
```

**Deployment options:**
- Vercel (easiest for Next.js, free tier available)
- Railway (app + database in one place)
- AWS (ECS/Fargate + RDS for scale)
- Docker on any VPS (DigitalOcean, Hetzner)

---

### Phase 6: Payments & Billing Integration

**Goal:** Enable online payment collection and auto-invoicing.

**Requirements:**
- Razorpay integration (primary, for India)
- Payment links generation for invoices
- Webhook handling for payment confirmation
- Auto-reconciliation (mark invoice as paid when payment received)
- UPI support via Razorpay
- Receipt/payment confirmation emails

---

### Phase 7: Notifications & Communication

**Goal:** Keep users informed about important events.

**Requirements:**
- In-app notifications (bell icon, already in header UI)
- Email notifications (invoice due, contract expiring, new complaint, job assigned)
- WhatsApp notifications via API (critical for Indian SMB market)
- SMS fallback (for technician job assignments)
- Notification preferences per user (in Settings, UI already exists)

---

### Phase 8: File Generation & Storage

**Goal:** Generate PDFs, store attachments.

**Requirements:**
- Invoice PDF generation (for download and email)
- Service report PDF (technician fills after job)
- Contract agreement PDF
- File upload for ticket attachments, photos
- Cloud storage (S3/Cloudflare R2)

---

### Phase 9: Advanced Features

**Goal:** Production-grade features for real usage.

- **Audit logging** - track all CRUD operations with user, timestamp, changes
- **Search** - full-text search across all entities (PostgreSQL tsvector or Meilisearch)
- **Pagination** - cursor-based pagination for all list endpoints (currently no pagination)
- **Export** - CSV/Excel export for customers, invoices, reports
- **Bulk operations** - bulk invoice creation, bulk status updates
- **Recurring invoice automation** - auto-generate invoices based on contract schedule
- **SLA tracking** - auto-escalate tickets that breach SLA deadlines
- **Technician mobile view** - simplified job view for technician role
- **Customer self-service portal** - view contracts, raise tickets, pay invoices
- **Dashboard real-time** - WebSocket or polling for live job/ticket updates

---

## Implementation Prompts

Below are copy-paste prompts to run with Claude Code to build each phase. Run them in order. Each prompt is self-contained and references the existing codebase.

---

### Prompt 1: Database Setup with Prisma + PostgreSQL

```
Set up Prisma ORM with PostgreSQL for the web-app package at /Users/varunsah/Code/Recuring\ application/packages/web-app.

1. Install prisma and @prisma/client as dependencies
2. Run npx prisma init
3. Create the complete schema.prisma with all models derived from the existing TypeScript interfaces in lib/mock-data.ts. The models needed are:

- Organization (id, name, slug, logo, phone, email, address, city, gst, createdAt, updatedAt)
- User (id, organizationId, name, email, passwordHash, role enum: ADMIN/MANAGER/AGENT/TECHNICIAN, status, avatar, lastActiveAt, createdAt)
- Customer (id, organizationId, name, phone, email, address, city, gst, status enum: ACTIVE/INACTIVE/SUSPENDED, category, createdAt, updatedAt) - remove totalDue/totalPaid/assetsCount as these should be computed
- Asset (id, organizationId, customerId FK, name, model, serialNumber unique, category, installationDate, warrantyEnd, status enum: ACTIVE/INACTIVE/UNDER_REPAIR, location, notes, createdAt, updatedAt)
- Contract (id, organizationId, contractNumber unique, customerId FK, assetId FK, planId FK, type enum: AMC/WARRANTY, startDate, endDate, status enum: ACTIVE/EXPIRED/EXPIRING_SOON/RENEWED/CANCELLED, value, visitsCovered, visitsUsed default 0, notes, createdAt, updatedAt)
- Plan (id, organizationId, name, type enum: AMC/WARRANTY, durationMonths, price, visitsCovered, description, isActive default true, createdAt, updatedAt)
- Invoice (id, organizationId, invoiceNumber unique, customerId FK, contractId FK optional, amount, paidAmount default 0, dueDate, issuedDate, status enum: DRAFT/ISSUED/PAID/OVERDUE/PARTIAL/CANCELLED, type enum: RECURRING/ONE_TIME/SERVICE, notes, createdAt, updatedAt)
- InvoiceItem (id, invoiceId FK, description, qty, rate, amount)
- Ticket (id, organizationId, ticketNumber unique, customerId FK, assetId FK optional, subject, description, category, priority enum: LOW/MEDIUM/HIGH/CRITICAL, status enum: OPEN/ASSIGNED/IN_PROGRESS/ON_HOLD/RESOLVED/CLOSED/REOPENED, assignedToId FK User optional, slaDeadline, resolvedAt, createdAt, updatedAt)
- TicketTimeline (id, ticketId FK, action, byUserId FK, note, createdAt)
- Job (id, organizationId, jobNumber unique, ticketId FK optional, customerId FK, assetId FK optional, technicianId FK User, type enum: COMPLAINT/SCHEDULED/INSTALLATION/INSPECTION, status enum: PENDING/ASSIGNED/EN_ROUTE/IN_PROGRESS/COMPLETED/CANCELLED, scheduledDate, completedAt, notes, serviceReport, createdAt, updatedAt)
- Notification (id, userId FK, type, title, message, read default false, link, createdAt)
- AuditLog (id, organizationId, userId FK, action, entity, entityId, changes Json, createdAt)

Add proper indexes on: organizationId (all tables), customerId, status fields, scheduledDate, dueDate, createdAt. Add cascade deletes where appropriate. Use @map for snake_case table/column names.

4. Create a .env.example with DATABASE_URL placeholder
5. Create a seed.ts file in prisma/ that seeds the database with the same data currently in lib/mock-data.ts (convert the mock data arrays to Prisma create calls)
6. Create lib/db.ts with a singleton PrismaClient instance (the standard Next.js pattern to avoid multiple instances in dev)
7. Add prisma scripts to package.json: "db:push", "db:migrate", "db:seed", "db:studio"

Make sure the schema matches the existing frontend types closely so the migration from mock-data to real data is smooth. Use UUID for IDs instead of the current string IDs like "C001".
```

---

### Prompt 2: Authentication with NextAuth.js v5

```
Set up NextAuth.js v5 (Auth.js) for the web-app at /Users/varunsah/Code/Recuring\ application/packages/web-app.

1. Install next-auth@beta @auth/prisma-adapter
2. Create auth.ts in the project root with:
   - PrismaAdapter using the existing lib/db.ts client
   - CredentialsProvider with email/password (use bcrypt for hashing)
   - Session strategy: "jwt"
   - Callbacks: include user.id, user.role, user.organizationId in the session and JWT
   - Pages: signIn: "/login"

3. Create app/api/auth/[...nextauth]/route.ts

4. Create middleware.ts that:
   - Protects all routes under /(dashboard) - redirect to /login if not authenticated
   - Allows /login, /signup, /api/auth/* as public routes
   - Adds organizationId to request headers for downstream use

5. Create app/(auth)/login/page.tsx:
   - Clean login form matching the existing brand design (use brand-600 colors, rounded-xl cards, same input styling as other forms)
   - Email + password fields
   - "Sign In" button
   - Link to /signup
   - Error handling with inline messages

6. Create app/(auth)/signup/page.tsx:
   - Registration form: name, email, password, confirm password, organization name
   - Creates both Organization and User records
   - Auto-signs in after registration
   - Same styling as login

7. Create app/(auth)/layout.tsx:
   - Centered layout without sidebar/header (not the dashboard layout)
   - Brand logo at top

8. Create lib/auth-utils.ts:
   - getServerSession() helper
   - getCurrentUser() helper that returns user with organizationId
   - requireAuth() helper that redirects if not authenticated
   - requireRole(roles[]) helper for role-based access

9. Update the Header component (components/layout/Header.tsx):
   - Replace the hardcoded user name with session user data
   - Add real sign-out functionality using signOut()
   - Show user role badge

10. Add these to .env.example:
    NEXTAUTH_SECRET=
    NEXTAUTH_URL=http://localhost:3001

Do not modify any existing page components beyond the Header. The rest of the app will be migrated to use real auth in a later step.
```

---

### Prompt 3: Server Actions & Data Layer

```
Replace all mock data usage in the web-app at /Users/varunsah/Code/Recuring\ application/packages/web-app with real database queries using Prisma and Next.js Server Actions.

Prerequisites: Prisma schema and auth are already set up.

1. Create lib/actions/ directory with one file per module:
   - customers.ts (CRUD actions + list with search/filter/pagination)
   - assets.ts
   - contracts.ts
   - jobs.ts
   - invoices.ts
   - tickets.ts (complaints)
   - technicians.ts
   - plans.ts
   - dashboard.ts (aggregated metrics queries)
   - reports.ts (analytics queries)
   - settings.ts (business profile, team management)

2. Each action file should:
   - Use "use server" directive
   - Import and use getCurrentUser() to get organizationId
   - Filter ALL queries by organizationId (multi-tenant isolation)
   - Use Zod schemas for input validation
   - Return typed responses: { success: true, data: T } | { success: false, error: string }
   - Handle errors gracefully with try/catch

3. Create lib/validations/ directory with Zod schemas:
   - customer.ts (createCustomerSchema, updateCustomerSchema)
   - asset.ts
   - contract.ts
   - job.ts
   - invoice.ts
   - ticket.ts
   - plan.ts
   - settings.ts

4. For list actions, implement:
   - Search across relevant text fields (using Prisma contains/search)
   - Filter by status, type, category (matching existing FilterBar options)
   - Pagination: page + pageSize params, return { data, total, page, pageSize, totalPages }
   - Sorting: sortBy + sortOrder params

5. Create lib/queries/ directory for read-only data fetching (used by Server Components):
   - Same modules as actions but for GET operations
   - These are plain async functions (not server actions)
   - Used to fetch initial page data server-side

6. Update each page component to:
   - Fetch initial data server-side (convert pages to Server Components where possible)
   - Use client components only for interactive parts (filters, forms)
   - Call server actions for create/update/delete operations
   - Show loading states during mutations
   - Show success/error toasts (install and use sonner)
   - Revalidate data after mutations using revalidatePath()

7. Install zod and sonner as dependencies.

8. Create a shared types file lib/types.ts that re-exports the Prisma generated types with any frontend-specific additions (replacing the current mock-data type exports).

Important: The existing UI and component structure should remain identical. Only the data source changes from mock arrays to database queries. All existing filtering, searching, and display logic should work the same way but now against real data.
```

---

### Prompt 4: Form Validation & Toast Notifications

```
Add proper form validation, loading states, and toast notifications to all form pages in the web-app at /Users/varunsah/Code/Recuring\ application/packages/web-app.

1. Install sonner for toast notifications. Add <Toaster /> to the root layout.

2. For each "new" / create page, update the form to:
   - Add a loading/submitting state (disable button, show spinner)
   - Call the corresponding server action on submit (from lib/actions/)
   - Validate required fields before submission (show inline errors under each field)
   - Show success toast and redirect on success
   - Show error toast on failure
   - Prevent double submissions

   Pages to update:
   - /customers/new
   - /assets/new
   - /contracts/new
   - /jobs/new
   - /invoices/new
   - /complaints/new

3. For each detail/[id] page, add:
   - Edit mode toggle (view mode vs edit mode)
   - Save changes button that calls update server action
   - Delete button with confirmation modal (use existing Modal component)
   - Status change actions (e.g., mark job complete, resolve ticket, cancel contract)
   - Loading states for all mutations

4. Create a reusable FormField component in components/ui/FormField.tsx:
   - Label, input/select/textarea, error message, required indicator
   - Consistent styling matching existing form styling
   - Support for different input types

5. Create a reusable SubmitButton component in components/ui/SubmitButton.tsx:
   - Shows spinner when loading
   - Disabled when loading
   - Uses the existing brand-600 button styling

Keep all existing UI exactly the same - just wire up the validation, loading states, and toasts.
```

---

### Prompt 5: Pagination for All List Pages

```
Add server-side pagination to all list pages in the web-app at /Users/varunsah/Code/Recuring\ application/packages/web-app.

1. Update the DataTable component (components/ui/DataTable.tsx) to support pagination:
   - Add props: page, pageSize, totalCount, totalPages, onPageChange
   - Add a pagination footer with: "Showing X-Y of Z results"
   - Previous/Next buttons (disabled at boundaries)
   - Page number buttons (show max 5 pages with ellipsis)
   - Page size selector (10, 25, 50)
   - Use URL search params for page state (so pagination is shareable/bookmarkable)

2. Update each list page to:
   - Read page/pageSize from URL search params (useSearchParams)
   - Pass pagination params to the server action/query
   - Update URL when page changes (without full page reload)
   - Keep search and filter params in URL too

   Pages to update:
   - /customers
   - /assets
   - /contracts
   - /jobs
   - /invoices
   - /complaints (tickets)
   - /technicians
   - /collections

3. Default pageSize: 20 for all list pages.

Maintain the existing FilterBar and search functionality - just add pagination on top of it.
```

---

### Prompt 6: Environment & Docker Setup

```
Set up environment configuration and Docker for local development of the web-app at /Users/varunsah/Code/Recuring\ application/packages/web-app.

1. Create /.env.example at the monorepo root with all required env vars (with placeholder values and comments explaining each):
   - DATABASE_URL (PostgreSQL connection string)
   - NEXTAUTH_SECRET
   - NEXTAUTH_URL
   - SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, FROM_EMAIL
   - RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET (optional, for Phase 6)
   - S3_BUCKET, S3_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY (optional, for Phase 8)
   - SENTRY_DSN (optional)
   - NEXT_PUBLIC_APP_URL

2. Create /docker-compose.yml for local dev:
   - PostgreSQL 16 container (port 5432, persistent volume)
   - Redis container (port 6379, for session/cache later)
   - pgAdmin container (port 5050, optional for DB management)
   - Environment variables from .env

3. Create /Dockerfile for the web-app (multi-stage build):
   - Stage 1: Install dependencies (npm ci)
   - Stage 2: Build (npx next build)
   - Stage 3: Production (standalone output)
   - Use next.config.mjs output: "standalone"

4. Update /packages/web-app/next.config.mjs:
   - Add output: "standalone" for Docker
   - Add image optimization config

5. Create /.dockerignore

6. Add to root package.json scripts:
   - "docker:up" - docker compose up -d
   - "docker:down" - docker compose down
   - "docker:reset" - down + remove volumes + up
   - "db:setup" - docker:up + prisma migrate + prisma seed

7. Create a brief setup section in the .env.example with copy-paste commands to get started:
   # Quick start:
   # cp .env.example .env.local
   # npm run docker:up
   # npm run db:setup
   # npm run dev:web
```

---

### Prompt 7: CI/CD with GitHub Actions

```
Set up CI/CD pipelines for the monorepo at /Users/varunsah/Code/Recuring\ application.

1. Create .github/workflows/ci.yml:
   - Trigger: push to any branch, pull requests to main
   - Jobs (run in parallel where possible):
     a. Lint: run eslint across all packages
     b. Type Check: run tsc --noEmit for web-app and landing
     c. Build Web App: npx next build in packages/web-app
     d. Build Landing: npx next build in packages/landing
     e. Test: run tests (placeholder for now, skip if no tests)
   - Use Node.js 20
   - Cache node_modules and .next/cache

2. Create .github/workflows/deploy-web.yml:
   - Trigger: push to main (only when packages/web-app/** changes)
   - Deploy to Vercel using vercel CLI
   - Run prisma migrate deploy before deployment
   - Environment: production

3. Create .github/workflows/deploy-landing.yml:
   - Trigger: push to main (only when packages/landing/** changes)
   - Deploy landing to Vercel

4. Create .github/pull_request_template.md:
   - Sections: Summary, Changes, Testing, Screenshots (if UI)

5. Add branch protection recommendations as comments in the CI file.
```

---

### Prompt 8: Razorpay Payment Integration

```
Integrate Razorpay payment gateway into the web-app at /Users/varunsah/Code/Recuring\ application/packages/web-app for invoice payment collection.

1. Install razorpay (server SDK) and razorpay checkout script loading

2. Create lib/razorpay.ts:
   - Initialize Razorpay instance with env credentials
   - Helper to create payment order
   - Helper to verify payment signature

3. Create API routes:
   - POST /api/payments/create-order (creates Razorpay order for an invoice)
   - POST /api/payments/verify (verifies payment signature, updates invoice status)
   - POST /api/webhooks/razorpay (webhook handler for async payment events)

4. Create a PaymentButton component (components/ui/PaymentButton.tsx):
   - Takes invoiceId and amount as props
   - Opens Razorpay checkout modal
   - Handles success/failure callbacks
   - Updates invoice status after successful payment
   - Shows loading state

5. Add PaymentButton to:
   - Invoice detail page (/invoices/[id]) - when status is issued/overdue/partial
   - Collections page - as action button on each overdue invoice row

6. Create a payments table in the Prisma schema:
   - Payment (id, invoiceId FK, razorpayOrderId, razorpayPaymentId, amount, status, method, createdAt)

7. Add partial payment support:
   - Update invoice paidAmount and status after payment
   - If paidAmount >= amount, mark as PAID
   - If paidAmount > 0 but < amount, mark as PARTIAL

8. Add to .env.example: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET
```

---

### Prompt 9: Email Notifications

```
Set up email notifications for the web-app at /Users/varunsah/Code/Recuring\ application/packages/web-app.

1. Install nodemailer and @react-email/components (for email templates)

2. Create lib/email.ts:
   - Transporter setup using SMTP env vars
   - sendEmail(to, subject, html) helper function

3. Create email templates in lib/email-templates/:
   - invoice-created.tsx (new invoice notification to customer)
   - invoice-reminder.tsx (payment due reminder)
   - invoice-overdue.tsx (overdue notice)
   - contract-expiring.tsx (30-day expiry warning)
   - contract-expired.tsx (expiry notification)
   - ticket-created.tsx (new complaint confirmation)
   - ticket-resolved.tsx (resolution notification)
   - job-scheduled.tsx (job assignment to technician)
   - job-completed.tsx (completion notification to customer)
   - welcome.tsx (new user/customer welcome)

4. Each template should:
   - Use the brand colors (indigo/brand-600 palette)
   - Include company logo placeholder
   - Be mobile-responsive
   - Include a CTA button linking to the relevant page
   - Use INR formatting for amounts

5. Create lib/notifications.ts:
   - Functions that combine in-app notification creation + email sending
   - notifyInvoiceCreated(invoiceId)
   - notifyContractExpiring(contractId)
   - notifyTicketCreated(ticketId)
   - notifyJobAssigned(jobId)
   - etc.

6. Wire up notifications to the relevant server actions:
   - When invoice is created -> send invoice-created email
   - When job is assigned -> send job-scheduled email to technician
   - When ticket is resolved -> send ticket-resolved email to customer

7. Add SMTP env vars to .env.example
```

---

### Prompt 10: PDF Generation

```
Add PDF generation for invoices and service reports in the web-app at /Users/varunsah/Code/Recuring\ application/packages/web-app.

1. Install @react-pdf/renderer

2. Create lib/pdf-templates/:
   - invoice-pdf.tsx - Professional invoice PDF with:
     - Company header (name, address, GST, logo placeholder)
     - Customer details (name, address, GST)
     - Invoice number, date, due date
     - Line items table (description, qty, rate, amount)
     - Subtotal, tax (GST 18%), total
     - Payment terms
     - Bank details for wire transfer
     - INR formatting throughout

   - service-report-pdf.tsx - Job service report with:
     - Company header
     - Customer and asset details
     - Technician details
     - Job type, date, duration
     - Work performed description
     - Parts replaced (if any)
     - Customer signature placeholder
     - Technician notes

3. Create API routes:
   - GET /api/invoices/[id]/pdf (generates and returns invoice PDF)
   - GET /api/jobs/[id]/report-pdf (generates and returns service report PDF)

4. Add "Download PDF" button to:
   - Invoice detail page (/invoices/[id])
   - Job detail page (/jobs/[id]) - only when job is completed

5. Add "Download Invoice" action to invoices list page (in row actions or on hover).
```

---

### Prompt 11: Recurring Invoice Automation

```
Add automatic recurring invoice generation for active contracts in the web-app at /Users/varunsah/Code/Recuring\ application/packages/web-app.

1. Add to the Contract model in Prisma:
   - billingCycle enum: MONTHLY/QUARTERLY/HALF_YEARLY/YEARLY
   - nextBillingDate DateTime
   - lastBilledDate DateTime (nullable)

2. Create lib/cron/recurring-invoices.ts:
   - Function that finds all active contracts where nextBillingDate <= today
   - For each: create an Invoice with proper line items, update nextBillingDate
   - Generate invoice number in sequence (INV-YYYY-NNNNN)
   - Send invoice-created email notification

3. Create an API route POST /api/cron/generate-invoices:
   - Protected with a CRON_SECRET env var
   - Calls the recurring invoice generation function
   - Returns count of invoices generated

4. Add Vercel Cron configuration in vercel.json:
   - Run daily at 6:00 AM IST

5. Create a "Billing Schedule" section in the Contract detail page:
   - Show billing cycle, next billing date, last billed date
   - List of all invoices generated from this contract

6. Add billingCycle selection to the Create Contract form (/contracts/new).
```

---

### Prompt 12: Export & Bulk Operations

```
Add CSV/Excel export and bulk operations to list pages in the web-app at /Users/varunsah/Code/Recuring\ application/packages/web-app.

1. Install xlsx (SheetJS) for Excel generation

2. Create lib/export.ts:
   - exportToCSV(data, columns, filename) helper
   - exportToExcel(data, columns, filename) helper

3. Add export buttons to all list pages (next to the filter bar):
   - "Export CSV" and "Export Excel" dropdown
   - Exports the currently filtered data (not just current page)

4. Add bulk selection to DataTable:
   - Checkbox column on the left
   - "Select all" checkbox in header
   - Bulk action bar appears when items are selected
   - Bulk actions per module:
     - Customers: bulk status change
     - Invoices: bulk send reminders, bulk mark as paid
     - Jobs: bulk assign technician, bulk cancel
     - Tickets: bulk assign, bulk close
     - Contracts: bulk renew

5. Create server actions for bulk operations in lib/actions/bulk.ts.

6. Add confirmation modal before executing bulk operations.
```

---

### Prompt 13: Security Hardening

```
Add security measures to the web-app at /Users/varunsah/Code/Recuring\ application/packages/web-app.

1. Update middleware.ts:
   - Add rate limiting for API routes (use upstash/ratelimit or in-memory)
   - Add CSRF protection for mutations
   - Set security headers (X-Frame-Options, X-Content-Type-Options, Referrer-Policy, CSP)

2. Add input sanitization:
   - Sanitize all user text inputs before database storage (prevent XSS)
   - Validate and sanitize file uploads (if any)

3. Add role-based access control to server actions:
   - Admin: full access
   - Manager: all except org settings, user management
   - Agent: CRUD on customers, tickets, invoices, contracts (no delete)
   - Technician: view assigned jobs/tickets, update job status only

4. Add audit logging:
   - Log all create/update/delete operations
   - Store: userId, action, entity, entityId, changes (diff), timestamp
   - Create an audit log viewer in Settings (admin only)

5. Ensure all database queries are parameterized (Prisma handles this, but verify raw queries if any).

6. Add request validation for all API routes using Zod.

7. Set up Content Security Policy headers in next.config.mjs.
```

---

### Prompt 14: Error Monitoring with Sentry

```
Set up Sentry error monitoring for the web-app at /Users/varunsah/Code/Recuring\ application/packages/web-app.

1. Install @sentry/nextjs
2. Run npx @sentry/wizard@latest -i nextjs
3. Configure sentry.client.config.ts, sentry.server.config.ts, sentry.edge.config.ts
4. Create app/global-error.tsx for the global error boundary
5. Update next.config.mjs with withSentryConfig wrapper
6. Add SENTRY_DSN and SENTRY_AUTH_TOKEN to .env.example
7. Add source maps upload for production builds
8. Set up performance monitoring (traces sample rate 0.1 for prod)
```

---

## Recommended Build Order

| # | Phase | Est. Effort | Dependencies |
|---|-------|------------|--------------|
| 1 | Database + Prisma | Medium | None |
| 2 | Authentication | Medium | Phase 1 |
| 3 | Server Actions + Data Layer | Large | Phase 1, 2 |
| 4 | Form Validation + Toasts | Medium | Phase 3 |
| 5 | Pagination | Small | Phase 3 |
| 6 | Docker + Environment | Small | Phase 1 |
| 7 | CI/CD | Small | Phase 6 |
| 8 | Payments (Razorpay) | Medium | Phase 3 |
| 9 | Email Notifications | Medium | Phase 3 |
| 10 | PDF Generation | Medium | Phase 3 |
| 11 | Recurring Invoices | Medium | Phase 3, 9 |
| 12 | Export + Bulk Ops | Medium | Phase 3, 5 |
| 13 | Security | Medium | Phase 2, 3 |
| 14 | Sentry Monitoring | Small | None |

**Minimum viable production app: Phases 1-7** (database, auth, data layer, validation, pagination, docker, CI/CD)

**Full-featured production app: All 14 phases**

---

## Tech Stack Summary

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, React 18, TypeScript, Tailwind CSS |
| Backend | Next.js Server Actions + API Routes |
| Database | PostgreSQL 16 |
| ORM | Prisma |
| Auth | NextAuth.js v5 (Auth.js) |
| Validation | Zod |
| Payments | Razorpay |
| Email | Nodemailer + React Email |
| PDF | @react-pdf/renderer |
| File Storage | AWS S3 / Cloudflare R2 |
| Monitoring | Sentry |
| CI/CD | GitHub Actions |
| Deployment | Vercel (app) + Neon/Supabase (DB) |
| Containerization | Docker + docker-compose |
