const btnStart = document.getElementById('btnStart');
const btnStop  = document.getElementById('btnStop');
const statusText = document.getElementById('statusText');
const statusIcon = document.getElementById('statusIcon');
const counter    = document.getElementById('counter');
const counterLabel = document.getElementById('counterLabel');
const progressWrap = document.getElementById('progressWrap');
const progressBar  = document.getElementById('progressBar');

let running = false;
let activeTabId = null;

function setStatus(icon, text, cls = '') {
  statusIcon.textContent = icon;
  statusText.textContent = text;
  statusText.className = 'status-text ' + cls;
}

function showCounter(n) {
  counter.textContent = n;
  counter.classList.add('visible');
  counterLabel.style.display = 'block';
}

async function getCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function injectAndRun() {
  const tab = await getCurrentTab();

  if (!tab.url || !tab.url.includes('youtube.com')) {
    setStatus('❌', 'Please open YouTube first, then click Start.', 'error');
    return;
  }

  // Navigate to subscriptions page if not already there
  if (!tab.url.includes('youtube.com/@') && !tab.url.includes('youtube.com/feed/channels')) {
    setStatus('🔀', 'Navigating to your subscriptions page…');
    await chrome.tabs.update(tab.id, { url: 'https://www.youtube.com/feed/channels' });
    // Wait for page to load
    await new Promise(r => setTimeout(r, 2500));
  }

  activeTabId = tab.id;
  running = true;
  btnStart.disabled = true;
  btnStop.style.display = 'block';
  progressWrap.classList.add('visible');
  showCounter(0);
  setStatus('⏳', 'Starting… please wait.', 'running');

  // Inject content script
  try {
    await chrome.scripting.executeScript({
      target: { tabId: activeTabId },
      files: ['content.js']
    });
  } catch (e) {
    // already injected, that's fine
  }

  // Send start message
  chrome.tabs.sendMessage(activeTabId, { action: 'start' });
}

btnStart.addEventListener('click', injectAndRun);

btnStop.addEventListener('click', async () => {
  running = false;
  if (activeTabId) {
    chrome.tabs.sendMessage(activeTabId, { action: 'stop' });
  }
  setStatus('⏹', 'Stopped by user.', '');
  btnStop.style.display = 'none';
  btnStart.disabled = false;
});

// Listen for progress updates from content script
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'progress') {
    showCounter(msg.count);
    setStatus('⏳', msg.message || 'Unsubscribing…', 'running');
    if (msg.total) {
      const pct = Math.round((msg.count / msg.total) * 100);
      progressBar.style.width = pct + '%';
    }
  } else if (msg.type === 'done') {
    running = false;
    btnStop.style.display = 'none';
    btnStart.disabled = false;
    progressBar.style.width = '100%';
    showCounter(msg.count);
    setStatus('✅', `Done! Unsubscribed from ${msg.count} channel${msg.count !== 1 ? 's' : ''}.`, 'success');
  } else if (msg.type === 'error') {
    running = false;
    btnStop.style.display = 'none';
    btnStart.disabled = false;
    setStatus('❌', msg.message || 'An error occurred.', 'error');
  } else if (msg.type === 'no_channels') {
    running = false;
    btnStop.style.display = 'none';
    btnStart.disabled = false;
    progressBar.style.width = '0%';
    setStatus('✅', 'No subscriptions found! You\'re already clean.', 'success');
  }
});
