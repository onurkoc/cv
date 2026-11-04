// Druckansicht (A4) für das PDF. Liest nur aus content/<lang>.json.
import { esc, mark, period, contactItems } from './page.mjs';

const cssStr = (s) => String(s).replace(/[\\"]/g, '\\$&').replace(/\n/g, ' ');

export function renderPrint(c, css, photoUrl) {
  const { ui, person: P, meta } = c;

  const refArticle = (p) => {
      const rows = [
        [ui.f_client, p.client],
        p.cost ? [ui.f_cost, p.cost] : null,
        [ui.f_project, p.description],
        [ui.f_services, p.services],
        [ui.f_phases, p.phases],
      ]
        .filter(Boolean)
        .map(([k, v]) => `<tr><th>${esc(k)}</th><td>${mark(v)}</td></tr>`)
        .join('');
      return `<article class="ref">
  <div class="ref-head"><span class="ref-period">${esc(period(p, ui, true))}</span><span class="ref-role">${esc(ui.f_function)}: ${mark(p.function)}</span></div>
  <h3>${esc(p.name)} <span class="ref-place">/ ${esc(p.country)}</span></h3>
  <table>${rows}</table>
</article>`;
  };
  const featured = c.projects.filter((p) => p.featured).map(refArticle).join('\n');
  const others = c.projects.filter((p) => !p.featured).map(refArticle).join('\n');

  const career = c.experience
    .map(
      (j) =>
        `<li><span class="per">${esc(period(j, ui))}</span><div><strong>${esc(j.company)}</strong>, ${esc(j.place)}<br>${esc(j.role)}</div></li>`,
    )
    .join('');
  const edu = c.education
    .map((e) => `<li><span class="per">${esc(e.year)}</span><div><strong>${esc(e.degree)}</strong><br>${esc(e.school)}<br>${esc(e.focus)}</div></li>`)
    .join('');
  const langs = c.languages.map((l) => `<li>${esc(l.name)}: ${mark(l.level)}</li>`).join('');
  const mem = c.memberships.map((m) => `<li>${esc(m)}</li>`).join('');
  const skills = c.profile.key_skills.map((s) => `<li>${esc(s)}</li>`).join('');
  const pubs = c.publications
    .map(
      (p) =>
        `<li><span class="per">${mark(p.year)}</span><div>${esc(p.authors)}<br><strong>${esc(p.title)}</strong><br>${esc(p.venue)}</div></li>`,
    )
    .join('');

  const per = P.personal;
  const personal =
    per && per.visibility === 'pdf'
      ? `<h2>${esc(ui.personal)}</h2><dl class="pers">${[
          [ui.birth_date, per.birth_date],
          [ui.nationality, per.nationality],
          [ui.marital_status, per.marital_status],
          [ui.driving_licence, per.driving_licence],
        ].map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>`
      : '';

  const footerLeft = `${P.name} – ${ui.cv_heading}  ·  ${ui.stand_label} ${meta.stand}`;
  return `<!doctype html>
<html lang="${meta.lang}">
<head>
<meta charset="utf-8">
<title>${esc(meta.title)}</title>
<style>
@page{size:A4;margin:16mm 16mm 20mm;
  @bottom-left{content:"${cssStr(footerLeft)}";font:400 7.5pt "Inter Tight",sans-serif;color:#6b6b6b}
  @bottom-right{content:"${cssStr(ui.page)} " counter(page) " ${cssStr(ui.of)} " counter(pages);font:400 7.5pt "Inter Tight",sans-serif;color:#6b6b6b}
}
${css}
</style>
</head>
<body>
<header class="top">
  <div class="top-bar"></div>
  <div class="top-row">
    <div class="top-text">
      <h1><span class="mark"></span>${esc(P.name)}</h1>
      <div class="top-meta">
        <div>${P.roles.map(esc).join('<br>')}<br>${esc(P.location)}</div>
        <ul class="contact">${contactItems(P.contact, ui).map((i) => `<li>${i}</li>`).join('')}</ul>
      </div>
    </div>
    <img class="photo" src="${photoUrl}" alt="">
  </div>
  <p class="lead">${esc(P.intro)}</p>
</header>

<section class="two">
  <div>
    <h2>${esc(ui.education)}</h2><ul class="tl">${edu}</ul>
    <h2>${esc(ui.languages)}</h2><ul>${langs}</ul>
    ${personal}
    <h2>${esc(ui.memberships)}</h2><ul>${mem}</ul>
  </div>
  <div>
    <h2>${esc(ui.profile)}</h2>
    <p>${mark(c.profile.summary)}</p>
    <h2>${esc(ui.career)}</h2><ul class="tl cur">${career}</ul>
    <h2>${esc(ui.key_skills)}</h2><ul class="skills">${skills}</ul>
  </div>
</section>

<section class="refs first">
  <h2 class="big">${esc(ui.featured)}</h2>
${featured}
</section>

<section class="refs">
  <h2 class="big">${esc(ui.all_projects)}</h2>
${others}
</section>

<section class="pubs">
  <h2 class="big">${esc(ui.publications)}</h2>
  <ul class="tl">${pubs}</ul>
</section>
</body>
</html>
`;
}
