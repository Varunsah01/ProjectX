"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";

type ConsentRecord = {
  id: string;
  purpose: string;
  status: string;
  grantedAt?: string | null;
  withdrawnAt?: string | null;
};

type OrgInfo = {
  name: string;
  grievanceOfficerName?: string | null;
  grievanceOfficerEmail?: string | null;
  grievanceOfficerPhone?: string | null;
};

const PURPOSE_LABELS: Record<string, string> = {
  SERVICE_DELIVERY: "Service Delivery",
  COMMUNICATION: "Communication",
  ANALYTICS: "Analytics",
  MARKETING: "Marketing",
};

const PURPOSE_DESCRIPTIONS: Record<string, string> = {
  SERVICE_DELIVERY: "Processing your data to provide the core service",
  COMMUNICATION: "Sending service updates, reminders, and notifications",
  ANALYTICS: "Using usage data to improve the product",
  MARKETING: "Sending product updates and promotional offers",
};

export default function PrivacyClient({
  organization,
  consents,
  customerId,
  organizationId,
}: {
  organization: OrgInfo;
  consents: ConsentRecord[];
  customerId: string;
  organizationId: string;
}) {
  const router = useRouter();
  const [withdrawing, setWithdrawing] = useState<string | null>(null);

  const consentMap = new Map(consents.map((c) => [c.purpose, c]));

  async function handleWithdraw(purpose: string) {
    setWithdrawing(purpose);

    const response = await fetch("/api/consent/withdraw", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ purpose, customerId, organizationId }),
    });

    setWithdrawing(null);

    if (response.ok) {
      router.refresh();
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="text-base font-semibold text-slate-900 mb-4">
          Your Consent Status
        </h2>
        <p className="text-sm text-slate-500 mb-4">
          Under the Digital Personal Data Protection Act, 2023, you have the right to
          withdraw consent for data processing at any time.
        </p>
        <div className="space-y-3">
          {Object.entries(PURPOSE_LABELS).map(([purpose, label]) => {
            const consent = consentMap.get(purpose);
            const isGranted = consent?.status === "GRANTED";
            return (
              <div
                key={purpose}
                className="flex items-center justify-between rounded-lg border border-slate-200 p-4"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900">{label}</p>
                  <p className="text-xs text-slate-500">
                    {PURPOSE_DESCRIPTIONS[purpose]}
                  </p>
                  {consent?.grantedAt && isGranted && (
                    <p className="mt-1 text-xs text-green-600">
                      Granted on {new Date(consent.grantedAt).toLocaleDateString("en-IN")}
                    </p>
                  )}
                  {consent?.withdrawnAt && !isGranted && (
                    <p className="mt-1 text-xs text-red-600">
                      Withdrawn on {new Date(consent.withdrawnAt).toLocaleDateString("en-IN")}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      isGranted
                        ? "bg-green-50 text-green-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {isGranted ? "Granted" : "Withdrawn"}
                  </span>
                  {isGranted && (
                    <button
                      onClick={() => handleWithdraw(purpose)}
                      disabled={withdrawing === purpose}
                      className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      {withdrawing === purpose ? "..." : "Withdraw"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {(organization.grievanceOfficerName ||
        organization.grievanceOfficerEmail ||
        organization.grievanceOfficerPhone) && (
        <Card>
          <h2 className="text-base font-semibold text-slate-900 mb-4">
            Grievance Officer
          </h2>
          <p className="text-sm text-slate-500 mb-3">
            For any concerns regarding your personal data, contact the designated
            Grievance Officer:
          </p>
          <div className="rounded-lg bg-slate-50 p-4 space-y-1.5 text-sm">
            {organization.grievanceOfficerName && (
              <p>
                <span className="text-slate-500">Name:</span>{" "}
                <span className="font-medium text-slate-900">
                  {organization.grievanceOfficerName}
                </span>
              </p>
            )}
            {organization.grievanceOfficerEmail && (
              <p>
                <span className="text-slate-500">Email:</span>{" "}
                <a
                  href={`mailto:${organization.grievanceOfficerEmail}`}
                  className="font-medium text-brand-600 hover:underline"
                >
                  {organization.grievanceOfficerEmail}
                </a>
              </p>
            )}
            {organization.grievanceOfficerPhone && (
              <p>
                <span className="text-slate-500">Phone:</span>{" "}
                <span className="font-medium text-slate-900">
                  {organization.grievanceOfficerPhone}
                </span>
              </p>
            )}
          </div>
        </Card>
      )}

      <Card>
        <h2 className="text-base font-semibold text-slate-900 mb-2">
          Your Data Rights
        </h2>
        <p className="text-sm text-slate-500">
          Under DPDPA 2023, you have the right to request access to your data, correction
          of inaccurate data, and erasure of your data (subject to legal retention
          requirements). To exercise these rights, contact the Grievance Officer above or
          your service provider directly.
        </p>
      </Card>

      <Card>
        <h2 className="text-base font-semibold text-slate-900 mb-2">
          Privacy Policy
        </h2>
        <p className="text-sm text-slate-500">
          Read our full{" "}
          <a
            href="/privacy"
            target="_blank"
            className="text-brand-600 hover:underline"
          >
            Privacy Policy
          </a>{" "}
          to understand how {organization.name} collects, processes, and protects your
          personal data.
        </p>
      </Card>
    </div>
  );
}
