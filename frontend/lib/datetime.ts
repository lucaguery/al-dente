// French-relative date helper used everywhere `last_cooked_at` and
// `created_at` are rendered. Per UI-SPEC §"Relative dates":
// - null  → "jamais cuisinée"
// - else  → Intl.RelativeTimeFormat("fr", { numeric: "auto" }) on day diff
//           (e.g., "il y a 3 jours", "hier", "aujourd'hui")
export function formatRelativeFr(date: Date | string | null | undefined): string {
  if (!date) return "jamais cuisinée";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "jamais cuisinée";
  const diffDays = Math.round(
    (d.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );
  return new Intl.RelativeTimeFormat("fr", { numeric: "auto" }).format(
    diffDays,
    "day",
  );
}
