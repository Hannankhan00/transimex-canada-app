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
          <div style={{ display: "flex", width: 299, height: 53, background: "#D9232E", borderRadius: 11 }} />
          <div style={{ display: "flex", width: 53, height: 203, background: "#D9232E", borderRadius: 11 }} />
        </div>
      </div>
    ),
    { width: 512, height: 512 }
  );
}
