/**
 * Test script for Coach Analytics API
 * This script tests the Coach Analytics API with the new APIBase utility
 */

document.addEventListener('DOMContentLoaded', function() {
    // Create test container
    const testContainer = document.createElement('div');
    testContainer.id = 'analytics-test-container';
    testContainer.className = 'container mt-4 p-4 border rounded';
    testContainer.innerHTML = `
        <h2>Coach Analytics API Test</h2>
        <div class="mb-3">
            <button id="test-analytics-btn" class="btn btn-primary">Test Analytics API</button>
        </div>
        <div id="test-results" class="mt-3">
            <div class="alert alert-info">Click the button to test the Coach Analytics API</div>
        </div>
    `;
    
    // Add to body if not in an iframe
    if (window.self === window.top) {
        document.body.appendChild(testContainer);
    }
    
    // Add event listener to test button
    const testButton = document.getElementById('test-analytics-btn');
    if (testButton) {
        testButton.addEventListener('click', async function() {
            const resultsContainer = document.getElementById('test-results');
            
            // Show loading
            resultsContainer.innerHTML = `
                <div class="text-center py-4">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <p class="mt-2">Testing API...</p>
                </div>
            `;
            
            try {
                // Test the API
                console.log('Testing Coach Analytics API...');
                const result = await CoachAnalyticsAPI.getPlanAnalytics();
                console.log('API Response:', result);
                
                // Display results
                if (result.success) {
                    resultsContainer.innerHTML = `
                        <div class="alert alert-success">
                            <h4 class="alert-heading">API Test Successful!</h4>
                            <p>The Coach Analytics API is working correctly with JWT authentication.</p>
                            <hr>
                            <pre class="mb-0">${JSON.stringify(result.analytics, null, 2)}</pre>
                        </div>
                    `;
                } else {
                    resultsContainer.innerHTML = `
                        <div class="alert alert-danger">
                            <h4 class="alert-heading">API Test Failed</h4>
                            <p>Error: ${result.error}</p>
                        </div>
                    `;
                }
            } catch (error) {
                console.error('Test error:', error);
                resultsContainer.innerHTML = `
                    <div class="alert alert-danger">
                        <h4 class="alert-heading">Test Error</h4>
                        <p>${error.message}</p>
                    </div>
                `;
            }
        });
    }
});
