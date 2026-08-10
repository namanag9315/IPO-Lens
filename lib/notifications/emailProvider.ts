interface EmailInput {
  html?: string;
  subject: string;
  text: string;
  to: string;
}

export async function sendNotificationEmail(input: EmailInput) {
  if (!process.env.RESEND_API_KEY || process.env.EMAIL_PROVIDER !== "resend") {
    return {
      provider: process.env.EMAIL_PROVIDER ?? "none",
      status: "SKIPPED",
      errorMessage: "Email provider is not configured.",
    };
  }

  const response = await fetch("https://api.resend.com/emails", {
    body: JSON.stringify({
      from: process.env.EMAIL_FROM ?? "IPO Lens <alerts@ipo-lens.local>",
      html:
        input.html ??
        `<p>${input.text}</p><p><a href="${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/settings/notifications">Manage preferences</a></p>`,
      subject: input.subject,
      text: `${input.text}\n\nManage preferences: ${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/settings/notifications`,
      to: input.to,
    }),
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    return {
      provider: "resend",
      status: "FAILED",
      errorMessage: "Email provider returned an error.",
    };
  }

  return {
    provider: "resend",
    status: "SENT",
    errorMessage: null,
  };
}
