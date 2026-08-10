import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

function encryptionKey() {
  const raw = process.env.ENCRYPTION_KEY;

  if (!raw) {
    throw new Error("ENCRYPTION_KEY is not configured.");
  }

  return createHash("sha256").update(raw).digest();
}

export function encryptText(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${iv.toString("base64")}.${tag.toString("base64")}.${encrypted.toString("base64")}`;
}

export function decryptText(value: string) {
  const [ivRaw, tagRaw, encryptedRaw] = value.split(".");

  if (!ivRaw || !tagRaw || !encryptedRaw) {
    throw new Error("Invalid encrypted payload.");
  }

  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivRaw, "base64"));
  decipher.setAuthTag(Buffer.from(tagRaw, "base64"));

  return Buffer.concat([decipher.update(Buffer.from(encryptedRaw, "base64")), decipher.final()]).toString("utf8");
}
