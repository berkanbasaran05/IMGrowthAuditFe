"use client";

import { FormEvent, useState } from "react";
import styles from "./profile.module.css";
import crm from "./crm.module.css";

type Row = Record<string, any> & { id: string };
export const SOCIALS: [string, string][] = [["instagram", "Instagram"], ["facebook", "Facebook"], ["tiktok", "TikTok"], ["youtube", "YouTube"], ["x", "X (Twitter)"], ["linkedin", "LinkedIn"], ["google", "Google İşletme"], ["whatsapp", "WhatsApp"]];
const fmt = (d?: string | null) => d ? new Date(String(d).slice(0, 10) + "T00:00:00").toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" }) : "";
const link = (key: string, v: string) => /^https?:\/\//.test(v) ? v : key === "whatsapp" ? `https://wa.me/${v.replace(/\D/g, "")}` : key === "instagram" ? `https://instagram.com/${v.replace(/^@/, "")}` : key === "x" ? `https://x.com/${v.replace(/^@/, "")}` : key === "tiktok" ? `https://tiktok.com/@${v.replace(/^@/, "")}` : "";

function Line({ label, value, href }: { label: string; value?: string | null; href?: string }) {
  if (!value) return null;
  return <div className={styles.row}><span>{label}</span><b>{href ? <a href={href} target="_blank" rel="noreferrer">{value}</a> : value}</b><i /></div>;
}

function Secret({ label, value }: { label: string; value: string }) {
  const [show, setShow] = useState(false);
  return <div className={styles.row}><span>{label}</span><b>{show ? value : "••••••••"}</b><button onClick={() => setShow(!show)}>{show ? "Gizle" : "Göster"}</button></div>;
}

export default function ProfileCard({ customer, payments, onEdit }: { customer: Row; payments: Row[]; onEdit: () => void }) {
  const social = customer.social || {}; const contacts: Row[] = customer.contacts || []; const accounts: Row[] = customer.accounts || [];
  const today = new Date().toISOString().slice(0, 10);
  const open = payments.filter((p) => p.status !== "paid" && p.status !== "cancelled" && p.dueDate).sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate)))[0];
  const next = open?.dueDate?.slice(0, 10) || customer.nextPaymentDate?.slice(0, 10) || "";
  const late = next && next < today;
  return <article className={styles.card}>
    <header><h3>Firma bilgileri</h3><button onClick={onEdit}>Düzenle</button></header>
    <div className={styles.body}>
      <div className={styles.sec}><h4>Hizmet ve tahsilat</h4>
        <div className={styles.hot}>{late ? "Gecikmiş ödeme" : "Sonraki ödeme"}<b>{next ? fmt(next) : "Belirtilmedi"}</b></div>
        <Line label="Ödeme günü" value={customer.billingDay ? `Her ayın ${customer.billingDay}. günü` : ""} />
        <Line label="Hizmet başlangıcı" value={fmt(customer.serviceStart)} />
        <Line label="Reklam başlangıcı" value={fmt(customer.adStart)} />
        <Line label="Reklam bütçesi" value={customer.adBudget ? `${Number(customer.adBudget).toLocaleString("tr-TR")} ₺ / ay` : ""} />
        {!customer.billingDay && !customer.serviceStart && !customer.adStart && <p className={styles.none}>Tarih eklenmemiş — Düzenle’den girin.</p>}
      </div>
      <div className={styles.sec}><h4>İletişim ve firma</h4>
        <Line label="Yetkili" value={customer.contactName} />
        <Line label="Telefon" value={customer.phone} href={customer.phone ? `tel:${customer.phone}` : undefined} />
        <Line label="E-posta" value={customer.email} href={customer.email ? `mailto:${customer.email}` : undefined} />
        {contacts.map((c, i) => <Line key={i} label={c.label || "Ek kişi"} value={[c.name, c.email, c.phone].filter(Boolean).join(" · ")} />)}
        <Line label="Web sitesi" value={customer.website} href={customer.website ? (/^https?:/.test(customer.website) ? customer.website : `https://${customer.website}`) : undefined} />
        <Line label="Adres" value={customer.address} />
        <Line label="Vergi" value={[customer.taxOffice, customer.taxNo].filter(Boolean).join(" · ")} />
        <Line label="Notlar" value={customer.notes} />
      </div>
      <div className={styles.sec}><h4>Sosyal medya ve hesaplar</h4>
        {SOCIALS.map(([k, l]) => <Line key={k} label={l} value={social[k]} href={social[k] ? link(k, social[k]) || undefined : undefined} />)}
        {accounts.map((a, i) => <div key={i}><Line label={a.platform || "Hesap"} value={a.username} />{a.password && <Secret label="Şifre" value={a.password} />}<Line label="Not" value={a.note} /></div>)}
        {!Object.keys(social).length && !accounts.length && <p className={styles.none}>Sosyal medya veya hesap bilgisi yok.</p>}
      </div>
    </div>
  </article>;
}

export function ProfileEditor({ customer, onClose, onSave }: { customer: Row; onClose: () => void; onSave: (patch: any) => Promise<void> }) {
  const [f, setF] = useState<any>(() => ({
    name: customer.name || "", contactName: customer.contactName || "", phone: customer.phone || "", email: customer.email || "", sector: customer.sector || "", status: customer.status || "onboarding",
    website: customer.website || "", address: customer.address || "", taxOffice: customer.taxOffice || "", taxNo: customer.taxNo || "", notes: customer.notes || "",
    serviceStart: customer.serviceStart?.slice(0, 10) || "", adStart: customer.adStart?.slice(0, 10) || "", adBudget: customer.adBudget || "", billingDay: customer.billingDay || "", nextPaymentDate: customer.nextPaymentDate?.slice(0, 10) || "",
    social: { ...(customer.social || {}) }, contacts: [...(customer.contacts || [])], accounts: [...(customer.accounts || [])],
  }));
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: any) => setF((p: any) => ({ ...p, [k]: v }));
  const setItem = (key: "contacts" | "accounts", i: number, k: string, v: string) => set(key, f[key].map((x: Row, n: number) => n === i ? { ...x, [k]: v } : x));
  const inp = (k: string, label: string, type = "text", wide = false) => <label className={wide ? styles.w : ""}><span>{label}</span>{k === "notes" || k === "address" ? <textarea value={f[k]} onChange={(e) => set(k, e.target.value)} rows={2} /> : <input type={type} value={f[k]} onChange={(e) => set(k, e.target.value)} />}</label>;
  async function submit(e: FormEvent) { e.preventDefault(); setBusy(true); try { await onSave(f); } finally { setBusy(false); } }
  return <div className={crm.backdrop} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
    <form className={`${crm.modal} ${styles.edit}`} onSubmit={submit}>
      <header><div><small>{customer.name}</small><h2>Firma bilgilerini düzenle</h2></div><button type="button" onClick={onClose}>×</button></header>
      <div className={styles.scroll}>
        <h4>Hizmet ve tahsilat</h4>
        <div className={styles.g}>{inp("serviceStart", "Hizmet başlangıcı", "date")}{inp("adStart", "Reklam başlangıcı", "date")}{inp("adBudget", "Aylık reklam bütçesi (₺)", "number")}{inp("billingDay", "Aylık ödeme günü (1-31)", "number")}{inp("nextPaymentDate", "Sonraki ödeme tarihi", "date")}
          <label><span>Durum</span><select value={f.status} onChange={(e) => set("status", e.target.value)}><option value="onboarding">Başlangıç</option><option value="active">Aktif</option><option value="paused">Beklemede</option><option value="completed">Tamamlandı</option><option value="lost">Kaybedildi</option></select></label></div>
        <h4>Firma ve iletişim</h4>
        <div className={styles.g}>{inp("name", "Firma adı")}{inp("sector", "Sektör")}{inp("contactName", "Yetkili kişi")}{inp("phone", "Telefon")}{inp("email", "E-posta", "email")}{inp("website", "Web sitesi")}{inp("taxOffice", "Vergi dairesi")}{inp("taxNo", "Vergi no")}{inp("address", "Adres", "text", true)}{inp("notes", "Notlar", "text", true)}</div>
        <h4>Ek kişiler / e-postalar</h4>
        <div className={styles.list}>{f.contacts.map((c: Row, i: number) => <div className={styles.item} key={i}>
          {(["label", "name", "email", "phone"] as const).map((k) => <label key={k}><span>{{ label: "Etiket", name: "Ad", email: "E-posta", phone: "Telefon" }[k]}</span><input value={c[k] || ""} onChange={(e) => setItem("contacts", i, k, e.target.value)} placeholder={k === "label" ? "Muhasebe, sahibi…" : ""} /></label>)}
          <button type="button" onClick={() => set("contacts", f.contacts.filter((_: any, n: number) => n !== i))}>×</button></div>)}
          <button type="button" className={styles.add} onClick={() => set("contacts", [...f.contacts, {}])}>+ Kişi / e-posta ekle</button></div>
        <h4>Sosyal medya</h4>
        <div className={styles.g}>{SOCIALS.map(([k, l]) => <label key={k}><span>{l}</span><input value={f.social[k] || ""} onChange={(e) => set("social", { ...f.social, [k]: e.target.value })} placeholder="@kullanıcı veya bağlantı" /></label>)}</div>
        <h4>Hesap bilgileri</h4>
        <p className={styles.warn}>Şifreler yalnızca yönetim paneli girişiyle görüntülenir.</p>
        <div className={styles.list}>{f.accounts.map((a: Row, i: number) => <div className={styles.item} key={i}>
          {(["platform", "username", "password", "note"] as const).map((k) => <label key={k}><span>{{ platform: "Platform", username: "Kullanıcı adı / e-posta", password: "Şifre", note: "Not" }[k]}</span><input value={a[k] || ""} onChange={(e) => setItem("accounts", i, k, e.target.value)} placeholder={k === "platform" ? "Meta, Google Ads, Domain…" : ""} /></label>)}
          <button type="button" onClick={() => set("accounts", f.accounts.filter((_: any, n: number) => n !== i))}>×</button></div>)}
          <button type="button" className={styles.add} onClick={() => set("accounts", [...f.accounts, {}])}>+ Hesap ekle</button></div>
      </div>
      <div className={styles.foot}><button type="button" onClick={onClose}>Vazgeç</button><button className={styles.pri} disabled={busy}>{busy ? "Kaydediliyor…" : "Kaydet"}</button></div>
    </form></div>;
}
