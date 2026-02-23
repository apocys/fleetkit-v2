/**
 * FleetKit Executive Office V4 - Chat Panel
 * CEO communication interface with API bridge integration
 */

class ChatPanel {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.isOpen = false;
        this.chatHistory = [];
        this.currentTarget = 'ceo';
        this.isLoading = false;
        
        this.init();
        this.bindEvents();
    }

    init() {
        this.render();
        this.loadChatHistory();
    }

    bindEvents() {
        // Listen for chat open/close events
        FleetEvents.on('chat:open', (data) => {
            this.open(data?.target || 'ceo');
        });

        FleetEvents.on('chat:close', () => {
            this.close();
        });

        // Listen for chat messages
        FleetEvents.on('chat:message:received', (data) => {
            this.addMessage(data);
        });

        // Listen for navigation (close chat if navigating elsewhere)
        FleetEvents.on('navigate', (data) => {
            if (data.panel !== 'chat') {
                // Don't auto-close chat when navigating
                // this.close();
            }
        });
    }

    render() {
        this.container.innerHTML = `
            <div class="chat-overlay" id="chat-overlay">
                <div class="chat-backdrop"></div>
                <div class="chat-panel">
                    ${this.renderChatHeader()}
                    ${this.renderChatBody()}
                    ${this.renderChatInput()}
                </div>
            </div>
        `;

        this.bindChatEvents();
    }

    renderChatHeader() {
        return `
            <div class="chat-header">
                <div class="chat-title">
                    <span class="chat-icon">💬</span>
                    Fleet Communication
                    <div class="chat-title-dot"></div>
                </div>
                <div class="chat-header-actions">
                    <div class="chat-target-selector">
                        <select class="chat-target-select" id="chat-target-select">
                            <option value="ceo">CEO (ApoMac)</option>
                            <option value="atlas">Atlas (COO)</option>
                            <option value="forge">Forge (CTO)</option>
                            <option value="hunter">Hunter (CRO)</option>
                            <option value="echo">Echo (CMO)</option>
                            <option value="sentinel">Sentinel (QA)</option>
                        </select>
                    </div>
                    <button class="chat-close" id="chat-close" aria-label="Close Chat">×</button>
                </div>
            </div>
        `;
    }

    renderChatBody() {
        return `
            <div class="chat-messages" id="chat-messages">
                <div class="chat-welcome">
                    <div class="welcome-avatar">
                        <svg><use href="#avatar-ceo"></use></svg>
                    </div>
                    <div class="welcome-text">
                        <h3>Welcome to Fleet Communication</h3>
                        <p>Chat directly with your AI agents. Messages are sent to the active session.</p>
                    </div>
                </div>
            </div>
        `;
    }

    renderChatInput() {
        return `
            <div class="chat-input-bar">
                <input type="text" 
                       class="chat-input" 
                       id="chat-input" 
                       placeholder="Type your message..." 
                       maxlength="2000">
                <button class="chat-send" id="chat-send" aria-label="Send Message">
                    <span>➤</span>
                </button>
            </div>
        `;
    }

    bindChatEvents() {
        const overlay = this.container.querySelector('#chat-overlay');
        const backdrop = this.container.querySelector('.chat-backdrop');
        const closeBtn = this.container.querySelector('#chat-close');
        const input = this.container.querySelector('#chat-input');
        const sendBtn = this.container.querySelector('#chat-send');
        const targetSelect = this.container.querySelector('#chat-target-select');

        // Close events
        if (backdrop) {
            backdrop.addEventListener('click', () => this.close());
        }

        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close());
        }

        // Escape key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });

        // Send message events
        if (sendBtn) {
            sendBtn.addEventListener('click', () => this.sendMessage());
        }

        if (input) {
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });

            // Auto-resize input
            input.addEventListener('input', () => {
                this.updateSendButton();
            });
        }

        // Target selection
        if (targetSelect) {
            targetSelect.addEventListener('change', (e) => {
                this.currentTarget = e.target.value;
                this.updateChatTarget();
            });
        }
    }

    open(target = 'ceo') {
        this.currentTarget = target;
        this.isOpen = true;
        
        const overlay = this.container.querySelector('#chat-overlay');
        if (overlay) {
            overlay.classList.add('open');
        }

        // Update target selector
        const targetSelect = this.container.querySelector('#chat-target-select');
        if (targetSelect) {
            targetSelect.value = target;
        }

        // Focus input
        const input = this.container.querySelector('#chat-input');
        if (input) {
            setTimeout(() => input.focus(), 300);
        }

        // Load chat history for target
        this.loadChatHistory();
        
        FleetEvents.emit('chat:opened', { target });
    }

    close() {
        this.isOpen = false;
        
        const overlay = this.container.querySelector('#chat-overlay');
        if (overlay) {
            overlay.classList.remove('open');
        }

        FleetEvents.emit('chat:closed');
    }

    async sendMessage() {
        if (this.isLoading) return;

        const input = this.container.querySelector('#chat-input');
        const message = input?.value.trim();
        
        if (!message) return;

        // Clear input
        input.value = '';
        this.updateSendButton();

        // Add user message to UI
        this.addMessage({
            role: 'user',
            content: message,
            timestamp: new Date().toISOString(),
            target: this.currentTarget
        });

        // Show loading state
        this.setLoading(true);

        try {
            // Send to API bridge
            const response = await FleetState.sendChat(message, this.currentTarget);
            
            // Add AI response to UI
            this.addMessage({
                role: 'assistant',
                content: response.reply || 'I received your message.',
                timestamp: new Date().toISOString(),
                target: this.currentTarget
            });

        } catch (error) {
            console.error('Failed to send chat message:', error);
            
            // Add error message
            this.addMessage({
                role: 'system',
                content: 'Failed to send message. Please check your connection.',
                timestamp: new Date().toISOString(),
                target: this.currentTarget,
                isError: true
            });
        } finally {
            this.setLoading(false);
        }
    }

    addMessage(messageData) {
        const messagesContainer = this.container.querySelector('#chat-messages');
        if (!messagesContainer) return;

        // Remove welcome message if it exists
        const welcomeMsg = messagesContainer.querySelector('.chat-welcome');
        if (welcomeMsg) {
            welcomeMsg.remove();
        }

        // Create message element
        const messageEl = this.createMessageElement(messageData);
        messagesContainer.appendChild(messageEl);

        // Scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        // Store in history
        this.chatHistory.push(messageData);
        this.saveChatHistory();

        // Animate in
        requestAnimationFrame(() => {
            messageEl.classList.add('message-animate-in');
        });
    }

    createMessageElement(messageData) {
        const messageEl = document.createElement('div');
        messageEl.className = `chat-msg chat-msg--${messageData.role}`;
        
        if (messageData.isError) {
            messageEl.classList.add('chat-msg--error');
        }

        const timeStr = this.formatMessageTime(messageData.timestamp);
        
        messageEl.innerHTML = `
            <div class="chat-msg-content">
                ${messageData.content}
            </div>
            <div class="chat-msg-time">${timeStr}</div>
        `;

        return messageEl;
    }

    setLoading(isLoading) {
        this.isLoading = isLoading;
        
        const sendBtn = this.container.querySelector('#chat-send');
        const input = this.container.querySelector('#chat-input');
        
        if (sendBtn) {
            sendBtn.disabled = isLoading;
            sendBtn.innerHTML = isLoading ? 
                '<div class="loading-spinner"></div>' : 
                '<span>➤</span>';
        }
        
        if (input) {
            input.disabled = isLoading;
        }

        if (isLoading) {
            this.showTypingIndicator();
        } else {
            this.hideTypingIndicator();
        }
    }

    showTypingIndicator() {
        const messagesContainer = this.container.querySelector('#chat-messages');
        if (!messagesContainer) return;

        // Remove existing typing indicator
        const existing = messagesContainer.querySelector('.typing-indicator');
        if (existing) existing.remove();

        const typingEl = document.createElement('div');
        typingEl.className = 'typing-indicator';
        typingEl.innerHTML = `
            <div class="typing-avatar">
                <svg><use href="#avatar-${this.currentTarget}"></use></svg>
            </div>
            <div class="typing-content">
                <div class="typing-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
        `;

        messagesContainer.appendChild(typingEl);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    hideTypingIndicator() {
        const typingIndicator = this.container.querySelector('.typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    updateSendButton() {
        const input = this.container.querySelector('#chat-input');
        const sendBtn = this.container.querySelector('#chat-send');
        
        if (input && sendBtn) {
            const hasText = input.value.trim().length > 0;
            sendBtn.disabled = !hasText || this.isLoading;
            sendBtn.classList.toggle('chat-send--active', hasText);
        }
    }

    updateChatTarget() {
        // Update welcome message or chat context based on target
        const messagesContainer = this.container.querySelector('#chat-messages');
        const targetSelect = this.container.querySelector('#chat-target-select');
        
        if (messagesContainer && this.chatHistory.length === 0) {
            const agent = FleetState.getAgent(this.currentTarget);
            const welcomeMsg = messagesContainer.querySelector('.chat-welcome');
            
            if (welcomeMsg && agent) {
                const avatarEl = welcomeMsg.querySelector('svg use');
                if (avatarEl) {
                    avatarEl.setAttribute('href', `#avatar-${this.currentTarget}`);
                }
                
                const textEl = welcomeMsg.querySelector('h3');
                if (textEl) {
                    textEl.textContent = `Chat with ${agent.name}`;
                }
                
                const descEl = welcomeMsg.querySelector('p');
                if (descEl) {
                    descEl.textContent = `Communicate directly with ${agent.name} (${agent.role}). Messages are sent to their active session.`;
                }
            }
        }
    }

    loadChatHistory() {
        try {
            const stored = localStorage.getItem(`chat-history-${this.currentTarget}`);
            const history = stored ? JSON.parse(stored) : [];
            
            // Only load recent messages (last 50)
            this.chatHistory = history.slice(-50);
            
            // Render messages
            this.renderChatHistory();
            
        } catch (error) {
            console.warn('Failed to load chat history:', error);
            this.chatHistory = [];
        }
    }

    saveChatHistory() {
        try {
            // Only save last 100 messages per target
            const toSave = this.chatHistory.slice(-100);
            localStorage.setItem(`chat-history-${this.currentTarget}`, JSON.stringify(toSave));
        } catch (error) {
            console.warn('Failed to save chat history:', error);
        }
    }

    renderChatHistory() {
        const messagesContainer = this.container.querySelector('#chat-messages');
        if (!messagesContainer || this.chatHistory.length === 0) return;

        // Clear existing messages (except welcome)
        const existingMessages = messagesContainer.querySelectorAll('.chat-msg');
        existingMessages.forEach(msg => msg.remove());

        // Remove welcome if there are messages
        if (this.chatHistory.length > 0) {
            const welcomeMsg = messagesContainer.querySelector('.chat-welcome');
            if (welcomeMsg) welcomeMsg.remove();
        }

        // Add messages
        this.chatHistory.forEach(messageData => {
            const messageEl = this.createMessageElement(messageData);
            messageEl.classList.add('message-animate-in');
            messagesContainer.appendChild(messageEl);
        });

        // Scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    clearHistory() {
        this.chatHistory = [];
        localStorage.removeItem(`chat-history-${this.currentTarget}`);
        
        const messagesContainer = this.container.querySelector('#chat-messages');
        if (messagesContainer) {
            messagesContainer.innerHTML = this.renderChatBody().match(/<div class="chat-messages"[^>]*>(.*)<\/div>/s)[1];
        }
    }

    formatMessageTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        
        const isToday = date.toDateString() === now.toDateString();
        
        if (isToday) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else {
            const diffTime = Math.abs(now - date);
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays === 1) {
                return 'Yesterday';
            } else if (diffDays < 7) {
                return `${diffDays}d ago`;
            } else {
                return date.toLocaleDateString();
            }
        }
    }

    // Public methods
    isVisible() {
        return this.isOpen;
    }

    getCurrentTarget() {
        return this.currentTarget;
    }

    getHistory() {
        return [...this.chatHistory];
    }

    exportHistory() {
        const data = {
            target: this.currentTarget,
            messages: this.chatHistory,
            exportDate: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `chat-history-${this.currentTarget}-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        URL.revokeObjectURL(url);
    }

    destroy() {
        // Remove event listeners
        FleetEvents.off('chat:open', this.open.bind(this));
        FleetEvents.off('chat:close', this.close.bind(this));
        FleetEvents.off('chat:message:received', this.addMessage.bind(this));
        FleetEvents.off('navigate', this.close.bind(this));
        
        // Clear any pending operations
        this.setLoading(false);
    }
}

// Chat button integration
class ChatButton {
    constructor() {
        this.createButton();
        this.bindEvents();
    }

    createButton() {
        // Look for CEO tile or create floating button
        const ceoTile = document.querySelector('.agent-tile--ceo');
        
        if (ceoTile) {
            // Add mailbox button to CEO tile
            const mailboxBtn = document.createElement('button');
            mailboxBtn.className = 'ceo-mailbox';
            mailboxBtn.innerHTML = `
                <span class="ceo-mailbox-icon">💬</span>
                <span class="ceo-mailbox-text">Chat</span>
            `;
            
            ceoTile.appendChild(mailboxBtn);
            
            mailboxBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                FleetEvents.emit('chat:open', { target: 'ceo' });
            });
        } else {
            // Create floating chat button
            const floatingBtn = document.createElement('button');
            floatingBtn.className = 'floating-chat-btn';
            floatingBtn.innerHTML = '💬';
            floatingBtn.title = 'Open Chat';
            
            document.body.appendChild(floatingBtn);
            
            floatingBtn.addEventListener('click', () => {
                FleetEvents.emit('chat:open', { target: 'ceo' });
            });
        }
    }

    bindEvents() {
        // Listen for notification badges
        FleetEvents.on('chat:message:received', (data) => {
            this.updateBadge(data);
        });
    }

    updateBadge(messageData) {
        // Add notification badge logic if needed
        const badges = document.querySelectorAll('.ceo-mailbox-badge, .chat-notification-badge');
        badges.forEach(badge => {
            const count = parseInt(badge.textContent) || 0;
            badge.textContent = count + 1;
            badge.style.display = 'inline-flex';
        });
    }
}

// Auto-initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (document.getElementById('chat-panel')) {
            window.ChatPanel = new ChatPanel('chat-panel');
            window.ChatButton = new ChatButton();
        }
    });
} else {
    if (document.getElementById('chat-panel')) {
        window.ChatPanel = new ChatPanel('chat-panel');
        window.ChatButton = new ChatButton();
    }
}