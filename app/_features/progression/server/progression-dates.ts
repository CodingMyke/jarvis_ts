const LOCAL_DATE_FORMATTER_CACHE = new Map<string, Intl.DateTimeFormat>();
const ISO_WEEKDAY_FORMATTER_CACHE = new Map<string, Intl.DateTimeFormat>();
const UTC_DAY_MS = 24 * 60 * 60 * 1000;

function getLocalDateFormatter(timezone: string): Intl.DateTimeFormat {
  const cached = LOCAL_DATE_FORMATTER_CACHE.get(timezone);

  if (cached) {
    return cached;
  }

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  LOCAL_DATE_FORMATTER_CACHE.set(timezone, formatter);
  return formatter;
}

function getIsoWeekdayFormatter(timezone: string): Intl.DateTimeFormat {
  const cached = ISO_WEEKDAY_FORMATTER_CACHE.get(timezone);

  if (cached) {
    return cached;
  }

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
  });
  ISO_WEEKDAY_FORMATTER_CACHE.set(timezone, formatter);
  return formatter;
}

function formatUtcDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function parseLocalDateAsUtc(localDate: string): Date {
  return new Date(`${localDate}T00:00:00.000Z`);
}

export function getLocalDateForTimezone(date: Date, timezone: string): string {
  return getLocalDateFormatter(timezone).format(date);
}

export function getIsoWeekdayForTimezone(date: Date, timezone: string): number {
  const weekday = getIsoWeekdayFormatter(timezone).format(date);

  switch (weekday) {
    case "Mon":
      return 1;
    case "Tue":
      return 2;
    case "Wed":
      return 3;
    case "Thu":
      return 4;
    case "Fri":
      return 5;
    case "Sat":
      return 6;
    case "Sun":
      return 7;
    default:
      return 1;
  }
}

export function getWeekRangeForLocalDate(localDate: string): { start: string; end: string } {
  const date = parseLocalDateAsUtc(localDate);
  const utcDay = date.getUTCDay();
  const isoWeekday = utcDay === 0 ? 7 : utcDay;
  const monday = new Date(date.getTime() - (isoWeekday - 1) * UTC_DAY_MS);
  const sunday = new Date(monday.getTime() + 6 * UTC_DAY_MS);

  return {
    start: formatUtcDate(monday),
    end: formatUtcDate(sunday),
  };
}

export function getMillisecondsUntilNextLocalMidnight(
  timezone: string,
  now: Date = new Date(),
): number {
  const currentLocalDate = getLocalDateForTimezone(now, timezone);
  const currentTime = now.getTime();
  let lowerBound = currentTime;
  let upperBound = currentTime + 36 * UTC_DAY_MS;

  while (getLocalDateForTimezone(new Date(upperBound), timezone) === currentLocalDate) {
    upperBound += UTC_DAY_MS;
  }

  while (upperBound - lowerBound > 1000) {
    const midpoint = Math.floor((lowerBound + upperBound) / 2);
    if (getLocalDateForTimezone(new Date(midpoint), timezone) === currentLocalDate) {
      lowerBound = midpoint;
    } else {
      upperBound = midpoint;
    }
  }

  return Math.max(upperBound - currentTime, 1000);
}

export function isDeadlineExpired(
  deadline: string | null,
  todayLocalDate: string,
): boolean {
  return deadline !== null && deadline < todayLocalDate;
}
