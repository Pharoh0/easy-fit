document.getElementById('profile-form').addEventListener('submit', function(event) {
    event.preventDefault();

    const form = event.target;
    const formData = new FormData(form);
    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;
    const url = form.getAttribute('data-url');

    const accessToken = localStorage.getItem('access_token');

    fetch(url, {
        method: 'PATCH',
        body: formData,
        headers: {
            'X-CSRFToken': csrfToken,
            'Accept': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
        }
    })
    .then(response => {
        if (response.ok) {
            return response.json();
        } else {
            return response.json().then(data => {
                throw data;
            });
        }
    })
    .then(data => {
        // Show success message at the bottom of the form
        document.getElementById('messages').innerHTML = `<div class="alert alert-success">Profile updated successfully!</div>`;
        // Hide the message after 5 seconds
        setTimeout(() => {
            document.getElementById('messages').innerHTML = '';
        }, 5000);
    })
    .catch(errorData => {
        if (errorData.errors) {
            // Clear any previous error messages
            document.querySelectorAll('.error-message').forEach(el => el.remove());

            // Display validation errors next to the fields
            errorData.errors.forEach(error => {
                const field = document.querySelector(`[name=${error.attr}]`);
                if (field) {
                    const errorElement = document.createElement('div');
                    errorElement.className = 'error-message text-danger';
                    errorElement.textContent = error.detail;
                    field.parentNode.insertBefore(errorElement, field.nextSibling);
                }
            });

            // Hide the error messages after 5 seconds
            setTimeout(() => {
                document.querySelectorAll('.error-message').forEach(el => el.remove());
            }, 5000);
        } else {
            document.getElementById('messages').innerHTML = `<div class="alert alert-danger">An unexpected error occurred. Please try again.</div>`;
            // Hide the error message after 5 seconds
            setTimeout(() => {
                document.getElementById('messages').innerHTML = '';
            }, 5000);
        }
    });
});