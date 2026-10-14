"use client";

import { FormEvent, useState } from "react";
import styles from "../portal.module.css";

export default function PortalLogin() {
  const [error, setError] = useState(""), [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setError("");
    const f = Object.fromEntries(new FormData(e.currentTarget).entries());
    const r = await fetch("/api/portal/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
    const body = await r.json().catch(() => ({}));
    if (r.ok) { location.href = "/portal"; return; }
    setError(body.error || "Giriş yapılamadı"); setBusy(false);
  }
  return <main className={styles.shell}><div className={styles.auth}>
    <form className={styles.authCard} onSubmit={submit}>
      <img src="/brand/logo-wordmark-on-light.png" alt="istanbul.marketing" />
      <div><h1>AI Growth Manager™</h1><p>İşletmenizin büyüme panelinize giriş yapın.</p></div>
      <label>E-posta<input name="email" type="email" autoComplete="username" required /></label>
      <label>Parola<input name="password" type="password" autoComplete="current-password" required /></label>
      {error && <div className={styles.err} role="alert">{error}</div>}
      <button className={styles.primary} disabled={busy}>{busy ? "Giriş yapılıyor…" : "Giriş yap"}</button>
      <p>Hesabınız yoksa Istanbul Marketing ekibinden davet bağlantısı isteyin.</p>
    </form>
  </div></main>;
}
