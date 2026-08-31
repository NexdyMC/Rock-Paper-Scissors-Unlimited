# "Batu Gunting Kertas Unlimited"

Bertindaklah sebagai **Senior Web Developer dan Game Designer**. Lanjutkan/kembangkan game web interaktif bernama **"Batu Gunting Kertas Unlimited"** dalam satu file `index.html` (HTML + CSS + JavaScript, tanpa build tool) dan backend Serverless Vercel (`/api/juri.js`). Berikut seluruh spesifikasi, keputusan desain, dan riwayat perbaikan yang sudah disepakati sejauh ini — ikuti semuanya secara konsisten.

---

## 1. Konsep Game (Singleplayer & Multiplayer)

Pemain tidak dibatasi pada batu/gunting/kertas. Pemain bebas mengetik apa saja (benda, karakter, konsep abstrak — misal "Goku", "Pajak", "Air"). Setelah data masuk, sebuah **AI bertindak sebagai "Juri"** untuk menentukan pemenang beserta alasan singkat (boleh logis, lucu, atau absurd).

Terdapat dua mode permainan dengan manajemen alur layar (UI Flow) yang berbeda:

- **Mode Singleplayer (Endless/Arcade):** 
  Layar utama menampilkan tantangan berjalan melawan juara bertahan sebelumnya. Contoh: **"[ Juara Bertahan ] VS [ Input Kosong ]"**. Pemenang dari ronde ini akan otomatis menjadi "Juara Bertahan" di ronde berikutnya dan menunggu pemain menginput penantang baru.

- **Mode Multiplayer (Local / Hot Seat):**
  Dimainkan oleh 2 orang secara bergantian di satu perangkat (HP/Laptop). Sistem wajib menggunakan transisi layar (toggle class hidden) untuk menyembunyikan input agar pemain tidak bisa saling mengintip. Alur wajibnya:
  1. Layar menampilkan form khusus Player 1. Player 1 mengetik serangannya.
  2. Player 1 menekan tombol "Kunci Input / Lanjut".
  3. Form Player 1 HILANG/DISEMBUNYIKAN secara visual (layar dibersihkan), lalu muncul form untuk Player 2.
  4. Player 2 mengetik serangannya di layar yang baru.
  5. Player 2 menekan tombol "Serang!", lalu layar menampilkan animasi benturan dan memanggil AI Juri.

## 2. Stack Teknologi (Wajib)

- **HTML5** untuk struktur.
- **Tailwind CSS via CDN** (`cdn.tailwindcss.com`) untuk styling & layout responsif.
- **Vanilla JavaScript murni** (Semua manipulasi DOM pakai `document.getElementById`, `classList`, `addEventListener`, dll).
- Google Fonts: **Anton** (font display/poster untuk judul & kata besar), **Inter** (body), **JetBrains Mono** (log riwayat & teks juri).

## 3. Arah Desain Visual

Tema "poster pertarungan/arcade fighting game", bukan minimalis generik:
- Dua **kartu sudut**: kiri = **Juara Bertahan** (merah, warna custom `corner1: #ff3b5c`), kanan = **Penantang** (biru, `corner2: #3ba7ff`), dengan badge diamond emas **"VS"** (`gold: #ffd166`) di tengah — pada mobile jadi elemen statis di antara dua kartu (stack vertikal), pada desktop (`md:`) posisinya absolute di tengah grid 2 kolom.
- Font display **Anton** untuk judul, nama juara/penantang, dan badge VS.
- Radial glow lembut di background (`radial-gradient` emas transparan).
- Tambahkan animasi CSS/Tailwind yang keren saat terjadi benturan/pertarungan (misal: efek getar/shake, flash, atau partikel sederhana).
- Timer Mode Arcade: Game berjalan selama batas waktu. Jika waktu habis, otomatis pindah ke `finis_screen`.
- Skor Poin: Setiap kali menang ronde, poin pemain bertambah. Poin ini yang menentukan kemenangan di akhir timer.

## 4. STRUKTUR LAYAR (UI FLOW)
Buatkan manajemen state UI (menyembunyikan/menampilkan div) untuk layar berikut:
- `start_screen`: Berisi 3 tombol (Singleplayer, Multiplayer, Settings).
- `settings_screen`: Toggle Light/Dark mode (menyimpan preferensi di localStorage), dan input input nama pemain.
- `singleplayer_screen` / `multiplayer_screen`: Tampilan area bertarung. Singleplayer (Player vs AI/Randomizer), Multiplayer (Player 1 vs Player 2 bergantian input nama serangan).
- `play_screen`: Arena pertarungan utama. Menampilkan Timer (Hitung mundur 1 atau 2 menit). Di mode ini, serangan dieksekusi.
- `juri_loading_screen`: Animasi loading yang keren saat sistem memanggil API Juri AI Vercel.
- `finis_screen`: Menampilkan pemenang akhir berdasarkan skor tertinggi setelah timer habis.


## 5. Caching & Fallback (Frontend)
- Caching API: Sebelum menembak ke Vercel, Frontend JS harus mengecek `localStorage`. Jika duel yang sama (misal "Api vs Air") sudah ada di history localStorage, langsung gunakan data tersebut. Jangan panggil Vercel. 
- Jika Vercel berhasil memanggil AI, simpan hasil JSON tersebut ke `localStorage` agar duel berikutnya instan.
- Ultimate Fallback: Jika endpoint Vercel mengembalikan error beruntun (semua AI limit/down), hentikan loading dan kembalikan alasan hardcoded: "Juri AI sedang pusing mikirin rumus matematika, tunggu 10 menit ya!". Berikan kondisi "You Win" / auto-menang kepada pemain untuk mengakhiri ronde.

## 6. Fitur Wajib

### a. Dark/Light Mode Toggle
- Tombol dengan icon matahari (mode gelap aktif → klik ke terang) dan bulan (mode terang aktif → klik ke gelap), saling switch pakai `classList.toggle`.
- Dark mode via `class` strategy Tailwind (`darkMode: 'class'` di `tailwind.config`, toggle class `dark` di elemen `<html>`).
- **Semua elemen** (background, teks, kartu, border) bertransisi halus (`transition: ... .45s ease`) saat tema berganti.

### b. Manajemen State UI, Efek Visual & Game Feel
Gunakan pola manipulasi DOM Vanilla JS secara eksplisit (tambah/hapus class) untuk mencegah bug animasi nyangkut.

- **Validasi Input (Shake Effect):** 
  - *Trigger:* Saat form disubmit tapi input kosong.
  - *Action:* Tambahkan class `animate-shake` (via custom `@keyframes shakeX` Tailwind) ke elemen input.
  - *Cleanup:* Gunakan `setTimeout` (misal 500ms) untuk menghapus class tersebut agar animasi bisa di-trigger lagi di percobaan berikutnya.
- **Indikator Proses API (Pulse Glow):**
  - *Trigger:* Tepat sebelum pemanggilan `fetch` ke Vercel/AI dimulai.
  - *Action:* Tambahkan class `vs-fighting` (dengan `animate-pulse` dan shadow glow) pada badge "VS".
  - *Cleanup:* Wajib dihapus di dalam blok `finally {}` atau setelah `Promise` selesai, agar badge kembali normal meskipun terjadi error.
- **Transisi Hasil Juri (Fade-in-up):**
  - *Trigger:* Saat data hasil pemenang sukses di-render ke layar.
  - *Action:* Hapus class `hidden` dan tambahkan class `@keyframes fadeInUp` pada kontainer panel keputusan.
- **Render Teks Dinamis (Typewriter):**
  - *Logika:* Buat fungsi rekursif/interval `typeWriter(text, element)` untuk mencetak alasan juri per karakter. 
  - *State:* Gunakan class `typing-cursor` pada elemen teks selama animasi berjalan, dan ganti menjadi `typing-done` (kursor hilang/diam) ketika panjang string sudah tercetak 100%.
- **Highlight Pemenang (Ring UI):**
  - *Action:* Tambahkan `ring-4 ring-gold` pada elemen div kartu yang menang.
  - *Cleanup:* Buat satu fungsi global `resetRonde()` yang bertugas secara spesifik menghapus class `ring-4` dari KEDUA belah kartu sebelum input ronde baru dibuka.
- **Efisiensi Loading UI:**
  - *Aturan:* Teks indikator "Juri AI sedang menimbang..." HANYA dimunculkan di dalam blok eksekusi API. Jika data diambil instan dari `localStorage` (cache hit), lewati blok loading ini agar UI langsung merender hasil tanpa kedip (flicker).
- **Keamanan XSS di Log Riwayat:**
  - *Aturan Mutlak:* Saat melakukan append entri riwayat pertarungan ke dalam list scrollable, WAJIB menggunakan `document.createElement()` dan memasukkan teks pemain via `.textContent`. JANGAN PERNAH menggunakan `.innerHTML` untuk merender input bebas.


## 7. Sistem Multi-Provider AI Juri (Backend Vercel: Gemini + Groq, Fallback Otomatis)

Demi keamanan dari pencurian API Key dan GitHub Secret Scanning, pemanggilan AI JANGAN PERNAH dilakukan langsung dari frontend (HTML/JS). Seluruh logika pemanggilan dan rotasi provider harus dilakukan di dalam file backend Vercel Serverless Function (`/api/juri.js`). 

Frontend hanya bertugas mengirim `fetch` ke endpoint `/api/juri`. 

Di dalam file `/api/juri.js`, gunakan array provider yang mengambil kunci dari Vercel Environment Variables:

```javascript
const PROVIDERS = [
  { id: "gemini",  label: "Gemini",        type: "gemini", apiKey: process.env.AIAPI_KEY_1, model: "gemini-2.5-flash-lite" },
  { id: "groq-1",  label: "Groq (Key 1)",  type: "groq",   apiKey: process.env.AIAPI_KEY_2, model: "openai/gpt-oss-120b" },
  { id: "groq-2",  label: "Groq (Key 2)",  type: "groq",   apiKey: process.env.AIAPI_KEY_3, model: "openai/gpt-oss-120b" },
];

### Sistem Cooldown berbasis localStorage (status "sibuk" provider)

```js
const COOLDOWN_KEY = "bgku_ai_cooldowns";
const COOLDOWN_DURATION_MS = 90 * 1000;
```
- `getCooldowns()`, `saveCooldowns()`, `markProviderBusy(id)`, `clearProviderBusy(id)`, `clearAllCooldowns()`.
- `getProviderOrder()`: provider yang "bebas" dicoba dulu (urutan asli), provider yang masih cooldown ditaruh di belakang (diurutkan dari yang paling cepat pulih) sebagai cadangan terakhir.
- Provider yang **berhasil** menjawab otomatis di-`clearProviderBusy()` (dianggap sudah pulih).
- **Tombol sampah** 🗑️ di pojok kiri atas header (sebelah tombol tema) meng-clear `localStorage` cooldown ini secara manual — ada animasi shake pada tombol + toast notifikasi kecil di bawah layar ("Status AI sibuk sudah direset ✔") saat diklik.

## 8. Sistem Power Score (localStorage) — Perbandingan Instan untuk Nama yang Sudah Pernah Muncul

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

## 9. Riwayat Perbaikan Bug/Isu Sepanjang Development (konteks penting)

1. **jQuery dihapus** → diganti vanilla JS penuh atas permintaan user.
2. **Model Gemini `gemini-3.7-flash`** sempat dipakai lalu diganti `gemini-2.5-flash-lite` karena `gemini-3.7-flash` sering 503 "high demand" (model preview terbaru, traffic tinggi).
3. **Model Groq `llama-3.3-70b-versatile`** ternyata sudah **di-deprecate per pengumuman 17 Juni 2026** → diganti ke `openai/gpt-oss-120b` (model pengganti resmi Groq).
4. **API key Gemini format `AQ.xxx`** menyebabkan 404 "model not found" karena bukan key dari Google AI Studio → user diarahkan membuat key baru di https://aistudio.google.com/apikey yang formatnya `AIzaSy...`.
5. Sempat dibahas alternatif provider lain di luar Gemini/Groq: **DeepSeek** (tidak gratis penuh, ada biaya kecil per token + risiko latensi jam sibuk Tiongkok), **Cerebras** (ternyata sekarang cuma trial $5/30 hari, bukan gratis permanen lagi), **Mistral AI** (1 miliar token/bulan gratis), **SambaNova Cloud** (200rb token/hari gratis, kecepatan sekelas Groq), **Cloudflare Workers AI** (10rb neuron/hari gratis permanen, edge network). Keputusan akhir: tetap pakai kombinasi **1 key Gemini + 2 key Groq**.
6. Warning `cdn.tailwindcss.com should not be used in production` di console **aman diabaikan** untuk project skala kecil/personal seperti ini (bukan error).

## 10. Yang Harus Dihasilkan

Tolong berikan:
1. File `index.html` lengkap (berisi HTML, CSS Tailwind, dan Vanilla JS untuk SPA, Timer, dan Caching).
2. File `/api/juri.js` lengkap untuk Serverless Vercel (dengan sistem fallback 3 Provider, tanpa hardcode API key, gunakan process.env). Sertakan komentar kode yang jelas (bahasa Indonesia) di bagian konfigurasi API key dan di setiap fungsi utama, supaya mudah dimodifikasi nanti.

---
#### semoga bisa berkerja dengan baik >w<
