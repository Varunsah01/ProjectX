import type { Metadata } from "next";
import { LegalPageShell } from "@/components/layout/LegalPageShell";

export const metadata: Metadata = {
  title: "Terms of Service | Project X",
  description:
    "The terms and conditions governing your use of the Project X platform.",
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
  { id: "acceptance", label: "Acceptance of Terms" },
  { id: "service", label: "Description of Service" },
  { id: "accounts", label: "Accounts and Access" },
  { id: "billing", label: "Subscription and Billing" },
  { id: "acceptable-use", label: "Acceptable Use" },
  { id: "data", label: "Your Data" },
  { id: "ip", label: "Intellectual Property" },
  { id: "confidentiality", label: "Confidentiality" },
  { id: "availability", label: "Service Availability" },
  { id: "liability", label: "Limitation of Liability" },
  { id: "termination", label: "Termination" },
  { id: "governing-law", label: "Governing Law" },
  { id: "changes", label: "Changes to These Terms" },
  { id: "contact", label: "Contact" },
];

// ─── Page ───────────────────────────────────────────────────────────────────

export default function TermsPage() {
  return (
    <LegalPageShell
      title="Terms of Service"
      subtitle="These terms govern your use of the Project X platform. Please read them carefully — they set out your rights and obligations as a customer."
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

      {/* ── 1. Acceptance ──────────────────────────────────────────────────── */}
      <Section id="acceptance" number="1" title="Acceptance of Terms">
        <p>
          By creating an account, signing an order form, or using the Project X
          platform in any way, you agree to be bound by these Terms of Service
          (&ldquo;Terms&rdquo;). If you are accepting these Terms on behalf of a
          business, you confirm that you have the authority to bind that
          organisation.
        </p>
        <p>
          If you do not agree to these Terms, do not use the platform.
        </p>
        <p className="rounded-xl bg-brand-50 border border-brand-100 px-5 py-4 text-sm text-brand-800">
          <strong className="font-semibold">Who these Terms apply to:</strong>{" "}
          &ldquo;You&rdquo; means the business entity or individual that has
          entered into a commercial agreement with Project X.
          &ldquo;Users&rdquo; means your employees, technicians, and agents who
          access the platform under your account. You are responsible for
          ensuring your Users comply with these Terms.
        </p>
      </Section>

      {/* ── 2. Service ─────────────────────────────────────────────────────── */}
      <Section id="service" number="2" title="Description of Service">
        <p>
          Project X is a B2B SaaS platform for Indian recurring service
          businesses. The platform includes:
        </p>
        <UL>
          <LI>Customer and asset management</LI>
          <LI>Recurring billing, invoicing, and payment collection</LI>
          <LI>AMC and warranty contract tracking</LI>
          <LI>Complaint and job management</LI>
          <LI>Technician mobile app and field workflow tools</LI>
          <LI>Customer self-service portal</LI>
          <LI>SMS and WhatsApp notification dispatch</LI>
        </UL>
        <p>
          The specific modules and features available to your account are
          determined by your subscription plan as agreed in your order or
          proposal. We may add or modify features over time; we will notify you
          of significant changes.
        </p>
      </Section>

      {/* ── 3. Accounts ────────────────────────────────────────────────────── */}
      <Section id="accounts" number="3" title="Accounts and Access">
        <SubHeading>Account registration</SubHeading>
        <p>
          To use Project X, you must create an account using accurate and
          complete information. You are responsible for keeping your account
          details up to date.
        </p>

        <SubHeading>Security</SubHeading>
        <p>
          You are responsible for maintaining the confidentiality of your login
          credentials and for all activity that occurs under your account. You
          must notify us immediately at{" "}
          <a
            href="mailto:hello@projectx.in"
            className="text-brand-600 hover:text-brand-700 underline underline-offset-2"
          >
            hello@projectx.in
          </a>{" "}
          if you become aware of any unauthorised access.
        </p>

        <SubHeading>User management</SubHeading>
        <p>
          You control who on your team has access to Project X. You may invite
          Users with different roles (Admin, Manager, Agent, Technician). You
          are responsible for removing access for team members who leave your
          organisation.
        </p>
      </Section>

      {/* ── 4. Billing ─────────────────────────────────────────────────────── */}
      <Section id="billing" number="4" title="Subscription and Billing">
        <SubHeading>Pricing and payment</SubHeading>
        <p>
          Pricing is agreed upon individually based on your business size and
          requirements, as set out in your commercial proposal. Payment is
          processed via Razorpay. All fees are quoted and charged in Indian
          Rupees (INR) and are inclusive or exclusive of GST as stated on your
          invoice.
        </p>

        <SubHeading>Billing cycle</SubHeading>
        <p>
          Subscriptions are billed monthly or annually depending on the plan
          you have agreed to. Fees are due at the start of each billing cycle.
          Failure to pay within the grace period may result in suspension of
          your account.
        </p>

        <SubHeading>No refunds</SubHeading>
        <p>
          Subscription fees are non-refundable except where required by
          applicable law or as explicitly agreed in writing. If you cancel your
          subscription, you retain access until the end of the current paid
          period and will not be charged for subsequent periods.
        </p>

        <SubHeading>Price changes</SubHeading>
        <p>
          We may change our pricing with at least 30 days&rsquo; notice before
          the start of your next billing cycle. If you do not agree to the new
          pricing, you may cancel your subscription before the new rates take
          effect.
        </p>
      </Section>

      {/* ── 5. Acceptable Use ──────────────────────────────────────────────── */}
      <Section id="acceptable-use" number="5" title="Acceptable Use">
        <p>You agree to use Project X only for lawful business purposes. You must not:</p>
        <UL>
          <LI>
            Use the platform to process, store, or transmit illegal content or
            content that infringes the rights of others
          </LI>
          <LI>
            Attempt to gain unauthorised access to any part of the platform,
            servers, or systems connected to it
          </LI>
          <LI>
            Use the platform to send spam, unsolicited messages, or communications
            that violate applicable regulations (including TRAI guidelines)
          </LI>
          <LI>
            Reverse-engineer, decompile, or attempt to extract the source code of
            the platform
          </LI>
          <LI>
            Resell, sublicense, or otherwise make the platform available to third
            parties outside your organisation without our written consent
          </LI>
          <LI>
            Introduce malicious software, conduct denial-of-service attacks, or
            otherwise interfere with the platform&rsquo;s operation
          </LI>
        </UL>
        <p>
          We reserve the right to suspend or terminate accounts that violate
          these provisions without prior notice.
        </p>
      </Section>

      {/* ── 6. Your Data ───────────────────────────────────────────────────── */}
      <Section id="data" number="6" title="Your Data">
        <p>
          You retain full ownership of all data you enter into Project X —
          including your customer records, invoices, contracts, and operational
          data (&ldquo;Your Data&rdquo;). We do not claim any ownership rights
          over Your Data.
        </p>
        <p>
          By using the platform, you grant us a limited licence to host,
          process, and display Your Data solely for the purpose of providing the
          service to you.
        </p>
        <p>
          You are responsible for ensuring that the customer data you enter into
          Project X has been collected lawfully and that your customers have
          been informed appropriately under your own terms with them.
        </p>
        <p>
          Our practices for collecting, using, and protecting data are described
          in our{" "}
          <a
            href="/privacy"
            className="text-brand-600 hover:text-brand-700 underline underline-offset-2"
          >
            Privacy Policy
          </a>
          , which forms part of these Terms.
        </p>
        <SubHeading>Data export</SubHeading>
        <p>
          You can export Your Data in CSV format at any time from within the
          platform. On cancellation, you have a 30-day window to export before
          your data is deleted.
        </p>
      </Section>

      {/* ── 7. Intellectual Property ───────────────────────────────────────── */}
      <Section id="ip" number="7" title="Intellectual Property">
        <p>
          Project X and all associated software, designs, documentation,
          trademarks, and technology are owned by us or our licensors. These
          Terms do not transfer any intellectual property rights to you.
        </p>
        <p>
          You are granted a non-exclusive, non-transferable, revocable licence
          to access and use the platform during the term of your subscription
          solely for your internal business operations.
        </p>
        <p>
          Any feedback, suggestions, or ideas you share with us about improving
          the platform may be used by us without restriction or compensation to
          you.
        </p>
      </Section>

      {/* ── 8. Confidentiality ─────────────────────────────────────────────── */}
      <Section id="confidentiality" number="8" title="Confidentiality">
        <p>
          Each party may have access to confidential information of the other
          in connection with these Terms. Both parties agree to:
        </p>
        <UL>
          <LI>
            Keep the other party&rsquo;s confidential information strictly
            confidential
          </LI>
          <LI>
            Not disclose it to any third party without prior written consent,
            except as required by law
          </LI>
          <LI>
            Use it only for the purposes of performing obligations or exercising
            rights under these Terms
          </LI>
        </UL>
        <p>
          Your Data is treated as your confidential information. Our pricing,
          product roadmap, and technical architecture are treated as our
          confidential information.
        </p>
      </Section>

      {/* ── 9. Service Availability ────────────────────────────────────────── */}
      <Section id="availability" number="9" title="Service Availability">
        <p>
          We aim to provide a reliable, high-availability platform, but we do
          not guarantee uninterrupted service. Scheduled maintenance windows
          will be communicated in advance where possible.
        </p>
        <p>
          In the event of unplanned downtime, we will work to restore service
          as quickly as possible and communicate status updates. Service
          availability commitments, if any, are specified in your order.
        </p>
        <p>
          We are not liable for disruptions caused by factors outside our
          reasonable control, including internet outages, third-party service
          failures, or force majeure events.
        </p>
      </Section>

      {/* ── 10. Limitation of Liability ────────────────────────────────────── */}
      <Section id="liability" number="10" title="Limitation of Liability">
        <p>
          To the maximum extent permitted by applicable law:
        </p>
        <UL>
          <LI>
            Project X is provided &ldquo;as is&rdquo; and &ldquo;as
            available&rdquo; without warranties of any kind, whether express or
            implied
          </LI>
          <LI>
            We are not liable for any indirect, incidental, special,
            consequential, or punitive damages, including loss of profits, data,
            or business opportunities, arising from your use of the platform
          </LI>
          <LI>
            Our total liability to you for any claims arising under these Terms
            shall not exceed the fees you paid to us in the three months
            immediately preceding the event giving rise to the claim
          </LI>
        </UL>
        <p>
          Nothing in these Terms excludes liability for fraud, death or personal
          injury caused by negligence, or any liability that cannot be excluded
          under applicable Indian law.
        </p>
      </Section>

      {/* ── 11. Termination ────────────────────────────────────────────────── */}
      <Section id="termination" number="11" title="Termination">
        <SubHeading>By you</SubHeading>
        <p>
          You may cancel your subscription at any time by contacting us or
          through your account settings. Cancellation takes effect at the end
          of the current billing period.
        </p>

        <SubHeading>By us</SubHeading>
        <p>
          We may suspend or terminate your account immediately if you materially
          breach these Terms and fail to remedy the breach within 14 days of
          written notice. We may also terminate your account for non-payment,
          with notice.
        </p>

        <SubHeading>Effect of termination</SubHeading>
        <p>
          On termination, your access to the platform ceases. Your Data will be
          available for export for 30 days before being permanently deleted.
          Provisions that by their nature should survive termination (including
          sections on Intellectual Property, Confidentiality, Limitation of
          Liability, and Governing Law) will continue to apply.
        </p>
      </Section>

      {/* ── 12. Governing Law ──────────────────────────────────────────────── */}
      <Section id="governing-law" number="12" title="Governing Law">
        <p>
          These Terms are governed by and construed in accordance with the laws
          of India. Any disputes arising under or in connection with these Terms
          shall be subject to the exclusive jurisdiction of the courts in India.
        </p>
        <p>
          We encourage you to contact us first to resolve any disputes
          informally. Most issues can be resolved quickly by reaching out to our
          support team.
        </p>
      </Section>

      {/* ── 13. Changes to Terms ───────────────────────────────────────────── */}
      <Section id="changes" number="13" title="Changes to These Terms">
        <p>
          We may update these Terms from time to time. When we make material
          changes, we will:
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
          acceptance of the updated Terms. If you do not agree to the changes,
          you may cancel your subscription before they take effect.
        </p>
      </Section>

      {/* ── 14. Contact ────────────────────────────────────────────────────── */}
      <Section id="contact" number="14" title="Contact">
        <p>
          If you have any questions about these Terms or your account, please
          contact us:
        </p>

        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-6 py-5 text-sm text-slate-700 space-y-2">
          <p>
            <strong className="font-semibold text-slate-900">Project X</strong>
          </p>
          <p>
            Email:{" "}
            <a
              href="mailto:hello@projectx.in"
              className="text-brand-600 hover:text-brand-700 underline underline-offset-2 transition-colors"
            >
              hello@projectx.in
            </a>
          </p>
          <p className="text-slate-500 text-xs pt-1">
            We aim to respond to all enquiries within 2 business days.
          </p>
        </div>
      </Section>
    </LegalPageShell>
  );
}
