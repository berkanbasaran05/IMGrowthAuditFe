import { readFile } from "node:fs/promises";
import path from "node:path";

const publicRoot = path.resolve(process.cwd(), "public");
const pages: Record<string, string> = {
  "": "index.html",
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

export async function GET(_request: Request, context: { params: Promise<{ path?: string[] }> }) {
  const parts = (await context.params).path || [];
  const key = parts.join("/");
  const relative = pages[key] || key;
  const file = path.resolve(publicRoot, relative);
  if (file !== publicRoot && !file.startsWith(publicRoot + path.sep)) return new Response("Bulunamadı", { status: 404 });
  try {
    const body = await readFile(file);
    return new Response(body, {
      headers: {
        "Content-Type": mime[path.extname(file).toLowerCase()] || "application/octet-stream",
        "Cache-Control": path.extname(file) === ".html" ? "no-store" : "public, max-age=3600"
      }
    });
  } catch {
    return new Response("Bulunamadı", { status: 404 });
  }
}
