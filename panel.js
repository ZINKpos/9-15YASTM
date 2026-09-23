    /* ═══════════════════════════════════════════════════
       STATE
    ═══════════════════════════════════════════════════ */
    let sb = null;
    let allQuestions = [];
    let filteredQuestions = [];
    let editingId = null;
    let levelTestQuestions = [];
    let editingLevelTestId = null;
    const PAGE_SIZE = 20;
    let currentPage = 0;

    /* ═══════════════════════════════════════════════════
       CONNECT
    ═══════════════════════════════════════════════════ */
    const SUPABASE_URL = 'https://hzcgcuctztofutcbwodj.supabase.co';
    const SUPABASE_KEY = 'sb_publishable_vnHJewFsydQNsaTuLE3p1A_-lu1_hUY';

    /** JWT içindeki metadata — Supabase SQL ile ayarlanır (bkz. supabase-auth-admin-setup.sql) */
    function isAdminUser(user) {
      if (!user) return false;
      if (user.app_metadata && user.app_metadata.admin === true) return true;
      if (user.user_metadata && user.user_metadata.role === 'admin') return true;
      return false;
    }

    async function submitAdminLogin() {
      const email = (document.getElementById('login-email')?.value || '').trim();
      const password = document.getElementById('login-pass')?.value || '';
      const errEl = document.getElementById('login-err');
      if (!email || !password) {
        if (errEl) {
          errEl.textContent = 'E-posta ve şifre gerekli.';
          errEl.style.display = 'block';
        }
        return;
      }
      if (!sb) {
        if (errEl) {
          errEl.textContent = 'İstemci hazır değil. Sayfayı yenile.';
          errEl.style.display = 'block';
        }
        return;
      }
      const { data, error } = await sb.auth.signInWithPassword({ email, password });
      if (error) {
        if (errEl) {
          errEl.textContent = error.message || 'Giriş başarısız.';
          errEl.style.display = 'block';
        }
        return;
      }
      if (!isAdminUser(data.user)) {
        await sb.auth.signOut();
        if (errEl) {
          errEl.textContent = 'Bu hesap yönetici yetkisine sahip değil. Supabase’de admin bayrağını ayarla.';
          errEl.style.display = 'block';
        }
        return;
      }
      if (errEl) errEl.style.display = 'none';
      document.getElementById('login-gate').style.display = 'none';
      document.getElementById('admin-layout').style.display = 'flex';
      await connectAdmin();
    }

    async function adminLogout() {
      if (sb) await sb.auth.signOut();
      location.reload();
    }

    window.addEventListener('DOMContentLoaded', async () => {
      localStorage.removeItem('uzay_admin_session_v1');
      try {
        sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        const { data: { session } } = await sb.auth.getSession();
        if (session?.user && isAdminUser(session.user)) {
          document.getElementById('login-gate').style.display = 'none';
          document.getElementById('admin-layout').style.display = 'flex';
          await connectAdmin();
        }
      } catch (e) {
        const errEl = document.getElementById('login-err');
        if (errEl) {
          errEl.textContent = 'Başlatma hatası: ' + e.message;
          errEl.style.display = 'block';
        }
      }
    });

    async function connectAdmin() {
      try {
        if (!sb) return;
        const { error } = await sb.from('questions').select('id').limit(1);
        if (error) throw error;
        const domain = SUPABASE_URL.match(/https:\/\/([^.]+)/)?.[1] || '—';
        document.getElementById('sb-conn-info').textContent = `🟢 ${domain}`;
        loadQuestions();
        loadRfQuestions();
        loadShopItems();
        loadAllSections(); // arkaplanda yükle (soru formu için)
        loadLevelTestQuestions(); // seviye tespit sorularını yükle
        showPage('questions');
        renderAddForm();
        renderRfAddForm();
        renderShopForm();
      } catch (e) {
        toast('Bağlantı hatası: ' + e.message, 'fail');
      }
    }

    /* ═══════════════════════════════════════════════════
       NAVIGATION
    ═══════════════════════════════════════════════════ */
    function showPage(name) {
      document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
      document.getElementById(`page-${name}`).style.display = 'block';
      const navEl = document.getElementById(`nav-${name}`);
      if (navEl) navEl.classList.add('active');
      if (name === 'stats') renderStats();
      if (name === 'reinforce') { if (!allRfQuestions.length) loadRfQuestions(); }
      if (name === 'add-reinforce') renderRfAddForm();
      if (name === 'shop') { if (!allShopItems.length) loadShopItems(); else renderShopTable(); }
      if (name === 'add-shop') renderShopForm();
      if (name === 'reports') { if (!allReports.length) loadReports(); else renderReportsTable(); }
      if (name === 'bugs') { if (!allBugReports.length) loadBugReports(); else renderBugTable(); }
      if (name === 'sections') { loadAllSections(); }
      // Reset modal save btn to default for regular questions
      const modalSaveBtn = document.getElementById('modal-save-btn');
      if (modalSaveBtn) modalSaveBtn.onclick = saveQuestion;
    }

    /* ═══════════════════════════════════════════════════
       LOAD & DISPLAY QUESTIONS
    ═══════════════════════════════════════════════════ */
    async function loadQuestions() {
      document.getElementById('q-tbody').innerHTML = `<tr><td colspan="7"><div class="loading-row"><div class="spinner"></div> Yükleniyor...</div></td></tr>`;
      const { data, error } = await sb.from('questions').select('*').order('order_index', { ascending: true }).order('id');
      if (error) { toast('Yükleme hatası: ' + error.message, 'fail'); return; }
      allQuestions = data || [];
      updateStats();
      applyFilters();
    }

    function updateStats() {
      const total = allQuestions.length;
      document.getElementById('st-total').textContent = total;
      document.getElementById('st-lv1').textContent = allQuestions.filter(q => q.level == 1).length;
      document.getElementById('st-lv2').textContent = allQuestions.filter(q => q.level == 2).length;
      document.getElementById('st-lv3').textContent = allQuestions.filter(q => q.level == 3).length;
      document.getElementById('q-count-sub').textContent = `${total} soru kayıtlı`;
    }

    // Gezegen değişince bölüm dropdown'unu güncelle, sonra filtrele
    function onFilterLevelChange() {
      const lv = document.getElementById('filter-level').value;
      const secSel = document.getElementById('filter-section');
      secSel.innerHTML = '<option value="">Tüm Bölümler</option>';
      if (lv && allSections.length) {
        allSections.filter(s => s.planet_level == lv).forEach(s => {
          const opt = document.createElement('option');
          opt.value = s.id;
          opt.textContent = `${s.section_no}. ${s.name || 'Bölüm ' + s.section_no}`;
          secSel.appendChild(opt);
        });
      }
      applyFilters();
    }

    function applyFilters() {
      const search = document.getElementById('search-inp').value.toLowerCase();
      const lv = document.getElementById('filter-level').value;
      const sec = document.getElementById('filter-section').value;
      const tp = document.getElementById('filter-type').value;
      const fm = document.getElementById('filter-fmt').value;

      filteredQuestions = allQuestions.filter(q => {
        const matchSearch = !search || (q.question_text || '').toLowerCase().includes(search) || (q.subtopic || '').toLowerCase().includes(search);
        const matchLv = !lv || String(q.level) === lv;
        const matchSec = !sec || String(q.section_id) === sec;
        const matchTp = !tp || q.type === tp;
        const matchFm = !fm || q.format === fm;
        return matchSearch && matchLv && matchSec && matchTp && matchFm;
      });
      currentPage = 0;
      renderTable();
    }

    let SORT_MODE = false;
    let sortQuestions = []; // sıralama modunda gösterilen liste
    let dragSrcIdx = null;

    function renderTable() {
      if (SORT_MODE) { renderSortTable(); return; }

      const start = currentPage * PAGE_SIZE;
      const page = filteredQuestions.slice(start, start + PAGE_SIZE);

      if (page.length === 0) {
        document.getElementById('q-tbody').innerHTML = `<tr><td colspan="9" class="empty-state">Soru bulunamadı.</td></tr>`;
        document.getElementById('pagination').innerHTML = '';
        return;
      }

      const lvClass = { 1: 'badge-lv1', 2: 'badge-lv2', 3: 'badge-lv3' };
      const fmtLabel = { mcq: 'ÇSM', tf: 'D/Y', blank: 'Boşluk', sort: 'Sıralama', drag: 'Sürükle', match: 'Eşle', read: 'Okuma', write: 'Yazı', word_sort: 'Kelime' };

      document.getElementById('q-tbody').innerHTML = page.map((q, i) => {
        // Bu sorunun bölüm adını bul
        const sec = allSections.find(s => s.id === q.section_id);
        const secName = sec ? `${sec.section_no}. ${sec.name || 'Bölüm ' + sec.section_no}` : '—';
        // Bu sorunun gezegeni için bölüm seçenekleri
        const secOptions = allSections
          .filter(s => s.planet_level == q.level)
          .map(s => `<option value="${s.id}" ${q.section_id === s.id ? 'selected' : ''}>${s.section_no}. ${esc(s.name || 'Bölüm ' + s.section_no)}</option>`)
          .join('');
        return `<tr>
      <td style="display:none"></td>
      <td><span class="order-badge">${q.order_index != null ? q.order_index : '—'}</span></td>
      <td style="color:var(--text3);font-size:.78rem">${q.id}</td>
      <td><span class="badge ${lvClass[q.level] || 'badge-lv1'}">${q.level === 1 ? 'Dünya' : q.level === 2 ? 'Ay' : 'Mars'}</span></td>
      <td>
        <select class="filter-select" style="padding:.2rem .5rem;font-size:.75rem;min-width:120px"
                onchange="changeQuestionSection(${q.id}, this.value, this)">
          <option value="">— Bölüm yok —</option>
          ${secOptions}
        </select>
      </td>
      <td><span class="badge ${q.type === 'math' ? 'badge-math' : 'badge-tr'}">${q.type === 'math' ? 'Mat.' : 'Tr.'}</span></td>
      <td><span class="fmt-chip">${fmtLabel[q.format] || q.format}</span></td>
      <td style="font-size:.8rem;color:var(--text2);max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${q.subtopic || '—'}</td>
      <td><div class="q-preview">${q.question_text || '—'}</div></td>
      <td>
        <div class="action-cell">
          <button class="btn sm" onclick="editQuestion(${q.id})">✏️</button>
          <button class="btn sm danger" onclick="deleteQuestion(${q.id})">🗑</button>
        </div>
      </td>
    </tr>`;
      }).join('');

      const total = filteredQuestions.length;
      const totalPages = Math.ceil(total / PAGE_SIZE);
      let paginationHtml = `<span>${start + 1}–${Math.min(start + PAGE_SIZE, total)} / ${total} soru</span><div class="page-btns">`;
      for (let i = 0; i < totalPages; i++) {
        paginationHtml += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="goPage(${i})">${i + 1}</button>`;
      }
      paginationHtml += '</div>';
      document.getElementById('pagination').innerHTML = paginationHtml;
    }

    function goPage(n) { currentPage = n; renderTable(); }

    /* ── SIRALAMA MODU ── */
    function toggleSortMode() {
      SORT_MODE = !SORT_MODE;
      const banner = document.getElementById('sort-mode-banner');
      const btn = document.getElementById('btn-sort-mode');
      const thDrag = document.getElementById('th-drag');
      const filterBar = document.querySelector('.filter-bar');
      const pagination = document.getElementById('pagination');

      if (SORT_MODE) {
        banner.classList.add('active');
        btn.textContent = '✕ Sıralama Modundan Çık';
        if (thDrag) thDrag.style.display = '';
        if (filterBar) filterBar.style.opacity = '.4';
        if (pagination) pagination.style.display = 'none';
        // Gezegen filtresine göre listele
        const lv = document.getElementById('filter-level').value;
        sortQuestions = (lv
          ? allQuestions.filter(q => String(q.level) === lv)
          : allQuestions
        ).slice().sort((a, b) => {
          const oa = a.order_index != null ? a.order_index : 99999;
          const ob = b.order_index != null ? b.order_index : 99999;
          return oa !== ob ? oa - ob : a.id - b.id;
        });
        renderSortTable();
      } else {
        banner.classList.remove('active');
        btn.textContent = '⇅ Sıralamayı Düzenle';
        if (thDrag) thDrag.style.display = 'none';
        if (filterBar) filterBar.style.opacity = '';
        if (pagination) pagination.style.display = '';
        renderTable();
      }
    }

    function renderSortTable() {
      const lvClass = { 1: 'badge-lv1', 2: 'badge-lv2', 3: 'badge-lv3' };
      const fmtLabel = { mcq: 'ÇSM', tf: 'D/Y', blank: 'Boşluk', sort: 'Sıralama', drag: 'Sürükle', match: 'Eşle', read: 'Okuma', write: 'Yazı', word_sort: 'Kelime' };

      document.getElementById('q-tbody').innerHTML = sortQuestions.map((q, i) => {
        const sec = allSections.find(s => s.id === q.section_id);
        const secLabel = sec ? `${sec.section_no}. ${esc(sec.name || 'Bölüm ' + sec.section_no)}` : '—';
        return `<tr draggable="true"
        data-sort-idx="${i}"
        ondragstart="onSortDragStart(event,${i})"
        ondragover="onSortDragOver(event,${i})"
        ondrop="onSortDrop(event,${i})"
        ondragleave="onSortDragLeave(event)"
        ondragend="onSortDragEnd(event)">
      <td><span class="drag-handle" title="Sürükle">⠿</span></td>
      <td><span class="order-badge">${i + 1}</span></td>
      <td style="color:var(--text3);font-size:.78rem">${q.id}</td>
      <td><span class="badge ${lvClass[q.level] || 'badge-lv1'}">${q.level === 1 ? 'Dünya' : q.level === 2 ? 'Ay' : 'Mars'}</span></td>
      <td style="font-size:.75rem;color:var(--text2)">${secLabel}</td>
      <td><span class="badge ${q.type === 'math' ? 'badge-math' : 'badge-tr'}">${q.type === 'math' ? 'Mat.' : 'Tr.'}</span></td>
      <td><span class="fmt-chip">${fmtLabel[q.format] || q.format}</span></td>
      <td style="font-size:.8rem;color:var(--text2);max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${q.subtopic || '—'}</td>
      <td><div class="q-preview">${q.question_text || '—'}</div></td>
      <td style="color:var(--text3);font-size:.72rem">${q.order_index != null ? q.order_index : '—'}</td>
    </tr>`;
      }).join('');
    }

    /* Drag & Drop handlers */
    function onSortDragStart(e, idx) {
      dragSrcIdx = idx;
      e.currentTarget.classList.add('dragging-row');
      e.dataTransfer.effectAllowed = 'move';
    }

    function onSortDragOver(e, idx) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      document.querySelectorAll('#q-tbody tr').forEach(r => r.classList.remove('drag-over-row'));
      e.currentTarget.classList.add('drag-over-row');
    }

    function onSortDragLeave(e) {
      e.currentTarget.classList.remove('drag-over-row');
    }

    function onSortDrop(e, idx) {
      e.preventDefault();
      document.querySelectorAll('#q-tbody tr').forEach(r => r.classList.remove('drag-over-row'));
      if (dragSrcIdx === null || dragSrcIdx === idx) return;
      // Listeyi yeniden sırala
      const [moved] = sortQuestions.splice(dragSrcIdx, 1);
      sortQuestions.splice(idx, 0, moved);
      dragSrcIdx = null;
      renderSortTable();
    }

    function onSortDragEnd(e) {
      e.currentTarget.classList.remove('dragging-row');
      document.querySelectorAll('#q-tbody tr').forEach(r => r.classList.remove('drag-over-row'));
      dragSrcIdx = null;
    }

    async function saveSortOrder() {
      const btn = document.getElementById('btn-save-sort');
      btn.textContent = 'Kaydediliyor...'; btn.disabled = true;
      try {
        // Her soruya order_index ata (1'den başlayan)
        const updates = sortQuestions.map((q, i) =>
          sb.from('questions').update({ order_index: i + 1 }).eq('id', q.id)
        );
        await Promise.all(updates);
        // Yerel veriyi güncelle
        sortQuestions.forEach((q, i) => {
          q.order_index = i + 1;
          const orig = allQuestions.find(x => x.id === q.id);
          if (orig) orig.order_index = i + 1;
        });
        toast(`${sortQuestions.length} sorunun sırası kaydedildi!`, 'ok');
        renderSortTable();
      } catch (e) {
        toast('Kaydetme hatası: ' + e.message, 'fail');
      } finally {
        btn.textContent = '💾 Kaydet'; btn.disabled = false;
      }
    }

    /* ═══════════════════════════════════════════════════
       FORM RENDERING
    ═══════════════════════════════════════════════════ */
    function getFormHtml(q = {}) {
      const fmt = q.format || 'mcq';
      return `
  <div class="form-grid">
    <div class="form-group">
      <label class="form-label">Gezegen (Zorluk)</label>
      <select class="form-select" id="f-level" onchange="rerenderDynamic();loadSectionOptions('f-section-id',this.value,${q.section_id || 'null'})">
        <option value="1" ${q.level == 1 ? 'selected' : ''}>Dünya</option>
        <option value="2" ${q.level == 2 ? 'selected' : ''}>Ay</option>
        <option value="3" ${q.level == 3 ? 'selected' : ''}>Mars</option>
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">Tür</label>
      <select class="form-select" id="f-type">
        <option value="math" ${q.type === 'math' ? 'selected' : ''}>Matematik</option>
        <option value="tr"   ${q.type === 'tr' ? 'selected' : ''}>Türkçe</option>
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">Format</label>
      <select class="form-select" id="f-format" onchange="rerenderDynamic()">
        <option value="mcq"      ${fmt === 'mcq' ? 'selected' : ''}>Çoktan Seçmeli</option>
        <option value="tf"       ${fmt === 'tf' ? 'selected' : ''}>Doğru / Yanlış</option>
        <option value="blank"    ${fmt === 'blank' ? 'selected' : ''}>Boşluk Doldur</option>
        <option value="sort"     ${fmt === 'sort' ? 'selected' : ''}>Sıralama (Sürükle)</option>
        <option value="drag"     ${fmt === 'drag' ? 'selected' : ''}>Sürükle-Bırak</option>
        <option value="match"    ${fmt === 'match' ? 'selected' : ''}>Eşleştirme</option>
        <option value="read"     ${fmt === 'read' ? 'selected' : ''}>Sesli Okuma</option>
        <option value="write"    ${fmt === 'write' ? 'selected' : ''}>Yazı Çalışması</option>
        <option value="word_sort" ${fmt === 'word_sort' ? 'selected' : ''}>Kelime Sınıflandır</option>
      </select>
    </div>
    <div class="form-group form-full">
      <label class="form-label">Bölüm</label>
      <select class="form-select" id="f-section-id">
        <option value="">— Bölüm seç —</option>
      </select>
      <div class="form-hint">Soruyu hangi bölüme atayacağını seç. Gezegen değişince bölümler güncellenir.</div>
    </div>
    <div class="form-group">
      <label class="form-label">Konu / Alt Başlık</label>
      <input class="form-input" id="f-subtopic" value="${esc(q.subtopic || '')}" placeholder="örn. Ritmik sayma: 5'er">
    </div>
    <div class="form-group form-full">
      <label class="form-label">Sahne Metni (opsiyonel)</label>
      <textarea class="form-textarea" id="f-scene" placeholder="Hikaye bağlamı...">${esc(q.scene || '')}</textarea>
    </div>
    <div class="form-group form-full">
      <label class="form-label">Soru Metni *</label>
      <textarea class="form-textarea" id="f-qtext" placeholder="Soru buraya...">${esc(q.question_text || '')}</textarea>
    </div>
    <div class="form-group form-full">
      <label class="form-label">Şablon Metin (boşluk doldur / okuma / yazı için)</label>
      <textarea class="form-textarea" id="f-template" placeholder="Şablon cümle...">${esc(q.template_text || '')}</textarea>
    </div>
  </div>
  <div id="dynamic-area">${getDynamicFields(fmt, q)}</div>
  <div class="form-grid" style="margin-top:.9rem">
    <div class="form-group">
      <label class="form-label">Doğru Cevap Geri Bildirimi *</label>
      <textarea class="form-textarea" id="f-fbok" placeholder="Doğru cevap için mesaj...">${esc(q.feedback_ok || '')}</textarea>
    </div>
    <div class="form-group">
      <label class="form-label">Yanlış Cevap Geri Bildirimi *</label>
      <textarea class="form-textarea" id="f-fbno" placeholder="Yanlış cevap için mesaj...">${esc(q.feedback_fail || '')}</textarea>
    </div>
  </div>`;
    }

    function getDynamicFields(fmt, q = {}) {
      const opts = safeJSON(q.options, []);
      const corr = q.correct_answer;

      if (fmt === 'mcq') {
        const corrIdx = typeof corr === 'number' ? corr : safeJSON(corr, 0);
        let html = `<div class="dynamic-field"><div class="dynamic-field-title">Seçenekler (doğru olanı işaretle)</div>`;
        const baseOpts = opts.length ? opts : ['', '', '', ''];
        baseOpts.forEach((o, i) => {
          html += `<div class="pair-row">
        <input type="radio" name="mcq-correct" value="${i}" ${corrIdx === i ? 'checked' : ''} style="flex-shrink:0">
        <input class="form-input" placeholder="Seçenek ${i + 1}" value="${esc(o)}" id="mcq-opt-${i}" style="flex:1">
        <button class="rm-btn" onclick="removeMcqOpt(${i})">✕</button>
      </div>`;
        });
        html += `<button class="add-pair-btn" onclick="addMcqOpt()">+ Seçenek Ekle</button></div>`;
        return html;
      }

      if (fmt === 'tf') {
        const corrBool = typeof corr === 'boolean' ? corr : safeJSON(corr, true);
        return `<div class="dynamic-field"><div class="dynamic-field-title">Doğru Cevap</div>
      <div style="display:flex;gap:1rem;margin-top:.3rem">
        <label style="display:flex;align-items:center;gap:.4rem;cursor:pointer;font-size:.9rem;color:var(--text)"><input type="radio" name="tf-corr" value="true"  ${corrBool === true ? 'checked' : ''}>Doğru</label>
        <label style="display:flex;align-items:center;gap:.4rem;cursor:pointer;font-size:.9rem;color:var(--text)"><input type="radio" name="tf-corr" value="false" ${corrBool === false ? 'checked' : ''}>Yanlış</label>
      </div></div>`;
      }

      if (fmt === 'blank') {
        const corrStr = typeof corr === 'string' ? corr : (corr !== undefined ? String(corr) : '');
        return `<div class="dynamic-field"><div class="dynamic-field-title">Doğru Cevap</div>
      <input class="form-input" id="blank-correct" value="${esc(corrStr)}" placeholder="Doğru cevap (birden fazla: virgülle ayır)">
      <div class="form-hint">Birden fazla kabul edilen cevap için: 6/12 şeklinde yaz</div>
    </div>`;
      }

      if (fmt === 'sort') {
        const items = opts.length ? opts : ['', '', '', '', ''];
        const order = safeJSON(corr, []);
        let html = `<div class="dynamic-field"><div class="dynamic-field-title">Sıralama Öğeleri (doğru sırayla yaz)</div>`;
        items.forEach((it, i) => {
          html += `<div class="pair-row">
        <input class="form-input" id="sort-item-${i}" value="${esc(it)}" placeholder="Öğe ${i + 1}">
        <button class="rm-btn" onclick="removeSortItem(${i})">✕</button>
      </div>`;
        });
        html += `<button class="add-pair-btn" onclick="addSortItem()">+ Öğe Ekle</button>
    <div class="form-hint" style="margin-top:.5rem">Doğru sıra: yukarıdan aşağıya girildiği sıra olarak kaydedilir.</div></div>`;
        return html;
      }

      if (fmt === 'drag') {
        const items = opts.length ? opts : ['', '', '', ''];
        const corrItems = Array.isArray(safeJSON(corr, [])) ? safeJSON(corr, []) : [];
        let html = `<div class="dynamic-field"><div class="dynamic-field-title">Sürüklenecek Öğeler (doğrular için kutucuğu işaretle)</div>`;
        items.forEach((it, i) => {
          const isCorr = corrItems.includes(it);
          html += `<div class="pair-row">
        <input type="checkbox" ${isCorr ? 'checked' : ''} id="drag-chk-${i}" style="flex-shrink:0">
        <input class="form-input" id="drag-opt-${i}" value="${esc(it)}" placeholder="Öğe ${i + 1}">
        <button class="rm-btn" onclick="removeDragOpt(${i})">✕</button>
      </div>`;
        });
        html += `<button class="add-pair-btn" onclick="addDragOpt()">+ Öğe Ekle</button></div>`;
        return html;
      }

      if (fmt === 'match') {
        const pairs = safeJSON(corr, [['', ''], ['', ''], ['', '']]);
        let html = `<div class="dynamic-field"><div class="dynamic-field-title">Eşleştirme Çiftleri (Sol → Sağ)</div>`;
        pairs.forEach((p, i) => {
          html += `<div class="pair-row">
        <input class="form-input" id="match-l-${i}" value="${esc(p[0])}" placeholder="Sol">
        <span style="color:var(--text3);flex-shrink:0">→</span>
        <input class="form-input" id="match-r-${i}" value="${esc(p[1])}" placeholder="Sağ">
        <button class="rm-btn" onclick="removeMatchPair(${i})">✕</button>
      </div>`;
        });
        html += `<button class="add-pair-btn" onclick="addMatchPair()">+ Çift Ekle</button></div>`;
        return html;
      }

      if (fmt === 'read' || fmt === 'write') {
        return `<div class="dynamic-field"><div class="dynamic-field-title">Şablon Metni alanını kullan (yukarıda)</div><p style="font-size:.8rem;color:var(--text3)">Öğrenci bu metni okuyacak veya yazacak. Doğru cevap gerekmiyor.</p></div>`;
      }

      if (fmt === 'word_sort') {
        const words = opts.length ? opts : ['', '', '', '', ''];
        const corrWords = safeJSON(corr, []);
        let html = `<div class="dynamic-field"><div class="dynamic-field-title">Kelimeler (doğruları işaretle)</div>`;
        words.forEach((w, i) => {
          const isCorr = corrWords.includes(w);
          html += `<div class="pair-row">
        <input type="checkbox" ${isCorr ? 'checked' : ''} id="ws-chk-${i}" style="flex-shrink:0">
        <input class="form-input" id="ws-opt-${i}" value="${esc(w)}" placeholder="Kelime ${i + 1}">
        <button class="rm-btn" onclick="removeWsOpt(${i})">✕</button>
      </div>`;
        });
        html += `<button class="add-pair-btn" onclick="addWsOpt()">+ Kelime Ekle</button></div>`;
        return html;
      }

      return '';
    }

    function rerenderDynamic() {
      const modalOpen = document.getElementById('modal-overlay')?.classList.contains('open');
      const container = modalOpen ? document.getElementById('modal-body') : document.getElementById('add-form-area');
      const fmt = container?.querySelector('#f-format')?.value;
      if (fmt) {
        const currentData = (typeof editingId !== 'undefined' && editingId && typeof allQuestions !== 'undefined')
          ? allQuestions.find(x => x.id === editingId) || {} : {};
        const dynArea = container?.querySelector('#dynamic-area');
        if (dynArea) dynArea.innerHTML = getDynamicFields(fmt, currentData);
      }
    }

    /* ═══════════════════════════════════════════════════
       DYNAMIC FIELD HELPERS
    ═══════════════════════════════════════════════════ */
    function getInputCount(prefix) { let i = 0; while (document.getElementById(`${prefix}-${i}`)) i++; return i; }

    function addMcqOpt() { const c = getInputCount('mcq-opt'); document.querySelector('.add-pair-btn').insertAdjacentHTML('beforebegin', `<div class="pair-row"><input type="radio" name="mcq-correct" value="${c}" style="flex-shrink:0"><input class="form-input" id="mcq-opt-${c}" placeholder="Seçenek ${c + 1}" style="flex:1"><button class="rm-btn" onclick="this.parentNode.remove()">✕</button></div>`); }
    function addSortItem() { const c = getInputCount('sort-item'); document.querySelectorAll('.add-pair-btn')[0].insertAdjacentHTML('beforebegin', `<div class="pair-row"><input class="form-input" id="sort-item-${c}" placeholder="Öğe ${c + 1}"><button class="rm-btn" onclick="this.parentNode.remove()">✕</button></div>`); }
    function addDragOpt() { const c = getInputCount('drag-opt'); document.querySelectorAll('.add-pair-btn')[0].insertAdjacentHTML('beforebegin', `<div class="pair-row"><input type="checkbox" id="drag-chk-${c}" style="flex-shrink:0"><input class="form-input" id="drag-opt-${c}" placeholder="Öğe ${c + 1}"><button class="rm-btn" onclick="this.parentNode.remove()">✕</button></div>`); }
    function addMatchPair() { const c = getInputCount('match-l'); document.querySelectorAll('.add-pair-btn')[0].insertAdjacentHTML('beforebegin', `<div class="pair-row"><input class="form-input" id="match-l-${c}" placeholder="Sol"><span style="color:var(--text3);flex-shrink:0">→</span><input class="form-input" id="match-r-${c}" placeholder="Sağ"><button class="rm-btn" onclick="this.parentNode.remove()">✕</button></div>`); }
    function addWsOpt() { const c = getInputCount('ws-opt'); document.querySelectorAll('.add-pair-btn')[0].insertAdjacentHTML('beforebegin', `<div class="pair-row"><input type="checkbox" id="ws-chk-${c}" style="flex-shrink:0"><input class="form-input" id="ws-opt-${c}" placeholder="Kelime ${c + 1}"><button class="rm-btn" onclick="this.parentNode.remove()">✕</button></div>`); }
    function removeMcqOpt(i) { document.getElementById('mcq-opt-' + i)?.parentNode?.remove(); }
    function removeSortItem(i) { document.getElementById('sort-item-' + i)?.parentNode?.remove(); }
    function removeDragOpt(i) { document.getElementById('drag-opt-' + i)?.parentNode?.remove(); }
    function removeMatchPair(i) { document.getElementById('match-l-' + i)?.parentNode?.remove(); }
    function removeWsOpt(i) { document.getElementById('ws-opt-' + i)?.parentNode?.remove(); }

    /* ═══════════════════════════════════════════════════
       COLLECT FORM DATA
    ═══════════════════════════════════════════════════ */
    function collectFromContainer(container) {
      const g = (id) => container?.querySelector('#' + id);
      const fmt = g('f-format')?.value;
      let options = null, correct_answer = null;
      if (fmt === 'mcq') {
        options = []; let i = 0;
        while (g('mcq-opt-' + i)) { options.push(g('mcq-opt-' + i).value); i++; }
        const checked = container?.querySelector('input[name="mcq-correct"]:checked');
        correct_answer = checked ? parseInt(checked.value) : 0;
      } else if (fmt === 'tf') {
        const v = container?.querySelector('input[name="tf-corr"]:checked')?.value;
        correct_answer = v === 'true';
      } else if (fmt === 'blank') {
        correct_answer = g('blank-correct')?.value.trim() || '';
      } else if (fmt === 'sort') {
        options = []; let i = 0;
        while (g('sort-item-' + i)) { const v = g('sort-item-' + i).value; if (v) options.push(v); i++; }
        correct_answer = [...options];
      } else if (fmt === 'drag') {
        options = []; const correct = []; let i = 0;
        while (g('drag-opt-' + i)) { const v = g('drag-opt-' + i).value; if (v) { options.push(v); if (g('drag-chk-' + i)?.checked) correct.push(v); } i++; }
        correct_answer = correct;
      } else if (fmt === 'match') {
        const pairs = []; let i = 0;
        while (g('match-l-' + i)) { const l = g('match-l-' + i).value; const r = g('match-r-' + i).value; if (l && r) pairs.push([l, r]); i++; }
        correct_answer = pairs;
      } else if (fmt === 'read' || fmt === 'write') {
        correct_answer = null;
      } else if (fmt === 'word_sort') {
        options = []; const correct = []; let i = 0;
        while (g('ws-opt-' + i)) { const v = g('ws-opt-' + i).value; if (v) { options.push(v); if (g('ws-chk-' + i)?.checked) correct.push(v); } i++; }
        correct_answer = correct;
      }
      const secVal = g('f-section-id')?.value;
      return {
        level: parseInt(g('f-level')?.value || 1),
        type: g('f-type')?.value || 'math',
        format: fmt,
        subtopic: g('f-subtopic')?.value.trim() || '',
        scene: g('f-scene')?.value.trim() || null,
        question_text: g('f-qtext')?.value.trim() || '',
        template_text: g('f-template')?.value.trim() || null,
        options: options ? JSON.stringify(options) : null,
        correct_answer: correct_answer !== null ? JSON.stringify(correct_answer) : null,
        feedback_ok: g('f-fbok')?.value.trim() || '',
        feedback_fail: g('f-fbno')?.value.trim() || '',
        section_id: secVal ? parseInt(secVal) : null,
      };
    }

    function collectFormData() {
      const fmt = document.getElementById('f-format')?.value;
      let options = null, correct_answer = null;

      if (fmt === 'mcq') {
        options = []; let i = 0;
        while (document.getElementById(`mcq-opt-${i}`)) { options.push(document.getElementById(`mcq-opt-${i}`).value); i++; }
        const checked = document.querySelector('input[name="mcq-correct"]:checked');
        correct_answer = checked ? parseInt(checked.value) : 0;
      } else if (fmt === 'tf') {
        const v = document.querySelector('input[name="tf-corr"]:checked')?.value;
        correct_answer = v === 'true';
      } else if (fmt === 'blank') {
        correct_answer = document.getElementById('blank-correct')?.value.trim() || '';
      } else if (fmt === 'sort') {
        options = []; let i = 0;
        while (document.getElementById(`sort-item-${i}`)) { const v = document.getElementById(`sort-item-${i}`).value; if (v) options.push(v); i++; }
        correct_answer = [...options];
      } else if (fmt === 'drag') {
        options = []; const correct = []; let i = 0;
        while (document.getElementById(`drag-opt-${i}`)) {
          const v = document.getElementById(`drag-opt-${i}`).value;
          if (v) { options.push(v); if (document.getElementById(`drag-chk-${i}`)?.checked) correct.push(v); }
          i++;
        }
        correct_answer = correct;
      } else if (fmt === 'match') {
        const pairs = []; let i = 0;
        while (document.getElementById(`match-l-${i}`)) {
          const l = document.getElementById(`match-l-${i}`).value;
          const r = document.getElementById(`match-r-${i}`).value;
          if (l && r) pairs.push([l, r]);
          i++;
        }
        correct_answer = pairs;
      } else if (fmt === 'read' || fmt === 'write') {
        correct_answer = null;
      } else if (fmt === 'word_sort') {
        options = []; const correct = []; let i = 0;
        while (document.getElementById(`ws-opt-${i}`)) {
          const v = document.getElementById(`ws-opt-${i}`).value;
          if (v) { options.push(v); if (document.getElementById(`ws-chk-${i}`)?.checked) correct.push(v); }
          i++;
        }
        correct_answer = correct;
      }

      const secVal = document.getElementById('f-section-id')?.value;
      return {
        level: parseInt(document.getElementById('f-level')?.value || 1),
        type: document.getElementById('f-type')?.value || 'math',
        format: fmt,
        subtopic: document.getElementById('f-subtopic')?.value.trim() || '',
        scene: document.getElementById('f-scene')?.value.trim() || null,
        question_text: (document.querySelector('#f-qtext')?.value || document.getElementById('f-qtext')?.value || '').trim(),

        template_text: document.getElementById('f-template')?.value.trim() || null,
        options: options ? JSON.stringify(options) : null,
        correct_answer: correct_answer !== null ? JSON.stringify(correct_answer) : null,
        feedback_ok: document.getElementById('f-fbok')?.value.trim() || '',
        feedback_fail: document.getElementById('f-fbno')?.value.trim() || '',
        section_id: secVal ? parseInt(secVal) : null,
      };
    }

    /* ═══════════════════════════════════════════════════
       MODAL: ADD / EDIT
    ═══════════════════════════════════════════════════ */
    function openModal(q = {}) {
      editingId = q.id || null;
      document.getElementById('modal-title').textContent = editingId ? 'Soru Düzenle' : 'Yeni Soru';
      document.getElementById('modal-body').innerHTML = getFormHtml(q);
      document.getElementById('modal-overlay').classList.add('open');
    }

    function closeModal() { document.getElementById('modal-overlay').classList.remove('open'); document.getElementById('modal-body').innerHTML = ''; editingId = null; }
    function closeModalOutside(e) { if (e.target === document.getElementById('modal-overlay')) closeModal(); }

    function editQuestion(id) {
      const q = allQuestions.find(x => x.id === id);
      if (!q) return;
      openModal(q);
    }

    async function saveQuestion() {
      const modalBody = document.getElementById('modal-body');
      const data = collectFromContainer(modalBody);
      if (!data.question_text) { toast('Soru metni boş olamaz!', 'fail'); return; }
      const btn = document.getElementById('modal-save-btn');
      btn.textContent = 'Kaydediliyor...'; btn.disabled = true;
      try {
        let error;
        if (editingId) {
          ({ error } = await sb.from('questions').update(data).eq('id', editingId));
        } else {
          ({ error } = await sb.from('questions').insert([data]));
        }
        if (error) throw error;
        toast(editingId ? 'Soru güncellendi!' : 'Soru eklendi!', 'ok');
        closeModal();
        loadQuestions();
      } catch (e) {
        toast('Hata: ' + e.message, 'fail');
      } finally {
        btn.textContent = 'Kaydet'; btn.disabled = false;
      }
    }



    async function deleteQuestion(id) {
      if (!confirm('Bu soruyu silmek istediğinden emin misin?')) return;
      const { error, count } = await sb.from('questions').delete({ count: 'exact' }).eq('id', id);
      if (error) {
        toast('Silme hatası: ' + error.message, 'fail');
        console.error('Delete error:', error);
        return;
      }
      // Supabase RLS nedeniyle bazen hata vermeden silmeyebilir — kontrol et
      if (count === 0) {
        toast('Soru silinemedi. Supabase DELETE policy kontrol edin.', 'fail');
        return;
      }
      toast('Soru silindi.', 'ok');
      // Yerel listeden de kaldır (loadQuestions çağırmadan önce)
      allQuestions = allQuestions.filter(q => q.id !== id);
      applyFilters();
      updateStats();
    }

    /* ═══════════════════════════════════════════════════
       ADD PAGE FORM
    ═══════════════════════════════════════════════════ */
    function renderAddForm() {
      const area = document.getElementById('add-form-area');
      if (!area) return;
      area.innerHTML = getFormHtml({}) + `
    <div style="margin-top:1rem;display:flex;justify-content:flex-end;gap:.6rem">
      <button class="btn" onclick="resetAddForm()">Temizle</button>
      <button class="btn primary" onclick="saveNewFromPage()">Kaydet ve Temizle</button>
    </div>`;
    }

    async function saveNewFromPage() {
      const container = document.getElementById('add-form-area');
      const data = collectFromContainer(container);
      if (!data.question_text) { toast('Soru metni boş olamaz!', 'fail'); return; }
      const { error } = await sb.from('questions').insert([data]);
      if (error) { toast('Hata: ' + error.message, 'fail'); return; }
      toast('Soru eklendi!', 'ok');
      renderAddForm();
      loadQuestions();
    }

    function resetAddForm() { renderAddForm(); }

    /* ═══════════════════════════════════════════════════
       BULK IMPORT
    ═══════════════════════════════════════════════════ */
    async function bulkImport() {
      const raw = document.getElementById('import-json').value.trim();
      const resultEl = document.getElementById('import-result');
      try {
        let arr = JSON.parse(raw);
        if (!Array.isArray(arr)) arr = [arr];
        // Stringify nested fields (blank string cevaplar da JSON.stringify ile '"5"' olur)
        arr = arr.map(q => ({
          ...q,
          options: q.options == null ? null
            : (typeof q.options === 'string' ? q.options : JSON.stringify(q.options)),
          correct_answer: q.correct_answer === undefined || q.correct_answer === null ? null
            : (typeof q.correct_answer === 'string' && (q.correct_answer.trim().startsWith('[') || q.correct_answer.trim().startsWith('{'))
              ? q.correct_answer
              : JSON.stringify(q.correct_answer)),
        }));
        const { error, data } = await sb.from('questions').insert(arr).select();
        if (error) throw error;
        resultEl.style.display = 'block';
        resultEl.style.color = 'var(--green)';
        resultEl.textContent = `✓ ${data.length} soru başarıyla eklendi.`;
        loadQuestions();
      } catch (e) {
        resultEl.style.display = 'block';
        resultEl.style.color = 'var(--red)';
        resultEl.textContent = `Hata: ${e.message}`;
      }
    }

    async function loadBolum2DunyaSeed() {
      const resultEl = document.getElementById('import-result');
      const ta = document.getElementById('import-json');
      try {
        let arr = null;
        const embedded = document.getElementById('seed-bolum2-dunya');
        if (embedded && embedded.textContent.trim()) {
          arr = JSON.parse(embedded.textContent);
        } else {
          try {
            const res = await fetch('bolum2-dunya-sorular.json', { cache: 'no-store' });
            if (res.ok) arr = await res.json();
          } catch (_) { /* ignore */ }
        }
        if (!arr || !arr.length) {
          resultEl.style.display = 'block';
          resultEl.style.color = 'var(--amber)';
          resultEl.textContent = 'Soru verisi bulunamadı. bolum2-dunya-sorular.json içeriğini kutuya yapıştırıp «İçe Aktar» de, veya Supabase SQL Editor’da bolum2-dunya-sorular.sql çalıştır.';
          return;
        }
        if (!confirm(`Dünya · BÖLÜM2 (section_id=2) için ${arr.length} soru eklenecek (belge sırası). Devam?`)) return;
        ta.value = JSON.stringify(arr, null, 2);
        await bulkImport();
      } catch (e) {
        resultEl.style.display = 'block';
        resultEl.style.color = 'var(--red)';
        resultEl.textContent = 'Hata: ' + e.message;
      }
    }

    function showSampleJSON() {
      document.getElementById('import-json').value = JSON.stringify([
        {
          "level": 1, "type": "math", "format": "mcq",
          "subtopic": "Ritmik sayma: 2'şer",
          "scene": "Roketler 2'şer 2'şer fırlatılıyor!",
          "question_text": "2, 4, 6, 8, ... sonraki sayı kaçtır?",
          "options": ["8", "10", "12", "14"],
          "correct_answer": 1,
          "feedback_ok": "Harika! 8+2=10",
          "feedback_fail": "2'şer saymada her adım +2, yani 10."
        },
        {
          "level": 1, "type": "tr", "format": "tf",
          "subtopic": "Türkçe · Doğru/Yanlış",
          "scene": "Bir cümle analizi yapıyoruz!",
          "question_text": "'Hızlıca' kelimesi bir zarf mıdır?",
          "template_text": null,
          "options": null,
          "correct_answer": true,
          "feedback_ok": "Doğru! 'Hızlıca' bir zarf, eylemi niteler.",
          "feedback_fail": "'Hızlıca' nasıl yapıldığını anlatır → zarf."
        }
      ], null, 2);
    }

    /* ═══════════════════════════════════════════════════
       STATS PAGE
    ═══════════════════════════════════════════════════ */
    function renderStats() {
      const el = document.getElementById('stats-content');
      if (!allQuestions.length) { el.innerHTML = '<p style="color:var(--text2)">Önce sorular yüklensin.</p>'; return; }

      const fmtCounts = {};
      const topicCounts = {};
      allQuestions.forEach(q => {
        fmtCounts[q.format] = (fmtCounts[q.format] || 0) + 1;
        topicCounts[q.subtopic || '?'] = (topicCounts[q.subtopic || '?'] || 0) + 1;
      });

      const total = allQuestions.length;
      const mathCount = allQuestions.filter(q => q.type === 'math').length;
      const trCount = total - mathCount;

      let html = `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:.75rem;margin-bottom:1.5rem">
    <div class="stat-card"><div class="stat-label">Toplam Soru</div><div class="stat-value">${total}</div></div>
    <div class="stat-card"><div class="stat-label">Matematik</div><div class="stat-value" style="color:var(--green)">${mathCount}</div><div class="stat-sub">%${Math.round(mathCount / total * 100)}</div></div>
    <div class="stat-card"><div class="stat-label">Türkçe</div><div class="stat-value" style="color:#93c5fd">${trCount}</div><div class="stat-sub">%${Math.round(trCount / total * 100)}</div></div>
  </div>`;

      html += `<div style="background:var(--card);border:1px solid var(--border);border-radius:var(--r);padding:1.2rem;margin-bottom:.75rem">
    <div style="font-family:'Nunito',sans-serif;font-size:.95rem;font-weight:700;color:#fff;margin-bottom:1rem">Format Dağılımı</div>`;
      const fmtLabels = { mcq: 'Çoktan seçmeli', tf: 'Doğru/Yanlış', blank: 'Boşluk doldur', sort: 'Sıralama', drag: 'Sürükle-bırak', match: 'Eşleştirme', read: 'Sesli okuma', write: 'Yazı çalışması', word_sort: 'Kelime sınıfla' };
      Object.entries(fmtCounts).sort((a, b) => b[1] - a[1]).forEach(([fmt, cnt]) => {
        const pct = Math.round(cnt / total * 100);
        html += `<div class="bar-row"><div class="bar-label">${fmtLabels[fmt] || fmt}</div><div class="bar-track"><div class="bar-fill" style="width:${pct}%;background:var(--blue)"></div></div><div class="bar-pct">${cnt} (%${pct})</div></div>`;
      });
      html += `</div>`;

      html += `<div style="background:var(--card);border:1px solid var(--border);border-radius:var(--r);padding:1.2rem">
    <div style="font-family:'Nunito',sans-serif;font-size:.95rem;font-weight:700;color:#fff;margin-bottom:1rem">Konu Dağılımı (Top 15)</div>`;
      Object.entries(topicCounts).sort((a, b) => b[1] - a[1]).slice(0, 15).forEach(([topic, cnt]) => {
        const pct = Math.round(cnt / total * 100);
        html += `<div class="bar-row"><div class="bar-label" style="font-size:.75rem">${topic}</div><div class="bar-track"><div class="bar-fill" style="width:${pct}%;background:var(--purple)"></div></div><div class="bar-pct">${cnt}</div></div>`;
      });
      html += `</div>`;
      el.innerHTML = html;
    }

    /* ═══════════════════════════════════════════════════
       HELPERS
    ═══════════════════════════════════════════════════ */
    function safeJSON(val, def) {
      if (val === null || val === undefined) return def;
      if (typeof val === 'object') return val;
      try { return JSON.parse(val); } catch { return def; }
    }

    function esc(str) {
      return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    let toastTimer;
    function toast(msg, type = 'ok') {
      const el = document.getElementById('toast');
      el.className = `toast ${type}`;
      el.textContent = (type === 'ok' ? '✓ ' : '✕ ') + msg;
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => { el.className = 'toast'; }, 3000);
    }

    /* ═══════════════════════════════════════════════════
       PEKİŞTİRME SORULARI — LİSTE
    ═══════════════════════════════════════════════════ */
    let allRfQuestions = [];
    let filteredRfQuestions = [];
    let rfPage = 0;
    const RF_PAGE_SIZE = 20;

    async function loadRfQuestions() {
      document.getElementById('rf-tbody').innerHTML = `<tr><td colspan="7"><div class="loading-row"><div class="spinner"></div> Yükleniyor...</div></td></tr>`;
      const { data, error } = await sb.from('reinforcement_questions').select('*').order('id');
      if (error) { toast('Yükleme hatası: ' + error.message, 'fail'); return; }
      allRfQuestions = data || [];
      updateRfStats();
      applyRfFilters();
    }

    function updateRfStats() {
      const total = allRfQuestions.length;
      document.getElementById('rf-st-total').textContent = total;
      document.getElementById('rf-st-1m').textContent = allRfQuestions.filter(q => q.level == 1 && q.type === 'math').length;
      document.getElementById('rf-st-1t').textContent = allRfQuestions.filter(q => q.level == 1 && q.type === 'tr').length;
      document.getElementById('rf-st-2m').textContent = allRfQuestions.filter(q => q.level == 2 && q.type === 'math').length;
      document.getElementById('rf-st-2t').textContent = allRfQuestions.filter(q => q.level == 2 && q.type === 'tr').length;
      document.getElementById('rf-st-3').textContent = allRfQuestions.filter(q => q.level == 3).length;
      document.getElementById('rf-count-sub').textContent = `${total} pekiştirme sorusu kayıtlı`;
    }

    function applyRfFilters() {
      const search = document.getElementById('rf-search-inp').value.toLowerCase();
      const lv = document.getElementById('rf-filter-level').value;
      const tp = document.getElementById('rf-filter-type').value;
      filteredRfQuestions = allRfQuestions.filter(q => {
        const matchSearch = !search || (q.question_text || '').toLowerCase().includes(search) || (q.subtopic || '').toLowerCase().includes(search);
        const matchLv = !lv || String(q.level) === lv;
        const matchTp = !tp || q.type === tp;
        return matchSearch && matchLv && matchTp;
      });
      rfPage = 0;
      renderRfTable();
    }

    function renderRfTable() {
      const start = rfPage * RF_PAGE_SIZE;
      const page = filteredRfQuestions.slice(start, start + RF_PAGE_SIZE);
      const lvClass = { 1: 'badge-lv1', 2: 'badge-lv2', 3: 'badge-lv3' };
      const fmtLabel = { mcq: 'ÇSM', tf: 'D/Y', blank: 'Boşluk', sort: 'Sıralama', drag: 'Sürükle', match: 'Eşle', read: 'Okuma', write: 'Yazı', word_sort: 'Kelime' };

      if (page.length === 0) {
        document.getElementById('rf-tbody').innerHTML = `<tr><td colspan="7" class="empty-state">Pekiştirme sorusu bulunamadı.</td></tr>`;
        document.getElementById('rf-pagination').innerHTML = '';
        return;
      }

      document.getElementById('rf-tbody').innerHTML = page.map(q => `
        <tr>
          <td style="color:var(--text3);font-size:.78rem">${q.id}</td>
          <td><span class="badge ${lvClass[q.level] || 'badge-lv1'}">G${q.level}</span></td>
          <td><span class="badge ${q.type === 'math' ? 'badge-math' : 'badge-tr'}">${q.type === 'math' ? 'Mat.' : 'Tr.'}</span></td>
          <td><span class="fmt-chip">${fmtLabel[q.format] || q.format}</span></td>
          <td style="font-size:.8rem;color:var(--text2);max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${q.subtopic || '—'}</td>
          <td><div class="q-preview">${q.question_text || '—'}</div></td>
          <td>
            <div class="action-cell">
              <button class="btn sm" onclick="editRfQuestion(${q.id})">✏️ Düzenle</button>
              <button class="btn sm danger" onclick="deleteRfQuestion(${q.id})">🗑</button>
            </div>
          </td>
        </tr>`).join('');

      const total = filteredRfQuestions.length;
      const totalPages = Math.ceil(total / RF_PAGE_SIZE);
      let paginationHtml = `<span>${start + 1}–${Math.min(start + RF_PAGE_SIZE, total)} / ${total} soru</span><div class="page-btns">`;
      for (let i = 0; i < totalPages; i++) {
        paginationHtml += `<button class="page-btn ${i === rfPage ? 'active' : ''}" onclick="goRfPage(${i})">${i + 1}</button>`;
      }
      paginationHtml += '</div>';
      document.getElementById('rf-pagination').innerHTML = paginationHtml;
    }

    function goRfPage(n) { rfPage = n; renderRfTable(); }

    /* ═══════════════════════════════════════════════════
       PEKİŞTİRME — FORM
    ═══════════════════════════════════════════════════ */
    let editingRfId = null;

    function getRfFormHtml(q = {}) {
      const fmt = q.format || 'mcq';
      return `
        <div style="background:rgba(251,191,36,.06);border:1px solid rgba(251,191,36,.2);border-radius:var(--rsm);padding:.65rem .9rem;margin-bottom:1rem;font-size:.8rem;color:var(--amber);font-weight:600">
          🔥 Pekiştirme sorusu — sadece ilgili gezegende ve derste kullanılır
        </div>
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">Gezegen (Yaş Grubu) *</label>
            <select class="form-select" id="rff-level">
              <option value="1" ${q.level == 1 ? 'selected' : ''}>Dünya</option>
              <option value="2" ${q.level == 2 ? 'selected' : ''}>Ay</option>
              <option value="3" ${q.level == 3 ? 'selected' : ''}>Mars</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Ders (Pekiştirme Türü) *</label>
            <select class="form-select" id="rff-type">
              <option value="math" ${q.type === 'math' ? 'selected' : ''}>🧮 Matematik</option>
              <option value="tr"   ${q.type === 'tr' ? 'selected' : ''}>📖 Türkçe</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Format</label>
            <select class="form-select" id="rff-format" onchange="rerenderRfDynamic()">
              <option value="mcq"   ${fmt === 'mcq' ? 'selected' : ''}>Çoktan Seçmeli</option>
              <option value="tf"    ${fmt === 'tf' ? 'selected' : ''}>Doğru / Yanlış</option>
              <option value="blank" ${fmt === 'blank' ? 'selected' : ''}>Boşluk Doldur</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Konu / Alt Başlık</label>
            <input class="form-input" id="rff-subtopic" value="${esc(q.subtopic || '')}" placeholder="örn. Çarpım tablosu">
          </div>
          <div class="form-group form-full">
            <label class="form-label">Sahne Metni (opsiyonel)</label>
            <textarea class="form-textarea" id="rff-scene" placeholder="Hikaye bağlamı...">${esc(q.scene || '')}</textarea>
          </div>
          <div class="form-group form-full">
            <label class="form-label">Soru Metni *</label>
            <textarea class="form-textarea" id="rff-qtext" placeholder="Soru buraya...">${esc(q.question_text || '')}</textarea>
          </div>
          <div class="form-group form-full">
            <label class="form-label">Şablon Metin (boşluk doldur için)</label>
            <textarea class="form-textarea" id="rff-template" placeholder="Şablon cümle...">${esc(q.template_text || '')}</textarea>
          </div>
        </div>
        <div id="rff-dynamic-area">${getRfDynamicFields(fmt, q)}</div>
        <div class="form-grid" style="margin-top:.9rem">
          <div class="form-group">
            <label class="form-label">Doğru Cevap Geri Bildirimi</label>
            <textarea class="form-textarea" id="rff-fbok" placeholder="Doğru cevap için mesaj...">${esc(q.feedback_ok || '')}</textarea>
          </div>
          <div class="form-group">
            <label class="form-label">Yanlış Cevap Geri Bildirimi</label>
            <textarea class="form-textarea" id="rff-fbno" placeholder="Yanlış cevap için mesaj...">${esc(q.feedback_fail || '')}</textarea>
          </div>
        </div>`;
    }

    function getRfDynamicFields(fmt, q = {}) {
      const opts = safeJSON(q.options, []);
      const corr = q.correct_answer;
      if (fmt === 'mcq') {
        const corrIdx = typeof corr === 'number' ? corr : safeJSON(corr, 0);
        const baseOpts = opts.length ? opts : ['', '', '', ''];
        let html = `<div class="dynamic-field"><div class="dynamic-field-title">Seçenekler (doğru olanı işaretle)</div>`;
        baseOpts.forEach((o, i) => {
          html += `<div class="pair-row">
            <input type="radio" name="rff-mcq-correct" value="${i}" ${corrIdx === i ? 'checked' : ''} style="flex-shrink:0">
            <input class="form-input" id="rff-mcq-opt-${i}" value="${esc(o)}" placeholder="Seçenek ${i + 1}" style="flex:1">
            <button class="rm-btn" onclick="this.parentNode.remove()">✕</button>
          </div>`;
        });
        html += `<button class="add-pair-btn" onclick="addRfMcqOpt()">+ Seçenek Ekle</button></div>`;
        return html;
      }
      if (fmt === 'tf') {
        const corrBool = typeof corr === 'boolean' ? corr : safeJSON(corr, true);
        return `<div class="dynamic-field"><div class="dynamic-field-title">Doğru Cevap</div>
          <div style="display:flex;gap:1rem;margin-top:.3rem">
            <label style="display:flex;align-items:center;gap:.4rem;cursor:pointer;font-size:.9rem;color:var(--text)"><input type="radio" name="rff-tf-corr" value="true"  ${corrBool === true ? 'checked' : ''}>Doğru</label>
            <label style="display:flex;align-items:center;gap:.4rem;cursor:pointer;font-size:.9rem;color:var(--text)"><input type="radio" name="rff-tf-corr" value="false" ${corrBool === false ? 'checked' : ''}>Yanlış</label>
          </div></div>`;
      }
      if (fmt === 'blank') {
        const corrStr = typeof corr === 'string' ? corr : (corr !== undefined ? String(corr) : '');
        return `<div class="dynamic-field"><div class="dynamic-field-title">Doğru Cevap</div>
          <input class="form-input" id="rff-blank-correct" value="${esc(corrStr)}" placeholder="Doğru cevap">
          <div class="form-hint">Birden fazla kabul: eğitim/öğretim gibi / ile ayır</div></div>`;
      }
      return '';
    }

    function rerenderRfDynamic() {
      const fmt = document.getElementById('rff-format')?.value;
      if (fmt) document.getElementById('rff-dynamic-area').innerHTML = getRfDynamicFields(fmt, {});
    }

    function addRfMcqOpt() {
      let c = 0;
      while (document.getElementById(`rff-mcq-opt-${c}`)) c++;
      const btn = document.querySelector('#rff-dynamic-area .add-pair-btn');
      btn.insertAdjacentHTML('beforebegin', `<div class="pair-row">
        <input type="radio" name="rff-mcq-correct" value="${c}" style="flex-shrink:0">
        <input class="form-input" id="rff-mcq-opt-${c}" placeholder="Seçenek ${c + 1}" style="flex:1">
        <button class="rm-btn" onclick="this.parentNode.remove()">✕</button>
      </div>`);
    }

    function collectRfFormData(container) {
      const g = (id) => container ? container.querySelector('#' + id) : document.getElementById(id);
      const fmt = g('rff-format')?.value;
      let options = null, correct_answer = null;
      if (fmt === 'mcq') {
        options = []; let i = 0;
        while (g(`rff-mcq-opt-${i}`)) { options.push(g(`rff-mcq-opt-${i}`).value); i++; }
        const checked = (container || document).querySelector('input[name="rff-mcq-correct"]:checked');
        correct_answer = checked ? parseInt(checked.value) : 0;
      } else if (fmt === 'tf') {
        const v = (container || document).querySelector('input[name="rff-tf-corr"]:checked')?.value;
        correct_answer = v === 'true';
      } else if (fmt === 'blank') {
        correct_answer = g('rff-blank-correct')?.value.trim() || '';
      }
      return {
        level: parseInt(g('rff-level')?.value || 1),
        type: g('rff-type')?.value || 'math',
        format: fmt,
        subtopic: g('rff-subtopic')?.value.trim() || '',
        scene: g('rff-scene')?.value.trim() || null,
        question_text: g('rff-qtext')?.value.trim() || '',
        template_text: g('rff-template')?.value.trim() || null,
        options: options ? JSON.stringify(options) : null,
        correct_answer: correct_answer !== null ? JSON.stringify(correct_answer) : null,
        feedback_ok: g('rff-fbok')?.value.trim() || '',
        feedback_fail: g('rff-fbno')?.value.trim() || '',
      };
    }

    function renderRfAddForm() {
      const area = document.getElementById('rf-add-form-area');
      if (!area) return;
      editingRfId = null;
      area.innerHTML = getRfFormHtml({}) + `
        <div style="margin-top:1rem;display:flex;justify-content:flex-end;gap:.6rem">
          <button class="btn" onclick="renderRfAddForm()">Temizle</button>
          <button class="btn primary" onclick="saveRfNew()" style="background:linear-gradient(135deg,#f59e0b,#f87171);border-color:transparent">🔥 Pekiştirme Sorusunu Kaydet</button>
        </div>`;
    }

    async function saveRfNew() {
      const container = document.getElementById('rf-add-form-area');
      const data = collectRfFormData(container);
      if (!data.question_text) { toast('Soru metni boş olamaz!', 'fail'); return; }
      const { error } = await sb.from('reinforcement_questions').insert([data]);
      if (error) { toast('Hata: ' + error.message, 'fail'); return; }
      toast('Pekiştirme sorusu eklendi!', 'ok');
      renderRfAddForm();
      loadRfQuestions();
    }

    function openRfModal(q = {}) {
      editingRfId = q.id || null;
      document.getElementById('modal-title').textContent = editingRfId ? 'Pekiştirme Sorusu Düzenle' : 'Pekiştirme Sorusu Ekle';
      document.getElementById('modal-body').innerHTML = getRfFormHtml(q);
      document.getElementById('modal-save-btn').onclick = saveRfQuestion;
      document.getElementById('modal-overlay').classList.add('open');
    }

    async function saveRfQuestion() {
      const modalBody = document.getElementById('modal-body');
      const data = collectRfFormData(modalBody);
      if (!data.question_text) { toast('Soru metni boş olamaz!', 'fail'); return; }
      const btn = document.getElementById('modal-save-btn');
      btn.textContent = 'Kaydediliyor...'; btn.disabled = true;
      try {
        let error;
        if (editingRfId) {
          ({ error } = await sb.from('reinforcement_questions').update(data).eq('id', editingRfId));
        } else {
          ({ error } = await sb.from('reinforcement_questions').insert([data]));
        }
        if (error) throw error;
        toast(editingRfId ? 'Pekiştirme sorusu güncellendi!' : 'Pekiştirme sorusu eklendi!', 'ok');
        closeModal();
        loadRfQuestions();
      } catch (e) {
        toast('Hata: ' + e.message, 'fail');
      } finally {
        btn.textContent = 'Kaydet'; btn.disabled = false;
      }
    }

    function editRfQuestion(id) {
      const q = allRfQuestions.find(x => x.id === id);
      if (!q) return;
      openRfModal(q);
    }

    async function deleteRfQuestion(id) {
      if (!confirm('Bu pekiştirme sorusunu silmek istediğinden emin misin?')) return;
      const { error } = await sb.from('reinforcement_questions').delete().eq('id', id);
      if (error) { toast('Silme hatası: ' + error.message, 'fail'); return; }
      toast('Pekiştirme sorusu silindi.', 'ok');
      loadRfQuestions();
    }
    /* ═══════════════════════════════════════════════════
       MAĞAZA YÖNETİMİ
    ═══════════════════════════════════════════════════ */
    let allShopItems = [];
    let editingShopId = null;

    async function loadShopItems() {
      document.getElementById('shop-tbody').innerHTML = `<tr><td colspan="7"><div class="loading-row"><div class="spinner"></div> Yükleniyor...</div></td></tr>`;
      const { data, error } = await sb.from('shop_items').select('id,name,emoji,description,price,active,item_type,svg_data').order('price');
      if (error) { toast('Yükleme hatası: ' + error.message, 'fail'); return; }
      allShopItems = data || [];
      updateShopStats();
      renderShopTable();
    }

    function updateShopStats() {
      document.getElementById('shop-st-total').textContent = allShopItems.length;
      document.getElementById('shop-st-active').textContent = allShopItems.filter(i => i.active).length;
      document.getElementById('shop-st-inactive').textContent = allShopItems.filter(i => !i.active).length;
      document.getElementById('shop-count-sub').textContent = `${allShopItems.length} ürün kayıtlı`;
    }

    function renderShopTable() {
      if (!allShopItems.length) {
        document.getElementById('shop-tbody').innerHTML = `<tr><td colspan="7" class="empty-state">Henüz ürün eklenmemiş.</td></tr>`;
        return;
      }
      const jokerLabels = { half: '50/50', reveal: 'Cevap Göster', skip: 'XP’siz Atla', retry: 'Ekstra Hak', hint: 'İpucu', sort_helper: 'Sıralama Yard.', read_skip: 'Okuma Atla', write_skip: 'Yazma Atla' };
      document.getElementById('shop-tbody').innerHTML = allShopItems.map(item => {
        const visual = item.svg_data
          ? `<div style="width:36px;height:36px;margin:0 auto">${item.svg_data}</div>`
          : `<span style="font-size:1.4rem">${item.emoji || '🎁'}</span>`;
        const typeLabel = item.item_type ? jokerLabels[item.item_type] || item.item_type : '—';
        return `<tr>
          <td style="color:var(--text3);font-size:.78rem">${item.id}</td>
          <td style="text-align:center">${visual}</td>
          <td style="font-weight:600;color:var(--text)">${esc(item.name)}</td>
          <td><span style="font-size:.75rem;color:var(--purple);font-weight:600">${typeLabel}</span></td>
          <td style="font-size:.8rem;color:var(--text2);max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(item.description || '—')}</td>
          <td><span style="color:var(--amber);font-weight:700">⚡ ${item.price}</span></td>
          <td>
            <span class="badge ${item.active ? 'badge-math' : ''}" style="${item.active ? '' : 'background:rgba(79,142,247,.08);color:var(--text2)'}">
              ${item.active ? '✓ Aktif' : 'Pasif'}
            </span>
          </td>
          <td>
            <div class="action-cell">
              <button class="btn sm" onclick="editShopItem(${item.id})">✏️ Düzenle</button>
              <button class="btn sm danger" onclick="deleteShopItem(${item.id})">🗑</button>
            </div>
          </td>
        </tr>`;
      }).join('');
    }

    function getShopFormHtml(item = {}) {
      const hasSvg = !!item.svg_data;
      return `
        <!-- SVG önizleme -->
        <div id="sf-svg-preview" style="text-align:center;margin-bottom:1rem;${hasSvg ? '' : 'display:none'}">
          <div style="font-size:.72rem;color:var(--text2);margin-bottom:.4rem;font-weight:600;text-transform:uppercase;letter-spacing:.06em">Yüklü Görsel</div>
          <div id="sf-svg-preview-inner" style="width:80px;height:80px;margin:0 auto;background:var(--card2);border:1px solid var(--border);border-radius:var(--rsm);display:flex;align-items:center;justify-content:center;overflow:hidden">
            ${hasSvg ? item.svg_data : ''}
          </div>
          <button class="btn sm danger" style="margin-top:.4rem" onclick="clearSvg()">Görseli Kaldır</button>
        </div>

        <div class="form-grid">
          <!-- SVG Yükleme -->
          <div class="form-group form-full">
            <label class="form-label">Ürün Görseli ${hasSvg ? '— mevcut görsel yüklü' : ''}</label>
            <div style="background:var(--card2);border:1.5px dashed var(--border);border-radius:var(--rsm);padding:1rem;text-align:center;cursor:pointer;transition:border-color .15s"
                 ondragover="event.preventDefault();this.style.borderColor='var(--blue)'"
                 ondragleave="this.style.borderColor=''"
                 ondrop="handleSvgDrop(event)">
              <div style="font-size:1.5rem;margin-bottom:.3rem">📁</div>
              <div style="font-size:.8rem;color:var(--text2);margin-bottom:.5rem">Görseli buraya sürükle ya da seç</div>
              <input type="file" id="sf-svg-file" accept=".svg,image/svg+xml,.jpg,.jpeg,.png,image/jpeg,image/png" style="display:none" onchange="handleSvgFile(this)">
              <button class="btn sm" onclick="document.getElementById('sf-svg-file').click()">Görsel Seç</button>
            </div>
            <div class="form-hint">SVG, JPG veya PNG — maksimum 500KB</div>
          </div>
          <!-- Gizli SVG data -->
          <input type="hidden" id="sf-svg-data" value="${hasSvg ? 'HAS_SVG' : ''}">

          <div class="form-group">
            <label class="form-label">Emoji (SVG yoksa gösterilir)</label>
            <input class="form-input" id="sf-emoji" value="${esc(item.emoji || '')}" placeholder="🎁" style="font-size:1.4rem;text-align:center">
          </div>
          <div class="form-group">
            <label class="form-label">Fiyat (XP) *</label>
            <input class="form-input" id="sf-price" type="number" min="1" value="${item.price || 10}" placeholder="10">
          </div>
          <div class="form-group form-full">
            <label class="form-label">Ürün Adı *</label>
            <input class="form-input" id="sf-name" value="${esc(item.name || '')}" placeholder="örn. 50/50 Joker Kartı">
          </div>
          <div class="form-group form-full">
            <label class="form-label">Joker Tipi *</label>
            <select class="form-select" id="sf-item-type">
              <option value="" ${!item.item_type ? 'selected' : ''}>— Seç —</option>
              <option value="half"       ${item.item_type === 'half'       ? 'selected' : ''}>50/50 — İki yanlış şıkkı siler (sadece çok şıklıda)</option>
              <option value="reveal"     ${item.item_type === 'reveal'     ? 'selected' : ''}>Cevabı Göster — İpucu/doğru cevabı işaretler</option>
              <option value="skip"       ${item.item_type === 'skip'       ? 'selected' : ''}>XP’siz Atla — XP kaybı olmadan soruyu geç</option>
              <option value="retry"      ${item.item_type === 'retry'      ? 'selected' : ''}>Ekstra Hak — Yanlıştan sonra yeniden dene hakkı</option>
              <option value="hint"       ${item.item_type === 'hint'       ? 'selected' : ''}>İpucu — Soruyla ilgili yönlendirici bir ipucu gösterir (cevabı vermez)</option>
              <option value="sort_helper"${item.item_type === 'sort_helper'? 'selected' : ''}>Sıralama Yardımı — Sıralama sorularında ilk 3 öğeyi otomatik yerleştirir</option>
              <option value="read_skip"  ${item.item_type === 'read_skip'  ? 'selected' : ''}>Okuma Atla — Okuma sorularında seçilen bir kelime okunmadan atlanır</option>
              <option value="write_skip" ${item.item_type === 'write_skip' ? 'selected' : ''}>Yazma Atla — Yazma sorularında seçilen bir kelime yazılmadan geçilir</option>
            </select>
            <div class="form-hint">Joker tipi, oyun içinde bu ürünün ne yapacağını belirler</div>
          </div>
          <div class="form-group form-full">
            <label class="form-label">Açıklama</label>
            <textarea class="form-textarea" id="sf-desc" placeholder="Oyuncuya gösterilecek kısa açıklama...">${esc(item.description || '')}</textarea>
          </div>
          <div class="form-group form-full">
            <label class="form-label">Durum</label>
            <select class="form-select" id="sf-active">
              <option value="true"  ${item.active !== false ? 'selected' : ''}>✓ Aktif — Mağazada görünür</option>
              <option value="false" ${item.active === false ? 'selected' : ''}>Pasif — Gizli</option>
            </select>
          </div>
        </div>
        <div style="margin-top:1rem;display:flex;justify-content:flex-end;gap:.6rem">
          <button class="btn" onclick="renderShopForm()">Temizle</button>
          <button class="btn primary" onclick="saveShopItem()" style="background:linear-gradient(135deg,var(--amber),#f97316);border-color:transparent;color:#000">
            🛒 ${item.id ? 'Güncelle' : 'Ürünü Kaydet'}
          </button>
        </div>`;
    }

    function renderShopForm(item = {}) {
      editingShopId = item.id || null;
      _currentSvgData = null;
      const area = document.getElementById('shop-form-area');
      if (area) area.innerHTML = getShopFormHtml(item);
    }

    function editShopItem(id) {
      const item = allShopItems.find(i => i.id === id);
      if (!item) return;
      showPage('add-shop');
      renderShopForm(item);
    }

    // SVG yükleme yardımcıları
    let _currentSvgData = null; // düzenlemede mevcut SVG'yi sakla

    function handleSvgFile(input) {
      const file = input.files[0];
      if (!file) return;
      const isSvg = file.name.toLowerCase().endsWith('.svg') || file.type === 'image/svg+xml';
      const isImg = /\.(jpe?g|png)$/i.test(file.name) || file.type === 'image/jpeg' || file.type === 'image/png';
      if (!isSvg && !isImg) {
        toast('Yalnızca SVG, JPG veya PNG formatı kabul edilir!', 'fail'); return;
      }
      if (file.size > 500 * 1024) {
        toast("Dosya 500KB'dan küçük olmalı!", "fail"); return;
      }
      const reader = new FileReader();
      if (isSvg) {
        reader.onload = e => {
          let svgText = e.target.result;
          svgText = svgText.replace(/<script[\s\S]*?<\/script>/gi, '');
          svgText = svgText.replace(/\s(width|height)="[^"]*"/g, '');
          if (!svgText.includes('viewBox')) {
            svgText = svgText.replace('<svg', '<svg viewBox="0 0 100 100"');
          }
          svgText = svgText.replace('<svg', '<svg width="100%" height="100%"');
          _currentSvgData = svgText;
          document.getElementById('sf-svg-data').value = 'HAS_SVG';
          const preview = document.getElementById('sf-svg-preview');
          const inner = document.getElementById('sf-svg-preview-inner');
          if (preview && inner) { inner.innerHTML = svgText; preview.style.display = 'block'; }
          toast('SVG yüklendi!', 'ok');
        };
        reader.readAsText(file);
      } else {
        reader.onload = e => {
          const dataUrl = e.target.result;
          const imgTag = '<img src="' + dataUrl + '" style="width:100%;height:100%;object-fit:contain">';
          _currentSvgData = imgTag;
          document.getElementById('sf-svg-data').value = 'HAS_SVG';
          const preview = document.getElementById('sf-svg-preview');
          const inner = document.getElementById('sf-svg-preview-inner');
          if (preview && inner) { inner.innerHTML = imgTag; preview.style.display = 'block'; }
          toast('Görsel yüklendi!', 'ok');
        };
        reader.readAsDataURL(file);
      }
    }

    function handleSvgDrop(e) {
      e.preventDefault();
      e.currentTarget.style.borderColor = '';
      const file = e.dataTransfer.files[0];
      if (file) {
        const fakeInput = { files: [file] };
        handleSvgFile(fakeInput);
      }
    }

    function clearSvg() {
      _currentSvgData = null;
      document.getElementById('sf-svg-data').value = '';
      const preview = document.getElementById('sf-svg-preview');
      const inner = document.getElementById('sf-svg-preview-inner');
      if (preview) preview.style.display = 'none';
      if (inner) inner.innerHTML = '';
      const fileInput = document.getElementById('sf-svg-file');
      if (fileInput) fileInput.value = '';
      toast('Görsel kaldırıldı.', 'ok');
    }

    async function saveShopItem() {
      const name = document.getElementById('sf-name')?.value.trim();
      const price = parseInt(document.getElementById('sf-price')?.value || '0');
      const itype = document.getElementById('sf-item-type')?.value;
      if (!name) { toast('Ürün adı boş olamaz!', 'fail'); return; }
      if (!price || price < 1) { toast('Geçerli bir fiyat gir!', 'fail'); return; }
      if (!itype) { toast('Joker tipini seç!', 'fail'); return; }

      const svgFlag = document.getElementById('sf-svg-data')?.value;
      // _currentSvgData yeni yüklendi mi? yoksa mevcut kaydı koru mu?
      let svgToSave = undefined; // undefined = kolonu değiştirme
      if (_currentSvgData) {
        svgToSave = _currentSvgData; // yeni yükleme
      } else if (!svgFlag) {
        svgToSave = null; // clearSvg çağrıldı — sil
      }
      // svgFlag === 'HAS_SVG' && !_currentSvgData → mevcut kayıt korunsun (undefined bırak)

      const data = {
        name,
        item_type: itype,
        emoji: document.getElementById('sf-emoji')?.value.trim() || null,
        description: document.getElementById('sf-desc')?.value.trim() || null,
        price,
        active: document.getElementById('sf-active')?.value === 'true',
      };
      if (svgToSave !== undefined) data.svg_data = svgToSave;

      let error;
      if (editingShopId) {
        ({ error } = await sb.from('shop_items').update(data).eq('id', editingShopId));
      } else {
        ({ error } = await sb.from('shop_items').insert([data]));
      }
      if (error) { toast('Hata: ' + error.message, 'fail'); return; }
      toast(editingShopId ? 'Ürün güncellendi!' : 'Ürün eklendi!', 'ok');
      editingShopId = null;
      _currentSvgData = null;
      renderShopForm();
      loadShopItems();
    }

    async function deleteShopItem(id) {
      if (!confirm('Bu ürünü silmek istediğinden emin misin?')) return;
      const { error } = await sb.from('shop_items').delete().eq('id', id);
      if (error) { toast('Silme hatası: ' + error.message, 'fail'); return; }
      toast('Ürün silindi.', 'ok');
      loadShopItems();
    }
    /* ═══════════════════════════════════════════════════
       OYUNCU RAPORLARI
    ═══════════════════════════════════════════════════ */
    let allReports = [];
    let filteredReports = [];

    async function loadReports() {
      document.getElementById('rp-tbody').innerHTML =
        `<tr><td colspan="11"><div class="loading-row"><div class="spinner"></div>Yükleniyor...</div></td></tr>`;
      const { data, error } = await sb
        .from('game_results')
        .select('id,player_name,character,planet_level,score,score_pct,math_pct,tr_pct,weak_topics,strong_topics,mid_topics,topic_breakdown,assessment_text,xp_earned,duration_sec,wrong_count,played_at')
        .order('played_at', { ascending: false })
        .limit(500);
      if (error) { toast('Yükleme hatası: ' + error.message, 'fail'); return; }
      allReports = data || [];
      populatePlayerFilter();
      updateReportStats();
      applyReportFilters();
    }

    async function deletePlayerGameResults() {
      const inp = document.getElementById('rp-delete-player');
      const name = (inp && inp.value ? inp.value : '').trim();
      if (!name) {
        toast('Oyuncu adını yaz.', 'fail');
        if (inp) inp.focus();
        return;
      }
      const localCount = allReports.filter(r => r.player_name === name).length;
      const confirmMsg = localCount > 0
        ? `"${name}" için sunucuda kayıtlı tüm oyun sonuçları silinecek (${localCount} kayıt bu listede görünüyor). Sıralama ve raporlardan kalkar. Emin misin?`
        : `"${name}" bu sayfadaki son 500 kayıtta yok; yine de sunucuda bu isimle eşleşen TÜM kayıtlar silinecek. Emin misin?`;
      if (!confirm(confirmMsg)) return;

      const { data: deletedRows, error } = await sb
        .from('game_results')
        .delete()
        .eq('player_name', name)
        .select('id');

      if (error) {
        toast('Silme hatası: ' + error.message, 'fail');
        return;
      }
      const n = (deletedRows || []).length;
      if (n === 0) {
        toast('Bu isimle eşleşen sunucu kaydı bulunamadı.', 'fail');
        return;
      }
      toast(`${n} kayıt silindi.`, 'ok');
      if (inp) inp.value = '';
      loadReports();
    }

    function populatePlayerFilter() {
      const sel = document.getElementById('rp-filter-player');
      const players = [...new Set(allReports.map(r => r.player_name).filter(Boolean))].sort();
      sel.innerHTML = '<option value="">Tüm Oyuncular</option>' +
        players.map(p => `<option value="${esc(p)}">${esc(p)}</option>`).join('');
    }

    function applyReportFilters() {
      const player = document.getElementById('rp-filter-player')?.value || '';
      const level = document.getElementById('rp-filter-level')?.value || '';
      filteredReports = allReports.filter(r => {
        const matchP = !player || r.player_name === player;
        const matchL = !level || String(r.planet_level) === level;
        return matchP && matchL;
      });
      updateReportStats();
      renderReportsTable();
    }

    function updateReportStats() {
      const data = filteredReports;
      const total = data.length;
      const players = new Set(data.map(r => r.player_name).filter(Boolean)).size;
      const avgPct = total > 0 ? Math.round(data.reduce((s, r) => s + (r.score_pct || 0), 0) / total) : 0;

      document.getElementById('rp-st-total').textContent = total;
      document.getElementById('rp-st-players').textContent = players;
      document.getElementById('rp-st-avg').textContent = total ? '%' + avgPct : '—';

      // En çok zayıf ders
      let mathWeak = 0, trWeak = 0;
      data.forEach(r => {
        if ((r.math_pct || 100) < 50) mathWeak++;
        if ((r.tr_pct || 100) < 50) trWeak++;
      });
      const weakSubj = mathWeak === 0 && trWeak === 0 ? '—'
        : mathWeak >= trWeak ? 'Matematik' : 'Türkçe';
      document.getElementById('rp-st-weaksubj').textContent = weakSubj;

      // Zayıf konu özeti
      const topicCount = {};
      data.forEach(r => {
        try {
          const weak = JSON.parse(r.weak_topics || '[]');
          weak.forEach(t => {
            const key = t.sub + ' (' + (t.type === 'math' ? 'Mat.' : 'Tr.') + ')';
            topicCount[key] = (topicCount[key] || 0) + 1;
          });
        } catch { }
      });
      const sorted = Object.entries(topicCount).sort((a, b) => b[1] - a[1]).slice(0, 8);
      const weakDiv = document.getElementById('rp-weak-summary');
      const weakList = document.getElementById('rp-weak-list');
      if (sorted.length > 0) {
        weakDiv.style.display = 'block';
        const maxCount = sorted[0][1];
        weakList.innerHTML = sorted.map(([topic, count]) => {
          const pct = Math.round((count / Math.max(total, 1)) * 100);
          const barW = Math.round((count / maxCount) * 100);
          return `<div class="bar-row">
            <div class="bar-label" style="font-size:.78rem">${esc(topic)}</div>
            <div class="bar-track"><div class="bar-fill" style="width:${barW}%;background:var(--red)"></div></div>
            <div class="bar-pct">${count} oyuncu (%${pct})</div>
          </div>`;
        }).join('');
      } else {
        weakDiv.style.display = 'none';
      }

      document.getElementById('reports-sub').textContent =
        `${total} oyun kaydı · ${players} farklı oyuncu`;

      // Mini sıralama — gezegen bazlı en iyi sonuçlar
      renderMiniLeaderboard(data);
    }

    function renderMiniLeaderboard(data) {
      const container = document.getElementById('rp-mini-lb');
      if (!container) return;

      // Gezegen bazlı grupla
      const byPlanet = { 1: [], 2: [], 3: [] };
      data.forEach(r => {
        const lv = r.planet_level;
        if (!byPlanet[lv]) return;
        byPlanet[lv].push(r);
      });

      let html = '';
      [1, 2, 3].forEach(lv => {
        const rows = byPlanet[lv];
        if (!rows.length) return;

        // Oyuncu başına en iyi
        const best = {};
        rows.forEach(r => {
          const key = r.player_name || '?';
          if (!best[key] ||
            r.score_pct > best[key].score_pct ||
            (r.score_pct === best[key].score_pct && (r.duration_sec || 9999) < (best[key].duration_sec || 9999))) {
            best[key] = r;
          }
        });
        const sorted = Object.values(best)
          .sort((a, b) => b.score_pct - a.score_pct || (a.duration_sec || 9999) - (b.duration_sec || 9999))
          .slice(0, 5);

        const medals = ['🥇', '🥈', '🥉', '4.', '5.'];
        html += `<div style="margin-bottom:1rem">
          <div style="font-family:'Nunito',sans-serif;font-size:.85rem;font-weight:700;color:#fff;margin-bottom:.5rem">
            Gezegen ${lv} — Top 5
          </div>`;
        sorted.forEach((r, i) => {
          const dur = r.duration_sec
            ? `${Math.floor(r.duration_sec / 60)}:${String(r.duration_sec % 60).padStart(2, '0')}`
            : '—';
          const scoreCol = r.score_pct >= 70 ? 'var(--green)' : r.score_pct >= 50 ? 'var(--amber)' : 'var(--red)';
          const bonusTag = (r.wrong_count !== null && r.wrong_count !== undefined && r.wrong_count <= 2)
            ? '<span style="font-size:.65rem;color:var(--green);margin-left:.3rem" title="Bölüm bonusu aldı">+10✓</span>' : '';
          html += `<div style="display:flex;align-items:center;gap:.6rem;padding:.4rem 0;border-bottom:1px solid var(--border)">
            <span style="font-weight:800;width:1.8rem;text-align:center;font-size:.9rem">${medals[i]}</span>
            <span style="flex:1;font-size:.85rem;font-weight:600;color:var(--text)">${esc(r.player_name || '?')}</span>
            <span style="font-weight:700;color:${scoreCol}">${r.score_pct}%</span>${bonusTag}
            <span style="font-size:.78rem;color:var(--text2);font-variant-numeric:tabular-nums;min-width:3.5rem;text-align:right">${dur}</span>
          </div>`;
        });
        html += `</div>`;
      });

      container.innerHTML = html || '<p style="color:var(--text3);font-size:.85rem">Veri yok.</p>';
      container.closest('.rp-mini-lb-wrap') && (container.closest('.rp-mini-lb-wrap').style.display = html ? 'block' : 'none');
    }

    function renderReportsTable() {
      if (!filteredReports.length) {
        document.getElementById('rp-tbody').innerHTML =
          `<tr><td colspan="11" class="empty-state">Rapor bulunamadı.</td></tr>`;
        return;
      }

      document.getElementById('rp-tbody').innerHTML = filteredReports.map((r, idx) => {
        const mathCol = (r.math_pct || 0) >= 70 ? 'var(--green)' : (r.math_pct || 0) >= 50 ? 'var(--amber)' : 'var(--red)';
        const trCol = (r.tr_pct || 0) >= 70 ? 'var(--green)' : (r.tr_pct || 0) >= 50 ? 'var(--amber)' : 'var(--red)';
        const scoreCol = (r.score_pct || 0) >= 70 ? 'var(--green)' : (r.score_pct || 0) >= 50 ? 'var(--amber)' : 'var(--red)';

        const durStr = r.duration_sec
          ? `${Math.floor(r.duration_sec / 60)}:${String(r.duration_sec % 60).padStart(2, '0')}`
          : '—';
        const bonusTag = (r.wrong_count !== null && r.wrong_count !== undefined && r.wrong_count <= 2)
          ? '<span style="font-size:.65rem;color:var(--green);margin-left:.3rem">+10✓</span>' : '';

        let weakHtml = '—';
        try {
          const weak = JSON.parse(r.weak_topics || '[]');
          if (weak.length) weakHtml = weak.slice(0, 2).map(t =>
            `<span style="font-size:.68rem;background:rgba(248,113,113,.1);border:1px solid rgba(248,113,113,.25);color:var(--red);border-radius:4px;padding:.1rem .4rem">${esc(t.sub)}</span>`
          ).join(' ') + (weak.length > 2 ? `<span style="font-size:.68rem;color:var(--text3)">+${weak.length - 2}</span>` : '');
        } catch { }

        const dateStr = r.played_at ? new Date(r.played_at).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';

        return `<tr>
          <td style="font-weight:600;color:var(--text)">${esc(r.player_name || '?')}</td>
          <td style="font-size:.78rem;color:var(--text2)">${esc(r.character || '—')}</td>
          <td><span class="badge badge-lv${r.planet_level || 1}">G${r.planet_level || '?'}</span></td>
          <td><span style="font-weight:700;color:${scoreCol}">%${r.score_pct || 0}</span>${bonusTag}</td>
          <td style="font-size:.8rem;color:var(--text2);font-variant-numeric:tabular-nums">${durStr}</td>
          <td style="text-align:center;font-weight:600;color:${(r.wrong_count || 0) <= 2 ? 'var(--green)' : 'var(--red)'}">${r.wrong_count ?? '—'}</td>
          <td><span style="color:${mathCol};font-weight:600">%${r.math_pct || 0}</span></td>
          <td><span style="color:${trCol};font-weight:600">%${r.tr_pct || 0}</span></td>
          <td>${weakHtml}</td>
          <td style="font-size:.75rem;color:var(--text3)">${dateStr}</td>
          <td><button class="btn sm" onclick="showReportDetail(${idx})">Detay</button></td>
        </tr>`;
      }).join('');
    }

    function showReportDetail(idx) {
      const r = filteredReports[idx];
      if (!r) return;
      document.getElementById('rm-title').textContent =
        `${r.player_name || '?'} — Gezegen ${r.planet_level || '?'}`;

      let weakTopics = [], strongTopics = [], midTopics = [], breakdown = {};
      try { weakTopics = JSON.parse(r.weak_topics || '[]'); } catch { }
      try { strongTopics = JSON.parse(r.strong_topics || '[]'); } catch { }
      try { midTopics = JSON.parse(r.mid_topics || '[]'); } catch { }
      try { breakdown = JSON.parse(r.topic_breakdown || '{}'); } catch { }

      const dateStr = r.played_at
        ? new Date(r.played_at).toLocaleString('tr-TR')
        : '—';

      const mathCol = (r.math_pct || 0) >= 70 ? '#4ade80' : (r.math_pct || 0) >= 50 ? '#fbbf24' : '#f87171';
      const trCol = (r.tr_pct || 0) >= 70 ? '#4ade80' : (r.tr_pct || 0) >= 50 ? '#fbbf24' : '#f87171';

      // Konu kırılımı barları
      let breakdownHtml = '';
      Object.entries(breakdown).forEach(([sub, c]) => {
        const p = Math.round(c.ok / Math.max(c.tot, 1) * 100);
        const col = p >= 70 ? 'var(--green)' : p >= 50 ? 'var(--amber)' : 'var(--red)';
        breakdownHtml += `<div class="bar-row">
          <div class="bar-label" style="font-size:.75rem">${esc(sub)}</div>
          <div class="bar-track"><div class="bar-fill" style="width:${p}%;background:${col}"></div></div>
          <div class="bar-pct">${c.ok}/${c.tot} (%${p})</div>
        </div>`;
      });

      document.getElementById('rm-body').innerHTML = `
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:.6rem;margin-bottom:1rem">
          <div class="stat-card" style="padding:.75rem">
            <div class="stat-label">Toplam</div>
            <div class="stat-value" style="font-size:1.4rem;color:${(r.score_pct || 0) >= 70 ? 'var(--green)' : (r.score_pct || 0) >= 50 ? 'var(--amber)' : 'var(--red)'}">%${r.score_pct || 0}</div>
          </div>
          <div class="stat-card" style="padding:.75rem">
            <div class="stat-label">Matematik</div>
            <div class="stat-value" style="font-size:1.4rem;color:${mathCol}">%${r.math_pct || 0}</div>
          </div>
          <div class="stat-card" style="padding:.75rem">
            <div class="stat-label">Türkçe</div>
            <div class="stat-value" style="font-size:1.4rem;color:${trCol}">%${r.tr_pct || 0}</div>
          </div>
        </div>

        ${r.assessment_text ? `
        <div style="background:var(--card2);border:1px solid var(--border);border-radius:var(--rsm);padding:.9rem 1rem;margin-bottom:1rem">
          <div style="font-size:.72rem;color:var(--text2);font-weight:600;text-transform:uppercase;letter-spacing:.06em;margin-bottom:.4rem">📋 Otomatik Değerlendirme</div>
          <div style="font-size:.85rem;color:var(--text);line-height:1.7">${esc(r.assessment_text)}</div>
        </div>` : ''}

        ${breakdownHtml ? `
        <div style="margin-bottom:1rem">
          <div style="font-size:.78rem;font-weight:700;color:var(--text2);margin-bottom:.6rem">Konu Kırılımı</div>
          ${breakdownHtml}
        </div>` : ''}

        <div style="font-size:.75rem;color:var(--text3);border-top:1px solid var(--border);padding-top:.6rem;margin-top:.5rem">
          Karakter: ${esc(r.character || '—')} · XP: ${r.xp_earned || 0} · 
          Süre: ${r.duration_sec ? Math.floor(r.duration_sec / 60) + 'd ' + String(r.duration_sec % 60).padStart(2, '0') + 's' : '—'} · 
          Yanlış: ${r.wrong_count ?? '—'} ${(r.wrong_count !== null && r.wrong_count !== undefined && r.wrong_count <= 2) ? '✓ Bonus aldı' : ''} · 
          Tarih: ${dateStr}
        </div>`;

      document.getElementById('report-modal').classList.add('open');
    }
    /* ═══════════════════════════════════════════════════
       HATA BİLDİRİMLERİ
    ═══════════════════════════════════════════════════ */
    let allBugReports = [];
    let filteredBugReports = [];

    const BUG_REASON_LABELS = {
      game_bug: 'Oyun bozuldu',
      wrong_q: 'Soru hatalı',
      wrong_ans: 'Cevap hatalı',
      unclear: 'Soruyu anlamadım',
      other: 'Diğer',
    };

    const BUG_REASON_COLORS = {
      game_bug: 'var(--purple)',
      wrong_q: 'var(--red)',
      wrong_ans: 'var(--amber)',
      unclear: '#93c5fd',
      other: 'var(--text2)',
    };

    async function loadBugReports() {
      document.getElementById('bug-tbody').innerHTML =
        `<tr><td colspan="9"><div class="loading-row"><div class="spinner"></div>Yükleniyor...</div></td></tr>`;
      const { data, error } = await sb
        .from('bug_reports')
        .select('*')
        .order('reported_at', { ascending: false })
        .limit(500);
      if (error) { toast('Yükleme hatası: ' + error.message, 'fail'); return; }
      allBugReports = data || [];
      updateBugStats();
      applyBugFilters();
    }

    function updateBugStats() {
      const d = allBugReports;
      document.getElementById('bug-st-total').textContent = d.length;
      document.getElementById('bug-st-open').textContent = d.filter(r => !r.resolved).length;
      document.getElementById('bug-st-wrong-q').textContent = d.filter(r => r.reason === 'wrong_q').length;
      document.getElementById('bug-st-wrong-a').textContent = d.filter(r => r.reason === 'wrong_ans').length;
      document.getElementById('bug-st-game').textContent = d.filter(r => r.reason === 'game_bug').length;
      document.getElementById('bugs-sub').textContent = `${d.length} bildirim · ${d.filter(r => !r.resolved).length} açık`;
    }

    function applyBugFilters() {
      const reason = document.getElementById('bug-filter-reason')?.value || '';
      const level = document.getElementById('bug-filter-level')?.value || '';
      const status = document.getElementById('bug-filter-status')?.value || '';
      filteredBugReports = allBugReports.filter(r => {
        const matchR = !reason || r.reason === reason;
        const matchL = !level || String(r.planet_level) === level;
        const matchS = !status || (status === 'open' ? !r.resolved : !!r.resolved);
        return matchR && matchL && matchS;
      });
      renderBugTable();
    }

    function renderBugTable() {
      if (!filteredBugReports.length) {
        document.getElementById('bug-tbody').innerHTML =
          `<tr><td colspan="9" class="empty-state">Bildirim bulunamadı.</td></tr>`;
        return;
      }

      document.getElementById('bug-tbody').innerHTML = filteredBugReports.map((r, idx) => {
        const reasonLabel = BUG_REASON_LABELS[r.reason] || r.reason || '—';
        const reasonColor = BUG_REASON_COLORS[r.reason] || 'var(--text2)';
        const sourceLabel = r.source === 'reinforce' ? '🔥 Pekiştirme' : '🎮 Ana Oyun';
        const dateStr = r.reported_at
          ? new Date(r.reported_at).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
          : '—';
        const statusBadge = r.resolved
          ? `<span style="font-size:.72rem;background:rgba(74,222,128,.1);border:1px solid rgba(74,222,128,.3);color:var(--green);border-radius:4px;padding:.1rem .5rem">✓ Çözüldü</span>`
          : `<button class="btn sm success" onclick="resolveBug(${r.id}, ${idx})" title="Çözüldü olarak işaretle">Çöz</button>`;

        return `<tr>
          <td style="color:var(--text3);font-size:.75rem">${r.id}</td>
          <td style="font-size:.82rem;font-weight:600;color:var(--text)">${esc(r.player_name || '?')}</td>
          <td><span class="badge badge-lv${r.planet_level || 1}">G${r.planet_level || '?'}</span></td>
          <td style="font-size:.75rem;color:var(--text2)">${sourceLabel}</td>
          <td><span style="font-size:.78rem;font-weight:700;color:${reasonColor}">${reasonLabel}</span></td>
          <td style="font-size:.75rem;color:var(--text2);max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(r.question_text || '')}">${esc((r.question_text || '—').substring(0, 60))}${(r.question_text || '').length > 60 ? '…' : ''}</td>
          <td style="font-size:.75rem;color:var(--text2);max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(r.other_text || '—')}</td>
          <td style="font-size:.72rem;color:var(--text3)">${dateStr}</td>
          <td>${statusBadge}</td>
        </tr>`;
      }).join('');
    }

    async function resolveBug(id, idx) {
      const { error } = await sb.from('bug_reports').update({ resolved: true }).eq('id', id);
      if (error) { toast('Güncelleme hatası: ' + error.message, 'fail'); return; }
      toast('Bildirim çözüldü olarak işaretlendi.', 'ok');
      const r = filteredBugReports[idx];
      if (r) r.resolved = true;
      const orig = allBugReports.find(x => x.id === id);
      if (orig) orig.resolved = true;
      updateBugStats();
      renderBugTable();
    }
    /* ═══════════════════════════════════════════════════
       BÖLÜMLER
    ═══════════════════════════════════════════════════ */
    let allSections = [];
    let editingSectionId = null;

    async function loadAllSections() {
      const { data, error } = await sb.from('sections').select('*').order('planet_level').order('section_no');
      if (error) { toast('Bölümler yüklenemedi: ' + error.message, 'fail'); return; }
      allSections = data || [];
      renderSectionColumns();
      // Soru formundaki section dropdownunu da güncelle
      const lvEl = document.getElementById('f-level');
      if (lvEl) loadSectionOptions('f-section-id', lvEl.value, null);
      // Filtre dropdown'unu da güncelle
      const filterLv = document.getElementById('filter-level')?.value;
      if (filterLv) onFilterLevelChange();
    }

    function renderSectionColumns() {
      [1, 2, 3].forEach(lv => {
        const el = document.getElementById(`sec-list-${lv}`);
        if (!el) return;
        const secs = allSections.filter(s => s.planet_level === lv);
        if (!secs.length) {
          el.innerHTML = `<div style="font-size:.78rem;color:var(--text3);padding:.3rem 0">Henüz bölüm eklenmemiş.</div>`;
          return;
        }
        el.innerHTML = secs.map(s => `
          <div class="sec-item">
            <span class="sec-no">${s.section_no}</span>
            <span class="sec-name">${esc(s.name || 'Bölüm ' + s.section_no)}</span>
            ${s.is_locked ? '<span class="sec-locked-tag">🔒</span>' : ''}
            <button class="btn sm" onclick="editSection(${s.id})" style="flex-shrink:0;padding:.2rem .5rem;font-size:.7rem">✏</button>
            <button class="btn sm danger" onclick="deleteSection(${s.id})" style="flex-shrink:0;padding:.2rem .5rem;font-size:.7rem">🗑</button>
          </div>`).join('');
      });
    }

    function openSectionModal(presetLevel) {
      editingSectionId = null;
      document.getElementById('sec-modal-title').textContent = 'Yeni Bölüm';
      document.getElementById('sec-planet').value = presetLevel || 1;
      document.getElementById('sec-no').value = '';
      document.getElementById('sec-name').value = '';
      document.getElementById('sec-desc').value = '';
      document.getElementById('sec-locked').value = 'false';
      document.getElementById('section-modal').classList.add('open');
    }

    function editSection(id) {
      const s = allSections.find(x => x.id === id);
      if (!s) return;
      editingSectionId = id;
      document.getElementById('sec-modal-title').textContent = 'Bölümü Düzenle';
      document.getElementById('sec-planet').value = s.planet_level;
      document.getElementById('sec-no').value = s.section_no;
      document.getElementById('sec-name').value = s.name || '';
      document.getElementById('sec-desc').value = s.description || '';
      document.getElementById('sec-locked').value = s.is_locked ? 'true' : 'false';
      document.getElementById('section-modal').classList.add('open');
    }

    async function saveSection() {
      const name = document.getElementById('sec-name')?.value.trim();
      const no = parseInt(document.getElementById('sec-no')?.value || '0');
      const lv = parseInt(document.getElementById('sec-planet')?.value || '1');
      if (!name) { toast('Bölüm adı boş olamaz!', 'fail'); return; }
      if (!no) { toast('Bölüm numarası gerekli!', 'fail'); return; }

      const data = {
        planet_level: lv,
        section_no: no,
        name,
        description: document.getElementById('sec-desc')?.value.trim() || null,
        is_locked: document.getElementById('sec-locked')?.value === 'true',
      };

      let error;
      if (editingSectionId) {
        ({ error } = await sb.from('sections').update(data).eq('id', editingSectionId));
      } else {
        ({ error } = await sb.from('sections').insert([data]));
      }
      if (error) { toast('Hata: ' + error.message, 'fail'); return; }
      toast(editingSectionId ? 'Bölüm güncellendi!' : 'Bölüm eklendi!', 'ok');
      document.getElementById('section-modal').classList.remove('open');
      editingSectionId = null;
      loadAllSections();
    }

    async function deleteSection(id) {
      if (!confirm('Bu bölümü silmek istediğinden emin misin? Bu bölüme atanmış sorular etkilenmez.')) return;
      const { error } = await sb.from('sections').delete().eq('id', id);
      if (error) { toast('Silme hatası: ' + error.message, 'fail'); return; }
      toast('Bölüm silindi.', 'ok');
      loadAllSections();
    }

    /* Bölüm değiştirme — satırdan inline */
    async function changeQuestionSection(qId, sectionVal, selectEl) {
      const newSecId = sectionVal ? parseInt(sectionVal) : null;
      selectEl.disabled = true;
      const { error } = await sb.from('questions').update({ section_id: newSecId }).eq('id', qId);
      selectEl.disabled = false;
      if (error) {
        toast('Bölüm güncellenemedi: ' + error.message, 'fail');
        return;
      }
      // Yerel veriyi güncelle
      const q = allQuestions.find(x => x.id === qId);
      if (q) q.section_id = newSecId;
      const fq = filteredQuestions.find(x => x.id === qId);
      if (fq) fq.section_id = newSecId;
      // Görsel onay
      selectEl.style.borderColor = 'var(--green)';
      setTimeout(() => { selectEl.style.borderColor = ''; }, 1200);
    }

    /* Soru formundaki bölüm dropdown'unu doldur */
    async function loadSectionOptions(selectId, level, selectedId) {
      const sel = document.getElementById(selectId);
      if (!sel) return;
      sel.innerHTML = '<option value="">— Bölüm seç (opsiyonel) —</option>';
      if (!level) return;
      const secs = allSections.filter(s => s.planet_level == level);
      secs.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.id;
        opt.textContent = `${s.section_no}. ${s.name || 'Bölüm ' + s.section_no}`;
        if (selectedId && s.id == selectedId) opt.selected = true;
        sel.appendChild(opt);
      });
    }

    /* ═══════════════════════════════════════════════════
       SEVİYE TESPİT SORULARI
    ═══════════════════════════════════════════════════ */
    async function loadLevelTestQuestions() {
      try {
        console.log('Loading level test questions...');
        const { data, error } = await sb.from('level_test_questions').select('*').order('order_index', { ascending: true, nullsFirst: false }).order('id');
        if (error) {
          console.error('Load error:', error);
          throw error;
        }
        levelTestQuestions = data || [];
        console.log('Loaded questions:', levelTestQuestions.length);
        if (LT_SORT_MODE) {
          ltSortQuestions = levelTestQuestions.slice();
          renderLtSortTable();
        } else {
          renderLevelTestQuestions();
        }
      } catch (e) {
        console.error('Level test questions load error:', e);
        toast('Seviye tespit soruları yüklenemedi: ' + e.message, 'fail');
      }
    }

    function renderLevelTestQuestions() {
      const tbody = document.getElementById('level-test-tbody');
      if (!tbody) return;

      if (levelTestQuestions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" class="empty-state">Henüz seviye tespit sorusu eklenmemiş</td></tr>';
        updateLevelTestStats();
        return;
      }

      tbody.innerHTML = levelTestQuestions.map((q, i) => {
        const typeColor = q.type === 'math' ? 'var(--green)' : 'var(--blue)';
        const typeIcon = q.type === 'math' ? '🧮' : '📖';
        
        return '<tr>' +
          '<td style="display:none"></td>' +
          '<td><span class="order-badge">' + (i + 1) + '</span></td>' +
          '<td><span style="color:' + typeColor + '">' + typeIcon + ' ' + q.type + '</span></td>' +
          '<td style="max-width:280px;word-wrap:break-word">' + q.question_text + '</td>' +
          '<td>' + (q.options ? q.options[0] || '' : '') + '</td>' +
          '<td>' + (q.options ? q.options[1] || '' : '') + '</td>' +
          '<td>' + (q.options ? q.options[2] || '' : '') + '</td>' +
          '<td>' + (q.options ? q.options[3] || '' : '') + '</td>' +
          '<td><span style="color:var(--green);font-weight:600">' + (q.correct_answer + 1) + '</span></td>' +
          '<td>' +
            '<button class="btn sm" onclick="editLevelTestQuestion(\'' + q.id + '\')" style="margin-right:.3rem">Düzenle</button>' +
            '<button class="btn sm" onclick="deleteLevelTestQuestion(\'' + q.id + '\')" style="border-color:var(--red);color:var(--red)">Sil</button>' +
          '</td>' +
        '</tr>';
      }).join('');

      updateLevelTestStats();
    }

    function updateLevelTestStats() {
      const total = levelTestQuestions.length;
      const mathCount = levelTestQuestions.filter(q => q.type === 'math').length;
      const trCount = levelTestQuestions.filter(q => q.type === 'tr').length;
      const lastUpdated = levelTestQuestions.length > 0 ? new Date().toLocaleDateString('tr-TR') : '—';

      document.getElementById('lt-st-total').textContent = total;
      document.getElementById('lt-st-math').textContent = mathCount;
      document.getElementById('lt-st-tr').textContent = trCount;
      document.getElementById('lt-st-updated').textContent = lastUpdated;
    }

    function openLevelTestModal(id = null) {
      editingLevelTestId = id;
      const modal = document.getElementById('level-test-modal');
      const title = document.getElementById('lt-modal-title');
      
      if (id) {
        const q = levelTestQuestions.find(q => q.id === id);
        if (!q) return;
        
        title.textContent = 'Seviye Tespit Sorusunu Düzenle';
        document.getElementById('lt-question').value = q.question_text || '';
        document.getElementById('lt-type').value = q.type || 'math';
        document.getElementById('lt-opt-a').value = q.options ? q.options[0] || '' : '';
        document.getElementById('lt-opt-b').value = q.options ? q.options[1] || '' : '';
        document.getElementById('lt-opt-c').value = q.options ? q.options[2] || '' : '';
        document.getElementById('lt-opt-d').value = q.options ? q.options[3] || '' : '';
        document.getElementById('lt-correct').value = q.correct_answer || 0;
      } else {
        title.textContent = 'Yeni Seviye Tespit Sorusu';
        document.getElementById('lt-question').value = '';
        document.getElementById('lt-type').value = 'math';
        document.getElementById('lt-opt-a').value = '';
        document.getElementById('lt-opt-b').value = '';
        document.getElementById('lt-opt-c').value = '';
        document.getElementById('lt-opt-d').value = '';
        document.getElementById('lt-correct').value = '0';
      }
      
      modal.classList.add('open');
    }

    function editLevelTestQuestion(id) {
      const q = levelTestQuestions.find(q => q.id == id);
      if (!q) return;
      openLevelTestModal(q.id);
    }

    async function saveLevelTestQuestion() {
      const question = document.getElementById('lt-question').value.trim();
      const type = document.getElementById('lt-type').value;
      const optA = document.getElementById('lt-opt-a').value.trim();
      const optB = document.getElementById('lt-opt-b').value.trim();
      const optC = document.getElementById('lt-opt-c').value.trim();
      const optD = document.getElementById('lt-opt-d').value.trim();
      const correct = parseInt(document.getElementById('lt-correct').value);

      if (!question || !optA || !optB || !optC || !optD) {
        toast('Tüm alanları doldurun!', 'fail');
        return;
      }

      const questionData = {
        question_text: question,
        type: type,
        format: 'mcq',
        options: [optA, optB, optC, optD],
        correct_answer: correct
      };

      try {
        if (editingLevelTestId) {
          const { error } = await sb.from('level_test_questions').update(questionData).eq('id', editingLevelTestId);
            if (error) throw error;
          toast('Soru güncellendi!', 'ok');
        } else {
          const { error } = await sb.from('level_test_questions').insert([questionData]);
            if (error) throw error;
          toast('Soru eklendi!', 'ok');
        }
        
        document.getElementById('level-test-modal').classList.remove('open');
        await loadLevelTestQuestions();
      } catch (e) {
        toast('Hata: ' + e.message, 'fail');
      }
    }

    /* ── SEVİYE TESPİT SIRALAMA MODU ── */
    let LT_SORT_MODE = false;
    let ltSortQuestions = [];
    let ltDragSrcIdx = null;

    function toggleLtSortMode() {
      LT_SORT_MODE = !LT_SORT_MODE;
      const banner = document.getElementById('lt-sort-mode-banner');
      const btn = document.getElementById('btn-lt-sort-mode');
      const thDrag = document.getElementById('lt-th-drag');
      const addBtn = document.querySelector('#page-level-test .btn.primary');

      if (LT_SORT_MODE) {
        banner.classList.add('active');
        btn.textContent = '✕ Sıralama Modundan Çık';
        if (thDrag) thDrag.style.display = '';
        if (addBtn) addBtn.style.opacity = '.4';
        ltSortQuestions = levelTestQuestions.slice().sort((a, b) => {
          const oa = a.order_index != null ? a.order_index : 99999;
          const ob = b.order_index != null ? b.order_index : 99999;
          return oa !== ob ? oa - ob : String(a.id).localeCompare(String(b.id));
        });
        renderLtSortTable();
      } else {
        banner.classList.remove('active');
        btn.textContent = '⇅ Sıralamayı Düzenle';
        if (thDrag) thDrag.style.display = 'none';
        if (addBtn) addBtn.style.opacity = '';
        renderLevelTestQuestions();
      }
    }

    function renderLtSortTable() {
      const tbody = document.getElementById('level-test-tbody');
      if (!tbody) return;

      tbody.innerHTML = ltSortQuestions.map((q, i) => {
        const typeColor = q.type === 'math' ? 'var(--green)' : 'var(--blue)';
        const typeIcon = q.type === 'math' ? '🧮' : '📖';
        return `<tr draggable="true"
          data-lt-sort-idx="${i}"
          ondragstart="onLtDragStart(event,${i})"
          ondragover="onLtDragOver(event,${i})"
          ondrop="onLtDrop(event,${i})"
          ondragleave="onLtDragLeave(event)"
          ondragend="onLtDragEnd(event)">
          <td><span class="drag-handle" title="Sürükle">⠿</span></td>
          <td><span class="order-badge">${i + 1}</span></td>
          <td><span style="color:${typeColor}">${typeIcon} ${q.type}</span></td>
          <td style="max-width:280px;word-wrap:break-word;font-size:.82rem">${q.question_text}</td>
          <td style="font-size:.78rem;color:var(--text2)">${q.options ? q.options[0] || '' : ''}</td>
          <td style="font-size:.78rem;color:var(--text2)">${q.options ? q.options[1] || '' : ''}</td>
          <td style="font-size:.78rem;color:var(--text2)">${q.options ? q.options[2] || '' : ''}</td>
          <td style="font-size:.78rem;color:var(--text2)">${q.options ? q.options[3] || '' : ''}</td>
          <td><span style="color:var(--green);font-weight:600">${q.correct_answer + 1}</span></td>
          <td style="color:var(--text3);font-size:.72rem">${q.order_index != null ? q.order_index : '—'}</td>
        </tr>`;
      }).join('');
    }

    function onLtDragStart(e, idx) {
      ltDragSrcIdx = idx;
      e.currentTarget.classList.add('dragging-row');
      e.dataTransfer.effectAllowed = 'move';
    }

    function onLtDragOver(e, idx) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      document.querySelectorAll('#level-test-tbody tr').forEach(r => r.classList.remove('drag-over-row'));
      e.currentTarget.classList.add('drag-over-row');
    }

    function onLtDragLeave(e) {
      e.currentTarget.classList.remove('drag-over-row');
    }

    function onLtDrop(e, idx) {
      e.preventDefault();
      document.querySelectorAll('#level-test-tbody tr').forEach(r => r.classList.remove('drag-over-row'));
      if (ltDragSrcIdx === null || ltDragSrcIdx === idx) return;
      const [moved] = ltSortQuestions.splice(ltDragSrcIdx, 1);
      ltSortQuestions.splice(idx, 0, moved);
      ltDragSrcIdx = null;
      renderLtSortTable();
    }

    function onLtDragEnd(e) {
      e.currentTarget.classList.remove('dragging-row');
      document.querySelectorAll('#level-test-tbody tr').forEach(r => r.classList.remove('drag-over-row'));
      ltDragSrcIdx = null;
    }

    async function saveLtSortOrder() {
      const btn = document.getElementById('btn-save-lt-sort');
      btn.textContent = 'Kaydediliyor...'; btn.disabled = true;
      try {
        const updates = ltSortQuestions.map((q, i) =>
          sb.from('level_test_questions').update({ order_index: i + 1 }).eq('id', q.id)
        );
        await Promise.all(updates);
        ltSortQuestions.forEach((q, i) => {
          q.order_index = i + 1;
          const orig = levelTestQuestions.find(x => x.id === q.id);
          if (orig) orig.order_index = i + 1;
        });
        toast(`${ltSortQuestions.length} sorunun sırası kaydedildi!`, 'ok');
        renderLtSortTable();
      } catch (e) {
        toast('Kaydetme hatası: ' + e.message, 'fail');
      } finally {
        btn.textContent = '💾 Kaydet'; btn.disabled = false;
      }
    }

    async function deleteLevelTestQuestion(id) {
      console.log('Deleting question with ID:', id);
      if (!confirm('Bu seviye tespit sorusunu silmek istediğinizden emin misiniz?')) return;
      
      try {
        console.log('Attempting to delete from level_test_questions...');
        const { error } = await sb.from('level_test_questions').delete().eq('id', id);
        console.log('Delete result:', { error });
        if (error) throw error;
        toast('Soru silindi!', 'ok');
        await loadLevelTestQuestions();
        if (LT_SORT_MODE) {
          ltSortQuestions = ltSortQuestions.filter(x => x.id != id);
          renderLtSortTable();
        }
      } catch (e) {
        console.error('Delete error:', e);
        toast('Hata: ' + e.message, 'fail');
      }
      //r
    }

