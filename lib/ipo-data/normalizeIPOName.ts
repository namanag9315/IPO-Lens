export function normalizeIPOName(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\b(initial public offer|initial public offering)\b/g, " ")
    .replace(/\b(ipo|mainboard|main board|sme|bse sme|nse sme|limited|ltd|pvt|private|llp)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function ipoNameTokens(value: string) {
  return normalizeIPOName(value).split(" ").filter(Boolean);
}
