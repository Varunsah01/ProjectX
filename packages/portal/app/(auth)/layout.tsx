import { getOrganizationSlug, getOrganizationBySlug } from "@/lib/organization";
import { AuthBrandingProvider } from "@/components/providers/AuthBrandingProvider";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let orgName: string | null = null;
  let orgLogo: string | null = null;

  const slug = await getOrganizationSlug();
  if (slug) {
    const org = await getOrganizationBySlug(slug);
    if (org) {
      orgName = org.name;
      orgLogo = org.logo;
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md">
        <AuthBrandingProvider orgName={orgName} orgLogo={orgLogo}>
          {children}
        </AuthBrandingProvider>
      </div>
    </div>
  );
}
