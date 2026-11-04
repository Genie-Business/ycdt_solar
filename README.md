# YCDT Solar website

Static company website for YCDT Solar (Hangzhou) and its Nigerian partner Green Solar System.
No build step: plain HTML, CSS and JavaScript. three.js loads from a CDN for the 3D module on the home page.

## Pages
- `index.html` home, with the 3D exploded solar module hero
- `solutions.html`, `projects.html`, `about.html`, `contact.html`

## Before going live
Fill in `SITE` at the top of `assets/js/site.js` (email, phone, WhatsApp, and `formEndpoint` for the enquiry form, e.g. a Formspree URL).

## Run locally
Open `index.html` in a browser, or serve the folder: `python -m http.server 5180`.
