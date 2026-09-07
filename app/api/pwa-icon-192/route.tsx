import { ImageResponse } from "next/og";

export async function GET() {
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
          <div style={{ display: "flex", width: 112, height: 20, background: "#D9232E", borderRadius: 4 }} />
          <div style={{ display: "flex", width: 20, height: 76, background: "#D9232E", borderRadius: 4 }} />
        </div>
      </div>
    ),
    { width: 192, height: 192 }
  );
}
