// =============================================================================
// /api/juri.js — Serverless Function Vercel
// Bertugas sebagai "Juri AI" untuk game Batu Gunting Kertas Unlimited.
//
// Kenapa logika ini ada di backend (bukan langsung dari frontend)?
// Supaya API key AI (Gemini/Groq) TIDAK PERNAH terekspos ke browser pengguna
// atau ke GitHub (GitHub Secret Scanning akan menandai key yang bocor di
// kode frontend). Key hanya hidup di Environment Variables Vercel.
// =============================================================================

// -----------------------------------------------------------------------
// KONFIGURASI PROVIDER
// Tambahkan/ubah provider di sini. `apiKey` WAJIB diambil dari
// process.env — JANGAN PERNAH hardcode key langsung di kode ini.
// Set nilai env var berikut di dashboard Vercel (Settings > Environment Variables):
//   AIAPI_KEY_1 = key Gemini (format AIzaSy..., dari https://aistudio.google.com/apikey)
//   AIAPI_KEY_2 = key Groq #1
//   AIAPI_KEY_3 = key Groq #2
// -----------------------------------------------------------------------
const PROVIDERS = [
  { id: "gemini", label: "Gemini", type: "gemini", apiKey: process.env.AIAPI_KEY_1, model: "gemini-2.5-flash-lite" },
  { id: "groq-1", label: "Groq (Key 1)", type: "groq", apiKey: process.env.AIAPI_KEY_2, model: "openai/gpt-oss-120b" },
  { id: "groq-2", label: "Groq (Key 2)", type: "groq", apiKey: process.env.AIAPI_KEY_3, model: "openai/gpt-oss-120b" },
];

// -----------------------------------------------------------------------
// Menyusun ulang urutan provider berdasarkan preferensi dari frontend
// (frontend mengirim providerOrder hasil perhitungan cooldown localStorage).
// Provider yang tidak disebutkan di providerOrder tetap ikut di akhir,
// supaya seluruh provider tetap dicoba sebagai cadangan.
// -----------------------------------------------------------------------
function reorderProviders(providerOrder) {
  if (!Array.isArray(providerOrder) || providerOrder.length === 0) return PROVIDERS;
  const byId = Object.fromEntries(PROVIDERS.map(p => [p.id, p]));
  const ordered = providerOrder.map(id => byId[id]).filter(Boolean);
  const remaining = PROVIDERS.filter(p => !providerOrder.includes(p.id));
  return ordered.concat(remaining);
}

// -----------------------------------------------------------------------
// Membangun prompt untuk AI Juri. Diminta mengembalikan JSON murni saja
// (winner, reason, power1, power2) supaya mudah di-parse backend.
// -----------------------------------------------------------------------
function buildPrompt(challenger1, challenger2) {
  return `Kamu adalah "Juri AI" dalam game "Batu Gunting Kertas Unlimited". Dua pemain mengajukan apa saja (benda, karakter, konsep, hal abstrak) untuk saling bertarung, tidak terbatas pada batu/gunting/kertas.

Kandidat 1: "${challenger1}"
Kandidat 2: "${challenger2}"

Tugasmu:
1. Tentukan siapa yang menang secara logis, kreatif, atau lucu/absurd (boleh kreatif, tapi harus tetap masuk akal dalam konteks pertarungan ini).
2. Berikan alasan singkat (maksimal 2 kalimat, bahasa Indonesia, gaya santai/seru seperti komentator pertandingan).
3. Berikan skor kekuatan masing-masing kandidat dari 1-100 (power1 untuk kandidat 1, power2 untuk kandidat 2) yang merepresentasikan seberapa kuat/hebat/dominan entitas tersebut secara umum (independen dari hasil pertarungan spesifik ini, skor ini akan dipakai lagi di pertarungan lain di masa depan).

PENTING: Jawab HANYA dengan JSON murni, tanpa markdown, tanpa backtick, tanpa teks tambahan apa pun, persis format berikut:
{"winner": "<harus persis salah satu dari teks kandidat di atas>", "reason": "<alasan singkat>", "power1": <angka 1-100>, "power2": <angka 1-100>}`;
}

// -----------------------------------------------------------------------
// Mengekstrak blok JSON pertama dari teks balasan AI (berjaga-jaga kalau
// AI tetap membungkus jawaban dengan ```json ... ``` atau teks lain).
// -----------------------------------------------------------------------
function extractJson(text) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Tidak ditemukan blok JSON pada balasan AI");
  return JSON.parse(match[0]);
}

// -----------------------------------------------------------------------
// Pemanggilan provider Gemini (Google AI Studio — Generative Language API)
// -----------------------------------------------------------------------
async function callGemini(provider, prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${provider.model}:generateContent?key=${provider.apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.9, maxOutputTokens: 300 },
    }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Gemini error ${res.status}: ${errText}`);
  }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini: balasan kosong/tidak sesuai format");
  return extractJson(text);
}

// -----------------------------------------------------------------------
// Pemanggilan provider Groq (kompatibel format OpenAI chat completions)
// -----------------------------------------------------------------------
async function callGroq(provider, prompt) {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${provider.apiKey}`,
    },
    body: JSON.stringify({
      model: provider.model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.9,
      max_tokens: 300,
    }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Groq error ${res.status}: ${errText}`);
  }
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error("Groq: balasan kosong/tidak sesuai format");
  return extractJson(text);
}

// -----------------------------------------------------------------------
// Memvalidasi & merapikan hasil JSON dari AI supaya konsisten sebelum
// dikirim ke frontend (mis. winner harus cocok salah satu kandidat).
// -----------------------------------------------------------------------
function normalizeResult(raw, challenger1, challenger2) {
  const w = (raw.winner || "").toString().trim();
  let winner = w;
  // Fallback pencocokan longgar kalau AI sedikit mengubah teks kandidat.
  if (w.toLowerCase() !== challenger1.toLowerCase() && w.toLowerCase() !== challenger2.toLowerCase()) {
    winner = w.toLowerCase().includes(challenger1.toLowerCase()) ? challenger1 : challenger2;
  }
  const clampScore = n => {
    const num = Number(n);
    if (!Number.isFinite(num)) return null;
    return Math.max(1, Math.min(100, Math.round(num)));
  };
  return {
    winner,
    reason: (raw.reason || "Juri tidak memberikan alasan.").toString().slice(0, 500),
    power1: clampScore(raw.power1),
    power2: clampScore(raw.power2),
  };
}

// -----------------------------------------------------------------------
// HANDLER UTAMA
// -----------------------------------------------------------------------
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed, gunakan POST." });
    return;
  }

  const { challenger1, challenger2, providerOrder } = req.body || {};
  if (!challenger1 || !challenger2) {
    res.status(400).json({ error: "challenger1 dan challenger2 wajib diisi." });
    return;
  }

  const prompt = buildPrompt(challenger1, challenger2);
  const orderedProviders = reorderProviders(providerOrder).filter(p => !!p.apiKey);

  if (orderedProviders.length === 0) {
    res.status(500).json({ error: "Tidak ada provider AI yang terkonfigurasi (cek Environment Variables).", failedProviders: [] });
    return;
  }

  const failedProviders = [];

  // Coba tiap provider berurutan; provider pertama yang berhasil dipakai.
  for (const provider of orderedProviders) {
    try {
      const raw = provider.type === "gemini"
        ? await callGemini(provider, prompt)
        : await callGroq(provider, prompt);

      const result = normalizeResult(raw, challenger1, challenger2);

      res.status(200).json({
        winner: result.winner,
        reason: result.reason,
        power1: result.power1,
        power2: result.power2,
        providerId: provider.id,
        providerLabel: provider.label,
        failedProviders,
      });
      return;
    } catch (err) {
      // Provider ini gagal (limit/down/error format) → catat & lanjut ke provider berikutnya.
      console.error(`[juri.js] Provider ${provider.id} gagal:`, err.message);
      failedProviders.push(provider.id);
      continue;
    }
  }

  // Semua provider gagal beruntun → frontend akan memakai fallback hardcoded-nya sendiri.
  res.status(500).json({
    error: "Semua provider AI gagal merespons.",
    failedProviders,
  });
}