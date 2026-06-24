import { NextResponse } from "next/server";
import { subscribeEmail, isBrevoConfigured, getUpdatesListId } from "@/lib/brevo";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { error: "A valid email address is required." },
        { status: 400 }
      );
    }

    const listId = getUpdatesListId();
    await subscribeEmail(email, listId);

    return NextResponse.json({
      success: true,
      listId,
      message: isBrevoConfigured()
        ? "Subscribed successfully to updates!"
        : "Subscription mock triggered successfully (Brevo key not configured).",
    });
  } catch (error: any) {
    console.error("[Subscribe API Error]", error);
    return NextResponse.json(
      { error: error.message || "Failed to subscribe to updates." },
      { status: 500 }
    );
  }
}
