/* =========================================================================
   BATU GUNTING KERTAS UNLIMITED — Variabel Global (State & Konfigurasi)
   File ini HANYA berisi deklarasi variabel/konstanta global (tidak ada
   fungsi eksekusi atau event listener). Semua fungsi & event listener
   tetap tinggal di index.html dan memakai variabel-variabel ini langsung,
   karena file ini dimuat lebih dulu (lihat urutan <script> di index.html)
   dan `let`/`const` top-level di sini otomatis terlihat oleh script lain
   di halaman yang sama (shared global scope).
   ========================================================================= */

/* ---------- KEY LOCALSTORAGE ---------- */
const THEME_KEY = 'bgku_theme';
const PLAYER_NAME_KEY = 'bgku_player_name';
const TIMER_DURATION_KEY = 'bgku_timer_duration';
const DUEL_CACHE_KEY = 'bgku_duel_cache';
const COOLDOWN_KEY = 'bgku_ai_cooldowns';
const COOLDOWN_DURATION_MS = 90 * 1000;
const POWER_SCORE_KEY = 'bgku_power_scores';
const CHESS_TIME_KEY = 'bgku_time_setting'; // durasi waktu catur multiplayer, disimpan dalam DETIK

/* ---------- KONFIGURASI PROVIDER AI JURI (untuk urutan cooldown di frontend) ---------- */
const PROVIDERS_META = [
  { id: 'gemini', label: 'Gemini' },
  { id: 'groq-1', label: 'Groq (Key 1)' },
  { id: 'groq-2', label: 'Groq (Key 2)' },
];

/* ---------- PRESET DURASI CHESS CLOCK (menit) ---------- */
const CHESS_PRESET_MINUTES = [1, 2, 3, 5, 10];

/* ---------- STATE GAME (satu-satunya sumber kebenaran / single source of truth) ---------- */
let state = {
  mode: null,          // 'single' | 'multi'
  champion: { name: 'Input Kosong', score: 0 }, // dipakai singleplayer
  scoreP1: 0, scoreP2: 0, nameP1: 'Player 1', nameP2: 'Player 2', // dipakai multiplayer
  timerRemaining: 60,
  timerInterval: null,
  roundBusy: false,
  // ---- Multiplayer turn order (winner goes first) ----
  firstTurnPlayer: 'p1',
  currentMultiTurn: 'p1',
  lastRoundWinner: null,
  multiRoundAttacks: { p1: '', p2: '' },
  // ---- Chess Clock (khusus multiplayer) ----
  timeP1: 60,
  timeP2: 60,
  chessInterval: null,
  activeChessPlayer: null, // 'p1' | 'p2' | null (null = pause)
};

/* ---------- RIWAYAT RONDE (untuk ditampilkan ulang di finis_screen) ----------
   Setiap ronde (singleplayer maupun multiplayer) yang selesai diputuskan AI
   Juri akan di-push ke sini sebagai object JSON:
   { ronde, p1, p2, pemenang, alasan }
   Direset ke [] setiap kali match baru dimulai. */
let riwayatGame = [];