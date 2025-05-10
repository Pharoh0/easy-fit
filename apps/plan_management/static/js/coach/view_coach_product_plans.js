document.addEventListener('DOMContentLoaded', function () {
    const apiUrl = `/plan-management/api/v1/product-plans/?coach_profile_id=${profileId}`;  // Use the profileId passed from the template
    const container = document.getElementById('plans-container');

    // Load Product Plans
    async function loadPlans() {
        try {
            const response = await fetch(apiUrl, {
                headers: {
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${getAccessToken()}`,  // Ensure access token is available if required
                },
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const data = await response.json();
            container.innerHTML = '';  // Clear the container before appending new plans

            if (data.length > 0) {
                data.forEach(plan => {
                    const div = document.createElement('div');
                    div.className = 'col-md-4 mb-4';
                    div.innerHTML = `
                        <div class="card h-100">
                            <div class="card-body">
                                <h5 class="card-title">${plan.name}</h5>
                                <p class="card-text">${plan.description}</p>
                                <p><strong>Plan Type:</strong> ${plan.plan_type}</p>
                                <p><strong>Price:</strong> $${plan.price}</p>
                                <p><strong>Sessions:</strong> ${plan.session_count}</p>
                                <p><strong>Price per Session:</strong> $${plan.price_per_session}</p>
                                <p><strong>Start Date:</strong> ${plan.start_date}</p>
                                <p><strong>End Date:</strong> ${plan.end_date}</p>
                            </div>
                        </div>
                    `;
                    container.appendChild(div);
                });
            } else {
                container.innerHTML = '<p>No available plans found.</p>';  // Show a message if no plans are available
            }

        } catch (error) {
            console.error('Error fetching product plans:', error);
            container.innerHTML = '<p>Error loading available plans.</p>';
        }
    }

    function getAccessToken() {
        return localStorage.getItem('access_token');
    }

    loadPlans();  // Call function to load plans when the page loads
});