# NEXA AI

Asisten AI premium dengan desain **Dark Liquid Glass** (terinspirasi tata letak ChatGPT + iOS 26), ditenagai **Groq**.

- **Frontend:** React + TypeScript + Vite + Tailwind CSS + Lucide Icons, PWA, Capacitor (Android)
- **Backend:** Node.js (Express) yang menjadi satu-satunya jalur ke Groq. **API key hanya ada di server.**
- **Code viewer:** Shiki (label bahasa, nomor baris, Copy, Download, scroll horizontal)

## Struktur

```
server/            Backend Express (/api/chat, /api/models, /api/health)
src/               Frontend React + TypeScript
public/            Ikon PWA, theme-init.js
assets/            Sumber ikon & splash untuk Capacitor
scripts/           Generator ikon
capacitor.config.ts
.env.example       Template konfigurasi (tanpa key asli)
.github/workflows/android-apk.yml   Build APK di cloud
```

## 1. Konfigurasi backend (wajib)

1. Buat API key di <https://console.groq.com/keys>.
2. Salin template dan isi key:

   ```bash
   cp .env.example .env
   # edit .env  ->  GROQ_API_KEY=gsk_xxx...
   ```

3. `.env` sudah ada di `.gitignore`. **Jangan pernah commit file ini** dan jangan menaruh key di kode frontend.

Variabel penting (lihat `.env.example` untuk semuanya):

| Variabel | Fungsi |
|---|---|
| `GROQ_API_KEY` | **Wajib.** Key Groq, hanya dibaca server. |
| `PORT` | Port server (default `8787`). |
| `CORS_ORIGINS` | Origin tambahan yang boleh memanggil API (pisahkan dengan koma). |
| `GROQ_MODELS` | Opsional: batasi daftar model di pemilih model. Kosong = semua model chat dari akun Anda. |
| `GROQ_DEFAULT_MODEL` | Opsional: model bawaan (harus ada di daftar live Groq). |
| `CHAT_RATE_LIMIT` | Batas pesan per menit per IP (default 30). |
| `TRUST_PROXY` | Isi `1` jika di belakang reverse proxy (Render, Railway, Nginx). |

**Daftar model tidak dikarang.** Backend mengambilnya langsung dari endpoint resmi Groq `GET /openai/v1/models`, menyaring model non-chat (suara/moderasi), dan memvalidasi model yang dipilih terhadap daftar itu.

Keamanan yang diterapkan: key tidak pernah dikirim ke browser/log, validasi input (peran, panjang, jumlah pesan, model, temperature), batas ukuran body 256 KB, rate limit, Helmet (CSP), CORS terbatas, pesan error disanitasi, dan system prompt dimiliki server (klien tidak bisa menyuntikkan peran `system`).

## 2. Menjalankan di komputer (development)

```bash
npm install
cp .env.example .env      # lalu isi GROQ_API_KEY
npm run dev
```

Buka <http://localhost:5173>. `npm run dev` menjalankan backend (port 8787) dan Vite (port 5173, dengan proxy `/api`).

Mode produksi (satu proses, backend sekaligus menyajikan frontend):

```bash
npm run build
npm start                 # http://localhost:8787
```

## 3. Menjalankan dari HP Android

Pilih salah satu.

### A. HP + komputer di Wi-Fi yang sama (tercepat untuk mencoba)

1. Di komputer: `npm run dev`.
2. Cari IP lokal komputer (mis. `192.168.1.20`; Windows: `ipconfig`, macOS/Linux: `ip a` / `ifconfig`).
3. Di Chrome HP buka `http://192.168.1.20:5173`.
4. Jika gagal tersambung, izinkan port 5173 dan 8787 di firewall komputer.

Catatan: lewat `http://` (bukan HTTPS) tombol Copy tetap berfungsi (ada fallback), tetapi fitur *Install app/PWA* membutuhkan HTTPS.

### B. Deploy backend lalu pasang sebagai PWA (disarankan untuk pemakaian harian)

1. Deploy repo ini ke layanan Node.js (Render, Railway, Fly.io, VPS, dll.).
   - Build command: `npm install && npm run build`
   - Start command: `npm start`
   - Environment: `GROQ_API_KEY`, `NODE_ENV=production`, `TRUST_PROXY=1`
2. Buka URL HTTPS dari Chrome Android, menu ⋮ → **Install app / Add to Home screen**.

### C. Backend langsung di HP (Termux)

Bisa, tetapi build frontend sebaiknya dilakukan di komputer. Salin folder `dist/` hasil `npm run build` ke HP, lalu di Termux: `pkg install nodejs`, `npm install --omit=dev`, isi `.env`, jalankan `npm start`, dan buka `http://localhost:8787`.

## 4. Build APK Android

Aplikasi menggunakan Capacitor: `appId` **com.nexaai.assistant**, nama **NEXA AI**. Folder `android/`, ikon adaptif dan splash screen sudah dihasilkan.

APK hanya berisi frontend. **Backend tetap harus berjalan di server** (HTTPS), karena key Groq tidak boleh ada di aplikasi. Isi alamatnya lewat salah satu cara:

- saat build: `VITE_API_BASE_URL=https://api.contoh.com npm run build`, atau
- setelah terpasang: **Settings → Server → Backend URL**.

### Opsi 1: Build otomatis di cloud (GitHub Actions, tanpa install apa pun)

1. Push proyek ke repo GitHub (key tidak ikut karena `.env` di-ignore).
2. Buka tab **Actions → Build Android APK → Run workflow** (isi URL backend jika ada).
3. Unduh artefak `nexa-ai-debug-apk` → `app-debug.apk`, lalu pasang di HP (izinkan *install from unknown sources*).

### Opsi 2: Build sendiri

Kebutuhan: **JDK 21**, **Android SDK** (platform `android-36`, build-tools, platform-tools) dan variabel `ANDROID_HOME`.

```bash
npm install
npm run build
npm run assets:icons && npm run cap:assets   # opsional, hanya jika ikon diubah
npx cap sync android
cd android && ./gradlew assembleDebug
```

Hasil: `android/app/build/outputs/apk/debug/app-debug.apk`. Atau buka folder `android/` dengan Android Studio (`npx cap open android`) lalu **Build → Build APK(s)**.

Untuk menguji backend HTTP di jaringan lokal: `CAP_DEV_CLEARTEXT=1 npm run android:debug` (jangan dipakai untuk rilis).

### APK rilis (ditandatangani)

```bash
keytool -genkey -v -keystore nexa-release.jks -alias nexa -keyalg RSA -keysize 2048 -validity 10000
```

Lalu atur signing di Android Studio (**Build → Generate Signed Bundle / APK**). Simpan `.jks` dan passwordnya di luar repo.

## Fitur

- Chat multi-turn dengan **streaming**, riwayat percakapan, system prompt, tombol Stop, Regenerate, dan Copy respons
- Riwayat lokal: buat, ganti nama, hapus, cari, dan simpan (localStorage)
- Pemilih model live dari backend, mode gelap/terang, instruksi kustom, hapus semua riwayat
- Markdown (GFM: tabel, daftar, kutipan) bekerja bersama code viewer
- **Code viewer Shiki:** tema "NEXA Night", label bahasa, nomor baris, Copy Code, Download Code, scroll horizontal, indentasi/tab terjaga. Mendukung Lua, Luau, JavaScript, TypeScript, JSX/TSX, Python, HTML, CSS/SCSS, JSON, Java, Kotlin, C, C++, C#, SQL, Bash, PowerShell, Go, Rust, PHP, Ruby, Swift, Dart, YAML, TOML, XML, Markdown, Dockerfile, Diff, GraphQL, Vue, Svelte, dan lainnya. Blok tanpa label bahasa dideteksi otomatis; grammar dimuat malas per bahasa.
- Responsif: sidebar menjadi drawer di HP, input tetap di bawah, safe area Android, tanpa overflow horizontal

## Skrip

| Perintah | Fungsi |
|---|---|
| `npm run dev` | Backend + frontend (development) |
| `npm run build` | Typecheck + build produksi |
| `npm start` | Jalankan backend (menyajikan `dist/` bila ada) |
| `npm run assets:icons` | Hasilkan ulang ikon PWA & sumber ikon/splash |
| `npm run cap:assets` | Hasilkan ikon/splash native Android |
| `npm run android:debug` | Sync + build APK debug |
