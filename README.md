# Gistify ✨

**Gistify** is a fast, AI-powered browser extension for Firefox that helps you capture the essence of any article on the web. With a single click, it extracts the article's text, generates a smart summary using your favorite LLM provider, bookmarks the page, and downloads a clean Markdown (`.md`) file of the summary right to your computer.

<div align="center">
  <img src="icons/icon-96.png" alt="Gistify Logo" width="96" height="96">
</div>

## Features

- 🧠 **AI Summaries:** Automatically generates concise summaries, key insights, notable opinions, and highlights.
- 🔌 **Bring Your Own Keys (BYOK):** Supports Google Gemini (Free), Groq (Free), and OpenAI. You stay in control of your API keys and usage.
- 💾 **Markdown Downloads:** Saves beautiful, structured `.md` files straight to your `Downloads` folder for easy note-taking and archiving.
- 🔖 **Auto-Bookmarking:** Automatically organizes summarized pages into a dedicated bookmarks folder.
- 🕵️ **Privacy First:** Full support for Firefox Private Browsing mode (with proper configuration). All processing happens locally or directly via the LLM provider API.

## Installation

### Firefox (Developer Mode)
1. Clone or download this repository.
2. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`.
3. Click **Load Temporary Add-on...**
4. Select the `manifest.json` file in the Gistify directory.
5. The extension is now installed!

## Getting Started

1. **Configure your API Key:** Click the Gistify icon in your toolbar, then click **Open Settings**. Select your preferred provider (e.g., Gemini 3.5 Flash) and paste in your API key. You can get free API keys from Google AI Studio or Groq.
2. **Summarize a Page:** Navigate to any article or blog post you want to read. Click the Gistify extension icon, and the summarization process will begin. 
3. **Enjoy your Notes:** Once completed, a Markdown file will be saved to your computer, and the page will be bookmarked!

## Configuration

You can customize Gistify's behavior via the extension's Settings page:
- **Provider Selection:** Switch between Gemini, Groq, or OpenAI.
- **Download Subfolder:** Choose where Markdown files are saved (default: `Downloads/PageSummaries`).
- **Bookmark Folder:** Choose the name of the folder where bookmarks are stored (default: `Page Summaries`).

## Development

The provider list is dynamically driven by a single source of truth. To add a new LLM provider, simply edit `config/providers.js`. The UI and background script will update automatically.

## License

MIT License. See the [LICENSE](LICENSE) file for more information.
