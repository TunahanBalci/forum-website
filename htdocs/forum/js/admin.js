let users = [];
let threads = [];
let posts = [];
let categories = [];
let editingItemId = null;
let editingItemType = null;

async function loadAllData() {
    await loadUsers();
    await loadThreads();
    await loadPosts();
    await loadCategories();
}

async function loadUsers() {
    try {
        const response = await fetch(`${API_BASE}/users.php`);
        users = await response.json();
        displayUsers();
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

function displayUsers() {
    const tbody = document.getElementById('usersTableBody');
    tbody.innerHTML = '';
    
    users.forEach(user => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${user.id}</td>
            <td><a href="public-profile.html?id=${user.id}" class="text-decoration-none" target="_blank">${escapeHtml(user.nickname)}</a></td>
            <td>${escapeHtml(user.email)}</td>
            <td>${escapeHtml(user.fullname)}</td>
            <td>${user.post_count || 0}</td>
            <td>${new Date(user.created_at).toLocaleDateString()}</td>
            <td>
                <input type="checkbox" ${user.is_admin ? 'checked' : ''} 
                       onchange="toggleAdmin(${user.id}, this.checked)"
                       ${user.id == currentUser.id ? 'disabled' : ''}>
            </td>
            <td>
                <button class="btn btn-sm btn-danger" onclick="confirmDelete('user', ${user.id})"
                        ${user.id == currentUser.id ? 'disabled' : ''}>
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

async function toggleAdmin(userId, isAdmin) {
    try {
        await fetch(`${API_BASE}/users.php?id=${userId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                is_admin: isAdmin
            })
        });
        
        showAlert(`User ${isAdmin ? 'promoted to' : 'removed from'} admin`, 'success');
    } catch (error) {
        console.error('Error updating admin status:', error);
        showAlert('Error updating admin status', 'danger');
        loadUsers(); // Reload to reset checkbox
    }
}

async function loadThreads() {
    try {
        const response = await fetch(`${API_BASE}/threads.php`);
        threads = await response.json();
        
        // Load categories if needed
        if (categories.length === 0) {
            const catResponse = await fetch(`${API_BASE}/categories.php`);
            categories = await catResponse.json();
        }
        
        displayThreads();
    } catch (error) {
        console.error('Error loading threads:', error);
    }
}


function displayThreads() {
    const tbody = document.getElementById('threadsTableBody');
    tbody.innerHTML = '';
    
    threads.forEach(thread => {
        const author = users.find(u => u.id == thread.author_id);
        const category = categories.find(c => c.id == thread.category_id);
        
        const row = document.createElement('tr');
        
        // Create edit and delete buttons with proper event listeners
        const editBtn = document.createElement('button');
        editBtn.className = 'btn btn-sm btn-warning me-1';
        editBtn.innerHTML = '<i class="fas fa-edit"></i>';
        editBtn.onclick = () => editThread(thread.id);
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn btn-sm btn-danger';
        deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
        deleteBtn.onclick = () => confirmDelete('thread', thread.id);
        
        row.innerHTML = `
            <td>${thread.id}</td>
            <td>
                <a href="thread.html?id=${thread.id}" target="_blank">
                    ${escapeHtml(thread.title.substring(0, 50))}${thread.title.length > 50 ? '...' : ''}
                </a>
            </td>
            <td>${author ? `<a href="public-profile.html?id=${author.id}" class="text-decoration-none" target="_blank">${escapeHtml(author.nickname)}</a>` : 'Unknown'}</td>
            <td>${category ? escapeHtml(category.name) : 'None'}</td>
            <td>${new Date(thread.created_at).toLocaleDateString()}</td>
            <td>${thread.like_count || 0}</td>
            <td class="action-buttons"></td>
        `;
        
        // Append buttons to the action column
        const actionCell = row.querySelector('.action-buttons');
        actionCell.appendChild(editBtn);
        actionCell.appendChild(deleteBtn);
        
        tbody.appendChild(row);
    });
}


async function loadPosts() {
    try {
        const response = await fetch(`${API_BASE}/posts.php`);
        posts = await response.json();
        displayPosts();
    } catch (error) {
        console.error('Error loading posts:', error);
    }
}


function displayPosts() {
    const tbody = document.getElementById('postsTableBody');
    tbody.innerHTML = '';
    
    // Show only recent 50 posts
    const recentPosts = posts.slice(-50).reverse();
    
    recentPosts.forEach(post => {
        const author = users.find(u => u.id == post.author_id);
        const thread = threads.find(t => t.id == post.thread_id);
        
        const row = document.createElement('tr');
        
        // Create edit and delete buttons with proper event listeners
        const editBtn = document.createElement('button');
        editBtn.className = 'btn btn-sm btn-warning me-1';
        editBtn.innerHTML = '<i class="fas fa-edit"></i>';
        editBtn.onclick = () => editPost(post.id);
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn btn-sm btn-danger';
        deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
        deleteBtn.onclick = () => confirmDelete('post', post.id);
        
        row.innerHTML = `
            <td>${post.id}</td>
            <td>${escapeHtml(post.content.substring(0, 50))}${post.content.length > 50 ? '...' : ''}</td>
            <td>${author ? `<a href="public-profile.html?id=${author.id}" class="text-decoration-none" target="_blank">${escapeHtml(author.nickname)}</a>` : 'Unknown'}</td>
            <td>
                ${thread ? `<a href="thread.html?id=${thread.id}" target="_blank">${escapeHtml(thread.title.substring(0, 30))}</a>` : 'Deleted'}
            </td>
            <td>${new Date(post.created_at).toLocaleDateString()}</td>
            <td class="action-buttons"></td>
        `;
        
        // Append buttons to the action column
        const actionCell = row.querySelector('.action-buttons');
        actionCell.appendChild(editBtn);
        actionCell.appendChild(deleteBtn);
        
        tbody.appendChild(row);
    });
}


async function loadCategories() {
    try {
        const response = await fetch(`${API_BASE}/categories.php`);
        categories = await response.json();
        displayCategories();
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}


function displayCategories() {
    const tbody = document.getElementById('categoriesTableBody');
    tbody.innerHTML = '';
    
    categories.forEach(category => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${category.id}</td>
            <td>${escapeHtml(category.name)}</td>
            <td>
                <button class="btn btn-sm btn-danger" onclick="confirmDelete('category', ${category.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}


function editThread(threadId) {
    console.log('Editing thread:', threadId); // Debug log
    const thread = threads.find(t => t.id == threadId);
    if (!thread) {
        console.error('Thread not found:', threadId);
        showAlert('Thread not found', 'danger');
        return;
    }
    
    editingItemId = threadId;
    editingItemType = 'thread';
    
    document.getElementById('editModalTitle').textContent = 'Edit Thread';
    document.getElementById('editTitle').value = thread.title || '';
    document.getElementById('editContent').value = thread.content || '';
    document.getElementById('editTitleGroup').style.display = 'block';
    
    const modal = new bootstrap.Modal(document.getElementById('editModal'));
    modal.show();
}


function editPost(postId) {
    console.log('Editing post:', postId); // Debug log
    const post = posts.find(p => p.id == postId);
    if (!post) {
        console.error('Post not found:', postId);
        showAlert('Post not found', 'danger');
        return;
    }
    
    editingItemId = postId;
    editingItemType = 'post';
    
    document.getElementById('editModalTitle').textContent = 'Edit Post';
    document.getElementById('editContent').value = post.content || '';
    document.getElementById('editTitleGroup').style.display = 'none';
    
    const modal = new bootstrap.Modal(document.getElementById('editModal'));
    modal.show();
}

async function saveEdit() {
    if (!editingItemId || !editingItemType) return;
    
    const content = document.getElementById('editContent').value.trim();
    if (!content) {
        showAlert('Content is required', 'warning');
        return;
    }
    
    try {
        let url = `${API_BASE}/${editingItemType}s.php?id=${editingItemId}`;
        let data = { content: content, is_edited: true };
        
        if (editingItemType === 'thread') {
            const title = document.getElementById('editTitle').value.trim();
            if (!title) {
                showAlert('Title is required', 'warning');
                return;
            }
            data.title = title;
        }
        
        const response = await fetch(url, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            bootstrap.Modal.getInstance(document.getElementById('editModal')).hide();
            showAlert(`${editingItemType.charAt(0).toUpperCase() + editingItemType.slice(1)} updated successfully`, 'success');
            
            // Reload appropriate data
            if (editingItemType === 'thread') {
                loadThreads();
            } else {
                loadPosts();
            }
            
            editingItemId = null;
            editingItemType = null;
        } else {
            throw new Error('Failed to update');
        }
    } catch (error) {
        console.error(`Error updating ${editingItemType}:`, error);
        showAlert(`Error updating ${editingItemType}`, 'danger');
    }
}

// Show add category modal
function showAddCategoryModal() {
    const modal = new bootstrap.Modal(document.getElementById('addCategoryModal'));
    modal.show();
}

async function addCategory() {
    const name = document.getElementById('categoryName').value.trim();
    if (!name) return;
    
    try {
        const response = await fetch(`${API_BASE}/categories.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: name })
        });
        
        if (response.ok) {
            bootstrap.Modal.getInstance(document.getElementById('addCategoryModal')).hide();
            document.getElementById('categoryName').value = '';
            showAlert('Category added successfully', 'success');
            loadCategories();
        }
    } catch (error) {
        console.error('Error adding category:', error);
        showAlert('Error adding category', 'danger');
    }
}

function confirmDelete(type, id) {
    const messages = {
        user: 'Are you sure you want to delete this user? All their threads and posts will also be deleted.',
        thread: 'Are you sure you want to delete this thread? All posts in the thread will also be deleted.',
        post: 'Are you sure you want to delete this post?',
        category: 'Are you sure you want to delete this category? Threads in this category will have no category.'
    };
    
    document.getElementById('confirmMessage').textContent = messages[type];
    document.getElementById('confirmButton').onclick = () => performDelete(type, id);
    
    const modal = new bootstrap.Modal(document.getElementById('confirmModal'));
    modal.show();
}

async function performDelete(type, id) {
    try {
        let url;
        switch (type) {
            case 'user':
                url = `${API_BASE}/users.php?id=${id}`;
                break;
            case 'thread':
                url = `${API_BASE}/threads.php?id=${id}`;
                break;
            case 'post':
                url = `${API_BASE}/posts.php?id=${id}`;
                break;
            case 'category':
                url = `${API_BASE}/categories.php?id=${id}`;
                break;
        }
        
        const response = await fetch(url, { method: 'DELETE' });
        
        if (response.ok) {
            bootstrap.Modal.getInstance(document.getElementById('confirmModal')).hide();
            showAlert(`${type.charAt(0).toUpperCase() + type.slice(1)} deleted successfully`, 'success');
            
            // Reload appropriate data
            switch (type) {
                case 'user':
                    loadUsers();
                    break;
                case 'thread':
                    loadThreads();
                    break;
                case 'post':
                    loadPosts();
                    break;
                case 'category':
                    loadCategories();
                    break;
            }
        }
    } catch (error) {
        console.error(`Error deleting ${type}:`, error);
        showAlert(`Error deleting ${type}`, 'danger');
    }
}

// Initialize admin panel
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Admin page loading...'); // Debug log
    
    await checkAuth();
    
    console.log('Current user after checkAuth:', currentUser); // Debug log
    
    if (!currentUser) {
        console.log('No current user, redirecting to login'); // Debug log
        showAlert('Please log in to access admin panel.', 'warning');
        setTimeout(() => window.location.href = 'login.html', 2000);
        return;
    }
    
    // Check admin status with multiple possible values
    const isAdmin = currentUser.is_admin == 1 || 
                   currentUser.is_admin === true || 
                   currentUser.is_admin === '1' ||
                   currentUser.is_admin === 'true';
                   
    console.log('Admin check result:', isAdmin, 'Raw value:', currentUser.is_admin, 'Type:', typeof currentUser.is_admin); // Debug log
    
    if (!isAdmin) {
        console.log('User is not admin, redirecting'); // Debug log
        showAlert('Access denied. Admin privileges required.', 'danger');
        setTimeout(() => window.location.href = 'index.html', 2000);
        return;
    }
    
    console.log('Admin access granted, loading data...'); 
    await loadAllData();
    

    document.querySelectorAll('#adminTabs .nav-link').forEach(tab => {
        tab.addEventListener('shown.bs.tab', function() {

            const target = this.getAttribute('data-bs-target');
            switch (target) {
                case '#users':
                    loadUsers();
                    break;
                case '#threads':
                    loadThreads();
                    break;
                case '#posts':
                    loadPosts();
                    break;
                case '#categories':
                    loadCategories();
                    break;
            }
        });
    });
});