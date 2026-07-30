import { google } from "googleapis";
import { authedClient } from "./google";
import { env } from "./env";

export type BusyBlock = { start: string; end: string };
export type TravelBlock = { summary: string; start: string; end: string; location?: string };

export async function calendarApi() {
  const { auth } = await authedClient();
  return google.calendar({ version: "v3", auth });
}

/** Free/busy over the next N days on the primary calendar. */
export async function freeBusy(days = 14): Promise<BusyBlock[]> {
  const api = await calendarApi();
  const timeMin = new Date();
  const timeMax = new Date(Date.now() + days * 86400_000);
  const res = await api.freebusy.query({
    requestBody: {
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      timeZone: env.timezone(),
      items: [{ id: "primary" }],
    },
  });
  return (res.data.calendars?.primary?.busy ?? []).map((b) => ({ start: b.start!, end: b.end! }));
}

const TRAVEL_RE = /\b(flight|fly|flying|travel|trip|abroad|airport|hotel|train to|eurostar|conference|offsite|off-site|holiday|vacation|away)\b/i;

/**
 * Travel context: all-day/multi-day events, events with locations far from home,
 * or events whose title smells like travel, over the next N days.
 */
export async function upcomingTravel(days = 30): Promise<TravelBlock[]> {
  const api = await calendarApi();
  const res = await api.events.list({
    calendarId: "primary",
    timeMin: new Date().toISOString(),
    timeMax: new Date(Date.now() + days * 86400_000).toISOString(),
    singleEvents: true,
    orderBy: "startTime",
    maxResults: 250,
  });
  const out: TravelBlock[] = [];
  for (const ev of res.data.items ?? []) {
    const summary = ev.summary ?? "";
    const isAllDayMultiDay =
      !!ev.start?.date && !!ev.end?.date && new Date(ev.end.date).getTime() - new Date(ev.start.date).getTime() > 86400_000;
    const smellsLikeTravel = TRAVEL_RE.test(summary) || TRAVEL_RE.test(ev.description ?? "");
    if (isAllDayMultiDay || smellsLikeTravel) {
      out.push({
        summary,
        start: ev.start?.dateTime ?? ev.start?.date ?? "",
        end: ev.end?.dateTime ?? ev.end?.date ?? "",
        location: ev.location ?? undefined,
      });
    }
  }
  return out;
}

/** Travel blocks that overlap a given date range — for "you're abroad then" reminders. */
export function travelOverlapping(travel: TravelBlock[], startISO: string, endISO: string): TravelBlock[] {
  const s = new Date(startISO).getTime();
  const e = new Date(endISO).getTime();
  return travel.filter((t) => {
    const ts = new Date(t.start).getTime();
    const te = new Date(t.end).getTime();
    return ts < e && te > s;
  });
}
