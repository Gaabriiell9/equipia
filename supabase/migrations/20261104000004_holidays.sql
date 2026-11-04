-- Jours fériés légaux (art. L3133-1 C. trav.) + Alsace-Moselle et outre-mer, 2020-2040
-- Générés en SQL (calcul de Pâques par l'algorithme de Meeus/Jones/Butcher)
create or replace function app.easter(y int)
returns date language plpgsql immutable set search_path = '' as $$
declare a int; b int; c int; d int; e int; f int; g int; h int; i int; k int; l int; m int; mo int; da int;
begin
  a := y % 19; b := y / 100; c := y % 100; d := b / 4; e := b % 4; f := (b + 8) / 25;
  g := (b - f + 1) / 3; h := (19 * a + b - d - g + 15) % 30; i := c / 4; k := c % 4;
  l := (32 + 2 * e + 2 * i - h - k) % 7; m := (a + 11 * h + 22 * l) / 451;
  mo := (h + l - 7 * m + 114) / 31; da := ((h + l - 7 * m + 114) % 31) + 1;
  return make_date(y, mo, da);
end $$;

insert into public.public_holidays(region, day, name)
select r.region, x.day, x.name
from (values ('metropole'), ('alsace_moselle'), ('guadeloupe'), ('martinique'), ('guyane'), ('reunion'), ('mayotte')) r(region)
cross join generate_series(2020, 2040) y
cross join lateral (
  values
    (make_date(y, 1, 1), 'Jour de l''an', null),
    (app.easter(y) + 1, 'Lundi de Pâques', null),
    (make_date(y, 5, 1), 'Fête du Travail', null),
    (make_date(y, 5, 8), 'Victoire 1945', null),
    (app.easter(y) + 39, 'Ascension', null),
    (app.easter(y) + 50, 'Lundi de Pentecôte', null),
    (make_date(y, 7, 14), 'Fête nationale', null),
    (make_date(y, 8, 15), 'Assomption', null),
    (make_date(y, 11, 1), 'Toussaint', null),
    (make_date(y, 11, 11), 'Armistice 1918', null),
    (make_date(y, 12, 25), 'Noël', null),
    (app.easter(y) - 2, 'Vendredi saint', 'alsace_moselle'),
    (make_date(y, 12, 26), 'Saint-Étienne', 'alsace_moselle'),
    (make_date(y, 5, 27), 'Abolition de l''esclavage', 'guadeloupe'),
    (make_date(y, 5, 22), 'Abolition de l''esclavage', 'martinique'),
    (make_date(y, 6, 10), 'Abolition de l''esclavage', 'guyane'),
    (make_date(y, 12, 20), 'Abolition de l''esclavage', 'reunion'),
    (make_date(y, 4, 27), 'Abolition de l''esclavage', 'mayotte')
) x(day, name, only_region)
where x.only_region is null or x.only_region = r.region
on conflict do nothing;
