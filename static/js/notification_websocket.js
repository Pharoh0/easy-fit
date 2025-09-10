/**
 * Notification WebSocket Handler
 * Manages real-time notifications using WebSockets
 */
class NotificationWebSocket {
    constructor() {
        this.socket = null;
        this.connected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 3000; // 3 seconds
        this.listeners = {
            'notification': [],
            'unread_count': [],
            'error': [],
            'connected': [],
            'disconnected': []
        };
        
        // Bind methods
        this.connect = this.connect.bind(this);
        this.disconnect = this.disconnect.bind(this);
        this.reconnect = this.reconnect.bind(this);
        this.handleMessage = this.handleMessage.bind(this);
        this.markAsRead = this.markAsRead.bind(this);
        this.markAllAsRead = this.markAllAsRead.bind(this);
        this.getUnreadCount = this.getUnreadCount.bind(this);
        
        // Auto-connect if user is authenticated
        if (this.isAuthenticated()) {
            this.connect();
        }
    }
    
    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        return !!APIBase.getJWTToken();
    }
    
    /**
     * Refresh connection with new token
     * Call this after token refresh to ensure WebSocket stays authenticated
     */
    refreshConnection() {
        if (this.connected) {
            console.log('Refreshing WebSocket connection with new token');
            this.disconnect();
            setTimeout(() => this.connect(), 500); // Short delay before reconnecting
        }
    }
    
    /**
     * Connect to the WebSocket server
     */
    connect() {
        if (this.socket) {
            this.disconnect();
        }
        
        // Only connect if authenticated
        if (!this.isAuthenticated()) {
            console.warn('Cannot connect to notification WebSocket: User not authenticated');
            return;
        }
        
        try {
            // Determine WebSocket protocol (ws:// or wss://)
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const host = window.location.host;
            
            // Get JWT token for authentication
            const token = APIBase.getJWTToken();
            if (!token) {
                console.error('No JWT token available for WebSocket authentication');
                return;
            }
            
            // Add token to URL as query parameter
            const url = `${protocol}//${host}/ws/notifications/?token=${encodeURIComponent(token)}`;
            
            this.socket = new WebSocket(url);
            
            // Set up event handlers
            this.socket.onopen = () => {
                console.log('Notification WebSocket connected');
                this.connected = true;
                this.reconnectAttempts = 0;
                this.notifyListeners('connected');
            };
            
            this.socket.onmessage = (event) => {
                this.handleMessage(event);
            };
            
            this.socket.onclose = (event) => {
                this.connected = false;
                console.log(`Notification WebSocket closed: ${event.code} ${event.reason}`);
                this.notifyListeners('disconnected');
                
                // Attempt to reconnect if not a normal closure
                if (event.code !== 1000) {
                    this.reconnect();
                }
            };
            
            this.socket.onerror = (error) => {
                console.error('Notification WebSocket error:', error);
                this.notifyListeners('error', { message: 'WebSocket connection error' });
            };
        } catch (error) {
            console.error('Error creating WebSocket connection:', error);
        }
    }
    
    /**
     * Disconnect from the WebSocket server
     */
    disconnect() {
        if (this.socket) {
            this.socket.close();
            this.socket = null;
            this.connected = false;
        }
    }
    
    /**
     * Attempt to reconnect to the WebSocket server
     */
    reconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.warn('Max reconnect attempts reached');
            return;
        }
        
        this.reconnectAttempts++;
        console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
        
        setTimeout(() => {
            if (!this.connected) {
                this.connect();
            }
        }, this.reconnectDelay * this.reconnectAttempts);
    }
    
    /**
     * Handle incoming WebSocket messages
     */
    handleMessage(event) {
        try {
            const data = JSON.parse(event.data);
            const messageType = data.type;
            
            // Notify appropriate listeners
            this.notifyListeners(messageType, data);
            
            // Handle specific message types
            if (messageType === 'notification') {
                // Show toast notification
                if (window.utils && typeof window.utils.showToast === 'function') {
                    const notification = data.notification;
                    const title = notification.subject || notification.notification_type.replace(/_/g, ' ');
                    utils.showToast(title, 'info');
                }
            }
        } catch (error) {
            console.error('Error handling WebSocket message:', error);
        }
    }
    
    /**
     * Send a message to the WebSocket server
     */
    sendMessage(message) {
        if (this.connected && this.socket) {
            this.socket.send(JSON.stringify(message));
        } else {
            console.warn('Cannot send message: WebSocket not connected');
        }
    }
    
    /**
     * Mark a notification as read
     */
    markAsRead(notificationId) {
        this.sendMessage({
            type: 'mark_read',
            id: notificationId
        });
    }
    
    /**
     * Mark all notifications as read
     */
    markAllAsRead() {
        this.sendMessage({
            type: 'mark_all_read'
        });
    }
    
    /**
     * Request unread notification count
     */
    getUnreadCount() {
        this.sendMessage({
            type: 'get_unread_count'
        });
    }
    
    /**
     * Add event listener
     */
    addEventListener(event, callback) {
        if (this.listeners[event]) {
            this.listeners[event].push(callback);
        }
    }
    
    /**
     * Remove event listener
     */
    removeEventListener(event, callback) {
        if (this.listeners[event]) {
            this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
        }
    }
    
    /**
     * Notify all listeners of an event
     */
    notifyListeners(event, data) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in ${event} listener:`, error);
                }
            });
        }
    }
}

// Create global instance
window.notificationWS = new NotificationWebSocket();
