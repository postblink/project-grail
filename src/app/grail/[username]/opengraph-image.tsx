import { ImageResponse } from "next/og";
import { getPublicGrailData, computeProgress } from "@/lib/grail";

export const runtime = "nodejs";
export const contentType = "image/png";
export const size = { width: 1200, height: 630 };

export default async function OgImage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const data = await getPublicGrailData(username);

  const displayName = data?.user.display_name ?? username;
  const progress = data ? computeProgress(data.items) : null;
  const seasonName = data?.season?.name ?? null;

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          background: "#09090b",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "flex-start",
          padding: "80px",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* Ambient top glow */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "300px",
            background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(196,163,82,0.25) 0%, transparent 70%)",
          }}
        />

        {/* Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "48px" }}>
          <span style={{ fontSize: "22px", color: "#71717a", letterSpacing: "0.05em" }}>
            Project{" "}
            <span style={{ color: "#f59e0b" }}>Grail</span>
          </span>
          {seasonName && (
            <>
              <span style={{ color: "#3f3f46", fontSize: "18px" }}>·</span>
              <span style={{ fontSize: "18px", color: "#52525b" }}>{seasonName}</span>
            </>
          )}
        </div>

        {/* Display name */}
        <div style={{ fontSize: "72px", fontWeight: 700, color: "#f4f4f5", lineHeight: 1.1, marginBottom: "32px" }}>
          {displayName}'s Grail
        </div>

        {/* Progress */}
        {progress && progress.total > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", width: "100%" }}>
            {/* Progress bar */}
            <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
              <div
                style={{
                  flex: 1,
                  height: "10px",
                  background: "#27272a",
                  borderRadius: "99px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${progress.pct}%`,
                    height: "100%",
                    background: "#f59e0b",
                    borderRadius: "99px",
                  }}
                />
              </div>
            </div>
            {/* Stats */}
            <div style={{ display: "flex", alignItems: "baseline", gap: "12px" }}>
              <span style={{ fontSize: "56px", fontWeight: 700, color: "#f4f4f5" }}>
                {progress.pct}%
              </span>
              <span style={{ fontSize: "24px", color: "#71717a" }}>
                {progress.found} / {progress.total} items found
              </span>
            </div>
          </div>
        ) : (
          <div style={{ fontSize: "28px", color: "#52525b" }}>
            Just starting their grail journey
          </div>
        )}

        {/* Footer URL */}
        <div style={{ position: "absolute", bottom: "48px", right: "80px", fontSize: "18px", color: "#3f3f46" }}>
          pd2grail.com
        </div>
      </div>
    ),
    { ...size }
  );
}
