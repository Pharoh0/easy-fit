/**
 * Simple script to handle avatar image fallbacks
 */
document.addEventListener('DOMContentLoaded', function() {
    // Handle all images with data-fallback attribute
    const images = document.querySelectorAll('img[data-fallback]');
    images.forEach(img => {
        img.addEventListener('error', function() {
            const fallbackSrc = this.getAttribute('data-fallback');
            if (fallbackSrc) {
                this.src = fallbackSrc;
            }
        });
    });
});
