require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');

const app = express();
const port = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json());
// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Configure Multer for handling file uploads in memory
const upload = multer({ storage: multer.memoryStorage() });

// ─── API Endpoint: Analyze Speech ───────────────────────────────────────────
app.post('/api/analyze', upload.single('audio'), async (req, res) => {
  try {
    const audioFile = req.file;
    const { transcript, coachPersona, clientMetrics } = req.body;

    if (!audioFile) {
      return res.status(400).json({ error: 'Audio file is required' });
    }

    const metrics = JSON.parse(clientMetrics);

    // Prepare System Prompt
    const systemPrompt = `Anda adalah pelatih public speaking kelas dunia dengan pengalaman melatih ribuan pembicara profesional. Analisis file audio dan transkrip yang diberikan berikut ini secara mendalam dan komprehensif. PIDATO INI DALAM BAHASA INDONESIA, MAKA SEMUA RESPONS ANDA WAJIB DALAM BAHASA INDONESIA.

## Tugas Anda:
1. **Evaluasi Kualitatif**: Akurasi tata bahasa, kekayaan kosakata, koherensi topik, dan struktur argumen.
2. **Evaluasi Audio**: Intonasi (monoton vs dinamis), emosi vokal (percaya diri, cemas, antusias), kecepatan bicara, kejelasan artikulasi, dan penggunaan jeda.
3. **Identifikasi Kelebihan**: Temukan minimal 2-3 hal yang sudah dilakukan dengan baik oleh pembicara. Berikan pujian yang spesifik, bukan generik.
4. **Identifikasi Area Perbaikan**: Temukan minimal 2-3 area konkret yang perlu ditingkatkan. Jelaskan MENGAPA itu penting.
5. **Berikan Tips Praktis**: Berikan 2-3 tips latihan yang sangat spesifik dan bisa langsung dipraktikkan (bukan nasihat umum).
6. **Kalimat Motivasi**: Akhiri dengan satu kalimat motivasi yang membangkitkan semangat.

## Karakter Pelatih: "${coachPersona}"
- "professional": Berikan analisis yang tajam, terstruktur, dan penuh wawasan. Gunakan bahasa formal namun hangat. Fokus pada data dan fakta dari rekaman.
- "roaster": Berbicaralah dengan sangat jujur, brutal, dan penuh humor sarkastis. Ejek kesalahan mereka dengan lucu tapi tetap berikan substansi yang berguna. Gunakan emoji dan bahasa gaul Indonesia.
- "therapist": Bersikap sangat hangat, suportif, dan penuh empati. Awali dengan apresiasi tulus. Sampaikan kritik dengan sangat lembut menggunakan frasa seperti "mungkin bisa dicoba..." atau "bayangkan jika...". Berikan dorongan emosional.

## Format Respons JSON (WAJIB diikuti persis):
{
  "scores": {"fluency": 1-100, "grammar": 1-100, "pitch": 1-100, "emotion": 1-100, "relevance": 1-100},
  "feedback": {
    "summary": "Paragraf ringkasan keseluruhan performa (2-3 kalimat). Sesuaikan gaya bahasa dengan karakter pelatih.",
    "strengths": ["Kelebihan spesifik 1", "Kelebihan spesifik 2", "Kelebihan spesifik 3"],
    "improvements": ["Area perbaikan spesifik 1 beserta alasannya", "Area perbaikan spesifik 2 beserta alasannya"],
    "tips": ["Tips latihan konkret 1 yang bisa langsung dipraktikkan", "Tips latihan konkret 2", "Tips latihan konkret 3"],
    "motivation": "Satu kalimat motivasi penutup yang membangkitkan semangat"
  },
  "improved_vocabulary": ["kata_canggih_1", "kata_canggih_2", "kata_canggih_3", "kata_canggih_4", "kata_canggih_5"],
  "highlighted_transcript": [{"word": "eee", "type": "filler"}, {"word": "dibilang", "type": "grammar_error", "suggestion": "dikatakan"}]
}`;

    // Convert audio buffer to base64
    const audioBase64 = audioFile.buffer.toString('base64');
    const mimeType = audioFile.mimetype || 'audio/webm';

    // Call Gemini API securely from the backend
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured on the server.');
    }

    const fetch = globalThis.fetch;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{
          parts: [
            {
              inline_data: {
                mime_type: mimeType,
                data: audioBase64,
              },
            },
            {
              text: `Transcript of the speech:\n"${transcript}"\n\nClient-measured metrics:\n- WPM: ${metrics.wpm}\n- Filler words detected: ${metrics.fillerCount}\n- Long pauses (>1.5s): ${metrics.pauseCount}\n- Duration: ${metrics.durationSec.toFixed(1)}s\n\nPlease analyze and respond with the JSON structure specified.`,
            },
          ],
        }],
        generationConfig: {
          temperature: 0.7,
          responseMimeType: 'application/json',
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Gemini API Error details:', data);
      throw new Error(data.error?.message || 'Failed to analyze speech');
    }

    const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!aiText) {
      throw new Error('Invalid response format from Gemini');
    }

    const aiResult = JSON.parse(aiText);
    res.json(aiResult);

  } catch (error) {
    console.error('Error in /api/analyze:', error.message);
    res.status(500).json({ error: 'An error occurred during analysis.', details: error.message });
  }
});

// ─── API Endpoint: Generate Topics (AI Tandon Strategy) ──────────────────────
app.post('/api/topics', async (req, res) => {
  try {
    const { category, excludeList } = req.body;

    if (!category) {
      return res.status(400).json({ error: 'Category is required' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured on the server.');
    }

    // Set custom system prompt for professional speech topics
    const systemPrompt = `Anda adalah generator topik pidato, presentasi, dan debat publik kelas dunia dengan pemahaman mendalam tentang isu-isu terkini, kemanusiaan, filsafat, sains, dan pengembangan diri.
Tugas Anda adalah menghasilkan tepat 10 topik baru, unik, berbobot, menarik, dan menantang untuk kategori yang diberikan.

## Aturan Penting:
1. RESPON WAJIB DALAM BAHASA INDONESIA yang baku, indah, persuasif, dan komunikatif.
2. Setiap topik harus berupa kalimat tanya atau pernyataan persuasif pendek (1 kalimat saja) yang cocok dijadikan judul pidato/debat spontan berdurasi 1-2 menit.
3. Topik harus menantang pemikiran kritis pembicara (memiliki unsur pro dan kontra atau perspektif mendalam).
4. PENTING: Format respons harus berupa JSON array berisi string saja. Jangan ada format markdown lainnya seperti \`\`\`json atau penjelasan tambahan di luar JSON.
Contoh format output:
[
  "Apakah kecerdasan buatan akan mematikan kemampuan berpikir kritis generasi muda?",
  "Mengapa kegagalan adalah guru terbaik untuk pertumbuhan kepribadian."
]`;

    let userPrompt = `Hasilkan tepat 10 topik yang menantang dan relevan untuk kategori: "${category}".`;
    if (excludeList && Array.isArray(excludeList) && excludeList.length > 0) {
      userPrompt += `\n\nPENTING: Hindari menghasilkan topik yang serupa atau sama dengan daftar berikut (EXCLUDE LIST):\n${excludeList.map(t => `- "${t}"`).join('\n')}`;
    }
    userPrompt += `\n\nPastikan tepat 10 topik dan langsung kembalikan dalam format JSON array of strings.`;

    const fetch = globalThis.fetch;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{
          parts: [{ text: userPrompt }]
        }],
        generationConfig: {
          temperature: 0.85, // Slightly higher temperature for more diverse topics
          responseMimeType: 'application/json',
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Gemini Topic API Error details:', data);
      throw new Error(data.error?.message || 'Failed to generate topics');
    }

    const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!aiText) {
      throw new Error('Invalid response format from Gemini');
    }

    // Try to parse to verify it is valid JSON array of strings
    const topicsArray = JSON.parse(aiText);
    if (!Array.isArray(topicsArray)) {
      throw new Error('Response is not a valid JSON array');
    }

    res.json({ topics: topicsArray });

  } catch (error) {
    console.error('Error in /api/topics:', error.message);
    res.status(500).json({ error: 'An error occurred while generating topics.', details: error.message });
  }
});


// Start the server
app.listen(port, () => {
  console.log(`🚀 SpeechBlitz Backend running on port ${port}`);
});
