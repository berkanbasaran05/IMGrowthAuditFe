"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./notifications.module.css";

type Item = { key: string; type: string; level: "overdue" | "today" | "soon"; days: number; customerId: string; customer: string; title: string; body: string; date: string; read: boolean };
const TYPE: Record<string, string> = { payment: "Ödeme", billing: "Ödeme günü", task: "Görev", contract: "Sözleşme" };
const SEEN = "im-notified-keys";
const POLL = 5 * 60 * 1000;

const readSeen = (): string[] => { try { return JSON.parse(localStorage.getItem(SEEN) || "[]"); } catch { return []; } };
const writeSeen = (keys: string[]) => { try { localStorage.setItem(SEEN, JSON.stringify(keys.slice(-300))); } catch {} };

// Zamanı gelen ödeme, görev ve sözleşmeler için panel bildirimi; izin verilirse masaüstü bildirimi de gösterir.
export default function NotificationBell() {
  const [items, setItems] = useState<Item[]>([]);
  const [open, setOpen] = useState(false);
  const [perm, setPerm] = useState<string>("default");
  const box = useRef<HTMLDivElement>(null);
  const unread = items.filter((x) => !x.read);

  async function load() {
    try {
      const r = await fetch("/api/crm/notifications", { credentials: "same-origin" });
      if (!r.ok) return;
      const data = await r.json(); const list: Item[] = data.items || [];
      setItems(list);
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        const seen = readSeen(); const fresh = list.filter((x) => !x.read && !seen.includes(x.key));
        fresh.slice(0, 3).forEach((x) => { const n = new Notification(`${x.customer} · ${TYPE[x.type] || "Hatırlatma"}`, { body: `${x.title} — ${x.body}`, tag: x.key, icon: "/brand/logo-symbol-on-light.png" }); n.onclick = () => { window.focus(); location.href = `/yonetim/musteriler?c=${x.customerId}`; }; });
        if (fresh.length) writeSeen([...seen, ...fresh.map((x) => x.key)]);
      }
    } catch {}
  }

  useEffect(() => {
    if (typeof Notification !== "undefined") setPerm(Notification.permission);
    load(); const t = setInterval(load, POLL);
    const onFocus = () => load(); window.addEventListener("focus", onFocus);
    return () => { clearInterval(t); window.removeEventListener("focus", onFocus); };
  }, []);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close); return () => document.removeEventListener("mousedown", close);
  }, [open]);

  async function markRead(keys: string[]) {
    if (!keys.length) return;
    setItems((xs) => xs.map((x) => keys.includes(x.key) ? { ...x, read: true } : x));
    await fetch("/api/crm/notifications/read", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ keys }) }).catch(() => {});
  }

  async function enableDesktop() {
    if (typeof Notification === "undefined") return;
    const p = await Notification.requestPermission(); setPerm(p);
    if (p === "granted") { writeSeen([]); load(); }
  }

  return <div className={styles.wrap} ref={box}>
    <button className={styles.bell} onClick={() => setOpen(!open)} aria-label={`Bildirimler${unread.length ? `, ${unread.length} okunmamış` : ""}`} aria-expanded={open}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
      {unread.length > 0 && <span className={unread.some((x) => x.level !== "soon") ? styles.hot : ""}>{unread.length > 9 ? "9+" : unread.length}</span>}
    </button>
    {open && <div className={styles.pop} role="dialog" aria-label="Bildirimler">
      <header><b>Bildirimler</b>{unread.length > 0 && <button onClick={() => markRead(unread.map((x) => x.key))}>Tümünü okundu say</button>}</header>
      {perm === "default" && <button className={styles.desk} onClick={enableDesktop}>Masaüstü bildirimlerini aç</button>}
      {perm === "denied" && <p className={styles.note}>Masaüstü bildirimleri tarayıcıda engelli. Site ayarlarından izin verebilirsiniz.</p>}
      <div className={styles.list}>
        {items.length ? items.map((x) => <a key={x.key} href={`/yonetim/musteriler?c=${x.customerId}`} className={`${styles.item} ${x.read ? styles.read : ""}`} onClick={() => markRead([x.key])}>
          <i className={styles[x.level]} />
          <div><small>{x.customer} · {TYPE[x.type] || "Hatırlatma"}</small><b>{x.title}</b><em className={styles[x.level]}>{x.body} · {new Date(x.date + "T00:00:00").toLocaleDateString("tr-TR", { day: "numeric", month: "long" })}</em></div>
        </a>) : <p className={styles.empty}>Zamanı gelen bir iş yok.</p>}
      </div>
      <footer>Ödemeler 3 gün, görevler 2 gün, sözleşme bitişleri 14 gün önceden bildirilir.</footer>
    </div>}
  </div>;
}
