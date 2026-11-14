# NEXA AI

Asisten AI premium dengan desain **Dark Liquid Glass** (terinspirasi tata letak ChatGPT + iOS 26), ditenagai **Groq**.

- **Frontend:** React + TypeScript + Vite + Tailwind CSS + Lucide Icons, PWA, Capacitor (Android)
- **Backend:** Node.js (Express) yang menjadi satu-satunya jalur ke Groq. **API key hanya ada di server.** Dapat berjalan sebagai server biasa **atau** sebagai Vercel Functions (lihat [Deploy ke Vercel](#deploy-ke-vercel-hobby--gratis)).
- **Code viewer:** Shiki (label bahasa, nomor baris, Copy, Download, scroll horizontal)

## Struktur

```
server/app.js      Aplikasi Express (tanpa listen): validasi, rate limit, CORS, Helmet, streaming
server/index.js    Entry server biasa (lokal/VPS): app.listen()
api/               Vercel Functions: chat.js, models.js, health.js (memakai server/app.js yang sama)
vercel.json        Konfigurasi Vercel (build, durasi fungsi, header keamanan)
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
| `TRUST_PROXY` | Isi `1` jika di belakang reverse proxy (Nginx, dll.). Di Vercel diatur otomatis. |

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

### B. Deploy ke internet lalu pasang sebagai PWA (disarankan untuk pemakaian harian)

Ikuti panduan [Deploy ke Vercel](#deploy-ke-vercel-hobby--gratis) di bawah (gratis, tanpa kartu kredit). Setelah itu buka URL HTTPS-nya di Chrome Android, menu ⋮ → **Install app / Add to Home screen**.

### C. Backend langsung di HP (Termux)

Bisa, tetapi build frontend sebaiknya dilakukan di komputer. Salin folder `dist/` hasil `npm run build` ke HP, lalu di Termux: `pkg install nodejs`, `npm install --omit=dev`, isi `.env`, jalankan `npm start`, dan buka `http://localhost:8787`.

## Deploy ke Vercel (Hobby / gratis)

Satu deployment berisi **frontend statis** (hasil `npm run build`) dan **tiga fungsi serverless** (`/api/chat`, `/api/models`, `/api/health`). Fungsi-fungsi itu memakai kode Express yang sama dengan server lokal, jadi validasi input, rate limit, CORS, Helmet, dan streaming tetap sama. `GROQ_API_KEY` hanya dibaca dari environment variable server di Vercel.

### Langkah dari HP Android

Disarankan membuka Chrome → menu ⋮ → centang **Desktop site** agar semua tombol Vercel terlihat.

1. Buka <https://vercel.com/signup>, pilih **Continue with GitHub**, dan izinkan akses.
2. Ketuk **Add New… → Project**. Cari repo **NEXA-AI** lalu ketuk **Import**.
   Jika repo tidak muncul: ketuk **Adjust GitHub App Permissions**, tambahkan repo `NEXA-AI`, lalu kembali.
3. Di layar **Configure Project** biarkan semuanya apa adanya. *Framework Preset* terbaca **Vite**, dan perintah build otomatis dari `vercel.json`. Jangan ubah *Root Directory*.
4. Buka bagian **Environment Variables**, lalu isi:
   - **Key:** `GROQ_API_KEY`
   - **Value:** tempel key Groq Anda (buat di <https://console.groq.com/keys>)
   - Jika ada opsi **Sensitive**, aktifkan.
   - Ketuk **Add**.
5. Ketuk **Deploy** dan tunggu sekitar 1–3 menit sampai muncul "Congratulations".
6. Salin domain produksi Anda, misalnya `https://nexa-ai-xxxx.vercel.app` (lihat di **Project → Domains**).

**Cek hasilnya** (ganti dengan domain Anda):
- `https://DOMAIN/api/health` harus menampilkan `{"ok":true,...,"configured":true}`.
- `https://DOMAIN/api/models` harus menampilkan daftar model dari akun Groq Anda.
- `https://DOMAIN/` membuka NEXA AI. Kirim pesan panjang dan pastikan teks muncul bertahap (streaming).

**Mengganti/menambah variabel:** Project → **Settings → Environment Variables**. Setelah mengubah nilai, buka **Deployments → ⋯ → Redeploy**, karena perubahan hanya berlaku pada deployment baru.

**Update otomatis:** setiap `git push` ke branch `main` akan men-deploy ulang.

### Environment variables

| Variabel | Wajib | Fungsi |
|---|---|---|
| `GROQ_API_KEY` | **Ya** | Key Groq. Hanya dibaca server. Jangan pernah di-commit. |
| `GROQ_MODELS` | Tidak | Batasi daftar model (ID dipisah koma). Kosong = semua model chat dari akun Anda. |
| `GROQ_DEFAULT_MODEL` | Tidak | Model bawaan (harus ada di daftar live Groq). |
| `MAX_OUTPUT_TOKENS` | Tidak | Batas token jawaban. |
| `CHAT_RATE_LIMIT` / `API_RATE_LIMIT` | Tidak | Batas permintaan per menit per IP (default 30 / 120). |
| `CORS_ORIGINS` | Tidak | Origin tambahan yang boleh memanggil API. Aplikasi web di domain yang sama dan aplikasi Android (Capacitor) sudah diizinkan. |
| `NEXA_SYSTEM_PROMPT` | Tidak | Mengganti system prompt bawaan. |

`PORT`, `HOST`, dan `TRUST_PROXY` tidak perlu diisi di Vercel.

### Menghubungkan APK ke backend Vercel

- Saat menjalankan workflow **Build Android APK**, isi `api_base_url` dengan domain produksi Vercel Anda (`https://nexa-ai-xxxx.vercel.app`, tanpa `/` di akhir), atau
- setelah aplikasi terpasang: **Settings → Server → Backend URL**.

### Batasan serverless yang perlu diketahui

- **Durasi fungsi 60 detik** (`maxDuration` di `vercel.json`). Jawaban yang lebih lama dari itu dihentikan dengan pesan error yang rapi; kirim ulang atau pilih model yang lebih cepat.
- **Rate limit bersifat "best effort".** Penghitungnya disimpan di memori tiap instance, sehingga pada serverless batasnya tidak benar-benar global. Untuk perlindungan yang kuat, tambahkan aturan rate limit di **Project → Firewall** (ketersediaan tergantung paket Vercel Anda).
- **Endpoint terbuka.** Siapa pun yang tahu URL Anda bisa memakai kuota Groq Anda. Pantau pemakaian di console Groq, jaga URL tidak tersebar luas, dan atur batas rate limit.
- **Deployment Protection.** URL preview (bukan domain produksi) bisa meminta login Vercel dan menjawab `401` untuk APK. Gunakan domain produksi. Jika produksi pun `401`, cek **Settings → Deployment Protection**.
- **Paket Hobby** ditujukan untuk pemakaian pribadi non-komersial.
- **Streaming di Vercel** sudah diuji lewat simulasi lokal (lihat uji di bawah), tetapi perlu Anda konfirmasi sekali setelah deploy dengan langkah "Cek hasilnya" di atas.

### Pengujian yang sudah dilakukan

Dijalankan di lingkungan pengembangan tanpa akses ke Groq asli (Groq di-stub di batas `fetch`, kode lainnya asli): 26 uji lolos untuk health, filter model, CORS, validasi, batas ukuran, streaming bertahap, pembatalan upstream saat klien terputus, rate limit, serta 3 uji tanpa key. `vercel build` resmi berhasil membangun 3 fungsi (Node 22, 60 detik, ±2,3 MB) dan header keamanan. **Belum teruji:** deployment Vercel sungguhan dan Groq asli.

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

## In-app updates & releases

The Android app checks GitHub Releases for a newer version, downloads the APK with a progress bar and opens the system installer (Android always asks the user to tap *Install*). After an update, a *What's new* screen shows the notes from `src/changelog.json`.

**Publishing an update**
1. Add an entry at the top of `src/changelog.json` (new `version`, `title`, `date`, `changes`).
2. Commit and push to `main`.
3. GitHub → Actions → **Release APK** → Run workflow → enter the version (e.g. `1.1.1`, must be higher than the last one).
4. The workflow builds a signed APK and creates the Release `v1.1.1`. Installed apps will offer it on next launch (or Settings → About → Check for updates).

**One-time setup:** create the repository secret `ANDROID_SIGNING` (format `alias|password|base64-keystore`). Every update must be signed with the same key, otherwise Android refuses to install it over the old app. Keep a private backup of the keystore and never commit it.
