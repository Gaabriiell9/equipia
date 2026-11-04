"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Panel } from "@/components/ui/display";
import { cn, fmtDate, fmtNum } from "@/lib/format";
import { setHolidayStatus } from "@/app/app/actions/admin";

type Status = "off" | "worked" | null;

export function HolidayGrid({
  holidays,
  members,
  statuses,
  fgBalances,
}: {
  holidays: { day: string; name: string }[];
  members: { id: string; first_name: string; last_name: string }[];
  statuses: { member_id: string; day: string; status: "off" | "worked" }[];
  fgBalances: Record<string, number> | null;
}) {
  const [state, setState] = useState(() => new Map(statuses.map((s) => [`${s.member_id}:${s.day}`, s.status as Status])));
  const [fg, setFg] = useState(fgBalances);
  const [, start] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);

  function cycle(memberId: string, day: string) {
    const key = `${memberId}:${day}`;
    const cur = state.get(key) ?? null;
    const next: Status = cur === null ? "off" : cur === "off" ? "worked" : null;
    setBusy(key);
    start(async () => {
      const r = await setHolidayStatus(memberId, day, next);
      setBusy(null);
      if (!r.ok) return void toast.error(r.error);
      setState((s) => new Map(s).set(key, next));
      if (fg && !day.endsWith("-05-01")) {
        setFg((f) => {
          if (!f) return f;
          const copy = { ...f };
          const wasDebited = cur === "off";
          if (wasDebited) copy[memberId] = (copy[memberId] ?? 0) + 1;
          if (r.data?.debited) copy[memberId] = (copy[memberId] ?? 0) - 1;
          return copy;
        });
      }
    });
  }

  return (
    <Panel className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-max min-w-full text-sm">
          <thead>
            <tr className="border-b border-line">
              <th className="sticky left-0 z-10 w-44 min-w-44 bg-paper px-4 py-2 text-left text-[13px] font-medium text-muted">Salarié</th>
              {holidays.map((h) => (
                <th key={h.day} className="w-24 min-w-24 border-l border-line px-2 py-2 text-center font-normal">
                  <span className="block text-[13px] font-semibold">{fmtDate(h.day, "d MMM")}</span>
                  <span className="block truncate text-[11px] text-muted" title={h.name}>
                    {h.name}
                  </span>
                </th>
              ))}
              {fg && <th className="border-l border-line bg-marker-soft px-3 py-2 text-center text-[13px] font-semibold">Garantis restants</th>}
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id} className="border-b border-line last:border-0">
                <th scope="row" className="sticky left-0 z-10 bg-paper px-4 py-1.5 text-left font-medium">
                  {m.first_name} {m.last_name}
                </th>
                {holidays.map((h) => {
                  const key = `${m.id}:${h.day}`;
                  const s = state.get(key) ?? null;
                  return (
                    <td key={h.day} className="border-l border-line p-1">
                      <button
                        onClick={() => cycle(m.id, h.day)}
                        disabled={busy === key}
                        aria-label={`${m.first_name} ${m.last_name}, ${h.name} : ${s === "off" ? "chômé" : s === "worked" ? "travaillé" : "non renseigné"}`}
                        className={cn(
                          "h-8 w-full rounded-[6px] text-xs font-semibold transition-colors disabled:opacity-50",
                          s === "off" && "bg-ok-soft text-ok",
                          s === "worked" && "bg-ink text-white",
                          s === null && "border border-dashed border-line text-transparent hover:bg-surface hover:text-muted",
                        )}
                      >
                        {s === "off" ? "Chômé" : s === "worked" ? (h.day.endsWith("-05-01") ? "Travaillé x2" : "Travaillé") : "Renseigner"}
                      </button>
                    </td>
                  );
                })}
                {fg && (
                  <td className="tabular border-l border-line bg-marker-soft/50 px-3 text-center font-bold">{fmtNum(fg[m.id] ?? 0)}</td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
