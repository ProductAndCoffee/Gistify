// ============================================================
// Page Summarizer — Background Script
// Orchestrates: bookmark → extract → LLM summarize → download
// Providers are defined in config/providers.js (loaded via manifest)
// ============================================================

const SYSTEM_PROMPT = `You are a content summarizer. Given the following article content, provide a structured summary.

Respond ONLY with valid JSON in this exact format:
{
  "title": "A concise descriptive title for the article",
  "tags": ["tag1", "tag2", "tag3"],
  "summary": "A comprehensive summary paragraph covering the main points",
  "key_insights": ["insight 1", "insight 2"],
  "notable_opinions": ["opinion 1", "opinion 2"],
  "highlights": ["highlight 1", "highlight 2"]
}

Guidelines:
- Provide 3-5 relevant lowercase tags (no # prefix)
- Write 2-4 key insights (main arguments or facts)
- Write 1-3 notable opinions (author's perspectives or stances)
- Write 2-4 highlights (memorable quotes or standout points)
- Keep the summary concise but thorough (2-4 sentences)
- Respond with ONLY the JSON object, no other text`;

const SETTINGS_DEFAULTS = Object.keys(PROVIDERS).reduce((defaults, key) => {
  defaults[`apiKey_${key}`] = '';
  return defaults;
}, {
  provider: DEFAULT_PROVIDER,
  downloadFolder: 'PageSummaries',
  bookmarkFolder: 'Page Summaries'
});

// --------------- State ---------------

let currentOperation = null;

// --------------- Message Handling ---------------

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'summarize') {
    handleSummarize(message.tab);
    return false;
  }

  if (message.action === 'getStatus') {
    sendResponse({ operation: currentOperation });
    return false;
  }

  return false;
});

// --------------- Main Workflow ---------------

async function handleSummarize(tab) {
  currentOperation = {
    status: 'running',
    tabUrl: tab.url,
    steps: {
      bookmark: { status: 'pending' },
      extract: { status: 'pending' },
      summarize: { status: 'pending' },
      save: { status: 'pending' }
    },
    summary: null,
    error: null
  };

  try {
    // Load settings
    const settings = await browser.storage.local.get(SETTINGS_DEFAULTS);
    const provider = PROVIDERS[settings.provider];
    const apiKey = settings[`apiKey_${settings.provider}`];

    if (!apiKey) {
      throw new Error(
        `API key not configured for ${provider.name}. Please set it in the extension settings.`
      );
    }

    // Step 1: Bookmark
    setStepStatus('bookmark', 'running');
    broadcastProgress();
    await createBookmark(tab.url, tab.title, settings.bookmarkFolder);
    setStepStatus('bookmark', 'done');
    broadcastProgress();

    // Step 2: Extract content
    setStepStatus('extract', 'running');
    broadcastProgress();
    const article = await extractContent(tab.id);
    setStepStatus('extract', 'done');
    broadcastProgress();

    // Step 3: Summarize with LLM
    setStepStatus('summarize', 'running');
    broadcastProgress();
    const summary = await callLLM(article.textContent, provider, apiKey);
    currentOperation.summary = summary;
    setStepStatus('summarize', 'done');
    broadcastProgress();

    // Step 4: Save markdown file
    setStepStatus('save', 'running');
    broadcastProgress();
    const mdContent = generateMarkdown(summary, tab.url);
    await saveMarkdown(mdContent, summary.title || tab.title, settings.downloadFolder, tab.incognito);
    setStepStatus('save', 'done');

    currentOperation.status = 'complete';
    broadcastProgress();

  } catch (error) {
    currentOperation.status = 'error';
    currentOperation.error = error.message;

    // Mark whatever was running as errored
    for (const step in currentOperation.steps) {
      if (currentOperation.steps[step].status === 'running') {
        currentOperation.steps[step].status = 'error';
      }
    }
    broadcastProgress();
  }
}

// --------------- Step Helpers ---------------

function setStepStatus(step, status) {
  currentOperation.steps[step].status = status;
}

function broadcastProgress() {
  browser.runtime.sendMessage({
    action: 'progress',
    operation: currentOperation
  }).catch(() => {
    // Popup may be closed — that's fine, operation continues
  });
}

// --------------- Bookmark ---------------

async function createBookmark(url, title, folderName) {
  // Find or create the target folder
  const results = await browser.bookmarks.search({ title: folderName });
  let folderId;

  const folder = results.find(
    b => !b.url && b.title === folderName
  );

  if (folder) {
    folderId = folder.id;
  } else {
    const newFolder = await browser.bookmarks.create({ title: folderName });
    folderId = newFolder.id;
  }

  // Skip if already bookmarked in this folder
  const existing = await browser.bookmarks.search({ url });
  const alreadyInFolder = existing.find(b => b.parentId === folderId);

  if (!alreadyInFolder) {
    await browser.bookmarks.create({ parentId: folderId, title, url });
  }
}

// --------------- Content Extraction ---------------

async function extractContent(tabId) {
  // Inject Readability.js first, then the extraction script
  await browser.tabs.executeScript(tabId, { file: '/lib/Readability.js' });
  const results = await browser.tabs.executeScript(tabId, { file: '/content/extract.js' });

  if (!results || !results[0]) {
    throw new Error(
      'Failed to extract content from this page. It may not be a readable article.'
    );
  }

  return results[0];
}

// --------------- LLM Call ---------------

async function callLLM(articleText, provider, apiKey) {
  // Truncate to ~48,000 chars to stay within context limits
  const MAX_CHARS = 48000;
  const truncatedText = articleText.length > MAX_CHARS
    ? articleText.substring(0, MAX_CHARS) + '\n\n[Content truncated...]'
    : articleText;

  const body = {
    model: provider.model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `Please summarize the following article:\n\n${truncatedText}` }
    ],
    temperature: 0.3,
    response_format: { type: 'json_object' }
  };

  const response = await fetch(provider.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`LLM API error (${response.status}): ${errText.substring(0, 200)}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;

  return parseJsonResponse(content);
}

/**
 * Robustly parse JSON from LLM response.
 * Handles raw JSON, markdown-fenced JSON, or JSON embedded in text.
 */
function parseJsonResponse(content) {
  // Try direct parse
  try {
    return JSON.parse(content);
  } catch { /* continue */ }

  // Try extracting from markdown code fence
  const fenceMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    try {
      return JSON.parse(fenceMatch[1].trim());
    } catch { /* continue */ }
  }

  // Try finding a JSON object in the text
  const objectMatch = content.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    try {
      return JSON.parse(objectMatch[0]);
    } catch { /* continue */ }
  }

  throw new Error('Failed to parse LLM response as JSON.');
}

// --------------- Markdown Generation ---------------

function generateMarkdown(summary, url) {
  const date = new Date().toISOString().split('T')[0];
  const tags = (summary.tags || [])
    .map(t => `#${t.replace(/^#/, '').replace(/\s+/g, '-')}`)
    .join(' ');

  let md = `# ${summary.title || 'Untitled'}\n\n`;
  md += `- **URL**: ${url}\n`;
  md += `- **Date**: ${date}\n`;
  md += `- **Tags**: ${tags}\n\n`;

  if (summary.summary) {
    md += `## Summary\n\n${summary.summary}\n\n`;
  }

  if (summary.key_insights && summary.key_insights.length > 0) {
    md += `## Key Insights\n\n`;
    summary.key_insights.forEach(i => { md += `- ${i}\n`; });
    md += '\n';
  }

  if (summary.notable_opinions && summary.notable_opinions.length > 0) {
    md += `## Notable Opinions\n\n`;
    summary.notable_opinions.forEach(o => { md += `- ${o}\n`; });
    md += '\n';
  }

  if (summary.highlights && summary.highlights.length > 0) {
    md += `## Highlights\n\n`;
    summary.highlights.forEach(h => { md += `- ${h}\n`; });
    md += '\n';
  }

  return md;
}

// --------------- File Save (Downloads API) ---------------

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 80)
    .replace(/-$/, '');
}

async function saveMarkdown(mdContent, title, folder, isPrivate) {
  const slug = slugify(title || 'untitled');
  const date = new Date().toISOString().split('T')[0];
  const filename = `${folder}/${date}-${slug}.md`;

  const blob = new Blob([mdContent], { type: 'text/markdown' });
  const blobUrl = URL.createObjectURL(blob);

  try {
    const downloadOpts = {
      url: blobUrl,
      filename: filename,
      saveAs: false,
      conflictAction: 'uniquify'
    };

    // Firefox silently skips downloads in private browsing unless
    // the incognito flag is explicitly set.
    if (isPrivate) {
      downloadOpts.incognito = true;
    }

    const downloadId = await browser.downloads.download(downloadOpts);

    // Wait for the download to finish before revoking the blob URL.
    await new Promise((resolve, reject) => {
      function onChanged(delta) {
        if (delta.id !== downloadId) return;
        if (delta.state && delta.state.current === 'complete') {
          browser.downloads.onChanged.removeListener(onChanged);
          resolve();
        } else if (delta.error) {
          browser.downloads.onChanged.removeListener(onChanged);
          reject(new Error(`Download failed: ${delta.error.current}`));
        }
      }
      browser.downloads.onChanged.addListener(onChanged);
    });
  } finally {
    URL.revokeObjectURL(blobUrl);
  }
}
