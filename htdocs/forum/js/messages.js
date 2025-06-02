let conversations = [];
let currentConversation = null;
let messagePollingInterval = null;
let users = {};

async function loadConversations() {
    if (!currentUser) return;
    
    try {

        const response = await fetch(`${API_BASE}/messages.php`);
        const allMessages = await response.json();
        

        const userMessages = allMessages.filter(msg => 
            msg.sender_id == currentUser.id || msg.receiver_id == currentUser.id
        );
        
        // Group messages by conversation partner
        const conversationMap = {};
        
        for (const message of userMessages) {
            const partnerId = message.sender_id == currentUser.id ? message.receiver_id : message.sender_id;
            
            if (!conversationMap[partnerId]) {
                conversationMap[partnerId] = {
                    partnerId: partnerId,
                    messages: [],
                    lastMessage: null,
                    unreadCount: 0
                };
            }
            
            conversationMap[partnerId].messages.push(message);
            
            if (message.receiver_id == currentUser.id && message.status !== 'read') {
                conversationMap[partnerId].unreadCount++;
            }
        }
        
        conversations = Object.values(conversationMap);
        
        for (const conv of conversations) {
            // Sort messages by creation date
            conv.messages.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            conv.lastMessage = conv.messages[0];
            
            if (!users[conv.partnerId]) {
                try {
                    const userResponse = await fetch(`${API_BASE}/users.php?id=${conv.partnerId}`);
                    users[conv.partnerId] = await userResponse.json();
                } catch (error) {
                    users[conv.partnerId] = { nickname: 'Unknown User', image_path: null };
                }
            }
        }
        
        conversations.sort((a, b) => {
            const aDate = a.lastMessage ? new Date(a.lastMessage.created_at) : new Date(0);
            const bDate = b.lastMessage ? new Date(b.lastMessage.created_at) : new Date(0);
            return bDate - aDate;
        });
        
        displayConversations();
        
    } catch (error) {
        console.error('Error loading conversations:', error);
        showAlert('Error loading conversations', 'danger');
    }
}

function displayConversations() {
    const container = document.getElementById('conversationsList');
    container.innerHTML = '';
    
    if (conversations.length === 0) {
        container.innerHTML = `
            <div class="text-center p-4 text-muted">
                <i class="fas fa-inbox fa-2x mb-3"></i>
                <p>No conversations yet</p>
                <small>Start a conversation by messaging someone from their profile</small>
            </div>
        `;
        return;
    }
    
    conversations.forEach(conv => {
        const user = users[conv.partnerId];
        const lastMsg = conv.lastMessage;
        
        const conversationEl = document.createElement('div');
        conversationEl.className = `conversation-item ${currentConversation?.partnerId === conv.partnerId ? 'active' : ''}`;
        conversationEl.onclick = () => selectConversation(conv);
        
        let lastMessageText = '';
        let messageTime = '';
        
        if (lastMsg) {
            const isMyMessage = lastMsg.sender_id == currentUser.id;
            lastMessageText = (isMyMessage ? 'You: ' : '') + lastMsg.content.substring(0, 30);
            if (lastMsg.content.length > 30) lastMessageText += '...';
            
            try {
                messageTime = formatTimeAgo(lastMsg.created_at);
            } catch (error) {
                console.error('Date formatting error in conversation:', error);
                messageTime = '';
            }
        }
        
        conversationEl.innerHTML = `
            <div class="d-flex align-items-center">
                <img src="${user.image_path || 'images/default-avatar.png'}" 
                     class="rounded-circle user-avatar me-3">
                <div class="flex-grow-1">
                    <div class="d-flex justify-content-between align-items-center">
                        <h6 class="mb-0">${escapeHtml(user.nickname)}</h6>
                        ${conv.unreadCount > 0 ? `<span class="unread-count">${conv.unreadCount}</span>` : ''}
                    </div>
                    <div class="d-flex justify-content-between">
                        <div class="last-message">${escapeHtml(lastMessageText)}</div>
                        <div class="message-time">${messageTime}</div>
                    </div>
                </div>
            </div>
        `;
        
        container.appendChild(conversationEl);
    });
}

async function selectConversation(conversation) {
    currentConversation = conversation;
    

    displayConversations();
    
    document.getElementById('noConversation').style.display = 'none';
    document.getElementById('chatHeader').style.display = 'block';
    document.getElementById('chatMessages').style.display = 'block';
    document.getElementById('chatInput').style.display = 'block';
    
    const user = users[conversation.partnerId];
    document.getElementById('chatUserAvatar').src = user.image_path || 'images/default-avatar.png';
    document.getElementById('chatUserName').textContent = user.nickname;
    
    document.getElementById('chatHeader').onclick = () => {
        window.open(`public-profile.html?id=${conversation.partnerId}`, '_blank');
    };
    document.getElementById('chatHeader').style.cursor = 'pointer';
    
    await loadConversationMessages();
    
    await markMessagesAsRead(conversation.partnerId);
    
    if (messagePollingInterval) clearInterval(messagePollingInterval);
    messagePollingInterval = setInterval(() => loadConversationMessages(), 3000);
}

async function loadConversationMessages() {
    if (!currentConversation) return;
    
    try {
        const response = await fetch(`${API_BASE}/messages.php`);
        const allMessages = await response.json();
        
        // Filter messages for this conversation
        const conversationMessages = allMessages.filter(msg => 
            (msg.sender_id == currentUser.id && msg.receiver_id == currentConversation.partnerId) ||
            (msg.sender_id == currentConversation.partnerId && msg.receiver_id == currentUser.id)
        );
        
        conversationMessages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        
        displayMessages(conversationMessages);
        
    } catch (error) {
        console.error('Error loading conversation messages:', error);
    }
}

// Display messages in chat area
function displayMessages(messages) {
    const container = document.getElementById('chatMessages');
    const shouldScrollToBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 10;
    
    container.innerHTML = '';
    
    messages.forEach(message => {
        const isMine = message.sender_id == currentUser.id;
        const messageEl = document.createElement('div');
        messageEl.className = `message-bubble ${isMine ? 'sent' : 'received'}`;
        messageEl.style.position = 'relative';
        
        // Format timestamp safely
        let timeText = '';
        try {
            timeText = formatTimeAgo(message.created_at);
        } catch (error) {
            console.error('Date formatting error:', error, 'Raw date:', message.created_at);
            timeText = 'Recently';
        }
        
        messageEl.innerHTML = `
            <div class="message-content-wrapper">
                <div class="message-text">${escapeHtml(message.content)}</div>
                ${message.is_edited ? '<small class="text-muted">(edited)</small>' : ''}
                <div class="message-timestamp">${timeText}</div>
                ${isMine ? `
                    <div class="message-actions" style="display: none;">
                        <button class="btn btn-sm btn-outline-secondary me-1" onclick="editMessage(${message.id}, '${escapeHtml(message.content).replace(/'/g, '&#39;')}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteMessage(${message.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
        
        // Show actions on hover for sent messages
        if (isMine) {
            messageEl.addEventListener('mouseenter', () => {
                const actions = messageEl.querySelector('.message-actions');
                if (actions) actions.style.display = 'block';
            });
            messageEl.addEventListener('mouseleave', () => {
                const actions = messageEl.querySelector('.message-actions');
                if (actions) actions.style.display = 'none';
            });
        }
        
        container.appendChild(messageEl);
    });
    
    // Auto-scroll to bottom if user was already at bottom
    if (shouldScrollToBottom) {
        container.scrollTop = container.scrollHeight;
    }
}

async function sendMessage() {
    if (!currentConversation) return;
    
    const input = document.getElementById('messageInput');
    const content = input.value.trim();
    
    if (!content) return;
    
    try {
        const response = await fetch(`${API_BASE}/messages.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sender_id: currentUser.id,
                receiver_id: currentConversation.partnerId,
                content: content
            })
        });
        
        if (response.ok) {
            input.value = '';
            await loadConversationMessages();
            await loadConversations(); // Refresh conversation list
        } else {
            throw new Error('Failed to send message');
        }
        
    } catch (error) {
        console.error('Error sending message:', error);
        showAlert('Error sending message', 'danger');
    }
}

async function markMessagesAsRead(partnerId) {
    try {
        const response = await fetch(`${API_BASE}/messages.php`);
        const allMessages = await response.json();
        
        // Find unread messages from this partner
        const unreadMessages = allMessages.filter(msg => 
            msg.sender_id == partnerId && 
            msg.receiver_id == currentUser.id && 
            msg.status !== 'read'
        );
        
        // Mark each as read
        for (const message of unreadMessages) {
            await fetch(`${API_BASE}/messages.php?id=${message.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'read' })
            });
        }
        
        // Refresh conversations to update unread counts
        if (unreadMessages.length > 0) {
            await loadConversations();
        }
        
    } catch (error) {
        console.error('Error marking messages as read:', error);
    }
}

// Handle enter key in message input
document.addEventListener('DOMContentLoaded', function() {
    const messageInput = document.getElementById('messageInput');
    if (messageInput) {
        messageInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }
});

// Initialize the page
document.addEventListener('DOMContentLoaded', async function() {
    await checkAuth();
    
    if (!currentUser) {
        window.location.href = 'login.html';
        return;
    }
    
    await loadConversations();
    
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('user');
    if (userId) {
        let existingConv = conversations.find(conv => conv.partnerId == userId);
        
        if (existingConv) {
            await selectConversation(existingConv);
        } else {
            // Create new conversation
            try {
                const userResponse = await fetch(`${API_BASE}/users.php?id=${userId}`);
                const userData = await userResponse.json();
                
                if (userData && userData.id) {
                    users[userId] = userData;
                    const newConv = {
                        partnerId: parseInt(userId),
                        messages: [],
                        lastMessage: null,
                        unreadCount: 0
                    };
                    conversations.unshift(newConv);
                    displayConversations();
                    await selectConversation(newConv);
                }
            } catch (error) {
                console.error('Error loading user for new conversation:', error);
                showAlert('User not found', 'danger');
            }
        }
        
        window.history.replaceState({}, document.title, 'messages.html');
    }
});

async function editMessage(messageId, currentContent) {
    const newContent = prompt('Edit your message:', currentContent);
    
    if (newContent === null || newContent.trim() === '') {
        return; 
    }
    
    if (newContent.trim() === currentContent) {
        return; 
    }
    
    try {
        const response = await fetch(`${API_BASE}/messages.php?id=${messageId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                content: newContent.trim(),
                is_edited: true
            })
        });
        
        if (response.ok) {
            await loadConversationMessages();
            await loadConversations(); // Refresh conversation list in case last message changed
        } else {
            throw new Error('Failed to edit message');
        }
        
    } catch (error) {
        console.error('Error editing message:', error);
        showAlert('Error editing message', 'danger');
    }
}

async function deleteMessage(messageId) {
    if (!confirm('Are you sure you want to delete this message?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/messages.php?id=${messageId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            await loadConversationMessages();
            await loadConversations(); // Refresh conversation list
        } else {
            throw new Error('Failed to delete message');
        }
        
    } catch (error) {
        console.error('Error deleting message:', error);
        showAlert('Error deleting message', 'danger');
    }
}

// Clean up intervals when page is unloaded
window.addEventListener('beforeunload', function() {
    if (messagePollingInterval) {
        clearInterval(messagePollingInterval);
    }
});