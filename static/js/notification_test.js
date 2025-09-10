/**
 * Notification Test Script
 * This script helps test the notification system by creating test notifications
 * and verifying WebSocket connections.
 */

class NotificationTester {
    constructor() {
        this.connected = false;
        this.testResults = [];
        
        // Bind methods
        this.runTests = this.runTests.bind(this);
        this.testWebSocketConnection = this.testWebSocketConnection.bind(this);
        this.testNotificationCount = this.testNotificationCount.bind(this);
        this.logResult = this.logResult.bind(this);
        this.displayResults = this.displayResults.bind(this);
    }
    
    /**
     * Run all tests
     */
    async runTests() {
        console.log('Starting notification tests...');
        this.testResults = [];
        
        // Test WebSocket connection
        await this.testWebSocketConnection();
        
        // Test notification count
        await this.testNotificationCount();
        
        // Display results
        this.displayResults();
    }
    
    /**
     * Test WebSocket connection
     */
    async testWebSocketConnection() {
        try {
            if (!window.notificationWS) {
                this.logResult('WebSocket Object', false, 'NotificationWebSocket object not found');
                return;
            }
            
            // Check if WebSocket is connected
            if (window.notificationWS.connected) {
                this.logResult('WebSocket Connection', true, 'WebSocket is connected');
            } else {
                // Try to connect
                window.notificationWS.connect();
                
                // Wait for connection
                await new Promise(resolve => {
                    const checkConnection = () => {
                        if (window.notificationWS.connected) {
                            this.logResult('WebSocket Connection', true, 'WebSocket connected successfully');
                            resolve();
                        } else {
                            setTimeout(checkConnection, 500);
                        }
                    };
                    
                    // Set timeout to prevent infinite loop
                    setTimeout(() => {
                        if (!window.notificationWS.connected) {
                            this.logResult('WebSocket Connection', false, 'Failed to connect WebSocket');
                            resolve();
                        }
                    }, 5000);
                    
                    checkConnection();
                });
            }
            
            // Check authentication
            const token = APIBase.getJWTToken();
            if (token) {
                this.logResult('JWT Authentication', true, 'JWT token is available');
            } else {
                this.logResult('JWT Authentication', false, 'No JWT token available');
            }
        } catch (error) {
            this.logResult('WebSocket Test', false, `Error: ${error.message}`);
        }
    }
    
    /**
     * Test notification count
     */
    async testNotificationCount() {
        try {
            // Test REST API
            const res = await NotificationsAPI.unreadCount();
            if (res && res.success) {
                const count = res.data.unread_count;
                this.logResult('REST API Unread Count', true, `Unread count: ${count}`);
            } else {
                this.logResult('REST API Unread Count', false, 'Failed to get unread count');
            }
            
            // Test WebSocket
            if (window.notificationWS && window.notificationWS.connected) {
                window.notificationWS.getUnreadCount();
                this.logResult('WebSocket Unread Count Request', true, 'Unread count request sent via WebSocket');
            } else {
                this.logResult('WebSocket Unread Count Request', false, 'WebSocket not connected');
            }
        } catch (error) {
            this.logResult('Notification Count Test', false, `Error: ${error.message}`);
        }
    }
    
    /**
     * Log test result
     */
    logResult(test, passed, message) {
        this.testResults.push({
            test,
            passed,
            message
        });
        
        console.log(`Test: ${test} - ${passed ? 'PASSED' : 'FAILED'} - ${message}`);
    }
    
    /**
     * Display test results
     */
    displayResults() {
        console.log('Test Results:');
        console.table(this.testResults);
        
        // Count passed and failed tests
        const passed = this.testResults.filter(result => result.passed).length;
        const failed = this.testResults.filter(result => !result.passed).length;
        
        console.log(`Tests: ${this.testResults.length}, Passed: ${passed}, Failed: ${failed}`);
        
        // Show toast with results
        if (window.utils && typeof window.utils.showToast === 'function') {
            utils.showToast(`Notification Tests: ${passed} passed, ${failed} failed`, failed > 0 ? 'warning' : 'success');
        }
    }
}

// Create global instance
window.notificationTester = new NotificationTester();

// Run tests if requested
if (window.location.hash === '#test-notifications') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => window.notificationTester.runTests(), 1000);
    });
}
