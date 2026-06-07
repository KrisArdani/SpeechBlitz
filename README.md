# SpeechBlitz - AI-Powered Public Speaking Training Platform

[![Node.js Version](https://img.shields.io/badge/node-%253E%253D%252020.0-blue.svg)](https://nodejs.org/)
[![Express Framework](https://img.shields.io/badge/framework-Express-lightgrey.svg)](https://expressjs.com/)
[![AI Engine](https://img.shields.io/badge/AI-Gemini%202.5%20Flash-blueviolet.svg)](https://ai.google.dev/)
[![Docker Ready](https://img.shields.io/badge/docker-compatible-blue.svg)](https://www.docker.com/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

SpeechBlitz adalah aplikasi full-stack (Web & API) interaktif yang dirancang untuk melatih kemampuan berbicara spontan (*impromptu public speaking*) secara mandiri. Menggunakan kecerdasan buatan **Google Gemini 2.5 Flash**, SpeechBlitz menantang pengguna untuk berbicara mengenai topik yang di-generate secara acak, merekam suara mereka, lalu memberikan analisis komprehensif serta umpan balik dari berbagai pilihan karakter pelatih (*Coach Personas*).

---

## 🎥 Demo Video

Berikut adalah rekaman demonstrasi fitur dan alur kerja aplikasi SpeechBlitz:

[![Tonton Demo SpeechBlitz](https://dms.licdn.com/playlist/vid/v2/D5605AQH7qGoNabG6fA/thumbnail-with-play-button-overlay-high/B56Z50fRrYHAC0-/0/1780070820616?e=2147483647&v=beta&t=RCyGJaDzo4OnbYsOvxRR-c-2bfstLIQThAM8F9qcltc)](https://www.linkedin.com/posts/kris-ardani-5a7758409_juaravibecoding-publicspeaking-geminiai-ugcPost-7466158008163536896-tN9K/?utm_source=share&utm_medium=member_desktop&rcm=ACoAAGg6ck8B-IgU378pBLCdvwn5629pK0aptEs)

---

## 🌟 Fitur Utama

### 1. AI Speech Analysis & Scoring
*   **Analisis Multi-Dimensi**: Menilai kemampuan berpidato berdasarkan 5 metrik utama: Kelancaran (*Fluency*), Tata Bahasa (*Grammar*), Nada Suara (*Pitch*), Emosi Vokal (*Emotion*), dan Relevansi Isi dengan Topik (*Relevance*).
*   **Deteksi Kecepatan & Jeda**: Melacak kecepatan bicara (WPM - *Words Per Minute*), jumlah kata pengisi (*filler words* seperti "eee", "aaa", "hm"), dan jeda panjang yang tidak perlu (> 1.5 detik).
*   **Koreksi Kosakata & Tata Bahasa**: Menyoroti kesalahan tata bahasa, menyarankan pilihan kata (*vocabulary*) yang lebih profesional atau canggih, serta menandai penempatan kata pengisi secara visual pada transkrip.

### 2. Karakter Pelatih Unik (Coach Personas)
Pengguna dapat memilih gaya umpan balik berdasarkan karakter pelatih yang diinginkan:
*   **Professional**: Memberikan kritik yang tajam, objektif, terstruktur, berbasis data rekaman, menggunakan bahasa formal namun membimbing.
*   **Roaster**: Memberikan kritik secara brutal, jujur, sarkastis, dan jenaka menggunakan bahasa gaul khas Indonesia dan emoji untuk menyindir kesalahan bicara dengan cara yang menghibur.
*   **Therapist**: Memberikan umpan balik dengan sangat lembut, hangat, penuh empati, mengapresiasi usaha pembicara terlebih dahulu, dan memberikan kritik secara halus agar tidak menjatuhkan mental.

### 3. AI Topic Generator (Impromptu Challenge)
*   Menghasilkan 10 topik pidato spontan yang menantang secara dinamis berdasarkan kategori (filsafat, teknologi, pengembangan diri, isu sosial, dll.).
*   Dilengkapi dengan fitur *Exclude List* untuk memastikan topik yang dihasilkan selalu baru dan tidak berulang.

---

## 🛠️ Arsitektur & Teknologi

*   **Backend**: Node.js dengan Express framework.
*   **Frontend**: Client-side modern berbasis HTML5, CSS3, dan Vanilla JavaScript (disajikan secara statis dari folder `public/`).
*   **AI Integration**: Google Gemini API (`gemini-2.5-flash`) untuk pemrosesan file audio dan analisis teks secara aman dari server-side.
*   **Audio Upload Handler**: Multer (memproses file rekaman audio langsung di memori buffer tanpa mengotori penyimpanan server).
*   **Containerization**: Dockerfile dengan strategi *multi-stage build* untuk memperkecil ukuran image produksi.

---

## 📂 Struktur Folder Proyek

```text
├── public/                # Aset frontend statis (HTML, CSS, JS client)
│   ├── index.html         # Halaman antarmuka utama aplikasi
│   ├── style.css          # Desain tata letak dan animasi
│   └── app.js             # Logika perekaman audio dan konsumsi API
├── .dockerignore          # File pengecualian untuk build Docker
├── .gitignore             # File pengecualian untuk Git
├── Dockerfile             # Konfigurasi container Docker
├── package.json           # Dependensi proyek dan npm scripts
├── package-lock.json      # Kunci versi dependensi
├── server.js              # Entrypoint server Express dan integrasi Gemini API
└── README.md              # Dokumentasi proyek
```

---

## 🚀 Panduan Memulai (Instalasi Lokal)

### 1. Prasyarat
Pastikan Anda telah menginstal:
*   [Node.js](https://nodejs.org/) (Versi 20.0 atau lebih tinggi).
*   [API Key Google Gemini](https://aistudio.google.com/) (Dapatkan secara gratis di Google AI Studio).

### 2. Kloning Repositori
```bash
git clone https://github.com/KrisArdani/SpeechBlitz.git
cd SpeechBlitz
```

### 3. Instal Dependensi
```bash
npm install
```

### 4. Konfigurasi Kunci API (Environment)
Buat file bernama `.env` di direktori utama (root) proyek dan tambahkan kunci API Gemini Anda:
```env
PORT=8080
GEMINI_API_KEY=isi_dengan_gemini_api_key_anda
```

### 5. Jalankan Aplikasi
*   **Mode Produksi**:
    ```bash
    npm start
    ```
*   **Mode Pengembangan (Auto-Reload)**:
    ```bash
    npm run dev
    ```

Buka browser Anda dan akses `http://localhost:8080`.

---

## 🐳 Menggunakan Docker

Anda dapat menjalankan SpeechBlitz di dalam container Docker dengan langkah berikut:

1.  **Build Docker Image**:
    ```bash
    docker build -t speechblitz .
    ```
2.  **Jalankan Container**:
    ```bash
    docker run -d -p 8080:8080 --env GEMINI_API_KEY="kunci_api_gemini_anda" speechblitz
    ```
3.  Akses aplikasi di browser pada URL `http://localhost:8080`.

---

## 🔌 Dokumentasi API Endpoint

### 1. `POST /api/analyze`
Mengunggah file audio rekaman beserta data pendukung untuk dianalisis oleh AI.

*   **Content-Type**: `multipart/form-data`
*   **Body Parameters**:
    *   `audio` (File): Rekaman audio pidato (format `.webm`, `.wav`, atau `.mp3`).
    *   `transcript` (String): Teks transkrip kasar dari suara pembicara.
    *   `coachPersona` (String): Karakter pelatih pilihan (`"professional"`, `"roaster"`, atau `"therapist"`).
    *   `clientMetrics` (JSON String): Data metrik dari sisi klien, format:
        ```json
        {
          "wpm": 120,
          "fillerCount": 3,
          "pauseCount": 2,
          "durationSec": 45.2
        }
        ```
*   **Response (JSON)**:
    ```json
    {
      "scores": { "fluency": 85, "grammar": 90, "pitch": 75, "emotion": 80, "relevance": 95 },
      "feedback": {
        "summary": "Analisis ringkas...",
        "strengths": ["Poin positif 1", "Poin positif 2"],
        "improvements": ["Hal yang harus diperbaiki beserta alasan"],
        "tips": ["Tips latihan spesifik"],
        "motivation": "Kalimat penyemangat"
      },
      "improved_vocabulary": ["kosakata_1", "kosakata_2"],
      "highlighted_transcript": [
        { "word": "eee", "type": "filler" },
        { "word": "dibilang", "type": "grammar_error", "suggestion": "dikatakan" }
      ]
    }
    ```

### 2. `POST /api/topics`
Menghasilkan daftar topik pidato spontan yang baru dan menantang.

*   **Content-Type**: `application/json`
*   **Request Body**:
    ```json
    {
      "category": "Teknologi & Masyarakat",
      "excludeList": ["Topik lama yang tidak ingin diulang"]
    }
    ```
*   **Response (JSON)**:
    ```json
    {
      "topics": [
        "Apakah privasi benar-benar mati di era media sosial?",
        "Dampak kecerdasan buatan bagi kreativitas seni manusia.",
        "... (hingga 10 topik)"
      ]
    }
    ```

---

## 📄 Lisensi
Proyek ini dilisensikan di bawah Lisensi MIT. Lihat file `LICENSE` untuk informasi lebih lanjut.
