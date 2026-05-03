import type { Metadata } from "next";
import { LegalPageShell } from "@/components/layout/LegalPageShell";

export const metadata: Metadata = {
  title: "Grievance Redressal | Project X",
  description:
    "How to raise and resolve grievances under the Digital Personal Data Protection Act, 2023.",
};

const LAST_UPDATED = "3 May 2026";

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

export default function GrievancePage() {
  return (
    <LegalPageShell
      title="Grievance Redressal"
      subtitle="Under the Digital Personal Data Protection Act, 2023"
      lastUpdated={LAST_UPDATED}
    >
      <Section id="overview" number="1" title="Overview">
        <p>
          Under the Digital Personal Data Protection Act, 2023 (DPDPA), every Data
          Fiduciary is required to appoint a Grievance Officer to address concerns raised
          by Data Principals regarding the processing of their personal data.
        </p>
        <p>
          Project X is committed to protecting the personal data of all users, customers,
          and service technicians who interact with our platform.
        </p>
      </Section>

      <Section id="grievance-officer" number="2" title="Grievance Officer">
        <p>
          Each organization using Project X designates their own Grievance Officer, whose
          contact details are available within the organization&rsquo;s customer portal and
          settings page.
        </p>
        <p>
          For concerns related to Project X as a platform (rather than a specific
          organization using the platform), you may contact:
        </p>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 not-prose">
          <p className="font-medium text-slate-900">Platform Grievance Officer</p>
          <p className="text-sm text-slate-600 mt-1">
            Email: grievance@projectx.com
          </p>
          <p className="text-sm text-slate-600">
            Response time: Within 48 hours of receipt
          </p>
        </div>
      </Section>

      <Section id="how-to-file" number="3" title="How to File a Grievance">
        <p>You may file a grievance by:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong>Email:</strong> Send a detailed description of your concern to the
            Grievance Officer of the organization you interact with (available on their
            customer portal) or to the platform Grievance Officer.
          </li>
          <li>
            <strong>In-app request:</strong> If you are a registered user, you can submit
            a Data Subject Rights request (access, correction, or erasure) through the
            dashboard.
          </li>
        </ul>
      </Section>

      <Section id="resolution-process" number="4" title="Resolution Process">
        <p>Upon receiving a grievance:</p>
        <ul className="list-decimal pl-5 space-y-2">
          <li>We will acknowledge receipt within 48 hours.</li>
          <li>
            The Grievance Officer will investigate the matter and provide a resolution
            or update within 15 business days.
          </li>
          <li>
            If you are not satisfied with the resolution, you may escalate your complaint
            to the Data Protection Board of India.
          </li>
        </ul>
      </Section>

      <Section id="your-rights" number="5" title="Your Rights Under DPDPA">
        <p>As a Data Principal, you have the right to:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong>Access</strong> — Request a copy of all personal data held about you.
          </li>
          <li>
            <strong>Correction</strong> — Request correction of inaccurate personal data.
          </li>
          <li>
            <strong>Erasure</strong> — Request deletion of your personal data, subject to
            legal retention obligations (e.g., financial records must be retained for 8
            years per the IT Act).
          </li>
          <li>
            <strong>Consent withdrawal</strong> — Withdraw consent for data processing at
            any time. Note that withdrawing consent for service delivery may affect your
            ability to use the service.
          </li>
        </ul>
      </Section>

      <Section id="dpb" number="6" title="Data Protection Board of India">
        <p>
          If your grievance is not resolved to your satisfaction, you may file a complaint
          with the Data Protection Board of India as established under Section 18 of the
          DPDPA, 2023.
        </p>
      </Section>
    </LegalPageShell>
  );
}
