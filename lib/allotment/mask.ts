export function maskPAN(pan: string | null | undefined): string | null {
  if (!pan || pan.length !== 10) return null;
  const upperPan = pan.toUpperCase();
  return `${upperPan.substring(0, 5)}****${upperPan.substring(9)}`;
}

export function maskApplicationNumber(appNo: string | null | undefined): string | null {
  if (!appNo || appNo.length < 4) return null;
  const len = appNo.length;
  return `${appNo.substring(0, 2)}${"*".repeat(len - 4)}${appNo.substring(len - 2)}`;
}
