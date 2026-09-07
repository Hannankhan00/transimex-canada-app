import { ImageResponse } from "next/og";

export const size = { width: 192, height: 192 };
export const contentType = "image/png";

export default function Icon() {
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
          borderRadius: 36,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ display: "flex", width: 112, height: 20, background: "#D9232E", borderRadius: 4 }} />
          <div style={{ display: "flex", width: 20, height: 76, background: "#D9232E", borderRadius: 4 }} />
        </div>
      </div>
    ),
    { ...size }
  );
}
