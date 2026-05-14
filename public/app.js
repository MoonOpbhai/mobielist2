const cfg = window.APP_CONFIG || {};
const SUPABASE_URL = cfg.SUPABASE_URL || 'PASTE_SUPABASE_URL_HERE';
const SUPABASE_ANON_KEY = cfg.SUPABASE_ANON_KEY || 'PASTE_SUPABASE_ANON_KEY_HERE';

let db = null;
let all = [];
let filt = 'all';
let sectionFilt = 'all';
let adminPassword = sessionStorage.getItem('movie_admin_password') || '';
let isAdmin = adminPassword === 'Amonchand111';

const DEFAULT_SECTIONS = ['Movies','Series','Anime','Korean','Bengali','Comedy','Hollywood Comedy','Dark Comedy','Best Webseries','Extra Mentions'];

if (SUPABASE_URL.includes('PASTE_') || SUPABASE_ANON_KEY.includes('PASTE_')) {
  document.getElementById('loading').textContent = '❌ Supabase config missing. Render env vars ya public/config.js set karo.';
} else {
  db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  init();
}

async function init() {
  try {
    await loadMovies();
    document.getElementById('loading').style.display = 'none';
    renderSectionButtons();
    renderSectionSelect();
    updateAdminButton();
    render();
  } catch (e) {
    document.getElementById('loading').textContent = '❌ Load nahi hua. Error: ' + e.message;
    console.error(e);
  }
}

async function loadMovies() {
  const { data, error } = await db.from('movies').select('id,name,url,section,created_at').order('created_at', { ascending: true });
  if (error) throw error;
  all = (data || []).map(m => ({ ...m, section: m.section || 'Movies' }));
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
  if (pass !== 'Amonchand111') return toast('❌ Wrong password', true);

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
  if (['anime','naruto','one piece','one punch','chainsaw','solo leveling','attack on titan','demon slayer','jjk','jujutsu','dragon ball','bleach','black clover','dandadan','death note'].some(x => n.includes(x))) return 'Anime';
  if (['series','season','webseries','web series','netflix','prime','hbo','money heist','breaking bad','better call saul','panchayat','mirzapur'].some(x => n.includes(x))) return 'Series';
  if (['korean','k-drama','k drama','oldboy','train to busan','the wailing','bloodhounds','sweet home','alice in borderland'].some(x => n.includes(x))) return 'Korean';
  if (['bengali','abar proloy','bibaho','kothanodi'].some(x => n.includes(x))) return 'Bengali';
  if (['comedy','21 jump street','horrible bosses','pineapple express','white chicks','tropic thunder'].some(x => n.includes(x))) return 'Comedy';
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
  document.getElementById('movieCount').textContent = all.filter(m => (m.section || 'Movies') === 'Movies').length;
  document.getElementById('seriesCount').textContent = all.filter(m => (m.section || 'Movies') === 'Series' || (m.section || '').includes('Webseries')).length;
  document.getElementById('animeCount').textContent = all.filter(m => (m.section || 'Movies') === 'Anime').length;
  document.getElementById('badge').textContent = all.length + ' titles';

  const nr = document.getElementById('noRes');
  const lst = document.getElementById('list');
  if (!visible.length) {
    lst.innerHTML = '';
    nr.style.display = 'block';
    return;
  }
  nr.style.display = 'none';

  lst.innerHTML = visible.map((m, idx) => {
    const id = String(m.id);
    const num = '#' + globalNo.get(id);
    const section = m.section || 'Movies';
    const lnk = m.url ? `<a class="dl" href="${esc(m.url)}" target="_blank" rel="noopener noreferrer">↗ Open</a>` : '';
    return `
      <div class="row" data-id="${esc(id)}" style="animation-delay:${Math.min(idx * 0.018, 0.35)}s">
        <span class="num">${num}</span>
        <span class="dot"></span>
        <span class="name">${esc(m.name)}</span>
        <span class="tag">${esc(section)}</span>
        ${lnk}
        ${isAdmin ? `<button class="edit" type="button" onclick="openEdit('${esc(id)}')" title="Edit">✎</button>` : ''}
        ${isAdmin ? `<button class="del" type="button" onclick="delMovie('${esc(id)}')" title="Delete">✕</button>` : ''}
      </div>`;
  }).join('');
}

function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
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
  if (!isAdmin) return toast('❌ Admin login required', true);
  const movie = all.find(m => String(m.id) === String(id));
  if (!movie) return toast('❌ Movie nahi mili', true);
  document.getElementById('editId').value = String(id);
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
    setTimeout(() => { nameInput.style.borderColor = ''; }, 1000);
    return;
  }
  if (!id && (!section || section === 'Movies')) section = detectSection(name);
  const btn = document.getElementById('saveBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spin"></span>Saving...';

  try {
    if (id) {
      if (!isAdmin) throw new Error('Admin login required');
      const { data, error } = await db.rpc('admin_update_movie', { p_id: id, p_name: name, p_url: url || '', p_section: section, p_password: adminPassword });
      if (error) throw error;
      if (!data) throw new Error('No row updated');
      toast('✅ Edit ho gaya!');
    } else {
      const { error } = await db.from('movies').insert({ name, url, section });
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
  if (!isAdmin) return toast('❌ Admin login required', true);
  if (!confirm('Delete karo? Ye movie permanently remove hogi.')) return;
  try {
    const { data, error } = await db.rpc('admin_delete_movie', { p_id: id, p_password: adminPassword });
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
  t._t = setTimeout(() => t.classList.remove('show'), dur);
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
document.getElementById('ov').addEventListener('click', e => { if (e.target === document.getElementById('ov')) closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
document.getElementById('newName').addEventListener('keydown', e => { if (e.key === 'Enter') saveMovie(); });
document.getElementById('newUrl').addEventListener('keydown', e => { if (e.key === 'Enter') saveMovie(); });
