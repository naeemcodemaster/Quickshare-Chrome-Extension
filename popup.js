const DEFAULT_LINKS = [
{ id: 'linkedin', label: 'LinkedIn', url: 'https://www.linkedin.com/in/your-profile', icon: 'linkedin' },
{ id: 'github', label: 'GitHub', url: 'https://github.com/your-username', icon: 'github' },
{ id: 'portfolio', label: 'Portfolio', url: 'https://your-portfolio.example', icon: 'portfolio' },
{ id: 'instagram', label: 'Instagram', url: 'https://www.instagram.com/your-handle', icon: 'instagram' },
{ id: 'tiktok', label: 'TikTok', url: 'https://www.tiktok.com/@your-handle', icon: 'tiktok' },
{ id: 'youtube', label: 'YouTube', url: 'https://www.youtube.com/channel/your-channel-id', icon: 'youtube' }
];


const STORAGE_KEY = 'social_links_quickshare_v1';


// Utilities
const $ = (sel) => document.querySelector(sel);
const $all = (sel) => document.querySelectorAll(sel);

// Elements (will be assigned on DOMContentLoaded)
let listEl;
let addBtn;
let modal;
let inputLabel;
let inputUrl;
let inputIcon;
let saveBtn;
let cancelBtn;
let deleteBtn;
let modalTitle;


let links = [];
let editingId = null;
let filterText = '';


function loadLinks() {
  storage.get(STORAGE_KEY, (res) => {
    if (res && res[STORAGE_KEY]) {
      links = res[STORAGE_KEY];
    } else {
      links = DEFAULT_LINKS;
      storage.set({ [STORAGE_KEY]: links });
    }
    render();
  });
}


function saveLinks() {
  storage.set({ [STORAGE_KEY]: links });
}

// storage wrapper: use chrome.storage when available, otherwise localStorage
const storage = {
  get(key, cb) {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
      chrome.storage.sync.get([key], cb);
    } else {
      try {
        const raw = localStorage.getItem(key);
        const res = {};
        if (raw) res[key] = JSON.parse(raw);
        cb(res);
      } catch (e) {
        console.error('storage.get fallback error', e);
        cb({});
      }
    }
  },
  set(obj, cb) {
    const key = Object.keys(obj)[0];
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
      chrome.storage.sync.set(obj, cb);
    } else {
      try {
        localStorage.setItem(key, JSON.stringify(obj[key]));
        if (cb) cb();
      } catch (e) {
        console.error('storage.set fallback error', e);
        if (cb) cb();
      }
    }
  }
};

// UI helpers
function showToast(msg, timeout = 1800) {
  const t = $('#toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(t._hideTimer);
  t._hideTimer = setTimeout(() => t.classList.add('hidden'), timeout);
}

function showInputError(msg, timeout = 2400) {
  const el = $('#input-error');
  if (!el) return;
  el.textContent = msg;
  el.classList.remove('hidden');
  clearTimeout(el._hideTimer);
  el._hideTimer = setTimeout(() => el.classList.add('hidden'), timeout);
}

function render() {
listEl.innerHTML = '';
const filtered = links.filter(it => it.label.toLowerCase().includes(filterText.toLowerCase()));
filtered.forEach(item => {
const card = document.createElement('div');
card.className = 'card';


const img = document.createElement('img');
img.className = 'icon';
img.src = `icons/${item.icon}.svg`;
img.alt = item.label;


const meta = document.createElement('div');
meta.className = 'meta';
const label = document.createElement('div');
label.className = 'label';
label.textContent = item.label;
const url = document.createElement('div');
url.className = 'url';
url.textContent = item.url;
meta.appendChild(label);
meta.appendChild(url);


const copyBtn = document.createElement('button');
copyBtn.className = 'copy-btn';
copyBtn.title = 'Copy link';
copyBtn.innerHTML = svgCopyInline();
copyBtn.addEventListener('click', async (e) => {
try {
await navigator.clipboard.writeText(item.url);
// small visual feedback
copyBtn.textContent = 'Copied';
setTimeout(() => { copyBtn.innerHTML = svgCopyInline(); }, 1200);
} catch (err) {
console.error('copy failed', err);
showToast('Copy failed — manually copy the link');
}
});


const editBtn = document.createElement('button');
editBtn.className = 'copy-btn';
editBtn.title = 'Edit link';
editBtn.innerHTML = svgEditInline();
editBtn.addEventListener('click', () => openModal(item.id));

// delete button on card
const delBtnCard = document.createElement('button');
delBtnCard.className = 'delete-btn-card';
delBtnCard.title = 'Delete link';
delBtnCard.innerHTML = svgDeleteInline();
delBtnCard.addEventListener('click', () => {
  if (confirm('Delete this link?')) {
    deleteById(item.id);
  }
});


card.appendChild(img);
card.appendChild(meta);
card.appendChild(copyBtn);
card.appendChild(editBtn);
card.appendChild(delBtnCard);


listEl.appendChild(card);
});
}


function openModal(id) {
editingId = id || null;
modal.classList.remove('hidden');
if (editingId) {
modalTitle.textContent = 'Edit Link';
const item = links.find(x => x.id === editingId);
inputLabel.value = item.label;
inputUrl.value = item.url;
inputIcon.value = item.icon || 'portfolio';
deleteBtn.style.display = 'inline-block';
} else {
modalTitle.textContent = 'Add Link';
inputLabel.value = '';
inputUrl.value = '';
inputIcon.value = 'portfolio';
deleteBtn.style.display = 'none';
}
}


function closeModal() {
modal.classList.add('hidden');
editingId = null;
}

function onSave() {
const label = inputLabel.value.trim();
let url = inputUrl.value.trim();
const icon = inputIcon.value;
if (!label || !url) {
showInputError('Enter both label and URL');
return;
}
// normalize url
if (!/^https?:\/\//i.test(url)) url = 'https://' + url;

// validate URL
try {
  // will throw for invalid URLs
  new URL(url);
} catch (e) {
  showInputError('Invalid URL');
  return;
}

if (editingId) {
const idx = links.findIndex(x => x.id === editingId);
if (idx >= 0) {
links[idx] = { ...links[idx], label, url, icon };
}
} else {
// create new id
const id = label.toLowerCase().replace(/[^a-z0-9]+/g,'-') + '-' + Date.now();
links.push({ id, label, url, icon });
}
saveLinks();
render();
closeModal();
showToast('Saved');
}

function onDelete() {
if (!editingId) return;
links = links.filter(x => x.id !== editingId);
saveLinks();
render();
closeModal();
showToast('Deleted');
}

function deleteById(id) {
  links = links.filter(x => x.id !== id);
  saveLinks();
  render();
  showToast('Deleted');
}


// inline svg helpers
function svgCopyInline(){
return `
<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16 1H4a2 2 0 0 0-2 2v12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path><rect x="8" y="5" width="13" height="13" rx="2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></rect></svg>`;
}
function svgEditInline(){
return `
<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 21l3-1 11-11 1-3-3 1L4 19z" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

function svgDeleteInline(){
return `
<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 6h18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 6v14a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 11v6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M14 11v6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}


// wire up after DOM ready to avoid null references
document.addEventListener('DOMContentLoaded', () => {
  listEl = $('#links-list');
  addBtn = $('#add-btn');
  modal = $('#modal');
  inputLabel = $('#input-label');
  inputUrl = $('#input-url');
  inputIcon = $('#input-icon');
  saveBtn = $('#save-btn');
  cancelBtn = $('#cancel-btn');
  deleteBtn = $('#delete-btn');
  modalTitle = $('#modal-title');
  const searchInput = $('#search');

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      filterText = e.target.value || '';
      render();
    });
  }

  if (!saveBtn || !addBtn || !modal) {
    console.error('Essential DOM elements missing', { saveBtn, addBtn, modal });
  }

  addBtn.addEventListener('click', () => openModal());
  cancelBtn.addEventListener('click', closeModal);
  saveBtn.addEventListener('click', onSave);
  deleteBtn.addEventListener('click', () => {
    if (confirm('Delete this link?')) onDelete();
  });

  // close modal by clicking outside card
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

  loadLinks();
});