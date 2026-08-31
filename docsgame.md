# "Batu Gunting Kertas Unlimited" — Lanjutan Development (v2)

Bertindaklah sebagai **Senior Web Developer dan Game Designer**. Ini adalah **kelanjutan** dari project game web interaktif "Batu Gunting Kertas Unlimited" — kode `index.html` dan `/api/juri.js` LENGKAP sudah pernah dibuat oleh AI lain di sesi sebelumnya (spesifikasi awalnya disertakan di bagian bawah dokumen ini sebagai `docsgame_original.md`). Dokumen ini merangkum **seluruh fitur yang SUDAH SELESAI diimplementasikan**, plus **dua pembaruan besar terbaru** yang sudah masuk ke kode. Pahami dulu seluruh konteks di bawah sebelum melanjutkan pekerjaan apa pun, dan JANGAN mengulang dari nol — lanjutkan dari state kode yang sudah ada.

---

## 0. Ringkasan Status Saat Ini

- `index.html`: SPA lengkap (HTML + Tailwind CDN + Vanilla JS), sudah mengimplementasikan seluruh spesifikasi awal (7 layar, dark/light mode, caching duel, cooldown provider, power score, typewriter, dsb) **DITAMBAH** sistem Chess Clock multiplayer dan sistem giliran dinamis "Winner Goes First" (dijelaskan di bagian 2 & 3 di bawah).
- `/api/juri.js`: Serverless Function Vercel, fallback 3 provider (1 Gemini + 2 Groq), TIDAK berubah dari versi awal — masih valid dan tidak perlu disentuh kecuali ada requirement backend baru.
- `package.json`: `{ "type": "module" }` supaya `export default` di `api/juri.js` jalan di Vercel.

Kalau ingin melanjutkan development, **lampirkan file `index.html` dan `api/juri.js` yang sudah jadi** sebagai referensi kode aktual, lalu gunakan dokumen ini sebagai konteks spesifikasi/keputusan desain yang sudah disepakati.

---

## 1. Fitur yang SUDAH SELESAI dari Spesifikasi Awal

Semua poin di `docsgame_original.md` (bagian bawah dokumen ini) sudah diimplementasikan penuh, termasuk bagian yang tadinya ditandai "belum selesai":

- `#championScore` dan `#challengerHint` **sudah** diisi otomatis oleh `updateChampionScoreDisplay()` dan `updateChallengerHint()` (dipanggil saat ronde baru mulai & saat user mengetik nama penantang).
- Tombol 🗑️ di header **khusus** reset cooldown provider AI (`clearAllCooldowns()`). Reset Power Score dipisah jadi tombol sendiri di `settings_screen` ("🏆 Hapus Semua Skor Kekuatan Tersimpan" → `clearAllPowerScores()`), karena kedua data ini beda konsep (status sibuk vs skor permanen).
- Sistem cooldown localStorage disambungkan ke backend lewat field `providerOrder` (dikirim frontend ke `/api/juri`) dan `failedProviders` / `providerId` (dibalikin backend), supaya urutan "provider bebas dulu" benar-benar dipakai backend (localStorage sendiri tidak bisa diakses di serverless function).

---

## 2. FITUR BARU #1 — Sistem Chess Clock (Waktu Catur) Multiplayer

**Hanya berlaku untuk mode Multiplayer.** Mode Singleplayer tetap pakai timer arcade global (hitung mundur satu arah, dari `settingsTimerDuration`, elemen `#globalTimerWrap` + `#timerDisplay`).

### 2.1 UI
- Timer arcade global (`#globalTimerWrap`) di-`hidden` saat mode multiplayer aktif; sebaliknya disembunyikan lagi di singleplayer.
- Dua elemen jam terpisah, masing-masing ditempel di **header kartu pemiliknya** (bukan bar terpisah di atas), supaya otomatis rapi di mobile (kartu stack vertikal, jam ikut nempel) maupun desktop (grid 2 kolom):
  - `#clockP1` di dalam `#cardChampion` (kartu merah, `corner1`).
  - `#clockP2` di dalam `#cardChallenger` (kartu biru, `corner2`).
- Kedua elemen jam default `class="hidden"`, di-`classList.remove('hidden')` oleh `initChessClocks()` saat multiplayer dimulai, dan `classList.add('hidden')` lagi oleh `stopChessClocks()` saat match berakhir/kembali ke menu.
- **Efek waktu kritis:** kalau sisa waktu ≤ 10 detik → `text-red-500 animate-pulse` otomatis ditambahkan lewat `renderChessClocks()`.
- **Highlight jam aktif:** jam milik pemain yang sedang jalan diberi `bg-corner1`/`bg-corner2` + `text-white` (dilepas otomatis kalau waktunya sudah kritis, supaya warna merah peringatan tidak ketiban warna solid).

### 2.2 Logika JS (state & fungsi kunci)
```js
// state tambahan
state.timeP1 = 60; state.timeP2 = 60;
state.chessInterval = null;
state.activeChessPlayer = null; // 'p1' | 'p2' | null

getChessDurationSeconds()   // baca localStorage CHESS_TIME_KEY, default 60
formatClock(totalSeconds)   // -> "MM:SS"
renderChessClocks()         // update teks + class warna kedua jam
initChessClocks()           // reset kedua waktu ke durasi setting, tampilkan elemen jam
startChessTimer(player)     // clearInterval lama lalu mulai interval baru utk 'p1'/'p2' — HANYA SATU interval aktif kapan pun
pauseChessTimer()           // clearInterval tanpa reset activeChessPlayer — dipakai saat menunggu AI Juri
stopChessClocks()           // clearInterval + sembunyikan kedua elemen jam — dipakai saat match selesai/kembali ke menu
triggerChessTimeOut(loserKey) // dipanggil dari dalam interval saat waktu = 0 saat giliran loserKey
```
- **Fairness rule (PENTING, sudah diimplementasikan):** begitu pemain kedua di setiap ronde menekan "Serang!", `pauseChessTimer()` dipanggil SEBELUM `await getJuryDecision(...)`. Ini memastikan kedua jam berhenti total selama loading/fetch AI Juri (termasuk kalau butuh fallback multi-provider yang lambat), lalu jam pemain yang berhak jalan duluan di ronde berikutnya di-resume via `startChessTimer(...)` di akhir alur (lihat bagian 3, fungsi `prepareMultiRoundTurnOrder()`).
- **Time Out = kalah otomatis:** kalau `state.timeP1` atau `state.timeP2` menyentuh 0 SAAT giliran pemain itu sedang mengetik, `triggerChessTimeOut(loserKey)` langsung menghentikan interval dan memanggil `goToFinisTimeOut(loserName, winnerName)` — layar finis khusus dengan judul tetap "WAKTU HABIS!" dan pesan: `"${winnerName} menang karena ${loserName} kelamaan mikir!"`.
- Untuk menghindari bug "timer berjalan ganda", **setiap** titik keluar dari match (`goToFinis()` dan `goToFinisTimeOut()`) memanggil **KEDUA** `stopTimer()` (arcade) dan `stopChessClocks()` (chess clock) tanpa syarat, apa pun mode yang sedang aktif.

### 2.3 Pengaturan Durasi (Settings Screen)
- Section baru di `settings_screen`: grup 6 tombol toggle (`.chess-time-opt`, `data-mins="1|2|3|5|10|custom"`) + `#chessTimeCustomInput` (`type="number"`, muncul saat "Custom" dipilih atau saat durasi tersimpan bukan salah satu preset).
- Disimpan di `localStorage` key **`bgku_time_setting`** (konstanta `CHESS_TIME_KEY`), **dalam satuan DETIK** (bukan menit) supaya langsung kompatibel dipakai `getChessDurationSeconds()`.
- `renderChessTimeSelection()` menyorot tombol yang aktif (`bg-gold border-gold text-neutral-900`) dan menyinkronkan tampilan input custom, dipanggil setiap kali layar Settings dibuka DAN setiap kali user memilih opsi baru.
- Timer arcade singleplayer (`settingsTimerDuration`, key `bgku_timer_duration`) TETAP terpisah dan tidak berubah — cuma opsi 1/2 menit seperti semula, karena hanya dipakai singleplayer.

---

## 3. FITUR BARU #2 — Label Dinamis & Giliran "Winner Goes First" (Khusus Multiplayer)

**Singleplayer sama sekali tidak terdampak** — kartu di singleplayer tetap berlabel statis "Juara Bertahan" / "Penantang" (uppercase).

### 3.1 Label Kartu Dinamis
- Span label di header kartu sekarang punya id: `#cardLabelP1` (merah) dan `#cardLabelP2` (biru). Defaultnya (HTML awal / dipakai saat singleplayer) tetap teks statis "Juara Bertahan" / "Penantang" dengan class `uppercase`.
- Saat `btnStartMulti` diklik:
  ```js
  cardLabelP1.classList.remove('uppercase');
  cardLabelP2.classList.remove('uppercase');
  cardLabelP1.textContent = `Player 1 : ${n1}`;
  cardLabelP2.textContent = `Player 2 : ${n2}`;
  ```
- Saat `btnStartSingle` diklik, pastikan label dikembalikan ke default statis + `uppercase` (supaya kalau user habis main multiplayer lalu balik ke singleplayer, label tidak nyangkut format "Player 1 : ...").
- Nama besar (font Anton, `#championName`/`#challengerName`) tetap menampilkan **teks serangan yang sedang diketik** per ronde (perilaku lama tidak berubah) — sebelum ronde pertama dimulai, keduanya diisi username P1/P2 sebagai placeholder awal.

### 3.2 Sistem Giliran Dinamis (Winner Goes First)
State baru:
```js
state.firstTurnPlayer = 'p1';  // siapa yang wajib mengetik duluan ronde ini
state.stepPlayerA = null;      // = firstTurnPlayer, dipetakan tiap awal ronde
state.stepPlayerB = null;      // lawan dari stepPlayerA
```
Aturan:
- **Ronde 1:** `state.firstTurnPlayer = 'p1'` (di-set saat `btnStartMulti`).
- **Ronde 2+:** setelah `getJuryDecision()` selesai dan pemenang ronde diketahui, `state.firstTurnPlayer` di-update ke `winnerKey` (`'p1'` atau `'p2'`, dicocokkan dari `decision.winner` vs `atk1`/`atk2`).
- **Kalau seri / winner tidak match keduanya** (`winnerKey === null` — edge case, jarang terjadi karena backend selalu memaksa `winner` jadi salah satu kandidat, tapi tetap dijaga): `state.firstTurnPlayer` **TIDAK diubah** (tetap sama seperti ronde sebelumnya).

Fungsi kunci — `prepareMultiRoundTurnOrder()` (dipanggil di awal match & di akhir setiap ronde, MENGGANTIKAN kode reset form yang lama):
```js
function prepareMultiRoundTurnOrder() {
  const first = state.firstTurnPlayer;
  const second = first === 'p1' ? 'p2' : 'p1';
  state.stepPlayerA = first;
  state.stepPlayerB = second;

  resetRonde();               // bersihkan ring pemenang, hasil panel, dst (fungsi lama, tidak berubah)
  // reset & tampilkan form step 1 untuk `first`, sembunyikan step 2
  // set label + placeholder + warna (applyTurnColor) sesuai `first`
  // startChessTimer(first)   // resume jam catur pemain pertama ronde baru
}
```
- Form step 1 (`#multiStep1Area` / `#multiAttackInput1`) dan step 2 (`#multiStep2Area` / `#multiAttackInput2`) **tidak lagi hardcode "milik" Player 1/Player 2** — sekarang murni **posisi ketik pertama vs kedua**, isinya bisa berisi input dari P1 ATAU P2 tergantung `state.stepPlayerA/B` ronde itu.
- `applyTurnColor(labelEl, inputEl, key)`: menyamakan warna label (`text-corner1`/`text-corner2`) dan border input (`border-corner1`/`border-corner2`) dengan pemain yang sedang pegang giliran itu, supaya walau posisinya "step 1", visualnya tetap konsisten dengan warna asli pemain (P1 selalu merah, P2 selalu biru, di mana pun dia mengetik).
- Placeholder input disetel dinamis tiap ronde: `Serangan ${namaPemain}...` (bukan lagi hardcode "Serangan Player 1...").
- Saat `btnMultiLock1` diklik → validasi step A tidak kosong → toggle `hidden` step1↔step2 (anti-mengintip, perilaku lama tidak berubah) → set label/placeholder/warna untuk `stepPlayerB` → `startChessTimer(stepPlayerB)`.
- Saat `btnMultiAttack2` (submit step B) → `runMultiRound()`:
  1. Ambil `atkA` (dari `#multiAttackInput1`) dan `atkB` (dari `#multiAttackInput2`).
  2. **Petakan balik ke atk1 (Player 1) / atk2 (Player 2)** berdasarkan `stepPlayerA` — supaya kartu champion (merah) SELALU menampilkan serangan P1 dan kartu challenger (biru) SELALU serangan P2, terlepas dari siapa yang mengetik duluan ronde itu.
  3. `pauseChessTimer()` → `await getJuryDecision(atk1, atk2)` → render hasil → update skor → tentukan `winnerKey` → update `state.firstTurnPlayer` (kalau ada pemenang) → `prepareMultiRoundTurnOrder()` (otomatis reset form + resume jam untuk ronde berikutnya).

### 3.3 Kompatibilitas dengan Chess Clock & Caching
- Perubahan giliran ini **tidak mengubah** logika `getJuryDecision()` (urutan cache duel / power score / API fallback tetap identik — lihat `docsgame_original.md` bagian 5 & 8) — hanya urutan SIAPA yang mengisi `atk1`/`atk2` sebelum dipanggil yang berubah, hasil akhirnya tetap dikirim dengan `(atk1, atk2)` yang konsisten posisinya (atk1 = P1, atk2 = P2), jadi cache key (`duelCacheKeyFor`, yang sudah disort alfabetis) tidak terpengaruh sama sekali.
- `prepareMultiRoundTurnOrder()` adalah **satu-satunya** tempat yang memanggil `startChessTimer()` untuk memulai ronde baru — dipanggil persis sekali di akhir `runMultiRound()` dan sekali lagi di awal match (`btnStartMulti`). Tidak ada pemanggilan `setInterval` ganda karena `startChessTimer()` selalu `clearInterval` dulu sebelum bikin interval baru.

---

## 4. Struktur File Saat Ini (tidak berubah dari awal)
1. `index.html` — SPA lengkap (HTML + CSS Tailwind + Vanilla JS untuk seluruh state UI, Chess Clock, Timer Arcade, Caching, dan integrasi fetch ke backend).
2. `/api/juri.js` — Serverless Function Vercel, fallback 3 provider (Gemini + Groq×2), tidak ada hardcode API key (`process.env.AIAPI_KEY_1/2/3`).
3. `package.json` — `{ "type": "module" }`.

## 5. Instruksi Lanjutan
Kalau ada permintaan fitur baru dari sini:
- **Selalu lampirkan** `index.html` dan `api/juri.js` versi terbaru sebagai referensi kode nyata (dokumen ini hanya konteks/keputusan desain, BUKAN pengganti membaca kode aktual).
- Jangan mengubah struktur `getJuryDecision()`, `duelCacheKeyFor()`, atau format request/response `/api/juri` kecuali diminta eksplisit — banyak fitur (cache, power score, cooldown) bergantung pada kontrak ini.
- Ikuti pola yang sudah ada: state global `state = {...}` di scope module-level, fungsi murni untuk localStorage (`get*`/`save*`/`clear*`), efek visual lewat `classList.add/remove/toggle` (bukan `innerHTML`), dan riwayat pertarungan tetap WAJIB pakai `createElement` + `textContent` (anti-XSS, jangan pernah pakai `innerHTML` untuk data bebas dari user).

---

<details>
<summary>📎 Lampiran: <code>docsgame_original.md</code> (spesifikasi awal, sebagai referensi konteks penuh)</summary>

# "Batu Gunting Kertas Unlimited"

Bertindaklah sebagai **Senior Web Developer dan Game Designer**. Lanjutkan/kembangkan game web interaktif bernama **"Batu Gunting Kertas Unlimited"** dalam satu file `index.html` (HTML + CSS + JavaScript, tanpa build tool) dan backend Serverless Vercel (`/api/juri.js`). Berikut seluruh spesifikasi, keputusan desain, dan riwayat perbaikan yang sudah disepakati sejauh ini — ikuti semuanya secara konsisten.

## 1. Konsep Game (Singleplayer & Multiplayer)
Pemain tidak dibatasi pada batu/gunting/kertas. Pemain bebas mengetik apa saja (benda, karakter, konsep abstrak — misal "Goku", "Pajak", "Air"). Setelah data masuk, sebuah **AI bertindak sebagai "Juri"** untuk menentukan pemenang beserta alasan singkat (boleh logis, lucu, atau absurd).

- **Mode Singleplayer (Endless/Arcade):** Layar utama menampilkan tantangan berjalan melawan juara bertahan sebelumnya. Pemenang ronde otomatis jadi "Juara Bertahan" berikutnya.
- **Mode Multiplayer (Local / Hot Seat):** 2 orang bergantian di satu perangkat, form disembunyikan/dimunculkan bergantian agar tidak saling mengintip.

## 2. Stack Teknologi
HTML5, Tailwind CSS via CDN, Vanilla JavaScript murni, Google Fonts (Anton, Inter, JetBrains Mono).

## 3. Arah Desain Visual
Tema poster pertarungan/arcade: kartu sudut merah (`corner1: #ff3b5c`) = Juara Bertahan, biru (`corner2: #3ba7ff`) = Penantang, badge diamond emas (`gold: #ffd166`) "VS" di tengah. Font Anton untuk judul/nama/badge. Radial glow emas di background. Animasi getar/flash saat benturan. Timer mode arcade + skor poin.

## 4. Struktur Layar
`start_screen`, `settings_screen`, `singleplayer_screen`/`multiplayer_screen`, `play_screen` (timer, eksekusi serangan), `juri_loading_screen`, `finis_screen`.

## 5. Caching & Fallback (Frontend)
Cek localStorage dulu sebelum panggil Vercel untuk duel yang sama. Simpan hasil sukses ke localStorage. Ultimate fallback kalau semua provider gagal: "Juri AI sedang pusing mikirin rumus matematika, tunggu 10 menit ya!" + auto-menang untuk pemain.

## 6. Fitur Wajib
Dark/Light toggle (localStorage, transisi halus, `darkMode:'class'`), shake effect validasi kosong, pulse glow badge VS saat fetch, fade-in-up panel hasil, typewriter efek alasan juri, ring gold pemenang + `resetRonde()`, skip loading UI kalau cache hit, riwayat WAJIB `createElement`+`textContent` (anti-XSS, dilarang `innerHTML`).

## 7. Sistem Multi-Provider AI Juri (Backend Vercel: Gemini + Groq, Fallback Otomatis)
Semua panggilan AI di `/api/juri.js`, JANGAN pernah dari frontend. Array `PROVIDERS` dari `process.env` (`AIAPI_KEY_1/2/3`, Gemini `gemini-2.5-flash-lite` + 2× Groq `openai/gpt-oss-120b`). Sistem cooldown localStorage (`bgku_ai_cooldowns`, 90 detik) dengan `getProviderOrder()` (bebas dulu, cooldown belakangan). Tombol 🗑️ reset cooldown manual + toast.

## 8. Sistem Power Score (localStorage)
`bgku_power_scores` (`{nama_lowercase: skor 1-100}`). Kalau kedua nama duel sudah punya skor tersimpan → keputusan instan lokal (tanpa panggil AI). Kalau belum → panggil AI seperti biasa tapi prompt minta `power1`/`power2` juga; skor hanya disimpan untuk nama yang belum tercatat (tidak menimpa).

## 9. Riwayat Perbaikan Bug/Isu
jQuery dihapus → vanilla JS. Model Gemini `gemini-3.7-flash` (sering 503) → `gemini-2.5-flash-lite`. Model Groq `llama-3.3-70b-versatile` di-deprecate (17 Juni 2026) → `openai/gpt-oss-120b`. API key Gemini harus format `AIzaSy...` dari aistudio.google.com/apikey (bukan format `AQ.xxx`). Alternatif provider lain dipertimbangkan (DeepSeek, Cerebras, Mistral, SambaNova, Cloudflare Workers AI) tapi keputusan akhir tetap 1 Gemini + 2 Groq. Warning `cdn.tailwindcss.com should not be used in production` aman diabaikan untuk skala personal.

## 10. Yang Harus Dihasilkan
1. `index.html` lengkap (HTML, CSS Tailwind, Vanilla JS untuk SPA, Timer, Caching).
2. `/api/juri.js` lengkap (fallback 3 provider, tanpa hardcode API key, komentar bahasa Indonesia di bagian konfigurasi & tiap fungsi utama).

</details>