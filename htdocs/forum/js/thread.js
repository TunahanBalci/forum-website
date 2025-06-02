let threadId = null;
let threadData = null;
let posts = [];
let users = {};
let replyToPost = null;
let editingPostId = null;


document.addEventListener('DOMContentLoaded', async function() {
    await checkAuth(); 

    threadId = getThreadId();
    
    if (!threadId) {
        window.location.href = 'index.html';
        return;
    }
    
    await loadThread();
    await loadPosts();
    

    setInterval(loadPosts, 30000);
    
});

function getThreadId() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
}

async function loadThread() {
    try {
        const resp = await fetch(`${API_BASE}/threads.php?id=${threadId}`);
        if (!resp.ok) throw new Error('Thread fetch failed');
        const t = await resp.json();
        
        threadData = t;
        
        const authorResponse = await fetch(`${API_BASE}/users.php?id=${threadData.author_id}`);
        const author = await authorResponse.json();
        users[author.id] = author;
        
        const categoriesResponse = await fetch(`${API_BASE}/categories.php`);
        const categories = await categoriesResponse.json();
        const category = categories.find(c => c.id == threadData.category_id);
        
        document.getElementById('threadTitle').textContent = t.title;
        document.getElementById('threadCategory').textContent = category?.name || '';
        document.getElementById('threadContent').innerHTML = escapeHtml(t.content).replace(/\n/g,'<br>');
        document.getElementById('threadAuthorName').innerHTML = `<a href="public-profile.html?id=${author.id}" class="text-decoration-none">${escapeHtml(author.nickname)}</a>`;
        document.getElementById('threadAuthorAvatar').src = author.image_path || 'images/default-avatar.png';

        const createdAtEl = document.getElementById('threadCreatedAt');
        createdAtEl.textContent = formatTimeAgo(t.created_at);
        if (t.is_edited) {
        createdAtEl.textContent += ' (edited)';
        }


        document.getElementById('threadClickTotal').textContent = t.click_count_total || 0;
        document.getElementById('threadClickDaily').textContent = t.click_count_daily || 0;
        document.getElementById('threadClickWeekly').textContent = t.click_count_weekly || 0;
        document.getElementById('threadClickMonthly').textContent = t.click_count_monthly || 0;
        document.getElementById('threadLikes').textContent = t.like_count || 0;
        document.getElementById('threadDislikes').textContent = t.dislike_count || 0;
        
        document.getElementById('messageAuthorBtn').onclick = () => {
            if (!currentUser) {
                window.location.href = 'login.html';
                return;
            }
            openMessageBox(author.id, author.nickname, author.image_path);
        };
        
        // Set up edit button for thread owner only
        if (currentUser && currentUser.id == threadData.author_id) {
            const editBtn = document.getElementById('editThreadBtn');
            if (editBtn) {
                editBtn.style.display = 'inline-block';
                editBtn.onclick = () => editThread();
            }
        }
        
        // Set up delete button for thread owner and admins
        if (currentUser && (currentUser.id == threadData.author_id || currentUser.is_admin)) {
            const deleteBtn = document.getElementById('deleteThreadBtn');
            if (deleteBtn) {
                deleteBtn.style.display = 'inline-block';
                deleteBtn.onclick = () => deleteThread();
            }
        }
        
    } catch (error) {
        console.error('Error loading thread:', error);
        showAlert('Thread not found', 'danger');
        setTimeout(() => window.location.href = 'index.html', 2000);
    }
}

async function loadPosts() {
    try {
        const response = await fetch(`${API_BASE}/posts.php`);
        const allPosts = await response.json();
        

        posts = allPosts.filter(p => p.thread_id == threadId);
        

        const userIds = [...new Set(posts.map(p => p.author_id))];
        for (const userId of userIds) {
            if (!users[userId]) {
                const userResponse = await fetch(`${API_BASE}/users.php?id=${userId}`);
                users[userId] = await userResponse.json();
            }
        }
        
        displayPosts();
    } catch (error) {
        console.error('Error loading posts:', error);
    }
}

function displayPosts() {
    const container = document.getElementById('postsContainer');
    container.innerHTML = '';
    
    posts.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    
    posts.forEach(post => {
        const author = users[post.author_id] || { nickname: 'Unknown', image_path: null };
        
        const postCard = document.createElement('div');
        postCard.className = 'card post-card mb-3';
        postCard.id = `post-${post.id}`;
        
        let replyInfo = '';
        if (post.parent_post_id) {
            const parentPost = posts.find(p => p.id == post.parent_post_id);
            if (parentPost) {
                const parentAuthor = users[parentPost.author_id];
                replyInfo = `
                    <div class="post-reply-info">
                        <i class="fas fa-reply"></i> Replying to ${parentAuthor ? parentAuthor.nickname : 'Unknown'}: 
                        "${escapeHtml(parentPost.content.substring(0, 50))}${parentPost.content.length > 50 ? '...' : ''}"
                    </div>
                `;
            }
        }
        
        postCard.innerHTML = `
            <div class="card-body">
                ${replyInfo}
                <div class="d-flex mb-3">
                    <img src="${author.image_path || 'images/default-avatar.png'}" 
                         class="rounded-circle me-3 user-avatar" width="40" height="40">
                    <div class="flex-grow-1">
                        <h6 class="mb-0"><a href="public-profile.html?id=${author.id}" class="text-decoration-none">${escapeHtml(author.nickname)}</a></h6>
                        <small class="text-muted">
                            ${formatTimeAgo(post.created_at)}
                            ${post.is_edited ? '<span class="edited-indicator">• Edited</span>' : ''}
                        </small>
                    </div>
                    <div class="d-flex flex-wrap gap-1">
                        ${currentUser ? `
                            <button class="btn btn-sm btn-outline-primary" onclick="openMessageBox(${author.id}, '${escapeHtml(author.nickname)}', '${author.image_path || 'images/default-avatar.png'}')">
                                <i class="fas fa-envelope"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-secondary" onclick="setReplyTo(${post.id})">
                                <i class="fas fa-reply"></i>
                            </button>
                        ` : ''}
                        ${currentUser && currentUser.id == post.author_id ? `
                            <button class="btn btn-sm btn-outline-warning" onclick="editPost(${post.id})">
                                <i class="fas fa-edit"></i>
                            </button>
                        ` : ''}
                        ${currentUser && (currentUser.id == post.author_id || currentUser.is_admin) ? `
                            <button class="btn btn-sm btn-outline-danger" onclick="deletePost(${post.id})">
                                <i class="fas fa-trash"></i>
                            </button>
                        ` : ''}
                    </div>
                </div>
                <div class="post-content">${escapeHtml(post.content).replace(/\n/g, '<br>')}</div>
                <div class="mt-2">
                    <button class="btn btn-sm btn-outline-success" onclick="likePost(${post.id})">
                        <i class="fas fa-thumbs-up"></i> <span id="postLikes-${post.id}">${post.like_count || 0}</span>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="dislikePost(${post.id})">
                        <i class="fas fa-thumbs-down"></i> <span id="postDislikes-${post.id}">${post.dislike_count || 0}</span>
                    </button>
                </div>
            </div>
        `;
        
        container.appendChild(postCard);
    });
}

document.getElementById('postForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    if (!currentUser) {
        window.location.href = 'login.html';
        return;
    }
    
    const content = document.getElementById('postContent').value.trim();
    if (!content) return;
    
    try {
        const postData = {
            thread_id: threadId,
            author_id: currentUser.id,
            content: content
        };
        
        if (replyToPost) {
            postData.parent_post_id = replyToPost;
        }
        
        const response = await fetch(`${API_BASE}/posts.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(postData)
        });
        
        if (response.ok) {

            await fetch(`${API_BASE}/users.php?id=${currentUser.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    post_count: (currentUser.post_count || 0) + 1
                })
            });
            
            document.getElementById('postContent').value = '';
            cancelReply();
            await loadPosts();
            
            // Scroll to new post
            const result = await response.json();
            setTimeout(() => {
                const newPost = document.getElementById(`post-${result.id}`);
                if (newPost) {
                    newPost.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    newPost.classList.add('highlight');
                    setTimeout(() => newPost.classList.remove('highlight'), 2000);
                }
            }, 100);
        }
    } catch (error) {
        console.error('Error creating post:', error);
        showAlert('Error creating post', 'danger');
    }
});

function setReplyTo(postId) {
    const post = posts.find(p => p.id == postId);
    if (!post) return;
    
    replyToPost = postId;
    const author = users[post.author_id];
    
    document.getElementById('replyToInfo').style.display = 'block';
    document.getElementById('replyToText').textContent = `${author.nickname}: "${post.content.substring(0, 50)}${post.content.length > 50 ? '...' : ''}"`;
    document.getElementById('postContent').focus();
}

function cancelReply() {
    replyToPost = null;
    document.getElementById('replyToInfo').style.display = 'none';
}

function editPost(postId) {
    if (!currentUser) {
        window.location.href = 'login.html';
        return;
    }
    
    const post = posts.find(p => p.id == postId);
    if (!post) return;
    
    // Check if user can edit 
    if (currentUser.id != post.author_id) {
        showAlert('You can only edit your own posts', 'warning');
        return;
    }
    
    editingPostId = postId;
    document.getElementById('editPostContent').value = post.content;
    
    const modal = new bootstrap.Modal(document.getElementById('editPostModal'));
    modal.show();
}

async function updatePost() {
    const content = document.getElementById('editPostContent').value.trim();
    if (!content || !editingPostId) return;
    
    try {
        await fetch(`${API_BASE}/posts.php?id=${editingPostId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                content: content,
                is_edited: true
            })
        });
        
        bootstrap.Modal.getInstance(document.getElementById('editPostModal')).hide();
        await loadPosts();
    } catch (error) {
        console.error('Error updating post:', error);
        showAlert('Error updating post', 'danger');
    }
}

async function deletePost(postId) {
    if (!currentUser) {
        window.location.href = 'login.html';
        return;
    }
    
    const post = posts.find(p => p.id == postId);
    if (!post) return;
    
    // Check if user can delete
    if (currentUser.id != post.author_id && !currentUser.is_admin) {
        showAlert('You can only delete your own posts', 'warning');
        return;
    }
    
    if (!confirm('Are you sure you want to delete this post?')) return;
    
    try {
        const response = await fetch(`${API_BASE}/posts.php?id=${postId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {

            const postIndex = posts.findIndex(p => p.id == postId);
            if (postIndex > -1) {
                posts.splice(postIndex, 1);
            }
            
            const postElement = document.getElementById(`post-${postId}`);
            if (postElement) {
                postElement.remove();
            }
            
            showAlert('Post deleted successfully', 'success');
        } else {
            throw new Error('Failed to delete post');
        }
    } catch (error) {
        console.error('Error deleting post:', error);
        showAlert('Error deleting post', 'danger');
    }
}

function editThread() {
    if (!currentUser || !threadData) return;
    
    // Check if user can edit this thread 
    if (currentUser.id != threadData.author_id) {
        showAlert('You can only edit your own threads', 'warning');
        return;
    }
    
    document.getElementById('editThreadTitle').value = threadData.title;
    document.getElementById('editThreadContent').value = threadData.content;
    
    const modal = new bootstrap.Modal(document.getElementById('editThreadModal'));
    modal.show();
}

async function updateThread() {
    if (!currentUser || !threadData) return;
    
    const title = document.getElementById('editThreadTitle').value.trim();
    const content = document.getElementById('editThreadContent').value.trim();
    
    if (!title || !content) {
        showAlert('Title and content are required', 'warning');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/threads.php?id=${threadId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: title,
                content: content,
                is_edited: true
            })
        });
        
        if (response.ok) {

            threadData.title = title;
            threadData.content = content;
            threadData.is_edited = true;
            
            document.getElementById('threadTitle').textContent = title;
            document.getElementById('threadContent').innerHTML = escapeHtml(content).replace(/\n/g, '<br>');
            
            // Add edited indicator if not already present
            const createdAtElement = document.getElementById('threadCreatedAt');
            if (!createdAtElement.textContent.includes('(edited)')) {
                createdAtElement.textContent += ' (edited)';
            }
            
            bootstrap.Modal.getInstance(document.getElementById('editThreadModal')).hide();
            showAlert('Thread updated successfully', 'success');
        } else {
            throw new Error('Failed to update thread');
        }
    } catch (error) {
        console.error('Error updating thread:', error);
        showAlert('Error updating thread', 'danger');
    }
}

async function deleteThread() {
    if (!confirm('Are you sure you want to delete this thread? All posts will also be deleted.')) return;
    
    try {
        await fetch(`${API_BASE}/threads.php?id=${threadId}`, {
            method: 'DELETE'
        });
        
        showAlert('Thread deleted. Redirecting...', 'success');
        setTimeout(() => window.location.href = 'index.html', 2000);
    } catch (error) {
        console.error('Error deleting thread:', error);
        showAlert('Error deleting thread', 'danger');
    }
}

async function likeThread() {
    if (!currentUser) {
        window.location.href = 'login.html';
        return;
    }
    
    try {
        const res = await fetch(`${API_BASE}/votes.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ thread_id: threadId, vote: 1 })
        });
        
        if (!res.ok) throw new Error('Vote failed');
        
        const { likes, dislikes } = await res.json();
        document.getElementById('threadLikes').textContent = likes;
        document.getElementById('threadDislikes').textContent = dislikes;
    } catch (error) {
        console.error('Error voting on thread:', error);
        showAlert('Error voting on thread', 'danger');
    }
}

async function dislikeThread() {
    if (!currentUser) {
        window.location.href = 'login.html';
        return;
    }
    
    try {
        const res = await fetch(`${API_BASE}/votes.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ thread_id: threadId, vote: -1 })
        });
        
        if (!res.ok) throw new Error('Vote failed');
        
        const { likes, dislikes } = await res.json();
        document.getElementById('threadLikes').textContent = likes;
        document.getElementById('threadDislikes').textContent = dislikes;
    } catch (error) {
        console.error('Error voting on thread:', error);
        showAlert('Error voting on thread', 'danger');
    }
}

async function votePost(postId, voteValue) {
    if (!currentUser) {
        return window.location.href = 'login.html';
    }
    try {
        const res = await fetch(`${API_BASE}/votes.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ post_id: postId, vote: voteValue })
        });
        if (!res.ok) throw new Error('Vote failed');
        const { likes, dislikes } = await res.json();

        document.getElementById(`postLikes-${postId}`).textContent = likes;
        document.getElementById(`postDislikes-${postId}`).textContent = dislikes;

        const p = posts.find(p => p.id === postId);
        if (p) {
            p.like_count = likes;
            p.dislike_count = dislikes;
        }
    } catch (err) {
        console.error('Error voting on post:', err);
        showAlert('Couldn\'t register vote', 'danger');
    }
}

function likePost(postId) {
    votePost(postId, 1);
}

function dislikePost(postId) {
    votePost(postId, -1);
}