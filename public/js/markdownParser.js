// Updated markdownParser.js with empty header fix

/**
 * Simple Markdown parser for report content
 * Converts markdown syntax to HTML for proper display
 */
class MarkdownParser {
  /**
   * Parse markdown content to HTML
   * @param {string} content - The markdown content to parse
   * @returns {string} - The parsed HTML content
   */
  static parse(content) {
    if (!content) return '';

    let html = content;

    // Handle paragraphs (double newlines)
    html = html.replace(/\n\n/g, '</p><p>');
    html = '<p>' + html + '</p>';

    // Handle bold text with ** or __
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__(.*?)__/g, '<strong>$1</strong>');

    // Handle italic text with * or _
    html = html.replace(/\*([^\*]+)\*/g, '<em>$1</em>');
    html = html.replace(/_([^_]+)_/g, '<em>$1</em>');

    // Handle headers with content (# Header)
    // This regex requires at least one character after the # symbols
    html = html.replace(/^### ([\s\S]+?)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## ([\s\S]+?)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# ([\s\S]+?)$/gm, '<h1>$1</h1>');

    // Handle empty headers or standalone # symbols
    // Replace with a non-breaking space to maintain proper structure
    html = html.replace(/^#+\s*$/gm, '');

    // Handle bullet lists
    html = html.replace(/^\* (.*?)$/gm, '<li>$1</li>');
    html = html.replace(/^- (.*?)$/gm, '<li>$1</li>');

    // Wrap adjacent li elements in ul
    html = html.replace(/<li>(.*?)<\/li>[\n\r]*<li>/g, '<li>$1</li><li>');
    html = html.replace(/<li>(.*?)<\/li>/g, '<ul><li>$1</li></ul>');
    html = html.replace(/<\/ul>[\n\r]*<ul>/g, '');

    // Handle numbered lists
    html = html.replace(/^\d+\. (.*?)$/gm, '<li>$1</li>');

    // Wrap adjacent li elements in ol
    html = html.replace(/<li>(.*?)<\/li>[\n\r]*<li>/g, '<li>$1</li><li>');
    html = html.replace(/<li>(.*?)<\/li>/g, '<ol><li>$1</li></ol>');
    html = html.replace(/<\/ol>[\n\r]*<ol>/g, '');

    // Fix any nested list issues
    html = html.replace(/<\/ul><ul>/g, '');
    html = html.replace(/<\/ol><ol>/g, '');

    // Handle links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

    // Handle line breaks
    html = html.replace(/\n/g, '<br>');

    // Clean up any empty paragraphs
    html = html.replace(/<p><\/p>/g, '');

    return html;
  }
}

// Make available globally
window.MarkdownParser = MarkdownParser;