"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import styles from "./crm.module.css";
import AdminHeader from "../yonetim/AdminHeader";
import PaymentLinks from "./PaymentLinks";
import ProfileCard, { ProfileEditor } from "./ProfileCard";

type Row = Record<string, any> & { id: string; customerId?: string };
type Data = { customers: Row[]; contracts: Row[]; payments: Row[]; activities: Row[]; tasks: Row[]; summary: Record<string, number> };
const empty: Data = { customers: [], contracts: [], payments: [], activities: [], tasks: [], summary: {} };
const money = (n = 0, currency = "TRY") => new Intl.NumberFormat("tr-TR", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
const labels: Record<string, string> = { onboarding: "Başlangıç", active: "Aktif", paused: "Beklemede", completed: "Tamamlandı", lost: "Kaybedildi", draft: "Taslak", sent: "Gönderildi", signed: "İmzalandı", cancelled: "İptal", planned: "Planlandı", invoiced: "Faturalandı", paid: "Ödendi", todo: "Yapılacak", doing: "Devam ediyor", done: "Tamamlandı" };

async function api(path: string, options?: RequestInit) {
  const response = await fetch(path, { credentials: "same-origin", headers: { "Content-Type": "application/json", ...(options?.headers || {}) }, ...options });
  if (response.status === 401) { location.href = "/login"; throw new Error("Giriş gerekli"); }
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || "İşlem tamamlanamadı");
  return body;
}

export default function CrmPage() {
  const [data, setData] = useState<Data>(empty);
  const [selected, setSelected] = useState("");
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState<"customer" | "contract" | "payment" | "task" | "activity" | "">("");
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [payLink, setPayLink] = useState<Row | null>(null);
  const [editing, setEditing] = useState(false);

  const load = async () => { try { setData(await api("/api/crm")); } catch (e: any) { setError(e.message); } finally { setBusy(false); } };
  useEffect(() => { load(); }, []);
  const customer = data.customers.find((x) => x.id === selected) || data.customers[0];
  useEffect(() => { if (!selected && data.customers[0]) setSelected(data.customers[0].id); }, [data.customers, selected]);
  const visible = useMemo(() => data.customers.filter((x) => `${x.name} ${x.contactName} ${x.sector}`.toLocaleLowerCase("tr").includes(query.toLocaleLowerCase("tr"))), [data.customers, query]);
  const related = (key: keyof Data) => (data[key] as Row[]).filter((x) => x.customerId === customer?.id);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    const form = new FormData(event.currentTarget); const body = Object.fromEntries(form.entries()) as any;
    if (body.services) body.services = String(body.services).split(",").map((x) => x.trim()).filter(Boolean);
    if (modal !== "customer") body.customerId = customer?.id;
    try { await api(`/api/crm/${modal === "customer" ? "customers" : modal + "s"}`, { method: "POST", body: JSON.stringify(body) }); setModal(""); await load(); }
    catch (e: any) { setError(e.message); }
  }

  async function saveProfile(patch: any) {
    try { await api(`/api/crm/customers/${customer?.id}`, { method: "PATCH", body: JSON.stringify(patch) }); setEditing(false); await load(); }
    catch (e: any) { setError(e.message); }
  }

  async function update(kind: string, id: string, status: string) {
    try { await api(`/api/crm/${kind}/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }); await load(); }
    catch (e: any) { setError(e.message); }
  }

  return <main className={styles.shell}>
    <AdminHeader active="musteriler" action={<button className={styles.primary} onClick={() => setModal("customer")}>+ Müşteri ekle</button>} />

    <section className={styles.content}>
      <div className={styles.title}><div><span>CRM</span><h1>Müşteri yönetimi</h1><p>Sözleşme, tahsilat ve yapılan işleri tek yerde takip edin.</p></div></div>
      {error && <div className={styles.error}>{error}<button onClick={() => setError("")}>×</button></div>}
      <div className={styles.metrics}>
        <Metric label="Aktif müşteri" value={String(data.summary.activeCustomers || 0)} note={`${data.summary.customers || 0} toplam müşteri`} />
        <Metric label="Sözleşme toplamı" value={money(data.summary.contracted)} note="İmzalanan sözleşmeler" />
        <Metric label="Tahsil edilen" value={money(data.summary.collected)} note={`${money(data.summary.outstanding)} kalan`} />
        <Metric label="Aylık düzenli gelir" value={money(data.summary.monthly)} note={`${data.summary.openTasks || 0} açık görev`} />
      </div>

      <div className={styles.workspace}>
        <aside className={styles.customers}>
          <div className={styles.sideHead}><b>Müşteriler</b><span>{data.customers.length}</span></div>
          <input className={styles.search} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Müşteri ara" />
          <div className={styles.customerList}>{busy ? <p className={styles.empty}>Yükleniyor…</p> : visible.length ? visible.map((x) => <button key={x.id} className={customer?.id === x.id ? styles.selected : ""} onClick={() => setSelected(x.id)}><i style={x.logo ? { background: "#fff", border: "1px solid #e5e7eb", padding: 3 } : undefined}>{x.logo ? <img src={x.logo} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : x.name.slice(0, 2).toLocaleUpperCase("tr")}</i><span><b>{x.name}</b><small>{x.contactName || x.sector || "Yetkili bilgisi yok"}</small></span><Status value={x.status}/></button>) : <p className={styles.empty}>Henüz müşteri yok.</p>}</div>
        </aside>

        <section className={styles.detail}>
          {!customer ? <div className={styles.blank}><b>İlk müşterinizi ekleyin</b><p>Sözleşme, ödeme ve iş takibini buradan yönetin.</p><button className={styles.primary} onClick={() => setModal("customer")}>Müşteri ekle</button></div> : <>
            <div className={styles.customerHead}><div className={styles.avatar} style={customer.logo ? { background: "#fff", border: "1px solid #e5e7eb", padding: 4 } : undefined}>{customer.logo ? <img src={customer.logo} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : customer.name.slice(0, 2).toLocaleUpperCase("tr")}</div><div><h2>{customer.name}</h2><p>{[customer.contactName, customer.phone, customer.email].filter(Boolean).join(" · ") || "İletişim bilgisi eklenmemiş"}</p></div><Status value={customer.status}/></div>
            <div className={styles.actions}><button onClick={() => setModal("contract")}>Sözleşme ekle</button><button onClick={() => setModal("payment")}>Ödeme ekle</button><button onClick={() => setModal("task")}>Görev ekle</button><button onClick={() => setModal("activity")}>Not ekle</button></div>
            <ProfileCard customer={customer} payments={related("payments")} onEdit={() => setEditing(true)} />
            <div className={styles.grid}>
              <Panel title="Sözleşmeler" count={related("contracts").length}>{related("contracts").length ? related("contracts").map((x) => <RecordRow key={x.id} title={x.title} meta={`${money(x.value, x.currency)} · ${labels[x.billing] || x.billing}`} status={x.status} onStatus={(s) => update("contracts", x.id, s)} options={["draft","sent","signed","active","completed","cancelled"]}/>) : <Empty text="Sözleşme kaydı yok"/>}</Panel>
              <Panel title="Ödemeler" count={related("payments").length}>{related("payments").length ? related("payments").map((x) => <RecordRow key={x.id} title={money(x.amount, x.currency)} meta={x.dueDate ? `Vade: ${x.dueDate}` : "Vade belirtilmedi"} status={x.status} onStatus={(s) => update("payments", x.id, s)} options={["planned","invoiced","paid","cancelled"]} action={x.status === "planned" || x.status === "invoiced" ? <button onClick={() => setPayLink(x)}>Ödeme linki</button> : undefined}/>) : <Empty text="Ödeme kaydı yok"/>}</Panel>
              <Panel title="Görevler" count={related("tasks").filter((x) => x.status !== "done").length}>{related("tasks").length ? related("tasks").map((x) => <RecordRow key={x.id} title={x.title} meta={[x.assignee, x.dueDate].filter(Boolean).join(" · ") || "Tarih belirtilmedi"} status={x.status} onStatus={(s) => update("tasks", x.id, s)} options={["todo","doing","done"]}/>) : <Empty text="Görev kaydı yok"/>}</Panel>
              <Panel title="Geçmiş" count={related("activities").length}>{related("activities").length ? related("activities").slice(0, 10).map((x) => <div className={styles.timeline} key={x.id}><i/><div><b>{x.summary}</b><small>{new Date(x.at).toLocaleString("tr-TR")}</small></div></div>) : <Empty text="Henüz aktivite yok"/>}</Panel>
            </div>
          </>}
        </section>
      </div>
    </section>
    {editing && customer && <ProfileEditor key={customer.id} customer={customer} onClose={() => setEditing(false)} onSave={saveProfile} />}
    {modal && <Modal type={modal} customer={customer} onClose={() => setModal("")} onSubmit={submit}/>} 
    {payLink && <PaymentLinks payment={{ id: payLink.id, amount: payLink.amount, currency: payLink.currency, status: payLink.status }} customerName={customer?.name || ""} onClose={() => { setPayLink(null); load(); }} />}
  </main>;
}

function Metric({ label, value, note }: { label: string; value: string; note: string }) { return <div className={styles.metric}><span>{label}</span><b>{value}</b><small>{note}</small></div>; }
function Status({ value }: { value: string }) { return <em className={`${styles.status} ${styles[value] || ""}`}>{labels[value] || value}</em>; }
function Panel({ title, count, children }: { title: string; count: number; children: React.ReactNode }) { return <article className={styles.panel}><header><h3>{title}</h3><span>{count}</span></header><div>{children}</div></article>; }
function Empty({ text }: { text: string }) { return <p className={styles.empty}>{text}</p>; }
function RecordRow({ title, meta, status, options, onStatus, action }: { title: string; meta: string; status: string; options: string[]; onStatus: (s: string) => void; action?: React.ReactNode }) { return <div className={styles.record}><div><b>{title}</b><small>{meta}</small></div>{action && <span className={styles.recordAction}>{action}</span>}<select value={status} onChange={(e) => onStatus(e.target.value)}>{options.map((x) => <option value={x} key={x}>{labels[x] || x}</option>)}</select></div>; }

function Modal({ type, customer, onClose, onSubmit }: { type: string; customer?: Row; onClose: () => void; onSubmit: (e: FormEvent<HTMLFormElement>) => void }) {
  const titles: Record<string,string> = { customer: "Yeni müşteri", contract: "Sözleşme ekle", payment: "Ödeme kaydı", task: "Görev ekle", activity: "Not ekle" };
  return <div className={styles.backdrop} onMouseDown={(e) => e.target === e.currentTarget && onClose()}><form className={styles.modal} onSubmit={onSubmit}><header><div><small>{customer?.name}</small><h2>{titles[type]}</h2></div><button type="button" onClick={onClose}>×</button></header><div className={styles.fields}>
    {type === "customer" && <><Field name="name" label="Firma adı" required/><Field name="contactName" label="Yetkili kişi"/><Field name="phone" label="Telefon"/><Field name="email" label="E-posta" type="email"/><Field name="sector" label="Sektör"/><Select name="status" label="Durum" values={["onboarding","active","paused"]}/><Field name="notes" label="Notlar" wide/></>}
    {type === "contract" && <><Field name="title" label="Sözleşme adı" required/><Field name="services" label="Hizmetler (virgülle)"/><Field name="value" label="Toplam tutar" type="number" required/><Field name="monthlyValue" label="Aylık gelir" type="number"/><Select name="currency" label="Para birimi" values={["TRY","USD","EUR","GBP"]}/><Select name="billing" label="Ödeme tipi" values={["one_time","monthly","quarterly","annual"]}/><Select name="status" label="Durum" values={["draft","sent","signed","active"]}/><Field name="startDate" label="Başlangıç" type="date"/><Field name="endDate" label="Bitiş" type="date"/><Field name="documentUrl" label="Sözleşme bağlantısı" wide/></>}
    {type === "payment" && <><Field name="amount" label="Tutar" type="number" required/><Select name="currency" label="Para birimi" values={["TRY","USD","EUR","GBP"]}/><Select name="status" label="Durum" values={["planned","invoiced","paid"]}/><Field name="dueDate" label="Vade tarihi" type="date"/><Field name="invoiceNo" label="Fatura numarası"/><Field name="notes" label="Not" wide/></>}
    {type === "task" && <><Field name="title" label="Görev" required wide/><Field name="assignee" label="Sorumlu"/><Field name="dueDate" label="Teslim tarihi" type="date"/><Select name="status" label="Durum" values={["todo","doing","done"]}/><Field name="notes" label="Açıklama" wide/></>}
    {type === "activity" && <><Select name="type" label="Aktivite" values={["note","call","meeting","email","delivery"]}/><Field name="summary" label="Açıklama" required wide/></>}
  </div><footer><button type="button" onClick={onClose}>Vazgeç</button><button className={styles.primary}>Kaydet</button></footer></form></div>;
}
function Field({ name, label, type = "text", required, wide }: { name: string; label: string; type?: string; required?: boolean; wide?: boolean }) { return <label className={wide ? styles.wide : ""}><span>{label}</span>{wide && name !== "documentUrl" && type === "text" ? <textarea name={name} required={required}/> : <input name={name} type={type} required={required}/>}</label>; }
function Select({ name, label, values }: { name: string; label: string; values: string[] }) { return <label><span>{label}</span><select name={name}>{values.map((x) => <option value={x} key={x}>{labels[x] || ({one_time:"Tek sefer",monthly:"Aylık",quarterly:"3 aylık",annual:"Yıllık"} as any)[x] || x}</option>)}</select></label>; }
