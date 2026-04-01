import type { Metadata } from "next";
import { LegalPageShell } from "@/components/layout/LegalPageShell";

export const metadata: Metadata = {
  title: "Privacy Policy | Project X",
  description:
    "Learn how Project X collects, uses, and protects the data of your business and your customers.",
};

const LAST_UPDATED = "1 April 2026";

// ─── Reusable section primitives ────────────────────────────────────────────

function Section({
  id,
  number,
  title,
  children,
}: {
  id: string;
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-24 border-t border-slate-100 pt-10 mt-10 first:border-t-0 first:pt-0 first:mt-0"
    >
      <div className="flex items-start gap-4">
        <span className="mt-1 flex-shrink-0 flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 text-xs font-bold text-brand-600 ring-1 ring-inset ring-brand-200/60">
          {number}
        </span>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-semibold text-slate-900 leading-snug">
            {title}
          </h2>
          <div className="mt-4 space-y-4 text-slate-600 leading-relaxed text-[15px]">
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mt-6 mb-2 font-semibold text-slate-800 text-[15px]">
      {children}
    </h3>
  );
}

function UL({ children }: { children: React.ReactNode }) {
  return (
    <ul className="mt-2 space-y-1.5 pl-5 list-disc marker:text-brand-400">
      {children}
    </ul>
  );
}

function LI({ children }: { children: React.ReactNode }) {
  return <li>{children}</li>;
}

// ─── Table of Contents ───────────────────────────────────────────────────────

const TOC_ITEMS = [
  { id: "introduction", label: "Introduction" },
  { id: "information-we-collect", label: "Information We Collect" },
  { id: "how-we-use", label: "How We Use Information" },
  { id: "payments", label: "Payments and Billing Data" },
  { id: "cookies", label: "Cookies and Analytics" },
  { id: "data-sharing", label: "Data Sharing and Processors" },
  { id: "data-retention", label: "Data Retention" },
  { id: "security", label: "Security" },
  { id: "your-rights", label: "Your Rights" },
  { id: "contact", label: "Contact Information" },
  { id: "updates", label: "Policy Updates" },
];

// ─── Page ───────────────────────────────────────────────────────────────────

export default function PrivacyPage() {
  return (
    <LegalPageShell
      title="Privacy Policy"
      subtitle="We keep things simple: we use your data to run the platform, we don't sell it, and we give you control over it."
      lastUpdated={LAST_UPDATED}
    >
      {/* Table of Contents */}
      <nav
        aria-label="Table of contents"
        className="mb-12 rounded-2xl border border-slate-200 bg-slate-50 p-6"
      >
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-4">
          On this page
        </p>
        <ol className="space-y-2">
          {TOC_ITEMS.map((item, i) => (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                className="group flex items-center gap-3 text-sm text-slate-600 hover:text-brand-600 transition-colors"
              >
                <span className="flex-shrink-0 w-5 text-xs font-semibold text-slate-400 group-hover:text-brand-400 tabular-nums">
                  {String(i + 1).padStart(2, "0")}
                </span>
                {item.label}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      {/* ── 1. Introduction ────────────────────────────────────────────────── */}
      <Section id="introduction" number="1" title="Introduction">
        <p>
          Project X (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or
          &ldquo;us&rdquo;) is a B2B SaaS platform that helps Indian recurring
          service businesses — water purifier companies, AC service centres,
          CCTV installers, pest control operators, and others — manage their
          customers, billing, complaints, and field technicians from one place.
        </p>
        <p>
          This Privacy Policy explains what data we collect when you use Project
          X, why we collect it, how we use it, who we share it with, and what
          your rights are. It applies to all users of our web application,
          mobile app, and this website.
        </p>
        <p>
          By creating an account or continuing to use Project X, you agree to
          this policy. If you are using Project X on behalf of a business, you
          represent that you have the authority to agree on its behalf.
        </p>
        <p className="rounded-xl bg-brand-50 border border-brand-100 px-5 py-4 text-sm text-brand-800">
          <strong className="font-semibold">Important distinction:</strong> Your
          business is our customer (&ldquo;you&rdquo;). Your end-customers whose
          data lives inside Project X are called &ldquo;your
          customers&rdquo; throughout this policy. You are responsible for
          ensuring your customers&rsquo; data is collected lawfully under your
          own terms with them.
        </p>
      </Section>

      {/* ── 2. Information We Collect ──────────────────────────────────────── */}
      <Section
        id="information-we-collect"
        number="2"
        title="Information We Collect"
      >
        <p>
          We collect data in three ways: data you give us directly, data
          generated by your use of the platform, and data your customers&rsquo;
          records contain.
        </p>

        <SubHeading>Account and business information</SubHeading>
        <UL>
          <LI>Your name, email address, and phone number when you sign up</LI>
          <LI>Your business name, address, and GSTIN (if provided)</LI>
          <LI>
            Profile information for additional team members you invite (name,
            email, role)
          </LI>
          <LI>Billing and subscription details</LI>
        </UL>

        <SubHeading>
          Customer and operational data you enter into the platform
        </SubHeading>
        <p>
          This is the core data you manage through Project X. It includes your
          customers&rsquo; names, contact details, addresses, asset details,
          service contracts, complaints, invoices, payment records, and
          technician visit notes. We store this data to power the platform for
          you — it belongs to your business.
        </p>

        <SubHeading>Usage and device data</SubHeading>
        <UL>
          <LI>Pages visited, features used, and actions taken in the app</LI>
          <LI>Browser type, operating system, device type, and IP address</LI>
          <LI>Session timestamps and error logs</LI>
          <LI>
            Technician GPS check-in coordinates (only when the mobile app
            explicitly submits a job visit)
          </LI>
        </UL>

        <SubHeading>Communications</SubHeading>
        <UL>
          <LI>
            Emails and messages you send to our support team
          </LI>
          <LI>
            Automated notification logs (e.g., payment reminders sent to your
            customers via SMS or WhatsApp on your behalf)
          </LI>
        </UL>
      </Section>

      {/* ── 3. How We Use Information ──────────────────────────────────────── */}
      <Section id="how-we-use" number="3" title="How We Use Information">
        <p>We use the data we collect to:</p>
        <UL>
          <LI>
            <strong className="font-medium text-slate-700">
              Run the platform
            </strong>{" "}
            — store, display, and process your business data so the software
            works as expected
          </LI>
          <LI>
            <strong className="font-medium text-slate-700">
              Manage your account
            </strong>{" "}
            — handle authentication, team access, and subscription billing
          </LI>
          <LI>
            <strong className="font-medium text-slate-700">
              Send you notifications
            </strong>{" "}
            — transactional emails about your account, plan changes, payment
            receipts, and service alerts
          </LI>
          <LI>
            <strong className="font-medium text-slate-700">
              Send your customers notifications on your behalf
            </strong>{" "}
            — payment reminders, service confirmations, and invoice delivery via
            SMS and WhatsApp, as configured by you
          </LI>
          <LI>
            <strong className="font-medium text-slate-700">
              Provide customer support
            </strong>{" "}
            — diagnose issues, respond to tickets, and improve reliability
          </LI>
          <LI>
            <strong className="font-medium text-slate-700">
              Improve the product
            </strong>{" "}
            — understand which features are used most, where users get stuck,
            and what to build next (using anonymised, aggregated data)
          </LI>
          <LI>
            <strong className="font-medium text-slate-700">
              Comply with legal obligations
            </strong>{" "}
            — maintain records as required by Indian tax and business law
          </LI>
        </UL>
        <p>
          We do not use your data or your customers&rsquo; data for advertising
          purposes, and we do not build advertising profiles.
        </p>
      </Section>

      {/* ── 4. Payments and Billing Data ───────────────────────────────────── */}
      <Section id="payments" number="4" title="Payments and Billing Data">
        <p>
          Project X uses{" "}
          <strong className="font-medium text-slate-700">Razorpay</strong> to
          process payments — both for your Project X subscription and for
          payments your customers make through the platform.
        </p>

        <SubHeading>What we store</SubHeading>
        <UL>
          <LI>
            Transaction IDs, amounts, dates, and status (paid / pending /
            failed)
          </LI>
          <LI>
            Razorpay order IDs and payment references linked to invoices in your
            account
          </LI>
          <LI>
            Partial payment records and outstanding balances
          </LI>
        </UL>

        <SubHeading>What we do not store</SubHeading>
        <UL>
          <LI>
            Full card numbers, CVV codes, or UPI PINs — these are handled
            entirely by Razorpay and never touch our servers
          </LI>
        </UL>

        <p>
          Razorpay is PCI-DSS compliant. You can review Razorpay&rsquo;s own
          privacy practices at their website. Your customers who pay via the
          platform interact with Razorpay&rsquo;s checkout directly.
        </p>

        <SubHeading>Your Project X subscription</SubHeading>
        <p>
          When you pay for a Project X plan, the same applies — payment is
          processed by Razorpay and we retain only the transaction record, not
          raw card or bank details.
        </p>
      </Section>

      {/* ── 5. Cookies and Analytics ───────────────────────────────────────── */}
      <Section id="cookies" number="5" title="Cookies and Analytics">
        <SubHeading>Essential cookies</SubHeading>
        <p>
          We use session cookies to keep you logged in and to maintain your
          preferences while you use the platform. These are strictly necessary
          and cannot be disabled without breaking the product.
        </p>

        <SubHeading>Analytics</SubHeading>
        <p>
          We may use anonymised, privacy-friendly analytics to understand
          aggregate usage patterns — for example, which features are most used
          or where users encounter errors. We do not use third-party advertising
          trackers (such as Facebook Pixel or Google Ads tags) on the
          application.
        </p>

        <SubHeading>This website (landing page)</SubHeading>
        <p>
          This marketing website may use cookies to measure visits and referral
          sources. No personally identifiable information is collected without
          your explicit action (e.g., submitting a contact form).
        </p>

        <p>
          You can disable cookies in your browser settings, though doing so
          will log you out and may break certain features of the web app.
        </p>
      </Section>

      {/* ── 6. Data Sharing and Processors ────────────────────────────────── */}
      <Section
        id="data-sharing"
        number="6"
        title="Data Sharing and Processors"
      >
        <p>
          We do not sell, rent, or trade your data or your customers&rsquo;
          data. Period.
        </p>
        <p>
          We share data only with the third-party service providers
          (&ldquo;processors&rdquo;) necessary to operate the platform:
        </p>

        <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-4 py-3 text-left font-semibold text-slate-700">
                  Processor
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">
                  Purpose
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[
                ["Amazon Web Services (AWS)", "Cloud hosting and storage — data is stored in the AWS Mumbai (ap-south-1) region"],
                ["Razorpay", "Payment processing for subscriptions and customer payments"],
                ["Twilio / SMS gateway", "Sending SMS notifications and OTPs on your behalf"],
                ["WhatsApp Business API", "Sending WhatsApp reminders to your customers when you enable this feature"],
                ["Email provider (transactional)", "Sending invoices, receipts, and account emails"],
              ].map(([processor, purpose]) => (
                <tr key={processor}>
                  <td className="px-4 py-3 font-medium text-slate-700 align-top whitespace-nowrap">
                    {processor}
                  </td>
                  <td className="px-4 py-3 text-slate-600 align-top">
                    {purpose}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-4">
          All processors are contractually required to process data only as
          instructed by us and to maintain appropriate security standards.
        </p>

        <SubHeading>Legal disclosures</SubHeading>
        <p>
          We may disclose data if required to do so by a court order, government
          authority, or applicable Indian law (including the Information
          Technology Act, 2000 and its rules). We will notify you if legally
          permitted to do so before making such a disclosure.
        </p>

        <SubHeading>Business transfers</SubHeading>
        <p>
          If Project X is acquired, merged, or its assets are transferred, your
          data may be transferred as part of that transaction. We will notify
          you via email and this policy will continue to apply until you are
          given a new one.
        </p>
      </Section>

      {/* ── 7. Data Retention ──────────────────────────────────────────────── */}
      <Section id="data-retention" number="7" title="Data Retention">
        <p>
          We retain your account data and business records for as long as your
          account is active. When you cancel your subscription:
        </p>
        <UL>
          <LI>
            Your data remains accessible for a{" "}
            <strong className="font-medium text-slate-700">30-day grace period</strong>{" "}
            so you can export it
          </LI>
          <LI>
            After 30 days, your account and operational data (customers, assets,
            invoices, complaints, technician records) are permanently deleted
          </LI>
          <LI>
            Transaction records (invoices, payment receipts) may be retained for
            up to <strong className="font-medium text-slate-700">7 years</strong> as required
            by Indian GST and tax law, in an anonymised or archived format
          </LI>
          <LI>
            Backup copies may persist for up to{" "}
            <strong className="font-medium text-slate-700">90 days</strong> after
            deletion due to our backup rotation schedule
          </LI>
        </UL>
        <p>
          You can request early deletion of your account and all associated data
          by contacting us at the address below.
        </p>
      </Section>

      {/* ── 8. Security ───────────────────────────────────────────────────── */}
      <Section id="security" number="8" title="Security">
        <p>
          Protecting your business data is a core responsibility, not an
          afterthought. Here is what we do:
        </p>
        <UL>
          <LI>
            <strong className="font-medium text-slate-700">
              Encryption in transit
            </strong>{" "}
            — all data between your browser or app and our servers travels over
            HTTPS/TLS
          </LI>
          <LI>
            <strong className="font-medium text-slate-700">
              Encryption at rest
            </strong>{" "}
            — data stored in our database and file storage is encrypted using
            AES-256
          </LI>
          <LI>
            <strong className="font-medium text-slate-700">
              Access controls
            </strong>{" "}
            — role-based permissions within your team (Admin, Manager, Agent,
            Technician) ensure team members only see what they need to
          </LI>
          <LI>
            <strong className="font-medium text-slate-700">
              Infrastructure
            </strong>{" "}
            — hosted on AWS Mumbai with automatic daily backups and multi-AZ
            redundancy
          </LI>
          <LI>
            <strong className="font-medium text-slate-700">
              Internal access
            </strong>{" "}
            — Project X staff access to production data is restricted, logged,
            and audited; support staff see only what is necessary to resolve
            your issue
          </LI>
          <LI>
            <strong className="font-medium text-slate-700">
              Password security
            </strong>{" "}
            — passwords are hashed using bcrypt and never stored in plain text
          </LI>
        </UL>
        <p>
          No system is completely immune to breaches. In the unlikely event of a
          data breach that affects your account, we will notify you within 72
          hours of becoming aware of it and provide details of what was affected
          and what steps you should take.
        </p>
      </Section>

      {/* ── 9. Your Rights ────────────────────────────────────────────────── */}
      <Section id="your-rights" number="9" title="Your Rights">
        <p>
          As the account holder, you have the following rights over your data:
        </p>
        <UL>
          <LI>
            <strong className="font-medium text-slate-700">Access</strong> —
            request a copy of the personal data we hold about you and your
            account
          </LI>
          <LI>
            <strong className="font-medium text-slate-700">Correction</strong>{" "}
            — update or correct inaccurate information (most of this you can do
            directly in Settings)
          </LI>
          <LI>
            <strong className="font-medium text-slate-700">Deletion</strong> —
            request deletion of your account and all associated data, subject to
            legal retention obligations described above
          </LI>
          <LI>
            <strong className="font-medium text-slate-700">Portability</strong>{" "}
            — export your customers, invoices, contracts, and other operational
            data in CSV format at any time from the platform
          </LI>
          <LI>
            <strong className="font-medium text-slate-700">
              Restriction of processing
            </strong>{" "}
            — in certain circumstances, request that we limit how we use your
            data
          </LI>
          <LI>
            <strong className="font-medium text-slate-700">Objection</strong> —
            object to processing based on our legitimate interests
          </LI>
        </UL>
        <p>
          To exercise any of these rights, email us at the address in the
          Contact section. We will respond within{" "}
          <strong className="font-medium text-slate-700">15 business days</strong>. We
          may ask you to verify your identity before acting on your request.
        </p>
        <p>
          If you believe we have processed your data unlawfully, you have the
          right to raise a complaint with the relevant authority under the
          Information Technology Act, 2000 and the Digital Personal Data
          Protection Act, 2023 (once in force).
        </p>
      </Section>

      {/* ── 10. Contact Information ────────────────────────────────────────── */}
      <Section id="contact" number="10" title="Contact Information">
        <p>
          For any privacy-related questions, requests, or concerns, please reach
          out to us:
        </p>

        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-6 py-5 text-sm text-slate-700 space-y-2">
          <p>
            <strong className="font-semibold text-slate-900">Project X</strong>
          </p>
          <p>
            Email:{" "}
            <a
              href="mailto:privacy@projectx.in"
              className="text-brand-600 hover:text-brand-700 underline underline-offset-2 transition-colors"
            >
              privacy@projectx.in
            </a>
          </p>
          <p>
            Support:{" "}
            <a
              href="mailto:hello@projectx.in"
              className="text-brand-600 hover:text-brand-700 underline underline-offset-2 transition-colors"
            >
              hello@projectx.in
            </a>
          </p>
          <p className="text-slate-500 text-xs pt-1">
            We aim to respond to all privacy requests within 3 business days.
          </p>
        </div>
      </Section>

      {/* ── 11. Policy Updates ─────────────────────────────────────────────── */}
      <Section id="updates" number="11" title="Policy Updates">
        <p>
          We may update this Privacy Policy from time to time as the product
          evolves or legal requirements change. When we make material changes, we
          will:
        </p>
        <UL>
          <LI>Update the &ldquo;Last updated&rdquo; date at the top of this page</LI>
          <LI>
            Send an in-app notification and email to the primary account holder
            at least 14 days before the changes take effect
          </LI>
        </UL>
        <p>
          Continued use of Project X after the effective date constitutes
          acceptance of the updated policy. If you disagree with the changes, you
          can export your data and close your account before the new policy takes
          effect.
        </p>
        <p>
          For minor, non-material changes (such as fixing typos or clarifying
          language without changing how data is actually used), we may update the
          policy without separate notification.
        </p>
      </Section>
    </LegalPageShell>
  );
}
