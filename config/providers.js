// ============================================================
// Provider Configuration — Single Source of Truth
// Edit this file to add, remove, or update LLM providers.
// Both background.js and options.js read from this config.
// ============================================================

// eslint-disable-next-line no-unused-vars
const PROVIDERS = {
  gemini: {
    name: 'Gemini 3.5 Flash (Google)',
    label: 'Gemini 3.5 Flash (Google — Free)',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    model: 'gemini-3.5-flash',
    keyPlaceholder: 'AI...',
    keyHelp: {
      text: 'Get your free key at',
      linkText: 'aistudio.google.com',
      linkUrl: 'https://aistudio.google.com/apikey'
    }
  },
  groq: {
    name: 'Llama 3.1 8B (Groq)',
    label: 'Llama 3.1 8B (Groq — Free)',
    endpoint: 'https://api.groq.com/openai/v1/chat/completions',
    model: 'llama-3.1-8b-instant',
    keyPlaceholder: 'gsk_...',
    keyHelp: {
      text: 'Get your free key at',
      linkText: 'console.groq.com',
      linkUrl: 'https://console.groq.com/keys'
    }
  },
  openai: {
    name: 'GPT-4o-mini (OpenAI)',
    label: 'GPT-4o-mini (OpenAI)',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4o-mini',
    keyPlaceholder: 'sk-...',
    keyHelp: {
      text: 'Get your key at',
      linkText: 'platform.openai.com',
      linkUrl: 'https://platform.openai.com/api-keys'
    }
  }
};

// Default settings — provider keys are derived from the PROVIDERS object
const DEFAULT_PROVIDER = 'gemini';
