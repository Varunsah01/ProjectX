/**
 * PageMeta — renders "Last Updated" + owner email at the top of every docs page.
 *
 * Usage in MDX:
 *   import { PageMeta } from "../../components/PageMeta";
 *   <PageMeta lastUpdated="2026-05-04" owner="support@recuring.in" />
 */
export function PageMeta({
  lastUpdated,
  owner,
}: {
  lastUpdated: string;
  owner: string;
}) {
  const formatted = new Date(lastUpdated).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "12px",
        alignItems: "center",
        marginBottom: "24px",
        padding: "8px 12px",
        borderRadius: "6px",
        background: "var(--nextra-colors-gray-100, #f3f4f6)",
        fontSize: "13px",
        color: "var(--nextra-colors-gray-600, #4b5563)",
      }}
    >
      <span>
        <strong>Last updated:</strong> {formatted}
      </span>
      <span style={{ color: "var(--nextra-colors-gray-400, #9ca3af)" }}>·</span>
      <span>
        <strong>Owner:</strong>{" "}
        <a
          href={`mailto:${owner}`}
          style={{ color: "inherit", textDecoration: "underline" }}
        >
          {owner}
        </a>
      </span>
    </div>
  );
}
