const MONTH_INDEX: Record<string, number> = {
  apr: 3,
  april: 3,
  aug: 7,
  august: 7,
  dec: 11,
  december: 11,
  feb: 1,
  february: 1,
  jan: 0,
  january: 0,
  jul: 6,
  july: 6,
  jun: 5,
  june: 5,
  mar: 2,
  march: 2,
  may: 4,
  nov: 10,
  november: 10,
  oct: 9,
  october: 9,
  sep: 8,
  sept: 8,
  september: 8,
};

function isoDate(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month, day)).toISOString().slice(0, 10);
}

export function parsePublicDate(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const cleaned = value.replace(/,/g, " ").replace(/\b(Mon|Tue|Wed|Thu|Fri|Sat|Sun)(day)?\b/gi, " ");
  const withYear = cleaned.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);

  if (withYear) {
    const month = MONTH_INDEX[withYear[2].toLowerCase()];

    return month === undefined ? null : isoDate(Number(withYear[3]), month, Number(withYear[1]));
  }

  const compact = cleaned.match(/(\d{1,2})\s+([A-Za-z]+)/);

  if (!compact) {
    return null;
  }

  const month = MONTH_INDEX[compact[2].toLowerCase()];

  return month === undefined ? null : isoDate(new Date().getFullYear(), month, Number(compact[1]));
}

export function parsePublicDateRange(value: string | null | undefined) {
  if (!value) {
    return { closeDate: null, openDate: null };
  }

  const match = value.replace(/,/g, " ").match(/(\d{1,2})(?:\s*-\s*(\d{1,2}))?\s+([A-Za-z]+)(?:\s+(\d{4}))?/);

  if (!match) {
    return { closeDate: null, openDate: null };
  }

  const month = MONTH_INDEX[match[3].toLowerCase()];

  if (month === undefined) {
    return { closeDate: null, openDate: null };
  }

  const year = match[4] ? Number(match[4]) : new Date().getFullYear();

  return {
    closeDate: isoDate(year, month, Number(match[2] ?? match[1])),
    openDate: isoDate(year, month, Number(match[1])),
  };
}
