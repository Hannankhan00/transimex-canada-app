/**
 * The days a parcel can ship: weekdays from the next business day up to 30 days out. Built in UTC to match the
 * server, which rejects past dates, weekends and anything beyond 30 days. The first one is the default.
 */
export function shipDateOptions(now: Date = new Date()): string[] {
  const days: string[] = [];
  const d = new Date(now.getTime() + 86_400_000);
  const last = now.getTime() + 30 * 86_400_000;
  while (d.getTime() <= last) {
    if (d.getUTCDay() !== 0 && d.getUTCDay() !== 6) days.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return days;
}

/** A ship date written out in full for the person's language, for example "Friday, November 6, 2026". */
export function shipDateText(date: string, language: string): string {
  return new Intl.DateTimeFormat(language === "fr" ? "fr-CA" : "en-CA", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
}
