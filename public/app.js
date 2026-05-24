/* ═══════════════════════════════════════════════════════════════════════════ */
/*  SpeechBlitz — app.js                                                      */
/*  Complete client-side application: UI, Recording, Analysis, AI Integration */
/* ═══════════════════════════════════════════════════════════════════════════ */

// ─── Initialize theme state immediately to avoid white flash ─────────────────
(function() {
  const storedTheme = localStorage.getItem('speechblitz_theme');
  if (storedTheme === 'dark' || (!storedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
})();

function isDarkThemeActive() {
  return document.documentElement.classList.contains('dark');
}

function initThemeUI() {
  const isDark = isDarkThemeActive();
  const sunIcon = document.getElementById('sun-icon');
  const moonIcon = document.getElementById('moon-icon');
  if (sunIcon && moonIcon) {
    if (isDark) {
      sunIcon.classList.remove('hidden');
      moonIcon.classList.add('hidden');
    } else {
      sunIcon.classList.add('hidden');
      moonIcon.classList.remove('hidden');
    }
  }
}

function toggleDarkMode() {
  SFX.click();
  const doc = document.documentElement;
  const isDark = doc.classList.toggle('dark');
  localStorage.setItem('speechblitz_theme', isDark ? 'dark' : 'light');
  initThemeUI();
  updateChartThemes();
  showToast(isDark ? '🌙 Mode gelap aktif' : '☀️ Mode terang aktif');
}

function getThemeColors() {
  const isDark = isDarkThemeActive();
  return {
    gridColor: isDark ? 'rgba(71, 85, 105, 0.3)' : 'rgba(203, 213, 225, 0.3)',
    textColor: isDark ? '#94a3b8' : '#64748b',
    angleLineColor: isDark ? 'rgba(71, 85, 105, 0.3)' : 'rgba(203, 213, 225, 0.3)'
  };
}

function updateChartThemes() {
  const colors = getThemeColors();
  
  if (radarChart) {
    radarChart.options.scales.r.grid.color = colors.gridColor;
    radarChart.options.scales.r.angleLines.color = colors.angleLineColor;
    radarChart.options.scales.r.ticks.color = colors.textColor;
    radarChart.options.scales.r.pointLabels.color = isDarkThemeActive() ? '#cbd5e1' : '#475569';
    radarChart.update();
  }
  
  if (progressChart) {
    progressChart.options.scales.y.grid.color = isDarkThemeActive() ? 'rgba(71, 85, 105, 0.15)' : 'rgba(203, 213, 225, 0.2)';
    progressChart.options.scales.y.ticks.color = colors.textColor;
    progressChart.options.scales.x.ticks.color = colors.textColor;
    progressChart.update();
  }
}

function toggleSidebar() {
  SFX.click();
  const sidebar = document.getElementById('sidebar');
  if (sidebar) {
    sidebar.classList.toggle('open');
  }
}

// Close sidebar on click outside on mobile
document.addEventListener('click', (e) => {
  const sidebar = document.getElementById('sidebar');
  const toggleBtn = document.getElementById('menu-toggle-btn');
  if (window.innerWidth <= 768 && sidebar && sidebar.classList.contains('open')) {
    if (toggleBtn && !sidebar.contains(e.target) && !toggleBtn.contains(e.target)) {
      sidebar.classList.remove('open');
    }
  }
});

// ─── Initialize Lucide Icons ────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initThemeUI();
  lucide.createIcons();
  initCustomDropdowns();
  initRadarChart();
  initProgressChart();
  loadSessionHistory();
  initTopicCache();
  initDB().catch(console.error);
});

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  SOUND EFFECTS (SFX) — Synthesized via Web Audio API                       */
/* ═══════════════════════════════════════════════════════════════════════════ */

const SFX = {
  _ctx: null,

  _getCtx() {
    if (!this._ctx || this._ctx.state === 'closed') {
      this._ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this._ctx.state === 'suspended') this._ctx.resume();
    return this._ctx;
  },

  /** Ascending chime — played when recording starts */
  recordStart() {
    const ctx = this._getCtx();
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, now + i * 0.12);
      gain.gain.linearRampToValueAtTime(0.18, now + i * 0.12 + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.25);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + i * 0.12);
      osc.stop(now + i * 0.12 + 0.3);
    });
  },

  /** Descending soft chime — played when recording stops */
  recordStop() {
    const ctx = this._getCtx();
    const now = ctx.currentTime;
    const notes = [783.99, 659.25, 523.25]; // G5, E5, C5
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, now + i * 0.1);
      gain.gain.linearRampToValueAtTime(0.15, now + i * 0.1 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.25);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + i * 0.1);
      osc.stop(now + i * 0.1 + 0.3);
    });
  },

  /** Urgent double-beep — played when timer is about to expire */
  timerWarning() {
    const ctx = this._getCtx();
    const now = ctx.currentTime;
    [0, 0.15].forEach(offset => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = 880; // A5
      gain.gain.setValueAtTime(0, now + offset);
      gain.gain.linearRampToValueAtTime(0.08, now + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.1);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.12);
    });
  },

  /** Success fanfare — played when AI results appear */
  resultsReveal() {
    const ctx = this._getCtx();
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5 E5 G5 C6
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, now + i * 0.15);
      gain.gain.linearRampToValueAtTime(0.14, now + i * 0.15 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.15 + 0.5);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + i * 0.15);
      osc.stop(now + i * 0.15 + 0.55);
    });
  },

  /** Gentle click — played on button interactions */
  click() {
    const ctx = this._getCtx();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 1200;
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.08);
  },
};

// Track whether timerWarning has been played for this recording session
let timerWarningPlayed = false;

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  PHASE 1: UI INTERACTIONS, SIDEBAR, TOPIC GENERATOR                        */
/* ═══════════════════════════════════════════════════════════════════════════ */

// ─── Constants ──────────────────────────────────────────────────────────────
const TOPICS = {
  "Teknologi": [
    "Haruskah media sosial mewajibkan verifikasi umur?",
    "Dampak kecerdasan buatan terhadap masa depan pekerjaan.",
    "Bagaimana teknologi mengubah cara kita belajar.",
    "Apakah privasi sudah mati di era media sosial?",
    "Masa depan transportasi: mobil terbang atau hyperloop?"
  ],
  "Pendidikan": [
    "Pentingnya kesadaran kesehatan mental di sekolah.",
    "Haruskah pendidikan tinggi digratiskan untuk semua orang?",
    "Mengapa membaca buku masih penting di era digital.",
    "Peran seni dan kreativitas dalam pendidikan modern.",
    "Apakah ujian standar benar-benar mengukur kecerdasan?"
  ],
  "Sosial": [
    "Haruskah pemerintah mengatur mata uang kripto?",
    "Pro dan kontra dari pendapatan dasar universal.",
    "Haruskah memberikan suara (voting) diwajibkan dalam negara demokrasi?",
    "Bagaimana perubahan iklim akan membentuk ulang ekonomi global.",
    "Etika rekayasa genetika pada manusia."
  ],
  "Pribadi": [
    "Mengapa eksplorasi luar angkasa penting bagi kelangsungan hidup manusia.",
    "Apakah bekerja dari rumah lebih baik daripada bekerja di kantor?",
    "Mengapa kegagalan sangat penting untuk pertumbuhan pribadi.",
    "Bagaimana kegiatan sukarela dapat mengubah komunitas.",
    "Kekuatan bercerita (storytelling) dalam kepemimpinan."
  ],
  "Filsafat": [
    "Apakah kebahagiaan sejati dapat diukur dengan materi?",
    "Etika di balik kloning dan rekayasa genetika manusia.",
    "Haruskah kita selalu berkata jujur dalam segala situasi?",
    "Apakah takdir itu mutlak atau kita sendiri yang menulisnya?",
    "Etika penggunaan kecerdasan buatan dalam mengambil keputusan hukum."
  ],
  "Kesehatan": [
    "Pentingnya menormalisasi diskusi kesehatan mental di lingkungan kerja.",
    "Apakah media sosial bertanggung jawab atas krisis insomnia remaja?",
    "Mengapa work-life balance lebih berharga daripada hustle culture.",
    "Dampak kecanduan gadget terhadap kemampuan fokus generasi alpha.",
    "Haruskah makanan cepat saji dikenakan pajak tinggi seperti rokok?"
  ],
  "Lingkungan": [
    "Apakah transisi penuh ke kendaraan listrik benar-benar solusi hijau?",
    "Peran individu vs korporasi dalam mengatasi krisis iklim global.",
    "Haruskah hukuman bagi pelaku pembakaran hutan diperberat secara ekstrem?",
    "Mengapa kantong plastik sekali pakai wajib dilarang secara nasional.",
    "Eko-kecemasan (eco-anxiety): ancaman nyata bagi masa depan generasi muda."
  ],
  "Ekonomi": [
    "Haruskah literasi keuangan diajarkan sejak bangku Sekolah Dasar?",
    "Dampak pergeseran cashless society terhadap pasar tradisional.",
    "Apakah kecerdasan buatan akan memicu pengangguran massal secara ekonomi?",
    "Pentingnya mendukung produk lokal daripada barang impor bermerek.",
    "Mata uang kripto: masa depan finansial atau sekadar gelembung spekulatif?"
  ],
  "Seni": [
    "Apakah karya seni buatan AI layak mendapatkan hak cipta?",
    "Dampak globalisasi budaya pop (seperti K-Pop) terhadap budaya lokal.",
    "Bagaimana algoritma media sosial mendikte selera estetika kita.",
    "Apakah konser virtual dapat menggantikan sensasi konser langsung?",
    "Peran meme internet dalam membentuk opini politik anak muda."
  ]
};

// ─── AI Tandon Topic Cache State & Management ───────────────────────────────
let topicCache = {};
let isFetchingTopics = {
  "Teknologi": false,
  "Pendidikan": false,
  "Sosial": false,
  "Pribadi": false,
  "Filsafat": false,
  "Kesehatan": false,
  "Lingkungan": false,
  "Ekonomi": false,
  "Seni": false
};

function initTopicCache() {
  try {
    const cached = localStorage.getItem('speechblitz_topic_cache');
    if (cached) {
      topicCache = JSON.parse(cached);
      // Make sure all 9 categories exist in the loaded cache
      Object.keys(TOPICS).forEach(cat => {
        if (!topicCache[cat] || !Array.isArray(topicCache[cat])) {
          topicCache[cat] = [...TOPICS[cat]];
        }
      });
    } else {
      resetTopicCacheToSeeds();
    }
  } catch (e) {
    console.warn('Could not load topic cache, using defaults:', e);
    resetTopicCacheToSeeds();
  }
}

function resetTopicCacheToSeeds() {
  topicCache = {};
  Object.keys(TOPICS).forEach(cat => {
    topicCache[cat] = [...TOPICS[cat]];
  });
  saveTopicCache();
}

function saveTopicCache() {
  try {
    localStorage.setItem('speechblitz_topic_cache', JSON.stringify(topicCache));
  } catch (e) {
    console.warn('Could not save topic cache to localStorage:', e);
  }
}

async function replenishTopicCache(category) {
  if (isFetchingTopics[category]) return false;
  isFetchingTopics[category] = true;

  console.log(`📡 [AI Tandon] Memulai pengisian tandon latar belakang untuk kategori: ${category}`);

  try {
    // Send the currently cached topics in that category to avoid duplicates
    const currentTopics = topicCache[category] || [];
    
    const response = await fetch('/api/topics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: category,
        excludeList: currentTopics
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    if (result.topics && Array.isArray(result.topics) && result.topics.length > 0) {
      // Append new topics to our cache
      topicCache[category] = [...topicCache[category], ...result.topics];
      saveTopicCache();
      console.log(`✅ [AI Tandon] Tandon kategori "${category}" berhasil diisi! Total topik sekarang: ${topicCache[category].length}`);
      return true;
    }
  } catch (error) {
    console.error(`❌ [AI Tandon] Gagal mengisi tandon untuk kategori "${category}":`, error);
  } finally {
    isFetchingTopics[category] = false;
  }
  return false;
}

const PERSONA_DESCRIPTIONS = {
  professional: "Umpan balik yang jelas dan dapat ditindaklanjuti untuk perbaikan berkelanjutan.",
  roaster: "Jujur brutal dengan sentuhan komedi. Bukan untuk yang berhati lemah!",
  therapist: "Umpan balik yang lembut dan membesarkan hati untuk membangun kepercayaan diri.",
};

const PERSONA_LABELS = {
  professional: "🎯 Profesional",
  roaster: "🔥 Tukang Roasting",
  therapist: "🧘 Terapis",
};

// ─── State ──────────────────────────────────────────────────────────────────
let currentView = 'practice';
let isRecording = false;
let mediaRecorder = null;
let audioChunks = [];
let audioContext = null;
let analyserNode = null;
let animationFrameId = null;
let recognition = null;
let recordingStartTime = 0;
let timerInterval = null;
let liveTranscript = '';
let finalTranscript = '';
let wordTimings = [];
let currentActiveWordTimings = [];
let wordCount = 0;
let fillerCount = 0;
let pauseCount = 0;
let pauseTimestamps = [];
let silenceStart = null;
let lastAudioTime = 0;
let sessionHistory = [];
let radarChart = null;
let progressChart = null;
let currentAudioBlob = null;

// ─── DOM References ─────────────────────────────────────────────────────────
const micBtn = document.getElementById('mic-btn');
const micIcon = document.getElementById('mic-icon');
const stopIcon = document.getElementById('stop-icon');
const recStatus = document.getElementById('rec-status');
const recTimer = document.getElementById('rec-timer');
const liveStats = document.getElementById('live-stats');
const waveformContainer = document.getElementById('waveform-container');
const waveformCanvas = document.getElementById('waveform-canvas');
const liveTranscriptBox = document.getElementById('live-transcript-box');
const liveTranscriptEl = document.getElementById('live-transcript');
const topicBtn = document.getElementById('topic-btn');
const topicThemeSelect = document.getElementById('topic-theme');
const timerLimitSelect = document.getElementById('timer-limit');
const topicCard = document.getElementById('topic-card');
const topicText = document.getElementById('topic-text');
const coachPersona = document.getElementById('coach-persona');
const personaDesc = document.getElementById('persona-desc');
const toastEl = document.getElementById('toast');
const toastText = document.getElementById('toast-text');

// ─── View Switching ─────────────────────────────────────────────────────────
function switchView(view) {
  SFX.click();
  currentView = view;
  
  if (typeof stopPlaybackIfPlaying === 'function') stopPlaybackIfPlaying();
  
  // Close mobile sidebar if open
  const sidebar = document.getElementById('sidebar');
  if (sidebar) {
    sidebar.classList.remove('open');
  }

  document.querySelectorAll('[id^="view-"]').forEach(el => {
    if (el.id.startsWith('view-') && !el.id.includes('title') && !el.id.includes('subtitle')) {
      el.classList.add('hidden');
    }
  });
  
  // Desktop navigation highlighting
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));

  // Mobile bottom navigation highlighting
  document.querySelectorAll('[id^="mobile-nav-"]').forEach(el => {
    el.classList.remove('text-emerald-600', 'dark:text-emerald-500', 'font-bold');
    el.classList.add('text-slate-400', 'dark:text-slate-500', 'font-medium');
  });

  const activeMobileNav = document.getElementById(`mobile-nav-${view === 'dashboard' ? 'practice' : view}`);
  if (activeMobileNav) {
    activeMobileNav.classList.remove('text-slate-400', 'dark:text-slate-500', 'font-medium');
    activeMobileNav.classList.add('text-emerald-600', 'dark:text-emerald-500', 'font-bold');
  }

  const titles = {
    practice: ['Arena Latihan', 'Berbicara dengan percaya diri. Dapatkan umpan balik AI instan.'],
    dashboard: ['Dasbor Analisis', 'Tinjau performa dan wawasan AI Anda.'],
    stats: ['Statistik Saya', 'Pantau kemajuan Anda dari waktu ke waktu.'],
    history: ['Riwayat Sesi', 'Tinjau sesi latihan sebelumnya.'],
  };

  document.getElementById('view-title').textContent = titles[view]?.[0] || 'Arena Latihan';
  document.getElementById('view-subtitle').textContent = titles[view]?.[1] || '';

  if (view === 'practice' || view === 'dashboard') {
    document.getElementById('view-practice')?.classList.toggle('hidden', view !== 'practice');
    document.getElementById('view-dashboard')?.classList.toggle('hidden', view !== 'dashboard');
    document.getElementById('nav-practice')?.classList.add('active');
  } else {
    document.getElementById(`view-${view}`)?.classList.remove('hidden');
    document.getElementById(`nav-${view}`)?.classList.add('active');
  }

  // Refresh stats charts when navigating to stats
  if (view === 'stats') {
    renderBestScores();
    updateProgressChart();
  }
  if (view === 'history') {
    renderSessionHistory();
  }
}

// ─── Topic Generator (AI Tandon Strategy) ──────────────────────────────────
topicBtn.addEventListener('click', async () => {
  if (topicBtn.classList.contains('pointer-events-none')) return;
  
  SFX.click();
  
  // 1-second visual cooldown to prevent spam clicking
  topicBtn.classList.add('pointer-events-none', 'opacity-50');
  setTimeout(() => {
    topicBtn.classList.remove('pointer-events-none', 'opacity-50');
  }, 1000);

  const selectedTheme = document.getElementById('topic-theme').value;
  let categoryToUse = selectedTheme;

  // Handle "Semua" Theme
  if (selectedTheme === "Semua") {
    const categories = Object.keys(TOPICS);
    categoryToUse = categories[Math.floor(Math.random() * categories.length)];
  }

  // Make sure cache exists for the category
  if (!topicCache[categoryToUse]) {
    topicCache[categoryToUse] = [...(TOPICS[categoryToUse] || [])];
  }

  // If tandon has items, serve instantly!
  if (topicCache[categoryToUse].length > 0) {
    const topic = topicCache[categoryToUse].shift(); // Get and remove first topic
    saveTopicCache();
    
    displayTopic(topic);
    
    // Check if level is low (<= 2) -> quietly trigger replenish in background
    if (topicCache[categoryToUse].length <= 2) {
      replenishTopicCache(categoryToUse).then(success => {
        if (!success) {
          showToast('⚠️ Gagal memperbarui tandon topik (Kuota AI Habis)');
        }
      });
    }
  } else {
    // EXTREME FALLBACK: Tandon is completely empty, show loading state and fetch synchronously
    displayLoadingTopic();
    
    try {
      // Perform direct replenishment
      const success = await replenishTopicCache(categoryToUse);
      
      // Pop the first generated topic if successful
      if (success && topicCache[categoryToUse] && topicCache[categoryToUse].length > 0) {
        const topic = topicCache[categoryToUse].shift();
        saveTopicCache();
        displayTopic(topic);
      } else {
        // Fallback to offline hardcoded topics if API is completely unreachable
        const fallbackList = TOPICS[categoryToUse] || [];
        const topic = fallbackList[Math.floor(Math.random() * fallbackList.length)];
        displayTopic(topic);
        showToast('⚠️ Mode Offline: Kuota AI habis, menampilkan topik standar');
      }
    } catch (err) {
      // Fallback on error
      const fallbackList = TOPICS[categoryToUse] || [];
      const topic = fallbackList[Math.floor(Math.random() * fallbackList.length)];
      displayTopic(topic);
      showToast('⚠️ Mode Offline: Gagal memuat topik AI');
    }
  }
});

function displayTopic(topic) {
  topicText.textContent = topic;
  topicCard.classList.remove('hidden');
  topicCard.style.animation = 'none';
  topicCard.offsetHeight; // trigger reflow
  topicCard.style.animation = '';

  // Enable microphone
  if (micBtn) {
    micBtn.removeAttribute('disabled');
    micBtn.classList.remove('disabled');
  }
  if (recStatus) {
    recStatus.textContent = 'Ketuk mikrofon untuk memulai';
    recStatus.classList.remove('text-amber-600', 'dark:text-amber-500');
    recStatus.classList.add('text-slate-400');
  }
}

function displayLoadingTopic() {
  topicText.innerHTML = `<span class="flex items-center gap-2 text-slate-400 italic font-normal">
    <span class="animate-spin inline-block w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full"></span>
    Membuka tandon AI, mencari topik premium...
  </span>`;
  topicCard.classList.remove('hidden');
}

// ─── Coach Persona Selector Buttons ──────────────────────────────────────────
const coachBtns = document.querySelectorAll('.coach-select-btn');
const coachPersonaSelect = document.getElementById('coach-persona');

coachBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    SFX.click();
    const persona = btn.dataset.coach;
    
    // Update hidden select element
    coachPersonaSelect.value = persona;
    coachPersonaSelect.dispatchEvent(new Event('change'));
  });
});

coachPersonaSelect.addEventListener('change', () => {
  const persona = coachPersonaSelect.value;
  personaDesc.textContent = PERSONA_DESCRIPTIONS[persona];
  
  // Sync button active states (handles clicks and history restoration)
  coachBtns.forEach(btn => {
    const isSelected = btn.dataset.coach === persona;
    btn.classList.toggle('active', isSelected);
    btn.classList.toggle('bg-white/90', isSelected);
    btn.classList.toggle('border-slate-200/80', isSelected);
    btn.classList.toggle('bg-white/40', !isSelected);
    btn.classList.toggle('border-slate-200/40', !isSelected);
  });
});

// ─── Custom Dropdown Logic ──────────────────────────────────────────────────
function initCustomDropdowns() {
  const containers = document.querySelectorAll('.custom-dropdown-container');

  containers.forEach(container => {
    const selectEl = container.querySelector('select');
    const triggerBtn = container.querySelector('.custom-dropdown-trigger');
    const triggerText = container.querySelector('.custom-dropdown-text');
    const menuEl = container.querySelector('.custom-dropdown-menu');
    const listEl = container.querySelector('.custom-dropdown-list');
    const color = container.dataset.color || 'emerald';

    // Tailwind color mappings for hover/active states
    const hoverBg = `hover:bg-${color}-50`;
    const activeText = `text-${color}-700`;
    const activeBg = `bg-${color}-50`;

    // Populate options
    Array.from(selectEl.options).forEach(option => {
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `w-full text-left px-3 py-2 rounded-xl text-[13px] font-medium text-slate-600 transition-all ${hoverBg} hover:text-slate-900 flex items-center justify-between`;
      btn.innerHTML = `
        <span>${option.text}</span>
        <i data-lucide="check" class="w-3.5 h-3.5 check-icon ${option.selected ? 'opacity-100' : 'opacity-0'} ${activeText}"></i>
      `;

      if (option.selected) {
        btn.classList.add(activeBg, activeText);
      }

      btn.addEventListener('click', () => {
        SFX.click();
        
        // Update hidden select
        selectEl.value = option.value;
        
        // Update trigger text
        triggerText.textContent = option.text;
        
        // Dispatch change event so other app logic runs
        selectEl.dispatchEvent(new Event('change'));

        // Update UI states
        listEl.querySelectorAll('button').forEach(b => {
          b.classList.remove(activeBg, activeText);
          b.querySelector('.check-icon').classList.replace('opacity-100', 'opacity-0');
        });
        btn.classList.add(activeBg, activeText);
        btn.querySelector('.check-icon').classList.replace('opacity-0', 'opacity-100');

        closeMenu();
      });

      li.appendChild(btn);
      listEl.appendChild(li);
    });

    // Toggle menu
    triggerBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = !menuEl.classList.contains('invisible');
      
      // Close all other menus first
      document.querySelectorAll('.custom-dropdown-menu').forEach(m => {
        m.classList.add('invisible', 'opacity-0', '-translate-y-2');
        m.classList.remove('opacity-100', 'translate-y-0');
      });

      if (!isOpen) {
        SFX.click();
        menuEl.classList.remove('invisible', 'opacity-0', '-translate-y-2');
        menuEl.classList.add('opacity-100', 'translate-y-0');
      }
    });

    function closeMenu() {
      menuEl.classList.add('invisible', 'opacity-0', '-translate-y-2');
      menuEl.classList.remove('opacity-100', 'translate-y-0');
    }

    // Close on click outside
    document.addEventListener('click', (e) => {
      if (!container.contains(e.target)) {
        closeMenu();
      }
    });
  });

  // Re-initialize icons for the new custom dropdown items
  lucide.createIcons();
}

// ─── Toast Notifications ────────────────────────────────────────────────────
function showToast(message, duration = 3000) {
  toastText.textContent = message;
  toastEl.classList.add('visible');
  setTimeout(() => toastEl.classList.remove('visible'), duration);
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  PHASE 1 CONTINUED: CHART.JS INITIALIZATION                               */
/* ═══════════════════════════════════════════════════════════════════════════ */

// ─── Radar Chart ────────────────────────────────────────────────────────────
function initRadarChart() {
  const ctx = document.getElementById('radar-chart')?.getContext('2d');
  if (!ctx) return;

  const colors = getThemeColors();

  radarChart = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: ['Kelancaran', 'Tata Bahasa', 'Nada', 'Emosi', 'Relevansi'],
      datasets: [{
        label: 'Skor Anda',
        data: [0, 0, 0, 0, 0],
        backgroundColor: 'rgba(16, 185, 129, 0.15)',
        borderColor: '#10b981',
        borderWidth: 2.5,
        pointBackgroundColor: '#10b981',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      scales: {
        r: {
          beginAtZero: true,
          max: 100,
          min: 0,
          ticks: {
            stepSize: 20,
            display: true,
            backdropColor: 'transparent',
            font: { size: 10, family: 'Inter' },
            color: colors.textColor,
          },
          grid: {
            color: colors.gridColor,
            lineWidth: 1,
          },
          angleLines: {
            color: colors.angleLineColor,
          },
          pointLabels: {
            font: { size: 12, family: 'Inter', weight: '600' },
            color: isDarkThemeActive() ? '#cbd5e1' : '#475569',
          },
        },
      },
      plugins: {
        legend: { display: false },
      },
      animation: {
        duration: 800,
        easing: 'easeOutQuart',
      },
    },
  });
}

// ─── Progress Chart (Line) ──────────────────────────────────────────────────
function initProgressChart() {
  const ctx = document.getElementById('progress-chart')?.getContext('2d');
  if (!ctx) return;

  const colors = getThemeColors();

  progressChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        {
          label: 'Kelancaran',
          data: [],
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          borderWidth: 2,
          tension: 0.4,
          fill: true,
          pointRadius: 4,
          pointHoverRadius: 6,
        },
        {
          label: 'Tata Bahasa',
          data: [],
          borderColor: '#3b82f6',
          borderWidth: 2,
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 6,
        },
        {
          label: 'Keseluruhan',
          data: [],
          borderColor: '#8b5cf6',
          borderWidth: 2.5,
          tension: 0.4,
          pointRadius: 5,
          pointHoverRadius: 7,
          borderDash: [5, 3],
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          grid: { color: isDarkThemeActive() ? 'rgba(71, 85, 105, 0.15)' : 'rgba(203, 213, 225, 0.2)' },
          ticks: { font: { size: 11, family: 'Inter' }, color: colors.textColor },
        },
        x: {
          grid: { display: false },
          ticks: { font: { size: 11, family: 'Inter' }, color: colors.textColor },
        },
      },
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            usePointStyle: true,
            pointStyle: 'circle',
            padding: 16,
            font: { size: 11, family: 'Inter', weight: '500' },
            color: colors.textColor,
          },
        },
      },
    },
  });
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  PHASE 2: MEDIA RECORDER, WEB SPEECH API, WAVEFORM, CALCULATIONS          */
/* ═══════════════════════════════════════════════════════════════════════════ */

// ─── Microphone Button Handler ──────────────────────────────────────────────
micBtn.addEventListener('click', () => {
  if (isRecording) {
    stopRecording();
  } else {
    startRecording();
  }
});

// ─── Start Recording ───────────────────────────────────────────────────────
async function startRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    // Reset state
    audioChunks = [];
    liveTranscript = '';
    finalTranscript = '';
    wordTimings = [];
    wordCount = 0;
    fillerCount = 0;
    pauseCount = 0;
    pauseTimestamps = [];
    silenceStart = null;
    lastAudioTime = Date.now();

    // ── MediaRecorder ──
    mediaRecorder = new MediaRecorder(stream, { mimeType: getSupportedMimeType() });
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) audioChunks.push(e.data);
    };
    mediaRecorder.onstop = handleRecordingStop;
    mediaRecorder.start(250); // collect in 250ms chunks

    // ── Web Audio API for waveform ──
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioContext.createMediaStreamSource(stream);
    analyserNode = audioContext.createAnalyser();
    analyserNode.fftSize = 2048;
    analyserNode.smoothingTimeConstant = 0.8;
    source.connect(analyserNode);

    // ── Web Speech API ──
    startSpeechRecognition();

    // ── UI Updates ──
    isRecording = true;
    recordingStartTime = Date.now();
    micBtn.classList.add('recording');
    document.body.classList.add('recording-active');
    micIcon.classList.add('hidden');
    stopIcon.classList.remove('hidden');
    recStatus.textContent = 'Merekam... Ketuk untuk berhenti';
    recStatus.classList.remove('text-slate-400');
    recStatus.classList.add('text-rose-500');
    recTimer.classList.remove('opacity-0');
    recTimer.classList.add('text-rose-500');
    recTimer.classList.remove('text-emerald-600');
    liveStats.classList.remove('opacity-0');
    waveformContainer.classList.remove('opacity-0');
    liveTranscriptBox.classList.remove('hidden');
    liveTranscriptEl.textContent = 'Mendengarkan...';

    // ── Start timers ──
    timerInterval = setInterval(updateTimer, 100);
    drawWaveform();
    monitorSilence();

    showToast('🎙️ Perekaman dimulai');
    SFX.recordStart();
    timerWarningPlayed = false;
  } catch (err) {
    console.error('Microphone access denied:', err);
    showToast('⚠️ Akses mikrofon ditolak. Mohon izinkan mikrofon.');
  }
}

// ─── Stop Recording ─────────────────────────────────────────────────────────
function stopRecording() {
  if (!isRecording) return;
  isRecording = false;

  // Stop MediaRecorder
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
    mediaRecorder.stream.getTracks().forEach(t => t.stop());
  }

  // Stop Speech Recognition
  if (recognition) {
    recognition.stop();
    recognition = null;
  }

  // Stop waveform animation
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }

  // Close AudioContext
  if (audioContext) {
    audioContext.close();
    audioContext = null;
  }

  // Stop timer
  clearInterval(timerInterval);

  // UI Reset
  micBtn.classList.remove('recording');
  document.body.classList.remove('recording-active');
  micIcon.classList.remove('hidden');
  stopIcon.classList.add('hidden');
  recStatus.textContent = 'Memproses suara Anda...';
  recStatus.classList.remove('text-rose-500');
  recStatus.classList.add('text-emerald-600');
  SFX.recordStop();
}

// ─── Handle Recording Complete ──────────────────────────────────────────────
function handleRecordingStop() {
  const mimeType = getSupportedMimeType();
  currentAudioBlob = new Blob(audioChunks, { type: mimeType });

  const durationSec = (Date.now() - recordingStartTime) / 1000;
  const durationMin = durationSec / 60;

  // Final calculations
  const totalWords = finalTranscript.trim().split(/\s+/).filter(w => w.length > 0).length;
  const wpm = durationMin > 0 ? Math.round(totalWords / durationMin) : 0;

  // Count fillers in final transcript (Indonesian common fillers)
  const fillerRegex = /\b(eee+|emm+|anu|seperti|kayak|ibaratnya|sebenarnya|ya|itu|kan|nah)\b/gi;
  const fillerMatches = finalTranscript.match(fillerRegex) || [];
  fillerCount = fillerMatches.length;

  // Populate summary cards
  document.getElementById('result-duration').textContent = formatTime(durationSec);
  document.getElementById('result-wpm').textContent = wpm;
  document.getElementById('result-fillers').textContent = fillerCount;
  document.getElementById('result-pauses').textContent = pauseCount;

  // Switch to dashboard
  switchView('dashboard');
  document.getElementById('view-title').textContent = 'Dasbor Analisis';
  document.getElementById('view-subtitle').textContent = 'Tinjau performa dan wawasan AI Anda.';

  // Show loading state
  document.getElementById('ai-loading').classList.remove('hidden');
  document.getElementById('ai-feedback-content').classList.add('hidden');

  // Update coach badge
  const persona = coachPersona.value;
  document.getElementById('coach-badge').textContent = PERSONA_LABELS[persona];

  // Trigger AI analysis
  analyzeWithAI(currentAudioBlob, finalTranscript, persona, {
    wpm,
    fillerCount,
    pauseCount,
    durationSec,
  });
}

// ─── Web Speech API ─────────────────────────────────────────────────────────
function startSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    console.warn('Web Speech API not supported');
    return;
  }

  recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'id-ID'; // Set to Indonesian
  recognition.maxAlternatives = 1;

  recognition.onresult = (event) => {
    let interim = '';
    let final = '';

    for (let i = 0; i < event.results.length; i++) {
      const result = event.results[i];
      if (result.isFinal) {
        final += result[0].transcript + ' ';
      } else {
        interim += result[0].transcript;
      }
    }

    finalTranscript = final;
    liveTranscript = final + interim;
    liveTranscriptEl.textContent = liveTranscript || 'Mendengarkan...';

    // Update live word count
    const words = liveTranscript.trim().split(/\s+/).filter(w => w.length > 0);
    wordCount = words.length;

    // Record timestamps for new words
    const elapsedSec = (Date.now() - recordingStartTime) / 1000;
    while (wordTimings.length < wordCount) {
      wordTimings.push(elapsedSec);
    }

    // Update live WPM
    const elapsed = (Date.now() - recordingStartTime) / 60000;
    document.getElementById('live-wpm').textContent = elapsed > 0 ? Math.round(wordCount / elapsed) : 0;

    // Update live filler count (Indonesian)
    const fillerRegex = /\b(eee+|emm+|anu|seperti|kayak|ibaratnya|sebenarnya|ya|itu|kan|nah)\b/gi;
    const fillerMatches = liveTranscript.match(fillerRegex) || [];
    document.getElementById('live-fillers').textContent = fillerMatches.length;
  };

  recognition.onerror = (event) => {
    if (event.error !== 'aborted' && event.error !== 'no-speech') {
      console.error('Speech recognition error:', event.error);
    }
  };

  recognition.onend = () => {
    // Auto-restart if still recording
    if (isRecording && recognition) {
      try { recognition.start(); } catch (e) { /* ignore */ }
    }
  };

  recognition.start();
}

// ─── Waveform Visualizer ────────────────────────────────────────────────────
function drawWaveform() {
  if (!analyserNode || !isRecording) return;

  const canvas = waveformCanvas;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;

  // Set canvas size
  canvas.width = canvas.clientWidth * dpr;
  canvas.height = canvas.clientHeight * dpr;
  ctx.scale(dpr, dpr);

  const width = canvas.clientWidth;
  const height = canvas.clientHeight;

  const bufferLength = analyserNode.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);

  function draw() {
    if (!isRecording) return;
    animationFrameId = requestAnimationFrame(draw);

    analyserNode.getByteTimeDomainData(dataArray);

    // Clear with transparent background
    ctx.clearRect(0, 0, width, height);

    // Draw background glow
    const gradient = ctx.createLinearGradient(0, 0, width, 0);
    gradient.addColorStop(0, 'rgba(16, 185, 129, 0.03)');
    gradient.addColorStop(0.5, 'rgba(16, 185, 129, 0.06)');
    gradient.addColorStop(1, 'rgba(16, 185, 129, 0.03)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Draw waveform
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#10b981';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();

    const sliceWidth = width / bufferLength;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      const v = dataArray[i] / 128.0;
      const y = (v * height) / 2;
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
      x += sliceWidth;
    }

    ctx.stroke();

    // Draw mirror waveform (subtle)
    ctx.globalAlpha = 0.15;
    ctx.strokeStyle = '#059669';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    x = 0;
    for (let i = 0; i < bufferLength; i++) {
      const v = dataArray[i] / 128.0;
      const y = height - (v * height) / 2;
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
      x += sliceWidth;
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  draw();
}

// ─── Silence / Pause Detection ──────────────────────────────────────────────
function monitorSilence() {
  if (!analyserNode || !isRecording) return;

  const bufferLength = analyserNode.fftSize;
  const dataArray = new Uint8Array(bufferLength);

  function check() {
    if (!isRecording || !analyserNode) return;

    analyserNode.getByteTimeDomainData(dataArray);

    // Calculate RMS amplitude
    let sum = 0;
    for (let i = 0; i < bufferLength; i++) {
      const normalized = (dataArray[i] - 128) / 128;
      sum += normalized * normalized;
    }
    const rms = Math.sqrt(sum / bufferLength);

    const now = Date.now();
    const SILENCE_THRESHOLD = 0.02;
    const PAUSE_DURATION_MS = 1500;

    if (rms < SILENCE_THRESHOLD) {
      if (!silenceStart) {
        silenceStart = now;
      } else if (now - silenceStart >= PAUSE_DURATION_MS) {
        // Only count once per silence period
        if (!pauseTimestamps.length || now - pauseTimestamps[pauseTimestamps.length - 1] > PAUSE_DURATION_MS) {
          pauseCount++;
          pauseTimestamps.push(now);
          document.getElementById('live-pauses').textContent = pauseCount;
        }
      }
    } else {
      silenceStart = null;
    }

    setTimeout(check, 100);
  }

  check();
}

// ─── Timer ──────────────────────────────────────────────────────────────────
function updateTimer() {
  if (!isRecording) return;
  const elapsed = (Date.now() - recordingStartTime) / 1000;
  const limit = parseInt(timerLimitSelect.value, 10); // in seconds

  if (limit > 0) {
    // Count UP format showing limit, e.g. "00:15 / 00:30"
    recTimer.textContent = `${formatTime(elapsed)} / ${formatTime(limit)}`;

    // Turn red when 10 seconds remaining
    if (limit - elapsed <= 10) {
      recTimer.classList.remove('text-emerald-600', 'text-rose-500');
      recTimer.classList.add('text-rose-600');
      recTimer.classList.add('animate-pulse');
      // Play warning beep only once when entering the 10-second zone
      if (!timerWarningPlayed) {
        SFX.timerWarning();
        timerWarningPlayed = true;
      }
    } else {
      recTimer.classList.remove('animate-pulse', 'text-rose-600');
      recTimer.classList.add('text-emerald-600');
    }

    // Auto-stop when limit reached
    if (elapsed >= limit) {
      stopRecording();
      showToast('⏳ Waktu habis! Menyimpan rekaman...');
    }
  } else {
    // Free mode: just count up normally
    recTimer.textContent = formatTime(elapsed);
    recTimer.classList.remove('animate-pulse', 'text-rose-600');
    recTimer.classList.add('text-emerald-600');
  }
}

function formatTime(totalSeconds) {
  const mins = Math.floor(Math.max(0, totalSeconds) / 60);
  const secs = Math.floor(Math.max(0, totalSeconds) % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

// ─── MIME Type Helper ───────────────────────────────────────────────────────
function getSupportedMimeType() {
  const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return 'audio/webm';
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  PHASE 3: AI API INTEGRATION & DASHBOARD RENDERING                        */
/* ═══════════════════════════════════════════════════════════════════════════ */

/**
 * analyzeWithAI — Sends audio + transcript to the AI API for analysis.
 *
 * In production, replace the mock with a real API call to Gemini Multimodal
 * or similar LLM that accepts Audio + Text.
 *
 * @param {Blob} audioFile - The recorded audio blob
 * @param {string} transcript - The speech transcription text
 * @param {string} coachPersona - "professional" | "roaster" | "therapist"
 * @param {Object} clientMetrics - { wpm, fillerCount, pauseCount, durationSec }
 */
async function analyzeWithAI(audioFile, transcript, coachPersona, clientMetrics) {
  try {
    // Show loading state
    const formData = new FormData();
    // Append the blob (we can optionally name it 'audio.webm')
    formData.append('audio', audioFile, 'audio.webm');
    formData.append('transcript', transcript);
    formData.append('coachPersona', coachPersona);
    formData.append('clientMetrics', JSON.stringify(clientMetrics));

    // Call our Node.js Backend API
    const response = await fetch('/api/analyze', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error || 'Backend analysis failed');
    }

    const aiResult = await response.json();
    renderDashboard(aiResult, clientMetrics, false, currentAudioBlob);
    return; // Exit here on success
  } catch (error) {
    console.error('Backend API Error:', error);
    // Fallback to mock on error
    const mockResult = generateMockAnalysis(transcript, coachPersona, clientMetrics);
    mockResult.isFallback = true;
    renderDashboard(mockResult, clientMetrics, false, currentAudioBlob);
    return;
  }
}

/**
 * Helper: Convert Blob to base64 string
 */
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Generate a realistic mock AI analysis based on actual speech data.
 */
function generateMockAnalysis(transcript, persona, metrics) {
  const words = transcript.trim().split(/\s+/).filter(w => w.length > 0);
  const wordCountFinal = words.length;

  // Score heuristics based on real metrics
  const fluencyScore = Math.min(100, Math.max(20, Math.round(
    80 - (metrics.fillerCount * 5) - (metrics.pauseCount * 8) + (metrics.wpm > 100 && metrics.wpm < 160 ? 15 : 0)
  )));
  const grammarScore = Math.min(100, Math.max(25, Math.round(70 + Math.random() * 25)));
  const pitchScore = Math.min(100, Math.max(20, Math.round(55 + Math.random() * 35)));
  const emotionScore = Math.min(100, Math.max(15, Math.round(50 + Math.random() * 40)));
  const relevanceScore = Math.min(100, Math.max(30, Math.round(60 + Math.random() * 30)));

  // Persona-specific structured feedback
  const feedbacks = {
    professional: {
      summary: `Pidato Anda berlangsung selama ${metrics.durationSec.toFixed(0)} detik dengan kecepatan ${metrics.wpm} KPM. ${metrics.wpm < 100 ? 'Kecepatan bicara Anda sedikit di bawah rata-rata yang optimal.' : metrics.wpm > 160 ? 'Tempo bicara Anda cukup tinggi, perlu sedikit penyesuaian.' : 'Kecepatan berbicara Anda berada di kisaran yang sangat baik.'} Secara keseluruhan, ada beberapa area yang menunjukkan potensi besar untuk perbaikan.`,
      strengths: [
        'Anda berani tampil dan menyelesaikan presentasi hingga akhir — ini menunjukkan mental yang kuat.',
        metrics.wpm >= 100 && metrics.wpm <= 160 ? 'Kecepatan bicara Anda sangat ideal dan nyaman didengar oleh audiens.' : 'Anda konsisten dalam menjaga ritme berbicara sepanjang sesi.',
        metrics.fillerCount <= 2 ? 'Penggunaan kata pengisi sangat minimal — ini tanda pembicara yang berpengalaman.' : 'Anda menunjukkan kesadaran terhadap topik dan berusaha menyampaikan poin-poin utama.',
      ],
      improvements: [
        metrics.fillerCount > 3 ? `Anda menggunakan ${metrics.fillerCount} kata pengisi. Cobalah mengganti kata "eee" atau "kayak" dengan jeda hening 1-2 detik. Ini justru membuat Anda terlihat lebih percaya diri.` : 'Variasikan intonasi suara Anda. Suara yang terlalu datar membuat audiens kehilangan fokus setelah 30 detik pertama.',
        metrics.pauseCount > 2 ? `Terdapat ${metrics.pauseCount} jeda panjang. Ini bisa menandakan kurangnya persiapan materi. Latih transisi antar ide menggunakan frasa penghubung seperti "selain itu" atau "yang menarik adalah".` : 'Perkuat pembukaan dan penutupan pidato Anda. Kesan pertama dan terakhir adalah yang paling diingat audiens.',
      ],
      tips: [
        'Latihan 5 menit sehari: Baca artikel berita keras-keras di depan cermin sambil memperhatikan ekspresi wajah Anda.',
        'Rekam diri Anda lalu dengarkan kembali. Perhatikan bagian mana yang terasa membosankan dan beri penekanan pada kata-kata kunci.',
        'Gunakan teknik "Rule of 3" — sampaikan poin dalam kelompok tiga untuk memudahkan audiens mengingat pesan Anda.',
      ],
      motivation: 'Setiap pembicara hebat dulunya juga gugup. Yang membedakan adalah mereka terus berlatih. Anda sudah di jalur yang benar!',
    },

    roaster: {
      summary: `Oke, ${metrics.durationSec.toFixed(0)} detik yang... cukup menarik untuk dianalisis. 😅 Kecepatan ${metrics.wpm} KPM — ${metrics.wpm < 100 ? "kura-kura aja kalah lambat sama Anda" : metrics.wpm > 160 ? "ini presentasi atau nge-rap?!" : "lumayan sih, saya akui."} Tapi jangan senang dulu, masih banyak PR yang harus dikerjakan.`,
      strengths: [
        'Minimal Anda berani pencet tombol rekam — itu sudah lebih baik dari 90% orang yang cuma bermimpi jadi pembicara. 👏',
        metrics.fillerCount <= 2 ? 'Kata pengisi Anda sedikit. Wow, Anda bukan robot kan? Cek dulu. 🤖' : 'Setidaknya Anda berbicara, bukan hanya diam menatap kamera. Itu sudah progres.',
        'Anda punya suara. Itu modal yang bagus. Sekarang tinggal belajar menggunakannya. 😂',
      ],
      improvements: [
        metrics.fillerCount > 0 ? `"Eee", "kayak", "anu" — Anda pakai ${metrics.fillerCount} kali. Pidato Anda terdengar seperti loading bar yang stuck di 47%. Setiap kali mau bilang "eee", tutup mulut saja 1 detik. Diam itu emas, bro. 🔇` : 'Intonasi Anda lebih datar dari layar HP saya. Bayangkan Anda sedang bercerita ke teman, bukan membaca undang-undang.',
        metrics.pauseCount > 2 ? `${metrics.pauseCount} kali diam panjang? Penonton kira Anda disconnect. Siapkan "jembatan" antar ide supaya tidak ada momen awkward. 🌉` : 'Coba variasikan volume suara. Bisik-bisik untuk efek dramatis, lalu lantang untuk poin penting. Jangan monoton kayak suara GPS.',
      ],
      tips: [
        'Latihan di depan kucing peliharaan Anda. Kalau kucing aja tidur pas Anda ngomong, apalagi manusia. 🐱💤',
        'Nonton stand-up comedy. Bukan untuk lucu, tapi perhatikan cara mereka mengatur tempo, jeda, dan punchline. Itu skill presentasi tingkat dewa.',
        'Rekam, dengarkan, malu, perbaiki, ulangi. Itu rumusnya. Rasa malu itu bahan bakar kemajuan. 🔥',
      ],
      motivation: 'Inget ya, bahkan Soekarno pertama kali pidato juga pasti grogi. Bedanya dia latihan 1000x. Ayo kejar! 🇮🇩',
    },

    therapist: {
      summary: `Pertama-tama, saya ingin mengapresiasi keberanian Anda untuk berlatih hari ini. 💚 Tidak semua orang berani mengambil langkah ini, dan Anda melakukannya. Pidato Anda berdurasi ${metrics.durationSec.toFixed(0)} detik dengan ${metrics.wpm} KPM — dan setiap detik dari itu adalah investasi untuk diri Anda yang lebih baik.`,
      strengths: [
        'Keberanian Anda untuk memulai sudah menunjukkan karakter yang kuat. Banyak orang tidak pernah sampai di tahap ini.',
        metrics.fillerCount <= 3 ? 'Anda menunjukkan kontrol yang baik terhadap kata-kata Anda. Ini menandakan pikiran yang terorganisir.' : 'Anda memiliki keinginan kuat untuk menyampaikan pesan — itu terasa dari semangat dalam suara Anda.',
        'Setiap kali Anda berlatih, jalur saraf di otak Anda semakin kuat. Secara ilmiah, Anda sedang "menginstal" kemampuan baru. 🧠✨',
      ],
      improvements: [
        metrics.fillerCount > 0 ? `Saya melihat ada ${metrics.fillerCount} kata pengisi — dan itu sangat wajar. Bayangkan setiap "eee" itu seperti napas kecil yang bisa Anda ganti dengan keheningan yang penuh percaya diri. Coba perlahan, satu per satu.` : 'Mungkin bisa dicoba untuk sedikit memperlambat tempo di bagian-bagian penting, agar audiens punya waktu menyerap makna kata-kata Anda.',
        'Bayangkan jika Anda menambahkan sedikit variasi nada — seperti seorang pendongeng yang membuat pendengar terhanyut. Ini bisa dimulai dengan melatih satu kalimat favorit Anda dengan berbagai ekspresi.',
      ],
      tips: [
        'Cobalah latihan "Napas 4-7-8": Tarik napas 4 detik, tahan 7 detik, hembuskan 8 detik. Lakukan sebelum memulai presentasi untuk menenangkan detak jantung. 🫁',
        'Bicaralah pada cermin selama 2 menit setiap hari. Bukan untuk menghafal, tapi untuk merasa nyaman dengan diri Anda sendiri saat berbicara.',
        'Mulailah setiap latihan dengan kalimat afirmasi: "Saya layak didengar, dan pesan saya penting." Pikiran positif mengubah cara Anda berbicara. 🌱',
      ],
      motivation: 'Anda tidak harus sempurna. Anda hanya perlu lebih baik dari kemarin. Dan hari ini, Anda sudah melakukannya. 🌟',
    },
  };

  // Detect fillers and grammar issues in transcript
  const highlightedTranscript = [];
  const fillerRegex = /^(eee+|emm+|anu|seperti|kayak|ibaratnya|sebenarnya|ya|itu|kan|nah)$/i;
  const grammarIssues = { dibilang: 'dikatakan', dimengerti: 'dipahami', ngerasa: 'merasa', mikir: 'berpikir' };

  for (const word of words) {
    const cleaned = word.replace(/[.,!?;:]/g, '').toLowerCase();
    if (fillerRegex.test(cleaned)) {
      highlightedTranscript.push({ word, type: 'filler' });
    } else if (grammarIssues[cleaned]) {
      highlightedTranscript.push({ word, type: 'grammar_error', suggestion: grammarIssues[cleaned] });
    } else {
      highlightedTranscript.push({ word, type: 'normal' });
    }
  }

  return {
    scores: {
      fluency: fluencyScore,
      grammar: grammarScore,
      pitch: pitchScore,
      emotion: emotionScore,
      relevance: relevanceScore,
    },
    feedback: feedbacks[persona] || feedbacks.professional,
    improved_vocabulary: ['komprehensif', 'signifikan', 'mengartikulasikan', 'esensial', 'dinamis'],
    highlighted_transcript: highlightedTranscript,
  };
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  PHASE 4: RENDER DASHBOARD WITH AI RESULTS                                */
/* ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Render the full analysis dashboard with AI results.
 */
function renderDashboard(aiResult, clientMetrics, isHistoric = false, audioBlob = null, historicWordTimings = null) {
  if (typeof setupAudioPlayer === 'function') setupAudioPlayer(audioBlob);

  currentActiveWordTimings = isHistoric ? (historicWordTimings || []) : wordTimings;

  // Populate summary cards
  document.getElementById('result-duration').textContent = formatTime(clientMetrics.durationSec);
  document.getElementById('result-wpm').textContent = clientMetrics.wpm;
  document.getElementById('result-fillers').textContent = clientMetrics.fillerCount;
  document.getElementById('result-pauses').textContent = clientMetrics.pauseCount;

  // Update coach badge
  const persona = isHistoric ? (clientMetrics.persona || 'professional') : coachPersona.value;
  const badgeEl = document.getElementById('coach-badge');
  if (badgeEl) {
    badgeEl.textContent = PERSONA_LABELS[persona] || persona;
  }

  // Show/hide save and back buttons based on history mode
  const backHeader = document.getElementById('dashboard-back-header');
  const backHistoryBtn = document.getElementById('back-history-btn');
  const saveBtn = document.getElementById('save-session-btn');
  
  if (isHistoric) {
    if (backHeader) backHeader.classList.remove('hidden');
    if (backHistoryBtn) backHistoryBtn.classList.remove('hidden');
    if (saveBtn) saveBtn.classList.add('hidden');
  } else {
    if (backHeader) backHeader.classList.add('hidden');
    if (backHistoryBtn) backHistoryBtn.classList.add('hidden');
    if (saveBtn) saveBtn.classList.remove('hidden');
  }

  // ── Update Radar Chart ──
  if (radarChart) {
    radarChart.data.datasets[0].data = [
      aiResult.scores.fluency,
      aiResult.scores.grammar,
      aiResult.scores.pitch,
      aiResult.scores.emotion,
      aiResult.scores.relevance,
    ];
    radarChart.update('active');
  }

  // ── Update Score Legend ──
  const metrics = ['fluency', 'grammar', 'pitch', 'emotion', 'relevance'];
  
  metrics.forEach(metric => {
    const badge = document.querySelector(`.score-badge[data-metric="${metric}"] span:first-child`);
    if (badge) {
      const score = aiResult.scores[metric];
      animateNumber(badge, 0, score, 800);
    }
  });

  // ── AI Feedback ──
  document.getElementById('ai-loading').classList.add('hidden');
  document.getElementById('ai-feedback-content').classList.remove('hidden');
  SFX.resultsReveal();

  const fallbackWarning = document.getElementById('fallback-warning');
  if (fallbackWarning) {
    if (aiResult.isFallback) {
      fallbackWarning.classList.remove('hidden');
    } else {
      fallbackWarning.classList.add('hidden');
    }
  }

  // Support both old format (feedback_text) and new format (feedback object)
  const feedback = aiResult.feedback || {};
  const summaryText = feedback.summary || aiResult.feedback_text || 'Analisis selesai.';

  const feedbackTextEl = document.getElementById('ai-feedback-text');
  typewriterEffect(feedbackTextEl, summaryText, 15);

  // ── Strengths ──
  renderFeedbackList('feedback-strengths', feedback.strengths, 'emerald');

  // ── Improvements ──
  renderFeedbackList('feedback-improvements', feedback.improvements, 'amber');

  // ── Tips ──
  renderFeedbackList('feedback-tips', feedback.tips, 'blue');

  // ── Motivation ──
  const motivationBox = document.getElementById('feedback-motivation-box');
  const motivationText = document.getElementById('feedback-motivation-text');
  if (feedback.motivation) {
    motivationBox.classList.remove('hidden');
    motivationText.textContent = '';
    setTimeout(() => {
      typewriterEffect(motivationText, `"${feedback.motivation}"`, 20);
    }, 600);
  } else {
    motivationBox.classList.add('hidden');
  }

  // ── Vocabulary Suggestions ──
  if (aiResult.improved_vocabulary && aiResult.improved_vocabulary.length > 0) {
    const vocabSection = document.getElementById('vocab-section');
    const vocabList = document.getElementById('vocab-list');
    vocabSection.classList.remove('hidden');
    vocabList.innerHTML = '';

    aiResult.improved_vocabulary.forEach((word, i) => {
      const chip = document.createElement('span');
      chip.className = 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900/30';
      chip.style.animation = `fadeInUp 0.3s ease ${i * 0.08}s both`;
      chip.innerHTML = `<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>${word}`;
      vocabList.appendChild(chip);
    });
  }

  // Re-initialize Lucide icons for newly added elements
  lucide.createIcons();

  // ── Highlighted Transcript ──
  const pausePositions = isHistoric ? (clientMetrics.pausePositions || []) : null;
  renderHighlightedTranscript(aiResult.highlighted_transcript, pausePositions);

  // ── Store in session history ──
  if (!isHistoric) {
    const totalWords = aiResult.highlighted_transcript ? aiResult.highlighted_transcript.length : 0;
    const duration = clientMetrics.durationSec;
    const computedPausePositions = pauseTimestamps.map((ts, i) => {
      const elapsed = (ts - recordingStartTime) / 1000;
      return Math.min(totalWords - 1, Math.floor((elapsed / duration) * totalWords));
    });

    const session = {
      id: Date.now(),
      date: new Date().toLocaleString('id-ID'),
      duration: clientMetrics.durationSec,
      wpm: clientMetrics.wpm,
      fillers: clientMetrics.fillerCount,
      pauses: clientMetrics.pauseCount,
      scores: aiResult.scores,
      persona: coachPersona.value,
      transcript: finalTranscript,
      aiResult: aiResult, // Complete AI analysis data
      pausePositions: computedPausePositions, // Complete pause positions
      wordTimings: wordTimings, // Complete word timings for karaoke sync
    };
    sessionHistory.push(session);
    saveSessionHistory();

    if (typeof saveAudioToDB === 'function' && currentAudioBlob) {
      saveAudioToDB(session.id, currentAudioBlob).catch(console.error);
    }

    // Trigger high score celebration!
    const avgScore = (aiResult.scores.fluency + aiResult.scores.grammar + aiResult.scores.pitch + aiResult.scores.emotion + aiResult.scores.relevance) / 5;
    if (avgScore >= 70 && typeof confetti === 'function') {
      setTimeout(() => {
        confetti({
          particleCount: 120,
          spread: 75,
          origin: { y: 0.65 }
        });
      }, 1000);
    }
  }
}

/**
 * Helper: Render a feedback list (strengths, improvements, or tips)
 */
function renderFeedbackList(idPrefix, items, color) {
  const box = document.getElementById(`${idPrefix}-box`);
  const list = document.getElementById(`${idPrefix}-list`);

  if (!items || items.length === 0) {
    box.classList.add('hidden');
    return;
  }

  box.classList.remove('hidden');
  list.innerHTML = '';

  const colorMap = {
    emerald: { bg: 'bg-emerald-50', border: 'border-emerald-100', dot: 'bg-emerald-400', text: 'text-slate-600' },
    amber:   { bg: 'bg-amber-50',   border: 'border-amber-100',   dot: 'bg-amber-400',   text: 'text-slate-600' },
    blue:    { bg: 'bg-blue-50',     border: 'border-blue-100',    dot: 'bg-blue-400',     text: 'text-slate-600' },
  };
  const c = colorMap[color] || colorMap.emerald;

  items.forEach((item, i) => {
    const li = document.createElement('li');
    li.className = `flex items-start gap-2.5 p-2.5 rounded-lg ${c.bg} border ${c.border}`;
    li.style.animation = `fadeInUp 0.35s ease ${i * 0.1}s both`;
    li.innerHTML = `
      <span class="w-2 h-2 mt-1.5 rounded-full ${c.dot} flex-shrink-0"></span>
      <span class="text-[13px] ${c.text} dark:text-slate-200 leading-relaxed">${item}</span>
    `;
    list.appendChild(li);
  });
}

// ─── Render Highlighted Transcript ──────────────────────────────────────────
function renderHighlightedTranscript(highlights, pausePositions = null) {
  const container = document.getElementById('highlighted-transcript');
  container.innerHTML = '';

  if (!highlights || highlights.length === 0) {
    container.innerHTML = '<span class="text-slate-400 italic">Transkrip tidak tersedia.</span>';
    return;
  }

  // Insert pause markers at approximate positions
  const totalWords = highlights.length;
  if (!pausePositions) {
    const duration = (Date.now() - recordingStartTime) / 1000;
    pausePositions = pauseTimestamps.map((ts, i) => {
      const elapsed = (ts - recordingStartTime) / 1000;
      return Math.min(totalWords - 1, Math.floor((elapsed / duration) * totalWords));
    });
  }

  highlights.forEach((item, index) => {
    // Insert pause marker if needed
    if (pausePositions.includes(index)) {
      const pauseEl = document.createElement('span');
      pauseEl.className = 'word-pause';
      pauseEl.innerHTML = '⏸ jeda';
      pauseEl.title = 'Jeda panjang terdeteksi (>1.5s)';
      container.appendChild(pauseEl);
    }

    const span = document.createElement('span');
    span.textContent = item.word + ' ';

    switch (item.type) {
      case 'filler':
        span.className = 'word-filler';
        span.title = 'Kata pengisi terdeteksi';
        break;
      case 'grammar_error':
        span.className = 'word-grammar-error';
        span.title = item.suggestion ? `Saran: "${item.suggestion}"` : 'Kemungkinan kesalahan tata bahasa';
        break;
      default:
        // normal word, no special styling
        break;
    }

    container.appendChild(span);
  });
}

// ─── Number Animation ───────────────────────────────────────────────────────
function animateNumber(element, start, end, duration) {
  const startTime = performance.now();

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
    const current = Math.round(start + (end - start) * eased);
    element.textContent = current;

    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }

  requestAnimationFrame(update);
}

// ─── Typewriter Effect ──────────────────────────────────────────────────────
function typewriterEffect(element, text, speed = 20) {
  element.textContent = '';
  let i = 0;

  function type() {
    if (i < text.length) {
      element.textContent += text.charAt(i);
      i++;
      setTimeout(type, speed);
    }
  }

  type();
}

// ─── Simulate Delay ────────────────────────────────────────────────────────
function simulateDelay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── Reset to Record ────────────────────────────────────────────────────────
function resetToRecord() {
  // Reset all UI to practice state
  recStatus.textContent = 'Ketuk mikrofon untuk memulai';
  recStatus.classList.remove('text-emerald-600', 'text-rose-500');
  recStatus.classList.add('text-slate-400');
  recTimer.textContent = '00:00';
  recTimer.classList.add('opacity-0');
  recTimer.classList.remove('text-rose-500');
  recTimer.classList.add('text-emerald-600');
  liveStats.classList.add('opacity-0');
  waveformContainer.classList.add('opacity-0');
  liveTranscriptBox.classList.add('hidden');
  liveTranscriptEl.textContent = '';

  // Reset stat chips
  document.getElementById('live-wpm').textContent = '0';
  document.getElementById('live-fillers').textContent = '0';
  document.getElementById('live-pauses').textContent = '0';

  switchView('practice');
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  SESSION HISTORY & STATS                                                   */
/* ═══════════════════════════════════════════════════════════════════════════ */

// ─── LocalStorage ───────────────────────────────────────────────────────────
function saveSessionHistory() {
  try {
    localStorage.setItem('speechblitz_sessions', JSON.stringify(sessionHistory));
  } catch (e) { console.warn('Could not save to localStorage:', e); }
}

function loadSessionHistory() {
  try {
    const stored = localStorage.getItem('speechblitz_sessions');
    if (stored) sessionHistory = JSON.parse(stored);
  } catch (e) { console.warn('Could not load from localStorage:', e); }
}

function saveSession() {
  SFX.click();
  showToast('✅ Sesi berhasil disimpan!');
}

// ─── Render Session History ─────────────────────────────────────────────────
function renderSessionHistory() {
  const container = document.getElementById('history-list');
  container.innerHTML = '';

  if (sessionHistory.length === 0) {
    container.innerHTML = '<p class="text-sm text-slate-400 italic">Belum ada sesi yang direkam. Mulai berlatih!</p>';
    return;
  }

  // Show newest first
  [...sessionHistory].reverse().forEach((session, i) => {
    const avg = Math.round(
      (session.scores.fluency + session.scores.grammar + session.scores.pitch +
        session.scores.emotion + session.scores.relevance) / 5
    );

    const card = document.createElement('div');
    card.className = 'history-card';
    card.style.animation = `fadeInUp 0.4s ease ${i * 0.06}s both`;
    card.innerHTML = `
      <div class="flex items-center gap-4">
        <div class="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center">
          <span class="text-lg font-bold text-emerald-600">${avg}</span>
        </div>
        <div>
          <p class="font-semibold text-sm text-slate-800">${session.date}</p>
          <p class="text-xs text-slate-400 mt-0.5">${formatTime(session.duration)} • ${session.wpm} KPM • ${PERSONA_LABELS[session.persona] || session.persona}</p>
        </div>
      </div>
      <div class="flex items-center gap-3">
        <div class="flex gap-1.5">
          ${Object.entries(session.scores).map(([key, val]) => {
      const colors = { fluency: 'bg-emerald-400', grammar: 'bg-blue-400', pitch: 'bg-violet-400', emotion: 'bg-rose-400', relevance: 'bg-amber-400' };
      return `<div class="w-2 h-8 rounded-full ${colors[key] || 'bg-slate-300'}" style="opacity: ${val / 100}" title="${key}: ${val}"></div>`;
    }).join('')}
        </div>
        <i data-lucide="chevron-right" class="w-4 h-4 text-slate-300"></i>
      </div>
    `;

    // Make history card clickable to restore past analysis
    card.addEventListener('click', async () => {
      SFX.click();
      
      const clientMetrics = {
        durationSec: session.duration,
        wpm: session.wpm,
        fillerCount: session.fillers,
        pauseCount: session.pauses,
        persona: session.persona,
        pausePositions: session.pausePositions || [],
      };

      // Fallback for older sessions that do not have saved aiResult
      let aiResult = session.aiResult;
      if (!aiResult) {
        aiResult = generateMockAnalysis(session.transcript, session.persona, clientMetrics);
      }

      // Render the dashboard with the past session details
      let audioBlob = null;
      if (typeof getAudioFromDB === 'function') {
        try { audioBlob = await getAudioFromDB(session.id); } catch(e) {}
      }
      renderDashboard(aiResult, clientMetrics, true, audioBlob, session.wordTimings);

      // Switch to dashboard view
      switchView('dashboard');
      document.getElementById('view-title').textContent = 'Dasbor Analisis';
      document.getElementById('view-subtitle').textContent = 'Tinjau performa dan wawasan AI Anda (Sesi Lampau).';
    });

    container.appendChild(card);
  });

  lucide.createIcons();
}

// ─── Best Scores ────────────────────────────────────────────────────────────
function renderBestScores() {
  const container = document.getElementById('best-scores');
  container.innerHTML = '';

  if (sessionHistory.length === 0) {
    container.innerHTML = '<p class="text-sm text-slate-400 italic">Selesaikan satu sesi untuk melihat skor terbaik Anda.</p>';
    return;
  }

  const metrics = ['fluency', 'grammar', 'pitch', 'emotion', 'relevance'];
  const labels = {
    fluency: 'Kelancaran',
    grammar: 'Tata Bahasa',
    pitch: 'Nada',
    emotion: 'Emosi',
    relevance: 'Relevansi',
  };
  const metaColors = {
    fluency: { bg: 'bg-emerald-500', text: 'text-emerald-700', light: 'bg-emerald-50' },
    grammar: { bg: 'bg-blue-500', text: 'text-blue-700', light: 'bg-blue-50' },
    pitch: { bg: 'bg-violet-500', text: 'text-violet-700', light: 'bg-violet-50' },
    emotion: { bg: 'bg-rose-500', text: 'text-rose-700', light: 'bg-rose-50' },
    relevance: { bg: 'bg-amber-500', text: 'text-amber-700', light: 'bg-amber-50' },
  };

  metrics.forEach(metric => {
    const best = Math.max(...sessionHistory.map(s => s.scores[metric]));
    const colors = metaColors[metric];

    const row = document.createElement('div');
    row.className = 'best-score-row';
    row.innerHTML = `
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-lg ${colors.light} flex items-center justify-center">
          <span class="text-xs font-bold ${colors.text}">${labels[metric][0].toUpperCase()}</span>
        </div>
        <span class="text-sm font-medium text-slate-700 capitalize">${labels[metric]}</span>
      </div>
      <div class="flex items-center gap-3 flex-1 max-w-[200px]">
        <div class="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
          <div class="best-score-bar ${colors.bg}" style="width: ${best}%"></div>
        </div>
        <span class="text-sm font-bold ${colors.text} min-w-[32px] text-right">${best}</span>
      </div>
    `;
    container.appendChild(row);
  });
}

// ─── Update Progress Chart ──────────────────────────────────────────────────
function updateProgressChart() {
  if (!progressChart || sessionHistory.length === 0) return;

  const labels = sessionHistory.map((_, i) => `#${i + 1}`);
  const fluencyData = sessionHistory.map(s => s.scores.fluency);
  const grammarData = sessionHistory.map(s => s.scores.grammar);
  const overallData = sessionHistory.map(s =>
    Math.round((s.scores.fluency + s.scores.grammar + s.scores.pitch + s.scores.emotion + s.scores.relevance) / 5)
  );

  progressChart.data.labels = labels;
  progressChart.data.datasets[0].data = fluencyData;
  progressChart.data.datasets[1].data = grammarData;
  progressChart.data.datasets[2].data = overallData;
  progressChart.update();
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  INDEXEDDB & AUDIO PLAYBACK (KARAOKE SYNC)                                 */
/* ═══════════════════════════════════════════════════════════════════════════ */

const DB_NAME = 'SpeechBlitzDB';
const DB_VERSION = 1;
const STORE_NAME = 'audioStore';
let db;

function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = (e) => reject('IndexedDB error: ' + e.target.error);
    request.onsuccess = (e) => {
      db = e.target.result;
      resolve(db);
    };
    request.onupgradeneeded = (e) => {
      db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

async function saveAudioToDB(id, blob) {
  if (!db) await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(blob, id);
    request.onsuccess = () => resolve();
    request.onerror = (e) => reject(e.target.error);
  });
}

async function getAudioFromDB(id) {
  if (!db) await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

// ─── Audio Controller ───
let customAudio = new Audio();
let audioPlaybackURL = null;

function setupAudioPlayer(blob) {
  if (audioPlaybackURL) {
    URL.revokeObjectURL(audioPlaybackURL);
    audioPlaybackURL = null;
  }
  
  const container = document.getElementById('audio-player-container');
  
  if (blob) {
    audioPlaybackURL = URL.createObjectURL(blob);
    customAudio.src = audioPlaybackURL;
    container.classList.remove('hidden');
    
    // Reset UI
    document.getElementById('audio-play-icon').classList.remove('hidden');
    document.getElementById('audio-pause-icon').classList.add('hidden');
    document.getElementById('audio-scrubber').value = 0;
    document.getElementById('audio-current-time').textContent = '00:00';
    document.getElementById('audio-total-time').textContent = '00:00';
    
    clearTranscriptHighlight();
  } else {
    container.classList.add('hidden');
    stopPlaybackIfPlaying();
  }
}

function toggleAudioPlayback() {
  SFX.click();
  if (customAudio.paused) {
    customAudio.play();
    document.getElementById('audio-play-icon').classList.add('hidden');
    document.getElementById('audio-pause-icon').classList.remove('hidden');
  } else {
    customAudio.pause();
    document.getElementById('audio-play-icon').classList.remove('hidden');
    document.getElementById('audio-pause-icon').classList.add('hidden');
  }
}

function seekAudio(value) {
  if (customAudio.duration) {
    const seekTo = customAudio.duration * (value / 100);
    customAudio.currentTime = seekTo;
  }
}

customAudio.addEventListener('timeupdate', () => {
  if (!customAudio.duration) return;
  
  const currentTime = customAudio.currentTime;
  const duration = customAudio.duration;
  const progressPercent = (currentTime / duration) * 100;
  
  document.getElementById('audio-scrubber').value = progressPercent;
  document.getElementById('audio-current-time').textContent = formatTime(currentTime);
  
  // Update total time if it wasn't loaded immediately
  if (document.getElementById('audio-total-time').textContent === '00:00' && duration > 0 && duration !== Infinity) {
    document.getElementById('audio-total-time').textContent = formatTime(duration);
  }
  
  syncTranscriptHighlight(currentTime, duration);
});

customAudio.addEventListener('ended', () => {
  document.getElementById('audio-play-icon').classList.remove('hidden');
  document.getElementById('audio-pause-icon').classList.add('hidden');
  document.getElementById('audio-scrubber').value = 100;
  clearTranscriptHighlight();
});

customAudio.addEventListener('loadedmetadata', () => {
  if (customAudio.duration && customAudio.duration !== Infinity) {
    document.getElementById('audio-total-time').textContent = formatTime(customAudio.duration);
  }
});

function syncTranscriptHighlight(currentTime, duration) {
  const container = document.getElementById('highlighted-transcript');
  if (!container) return;
  
  // Select all word spans (ignoring pause markers or empty texts)
  const words = Array.from(container.querySelectorAll('span')).filter(el => !el.classList.contains('word-pause') && el.textContent.trim().length > 0);
  if (words.length === 0) return;
  
  let currentWordIndex = 0;
  if (currentActiveWordTimings && currentActiveWordTimings.length > 0) {
    for (let i = 0; i < currentActiveWordTimings.length; i++) {
      if (currentTime >= currentActiveWordTimings[i]) {
        currentWordIndex = i;
      } else {
        break;
      }
    }
    currentWordIndex = Math.min(words.length - 1, currentWordIndex);
  } else {
    currentWordIndex = Math.min(words.length - 1, Math.floor((currentTime / duration) * words.length));
  }
  
  words.forEach((w, i) => {
    if (i === currentWordIndex) {
      if (!w.classList.contains('word-active')) {
        w.classList.add('word-active', 'word-highlight-base');
        // Optional smooth auto-scroll to keep the active word in view
        w.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    } else {
      w.classList.remove('word-active');
    }
  });
}

function clearTranscriptHighlight() {
  const container = document.getElementById('highlighted-transcript');
  if (!container) return;
  const words = container.querySelectorAll('.word-active');
  words.forEach(w => w.classList.remove('word-active'));
}

function stopPlaybackIfPlaying() {
  if (!customAudio.paused) {
    customAudio.pause();
    const playIcon = document.getElementById('audio-play-icon');
    const pauseIcon = document.getElementById('audio-pause-icon');
    if (playIcon) playIcon.classList.remove('hidden');
    if (pauseIcon) pauseIcon.classList.add('hidden');
  }
}
