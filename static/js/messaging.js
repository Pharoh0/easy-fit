/**
 * Messaging JavaScript
 * Handles chat functionality, conversations, and message management
 */

class MessagingManager {
    constructor() {
        this.currentConversation = null;
        this.selectedMessage = null;
        this.attachments = [];
        this.messagesState = { nextUrl: null, loading: false, conversationId: null };
        this.conversations = [];
        this.searchTerm = '';
        // WebSocket state
        this.ws = null;
        this.wsConversationId = null;
        this.wsBackoff = 1000; // ms
        this.wsMaxBackoff = 30000; // ms
        this.wsReconnectTimer = null;
        this.wsForcedClose = false;
        this.wsPingTimer = null;
        this.init();
    }

    init() {
        this.bindEvents();
        this.bindUnloadCleanup();
        // Restore archived toggle from localStorage before loading conversations
        const archivedToggle = document.getElementById('showArchivedToggle');
        if (archivedToggle) {
            const persisted = localStorage.getItem('messaging_show_archived');
            if (persisted !== null) {
                archivedToggle.checked = persisted === 'true';
            }
        }
        this.loadConversations().then(() => this.initFromURL());
    }

    bindEvents() {
        // New conversation button
        document.getElementById('newConversationBtn')?.addEventListener('click', () => {
            this.showNewConversationModal();
        });

        // Send message form
        document.getElementById('sendMessageForm')?.addEventListener('submit', (e) => {
            this.handleSendMessage(e);
        });

        // New conversation form
        document.getElementById('newConversationForm')?.addEventListener('submit', (e) => {
            this.handleNewConversation(e);
        });

        // Edit message form
        document.getElementById('editMessageForm')?.addEventListener('submit', (e) => {
            this.handleEditMessage(e);
        });

        // Attachment button
        document.getElementById('attachmentBtn')?.addEventListener('click', () => {
            document.getElementById('attachmentInput').click();
        });

        // Attachment input
        document.getElementById('attachmentInput')?.addEventListener('change', (e) => {
            this.handleAttachments(e);
        });

        // Conversation actions
        document.getElementById('archiveConversationBtn')?.addEventListener('click', () => {
            this.archiveConversation();
        });
        document.getElementById('unarchiveConversationBtn')?.addEventListener('click', () => {
            this.unarchiveConversation();
        });

        document.getElementById('muteConversationBtn')?.addEventListener('click', () => {
            this.muteConversation();
        });

        document.getElementById('viewPlanBtn')?.addEventListener('click', () => {
            this.viewRelatedPlan();
        });
        // Show archived toggle
        document.getElementById('showArchivedToggle')?.addEventListener('change', () => {
            const checked = document.getElementById('showArchivedToggle').checked;
            localStorage.setItem('messaging_show_archived', checked ? 'true' : 'false');
            this.loadConversations();
        });
        // Mobile: toggle conversations sidebar
        document.getElementById('toggleSidebarBtn')?.addEventListener('click', () => {
            const sidebarCol = document.getElementById('conversationsSidebarCol');
            if (sidebarCol) {
                sidebarCol.classList.toggle('d-none');
            }
        });

        // Mobile: top Conversations toggle (visible before a chat is selected)
        document.getElementById('toggleSidebarBtnTop')?.addEventListener('click', () => {
            const sidebarCol = document.getElementById('conversationsSidebarCol');
            if (sidebarCol) {
                sidebarCol.classList.toggle('d-none');
            }
        });

        // Conversation search filter
        document.getElementById('conversationSearchInput')?.addEventListener('input', (e) => {
            this.searchTerm = (e.target.value || '').toLowerCase();
            this.renderConversations(this.conversations || []);
        });
    }

    bindUnloadCleanup() {
        window.addEventListener('beforeunload', () => {
            try { this.disconnectWebSocket(); } catch (e) {}
        });
    }

    async loadConversations() {
        try {
            const includeArchived = document.getElementById('showArchivedToggle')?.checked;
            const url = includeArchived ? '/messaging/api/v1/conversations/?include_archived=true' : '/messaging/api/v1/conversations/';
            const { success, data, error } = await APIBase.request(url);
            if (success) {
                const payload = data || [];
                this.conversations = payload.results || payload;
                this.renderConversations(this.conversations);
            } else {
                console.error('Failed to load conversations:', error);
                utils.showToast('Failed to load conversations', 'danger');
            }
        } catch (error) {
            utils.handleApiError(error, 'Failed to load conversations');
        }
    }

    async initFromURL() {
        try {
            const params = new URLSearchParams(window.location.search);
            const conversationId = params.get('conversation_id');
            const subscriptionId = params.get('plan_subscription_id') || params.get('subscription_id');
            let participantId = params.get('participant_id') || params.get('coach_id') || params.get('coach_user_id') || params.get('client_id') || params.get('client_user_id') || params.get('user_id');

            if (conversationId) {
                const resp = await APIBase.request(`/messaging/api/v1/conversations/${conversationId}/`);
                if (resp.success) {
                    const convo = resp.data;
                    await this.loadConversations();
                    this.selectConversation(convo);
                }
                return;
            }

            if (!subscriptionId && !participantId) return;

            // If subscription is provided but no participant, try to infer participant (coach) from subscription
            if (!participantId && subscriptionId) {
                try {
                    const subResp = await APIBase.request(`/plan-management/api/v1/plan-subscriptions/${subscriptionId}/`);
                    if (subResp.success) {
                        const sub = subResp.data;
                        if (sub.product_plan && sub.product_plan.coach && sub.product_plan.coach.user) {
                            participantId = sub.product_plan.coach.user.id;
                        } else if (sub.product_plan && sub.product_plan.coach) {
                            participantId = sub.product_plan.coach.id;
                        } else if (sub.coach && sub.coach.user) {
                            participantId = sub.coach.user.id;
                        } else if (sub.coach) {
                            participantId = sub.coach.id;
                        } else if (sub.coach_id) {
                            participantId = sub.coach_id;
                        }
                    }
                } catch (e) {
                    console.warn('Failed to infer participant from subscription', e);
                }
            }

            // Reuse existing conversation if possible before creating anything
            if (participantId) {
                const existing = this.findExistingConversation(participantId, subscriptionId);
                if (existing) {
                    await this.loadConversations();
                    return this.selectConversation(existing);
                }
            }

            // Only auto-create when subscription is explicitly provided (contextual) and no existing found
            if (participantId && subscriptionId) {
                const payload = {
                    participant_id: participantId,
                    plan_subscription_id: subscriptionId,
                    initial_message: ''
                };
                const startResp = await APIBase.request('/messaging/api/v1/conversations/start_conversation/', {
                    method: 'POST',
                    body: JSON.stringify(payload)
                });
                if (startResp.success) {
                    const convo = startResp.data;
                    await this.loadConversations();
                    this.selectConversation(convo);
                } else {
                    utils.showToast('Failed to start conversation from link', 'danger');
                }
            } else if (participantId) {
                // Do not auto-create empty conversation; prompt user to start one
                utils.showToast('No existing conversation found. Use + to start a new chat.', 'info');
            }
        } catch (e) {
            console.error('Failed to init from URL params', e);
        }
    }

    renderConversations(conversations) {
        const container = document.getElementById('conversationsList');
        container.innerHTML = '';

        const visible = this.filterConversations(conversations);

        if (visible.length === 0) {
            container.innerHTML = `
                <div class="text-center py-4">
                    <i class="fas fa-comments fa-2x text-muted mb-2"></i>
                    <p class="text-muted">No conversations yet. Start a new conversation!</p>
                </div>
            `;
            return;
        }

        visible.forEach(conversation => {
            const conversationItem = this.createConversationItem(conversation);
            container.appendChild(conversationItem);
        });
    }

    filterConversations(conversations) {
        const q = (this.searchTerm || '').trim();
        if (!q) return conversations || [];
        const ql = q.toLowerCase();
        return (conversations || []).filter(c => {
            const other = c.other_participant || (c.participants || []).find(p => p.id !== authManager.getUser()?.id) || {};
            const name = (other.full_name || other.username || 'unknown').toLowerCase();
            const last = (c.last_message && c.last_message.content ? c.last_message.content : '').toLowerCase();
            return name.includes(ql) || last.includes(ql);
        });
    }

    findExistingConversation(participantId, subscriptionId) {
        const pid = parseInt(participantId, 10);
        const sid = subscriptionId ? parseInt(subscriptionId, 10) : null;
        if (!Array.isArray(this.conversations)) return null;

        // Prefer exact subscription match when provided
        if (sid) {
            const withSub = this.conversations.find(c => {
                const other = c.other_participant || (c.participants || []).find(p => p.id !== authManager.getUser()?.id);
                const hasPair = other && other.id === pid;
                const subMatches = (c.related_subscription === sid || (c.related_subscription && c.related_subscription.id === sid));
                const isPair = ((c.participants || []).length === 2) || !!c.other_participant;
                return isPair && hasPair && subMatches;
            });
            if (withSub) return withSub;
        }

        // Fallback: any pair with same participant
        return this.conversations.find(c => {
            const other = c.other_participant || (c.participants || []).find(p => p.id !== authManager.getUser()?.id);
            const isPair = ((c.participants || []).length === 2) || !!c.other_participant;
            return isPair && other && other.id === pid;
        }) || null;
    }

    createConversationItem(conversation) {
        const item = document.createElement('div');
        const hasUnread = (conversation.unread_count || 0) > 0;
        item.className = `list-group-item list-group-item-action conversation-item ${hasUnread ? 'unread' : ''}`;
        item.dataset.conversationId = conversation.id;

        const otherParticipant = conversation.other_participant || (conversation.participants || []).find(p => p.id !== authManager.getUser()?.id);
        const lastMessage = conversation.last_message;

        item.innerHTML = `
            <div class="d-flex w-100 justify-content-between">
                <div class="d-flex align-items-center">
                    <img src="${otherParticipant?.avatar_url || '/static/images/default-avatar.svg'}" 
                         alt="Avatar" class="rounded-circle me-2" width="40" height="40">
                    <div>
                        <h6 class="mb-1">${otherParticipant?.full_name || 'Unknown'} ${conversation.is_archived ? '<span class="badge bg-secondary ms-1">Archived</span>' : ''}</h6>
                        <p class="mb-1 small text-muted">${lastMessage?.content || 'No messages yet'}</p>
                    </div>
                </div>
                <div class="text-end">
                    <small class="text-muted">${lastMessage ? utils.formatDateTime(lastMessage.sent_at) : ''}</small>
                    ${hasUnread ? '<div class="badge bg-primary rounded-pill mt-1">New</div>' : ''}
                </div>
            </div>
            
        `;

        item.addEventListener('click', () => {
            this.selectConversation(conversation);
        });

        return item;
    }

    async selectConversation(conversation) {
        // Always fetch fresh conversation details to get subscription info and latest state
        try {
            const resp = await APIBase.request(`/messaging/api/v1/conversations/${conversation.id}/`);
            if (resp.success) {
                const convo = resp.data;
                this.currentConversation = convo;
            } else {
                // Fallback to the list item data
                this.currentConversation = conversation;
            }
        } catch (e) {
            this.currentConversation = conversation;
        }

        // Update UI
        document.querySelectorAll('.conversation-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-conversation-id="${conversation.id}"]`)?.classList.add('active');

        // Show chat interface
        document.getElementById('welcomeScreen').style.display = 'none';
        document.getElementById('chatHeader').style.display = 'block';
        document.getElementById('messagesContainer').style.display = 'block';
        document.getElementById('messageInput').style.display = 'block';

        // Update chat header
        const otherParticipant = (this.currentConversation.other_participant) || (this.currentConversation.participants || []).find(p => p.id !== authManager.getUser()?.id);
        document.getElementById('chatAvatar').src = otherParticipant?.avatar_url || '/static/images/default-avatar.svg';
        document.getElementById('chatName').textContent = otherParticipant?.full_name || 'Unknown';
        document.getElementById('chatStatus').textContent = '';

        // Toggle Archive/Unarchive visibility based on conversation state
        const archiveBtn = document.getElementById('archiveConversationBtn');
        const unarchiveBtn = document.getElementById('unarchiveConversationBtn');
        if (archiveBtn && unarchiveBtn) {
            if (this.currentConversation.is_archived) {
                archiveBtn.style.display = 'none';
                unarchiveBtn.style.display = 'block';
            } else {
                archiveBtn.style.display = 'block';
                unarchiveBtn.style.display = 'none';
            }
        }

        // Load messages
        await this.loadMessages(conversation.id, true);

        // Mark conversation as read
        await this.markConversationAsRead(conversation.id);

        // Mobile UX: auto-hide sidebar after selection on small screens
        if (window.innerWidth < 768) {
            const sidebarCol = document.getElementById('conversationsSidebarCol');
            if (sidebarCol) {
                sidebarCol.classList.add('d-none');
            }
        }

        // Connect WebSocket for real-time updates
        this.connectWebSocket(conversation.id);
    }

    async loadMessages(conversationId, reset = true) {
        try {
            if (reset) {
                this.messagesState = { nextUrl: null, loading: false, conversationId };
                const container = document.getElementById('messagesContainer');
                if (this._messagesScrollHandler) {
                    container.removeEventListener('scroll', this._messagesScrollHandler);
                    this._messagesScrollHandler = null;
                }
            }

            const response = await APIBase.request(`/messaging/api/v1/messages/?conversation=${conversationId}`);
            if (response.success) {
                const data = response.data || [];
                const messages = data.results || data;
                this.renderMessages(messages);
                this.messagesState.nextUrl = data.next || null;
                this.attachMessageScroll();
            } else {
                utils.showToast('Failed to load messages', 'danger');
            }
        } catch (error) {
            utils.handleApiError(error, 'Failed to load messages');
        }
    }

    renderMessages(messages) {
        const container = document.getElementById('messagesContainer');
        container.innerHTML = '';

        const currentUserId = authManager.getUser()?.id;

        const ordered = (messages || []).slice().reverse();
        ordered.forEach(message => {
            const messageElement = this.createMessageElement(message, currentUserId);
            container.appendChild(messageElement);
        });

        // Scroll to bottom
        container.scrollTop = container.scrollHeight;
    }

    attachMessageScroll() {
        const container = document.getElementById('messagesContainer');
        if (!container) return;
        if (this._messagesScrollHandler) {
            container.removeEventListener('scroll', this._messagesScrollHandler);
        }
        this._messagesScrollHandler = () => {
            if (this.messagesState.loading) return;
            if (!this.messagesState.nextUrl) return;
            if (container.scrollTop <= 50) {
                this.loadOlderMessages();
            }
        };
        container.addEventListener('scroll', this._messagesScrollHandler);
    }

    async loadOlderMessages() {
        const container = document.getElementById('messagesContainer');
        if (!this.messagesState.nextUrl || !container) return;
        this.messagesState.loading = true;
        const prevScrollHeight = container.scrollHeight;
        const prevScrollTop = container.scrollTop;
        try {
            const resp = await APIBase.request(this.messagesState.nextUrl);
            if (resp.success) {
                const data = resp.data || [];
                const messages = data.results || data;
                this.prependMessages(messages);
                this.messagesState.nextUrl = data.next || null;
                const newScrollHeight = container.scrollHeight;
                container.scrollTop = prevScrollTop + (newScrollHeight - prevScrollHeight);
            }
        } catch (e) {
            console.error('Failed to load older messages', e);
        } finally {
            this.messagesState.loading = false;
        }
    }

    prependMessages(messages) {
        const container = document.getElementById('messagesContainer');
        const currentUserId = authManager.getUser()?.id;
        const ordered = (messages || []).slice().reverse();
        const fragment = document.createDocumentFragment();
        ordered.forEach(message => {
            const messageElement = this.createMessageElement(message, currentUserId);
            fragment.appendChild(messageElement);
        });
        container.insertBefore(fragment, container.firstChild);
    }

    createMessageElement(message, currentUserId) {
        const isOwn = message.sender.id === currentUserId;
        const messageDiv = document.createElement('div');
        messageDiv.className = `message-item mb-3 ${isOwn ? 'own-message' : 'other-message'}`;
        messageDiv.dataset.messageId = message.id;

        messageDiv.innerHTML = `
            <div class="d-flex ${isOwn ? 'justify-content-end' : 'justify-content-start'}">
                <div class="message-bubble ${isOwn ? 'bg-primary text-white' : 'bg-light'}" style="max-width: 70%;">
                    ${!isOwn ? `
                    <div class="d-flex align-items-center mb-2">
                        <img src="${message.sender.avatar_url || '/static/images/default-avatar.svg'}" 
                             alt="Avatar" class="rounded-circle me-2" width="24" height="24">
                        <small class="fw-bold">${message.sender.full_name}</small>
                    </div>
                    ` : ''}
                    
                    ${message.reply_to_message ? `
                    <div class="reply-reference p-2 mb-2 border-start border-3 bg-opacity-50 ${isOwn ? 'bg-light text-dark' : 'bg-primary text-white'}">
                        <small>Replying to: ${message.reply_to_message.content.substring(0, 50)}...</small>
                    </div>
                    ` : ''}
                    
                    <div class="message-content">
                        ${message.content}
                    </div>
                    
                    ${message.attachment_url ? `
                    <div class="message-attachments mt-2">
                        ${message.message_type === 'image' ? 
                            `<img src="${message.attachment_url}" alt="Attachment" class="img-thumbnail" style="max-width: 200px;">` :
                            `<a href="${message.attachment_url}" target="_blank" class="btn btn-sm btn-outline-secondary">
                                <i class="fas fa-file"></i> ${message.attachment_name || 'Attachment'}
                            </a>`
                        }
                    </div>
                    ` : ''}
                    
                    <div class="message-meta d-flex justify-content-between align-items-center mt-2">
                        <small class="text-muted">${utils.formatDateTime(message.sent_at)}</small>
                        ${isOwn ? `
                        <div class="message-actions">
                            <button class="btn btn-sm btn-link text-muted p-0 me-2 edit-message-btn" data-message-id="${message.id}">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-link text-muted p-0 delete-message-btn" data-message-id="${message.id}">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                        ` : `
                        <button class="btn btn-sm btn-link text-muted p-0 reply-message-btn" data-message-id="${message.id}">
                            <i class="fas fa-reply"></i>
                        </button>
                        `}
                    </div>
                    
                    ${message.is_edited ? '<small class="text-muted fst-italic">Edited</small>' : ''}
                </div>
            </div>
        `;

        // Bind message actions
        messageDiv.querySelector('.edit-message-btn')?.addEventListener('click', () => {
            this.editMessage(message);
        });

        messageDiv.querySelector('.delete-message-btn')?.addEventListener('click', () => {
            this.deleteMessage(message.id);
        });

        messageDiv.querySelector('.reply-message-btn')?.addEventListener('click', () => {
            this.replyToMessage(message);
        });

        return messageDiv;
    }

    async handleSendMessage(e) {
        e.preventDefault();
        
        if (!this.currentConversation) {
            utils.showToast('Please select a conversation first', 'warning');
            return;
        }

        const formEl = e.target;
        const formData = new FormData(formEl);
        const content = (formData.get('content') || '').toString().trim();
        
        if (!content && this.attachments.length === 0) {
            utils.showToast('Please enter a message or attach a file', 'warning');
            return;
        }

        // Build FormData payload to support file upload
        const payload = new FormData();
        payload.append('conversation', this.currentConversation.id);
        payload.append('content', content);

        if (this.replyToMessageId) {
            payload.append('reply_to', this.replyToMessageId);
        }

        if (this.attachments.length > 0) {
            const fileObj = this.attachments[0];
            payload.append('attachment', fileObj.file);
            const isImage = (fileObj.type === 'image');
            payload.append('message_type', isImage ? 'image' : 'file');
        } else {
            payload.append('message_type', 'text');
        }

        try {
            const response = await APIBase.request('/messaging/api/v1/messages/', { method: 'POST', body: payload });
            if (response.success) {
                // Clear form
                formEl.reset();
                this.attachments = [];
                this.hideAttachmentPreview();
                this.replyToMessageId = null;
                const input = formEl.querySelector('input[name="content"]');
                if (input) input.placeholder = 'Type your message...';
            } else {
                utils.showToast('Failed to send message', 'danger');
            }
        } catch (error) {
            utils.handleApiError(error, 'Failed to send message');
        }

    }

    handleAttachments(e) {
        const files = Array.from(e.target?.files || []);
        if (!files.length) {
            this.attachments = [];
            this.showAttachmentPreview();
            return;
        }
        const file = files[0];
        this.attachments = [{
            file: file,
            name: file.name,
            type: (file.type && file.type.startsWith('image/')) ? 'image' : 'file'
        }];
        this.showAttachmentPreview();
    }

    showAttachmentPreview() {
        const preview = document.getElementById('attachmentPreview');
        const list = document.getElementById('attachmentList');
        
        list.innerHTML = '';
        
        this.attachments.forEach((attachment, index) => {
            const item = document.createElement('div');
            item.className = 'attachment-preview-item p-2 border rounded d-flex align-items-center';
            
            item.innerHTML = `
                <div class="me-2">
                    ${attachment.type === 'image' ? 
                        `<i class="fas fa-image text-primary"></i>` : 
                        `<i class="fas fa-file text-secondary"></i>`
                    }
                </div>
                <div class="flex-grow-1">
                    <small>${attachment.name}</small>
                </div>
                <button type="button" class="btn btn-sm btn-outline-danger remove-attachment-btn" data-index="${index}">
                    <i class="fas fa-times"></i>
                </button>
            `;
            
            item.querySelector('.remove-attachment-btn').addEventListener('click', () => {
                this.removeAttachment(index);
            });
            
            list.appendChild(item);
        });
        
        preview.style.display = this.attachments.length > 0 ? 'block' : 'none';
    }

    hideAttachmentPreview() {
        document.getElementById('attachmentPreview').style.display = 'none';
    }

    removeAttachment(index) {
        this.attachments.splice(index, 1);
        this.showAttachmentPreview();
    }

    async markConversationAsRead(conversationId) {
        try {
            await APIBase.request(`/messaging/api/v1/conversations/${conversationId}/mark_read/`, { method: 'POST' });
        } catch (error) {
            console.error('Failed to mark conversation as read:', error);
        }
    }

    async showNewConversationModal() {
        // Load contacts and plans
        await this.loadContactsAndPlans();
        
        const modal = new bootstrap.Modal(document.getElementById('newConversationModal'));
        modal.show();
    }

    async loadContactsAndPlans() {
        try {
            const userRole = authManager.getUserRole();
            const token = APIBase.getJWTToken();
            if (!token) {
                console.error('No access token found for API calls');
                utils.showToast('Authentication error. Please log in again.', 'danger');
                return;
            }

            let contactsLoaded = false;
            const contactsResponse = await APIBase.request('/plan-management/api/v1/plan-subscriptions/');
            if (contactsResponse.success) {
                const contactsData = contactsResponse.data;
                this.renderContactOptions(contactsData.results || contactsData, userRole);
                contactsLoaded = true;
            } else {
                console.error('Failed to load contacts via subscriptions:', contactsResponse.error);
            }

            if (!contactsLoaded) {
                if (userRole === 'client') {
                    const coachesResponse = await APIBase.request('/plan-management/api/v1/coach-profiles/');
                    if (coachesResponse.success) {
                        const coachesData = coachesResponse.data;
                        this.renderCoachOptions(coachesData.results || coachesData);
                    }
                } else if (userRole === 'coach') {
                    const clientsResponse = await APIBase.request('/plan-management/api/v1/coach-client-access/my_clients/');
                    if (clientsResponse.success) {
                        const clientsData = clientsResponse.data;
                        this.renderClientOptions(clientsData.clients || clientsData.results || []);
                    }
                }
            }

            const plansResponse = await APIBase.request('/plan-management/api/v1/plan-subscriptions/');
            if (plansResponse.success) {
                const plansData = plansResponse.data;
                this.renderPlanOptions(plansData.results || plansData);
            }
        } catch (error) {
            console.error('Failed to load contacts and plans:', error);
        }
    }

    renderContactOptions(data, userRole) {
        const select = document.getElementById('contactSelect');
        select.innerHTML = '<option value="">Choose a contact...</option>';

        const contacts = new Map();

        data.forEach(item => {
            let id = null;
            let name = null;
            let role = null;

            if (userRole === 'client') {
                // Try all possible paths to find coach user ID
                let coachUser = null;
                
                // Path 1: product_plan.coach.user (most complete)
                if (item.product_plan && item.product_plan.coach && item.product_plan.coach.user) {
                    coachUser = item.product_plan.coach.user;
                    id = coachUser.id;
                    name = coachUser.full_name || coachUser.username || 'Coach';
                    role = 'Coach';
                }
                // Path 2: coach.user
                else if (item.coach && item.coach.user) {
                    coachUser = item.coach.user;
                    id = coachUser.id;
                    name = coachUser.full_name || coachUser.username || coachUser.name || 'Coach';
                    role = 'Coach';
                }
                // Path 3: product_plan.coach (coach might be directly a user)
                else if (item.product_plan && item.product_plan.coach) {
                    coachUser = item.product_plan.coach;
                    id = coachUser.id;
                    name = coachUser.full_name || coachUser.username || coachUser.name || 'Coach';
                    role = 'Coach';
                }
                // Path 4: coach directly
                else if (item.coach) {
                    coachUser = item.coach;
                    id = coachUser.id;
                    name = coachUser.full_name || coachUser.username || coachUser.name || 'Coach';
                    role = 'Coach';
                }
                
                // Debug log
                if (id) {
                    console.log(`Found coach: ID=${id}, Name=${name} from:`, item);
                }
            } else if (userRole === 'coach') {
                // Try all possible paths to find client user ID
                let clientUser = null;
                
                // Path 1: client.user
                if (item.client && item.client.user) {
                    clientUser = item.client.user;
                    id = clientUser.id;
                    name = clientUser.full_name || clientUser.username || 'Client';
                    role = 'Client';
                }
                // Path 2: client directly
                else if (item.client) {
                    clientUser = item.client;
                    id = clientUser.id;
                    name = clientUser.full_name || clientUser.username || clientUser.name || 'Client';
                    role = 'Client';
                }
                
                // Debug log
                if (id) {
                    console.log(`Found client: ID=${id}, Name=${name} from:`, item);
                }
            }

            if (id && !contacts.has(id)) {
                contacts.set(id, { id, name, role });
            }
        });

        contacts.forEach(contact => {
            const option = document.createElement('option');
            option.value = contact.id;
            option.textContent = `${contact.name} (${contact.role})`;
            select.appendChild(option);
        });
        
        // Debug log
        console.log(`Rendered ${contacts.size} contacts for ${userRole}`);
    }

    renderPlanOptions(plans) {
        const select = document.getElementById('planSelect');
        select.innerHTML = '<option value="">No specific plan</option>';

        plans.forEach(plan => {
            if (plan.product_plan && plan.product_plan.name) {
                const option = document.createElement('option');
                option.value = plan.id;
                option.textContent = plan.product_plan.name;
                select.appendChild(option);
            }
        });
    }
    
    /**
     * Renders coach options when subscription-based approach fails
     */
    renderCoachOptions(coaches) {
        const select = document.getElementById('contactSelect');
        select.innerHTML = '<option value="">Choose a coach...</option>';
        
        coaches.forEach(coach => {
            // Coach might be a profile with user or directly a user
            let userId = null;
            let name = 'Coach';
            
            if (coach.user && coach.user.id) {
                userId = coach.user.id;
                name = coach.user.full_name || coach.user.username || coach.name || 'Coach';
            } else if (coach.id) {
                userId = coach.id;
                name = coach.full_name || coach.username || coach.name || 'Coach';
            }
            
            if (userId) {
                const option = document.createElement('option');
                option.value = userId;
                option.textContent = `${name} (Coach)`;
                select.appendChild(option);
                console.log(`Added coach: ID=${userId}, Name=${name}`);
            }
        });
    }
    
    /**
     * Renders client options when subscription-based approach fails
     */
    renderClientOptions(clients) {
        const select = document.getElementById('contactSelect');
        select.innerHTML = '<option value="">Choose a client...</option>';
        
        clients.forEach(client => {
            let userId = client.id;
            let name = client.full_name || client.username || 'Client';
            
            if (userId) {
                const option = document.createElement('option');
                option.value = userId;
                option.textContent = `${name} (Client)`;
                select.appendChild(option);
                console.log(`Added client: ID=${userId}, Name=${name}`);
            }
        });
    }

    async handleNewConversation(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const conversationData = {
            participant_id: formData.get('participant_id'),
            plan_subscription_id: formData.get('plan_subscription_id') || null,
            initial_message: formData.get('initial_message')
        };

        // Reuse existing conversation if present
        const existing = this.findExistingConversation(conversationData.participant_id, conversationData.plan_subscription_id);
        if (existing) {
            utils.showToast('Opening existing conversation', 'info');
            const modal = bootstrap.Modal.getInstance(document.getElementById('newConversationModal'));
            modal.hide();
            e.target.reset();
            await this.loadConversations();
            return this.selectConversation(existing);
        }

        try {
            const response = await APIBase.request('/messaging/api/v1/conversations/start_conversation/', {
                method: 'POST',
                body: JSON.stringify(conversationData)
            });
            if (response.success) {
                const conversation = response.data;
                utils.showToast('Conversation started successfully!', 'success');
                const modal = bootstrap.Modal.getInstance(document.getElementById('newConversationModal'));
                modal.hide();
                e.target.reset();
                await this.loadConversations();
                this.selectConversation(conversation);
            } else {
                utils.showToast('Failed to start conversation', 'danger');
            }
        } catch (error) {
            utils.handleApiError(error, 'Failed to start conversation');
        }
    }

    async archiveConversation() {
        if (!this.currentConversation) return;

        try {
            const response = await APIBase.request(`/messaging/api/v1/conversations/${this.currentConversation.id}/archive/`, { method: 'POST' });
            if (response.success) {
                utils.showToast('Conversation archived', 'success');
                await this.loadConversations();
                // Disconnect real-time updates for archived conversation
                this.disconnectWebSocket();
                
                // Clear chat interface
                this.currentConversation = null;
                document.getElementById('welcomeScreen').style.display = 'block';
                document.getElementById('chatHeader').style.display = 'none';
                document.getElementById('messagesContainer').style.display = 'none';
                document.getElementById('messageInput').style.display = 'none';
            } else {
                utils.showToast('Failed to archive conversation', 'danger');
            }
        } catch (error) {
            utils.handleApiError(error, 'Failed to archive conversation');
        }
    }

    async unarchiveConversation() {
        if (!this.currentConversation) return;

        try {
            const response = await APIBase.request(`/messaging/api/v1/conversations/${this.currentConversation.id}/unarchive/`, { method: 'POST' });
            if (response.success) {
                utils.showToast('Conversation unarchived', 'success');
                // Reload conversations respecting current filter
                await this.loadConversations();
                // Refresh details and header actions
                const detailResp = await APIBase.request(`/messaging/api/v1/conversations/${this.currentConversation.id}/`);
                if (detailResp.success) {
                    const convo = detailResp.data;
                    await this.selectConversation(convo);
                }
            } else {
                utils.showToast('Failed to unarchive conversation', 'danger');
            }
        } catch (error) {
            utils.handleApiError(error, 'Failed to unarchive conversation');
        }
    }

    async muteConversation() {
        if (!this.currentConversation) return;

        try {
            const response = await APIBase.request(`/messaging/api/v1/conversations/${this.currentConversation.id}/mute/`, { method: 'POST' });
            if (response.success) {
                utils.showToast('Conversation muted', 'success');
            } else {
                utils.showToast('Failed to mute conversation', 'danger');
            }
        } catch (error) {
            utils.handleApiError(error, 'Failed to mute conversation');
        }
    }

    viewRelatedPlan() {
        if (this.currentConversation?.related_subscription) {
            window.location.href = `/plan-management/subscription/${this.currentConversation.related_subscription}/`;
        }
    }

    editMessage(message) {
        this.selectedMessage = message;
        document.querySelector('#editMessageForm textarea[name="content"]').value = message.content;
        
        const modal = new bootstrap.Modal(document.getElementById('editMessageModal'));
        modal.show();
    }

    async handleEditMessage(e) {
        e.preventDefault();
        
        if (!this.selectedMessage) return;

        const formData = new FormData(e.target);
        const content = formData.get('content');

        try {
            const response = await APIBase.request(`/messaging/api/v1/messages/${this.selectedMessage.id}/`, {
                method: 'PATCH',
                body: JSON.stringify({ content })
            });
            if (response.success) {
                utils.showToast('Message updated', 'success');
                
                // Close modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('editMessageModal'));
                modal.hide();
            } else {
                utils.showToast('Failed to update message', 'danger');
            }
        } catch (error) {
            utils.handleApiError(error, 'Failed to update message');
        }
    }

    async deleteMessage(messageId) {
        if (!confirm('Are you sure you want to delete this message?')) return;

        try {
            const response = await APIBase.request(`/messaging/api/v1/messages/${messageId}/`, { method: 'DELETE' });
            if (response.success) {
                utils.showToast('Message deleted', 'success');
            } else {
                utils.showToast('Failed to delete message', 'danger');
            }
        } catch (error) {
            utils.handleApiError(error, 'Failed to delete message');
        }
    }

    replyToMessage(message) {
        // Set reply context in the message input
        const messageInput = document.querySelector('#sendMessageForm input[name="content"]');
        messageInput.placeholder = `Replying to: ${message.content.substring(0, 30)}...`;
        messageInput.focus();
        
        // Store reply context (you might want to add a hidden input for this)
        this.replyToMessageId = message.id;
    }

    // WebSocket management
    async connectWebSocket(conversationId) {
        try {
            const current = this.currentConversation;
            if (!current || current.id !== conversationId) return;
            const statusEl = document.getElementById('chatStatus');
            if (statusEl) statusEl.textContent = 'Connecting...';

            // Ensure we have a fresh token before connecting
            let token = APIBase.getJWTToken();
            if (!token || APIBase.tokenNeedsRefresh(token)) {
                try {
                    token = await APIBase.refreshToken();
                } catch (e) {
                    token = null;
                }
            }
            if (!token) {
                console.warn('No JWT token available for WebSocket');
                if (statusEl) statusEl.textContent = 'Not authorized';
                return;
            }

            // If already connected to this conversation, do nothing
            if (this.ws && this.ws.readyState === WebSocket.OPEN && this.wsConversationId === conversationId) {
                if (statusEl) statusEl.textContent = 'Online';
                return;
            }

            // If connected to a different conversation, disconnect first
            if (this.ws) {
                this.disconnectWebSocket();
            }

            this.wsForcedClose = false;

            // Normalize token: strip accidental prefixes and whitespace
            token = (token || '').trim();
            const lower = token.toLowerCase();
            if (lower.startsWith('bearer ')) {
                token = token.slice(7).trim();
            } else if (lower.startsWith('jwt ')) {
                token = token.slice(4).trim();
            }

            // Make sure token is properly passed - remove any URL encoding that might already be in the token
            token = token.replace(/%20/g, ' ').replace(/%2F/g, '/').replace(/%2B/g, '+');
            
            const scheme = (window.location.protocol === 'https:') ? 'wss' : 'ws';
            const masked = token ? `${token.slice(0, 4)}..${token.slice(-4)}` : '';
            console.debug('[WS] Opening', { conv: conversationId, token_length: token.length, token: masked });
            // Encode the token to ensure special characters are properly handled
            const url = `${scheme}://${window.location.host}/ws/messaging/conversations/${conversationId}/?token=${encodeURIComponent(token)}`;
            const ws = new WebSocket(url);
            this.ws = ws;
            this.wsConversationId = conversationId;

            ws.onopen = () => {
                // Reset backoff and start keepalive ping
                this.wsBackoff = 1000;
                if (this.wsPingTimer) clearInterval(this.wsPingTimer);
                this.wsPingTimer = setInterval(() => {
                    try {
                        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                            this.ws.send(JSON.stringify({ action: 'ping' }));
                        }
                    } catch (e) {}
                }, 30000);
                if (statusEl) statusEl.textContent = 'Online';
                console.debug('[WS] Connection opened successfully');
            };

            ws.onmessage = (ev) => {
                try {
                    console.debug('[WS] Message received:', ev.data.substring(0, 100));
                    this.handleWebSocketMessage(ev);
                } catch (e) {
                    console.error('[WS] Error handling message:', e);
                }
            };

            ws.onerror = (ev) => {
                console.warn('[WS] error', ev);
                if (statusEl && (!this.wsForcedClose)) {
                    statusEl.textContent = 'Connection error';
                }
            };

            ws.onclose = async (ev) => {
                if (this.wsPingTimer) { clearInterval(this.wsPingTimer); this.wsPingTimer = null; }
                if (this.wsReconnectTimer) { clearTimeout(this.wsReconnectTimer); this.wsReconnectTimer = null; }

                const wasForced = this.wsForcedClose;
                const closedConv = this.wsConversationId;
                this.ws = null;
                this.wsConversationId = null;
                
                console.debug('[WS] Connection closed', { code: ev?.code, reason: ev?.reason });

                if (wasForced) {
                    if (statusEl) statusEl.textContent = 'Disconnected';
                    return;
                }

                // If auth error, try single refresh then immediate retry
                if (ev && ev.code === 4001) {
                    if (statusEl) statusEl.textContent = 'Auth error, retrying...';
                    try {
                        const newToken = await APIBase.refreshToken();
                        if (newToken && this.currentConversation && this.currentConversation.id === closedConv) {
                            this.wsBackoff = 1000;
                            return this.connectWebSocket(closedConv);
                        }
                    } catch (e) {}
                }

                // Do not reconnect on permanent errors
                if (ev && (ev.code === 4002 || ev.code === 4003)) {
                    if (statusEl) statusEl.textContent = ev.code === 4002 ? 'Invalid conversation' : 'Not authorized';
                    return;
                }

                // Reconnect with exponential backoff if still viewing the same conversation
                const delay = this.wsBackoff;
                this.wsBackoff = Math.min(this.wsBackoff * 2, this.wsMaxBackoff);
                if (statusEl) statusEl.textContent = `Reconnecting in ${Math.round(delay / 1000)}s...`;
                this.wsReconnectTimer = setTimeout(() => {
                    if (this.currentConversation && this.currentConversation.id === conversationId) {
                        this.connectWebSocket(conversationId);
                    }
                }, delay);
            };
        } catch (e) {
            console.error('Failed to open WebSocket', e);
            const statusEl = document.getElementById('chatStatus');
            if (statusEl) statusEl.textContent = 'Disconnected';
        }
    }

    disconnectWebSocket() {
        try {
            this.wsForcedClose = true;
            if (this.wsReconnectTimer) { clearTimeout(this.wsReconnectTimer); this.wsReconnectTimer = null; }
            if (this.wsPingTimer) { clearInterval(this.wsPingTimer); this.wsPingTimer = null; }
            if (this.ws) {
                try { this.ws.close(); } catch (e) {}
            }
        } finally {
            this.ws = null;
            this.wsConversationId = null;
            this.wsBackoff = 1000;
        }
    }

    handleWebSocketMessage(ev) {
        try {
            const data = JSON.parse(ev.data);
            if (data && data.event) {
                console.debug(`[WS] Event received: ${data.event}`, data);
                this.handleWebSocketEvent(data);
            }
        } catch (e) {
            console.warn('Failed to parse WS message', e, ev?.data);
        }
    }

    handleWebSocketEvent(payload) {
        const evt = payload.event;
        switch (evt) {
            case 'message.created': {
                if (payload.message) this.addMessageToDOM(payload.message);
                break;
            }
            case 'message.updated': {
                if (payload.message) this.updateMessageInDOM(payload.message);
                break;
            }
            case 'message.deleted': {
                if (payload.message_id) this.removeMessageFromDOM(payload.message_id);
                break;
            }
            case 'conversation.updated': {
                const conv = payload.conversation;
                if (conv && this.currentConversation && conv.id === this.currentConversation.id) {
                    this.currentConversation = conv;
                    const archiveBtn = document.getElementById('archiveConversationBtn');
                    const unarchiveBtn = document.getElementById('unarchiveConversationBtn');
                    if (archiveBtn && unarchiveBtn) {
                        if (conv.is_archived) {
                            archiveBtn.style.display = 'none';
                            unarchiveBtn.style.display = 'block';
                        } else {
                            archiveBtn.style.display = 'block';
                            unarchiveBtn.style.display = 'none';
                        }
                    }
                }
                // Refresh list to reflect last message/unread badges
                this.loadConversations();
                break;
            }
            case 'conversation.archived':
            case 'conversation.unarchived': {
                // Refresh list and header buttons
                this.loadConversations();
                break;
            }
            case 'conversation.read': {
                // Hook for future read-receipt UI
                break;
            }
            default:
                break;
        }
    }

    addMessageToDOM(message) {
        try {
            console.debug('[WS] Adding message to DOM:', message.id);
            // Make sure we only add messages for the current conversation
            if (!this.currentConversation || !message) return;
            
            // Verify the message belongs to this conversation
            const convRef = message.conversation;
            const messageConvId = (convRef && typeof convRef === 'object') ? convRef.id : convRef;
            if (messageConvId && messageConvId !== this.currentConversation.id) {
                console.debug('[WS] Ignoring message for different conversation:', messageConvId);
                return;
            }
            
            const container = document.getElementById('messagesContainer');
            if (!container) {
                console.warn('[WS] No message container found');
                return;
            }
            
            // Check for duplicates
            if (container.querySelector(`[data-message-id="${message.id}"]`)) {
                console.debug('[WS] Duplicate message, not adding:', message.id);
                return;
            }
            
            const currentUserId = authManager.getUser()?.id;
            const el = this.createMessageElement(message, currentUserId);
            container.appendChild(el);
            container.scrollTop = container.scrollHeight;
            console.debug('[WS] Message added successfully:', message.id);
        } catch (e) {
            console.warn('Failed to append message', e);
        }
    }

    updateMessageInDOM(message) {
        try {
            const container = document.getElementById('messagesContainer');
            if (!container) return;
            const existing = container.querySelector(`[data-message-id="${message.id}"]`);
            if (!existing) return this.addMessageToDOM(message);
            
            const currentUserId = authManager.getUser()?.id;
            const replacement = this.createMessageElement(message, currentUserId);
            existing.parentNode.replaceChild(replacement, existing);
        } catch (e) {
            console.warn('Failed to update message', e);
        }
    }

    removeMessageFromDOM(messageId) {
        try {
            const container = document.getElementById('messagesContainer');
            if (!container) return;
            const existing = container.querySelector(`[data-message-id="${messageId}"]`);
            if (existing && existing.parentNode) existing.parentNode.removeChild(existing);
        } catch (e) {
            console.warn('Failed to remove message', e);
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new MessagingManager();
});
