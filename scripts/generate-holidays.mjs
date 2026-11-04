// Génère la migration des jours fériés français (2020-2040) pour chaque territoire.
// Usage : node scripts/generate-holidays.mjs > supabase/migrations/20261104000004_holidays.sql
function easter(year) {
  // Algorithme de Meeus/Jones/Butcher (calendrier grégorien)
  const a = year % 19, b = Math.floor(year / 100), c = year % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}
const iso = (d) => d.toISOString().slice(0, 10);
const plus = (d, n) => new Date(d.getTime() + n * 86400000);
const fixed = (y, m, d) => new Date(Date.UTC(y, m - 1, d));

function national(y) {
  const e = easter(y);
  return [
    [fixed(y, 1, 1), "Jour de l'an"],
    [plus(e, 1), 'Lundi de Pâques'],
    [fixed(y, 5, 1), 'Fête du Travail'],
    [fixed(y, 5, 8), 'Victoire 1945'],
    [plus(e, 39), 'Ascension'],
    [plus(e, 50), 'Lundi de Pentecôte'],
    [fixed(y, 7, 14), 'Fête nationale'],
    [fixed(y, 8, 15), 'Assomption'],
    [fixed(y, 11, 1), 'Toussaint'],
    [fixed(y, 11, 11), 'Armistice 1918'],
    [fixed(y, 12, 25), 'Noël'],
  ];
}
const extra = {
  metropole: () => [],
  alsace_moselle: (y) => [[plus(easter(y), -2), 'Vendredi saint'], [fixed(y, 12, 26), 'Saint-Étienne']],
  guadeloupe: (y) => [[fixed(y, 5, 27), "Abolition de l'esclavage"]],
  martinique: (y) => [[fixed(y, 5, 22), "Abolition de l'esclavage"]],
  guyane: (y) => [[fixed(y, 6, 10), "Abolition de l'esclavage"]],
  reunion: (y) => [[fixed(y, 12, 20), "Abolition de l'esclavage"]],
  mayotte: (y) => [[fixed(y, 4, 27), "Abolition de l'esclavage"]],
};
const rows = [];
for (const [region, fn] of Object.entries(extra)) {
  for (let y = 2020; y <= 2040; y++) {
    const seen = new Set();
    for (const [d, name] of [...national(y), ...fn(y)]) {
      const k = iso(d);
      if (seen.has(k)) continue;
      seen.add(k);
      rows.push(`('${region}','${k}','${name.replace(/'/g, "''")}')`);
    }
  }
}
console.log('-- Jours fériés légaux (art. L3133-1 C. trav.) + spécificités Alsace-Moselle et outre-mer, 2020-2040');
console.log('-- Fichier généré par scripts/generate-holidays.mjs');
console.log('insert into public.public_holidays(region, day, name) values');
console.log(rows.join(',\n') + '\non conflict do nothing;');
