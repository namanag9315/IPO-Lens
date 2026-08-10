import { createHmac } from "crypto";

function hashKey() {
  return process.env.ENCRYPTION_KEY ?? "ipo-lens-local-development-key";
}

export function hashPAN(pan: string) {
  return createHmac("sha256", hashKey()).update(pan.trim().toUpperCase()).digest("hex");
}
