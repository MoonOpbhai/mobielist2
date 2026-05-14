const cfg = window.APP_CONFIG || {};
const SUPABASE_URL = cfg.SUPABASE_URL || 'PASTE_SUPABASE_URL_HERE';
const SUPABASE_ANON_KEY = cfg.SUPABASE_ANON_KEY || 'PASTE_SUPABASE_ANON_KEY_HERE';

let db = null;
let all = [];
let filt = 'all';
let sectionFilt = 'all';
let adminPassword = sessionStorage.getItem('movie_admin_password') || '';
let isAdmin = adminPassword === 'Amonchand111';

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
    injectUI();
    await loadMovies();
    document.getElementById('loading').style.display = 'none';
    renderSectionButtons();
    renderSectionSelect();
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

function injectUI() {
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

  if (header && !document.getElementById('adminBtn')) {
    const ctrl = document.querySelector('.ctrl');
    if (ctrl) {
      ctrl.insertAdjacentHTML('beforeend', `<button class="admin-btn" id="adminBtn" type="button" onclick="toggleAdmin()"></button>`);
    }
  }

  if (header && !document.getElementById('sectionBar')) {
    header.insertAdjacentHTML('beforeend', '<div class="section-bar" id="sectionBar"></div>');
  }

  if (!document.getElementById('premiumPatchStyle')) {
    const style = document.createElement('style');
    style.id = 'premiumPatchStyle';
    style.textContent = `
      .section-bar {
        display: flex;
        gap: 7px;
        overflow-x: auto;
        padding-top: 13px;
        scrollbar-width: none;
      }
      .section-bar::-webkit-scrollbar { display: none; }
      .sb {
        flex: 0 0 auto;
        background: rgba(255,255,255,.06);
        border: 1px solid var(--border);
        color: var(--muted);
        font-family: 'DM Sans', sans-serif;
        font-size: .74rem;
        font-weight: 800;
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
      .sb span {
        opacity: .75;
        margin-left: 4px;
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
      .admin-btn {
        background: rgba(255,255,255,.07);
        border: 1px solid var(--border);
        color: var(--muted);
        font-family: 'DM Sans', sans-serif;
        font-size: .78rem;
        font-weight: 800;
        padding: 10px 14px;
        border-radius: 10px;
        cursor: pointer;
        white-space: nowrap;
        transition: all .15s ease;
      }
      .admin-btn.on {
        background: linear-gradient(135deg,var(--accent),#fff1a6);
        border-color: var(--accent);
        color: #000;
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
        font-weight: 800;
        color: var(--accent);
        background: rgba(232,200,64,.09);
        border: 1px solid rgba(232,200,64,.16);
        padding: 4px 8px;
        border-radius: 999px;
        white-space: nowrap;
      }
      @media (max-width: 560px) {
        .tag { display: none; }
        .admin-btn { padding: 10px 12px; }
      }
    `;
    document.head.appendChild(style);
  }

  updateAdminButton();
}

function updateAdminButton() {
  const btn = document.getElementById('adminBtn');
  if (!btn) return;

  btn.textContent = isAdmin ? 'Admin On' : 'Admin';
  btn.classList.toggle('on', isAdmin);
}

function toggleAdmin() {
  if (isAdmin) {
    adminPassword = '';
    isAdmin = false;
    sessionStorage.removeItem('movie_admin_password');
    updateAdminButton();
    render();
    toast('🔒 Admin off');
    return;
  }

  const pass = prompt('Admin password daalo:');
  if (pass === null) return;

  if (pass !== 'Amonchand111') {
    toast('❌ Wrong password', true);
    return;
  }

  adminPassword = pass;
  isAdmin = true;
  sessionStorage.setItem('movie_admin_password', pass);
  updateAdminButton();
  render();
  toast('🔓 Admin unlocked');
}

function getSections() {
  const found = [...new Set(all.map(m => m.section || 'Movies'))];
  return [...new Set([...DEFAULT_SECTIONS, ...found])].filter(Boolean);
}

function renderSectionButtons() {
  const bar = document.getElementById('sectionBar');
  if (!bar) return;

  const sections = getSections();

  bar.innerHTML = [
    `<button class="sb active" data-section="all">All <span>${all.length}</span></button>`,
    ...sections.map(sec => {
      const count = all.filter(m => (m.section || 'Movies') === sec).length;
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
}

function renderSectionSelect(selected = 'Movies') {
  const select = document.getElementById('newSection');
  if (!select) return;

  const sections = getSections();
  select.innerHTML = sections.map(sec => `<option value="${esc(sec)}">${esc(sec)}</option>`).join('');
  select.value = selected || 'Movies';
}

function detectSection(name) {
  const n = String(name || '').toLowerCase();

  if (
    n.includes('anime') ||
    n.includes('naruto') ||
    n.includes('one piece') ||
    n.includes('one punch') ||
    n.includes('chainsaw') ||
    n.includes('solo leveling') ||
    n.includes('attack on titan') ||
    n.includes('demon slayer') ||
    n.includes('jjk') ||
    n.includes('jujutsu') ||
    n.includes('dragon ball') ||
    n.includes('bleach') ||
    n.includes('black clover') ||
    n.includes('dandadan') ||
    n.includes('death note')
  ) return 'Anime';

  if (
    n.includes('series') ||
    n.includes('season') ||
    n.includes('webseries') ||
    n.includes('web series') ||
    n.includes('netflix') ||
    n.includes('prime') ||
    n.includes('hbo') ||
    n.includes('money heist') ||
    n.includes('breaking bad') ||
    n.includes('better call saul') ||
    n.includes('panchayat') ||
    n.includes('mirzapur')
  ) return 'Series';

  if (
    n.includes('korean') ||
    n.includes('k-drama') ||
    n.includes('k drama') ||
    n.includes('oldboy') ||
    n.includes('train to busan') ||
    n.includes('the wailing') ||
    n.includes('bloodhounds') ||
    n.includes('sweet home') ||
    n.includes('alice in borderland')
  ) return 'Korean';

  if (
    n.includes('bengali') ||
    n.includes('abar proloy') ||
    n.includes('bibaho') ||
    n.includes('kothanodi')
  ) return 'Bengali';

  if (
    n.includes('comedy') ||
    n.includes('21 jump street') ||
    n.includes('horrible bosses') ||
    n.includes('pineapple express') ||
    n.includes('white chicks') ||
    n.includes('tropic thunder')
  ) return 'Comedy';

  return sectionFilt !== 'all' ? sectionFilt : 'Movies';
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
        ${isAdmin ? `<button class="edit" type="button" onclick="openEdit('${esc(id)}')" title="Edit">✎</button>` : ''}
        ${isAdmin ? `<button class="del" type="button" onclick="delMovie('${esc(id)}')" title="Delete">✕</button>` : ''}
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

  setTimeout(() => document.getElementById('newName').focus(), 50);
}

function openEdit(id) {
  if (!isAdmin) {
    toast('❌ Admin login required', true);
    return;
  }

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
  let section = sectionInput ? sectionInput.value : 'Movies';

  if (!name) {
    nameInput.style.borderColor = 'var(--red)';
    setTimeout(() => {
      nameInput.style.borderColor = '';
    }, 1000);
    return;
  }

  if (!id && (!section || section === 'Movies')) {
    section = detectSection(name);
  }

  const btn = document.getElementById('saveBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spin"></span>Saving...';

  try {
    if (id) {
      if (!isAdmin) throw new Error('Admin login required');

      const { data, error } = await db.rpc('admin_update_movie', {
        p_id: id,
        p_name: name,
        p_url: url || '',
        p_section: section,
        p_password: adminPassword
      });

      if (error) throw error;
      if (!data) throw new Error('No row updated');

      toast('✅ Edit ho gaya!');
    } else {
      const { error } = await db
        .from('movies')
        .insert({ name, url, section });

      if (error) throw error;

      toast(`✅ "${name}" add ho gaya!`);
    }

    await loadMovies();
    renderSectionButtons();
    renderSectionSelect(section);
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
  if (!isAdmin) {
    toast('❌ Admin login required', true);
    return;
  }

  if (!confirm('Delete karo? Ye movie permanently remove hogi.')) return;

  try {
    const { data, error } = await db.rpc('admin_delete_movie', {
      p_id: id,
      p_password: adminPassword
    });

    if (error) throw error;
    if (!data) throw new Error('Delete failed');

    all = all.filter(m => String(m.id) !== String(id));
    renderSectionButtons();
    render();
    toast('🗑️ Delete ho gaya');
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
  if (e.target === document.getElementById('ov')) closeModal();
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
});

document.getElementById('newName').addEventListener('keydown', e => {
  if (e.key === 'Enter') saveMovie();
});

document.getElementById('newUrl').addEventListener('keydown', e => {
  if (e.key === 'Enter') saveMovie();
});
