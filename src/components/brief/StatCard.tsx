type StatCardProps = {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "positive" | "negative" | "muted";
};

const toneClass: Record<NonNullable<StatCardProps["tone"]>, string> = {
  default: "text-zinc-900",
  positive: "text-emerald-700",
  negative: "text-rose-700",
  muted: "text-zinc-500",
};

export function StatCard({
  label,
  value,
  hint,
  tone = "default",
}: StatCardProps) {
  return (
    <div className="rounded-xl border border-zinc-200/80 bg-white px-4 py-3.5 shadow-sm">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
        {label}
      </div>
      <div
        className={`mt-1.5 text-2xl font-semibold tracking-tight tabular-nums ${toneClass[tone]}`}
      >
        {value}
      </div>
      {hint ? (
        <div className="mt-1 text-xs text-zinc-500 tabular-nums">{hint}</div>
      ) : null}
    </div>
  );
}
