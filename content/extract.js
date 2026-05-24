// ============================================================
// Page Summarizer — Content Extraction Script
// Injected on-demand into the active tab after Readability.js
// ============================================================

(function () {
  try {
    // Clone the document so Readability doesn't modify the live DOM
    const documentClone = document.cloneNode(true);
    const article = new Readability(documentClone).parse();

    if (article) {
      return {
        title: article.title || document.title,
        textContent: article.textContent || '',
        excerpt: article.excerpt || '',
        byline: article.byline || '',
        siteName: article.siteName || '',
        length: article.length || 0
      };
    } else {
      // Fallback: return raw page text if Readability can't parse it
      return {
        title: document.title,
        textContent: document.body.innerText || '',
        excerpt: '',
        byline: '',
        siteName: '',
        length: (document.body.innerText || '').length
      };
    }
  } catch (e) {
    // Fallback on any error
    return {
      title: document.title,
      textContent: document.body.innerText || '',
      excerpt: '',
      byline: '',
      siteName: '',
      length: 0,
      error: e.message
    };
  }
})();
