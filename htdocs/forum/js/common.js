let currentUser = null;
let messageRecipient = null;
let messageInterval = null;
let isMessageSending = false;
let messageEventListenerAttached = false;

const API_BASE = '/api';

document.addEventListener('DOMContentLoaded', function() {
    loadCurrentUser();
    checkAuth();
    setupMessageInputHandler();
    setupRememberedUser();
    setupBirthdateValidation();
});

function loadCurrentUser() {
    const userData = sessionStorage.getItem('user');
    if (userData) {
        try {
            currentUser = JSON.parse(userData);
            console.log('Current user loaded:', currentUser);
        } catch (e) {
            console.error('Error parsing user data:', e);
            sessionStorage.removeItem('user');
        }
    }
}

async function checkAuth() {
    const sessionData = sessionStorage.getItem('user');
    if (sessionData) {
        try {
            currentUser = JSON.parse(sessionData);
            updateUIForAuth();
            return currentUser;
        } catch (e) {
            console.error('Error parsing user data:', e);
            sessionStorage.removeItem('user');
        }
    }
    
    updateUIForGuest();
    return null;
}

function updateUIForAuth() {
    if (!currentUser) return;

    console.log('Current user data:', currentUser);

    const loginLink = document.getElementById('loginLink');
    if (loginLink) loginLink.style.display = 'none';
    const registerLink = document.getElementById('registerLink');
    if (registerLink) registerLink.style.display = 'none';

    const messagesLink = document.getElementById('messagesLink');
    if (messagesLink) messagesLink.style.display = 'block';

    const userMenu = document.getElementById('userMenu');
    if (userMenu) userMenu.style.display = 'block';

    const navUsername = document.getElementById('navUsername');
    if (navUsername) navUsername.textContent = currentUser.nickname;
    const navAvatar = document.getElementById('navAvatar');
    if (navAvatar && currentUser.image_path) {
        navAvatar.src = currentUser.image_path;
    }

    console.log('Is admin check:', currentUser.is_admin, typeof currentUser.is_admin);
    if (currentUser.is_admin == 1 || currentUser.is_admin === true || currentUser.is_admin === '1') {
        document.body.classList.add('admin');
        const adminMenu = document.getElementById('adminMenu');
        console.log('Admin menu element:', adminMenu);
        if (adminMenu) {
            adminMenu.style.display = 'block';
            console.log('Admin menu should now be visible');
        }
    }

    const createBtn = document.getElementById('createThreadBtn');
    if (createBtn) createBtn.style.display = 'block';

    const replyForm = document.getElementById('replyFormCard');
    if (replyForm) replyForm.style.display = 'block';

    loadNotificationCount();
}

function updateUIForGuest() {
    const loginLink = document.getElementById('loginLink');
    if (loginLink) loginLink.style.display = 'block';
    const registerLink = document.getElementById('registerLink');
    if (registerLink) registerLink.style.display = 'block';

    const messagesLink = document.getElementById('messagesLink');
    if (messagesLink) messagesLink.style.display = 'none';
    const userMenu = document.getElementById('userMenu');
    if (userMenu) userMenu.style.display = 'none';
    const adminMenu = document.getElementById('adminMenu');
    if (adminMenu) adminMenu.style.display = 'none';
    const createBtn = document.getElementById('createThreadBtn');
    if (createBtn) createBtn.style.display = 'none';
    const replyForm = document.getElementById('replyFormCard');
    if (replyForm) replyForm.style.display = 'none';
}

async function logout() {
    try {
        const response = await fetch(`${API_BASE}/logout.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            sessionStorage.removeItem('user');
            localStorage.removeItem('rememberUser');
            currentUser = null;
            
            showAlert('Logged out successfully', 'success');
            
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);
        } else {
            console.error('Logout failed');
            showAlert('Logout failed', 'danger');
        }
    } catch (error) {
        console.error('Logout error:', error);
        showAlert('An error occurred during logout', 'danger');
    }
}

async function loadNotificationCount() {
    if (!currentUser) return;
    try {
        const response = await fetch(`${API_BASE}/notifications.php?user_id=${currentUser.id}&is_read=0`);
        const unreadNotifs = await response.json();
        const count = unreadNotifs.length;
        const badge = document.getElementById('notifCount');
        if (badge) {
            badge.textContent = count;
            if (count > 0) badge.classList.add('bg-danger');
            else badge.classList.remove('bg-danger');
        }
    } catch (error) {
        console.error('Error loading notifications:', error);
    }
}

async function showNotifications() {
    if (!currentUser) return;
    const modal = new bootstrap.Modal(document.getElementById('notificationsModal'));
    const container = document.getElementById('notificationsList');
    try {
        const response = await fetch(`${API_BASE}/notifications.php?user_id=${currentUser.id}`);
        const notifications = await response.json();
        
        container.innerHTML = '';
        if (notifications.length === 0) {
            container.innerHTML = '<p class="text-center text-muted">No notifications yet</p>';
        } else {
            const clearAllButton = document.createElement('div');
            clearAllButton.className = 'text-end mb-3';
            clearAllButton.innerHTML = `
                <button class="btn btn-sm btn-outline-secondary" onclick="clearAllNotifications()">
                    <i class="fas fa-trash"></i> Clear All
                </button>
            `;
            container.appendChild(clearAllButton);
            
            for (const notif of notifications) {
                const notifEl = document.createElement('div');
                notifEl.className = `notification-item ${notif.is_read == 0 ? 'unread' : ''}`;
                notifEl.innerHTML = await formatNotification(notif);
                notifEl.onclick = () => handleNotificationClick(notif);
                container.appendChild(notifEl);
            }
        }
        modal.show();
    } catch (error) {
        console.error('Error loading notifications:', error);
        showAlert('Error loading notifications', 'danger');
    }
}

async function formatNotification(notif) {
    try {
        const actorName = notif.actor_name || 'Unknown User';
        
        let message;
        switch (notif.type) {
            case 'reply':
                try {
                    const replyPostResponse = await fetch(`${API_BASE}/posts.php?id=${notif.entity_id}`);
                    const replyPost = await replyPostResponse.json();
                    
                    if (replyPost && replyPost.parent_post_id) {
                        const parentPostResponse = await fetch(`${API_BASE}/posts.php?id=${replyPost.parent_post_id}`);
                        const parentPost = await parentPostResponse.json();
                        
                        if (parentPost && parentPost.content) {
                            const contentPreview = parentPost.content.length > 50 
                                ? parentPost.content.substring(0, 50) + '...'
                                : parentPost.content;
                            message = `<strong>${escapeHtml(actorName)}</strong> replied to your post: "${escapeHtml(contentPreview)}"`;
                        } else {
                            message = `<strong>${escapeHtml(actorName)}</strong> replied to your post`;
                        }
                    } else {
                        message = `<strong>${escapeHtml(actorName)}</strong> replied to your post`;
                    }
                } catch (error) {
                    console.error('Error fetching post content for reply notification:', error);
                    message = `<strong>${escapeHtml(actorName)}</strong> replied to your post`;
                }
                break;
            case 'thread_post':
                try {
                    const postResponse = await fetch(`${API_BASE}/posts.php?id=${notif.entity_id}`);
                    const post = await postResponse.json();
                    
                    if (post && post.thread_id) {
                        const threadResponse = await fetch(`${API_BASE}/threads.php?id=${post.thread_id}`);
                        const thread = await threadResponse.json();
                        
                        if (thread && thread.title) {
                            const titlePreview = thread.title.length > 30 
                                ? thread.title.substring(0, 30) + '...'
                                : thread.title;
                            message = `<strong>${escapeHtml(actorName)}</strong> posted in your thread: "${escapeHtml(titlePreview)}"`;
                        } else {
                            message = `<strong>${escapeHtml(actorName)}</strong> posted in your thread`;
                        }
                    } else {
                        message = `<strong>${escapeHtml(actorName)}</strong> posted in your thread`;
                    }
                } catch (error) {
                    console.error('Error fetching thread info for thread notification:', error);
                    message = `<strong>${escapeHtml(actorName)}</strong> posted in your thread`;
                }
                break;
            case 'message':
                message = `<strong>${escapeHtml(actorName)}</strong> sent you a message`;
                break;
            default:
                message = 'You have a new notification';
        }
        
        let icon;
        switch (notif.type) {
            case 'reply':
                icon = '<i class="fas fa-reply text-primary"></i>';
                break;
            case 'thread_post':
                icon = '<i class="fas fa-comments text-success"></i>';
                break;
            case 'message':
                icon = '<i class="fas fa-envelope text-info"></i>';
                break;
            default:
                icon = '<i class="fas fa-bell text-secondary"></i>';
        }
        
        const timeAgo = formatTimeAgo(notif.created_at);
        return `
            <div class="d-flex align-items-start">
                <div class="me-3">${icon}</div>
                <div class="flex-grow-1">
                    <div>${message}</div>
                    <small class="text-muted">${timeAgo}</small>
                </div>
                <div class="ms-2">
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteNotification(${notif.id}, event)" title="Delete notification">
                        <i class="fas fa-trash fa-xs"></i>
                    </button>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Error formatting notification:', error);
        return '<div>Error loading notification</div>';
    }
}

async function clearAllNotifications() {
    if (!currentUser) return;
    
    if (!confirm('Are you sure you want to delete all notifications?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/notifications.php?user_id=${currentUser.id}`);
        const notifications = await response.json();
        
        for (const notif of notifications) {
            await fetch(`${API_BASE}/notifications.php?id=${notif.id}`, {
                method: 'DELETE'
            });
        }
        
        document.getElementById('notificationsList').innerHTML = '<p class="text-center text-muted">No notifications yet</p>';
        loadNotificationCount();
        
        showAlert('All notifications cleared', 'success');
        
    } catch (error) {
        console.error('Error clearing all notifications:', error);
        showAlert('Error clearing notifications', 'danger');
    }
}

async function deleteNotification(notificationId, event) {
    if (event) {
        event.stopPropagation();
    }
    
    if (!confirm('Are you sure you want to delete this notification?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/notifications.php?id=${notificationId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            const notificationElement = event.target.closest('.notification-item');
            if (notificationElement) {
                notificationElement.remove();
            }
            
            const container = document.getElementById('notificationsList');
            const remainingNotifications = container.querySelectorAll('.notification-item');
            
            if (remainingNotifications.length === 0) {
                const clearAllButton = container.querySelector('.text-end');
                if (clearAllButton) {
                    clearAllButton.remove();
                }
                
                container.innerHTML = '<p class="text-center text-muted">No notifications yet</p>';
            }
            
            loadNotificationCount();
            
            showAlert('Notification deleted', 'success');
        } else {
            throw new Error('Failed to delete notification');
        }
    } catch (error) {
        console.error('Error deleting notification:', error);
        showAlert('Error deleting notification', 'danger');
    }
}

async function handleNotificationClick(notif) {
    if (notif.is_read == 0) {
        try {
            await fetch(`${API_BASE}/notifications.php?id=${notif.id}&is_read=1`, { method: 'PUT' });
            loadNotificationCount();
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    }
    
    try {
        switch (notif.type) {
            case 'message':
                window.location.href = `messages.html?user=${notif.actor_id}`;
                break;
            case 'reply':
                if (notif.entity_type === 'post' && notif.entity_id) {
                    const postResponse = await fetch(`${API_BASE}/posts.php?id=${notif.entity_id}`);
                    const postData = await postResponse.json();
                    if (postData && postData.thread_id) {
                        window.location.href = `thread.html?id=${postData.thread_id}#post-${notif.entity_id}`;
                    }
                }
                break;
            case 'thread_post':
                if (notif.entity_type === 'post' && notif.entity_id) {
                    const postResponse = await fetch(`${API_BASE}/posts.php?id=${notif.entity_id}`);
                    const postData = await postResponse.json();
                    if (postData && postData.thread_id) {
                        window.location.href = `thread.html?id=${postData.thread_id}#post-${notif.entity_id}`;
                    }
                }
                break;
            default:
                console.log('Unknown notification type:', notif.type);
        }
    } catch (error) {
        console.error('Error handling notification click:', error);
    }
}

async function sendMessage() {
    if (isMessageSending) {
        console.log('Message already being sent, skipping...');
        return;
    }
    
    const input = document.getElementById('messageInput');
    const content = input.value.trim();
    
    if (!content || !currentUser || !messageRecipient) {
        return;
    }
    
    isMessageSending = true;
    input.disabled = true;
    
    try {
        await fetch(`${API_BASE}/messages.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sender_id: currentUser.id,
                receiver_id: messageRecipient.id,
                content: content
            })
        });
        
        input.value = '';
        loadMessageHistory();
        
    } catch (error) {
        console.error('Error sending message:', error);
        showAlert('Error sending message', 'danger');
    } finally {
        input.disabled = false;
        isMessageSending = false;
        input.focus();
    }
}

function setupMessageInputHandler() {
    const messageInput = document.getElementById('messageInput');
    
    if (messageInput && !messageEventListenerAttached) {
        messageInput.removeEventListener('keypress', handleMessageEnterKey);
        
        messageInput.addEventListener('keypress', handleMessageEnterKey);
        messageEventListenerAttached = true;
        
        console.log('Message input handler attached');
    }
}

function handleMessageEnterKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        
        if (!isMessageSending) {
            sendMessage();
        }
    }
}

function openMessageBox(userId, nickname, imagePath) {
    if (!currentUser) {
        window.location.href = 'login.html';
        return;
    }
    
    if (currentUser.id == userId) {
        showAlert("You can't send a message to yourself", 'warning');
        return;
    }
    
    if (window.location.pathname.includes('messages.html')) {
        window.location.href = `messages.html?user=${userId}`;
        return;
    }
    
    messageRecipient = {
        id: userId,
        nickname: nickname,
        image_path: imagePath
    };
    
    document.getElementById('messageRecipientName').textContent = nickname;
    const recipientAvatar = document.querySelector('#messageBox .message-header img');
    if (recipientAvatar) {
        recipientAvatar.src = imagePath || 'images/default-avatar.png';
    }
    
    const messageBox = document.getElementById('messageBox');
    if (messageBox) {
        messageBox.style.display = 'block';
        loadMessageHistory();
        
        setTimeout(setupMessageInputHandler, 100);
        
        if (messageInterval) clearInterval(messageInterval);
        messageInterval = setInterval(loadMessageHistory, 5000);
    }
}

async function loadMessageHistory() {
    if (!currentUser || !messageRecipient) return;
    try {
        const response = await fetch(`${API_BASE}/messages.php?thread_with=${messageRecipient.id}`);
        const messages = await response.json();
        const history = document.getElementById('messageHistory');
        if (!history) return;
        
        history.innerHTML = '';
        for (const msg of messages) {
            const msgEl = document.createElement('div');
            msgEl.className = `message-item ${msg.sender_id === currentUser.id ? 'sent' : 'received'}`;
            msgEl.innerHTML = `
                <div class="message-content">${escapeHtml(msg.content)}</div>
                <small class="text-muted">${formatTimeAgo(msg.created_at)}</small>
            `;
            history.appendChild(msgEl);
        }
        history.scrollTop = history.scrollHeight;
    } catch (error) {
        console.error('Error loading messages:', error);
    }
}

function closeMessageBox() {
    const box = document.getElementById('messageBox');
    if (box) box.style.display = 'none';
    if (messageInterval) clearInterval(messageInterval);
    
    messageEventListenerAttached = false;
}

async function deleteMessage(messageId) {
    try {
        await fetch(`${API_BASE}/messages.php?id=${messageId}`, { method: 'DELETE' });
        loadMessageHistory();
    } catch (error) {
        console.error('Error deleting message:', error);
        showAlert('Error deleting message', 'danger');
    }
}

async function likeThread() {
    if (!currentUser) {
        requireAuth();
        return;
    }
    
    try {
        const res = await fetch(`${API_BASE}/votes.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ thread_id: threadId, vote: 1 })
        });
        const { likes, dislikes } = await res.json();
        document.getElementById('threadLikes').textContent = likes;
        document.getElementById('threadDislikes').textContent = dislikes;
    } catch (error) {
        console.error('Error liking thread:', error);
        showAlert('Error voting on thread', 'danger');
    }
}

async function dislikeThread() {
    if (!currentUser) {
        requireAuth();
        return;
    }
    
    try {
        const res = await fetch(`${API_BASE}/votes.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ thread_id: threadId, vote: -1 })
        });
        const { likes, dislikes } = await res.json();
        document.getElementById('threadLikes').textContent = likes;
        document.getElementById('threadDislikes').textContent = dislikes;
    } catch (error) {
        console.error('Error disliking thread:', error);
        showAlert('Error voting on thread', 'danger');
    }
}

async function likePost(postId) {
    if (!currentUser) {
        requireAuth();
        return;
    }
    
    try {
        const res = await fetch(`${API_BASE}/votes.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ post_id: postId, vote: 1 })
        });
        const { likes, dislikes } = await res.json();
        document.getElementById(`postLikes-${postId}`).textContent = likes;
        document.getElementById(`postDislikes-${postId}`).textContent = dislikes;
    } catch (error) {
        console.error('Error liking post:', error);
        showAlert('Error voting on post', 'danger');
    }
}

async function dislikePost(postId) {
    if (!currentUser) {
        requireAuth();
        return;
    }
    
    try {
        const res = await fetch(`${API_BASE}/votes.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ post_id: postId, vote: -1 })
        });
        const { likes, dislikes } = await res.json();
        document.getElementById(`postLikes-${postId}`).textContent = likes;
        document.getElementById(`postDislikes-${postId}`).textContent = dislikes;
    } catch (error) {
        console.error('Error disliking post:', error);
        showAlert('Error voting on post', 'danger');
    }
}

function setupRememberedUser() {
    if (document.getElementById('loginForm')) {
        const rememberedUser = localStorage.getItem('rememberUser');
        if (rememberedUser) {
            const identifierField = document.getElementById('loginIdentifier');
            const rememberCheckbox = document.getElementById('rememberMe');
            if (identifierField) identifierField.value = rememberedUser;
            if (rememberCheckbox) rememberCheckbox.checked = true;
        }
    }
}

function setupBirthdateValidation() {
    const birthdateInput = document.getElementById('birthdate');
    if (birthdateInput) {
        const today = new Date();
        const maxDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
        birthdateInput.max = maxDate.toISOString().split('T')[0];
    }
}


function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function sanitizeHtml(str) {
    const temp = document.createElement('div');
    temp.textContent = str;
    return temp.innerHTML;
}

function formatDate(dateString, options = {}) {
    const date = new Date(dateString);
    const defaultOptions = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    
    const formatOptions = { ...defaultOptions, ...options };
    return date.toLocaleDateString('en-US', formatOptions);
}

function formatTimeAgo(dateString) {
    try {
        if (!dateString) {
            return 'Recently';
        }
        
        let date;
        
        if (typeof dateString === 'string') {
            dateString = dateString.trim();
            
            if (/^\d{1,2}:\d{2}$/.test(dateString)) {
                const today = new Date();
                const [hours, minutes] = dateString.split(':');
                date = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 
                              parseInt(hours), parseInt(minutes), 0);
            }
            else if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(dateString)) {
                const isoString = dateString.replace(' ', 'T');
                date = new Date(isoString);
            }
            else if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d+/.test(dateString)) {
                const isoString = dateString.replace(' ', 'T');
                date = new Date(isoString);
            }
            else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(dateString)) {
                date = new Date(dateString);
            }
            else if (/^\d{10}$/.test(dateString)) {
                date = new Date(parseInt(dateString) * 1000);
            }
            else if (/^\d{13}$/.test(dateString)) {
                date = new Date(parseInt(dateString));
            }
            else {
                date = new Date(dateString);
            }
        } else if (typeof dateString === 'number') {
            date = dateString > 9999999999 ? new Date(dateString) : new Date(dateString * 1000);
        } else {
            date = new Date(dateString);
        }
        
        if (isNaN(date.getTime())) {
            console.warn('Could not parse date:', dateString);
            return 'Recently';
        }
        
        const now = new Date();
        const year = date.getFullYear();
        const currentYear = now.getFullYear();
        
        if (year < currentYear - 1 || year > currentYear + 1) {
            console.warn('Date seems incorrect:', dateString, '-> parsed as:', date.toString());
            if (!/^\d{1,2}:\d{2}$/.test(dateString)) {
                return 'Recently';
            }
        }
        
        const diff = Math.floor((now - date) / 1000);
        
        if (diff < 0) {
            return 'just now';
        }
        
        if (diff < 60) return 'just now';
        if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
        if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`;
        
        return date.toLocaleDateString();
        
    } catch (error) {
        console.error('Error formatting date:', error, 'Input:', dateString);
        return 'Recently';
    }
}

function timeAgo(dateString) {
    return formatTimeAgo(dateString);
}

function truncateText(text, maxLength = 100) {
    if (!text || text.length <= maxLength) return text;
    return text.substr(0, maxLength) + '...';
}

function isAdmin() {
    return currentUser && (currentUser.is_admin === true || currentUser.is_admin == 1 || currentUser.is_admin === '1');
}

function isOwner(authorId) {
    return currentUser && currentUser.id === authorId;
}

function requireAuth() {
    if (!currentUser) {
        showAlert('Please log in to continue', 'warning');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000);
        return false;
    }
    return true;
}

async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        showAlert('Copied to clipboard!', 'success', 2000);
        return true;
    } catch (err) {
        console.error('Failed to copy to clipboard:', err);
        showAlert('Failed to copy to clipboard', 'danger', 3000);
        return false;
    }
}

function debounce(func, wait, immediate) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            timeout = null;
            if (!immediate) func(...args);
        };
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func(...args);
    };
}

function handleApiError(error, response = null) {
    console.error('API Error:', error);
    
    if (response) {
        switch (response.status) {
            case 401:
                showAlert('Session expired. Please log in again.', 'warning');
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 2000);
                break;
            case 403:
                showAlert('Access denied. You do not have permission.', 'danger');
                break;
            case 404:
                showAlert('The requested resource was not found.', 'danger');
                break;
            case 500:
                showAlert('Server error. Please try again later.', 'danger');
                break;
            default:
                showAlert('An error occurred. Please try again.', 'danger');
        }
    } else {
        showAlert('Network error. Please check your connection.', 'danger');
    }
}

function setLoading(element, isLoading = true, originalText = '') {
    if (isLoading) {
        element.dataset.originalText = element.innerHTML;
        element.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Loading...';
        element.disabled = true;
    } else {
        element.innerHTML = originalText || element.dataset.originalText || element.innerHTML;
        element.disabled = false;
        delete element.dataset.originalText;
    }
}

function isValidGuid(guid) {
    if (!guid || typeof guid !== 'string') return false;
    const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return guidRegex.test(guid);
}

function showAlert(message, type = 'info', duration = 5000) {
    const existingAlerts = document.querySelectorAll('.alert');
    existingAlerts.forEach(alert => alert.remove());
    
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.setAttribute('role', 'alert');
    
    alertDiv.innerHTML = `
        ${escapeHtml(message)}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    let container = document.getElementById('alertContainer');
    if (!container) {
        container = document.querySelector('.container');
        if (!container) {
            container = document.body;
        }
    }
    
    if (container === document.body) {
        container.insertBefore(alertDiv, container.firstChild);
    } else {
        container.insertBefore(alertDiv, container.firstChild);
    }
    
    if (duration > 0) {
        setTimeout(() => {
            if (alertDiv && alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, duration);
    }
    
    return alertDiv;
}

window.addEventListener('beforeunload', function() {
    messageEventListenerAttached = false;
    isMessageSending = false;
});

window.API_BASE = API_BASE;
window.currentUser = currentUser;
window.checkAuth = checkAuth;
window.logout = logout;
window.showAlert = showAlert;
window.formatDate = formatDate;
window.timeAgo = timeAgo;
window.formatTimeAgo = formatTimeAgo;
window.sanitizeHtml = sanitizeHtml;
window.escapeHtml = escapeHtml;
window.truncateText = truncateText;
window.isAdmin = isAdmin;
window.isOwner = isOwner;
window.requireAuth = requireAuth;
window.copyToClipboard = copyToClipboard;
window.debounce = debounce;
window.handleApiError = handleApiError;
window.setLoading = setLoading;
window.isValidGuid = isValidGuid;