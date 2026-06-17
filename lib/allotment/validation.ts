export function isValidPAN(pan: string): boolean {
  if (!pan) return false;
  return /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan.toUpperCase());
}

export function isValidApplicationNumber(appNo: string): boolean {
  if (!appNo) return false;
  return appNo.trim().length >= 4;
}
