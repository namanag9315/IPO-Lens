export function normalizeLeadManagerName(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\b(private|pvt|limited|ltd|llp|merchant banker|lead manager|capital market|securities|financial services)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function leadManagerSlug(value: string) {
  const normalized = normalizeLeadManagerName(value);
  return normalized.replace(/\s+/g, "-") || value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
