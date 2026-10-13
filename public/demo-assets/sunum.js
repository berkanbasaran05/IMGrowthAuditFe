(function () {
  // Kaydırınca beliren bölümler (JS yoksa içerik zaten görünür)
  document.documentElement.classList.add("js");
  var R = ".sh,.c,.serp>*,.maps,.ad,.igwrap,.igpost,.cg>div,.dom,.tl>div,.pk>.p,.how,.hg>div,.refs,.final h2,.final p,.devr,.ck li";
  function reveal() {
    var els = document.querySelectorAll(R);
    if (!("IntersectionObserver" in window)) { els.forEach(function (e) { e.classList.add("rv-in"); }); return; }
    var ob = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("rv-in"); ob.unobserve(e.target); } }); }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    els.forEach(function (e) { var p = e.parentNode, i = p ? Array.prototype.indexOf.call(p.children, e) : 0; e.classList.add("rv"); e.style.setProperty("--d", Math.min(i, 6) * 70 + "ms"); ob.observe(e); });
  }
  // Mobilde telefon içindeki site sayfa kaydırmasını kilitlemesin: dokununca tam ekran açılır
  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("[data-full]"); if (!b) return;
    var m = document.createElement("div"); m.className = "fsv";
    m.innerHTML = '<div class="fsv-bar"><span>Örnek siteniz</span><button type="button" aria-label="Kapat">Sunuma dön ✕</button></div><iframe title="Site" src="' + b.getAttribute("data-full") + '"></iframe>';
    document.body.appendChild(m); document.documentElement.style.overflow = "hidden";
    m.querySelector("button").onclick = function () { m.remove(); document.documentElement.style.overflow = ""; };
  });
  if (document.readyState !== "loading") reveal(); else document.addEventListener("DOMContentLoaded", reveal);
  // Cihaz önizlemelerini kutuya sığdır
  function fit() {
    document.querySelectorAll(".vm").forEach(function (b) { b.style.setProperty("--s", (b.clientWidth / 1440).toFixed(4)); });
    document.querySelectorAll(".vi").forEach(function (b) { b.style.setProperty("--s", (b.clientWidth / 390).toFixed(4)); });
  }
  fit(); addEventListener("resize", fit); addEventListener("load", fit);
  if (window.ResizeObserver) { var ro = new ResizeObserver(fit); document.querySelectorAll(".vm,.vi").forEach(function (b) { ro.observe(b); }); }
  var D = {}; try { D = JSON.parse(document.getElementById("site-data").textContent); } catch (e) {}
  // Alan adı müsaitliği
  document.querySelectorAll("[data-dom]").forEach(function (el) {
    fetch("/api/domain?d=" + encodeURIComponent(el.getAttribute("data-dom"))).then(function (r) { return r.json(); }).then(function (j) {
      var st = el.querySelector(".st");
      if (j.status === "available") { st.textContent = "Müsait · alınabilir"; st.className = "st ok"; el.classList.add("free"); el.parentNode.prepend(el); }
      else if (j.status === "taken") { st.textContent = "Alınmış"; st.className = "st no"; el.classList.add("taken"); }
      else st.textContent = "Kontrol edilemedi";
    }).catch(function () { el.querySelector(".st").textContent = "Kontrol edilemedi"; });
  });
  if (!D.track) return;
  // İlgi takibi: görülen bölümler, kaydırma derinliği, süre
  var seen = {}, start = Date.now(), maxDepth = 0, sent = false;
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) seen[e.target.getAttribute("data-sec")] = 1; }); }, { threshold: 0.35 });
    document.querySelectorAll("[data-sec]").forEach(function (s) { io.observe(s); });
  }
  addEventListener("scroll", function () { var h = document.documentElement; maxDepth = Math.max(maxDepth, Math.round((scrollY + innerHeight) / h.scrollHeight * 100)); }, { passive: true });
  function send() {
    if (sent) return; sent = true;
    var body = JSON.stringify({ lead: D.lead, page: D.page, secs: Object.keys(seen), depth: maxDepth, secs_time: Math.round((Date.now() - start) / 1000) });
    if (navigator.sendBeacon) navigator.sendBeacon("/api/track", new Blob([body], { type: "application/json" }));
    else fetch("/api/track", { method: "POST", body: body, keepalive: true, headers: { "Content-Type": "application/json" } });
  }
  addEventListener("pagehide", send);
  document.addEventListener("visibilitychange", function () { if (document.visibilityState === "hidden") send(); });
})();
