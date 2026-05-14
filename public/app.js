const cfg = window.APP_CONFIG || {};
const SUPABASE_URL = cfg.SUPABASE_URL || 'PASTE_SUPABASE_URL_HERE';
const SUPABASE_ANON_KEY = cfg.SUPABASE_ANON_KEY || 'PASTE_SUPABASE_ANON_KEY_HERE';

let db = null;
let all = [];
let filt = 'all';
let sectionFilt = 'all';

const DEFAULT_SECTIONS = [
  'Movies',
  'Series',
  'Anime',
  'Korean',
  'Bengali',
  'Comedy',
  'Hollywood Comedy',
  'Dark Comedy',
  'Best Webseries',
  'Extra Mentions'
];

if (SUPABASE_URL.includes('PASTE_') || SUPABASE_ANON_KEY.includes('PASTE_')) {
  document.getElementById('loading').textContent = '❌ Supabase config missing. Render env vars ya public/config.js set karo.';
} else {
  db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  init();
}

async function init() {
  try {
    injectUIFixes();
    await loadMovies();
    document.getElementById('loading').style.display = 'none';
    renderSectionButtons();
    render();
  } catch (e) {
    document.getElementById('loading').textContent = '❌ Load nahi hua. Error: ' + e.message;
    console.error(e);
  }
}

async function loadMovies() {
  const { data, error } = await db
    .from('movies')
    .select('id,name,url,section,created_at')
    .order('created_at', { ascending: true });

  if (error) throw error;

  all = (data || []).map(m => ({
    ...m,
    section: m.section || 'Movies'
  }));
}

function injectUIFixes() {
  const modal = document.querySelector('.modal');

  if (modal && !document.getElementById('editId')) {
    modal.insertAdjacentHTML('afterbegin', '<input type="hidden" id="editId">');
  }

  const modalTitle = modal ? modal.querySelector('h2') : null;
  if (modalTitle && !modalTitle.id) {
    modalTitle.id = 'modalTitle';
  }

  if (modal && !document.getElementById('newSection')) {
    const urlField = document.getElementById('newUrl')?.closest('.field');
    if (urlField) {
      urlField.insertAdjacentHTML('afterend', `
        <div class="field">
          <label>Section</label>
          <select id="newSection"></select>
        </div>
      `);
    }
  }

  const header = document.querySelector('header');
  if (header && !document.getElementById('sectionBar')) {
    header.insertAdjacentHTML('beforeend', '<div class="section-bar" id="sectionBar"></div>');
  }

  if (!document.getElementById('sectionStyle')) {
    const style = document.createElement('style');
    style.id = 'sectionStyle';
    style.textContent = `
      .section-bar {
        display: flex;
        gap: 7px;
        overflow-x: auto;
        padding-top: 12px;
        scrollbar-width: none;
      }

      .section-bar::-webkit-scrollbar {
        display: none;
      }

      .sb {
        flex: 0 0 auto;
        background: rgba(255,255,255,.06);
        border: 1px solid var(--border);
        color: var(--muted);
        font-family: 'DM Sans', sans-serif;
        font-size: .75rem;
        font-weight: 700;
        padding: 8px 12px;
        border-radius: 999px;
        cursor: pointer;
        white-space: nowrap;
        transition: all .15s ease;
      }

      .sb:hover,
      .sb.active {
        background: var(--accent);
        border-color: var(--accent);
        color: #000;
      }

      select {
        width: 100%;
        background: var(--surface2);
        border: 1px solid var(--border);
        color: var(--text);
        font-family: 'DM Sans', sans-serif;
        font-size: .93rem;
        padding: 10px 13px;
        border-radius: 10px;
        outline: none;
      }

      select:focus {
        border-color: var(--accent);
        box-shadow: 0 0 0 3px rgba(232,200,64,.12);
      }

      .edit {
        flex-shrink: 0;
        background: rgba(232,200,64,.1);
        border: 1px solid rgba(232,200,64,.18);
        color: var(--accent);
        cursor: pointer;
        font-size: .86rem;
        width: 28px;
        height: 28px;
        border-radius: 7px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all .15s;
      }

      .edit:hover {
        background: var(--accent);
        color: #000;
      }

      .tag {
        flex-shrink: 0;
        font-size: .68rem;
        font-weight: 700;
        color: var(--accent);
        background: rgba(232,200,64,.09);
        border: 1px solid rgba(232,200,64,.16);
        padding: 4px 8px;
        border-radius: 999px;
        white-space: nowrap;
      }

      @media (max-width: 560px) {
        .tag {
          display: none;
        }

        .section-bar {
          margin-left: -4px;
          margin-right: -4px;
        }
      }
    `;
    document.head.appendChild(style);
  }
}

function getSections() {
  const found = [...new Set(all.map(m => m.section || 'Movies'))];
  const merged = [...new Set([...DEFAULT_SECTIONS, ...found])];
  return merged.filter(Boolean);
}

function renderSectionButtons() {
  const bar = document.getElementById('sectionBar');
  if (!bar) return;

  const sections = getSections();
  const total = all.length;

  bar.innerHTML = [
    `<button class="sb active" data-section="all">All <span>${total}</span></button>`,
    ...sections.map(sec => {
      const count = all.filter(m => (m.section || 'Movies') === sec).length;
      if (!count && !DEFAULT_SECTIONS.includes(sec)) return '';
      return `<button class="sb" data-section="${esc(sec)}">${esc(sec)} <span>${count}</span></button>`;
    })
  ].join('');

  bar.querySelectorAll('.sb').forEach(btn => {
    btn.addEventListener('click', () => {
      bar.querySelectorAll('.sb').forEach(x => x.classList.remove('active'));
      btn.classList.add('active');
      sectionFilt = btn.dataset.section || 'all';
      render();
    });
  });

  renderSectionSelect();
}

function renderSectionSelect(selected = 'Movies') {
  const select = document.getElementById('newSection');
  if (!select) return;

  const sections = getSections();
  select.innerHTML = sections.map(sec => {
    return `<option value="${esc(sec)}">${esc(sec)}</option>`;
  }).join('');

  select.value = selected || 'Movies';
}

function render() {
  const q = document.getElementById('search').value.toLowerCase().trim();

  const visible = all.filter(m => {
    const name = (m.name || '').toLowerCase();
    const section = m.section || 'Movies';
    const okSearch = name.includes(q);
    const okSection = sectionFilt === 'all' || section === sectionFilt;

    if (filt === 'link') return okSearch && okSection && m.url;
    if (filt === 'nolink') return okSearch && okSection && !m.url;
    return okSearch && okSection;
  });

  const globalNo = new Map(all.map((m, i) => [String(m.id), i + 1]));

  document.getElementById('shown').textContent = visible.length;
  document.getElementById('total').textContent = all.length;
  document.getElementById('links').textContent = all.filter(m => m.url).length;
  document.getElementById('badge').textContent = all.length + ' titles';

  const nr = document.getElementById('noRes');
  const lst = document.getElementById('list');

  if (!visible.length) {
    lst.innerHTML = '';
    nr.style.display = 'block';
    return;
  }

  nr.style.display = 'none';

  lst.innerHTML = visible.map(m => {
    const id = String(m.id);
    const num = '#' + globalNo.get(id);
    const section = m.section || 'Movies';

    const lnk = m.url
      ? `<a class="dl" href="${esc(m.url)}" target="_blank" rel="noopener noreferrer">↗ Open</a>`
      : '';

    return `
      <div class="row" data-id="${esc(id)}">
        <span class="num">${num}</span>
        <span class="dot"></span>
        <span class="name">${esc(m.name)}</span>
        <span class="tag">${esc(section)}</span>
        ${lnk}
        <button class="edit" type="button" onclick="openEdit('${esc(id)}')" title="Edit">✎</button>
        <button class="del" type="button" onclick="delMovie('${esc(id)}')" title="Delete">✕</button>
      </div>
    `;
  }).join('');
}

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function openModal() {
  document.getElementById('editId').value = '';
  document.getElementById('modalTitle').textContent = 'Add New Title';
  document.getElementById('saveBtn').textContent = 'Add to List';
  document.getElementById('newName').value = '';
  document.getElementById('newUrl').value = '';
  renderSectionSelect(sectionFilt !== 'all' ? sectionFilt : 'Movies');
  document.getElementById('ov').classList.add('open');

  setTimeout(() => {
    document.getElementById('newName').focus();
  }, 50);
}

function openEdit(id) {
  const cleanId = String(id);
  const movie = all.find(m => String(m.id) === cleanId);

  if (!movie) {
    toast('❌ Movie nahi mili', true);
    return;
  }

  document.getElementById('editId').value = cleanId;
  document.getElementById('newName').value = movie.name || '';
  document.getElementById('newUrl').value = movie.url || '';
  renderSectionSelect(movie.section || 'Movies');

  document.getElementById('modalTitle').textContent = 'Edit Title';
  document.getElementById('saveBtn').textContent = 'Save Changes';
  document.getElementById('ov').classList.add('open');

  setTimeout(() => {
    const input = document.getElementById('newName');
    input.focus();
    input.select();
  }, 50);
}

function closeModal() {
  document.getElementById('ov').classList.remove('open');
  document.getElementById('editId').value = '';
  document.getElementById('newName').value = '';
  document.getElementById('newUrl').value = '';

  const b = document.getElementById('saveBtn');
  b.disabled = false;
  b.textContent = 'Add to List';
}

async function saveMovie() {
  const id = document.getElementById('editId').value.trim();
  const nameInput = document.getElementById('newName');
  const urlInput = document.getElementById('newUrl');
  const sectionInput = document.getElementById('newSection');

  const name = nameInput.value.trim();
  const url = urlInput.value.trim() || null;
  const section = sectionInput ? sectionInput.value : 'Movies';

  if (!name) {
    nameInput.style.borderColor = 'var(--red)';
    setTimeout(() => {
      nameInput.style.borderColor = '';
    }, 1000);
    return;
  }

  const btn = document.getElementById('saveBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spin"></span>Saving...';

  try {
    if (id) {
      const { data, error } = await db
        .from('movies')
        .update({ name, url, section })
        .eq('id', id)
        .select('id,name,url,section,created_at');

      if (error) throw error;

      if (!data || !data.length) {
        throw new Error('No row updated');
      }

      toast('✅ Edit ho gaya!');
    } else {
      const { error } = await db
        .from('movies')
        .insert({ name, url, section });

      if (error) throw error;

      toast(`✅ "${name}" save ho gaya!`);
    }

    await loadMovies();
    renderSectionButtons();
    closeModal();
    render();
  } catch (e) {
    toast('❌ Save nahi hua: ' + e.message, true);
    console.error(e);
    btn.disabled = false;
    btn.textContent = id ? 'Save Changes' : 'Add to List';
  }
}

async function delMovie(id) {
  if (!confirm('Remove karo?')) return;

  try {
    const { error } = await db
      .from('movies')
      .delete()
      .eq('id', id);

    if (error) throw error;

    all = all.filter(m => String(m.id) !== String(id));
    renderSectionButtons();
    render();
    toast('🗑️ Remove ho gaya');
  } catch (e) {
    toast('❌ Delete nahi hua: ' + e.message, true);
    console.error(e);
  }
}

function toast(msg, isErr = false, dur = 3000) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = (isErr ? 'err ' : '') + 'show';

  clearTimeout(t._t);
  t._t = setTimeout(() => {
    t.classList.remove('show');
  }, dur);
}

document.getElementById('search').addEventListener('input', render);

document.querySelectorAll('.fb').forEach(b => {
  b.addEventListener('click', () => {
    document.querySelectorAll('.fb').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    filt = b.dataset.f;
    render();
  });
});

document.getElementById('ov').addEventListener('click', e => {
  if (e.target === document.getElementById('ov')) {
    closeModal();
  }
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeModal();
  }
});

document.getElementById('newName').addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    saveMovie();
  }
});

document.getElementById('newUrl').addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    saveMovie();
  }
});
