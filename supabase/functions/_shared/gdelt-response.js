// Shared defensive parser for GDELT Project article-list JSON.
export function parseGdeltResponse(body) {
  try {
    const data = JSON.parse(String(body ?? ""));
    if (!Array.isArray(data?.articles)) {
      return { articles: [], fallbackReason: "GDELT returned HTTP 200 without article data" };
    }
    return {
      articles: data.articles.map((article) => ({
        title: article?.title || "",
        url: article?.url || "",
        domain: article?.domain || "",
        date: article?.seendate || "",
      })),
      fallbackReason: "",
    };
  } catch {
    return { articles: [], fallbackReason: "GDELT returned HTTP 200 with non-JSON content" };
  }
}
