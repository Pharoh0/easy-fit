document.addEventListener('DOMContentLoaded', function () {
    const apiUrl = '/plan-management/api/v1/product-plans/';
    const container = document.getElementById('plans-container');

    // Load Product Plans
    async function loadPlans() {
        try {
            const response = await fetch(apiUrl, {
                headers: {
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${getAccessToken()}`,
                },
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const data = await response.json();
            container.innerHTML = '';
            data.forEach(plan => {
                const div = document.createElement('div');
                div.className = 'plan-item';
                div.innerHTML = `
                    <h3>${plan.name}</h3>
                    <p>${plan.description}</p>
                    <p><strong>Plan Type:</strong> ${plan.plan_type}</p>
                    <p><strong>Price:</strong> $${plan.price}</p>
                    <p><strong>Sessions:</strong> ${plan.session_count}</p>
                    <p><strong>Price per Session:</strong> $${plan.price_per_session}</p>
                    <p><strong>Start Date:</strong> ${plan.start_date}</p>
                    <p><strong>End Date:</strong> ${plan.end_date}</p>
                `;
                container.appendChild(div);
            });
        } catch (error) {
            console.error('Error fetching product plans:', error);
        }
    }

    function getAccessToken() {
        return localStorage.getItem('access_token');
    }

    loadPlans();  // Call function to load plans when the page loads
});
