// Coach Profile Specific JavaScript
console.log("Coach Profile Page Loaded");

document.addEventListener('DOMContentLoaded', function() {
    // Get all gallery images and modal elements
    const galleryImages = document.querySelectorAll('.gallery-img');
    const modalImage = document.getElementById('modalImage');
    const imageModal = new bootstrap.Modal(document.getElementById('imageModal'));

    // Add click event listener to each gallery image
    galleryImages.forEach(image => {
        image.addEventListener('click', function() {
            const imageUrl = this.getAttribute('data-img-url') || this.src;
            console.log('Clicked image URL:', imageUrl);
            if (modalImage) {
                modalImage.src = imageUrl;
                console.log('Setting modal image src to:', imageUrl);
                imageModal.show();
            } else {
                console.error('Modal image element not found');
            }
        });
    });
});