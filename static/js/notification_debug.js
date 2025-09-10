/**
 * Notification Debug Helper
 * Add this to any page to debug notification issues
 */

console.log("Notification Debug Helper loaded");

// Check if WebSocket object exists
if (window.notificationWS) {
    console.log("NotificationWS object found:", window.notificationWS);
    console.log("WebSocket connected:", window.notificationWS.connected);
    
    // Add event listeners for debugging
    window.notificationWS.addEventListener('connected', () => {
        console.log("✅ WebSocket connected event received");
        document.body.classList.add('ws-connected');
    });
    
    window.notificationWS.addEventListener('disconnected', () => {
        console.log("❌ WebSocket disconnected event received");
        document.body.classList.remove('ws-connected');
    });
    
    window.notificationWS.addEventListener('error', (data) => {
        console.error("WebSocket error:", data);
    });
    
    window.notificationWS.addEventListener('notification', (data) => {
        console.log("📬 New notification received:", data);
        // Show toast notification
        if (window.utils && typeof window.utils.showToast === 'function') {
            const notification = data.notification;
            const title = notification.subject || notification.notification_type.replace(/_/g, ' ');
            utils.showToast(`New notification: ${title}`, 'info');
        }
    });
    
    window.notificationWS.addEventListener('unread_count', (data) => {
        console.log("📊 Unread count received:", data);
    });
    
    // Force reconnect if not connected
    if (!window.notificationWS.connected) {
        console.log("Attempting to connect WebSocket...");
        window.notificationWS.connect();
    }
} else {
    console.error("NotificationWS object not found!");
}

// Check JWT token
const token = localStorage.getItem('access_token');
if (token) {
    console.log("JWT token found:", token.substring(0, 15) + "...");
    
    // Parse token to check expiration
    try {
        const tokenParts = token.split('.');
        if (tokenParts.length === 3) {
            const payload = JSON.parse(atob(tokenParts[1]));
            console.log("Token payload:", payload);
            
            // Check expiration
            if (payload.exp) {
                const expDate = new Date(payload.exp * 1000);
                const now = new Date();
                console.log("Token expires:", expDate);
                console.log("Token valid:", expDate > now ? "✅ Yes" : "❌ No");
            }
        }
    } catch (e) {
        console.error("Error parsing token:", e);
    }
} else {
    console.error("JWT token not found!");
}

// Create a debug panel
function createDebugPanel() {
    const panel = document.createElement('div');
    panel.style.position = 'fixed';
    panel.style.bottom = '10px';
    panel.style.right = '10px';
    panel.style.backgroundColor = 'rgba(0,0,0,0.8)';
    panel.style.color = 'white';
    panel.style.padding = '10px';
    panel.style.borderRadius = '5px';
    panel.style.zIndex = '9999';
    panel.style.fontSize = '12px';
    panel.style.fontFamily = 'monospace';
    panel.style.maxWidth = '300px';
    panel.style.maxHeight = '200px';
    panel.style.overflow = 'auto';
    
    panel.innerHTML = `
        <div><strong>Notification Debug</strong></div>
        <div>WebSocket: <span id="ws-status">Checking...</span></div>
        <div>JWT: <span id="jwt-status">Checking...</span></div>
        <div>Notifications: <span id="notif-count">-</span></div>
        <div>
            <button id="test-ws">Test WS</button>
            <button id="create-test-notif">Create Test</button>
        </div>
    `;
    
    document.body.appendChild(panel);
    
    // Update status
    const wsStatus = document.getElementById('ws-status');
    const jwtStatus = document.getElementById('jwt-status');
    const notifCount = document.getElementById('notif-count');
    
    function updateStatus() {
        if (window.notificationWS) {
            wsStatus.textContent = window.notificationWS.connected ? '✅ Connected' : '❌ Disconnected';
            wsStatus.style.color = window.notificationWS.connected ? 'lightgreen' : 'salmon';
        } else {
            wsStatus.textContent = '❌ Not found';
            wsStatus.style.color = 'salmon';
        }
        
        const token = localStorage.getItem('access_token');
        if (token) {
            jwtStatus.textContent = '✅ Found';
            jwtStatus.style.color = 'lightgreen';
        } else {
            jwtStatus.textContent = '❌ Not found';
            jwtStatus.style.color = 'salmon';
        }
    }
    
    // Update notification count
    async function updateNotifCount() {
        try {
            const res = await NotificationsAPI.unreadCount();
            if (res && res.success && res.data) {
                notifCount.textContent = res.data.unread_count;
            } else if (res && res.unread_count != null) {
                notifCount.textContent = res.unread_count;
            } else {
                notifCount.textContent = 'Error';
            }
        } catch (e) {
            notifCount.textContent = 'Error';
            console.error('Error getting unread count:', e);
        }
    }
    
    // Initial update
    updateStatus();
    updateNotifCount();
    
    // Set up button handlers
    document.getElementById('test-ws').addEventListener('click', () => {
        if (window.notificationWS) {
            window.notificationWS.getUnreadCount();
            console.log('Sent unread count request via WebSocket');
        }
        updateStatus();
    });
    
    document.getElementById('create-test-notif').addEventListener('click', async () => {
        try {
            // Create a test notification via Django admin
            const res = await fetch('/plan-management/api/v1/notifications/test-notification/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                }
            });
            
            if (res.ok) {
                console.log('Test notification created');
                utils.showToast('Test notification created', 'success');
                updateNotifCount();
            } else {
                console.error('Error creating test notification:', await res.text());
                utils.showToast('Error creating test notification', 'danger');
            }
        } catch (e) {
            console.error('Error creating test notification:', e);
            utils.showToast('Error creating test notification', 'danger');
        }
    });
    
    // Update status every 5 seconds
    setInterval(updateStatus, 5000);
    setInterval(updateNotifCount, 5000);
}

// Create debug panel after page load
window.addEventListener('DOMContentLoaded', () => {
    setTimeout(createDebugPanel, 1000);
});
