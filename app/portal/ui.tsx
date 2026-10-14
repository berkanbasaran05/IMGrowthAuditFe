"use client";

import { useRef, useState } from "react";
import styles from "./portal.module.css";

// Portal ortak bileşenleri: biçimlendirme, API, tek seriyi gösteren çizgi grafik ve önem rozeti.

export const money = (v: number, currency = "TRY") => new Intl.NumberFormat("tr-TR", { style: "currency", currency, maximumFractionDigits: 0 }).format(v);
export const num = (v: number, d = 0) => new Intl.NumberFormat("tr-TR", { maximumFractionDigits: d }).format(v);
export const pct = (v: number, d = 0) => `%${new Intl.NumberFormat("tr-TR", { maximumFractionDigits: d }).format(v * 100)}`;
export const day = (d: string) => new Date(`${d.slice(0, 10)}T12:00:00`).toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
export const longDay = (d: string) => new Date(`${d.slice(0, 10)}T12:00:00`).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });

export async function papi(path: string, init?: RequestInit) {
  const r = await fetch(`/api/portal${path}`, { credentials: "same-origin", headers: { "Content-Type": "application/json" }, ...init });
  if (r.status === 401) { location.href = "/portal/giris"; throw new Error("Oturum gerekli"); }
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(body.error || "İşlem tamamlanamadı");
  return body;
}

const SEV: Record<string, { label: string; icon: string }> = {
  critical: { label: "Kritik", icon: "M12 8v5M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" },
  warning: { label: "Uyarı", icon: "M12 8v5M12 17h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" },
  info: { label: "Fırsat", icon: "M12 3v18M3 12h18" },
};
// Önem düzeyi rengin yanında simge ve metinle de verilir (yalnızca renge dayanmaz).
export function Severity({ value }: { value: string }) {
  const s = SEV[value] || SEV.info;
  return <span className={`${styles.sev} ${styles["sev_" + value]}`}><svg viewBox="0 0 24 24" aria-hidden="true"><path d={s.icon} /></svg>{s.label}</span>;
}

// Tek seri çizgi grafik: ince çizgi, sade ızgara, üzerine gelince dikey çizgi + değer kutusu. Çift eksen yok.
export function LineChart({ data, format, title }: { data: { date: string; value: number }[]; format: (v: number) => string; title: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const ref = useRef<SVGSVGElement>(null);
  if (data.length < 2) return <div className={styles.chartEmpty}>Grafik için yeterli veri yok</div>;
  const W = 640, H = 170, L = 8, R = 8, T = 12, B = 22;
  const max = Math.max(...data.map((d) => d.value)) * 1.1 || 1;
  const x = (i: number) => L + (i / (data.length - 1)) * (W - L - R);
  const y = (v: number) => T + (1 - v / max) * (H - T - B);
  const path = data.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(d.value).toFixed(1)}`).join("");
  const move = (e: React.MouseEvent) => {
    const box = ref.current!.getBoundingClientRect(), px = ((e.clientX - box.left) / box.width) * W;
    setHover(Math.max(0, Math.min(data.length - 1, Math.round(((px - L) / (W - L - R)) * (data.length - 1)))));
  };
  const h = hover != null ? data[hover] : null;
  return <figure className={styles.chart}>
    <figcaption>{title}</figcaption>
    <div className={styles.chartBox}>
      <svg ref={ref} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${title}: son ${data.length} gün`} onMouseMove={move} onMouseLeave={() => setHover(null)}>
        {[0.5, 1].map((f) => <line key={f} x1={L} x2={W - R} y1={y(max / 1.1 * f)} y2={y(max / 1.1 * f)} className={styles.grid} />)}
        <line x1={L} x2={W - R} y1={y(0)} y2={y(0)} className={styles.axis} />
        <path d={path} className={styles.line} />
        {h && <><line x1={x(hover!)} x2={x(hover!)} y1={T} y2={y(0)} className={styles.cross} /><circle cx={x(hover!)} cy={y(h.value)} r={4.5} className={styles.dot} /></>}
        <text x={L} y={H - 4} className={styles.tick}>{day(data[0].date)}</text>
        <text x={W - R} y={H - 4} textAnchor="end" className={styles.tick}>{day(data[data.length - 1].date)}</text>
        <text x={W - R} y={y(max / 1.1) - 4} textAnchor="end" className={styles.tick}>{format(max / 1.1)}</text>
      </svg>
      {h && <div className={styles.tip} style={{ left: `${(x(hover!) / W) * 100}%` }}><b>{format(h.value)}</b><span>{day(h.date)}</span></div>}
    </div>
  </figure>;
}
