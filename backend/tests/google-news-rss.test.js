import test from "node:test";
import assert from "node:assert/strict";
import { parseGoogleNewsRss } from "../../supabase/functions/_shared/google-news-rss.js";

test("parses RSS articles and decodes entities", () => {
  const xml = '<rss><channel><item><title>Buy &amp; compare</title><link>https://example.com/a</link><pubDate>Fri, 27 Nov 2026</pubDate></item></channel></rss>';
  assert.deepEqual(parseGoogleNewsRss(xml), [{
    title: "Buy & compare", url: "https://example.com/a", date: "Fri, 27 Nov 2026"
  }]);
});

test("supports CDATA and optional source label", () => {
  const xml = '<item><title><![CDATA[Buyer request]]></title><link>https://example.com/req</link><pubDate><![CDATA[today]]></pubDate></item>';
  assert.deepEqual(parseGoogleNewsRss(xml, { includeDomain: true }), [{
    title: "Buyer request", url: "https://example.com/req", date: "today", domain: "Google News RSS"
  }]);
});

test("filters incomplete items and safely handles empty input", () => {
  assert.deepEqual(parseGoogleNewsRss('<item><title>No URL</title></item><item><link>https://example.com</link></item>'), []);
  assert.deepEqual(parseGoogleNewsRss(""), []);
});
