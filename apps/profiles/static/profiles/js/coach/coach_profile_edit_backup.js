// document.getElementById('profile-form').addEventListener('submit', function(event) {
//     event.preventDefault();

//     const form = event.target;
//     const formData = new FormData(form);
//     const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;
//     const url = form.getAttribute('data-url');  // Get the correct URL from the data attribute

//     // Check if a new avatar file has been selected
//     const avatarInput = form.querySelector('input[name="avatar"]');
//     if (avatarInput && avatarInput.files.length === 0) {
//         formData.delete('avatar');  // Remove the avatar field from formData if no new file is selected
//     }

//     // Get the access token from local storage
//     const accessToken = localStorage.getItem('access_token');

//     fetch(url, {
//         method: 'PATCH',  // Use PATCH for partial updates
//         body: formData,
//         headers: {
//             'X-CSRFToken': csrfToken,
//             'Accept': 'application/json',
//             'Authorization': `Bearer ${accessToken}`,  // Include the access token in the header
//         }
//     })
//     .then(response => {
//         if (response.ok) {
//             return response.json();  // Parse JSON if response is OK
//         } else {
//             return response.json().then(data => {
//                 // Handle validation errors
//                 throw data;
//             });
//         }
//     })
//     .then(data => {
//         alert("Profile updated successfully!");
//         window.location.reload();  // Optionally reload the page or update the DOM
//     })
//     .catch(errorData => {
//         if (errorData.errors) {
//             // Clear any previous error messages
//             document.querySelectorAll('.error-message').forEach(el => el.remove());

//             // Loop through each error and display it
//             for (let field in errorData.errors) {
//                 const fieldElement = document.querySelector(`[name=${field}]`);
//                 if (fieldElement) {
//                     const errorElement = document.createElement('div');
//                     errorElement.className = 'error-message';
//                     errorElement.style.color = 'red';
//                     errorElement.textContent = errorData.errors[field];
//                     fieldElement.parentNode.insertBefore(errorElement, fieldElement.nextSibling);
//                 }
//             }
//         } else {
//             console.error('Unexpected error:', errorData);
//             document.getElementById('error-messages').innerHTML = `<p>An unexpected error occurred. Please try again.</p>`;
//         }
//     });
// });

document.getElementById('profile-form').addEventListener('submit', function(event) {
    event.preventDefault();

    const form = event.target;
    const formData = new FormData(form);
    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;
    const url = form.getAttribute('data-url');  // Get the correct URL from the data attribute

    // Check if a new avatar file has been selected
    const avatarInput = form.querySelector('input[name="avatar"]');
    if (avatarInput && avatarInput.files.length === 0) {
        formData.delete('avatar');  // Remove the avatar field from formData if no new file is selected
    }

    // Get the access token from local storage
    const accessToken = localStorage.getItem('access_token');

    fetch(url, {
        method: 'PATCH',  // Use PATCH for partial updates
        body: formData,
        headers: {
            'X-CSRFToken': csrfToken,
            'Accept': 'application/json',
            'Authorization': `Bearer ${accessToken}`,  // Include the access token in the header
        }
    })
    .then(response => {
        if (response.ok) {
            return response.json();  // Parse JSON if response is OK
        } else {
            return response.json().then(data => {
                // Handle validation errors
                throw data;
            });
        }
    })
    .then(data => {
        // Display a success message using Bootstrap alerts
        const successMessage = `
            <div class="alert alert-success alert-dismissible fade show" role="alert">
                Profile updated successfully!
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>`;
        document.getElementById('messages').innerHTML = successMessage;
        
        // Optionally reload the page or update the DOM
        setTimeout(() => {
            window.location.reload();
        }, 2000);
    })
    .catch(errorData => {
        // Clear any previous error messages
        document.querySelectorAll('.error-message').forEach(el => el.remove());

        // Display form validation errors using Bootstrap alert-danger classes
        if (errorData.errors) {
            for (let field in errorData.errors) {
                const fieldElement = document.querySelector(`[name=${field}]`);
                if (fieldElement) {
                    const errorElement = document.createElement('div');
                    errorElement.className = 'error-message text-danger mt-2';
                    errorElement.textContent = errorData.errors[field];
                    fieldElement.classList.add('is-invalid');  // Add Bootstrap 'is-invalid' class for styling
                    fieldElement.parentNode.insertBefore(errorElement, fieldElement.nextSibling);
                }
            }
        } else {
            // Display a general error message if there's no field-specific errors
            const errorMessage = `
                <div class="alert alert-danger alert-dismissible fade show" role="alert">
                    An unexpected error occurred. Please try again.
                    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                </div>`;
            document.getElementById('messages').innerHTML = errorMessage;
        }
    });
});
