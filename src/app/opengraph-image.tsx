import { ImageResponse } from "next/og";
import { brand } from "@/lib/config";

export const alt = `${brand.name} : gestion des congés pour PME et restaurants`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  const cells = [0.9, 1, 0.9, 0.9, 0.9, 0.35];
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#14213d", color: "white", padding: 72 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ display: "flex", flexWrap: "wrap", width: 78, gap: 6 }}>
            {cells.map((o, i) => (
              <div key={i} style={{ width: 22, height: 26, borderRadius: 5, background: i === 1 ? "#f2c230" : "white", opacity: o }} />
            ))}
          </div>
          <div style={{ fontSize: 44, fontWeight: 700 }}>{brand.name}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 76, fontWeight: 700, lineHeight: 1.02, maxWidth: 980 }}>Les congés de l&apos;équipe, sans Excel ni e-mails perdus</div>
          <div style={{ fontSize: 32, color: "rgba(255,255,255,0.75)" }}>Soldes calculés selon le Code du travail. Pack hôtellerie-restauration.</div>
        </div>
        <div style={{ display: "flex", height: 14, width: 260, background: "#f2c230", borderRadius: 7 }} />
      </div>
    ),
    size,
  );
}
