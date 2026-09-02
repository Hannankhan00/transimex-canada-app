/**
 * RFC 4180 Compliant CSV Serializer
 * Formats flat or nested JavaScript objects into CSV format with proper quoting,
 * escaping, and UTF-8 Byte Order Mark (BOM) to ensure clean loading in Excel / Sheets.
 */

export function serializeToCsv(data: Record<string, any>[], headers?: { key: string; label: string }[]): string {
  if (!data || data.length === 0) {
    return "";
  }

  // Determine columns
  const cols =
    headers ||
    Object.keys(data[0]).map((key) => ({
      key,
      label: key.charAt(0).toUpperCase() + key.slice(1),
    }));

  const escapeCell = (val: any): string => {
    if (val === null || val === undefined) return "";
    const str = String(val);
    // If value contains comma, double quote, or newline, wrap in quotes and escape internal quotes
    if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headerRow = cols.map((c) => escapeCell(c.label)).join(",");
  const dataRows = data.map((row) =>
    cols.map((c) => escapeCell(row[c.key])).join(",")
  );

  // UTF-8 BOM (\uFEFF) ensures Excel properly displays UTF-8 (including French accents: é, è, à, etc.)
  return "\uFEFF" + [headerRow, ...dataRows].join("\r\n");
}

export function createCsvDownloadResponse(csvString: string, filename: string): Response {
  return new Response(csvString, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
