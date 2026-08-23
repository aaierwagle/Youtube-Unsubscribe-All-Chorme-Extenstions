# YouTube Unsubscribe All — Chrome Extension

Unsubscribe from all your YouTube channels with a single click.

---

## Features

- One-click unsubscribe from every subscribed channel
- Live counter showing how many channels have been unsubscribed
- Stop button to pause at any time
- Auto-scrolls to load all channels before processing
- Uses MutationObserver for reliable dialog detection

---

## Installation

1. **Download** the `youtube-unsubscribe-all.zip` file
2. **Extract** the zip to a folder on your computer
3. Open Chrome and go to `chrome://extensions`
4. Enable **Developer mode** (toggle in the top-right corner)
5. Click **Load unpacked**
6. Select the extracted folder (the one containing `manifest.json`)
7. The extension icon will appear in your Chrome toolbar

---

## How to Use

1. Open [YouTube](https://www.youtube.com) in Chrome
2. Click the extension icon in the toolbar
3. Click **▶ Start Unsubscribing**
4. The extension will automatically navigate to your subscriptions page and begin unsubscribing one by one
5. Watch the counter go up as each channel is removed
6. Click **⏹ Stop** at any time to pause

---

## Warning

> This action is **permanent and cannot be undone.**
> All your YouTube channel subscriptions will be removed.
> Make sure you want to do this before clicking Start.

---

## File Structure

```
youtube-unsubscribe-all/
├── manifest.json      # Extension configuration (Manifest V3)
├── popup.html         # Extension popup UI
├── popup.js           # Popup logic & messaging
├── content.js         # Content script that runs on YouTube
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

---

## How It Works

1. The popup injects `content.js` into the active YouTube tab
2. The content script finds all "Subscribed" buttons on the page
3. It clicks each button to open YouTube's confirmation dialog
4. A `MutationObserver` detects the dialog the instant it appears in the DOM
5. It clicks the **Unsubscribe** confirm button inside the dialog
6. The process repeats, scrolling down to load more channels as needed

---

## Updating the Extension

If you download a new version:

1. Extract the new zip to the same folder (overwrite files)
2. Go to `chrome://extensions`
3. Click the **↻ refresh icon** on the extension card

---

## Troubleshooting

| Problem | Solution |
|---|---|
| Extension won't load | Make sure you selected the folder containing `manifest.json` directly |
| Nothing happens when clicking Start | Make sure you're on youtube.com |
| Stops before finishing | Click Start again — it will continue from where it left off |
| Dialog not being confirmed | Refresh the YouTube page and try again |

---

## Tech Stack

- Manifest V3
- Chrome Extensions API (`scripting`, `tabs`, `activeTab`)
- Vanilla JavaScript
- MutationObserver for reliable DOM detection

---

*Built as a clone of the original [YouTube Unsubscribe All](https://chromewebstore.google.com/detail/youtube-unsubscribe-all/bbpkghgmcjojbljplcdehdbkgphhpemo) Chrome extension.*
