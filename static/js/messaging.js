/**
 * Messaging JavaScript
 * Handles chat functionality, conversations, and message management
 */

class MessagingManager {
    constructor() {
        this.currentConversation = null;
        this.selectedMessage = null;
        this.attachments = [];
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadConversations();
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

        document.getElementById('muteConversationBtn')?.addEventListener('click', () => {
            this.muteConversation();
        });

        document.getElementById('viewPlanBtn')?.addEventListener('click', () => {
            this.viewRelatedPlan();
        });
    }

    async loadConversations() {
        try {
            const response = await api.get('/messaging/api/v1/conversations/');
            
            if (response.ok) {
                const data = await response.json();
                this.renderConversations(data.results || data);
            } else {
                utils.handleApiError(response, 'Failed to load conversations');
            }
        } catch (error) {
            utils.handleApiError(error, 'Failed to load conversations');
        }
    }

    renderConversations(conversations) {
        const container = document.getElementById('conversationsList');
        container.innerHTML = '';

        if (conversations.length === 0) {
            container.innerHTML = `
                <div class="text-center py-4">
                    <i class="fas fa-comments fa-2x text-muted mb-2"></i>
                    <p class="text-muted">No conversations yet. Start a new conversation!</p>
                </div>
            `;
            return;
        }

        conversations.forEach(conversation => {
            const conversationItem = this.createConversationItem(conversation);
            container.appendChild(conversationItem);
        });
    }

    createConversationItem(conversation) {
        const item = document.createElement('div');
        item.className = `list-group-item list-group-item-action conversation-item ${conversation.has_unread ? 'unread' : ''}`;
        item.dataset.conversationId = conversation.id;

        const otherParticipant = conversation.participants.find(p => p.user.id !== authManager.getUser()?.id);
        const lastMessage = conversation.last_message;

        item.innerHTML = `
            <div class="d-flex w-100 justify-content-between">
                <div class="d-flex align-items-center">
                    <img src="${otherParticipant?.user?.avatar || '/static/images/default-avatar.jpg'}" 
                         alt="Avatar" class="rounded-circle me-2" width="40" height="40">
                    <div>
                        <h6 class="mb-1">${otherParticipant?.user?.full_name || 'Unknown'}</h6>
                        <p class="mb-1 small text-muted">${lastMessage?.content || 'No messages yet'}</p>
                    </div>
                </div>
                <div class="text-end">
                    <small class="text-muted">${lastMessage ? utils.formatDateTime(lastMessage.created_at) : ''}</small>
                    ${conversation.has_unread ? '<div class="badge bg-primary rounded-pill mt-1">New</div>' : ''}
                </div>
            </div>
            ${conversation.plan_subscription ? `
            <div class="mt-2">
                <small class="badge bg-light text-dark">
                    <i class="fas fa-dumbbell"></i> ${conversation.plan_subscription.product_plan.name}
                </small>
            </div>
            ` : ''}
        `;

        item.addEventListener('click', () => {
            this.selectConversation(conversation);
        });

        return item;
    }

    async selectConversation(conversation) {
        this.currentConversation = conversation;

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
        const otherParticipant = conversation.participants.find(p => p.user.id !== authManager.getUser()?.id);
        document.getElementById('chatAvatar').src = otherParticipant?.user?.avatar || '/static/images/default-avatar.jpg';
        document.getElementById('chatName').textContent = otherParticipant?.user?.full_name || 'Unknown';
        document.getElementById('chatStatus').textContent = otherParticipant?.user?.is_online ? 'Online' : 'Offline';

        // Load messages
        await this.loadMessages(conversation.id);

        // Mark conversation as read
        await this.markConversationAsRead(conversation.id);
    }

    async loadMessages(conversationId) {
        try {
            const response = await api.get(`/messaging/api/v1/messages/?conversation=${conversationId}`);
            
            if (response.ok) {
                const data = await response.json();
                this.renderMessages(data.results || data);
            } else {
                utils.handleApiError(response, 'Failed to load messages');
            }
        } catch (error) {
            utils.handleApiError(error, 'Failed to load messages');
        }
    }

    renderMessages(messages) {
        const container = document.getElementById('messagesContainer');
        container.innerHTML = '';

        const currentUserId = authManager.getUser()?.id;

        messages.forEach(message => {
            const messageElement = this.createMessageElement(message, currentUserId);
            container.appendChild(messageElement);
        });

        // Scroll to bottom
        container.scrollTop = container.scrollHeight;
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
                        <img src="${message.sender.avatar || '/static/images/default-avatar.jpg'}" 
                             alt="Avatar" class="rounded-circle me-2" width="24" height="24">
                        <small class="fw-bold">${message.sender.full_name}</small>
                    </div>
                    ` : ''}
                    
                    ${message.reply_to ? `
                    <div class="reply-reference p-2 mb-2 border-start border-3 bg-opacity-50 ${isOwn ? 'bg-light text-dark' : 'bg-primary text-white'}">
                        <small>Replying to: ${message.reply_to.content.substring(0, 50)}...</small>
                    </div>
                    ` : ''}
                    
                    <div class="message-content">
                        ${message.content}
                    </div>
                    
                    ${message.attachments && message.attachments.length > 0 ? `
                    <div class="message-attachments mt-2">
                        ${message.attachments.map(att => `
                            <div class="attachment-item">
                                ${att.file_type === 'image' ? 
                                    `<img src="${att.file_url}" alt="Attachment" class="img-thumbnail" style="max-width: 200px;">` :
                                    `<a href="${att.file_url}" target="_blank" class="btn btn-sm btn-outline-secondary">
                                        <i class="fas fa-file"></i> ${att.file_name}
                                    </a>`
                                }
                            </div>
                        `).join('')}
                    </div>
                    ` : ''}
                    
                    <div class="message-meta d-flex justify-content-between align-items-center mt-2">
                        <small class="text-muted">${utils.formatDateTime(message.created_at)}</small>
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

        const formData = new FormData(e.target);
        const content = formData.get('content').trim();
        
        if (!content && this.attachments.length === 0) {
            utils.showToast('Please enter a message or attach a file', 'warning');
            return;
        }

        const messageData = {
            conversation: this.currentConversation.id,
            content: content,
            attachments: this.attachments
        };

        try {
            const response = await api.post('/messaging/api/v1/messages/', messageData);
            
            if (response.ok) {
                // Clear form
                e.target.reset();
                this.attachments = [];
                this.hideAttachmentPreview();
                
                // Reload messages
                await this.loadMessages(this.currentConversation.id);
            } else {
                const errorData = await response.json();
                utils.showToast(errorData.error || 'Failed to send message', 'danger');
            }
        } catch (error) {
            utils.handleApiError(error, 'Failed to send message');
        }
    }

    handleAttachments(e) {
        const files = Array.from(e.target.files);
        
        files.forEach(file => {
            if (file.size > 10 * 1024 * 1024) { // 10MB limit
                utils.showToast(`File ${file.name} is too large (max 10MB)`, 'warning');
                return;
            }
            
            this.attachments.push({
                file: file,
                name: file.name,
                type: file.type.startsWith('image/') ? 'image' : 'file'
            });
        });

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

    async showNewConversationModal() {
        // Load contacts and plans
        await this.loadContactsAndPlans();
        
        const modal = new bootstrap.Modal(document.getElementById('newConversationModal'));
        modal.show();
    }

    async loadContactsAndPlans() {
        try {
            // Load contacts (coaches or clients based on user role)
            const userRole = authManager.getUserRole();
            let contactsEndpoint = '';
            
            if (userRole === 'client') {
                contactsEndpoint = '/plan-management/api/v1/product-plans/'; // Get coaches through plans
            } else if (userRole === 'coach') {
                contactsEndpoint = '/plan-management/api/v1/plan-subscriptions/'; // Get clients through subscriptions
            }

            const contactsResponse = await api.get(contactsEndpoint);
            if (contactsResponse.ok) {
                const contactsData = await contactsResponse.json();
                this.renderContactOptions(contactsData.results || contactsData, userRole);
            }

            // Load user's plans
            const plansResponse = await api.get('/plan-management/api/v1/plan-subscriptions/');
            if (plansResponse.ok) {
                const plansData = await plansResponse.json();
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
            let contact = null;
            
            if (userRole === 'client' && item.coach) {
                contact = {
                    id: item.coach.user.id,
                    name: item.coach.user.full_name,
                    role: 'Coach'
                };
            } else if (userRole === 'coach' && item.client) {
                contact = {
                    id: item.client.id,
                    name: item.client.full_name,
                    role: 'Client'
                };
            }

            if (contact && !contacts.has(contact.id)) {
                contacts.set(contact.id, contact);
            }
        });

        contacts.forEach(contact => {
            const option = document.createElement('option');
            option.value = contact.id;
            option.textContent = `${contact.name} (${contact.role})`;
            select.appendChild(option);
        });
    }

    renderPlanOptions(plans) {
        const select = document.getElementById('planSelect');
        select.innerHTML = '<option value="">No specific plan</option>';

        plans.forEach(plan => {
            const option = document.createElement('option');
            option.value = plan.id;
            option.textContent = plan.product_plan.name;
            select.appendChild(option);
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

        try {
            const response = await api.post('/messaging/api/v1/conversations/start_conversation/', conversationData);
            
            if (response.ok) {
                const conversation = await response.json();
                
                utils.showToast('Conversation started successfully!', 'success');
                
                // Close modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('newConversationModal'));
                modal.hide();
                
                // Reset form
                e.target.reset();
                
                // Reload conversations and select the new one
                await this.loadConversations();
                this.selectConversation(conversation);
            } else {
                const errorData = await response.json();
                utils.showToast(errorData.error || 'Failed to start conversation', 'danger');
            }
        } catch (error) {
            utils.handleApiError(error, 'Failed to start conversation');
        }
    }

    async markConversationAsRead(conversationId) {
        try {
            await api.post(`/messaging/api/v1/conversations/${conversationId}/mark_read/`);
        } catch (error) {
            console.error('Failed to mark conversation as read:', error);
        }
    }

    async archiveConversation() {
        if (!this.currentConversation) return;

        try {
            const response = await api.post(`/messaging/api/v1/conversations/${this.currentConversation.id}/archive/`);
            
            if (response.ok) {
                utils.showToast('Conversation archived', 'success');
                await this.loadConversations();
                
                // Clear chat interface
                this.currentConversation = null;
                document.getElementById('welcomeScreen').style.display = 'block';
                document.getElementById('chatHeader').style.display = 'none';
                document.getElementById('messagesContainer').style.display = 'none';
                document.getElementById('messageInput').style.display = 'none';
            } else {
                utils.handleApiError(response, 'Failed to archive conversation');
            }
        } catch (error) {
            utils.handleApiError(error, 'Failed to archive conversation');
        }
    }

    async muteConversation() {
        if (!this.currentConversation) return;

        try {
            const response = await api.post(`/messaging/api/v1/conversations/${this.currentConversation.id}/mute/`);
            
            if (response.ok) {
                utils.showToast('Conversation muted', 'success');
            } else {
                utils.handleApiError(response, 'Failed to mute conversation');
            }
        } catch (error) {
            utils.handleApiError(error, 'Failed to mute conversation');
        }
    }

    viewRelatedPlan() {
        if (this.currentConversation?.plan_subscription) {
            window.location.href = `/plan-management/subscription/${this.currentConversation.plan_subscription.id}/`;
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
            const response = await api.patch(`/messaging/api/v1/messages/${this.selectedMessage.id}/`, {
                content: content
            });
            
            if (response.ok) {
                utils.showToast('Message updated', 'success');
                
                // Close modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('editMessageModal'));
                modal.hide();
                
                // Reload messages
                await this.loadMessages(this.currentConversation.id);
            } else {
                utils.handleApiError(response, 'Failed to update message');
            }
        } catch (error) {
            utils.handleApiError(error, 'Failed to update message');
        }
    }

    async deleteMessage(messageId) {
        if (!confirm('Are you sure you want to delete this message?')) return;

        try {
            const response = await api.delete(`/messaging/api/v1/messages/${messageId}/`);
            
            if (response.ok) {
                utils.showToast('Message deleted', 'success');
                await this.loadMessages(this.currentConversation.id);
            } else {
                utils.handleApiError(response, 'Failed to delete message');
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
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new MessagingManager();
});
