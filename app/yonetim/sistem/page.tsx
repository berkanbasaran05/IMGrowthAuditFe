"use client";

import { Fragment, useEffect, useState } from "react";
import AdminHeader from "../AdminHeader";
import styles from "../growth-manager/gm.module.css";
import s from "./sistem.module.css";

// Sistem durumu: kuyruk, zamanlayıcı, entegrasyon hataları, AI/API maliyeti (30 gün), e-posta limiti, veri saklama.
const FEATURE: Record<string, string> = { ai: "AI analisti (Claude)", pagespeed: "Google PageSpeed anahtarı", smtp: "SMTP e-posta", googleOAuth: "Google OAuth", googleAds: "Google Ads geliştirici belirteci", integrationEncryption: "Belirteç şifreleme anahtarı", telegram: "Telegram bildirimleri" };
const AUDIT: Record<string, string> = { queued: "Sırada", running: "Çalışıyor", completed: "Tamamlandı", failed: "Başarısız", no_verified_website: "Site yok" };
const FEAT_AI: Record<string, string> = { growth_audit: "Growth Audit analisti", sales_drafts: "Mail ve arama brifi", daily_briefs: "Günlük brif özeti" };
const when = (d?: string | null) => (d ? new Date(d).toLocaleString("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "–");
const usd = (v: number) => new Intl.NumberFormat("tr-TR", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(v);

export default function Sistem() {
  const [d, setD] = useState<any>(null), [err, setErr] = useState(""), [busy, setBusy] = useState(false), [confirm, setConfirm] = useState(false);
  const load = () => fetch("/api/ops/status", { credentials: "same-origin" }).then(async (r) => { if (r.status === 401) { location.href = "/login"; return; } const b = await r.json(); if (!r.ok) throw new Error(b.error); setD(b); }).catch((e) => setErr(e.message));
  useEffect(() => { load(); const t = setInterval(load, 30_000); return () => clearInterval(t); }, []);
  async function retention() {
    setBusy(true); setConfirm(false);
    try { const r = await fetch("/api/ops/retention/run", { method: "POST", credentials: "same-origin" }); if (!r.ok) throw new Error("Çalıştırılamadı"); await load(); } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }
  return <main className={styles.shell}>
    <AdminHeader active="sistem" />
    <section className={styles.content}>
      <div className={styles.title}><div><span>Operasyon</span><h1>Sistem durumu</h1><p>Arka plan işleri, entegrasyon hataları, AI ve API kullanım maliyeti, veri saklama. 30 saniyede bir yenilenir.</p></div></div>
      {err && <div className={styles.err}>{err}<button onClick={() => setErr("")}>×</button></div>}
      {!d ? <p>Yükleniyor…</p> : <div className={s.grid}>
        <section className={s.card}><h3>Uygulama</h3>
          <dl><dt>Sürüm</dt><dd>{d.version} · {d.env}</dd><dt>Node</dt><dd>{d.node}</dd><dt>Çalışma süresi</dt><dd>{Math.round(d.uptimeSec / 60)} dk</dd><dt>Veritabanı</dt><dd>{d.database.size} · {d.database.lastMigration}</dd></dl>
          {d.configErrors.length > 0 && <ul className={s.bad}>{d.configErrors.map((e: string) => <li key={e}>{e}</li>)}</ul>}
          {d.configWarnings.length > 0 && <ul className={s.warn}>{d.configWarnings.map((e: string) => <li key={e}>{e}</li>)}</ul>}
        </section>
        <section className={s.card}><h3>Özellikler</h3>
          <ul className={s.flags}>{Object.entries(d.features).map(([k, v]) => <li key={k}><span className={v ? s.on : s.off}>{v ? "✓ Açık" : "✕ Kapalı"}</span>{FEATURE[k] || k}</li>)}</ul>
        </section>
        <section className={s.card}><h3>Growth Audit kuyruğu</h3>
          <dl>{Object.entries(d.auditQueue.byStatus).map(([k, v]) => <Fragment key={k}><dt>{AUDIT[k] || k}</dt><dd>{String(v)}</dd></Fragment>)}
            <dt>Ortalama süre</dt><dd>{d.auditQueue.avgDurationSec != null ? `${d.auditQueue.avgDurationSec} sn` : "–"}</dd>
            <dt>Etkin iş</dt><dd>{d.auditQueue.active} · işçi {d.auditQueue.worker ? "açık" : "kapalı"}</dd><dt>Son yoklama</dt><dd>{when(d.auditQueue.lastTick)}</dd>
            <dt>En eski bekleyen</dt><dd>{when(d.auditQueue.oldestQueued)}</dd></dl>
          {d.auditQueue.failedLast24h.length > 0 && <><h4>Son 24 saatte başarısız</h4><ul className={s.bad}>{d.auditQueue.failedLast24h.map((f: any, i: number) => <li key={i}>{f.leadId}: {f.error}</li>)}</ul></>}
        </section>
        <section className={s.card}><h3>Zamanlayıcı ve entegrasyonlar</h3>
          <dl><dt>Zamanlayıcı</dt><dd>{d.scheduler.worker ? "açık" : "kapalı"}{d.scheduler.lastTick ? ` · son ${when(d.scheduler.lastTick.at)}${d.scheduler.lastTick.ok ? "" : " (hata)"}` : " · henüz çalışmadı"}</dd>
            {Object.entries(d.integrations.byStatus).map(([k, v]) => <Fragment key={k}><dt>Entegrasyon: {k}</dt><dd>{String(v)}</dd></Fragment>)}</dl>
          {d.integrations.errors.length > 0 ? <ul className={s.bad}>{d.integrations.errors.map((e: any, i: number) => <li key={i}><b>{e.org}</b> · {e.provider}: {e.error}</li>)}</ul> : <p className={s.ok}>Entegrasyon hatası yok.</p>}
        </section>
        <section className={s.card}><h3>Maliyet (son 30 gün)</h3>
          <table className={s.table}><thead><tr><th>AI kullanımı</th><th>Çağrı</th><th>Token (giriş/çıkış)</th><th>Tutar</th></tr></thead>
            <tbody>{d.costs30d.ai.map((r: any) => <tr key={r.feature}><td>{FEAT_AI[r.feature] || r.feature}</td><td>{r.calls}</td><td>{r.input.toLocaleString("tr-TR")} / {r.output.toLocaleString("tr-TR")}</td><td>{usd(Number(r.cost))}</td></tr>)}</tbody>
            <tfoot><tr><td>Toplam</td><td colSpan={2} /><td><b>{usd(d.costs30d.aiTotalUsd)}</b></td></tr></tfoot></table>
          <p className={s.muted}>Google PageSpeed: {d.costs30d.pagespeed.runs} denetimde çağrıldı, {d.costs30d.pagespeed.ok} başarılı (ücretsiz kota). Tutarlar model liste fiyatıyla tahmindir.</p>
        </section>
        <section className={s.card}><h3>E-posta ve konumlar</h3>
          <dl><dt>Bugün gönderilen</dt><dd>{d.email.sentToday} / {d.email.dailyLimit}{d.email.dryRun ? " (kuru çalışma)" : ""}</dd>
            {d.geo && <><dt>Firma konumları</dt><dd>{d.geo.located}/{d.geo.total}{d.geo.running ? ` · hesaplanıyor ${d.geo.progress.done}/${d.geo.progress.total}` : ""}</dd></>}</dl>
        </section>
        <section className={s.card}><h3>Veri saklama</h3>
          <dl>{Object.entries(d.retention.policyDays).map(([k, v]) => <Fragment key={k}><dt>{({ screenshots: "Ekran görüntüleri", metrics: "Günlük metrikler", syncs: "Eşitleme kayıtları", reportLinks: "Biten rapor bağlantıları", discardedDrafts: "Silinmiş taslaklar", closedInsights: "Kapanan içgörüler", briefs: "Günlük brifler" } as any)[k]}</dt><dd>{String(v)} gün</dd></Fragment>)}</dl>
          <p className={s.muted}>Son çalışma: {d.retention.lastRun ? `${when(d.retention.lastRun.at)} · ${Object.values(d.retention.lastRun.deleted as Record<string, number>).reduce((a, b) => a + b, 0)} kayıt silindi` : "henüz çalışmadı"} · her gün 03:00 sonrası otomatik.</p>
          {confirm ? <div className={s.confirm}><span>Süresi dolan kayıtlar kalıcı olarak silinecek.</span><button className={styles.primarySm} disabled={busy} onClick={retention}>Evet, çalıştır</button><button className={styles.secondary} onClick={() => setConfirm(false)}>Vazgeç</button></div>
            : <button className={styles.secondary} disabled={busy} onClick={() => setConfirm(true)}>Şimdi çalıştır</button>}
        </section>
      </div>}
    </section>
  </main>;
}
