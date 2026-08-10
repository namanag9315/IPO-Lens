export function isValidCronRequest(authHeader: string | null): boolean {
  const secret = process.env.CRON_SECRET;

  if (!secret || !authHeader) {
    return false;
  }

  return authHeader === secret || authHeader === `Bearer ${secret}`;
}
