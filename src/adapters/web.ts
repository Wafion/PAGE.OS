

'use client';
import * as pdfjsLib from 'pdfjs-dist';

// Set up the worker source for pdf.js
// This is crucial for it to work in a web environment.
// We use a CDN to avoid complex file copying build steps.
pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.mjs`;


/**
 * Extracts text content from a PDF file.
 * @param pdfBlob The PDF file as a Blob.
 * @returns A promise that resolves to the extracted text as a single string.
 */
async function extractPdfText(pdfBlob: Blob): Promise<string> {
  const arrayBuffer = await pdfBlob.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let textContent = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    
    // Join text items with a space, and pages with a double newline
    textContent += content.items.map(item => (item as any).str).join(' ') + '\n\n';
  }

  return textContent;
}


/**
 * Scrapes readable text from an HTML document string.
 * This is a client-side utility.
 * @param html The HTML content as a string.
 * @returns The extracted text.
 */
async function scrapeTextFromHtml(html: string): Promise<string> {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    
    doc.querySelectorAll('script, style, head, nav, footer, header, aside, form, iframe, noscript').forEach(el => el.remove());
    
    const body = doc.body;
    if (!body) return '';

    const mainContent = body.querySelector('article, main, .main, #main, .content, #content') || body;
    const blocks = mainContent.querySelectorAll('p, h1, h2, h3, h4, h5, h6, blockquote, li, pre');
    
    let textChunks: string[];
    if (blocks.length > 0) {
        textChunks = Array.from(blocks).map(block => block.textContent?.trim() || '');
    } else {
        textChunks = (mainContent.textContent || '').split(/\n\s*\n/);
    }
    
    const fullText = textChunks.filter(Boolean).join('\n\n');
    return fullText.trim() || body.textContent?.trim() || '';
}


/**
 * Fetches content from a web URL, handling TXT, PDF, and HTML.
 * @param url The direct URL to the content.
 * @returns A promise that resolves to the string content, or null on failure.
 */
export async function fetchWebBookContent(url: string): Promise<string | null> {
  const proxiedUrl = `/api/proxy?url=${encodeURIComponent(url)}`;
  
  try {
    const res = await fetch(proxiedUrl, { signal: AbortSignal.timeout(15000) }); // 15-second timeout
    if (!res.ok) {
        console.error(`Fetch failed for ${url} with status ${res.status}`);
        return null;
    }

    const contentType = res.headers.get('Content-Type') || '';
    const lowerUrl = url.toLowerCase();

    if (lowerUrl.endsWith('.pdf') || contentType.includes('application/pdf')) {
      const blob = await res.blob();
      return await extractPdfText(blob);
    }
    
    if (lowerUrl.endsWith('.txt') || contentType.includes('text/plain')) {
      return await res.text();
    }
    
    if (lowerUrl.endsWith('.html') || lowerUrl.endsWith('.htm') || contentType.includes('text/html')) {
      const html = await res.text();
      const text = await scrapeTextFromHtml(html);
      if (!text) throw new Error("Could not extract readable text from HTML page.");
      return text;
    }

    // If we can't determine the type, we make a last-ditch effort to read as text.
    return await res.text();

  } catch (error) {
    console.error(`Error fetching or parsing content from ${url}:`, error);
    if (error instanceof Error) {
        throw new Error(`Failed to load content from the web. Reason: ${error.message}`);
    }
    throw new Error('An unknown error occurred while fetching web content.');
  }
}
