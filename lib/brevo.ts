/**
 * Brevo (formerly Sendinblue) Email Marketing Integration
 * Uses the Brevo v3 API with native fetch.
 */

/**
 * Returns true if Brevo API Key is configured in environment variables.
 */
export function isBrevoConfigured(): boolean {
  const apiKey = process.env.BREVO_API_KEY;
  return typeof apiKey === "string" && apiKey.trim().length > 0;
}

function getSenderEmail(): string {
  return process.env.BREVO_SENDER_EMAIL || "updates@ipolens.co.in";
}

function getSenderName(): string {
  return process.env.BREVO_SENDER_NAME || "IPO Lens";
}

function getDefaultListId(): number {
  return parseInt(process.env.BREVO_NEWSLETTER_LIST_ID || "2", 10);
}

/**
 * Helper to execute authorized HTTP POST requests to Brevo API.
 */
async function brevoRequest(endpoint: string, body: Record<string, any>) {
  if (!isBrevoConfigured()) {
    console.warn(`[Brevo API Mock] Call to ${endpoint} with body:`, JSON.stringify(body));
    return { mock: true, success: true };
  }

  const apiKey = process.env.BREVO_API_KEY;
  const response = await fetch(`https://api.brevo.com/v3${endpoint}`, {
    method: "POST",
    headers: {
      "api-key": apiKey!,
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  let json: Record<string, any> = {};
  try {
    if (text) {
      json = JSON.parse(text);
    }
  } catch (err) {
    console.error(`[Brevo API Error] Failed to parse JSON response: ${text}`);
  }

  if (!response.ok) {
    throw new Error(json.message || `Brevo request failed with status: ${response.status}`);
  }

  return json;
}

/**
 * Subscribes a new email address to a Brevo newsletter contact list.
 * Adds/updates the contact and attaches them to the specified list ID.
 */
export async function subscribeEmail(email: string, listId?: number) {
  const targetListId = listId ?? getDefaultListId();
  return brevoRequest("/contacts", {
    email: email.trim().toLowerCase(),
    listIds: [targetListId],
    updateEnabled: true,
  });
}

/**
 * Creates and queues a mass email campaign to a contact list.
 */
export async function sendCampaign(subject: string, htmlContent: string, listId?: number) {
  const targetListId = listId ?? getDefaultListId();
  const senderEmail = getSenderEmail();
  const senderName = getSenderName();

  // 1. Create the campaign
  const campaignResponse = await brevoRequest("/emailCampaigns", {
    sender: {
      name: senderName,
      email: senderEmail,
    },
    name: `${subject} - ${new Date().toLocaleDateString()}`,
    htmlContent: htmlContent,
    subject: subject,
    recipients: {
      listIds: [targetListId],
    },
  });

  const campaignId = campaignResponse.id;
  if (!campaignId) {
    return campaignResponse; // Might be in mock mode
  }

  // 2. Send the campaign immediately
  return brevoRequest(`/emailCampaigns/${campaignId}/sendNow`, {});
}

/**
 * Sends a single transactional email to a recipient.
 */
export async function sendTransactionalEmail(toEmail: string, subject: string, htmlContent: string) {
  const senderEmail = getSenderEmail();
  const senderName = getSenderName();

  return brevoRequest("/smtp/email", {
    sender: {
      name: senderName,
      email: senderEmail,
    },
    to: [
      {
        email: toEmail.trim().toLowerCase(),
      },
    ],
    subject: subject,
    htmlContent: htmlContent,
  });
}
