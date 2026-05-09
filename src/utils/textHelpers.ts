export function stripHtmlAndMarkdown(text: string | undefined | null): string {
  if (!text) return '';
  
  // Only take the first paragraph for the excerpt
  const firstParagraph = text.split(/\n{1,}/)[0];

  return firstParagraph
    // Strip HTML tags
    .replace(/<[^>]*>/g, '')
    // Strip markdown images
    .replace(/!\[.*?\]\(.*?\)/g, '')
    // Strip markdown links
    .replace(/\[([^\]]+)\]\(.*?\)/g, '$1')
    // Strip standard markdown formatting (basic)
    .replace(/[*_~`#>]/g, '')
    // Clean up multiple spaces
    .replace(/\s+/g, ' ')
    .trim();
}
