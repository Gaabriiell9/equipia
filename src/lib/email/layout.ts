import { brand } from "../config";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Gabarit HTML d'e-mail compatible avec les principaux clients (tableaux, styles en ligne) */
export function emailLayout(p: {
  preheader: string;
  heading: string;
  paragraphs: string[];
  cta?: { label: string; url: string };
  footer?: string;
}) {
  const paras = p.paragraphs
    .map((t) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.55;color:#33415e">${esc(t)}</p>`)
    .join("");
  const button = p.cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px 0 8px"><tr><td style="background:#f2c230;border-radius:8px">
        <a href="${esc(p.cta.url)}" style="display:inline-block;padding:12px 22px;font-weight:700;font-size:15px;color:#14213d;text-decoration:none">${esc(p.cta.label)}</a>
      </td></tr></table>
      <p style="margin:12px 0 0;font-size:12px;color:#657189;word-break:break-all">Si le bouton ne fonctionne pas : ${esc(p.cta.url)}</p>`
    : "";
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(p.heading)}</title></head>
<body style="margin:0;background:#f3f5f8;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
<span style="display:none;max-height:0;overflow:hidden">${esc(p.preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f5f8;padding:28px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #dde2ea;border-radius:14px">
<tr><td style="padding:22px 28px;border-bottom:1px solid #dde2ea">
<span style="display:inline-block;width:12px;height:12px;background:#f2c230;border-radius:3px;margin-right:8px;vertical-align:middle"></span>
<span style="font-weight:700;font-size:17px;color:#14213d;vertical-align:middle">${esc(brand.name)}</span></td></tr>
<tr><td style="padding:28px">
<h1 style="margin:0 0 16px;font-size:22px;line-height:1.25;color:#14213d">${esc(p.heading)}</h1>
${paras}${button}
</td></tr>
<tr><td style="padding:16px 28px;border-top:1px solid #dde2ea;font-size:12px;color:#657189">${esc(p.footer ?? "")}<br>${esc(brand.name)}, édité par ${esc(brand.legalEntity)}.</td></tr>
</table></td></tr></table></body></html>`;
}
