import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import type { Category, Role } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Date du jour (AAAA-MM-JJ) dans le fuseau de l'entreprise */
export function todayIn(timezone: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export function d(iso: string) {
  return parseISO(iso.length === 10 ? `${iso}T12:00:00` : iso);
}

export function fmtDate(iso: string | null | undefined, pattern = "d MMM yyyy") {
  if (!iso) return "";
  return format(d(iso), pattern, { locale: fr });
}

export function fmtDay(iso: string) {
  return format(d(iso), "EEE d MMM", { locale: fr });
}

export function fmtDateTime(iso: string | null | undefined) {
  if (!iso) return "";
  return format(parseISO(iso), "d MMM yyyy 'à' HH'h'mm", { locale: fr });
}

/** 2,5 / 10 / 0,5 : nombres à la française sans zéros inutiles */
export function fmtNum(n: number | null | undefined, digits = 2) {
  const v = Number(n ?? 0);
  return v.toLocaleString("fr-FR", { maximumFractionDigits: digits, minimumFractionDigits: 0 });
}

export function fmtDays(n: number | null | undefined) {
  const v = Number(n ?? 0);
  return `${fmtNum(v)} ${Math.abs(v) <= 1 ? "jour" : "jours"}`;
}

export function rangeLabel(start: string, startHalf: string, end: string, endHalf: string) {
  const s = fmtDate(start, "EEE d MMM");
  const e = fmtDate(end, "EEE d MMM yyyy");
  if (start === end) {
    const half = startHalf === "pm" ? " (après-midi)" : endHalf === "am" ? " (matin)" : "";
    return `${fmtDate(start, "EEEE d MMMM yyyy")}${half}`;
  }
  return `Du ${s}${startHalf === "pm" ? " après-midi" : ""} au ${e}${endHalf === "am" ? " midi" : ""}`;
}

export const roleLabels: Record<Role, string> = {
  employee: "Salarié",
  manager: "Manager",
  hr: "RH",
  admin: "Administrateur",
};

export const statusLabels = {
  pending: "En attente",
  approved: "Validée",
  rejected: "Refusée",
  cancelled: "Annulée",
} as const;

export const categoryLabels: Record<Category, string> = {
  paid_leave: "Congés payés",
  rtt: "RTT",
  sick: "Maladie",
  sick_pro: "Accident du travail / maladie pro.",
  family: "Événement familial",
  remote: "Télétravail",
  unpaid: "Sans solde",
  recovery: "Récupération",
  holiday_comp: "Fériés garantis",
  other: "Autre",
};

export const contractLabels: Record<string, string> = {
  cdi: "CDI",
  cdd: "CDD",
  saisonnier: "Saisonnier",
  extra: "Extra",
  apprentissage: "Apprentissage",
  stage: "Stage",
  interim: "Intérim",
};

export const regionLabels: Record<string, string> = {
  metropole: "France métropolitaine",
  alsace_moselle: "Alsace-Moselle",
  guadeloupe: "Guadeloupe",
  martinique: "Martinique",
  guyane: "Guyane",
  reunion: "La Réunion",
  mayotte: "Mayotte",
};

export const weekDays = [
  { n: 1, short: "Lun", long: "Lundi" },
  { n: 2, short: "Mar", long: "Mardi" },
  { n: 3, short: "Mer", long: "Mercredi" },
  { n: 4, short: "Jeu", long: "Jeudi" },
  { n: 5, short: "Ven", long: "Vendredi" },
  { n: 6, short: "Sam", long: "Samedi" },
  { n: 7, short: "Dim", long: "Dimanche" },
];

export function initials(first: string, last: string) {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

/** Libellé d'une période de référence */
export function periodLabel(periodStart: string, kind: "cp" | "civil") {
  const start = d(periodStart);
  if (kind === "civil" || start.getMonth() === 0) return `Année ${start.getFullYear()}`;
  const end = new Date(start);
  end.setFullYear(end.getFullYear() + 1);
  end.setDate(end.getDate() - 1);
  return `${format(start, "MMM yyyy", { locale: fr })} à ${format(end, "MMM yyyy", { locale: fr })}`;
}

export function addDaysIso(iso: string, n: number) {
  const x = d(iso);
  x.setDate(x.getDate() + n);
  return format(x, "yyyy-MM-dd");
}

export function isoDow(iso: string) {
  const day = d(iso).getDay();
  return day === 0 ? 7 : day;
}

/** Nombre de jours entre deux dates AAAA-MM-JJ (b - a) */
export function daysBetween(a: string, b: string) {
  return Math.round((Date.UTC(+b.slice(0, 4), +b.slice(5, 7) - 1, +b.slice(8, 10)) - Date.UTC(+a.slice(0, 4), +a.slice(5, 7) - 1, +a.slice(8, 10))) / 86400000);
}
