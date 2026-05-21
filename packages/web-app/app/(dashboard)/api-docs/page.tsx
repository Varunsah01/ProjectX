import Link from "next/link";
import { ArrowRight, FileCode } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";

const API_DOCS = [
  {
    href: "/api-docs/mobile/v1",
    title: "Mobile API",
    version: "v1",
    description:
      "OpenAPI reference for the mobile client surface. Interactive Swagger UI.",
  },
];

export default function ApiDocsIndexPage() {
  return (
    <div>
      <PageHeader
        title="API Documentation"
        subtitle="Reference documentation for available APIs."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {API_DOCS.map((doc) => (
          <Link
            key={doc.href}
            href={doc.href}
            className="group block rounded-xl border border-slate-200 bg-white p-5 transition-all hover:border-brand-300 hover:shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <FileCode className="h-5 w-5" />
              </div>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                {doc.version}
              </span>
            </div>
            <h3 className="mt-4 font-semibold text-slate-900">{doc.title}</h3>
            <p className="mt-1 text-sm text-slate-500">{doc.description}</p>
            <div className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand-600 transition-colors group-hover:text-brand-700">
              Open Swagger UI
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
