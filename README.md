# IM Growth Audit — Frontend

Next.js 15 ve React 19 tabanlı web uygulaması.

## Dizinler

- `app/crm` — müşteri, sözleşme, ödeme, görev ve aktivite ekranları
- `app/[[...path]]` — mevcut panel sayfalarının Next.js sunum katmanı
- `public` — panel, giriş, teklif ve firma sunumu statik varlıkları

## Çalıştırma

```bash
cp .env.example .env.local
npm install
npm run dev
```

`BACKEND_URL` NestJS API adresini belirtir. Tarayıcıdaki `/api`, `/demo` ve `/sunum` istekleri Next.js tarafından backend'e yönlendirilir.

## Komutlar

- `npm run dev` — geliştirme sunucusu
- `npm run build` — üretim derlemesi
- `npm start` — üretim sunucusu
