let categories = [];
let threads = [];
let users = {};
let currentFilter = 'newest';
let currentCategory = null;

function getCategorySymbol(categoryName) {
  if (!categoryName) return '📁';

  const name = categoryName.toLowerCase();
  if (name.includes('general') || name.includes('discussion') || name.includes('chat')) return '💬';
  if (name.includes('tech') || name.includes('programming') || name.includes('development') || name.includes('code')) return '💻';
  if (name.includes('gaming') || name.includes('games') || name.includes('game')) return '🎮';
  if (name.includes('education') || name.includes('learning') || name.includes('tutorial') || name.includes('study')) return '📚';
  if (name.includes('art') || name.includes('design') || name.includes('creative') || name.includes('graphics')) return '🎨';
  if (name.includes('sports') || name.includes('fitness') || name.includes('health') || name.includes('exercise')) return '🏃';
  if (name.includes('music') || name.includes('audio') || name.includes('sound')) return '🎵';
  if (name.includes('movies') || name.includes('film') || name.includes('entertainment') || name.includes('tv')) return '🎬';
  if (name.includes('food') || name.includes('cooking') || name.includes('recipe') || name.includes('kitchen')) return '🍕';
  if (name.includes('travel') || name.includes('tourism') || name.includes('vacation') || name.includes('trip')) return '✈️';
  if (name.includes('business') || name.includes('work') || name.includes('career') || name.includes('job')) return '💼';
  if (name.includes('support') || name.includes('help') || name.includes('technical') || name.includes('bug')) return '🔧';
  if (name.includes('news') || name.includes('announcement') || name.includes('update')) return '📰';
  if (name.includes('science') || name.includes('research') || name.includes('experiment')) return '🔬';
  if (name.includes('photography') || name.includes('photo') || name.includes('camera')) return '📷';
  if (name.includes('book') || name.includes('reading') || name.includes('literature')) return '📖';
  if (name.includes('anime') || name.includes('manga') || name.includes('cartoon')) return '🎌';
  if (name.includes('pet') || name.includes('animal') || name.includes('dog') || name.includes('cat')) return '🐾';
  if (name.includes('car') || name.includes('automotive') || name.includes('vehicle')) return '🚗';
  if (name.includes('nature') || name.includes('environment') || name.includes('outdoor')) return '🌲';
  if (name.includes('finance') || name.includes('money') || name.includes('investment')) return '💰';
  if (name.includes('lifestyle') || name.includes('fashion') || name.includes('style')) return '✨';

  // Default symbol
  return '📁';
}

async function loadCategories() {
  try {
    const response = await fetch(`${API_BASE}/categories.php`);
    categories = await response.json();

    const container = document.getElementById('categoriesList');
    container.innerHTML = `
      <a href="#"
         class="list-group-item list-group-item-action ${!currentCategory ? 'active' : ''}"
         onclick="filterByCategory(null)">
        <i class="fas fa-globe"></i> All Categories
      </a>
    `;

    categories.forEach(cat => {
      const item = document.createElement('a');
      item.href = '#';
      item.className = `list-group-item list-group-item-action ${currentCategory === cat.id ? 'active' : ''}`;
      const symbol = getCategorySymbol(cat.name);
      item.innerHTML = `<span class="category-symbol">${symbol}</span> ${escapeHtml(cat.name)}`;
      item.onclick = () => filterByCategory(cat.id);
      container.appendChild(item);
    });

    const categorySelect = document.getElementById('threadCategory');
    if (categorySelect) {
      categorySelect.innerHTML = '<option value="">Select a category</option>';
      categories.forEach(cat => {
        const symbol = getCategorySymbol(cat.name);
        categorySelect.innerHTML += `<option value="${cat.id}">${symbol} ${escapeHtml(cat.name)}</option>`;
      });
    }
  } catch (error) {
    console.error('Error loading categories:', error);
  }
}

function filterByCategory(categoryId) {
  currentCategory = categoryId;
  loadCategories();
  loadThreads();
}

async function loadThreads() {
  try {
    const resp = await fetch(`${API_BASE}/threads.php`);
    threads = await resp.json();

    const userIds = [...new Set(threads.map(t => t.author_id))];
    await loadUsers(userIds);

    let filtered = threads;
    if (currentCategory) {
      filtered = filtered.filter(t => t.category_id == currentCategory);
    }

    switch (currentFilter) {
      case 'popular-daily':
        filtered.sort((a, b) =>
          (b.click_count_daily ?? 0) - (a.click_count_daily ?? 0)
        );
        break;
      case 'popular-weekly':
        filtered.sort((a, b) =>
          (b.click_count_weekly ?? 0) - (a.click_count_weekly ?? 0)
        );
        break;
      case 'popular-monthly':
        filtered.sort((a, b) =>
          (b.click_count_monthly ?? 0) - (a.click_count_monthly ?? 0)
        );
        break;
      case 'newest':
      default:
        filtered.sort((a, b) =>
          new Date(b.created_at) - new Date(a.created_at)
        );
    }

    const container = document.getElementById('threadsContainer');
    container.innerHTML = '';

    filtered.forEach(thread => {
      const author = users[thread.author_id] || {};
      const category = categories.find(c => c.id === thread.category_id);
      const text = thread.content || '';
      const preview = escapeHtml(text.substring(0, 150));
      const more = text.length > 150 ? '…' : '';

      const total    = thread.click_count_total   ?? 0;
      const daily    = thread.click_count_daily   ?? 0;
      const weekly   = thread.click_count_weekly  ?? 0;
      const monthly  = thread.click_count_monthly ?? 0;
      const likes    = thread.like_count    ?? 0;
      const dislikes = thread.dislike_count ?? 0;

      const card = document.createElement('div');
      card.className = 'card thread-card mb-3';
      card.innerHTML = `
        <div class="card-body">
          <div class="d-flex align-items-start mb-2">
            <img
              src="${author.image_path || 'images/default-avatar.png'}"
              alt="${escapeHtml(author.nickname)}"
              class="user-avatar me-3"
              width="50" height="50"
            >
            <div class="flex-grow-1">
              <h5 class="thread-title mb-1">
                <a href="thread.html?id=${thread.id}" class="text-decoration-none text-dark">
                  ${escapeHtml(thread.title)}
                </a>
              </h5>
              <p class="thread-content mb-2">
                ${preview}${more}
              </p>
              <div class="thread-author-info text-secondary small">
                <span class="fw-semibold thread-author-name">
                  <a href="public-profile.html?id=${author.id}" class="text-decoration-none">
                    ${escapeHtml(author.nickname)}
                  </a>
                </span>
                <span class="ms-2">${formatTimeAgo(thread.created_at)}</span>
                ${thread.is_edited ? '<i class="fas fa-edit ms-2" title="Edited"></i>' : ''}
              </div>
            </div>
            ${category
              ? `<span class="badge bg-secondary ms-3 align-self-start category-badge">
                   <span class="category-symbol">${getCategorySymbol(category.name)}</span>
                   ${escapeHtml(category.name)}
                 </span>`
              : ''}
          </div>
          <div class="thread-stats d-flex align-items-center justify-content-end mt-3">
            <div class="stat views d-flex align-items-center me-4">
              <i class="fas fa-eye"></i>
              <span class="ms-1">${total}</span>
            </div>
            <div class="stat likes d-flex align-items-center me-3">
              <i class="fas fa-thumbs-up"></i>
              <span class="ms-1">${likes}</span>
            </div>
            <div class="stat dislikes d-flex align-items-center me-3">
              <i class="fas fa-thumbs-down"></i>
              <span class="ms-1">${dislikes}</span>
            </div>
            <div class="stat click-counts text-muted d-none d-md-block">
              (${daily} today, ${weekly} this week, ${monthly} this month)
            </div>
          </div>
        </div>
      `;
      container.appendChild(card);
    });

  } catch (err) {
    console.error('Error loading threads:', err);
  }
}

// Load users (batch)
async function loadUsers(userIds) {
  for (const userId of userIds) {
    if (!users[userId]) {
      try {
        const response = await fetch(`${API_BASE}/users.php?id=${userId}`);
        users[userId] = await response.json();
      } catch (error) {
        console.error(`Error loading user ${userId}:`, error);
      }
    }
  }
}

// Show create-thread modal (only if logged in)
function showCreateThreadModal() {
  if (!currentUser) {
    window.location.href = 'login.html';
    return;
  }
  new bootstrap.Modal(document.getElementById('createThreadModal')).show();
}

// Create a new thread
async function createThread() {
  const category = document.getElementById('threadCategory').value;
  const title    = document.getElementById('threadTitle').value.trim();
  const content  = document.getElementById('threadContent').value.trim();

  if (!category || !title || !content) {
    showAlert('Please fill in all fields', 'warning');
    return;
  }

  try {
    const resp = await fetch(`${API_BASE}/threads.php`, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({
        author_id:   currentUser.id,
        category_id: category,
        title:       title,
        content:     content
      })
    });
    if (!resp.ok) throw new Error('Failed to create thread');
    const { id } = await resp.json();

    // Bump user's post count
    await fetch(`${API_BASE}/users.php?id=${currentUser.id}`, {
      method: 'PUT',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({
        post_count: (currentUser.post_count || 0) + 1
      })
    });

    bootstrap.Modal.getInstance(
      document.getElementById('createThreadModal')
    ).hide();
    window.location.href = `thread.html?id=${id}`;

  } catch (error) {
    console.error('Error creating thread:', error);
    showAlert('Error creating thread', 'danger');
  }
}

// Wire up filter-tab clicks
function setupFilterTabs() {
  const tabs = document.querySelectorAll('#filterTabs .nav-link');
  tabs.forEach(tab => {
    tab.addEventListener('click', e => {
      e.preventDefault();
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentFilter = tab.getAttribute('data-filter');
      loadThreads();
    });
  });
}


document.addEventListener('DOMContentLoaded', async () => {
  await checkAuth();
  await loadCategories();
  await loadThreads();
  setupFilterTabs();

  document.getElementById('createThreadModal')
    .addEventListener('hidden.bs.modal', () => {
      document.getElementById('createThreadForm').reset();
    });
});
