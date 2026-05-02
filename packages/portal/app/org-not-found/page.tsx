export default function OrgNotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold text-slate-900">
          Organization not found
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          The organization you&apos;re looking for doesn&apos;t exist or is no longer
          available. Please check the URL and try again.
        </p>
      </div>
    </div>
  );
}
