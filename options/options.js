// ============================================================
// Page Summarizer — Options Script
// Loads/saves settings to browser.storage.local
// Provider list is driven by config/providers.js
// ============================================================

// Build defaults from the shared PROVIDERS config
function buildDefaults() {
  const defaults = {
    provider: DEFAULT_PROVIDER,
    downloadFolder: 'PageSummaries',
    bookmarkFolder: 'Page Summaries'
  };
  for (const key of Object.keys(PROVIDERS)) {
    defaults[`apiKey_${key}`] = '';
  }
  return defaults;
}

// Populate the <select> dropdown from PROVIDERS
function buildProviderSelect() {
  const select = document.getElementById('provider');
  for (const [key, provider] of Object.entries(PROVIDERS)) {
    const option = document.createElement('option');
    option.value = key;
    option.textContent = provider.label || provider.name;
    select.appendChild(option);
  }
}

// Build API key input fields from PROVIDERS
function buildApiKeyFields() {
  const container = document.getElementById('api-key-fields');
  for (const [key, provider] of Object.entries(PROVIDERS)) {
    const fieldId = `apiKey_${key}`;
    const providerLabel = provider.name.split('(')[0].trim(); // e.g. "Gemini 3.5 Flash"

    const field = document.createElement('div');
    field.className = 'field api-key-field';
    field.dataset.provider = key;
    field.style.display = 'none';

    const label = document.createElement('label');
    label.htmlFor = fieldId;
    label.textContent = `${providerLabel} API Key`;
    field.appendChild(label);

    const inputGroup = document.createElement('div');
    inputGroup.className = 'input-group';

    const input = document.createElement('input');
    input.type = 'password';
    input.id = fieldId;
    input.name = fieldId;
    input.placeholder = provider.keyPlaceholder || '';
    input.autocomplete = 'off';
    inputGroup.appendChild(input);

    const toggleBtn = document.createElement('button');
    toggleBtn.type = 'button';
    toggleBtn.className = 'btn-toggle-vis';
    toggleBtn.dataset.target = fieldId;
    toggleBtn.title = 'Toggle visibility';
    toggleBtn.textContent = '👁';
    toggleBtn.addEventListener('click', () => {
      if (input.type === 'password') {
        input.type = 'text';
        toggleBtn.textContent = '🙈';
      } else {
        input.type = 'password';
        toggleBtn.textContent = '👁';
      }
    });
    inputGroup.appendChild(toggleBtn);
    field.appendChild(inputGroup);

    if (provider.keyHelp) {
      const small = document.createElement('small');
      small.textContent = `${provider.keyHelp.text} `;
      const link = document.createElement('a');
      link.href = provider.keyHelp.linkUrl;
      link.target = '_blank';
      link.rel = 'noopener';
      link.textContent = provider.keyHelp.linkText;
      small.appendChild(link);
      field.appendChild(small);
    }

    container.appendChild(field);
  }
}

function updateApiKeyVisibility(provider) {
  document.querySelectorAll('.api-key-field').forEach(el => {
    el.style.display = el.dataset.provider === provider ? 'block' : 'none';
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  const DEFAULTS = buildDefaults();

  // Build UI from config
  buildProviderSelect();
  buildApiKeyFields();

  // Load saved settings
  const settings = await browser.storage.local.get(DEFAULTS);

  // Populate form fields
  document.getElementById('provider').value = settings.provider;
  document.getElementById('downloadFolder').value = settings.downloadFolder;
  document.getElementById('bookmarkFolder').value = settings.bookmarkFolder;

  // Populate all API key inputs
  for (const key of Object.keys(PROVIDERS)) {
    const input = document.getElementById(`apiKey_${key}`);
    if (input) input.value = settings[`apiKey_${key}`] || '';
  }

  // Show the API key field for the selected provider
  updateApiKeyVisibility(settings.provider);

  // Provider change → show/hide relevant API key field
  document.getElementById('provider').addEventListener('change', (e) => {
    updateApiKeyVisibility(e.target.value);
  });

  // Save settings
  document.getElementById('settings-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = {
      provider: document.getElementById('provider').value,
      downloadFolder: document.getElementById('downloadFolder').value.trim() || DEFAULTS.downloadFolder,
      bookmarkFolder: document.getElementById('bookmarkFolder').value.trim() || DEFAULTS.bookmarkFolder
    };

    // Collect all API keys dynamically
    for (const key of Object.keys(PROVIDERS)) {
      const input = document.getElementById(`apiKey_${key}`);
      formData[`apiKey_${key}`] = input ? input.value.trim() : '';
    }

    await browser.storage.local.set(formData);

    // Show success toast
    const status = document.getElementById('save-status');
    status.textContent = '✓ Settings saved';
    status.classList.add('visible');
    setTimeout(() => status.classList.remove('visible'), 2500);
  });
});
