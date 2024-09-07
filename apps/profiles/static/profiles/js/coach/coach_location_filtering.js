document.addEventListener('DOMContentLoaded', function() {
    const countrySelect = document.getElementById('country');
    const regionSelect = document.getElementById('region');
    const citySelect = document.getElementById('city');

    // Dynamically construct the base URL
    const baseUrl = `${window.location.origin}/profiles/api/v1`;

    // Get the access token from local storage
    const accessToken = localStorage.getItem('access_token');

    if (countrySelect && regionSelect && citySelect) {
        // Fetch regions based on country selection
        countrySelect.addEventListener('change', function() {
            const countryId = countrySelect.value;
            if (countryId) {
                fetch(`${baseUrl}/regions/?country_id=${countryId}`, {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Accept': 'application/json'
                    }
                })
                .then(response => response.json())
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
                .catch(error => console.error('Error fetching regions:', error));
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
                        'Authorization': `Bearer ${accessToken}`,
                        'Accept': 'application/json'
                    }
                })
                .then(response => response.json())
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
                .catch(error => console.error('Error fetching cities:', error));
            } else {
                citySelect.innerHTML = '<option value="">Select City</option>';
                citySelect.disabled = true;
            }
        });
    } else {
        console.error('Country, Region, or City select element is missing.');
    }
});
