"use client";

import { FormEvent, useEffect, useState } from "react";
import AdminHeader from "../AdminHeader";
import styles from "./gm.module.css";

type Org = { id: string; name: string; slug: string; isDemo: boolean; status: string; leadId: string | null; customerId: string | null; openInsights: number; lastBrief: string | null; integrations: { provider: string; status: string }[]; _count: { users: number } };
type Detail = Org & {
  users: { id: string; email: string; name: string | null; role: string; status: string; lastLoginAt: string | null; inviteExpiresAt: string | null }[];
  integrationStatus: { provider: string; name: string; configured: boolean; id: string | null; status: string; account: string | null; lastSyncAt: string | null; lastError: string | null }[];
};
const ROLE: Record<string, string> = { owner: "Sahip", manager: "Yönetici", viewer: "İzleyici" };
const USTATUS: Record<string, string> = { invited: "Davet edildi", active: "Aktif", disabled: "Devre dışı" };
const ISTATUS: Record<string, string> = { connected: "Bağlı", pending: "Hesap seçilmeli", error: "Hata", disconnected: "Bağlı değil", not_connected: "Bağlı değil", demo: "Demo veri", coming_soon: "Yakında" };
const when = (d: string | null) => (d ? new Date(d).toLocaleString("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "–");

async function api(path: string, init?: RequestInit) {
  const r = await fetch(path, { credentials: "same-origin", headers: { "Content-Type": "application/json" }, ...init });
  if (r.status === 401) { location.href = "/login"; throw new Error("Giriş gerekli"); }
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(body.error || "İşlem tamamlanamadı");
  return body;
}

export default function GrowthManagerAdmin() {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [detail, setDetail] = useState<Detail | null>(null);
  const [notice, setNotice] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [busy, setBusy] = useState("");
  const [creating, setCreating] = useState(false);
  const [invite, setInvite] = useState<{ url: string; email: string } | null>(null);
  const [accounts, setAccounts] = useState<{ integrationId: string; list: { id: string; name: string }[] } | null>(null);
  const [leads, setLeads] = useState<{ id: string; name: string; city?: string }[]>([]);
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([]);

  const loadOrgs = async () => { const list = await api("/api/gm/organizations"); setOrgs(list); return list as Org[]; };
  const loadDetail = async (id: string) => { if (!id) return setDetail(null); setDetail(await api(`/api/gm/organizations/${id}`)); };

  useEffect(() => {
    const q = new URLSearchParams(location.search);
    loadOrgs().then((list) => { const want = q.get("org") || list[0]?.id || ""; setSelected(want); }).catch((e) => setNotice({ kind: "err", text: e.message }));
    const b = q.get("baglanti");
    if (b === "tamam") setNotice({ kind: "ok", text: "Google hesabı bağlandı; ilk eşitleme başladı." });
    else if (b === "hesap-sec") setNotice({ kind: "ok", text: "Google bağlantısı alındı. Aşağıdan kullanılacak hesabı seçin." });
    else if (b === "hata") setNotice({ kind: "err", text: q.get("mesaj") || "Bağlantı tamamlanamadı." });
    else if (b === "iptal") setNotice({ kind: "err", text: "Google bağlantısı iptal edildi." });
  }, []);
  useEffect(() => { setInvite(null); setAccounts(null); loadDetail(selected).catch((e) => setNotice({ kind: "err", text: e.message })); }, [selected]);

  async function act(label: string, work: () => Promise<unknown>, ok?: string) {
    setBusy(label); setNotice(null);
    try { await work(); if (ok) setNotice({ kind: "ok", text: ok }); await Promise.all([loadOrgs(), loadDetail(selected)]); }
    catch (e: any) { setNotice({ kind: "err", text: e.message }); }
    finally { setBusy(""); }
  }

  async function openCreate() {
    setCreating(true);
    try {
      const [l, c] = await Promise.all([api("/api/leads"), api("/api/crm")]);
      setLeads((l.leads || []).map((x: any) => ({ id: x.id, name: x.name, city: x.city })));
      setCustomers((c.customers || []).map((x: any) => ({ id: x.id, name: x.name })));
    } catch { /* seçenekler yüklenemezse alanlar boş kalır */ }
  }
  async function createOrg(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget).entries()) as Record<string, string>;
    const leadId = leads.find((x) => `${x.name}${x.city ? ` · ${x.city}` : ""}` === f.lead)?.id;
    await act("create", async () => { const org = await api("/api/gm/organizations", { method: "POST", body: JSON.stringify({ name: f.name, customerId: f.customerId || undefined, leadId }) }); setCreating(false); setSelected(org.id); }, "Organizasyon oluşturuldu.");
  }
  async function sendInvite(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget, f = Object.fromEntries(new FormData(form).entries());
    await act("invite", async () => { const r = await api(`/api/gm/organizations/${selected}/users`, { method: "POST", body: JSON.stringify(f) }); setInvite({ url: r.url, email: r.email }); form.reset(); });
  }
  async function preview() {
    await act("preview", async () => { await api(`/api/gm/organizations/${selected}/preview`, { method: "POST" }); window.open("/portal", "_blank", "noopener"); });
  }
  async function connect(provider: string) {
    await act("connect-" + provider, async () => { const r = await api(`/api/gm/organizations/${selected}/integrations/${provider}/connect`, { method: "POST" }); location.href = r.url; });
  }
  async function loadAccounts(integrationId: string) {
    await act("accounts", async () => setAccounts({ integrationId, list: await api(`/api/gm/organizations/${selected}/integrations/${integrationId}/accounts`) }));
  }

  return <main className={styles.shell}>
    <AdminHeader active="growth-manager" action={<button className={styles.primary} onClick={openCreate}>+ Organizasyon</button>} />
    <section className={styles.content}>
      <div className={styles.title}>
        <div><span>AI Growth Manager™</span><h1>Müşteri portalları</h1><p>Müşteriye özel portal, veri bağlantıları, içgörüler ve günlük brif. Her organizasyonun verisi diğerlerinden yalıtılmıştır.</p></div>
        <button className={styles.secondary} disabled={!!busy} onClick={() => act("demo", async () => { const o = await api("/api/gm/organizations/demo", { method: "POST" }); setSelected(o.id); }, "Demo organizasyon oluşturuldu (örnek veriyle, DEMO etiketli).")}>Demo organizasyon oluştur</button>
      </div>
      {notice && <div className={notice.kind === "ok" ? styles.ok : styles.err} role="status">{notice.text}<button onClick={() => setNotice(null)} aria-label="Kapat">×</button></div>}

      <div className={styles.workspace}>
        <aside className={styles.list}>
          {!orgs.length && <p className={styles.empty}>Henüz organizasyon yok. Müşteriniz için bir organizasyon oluşturun veya demo ile deneyin.</p>}
          {orgs.map((o) => <button key={o.id} className={o.id === selected ? styles.sel : undefined} onClick={() => setSelected(o.id)}>
            <b>{o.name}{o.isDemo && <em className={styles.demo}>DEMO</em>}</b>
            <small>{o._count.users} kullanıcı · {o.integrations.filter((i) => i.status === "connected" || i.status === "demo").length}/3 kaynak · {o.openInsights} açık içgörü</small>
          </button>)}
        </aside>

        {detail ? <div className={styles.detail}>
          <div className={styles.head}>
            <div><h2>{detail.name} {detail.isDemo && <em className={styles.demo}>DEMO</em>}</h2><p>/{detail.slug} · {detail.leadId ? "Growth Audit firmasına bağlı" : "Growth Audit firması bağlı değil"}{detail.customerId ? " · CRM müşterisi bağlı" : ""}</p></div>
            <div className={styles.actions}>
              <button className={styles.secondary} disabled={!!busy} onClick={preview}>Portalı önizle</button>
              <button className={styles.primary} disabled={!!busy} onClick={() => act("run", () => api(`/api/gm/organizations/${selected}/run`, { method: "POST" }), "Eşitleme, analiz ve günlük brif tamamlandı.")}>{busy === "run" ? "Çalışıyor…" : "Şimdi çalıştır"}</button>
            </div>
          </div>

          <div className={styles.grid}>
            <section className={styles.panel}>
              <header><h3>Veri bağlantıları</h3></header>
              {detail.integrationStatus.map((i) => <div key={i.provider} className={styles.row}>
                <div><b>{i.name}</b><small>{ISTATUS[i.status] || i.status}{i.account ? ` · ${i.account}` : ""}{i.lastSyncAt ? ` · son eşitleme ${when(i.lastSyncAt)}` : ""}</small>{i.lastError && <small className={styles.errText}>{i.lastError}</small>}</div>
                <div className={styles.rowActs}>
                  {i.status === "pending" && i.id && <button onClick={() => loadAccounts(i.id!)} disabled={!!busy}>Hesap seç</button>}
                  {(i.status === "connected" || i.status === "pending" || i.status === "error") && i.id && <button onClick={() => act("disc", () => api(`/api/gm/organizations/${selected}/integrations/${i.id}/disconnect`, { method: "POST" }), "Bağlantı kaldırıldı; bu kaynaktan alınan veriler silindi.")} disabled={!!busy}>Kaldır</button>}
                  {["not_connected", "disconnected", "error"].includes(i.status) && i.provider !== "crm" && !detail.isDemo && (i.configured
                    ? <button className={styles.primarySm} onClick={() => connect(i.provider)} disabled={!!busy}>Bağla</button>
                    : <small title="GOOGLE_OAUTH_* ve INTEGRATION_ENCRYPTION_KEY ortam değişkenleri gerekli">Sunucuda yapılandırılmamış</small>)}
                </div>
                {accounts?.integrationId === i.id && <div className={styles.accounts}>{accounts.list.length ? accounts.list.map((a) => <button key={a.id} onClick={() => act("acc", async () => { await api(`/api/gm/organizations/${selected}/integrations/${i.id}/account`, { method: "POST", body: JSON.stringify({ accountId: a.id }) }); setAccounts(null); }, "Hesap seçildi; veriler eşitleniyor.")}>{a.name}</button>) : <small>Bu Google oturumuyla erişilebilen hesap bulunamadı.</small>}</div>}
              </div>)}
            </section>

            <section className={styles.panel}>
              <header><h3>Portal kullanıcıları</h3></header>
              {detail.users.map((u) => <div key={u.id} className={styles.row}>
                <div><b>{u.name || u.email}</b><small>{u.email} · {ROLE[u.role]} · {USTATUS[u.status]}{u.lastLoginAt ? ` · son giriş ${when(u.lastLoginAt)}` : ""}</small></div>
                {u.status !== "invited" && <div className={styles.rowActs}><button disabled={!!busy} onClick={() => act("ustat", () => api(`/api/gm/organizations/${selected}/users/${u.id}`, { method: "PATCH", body: JSON.stringify({ status: u.status === "active" ? "disabled" : "active" }) }))}>{u.status === "active" ? "Devre dışı bırak" : "Etkinleştir"}</button></div>}
              </div>)}
              {!detail.users.length && <p className={styles.empty}>Henüz kullanıcı yok.</p>}
              <form className={styles.inviteForm} onSubmit={sendInvite}>
                <input name="email" type="email" required placeholder="E-posta" aria-label="E-posta" />
                <input name="name" placeholder="Ad soyad (isteğe bağlı)" aria-label="Ad soyad" />
                <select name="role" defaultValue="owner" aria-label="Rol"><option value="owner">Sahip</option><option value="manager">Yönetici</option><option value="viewer">İzleyici</option></select>
                <button className={styles.primarySm} disabled={!!busy || detail.isDemo} title={detail.isDemo ? "Demo organizasyona kullanıcı davet edilmez; önizlemeyi kullanın" : undefined}>Davet bağlantısı oluştur</button>
              </form>
              {invite && <div className={styles.inviteBox}><p><b>{invite.email}</b> için davet bağlantısı (7 gün geçerli). Güvenlik nedeniyle yalnızca şimdi gösterilir; müşteriye siz iletin:</p><div><input readOnly value={invite.url} aria-label="Davet bağlantısı" onFocus={(e) => e.currentTarget.select()} /><button onClick={() => navigator.clipboard?.writeText(invite.url)}>Kopyala</button></div></div>}
            </section>
          </div>
          <p className={styles.note}>Yapay zekâ önerileri yalnızca gözlem, açıklama ve taslak eylem üretir; reklam hesabında veya sitede onaysız hiçbir değişiklik yapılmaz. Müşterinin onayları portalda kayıt altına alınır.</p>
        </div> : <div className={styles.blank}><b>Organizasyon seçin</b><p>Soldan bir organizasyon seçin veya yeni oluşturun.</p></div>}
      </div>
    </section>

    {creating && <div className={styles.backdrop} onClick={(e) => { if (e.target === e.currentTarget) setCreating(false); }}>
      <form className={styles.modal} onSubmit={createOrg}>
        <header><div><small>AI Growth Manager</small><h2>Yeni organizasyon</h2></div><button type="button" onClick={() => setCreating(false)} aria-label="Kapat">×</button></header>
        <div className={styles.fields}>
          <label className={styles.wide}>Organizasyon adı<input name="name" required maxLength={120} placeholder="Ör. Dis Doktoru Cem Dündar" /></label>
          <label>CRM müşterisi<select name="customerId" defaultValue=""><option value="">— Bağlama —</option>{customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
          <label>Growth Audit firması<input name="lead" list="gm-leads" placeholder="Firma adı yazın" /><datalist id="gm-leads">{leads.map((l) => <option key={l.id} value={`${l.name}${l.city ? ` · ${l.city}` : ""}`} />)}</datalist></label>
          <p className={styles.wide}>Growth Audit firması bağlanırsa müşteri, portalında Growth Score geçmişini ve öncelikli web sitesi iyileştirmelerini görür (iç satış notları görünmez).</p>
        </div>
        <footer><button type="button" onClick={() => setCreating(false)}>Vazgeç</button><button className={styles.primary} disabled={!!busy}>Oluştur</button></footer>
      </form>
    </div>}
  </main>;
}
