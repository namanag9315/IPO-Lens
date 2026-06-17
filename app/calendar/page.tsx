import IPOCalendar from "@/components/IPOCalendar";
import { getComputedIPOs } from "@/lib/ipoData";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const ipos = await getComputedIPOs();

  return (
    <main className="premium-page-container calendar-page">
      <IPOCalendar ipos={ipos} />
    </main>
  );
}
