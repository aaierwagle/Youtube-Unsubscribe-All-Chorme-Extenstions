(() => {
  let shouldStop = false;
  let unsubCount = 0;

  // Listen for messages from popup
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === 'start') {
      shouldStop = false;
      unsubCount = 0;
      startUnsubscribing();
    } else if (msg.action === 'stop') {
      shouldStop = true;
    }
  });

  function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  function sendProgress(message) {
    chrome.runtime.sendMessage({ type: 'progress', count: unsubCount, message });
  }

  async function startUnsubscribing() {
    sendProgress('Scanning for subscribed channels…');
    await sleep(800);
    await unsubscribeAll();
  }

  async function unsubscribeAll() {
    let attempts = 0;
    const maxAttempts = 500;

    while (!shouldStop && attempts < maxAttempts) {
      // Scroll to load more channels
      window.scrollTo(0, document.body.scrollHeight);
      await sleep(600);

      // Find all "Subscribed" buttons on the page
      const subscribedBtns = getSubscribedButtons();

      if (subscribedBtns.length === 0) {
        // Try scrolling more and re-checking
        if (attempts < 3) {
          attempts++;
          await sleep(1000);
          continue;
        }
        // Nothing left
        chrome.runtime.sendMessage({ type: 'done', count: unsubCount });
        return;
      }

      // Process the first found button
      const btn = subscribedBtns[0];
      try {
        btn.click();
        await sleep(500);

        // Confirm the unsubscribe dialog if it appears
        const confirmed = await confirmDialog();
        if (confirmed) {
          unsubCount++;
          sendProgress(`Unsubscribed ${unsubCount} channel(s)…`);
        }

        await sleep(700);
        attempts = 0; // reset attempts after success
      } catch (e) {
        attempts++;
        await sleep(500);
      }
    }

    if (shouldStop) {
      chrome.runtime.sendMessage({ type: 'done', count: unsubCount });
    } else {
      chrome.runtime.sendMessage({ type: 'done', count: unsubCount });
    }
  }

  function getSubscribedButtons() {
    const results = [];

    // Strategy 1: aria-label contains "Unsubscribe" (the toggle button when already subscribed)
    document.querySelectorAll('button').forEach(btn => {
      const label = (btn.getAttribute('aria-label') || '').toLowerCase();
      const text  = (btn.textContent || '').trim().toLowerCase();

      if (
        label.includes('unsubscribe') ||
        text === 'subscribed' ||
        text === 'unsubscribe'
      ) {
        // Make sure it's visible
        const rect = btn.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          results.push(btn);
        }
      }
    });

    // Strategy 2: yt-formatted-string inside subscription button
    if (results.length === 0) {
      document.querySelectorAll('ytd-subscribe-button-renderer').forEach(renderer => {
        const btn = renderer.querySelector('button');
        if (btn) {
          const rect = btn.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            results.push(btn);
          }
        }
      });
    }

    return results;
  }

  async function confirmDialog() {
    // Wait for the confirmation dialog to appear
    for (let i = 0; i < 10; i++) {
      await sleep(200);

      // Look for "Unsubscribe" confirm button in a dialog/popup
      const dialogs = document.querySelectorAll(
        'yt-confirm-dialog-renderer, paper-dialog, ytd-popup-container, tp-yt-paper-dialog'
      );

      for (const dialog of dialogs) {
        const btns = dialog.querySelectorAll('button, yt-button-renderer');
        for (const b of btns) {
          const txt = (b.textContent || '').trim().toLowerCase();
          const lbl = (b.getAttribute('aria-label') || '').toLowerCase();
          if (txt === 'unsubscribe' || lbl === 'unsubscribe') {
            b.click();
            return true;
          }
        }
      }

      // Also try generic dialog with unsubscribe text
      const allBtns = document.querySelectorAll('button, yt-button-renderer');
      for (const b of allBtns) {
        const txt = (b.textContent || '').trim().toLowerCase();
        if (txt === 'unsubscribe') {
          const inDialog = b.closest(
            'yt-confirm-dialog-renderer, paper-dialog, ytd-popup-container, tp-yt-paper-dialog, [role="dialog"]'
          );
          if (inDialog) {
            b.click();
            return true;
          }
        }
      }
    }

    return false;
  }
})();
