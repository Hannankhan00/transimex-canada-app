import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#ffffff",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ display: "flex", width: 105, height: 19, background: "#D9232E", borderRadius: 4 }} />
          <div style={{ display: "flex", width: 19, height: 71, background: "#D9232E", borderRadius: 4 }} />
        </div>
      </div>
    ),
    { ...size }
  );
}
