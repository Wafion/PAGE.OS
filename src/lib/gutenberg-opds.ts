import * as cheerio from "cheerio";
import type { MappedGutenbergBook } from "@/adapters/gutendex";

const PROJECT_GUTENBERG_OPDS_ENDPOINT = "https://www.gutenberg.org/ebooks/search.opds/";

function decodeHtmlEntities(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function buildProjectGutenbergFormats(id: string) {
  return {
    "text/plain; charset=utf-8": `https://www.gutenberg.org/cache/epub/${id}/pg${id}.txt`,
    "text/html; charset=utf-8": `https://www.gutenberg.org/files/${id}/${id}-h/${id}-h.htm`,
  };
}

export function mapProjectGutenbergOpds(xml: string): MappedGutenbergBook[] {
  const $ = cheerio.load(xml, { xmlMode: true });
  const books: MappedGutenbergBook[] = [];

  $("entry").each((_, entry) => {
    const idHref = $(entry).children("id").first().text();
    const idMatch = idHref.match(/\/ebooks\/(\d+)\.opds$/);
    if (!idMatch) {
      return;
    }

    const id = idMatch[1];
    const title = decodeHtmlEntities($(entry).children("title").first().text());
    const content = decodeHtmlEntities($(entry).children("content").first().text());

    if (!title) {
      return;
    }

    books.push({
      id,
      title,
      authors: content && !/^\d+\s+downloads?$/i.test(content) ? content : "Project Gutenberg",
      formats: buildProjectGutenbergFormats(id),
      source: "gutendex",
      subjects: [],
    });
  });

  return books;
}

export async function fetchProjectGutenbergOpdsBooks(query?: string, page = 1) {
  const params = new URLSearchParams();
  const trimmedQuery = query?.trim();

  if (trimmedQuery) {
    params.set("query", trimmedQuery);
  } else {
    params.set("sort_order", "downloads");
  }

  if (page > 1) {
    params.set("start_index", String((page - 1) * 25 + 1));
  }

  const response = await fetch(`${PROJECT_GUTENBERG_OPDS_ENDPOINT}?${params.toString()}`, {
    headers: {
      Accept: "application/atom+xml, application/xml;q=0.9, text/xml;q=0.8",
      "User-Agent": "PAGE.OS/1.0 (Project Gutenberg OPDS recommendations)",
    },
    signal: AbortSignal.timeout(5000),
    next: { revalidate: 21600 },
  });

  if (!response.ok) {
    throw new Error(`Project Gutenberg OPDS fetch failed: ${response.status}`);
  }

  return mapProjectGutenbergOpds(await response.text());
}
