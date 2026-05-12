const cfg = window.APP_CONFIG || {};
const SUPABASE_URL = cfg.SUPABASE_URL || 'PASTE_SUPABASE_URL_HERE';
const SUPABASE_ANON_KEY = cfg.SUPABASE_ANON_KEY || 'PASTE_SUPABASE_ANON_KEY_HERE';

let db = null;
let all = [];
let filt = 'all';

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
    render();
  } catch (e) {
    document.getElementById('loading').textContent = '❌ Load nahi hua. Error: ' + e.message;
    console.error(e);
  }
}

async function loadMovies() {
  const { data, error } = await db
    .from('movies')
    .select('id,name,url,created_at')
    .order('created_at', { ascending: true });
  if (error) throw error;
  all = data || [];
}

function render() {
  const q = document.getElementById('search').value.toLowerCase().trim();
  const visible = all.filter(m => {
    const ok = (m.name || '').toLowerCase().includes(q);
    if (filt === 'link') return ok && m.url;
    if (filt === 'nolink') return ok && !m.url;
    return ok;
  });

  const globalNo = new Map(all.map((m, i) => [m.id, i + 1]));
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
    const num = '#' + globalNo.get(m.id);
    const lnk = m.url ? `<a class="dl" href="${esc(m.url)}" target="_blank" rel="noopener noreferrer">↗ Open</a>` : '';
    return `<div class="row" data-id="${esc(m.id)}"><span class="num">${num}</span><span class="dot"></span><span class="name">${esc(m.name)}</span>${lnk}<button class="edit" onclick="openEdit('${esc(m.id)}')">✎</button><button class="del" onclick="delMovie('${esc(m.id)}')">✕</button></div>`;
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
  document.getElementById('ov').classList.add('open');
  setTimeout(() => document.getElementById('newName').focus(), 50);
}

function openEdit(id) {
  const movie = all.find(m => m.id === id);
  if (!movie) return;
  document.getElementById('editId').value = movie.id;
  document.getElementById('newName').value = movie.name || '';
  document.getElementById('newUrl').value = movie.url || '';
  document.getElementById('modalTitle').textContent = 'Edit Title';
  document.getElementById('saveBtn').textContent = 'Save Changes';
  document.getElementById('ov').classList.add('open');
  setTimeout(() => document.getElementById('newName').focus(), 50);
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
  const id = document.getElementById('editId').value;
  const nameInput = document.getElementById('newName');
  const name = nameInput.value.trim();
  const url = document.getElementById('newUrl').value.trim() || null;

  if (!name) {
    nameInput.style.borderColor = 'var(--red)';
    setTimeout(() => nameInput.style.borderColor = '', 1000);
    return;
  }

  const btn = document.getElementById('saveBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spin"></span>Saving...';

  try {
    if (id) {
      const { error } = await db.from('movies').update({ name, url }).eq('id', id);
      if (error) throw error;
      toast('✅ Update ho gaya!');
    } else {
      const { error } = await db.from('movies').insert({ name, url });
      if (error) throw error;
      toast(`✅ "${name}" save ho gaya!`);
    }

    await loadMovies();
    closeModal();
    render();

    if (!id) {
      setTimeout(() => {
        const el = document.querySelector('.row:last-child');
        if (el) {
          el.classList.add('new');
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 50);
    }
  } catch (e) {
    toast('❌ Save nahi hua: ' + e.message, true);
    btn.disabled = false;
    btn.textContent = id ? 'Save Changes' : 'Add to List';
  }
}

async function delMovie(id) {
  if (!confirm('Remove karo?')) return;
  try {
    const { error } = await db.from('movies').delete().eq('id', id);
    if (error) throw error;
    all = all.filter(m => m.id !== id);
    render();
    toast('🗑️ Remove ho gaya');
  } catch (e) {
    toast('❌ Delete nahi hua: ' + e.message, true);
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
document.querySelectorAll('.fb').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('.fb').forEach(x => x.classList.remove('active'));
  b.classList.add('active');
  filt = b.dataset.f;
  render();
}));
document.getElementById('ov').addEventListener('click', e => {
  if (e.target === document.getElementById('ov')) closeModal();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
});
document.getElementById('newName').addEventListener('keydown', e => {
  if (e.key === 'Enter') saveMovie();
});
