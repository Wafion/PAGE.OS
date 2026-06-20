function normalizeUserQuery(query: string) {
  return query.trim().replace(/\s+/g, ' ');
}

export function buildWebFallbackQuery(rawQuery: string) {
  const query = normalizeUserQuery(rawQuery);
  if (!query) {
    return '';
  }

  return `${query} ebook filetype:pdf`;
}
