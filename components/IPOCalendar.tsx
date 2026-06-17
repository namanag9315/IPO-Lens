"use client";

import Link from "next/link";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import type { CSSProperties } from "react";
import { useMemo, useState } from "react";
import type { ComputedIPO } from "@/types/ipo";

interface IPOCalendarProps {
  ipos: ComputedIPO[];
}

type CalendarEventType = "open" | "close" | "listing";

interface CalendarEvent {
  date: Date;
  ipo: ComputedIPO;
  label: string;
  type: CalendarEventType;
}

const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function chipStyle(type: CalendarEventType): CSSProperties {
  if (type === "open") {
    return {
      background: "rgba(16, 185, 129, 0.15)",
      color: "var(--green-signal)",
    };
  }

  if (type === "close") {
    return {
      background: "rgba(239, 68, 68, 0.15)",
      color: "var(--red-signal)",
    };
  }

  return {
    background: "rgba(99, 102, 241, 0.15)",
    color: "#6366F1",
  };
}

function buildEvents(ipos: ComputedIPO[]) {
  return ipos.flatMap((ipo) => {
    const events: CalendarEvent[] = [];

    if (ipo.open_date) {
      events.push({ date: new Date(ipo.open_date), ipo, label: `OPEN ${ipo.name}`, type: "open" });
    }

    if (ipo.close_date) {
      events.push({ date: new Date(ipo.close_date), ipo, label: `CLOSE ${ipo.name}`, type: "close" });
    }

    if (ipo.listing_date) {
      events.push({ date: new Date(ipo.listing_date), ipo, label: `LISTING ${ipo.name}`, type: "listing" });
    }

    return events;
  });
}

export default function IPOCalendar({ ipos }: IPOCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const events = useMemo(() => buildEvents(ipos), [ipos]);
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const currentMonthEvents = useMemo(() => {
    return events
      .filter((event) => isSameMonth(event.date, currentMonth))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [events, currentMonth]);

  const groupedEvents = useMemo(() => {
    const groups: { [key: string]: { date: Date; events: CalendarEvent[] } } = {};
    currentMonthEvents.forEach((event) => {
      const key = format(event.date, "yyyy-MM-dd");
      if (!groups[key]) {
        groups[key] = { date: event.date, events: [] };
      }
      groups[key].events.push(event);
    });
    return Object.values(groups).sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [currentMonthEvents]);

  return (
    <section>
      <div
        style={{
          alignItems: "center",
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 20,
        }}
      >
        <h1 style={{ color: "var(--text-primary)", fontSize: 24, fontWeight: 700 }}>IPO Calendar</h1>
        <div style={{ alignItems: "center", display: "flex", gap: 14 }}>
          <button
            onClick={() => setCurrentMonth((value) => subMonths(value, 1))}
            style={{
              background: "none",
              border: "1px solid var(--border-default)",
              borderRadius: 4,
              color: "var(--text-secondary)",
              cursor: "pointer",
              fontSize: 14,
              height: 28,
              width: 28,
            }}
            type="button"
          >
            ‹
          </button>
          <span className="mono" style={{ color: "var(--text-primary)", fontSize: 16, fontWeight: 600, minWidth: 120, textAlign: "center" }}>
            {format(currentMonth, "MMM yyyy")}
          </span>
          <button
            onClick={() => setCurrentMonth((value) => addMonths(value, 1))}
            style={{
              background: "none",
              border: "1px solid var(--border-default)",
              borderRadius: 4,
              color: "var(--text-secondary)",
              cursor: "pointer",
              fontSize: 14,
              height: 28,
              width: 28,
            }}
            type="button"
          >
            ›
          </button>
        </div>
      </div>

      {/* Desktop Calendar Grid View */}
      <div className="calendar-grid-view">
        <div
          style={{
            display: "grid",
            gap: 8,
            gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
            marginBottom: 8,
          }}
        >
          {weekdays.map((day) => (
            <div
              key={day}
              style={{
                color: "var(--text-muted)",
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              {day}
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }}>
          {days.map((day) => {
            const dayEvents = events.filter((event) => isSameDay(event.date, day));
            const visibleEvents = dayEvents.slice(0, 3);
            const hiddenCount = dayEvents.length - visibleEvents.length;

            return (
              <div
                key={day.toISOString()}
                style={{
                  border: "1px solid var(--border-subtle)",
                  borderRadius: 4,
                  minHeight: 80,
                  opacity: isSameMonth(day, currentMonth) ? 1 : 0.35,
                  padding: "6px 8px",
                }}
              >
                <div
                  className="mono"
                  style={{
                    color: isToday(day) ? "var(--amber-500)" : "var(--text-muted)",
                    fontSize: 12,
                    fontWeight: isToday(day) ? 700 : 500,
                    marginBottom: 6,
                  }}
                >
                  {format(day, "d")}
                </div>

                {visibleEvents.map((event) => (
                  <Link
                    className="calendar-chip"
                    href={`/ipo/${event.ipo.slug}`}
                    key={`${event.type}-${event.ipo.id}`}
                    style={{
                      ...chipStyle(event.type),
                      border: "1px solid transparent",
                      borderRadius: 3,
                      cursor: "pointer",
                      display: "block",
                      fontSize: 10,
                      fontWeight: 600,
                      height: 18,
                      lineHeight: "18px",
                      marginBottom: 2,
                      overflow: "hidden",
                      padding: "0 6px",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    title={event.label}
                  >
                    {event.label}
                  </Link>
                ))}

                {hiddenCount > 0 ? (
                  <div className="mono" style={{ color: "var(--text-muted)", fontSize: 10, marginTop: 2 }}>
                    +{hiddenCount} more
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile Calendar List View */}
      <div className="calendar-list-view">
        {groupedEvents.length === 0 ? (
          <div className="calendar-empty-list" style={{ padding: "40px 16px", textAlign: "center", border: "1px solid var(--border-subtle)", borderRadius: 12, background: "var(--surface)" }}>
            <p style={{ color: "var(--text-muted)", fontSize: 14, margin: 0 }}>No IPO events scheduled for this month.</p>
          </div>
        ) : (
          <div className="calendar-timeline" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {groupedEvents.map(({ date, events }) => (
              <div key={date.toISOString()} className="timeline-item" style={{ display: "flex", gap: "16px", alignItems: "stretch" }}>
                <div className="timeline-date-col" style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "48px", flexShrink: 0 }}>
                  <div className="timeline-date-badge" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: "48px", height: "54px", borderRadius: "10px", background: isToday(date) ? "rgba(245, 158, 11, 0.1)" : "var(--surface)", border: isToday(date) ? "1px solid var(--amber-500)" : "1px solid var(--border-subtle)" }}>
                    <span className="date-number" style={{ fontSize: "16px", fontWeight: 800, color: isToday(date) ? "var(--amber-500)" : "var(--text-primary)", lineHeight: "1.1" }}>{format(date, "d")}</span>
                    <span className="date-month-year" style={{ fontSize: "9px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: "2px" }}>{format(date, "MMM")}</span>
                    <span className="date-day" style={{ fontSize: "9px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{format(date, "EEE")}</span>
                  </div>
                  <div style={{ flex: 1, width: "2px", background: "var(--border-subtle)", margin: "8px 0 -12px" }} />
                </div>
                <div className="timeline-events-col" style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
                  {events.map((event) => (
                    <Link
                      key={`${event.type}-${event.ipo.id}`}
                      href={`/ipo/${event.ipo.slug}`}
                      className={`timeline-event-card event-${event.type}`}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "6px",
                        padding: "12px",
                        borderRadius: "10px",
                        border: "1px solid var(--border-subtle)",
                        background: "var(--surface)",
                        textDecoration: "none",
                        transition: "all 150ms ease"
                      }}
                    >
                      <div className="event-type-badge" style={{
                        alignSelf: "flex-start",
                        fontSize: "9px",
                        fontWeight: 800,
                        padding: "2px 8px",
                        borderRadius: "999px",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        ...chipStyle(event.type)
                      }}>
                        {event.type}
                      </div>
                      <div className="event-details" style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                        <span className="event-ipo-name" style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)" }}>{event.ipo.name}</span>
                        <span className="event-ipo-meta" style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)" }}>
                          {event.ipo.category === "sme" ? "SME" : "Mainboard"}
                          {event.ipo.latest_gmp !== null && ` · GMP: ₹${event.ipo.latest_gmp}`}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
