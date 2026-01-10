# Venturi Website

Official website for the Venturi aircraft maintenance app.

## Overview

This is a simple, static website designed to support the Venturi iPad app's App Store submission. It provides:

- Product information and features
- Support documentation
- Privacy Policy
- Terms of Service

## Structure

```
Venturi_website/
├── index.html          # Main landing page
├── support.html        # Support & FAQ page
├── privacy.html        # Privacy Policy
├── terms.html          # Terms of Service
├── styles.css          # All styling
└── README.md          # This file
```

## Local Development

To view the website locally:

1. Open `index.html` in your web browser
2. Or use a simple HTTP server:
   ```bash
   python3 -m http.server 8000
   ```
   Then visit `http://localhost:8000`

## Deployment

### Option 1: GitHub Pages
1. Create a new repository on GitHub
2. Push this folder to the repository
3. Enable GitHub Pages in repository settings
4. Your site will be available at `https://yourusername.github.io/repository-name`

### Option 2: Netlify
1. Create an account at netlify.com
2. Drag and drop this folder onto Netlify
3. Your site will be live instantly with a custom URL
4. You can connect a custom domain if desired

### Option 3: Vercel
1. Create an account at vercel.com
2. Import this folder as a new project
3. Deploy with one click

## Design

The website matches the Venturi app's design system:
- **Navy Blue** (#1A2332) for primary branding
- **Accent Blue** (#0066CC) for CTAs and highlights
- **Clean, modern aesthetic** matching the iPad app
- **Responsive design** works on mobile and desktop

## For App Store Submission

Apple requires:
- ✅ Support URL (support.html)
- ✅ Privacy Policy URL (privacy.html)
- ✅ Marketing URL (index.html)

All three are included and ready to use.

## Customization

Before deploying:
1. Update email addresses (currently placeholder: support@venturiaviation.com)
2. Add App Store download link when available
3. Replace screenshot placeholders with actual app screenshots
4. Consider adding your own domain name

## Screenshots

To add actual screenshots:
1. Take screenshots of your app (ideally 2048x2732 for iPad)
2. Save them in an `images/` folder
3. Update the screenshot placeholders in `index.html`:
   ```html
   <img src="images/dashboard.png" alt="Dashboard">
   ```

## License

© 2025 Venturi Aviation. All rights reserved.
