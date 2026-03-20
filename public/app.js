/* ===== 焼酎検索フロントエンド ===== */

const state = {
  query: '',
  type: 'all',
  prefecture: 'all',
  minAlcohol: '',
  maxAlcohol: '',
  tag: 'all',
  sort: 'rating_desc',
};

let debounceTimer = null;

// ===== DOM参照 =====
const searchInput   = document.getElementById('searchInput');
const clearSearch   = document.getElementById('clearSearch');
const typeFilters   = document.getElementById('typeFilters');
const prefFilter    = document.getElementById('prefectureFilter');
const minAlcohol    = document.getElementById('minAlcohol');
const maxAlcohol    = document.getElementById('maxAlcohol');
const tagFilters    = document.getElementById('tagFilters');
const resetFilters  = document.getElementById('resetFilters');
const sortSelect    = document.getElementById('sortSelect');
const cardsGrid     = document.getElementById('cardsGrid');
const emptyState    = document.getElementById('emptyState');
const resultsCount  = document.getElementById('resultsCount');
const modalOverlay  = document.getElementById('modalOverlay');
const modal         = document.getElementById('modal');
const modalClose    = document.getElementById('modalClose');
const modalContent  = document.getElementById('modalContent');

// ===== 初期化 =====
async function init() {
  const opts = await fetch('/api/options').then(r => r.json());
  buildTypeFilters(opts.types);
  buildPrefFilter(opts.prefectures);
  buildTagFilters(opts.tags);
  await search();
}

// ===== フィルター構築 =====
function buildTypeFilters(types) {
  const typeLabels = { '芋': '🍠 芋', '麦': '🌾 麦', '米': '🌾 米', '黒糖': '🍬 黒糖', 'そば': '🌿 そば', '泡盛': '🏝 泡盛' };
  types.forEach(type => {
    const label = document.createElement('label');
    label.className = 'filter-chip';
    label.innerHTML = `<input type="radio" name="type" value="${type}"> ${typeLabels[type] || type}`;
    typeFilters.appendChild(label);
  });

  typeFilters.addEventListener('change', (e) => {
    state.type = e.target.value;
    document.querySelectorAll('.filter-chip').forEach(c => {
      c.classList.toggle('active', c.querySelector('input').value === state.type);
    });
    search();
  });
}

function buildPrefFilter(prefs) {
  prefs.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p;
    opt.textContent = p;
    prefFilter.appendChild(opt);
  });
}

function buildTagFilters(tags) {
  tags.forEach(tag => {
    const btn = document.createElement('button');
    btn.className = 'tag-btn';
    btn.dataset.tag = tag;
    btn.textContent = tag;
    tagFilters.appendChild(btn);
  });

  tagFilters.addEventListener('click', (e) => {
    if (!e.target.matches('.tag-btn')) return;
    state.tag = e.target.dataset.tag;
    document.querySelectorAll('.tag-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.tag === state.tag);
    });
    search();
  });
}

// ===== 検索実行 =====
async function search() {
  const params = new URLSearchParams({
    q: state.query,
    type: state.type,
    prefecture: state.prefecture,
    sort: state.sort,
  });
  if (state.minAlcohol) params.set('minAlcohol', state.minAlcohol);
  if (state.maxAlcohol) params.set('maxAlcohol', state.maxAlcohol);
  if (state.tag !== 'all') params.set('tag', state.tag);

  const { total, results } = await fetch(`/api/shochu?${params}`).then(r => r.json());
  renderResults(results, total);
}

// ===== 結果レンダリング =====
function renderResults(items, total) {
  resultsCount.innerHTML = `<strong>${total}</strong> 件`;
  cardsGrid.innerHTML = '';

  if (items.length === 0) {
    emptyState.hidden = false;
    return;
  }
  emptyState.hidden = true;

  items.forEach(s => {
    const card = createCard(s);
    cardsGrid.appendChild(card);
  });
}

function createCard(s) {
  const card = document.createElement('div');
  card.className = `shochu-card type-${s.type}`;
  card.setAttribute('data-id', s.id);

  const stars = renderStars(s.rating);
  const tagsHtml = s.tags.slice(0, 3).map(t => `<span class="tag-label">${t}</span>`).join('');

  card.innerHTML = `
    <div class="card-header">
      <div>
        <div class="card-name">${s.name}</div>
        <div class="card-kana">${s.nameKana}</div>
      </div>
      <div class="card-rating">
        <div class="rating-stars">${stars}</div>
        <div class="rating-num">${s.rating.toFixed(1)}</div>
      </div>
    </div>
    <div class="card-meta">
      <span class="meta-badge badge-type">${s.type}焼酎${s.type === '泡盛' ? '（泡盛）' : ''}</span>
      <span class="meta-badge badge-pref">📍 ${s.prefecture.replace('県', '').replace('都', '').replace('府', '')}</span>
      <span class="meta-badge badge-alcohol">🍶 ${s.alcohol}度</span>
    </div>
    <div class="card-brewery">🏭 ${s.brewery}</div>
    <div class="card-desc">${s.description}</div>
    <div class="card-footer">
      <div class="card-price">¥${s.price.toLocaleString()}<span class="card-price-unit">（${s.volume}ml）</span></div>
      <div class="card-tags">${tagsHtml}</div>
    </div>
  `;

  card.addEventListener('click', () => openModal(s.id));
  return card;
}

function renderStars(rating) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  let stars = '★'.repeat(full);
  if (half) stars += '☆';
  return stars;
}

// ===== モーダル =====
async function openModal(id) {
  const s = await fetch(`/api/shochu/${id}`).then(r => r.json());

  const stars = renderStars(s.rating);
  const badgesHtml = `
    <span class="modal-badge badge-type">${s.type}焼酎</span>
    <span class="modal-badge badge-pref">📍 ${s.prefecture} ${s.city}</span>
    <span class="modal-badge badge-alcohol">🍶 ${s.alcohol}度</span>
  `;

  const ingredientsHtml = s.ingredients.map(i =>
    `<span class="ingredient-tag">${i}</span>`
  ).join('');

  const tagsHtml = s.tags.map(t =>
    `<span class="modal-tag" data-tag="${t}">${t}</span>`
  ).join('');

  modalContent.innerHTML = `
    <div class="modal-top">
      <div>
        <div class="modal-name">${s.name}</div>
        <div class="modal-kana">${s.nameKana}（${s.brewery}）</div>
      </div>
      <div class="modal-rating-large">
        <span class="rating-big">${s.rating.toFixed(1)}</span>
        <div class="rating-stars-big">${stars}</div>
      </div>
    </div>
    <div class="modal-badges">${badgesHtml}</div>
    <div class="modal-info-grid">
      <div class="info-item">
        <div class="info-label">蔵元</div>
        <div class="info-value">${s.brewery}</div>
      </div>
      <div class="info-item">
        <div class="info-label">産地</div>
        <div class="info-value">${s.prefecture} ${s.city}</div>
      </div>
      <div class="info-item">
        <div class="info-label">アルコール度数</div>
        <div class="info-value">${s.alcohol}度</div>
      </div>
      <div class="info-item">
        <div class="info-label">容量 / 参考価格</div>
        <div class="info-value">${s.volume}ml / ¥${s.price.toLocaleString()}</div>
      </div>
    </div>
    <p class="modal-desc">${s.description}</p>
    <div class="modal-ingredients">
      <h4>原料・麹</h4>
      <div class="ingredients-list">${ingredientsHtml}</div>
    </div>
    <div class="modal-tags">
      <h4>タグ</h4>
      <div class="modal-tags-list">${tagsHtml}</div>
    </div>
  `;

  // タグクリックで絞り込み
  modalContent.querySelectorAll('.modal-tag').forEach(btn => {
    btn.addEventListener('click', () => {
      closeModal();
      state.tag = btn.dataset.tag;
      document.querySelectorAll('.tag-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.tag === state.tag);
      });
      search();
    });
  });

  modalOverlay.hidden = false;
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  modalOverlay.hidden = true;
  document.body.style.overflow = '';
}

// ===== イベントリスナー =====
searchInput.addEventListener('input', () => {
  state.query = searchInput.value;
  clearSearch.hidden = !state.query;
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(search, 250);
});

clearSearch.addEventListener('click', () => {
  searchInput.value = '';
  state.query = '';
  clearSearch.hidden = true;
  search();
});

prefFilter.addEventListener('change', () => {
  state.prefecture = prefFilter.value;
  search();
});

let alcoholTimer = null;
[minAlcohol, maxAlcohol].forEach(input => {
  input.addEventListener('input', () => {
    state.minAlcohol = minAlcohol.value;
    state.maxAlcohol = maxAlcohol.value;
    clearTimeout(alcoholTimer);
    alcoholTimer = setTimeout(search, 400);
  });
});

sortSelect.addEventListener('change', () => {
  state.sort = sortSelect.value;
  search();
});

resetFilters.addEventListener('click', () => {
  state.query = '';
  state.type = 'all';
  state.prefecture = 'all';
  state.minAlcohol = '';
  state.maxAlcohol = '';
  state.tag = 'all';

  searchInput.value = '';
  clearSearch.hidden = true;
  prefFilter.value = 'all';
  minAlcohol.value = '';
  maxAlcohol.value = '';

  document.querySelectorAll('.filter-chip').forEach(c => {
    c.classList.toggle('active', c.querySelector('input').value === 'all');
  });
  document.querySelectorAll('.tag-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.tag === 'all');
  });

  search();
});

modalClose.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) closeModal();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

// ===== 起動 =====
init();
