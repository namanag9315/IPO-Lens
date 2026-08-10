export function normalizedIPOCategory(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function isSMECategory(value: unknown) {
  const normalized = normalizedIPOCategory(value);
  return normalized === "sme" || normalized === "small-medium-enterprise";
}

export function ipoTypeLabel(value: unknown) {
  return isSMECategory(value) ? "SME" : "Mainboard";
}
