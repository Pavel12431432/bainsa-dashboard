const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function todayRome(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Rome" }).format(new Date());
}

export function isValidDate(date: string): boolean {
  return DATE_RE.test(date);
}
