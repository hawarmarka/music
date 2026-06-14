# 🎵 HawarMusic by HawarSoftware

Aile içine özel, güvenli, modern ve offline destekli müzik arşivi platformu.

Bu paket **Coolify / Docker / kendi VPS** üzerinde çalışacak şekilde hazırlandı.
Frontend React + PWA, backend FastAPI, veritabanı PostgreSQL.

> Önemli telif notu: YouTube ve Spotify linkleri ses dosyası olarak indirilmez. Sadece koleksiyona bağlantı/metadata kartı olarak eklenir. Offline indirme yalnızca kullanıcının kendi yüklediği dosyalar veya indirme/yükleme hakkına sahip olduğu doğrudan ses dosyası linkleri için çalışır.

---

## İçindeki çalışan özellikler

### Kullanıcı ve aile sistemi
- Admin ile aile oluşturma
- Davet kodu/linki ile aile üyesi kayıt
- Email + şifre giriş
- JWT oturum sistemi
- Admin/üye rolleri
- Aile verisi izolasyonu
- Admin üye yönetimi: rol değiştir, yükleme izni aç/kapat, üyeyi çıkar

### Müzik sistemi
- MP3, M4A, WAV, FLAC, OGG, AAC yükleme
- Çoklu dosya yükleme
- Sürükle bırak upload
- Metadata okuma: başlık, sanatçı, albüm, süre, kapak
- Kapak yoksa otomatik gradient kapak
- Şarkı düzenleme
- Şarkı silme
- Kaynak etiketleri: dosya, direct URL, YouTube, Spotify

### Linkten ekleme
- YouTube linki: sadece bağlantı/metadata kartı, embed player
- Spotify linki: sadece bağlantı/metadata kartı, embed player
- Direkt ses dosyası linki: hak/onay kutusu ile indirip arşive ekler
- Geçersiz link kontrolü
- Telif uyarısı ve güvenli akış

### Player
- Alt sabit player
- Mobil tam ekran player
- Play / pause
- Önceki / sonraki
- İleri geri sarma
- Ses kontrolü
- Shuffle
- Repeat all / repeat one
- Queue / sıradaki liste
- İlerleme çubuğu
- Klavye kısayolları
- YouTube/Spotify embed player

Klavye kısayolları:
- Space: çal/duraklat
- Shift + sağ/sol: sonraki/önceki
- Sağ/sol: 5 saniye ileri/geri

### Offline PWA
- PWA manifest
- Service worker
- Uygulama kabuğu cache
- Şarkıyı tarayıcı IndexedDB içine offline kaydetme
- İnternet yokken sadece offline kayıtlı şarkıları oynatma
- Offline sayfası
- Offline dosyayı silme

### Playlist
- Kişisel playlist
- Aile playlisti
- Playlist oluşturma
- Playlist detay sayfası
- Şarkıyı playlist'e ekleme
- Playlist'ten çıkarma
- Sürükle bırak ile sıralama
- Playlist silme

### Sosyal/aile özellikleri
- Favoriler
- Aile yorumları
- Emoji tepkileri
- Şarkı istekleri
- İsteği tamamlandı olarak işaretleme
- Yükleyen kişi bilgisi
- Aile üyeleri ekranı
- Bildirim paneli

### Admin paneli
- Toplam şarkı
- Toplam kullanıcı
- Depolama kullanımı
- En çok dinlenenler
- Son yüklenenler
- Sistem logları
- Üye yönetimi
- Davet kodları
- Maksimum dosya boyutu ayarı
- Üye upload izni ayarı

---

## Demo giriş bilgileri

İlk kurulumda otomatik demo veri oluşur.

```txt
Admin: admin@hawarmusic.test
Şifre: Admin1234

Üye: uye@hawarmusic.test
Şifre: Uye12345
```

Canlıya almadan sonra bu demo hesapları sil veya şifrelerini değiştir.

---

## Lokal çalıştırma

```bash
unzip hawarmusic-fullstack-ready.zip
cd hawarmusic

# üretimde mutlaka değiştir
export JWT_SECRET="cok-uzun-rastgele-bir-anahtar-yaz"

docker compose up --build
```

Açılacak adresler:

```txt
Frontend: http://localhost:3000
Backend API: http://localhost:8000/docs
```

`frontend/nginx.conf` içinde `/api` istekleri Docker ağı içinde otomatik `backend:8000` servisine proxy edilir. Bu nedenle lokal kullanımda ayrıca API domaini vermen gerekmez.

---

## Coolify A’dan Z’ye kurulum

### 1. ZIP’i GitHub’a yükle

Projeyi klasöre çıkar:

```bash
unzip hawarmusic-fullstack-ready.zip
cd hawarmusic
```

GitHub reposu oluşturup yükle:

```bash
git init
git add .
git commit -m "Initial HawarMusic"
git branch -M main
git remote add origin https://github.com/KULLANICI_ADIN/hawarmusic.git
git push -u origin main
```

### 2. Coolify’da yeni proje oluştur

Coolify panelinde:

1. **Projects** → yeni proje oluştur
2. **New Resource** → **Docker Compose** seç
3. GitHub reposunu bağla
4. Compose dosyası olarak `docker-compose.yml` seçili kalsın

### 3. Environment variables ekle

Coolify içinde proje environment bölümüne ekle:

```env
JWT_SECRET=buraya-cok-uzun-rastgele-bir-anahtar-yaz
VITE_API_URL=
```

Tek domain altında çalıştıracaksan `VITE_API_URL` boş kalabilir. Frontend `/api` isteklerini backend’e proxy eder.

Backend’i ayrı API domaininde çalıştıracaksan örnek:

```env
VITE_API_URL=https://api.senin-domainin.com
```

### 4. Volume kontrolü

`docker-compose.yml` içinde iki kalıcı volume var:

```txt
pg_data       PostgreSQL verileri
uploads_data  Yüklenen müzik dosyaları
```

Coolify bunları kalıcı volume olarak oluşturmalı. Özellikle `uploads_data` silinirse yüklenen şarkı dosyaları gider.

### 5. Domain bağlama

En kolay kurulum:

- Sadece frontend servisine domain bağla: `music.senin-domainin.com`
- Frontend nginx `/api` isteklerini backend servisine içeriden yönlendirir.
- Backend için ayrıca public domain vermek zorunda değilsin.

Ayrı domain istersen:

- Frontend: `music.senin-domainin.com`
- Backend: `api.senin-domainin.com`
- `VITE_API_URL=https://api.senin-domainin.com` olarak set et

### 6. Deploy

Coolify’da **Deploy** butonuna bas.

İlk açılışta backend şunları yapar:

1. Migration çalıştırır
2. Demo veri oluşturur
3. API’yi başlatır

Loglarda şunu görmelisin:

```txt
→ Migration uygulanıyor...
→ Demo veri (varsa atlanır)...
→ Sunucu başlıyor...
```

### 7. İlk giriş

Tarayıcıdan domainini aç:

```txt
https://music.senin-domainin.com
```

Demo admin ile giriş yap:

```txt
admin@hawarmusic.test / Admin1234
```

Sonra:

1. Ayarlar’dan dosya boyutu sınırını belirle
2. Aile bölümünden davet linki oluştur
3. Kendi müziklerini yükle
4. İstersen demo şarkıları sil

---

## Dosya yapısı

```txt
hawarmusic/
├── backend/
│   ├── Dockerfile
│   ├── entrypoint.sh
│   ├── requirements.txt
│   ├── migrations/001_schema.sql
│   └── src/
│       ├── main.py
│       ├── core.py
│       ├── storage.py
│       ├── migrate.py
│       └── seed.py
├── frontend/
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── package.json
│   ├── public/
│   │   ├── manifest.json
│   │   └── sw.js
│   └── src/
│       ├── App.jsx
│       ├── App.css
│       ├── components/
│       ├── lib/
│       └── pages/
└── docker-compose.yml
```

---

## API özet

- `POST /api/auth/create-family`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/songs`
- `POST /api/songs/upload`
- `POST /api/songs/import`
- `GET /api/songs/{id}/stream`
- `POST /api/songs/{id}/favorite`
- `GET/POST /api/songs/{id}/comments`
- `GET/POST /api/songs/{id}/reactions`
- `GET/POST /api/playlists`
- `POST /api/playlists/{id}/reorder`
- `GET /api/offline`
- `GET/POST /api/requests`
- `GET /api/family/members`
- `PATCH/DELETE /api/family/members/{id}`
- `GET /api/admin/dashboard`
- `GET /api/admin/logs`
- `GET /api/notifications`
- `GET/PATCH /api/settings`

---

## Güvenlik notları

Canlıya almadan önce mutlaka:

1. `JWT_SECRET` değiştir
2. Demo hesap şifrelerini değiştir veya demo hesapları sil
3. Upload limitini ayarla
4. Sunucuda yeterli disk alanı olduğundan emin ol
5. HTTPS kullan
6. Yedekleme ayarla: PostgreSQL volume + uploads volume

---

## Telif / platform kuralı

Bu yazılım YouTube veya Spotify’dan ses dosyası indirmez. Bu bilinçli olarak kapalıdır. Bu kaynaklar sadece harici bağlantı/embedded player olarak çalışır. Offline dinleme özelliği kullanıcının kendi yüklediği dosyalar ve yasal doğrudan ses dosyası URL’leri içindir.

# Docker build notu

Bu sürümde frontend build hatası için `package-lock.json` kaldırıldı ve Vite build bağımlılıkları production ortamında da kurulacak şekilde düzeltildi.
