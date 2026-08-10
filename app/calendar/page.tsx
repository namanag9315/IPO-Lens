import IPOCalendar from "@/components/IPOCalendar";
import { getComputedIPOs } from "@/lib/ipoData";

export default async function CalendarPage() {
  const ipos = await getComputedIPOs();

  return (
    <main style={{ padding: "32px 24px 48px" }}>
      <IPOCalendar ipos={ipos} />
    </main>
  );
}
