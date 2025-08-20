# Vendor Assets Documentation

This directory contains all locally hosted third-party libraries and assets, replacing CDN dependencies for offline functionality.

## Directory Structure

```
vendor/
├── bootstrap/
│   ├── css/
│   │   └── bootstrap.min.css
│   └── js/
│       └── bootstrap.bundle.min.js
├── bootstrap-icons/
│   ├── bootstrap-icons.css
│   └── bootstrap-icons.woff2
├── chartjs/
│   └── chart.min.js
├── fontawesome/
│   ├── css/
│   │   └── all.min.css
│   └── webfonts/
│       ├── fa-brands-400.woff2
│       ├── fa-regular-400.woff2
│       └── fa-solid-900.woff2
├── popper/
│   └── popper.min.js
└── tippy/
    ├── scale.css
    └── tippy-bundle.umd.min.js
```

## Library Versions

- **Bootstrap**: 5.3.0-alpha1
- **Bootstrap Icons**: Latest from CDN
- **Font Awesome**: 6.0.0
- **Chart.js**: Latest from CDN
- **Popper.js**: 2.x
- **Tippy.js**: 6.x

## Usage in Templates

All templates now reference local assets using Django's `{% static %}` template tag:

```html
<!-- CSS -->
<link href="{% static 'vendor/bootstrap/css/bootstrap.min.css' %}" rel="stylesheet">
<link href="{% static 'vendor/bootstrap-icons/bootstrap-icons.css' %}" rel="stylesheet">
<link rel="stylesheet" href="{% static 'vendor/fontawesome/css/all.min.css' %}">
<link rel="stylesheet" href="{% static 'vendor/tippy/scale.css' %}">

<!-- JavaScript -->
<script src="{% static 'vendor/bootstrap/js/bootstrap.bundle.min.js' %}"></script>
<script src="{% static 'vendor/chartjs/chart.min.js' %}"></script>
<script src="{% static 'vendor/popper/popper.min.js' %}"></script>
<script src="{% static 'vendor/tippy/tippy-bundle.umd.min.js' %}"></script>
```

## Avatar Service Replacement

The external ui-avatars.com service has been replaced with a local JavaScript function `generateLocalAvatar()` in `static/js/navbar.js` that creates canvas-based avatars using user initials and consistent color schemes.

## Maintenance

To update any library:
1. Download the new version to the appropriate directory
2. Update version information in this README
3. Test all pages that use the library
4. Commit changes with clear version update message

## Benefits

- **Offline functionality**: Application works without internet connection
- **Performance**: Faster loading times, no external requests
- **Reliability**: No dependency on external CDN availability
- **Privacy**: No external requests that could track users
- **Security**: Full control over asset integrity
