// ============================================================
// Page Summarizer — Popup Script
// Sends "summarize" to background, displays live progress
// ============================================================

const STEP_ICONS = {
  pending: '○',
  running: '◌',
  done:    '✓',
  error:   '✕'
};

document.addEventListener('DOMContentLoaded', async () => {
  // Check if API key is set for the current provider
  const settings = await browser.storage.local.get({
    provider: 'gemini',
    apiKey_groq: '',
    apiKey_openai: '',
    apiKey_gemini: ''
  });

  const apiKey = settings[`apiKey_${settings.provider}`];

  if (!apiKey) {
    document.getElementById('progress-view').style.display = 'none';
    document.getElementById('setup-view').style.display = 'block';
    document.getElementById('open-settings').addEventListener('click', () => {
      browser.runtime.openOptionsPage();
    });
    return;
  }

  // Check if there's an operation already in progress (popup was reopened)
  try {
    const response = await browser.runtime.sendMessage({ action: 'getStatus' });
    if (response && response.operation && response.operation.status === 'running') {
      updateUI(response.operation);
      // Don't start a new one — just listen for updates
      return;
    }
    if (response && response.operation && response.operation.status === 'complete') {
      // Show the last result if the tab URL matches
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (response.operation.tabUrl === tab.url) {
        updateUI(response.operation);
        return;
      }
    }
  } catch { /* background not ready yet, proceed */ }

  // Start summarization for the active tab
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });

  browser.runtime.sendMessage({
    action: 'summarize',
    tab: { id: tab.id, url: tab.url, title: tab.title, incognito: tab.incognito }
  });
});

// Listen for progress updates from background script
browser.runtime.onMessage.addListener((message) => {
  if (message.action === 'progress') {
    updateUI(message.operation);
  }
});

function updateUI(operation) {
  // Update each step's icon and class
  for (const [stepName, stepData] of Object.entries(operation.steps)) {
    const stepEl = document.querySelector(`.step[data-step="${stepName}"]`);
    if (!stepEl) continue;

    // Remove old state classes, add current
    stepEl.className = `step ${stepData.status}`;
    const indicator = stepEl.querySelector('.step-indicator');
    indicator.textContent = STEP_ICONS[stepData.status] || '○';
  }

  // Show summary when available
  if (operation.summary) {
    renderSummary(operation.summary);
  }

  // Show error
  if (operation.error) {
    const errorSection = document.getElementById('error-section');
    document.getElementById('error-message').textContent = operation.error;
    errorSection.style.display = 'flex';
  }
}

function renderSummary(summary) {
  const section  = document.getElementById('summary-section');
  const content  = document.getElementById('summary-content');
  const tagsEl   = document.getElementById('summary-tags');

  let html = '';

  if (summary.summary) {
    html += `<p>${escapeHtml(summary.summary)}</p>`;
  }

  if (summary.key_insights && summary.key_insights.length) {
    html += '<h3>Key Insights</h3><ul>';
    summary.key_insights.forEach(i => { html += `<li>${escapeHtml(i)}</li>`; });
    html += '</ul>';
  }

  if (summary.notable_opinions && summary.notable_opinions.length) {
    html += '<h3>Notable Opinions</h3><ul>';
    summary.notable_opinions.forEach(o => { html += `<li>${escapeHtml(o)}</li>`; });
    html += '</ul>';
  }

  if (summary.highlights && summary.highlights.length) {
    html += '<h3>Highlights</h3><ul>';
    summary.highlights.forEach(h => { html += `<li>${escapeHtml(h)}</li>`; });
    html += '</ul>';
  }

  content.innerHTML = html;

  // Tags
  tagsEl.innerHTML = '';
  if (summary.tags && summary.tags.length) {
    summary.tags.forEach(tag => {
      const el = document.createElement('span');
      el.className = 'tag';
      el.textContent = `#${tag.replace(/^#/, '')}`;
      tagsEl.appendChild(el);
    });
  }

  section.style.display = 'block';
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Settings link
document.getElementById('settings-link').addEventListener('click', (e) => {
  e.preventDefault();
  browser.runtime.openOptionsPage();
});
