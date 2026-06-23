const WHATSAPP_TRIAL_MESSAGE =
  "Hi IPO Lens, I want to start the 15-day free trial for WhatsApp IPO updates.";

export function getWhatsAppTrialHref() {
  const configuredUrl = process.env.NEXT_PUBLIC_WHATSAPP_UPDATES_URL?.trim();

  if (configuredUrl) {
    return configuredUrl;
  }

  const configuredNumber = process.env.NEXT_PUBLIC_WHATSAPP_UPDATES_NUMBER?.replace(/\D/g, "");
  const encodedMessage = encodeURIComponent(WHATSAPP_TRIAL_MESSAGE);

  if (configuredNumber) {
    return `https://wa.me/${configuredNumber}?text=${encodedMessage}`;
  }

  return `https://wa.me/?text=${encodedMessage}`;
}
