"use client";

import { FormEvent, useState } from "react";
import styles from "../portal.module.css";

export default function PortalInvite() {
  const [error, setError] = useState(""), [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError("");
    const f = Object.fromEntries(new FormData(e.currentTarget).entries()) as Record<string, string>;
    if (f.password !== f.password2) { setError("Parolalar eşleşmiyor"); return; }
    setBusy(true);
    const token = new URLSearchParams(location.search).get("token") || "";
    const r = await fetch("/api/portal/invite/accept", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, password: f.password, name: f.name }) });
    const body = await r.json().catch(() => ({}));
    if (r.ok) { history.replaceState(null, "", "/portal/davet"); location.href = "/portal"; return; }
    setError(body.error || "Davet kabul edilemedi"); setBusy(false);
  }
  return <main className={styles.shell}><div className={styles.auth}>
    <form className={styles.authCard} onSubmit={submit}>
      <img src="/brand/logo-wordmark-on-light.png" alt="istanbul.marketing" />
      <div><h1>Hesabınızı oluşturun</h1><p>Istanbul Marketing AI Growth Manager™ davetinizi kabul etmek için parolanızı belirleyin.</p></div>
      <label>Ad soyad<input name="name" autoComplete="name" /></label>
      <label>Parola<input name="password" type="password" autoComplete="new-password" minLength={10} required /></label>
      <label>Parola (tekrar)<input name="password2" type="password" autoComplete="new-password" minLength={10} required /></label>
      <p>En az 10 karakter; harf ve rakam içermeli.</p>
      {error && <div className={styles.err} role="alert">{error}</div>}
      <button className={styles.primary} disabled={busy}>{busy ? "Kaydediliyor…" : "Hesabı etkinleştir"}</button>
    </form>
  </div></main>;
}
