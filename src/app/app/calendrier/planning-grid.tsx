"use client";

import Link from "next/link";
import { Fragment } from "react";
import { Plus } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/overlays";
import { cn, fmtDate, fmtNum, isoDow, rangeLabel } from "@/lib/format";
import type { CalendarRow, Member, Team } from "@/lib/types";

type M = Pick<Member, "id" | "first_name" | "last_name" | "team_id" | "work_days" | "role">;

export function PlanningGrid({
  days,
  today,
  orgWorkDays,
  holidays,
  teams,
  members,
  rows,
  canCreateFor,
  meId,
  compact,
}: {
  days: string[];
  today: string;
  orgWorkDays: number[];
  holidays: { day: string; name: string }[];
  teams: Team[];
  members: M[];
  rows: CalendarRow[];
  canCreateFor: boolean;
  meId: string;
  compact: boolean;
  monthStartDow: number;
}) {
  const holidayMap = new Map(holidays.map((h) => [h.day, h.name]));
  const byMember = new Map<string, CalendarRow[]>();
  for (const r of rows) {
    const list = byMember.get(r.member_id) ?? [];
    list.push(r);
    byMember.set(r.member_id, list);
  }
  const groups: { team: Team | null; members: M[] }[] = [
    ...teams.map((t) => ({ team: t, members: members.filter((m) => m.team_id === t.id) })),
    { team: null, members: members.filter((m) => !m.team_id || !teams.some((t) => t.id === m.team_id)) },
  ].filter((g) => g.members.length > 0);

  const isOff = (day: string) => !orgWorkDays.includes(isoDow(day)) || holidayMap.has(day);
  const cellW = compact ? "w-8 min-w-8" : "w-14 min-w-14";

  function absentOn(memberId: string, day: string) {
    return (byMember.get(memberId) ?? []).find((r) => r.counts_as_absence && r.start_date <= day && r.end_date >= day);
  }

  return (
    <div className="rounded-panel border border-line bg-paper">
      <div className="overflow-x-auto">
        <table className="w-max min-w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 z-20 w-36 min-w-36 border-b border-line bg-paper px-3 py-2 text-left text-[13px] font-medium text-muted sm:w-48 sm:min-w-48">
                {members.length} personne{members.length > 1 ? "s" : ""}
              </th>
              {days.map((day) => {
                const hol = holidayMap.get(day);
                const isToday = day === today;
                return (
                  <th
                    key={day}
                    title={hol}
                    className={cn(
                      cellW,
                      "relative border-b border-l border-line px-0 py-1.5 text-center font-normal",
                      isOff(day) && "bg-surface",
                    )}
                  >
                    {isToday && <span className="absolute inset-x-0 top-0 h-[3px] bg-marker" aria-hidden />}
                    <span className={cn("block text-[11px] text-muted", isToday && "font-semibold text-ink")}>
                      {fmtDate(day, compact ? "EEEEE" : "EEE")}
                    </span>
                    <span className={cn("tabular block text-[13px]", isToday ? "font-bold text-ink" : "text-ink-soft")}>{fmtDate(day, "d")}</span>
                    {hol && <span className="mx-auto mt-0.5 block size-1.5 rounded-full bg-marker-strong" aria-label={`Férié : ${hol}`} />}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => {
              const min = g.team?.min_present ?? 0;
              return (
                <Fragment key={g.team?.id ?? "none"}>
                  <tr>
                    <th
                      scope="rowgroup"
                      className="sticky left-0 z-10 border-b border-line bg-surface px-3 py-1.5 text-left text-[13px] font-semibold"
                    >
                      <span className="flex items-center gap-2">
                        {g.team && <span className="size-2 rounded-full" style={{ background: g.team.color }} aria-hidden />}
                        <span className="truncate">{g.team?.name ?? "Sans équipe"}</span>
                        {min > 0 && <span className="text-xs font-normal text-muted">min. {min}</span>}
                      </span>
                    </th>
                    {days.map((day) => {
                      if (min === 0 || isOff(day)) return <td key={day} className="border-b border-l border-line bg-surface" />;
                      const working = g.members.filter((m) => (m.work_days ?? orgWorkDays).includes(isoDow(day)));
                      const present = working.filter((m) => !absentOn(m.id, day)).length;
                      const short = present < min;
                      return (
                        <td
                          key={day}
                          className={cn("border-b border-l border-line text-center text-[11px]", short ? "bg-danger-soft font-bold text-danger" : "bg-surface text-faint")}
                          title={`${present} présent(s) sur ${min} requis`}
                        >
                          {short ? `${present}/${min}` : ""}
                        </td>
                      );
                    })}
                  </tr>
                  {g.members.map((m) => (
                    <tr key={m.id} className="group">
                      <th scope="row" className="sticky left-0 z-10 border-b border-line bg-paper px-3 py-0 text-left font-normal group-hover:bg-surface/60">
                        <span className={cn("block truncate text-[13px] sm:text-sm", m.id === meId && "font-semibold")}>
                          {m.first_name} {m.last_name}
                        </span>
                      </th>
                      {days.map((day) => (
                        <DayCell
                          key={day}
                          day={day}
                          member={m}
                          rows={byMember.get(m.id) ?? []}
                          off={isOff(day) || !(m.work_days ?? orgWorkDays).includes(isoDow(day))}
                          cellW={cellW}
                          canCreate={canCreateFor || m.id === meId}
                          isMe={m.id === meId}
                        />
                      ))}
                    </tr>
                  ))}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      <Legend rows={rows} />
    </div>
  );
}

function DayCell({
  day,
  member,
  rows,
  off,
  cellW,
  canCreate,
  isMe,
}: {
  day: string;
  member: M;
  rows: CalendarRow[];
  off: boolean;
  cellW: string;
  canCreate: boolean;
  isMe: boolean;
}) {
  const r = rows.find((x) => x.start_date <= day && x.end_date >= day);
  if (!r) {
    return (
      <td className={cn(cellW, "h-10 border-b border-l border-line p-0", off && "bg-surface")}>
        {canCreate && !off && (
          <Link
            href={`/app/absences/nouvelle?du=${day}${isMe ? "" : `&pour=${member.id}`}`}
            className="flex size-full items-center justify-center text-transparent hover:bg-marker-soft hover:text-ink-soft focus-visible:text-ink-soft"
            aria-label={`Poser une absence le ${fmtDate(day, "d MMMM")} pour ${member.first_name} ${member.last_name}`}
          >
            <Plus className="size-3.5" />
          </Link>
        )}
      </td>
    );
  }
  const leftHalf = !(r.start_date === day && r.start_half === "pm");
  const rightHalf = !(r.end_date === day && r.end_half === "am");
  const pending = r.status === "pending";
  const isStart = r.start_date === day;
  const isEnd = r.end_date === day;
  return (
    <td className={cn(cellW, "h-10 border-b border-l border-line p-0", off && "bg-surface")}>
      <Popover>
        <PopoverTrigger
          className="flex size-full items-stretch py-1.5"
          aria-label={`${member.first_name} ${member.last_name} : ${r.label}, ${rangeLabel(r.start_date, r.start_half, r.end_date, r.end_half)}${pending ? " (en attente)" : ""}`}
        >
          <span className={cn("flex-1", leftHalf && "pl-0", !leftHalf && "opacity-0")}>
            <Bar color={r.color} pending={pending} roundLeft={isStart} roundRight={!rightHalf} dim={off} />
          </span>
          <span className={cn("flex-1", !rightHalf && "opacity-0")}>
            <Bar color={r.color} pending={pending} roundLeft={!leftHalf} roundRight={isEnd} dim={off} />
          </span>
        </PopoverTrigger>
        <PopoverContent>
          <p className="font-semibold">
            {member.first_name} {member.last_name}
          </p>
          <p className="mt-1 flex items-center gap-2 text-sm">
            <span className="size-2.5 rounded-[3px]" style={{ background: r.color }} />
            {r.label}
            {r.days != null && <span className="text-muted">({fmtNum(r.days)} j)</span>}
          </p>
          <p className="mt-1 text-sm text-muted">{rangeLabel(r.start_date, r.start_half, r.end_date, r.end_half)}</p>
          {pending && <p className="mt-2 text-xs font-semibold text-wait">En attente de validation</p>}
          {!r.masked && r.days != null && (
            <Link href={`/app/demandes/${r.request_id}`} className="mt-3 inline-block text-sm font-semibold underline underline-offset-4">
              Voir la demande
            </Link>
          )}
        </PopoverContent>
      </Popover>
    </td>
  );
}

function Bar({ color, pending, roundLeft, roundRight, dim }: { color: string; pending: boolean; roundLeft: boolean; roundRight: boolean; dim: boolean }) {
  return (
    <span
      className={cn("block h-full", roundLeft && "ml-0.5 rounded-l-[5px]", roundRight && "mr-0.5 rounded-r-[5px]", pending && "pending-stripes border-y-2")}
      style={
        pending
          ? { color, borderColor: color, backgroundColor: `${color}1f` }
          : { background: color, opacity: dim ? 0.45 : 0.92 }
      }
    />
  );
}

function Legend({ rows }: { rows: CalendarRow[] }) {
  const seen = new Map<string, string>();
  for (const r of rows) if (!seen.has(r.label)) seen.set(r.label, r.color);
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line px-4 py-3 text-xs text-ink-soft">
      {[...seen.entries()].map(([label, color]) => (
        <span key={label} className="flex items-center gap-1.5">
          <span className="h-2.5 w-4 rounded-[3px]" style={{ background: color }} />
          {label}
        </span>
      ))}
      <span className="flex items-center gap-1.5">
        <span className="pending-stripes h-2.5 w-4 rounded-[3px] border border-current text-muted" />
        En attente
      </span>
      <span className="flex items-center gap-1.5">
        <span className="size-1.5 rounded-full bg-marker-strong" /> Jour férié
      </span>
      <span className="flex items-center gap-1.5">
        <span className="rounded-[3px] bg-danger-soft px-1 font-bold text-danger">1/2</span> Effectif minimum non atteint
      </span>
    </div>
  );
}
