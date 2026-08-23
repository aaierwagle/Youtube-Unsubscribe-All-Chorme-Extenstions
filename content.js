(() => {
  if (window.__ytUnsubRunning) return;
  window.__ytUnsubRunning = false;

  let shouldStop = false;
  let unsubCount = 0;

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === 'start' && !window.__ytUnsubRunning) {
      shouldStop = false;
      unsubCount = 0;
      window.__ytUnsubRunning = true;
      startUnsubscribing().finally(() => { window.__ytUnsubRunning = false; });
    } else if (msg.action === 'stop') {
      shouldStop = true;
    }
  });

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  function sendProgress(message) {
    try { chrome.runtime.sendMessage({ type: 'progress', count: unsubCount, message }); } catch(e) {}
  }

  // Wait for an element matching selector to appear in DOM, with timeout
  function waitForElement(selector, timeout = 3000) {
    return new Promise((resolve) => {
      const found = document.querySelector(selector);
      if (found) return resolve(found);

      const observer = new MutationObserver(() => {
        const el = document.querySelector(selector);
        if (el) {
          observer.disconnect();
          resolve(el);
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });

      setTimeout(() => {
        observer.disconnect();
        resolve(null);
      }, timeout);
    });
  }

  // Find the subscribed-state button (not inside a dialog)
  function findSubscribedButton() {
    // Primary: ytd-subscribe-button-renderer with subscribed state
    const renderers = document.querySelectorAll('ytd-subscribe-button-renderer');
    for (const r of renderers) {
      const btn = r.querySelector('button');
      if (!btn) continue;
      const rect = btn.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;

      const label = (btn.getAttribute('aria-label') || '').toLowerCase();
      const text  = (btn.innerText || '').trim().toLowerCase();

      // "Unsubscribe from X" aria-label means we ARE subscribed
      if (label.startsWith('unsubscribe from') || text === 'subscribed') {
        return btn;
      }
    }

    // Fallback: any button with aria-label starting with "Unsubscribe from"
    const allBtns = document.querySelectorAll('button');
    for (const btn of allBtns) {
      if (btn.closest('tp-yt-paper-dialog, [role="dialog"], yt-confirm-dialog-renderer')) continue;
      const label = (btn.getAttribute('aria-label') || '').toLowerCase();
      if (label.startsWith('unsubscribe from')) {
        const rect = btn.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) return btn;
      }
    }

    return null;
  }

  // Click the confirm "Unsubscribe" button in the dialog
  async function clickConfirmButton() {
    // Wait for the dialog to appear via MutationObserver
    const dialogEl = await waitForElement(
      'tp-yt-paper-dialog, yt-confirm-dialog-renderer, [role="dialog"]',
      3000
    );

    if (!dialogEl) return false;

    await sleep(200); // Let dialog fully render

    // Search inside the dialog for the confirm button
    const allBtns = dialogEl.querySelectorAll('button, yt-button-renderer button');
    for (const btn of allBtns) {
      const text = (btn.innerText || btn.textContent || '').trim().toLowerCase();
      if (text === 'unsubscribe') {
        btn.click();
        return true;
      }
    }

    // If not found inside dialog, search whole document for floating overlay buttons
    const bodyBtns = document.querySelectorAll(
      'tp-yt-paper-dialog button, yt-confirm-dialog-renderer button, [role="dialog"] button, ytd-popup-container button'
    );
    for (const btn of bodyBtns) {
      const text = (btn.innerText || btn.textContent || '').trim().toLowerCase();
      if (text === 'unsubscribe') {
        const rect = btn.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          btn.click();
          return true;
        }
      }
    }

    return false;
  }

  async function startUnsubscribing() {
    sendProgress('Starting…');
    await sleep(1000);

    let emptyStreak = 0;

    while (!shouldStop) {
      const btn = findSubscribedButton();

      if (!btn) {
        emptyStreak++;
        if (emptyStreak >= 5) {
          // Scroll down to load more
          const before = document.body.scrollHeight;
          window.scrollTo(0, document.body.scrollHeight);
          await sleep(1200);
          const after = document.body.scrollHeight;

          if (after === before) {
            // Page didn't grow, we're done
            try { chrome.runtime.sendMessage({ type: 'done', count: unsubCount }); } catch(e) {}
            return;
          }
          emptyStreak = 0;
        } else {
          await sleep(600);
        }
        continue;
      }

      emptyStreak = 0;

      // Scroll into view
      btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await sleep(500);

      // Click to open confirmation dialog
      btn.click();

      // Use MutationObserver to catch the confirm dialog
      const confirmed = await clickConfirmButton();

      if (confirmed) {
        unsubCount++;
        sendProgress(`Unsubscribed from ${unsubCount} channel(s)…`);
        await sleep(1000);
      } else {
        // Close any open menu with Escape and retry
        document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true }));
        await sleep(800);
      }
    }

    try { chrome.runtime.sendMessage({ type: 'done', count: unsubCount }); } catch(e) {}
  }
})();
