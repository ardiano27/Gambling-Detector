# Gambling Detector

Chrome Manifest V3 extension for detecting gambling-related content on pages.

## Features

- Scans page text with built-in gambling keywords.
- Shows a warning banner on medium or high-risk pages.
- Highlights matched terms on the page.
- Popup shows risk score, match count, and top matched terms.
- Options page controls detector status, sensitivity, highlighting, and custom keywords.

## Load in Chrome

1. Open `chrome://extensions`.
2. Enable `Developer mode`.
3. Click `Load unpacked`.
4. Choose this folder: `D:\Gambling-Detector`.
5. Open any page and click the extension icon to see the result.

## Develop in VS Code

- Edit `manifest.json` for extension configuration.
- Edit `src/content.js` for page scanning and highlighting.
- Edit `src/popup.html`, `src/popup.js`, and `styles/popup.css` for popup UI.
- Edit `src/options.html`, `src/options.js`, and `styles/options.css` for settings UI.
- Run the VS Code task `Validate manifest` to check that `manifest.json` is valid JSON.

After code changes, open `chrome://extensions` and click the reload icon on the extension card.
