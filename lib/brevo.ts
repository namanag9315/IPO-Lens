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

/**
 * Sends a welcome/onboarding email to a new subscriber.
 */
export async function sendOnboardingEmail(email: string) {
  const subject = "Welcome to IPO Lens! 🚀 (Important: Move to Primary box)";
  const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Welcome to IPO Lens</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: #f6f9fc;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
      border: 1px solid #e3e8ee;
    }
    .header {
      background: linear-gradient(135deg, #0B132B 0%, #16223F 100%);
      padding: 30px 40px;
      text-align: center;
    }
    .header h1 {
      color: #ffffff;
      font-size: 24px;
      font-weight: 700;
      margin: 0;
      letter-spacing: 0.5px;
    }
    .content {
      padding: 40px;
      color: #333333;
      line-height: 1.6;
    }
    .content h2 {
      font-size: 20px;
      margin-top: 0;
      color: #0B132B;
    }
    .feature-list {
      margin: 24px 0;
      padding-left: 20px;
    }
    .feature-list li {
      margin-bottom: 12px;
    }
    .alert-box {
      background-color: #f0f5ff;
      border-left: 4px solid #1890ff;
      padding: 20px;
      border-radius: 8px;
      margin: 30px 0;
    }
    .alert-box p {
      margin: 0;
      font-size: 14px;
      color: #0B132B;
      font-weight: 600;
    }
    .instructions {
      font-size: 13px;
      color: #666666;
      margin-top: 15px;
      padding-left: 15px;
    }
    .footer {
      background-color: #f8fafc;
      padding: 20px;
      text-align: center;
      font-size: 12px;
      color: #999999;
      border-top: 1px solid #e3e8ee;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>IPO Lens</h1>
    </div>
    <div class="content">
      <h2>Welcome to the IPO Lens community! 🚀</h2>
      <p>Thank you for subscribing to IPO Lens alerts. You will now receive timely, data-driven updates on upcoming IPOs, Grey Market Premium (GMP) details, subscription trends, and plain-English research analysis.</p>
      
      <p>Here is what you can look forward to:</p>
      <ul class="feature-list">
        <li><strong>Real-time GMP Alerts:</strong> Stay informed of grey market movement and listing estimates.</li>
        <li><strong>IPO Scorecards:</strong> Multi-dimensional analysis of financials, promoters, and peer benchmarks.</li>
        <li><strong>Daily Subscription Trackers:</strong> Know where the institutional and retail money is moving.</li>
      </ul>

      <div class="alert-box">
        <p>⚠️ IMPORTANT: Don't miss out on crucial listing signals!</p>
        <p style="font-weight: normal; margin-top: 8px; font-size: 13.5px; color: #4a5568;">
          Email providers (like Gmail or Outlook) sometimes filter newsletter alerts into the "Promotions" or "Spam" folder. To ensure you receive time-sensitive alerts:
        </p>
        <ul class="instructions">
          <li><strong>Gmail:</strong> Drag this email to your <strong>Primary</strong> tab (or click "Yes" when asked to do this for future messages).</li>
          <li><strong>Outlook / Apple Mail:</strong> Mark this sender as <strong>VIP</strong>, add us to your safe sender list, or move this email to your <strong>Inbox</strong>.</li>
          <li><strong>Other:</strong> Add <code>info@ipolens.co.in</code> to your address book/contacts.</li>
        </ul>
      </div>

      <p>We are excited to help you make smarter IPO investment decisions!</p>
      <p>Best regards,<br><strong>The IPO Lens Team</strong></p>
    </div>
    <div class="footer">
      &copy; 2026 IPO Lens. All rights reserved. <br>
      This is an automated notification. Please do not reply directly to this email.
    </div>
  </div>
</body>
</html>`;

  return sendTransactionalEmail(email, subject, htmlContent);
}

