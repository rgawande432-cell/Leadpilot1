// Shared Google News RSS parsing for LeadPilot discovery workflows.
const xmlDecode = (value = "") => String(value)
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
  .replace(/&amp;/g, "&")
  .replace(/&lt;/g, "<")
  .replace(/&gt;/g, ">")
  .replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'");

export function parseGoogleNewsRss(xml = "", { includeDomain = false } = {}) {
  const items = [...String(xml).matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)];
  return items.map((match) => {
    const item = match[1];
    const field = (tag) => xmlDecode(
      (item.match(new RegExp("<" + tag + "[^>]*>([\\s\\S]*?)<\\/" + tag + ">", "i")) || [])[1] || ""
    ).trim();
    const article = { title: field("title"), url: field("link"), date: field("pubDate") };
    if (includeDomain) article.domain = "Google News RSS";
    return article;
  }).filter((article) => article.title && article.url);
}
