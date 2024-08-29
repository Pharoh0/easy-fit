document.addEventListener('DOMContentLoaded', function() {
    const countrySelect = document.getElementById('id_country');
    const regionSelect = document.getElementById('id_region');
    const citySelect = document.getElementById('id_city');

    // Base URL for API calls
    const baseUrl = 'http://127.0.0.1:8001/profiles/api/v1'; // Adjust this based on your environment

    // Get the access token from local storage
    const accessToken = localStorage.getItem('access_token');

    // Fetch regions based on country selection
    countrySelect.addEventListener('change', function() {
        const countryId = countrySelect.value;
        if (countryId) {
            fetch(`${baseUrl}/regions/?country_id=${countryId}`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,  // Include the access token in the header
                    'Accept': 'application/json',
                }
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                regionSelect.innerHTML = '<option value="">Select Region</option>';
                data.forEach(region => {
                    const option = document.createElement('option');
                    option.value = region.id;
                    option.textContent = region.name;
                    regionSelect.appendChild(option);
                });
                regionSelect.disabled = false;
                citySelect.innerHTML = '<option value="">Select City</option>';
                citySelect.disabled = true;
            })
            .catch(error => {
                console.error('Error fetching regions:', error);
            });
        } else {
            regionSelect.innerHTML = '<option value="">Select Region</option>';
            regionSelect.disabled = true;
            citySelect.innerHTML = '<option value="">Select City</option>';
            citySelect.disabled = true;
        }
    });

    // Fetch cities based on region selection
    regionSelect.addEventListener('change', function() {
        const regionId = regionSelect.value;
        if (regionId) {
            fetch(`${baseUrl}/cities/?region_id=${regionId}`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,  // Include the access token in the header
                    'Accept': 'application/json',
                }
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                citySelect.innerHTML = '<option value="">Select City</option>';
                data.forEach(city => {
                    const option = document.createElement('option');
                    option.value = city.id;
                    option.textContent = city.name;
                    citySelect.appendChild(option);
                });
                citySelect.disabled = false;
            })
            .catch(error => {
                console.error('Error fetching cities:', error);
            });
        } else {
            citySelect.innerHTML = '<option value="">Select City</option>';
            citySelect.disabled = true;
        }
    });
});
