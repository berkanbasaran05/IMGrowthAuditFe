// Demo site etkileşimleri. Veri sayfadaki #site-data JSON'undan okunur.
(function () {
  var D = {};
  try { D = JSON.parse(document.getElementById("site-data").textContent); } catch (e) {}
  var $ = function (s) { return document.querySelector(s); };

  var hd = $(".hd");
  addEventListener("scroll", function () { hd && hd.classList.toggle("s", scrollY > 8); }, { passive: true });

  // Görünüm animasyonu
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }); }, { rootMargin: "0px 0px -6% 0px" });
    document.querySelectorAll(".rv").forEach(function (el) { io.observe(el); });
  } else document.querySelectorAll(".rv").forEach(function (el) { el.classList.add("in"); });

  // Özellik paneli
  var fb = $("#featBtn"), fp = $("#feat");
  if (fb && fp) {
    fb.addEventListener("click", function () { fp.hidden = !fp.hidden; fb.setAttribute("aria-expanded", String(!fp.hidden)); });
    document.addEventListener("click", function (e) { if (!fp.hidden && !e.target.closest("#feat,#featBtn")) fp.hidden = true; });
  }

  // Mobil menü
  var mt = $("#mt"), mn = $("#mnav");
  if (mt && mn) {
    mt.addEventListener("click", function () { mn.classList.toggle("open"); mt.setAttribute("aria-expanded", String(mn.classList.contains("open"))); });
  }

  // Galeri büyütme
  var lb = $("#lb"), lbi = $("#lbImg");
  document.querySelectorAll(".gal figure img").forEach(function (i) {
    i.addEventListener("click", function () { if (!lb || !lb.showModal) return; lbi.src = i.src; lb.showModal(); });
  });
  lb && lb.addEventListener("click", function () { lb.close(); });

  // Talep formu → WhatsApp mesajı
  document.querySelectorAll("form[data-wa]").forEach(function (f) {
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      var v = Object.fromEntries(new FormData(f));
      if (!String(v.ad || "").trim()) { f.ad.focus(); return; }
      var g = v.gun ? new Date(v.gun + "T12:00").toLocaleDateString("tr-TR", { day: "numeric", month: "long", weekday: "long" }) : "";
      var t = [D.formIntro, "Ad: " + v.ad, v.tel && "Telefon: " + v.tel, v.hizmet && "Konu: " + v.hizmet, g && D.dateLabel + ": " + g, v.not && "Not: " + v.not].filter(Boolean).join("\n");
      window.open("https://wa.me/" + D.wa + "?text=" + encodeURIComponent(t), "_blank", "noopener");
    });
  });

  // Sektör araçları
  var out = $("#toolOut");
  var waBtn = function (txt) { return D.wa ? '<a class="btn" style="width:100%;margin-top:18px" target="_blank" rel="noopener" href="https://wa.me/' + D.wa + '?text=' + encodeURIComponent(txt) + '">WhatsApp ile gönder</a>' : ""; };
  var row = function (k, v) { return "<div><span>" + k + "</span><b>" + v + "</b></div>"; };
  var fmtD = function (d) { return d.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" }); };
  document.querySelectorAll("form[data-tool]").forEach(function (f) {
    f.addEventListener("submit", function (e) {
      e.preventDefault(); var v = Object.fromEntries(new FormData(f)), tool = f.getAttribute("data-tool"), h = "";
      if (tool === "asi-takvimi") {
        if (!v.dogum) { f.dogum.focus(); return; }
        var b = new Date(v.dogum + "T12:00"), W = v.tur === "kedi" ? [[8, "1. karma aşı"], [12, "2. karma aşı"], [12, "Kuduz aşısı (en erken)"], [16, "3. karma aşı"], [52, "Yıllık tekrar"]] : [[6, "1. karma aşı"], [9, "2. karma aşı"], [12, "3. karma aşı"], [12, "Kuduz aşısı (en erken)"], [16, "Son karma dozu"], [52, "Yıllık tekrar"]];
        h = '<h4 style="font:700 18px var(--body)">Genel planlama</h4><div class="tool-res">' + W.map(function (w) { var d = new Date(b); d.setDate(d.getDate() + w[0] * 7); return row(w[1], fmtD(d)); }).join("") + '</div><p class="muted" style="margin-top:14px;font-size:14px">Bu tablo genel bir yol gösterir. Kesin takvim ve parazit uygulamaları muayene sonrası hekiminiz tarafından belirlenir.</p>' + waBtn("Merhaba, " + (v.tur === "kedi" ? "kedim" : "köpeğim") + " için aşı randevusu almak istiyorum. Doğum tarihi: " + fmtD(b));
      } else if (tool === "tasima-hesaplayici") {
        var oda = +v.oda, m3 = [0, 12, 22, 32, 45][oda], kat = +v.kat || 0, asa = v.asansor === "var";
        var arac = m3 <= 15 ? "Küçük kamyonet" : m3 <= 30 ? "Orta boy kamyon" : "Büyük kamyon", ekip = Math.max(2, Math.ceil(m3 / 12) + (!asa && kat > 2 ? 1 : 0));
        var sure = Math.round((m3 / 8 + (!asa ? kat * 0.25 : 0) + (v.mesafe === "dis" ? 0 : 1)) * 10) / 10;
        h = '<h4 style="font:700 18px var(--body)">Tahmini ihtiyaç</h4><p class="tool-big">~' + m3 + ' m³</p><div class="tool-res">' + row("Araç", arac) + row("Ekip", ekip + " kişi") + row("Yükleme/boşaltma", "~" + sure + " saat") + row("Asansör", asa ? "Var" : "Yok" + (kat > 0 ? " (dış cephe asansörü gerekebilir)" : "")) + '</div><p class="muted" style="margin-top:14px;font-size:14px">Net fiyat, ekspertiz sonrasında verilir.</p>' + waBtn("Merhaba, taşınma için ekspertiz talep ediyorum. Ev: " + ["", "1+1", "2+1", "3+1", "4+1+"][oda] + ", kat: " + kat + ", asansör: " + (asa ? "var" : "yok") + ", mesafe: " + { ic: "ilçe içi", sehir: "şehir içi", dis: "şehirlerarası" }[v.mesafe]);
      } else if (tool === "pasta-tasarla") {
        var k = Math.max(4, +v.kisi || 12), kat2 = k <= 16 ? 1 : k <= 40 ? 2 : 3, cap = k <= 8 ? "18 cm" : k <= 16 ? "24 cm" : k <= 40 ? "24 + 18 cm" : "30 + 24 + 18 cm";
        h = '<h4 style="font:700 18px var(--body)">Önerimiz</h4><p class="tool-big">' + kat2 + ' katlı</p><div class="tool-res">' + row("Kişi sayısı", k) + row("Önerilen boyut", cap) + row("Tema", v.tema) + (v.yazi ? row("Yazı", v.yazi) : "") + (v.gun ? row("Teslim", fmtD(new Date(v.gun + "T12:00"))) : "") + '</div>' + waBtn("Merhaba, pasta siparişi vermek istiyorum. Kişi: " + k + ", tema: " + v.tema + (v.yazi ? ", yazı: " + v.yazi : "") + (v.gun ? ", teslim: " + fmtD(new Date(v.gun + "T12:00")) : ""));
      }
      if (out) { out.innerHTML = h; out.scrollIntoView({ behavior: "smooth", block: "nearest" }); }
    });
  });

  // Çerez bildirimi (demo)
  var ck = $("#cookie");
  try { if (ck && !localStorage.getItem("demo-cookie")) ck.hidden = false; } catch (e) { if (ck) ck.hidden = false; }
  var ok = $("#cookieOk"); ok && ok.addEventListener("click", function () { ck.hidden = true; try { localStorage.setItem("demo-cookie", "1"); } catch (e) {} });

  // İlgi takibi (önizleme ve gömülü görünüm hariç)
  if (D.track) {
    var st0 = Date.now(), md = 0, snt = false;
    addEventListener("scroll", function () { var h = document.documentElement; md = Math.max(md, Math.round((scrollY + innerHeight) / h.scrollHeight * 100)); }, { passive: true });
    var snd = function () { if (snt) return; snt = true; var b = JSON.stringify({ lead: D.lead, page: D.page || "ana-sayfa", depth: md, secs_time: Math.round((Date.now() - st0) / 1000) });
      if (navigator.sendBeacon) navigator.sendBeacon("/api/track", new Blob([b], { type: "application/json" })); };
    addEventListener("pagehide", snd); document.addEventListener("visibilitychange", function () { if (document.visibilityState === "hidden") snd(); });
  }

  // Açık / kapalı
  var H = D.hours || [];
  if (H.length) {
    var now = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Istanbul" }));
    var k = now.getDay(), m = now.getHours() * 60 + now.getMinutes();
    document.querySelectorAll(".hours [data-k]").forEach(function (r) { if (+r.getAttribute("data-k") === k) r.classList.add("today"); });
    var t = H.filter(function (x) { return x.k === k; })[0], open = false;
    if (t) { var mm = t.h.match(/(\d{1,2})[:.](\d{2})\s*[-–]\s*(\d{1,2})[:.](\d{2})/); if (mm) { var a = +mm[1] * 60 + +mm[2], b = +mm[3] * 60 + +mm[4]; open = m >= a && m < b; } }
    document.querySelectorAll("[data-open]").forEach(function (el) { el.hidden = false; el.classList.toggle("c", !open); el.textContent = open ? "Şu an açık" : "Şu an kapalı"; });
  }
})();
