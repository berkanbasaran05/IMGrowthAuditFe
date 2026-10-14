"use client";

import styles from "./admin.module.css";

// Yönetim paneli üst menüsü: Müşteriler (CRM), AI Growth Manager, Google Ads ve Growth Audit'e geçiş.
const ITEMS = [
  { href: "/yonetim/musteriler", label: "Müşteriler", key: "musteriler" },
  { href: "/yonetim/growth-manager", label: "AI Growth Manager", key: "growth-manager" },
  { href: "/yonetim/google-ads", label: "Google Ads", key: "google-ads" },
  { href: "/yonetim/sistem", label: "Sistem", key: "sistem" },
];

export default function AdminHeader({ active, action }: { active: string; action?: React.ReactNode }) {
  async function logout() { try { await fetch("/api/logout", { method: "POST" }); } catch {} location.href = "/login"; }
  return <header className={styles.header}>
    <a className={styles.brand} href="/"><img src="/brand/logo-wordmark-on-light.png" alt="istanbul.marketing" /><span>Yönetim paneli</span></a>
    <nav aria-label="Yönetim bölümleri">{ITEMS.map((i) => <a key={i.key} href={i.href} className={active === i.key ? styles.active : undefined} aria-current={active === i.key ? "page" : undefined}>{i.label}</a>)}</nav>
    <div className={styles.right}>{action}<a className={styles.switch} href="/growth-audit">Growth Audit →</a><button className={styles.ghost} onClick={logout}>Çıkış</button></div>
  </header>;
}
