const melbourneDate = new Intl.DateTimeFormat("en-AU", {
  timeZone: "Australia/Melbourne",
  day: "numeric",
  month: "short",
  year: "numeric",
});

const melbourneDateTime = new Intl.DateTimeFormat("en-AU", {
  timeZone: "Australia/Melbourne",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZoneName: "short",
});

export function formatOpsDate(value: string) {
  return melbourneDate.format(new Date(value));
}

export function formatOpsDateTime(value: string) {
  return melbourneDateTime.format(new Date(value));
}
