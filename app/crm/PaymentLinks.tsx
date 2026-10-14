"use client";

import { useEffect, useState } from "react";
import styles from "./crm.module.css";

// Ödeme kaydı için güvenli ödeme linki: oluştur (bağlantı yalnızca bir kez gösterilir), kopyala, iptal et.
type Link = { id: string; tokenHint: string; expiresAt: string; createdAt: string; openCount: number; state: "active" | "expired" | "revoked" };
const STATE: Record<string, string> = { active: "Aktif", expired: "Süresi doldu", revoked: "İptal edildi" };

async function api(path: string, init?: RequestInit) {
  const r = await fetch(path, { credentials: "same-origin", headers: { "Content-Type": "application/json" }, ...init });
  if (r.status === 401) { location.href = "/login"; throw new Error("Giriş gerekli"); }
  const b = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(b.error || "İşlem tamamlanamadı");
  return b;
}

export default function PaymentLinks({ payment, customerName, onClose }: { payment: { id: string; amount: number; currency: string; status: string }; customerName: string; onClose: () => void }) {
  const [links, setLinks] = useState<Link[]>([]), [cfg, setCfg] = useState<any>(null), [fresh, setFresh] = useState(""), [days, setDays] = useState("14"), [error, setError] = useState(""), [busy, setBusy] = useState(false), [copied, setCopied] = useState(false);
  const load = async () => { try { const [l, c] = await Promise.all([api(`/api/payments/${payment.id}/links`), api("/api/payments/config")]); setLinks(l); setCfg(c); } catch (e: any) { setError(e.message); } };
  useEffect(() => { load(); }, [payment.id]);
  const amount = new Intl.NumberFormat("tr-TR", { style: "currency", currency: payment.currency }).format(payment.amount);
  const payable = payment.status === "planned" || payment.status === "invoiced";

  async function create() {
    setBusy(true); setError("");
    try { const r = await api(`/api/payments/${payment.id}/links`, { method: "POST", body: JSON.stringify({ days: Number(days) }) }); setFresh(r.url); setCopied(false); await load(); }
    catch (e: any) { setError(e.message); } finally { setBusy(false); }
  }
  async function revoke(id: string) { try { await api(`/api/payments/links/${id}/revoke`, { method: "POST" }); await load(); } catch (e: any) { setError(e.message); } }
  const message = `Merhaba, ${amount} tutarındaki ödemenizi aşağıdaki güvenli bağlantıdan kartla (taksit seçenekleriyle) yapabilirsiniz:\n${fresh}\n\nIstanbul Marketing`;

  return <div className={styles.backdrop} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
    <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="pl-title">
      <header><div><small>{customerName}</small><h2 id="pl-title">Ödeme linki · {amount}</h2></div><button onClick={onClose} aria-label="Kapat">×</button></header>
      <div className={styles.fields}>
        {cfg && !cfg.configured && <p className={styles.wide} style={{ margin: 0, color: "#805500" }}>Kartla ödeme henüz yapılandırılmadı (iyzico anahtarları gerekli). Link oluşturabilirsiniz; müşteri bu durumda yalnızca havale/EFT bilgisini görür.</p>}
        {cfg?.test && <p className={styles.wide} style={{ margin: 0, color: "#805500", fontWeight: 700 }}>TEST ORTAMI: gerçek tahsilat yapılmaz.</p>}
        {!payable && <p className={styles.wide} style={{ margin: 0 }}>Bu ödeme "{payment.status === "paid" ? "ödendi" : "iptal"}" durumunda; yeni link oluşturulamaz.</p>}
        {payable && <label>Geçerlilik<select value={days} onChange={(e) => setDays(e.target.value)}><option value="3">3 gün</option><option value="7">7 gün</option><option value="14">14 gün</option><option value="30">30 gün</option></select></label>}
        {payable && <label>&nbsp;<button type="button" className={styles.primary} disabled={busy} onClick={create}>{busy ? "Oluşturuluyor…" : "Link oluştur"}</button></label>}
        {fresh && <div className={styles.wide} style={{ display: "grid", gap: 8 }}>
          <b style={{ fontSize: 13 }}>Bağlantı yalnızca şimdi gösterilir (güvenlik için saklanmaz):</b>
          <textarea readOnly value={message} rows={5} onFocus={(e) => e.currentTarget.select()} />
          <div style={{ display: "flex", gap: 8 }}><button type="button" onClick={() => { navigator.clipboard?.writeText(message); setCopied(true); }}>{copied ? "Kopyalandı ✓" : "Mesajı kopyala"}</button><button type="button" onClick={() => navigator.clipboard?.writeText(fresh)}>Yalnızca linki kopyala</button></div>
        </div>}
        {error && <p className={styles.wide} style={{ margin: 0, color: "#b42318" }}>{error}</p>}
        {links.length > 0 && <div className={styles.wide}>{links.map((l) => <div key={l.id} className={styles.record}><div><b>…{l.tokenHint}</b><small>{new Date(l.createdAt).toLocaleDateString("tr-TR")} · bitiş {new Date(l.expiresAt).toLocaleDateString("tr-TR")} · {l.openCount} açılma · {STATE[l.state]}</small></div>{l.state === "active" && <button type="button" onClick={() => revoke(l.id)}>İptal et</button>}</div>)}</div>}
      </div>
      <footer><button onClick={onClose}>Kapat</button></footer>
    </div>
  </div>;
}
