import { NextResponse } from "next/server";
import { getComputedIPOs } from "@/lib/ipoData";
import { sendNotificationEmail } from "@/lib/notifications/emailProvider";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type EventType =
  | "IPO_OPENED"
  | "IPO_CLOSING_SOON"
  | "ALLOTMENT_TODAY"
  | "ALLOTMENT_STATUS_AVAILABLE"
  | "LISTING_TODAY"
  | "LISTING_PRICE_AVAILABLE"
  | "GMP_MOVED"
  | "SUBSCRIPTION_MOVED"
  | "AI_ANALYSIS_READY";

interface GeneratedEvent {
  ctaLabel: string;
  ctaUrl: string;
  eventType: EventType;
  ipoId: string;
  message: string;
  title: string;
}

function yyyyMmDd(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function preferenceKey(eventType: EventType) {
  if (eventType === "IPO_OPENED") return "ipo_opening_alerts";
  if (eventType === "IPO_CLOSING_SOON") return "ipo_closing_alerts";
  if (eventType === "ALLOTMENT_TODAY" || eventType === "ALLOTMENT_STATUS_AVAILABLE") return "allotment_alerts";
  if (eventType === "LISTING_TODAY" || eventType === "LISTING_PRICE_AVAILABLE") return "listing_alerts";
  if (eventType === "GMP_MOVED") return "gmp_alerts";
  if (eventType === "SUBSCRIPTION_MOVED") return "subscription_alerts";
  return "weekly_digest";
}

function eventsForToday(): Promise<GeneratedEvent[]> {
  return getComputedIPOs().then((ipos) => {
    const today = yyyyMmDd();
    const tomorrow = yyyyMmDd(new Date(Date.now() + 86_400_000));
    const events: GeneratedEvent[] = [];

    for (const ipo of ipos) {
      const allotmentDate = (ipo as typeof ipo & { allotment_date?: string | null }).allotment_date ?? null;

      if (ipo.open_date === today) {
        events.push({
          ctaLabel: "View IPO",
          ctaUrl: `/ipo/${ipo.slug}`,
          eventType: "IPO_OPENED",
          ipoId: ipo.id,
          message: `${ipo.name} opened for bidding today. Review IPO Lens research signals before making any decision.`,
          title: `${ipo.name} opened today`,
        });
      }

      if (ipo.close_date === today || ipo.close_date === tomorrow) {
        events.push({
          ctaLabel: "View research",
          ctaUrl: `/ipo/${ipo.slug}`,
          eventType: "IPO_CLOSING_SOON",
          ipoId: ipo.id,
          message: `${ipo.name} ${ipo.close_date === today ? "closes today" : "closes tomorrow"}. IPO Lens provides educational research, not advice.`,
          title: `${ipo.name} closing soon`,
        });
      }

      if (allotmentDate === today) {
        events.push({
          ctaLabel: "Check allotment",
          ctaUrl: `/allotment?ipo=${ipo.slug}`,
          eventType: "ALLOTMENT_TODAY",
          ipoId: ipo.id,
          message: `${ipo.name} allotment is expected today. Use official links if automatic status is unavailable.`,
          title: `${ipo.name} allotment expected today`,
        });
      }

      if (ipo.listing_date === today) {
        events.push({
          ctaLabel: "View listing",
          ctaUrl: `/ipo/${ipo.slug}`,
          eventType: "LISTING_TODAY",
          ipoId: ipo.id,
          message: `${ipo.name} is expected to list today. Listing price can differ from GMP and estimates.`,
          title: `${ipo.name} lists today`,
        });
      }

      const [latestGmp, previousGmp] = ipo.gmp_history;
      if (latestGmp && previousGmp) {
        const issuePrice = ipo.price_band_high ?? 0;
        const latestPct = issuePrice ? (latestGmp.gmp_value / issuePrice) * 100 : 0;
        const previousPct = issuePrice ? (previousGmp.gmp_value / issuePrice) * 100 : 0;
        if (Math.abs(latestPct - previousPct) >= 5) {
          events.push({
            ctaLabel: "View GMP trend",
            ctaUrl: `/ipo/${ipo.slug}`,
            eventType: "GMP_MOVED",
            ipoId: ipo.id,
            message: `${ipo.name} GMP moved from ${previousPct >= 0 ? "+" : ""}${previousPct.toFixed(1)}% to ${latestPct >= 0 ? "+" : ""}${latestPct.toFixed(1)}%. GMP is unofficial market sentiment.`,
            title: `${ipo.name} GMP moved`,
          });
        }
      }

      const [latestSub, previousSub] = ipo.subscription_data;
      if (latestSub && previousSub && latestSub.total_x - previousSub.total_x >= 2) {
        events.push({
          ctaLabel: "View subscription",
          ctaUrl: `/ipo/${ipo.slug}`,
          eventType: "SUBSCRIPTION_MOVED",
          ipoId: ipo.id,
          message: `${ipo.name} total subscription moved meaningfully to ${latestSub.total_x.toFixed(1)}x.`,
          title: `${ipo.name} subscription moved`,
        });
      }
    }

    return events;
  });
}

async function alreadyNotified(userId: string, ipoId: string, eventType: EventType) {
  const today = `${yyyyMmDd()}T00:00:00.000Z`;
  const tomorrow = `${yyyyMmDd(new Date(Date.now() + 86_400_000))}T00:00:00.000Z`;
  const { data } = await supabaseAdmin
    .from("user_notifications")
    .select("id")
    .eq("user_id", userId)
    .eq("ipo_id", ipoId)
    .eq("event_type", eventType)
    .gte("created_at", today)
    .lt("created_at", tomorrow)
    .limit(1);

  return Boolean(data?.length);
}

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured." }, { status: 503 });
  }

  if (request.headers.get("authorization") !== secret) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const [{ data: users }, { data: preferences }, events] = await Promise.all([
    supabaseAdmin.from("user_profiles").select("*"),
    supabaseAdmin.from("notification_preferences").select("*"),
    eventsForToday(),
  ]);
  const prefsByUser = new Map((preferences ?? []).map((pref) => [pref.user_id, pref]));
  let created = 0;

  for (const event of events) {
    const { data: eventRow, error: eventError } = await supabaseAdmin
      .from("notification_events")
      .insert({
        event_type: event.eventType,
        ipo_id: event.ipoId,
        message: event.message,
        metadata: { generated_for: yyyyMmDd() },
        title: event.title,
      })
      .select("id")
      .single();

    if (eventError || !eventRow) {
      continue;
    }

    for (const user of users ?? []) {
      const prefs = prefsByUser.get(user.id) ?? {};
      const key = preferenceKey(event.eventType);
      const enabled = prefs[key] !== false;

      if (!enabled || (await alreadyNotified(user.id, event.ipoId, event.eventType))) {
        continue;
      }

      const { data: notification, error } = await supabaseAdmin
        .from("user_notifications")
        .insert({
          cta_label: event.ctaLabel,
          cta_url: event.ctaUrl,
          event_id: eventRow.id,
          event_type: event.eventType,
          ipo_id: event.ipoId,
          message: event.message,
          title: event.title,
          user_id: user.id,
        })
        .select("id")
        .single();

      if (error || !notification) {
        continue;
      }

      created += 1;

      if (prefs.email_enabled && user.email) {
        const emailResult = await sendNotificationEmail({
          subject: event.title,
          text: event.message,
          to: user.email,
        });
        await supabaseAdmin.from("notification_delivery_logs").insert({
          channel: "EMAIL",
          error_message: emailResult.errorMessage,
          notification_id: notification.id,
          provider: emailResult.provider,
          sent_at: emailResult.status === "SENT" ? new Date().toISOString() : null,
          status: emailResult.status,
          user_id: user.id,
        });
      }
    }
  }

  return NextResponse.json({ created, events: events.length });
}
