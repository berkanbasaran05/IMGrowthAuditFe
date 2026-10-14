import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { brotliCompressSync, constants, gzipSync } from "node:zlib";

const publicRoot = path.resolve(process.cwd(), "public");
// "/" girişten sonra çalışma alanı seçimidir; Growth Audit paneli /growth-audit altındadır.
// Aynı statik panel, yönetim panelindeki Google Ads bölümü için /yonetim/google-ads adresinden de sunulur.
const pages: Record<string, string> = {
  "": "home.html",
  "growth-audit": "index.html",
  "yonetim/google-ads": "index.html",
  login: "login.html",
  form: "form.html",
  teklif: "teklif.html",
  fiyat: "teklif.html",
  fiyatlandirma: "teklif.html"
};
const mime: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".ico": "image/x-icon"
};
const COMPRESSIBLE = new Set([".html", ".css", ".js", ".svg"]);

// Dosyalar değişene kadar (mtime) bellekte sıkıştırılmış olarak tutulur: panel HTML'i ~160 KB → ~35 KB.
type Entry = { mtimeMs: number; raw: Buffer; etag: string; br?: Buffer; gz?: Buffer };
const cache = new Map<string, Entry>();

async function load(file: string): Promise<Entry> {
  const info = await stat(file);
  const hit = cache.get(file);
  if (hit && hit.mtimeMs === info.mtimeMs) return hit;
  const raw = await readFile(file);
  const entry: Entry = { mtimeMs: info.mtimeMs, raw, etag: `"${createHash("sha1").update(raw).digest("base64url").slice(0, 20)}"` };
  if (COMPRESSIBLE.has(path.extname(file).toLowerCase()) && raw.length > 1024) {
    entry.br = brotliCompressSync(raw, { params: { [constants.BROTLI_PARAM_QUALITY]: 9 } });
    entry.gz = gzipSync(raw, { level: 9 });
  }
  cache.set(file, entry);
  return entry;
}

export async function GET(request: Request, context: { params: Promise<{ path?: string[] }> }) {
  const parts = (await context.params).path || [];
  const key = parts.join("/");
  const relative = pages[key] || key;
  const file = path.resolve(publicRoot, relative);
  if (file !== publicRoot && !file.startsWith(publicRoot + path.sep)) return new Response("Bulunamadı", { status: 404 });
  try {
    const entry = await load(file);
    const ext = path.extname(file).toLowerCase();
    const headers: Record<string, string> = {
      "Content-Type": mime[ext] || "application/octet-stream",
      // HTML her istekte doğrulanır (ETag ile 304); diğer varlıklar 1 saat önbelleğe alınır.
      "Cache-Control": ext === ".html" ? "no-cache" : "public, max-age=3600",
      ETag: entry.etag,
      Vary: "Accept-Encoding",
    };
    if (request.headers.get("if-none-match") === entry.etag) return new Response(null, { status: 304, headers });
    const accept = request.headers.get("accept-encoding") || "";
    if (entry.br && /\bbr\b/.test(accept)) return new Response(new Uint8Array(entry.br), { headers: { ...headers, "Content-Encoding": "br" } });
    if (entry.gz && /\bgzip\b/.test(accept)) return new Response(new Uint8Array(entry.gz), { headers: { ...headers, "Content-Encoding": "gzip" } });
    return new Response(new Uint8Array(entry.raw), { headers });
  } catch {
    return new Response("Bulunamadı", { status: 404 });
  }
}
