let profileUserId = null;
let profileUserData = null;

function getUserIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
}

async function loadUserProfile() {
    try {
        const response = await fetch(`${API_BASE}/users.php?id=${profileUserId}`);
        if (!response.ok) {
            throw new Error('User not found');
        }
        
        profileUserData = await response.json();
        
        if (!profileUserData || !profileUserData.id) {
            throw new Error('User not found');
        }
        
        displayUserProfile();
    } catch (error) {
        console.error('Error loading user profile:', error);
        showAlert('User not found', 'danger');
        setTimeout(() => window.location.href = 'index.html', 2000);
    }
}

function displayUserProfile() {

    document.getElementById('userAvatar').src = profileUserData.image_path || 'images/default-avatar.png';
    document.getElementById('userNickname').textContent = profileUserData.nickname;
    document.getElementById('userJoined').textContent = new Date(profileUserData.created_at).toLocaleDateString();
    document.getElementById('userPostCount').textContent = profileUserData.post_count || 0;
    
    // Bio (only show if exists)
    if (profileUserData.bio && profileUserData.bio.trim()) {
        document.getElementById('userBio').textContent = profileUserData.bio;
        document.getElementById('userBioSection').style.display = 'block';
    }
    
    if (currentUser && currentUser.id != profileUserId) {
        document.getElementById('messageUserBtn').style.display = 'inline-block';
    }
    
    document.title = `${profileUserData.nickname}'s Profile - Forum`;
}

async function loadUserThreads() {
    try {
        const response = await fetch(`${API_BASE}/threads.php`);
        const allThreads = await response.json();
        
        const userThreads = allThreads.filter(thread => thread.author_id == profileUserId);
        
        const recentThreads = userThreads
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, 5);
        
        const container = document.getElementById('userThreadsContainer');
        
        if (recentThreads.length === 0) {
            container.innerHTML = '<p class="text-muted">No threads yet.</p>';
            return;
        }
        
        const categoriesResponse = await fetch(`${API_BASE}/categories.php`);
        const categories = await categoriesResponse.json();
        
        container.innerHTML = '';
        recentThreads.forEach(thread => {
            const category = categories.find(c => c.id == thread.category_id);
            
            const threadElement = document.createElement('div');
            threadElement.className = 'border-bottom pb-2 mb-2';
            threadElement.innerHTML = `
                <h6 class="mb-1">
                    <a href="thread.html?id=${thread.id}" class="text-decoration-none">
                        ${escapeHtml(thread.title)}
                    </a>
                    ${category ? `<span class="badge bg-secondary ms-2">${escapeHtml(category.name)}</span>` : ''}
                </h6>
                <small class="text-muted">
                    ${formatTimeAgo(thread.created_at)} • 
                    ${thread.like_count || 0} likes • 
                    ${thread.click_count_total || 0} views
                </small>
                <p class="mb-0 text-muted small">
                    ${escapeHtml(thread.content.substring(0, 100))}${thread.content.length > 100 ? '...' : ''}
                </p>
            `;
            container.appendChild(threadElement);
        });
        
    } catch (error) {
        console.error('Error loading user threads:', error);
        document.getElementById('userThreadsContainer').innerHTML = '<p class="text-muted">Error loading threads.</p>';
    }
}

async function loadUserPosts() {
    try {
        const response = await fetch(`${API_BASE}/posts.php`);
        const allPosts = await response.json();
        
        const userPosts = allPosts.filter(post => post.author_id == profileUserId);
        
        // Sort by creation date 
        const recentPosts = userPosts
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, 10);
        
        const container = document.getElementById('userPostsContainer');
        
        if (recentPosts.length === 0) {
            container.innerHTML = '<p class="text-muted">No posts yet.</p>';
            return;
        }
        
        // Load threads for post context
        const threadsResponse = await fetch(`${API_BASE}/threads.php`);
        const allThreads = await threadsResponse.json();
        
        container.innerHTML = '';
        recentPosts.forEach(post => {
            const thread = allThreads.find(t => t.id == post.thread_id);
            
            const postElement = document.createElement('div');
            postElement.className = 'border-bottom pb-2 mb-2';
            postElement.innerHTML = `
                <div class="d-flex justify-content-between align-items-start mb-1">
                    <small class="text-muted">
                        Posted in: ${thread ? `<a href="thread.html?id=${thread.id}" class="text-decoration-none">${escapeHtml(thread.title)}</a>` : 'Deleted thread'}
                    </small>
                    <small class="text-muted">${formatTimeAgo(post.created_at)}</small>
                </div>
                <p class="mb-0">
                    ${escapeHtml(post.content.substring(0, 200))}${post.content.length > 200 ? '...' : ''}
                </p>
                <small class="text-muted">
                    ${post.like_count || 0} likes • ${post.dislike_count || 0} dislikes
                    ${post.is_edited ? ' • Edited' : ''}
                </small>
            `;
            container.appendChild(postElement);
        });
        
    } catch (error) {
        console.error('Error loading user posts:', error);
        document.getElementById('userPostsContainer').innerHTML = '<p class="text-muted">Error loading posts.</p>';
    }
}

function messageUser() {
    if (!currentUser) {
        window.location.href = 'login.html';
        return;
    }
    
    if (!profileUserData) return;
    
    openMessageBox(profileUserData.id, profileUserData.nickname, profileUserData.image_path);
}

document.addEventListener('DOMContentLoaded', async function() {
    await checkAuth();
    
    profileUserId = getUserIdFromUrl();
    
    if (!profileUserId) {
        showAlert('Invalid user ID', 'danger');
        setTimeout(() => window.location.href = 'index.html', 2000);
        return;
    }
    
    await loadUserProfile();
    await loadUserThreads();
    await loadUserPosts();
});