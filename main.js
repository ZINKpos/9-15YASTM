    /* ═══════════════════════════════════════════════════════════════
       SUPABASE + GLOBAL STATE
    ═══════════════════════════════════════════════════════════════ */
    let sb = null;
    let ALL_QUESTIONS = [];      // Supabase'den gelen tüm sorular
    let LEVEL_QUESTIONS = [];    // Seçilen gezegenin soruları (shuffle edilmiş 20)
    let CHAR = 0, LEVEL = 0;
    let CUR = 0, SCORE = 0, ATT = 0, ANSWERED = false;
    let LOG = [];
    let START_TIME = null, Q_START = null;
    let SELECTED_WORDS = [];
    let DRAG_SRC = null;

    /* ── XP SİSTEMİ ── */
    const XP_PER_CORRECT = 2;   // doğru cevap XP
    const XP_PER_WRONG_SKIP = -2;  // yanlış + atlama cezası
    const XP_PER_LEVEL = 10;  // her seviye için gereken XP
    const XP_COMPLETION_BONUS = 10; // bölüm tamamlama bonusu (max 2 yanlışta)
    const MAX_WRONG_FOR_BONUS = 2;  // bu kadar yanlışa kadar bonus alınır
    let CHAR_XP = { 0: 0, 1: 0, 2: 0 }; // her karakter için ayrı XP
    let TOTAL_XP = 0;            // aktif karakterin XP'si (CHAR_XP[CHAR] alias)
    let SESSION_XP = 0;            // bu oyun oturumunda kazanılan XP
    let CHAR_LEVEL = 1;            // aktif karakterin seviyesi
    let Q_RETRY = false;           // soru yeniden deneme modunda mı?
    let Q_FIRST_WRONG = false;     // ilk cevap yanlış mıydı?
    let WRONG_COUNT = 0;           // bölümdeki toplam yanlış sayısı (bonus kontrolü için)
    let SHOP_ITEMS = [];           // Supabase'den gelen mağaza ürünleri
    let OWNED_ITEMS = [];          // satın alınan ürünler (localStorage)
    let ACTIVE_JOKERS = [];        // bu oyun oturumunda kullanılabilir jokerler [{id, used}]
    let PLAYER_NAME = '';          // oyuncunun kullanıcı adı

    const CHAR_DATA = [
      {
        name: 'inari', svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="52" height="52">
<polygon points="80,180 50,30 160,130" fill="#E8751A" stroke="#C45E10" stroke-width="2"/>
<polygon points="90,165 70,60 145,135" fill="#FDCB6E"/>
<polygon points="320,180 350,30 240,130" fill="#E8751A" stroke="#C45E10" stroke-width="2"/>
<polygon points="310,165 330,60 255,135" fill="#FDCB6E"/>
<ellipse cx="200" cy="220" rx="145" ry="140" fill="#F0932B"/>
<ellipse cx="140" cy="260" rx="70" ry="80" fill="#FFEAA7"/>
<ellipse cx="260" cy="260" rx="70" ry="80" fill="#FFEAA7"/>
<ellipse cx="200" cy="290" rx="85" ry="65" fill="#FFF9E6"/>
<polygon points="200,120 130,200 270,200" fill="#E17C1A" opacity="0.5"/>
<ellipse cx="150" cy="210" rx="28" ry="30" fill="white"/>
<ellipse cx="150" cy="215" rx="16" ry="18" fill="#2D3436"/>
<ellipse cx="143" cy="207" rx="6" ry="7" fill="white" opacity="0.9"/>
<ellipse cx="155" cy="220" rx="3" ry="3" fill="white" opacity="0.5"/>
<ellipse cx="250" cy="210" rx="28" ry="30" fill="white"/>
<ellipse cx="250" cy="215" rx="16" ry="18" fill="#2D3436"/>
<ellipse cx="243" cy="207" rx="6" ry="7" fill="white" opacity="0.9"/>
<ellipse cx="255" cy="220" rx="3" ry="3" fill="white" opacity="0.5"/>
<ellipse cx="200" cy="265" rx="18" ry="13" fill="#2D3436"/>
<ellipse cx="195" cy="261" rx="6" ry="4" fill="white" opacity="0.3"/>
<path d="M 185 275 Q 200 295 215 275" fill="none" stroke="#2D3436" stroke-width="3" stroke-linecap="round"/>
<line x1="200" y1="278" x2="200" y2="290" stroke="#2D3436" stroke-width="2.5" stroke-linecap="round"/>
<line x1="60" y1="250" x2="130" y2="265" stroke="#C45E10" stroke-width="2" stroke-linecap="round" opacity="0.6"/>
<line x1="55" y1="270" x2="128" y2="275" stroke="#C45E10" stroke-width="2" stroke-linecap="round" opacity="0.6"/>
<line x1="65" y1="290" x2="130" y2="285" stroke="#C45E10" stroke-width="2" stroke-linecap="round" opacity="0.6"/>
<line x1="340" y1="250" x2="270" y2="265" stroke="#C45E10" stroke-width="2" stroke-linecap="round" opacity="0.6"/>
<line x1="345" y1="270" x2="272" y2="275" stroke="#C45E10" stroke-width="2" stroke-linecap="round" opacity="0.6"/>
<line x1="335" y1="290" x2="270" y2="285" stroke="#C45E10" stroke-width="2" stroke-linecap="round" opacity="0.6"/>
<ellipse cx="120" cy="260" rx="20" ry="12" fill="#FF6B6B" opacity="0.25"/>
<ellipse cx="280" cy="260" rx="20" ry="12" fill="#FF6B6B" opacity="0.25"/>
</svg>` },
      {
        name: 'pofuduksihirbaz', svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 550" width="52" height="52">
<defs>
<radialGradient id="bunnyBody" cx="50%" cy="45%" r="50%"><stop offset="0%" style="stop-color:#ffffff"/><stop offset="70%" style="stop-color:#f0ebe6"/><stop offset="100%" style="stop-color:#e0d5cc"/></radialGradient>
<radialGradient id="earInner" cx="50%" cy="50%" r="50%"><stop offset="0%" style="stop-color:#ffb3c1"/><stop offset="100%" style="stop-color:#ff8fab"/></radialGradient>
<linearGradient id="hatGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#2d2d2d"/><stop offset="50%" style="stop-color:#1a1a1a"/><stop offset="100%" style="stop-color:#0d0d0d"/></linearGradient>
<linearGradient id="hatBand" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" style="stop-color:#c0392b"/><stop offset="50%" style="stop-color:#e74c3c"/><stop offset="100%" style="stop-color:#c0392b"/></linearGradient>
<linearGradient id="lensGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#1a1a2e;stop-opacity:0.85"/><stop offset="100%" style="stop-color:#0f3460;stop-opacity:0.65"/></linearGradient>
<radialGradient id="blushLeft" cx="50%" cy="50%" r="50%"><stop offset="0%" style="stop-color:#ff9eb5;stop-opacity:0.6"/><stop offset="100%" style="stop-color:#ff9eb5;stop-opacity:0"/></radialGradient>
<radialGradient id="blushRight" cx="50%" cy="50%" r="50%"><stop offset="0%" style="stop-color:#ff9eb5;stop-opacity:0.6"/><stop offset="100%" style="stop-color:#ff9eb5;stop-opacity:0"/></radialGradient>
</defs>
<ellipse cx="160" cy="150" rx="48" ry="110" fill="url(#bunnyBody)" stroke="#d4c5b9" stroke-width="2" transform="rotate(-12,160,150)"/>
<ellipse cx="160" cy="155" rx="30" ry="80" fill="url(#earInner)" transform="rotate(-12,160,155)"/>
<ellipse cx="340" cy="150" rx="48" ry="110" fill="url(#bunnyBody)" stroke="#d4c5b9" stroke-width="2" transform="rotate(12,340,150)"/>
<ellipse cx="340" cy="155" rx="30" ry="80" fill="url(#earInner)" transform="rotate(12,340,155)"/>
<ellipse cx="250" cy="320" rx="140" ry="150" fill="url(#bunnyBody)" stroke="#d4c5b9" stroke-width="2"/>
<ellipse cx="250" cy="370" rx="95" ry="90" fill="#ffffff" opacity="0.6"/>
<ellipse cx="145" cy="370" rx="35" ry="25" fill="url(#blushLeft)"/>
<ellipse cx="355" cy="370" rx="35" ry="25" fill="url(#blushRight)"/>
<ellipse cx="195" cy="310" rx="28" ry="30" fill="white" stroke="#c4b5a8" stroke-width="1"/>
<circle cx="198" cy="312" r="16" fill="#4a3728"/>
<circle cx="205" cy="305" r="6" fill="white" opacity="0.9"/>
<ellipse cx="305" cy="310" rx="28" ry="30" fill="white" stroke="#c4b5a8" stroke-width="1"/>
<circle cx="302" cy="312" r="16" fill="#4a3728"/>
<circle cx="309" cy="305" r="6" fill="white" opacity="0.9"/>
<rect x="155" y="285" width="80" height="55" rx="14" ry="14" fill="none" stroke="#1a1a1a" stroke-width="6"/>
<rect x="158" y="288" width="74" height="49" rx="12" ry="12" fill="url(#lensGrad)"/>
<rect x="165" y="292" width="25" height="8" rx="4" fill="white" opacity="0.3"/>
<rect x="265" y="285" width="80" height="55" rx="14" ry="14" fill="none" stroke="#1a1a1a" stroke-width="6"/>
<rect x="268" y="288" width="74" height="49" rx="12" ry="12" fill="url(#lensGrad)"/>
<rect x="275" y="292" width="25" height="8" rx="4" fill="white" opacity="0.3"/>
<path d="M235 312 Q250 300 265 312" fill="none" stroke="#1a1a1a" stroke-width="5" stroke-linecap="round"/>
<line x1="155" y1="310" x2="115" y2="305" stroke="#1a1a1a" stroke-width="5" stroke-linecap="round"/>
<line x1="345" y1="310" x2="385" y2="305" stroke="#1a1a1a" stroke-width="5" stroke-linecap="round"/>
<path d="M240 365 L260 365 L250 378 Z" fill="#ffb3c1" stroke="#e8939e" stroke-width="1.5" stroke-linejoin="round"/>
<path d="M250 378 L250 390" stroke="#c4988a" stroke-width="2" stroke-linecap="round"/>
<path d="M250 390 Q237 405 225 398" fill="none" stroke="#c4988a" stroke-width="2.5" stroke-linecap="round"/>
<path d="M250 390 Q263 405 275 398" fill="none" stroke="#c4988a" stroke-width="2.5" stroke-linecap="round"/>
<rect x="238" y="392" width="10" height="14" rx="3" fill="white" stroke="#e0d5cc" stroke-width="1"/>
<rect x="252" y="392" width="10" height="14" rx="3" fill="white" stroke="#e0d5cc" stroke-width="1"/>
<ellipse cx="250" cy="215" rx="130" ry="18" fill="url(#hatGrad)" stroke="#0a0a0a" stroke-width="1"/>
<rect x="175" y="105" width="150" height="115" rx="12" fill="url(#hatGrad)" stroke="#0a0a0a" stroke-width="1"/>
<ellipse cx="250" cy="108" rx="75" ry="14" fill="#2d2d2d" stroke="#0a0a0a" stroke-width="1"/>
<rect x="175" y="185" width="150" height="22" fill="url(#hatBand)"/>
<rect x="235" y="183" width="30" height="26" rx="4" fill="#f1c40f" stroke="#d4a800" stroke-width="1"/>
</svg>` },
      {
        name: 'baykusku', svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="52" height="52">
<defs>
<radialGradient id="bodyGrad2" cx="50%" cy="45%" r="50%"><stop offset="0%" stop-color="#c49a6c"/><stop offset="100%" stop-color="#8B6914"/></radialGradient>
<radialGradient id="bellyGrad2" cx="50%" cy="40%" r="50%"><stop offset="0%" stop-color="#ffe8c2"/><stop offset="100%" stop-color="#f5d6a0"/></radialGradient>
<radialGradient id="eyeWhiteGrad2" cx="50%" cy="45%" r="50%"><stop offset="0%" stop-color="#ffffff"/><stop offset="100%" stop-color="#e8e0d0"/></radialGradient>
<radialGradient id="irisGrad3" cx="45%" cy="40%" r="50%"><stop offset="0%" stop-color="#ff8c00"/><stop offset="60%" stop-color="#e06000"/><stop offset="100%" stop-color="#a04000"/></radialGradient>
</defs>
<path d="M80 420 Q150 400 256 410 Q360 400 432 420" stroke="#5a3e1b" stroke-width="14" fill="none" stroke-linecap="round"/>
<path d="M80 420 Q150 408 256 416 Q360 408 432 420" stroke="#7a5a2b" stroke-width="8" fill="none" stroke-linecap="round"/>
<ellipse cx="256" cy="290" rx="130" ry="140" fill="url(#bodyGrad2)" stroke="#7a5a1e" stroke-width="2"/>
<polygon points="160,130 140,60 185,140" fill="#8B6914"/>
<polygon points="165,130 150,75 183,138" fill="#c49a6c"/>
<polygon points="352,130 372,60 327,140" fill="#8B6914"/>
<polygon points="347,130 362,75 329,138" fill="#c49a6c"/>
<ellipse cx="256" cy="200" rx="120" ry="105" fill="url(#bodyGrad2)" stroke="#7a5a1e" stroke-width="2"/>
<ellipse cx="256" cy="210" rx="105" ry="90" fill="#d4a960" opacity="0.5"/>
<circle cx="205" cy="210" r="45" fill="url(#eyeWhiteGrad2)" stroke="#5a3e1b" stroke-width="3"/>
<circle cx="205" cy="210" r="28" fill="url(#irisGrad3)"/>
<circle cx="205" cy="210" r="15" fill="#1a1a1a"/>
<circle cx="195" cy="200" r="7" fill="#fff" opacity="0.9"/>
<circle cx="212" cy="205" r="3.5" fill="#fff" opacity="0.6"/>
<circle cx="307" cy="210" r="45" fill="url(#eyeWhiteGrad2)" stroke="#5a3e1b" stroke-width="3"/>
<circle cx="307" cy="210" r="28" fill="url(#irisGrad3)"/>
<circle cx="307" cy="210" r="15" fill="#1a1a1a"/>
<circle cx="297" cy="200" r="7" fill="#fff" opacity="0.9"/>
<circle cx="314" cy="205" r="3.5" fill="#fff" opacity="0.6"/>
<path d="M246 248 L256 275 L266 248 Z" fill="#e8960c" stroke="#b87800" stroke-width="1.5" stroke-linejoin="round"/>
<path d="M249 250 L256 268 L263 250 Z" fill="#ffb830"/>
<ellipse cx="256" cy="330" rx="70" ry="75" fill="url(#bellyGrad2)" stroke="#c49a6c" stroke-width="1"/>
<g stroke="#b8956a" stroke-width="1.5" fill="none" opacity="0.6">
<path d="M240 280 L256 295 L272 280"/>
<path d="M235 305 L256 320 L277 305"/>
<path d="M238 330 L256 345 L274 330"/>
</g>
<path d="M126 250 Q100 300 115 380 Q130 370 145 340 Q140 300 145 260 Z" fill="#7a5a1e" opacity="0.8"/>
<path d="M386 250 Q412 300 397 380 Q382 370 367 340 Q372 300 367 260 Z" fill="#7a5a1e" opacity="0.8"/>
</svg>` }
    ];

    const PLANET_DATA = [
      {
        name: 'Dünya', level: 1,
        svg: `<svg width="48" height="48" viewBox="0 0 64 64"><circle cx="32" cy="32" r="28" fill="#0f2550"/><circle cx="32" cy="32" r="18" fill="#4f8ef7"/><circle cx="22" cy="26" r="5" fill="#85b7f5" opacity=".6"/><circle cx="38" cy="38" r="3" fill="#85b7f5" opacity=".4"/></svg>`
      },
      {
        name: 'Ay', level: 2,
        svg: `<svg width="48" height="48" viewBox="0 0 64 64"><circle cx="32" cy="32" r="28" fill="#2d0a00"/><circle cx="32" cy="32" r="18" fill="#f87171"/><ellipse cx="32" cy="32" rx="18" ry="6" fill="#c53030" opacity=".5"/><ellipse cx="32" cy="24" rx="14" ry="4" fill="#c53030" opacity=".3"/></svg>`
      },
      {
        name: 'Mars', level: 3,
        svg: `<svg width="48" height="48" viewBox="0 0 64 64"><circle cx="32" cy="32" r="28" fill="#1a0a3a"/><circle cx="32" cy="32" r="18" fill="#a78bfa"/><ellipse cx="32" cy="32" rx="28" ry="9" fill="none" stroke="#c4b5fd" stroke-width="2" opacity=".5"/></svg>`
      }
    ];

    const ILL_TYPES = ['rocket', 'star', 'moon', 'mars', 'book', 'jupiter', 'galaxy'];

    /* ═══════════════════════════════════════════════════════════════
       INIT
    ═══════════════════════════════════════════════════════════════ */
    const SUPABASE_URL = 'https://hzcgcuctztofutcbwodj.supabase.co';
    const SUPABASE_KEY = 'sb_publishable_vnHJewFsydQNsaTuLE3p1A_-lu1_hUY';

    window.addEventListener('DOMContentLoaded', () => {
      drawStars();
      initSupabase();
    });

    async function initSupabase() {
      try {
        sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        loadXPFromStorage();
        buildWelcome();
        // Kayıtlı isim varsa göster ama her zaman isim ekranını göster
        const savedName = localStorage.getItem('uzay_player_name') || '';
        if (savedName) {
          const inp = document.getElementById('name-input');
          if (inp) inp.value = savedName;
          const retEl = document.getElementById('name-returning');
          const retTxt = document.getElementById('name-returning-txt');
          if (retEl && retTxt) {
            retTxt.textContent = savedName;
            retEl.style.display = 'block';
          }
        }
        // Her zaman isim ekranını göster - kullanıcı seçim yapsın
        showScreen('s-name');
        loadShopItems(); // arkaplanda yükle
      } catch (e) {
        const errEl = document.getElementById('welcome-error');
        if (errEl) { errEl.textContent = `Bağlantı hatası: ${e.message}`; errEl.style.display = 'block'; }
      }
    }

    /* ── KULLANICI ADI FONKSİYONLARI ── */
    function checkNameChoice() {
      const inp = document.getElementById('name-input');
      const val = (inp ? inp.value : '').trim();
      if (!val) {
        if (inp) {
          inp.classList.add('shake');
          setTimeout(() => inp.classList.remove('shake'), 400);
          inp.focus();
        }
        return;
      }
      // Enter tuşuna basıldığında yeni kayıt olarak devam et
      submitNewName();
    }

    // Seviye tespit testi değişkenleri
    let LEVEL_TEST_QUESTIONS = [];
    let LEVEL_TEST_CURRENT = 0;
    let LEVEL_TEST_SCORE = 0;
    let LEVEL_TEST_ANSWERED = false;
    let LEVEL_TEST_LOG = []; // {type, result: 'correct'|'wrong'|'skip'}

    function ltProgressKey() { return PLAYER_NAME ? `uzay_lt_progress_${PLAYER_NAME}` : 'uzay_lt_progress_guest'; }
    function ltDoneKey()     { return PLAYER_NAME ? `uzay_lt_done_${PLAYER_NAME}`     : 'uzay_lt_done_guest'; }

    function saveLevelTestProgress() {
      localStorage.setItem(ltProgressKey(), JSON.stringify({ current: LEVEL_TEST_CURRENT, score: LEVEL_TEST_SCORE }));
    }

    function loadLevelTestProgress() {
      const saved = localStorage.getItem(ltProgressKey());
      if (saved) {
        const p = JSON.parse(saved);
        LEVEL_TEST_CURRENT = p.current || 0;
        LEVEL_TEST_SCORE   = p.score   || 0;
      } else {
        LEVEL_TEST_CURRENT = 0;
        LEVEL_TEST_SCORE   = 0;
      }
    }

    function isLevelTestDone() {
      return !!localStorage.getItem(ltDoneKey());
    }

    function markLevelTestDone(recommendedLevel, sectionId = null) {
      localStorage.setItem(
        ltDoneKey(),
        JSON.stringify({
          level: recommendedLevel,
          sectionId: sectionId
        })
      );
      localStorage.removeItem(ltProgressKey());
    }

    function getLtDoneData() {
      const raw = localStorage.getItem(ltDoneKey());
      if (!raw) return null;

      try {
        const data = JSON.parse(raw);

        // Eski sistemde kayıt sadece "1", "2" veya "3" olarak tutulmuşsa onu da destekle.
        if (typeof data === 'string' || typeof data === 'number') {
          return {
            level: Number(data),
            sectionId: null
          };
        }

        return {
          level: Number(data.level) || 1,
          sectionId: data.sectionId || null
        };
      } catch (e) {
        // Eski format: "1", "2", "3"
        const level = Number(raw);
        if (Number.isFinite(level)) {
          return {
            level,
            sectionId: null
          };
        }
        return null;
      }
    }

    // Seviye tespit testi soruları (Supabase'dan çekilecek)
    async function getLevelTestQuestions() {
      try {
        const { data, error } = await sb.from('level_test_questions').select('*').order('order_index', { ascending: true, nullsFirst: false }).order('id');
        if (error) {
          console.error('Level test questions load error:', error);
          return [];
        }
        console.log('Loaded level test questions:', data);
        return data || [];
      } catch (e) {
        console.error('Level test questions exception:', e);
        return [];
      }
    }

    function confirmWarningRead() {
      document.getElementById('level-test-warning').style.display = 'none';
      document.getElementById('level-test-main').style.display = '';
    }

    async function startLevelTest() {
      LEVEL_TEST_QUESTIONS = await getLevelTestQuestions();
      loadLevelTestProgress();
      LEVEL_TEST_ANSWERED = false;
      if (LEVEL_TEST_CURRENT === 0) LEVEL_TEST_LOG = [];

      document.getElementById('level-test-start-btn').style.display = 'none';
      showLevelTestQuestion();
    }

    function showLevelTestQuestion() {
      if (LEVEL_TEST_CURRENT >= LEVEL_TEST_QUESTIONS.length) {
        completeLevelTest();
        return;
      }

      const q = LEVEL_TEST_QUESTIONS[LEVEL_TEST_CURRENT];
      const contentEl = document.getElementById('level-test-content');
      const stepEl    = document.getElementById('lt-step-lbl');
      const progEl    = document.getElementById('lt-prog');
      const startWrap = document.getElementById('lt-start-wrap');
      if (startWrap) startWrap.style.display = 'none';
      if (stepEl) stepEl.textContent = `Soru ${LEVEL_TEST_CURRENT + 1} / ${LEVEL_TEST_QUESTIONS.length}`;
      if (progEl) progEl.style.width = `${Math.round((LEVEL_TEST_CURRENT / LEVEL_TEST_QUESTIONS.length) * 100)}%`;

      const opts = (() => { try { return Array.isArray(q.options) ? q.options : JSON.parse(q.options || '[]'); } catch(e) { return []; } })();

      let html = `<div class="q-card">`;
      html += `<span class="q-tag tag-tr">Seviye Testi</span>`;
      html += `<p class="q-text">${q.question_text}</p>`;
      html += `<div class="choices">${opts.map((o, i) => `<button class="choice-btn" id="lt-opt-${i}" onclick="answerLevelTest(${i})">${o}</button>`).join('')}</div>`;
      html += `<div style="margin-top:.6rem;text-align:center">`;
      html += `<button class="btn" id="lt-skip-btn" onclick="skipLevelTestQuestion()" style="font-size:.8rem;color:var(--text-muted);background:transparent;border:1px dashed var(--space-border)">🤷 Bilmiyorum, Geç</button>`;
      html += `</div>`;
      html += `<div class="feedback" id="lt-fb"></div>`;
      html += `</div>`;
      contentEl.innerHTML = html;
    }

    function answerLevelTest(answerIndex) {
      if (LEVEL_TEST_ANSWERED) return;
      LEVEL_TEST_ANSWERED = true;
      
      const q = LEVEL_TEST_QUESTIONS[LEVEL_TEST_CURRENT];
      const correct = answerIndex === q.correct_answer;

      LEVEL_TEST_LOG.push({ type: q.type || 'unknown', subtopic: q.subtopic || '', result: correct ? 'correct' : 'wrong' });
      if (correct) {
        LEVEL_TEST_SCORE++;
      }
      
      // Cevabı göster — q-card stili renklendirme
      const allOpts = document.querySelectorAll('[id^="lt-opt-"]');
      allOpts.forEach((btn, i) => {
        btn.disabled = true;
        if (i === answerIndex) {
          btn.classList.add(correct ? 'correct' : 'wrong');
        }
      });
      const fb = document.getElementById('lt-fb');
      if (fb) {
        fb.textContent = correct ? '✅ Doğru!' : '❌ Yanlış';
        fb.className = 'feedback ' + (correct ? 'correct' : 'wrong');
        fb.style.display = 'block';
      }
      
      // Sonraki soruya geç
      setTimeout(() => {
        LEVEL_TEST_CURRENT++;
        LEVEL_TEST_ANSWERED = false;
        saveLevelTestProgress();
        showLevelTestQuestion();
      }, 1500);
    }

    function skipLevelTestQuestion() {
      if (LEVEL_TEST_ANSWERED) return;
      LEVEL_TEST_ANSWERED = true;
      const q = LEVEL_TEST_QUESTIONS[LEVEL_TEST_CURRENT];
      LEVEL_TEST_LOG.push({ type: q.type || 'unknown', subtopic: q.subtopic || '', result: 'skip' });

      // "Bilmiyorum" butonunu pasifleştir
      const skipBtn = document.getElementById('lt-skip-btn');
      if (skipBtn) { skipBtn.disabled = true; skipBtn.style.opacity = '.4'; }
      const fb = document.getElementById('lt-fb');
      if (fb) { fb.textContent = '⏭ Geçildi'; fb.className = 'feedback'; fb.style.display = 'block'; fb.style.color = 'var(--text-muted)'; }

      setTimeout(() => {
        LEVEL_TEST_CURRENT++;
        LEVEL_TEST_ANSWERED = false;
        saveLevelTestProgress();
        showLevelTestQuestion();
      }, 800);
    }

    async function completeLevelTest() {
      const score = Math.round((LEVEL_TEST_SCORE / LEVEL_TEST_QUESTIONS.length) * 100);
      let recommendedLevel = 1;
      if (score >= 80) recommendedLevel = 3;
      else if (score >= 60) recommendedLevel = 2;
      else if (score >= 40) recommendedLevel = 1;

      const contentEl = document.getElementById('level-test-content');
      const stepEl    = document.getElementById('lt-step-lbl');
      const progEl    = document.getElementById('lt-prog');
      if (stepEl) stepEl.textContent = 'Test Tamamlandı';
      if (progEl) progEl.style.width = '100%';

      contentEl.innerHTML = '<div style="text-align:center;padding:1.5rem;color:var(--text-sec)"><div class="spinner" style="margin:0 auto .8rem"></div>Sonuç hazırlanıyor...</div>';

      let recSectionId   = null;
      let recSectionName = '';
      let recSectionDesc = '';
      try {
        const { data: secs } = await sb.from('sections').select('*').order('planet_level').order('section_no');
        const allSecs = secs || [];
        const planetSecs = allSecs.filter(s => s.planet_level === recommendedLevel && !s.is_locked);
        if (planetSecs.length > 0) {
          recSectionId   = planetSecs[0].id;
          recSectionName = planetSecs[0].name || ('Bölüm ' + planetSecs[0].section_no);
          recSectionDesc = planetSecs[0].description || '';
        }
      } catch(e) { /* sessizce geç */ }

      const planetName = PLANET_DATA[recommendedLevel - 1]?.name || 'Seviye ' + recommendedLevel;
      const emoji = score >= 80 ? '🏆' : score >= 60 ? '⭐' : '👍';

      // ── Öğretmen raporu için analiz ──
      const mathLog   = LEVEL_TEST_LOG.filter(l => l.type === 'math');
      const trLog     = LEVEL_TEST_LOG.filter(l => l.type === 'tr');
      const mathCorrect = mathLog.filter(l => l.result === 'correct').length;
      const trCorrect   = trLog.filter(l => l.result === 'correct').length;
      const mathTotal   = mathLog.length;
      const trTotal     = trLog.length;
      const mathPct     = mathTotal > 0 ? Math.round((mathCorrect / mathTotal) * 100) : null;
      const trPct       = trTotal   > 0 ? Math.round((trCorrect   / trTotal)   * 100) : null;
      const skipCount   = LEVEL_TEST_LOG.filter(l => l.result === 'skip').length;

      // Konu bazlı analiz
      const topicMap = {};
      LEVEL_TEST_LOG.forEach(l => {
        const key = l.subtopic || (l.type === 'math' ? 'Matematik' : 'Türkçe');
        if (!topicMap[key]) topicMap[key] = { correct: 0, wrong: 0, skip: 0 };
        topicMap[key][l.result]++;
      });
      const topicEntries = Object.entries(topicMap).map(([topic, v]) => {
        const tot = v.correct + v.wrong + v.skip;
        const pct = tot > 0 ? Math.round((v.correct / tot) * 100) : 0;
        return { topic, pct, correct: v.correct, wrong: v.wrong, skip: v.skip, tot };
      }).sort((a, b) => b.pct - a.pct);

      const goodTopics = topicEntries.filter(t => t.pct >= 70);
      const midTopics  = topicEntries.filter(t => t.pct >= 40 && t.pct < 70);
      const weakTopics = topicEntries.filter(t => t.pct < 40);

      // Rapor HTML yardımcısı
      function topicChips(list, color) {
        return list.map(t => `<span style="display:inline-block;background:${color};border-radius:99px;padding:.2rem .7rem;font-size:.75rem;margin:.15rem">${t.topic} (%${t.pct})</span>`).join('');
      }

      const reportHTML = `
        <div id="lt-teacher-report" style="display:none;margin-top:1rem">
          <div style="background:rgba(251,191,36,.07);border:1.5px solid rgba(251,191,36,.35);border-radius:var(--radius);padding:1.1rem 1.2rem;margin-bottom:.8rem">
            <div style="font-family:'Nunito',sans-serif;font-weight:800;color:#fbbf24;font-size:.95rem;margin-bottom:.8rem">📋 Öğretmen Raporu — ${PLAYER_NAME}</div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:.5rem;margin-bottom:.8rem">
              <div style="background:var(--space-card2);border-radius:var(--radius-sm);padding:.6rem .8rem;text-align:center">
                <div style="font-size:.7rem;color:var(--text-muted);margin-bottom:.2rem">🧮 Matematik</div>
                <div style="font-size:1.1rem;font-weight:700;color:${mathPct >= 70 ? 'var(--space-green)' : mathPct >= 40 ? 'var(--space-amber)' : 'var(--space-red)'}">${mathPct !== null ? '%' + mathPct : '—'}</div>
                <div style="font-size:.68rem;color:var(--text-muted)">${mathCorrect}/${mathTotal} doğru</div>
              </div>
              <div style="background:var(--space-card2);border-radius:var(--radius-sm);padding:.6rem .8rem;text-align:center">
                <div style="font-size:.7rem;color:var(--text-muted);margin-bottom:.2rem">📖 Türkçe</div>
                <div style="font-size:1.1rem;font-weight:700;color:${trPct >= 70 ? 'var(--space-green)' : trPct >= 40 ? 'var(--space-amber)' : 'var(--space-red)'}">${trPct !== null ? '%' + trPct : '—'}</div>
                <div style="font-size:.68rem;color:var(--text-muted)">${trCorrect}/${trTotal} doğru</div>
              </div>
            </div>

            ${skipCount > 0 ? `<div style="font-size:.78rem;color:var(--text-muted);margin-bottom:.7rem">⏭ ${skipCount} soru "Bilmiyorum" ile geçildi.</div>` : ''}

            ${goodTopics.length > 0 ? `<div style="margin-bottom:.6rem"><div style="font-size:.75rem;font-weight:700;color:var(--space-green);margin-bottom:.3rem">✅ İyi Olduğu Alanlar</div><div>${topicChips(goodTopics, 'rgba(74,222,128,.15)')}</div></div>` : ''}
            ${midTopics.length > 0  ? `<div style="margin-bottom:.6rem"><div style="font-size:.75rem;font-weight:700;color:var(--space-amber);margin-bottom:.3rem">🔶 Geliştirilmesi Gereken Alanlar</div><div>${topicChips(midTopics, 'rgba(251,191,36,.15)')}</div></div>` : ''}
            ${weakTopics.length > 0 ? `<div style="margin-bottom:.6rem"><div style="font-size:.75rem;font-weight:700;color:var(--space-red);margin-bottom:.3rem">⚠️ Zayıf Olduğu Alanlar</div><div>${topicChips(weakTopics, 'rgba(248,113,113,.15)')}</div></div>` : ''}

            <div style="border-top:1px solid var(--space-border);padding-top:.7rem;margin-top:.4rem">
              <div style="font-size:.75rem;font-weight:700;color:var(--space-blue);margin-bottom:.3rem">🚀 Yönlendirme</div>
              <div style="font-size:.8rem;color:var(--text-sec);line-height:1.6">
                Öğrenci <strong style="color:#fff">${planetName} — ${recSectionName}</strong> bölümüne yönlendirilecek.
                ${recSectionDesc ? `<br><span style="font-size:.75rem;color:var(--text-muted)">${recSectionDesc}</span>` : ''}
              </div>
            </div>
          </div>
        </div>`;

      contentEl.innerHTML = `
        <div class="q-card" style="text-align:center">
          <div style="font-size:2.5rem;margin-bottom:.5rem">${emoji}</div>
          <h3 style="color:#fff;margin-bottom:.5rem">Test Tamamlandı!</h3>
          <p style="color:var(--text-sec);margin-bottom:.3rem">
            Skor: <strong style="color:var(--space-green)">%${score}</strong>
            (${LEVEL_TEST_SCORE}/${LEVEL_TEST_QUESTIONS.length} doğru)
          </p>
          <p style="color:var(--text-sec);margin-bottom:1rem">
            Önerilen başlangıç:
            <strong style="color:var(--space-blue)">${planetName} — ${recSectionName || '1. Bölüm'}</strong>
          </p>
          <button class="btn primary" style="width:100%;margin-bottom:.5rem"
            onclick="goToRecommendedLevel(${recommendedLevel}, ${recSectionId})">
            🚀 Önerilen Bölüme Başla
          </button>
          <button class="btn" style="width:100%;font-size:.85rem;margin-bottom:.5rem"
            onclick="goToRecommendedLevel(${recommendedLevel}, null)">
            📂 Önce Gezegeni Göster
          </button>
          <button class="btn" style="width:100%;font-size:.8rem;background:rgba(251,191,36,.08);border-color:rgba(251,191,36,.35);color:#fbbf24"
            onclick="document.getElementById('lt-teacher-report').style.display=document.getElementById('lt-teacher-report').style.display==='none'?'block':'none'">
            📋 Öğretmen Raporu
          </button>
        </div>
        ${reportHTML}`;
    }

    function skipLevelTest() {
      goWelcome();
    }

    async function goToRecommendedLevel(level, sectionId) {
      markLevelTestDone(level, sectionId);
      LEVEL = level;
      if (sectionId) {
        await showPrevSectionSummaries(level, sectionId);
      } else {
        openSectionPicker(level);
      }
    }

    function submitNewName() {
      const inp = document.getElementById('name-input');
      const val = (inp ? inp.value : '').trim();
      if (!val) {
        if (inp) {
          inp.classList.add('shake');
          setTimeout(() => inp.classList.remove('shake'), 400);
          inp.focus();
        }
        return;
      }
      
      // Mevcut isim kontrolü
      const savedName = localStorage.getItem('uzay_player_name') || '';
      if (savedName && savedName.toLowerCase() === val.toLowerCase()) {
        if (inp) {
          inp.classList.add('shake');
          setTimeout(() => inp.classList.remove('shake'), 400);
          inp.focus();
        }
        showXpAlert('Bu isim daha önce alınmış! Başka bir isim seçin veya "Kaydım Var" butonunu kullanın.');
        return;
      }
      
      PLAYER_NAME = val;
      localStorage.setItem('uzay_player_name', val);
      loadXPFromStorage();
      updateXPBar();
      renderCharLevels();
      // Hazırlık ekranını göster (isim + selamlama)
      const greet = document.getElementById('ready-greeting');
      if (greet) greet.textContent = `Merhaba, ${val}! 👋`;
      
      // Seviye tespit testine yönlendir
      if (isLevelTestDone()) {
        const ltd = getLtDoneData();
        LEVEL = ltd?.level || 1;
        if (ltd && ltd.sectionId) {
          showPrevSectionSummaries(ltd.level, ltd.sectionId);
        } else {
          showScreen('s-ready');
        }
      } else {
        showScreen('s-level-test');
      }
    }

    function submitExistingName() {
      const inp = document.getElementById('name-input');
      const savedName = localStorage.getItem('uzay_player_name') || '';
      const val = (inp ? inp.value : '').trim() || savedName;
      
      if (!val) {
        if (inp) {
          inp.classList.add('shake');
          setTimeout(() => inp.classList.remove('shake'), 400);
          inp.focus();
        }
        return;
      }
      PLAYER_NAME = val;
      localStorage.setItem('uzay_player_name', val);
      loadXPFromStorage();
      updateXPBar();
      renderCharLevels();
      // Hazırlık ekranını göster (isim + selamlama)
      const greet = document.getElementById('ready-greeting');
      if (greet) greet.textContent = `Hoş geldin tekrar, ${val}! 👋`;
      // Sınav bitmemişse level test ekranına yönlendir
      if (!isLevelTestDone()) {
        showScreen('s-level-test');
      } else {
        const ltd = getLtDoneData();
        if (ltd && ltd.sectionId) {
          LEVEL = ltd.level || 1;
          showPrevSectionSummaries(ltd.level, ltd.sectionId);
        } else {
          showScreen('s-ready');
        }
      }
    }

    /* ── XP STORAGE ── */
    // Kullanıcı adına özel key'ler — her oyuncu bağımsız veri taşır
    function xpKey() { return PLAYER_NAME ? `uzay_char_xp_${PLAYER_NAME}` : 'uzay_char_xp_guest'; }
    function ownedKey() { return PLAYER_NAME ? `uzay_owned_${PLAYER_NAME}` : 'uzay_owned_guest'; }

    function loadXPFromStorage() {
      const saved = localStorage.getItem(xpKey());
      CHAR_XP = saved ? JSON.parse(saved) : { 0: 0, 1: 0, 2: 0 };
      OWNED_ITEMS = JSON.parse(localStorage.getItem(ownedKey()) || '[]');
      syncCharXP();
    }

    function syncCharXP() {
      TOTAL_XP = CHAR_XP[CHAR] || 0;
      CHAR_LEVEL = Math.floor(TOTAL_XP / XP_PER_LEVEL) + 1;
    }

    function saveXPToStorage() {
      CHAR_XP[CHAR] = TOTAL_XP;
      localStorage.setItem(xpKey(), JSON.stringify(CHAR_XP));
      localStorage.setItem(ownedKey(), JSON.stringify(OWNED_ITEMS));
    }

    /* ── XP BAR RENDER ── */
    function updateXPBar() {
      syncCharXP();
      const xpInLevel = TOTAL_XP % XP_PER_LEVEL;
      const pct = Math.round((xpInLevel / XP_PER_LEVEL) * 100);
      const el = id => document.getElementById(id);
      const displayName = PLAYER_NAME || CHAR_DATA[CHAR].name;
      const charLvlLine = `${CHAR_DATA[CHAR].name} · Lv.${CHAR_LEVEL}`;
      if (el('xp-avatar')) el('xp-avatar').innerHTML = CHAR_DATA[CHAR].svg + `<span class="xp-level-badge">Lv.${CHAR_LEVEL}</span>`;
      if (el('xp-char-name')) el('xp-char-name').textContent = displayName ? `${displayName} — ${charLvlLine}` : charLvlLine;
      if (el('xp-count')) el('xp-count').textContent = `${TOTAL_XP} XP`;
      if (el('xp-fill')) el('xp-fill').style.width = pct + '%';
      if (el('xp-next-lbl')) el('xp-next-lbl').textContent = `Sonraki seviye: ${XP_PER_LEVEL - xpInLevel} XP kaldı`;
      if (el('game-xp-disp')) el('game-xp-disp').textContent = `⚡${TOTAL_XP} XP`;
      if (el('xp-level-badge')) el('xp-level-badge').textContent = `Lv.${CHAR_LEVEL}`;
    }

    /* ── XP KAZANMA / KAYBETME ── */
    let xpToastTimer = null;
    function awardXP(delta) {
      const prevLevel = Math.floor(TOTAL_XP / XP_PER_LEVEL) + 1;
      TOTAL_XP = Math.max(0, TOTAL_XP + delta);
      CHAR_XP[CHAR] = TOTAL_XP;
      SESSION_XP += delta;
      saveXPToStorage();
      const newLevel = Math.floor(TOTAL_XP / XP_PER_LEVEL) + 1;
      updateXPBar();

      // XP toast
      const toast = document.getElementById('xp-toast');
      if (toast) {
        toast.textContent = delta > 0 ? `+${delta} XP ⚡` : `${delta} XP`;
        toast.style.borderColor = delta > 0 ? 'var(--space-amber)' : 'var(--space-red)';
        toast.style.color = delta > 0 ? 'var(--space-amber)' : 'var(--space-red)';
        toast.classList.add('show');
        clearTimeout(xpToastTimer);
        xpToastTimer = setTimeout(() => toast.classList.remove('show'), 1600);
      }

      // Seviye atlama
      if (newLevel > prevLevel) {
        setTimeout(() => showLevelUp(newLevel), 500);
      }
    }

    let _levelupTimer = null;
    function showLevelUp(lvl) {
      const who = PLAYER_NAME ? PLAYER_NAME : CHAR_DATA[CHAR].name;
      document.getElementById('levelup-title').textContent = `🎉 Seviye ${lvl} — Tebrikler ${who}!`;
      document.getElementById('levelup-sub').textContent = `${CHAR_DATA[CHAR].name} yeni seviyeye ulaştı!`;
      const overlay = document.getElementById('levelup-overlay');
      overlay.classList.add('show');
      // 3 saniye sonra otomatik kapat
      clearTimeout(_levelupTimer);
      _levelupTimer = setTimeout(() => overlay.classList.remove('show'), 3200);
    }

    function closeLevelUp() {
      clearTimeout(_levelupTimer);
      document.getElementById('levelup-overlay').classList.remove('show');
    }

    /* ═══════════════════════════════════════════════════════════════
       WELCOME
    ═══════════════════════════════════════════════════════════════ */
    function buildWelcome() {
      // Characters
      renderCharLevels();

      // Planets — bölüm seçimine yönlendiriyor
      const pr = document.getElementById('planet-row');
      pr.innerHTML = PLANET_DATA.map((p, i) => `
    <button class="planet-btn" onclick="openSectionPicker(${p.level})">
      ${p.svg}
      <div class="p-name">${p.name}</div>
    </button>`).join('');
    }

    function renderCharLevels() {
      const cr = document.getElementById('char-row');
      if (!cr) return;
      cr.innerHTML = CHAR_DATA.map((c, i) => {
        const charXp = CHAR_XP[i] || 0;
        const charLvl = Math.floor(charXp / XP_PER_LEVEL) + 1;
        const xpIn = charXp % XP_PER_LEVEL;
        const pct = Math.round((xpIn / XP_PER_LEVEL) * 100);
        return `
    <button class="char-btn ${i === CHAR ? 'active' : ''}" id="cb${i}" onclick="selectChar(${i})">
      <div style="position:relative;display:inline-block">
        ${c.svg}
        <span class="xp-level-badge" style="position:absolute;bottom:-4px;right:-4px">Lv.${charLvl}</span>
      </div>
      <div style="width:100%;height:4px;background:var(--space-card2);border-radius:99px;margin-top:.4rem;overflow:hidden">
        <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,var(--space-amber),#f97316);border-radius:99px;transition:width .4s"></div>
      </div>
      <div style="font-size:.65rem;color:var(--text-muted);margin-top:.2rem">${charXp} XP</div>
    </button>`;
      }).join('');
    }

    function selectChar(i) {
      CHAR = i;
      document.querySelectorAll('.char-btn').forEach((b, j) => b.classList.toggle('active', j === i));
      syncCharXP();
      updateXPBar();
      renderCharLevels();
    }

    let CURRENT_SECTION = null; // aktif bölüm objesi

    /* Gezegen seçilince bölüm seçici aç */
    const SECTION_PASS_PCT = 80; // bir bölümü geçmek için gereken minimum başarı %

    async function openSectionPicker(level) {
      LEVEL = level;
      const planet = PLANET_DATA[level - 1];
      const svgEl = document.getElementById('sp-planet-svg');
      const nameEl = document.getElementById('sp-planet-name');
      const grid = document.getElementById('sp-grid');
      const loadEl = document.getElementById('sp-loading');
      const errEl = document.getElementById('sp-error');

      if (svgEl) svgEl.innerHTML = planet?.svg || '';
      if (nameEl) nameEl.textContent = planet?.name || '';
      grid.innerHTML = '';
      errEl.style.display = 'none';
      loadEl.style.display = 'flex';
      showScreen('s-sections');

      try {
        // Bölümleri ve bu oyuncunun en iyi sonuçlarını paralel çek
        const [secRes, resRes] = await Promise.all([
          sb.from('sections')
            .select('*')
            .eq('planet_level', level)
            .order('section_no'),
          PLAYER_NAME
            ? sb.from('game_results')
              .select('section_id, score_pct')
              .eq('planet_level', level)
              .eq('player_name', PLAYER_NAME)
            : Promise.resolve({ data: [] }),
        ]);
        if (secRes.error) throw secRes.error;
        loadEl.style.display = 'none';

        const sections = secRes.data || [];
        if (sections.length === 0) {
          loadLevel(level, null);
          return;
        }

        // Her bölüm için oyuncunun en iyi başarısını hesapla
        const bestPct = {}; // section_id → max score_pct
        (resRes.data || []).forEach(r => {
          if (r.section_id == null) return;
          if (bestPct[r.section_id] == null || r.score_pct > bestPct[r.section_id]) {
            bestPct[r.section_id] = r.score_pct;
          }
        });

        // Her bölüm erişilebilir mi?
        // Kural: 1. bölüm her zaman açık; N. bölüm için N-1. bölümde %80+ gerekli
        // is_locked (admin kilidi) önceliklidir — admin kilitlediyse ne olursa olsun kapalı
        grid.innerHTML = sections.map((sec, idx) => {
          const adminLocked = !!sec.is_locked;
          const prevSec = idx > 0 ? sections[idx - 1] : null;
          const prevPassed = prevSec
            ? (bestPct[prevSec.id] != null && bestPct[prevSec.id] >= SECTION_PASS_PCT)
            : true;
          const locked = adminLocked;

          const myBest = bestPct[sec.id];
          const passed = myBest != null && myBest >= SECTION_PASS_PCT;
          const tried = myBest != null;

          let icon, borderColor, statusLine;
          if (adminLocked) {
            icon = '🔒'; borderColor = 'var(--space-border)';
            statusLine = '<div style="font-size:.72rem;color:var(--text-muted);margin-top:.2rem">Admin tarafından kilitlendi</div>';
          } else if (passed) {
            icon = '✅'; borderColor = 'rgba(74,222,128,.4)';
            statusLine = `<div style="font-size:.72rem;color:var(--space-green);margin-top:.2rem">Tamamlandı · En iyi: %${myBest}</div>`;
          } else if (locked) {
            icon = '🔒'; borderColor = 'var(--space-border)';
            const prevName = prevSec ? (prevSec.name || 'önceki bölüm') : '';
            statusLine = `<div style="font-size:.72rem;color:var(--text-muted);margin-top:.2rem">"${prevName}" bölümünden %${SECTION_PASS_PCT} alman gerekiyor</div>`;
          } else if (tried) {
            icon = '▶'; borderColor = 'rgba(251,191,36,.35)';
            statusLine = `<div style="font-size:.72rem;color:var(--space-amber);margin-top:.2rem">En iyi: %${myBest} · %${SECTION_PASS_PCT} için tekrar dene!</div>`;
          } else {
            icon = '▶'; borderColor = 'rgba(79,142,247,.35)';
            statusLine = '';
          }

          const lockStyle = locked ? 'opacity:.5' : '';

          return `<div style="background:var(--space-card);border:1.5px solid ${borderColor};border-radius:var(--radius);padding:1rem 1.2rem;gap:.9rem;${lockStyle}">
            <button class="pdf-download-btn" onclick="downloadSectionPDF(${sec.id}, '${encodeURIComponent(sec.name || 'Bölüm ' + sec.section_no).replace(/'/g, '%27')}', ${level}, this)" ${locked ? 'disabled' : ''}>
              📄 PDF İndir (Yazdır)
            </button>
            <div style="display:flex;align-items:center;gap:.9rem">
              <span style="font-size:1.4rem;flex-shrink:0">${icon}</span>
              <div style="flex:1;min-width:0">
                <div style="font-family:'Nunito',sans-serif;font-weight:700;color:${locked ? 'var(--text-muted)' : '#fff'};font-size:.95rem">${sec.name || 'Bölüm ' + sec.section_no}</div>
                ${sec.description ? `<div style="font-size:.75rem;color:var(--text-sec);margin-top:.1rem">${sec.description}</div>` : ''}
                ${statusLine}
              </div>
              ${!locked ? `<button class="btn primary" onclick="loadLevel(${level},${sec.id})" style="flex-shrink:0;font-size:.82rem">${passed ? 'Tekrar Oyna' : 'Başla'}</button>` : ''}
            </div>
          </div>`;
        }).join('');

        // ── Tüm bölümler tamamlandı mı? → "Neler Öğrendik?" banner'ı ──
        const nonLockedSections = sections.filter(s => !s.is_locked);
        const allPassed = nonLockedSections.length > 0 &&
          nonLockedSections.every(s => bestPct[s.id] != null && bestPct[s.id] >= SECTION_PASS_PCT);
        if (allPassed) {
          const banner = document.createElement('div');
          banner.style.cssText = 'background:linear-gradient(135deg,rgba(251,191,36,.15),rgba(79,142,247,.12));border:1.5px solid rgba(251,191,36,.5);border-radius:var(--radius);padding:1.1rem 1.2rem;margin-bottom:.5rem;text-align:center';
          banner.innerHTML = `
            <div style="font-size:1.8rem;margin-bottom:.3rem">🌟</div>
            <div style="font-family:'Nunito',sans-serif;font-weight:800;color:#fff;font-size:1rem;margin-bottom:.4rem">
              Tebrikler! Bu gezegenin tüm bölümlerini tamamladın!
            </div>
            <div style="font-size:.82rem;color:var(--text-sec);margin-bottom:.9rem">
              Öğrendiklerini test etmek ister misin?
            </div>
            <button class="btn primary" onclick="openPlanetReview(${level})" style="font-size:.9rem">
              🌟 Neler Öğrendik? — Gezegen Özet Sınavı
            </button>`;
          grid.insertAdjacentElement('afterbegin', banner);
        }

      } catch (e) {
        loadEl.style.display = 'none';
        errEl.textContent = 'Bölümler yüklenemedi: ' + e.message;
        errEl.style.display = 'block';
      }
    }

    /* ═══════════════════════════════════════════════════════════════
       NELER ÖĞRENDİK — GEZEGEN ÖZET SINAVI
    ═══════════════════════════════════════════════════════════════ */
    let PR_QUESTIONS = [];
    let PR_CURRENT   = 0;
    let PR_SCORE     = 0;
    let PR_ANSWERED  = false;
    let PR_SECTION_NAMES = {}; // section_id → section name

    async function openPlanetReview(level) {
      LEVEL = level;
      const planet = PLANET_DATA[level - 1];
      showScreen('s-planet-review');

      // Başlık güncelle
      const iconEl  = document.getElementById('pr-planet-icon');
      const titleEl = document.getElementById('pr-title');
      const subEl   = document.getElementById('pr-sub');
      if (iconEl)  iconEl.innerHTML  = planet?.svg || '';
      if (titleEl) titleEl.textContent = `🌟 Neler Öğrendik? — ${planet?.name || 'Gezegen'}`;
      if (subEl)   subEl.textContent  = 'Bu gezegende öğrendiklerini hatırlayalım!';

      const contentEl = document.getElementById('pr-content');
      const btnsEl    = document.getElementById('pr-buttons');
      contentEl.innerHTML = '<div style="text-align:center;padding:1.5rem;color:var(--text-sec)"><div class="spinner" style="margin:0 auto .8rem"></div>Sorular hazırlanıyor...</div>';
      btnsEl.innerHTML    = '';

      try {
        // Gezegenin tüm bölümlerini çek
        const { data: secs, error: secErr } = await sb.from('sections')
          .select('id, name, section_no')
          .eq('planet_level', level)
          .order('section_no');
        if (secErr) throw secErr;

        PR_SECTION_NAMES = {};
        secs.forEach(s => { PR_SECTION_NAMES[s.id] = s.name || ('Bölüm ' + s.section_no); });

        // Her bölümden 2 MCQ sorusu çek (tercih MCQ, yoksa herhangi)
        const allQPromises = secs.map(s =>
          sb.from('questions')
            .select('id, question_text, options, correct_answer, format, section_id')
            .eq('level', level)
            .eq('section_id', s.id)
            .order('id')
        );
        const allQResults = await Promise.all(allQPromises);

        PR_QUESTIONS = [];
        allQResults.forEach((res, idx) => {
          if (res.error || !res.data) return;
          const pool = res.data;
          // MCQ tercih et, yoksa tüm havuzu kullan
          const mcqPool = pool.filter(q => !q.format || q.format === 'mcq');
          const usePool = mcqPool.length >= 2 ? mcqPool : pool;
          // Karıştır ve 2 tane al
          const shuffled = [...usePool].sort(() => Math.random() - 0.5);
          shuffled.slice(0, 2).forEach(q => PR_QUESTIONS.push(q));
        });

        if (PR_QUESTIONS.length === 0) {
          contentEl.innerHTML = '<div class="error-box">Bu gezegen için soru bulunamadı.</div>';
          btnsEl.innerHTML = '<button class="btn" onclick="openSectionPicker(LEVEL)">← Geri Dön</button>';
          return;
        }

        PR_QUESTIONS = PR_QUESTIONS.sort(() => Math.random() - 0.5);
        PR_CURRENT  = 0;
        PR_SCORE    = 0;
        PR_ANSWERED = false;
        showPRQuestion();

      } catch(e) {
        contentEl.innerHTML = `<div class="error-box">Yükleme hatası: ${e.message}</div>`;
        btnsEl.innerHTML = '<button class="btn" onclick="openSectionPicker(LEVEL)">← Geri Dön</button>';
      }
    }

    function showPRQuestion() {
      if (PR_CURRENT >= PR_QUESTIONS.length) {
        showPRResult();
        return;
      }
      const q    = PR_QUESTIONS[PR_CURRENT];
      const secName = PR_SECTION_NAMES[q.section_id] || '';
      const opts = (() => { try { return Array.isArray(q.options) ? q.options : JSON.parse(q.options || '[]'); } catch(e) { return []; } })();
      const contentEl = document.getElementById('pr-content');
      const btnsEl    = document.getElementById('pr-buttons');
      btnsEl.innerHTML = '';

      let html = `
        <div style="background:var(--space-card);border:1.5px solid var(--space-border);border-radius:var(--radius);padding:1.2rem;margin-bottom:.8rem">
          <div style="font-size:.72rem;color:var(--text-muted);margin-bottom:.3rem">
            Soru ${PR_CURRENT + 1} / ${PR_QUESTIONS.length}
            ${secName ? `<span style="margin-left:.5rem;color:var(--space-blue)">· ${secName}</span>` : ''}
          </div>
          <div style="background:var(--space-card2);border-radius:var(--radius-sm);height:3px;margin-bottom:1rem;overflow:hidden">
            <div style="height:100%;width:${Math.round((PR_CURRENT / PR_QUESTIONS.length) * 100)}%;background:var(--space-blue);transition:width .3s"></div>
          </div>
          <h3 style="color:#fff;font-size:1rem;margin-bottom:1rem;line-height:1.5">${q.question_text}</h3>
          <div style="display:grid;gap:.45rem">`;

      opts.forEach((opt, i) => {
        html += `<button class="btn" id="pr-opt-${i}" onclick="answerPR(${i})"
          style="text-align:left;background:var(--space-card2);border:1px solid var(--space-border);font-size:.88rem">${opt}</button>`;
      });
      html += '</div></div>';
      contentEl.innerHTML = html;
    }

    function answerPR(idx) {
      if (PR_ANSWERED) return;
      PR_ANSWERED = true;
      const q = PR_QUESTIONS[PR_CURRENT];
      const correct = (() => { try { const v = q.correct_answer; return typeof v === 'number' ? v : JSON.parse(v); } catch(e) { return 0; } })();
      const isCorrect = idx === correct;
      if (isCorrect) PR_SCORE++;

      // Renklendirme
      const allBtns = document.querySelectorAll('[id^="pr-opt-"]');
      allBtns.forEach((btn, i) => {
        btn.disabled = true;
        if (i === correct) {
          btn.style.background = 'rgba(74,222,128,.2)';
          btn.style.borderColor = 'var(--space-green)';
        } else if (i === idx && !isCorrect) {
          btn.style.background = 'rgba(248,113,113,.2)';
          btn.style.borderColor = 'var(--space-red)';
        }
      });

      setTimeout(() => {
        PR_CURRENT++;
        PR_ANSWERED = false;
        showPRQuestion();
      }, 1200);
    }

    function showPRResult() {
      const total   = PR_QUESTIONS.length;
      const pct     = Math.round((PR_SCORE / total) * 100);
      const planet  = PLANET_DATA[LEVEL - 1];
      const emoji   = pct >= 80 ? '🏆' : pct >= 60 ? '⭐' : pct >= 40 ? '👍' : '💪';
      const msg     = pct >= 80 ? 'Mükemmel! Gezegenin tüm konularına hakimsin!'
                    : pct >= 60 ? 'Gayet iyi! Birkaç konuyu tekrar gözden geçirebilirsin.'
                    : pct >= 40 ? 'Fena değil, biraz daha pratik yapsan çok daha iyi olacaksın!'
                    : 'Bölümleri tekrar ziyaret edip eksikleri kapatsak mı?';

      const contentEl = document.getElementById('pr-content');
      const btnsEl    = document.getElementById('pr-buttons');

      contentEl.innerHTML = `
        <div style="text-align:center;padding:1rem 0">
          <div style="font-size:3rem;margin-bottom:.5rem">${emoji}</div>
          <div style="font-family:'Nunito',sans-serif;font-weight:800;color:#fff;font-size:1.15rem;margin-bottom:.5rem">
            ${pct}% Doğru
          </div>
          <div style="font-size:.85rem;color:var(--text-sec);margin-bottom:1.2rem;line-height:1.6">${msg}</div>
          <div style="background:var(--space-card2);border-radius:var(--radius-sm);padding:.9rem 1rem;font-size:.83rem;color:var(--text-sec);text-align:left">
            <div style="font-weight:700;color:#fff;margin-bottom:.5rem">📊 Sonuç</div>
            ${PR_QUESTIONS.length} sorudan <strong style="color:var(--space-green)">${PR_SCORE}</strong> tanesini doğru yanıtladın.
          </div>
        </div>`;

      btnsEl.innerHTML = `
        <button class="btn" onclick="openSectionPicker(LEVEL)">← Bölüm Seçimine Dön</button>
        <button class="btn primary" onclick="openPlanetReview(LEVEL)" style="font-size:.85rem">🔄 Tekrar Dene</button>`;
    }

    /* ═══════════════════════════════════════════════════════════════
       ÖNCEKİ BÖLÜM ÖZETİ SİSTEMİ
    ═══════════════════════════════════════════════════════════════ */
    let _storyTargetLevel   = 1;
    let _storyTargetSection = null;

    async function showPrevSectionSummaries(targetLevel, targetSectionId) {
      _storyTargetLevel   = targetLevel;
      _storyTargetSection = targetSectionId;
      showScreen('s-story-summary');

      const titleEl   = document.getElementById('ss-title');
      const subEl     = document.getElementById('ss-sub');
      const contentEl = document.getElementById('ss-content');
      const planet    = PLANET_DATA[targetLevel - 1];
      if (titleEl) titleEl.textContent = (planet?.name || 'Gezegen') + ' — Önceki Bölümlerin Özeti';
      if (subEl)   subEl.textContent   = 'Kendi bölümünden önce gelen bölümlerin özetini oku.';
      contentEl.innerHTML = '<div style="text-align:center;padding:1.5rem;color:var(--text-sec)"><div class="spinner" style="margin:0 auto .8rem"></div>Yükleniyor...</div>';

      try {
        const { data: secs, error } = await sb.from('sections')
          .select('*').eq('planet_level', targetLevel).order('section_no');
        if (error) throw error;

        const allSecs   = secs || [];
        const targetSec = allSecs.find(s => s.id === targetSectionId);
        const targetNo  = targetSec ? targetSec.section_no : 999;
        const prevSecs  = allSecs.filter(s => s.section_no < targetNo);

        if (prevSecs.length === 0) {
          confirmStorySummaryRead();
          return;
        }

        let html = '';

        // Önceki gezegenler özeti
        if (targetLevel > 1) {
          const prevPlanetNames = PLANET_DATA.slice(0, targetLevel - 1).map(p => p.name).join(', ');
          html += `<div style="background:rgba(79,142,247,.08);border:1.5px solid rgba(79,142,247,.25);border-radius:var(--radius);padding:1rem 1.1rem">
            <div style="font-weight:700;color:var(--space-blue);font-size:.9rem;margin-bottom:.4rem">🪐 Önceki Gezegenler</div>
            <div style="font-size:.83rem;color:var(--text-sec);line-height:1.6">
              <strong style="color:#fff">${prevPlanetNames}</strong> gezegenlerindeki tüm bölümleri tamamladın.
            </div>
          </div>`;
        }

        prevSecs.forEach(sec => {
          const desc = (sec.description && sec.description.trim())
            ? sec.description
            : (sec.name || ('Bölüm ' + sec.section_no)) + ' konuları bu bölümde işlendi.';
          html += `<div style="background:var(--space-card);border:1.5px solid var(--space-border);border-radius:var(--radius);padding:1rem 1.1rem">
            <div style="font-family:'Nunito',sans-serif;font-weight:700;color:#fff;font-size:.92rem;margin-bottom:.35rem">
              Bölüm ${sec.section_no}: ${sec.name || ''}
            </div>
            <div style="font-size:.83rem;color:var(--text-sec);line-height:1.65">${desc}</div>
          </div>`;
        });

        contentEl.innerHTML = html;

        const contBtn = document.getElementById('ss-continue-btn');
        if (contBtn && targetSec) {
          contBtn.textContent = '✅ Okudum — "' + (targetSec.name || 'Bölüm') + '" Bölümüne Başla';
        }

      } catch(e) {
        contentEl.innerHTML = '<div class="error-box">Yükleme hatası: ' + e.message + '</div>';
      }
    }

    function confirmStorySummaryRead() {
      showScreen('s-ready');
      const greet = document.getElementById('ready-greeting');
      if (greet) greet.textContent = 'Hazır mısın, ' + PLAYER_NAME + '? 🚀';
      const readyBtn = document.querySelector('#s-ready .name-submit-btn');
      if (readyBtn) {
        readyBtn.onclick = () => loadLevel(_storyTargetLevel, _storyTargetSection);
        readyBtn.textContent = '✅ Hazırım, Bölüme Başla!';
      }
    }

    async function loadLevel(level, sectionId) {
      LEVEL = level;
      CURRENT_SECTION = sectionId;
      const loadEl = document.getElementById('welcome-loading') || document.getElementById('sp-loading');
      const errEl = document.getElementById('welcome-error') || document.getElementById('sp-error');
      if (loadEl) loadEl.style.display = 'flex';
      if (errEl) errEl.style.display = 'none';
      try {
        let query = sb.from('questions').select('*').eq('level', level);
        if (sectionId) {
          query = query.eq('section_id', sectionId);
        }
        const { data, error } = await query.order('order_index', { ascending: true }).order('id');
        if (error) throw error;
        if (!data || data.length < 20) {
          throw new Error(`Bu bölüm için yeterli soru yok. (${data?.length || 0} soru, en az 20 gerekli)`);
        }
        const sorted = [...data].sort((a, b) => {
          const oa = a.order_index != null ? a.order_index : a.id;
          const ob = b.order_index != null ? b.order_index : b.id;
          return oa - ob;
        });
        LEVEL_QUESTIONS = sorted.slice(0, 20);
        CUR = 0; SCORE = 0; ATT = 0; LOG = []; ANSWERED = false;
        SESSION_XP = 0; Q_RETRY = false; Q_FIRST_WRONG = false; WRONG_COUNT = 0;
        FLAGGED_QUESTIONS = [];
        syncCharXP();
        initJokers();
        START_TIME = Date.now();
        showScreen('s-game');
        renderQuestion();
      } catch (e) {
        if (errEl) { errEl.textContent = e.message; errEl.style.display = 'block'; }
      } finally {
        if (loadEl) loadEl.style.display = 'none';
      }
    }

    /* ═══════════════════════════════════════════════════════════════
       GAME ENGINE
    ═══════════════════════════════════════════════════════════════ */
    function updateTopBar() {
      document.getElementById('step-lbl').textContent = `Görev ${CUR + 1}/20`;
      document.getElementById('prog').style.width = `${Math.round((CUR / 20) * 100)}%`;
      document.getElementById('score-disp').textContent = `${SCORE}/${ATT}`;
      const r = ATT > 0 ? SCORE / ATT : 0;
      document.getElementById('stars-disp').textContent = r >= .75 ? '★★★' : r >= .5 ? '★★☆' : r >= .25 ? '★☆☆' : '☆☆☆';
      const gxp = document.getElementById('game-xp-disp');
      if (gxp) gxp.textContent = `⚡${TOTAL_XP} XP`;
    }

    function renderQuestion() {
      if (CUR >= 20) { showEndScreen(); return; }
      const q = LEVEL_QUESTIONS[CUR];
      ANSWERED = false;
      SELECTED_WORDS = [];
      Q_START = Date.now();
      updateTopBar();

      const illIdx = CUR % ILL_TYPES.length;
      const illType = ILL_TYPES[illIdx];

      let html = `<svg class="ill-banner" viewBox="0 0 680 88" xmlns="http://www.w3.org/2000/svg">${getIllSvg(illType)}</svg>`;
      html += `<div class="q-card">`;
      html += `<span class="q-tag ${q.type === 'math' ? 'tag-math' : 'tag-tr'}">${q.subtopic || q.type}</span>`;
      if (q.scene) {
        html += `<div class="char-bubble">${CHAR_DATA[CHAR].svg}<div class="bubble-text">${q.scene}</div></div>`;
      }
      html += `<p class="q-text">${q.question_text}</p>`;

      const fmt = q.format || 'mcq';

      if (fmt === 'mcq') {
        const opts = safeJSON(q.options, []);
        html += `<div class="choices">${opts.map((o, i) => `<button class="choice-btn" onclick="doMcq(${i})">${o}</button>`).join('')}</div>`;

      } else if (fmt === 'tf') {
        html += `<div class="tf-row">
      <button class="tf-btn" onclick="doTf(true)">✓ Doğru</button>
      <button class="tf-btn" onclick="doTf(false)">✗ Yanlış</button>
    </div>`;

      } else if (fmt === 'blank') {
        if (q.template_text) html += `<div class="template-box">${q.template_text}</div>`;
        html += `<input class="blank-field" id="blank-inp" placeholder="Cevabını yaz..." type="text">
             <button class="btn" style="margin-top:.6rem" onclick="doBlank()">Kontrol Et</button>`;

      } else if (fmt === 'read' || fmt === 'write') {
        html += `<div class="read-box">${q.template_text || q.question_text}</div>
             <div class="confirm-row">
               <button class="btn" onclick="doConfirm(true)">${fmt === 'read' ? 'Okudum!' : 'Yazdım!'}</button>
               <button class="btn" onclick="doConfirm(false)">Zorlandım</button>
             </div>`;

      } else if (fmt === 'sort') {
        const items = shuffle(safeJSON(q.options, []));
        html += `<p style="font-size:.8rem;color:var(--text-sec);margin-bottom:.5rem">Parçaları çift tıklayarak sıraya yerleştir:</p>`;
        html += `<div class="drag-pool" id="sort-pool">${items.map(it => `<div class="drag-item" data-val="${it}" ondblclick="toggleItem('sort-pool', 'sort-target', this)">${it}</div>`).join('')}</div>`;
        html += `<p class="drag-zone-label" style="margin-bottom:.3rem">Sıralı alan:</p>`;
        html += `<div class="drag-zone" id="sort-target"></div>`;
        html += `<button class="btn" style="margin-top:.5rem" onclick="doSort()">Kontrol Et</button>`;

      } else if (fmt === 'drag') {
        const items = shuffle(safeJSON(q.options, []));
        html += `<div class="drag-pool" id="drag-pool">${items.map(it => `<div class="drag-item" data-val="${it}" ondblclick="toggleItem('drag-pool', 'drag-target', this)">${it}</div>`).join('')}</div>`;
        html += `<div class="drag-zone" id="drag-target"><span style="font-size:.75rem;color:var(--text-muted)">Doğru olanları çift tıkla →</span></div>`;
        html += `<button class="btn" style="margin-top:.5rem" onclick="doDrag()">Kontrol Et</button>`;

      } else if (fmt === 'match') {
        const pairs = safeJSON(q.correct_answer, []);
        const rights = shuffle(pairs.map(p => p[1]));
        html += `<div class="match-grid">`;
        pairs.forEach((p, i) => {
          html += `<div class="match-row">
        <div class="match-left">${p[0]}</div>
        <div class="match-arrow">→</div>
        <select class="match-sel" id="ms${i}">
          <option value="">Seç...</option>
          ${rights.map(r => `<option value="${r}">${r}</option>`).join('')}
        </select></div>`;
        });
        html += `</div><button class="btn" onclick="doMatch()">Kontrol Et</button>`;

      } else if (fmt === 'word_sort') {
        const opts2 = safeJSON(q.options, []);
        html += `<div class="word-cloud">${opts2.map(w => `<button class="word-chip" id="wc_${w}" onclick="toggleWord('${w}')">${w}</button>`).join('')}</div>`;
        html += `<button class="btn" onclick="doWordSort()">Kontrol Et</button>`;
      }

      html += `<div class="feedback" id="fb"></div>`;
      html += `<button class="btn btn-next" id="btn-next" onclick="nextQuestion()">Devam Et →</button>`;
      html += `<div style="text-align:right;margin-top:.4rem">
        <button class="report-btn" id="rpt-btn-${CUR}" onclick="flagQuestion(${q.id || 0}, ${CUR}, 'game')">⚑ Hata Bildir</button>
      </div>`;
      html += `</div>`;

      document.getElementById('game-area').innerHTML = html;
    }

    /* ─── ANSWER HANDLERS ─────────────────────────────── */
    function logResult(ok) {
      const q = LEVEL_QUESTIONS[CUR];
      const elapsed = Math.round((Date.now() - Q_START) / 1000);

      if (ok) {
        // Doğru cevap
        ATT++; SCORE++;
        LOG.push({ subtopic: q.subtopic || q.type, type: q.type, ok: true, elapsed });
        ANSWERED = true;
        Q_RETRY = false; Q_FIRST_WRONG = false;
        awardXP(XP_PER_CORRECT);
      } else {
        if (!Q_RETRY && !Q_FIRST_WRONG) {
          // İlk yanlış — retry şansı ver, henüz loglama
          Q_FIRST_WRONG = true;
          ANSWERED = false; // btn-next gösterilmeyecek, retry akışı devreye girer
        } else {
          // İkinci yanlış (retry sonrası) ya da skip — kayıp
          ATT++;
          WRONG_COUNT++;
          LOG.push({ subtopic: q.subtopic || q.type, type: q.type, ok: false, elapsed });
          ANSWERED = true;
          Q_RETRY = false; Q_FIRST_WRONG = false;
          awardXP(XP_PER_WRONG_SKIP);
        }
      }
      updateTopBar();
    }

    /* İlk yanlış sonrası retry sorusu göster */
    function showRetryQuestion() {
      Q_RETRY = true;
      Q_FIRST_WRONG = false;
      ANSWERED = false;
      SELECTED_WORDS = [];
      Q_START = Date.now();

      const q = LEVEL_QUESTIONS[CUR];
      // Retry banner + soruyu yeniden render et
      const fmt = q.format || 'mcq';
      const illIdx = CUR % ILL_TYPES.length;
      let html = `<div class="retry-banner">⚠️ Yanlış cevap! Tekrar dene — bu sefer de yanlış yaparsan ya da atlarsan 2 XP kaybedersin.</div>`;
      html += `<svg class="ill-banner" viewBox="0 0 680 88" xmlns="http://www.w3.org/2000/svg">${getIllSvg(ILL_TYPES[illIdx])}</svg>`;
      html += `<div class="q-card">`;
      html += `<span class="q-tag ${q.type === 'math' ? 'tag-math' : 'tag-tr'}">${q.subtopic || q.type}</span>`;
      if (q.scene) html += `<div class="char-bubble">${CHAR_DATA[CHAR].svg}<div class="bubble-text">${q.scene}</div></div>`;
      html += `<p class="q-text">${q.question_text}</p>`;

      if (fmt === 'mcq') {
        const opts = safeJSON(q.options, []);
        html += `<div class="choices">${opts.map((o, i) => `<button class="choice-btn" onclick="doMcq(${i})">${o}</button>`).join('')}</div>`;
      } else if (fmt === 'tf') {
        html += `<div class="tf-row"><button class="tf-btn" onclick="doTf(true)">✓ Doğru</button><button class="tf-btn" onclick="doTf(false)">✗ Yanlış</button></div>`;
      } else if (fmt === 'blank') {
        if (q.template_text) html += `<div class="template-box">${q.template_text}</div>`;
        html += `<input class="blank-field" id="blank-inp" placeholder="Cevabını yaz..." type="text"><button class="btn" style="margin-top:.6rem" onclick="doBlank()">Kontrol Et</button>`;
      } else if (fmt === 'read' || fmt === 'write') {
        // Sesli okuma / yazma — retry'da da aynı butonları göster
        html += `<div class="read-box">${q.template_text || q.question_text}</div>`;
        html += `<div class="confirm-row">
          <button class="btn" onclick="doConfirm(true)">${fmt === 'read' ? 'Okudum!' : 'Yazdım!'}</button>
          <button class="btn" onclick="doConfirm(false)">Zorlandım</button>
        </div>`;
      } else {
        // Diğer desteklenmeyen formatlar — direkt atlat (XP kaybı)
        logResult(false);
        showFeedback(false, q.feedback_fail);
        return;
      }
      html += `<div class="feedback" id="fb"></div>`;
      html += `<button class="btn btn-next" id="btn-next" onclick="skipQuestion()" style="background:rgba(248,113,113,.1);border-color:rgba(248,113,113,.3);color:var(--space-red)">Atla (−2 XP) →</button>`;
      html += `<div style="text-align:right;margin-top:.4rem">
        <button class="report-btn" id="rpt-btn-retry-${CUR}" onclick="flagQuestion(${q.id || 0}, ${CUR}, 'game')">⚑ Hata Bildir</button>
      </div>`;
      html += `</div>`;
      document.getElementById('game-area').innerHTML = html;
    }

    /* Soruyu atla — XP kaybı */
    function skipQuestion() {
      if (ANSWERED) { nextQuestion(); return; }
      const q = LEVEL_QUESTIONS[CUR];
      const elapsed = Math.round((Date.now() - Q_START) / 1000);
      ATT++;
      WRONG_COUNT++;
      LOG.push({ subtopic: q.subtopic || q.type, type: q.type, ok: false, elapsed });
      ANSWERED = true;
      Q_RETRY = false; Q_FIRST_WRONG = false;
      awardXP(XP_PER_WRONG_SKIP);
      updateTopBar();
      // Sonraki soruya geç
      showFeedback(false, q.feedback_fail || 'Sonraki soruya geçildi.');
      const nb = document.getElementById('btn-next');
      if (nb) { nb.textContent = 'Devam Et →'; nb.style.cssText = ''; nb.classList.add('show'); nb.onclick = nextQuestion; }
    }

    function showFeedback(ok, msg) {
      const fb = document.getElementById('fb');
      if (!fb) return;

      if (!ok && Q_FIRST_WRONG) {
        // İlk yanlış — retry fırsatı
        fb.className = 'feedback fail show';
        fb.innerHTML = `${CHAR_DATA[CHAR].svg}<span>Yanlış! Bir kez daha deneme hakkın var.</span>`;
        const nb = document.getElementById('btn-next');
        if (nb) {
          nb.classList.add('show');
          nb.textContent = 'Tekrar Dene →';
          nb.style.background = 'rgba(251,191,36,.15)';
          nb.style.borderColor = 'rgba(251,191,36,.4)';
          nb.style.color = 'var(--space-amber)';
          nb.onclick = showRetryQuestion;
        }
        return;
      }

      fb.className = `feedback ${ok ? 'ok' : msg ? 'fail' : 'info'} show`;
      const feedbackMsg = PLAYER_NAME ? msg.replace(/^(Harika|Bravo|Doğru|Yanlış)(!)?/, (m) => `${m} ${PLAYER_NAME}${'!'}`).replace(/^/, '') : msg;
      fb.innerHTML = `${CHAR_DATA[CHAR].svg}<span>${CHAR_DATA[CHAR].name}: ${feedbackMsg}</span>`;
      const nb = document.getElementById('btn-next');
      if (nb) {
        nb.classList.add('show');
        nb.textContent = 'Devam Et →';
        nb.style.cssText = '';
        nb.onclick = nextQuestion;
      }
    }

    function doMcq(i) {
      if (ANSWERED) return;
      const q = LEVEL_QUESTIONS[CUR];
      const btns = document.querySelectorAll('.choice-btn');
      btns.forEach(b => b.disabled = true);
      const correct = safeJSON(q.correct_answer, 0);
      const ok = i === correct;
      btns[i].classList.add(ok ? 'correct' : 'wrong');
      logResult(ok);
      showFeedback(ok, ok ? q.feedback_ok : q.feedback_fail);
    }

    function doTf(ans) {
      if (ANSWERED) return;
      const q = LEVEL_QUESTIONS[CUR];
      document.querySelectorAll('.tf-btn').forEach(b => b.disabled = true);
      const correct = safeJSON(q.correct_answer, true);
      const ok = ans === correct;
      logResult(ok);
      showFeedback(ok, ok ? q.feedback_ok : q.feedback_fail);
    }

    function doBlank() {
      if (ANSWERED) return;
      const q = LEVEL_QUESTIONS[CUR];
      const inp = document.getElementById('blank-inp');
      if (!inp) return;
      const val = inp.value.trim().toLowerCase().replace(/\s/g, '');
      // Boş bırakılmışsa hiçbir zaman doğru sayılmaz
      if (!val) {
        inp.focus();
        inp.style.borderColor = 'var(--space-red)';
        setTimeout(() => { inp.style.borderColor = ''; }, 1200);
        return;
      }
      inp.disabled = true;
      const ans = String(safeJSON(q.correct_answer, '')).toLowerCase().replace(/\s/g, '');
      // Doğru cevap da boşsa (admin hatası) yanlış say
      if (!ans) {
        logResult(false);
        showFeedback(false, q.feedback_fail || 'Cevap anahtarı eksik.');
        return;
      }
      const ok = val === ans || ans.split('/').filter(Boolean).includes(val);
      logResult(ok);
      showFeedback(ok, ok ? q.feedback_ok : q.feedback_fail);
    }

    function doConfirm(ok) {
      if (ANSWERED) return;
      const q = LEVEL_QUESTIONS[CUR];
      document.querySelectorAll('.confirm-row .btn').forEach(b => b.disabled = true);
      logResult(ok);
      showFeedback(ok, ok ? q.feedback_ok : q.feedback_fail);
    }

    // Çift tıklama ile öğe taşıma fonksiyonu
    function toggleItem(poolId, targetId, element) {
      const pool = document.getElementById(poolId);
      const target = document.getElementById(targetId);
      
      if (element.parentElement === pool) {
        // Havuzdan hedef alana taşı
        target.appendChild(element);
        element.classList.add('placed');
      } else {
        // Hedef alandan havuza geri taşı
        pool.appendChild(element);
        element.classList.remove('placed');
      }
    }

    function onDragStart(e) { DRAG_SRC = e.target; e.target.classList.add('dragging'); }
    function onDragOver(e) { e.preventDefault(); e.currentTarget.classList.add('over'); }
    function onDrop(e, zoneId) {
      e.preventDefault();
      const zone = document.getElementById(zoneId);
      zone.classList.remove('over');
      if (DRAG_SRC) {
        DRAG_SRC.classList.remove('dragging');
        DRAG_SRC.classList.add('placed');
        zone.appendChild(DRAG_SRC);
        DRAG_SRC = null;
      }
    }

    function doSort() {
      if (ANSWERED) return;
      const q = LEVEL_QUESTIONS[CUR];
      const placed = [...document.getElementById('sort-target').querySelectorAll('.drag-item')].map(el => el.dataset.val);
      const correct = safeJSON(q.correct_answer, []);
      const ok = JSON.stringify(placed) === JSON.stringify(correct);
      logResult(ok);
      showFeedback(ok, ok ? q.feedback_ok : q.feedback_fail);
    }

    function doDrag() {
      if (ANSWERED) return;
      const q = LEVEL_QUESTIONS[CUR];
      const placed = [...document.getElementById('drag-target').querySelectorAll('.drag-item')].map(el => el.dataset.val);
      const correct = safeJSON(q.correct_answer, []);
      const ok = Array.isArray(correct)
        ? correct.every(c => placed.includes(c)) && placed.length === correct.length
        : false;
      logResult(ok);
      showFeedback(ok, ok ? q.feedback_ok : q.feedback_fail);
    }

    function doMatch() {
      if (ANSWERED) return;
      const q = LEVEL_QUESTIONS[CUR];
      const pairs = safeJSON(q.correct_answer, []);
      const ok = pairs.every((p, i) => {
        const sel = document.getElementById(`ms${i}`);
        return sel && sel.value === p[1];
      });
      logResult(ok);
      showFeedback(ok, ok ? q.feedback_ok : q.feedback_fail);
    }

    function toggleWord(w) {
      const idx = SELECTED_WORDS.indexOf(w);
      const el = document.getElementById(`wc_${w}`);
      if (idx >= 0) { SELECTED_WORDS.splice(idx, 1); el.classList.remove('selected'); }
      else { SELECTED_WORDS.push(w); el.classList.add('selected'); }
    }

    function doWordSort() {
      if (ANSWERED) return;
      const q = LEVEL_QUESTIONS[CUR];
      const correct = safeJSON(q.correct_answer, []).sort();
      const ok = JSON.stringify([...SELECTED_WORDS].sort()) === JSON.stringify(correct);
      logResult(ok);
      showFeedback(ok, ok ? q.feedback_ok : q.feedback_fail);
    }

    function nextQuestion() {
      // Eğer retry modundaysa ve ANSWERED değilse skip sayılsın
      if (!ANSWERED && (Q_RETRY || Q_FIRST_WRONG)) {
        skipQuestion();
        return;
      }
      CUR++; Q_RETRY = false; Q_FIRST_WRONG = false;
      renderQuestion();
    }

    /* ═══════════════════════════════════════════════════════════════
       END SCREEN
    ═══════════════════════════════════════════════════════════════ */
    /* ═══════════════════════════════════════════════════════════════
       END SCREEN + PEKİŞTİRME TESPITI
    ═══════════════════════════════════════════════════════════════ */
    let REINFORCE_TYPE = null;   // 'math' | 'tr' | null
    let RF_QUESTIONS = [];
    let RF_CUR = 0, RF_SCORE = 0, RF_ANSWERED = false;

    // Aktif pekiştirme için seçili konu
    let REINFORCE_SUBTOPIC = null;

    let GAME_DURATION_SEC = 0; // bölüm süresi (saniye)

    function showEndScreen() {
      GAME_DURATION_SEC = Math.round((Date.now() - START_TIME) / 1000);
      const pct = Math.round((SCORE / 20) * 100);
      const stars = pct >= 75 ? '★★★' : pct >= 50 ? '★★☆' : pct >= 25 ? '★☆☆' : '☆☆☆';
      const msgs = ['Devam et — her seferinde daha iyisin!', 'Güzel iş! Biraz daha pratikle harika olacaksın.', 'Çok iyi! Neredeyse mükemmeldi.', 'Olağanüstü! Gerçek bir uzay kaşifisin!'];
      const msgIdx = pct >= 75 ? 3 : pct >= 50 ? 2 : pct >= 25 ? 1 : 0;
      document.getElementById('end-char').innerHTML = CHAR_DATA[CHAR].svg;
      document.getElementById('end-score-txt').textContent = `${SCORE}/20`;
      document.getElementById('end-stars-txt').textContent = stars;
      document.getElementById('end-msg-txt').textContent = msgs[msgIdx];

      // ── Bölüm tamamlama XP bonusu ──────────────────────────────
      const getsBonus = WRONG_COUNT <= MAX_WRONG_FOR_BONUS;
      if (getsBonus) {
        awardXP(XP_COMPLETION_BONUS);
      }

      // XP özeti
      const xpSumEl = document.getElementById('end-xp-summary');
      if (xpSumEl) {
        xpSumEl.style.display = 'block';
        const nameTag = PLAYER_NAME ? `${PLAYER_NAME} · ` : '';
        const bonusTag = getsBonus ? ` (+${XP_COMPLETION_BONUS} bölüm bonusu 🎯)` : '';
        xpSumEl.textContent = `${nameTag}Bu oyunda ${SESSION_XP > 0 ? '+' : ''}${SESSION_XP} XP${bonusTag} · ${CHAR_DATA[CHAR].name}: ${TOTAL_XP} XP · Lv.${CHAR_LEVEL}`;
      }

      // ── Ders & konu analizi ──────────────────────────────────────
      let mathOk = 0, mathTot = 0, trOk = 0, trTot = 0;
      const catStats = {}; // { subtopic: { ok, tot, type } }
      LOG.forEach(l => {
        if (l.type === 'math') { mathTot++; if (l.ok) mathOk++; }
        else { trTot++; if (l.ok) trOk++; }
        if (!catStats[l.subtopic]) catStats[l.subtopic] = { ok: 0, tot: 0, type: l.type };
        catStats[l.subtopic].tot++;
        if (l.ok) catStats[l.subtopic].ok++;
      });
      const mathPct = mathTot > 0 ? Math.round(mathOk / mathTot * 100) : 100;
      const trPct = trTot > 0 ? Math.round(trOk / trTot * 100) : 100;

      // Konu bazlı sınıflandır
      const strongTopics = [], midTopics = [], weakTopics = [];
      Object.entries(catStats).forEach(([sub, c]) => {
        const p = Math.round(c.ok / c.tot * 100);
        const entry = { sub, p, type: c.type };
        if (p >= 70) strongTopics.push(entry);
        else if (p >= 50) midTopics.push(entry);
        else weakTopics.push(entry);
      });

      // ── Otomatik değerlendirme metni ────────────────────────────
      const assessmentText = buildAssessmentText(pct, mathPct, trPct, strongTopics, weakTopics, midTopics);

      // ── Değerlendirme kartını göster ────────────────────────────
      const assessCard = document.getElementById('assessment-card');
      if (assessCard && LOG.length > 0) {
        assessCard.style.display = 'block';
        document.getElementById('assessment-text').textContent = assessmentText;

        // Güçlü konular
        const strongEl = document.getElementById('topic-chips-strong');
        strongEl.innerHTML = strongTopics.length
          ? strongTopics.map(t => `<span class="topic-chip strong">✓ ${t.sub} (%${t.p})</span>`).join('')
          : '';

        // Zayıf konular
        const weakEl = document.getElementById('topic-chips-weak');
        weakEl.innerHTML = weakTopics.length
          ? '<div style="font-size:.72rem;color:var(--text-muted);margin:.4rem 0 .2rem">Desteklenecek konular:</div>' +
          weakTopics.map(t => `<span class="topic-chip weak">⚠ ${t.sub} (%${t.p})</span>`).join('')
          : '';

        // Orta konular
        if (midTopics.length) {
          weakEl.innerHTML += '<div style="font-size:.72rem;color:var(--text-muted);margin:.4rem 0 .2rem">Geliştirilebilir:</div>' +
            midTopics.map(t => `<span class="topic-chip mid">~ ${t.sub} (%${t.p})</span>`).join('');
        }

        // Pekiştirme butonları — zayıf konular için
        const btnEl = document.getElementById('topic-reinforce-btns');
        if (weakTopics.length > 0) {
          btnEl.innerHTML = weakTopics.map((t, ti) => {
            window.__rfTopics = window.__rfTopics || [];
            window.__rfTopics[ti] = { type: t.type, sub: t.sub };
            return `<button class="reinforce-topic-btn" onclick="startReinforceForTopic(window.__rfTopics[${ti}].type, window.__rfTopics[${ti}].sub)">
              <span class="rtb-icon">📚</span> "${t.sub}" konusunda eksiklerini kapatmak ister misin?
            </button>`;
          }).join('');
        } else {
          btnEl.innerHTML = '';
        }
      }

      // ── Eski pekiştirme öneri kutusu (ders bazlı fallback) ──────
      const mathWeak = mathPct < 50;
      const trWeak = trPct < 50;
      const bannerEl = document.getElementById('reinforce-banner');
      const rfBtn = document.getElementById('btn-reinforce');
      const optRfBtn = document.getElementById('btn-optional-reinforce');
      const endGameBtn = document.getElementById('btn-end-game');

      // Başarı durumunu belirle
      const failed = pct < SECTION_PASS_PCT; // %80 altı

      // Pekiştirme tipini ve konusunu belirle
      if (weakTopics.length > 0) {
        REINFORCE_TYPE = weakTopics[0].type;
        REINFORCE_SUBTOPIC = weakTopics[0].sub;
      } else if (mathPct < trPct) {
        REINFORCE_TYPE = 'math';
        REINFORCE_SUBTOPIC = null;
      } else {
        REINFORCE_TYPE = 'tr';
        REINFORCE_SUBTOPIC = null;
      }

      if (failed) {
        // ── Zorunlu pekiştirme ──
        bannerEl.style.display = 'block';
        bannerEl.innerHTML = `
          <div style="background:rgba(248,113,113,.1);border:1.5px solid rgba(248,113,113,.35);border-radius:var(--radius-sm);padding:1rem 1.1rem;line-height:1.6">
            <div style="font-family:'Nunito',sans-serif;font-weight:800;color:var(--space-red);font-size:.95rem;margin-bottom:.4rem">⚠️ Pekiştirme Zorunlu</div>
            <div style="font-size:.85rem;color:var(--text-sec)">
              Bu bölümde zorlandığını gördüm, pekiştirme yapmalısın.
              <strong style="color:var(--space-red)">Ekranı kapatma!</strong>
            </div>
          </div>`;
        rfBtn.style.display = 'inline-flex';
        optRfBtn.style.display = 'none';
        endGameBtn.style.display = 'none';
      } else {
        // ── İsteğe bağlı pekiştirme ──
        bannerEl.style.display = 'block';
        bannerEl.innerHTML = `
          <div style="background:rgba(74,222,128,.07);border:1.5px solid rgba(74,222,128,.25);border-radius:var(--radius-sm);padding:1rem 1.1rem;line-height:1.6">
            <div style="font-family:'Nunito',sans-serif;font-weight:800;color:var(--space-green);font-size:.95rem;margin-bottom:.4rem">✅ Gayet iyi, aferin!</div>
            <div style="font-size:.85rem;color:var(--text-sec)">
              İstersen burada ek sorular var, gelebilirsin.
              <br>Dilersen oyunu sonlandırabilirsin.
            </div>
          </div>`;
        rfBtn.style.display = 'none';
        optRfBtn.style.display = 'inline-flex';
        endGameBtn.style.display = 'inline-flex';
      }

      // ── Supabase'e kaydet ────────────────────────────────────────
      saveGameResult(pct, mathPct, trPct, assessmentText, weakTopics, strongTopics, midTopics);

      showScreen('s-end');

      // ── Bölüm bitince sıralama tablosunu göster (s-end sonra lb) ──
      // Küçük gecikme: kayıt yazılsın
      setTimeout(() => {
        openLeaderboardFromEnd();
      }, 800);
    }

    // Bölüm sonunda sıralama tablosuna geç (hata kutusuyla birlikte)
    async function openLeaderboardFromEnd() {
      const planet = PLANET_DATA[LEVEL - 1];
      const svgEl = document.getElementById('lb-planet-svg');
      const nameEl = document.getElementById('lb-planet-name');
      if (svgEl && planet) svgEl.innerHTML = planet.svg;
      if (nameEl && planet) nameEl.textContent = planet.name;

      document.getElementById('lb-loading').style.display = 'block';
      document.getElementById('lb-table').style.display = 'none';
      document.getElementById('lb-empty').style.display = 'none';

      // Hata kutusu oluştur
      renderEndBugBox();

      showScreen('s-leaderboard');
      await loadLeaderboard();
    }

    /* ── Değerlendirme metni oluştur ── */
    function buildAssessmentText(pct, mathPct, trPct, strong, weak, mid) {
      const name = PLAYER_NAME ? `${PLAYER_NAME}` : 'Oyuncu';
      const planet = PLANET_DATA[LEVEL - 1]?.name || 'Gezegen';
      let text = '';

      // Genel giriş
      if (pct >= 80) text += `${name}, ${planet}'de harika bir performans sergiledi! `;
      else if (pct >= 60) text += `${name}, ${planet}'de genel olarak iyi bir sonuç elde etti. `;
      else if (pct >= 40) text += `${name}, ${planet}'de bazı konularda zorlandı. `;
      else text += `${name}, ${planet}'de bu sefer çok zor bir oyun geçirdi. `;

      // Ders bazlı
      const dersler = [];
      if (mathPct >= 70) dersler.push(`Matematik konularında güçlü (%${mathPct})`);
      else if (mathPct >= 50) dersler.push(`Matematik konularında orta düzeyde (%${mathPct})`);
      else dersler.push(`Matematik konularında destek gerekiyor (%${mathPct})`);

      if (trPct >= 70) dersler.push(`Türkçe konularında güçlü (%${trPct})`);
      else if (trPct >= 50) dersler.push(`Türkçe konularında orta düzeyde (%${trPct})`);
      else dersler.push(`Türkçe konularında destek gerekiyor (%${trPct})`);

      text += dersler.join(', ') + '. ';

      // Zayıf konu varsa
      if (weak.length > 0) {
        const weakNames = weak.map(t => t.sub).join(', ');
        text += `Özellikle ${weakNames} konusunda ek çalışma önerilir. `;
      }
      // Güçlü konu varsa
      if (strong.length > 0) {
        const strongNames = strong.map(t => t.sub).join(', ');
        text += `${strongNames} konularındaki başarısı takdire şayan.`;
      }

      return text.trim();
    }

    /* ── Oyun sonucunu Supabase'e kaydet ── */
    async function saveGameResult(pct, mathPct, trPct, assessmentText, weakTopics, strongTopics, midTopics) {
      if (!sb || !PLAYER_NAME) return;
      try {
        const topicBreakdown = {};
        LOG.forEach(l => {
          if (!topicBreakdown[l.subtopic]) topicBreakdown[l.subtopic] = { ok: 0, tot: 0, type: l.type };
          topicBreakdown[l.subtopic].tot++;
          if (l.ok) topicBreakdown[l.subtopic].ok++;
        });
        await sb.from('game_results').insert([{
          player_name: PLAYER_NAME,
          character: CHAR_DATA[CHAR].name,
          planet_level: LEVEL,
          section_id: CURRENT_SECTION || null,
          score: SCORE,
          total_q: 20,
          score_pct: pct,
          math_pct: mathPct,
          tr_pct: trPct,
          weak_topics: JSON.stringify(weakTopics.map(t => ({ sub: t.sub, pct: t.p, type: t.type }))),
          strong_topics: JSON.stringify(strongTopics.map(t => ({ sub: t.sub, pct: t.p, type: t.type }))),
          mid_topics: JSON.stringify(midTopics.map(t => ({ sub: t.sub, pct: t.p, type: t.type }))),
          topic_breakdown: JSON.stringify(topicBreakdown),
          assessment_text: assessmentText,
          xp_earned: SESSION_XP,
          duration_sec: GAME_DURATION_SEC,
          wrong_count: WRONG_COUNT,
          played_at: new Date().toISOString(),
        }]);
      } catch (e) {
        console.warn('Sonuç kaydedilemedi:', e.message);
      }
    }

    /* ═══════════════════════════════════════════════════════════════
       PEKİŞTİRME ALANI
    ═══════════════════════════════════════════════════════════════ */
    async function startReinforce() {
      if (!REINFORCE_TYPE) return;
      startReinforceForTopic(REINFORCE_TYPE, REINFORCE_SUBTOPIC);
    }

    async function startReinforceForTopic(type, subtopic) {
      REINFORCE_TYPE = type;
      REINFORCE_SUBTOPIC = subtopic || null;
      const dersAdi = type === 'math' ? 'Matematik' : 'Türkçe';
      const topicTag = subtopic ? ` — ${subtopic}` : '';
      document.getElementById('rf-title').textContent = `${dersAdi} Pekiştirme${topicTag}`;
      document.getElementById('rf-sub').textContent = subtopic
        ? `"${subtopic}" konusundaki eksiklerini kapatalım!`
        : `Bu gezegenin ${dersAdi} soruları · Hadi güçlenelim!`;
      document.getElementById('rf-prog').style.width = '0%';
      document.getElementById('rf-area').innerHTML = '<div class="loading-spinner"><div class="spinner"></div><span>Pekiştirme soruları yükleniyor...</span></div>';
      showScreen('s-reinforce');

      try {
        let query = sb
          .from('reinforcement_questions')
          .select('*')
          .eq('level', LEVEL)
          .eq('type', type);
        if (subtopic) query = query.eq('subtopic', subtopic);
        const { data, error } = await query.order('id');
        if (error) throw error;

        // Konu bazlı soru yoksa derse ait tüm soruları getir
        let questions = data || [];
        if (questions.length === 0 && subtopic) {
          const { data: fallback } = await sb
            .from('reinforcement_questions')
            .select('*')
            .eq('level', LEVEL)
            .eq('type', type)
            .order('id');
          questions = fallback || [];
        }

        if (questions.length === 0) {
          document.getElementById('rf-area').innerHTML = `<div class="error-box">Bu konu için henüz pekiştirme sorusu eklenmemiş.<br><br><button class="btn" onclick="showScreen('s-end')">Geri Dön</button></div>`;
          return;
        }
        RF_QUESTIONS = shuffle([...questions]).slice(0, Math.min(10, questions.length));
        RF_CUR = 0; RF_SCORE = 0; RF_ANSWERED = false;
        renderRfQuestion();
      } catch (e) {
        document.getElementById('rf-area').innerHTML = `<div class="error-box">Yükleme hatası: ${e.message}<br><br><button class="btn" onclick="showScreen('s-end')">Geri Dön</button></div>`;
      }
    }

    function renderRfQuestion() {
      const total = RF_QUESTIONS.length;
      if (RF_CUR >= total) {
        showRfComplete();
        return;
      }
      document.getElementById('rf-prog').style.width = `${Math.round((RF_CUR / total) * 100)}%`;
      const q = RF_QUESTIONS[RF_CUR];
      RF_ANSWERED = false;

      const isDersMath = q.type === 'math';
      const tagClass = isDersMath ? 'tag-reinforce-math' : 'tag-reinforce-tr';
      const tagLabel = isDersMath ? '🧮 Matematik' : '📖 Türkçe';

      let html = `<div class="q-card" style="border-radius:var(--radius)">`;
      html += `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.75rem">
        <span class="q-tag ${tagClass}" style="margin-bottom:0">${tagLabel}</span>
        <span style="font-size:.78rem;color:var(--text-muted)">${RF_CUR + 1}/${total}</span>
      </div>`;
      if (q.scene) {
        html += `<div class="char-bubble">${CHAR_DATA[CHAR].svg}<div class="bubble-text">${q.scene}</div></div>`;
      }
      html += `<p class="q-text">${q.question_text}</p>`;

      const fmt = q.format || 'mcq';
      if (fmt === 'mcq') {
        const opts = safeJSON(q.options, []);
        html += `<div class="choices">${opts.map((o, i) => `<button class="choice-btn" onclick="rfDoMcq(${i})">${o}</button>`).join('')}</div>`;
      } else if (fmt === 'tf') {
        html += `<div class="tf-row">
          <button class="tf-btn" onclick="rfDoTf(true)">✓ Doğru</button>
          <button class="tf-btn" onclick="rfDoTf(false)">✗ Yanlış</button>
        </div>`;
      } else if (fmt === 'blank') {
        if (q.template_text) html += `<div class="template-box">${q.template_text}</div>`;
        html += `<input class="blank-field" id="rf-blank-inp" placeholder="Cevabını yaz..." type="text">
                 <button class="btn" style="margin-top:.6rem" onclick="rfDoBlank()">Kontrol Et</button>`;
      } else {
        // Diğer formatlar için basit mcq
        const opts2 = safeJSON(q.options, []);
        if (opts2.length) {
          html += `<div class="choices">${opts2.map((o, i) => `<button class="choice-btn" onclick="rfDoMcq(${i})">${o}</button>`).join('')}</div>`;
        }
      }

      html += `<div class="feedback" id="rf-fb"></div>`;
      html += `<button class="btn btn-next" id="rf-btn-next" onclick="rfNext()">Devam Et →</button>`;
      html += `<div style="text-align:right;margin-top:.4rem">
        <button class="report-btn" id="rpt-btn-rf-${RF_CUR}" onclick="flagQuestion(${q.id || 0}, ${RF_CUR}, 'reinforce')">⚑ Hata Bildir</button>
      </div>`;
      html += `</div>`;
      html += `<div style="margin-top:.75rem;text-align:center"><button class="btn" onclick="showScreen('s-end')" style="font-size:.8rem">← Sonuç Ekranına Dön</button></div>`;

      document.getElementById('rf-area').innerHTML = html;
    }

    function rfShowFeedback(ok, msg) {
      const fb = document.getElementById('rf-fb');
      fb.className = `feedback ${ok ? 'ok' : 'fail'} show`;
      const rfMsg = msg || (ok ? 'Harika!' : 'Tekrar dene!');
      const rfFull = PLAYER_NAME && ok ? rfMsg.replace(/!$/, '') + ` ${PLAYER_NAME}!` : rfMsg;
      fb.innerHTML = `${CHAR_DATA[CHAR].svg}<span>${CHAR_DATA[CHAR].name}: ${rfFull}</span>`;
      const nb = document.getElementById('rf-btn-next');
      if (nb) nb.classList.add('show');
    }

    function rfDoMcq(i) {
      if (RF_ANSWERED) return;
      RF_ANSWERED = true;
      const q = RF_QUESTIONS[RF_CUR];
      const btns = document.querySelectorAll('#rf-area .choice-btn');
      btns.forEach(b => b.disabled = true);
      const correct = safeJSON(q.correct_answer, 0);
      const ok = i === correct;
      if (btns[i]) btns[i].classList.add(ok ? 'correct' : 'wrong');
      if (ok) RF_SCORE++;
      rfShowFeedback(ok, ok ? q.feedback_ok : q.feedback_fail);
    }

    function rfDoTf(ans) {
      if (RF_ANSWERED) return;
      RF_ANSWERED = true;
      const q = RF_QUESTIONS[RF_CUR];
      document.querySelectorAll('#rf-area .tf-btn').forEach(b => b.disabled = true);
      const correct = safeJSON(q.correct_answer, true);
      const ok = ans === correct;
      if (ok) RF_SCORE++;
      rfShowFeedback(ok, ok ? q.feedback_ok : q.feedback_fail);
    }

    function rfDoBlank() {
      if (RF_ANSWERED) return;
      RF_ANSWERED = true;
      const q = RF_QUESTIONS[RF_CUR];
      const inp = document.getElementById('rf-blank-inp');
      if (!inp) return;
      inp.disabled = true;
      const val = inp.value.trim().toLowerCase().replace(/\s/g, '');
      const ans = String(safeJSON(q.correct_answer, '')).toLowerCase().replace(/\s/g, '');
      const ok = val === ans || ans.split('/').includes(val);
      if (ok) RF_SCORE++;
      rfShowFeedback(ok, ok ? q.feedback_ok : q.feedback_fail);
    }

    function rfNext() { RF_CUR++; renderRfQuestion(); }

    function showRfComplete() {
      const total = RF_QUESTIONS.length;
      const pct = Math.round((RF_SCORE / total) * 100);
      const dersAdi = REINFORCE_TYPE === 'math' ? 'Matematik' : 'Türkçe';
      document.getElementById('rf-prog').style.width = '100%';
      document.getElementById('rf-area').innerHTML = `
        <div class="reinforce-complete">
          <div class="reinforce-complete-icon">${pct >= 70 ? '🎉' : '💪'}</div>
          <div class="reinforce-complete-title">${pct >= 70 ? 'Harika iş!' : 'Devam et!'}</div>
          <div class="reinforce-score-pill">${RF_SCORE}/${total} doğru · %${pct}</div>
          <div class="reinforce-complete-msg">
            ${pct >= 70
          ? `${dersAdi} pekiştirmesini başarıyla tamamladın! Bir sonraki gezegene hazırsın.`
          : `${dersAdi} konularında biraz daha pratik yapman iyi olur. Tekrar dene veya öğretmeninden destek iste.`}
          </div>
          <div style="display:flex;gap:.75rem;justify-content:center;flex-wrap:wrap">
            <button class="btn primary" onclick="startReinforce()">Tekrar Pekiştir</button>
            <button class="btn" onclick="restartGame()">Ana Oyuna Dön</button>
            <button class="btn" onclick="goWelcome()">Gezegen Seç</button>
          </div>
        </div>`;
    }

    /* ═══════════════════════════════════════════════════════════════
       TEACHER PANEL
    ═══════════════════════════════════════════════════════════════ */
    function showTeacher() {
      const totalSec = Math.round((Date.now() - START_TIME) / 1000);
      const avgSec = ATT > 0 ? Math.round(totalSec / ATT) : 0;
      const pct = Math.round((SCORE / 20) * 100);

      document.getElementById('tp-meta').textContent = `${PLANET_DATA[LEVEL - 1].name} · Karakter: ${CHAR_DATA[CHAR].name}`;
      document.getElementById('tp-correct').textContent = `${SCORE}/20`;
      document.getElementById('tp-pct').textContent = `%${pct} başarı`;
      document.getElementById('tp-time').textContent = avgSec > 0 ? `${Math.floor(avgSec / 60)}:${String(avgSec % 60).padStart(2, '0')}` : '—';

      // Distribution
      let mathOk = 0, mathTot = 0, trOk = 0, trTot = 0;
      LOG.forEach(l => {
        if (l.type === 'math') { mathTot++; if (l.ok) mathOk++; }
        else { trTot++; if (l.ok) trOk++; }
      });
      const distHtml = [['Matematik', mathOk, mathTot, '#4ade80'], ['Türkçe', trOk, trTot, '#4f8ef7']].map(([lbl, ok, tot, col]) => {
        const p = tot > 0 ? Math.round(ok / tot * 100) : 0;
        return `<div class="bar-row">
      <div class="bar-label">${lbl}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${p}%;background:${col}"></div></div>
      <div class="bar-pct">${ok}/${tot} (%${p})</div>
    </div>`;
      }).join('');
      document.getElementById('tp-distribution').innerHTML = distHtml;

      // Topics
      const cats = {};
      LOG.forEach(l => {
        if (!cats[l.subtopic]) cats[l.subtopic] = { ok: 0, tot: 0 };
        cats[l.subtopic].tot++;
        if (l.ok) cats[l.subtopic].ok++;
      });
      const topicsHtml = Object.entries(cats).map(([sub, c]) => {
        const p = Math.round(c.ok / c.tot * 100);
        const col = p >= 75 ? '#4ade80' : p >= 50 ? '#fbbf24' : '#f87171';
        return `<div class="bar-row">
      <div class="bar-label" style="font-size:.75rem">${sub}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${p}%;background:${col}"></div></div>
      <div class="bar-pct">%${p}</div>
    </div>`;
      }).join('');
      document.getElementById('tp-topics').innerHTML = topicsHtml || '<p style="color:var(--text-muted);font-size:.85rem">Veri yok</p>';

      // Recommendations
      const weakTopics = Object.entries(cats).filter(([, c]) => Math.round(c.ok / c.tot * 100) < 60);
      const recoMap = {
        'Ritmik sayma': ['Ritmik sayma kartları (2\'şer–10\'ar)', 'Müzikli sayma oyunları', 'Dizi tamamlama çalışma yaprağı'],
        'Çarpma': ['Görsel çarpma (dizi modeli)', 'Çarpım tablosu kartları', 'Gerçek hayat problem çözme'],
        '5N1K': ['5N1K soru kartları', 'Metin üzerinde renkli işaretleme', 'Kısa haber analizi oyunu'],
        'Mecaz': ['Deyim-anlam eşleştirme kartları', 'Mecaz/gerçek sınıflandırma oyunu', 'Resimli deyim defteri'],
        'Sesli okuma': ['Günde 1 paragraf sesli okuma', 'Model yazı kopyalama', 'Ortak okuma (öğrenci+öğretmen)'],
        'Yazı': ['İmla çalışma yaprağı', 'Dikte egzersizleri', 'Cümle yeniden yazma'],
      };
      let recoHtml = '';
      weakTopics.forEach(([sub, c]) => {
        const p = Math.round(c.ok / c.tot * 100);
        const key = Object.keys(recoMap).find(k => sub.includes(k)) || null;
        const activities = key ? recoMap[key] : ['Tekrar çalışma önerilir', 'Destekleyici etkinlik planlanmalı'];
        recoHtml += `<div class="reco-item">
      <div class="reco-topic">${sub} — %${p}</div>
      <ul class="reco-list">${activities.map(a => `<li>${a}</li>`).join('')}</ul>
    </div>`;
      });
      document.getElementById('tp-recos').innerHTML = recoHtml || `<div class="all-good">Tebrikler! Tüm konularda güçlü performans. Bir üst gezegene geçmeyi deneyin.</div>`;

      showScreen('s-teacher');
    }

    /* ═══════════════════════════════════════════════════════════════
       MAĞAZA
    ═══════════════════════════════════════════════════════════════ */
    async function loadShopItems() {
      try {
        const { data, error } = await sb.from('shop_items').select('id,name,emoji,description,price,active,item_type,svg_data').order('price');
        if (error) throw error;
        SHOP_ITEMS = (data || []).filter(i => i.active === true || i.active === 'true');
      } catch (e) {
        SHOP_ITEMS = [];
      }
    }

    async function openShop() {
      showScreen('s-shop');
      const xpEl = document.getElementById('shop-xp-display');
      if (xpEl) xpEl.textContent = TOTAL_XP;
      await loadShopItems();
      renderShopGrid();
    }

    const JOKER_TYPE_LABELS = {
      'half':        '50/50 — İki yanlış şıkkı siler',
      'reveal':      'Cevabı Göster',
      'skip':        "XP'siz Atla",
      'retry':       'Ekstra Deneme Hakkı',
      'hint':        'İpucu',
      'sort_helper': 'Sıralama Yardımı',
      'read_skip':   'Okuma Atla',
      'write_skip':  'Yazma Atla',
    };

    function renderShopGrid() {
      const grid = document.getElementById('shop-grid');
      if (!grid) return;
      if (!SHOP_ITEMS.length) {
        grid.innerHTML = '<div class="shop-empty">Mağaza henüz boş — yakında ürünler eklenecek!</div>';
        return;
      }
      grid.innerHTML = SHOP_ITEMS.map(item => {
        const owned = OWNED_ITEMS.includes(item.id);
        const canAfford = TOTAL_XP >= item.price;
        let cls = 'shop-item';
        if (owned) cls += ' owned';
        else if (!canAfford) cls += ' cant-afford';

        // Görsel: SVG varsa göster, yoksa emoji
        const visual = item.svg_data
          ? `<div class="shop-item-svg">${item.svg_data}</div>`
          : `<div class="shop-item-emoji">${item.emoji || '🎁'}</div>`;

        const typeLabel = item.item_type ? `<div style="font-size:.65rem;color:var(--space-purple);font-weight:600;margin-top:.1rem">${JOKER_TYPE_LABELS[item.item_type] || item.item_type}</div>` : '';

        return `<div class="${cls}">
          ${visual}
          <div class="shop-item-name">${item.name}</div>
          ${typeLabel}
          <div class="shop-item-desc">${item.description || ''}</div>
          <div class="shop-item-price">⚡ ${item.price} XP</div>
          ${owned
            ? `<div class="shop-owned-tag">✓ Satın Alındı — Oyunda kullanılabilir</div>`
            : `<button class="shop-buy-btn" ${!canAfford ? 'disabled' : ''} onclick="buyItem(${item.id})">
                ${canAfford ? 'Satın Al' : 'Yetersiz XP'}
               </button>`}
        </div>`;
      }).join('');
      const xpEl = document.getElementById('shop-xp-display');
      if (xpEl) xpEl.textContent = TOTAL_XP;
    }

    function buyItem(itemId) {
      const item = SHOP_ITEMS.find(i => i.id === itemId);
      if (!item) return;
      if (OWNED_ITEMS.includes(itemId)) return;
      if (TOTAL_XP < item.price) { showXpAlert('Yetersiz XP!'); return; }
      TOTAL_XP -= item.price;
      CHAR_XP[CHAR] = TOTAL_XP;
      SESSION_XP -= item.price;
      OWNED_ITEMS.push(itemId);
      saveXPToStorage();
      updateXPBar();
      renderShopGrid();
      showXpAlert(`🎉 "${item.name}" satın alındı!`, true);
    }

    /* ═══════════════════════════════════════════════════════════════
       JOKER SİSTEMİ
    ═══════════════════════════════════════════════════════════════ */
    function initJokers() {
      // Satın alınan ürünlerden joker oluştur (kalıcı ama tek kullanımlık)
      ACTIVE_JOKERS = OWNED_ITEMS
        .map(id => SHOP_ITEMS.find(s => s.id === id))
        .filter(Boolean)
        .map(item => ({ 
          id: item.id, 
          used: false, // Her oturumda kullanılmamış olarak başlar
          item 
        }));
      renderJokerBar();
    }

    function renderJokerBar() {
      const bar = document.getElementById('joker-bar');
      const slots = document.getElementById('joker-slots');
      if (!bar || !slots) return;

      if (!ACTIVE_JOKERS.length) {
        bar.style.display = 'none';
        return;
      }

      bar.style.display = 'flex';
      const typeInfo = {
        'half': { badge: '½', cls: 'joker-type-half', tip: '50/50' },
        'reveal': { badge: '!', cls: 'joker-type-reveal', tip: 'Cevabı Gör' },
        'skip': { badge: '»', cls: 'joker-type-skip', tip: 'XP\u2019siz Atla' },
        'retry': { badge: '↺', cls: 'joker-type-retry', tip: 'Ekstra Hak' },
      };

      slots.innerHTML = ACTIVE_JOKERS.map((j, idx) => {
        const ti = typeInfo[j.item.item_type] || { badge: '★', cls: '', tip: j.item.name };
        const imgHtml = j.item.svg_data
          ? `<div class="joker-btn-svg-wrap">${j.item.svg_data}</div>`
          : `<span style="font-size:1.4rem">${j.item.emoji || '🃏'}</span>`;
        return `<button class="joker-btn ${j.used ? 'used' : ''}"
                  id="jbtn-${idx}"
                  onclick="useJoker(${idx})"
                  title="${j.item.name}: ${ti.tip}"
                  ${j.used ? 'disabled' : ''}>
          ${imgHtml}
          <span class="joker-btn-name">${j.item.name}</span>
          <span class="joker-type-badge ${ti.cls}">${ti.badge}</span>
        </button>`;
      }).join('');
    }

    function useJoker(idx) {
      const j = ACTIVE_JOKERS[idx];
      if (!j || j.used || ANSWERED) return;
      const type = j.item.item_type;

      if (type === 'half') {
        // 50/50 — sadece mcq formatında çalışır
        const btns = document.querySelectorAll('.choice-btn');
        if (!btns.length) { showXpAlert('Bu joker bu soru tipinde kullanılamaz!'); return; }
        const q = LEVEL_QUESTIONS[CUR];
        const correct = safeJSON(q.correct_answer, 0);
        let removed = 0;
        btns.forEach((b, i) => {
          if (i !== correct && !b.disabled && removed < Math.floor(btns.length / 2)) {
            b.disabled = true;
            b.style.opacity = '.25';
            b.style.textDecoration = 'line-through';
            removed++;
          }
        });
        if (removed === 0) { showXpAlert('Bu joker bu soru tipinde kullanılamaz!'); return; }

      } else if (type === 'reveal') {
        // Cevabı göster — mcq için doğru şıkkı vurgula, blank için cevabı yaz
        const q = LEVEL_QUESTIONS[CUR];
        const fmt = q.format || 'mcq';
        if (fmt === 'mcq') {
          const correct = safeJSON(q.correct_answer, 0);
          const btns = document.querySelectorAll('.choice-btn');
          if (btns[correct]) {
            btns[correct].style.background = 'rgba(251,191,36,.2)';
            btns[correct].style.borderColor = 'var(--space-amber)';
            btns[correct].style.color = 'var(--space-amber)';
          }
        } else if (fmt === 'blank') {
          const ans = String(safeJSON(q.correct_answer, '')).split('/')[0];
          const inp = document.getElementById('blank-inp');
          if (inp) { inp.placeholder = `İpucu: ${ans[0]}${'_'.repeat(ans.length - 1)}`; }
        } else if (fmt === 'tf') {
          const correct = safeJSON(q.correct_answer, true);
          document.querySelectorAll('.tf-btn').forEach(b => {
            const isCorr = (b.textContent.includes('Doğru') && correct) || (b.textContent.includes('Yanlış') && !correct);
            if (isCorr) { b.style.borderColor = 'var(--space-amber)'; b.style.color = 'var(--space-amber)'; }
          });
        } else {
          showXpAlert('Bu joker bu soru tipinde kullanılamaz!'); return;
        }

      } else if (type === 'skip') {
        // XP kaybı olmadan atla
        const q = LEVEL_QUESTIONS[CUR];
        const elapsed = Math.round((Date.now() - Q_START) / 1000);
        ATT++;
        LOG.push({ subtopic: q.subtopic || q.type, type: q.type, ok: false, elapsed });
        ANSWERED = true;
        Q_RETRY = false; Q_FIRST_WRONG = false;
        updateTopBar();
        // Feedback göster, devam et butonu
        const fb = document.getElementById('fb');
        if (fb) { fb.className = 'feedback info show'; fb.innerHTML = `<span>🃏 Joker kullanıldı — soru atlandı.</span>`; }
        const nb = document.getElementById('btn-next');
        if (nb) { nb.classList.add('show'); nb.textContent = 'Devam Et →'; nb.style.cssText = ''; nb.onclick = nextQuestion; }

      } else if (type === 'retry') {
        // Ekstra hak — Q_FIRST_WRONG sıfırla, retry flag temizle
        if (!Q_FIRST_WRONG && !Q_RETRY) { showXpAlert('Şu an kullanmana gerek yok — henüz yanlış cevap vermedin!'); return; }
        Q_FIRST_WRONG = false;
        Q_RETRY = false;
        ANSWERED = false;
        showXpAlert('🃏 Ekstra hak kullanıldı!', true);
        renderQuestion();

      } else if (type === 'hint') {
        // İpucu — subtopic/soru metnine göre yönlendirici ipucu
        const q = LEVEL_QUESTIONS[CUR];
        const subtopic = (q.subtopic || '').toLowerCase();
        const qtext = (q.question_text || '').toLowerCase();
        let hint = '';

        // Matematiksel işlem tespiti
        if (subtopic.includes('çıkar') || qtext.includes('çıkar') || qtext.includes('eksi') || qtext.includes('farkı')) {
          hint = '🔍 İpucu: Büyük sayıdan küçük sayıyı çıkar.';
        } else if (subtopic.includes('topla') || qtext.includes('topla') || qtext.includes('artı') || qtext.includes('toplam')) {
          hint = '🔍 İpucu: Sayıları bir araya getir ve topla.';
        } else if (subtopic.includes('çarp') || qtext.includes('çarp') || qtext.includes('katı')) {
          hint = '🔍 İpucu: Sayıyı o kadar kez kendisiyle topla.';
        } else if (subtopic.includes('böl') || qtext.includes('böl') || qtext.includes('÷')) {
          hint = '🔍 İpucu: Sayıyı eşit parçalara ayır.';
        } else if (subtopic.includes('ritmik') || qtext.includes('→') || qtext.includes('dizi')) {
          hint = '🔍 İpucu: Sayılar arasındaki farka bak — her adımda ne kadar artıyor?';
        } else if (subtopic.includes('sırala') || q.format === 'sort') {
          hint = '🔍 İpucu: Önce en küçük ya da en büyük olanı bul, oradan devam et.';
        } else if (subtopic.includes('okuma') || q.format === 'read') {
          hint = '🔍 İpucu: Metni bir kez daha dikkatlice oku.';
        } else if (subtopic.includes('anlama') || subtopic.includes('parça')) {
          hint = '🔍 İpucu: Metinde bu soruyla ilgili cümleyi bul ve altını çiz.';
        } else if (subtopic.includes('eşleştir') || q.format === 'match') {
          hint = '🔍 İpucu: Birini kesin biliyorsan önce onu eşleştir, geri kalanlar kolaylaşır.';
        } else if (q.type === 'math') {
          hint = '🔍 İpucu: İşlemin türüne bak — hangi işlemi yapman gerekiyor?';
        } else {
          hint = '🔍 İpucu: Soruyu baştan oku ve anahtar kelimelere odaklan.';
        }

        showXpAlert(hint, true);
      }

      // Jokeri kullanıldı olarak işaretle ve envanterden çıkar
      j.used = true;
      OWNED_ITEMS = OWNED_ITEMS.filter(id => id !== j.item.id);
      saveXPToStorage();
      renderJokerBar();
    }

    function showXpAlert(msg, ok = false) {
      const toast = document.getElementById('xp-toast');
      if (!toast) return;
      toast.textContent = msg;
      toast.style.borderColor = ok ? 'var(--space-green)' : 'var(--space-red)';
      toast.style.color = ok ? 'var(--space-green)' : 'var(--space-red)';
      toast.classList.add('show');
      clearTimeout(xpToastTimer);
      xpToastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
    }

    /* ═══════════════════════════════════════════════════════════════
       PDF İNDİRME
    ═══════════════════════════════════════════════════════════════ */
    async function downloadSectionPDF(sectionId, encodedSectionName, planetLevel, btn) {
      const sectionName = decodeURIComponent(encodedSectionName);
      btn.disabled = true;
      btn.textContent = '⏳ Hazırlanıyor...';

      try {
        console.log('PDF generation started:', { sectionId, sectionName, planetLevel });
        
        const { data: questions, error } = await sb
          .from('questions')
          .select('*')
          .eq('section_id', sectionId)
          .order('order_index', { ascending: true })
          .order('id');
        if (error) throw error;
        
        console.log('Questions fetched:', questions?.length || 0);
        
        if (!questions || questions.length === 0) {
          alert('Bu bölümde henüz soru yok.');
          btn.disabled = false;
          btn.innerHTML = '📄 PDF İndir (Yazdır)';
          return;
        }

        const planetName = PLANET_DATA[planetLevel - 1]?.name || 'Gezegen ' + planetLevel;
        console.log('Planet name:', planetName);
        
        // ── Yeni pencerede HTML göster ve yazdır ──────────────────────────────
        let questionsHtml = '';
        questions.forEach((q, qi) => {
          const opts = (() => { try { return JSON.parse(q.options || '[]'); } catch { return []; } })();
          const fmt = q.format || 'mcq';
          
          questionsHtml += `
            <div style="margin-bottom:30px;padding:20px;background:#f8f9fa;border:2px solid #dee2e6;border-radius:8px;page-break-inside:avoid">
              <div style="background:#007bff;color:white;padding:8px 12px;border-radius:4px;display:inline-block;margin-bottom:15px;font-weight:bold">
                Soru ${qi + 1}
              </div>
              <div style="background:#e9ecef;padding:8px 12px;border-radius:4px;margin-bottom:15px;font-size:14px;color:#6c757d">
                ${q.type === 'math' ? '🧮 Matematik' : '📖 Türkçe'} | ${q.subtopic || fmt}
              </div>
              <h3 style="color:#212529;margin:0 0 15px 0;font-size:18px;line-height:1.4">${q.question_text}</h3>
          `;
          
          if (q.scene) {
            questionsHtml += `<div style="background:#fff3cd;border:1px solid #ffeaa7;padding:12px;border-radius:4px;margin-bottom:15px;font-style:italic;color:#856404">💬 ${q.scene}</div>`;
          }
          
          if (fmt === 'mcq' && opts.length) {
            const letters = ['A', 'B', 'C', 'D', 'E'];
            questionsHtml += '<div style="display:grid;gap:10px">';
            opts.forEach((opt, oi) => {
              questionsHtml += `
                <div style="background:#ffffff;border:2px solid #ced4da;padding:12px;border-radius:6px;display:flex;align-items:center">
                  <span style="background:#6c757d;color:white;padding:4px 8px;border-radius:50%;margin-right:12px;font-weight:bold;font-size:12px">${letters[oi]}</span>
                  <span style="color:#495057">${opt}</span>
                </div>
              `;
            });
            questionsHtml += '</div>';
          } else if (fmt === 'tf') {
            questionsHtml += `
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:15px">
                <div style="background:#d4edda;border:2px solid #28a745;padding:15px;border-radius:6px;text-align:center;font-weight:bold;color:#155724">✓ Doğru</div>
                <div style="background:#f8d7da;border:2px solid #dc3545;padding:15px;border-radius:6px;text-align:center;font-weight:bold;color:#721c24">✗ Yanlış</div>
              </div>
            `;
          } else if (fmt === 'blank') {
            if (q.template_text) {
              questionsHtml += `<div style="background:#e2e3e5;border:2px dashed #6c757d;padding:15px;border-radius:4px;margin-bottom:15px;font-style:italic;color:#495057">${q.template_text}</div>`;
            }
            questionsHtml += `<div style="border:2px solid #007bff;padding:12px;border-radius:4px;background:white"><span style="color:#6c757d;font-style:italic">Cevap: _______________</span></div>`;
          } else if (fmt === 'read' || fmt === 'write') {
            questionsHtml += `
              <div style="background:#d1ecf1;border:2px solid #17a2b8;padding:15px;border-radius:4px;margin-bottom:15px">${q.template_text || q.question_text}</div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:15px">
                <div style="background:#d4edda;border:2px solid #28a745;padding:12px;border-radius:6px;text-align:center;font-weight:bold;color:#155724">${fmt === 'read' ? '📖 Okudum!' : '✏️ Yazdım!'}</div>
                <div style="background:#f8d7da;border:2px solid #dc3545;padding:12px;border-radius:6px;text-align:center;font-weight:bold;color:#721c24">😟 Zorlandım</div>
              </div>
            `;
          }
          
          questionsHtml += '</div>';
        });

        const fullHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <title>${planetName} - ${sectionName}</title>
            <style>
              @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap');
              body { 
                font-family: 'Nunito', sans-serif; 
                margin: 0; 
                padding: 20px; 
                background: #ffffff; 
                color: #212529;
                line-height: 1.6;
              }
              .header { 
                text-align: center; 
                margin-bottom: 40px; 
                padding: 30px; 
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                color: white;
                border-radius: 12px;
              }
              .header h1 { margin: 0 0 10px 0; font-size: 32px; font-weight: 800; }
              .header h2 { margin: 0 0 10px 0; font-size: 24px; font-weight: 600; }
              .header p { margin: 0; font-size: 16px; opacity: 0.9; }
              @media print {
                body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                .header { background: #667eea !important; -webkit-print-color-adjust: exact; }
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>🚀 Uzay Macerası</h1>
              <h2>${planetName} - ${sectionName}</h2>
              <p>${questions.length} soru · ${new Date().toLocaleDateString('tr-TR')}</p>
            </div>
            ${questionsHtml}
          </body>
          </html>
        `;

        console.log('HTML ready for print');
        
        // Blob URL ile aç — popup blocker'dan etkilenmez
        const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
          document.body.removeChild(link);
          URL.revokeObjectURL(blobUrl);
        }, 5000);
        console.log('PDF opened via Blob URL');

      } catch (e) {
        console.error('PDF error:', e);
        alert('PDF oluşturulamadı: ' + e.message);
      } finally {
        btn.disabled = false;
        btn.innerHTML = '📄 PDF İndir (Yazdır)';
      }
    }

    /* ═══════════════════════════════════════════════════════════════
   HATA BİLDİRME
═══════════════════════════════════════════════════════════════ */
    let FLAGGED_QUESTIONS = []; // { qId, idx, source, qText, reported: false }

    // Oyun sırasında "Hata Bildir" butonuna basılınca çağrılır
    function flagQuestion(qId, idx, source) {
      const btn = document.getElementById(`rpt-btn-${source === 'reinforce' ? 'rf-' : ''}${idx}`);
      // Zaten eklenmiş mi?
      const exists = FLAGGED_QUESTIONS.find(f => f.qId === qId && f.source === source);
      if (exists) {
        if (btn) { btn.textContent = '⚑ Eklendi ✓'; btn.classList.add('sent'); }
        return;
      }
      // Soru metnini al
      const q = source === 'reinforce'
        ? RF_QUESTIONS[idx]
        : LEVEL_QUESTIONS[idx];
      const qText = q ? (q.question_text || '').substring(0, 80) : '';
      FLAGGED_QUESTIONS.push({ qId, idx, source, qText, reported: false });
      if (btn) { btn.textContent = '⚑ Eklendi ✓'; btn.classList.add('sent'); }
      // Kutuyu güncelle (sıralama ekranındaysa)
      if (document.getElementById('end-bug-box')) renderEndBugBox();
    }

    const BUG_REASONS = [
      { val: 'game_bug', label: 'Oyun bozuldu' },
      { val: 'wrong_q', label: 'Soru hatalı' },
      { val: 'wrong_ans', label: 'Cevap hatalı' },
      { val: 'unclear', label: 'Soruyu anlamadım' },
      { val: 'other', label: 'Diğer' },
    ];

    function renderEndBugBox() {
      const box = document.getElementById('end-bug-box');
      if (!box) return;

      if (FLAGGED_QUESTIONS.length === 0) {
        box.style.display = 'none';
        return;
      }

      box.style.display = 'block';
      const items = FLAGGED_QUESTIONS.map((f, fi) => {
        const sent = f.reported;
        const radioName = `bug-reason-${fi}`;
        const radios = BUG_REASONS.map(r =>
          `<label class="end-bug-opt">
            <input type="radio" name="${radioName}" value="${r.val}"
              onchange="onBugReasonChange(${fi}, '${r.val}')">
            ${r.label}
          </label>`
        ).join('');

        return `<div class="end-bug-item" id="bug-item-${fi}">
          <div class="end-bug-q">
            <strong>#${f.idx + 1}</strong> — ${f.source === 'reinforce' ? '🔥 Pekiştirme · ' : ''}${escHtml(f.qText)}${f.qText.length >= 80 ? '…' : ''}
          </div>
          ${sent
            ? `<div style="font-size:.8rem;color:var(--space-green);font-weight:600">✓ Gönderildi — Teşekkürler!</div>`
            : `<div class="end-bug-options">${radios}</div>
               <input class="end-bug-other-inp" id="bug-other-${fi}" placeholder="Hatayı açıkla..." maxlength="200">
               <button class="end-bug-send" id="bug-send-${fi}" onclick="sendBugReport(${fi})">Gönder</button>`}
        </div>`;
      }).join('');

      box.innerHTML = `
        <div class="end-bug-wrap">
          <div class="end-bug-title">⚑ Bildirdiğiniz Hatalar</div>
          ${items}
        </div>`;
    }

    function onBugReasonChange(fi, val) {
      const otherInp = document.getElementById(`bug-other-${fi}`);
      if (otherInp) otherInp.style.display = val === 'other' ? 'block' : 'none';
    }

    async function sendBugReport(fi) {
      const f = FLAGGED_QUESTIONS[fi];
      if (!f || f.reported) return;

      const radioName = `bug-reason-${fi}`;
      const checked = document.querySelector(`input[name="${radioName}"]:checked`);
      if (!checked) {
        // Seçim yapılmadı — salla
        const opts = document.querySelectorAll(`input[name="${radioName}"]`);
        opts.forEach(o => { o.parentNode.style.color = 'var(--space-red)'; });
        setTimeout(() => opts.forEach(o => { o.parentNode.style.color = ''; }), 1200);
        return;
      }

      const reason = checked.value;
      const otherText = reason === 'other'
        ? (document.getElementById(`bug-other-${fi}`)?.value.trim() || '')
        : '';

      const btn = document.getElementById(`bug-send-${fi}`);
      if (btn) { btn.textContent = 'Gönderiliyor...'; btn.disabled = true; }

      try {
        await sb.from('bug_reports').insert([{
          question_id: f.qId || null,
          question_text: f.qText || null,
          question_idx: f.idx,
          source: f.source,
          planet_level: LEVEL,
          player_name: PLAYER_NAME || null,
          reason: reason,
          other_text: otherText || null,
          reported_at: new Date().toISOString(),
        }]);
        f.reported = true;
        renderEndBugBox();
      } catch (e) {
        if (btn) { btn.textContent = 'Hata! Tekrar dene'; btn.disabled = false; }
      }
    }

    function escHtml(str) {
      return String(str || '')
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    /* ═══════════════════════════════════════════════════════════════
       SIRALAMА TABLOSU
    ═══════════════════════════════════════════════════════════════ */
    let LB_FILTER = 'all'; // 'all' | 'week' | 'today'

    function setLbFilter(f) {
      LB_FILTER = f;
      document.querySelectorAll('.lb-filter-btn').forEach(b => b.classList.remove('active'));
      const btn = document.getElementById(`lb-btn-${f}`);
      if (btn) btn.classList.add('active');
      renderLeaderboard();
    }

    async function openLeaderboard() {
      // Gezegen rozeti
      const planet = PLANET_DATA[LEVEL - 1];
      const svgEl = document.getElementById('lb-planet-svg');
      const nameEl = document.getElementById('lb-planet-name');
      if (svgEl && planet) svgEl.innerHTML = planet.svg;
      if (nameEl && planet) nameEl.textContent = planet.name;

      document.getElementById('lb-loading').style.display = 'block';
      document.getElementById('lb-table').style.display = 'none';
      document.getElementById('lb-empty').style.display = 'none';
      showScreen('s-leaderboard');
      await loadLeaderboard();
    }

    async function loadLeaderboard() {
      try {
        const { data, error } = await sb
          .from('game_results')
          .select('player_name,character,score,score_pct,duration_sec,wrong_count,played_at')
          .eq('planet_level', LEVEL)
          .order('score_pct', { ascending: false })
          .order('duration_sec', { ascending: true })
          .limit(200);
        if (error) throw error;
        window._lbData = data || [];
        renderLeaderboard();
      } catch (e) {
        document.getElementById('lb-loading').style.display = 'none';
        document.getElementById('lb-empty').textContent = 'Veriler yüklenemedi: ' + e.message;
        document.getElementById('lb-empty').style.display = 'block';
      }
    }

    function renderLeaderboard() {
      const allData = window._lbData || [];
      const now = new Date();

      // Filtrele
      const filtered = allData.filter(r => {
        if (LB_FILTER === 'all') return true;
        const d = new Date(r.played_at);
        if (LB_FILTER === 'today') {
          return d.toDateString() === now.toDateString();
        }
        if (LB_FILTER === 'week') {
          const diff = (now - d) / (1000 * 60 * 60 * 24);
          return diff <= 7;
        }
        return true;
      });

      // Oyuncu başına en iyi skoru al (aynı oyuncu birden fazla oynamış olabilir)
      const best = {};
      filtered.forEach(r => {
        const key = r.player_name || '?';
        if (!best[key] ||
          r.score_pct > best[key].score_pct ||
          (r.score_pct === best[key].score_pct && (r.duration_sec || 9999) < (best[key].duration_sec || 9999))) {
          best[key] = r;
        }
      });

      // Sırala: puan DESC, süre ASC
      const sorted = Object.values(best).sort((a, b) => {
        if (b.score_pct !== a.score_pct) return b.score_pct - a.score_pct;
        return (a.duration_sec || 9999) - (b.duration_sec || 9999);
      });

      document.getElementById('lb-loading').style.display = 'none';

      if (sorted.length === 0) {
        document.getElementById('lb-table').style.display = 'none';
        document.getElementById('lb-empty').style.display = 'block';
        document.getElementById('lb-empty').textContent =
          LB_FILTER === 'today' ? 'Bugün henüz oynanmamış.' :
            LB_FILTER === 'week' ? 'Bu hafta henüz oynanmamış.' :
              'Henüz bu bölüm için kayıt yok. İlk sen ol!';
        document.getElementById('lb-my-rank-banner').style.display = 'none';
        return;
      }

      document.getElementById('lb-table').style.display = 'table';
      document.getElementById('lb-empty').style.display = 'none';

      const rankEmojis = ['🥇', '🥈', '🥉'];
      const rankClass = ['gold', 'silver', 'bronze'];

      let myRank = -1;
      // İsim sansürleme fonksiyonu
      function sanitizePlayerName(name, isMe) {
        if (!name) return '?';
        if (isMe) return name; // Kendi adını tam göster
        
        // Başka oyuncuların adlarını sansürle
        if (name.length <= 2) return name[0] + '*';
        if (name.length === 3) return name[0] + '*' + name[2];
        
        // 4+ harf için: ilk harf + ortası yıldız + son harf
        const first = name[0];
        const last = name[name.length - 1];
        const middle = '*'.repeat(name.length - 2);
        return first + middle + last;
      }

      const rows = sorted.map((r, i) => {
        const isMe = PLAYER_NAME && r.player_name === PLAYER_NAME;
        if (isMe) myRank = i + 1;

        const rank = i < 3
          ? `<span class="lb-rank ${rankClass[i]}">${rankEmojis[i]}</span>`
          : `<span class="lb-rank other">${i + 1}</span>`;

        const dur = r.duration_sec
          ? `${Math.floor(r.duration_sec / 60)}:${String(r.duration_sec % 60).padStart(2, '0')}`
          : '—';

        const scoreCol = r.score_pct >= 75 ? 'var(--space-green)'
          : r.score_pct >= 50 ? 'var(--space-amber)'
            : 'var(--space-red)';

        const dateStr = r.played_at
          ? new Date(r.played_at).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' })
          : '—';

        // Sansürlü isim
        const displayName = sanitizePlayerName(r.player_name, isMe);

        return `<tr class="${isMe ? 'lb-me' : ''}">
          <td>${rank}</td>
          <td>
            <span class="lb-player-name">${displayName}</span>
            <span class="lb-char-tag">${r.character || ''}</span>
          </td>
          <td><span class="lb-score-pill" style="color:${scoreCol}">%${r.score_pct}</span></td>
          <td><span class="lb-time-tag">${dur}</span></td>
          <td style="font-size:.72rem;color:var(--text-muted)">${dateStr}</td>
        </tr>`;
      }).join('');

      document.getElementById('lb-tbody').innerHTML = rows;

      // Benim sıramı göster
      const banner = document.getElementById('lb-my-rank-banner');
      if (myRank > 0 && PLAYER_NAME) {
        banner.style.display = 'block';
        const me = sorted[myRank - 1];
        const dur = me.duration_sec
          ? `${Math.floor(me.duration_sec / 60)}:${String(me.duration_sec % 60).padStart(2, '0')}`
          : '—';
        banner.innerHTML = `Senin sıran: <strong>#${myRank}</strong> · %${me.score_pct} · ${dur}`;
      } else if (PLAYER_NAME) {
        banner.style.display = 'block';
        banner.innerHTML = 'Bu bölümü tamamladıktan sonra burada görüneceksin!';
      } else {
        banner.style.display = 'none';
      }

      const sub = document.getElementById('lb-sub');
      if (sub) sub.textContent = `${sorted.length} oyuncu · ${PLANET_DATA[LEVEL - 1]?.name || ''} en iyi sonuçlar`;
    }

    /* ═══════════════════════════════════════════════════════════════
       NAVIGATION
    ═══════════════════════════════════════════════════════════════ */
    function showScreen(id) {
      if (id === 's-level-test') {
        // Uyarı kartını her seferinde sıfırla
        const warning = document.getElementById('level-test-warning');
        const main    = document.getElementById('level-test-main');
        if (warning) warning.style.display = '';
        if (main)    main.style.display    = 'none';
        // Devam butonu metnini ayarla
        const savedProg = localStorage.getItem(ltProgressKey());
        const startBtn  = document.getElementById('level-test-start-btn');
        const subText   = document.querySelector('#s-level-test .name-card-sub');
        if (savedProg && startBtn) {
          const p = JSON.parse(savedProg);
          const soruNo = (p.current || 0) + 1;
          startBtn.textContent = `▶ Kaldığın Yerden Devam Et (Soru ${soruNo})`;
          if (subText) subText.textContent = `${p.current || 0} soruyu tamamladın — kaldığın yerden devam edebilirsin!`;
        } else if (startBtn) {
          startBtn.textContent = 'Teste Başla';
          if (subText) subText.textContent = 'Uygun bölümden başlaman için seviyeni ölçelim.';
        }
        // progress bar sıfırla
        const progEl2 = document.getElementById('lt-prog');
        const stepEl2 = document.getElementById('lt-step-lbl');
        if (progEl2) progEl2.style.width = '0%';
        if (stepEl2) stepEl2.textContent = 'Soru 1/?';
      }
      document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
      document.getElementById(id).classList.add('active');
    }
    function goWelcome() { syncCharXP(); updateXPBar(); renderCharLevels(); showScreen('s-welcome'); }
    function restartGame() {
      CUR = 0; SCORE = 0; ATT = 0; LOG = []; ANSWERED = false;
      SESSION_XP = 0; Q_RETRY = false; Q_FIRST_WRONG = false; WRONG_COUNT = 0;
      syncCharXP();
      // Sıralı tutuyoruz — shuffle yok
      START_TIME = Date.now();
      showScreen('s-game');
      renderQuestion();
    }

    /* ═══════════════════════════════════════════════════════════════
       ILLUSTRATION SVGs
    ═══════════════════════════════════════════════════════════════ */
    function getIllSvg(type) {
      const ills = {
        rocket: `<rect width="680" height="88" rx="0" fill="#07091a"/>
      <circle cx="60" cy="44" r="18" fill="#0f2a5e" opacity=".8"/>
      <circle cx="60" cy="44" r="8"  fill="#1e5fc2" opacity=".6"/>
      <polygon points="340,6 360,38 320,38" fill="#1e5fc2"/>
      <rect x="320" y="36" width="40" height="32" rx="5" fill="#4f8ef7"/>
      <rect x="326" y="42" width="13" height="11" rx="3" fill="#1a3a6b"/>
      <rect x="344" y="42" width="9"  height="11" rx="3" fill="#1a3a6b"/>
      <polygon points="310,60 320,42 320,70" fill="#1e5fc2"/>
      <polygon points="370,60 360,42 360,70" fill="#1e5fc2"/>
      <ellipse cx="340" cy="70" rx="8" ry="4" fill="#f87171" opacity=".7"/>
      <circle cx="200" cy="25" r="3" fill="#fbbf24" opacity=".6"/>
      <circle cx="500" cy="20" r="2" fill="#a78bfa" opacity=".6"/>
      <circle cx="150" cy="55" r="2" fill="#4f8ef7" opacity=".4"/>
      <circle cx="580" cy="40" r="3" fill="#2dd4bf" opacity=".4"/>`,
        star: `<rect width="680" height="88" rx="0" fill="#07091a"/>
      <polygon points="340,10 351,36 380,36 358,53 366,78 340,62 314,78 322,53 300,36 329,36" fill="#fbbf24"/>
      <circle cx="180" cy="22" r="3" fill="#93c5fd" opacity=".6"/>
      <circle cx="490" cy="18" r="2" fill="#93c5fd" opacity=".5"/>
      <circle cx="140" cy="55" r="2" fill="#a78bfa" opacity=".4"/>
      <circle cx="560" cy="50" r="3" fill="#4ade80" opacity=".4"/>`,
        moon: `<rect width="680" height="88" rx="0" fill="#0d1528"/>
      <circle cx="340" cy="130" r="80" fill="#2a3560"/>
      <circle cx="310" cy="55"  r="7"  fill="#1a2545"/>
      <circle cx="358" cy="46"  r="5"  fill="#1a2545"/>
      <circle cx="335" cy="66"  r="4"  fill="#1a2545"/>
      <circle cx="370" cy="62"  r="6"  fill="#1a2545"/>
      <circle cx="200" cy="20"  r="2"  fill="#4f8ef7" opacity=".5"/>
      <circle cx="520" cy="16"  r="3"  fill="#93c5fd" opacity=".4"/>`,
        mars: `<rect width="680" height="88" rx="0" fill="#1a0700"/>
      <ellipse cx="340" cy="120" rx="120" ry="70" fill="#c53030"/>
      <ellipse cx="340" cy="120" rx="100" ry="52" fill="#992020" opacity=".5"/>
      <circle cx="295" cy="58" r="7" fill="#7a1515"/>
      <circle cx="355" cy="50" r="5" fill="#7a1515"/>
      <circle cx="385" cy="62" r="9" fill="#7a1515"/>
      <circle cx="160" cy="20" r="3" fill="#f87171" opacity=".5"/>
      <circle cx="530" cy="15" r="3" fill="#fca5a5" opacity=".4"/>`,
        book: `<rect width="680" height="88" rx="0" fill="#0c0a1e"/>
      <rect x="297" y="10" width="46" height="66" rx="4" fill="#3730a3"/>
      <rect x="341" y="10" width="46" height="66" rx="4" fill="#4f46e5"/>
      <rect x="303" y="20" width="32" height="4" rx="2" fill="#818cf8"/>
      <rect x="303" y="30" width="28" height="4" rx="2" fill="#818cf8"/>
      <rect x="303" y="40" width="30" height="4" rx="2" fill="#818cf8"/>
      <rect x="347" y="20" width="32" height="4" rx="2" fill="#c7d2fe"/>
      <rect x="347" y="30" width="26" height="4" rx="2" fill="#c7d2fe"/>
      <rect x="347" y="40" width="28" height="4" rx="2" fill="#c7d2fe"/>
      <circle cx="160" cy="30" r="3" fill="#a78bfa" opacity=".5"/>
      <circle cx="520" cy="20" r="2" fill="#818cf8" opacity=".5"/>`,
        jupiter: `<rect width="680" height="88" rx="0" fill="#1a0f00"/>
      <circle cx="340" cy="44" r="36" fill="#d97706"/>
      <ellipse cx="340" cy="44" rx="36" ry="11" fill="#b45309" opacity=".5"/>
      <ellipse cx="340" cy="34" rx="30" ry="7"  fill="#b45309" opacity=".3"/>
      <ellipse cx="328" cy="48" rx="10" ry="5"  fill="#92400e" opacity=".5"/>
      <circle cx="190" cy="18" r="3" fill="#fbbf24" opacity=".5"/>
      <circle cx="510" cy="15" r="2" fill="#fcd34d" opacity=".4"/>`,
        galaxy: `<rect width="680" height="88" rx="0" fill="#07091a"/>
      <ellipse cx="340" cy="44" rx="90" ry="22" fill="#4f46e5" opacity=".3"/>
      <ellipse cx="340" cy="44" rx="55" ry="12" fill="#7c3aed" opacity=".4"/>
      <circle cx="340" cy="44" r="10" fill="#6d28d9"/>
      <circle cx="390" cy="30" r="3" fill="#c4b5fd" opacity=".7"/>
      <circle cx="295" cy="36" r="3" fill="#c4b5fd" opacity=".6"/>
      <circle cx="410" cy="52" r="2" fill="#ddd6fe" opacity=".6"/>
      <circle cx="272" cy="56" r="2" fill="#ddd6fe" opacity=".5"/>
      <circle cx="150" cy="22" r="2" fill="#a78bfa" opacity=".5"/>
      <circle cx="545" cy="18" r="3" fill="#7c3aed" opacity=".4"/>
      <circle cx="80"  cy="55" r="2" fill="#ddd6fe" opacity=".3"/>
      <circle cx="615" cy="50" r="2" fill="#a78bfa" opacity=".4"/>`
      };
      return ills[type] || ills.rocket;
    }

    /* ═══════════════════════════════════════════════════════════════
       HELPERS
    ═══════════════════════════════════════════════════════════════ */
    function shuffle(arr) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    }

    function safeJSON(val, def) {
      if (val === null || val === undefined) return def;
      if (typeof val === 'object') return val;
      try { return JSON.parse(val); } catch { return def; }
    }

    /* ═══════════════════════════════════════════════════════════════
       STARFIELD
    ═══════════════════════════════════════════════════════════════ */
    function drawStars() {
      const canvas = document.getElementById('stars-canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      for (let i = 0; i < 200; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const r = Math.random() * 1.4;
        const a = Math.random() * .7 + .1;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${a})`;
        ctx.fill();
      }
      window.addEventListener('resize', drawStars);
    }