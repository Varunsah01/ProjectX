import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Project X — AMC & Service Operations Platform for India";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f766e 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: "80px",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Logo mark */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 64,
            height: 64,
            borderRadius: 16,
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            marginBottom: 40,
          }}
        >
          <span style={{ color: "white", fontSize: 32, fontWeight: 700 }}>X</span>
        </div>

        {/* Headline */}
        <div
          style={{
            fontSize: 64,
            fontWeight: 800,
            color: "white",
            lineHeight: 1.1,
            maxWidth: 800,
            marginBottom: 24,
          }}
        >
          Collect Faster.{" "}
          <span style={{ color: "#5eead4" }}>Serve Better.</span>{" "}
          Renew More Customers.
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 28,
            color: "#94a3b8",
            maxWidth: 700,
            lineHeight: 1.4,
          }}
        >
          The operating system for Indian recurring service businesses.
        </div>

        {/* Domain */}
        <div
          style={{
            position: "absolute",
            bottom: 48,
            right: 80,
            fontSize: 22,
            color: "#64748b",
            fontWeight: 500,
          }}
        >
          recuring.in
        </div>
      </div>
    ),
    { ...size },
  );
}
