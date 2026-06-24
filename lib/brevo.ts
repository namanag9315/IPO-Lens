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

const IPO_UPDATES_LIST_ID = 3;

export function getUpdatesListId(): number {
  const parsed = Number.parseInt(process.env.BREVO_UPDATES_LIST_ID || String(IPO_UPDATES_LIST_ID), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : IPO_UPDATES_LIST_ID;
}

function getDefaultListId(): number {
  return getUpdatesListId();
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

/**
 * Fetches all contacts subscribed to a specific Brevo contact list.
 */
export async function getContactsInList(listId?: number, limit = 50, offset = 0) {
  const targetListId = listId ?? getDefaultListId();
  const apiKey = process.env.BREVO_API_KEY;
  if (!isBrevoConfigured()) {
    return {
      listId: targetListId,
      contacts: [
        { email: "aishwarya.sharma@gmail.com", id: 101, createdAt: "2026-06-23T10:15:30.000Z", emailBlacklisted: false, smsBlacklisted: false },
        { email: "rahul.gupta@outlook.com", id: 102, createdAt: "2026-06-22T14:45:12.000Z", emailBlacklisted: false, smsBlacklisted: false },
        { email: "priya.patel@yahoo.com", id: 103, createdAt: "2026-06-21T08:30:45.000Z", emailBlacklisted: false, smsBlacklisted: false },
        { email: "amit.verma@ipolens.co.in", id: 104, createdAt: "2026-06-20T17:22:00.000Z", emailBlacklisted: false, smsBlacklisted: false },
        { email: "sneha.reddy@gmail.com", id: 105, createdAt: "2026-06-19T11:05:18.000Z", emailBlacklisted: false, smsBlacklisted: false },
        { email: "vikram.singh@outlook.in", id: 106, createdAt: "2026-06-18T19:40:55.000Z", emailBlacklisted: false, smsBlacklisted: false }
      ],
      count: 6
    };
  }

  const response = await fetch(
    `https://api.brevo.com/v3/contacts/lists/${targetListId}/contacts?limit=${limit}&offset=${offset}`,
    {
      method: "GET",
      headers: {
        "api-key": apiKey!,
        "Accept": "application/json",
      },
    }
  );

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
    throw new Error(json.message || `Failed to fetch contacts: ${response.status}`);
  }

  return { ...json, listId: targetListId };
}
