# PROMPT LENGKAP: Game "Batu Gunting Kertas Unlimited"

Bertindaklah sebagai **Senior Web Developer dan Game Designer**. Lanjutkan/kembangkan game web interaktif bernama **"Batu Gunting Kertas Unlimited"** dalam satu file `index.html` (HTML + CSS + JavaScript, tanpa build tool). Berikut seluruh spesifikasi, keputusan desain, dan riwayat perbaikan yang sudah disepakati sejauh ini — ikuti semuanya secara konsisten.

---

## 1. Konsep Game

Pemain tidak dibatasi pada batu/gunting/kertas. Layar utama menampilkan tantangan berjalan, contoh: **"Batu VS [ Input Kosong ]"**. Pemain mengetik apa saja (benda, karakter, konsep abstrak — misal "Goku", "Pajak", "Air"). Setelah submit, sebuah **AI bertindak sebagai "Juri"** menentukan pemenang beserta alasan singkat (boleh logis, boleh lucu/absurd). **Pemenang ronde menjadi "Juara Bertahan" di ronde berikutnya**, menghadapi input penantang baru.

## 2. Stack Teknologi (Wajib)

- **HTML5** untuk struktur.
- **Tailwind CSS via CDN** (`cdn.tailwindcss.com`) untuk styling & layout responsif.
- **Vanilla JavaScript murni** (Semua manipulasi DOM pakai `document.getElementById`, `classList`, `addEventListener`, dll).
- Google Fonts: **Anton** (font display/poster untuk judul & kata besar), **Inter** (body), **JetBrains Mono** (log riwayat & teks juri).

## 3. Arah Desain Visual (sudah diterapkan, jangan diubah gayanya)

Tema "poster pertarungan/arcade fighting game", bukan minimalis generik:
- Dua **kartu sudut**: kiri = **Juara Bertahan** (merah, warna custom `corner1: #ff3b5c`), kanan = **Penantang** (biru, `corner2: #3ba7ff`), dengan badge diamond emas **"VS"** (`gold: #ffd166`) di tengah — pada mobile jadi elemen statis di antara dua kartu (stack vertikal), pada desktop (`md:`) posisinya absolute di tengah grid 2 kolom.
- Font display **Anton** untuk judul, nama juara/penantang, dan badge VS.
- Radial glow lembut di background (`radial-gradient` emas transparan).

## 4. Fitur Wajib

### a. Dark/Light Mode Toggle
- Tombol dengan icon matahari (mode gelap aktif → klik ke terang) dan bulan (mode terang aktif → klik ke gelap), saling switch pakai `classList.toggle`.
- Dark mode via `class` strategy Tailwind (`darkMode: 'class'` di `tailwind.config`, toggle class `dark` di elemen `<html>`).
- **Semua elemen** (background, teks, kartu, border) bertransisi halus (`transition: ... .45s ease`) saat tema berganti.

### b. Efek Visual & Game Feel
- **Shake animation** (`@keyframes shakeX`) saat: input kosong disubmit, atau tombol serang ditekan.
- **Pulse glow** pada badge VS (`vs-fighting` class) selama AI sedang memproses keputusan.
- **Fade-in-up** dramatis (`@keyframes fadeInUp`) saat panel keputusan juri muncul.
- **Efek mengetik (typewriter)** karakter-per-karakter untuk teks alasan juri, dengan kursor berkedip (`typing-cursor` / `typing-done`).
- Highlight pemenang: `ring-4 ring-gold` pada kartu sudut yang menang, direset tiap ronde baru.
- Loading indicator dengan titik-titik animasi ("Juri AI sedang menimbang...") — **kecuali** untuk keputusan instan dari data tersimpan (lihat poin 6), yang tidak perlu loading karena memang instan.
- Log riwayat pertarungan (scrollable list), tiap entri pakai `textContent` (bukan `innerHTML`) demi keamanan dari XSS karena isinya input bebas dari pengguna.

## 5. Sistem Multi-Provider AI Juri (Gemini + Groq, dengan fallback otomatis)

Karena provider tunggal (awalnya cuma Gemini model `gemini-3.7-flash`) sering kena **503 "high demand"**, dan Groq model `llama-3.3-70b-versatile` ternyata **sudah di-deprecate**, sistem sekarang menggunakan **array provider** yang dicoba berurutan dengan fallback otomatis:

```js
const PROVIDERS = [
  { id: "gemini",  label: "Gemini",        type: "gemini", apiKey: "MASUKKAN_API_KEY_GOOGLE_DI_SINI", model: "gemini-2.5-flash-lite" },
  { id: "groq-1",  label: "Groq (Key 1)",  type: "groq",   apiKey: "MASUKKAN_API_KEY_GROQ_1_DI_SINI", model: "openai/gpt-oss-120b" },
  { id: "groq-2",  label: "Groq (Key 2)",  type: "groq",   apiKey: "MASUKKAN_API_KEY_GROQ_2_DI_SINI", model: "openai/gpt-oss-120b" },
];
```

- **Gemini**: endpoint `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={apiKey}`, body `{ contents: [{ parts: [{ text: prompt }] }] }`. **Penting:** API key Gemini yang valid untuk endpoint ini HARUS dari **Google AI Studio** (https://aistudio.google.com/apikey) dan berformat `AIzaSy...` — key format lain (misal `AQ....`) akan menghasilkan error 404 "model not found" karena sebenarnya key tidak punya akses ke Generative Language API.
- **Groq**: endpoint OpenAI-compatible `https://api.groq.com/openai/v1/chat/completions`, header `Authorization: Bearer {apiKey}`, body `{ model, messages: [{ role: "user", content: prompt }] }`.
- **Fallback logic**: kalau satu provider gagal dengan status **503/429/500** (bersifat sementara), provider itu ditandai "sibuk" selama 90 detik (disimpan di `localStorage`), dan game otomatis lanjut ke provider berikutnya di daftar — TANPA membuat user menunggu retry berkali-kali di provider yang sama.
- **Catatan penting soal limit Groq**: rate limit Groq itu **per akun (organization), bukan per API key**. Kalau 2+ key berasal dari akun yang sama, mereka berbagi kuota yang sama (tidak terkali). Untuk benar-benar menambah kapasitas, key harus dari akun Groq yang berbeda-beda.

### Sistem Cooldown berbasis localStorage (status "sibuk" provider)

```js
const COOLDOWN_KEY = "bgku_ai_cooldowns";
const COOLDOWN_DURATION_MS = 90 * 1000;
```
- `getCooldowns()`, `saveCooldowns()`, `markProviderBusy(id)`, `clearProviderBusy(id)`, `clearAllCooldowns()`.
- `getProviderOrder()`: provider yang "bebas" dicoba dulu (urutan asli), provider yang masih cooldown ditaruh di belakang (diurutkan dari yang paling cepat pulih) sebagai cadangan terakhir.
- Provider yang **berhasil** menjawab otomatis di-`clearProviderBusy()` (dianggap sudah pulih).
- **Tombol sampah** 🗑️ di pojok kiri atas header (sebelah tombol tema) meng-clear `localStorage` cooldown ini secara manual — ada animasi shake pada tombol + toast notifikasi kecil di bawah layar ("Status AI sibuk sudah direset ✔") saat diklik.

## 6. Sistem Power Score (localStorage) — Perbandingan Instan untuk Nama yang Sudah Pernah Muncul

Fitur terbaru yang diminta: **kalau kedua nama yang bertarung (juara & penantang) sudah pernah tercatat sebelumnya, jangan panggil AI lagi** — langsung bandingkan skor tersimpan, yang lebih tinggi otomatis menang.

```js
const POWER_SCORE_KEY = "bgku_power_scores"; // { "goku": 87, "pajak": 12, ... } — key = nama lowercase
```

- `getStoredScore(name)` / `setStoredScore(name, value)` / `clearAllPowerScores()`.
- **Alur di `getJuryDecision(challenger1, challenger2)`:**
  1. Cek `getStoredScore()` untuk kedua nama.
  2. **Kalau KEDUA sudah punya skor** → putuskan instan (skor lebih tinggi menang, seri = acak), `reason` dibuat lokal ("Keputusan instan dari data tersimpan: X (skor ..) vs Y (skor ..)"), `providerLabel: "Data Tersimpan (Lokal)"` — **tidak ada panggilan API sama sekali**, jadi hemat kuota & instan.
  3. **Kalau salah satu/keduanya masih baru** → tetap panggil AI seperti biasa (dengan fallback multi-provider di atas), TAPI prompt-nya dimodifikasi supaya AI juga mengembalikan `power1` dan `power2` (skor 1-100 untuk masing-masing kandidat) selain `winner` dan `reason`. Skor hanya disimpan untuk nama yang **belum** pernah tercatat (skor yang sudah ada tidak ditimpa lagi, supaya konsisten antar ronde).
- Format JSON yang diminta ke AI (update dari versi awal yang cuma `winner` + `reason`):
  ```
  {"winner": "...", "reason": "...", "power1": <1-100>, "power2": <1-100>}
  ```
- **UI tambahan yang sedang dikerjakan (belum sepenuhnya selesai di kode terakhir)**:
  - Elemen `#championScore` di bawah nama juara bertahan, untuk menampilkan skor tersimpan si juara (kalau ada).
  - Elemen `#challengerHint` di bawah input penantang, untuk menampilkan hint real-time saat user mengetik nama yang ternyata sudah pernah tercatat (misal "⚡ Sudah pernah bertarung, skor: 87").
  - Referensi DOM untuk kedua elemen ini (`championScoreEl`, `challengerHint`) **sudah ditambahkan** di kode, tapi **logika untuk mengisi/update teksnya saat ronde berganti dan saat user mengetik BELUM ditulis** — ini pekerjaan yang masih perlu diselesaikan.
  - Pertimbangkan juga apakah tombol sampah perlu opsi tambahan untuk menghapus `bgku_power_scores` (scoreboard) secara terpisah dari cooldown provider, karena keduanya adalah data yang berbeda konsepnya (status sibuk vs skor permanen tiap nama).

## 7. Riwayat Perbaikan Bug/Isu Sepanjang Development (konteks penting)

1. **jQuery dihapus** → diganti vanilla JS penuh atas permintaan user.
2. **Model Gemini `gemini-3.7-flash`** sempat dipakai lalu diganti `gemini-2.5-flash-lite` karena `gemini-3.7-flash` sering 503 "high demand" (model preview terbaru, traffic tinggi).
3. **Model Groq `llama-3.3-70b-versatile`** ternyata sudah **di-deprecate per pengumuman 17 Juni 2026** → diganti ke `openai/gpt-oss-120b` (model pengganti resmi Groq).
4. **API key Gemini format `AQ.xxx`** menyebabkan 404 "model not found" karena bukan key dari Google AI Studio → user diarahkan membuat key baru di https://aistudio.google.com/apikey yang formatnya `AIzaSy...`.
5. Sempat dibahas alternatif provider lain di luar Gemini/Groq: **DeepSeek** (tidak gratis penuh, ada biaya kecil per token + risiko latensi jam sibuk Tiongkok), **Cerebras** (ternyata sekarang cuma trial $5/30 hari, bukan gratis permanen lagi), **Mistral AI** (1 miliar token/bulan gratis), **SambaNova Cloud** (200rb token/hari gratis, kecepatan sekelas Groq), **Cloudflare Workers AI** (10rb neuron/hari gratis permanen, edge network). Keputusan akhir: tetap pakai kombinasi **1 key Gemini + 2 key Groq**.
6. Warning `cdn.tailwindcss.com should not be used in production` di console **aman diabaikan** untuk project skala kecil/personal seperti ini (bukan error).

## 8. Struktur Fungsi JavaScript Kunci (untuk referensi saat lanjut development)

- `getCooldowns/saveCooldowns/markProviderBusy/clearProviderBusy/clearAllCooldowns/getProviderOrder` — sistem cooldown provider.
- `getPowerScores/savePowerScores/getStoredScore/setStoredScore/clearAllPowerScores` — sistem skor kekuatan nama.
- `callGemini(provider, prompt)` / `callGroq(provider, prompt)` / `callProvider(provider, prompt)` — pemanggil fetch per jenis provider, mengembalikan teks mentah, melempar `Error` dengan properti `.status` kalau gagal.
- `getJuryDecision(challenger1, challenger2)` — orkestrator utama: cek skor tersimpan → kalau belum lengkap, loop provider dengan fallback → return `{ winner, reason, providerLabel }`.
- `cekModelTersedia(providerId = "gemini")` — fungsi debug manual (dipanggil dari console browser) untuk mengecek key & daftar model Gemini yang valid.
- Di dalam `DOMContentLoaded`: state game (`currentChampion`, `roundNumber`, `isProcessing`), fungsi UI (`updateThemeIcon`, `startLoadingDots/stopLoadingDots`, `typeWriter`, `addHistory`, `resetCorners`, `showToast`, `startBattle`, `showVerdict`), dan event listener (`themeToggleBtn`, `clearStatusBtn`, `battleForm` submit).

## 9. Yang Harus Dihasilkan

Satu file `index.html` utuh, siap pakai di browser (tinggal buka filenya), dengan seluruh fitur di atas sudah terintegrasi dan berfungsi. Sertakan komentar kode yang jelas (bahasa Indonesia) di bagian konfigurasi API key dan di setiap fungsi utama, supaya mudah dimodifikasi nanti.



Bertindaklah sebagai Senior Fullstack Developer dan Game Designer. Buatkan kode lengkap untuk web game "Batu Gunting Kertas Unlimited". Game ini menggunakan Single Page Application (SPA) dalam 1 file `index.html` dan backend Serverless Vercel (`/api/juri.js`).

JANGAN GUNAKAN LIBRARY EKSTERNAL selain Tailwind CSS (via CDN) dan Font (Google Fonts). Gunakan Vanilla JavaScript murni.

### 1. STRUKTUR LAYAR (UI FLOW)
Buatkan manajemen state UI (menyembunyikan/menampilkan div) untuk layar berikut:
- `start_screen`: Berisi 3 tombol (Singleplayer, Multiplayer, Settings).
- `settings_screen`: Toggle Light/Dark mode (menyimpan preferensi di localStorage), dan input input nama pemain.
- `singleplayer_screen` / `multiplayer_screen`: Tampilan area bertarung. Singleplayer (Player vs AI/Randomizer), Multiplayer (Player 1 vs Player 2 bergantian input nama serangan).
- `play_screen`: Arena pertarungan utama. Menampilkan Timer (Hitung mundur 1 atau 2 menit). Di mode ini, serangan dieksekusi.
- `juri_loading_screen`: Animasi loading yang keren saat sistem memanggil API Juri AI Vercel.
- `finis_screen`: Menampilkan pemenang akhir berdasarkan skor tertinggi setelah timer habis.

### 2. FITUR & ANIMASI FRONTEND
- Tambahkan animasi CSS/Tailwind yang keren saat terjadi benturan/pertarungan (misal: efek getar/shake, flash, atau partikel sederhana).
- Timer Mode Arcade: Game berjalan selama batas waktu. Jika waktu habis, otomatis pindah ke `finis_screen`.
- Skor Poin: Setiap kali menang ronde, poin pemain bertambah. Poin ini yang menentukan kemenangan di akhir timer.

### 3. BACKEND VERCEL & LOGIKA AI JURI (`/api/juri.js`)
Buatkan kode Node.js Serverless Vercel yang menerima POST request berisi `player_1_attack`, `player_2_attack`, dan memanggil LLM.
- Format Array Provider Fallback di Backend (untuk mencegah Limit):
  1. Gemini (Prioritas 1)
  2. Groq Key 1 (Prioritas 2)
  3. Groq Key 2 (Prioritas 3)
- Logika Prompt AI (PENTING): AI harus mengembalikan JSON dengan format `{"pemenang": "...", "atk": <angka>, "def": <angka>, "kelemahan": "...", "alasan": "..."}`.
- PERATURAN MUTLAK JURI AI: Nilai ATK/DEF hanyalah bumbu. Penentu kemenangan WAJIB berdasarkan "kelemahan konseptual". (Misal: Saitama ATK 9999 kalah lawan Pajak ATK 1 karena Saitama punya kelemahan konseptual tidak punya uang).

### 4. CACHING & ULTIMATE FALLBACK (Frontend)
- Caching API: Sebelum menembak ke Vercel, Frontend JS harus mengecek `localStorage`. Jika duel yang sama (misal "Api vs Air") sudah ada di history localStorage, langsung gunakan data tersebut. Jangan panggil Vercel. 
- Jika Vercel berhasil memanggil AI, simpan hasil JSON tersebut ke `localStorage` agar duel berikutnya instan.
- Ultimate Fallback: Jika endpoint Vercel mengembalikan error beruntun (semua AI limit/down), hentikan loading dan kembalikan alasan hardcoded: "Juri AI sedang pusing mikirin rumus matematika, tunggu 10 menit ya!". Berikan kondisi "You Win" / auto-menang kepada pemain untuk mengakhiri ronde.

Tolong berikan:
1. File `index.html` lengkap (berisi HTML, CSS Tailwind, dan Vanilla JS untuk SPA, Timer, dan Caching).
2. File `/api/juri.js` lengkap untuk Serverless Vercel (dengan sistem fallback 3 Provider, tanpa hardcode API key, gunakan process.env).