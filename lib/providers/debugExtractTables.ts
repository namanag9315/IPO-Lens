import * as cheerio from 'cheerio';

export interface TableMatrix {
  index: number;
  nearbyHeading: string | null;
  headers: string[];
  rows: string[][];
  rowCount: number;
  columnCount: number;
  preview: string[][];
}

export function extractTableMatrices($: cheerio.Root): TableMatrix[] {
  const matrices: TableMatrix[] = [];

  $('table').each((index, el) => {
    const table = $(el);
    let nearbyHeading: string | null = null;

    // Search for a nearby heading
    let prev = table.prev();
    for (let i = 0; i < 5; i++) {
      if (!prev.length) {
        prev = table.parent().prev();
      }
      if (prev.length) {
        if (prev.is('h1, h2, h3, h4, h5, h6')) {
          nearbyHeading = prev.text().trim().replace(/\s+/g, ' ');
          break;
        }

        const nestedHeading = prev.find('h1, h2, h3, h4, h5, h6').last();
        if (nestedHeading.length) {
          nearbyHeading = nestedHeading.text().trim().replace(/\s+/g, ' ');
          break;
        }
        prev = prev.prev();
      } else {
        break;
      }
    }

    const headers: string[] = [];
    const rows: string[][] = [];

    // Extract headers from th
    table.find('tr').first().find('th, td').each((_, cell) => {
      // If we find th, we use them as headers
      if ($(cell).is('th')) {
        headers.push($(cell).text().trim().replace(/\s+/g, ' '));
      }
    });

    // Extract all rows
    table.find('tr').each((rowIndex, tr) => {
      const rowCols: string[] = [];
      $(tr).find('td, th').each((_, td) => {
        rowCols.push($(td).text().trim().replace(/\s+/g, ' '));
      });
      if (rowCols.length > 0) {
        rows.push(rowCols);
      }
    });

    // If no th elements were found, assume the first row contains headers
    if (headers.length === 0 && rows.length > 0) {
      headers.push(...rows[0]);
    }

    // Determine max column count
    const columnCount = Math.max(headers.length, ...rows.map(r => r.length));

    matrices.push({
      index,
      nearbyHeading,
      headers,
      rows,
      rowCount: rows.length,
      columnCount,
      preview: rows.slice(0, 5)
    });
  });

  return matrices;
}
