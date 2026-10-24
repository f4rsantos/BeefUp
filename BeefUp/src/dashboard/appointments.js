import { isFutureAppt } from "../lib/planUtils";

export function weekdayOf(iso, lang) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(lang === "pt" ? "pt-PT" : undefined, { weekday: "short" });
}

// Already happened and not yet marked as done.
export function needsConfirmation(entry) {
  return !!entry.time && !entry.done && !entry.missed && !isFutureAppt(entry.date, entry.time);
}

function byDateTime(a, b) {
  return (a.date + a.time).localeCompare(b.date + b.time);
}

export function nextAppointment(schedule = []) {
  return schedule.filter((e) => isFutureAppt(e.date, e.time)).sort(byDateTime)[0] || null;
}

export function pendingCount(schedule = []) {
  return schedule.filter(needsConfirmation).length;
}
