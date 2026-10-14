# IM Growth Audit — Frontend

Next.js 15 ve React 19 tabanlı web uygulaması.

## Sayfalar

| Adres | Ne var |
|---|---|
| `/` | Girişten sonra çalışma alanı seçimi (Growth Audit veya Yönetim Paneli) |
| `/login` | Ekip girişi |
| `/growth-audit` | Firmalar (liste + harita), Growth Audit, Gönderim, Aranacaklar (`public/index.html`) |
| `/yonetim/musteriler` | CRM (`app/crm`); eski `/crm` adresi buraya yönlendirilir |
| `/yonetim/growth-manager` | AI Growth Manager™ organizasyonları ve portal kullanıcıları |
| `/yonetim/google-ads` | Google Ads müşterileri (statik panelin yönetim modu) |
| `/yonetim/sistem` | Sistem durumu: kuyruklar, hatalar, AI maliyeti, veri saklama |
| `/portal`, `/portal/giris`, `/portal/davet` | Müşteri portalı (ayrı giriş) |

## Dizinler

- `app/[[...path]]`: statik panel sayfalarını sunar. Dosyalar bellekte brotli/gzip ile sıkıştırılır ve ETag ile önbelleklenir.
- `app/yonetim`: yönetim paneli (ortak üst menü `AdminHeader.tsx`).
- `app/portal`: müşteri portalı.
- `public`: panel, giriş, teklif ve firma sunumu statik varlıkları.

## Çalıştırma

```bash
cp .env.example .env.local
npm install
npm run dev
```

`BACKEND_URL` NestJS API adresidir. Tarayıcıdaki `/api`, `/r`, `/oauth`, `/demo` ve `/sunum` istekleri Next.js tarafından backend'e yönlendirilir. **Bu adres derleme sırasında yönlendirmelere işlenir**; değişirse yeniden derleyin.

## Komutlar

- `npm run dev`: geliştirme sunucusu
- `npm run build`: üretim derlemesi. Geliştirme sunucusu açıkken `NEXT_DIST_DIR=.next-prod npm run build` ile ayrı klasöre derleyin; aynı `.next` klasörüne derlemek çalışan sunucuyu bozar.
- `npm start`: üretim sunucusu
- Docker: `Dockerfile` (`BUILD_STANDALONE=1`, bağımsız çıktı). Tam kurulum için backend deposundaki `deploy/docker-compose.yml` ve `docs/operations.md` dosyalarına bakın.
