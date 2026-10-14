"use client";

import { useEffect, useState } from "react";
import styles from "./portal.module.css";
import { day, LineChart, longDay, money, num, papi, pct, Severity } from "./ui";

// Istanbul Marketing AI Growth Manager™ — müşteri portalı. Tüm veriler bağlı kaynaklardan gelir;
// bağlantı yoksa boş durum, demo organizasyonda açıkça "DEMO" etiketi gösterilir.

type Me = { email: string; name: string | null; role: string; canManage: boolean; preview: boolean; org: { name: string; isDemo: boolean } };
type Tab = "genel" | "icgoruler" | "brif" | "audit" | "odemeler" | "sozlesme" | "entegrasyonlar" | "eylemler";
const TABS: [Tab, string][] = [["genel", "Genel bakış"], ["icgoruler", "AI içgörüler"], ["brif", "Günlük brif"], ["audit", "Growth Audit"], ["odemeler", "Ödemeler"], ["sozlesme", "Sözleşme"], ["entegrasyonlar", "Entegrasyonlar"], ["eylemler", "Onaylar"]];
const CATEGORY: Record<string, string> = { tracking: "Ölçüm / izleme", performance: "Reklam performansı", budget: "Bütçe", search: "Arama görünürlüğü", website: "Web sitesi", funnel: "Dönüşüm hunisi" };
const HEALTH: Record<string, { label: string; cls: string }> = { good: { label: "İyi", cls: "good" }, attention: { label: "Dikkat", cls: "warning" }, critical: { label: "Kritik", cls: "critical" } };

export default function Portal() {
  const [me, setMe] = useState<Me | null>(null);
  const [tab, setTab] = useState<Tab>("genel");
  const [error, setError] = useState("");
  useEffect(() => {
    const q = new URLSearchParams(location.search), t = q.get("tab") as Tab | null;
    if (t && TABS.some(([k]) => k === t)) setTab(t);
    papi("/me").then(setMe).catch((e) => setError(e.message));
  }, []);
  async function logout() { await fetch("/api/portal/logout", { method: "POST" }).catch(() => {}); location.href = "/portal/giris"; }
  if (!me) return <main className={styles.shell}><div className={styles.loading}>{error || "Yükleniyor…"}</div></main>;

  return <main className={styles.shell}>
    <header className={styles.header}>
      <div className={styles.brand}><img src="/brand/logo-wordmark-on-light.png" alt="istanbul.marketing" /><span>AI Growth Manager™</span></div>
      <div className={styles.who}><b>{me.org.name}</b><small>{me.name || me.email}</small></div>
      <button className={styles.ghost} onClick={logout}>{me.preview ? "Önizlemeyi kapat" : "Çıkış"}</button>
    </header>
    {me.org.isDemo && <div className={styles.demoBar}>DEMO VERİ — Bu organizasyondaki tüm rakamlar örnek amaçlıdır; gerçek bir hesaba ait değildir.</div>}
    {me.preview && <div className={styles.previewBar}>Istanbul Marketing önizlemesi · salt okunur</div>}
    <nav className={styles.tabs} role="tablist">{TABS.map(([k, t]) => <button key={k} role="tab" aria-selected={tab === k} onClick={() => { setTab(k); history.replaceState(null, "", `?tab=${k}`); }}>{t}</button>)}</nav>
    <section className={styles.content}>
      {tab === "genel" && <Overview onTab={setTab} />}
      {tab === "icgoruler" && <Insights canManage={me.canManage} />}
      {tab === "brif" && <Brief />}
      {tab === "audit" && <Audit />}
      {tab === "odemeler" && <Payments />}
      {tab === "sozlesme" && <Contracts />}
      {tab === "entegrasyonlar" && <Integrations canManage={me.canManage} demo={me.org.isDemo} />}
      {tab === "eylemler" && <Actions canManage={me.canManage} />}
    </section>
    <footer className={styles.footer}>Öneriler veriye dayanır ve garanti içermez. Reklam hesabınızda veya sitenizde onayınız olmadan değişiklik yapılmaz.</footer>
  </main>;
}

function useLoad<T>(path: string): [T | null, string, () => void] {
  const [data, setData] = useState<T | null>(null), [err, setErr] = useState(""), [n, setN] = useState(0);
  useEffect(() => { papi(path).then(setData).catch((e) => setErr(e.message)); }, [path, n]);
  return [data, err, () => setN((x) => x + 1)];
}

function fmtKpi(k: any, v: number, currency: string) { return k.unit === "money" ? money(v, currency) : k.unit === "ratio" ? pct(v, 1) : num(v, v < 100 ? 1 : 0); }
const LOWER_BETTER = new Set(["ads_cpa"]);

function Overview({ onTab }: { onTab: (t: Tab) => void }) {
  const [d, err] = useLoad<any>("/overview");
  if (!d) return <p className={styles.muted}>{err || "Yükleniyor…"}</p>;
  const cur = d.org.currency;
  const connected = d.integrations.filter((i: any) => i.status === "connected" || i.status === "demo");
  const openCount = (kind: string) => d.counts.filter((c: any) => c.kind === kind).reduce((s: number, c: any) => s + c.count, 0);
  const charts: [string, string, (v: number) => string][] = [["adsCost", "Reklam harcaması (günlük)", (v) => money(v, cur)], ["adsConversions", "Reklam dönüşümü (günlük)", (v) => num(v, 1)], ["sessions", "Site oturumu (günlük)", (v) => num(v)], ["keyEvents", "Talepler / hedef olay (günlük)", (v) => num(v)], ["organicClicks", "Organik tıklama (günlük)", (v) => num(v)]];
  return <>
    {!connected.length && <div className={styles.emptyCard}><b>Henüz veri kaynağı bağlı değil</b><p>Google Ads, Google Analytics 4 veya Search Console bağlandığında harcama, talepler ve fırsatlar burada görünür. Rakamlar yalnızca bağlı kaynaklardan gelir.</p><button className={styles.primary} onClick={() => onTab("entegrasyonlar")}>Entegrasyonlara git</button></div>}
    {d.kpis.length > 0 && <>
      <h2 className={styles.h2}>Son 7 gün <small>{d.dataThrough ? `${longDay(d.dataThrough)} tarihine kadar veri · önceki 7 güne göre` : ""}</small></h2>
      <div className={styles.kpis}>{d.kpis.map((k: any) => {
        // ±%15 altındaki değişimler renklendirilmez (önemsiz dalgalanmayı büyütmemek için).
        const up = k.current > k.previous, minor = k.change == null || Math.abs(k.change) < 0.15, good = k.key === "ads_cost" || minor ? null : LOWER_BETTER.has(k.key) ? !up : up;
        return <div key={k.key} className={styles.kpi}><span>{k.label}</span><b>{fmtKpi(k, k.current, cur)}</b>
          <small className={k.change == null || good == null ? "" : good ? styles.up : styles.down}>{k.change == null ? "Önceki dönem verisi yok" : `${up ? "▲" : "▼"} %${num(Math.abs(k.change) * 100)} · önceki ${fmtKpi(k, k.previous, cur)}`}</small></div>;
      })}</div>
    </>}
    <div className={styles.split}>
      <div>
        <h2 className={styles.h2}>Önemli uyarılar</h2>
        {d.alerts.length ? d.alerts.map((a: any) => <div key={a.id} className={styles.alert}><Severity value={a.severity} /><div><b>{a.title}</b><p>{a.explanation}</p></div></div>)
          : <div className={styles.calm}>Kritik bir uyarı yok.</div>}
        <div className={styles.counts}><button onClick={() => onTab("icgoruler")}><b>{openCount("money_leak")}</b>olası para kaçağı</button><button onClick={() => onTab("icgoruler")}><b>{openCount("growth_opportunity")}</b>büyüme fırsatı</button></div>
      </div>
      <div>
        <h2 className={styles.h2}>Growth Score™</h2>
        {d.growthScore ? <div className={styles.score}><b>{d.growthScore.score == null ? "–" : Math.round(d.growthScore.score)}</b><span>/ 100 · kapsam {pct(d.growthScore.coverage)}</span><small>{d.growthScore.date ? `Son denetim ${longDay(d.growthScore.date)}` : ""}</small><button className={styles.link} onClick={() => onTab("audit")}>Ayrıntılar →</button></div>
          : <div className={styles.calm}>Web sitesi denetimi henüz yapılmadı.</div>}
      </div>
    </div>
    {Object.keys(d.series).length > 0 && <>
      <h2 className={styles.h2}>Son 28 gün</h2>
      <div className={styles.charts}>{charts.filter(([k]) => d.series[k]?.length).map(([k, t, f]) => <LineChart key={k} data={d.series[k]} title={t} format={f} />)}</div>
    </>}
  </>;
}

function Impact({ i, currency = "TRY" }: { i: any; currency?: string }) {
  const e = i.estimatedImpact; if (!e) return <span className={styles.muted}>Parasal etki hesaplanmadı (yeterli veri yok veya gerekçelendirilemiyor).</span>;
  const range = (a: string, b: string) => (a === b ? a : `${a}–${b}`);
  const val = e.type === "money" ? range(money(e.low, e.currency || currency), money(e.high, e.currency || currency)) : `+${range(num(e.low, 1), num(e.high, 1))} ${e.type === "clicks" ? "tıklama" : e.type === "conversions" ? "dönüşüm" : "talep"}`;
  return <span><b>{val}</b> · {e.period} · {e.basis}</span>;
}

function InsightCard({ i, canManage, onStatus }: { i: any; canManage: boolean; onStatus: (id: string, s: string) => void }) {
  const [open, setOpen] = useState(false);
  return <article className={styles.insight}>
    <div className={styles.iHead}><Severity value={i.severity} /><span className={styles.cat}>{CATEGORY[i.category] || i.category}</span>{i.status === "acknowledged" && <span className={styles.cat}>Görüldü</span>}<span className={styles.conf}>Güven {pct(i.confidence)}</span></div>
    <h3>{i.title}</h3>
    <p>{i.explanation}</p>
    <ul className={styles.evidence}>{i.evidence.map((e: any, k: number) => <li key={k}><span>{e.label}</span><b>{e.value}</b><small>{e.source}</small></li>)}</ul>
    <div className={styles.impact}><span>Tahmini etki:</span> <Impact i={i} /></div>
    <div className={styles.action}><b>Önerilen adım:</b> {i.suggestedAction}</div>
    {i.assumptions?.length > 0 && <button className={styles.link} onClick={() => setOpen(!open)}>{open ? "Varsayımları gizle" : "Varsayımlar ve sınırlamalar"}</button>}
    {open && <ul className={styles.assume}>{i.assumptions.map((a: string, k: number) => <li key={k}>{a}</li>)}</ul>}
    <div className={styles.iFoot}><small>{longDay(i.periodStart)} – {longDay(i.periodEnd)}</small>
      {canManage && <span>{i.status !== "acknowledged" && <button onClick={() => onStatus(i.id, "acknowledged")}>Gördüm</button>}<button onClick={() => onStatus(i.id, "resolved")}>Çözüldü</button><button onClick={() => onStatus(i.id, "dismissed")}>Gizle</button></span>}</div>
  </article>;
}

function Insights({ canManage }: { canManage: boolean }) {
  const [list, err, reload] = useLoad<any[]>("/insights");
  const [msg, setMsg] = useState("");
  async function status(id: string, s: string) { try { await papi(`/insights/${id}`, { method: "PATCH", body: JSON.stringify({ status: s }) }); reload(); } catch (e: any) { setMsg(e.message); } }
  if (!list) return <p className={styles.muted}>{err || "Yükleniyor…"}</p>;
  const open = list.filter((i) => i.status === "open" || i.status === "acknowledged");
  const done = list.filter((i) => i.status === "resolved");
  const group = (kind: string, title: string, q: string) => {
    const items = open.filter((i) => i.kind === kind);
    return <section><h2 className={styles.h2}>{title} <small>{q}</small></h2>{items.length ? items.map((i) => <InsightCard key={i.id} i={i} canManage={canManage} onStatus={status} />) : <div className={styles.calm}>Şu an kayda değer bir bulgu yok.</div>}</section>;
  };
  return <>
    {msg && <div className={styles.err}>{msg}</div>}
    {group("money_leak", "Para kaçağı dedektörü", "İşletme nerede para kaybediyor olabilir?")}
    {group("growth_opportunity", "Büyüme fırsatları", "İşletme nerede büyüyebilir?")}
    {done.length > 0 && <section><h2 className={styles.h2}>Tamamlanan öneriler</h2>{done.map((i) => <div key={i.id} className={styles.doneRow}>✓ {i.title}</div>)}</section>}
    <p className={styles.note}>Atfedilmiş dönüşüm olmaması tek başına boşa harcama anlamına gelmez; izleme sorunları performans sorunlarından ayrı gösterilir. Önemsiz dalgalanmalar için uyarı üretilmez.</p>
  </>;
}

function Brief() {
  const [d, err] = useLoad<any>("/briefs");
  if (!d) return <p className={styles.muted}>{err || "Yükleniyor…"}</p>;
  if (!d.latest) return <div className={styles.emptyCard}><b>Henüz günlük brif yok</b><p>Brif her sabah 07:00'den sonra hazırlanır.</p></div>;
  const b = d.latest.content, h = HEALTH[b.health.status] || HEALTH.attention;
  return <>
    <div className={styles.briefHead}><div><span className={styles.muted}>{longDay(d.latest.briefDate)}{b.dataThrough ? ` · veriler ${longDay(b.dataThrough)} tarihine kadar` : ""}</span><h2>Günlük eylem brifi</h2></div><span className={`${styles.health} ${styles["h_" + h.cls]}`}>İşletme sağlığı: {h.label}</span></div>
    <p className={styles.summary}>{b.health.summary}{d.latest.source === "ai" && <small> (AI özeti, yalnızca yukarıdaki ölçülmüş verilere dayanır)</small>}</p>
    <h2 className={styles.h2}>Bugünün 3 önemli işi</h2>
    {b.actions.length ? <ol className={styles.actions}>{b.actions.map((a: any, k: number) => <li key={a.insightId}><span>{k + 1}</span><div><b>{a.title}</b><p>{a.action}</p><small>Neden: {a.reason}</small></div></li>)}</ol> : <div className={styles.calm}>Bugün için öncelikli bir iş yok.</div>}
    <div className={styles.split}>
      <div><h2 className={styles.h2}>Önemli değişimler</h2>{b.changes.length ? <ul className={styles.changes}>{b.changes.map((c: any, k: number) => <li key={k}>{c.direction === "up" ? "▲" : "▼"} {c.text}</li>)}</ul> : <div className={styles.calm}>Kayda değer bir değişim yok (±%15 altı dalgalanmalar gösterilmez).</div>}</div>
      <div><h2 className={styles.h2}>En büyük fırsatlar</h2>{b.opportunities.length ? <ul className={styles.changes}>{b.opportunities.map((o: any) => <li key={o.insightId}><b>{o.title}</b>{o.impact ? ` · ${o.impact}` : ""}</li>)}</ul> : <div className={styles.calm}>Şu an öne çıkan fırsat yok.</div>}</div>
    </div>
    {b.alerts.length > 0 && <><h2 className={styles.h2}>Kritik uyarılar</h2>{b.alerts.map((a: any) => <div key={a.insightId} className={styles.alert}><Severity value="critical" /><div><b>{a.title}</b><p>{a.reason}</p></div></div>)}</>}
    {b.missingSources.length > 0 && <p className={styles.note}>Bağlı olmayan kaynaklar: {b.missingSources.join(", ")}. Bağlandığında brif daha kapsamlı olur.</p>}
    {d.history.length > 1 && <p className={styles.note}>Önceki brifler: {d.history.slice(1, 8).map((x: any) => day(x.date)).join(" · ")}</p>}
  </>;
}

function Audit() {
  const [d, err] = useLoad<any>("/audit");
  if (!d) return <p className={styles.muted}>{err || "Yükleniyor…"}</p>;
  if (!d.linked || !d.report) return <div className={styles.emptyCard}><b>Growth Audit henüz yok</b><p>Istanbul Marketing ekibi web sitenizin denetimini tamamladığında Growth Score, kategori puanları ve öncelikli iyileştirmeler burada görünür.</p></div>;
  const r = d.report;
  return <>
    <div className={styles.split}>
      <div className={styles.score}><b>{r.score == null ? "–" : Math.round(r.score)}</b><span>Growth Score™ / 100 · kapsam {pct(r.coverage || 0)} · güven {pct(r.confidence || 0)}</span><small>Denetim {longDay(r.auditDate)}</small></div>
      <div>{d.history.length > 1 ? <LineChart title="Growth Score geçmişi" data={d.history.filter((h: any) => h.score != null).map((h: any) => ({ date: h.date, value: h.score }))} format={(v) => num(v)} /> : <p className={styles.muted}>Geçmiş, ikinci denetimden sonra görünür.</p>}</div>
    </div>
    <h2 className={styles.h2}>Kategori puanları</h2>
    <div className={styles.cats}>{r.categories.map((c: any) => <div key={c.id}><span>{c.name}</span><div className={styles.bar}><i style={{ width: `${c.score ?? 0}%` }} /></div><b>{c.score == null ? "–" : Math.round(c.score)}</b></div>)}</div>
    {r.opportunities.length > 0 && <><h2 className={styles.h2}>Öncelikli iyileştirmeler</h2>{r.opportunities.slice(0, 6).map((o: any, k: number) => <div key={k} className={styles.alert}><Severity value={o.priority === "critical" ? "critical" : o.priority === "high" ? "warning" : "info"} /><div><b>{o.title.replace(/ iyileştirilmeli$/, "")}</b><p>{o.problem}</p><p><b>Önerilen adım:</b> {o.action}</p></div></div>)}</>}
    {d.completed?.length > 0 && <><h2 className={styles.h2}>Tamamlanan iyileştirmeler</h2>{d.completed.map((c: any, k: number) => <div key={k} className={styles.doneRow}>✓ {c.title}</div>)}</>}
    {r.roadmap.some((p: any) => p.items.length) && <><h2 className={styles.h2}>30 / 60 / 90 gün planı</h2><div className={styles.road}>{r.roadmap.map((p: any) => <div key={p.phase}><b>{p.phase}</b>{p.items.length ? <ul>{p.items.map((i: any, k: number) => <li key={k}>{i.title}</li>)}</ul> : <p className={styles.muted}>Ek iş yok.</p>}</div>)}</div></>}
  </>;
}

const ISTATUS: Record<string, string> = { connected: "Bağlı", pending: "Hesap seçilmeli", error: "Bağlantı hatası", disconnected: "Bağlı değil", not_connected: "Bağlı değil", demo: "Demo veri", coming_soon: "Yakında" };
function Integrations({ canManage, demo }: { canManage: boolean; demo: boolean }) {
  const [list, err, reload] = useLoad<any[]>("/integrations");
  const [msg, setMsg] = useState<string>("");
  const [accounts, setAccounts] = useState<{ id: string; list: any[] } | null>(null);
  useEffect(() => {
    const q = new URLSearchParams(location.search), b = q.get("baglanti");
    if (b === "tamam") setMsg("Hesap bağlandı; veriler eşitleniyor.");
    if (b === "hesap-sec") setMsg("Bağlantı alındı; kullanılacak hesabı seçin.");
    if (b === "hata") setMsg(q.get("mesaj") || "Bağlantı tamamlanamadı.");
  }, []);
  const run = async (w: () => Promise<unknown>) => { setMsg(""); try { await w(); reload(); } catch (e: any) { setMsg(e.message); } };
  if (!list) return <p className={styles.muted}>{err || "Yükleniyor…"}</p>;
  return <>
    <h2 className={styles.h2}>Veri kaynakları <small>Yalnızca okuma yetkisi istenir; erişim belirteçleri şifrelenerek saklanır.</small></h2>
    {msg && <div className={styles.info}>{msg}</div>}
    <div className={styles.integrations}>{list.map((i) => <div key={i.provider} className={styles.integ}>
      <div><b>{i.name}</b><small>{ISTATUS[i.status] || i.status}{i.account ? ` · ${i.account}` : ""}</small>{i.lastSyncAt && <small>Son eşitleme {new Date(i.lastSyncAt).toLocaleString("tr-TR")}</small>}{i.lastError && <small className={styles.errText}>{i.lastError}</small>}</div>
      {canManage && !demo && i.provider !== "crm" && <div className={styles.iActs}>
        {["not_connected", "disconnected", "error"].includes(i.status) && (i.configured ? <button className={styles.primary} onClick={() => run(async () => { const r = await papi(`/integrations/${i.provider}/connect`, { method: "POST" }); location.href = r.url; })}>Bağla</button> : <small className={styles.muted}>Istanbul Marketing ekibi etkinleştirecek</small>)}
        {i.status === "pending" && <button onClick={() => run(async () => setAccounts({ id: i.id, list: await papi(`/integrations/${i.id}/accounts`) }))}>Hesap seç</button>}
        {["connected", "pending", "error"].includes(i.status) && i.id && <button onClick={() => run(() => papi(`/integrations/${i.id}/disconnect`, { method: "POST" }))}>Bağlantıyı kaldır</button>}
      </div>}
      {accounts?.id === i.id && <div className={styles.accounts}>{accounts?.list.map((a) => <button key={a.id} onClick={() => run(async () => { await papi(`/integrations/${i.id}/account`, { method: "POST", body: JSON.stringify({ accountId: a.id }) }); setAccounts(null); })}>{a.name}</button>)}</div>}
    </div>)}</div>
    <p className={styles.note}>Bağlantıyı kaldırdığınızda o kaynaktan alınan veriler sistemimizden silinir.</p>
  </>;
}

function Actions({ canManage }: { canManage: boolean }) {
  const [list, err, reload] = useLoad<any[]>("/actions");
  const [msg, setMsg] = useState("");
  async function decide(id: string, decision: string) { try { await papi(`/actions/${id}/decision`, { method: "POST", body: JSON.stringify({ decision }) }); reload(); } catch (e: any) { setMsg(e.message); } }
  if (!list) return <p className={styles.muted}>{err || "Yükleniyor…"}</p>;
  const pending = list.filter((a) => a.status === "proposed"), decided = list.filter((a) => a.status !== "proposed");
  return <>
    <h2 className={styles.h2}>Onay bekleyen öneriler <small>Onayladığınız öneriler Istanbul Marketing ekibince uygulanır; sistem hesabınızda kendiliğinden değişiklik yapmaz.</small></h2>
    {msg && <div className={styles.err}>{msg}</div>}
    {pending.length ? pending.map((a) => <div key={a.id} className={styles.proposal}><div><b>{a.title}</b><p>{a.description}</p></div>{canManage && <span><button className={styles.primary} onClick={() => decide(a.id, "approve")}>Onayla</button><button onClick={() => decide(a.id, "reject")}>Reddet</button></span>}</div>) : <div className={styles.calm}>Onay bekleyen öneri yok.</div>}
    {decided.length > 0 && <><h2 className={styles.h2}>Karar geçmişi</h2><table className={styles.table}><thead><tr><th>Öneri</th><th>Karar</th><th>Kim</th><th>Ne zaman</th></tr></thead><tbody>{decided.map((a) => <tr key={a.id}><td>{a.title}</td><td>{a.status === "approved" ? "Onaylandı" : a.status === "rejected" ? "Reddedildi" : a.status}</td><td>{a.decidedBy}</td><td>{a.decidedAt ? new Date(a.decidedAt).toLocaleString("tr-TR") : ""}</td></tr>)}</tbody></table></>}
  </>;
}

const PSTATUS: Record<string, string> = { planned: "Planlandı", invoiced: "Ödeme bekliyor", paid: "Ödendi" };
const BILLING: Record<string, string> = { one_time: "Tek seferlik", monthly: "Aylık", quarterly: "3 aylık", annual: "Yıllık" };
const CSTATUS: Record<string, string> = { signed: "İmzalandı", active: "Aktif", completed: "Tamamlandı" };

function Payments() {
  const [d, err, reload] = useLoad<any>("/billing");
  const [msg, setMsg] = useState(""), [busy, setBusy] = useState("");
  useEffect(() => {
    const r = new URLSearchParams(location.search).get("odeme");
    if (r === "basarili") setMsg("Ödemeniz alındı. Teşekkür ederiz; kayıt güncellendi.");
    else if (r === "basarisiz") setMsg("Ödeme tamamlanmadı; kartınızdan çekim yapılmadı. Tekrar deneyebilir veya havale/EFT ile ödeyebilirsiniz.");
  }, []);
  async function pay(id: string) {
    setBusy(id); setMsg("");
    try { const r = await papi(`/billing/${id}/checkout`, { method: "POST" }); location.href = r.url; } catch (e: any) { setMsg(e.message); setBusy(""); }
  }
  if (!d) return <p className={styles.muted}>{err || "Yükleniyor…"}</p>;
  if (!d.linked) return <div className={styles.emptyCard}><b>Ödeme bilgileri henüz bağlı değil</b><p>Istanbul Marketing ekibi hesabınızı müşteri kaydınıza bağladığında sözleşme ve ödemeleriniz burada görünür.</p></div>;
  const open = d.payments.filter((p: any) => p.status !== "paid"), paid = d.payments.filter((p: any) => p.status === "paid");
  const total = open.reduce((s: number, p: any) => s + p.amount, 0), cur = open[0]?.currency || "TRY";
  return <>
    {msg && <div className={styles.info} role="status">{msg}</div>}
    {d.test && <div className={styles.err} style={{ background: "var(--warn-bg)", color: "var(--warn)" }}>TEST ORTAMI: bu ekranda gerçek tahsilat yapılmaz.</div>}
    <div className={styles.kpis}><div className={styles.kpi}><span>Bekleyen ödeme</span><b>{money(total, cur)}</b><small>{open.length} kalem</small></div>
      <div className={styles.kpi}><span>Vadesi geçen</span><b>{open.filter((p: any) => p.overdue).length}</b><small>kalem</small></div>
      <div className={styles.kpi}><span>Ödenen</span><b>{paid.length}</b><small>kalem</small></div></div>
    <h2 className={styles.h2}>Bekleyen ödemeler</h2>
    {open.length ? open.map((p: any) => <div key={p.id} className={styles.proposal}>
      <div><b>{money(p.amount, p.currency)}</b>{p.overdue && <span className={styles.sev + " " + styles.sev_critical} style={{ marginLeft: 8 }}>Vadesi geçti</span>}
        <p>{p.contract || "Hizmet bedeli"}{p.invoiceNo ? ` · Fatura ${p.invoiceNo}` : ""}{p.dueDate ? ` · Son ödeme ${longDay(p.dueDate)}` : ""}</p></div>
      {d.configured && d.canPay && <button className={styles.primary} disabled={!!busy} onClick={() => pay(p.id)}>{busy === p.id ? "Yönlendiriliyor…" : "Kartla öde"}</button>}
    </div>) : <div className={styles.calm}>Bekleyen ödemeniz yok.</div>}
    {d.configured && !d.canPay && <p className={styles.note}>Kartla ödeme için yönetici veya sahip rolü gerekir.</p>}
    {d.configured && <p className={styles.note}>Kartla ödeme (taksit seçenekleriyle) ödeme kuruluşunun güvenli sayfasında yapılır; kart bilgileriniz Istanbul Marketing'e iletilmez.</p>}
    {d.bank && <><h2 className={styles.h2}>Havale / EFT</h2><div className={styles.emptyCard}><b>{d.bank.accountName || "Istanbul Marketing"}</b>{d.bank.bank && <p>{d.bank.bank}</p>}<p style={{ fontFamily: "ui-monospace,monospace", color: "var(--ink)" }}>{d.bank.iban}</p><p>Açıklamaya fatura numaranızı yazın.</p></div></>}
    {paid.length > 0 && <><h2 className={styles.h2}>Ödeme geçmişi</h2><table className={styles.table}><thead><tr><th>Tutar</th><th>Açıklama</th><th>Fatura</th><th>Tarih</th></tr></thead><tbody>{paid.map((p: any) => <tr key={p.id}><td>{money(p.amount, p.currency)}</td><td>{p.contract || "Hizmet bedeli"}</td><td>{p.invoiceNo || "–"}</td><td>{p.paidAt ? longDay(p.paidAt) : ""}</td></tr>)}</tbody></table></>}
  </>;
}

function Contracts() {
  const [d, err] = useLoad<any>("/billing");
  if (!d) return <p className={styles.muted}>{err || "Yükleniyor…"}</p>;
  if (!d.linked || !d.contracts.length) return <div className={styles.emptyCard}><b>Aktif sözleşme görünmüyor</b><p>Sözleşmeleriniz ve aldığınız hizmetler, Istanbul Marketing ekibi tanımladığında burada listelenir.</p></div>;
  return <>
    <h2 className={styles.h2}>Sözleşmeler ve hizmetler</h2>
    {d.contracts.map((c: any) => <div key={c.id} className={styles.insight}>
      <div className={styles.iHead}><span className={styles.cat}>{CSTATUS[c.status] || c.status}</span><span className={styles.cat}>{BILLING[c.billing] || c.billing}</span></div>
      <h3>{c.title}</h3>
      {Array.isArray(c.services) && c.services.length > 0 && <div className={styles.iHead}>{c.services.map((x: string) => <span key={x} className={styles.cat}>{x}</span>)}</div>}
      <ul className={styles.evidence}>
        <li><span>Sözleşme bedeli</span><b>{money(c.value, c.currency)}</b></li>
        {c.monthlyValue > 0 && <li><span>Aylık bedel</span><b>{money(c.monthlyValue, c.currency)}</b></li>}
        {c.startDate && <li><span>Başlangıç</span><b>{longDay(c.startDate)}</b></li>}
        {c.endDate && <li><span>Bitiş</span><b>{longDay(c.endDate)}</b></li>}
        {c.signedAt && <li><span>İmza tarihi</span><b>{longDay(c.signedAt)}</b></li>}
      </ul>
    </div>)}
  </>;
}
