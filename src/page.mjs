// Vorlage der Webseite. Liest nur aus content/<lang>.json. Felder mit «_» werden nie angezeigt.
export const SITE = 'https://cv.onurkoc.net';

export const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Platzhalter [OFFEN: …] / [OPEN: …] sichtbar markieren
export const mark = (s) =>
  esc(s).replace(/\[(?:OFFEN|OPEN):[^\]]*\]/g, (m) => `<mark class="offen">${m}</mark>`);

export const ico = (d) =>
  `<svg class="ico" viewBox="0 0 12 12" aria-hidden="true" focusable="false"><path d="${
    { down: 'M6 1v9M2 6.5l4 4 4-4', right: 'M1 6h9M6.5 2l4 4-4 4', plus: 'M6 1v10M1 6h10', minus: 'M1 6h10' }[d]
  }" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>`;

const LI_PATH = 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z';
export const liIcon = () => `<svg class="li" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="${LI_PATH}"/></svg>`;

// Kontakt: E-Mail (mailto), Telefone (tel, Kennung AT/CH), LinkedIn (Logo-Link)
export function contactItems(ct, ui) {
  return [
    `<a href="mailto:${esc(ct.email)}">${esc(ct.email)}</a>`,
    ...ct.phones.map((p) => `<a href="tel:${p.number.replace(/[^+0-9]/g, '')}">${esc(p.number)}</a> (${esc(p.label)})`),
    `<a class="li-link" href="${esc(ct.linkedin)}" aria-label="${esc(ui.linkedin)}">${liIcon()}<span>${esc(ui.linkedin)}</span></a>`,
  ];
}

export const pathFor = (lang) => (lang === 'en' ? '/' : '/de/');

// Zeitraum: end null = laufend
export function period(item, ui, since = false) {
  const { start: s, end: e } = item;
  if (e === null) return since ? `${ui.since} ${s}` : `${s} – ${ui.present}`;
  return s === e ? s : `${s} – ${e}`;
}

function projectArticle(p, ui) {
  const rows = [
    p.cost ? [ui.f_cost, p.cost] : null,
    [ui.f_services, p.services],
    [ui.f_phases, p.phases],
  ]
    .filter(Boolean)
    .map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${mark(v)}</dd></div>`)
    .join('');
  return `<article class="project" id="p-${esc(p.id)}">
  <h3>${esc(p.name)}</h3>
  <p class="project-summary">${mark(p.description)}</p>
  <div class="project-meta">${esc(p.country)} · ${esc(period(p, ui, true))}<br>${mark(p.function)}<br>${esc(ui.f_client)}: ${esc(p.client)}</div>
  <details class="project-more">
    <summary>${esc(ui.details)}</summary>
    <dl>${rows}</dl>
  </details>
</article>`;
}

export function statValue(v) {
  const m = String(v).match(/^(.*?)(\+?)$/);
  return `${esc(m[1])}${m[2] ? '<span class="red">+</span>' : ''}`;
}

export function renderPage(c, otherPdf, A) {
  const { ui, person: P, meta } = c;
  const lang = meta.lang;
  const otherLang = lang === 'en' ? 'de' : 'en';
  const feat = c.projects.filter((p) => p.featured);
  const rest = c.projects.filter((p) => !p.featured);

  const stats = [
    [c.stats.years, ui.stat_years],
    [c.stats.continents, ui.stat_continents],
    [c.stats.projects === 'auto' ? c.projects.length : c.stats.projects, ui.stat_projects],
  ]
    .map(([v, l]) => `<div class="stat"><div class="stat-value">${statValue(v)}</div><div class="stat-label">${esc(l)}</div></div>`)
    .join('\n');

  const career = c.experience
    .map(
      (j, i) =>
        `<li class="job"><span class="job-period${i === 0 ? ' current' : ''}">${esc(period(j, ui))}</span><div><div class="job-employer">${esc(j.company)}, ${esc(j.place)}</div><div class="job-role">${esc(j.role)}</div></div></li>`,
    )
    .join('\n');

  const edu = c.education
    .map((e) => `<li><strong>${esc(e.degree)}</strong>, ${esc(e.year)}<br>${esc(e.school)}<br>${esc(e.focus)}</li>`)
    .join('\n');
  const langs = c.languages.map((l) => `<li>${esc(l.name)}: ${mark(l.level)}</li>`).join('\n');
  const mem = c.memberships.map((m) => `<li>${esc(m)}</li>`).join('');
  const skills = c.profile.key_skills.map((s) => `<li>${esc(s)}</li>`).join('\n');
  const pubs = c.publications
    .map(
      (p) =>
        `<li class="pub"><span class="pub-year">${mark(p.year)}</span><div>${esc(p.authors)}<br><strong>${esc(p.title)}</strong><br>${esc(p.venue)}</div></li>`,
    )
    .join('\n');

  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(meta.title)}</title>
<meta name="description" content="${esc(P.intro)}">
<link rel="canonical" href="${SITE}${pathFor(lang)}">
<link rel="alternate" hreflang="en" href="${SITE}/">
<link rel="alternate" hreflang="de" href="${SITE}/de/">
<link rel="alternate" hreflang="x-default" href="${SITE}/">
<meta property="og:title" content="${esc(meta.title)}">
<meta property="og:description" content="${esc(P.intro)}">
<meta property="og:type" content="website">
<meta property="og:url" content="${SITE}${pathFor(lang)}">
<meta property="og:locale" content="${lang === 'en' ? 'en_GB' : 'de_CH'}">
<meta property="og:image" content="${SITE}/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(P.name)} – ${esc(P.roles.join(', '))}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${SITE}/og.png">
<meta name="theme-color" content="#ffffff">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preload" as="image" type="image/webp" href="${A.img['onur-koc-360.webp']}" imagesrcset="${A.img['onur-koc-360.webp']} 1x, ${A.img['onur-koc-720.webp']} 2x">
<link rel="preload" href="${A.font400}" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="${A.font800}" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${A.css}">
</head>
<body>
<a class="skip" href="#main">${esc(ui.skip)}</a>
<div class="wrap">
<header class="site-header">
  <a class="brand" href="#top"><span class="mark" aria-hidden="true"></span>${esc(P.name)}</a>
  <nav aria-label="${esc(ui.nav_label)}">
    <a href="#work">${esc(ui.nav_work)}</a>
    <a href="#career">${esc(ui.nav_career)}</a>
    <a href="#profile">${esc(ui.nav_profile)}</a>
    <a href="#cv">${esc(ui.nav_cv)}</a>
  </nav>
  <div class="lang" role="group" aria-label="${esc(ui.lang_label)}">
    <a href="${pathFor('en')}" hreflang="en" lang="en"${lang === 'en' ? ' aria-current="page"' : ''}>EN</a>
    <a href="${pathFor('de')}" hreflang="de" lang="de"${lang === 'de' ? ' aria-current="page"' : ''}>DE</a>
  </div>
</header>

<main id="main">
<section id="top" class="hero">
  <div class="hero-main">
    <h1>${esc(P.name)}</h1>
    <div class="hero-info">
      <p class="hero-id">${P.roles.map(esc).join('<br>')}<br>${esc(P.location)}</p>
      <p class="hero-summary">${esc(P.intro)}</p>
      <div class="hero-actions">
        <a class="btn" href="/${esc(meta.pdf_file)}" download>${esc(ui.download)}${ico('down')}</a>
        <a class="link-strong" href="#work">${esc(ui.featured)}${ico('right')}</a>
      </div>
    </div>
  </div>
  <picture class="hero-photo">
    <source type="image/webp" srcset="${A.img['onur-koc-360.webp']} 1x, ${A.img['onur-koc-720.webp']} 2x">
    <img src="${A.img['onur-koc-360.jpg']}" srcset="${A.img['onur-koc-360.jpg']} 1x, ${A.img['onur-koc-720.jpg']} 2x" width="360" height="315" alt="${esc(ui.photo_alt)}" fetchpriority="high">
  </picture>
</section>

<section class="stats" aria-label="${esc(ui.stats_label)}">
${stats}
</section>

<section id="work" class="block">
  <div class="block-grid">
    <h2>${esc(ui.featured)}</h2>
    <div class="block-body">
${feat.map((p) => projectArticle(p, ui)).join('\n')}
      <details class="all">
        <summary><span class="when-closed">${esc(ui.all_projects)} (${c.projects.length})${ico('plus')}</span><span class="when-open">${esc(ui.show_fewer)}${ico('minus')}</span></summary>
${rest.map((p) => projectArticle(p, ui)).join('\n')}
      </details>
    </div>
  </div>
</section>

<section id="career" class="block">
  <div class="block-grid">
    <h2>${esc(ui.career)}</h2>
    <ol class="block-body jobs">
${career}
    </ol>
  </div>
</section>

<section id="profile" class="block">
  <div class="block-grid">
    <h2>${esc(ui.profile)}</h2>
    <div class="block-body prose"><p>${mark(c.profile.summary)}</p></div>
  </div>
  <div class="cols">
    <div><h2 class="h-small">${esc(ui.key_skills)}</h2><ul class="plain skills">${skills}</ul></div>
    <div><h2 class="h-small">${esc(ui.education)}</h2><ul class="plain">${edu}</ul></div>
    <div><h2 class="h-small">${esc(ui.languages)}</h2><ul class="plain">${langs}</ul>
      <h2 class="h-small h-next">${esc(ui.memberships)}</h2><ul class="plain">${mem}</ul></div>
  </div>
</section>

<section id="publications" class="block">
  <div class="block-grid">
    <h2>${esc(ui.publications)}</h2>
    <ul class="block-body plain pubs">
${pubs}
    </ul>
  </div>
</section>
</main>
</div>

<section id="cv" class="cv-band">
  <div class="cv-inner">
    <h2>${esc(ui.cv_heading)}</h2>
    <div class="cv-actions">
      <span class="cv-label">${esc(ui.pdf_download)}</span>
      <div class="cv-buttons">
        <a class="btn-white" href="/${esc(meta.pdf_file)}" download>${lang === 'en' ? 'English' : 'Deutsch'}${ico('down')}</a>
        <a class="btn-outline" href="/${esc(otherPdf)}" download hreflang="${otherLang}" lang="${otherLang}">${lang === 'en' ? 'Deutsch' : 'English'}${ico('down')}</a>
      </div>
    </div>
    <div class="cv-contact">
      <span class="cv-label">${esc(ui.contact)}</span>
      <ul>${contactItems(P.contact, ui).map((i) => `<li>${i}</li>`).join('')}</ul>
    </div>
  </div>
</section>
<footer class="site-footer"><div class="wrap"><p>${esc(P.name)} · ${esc(ui.updated)} ${esc(meta.stand)}</p></div></footer>
</body>
</html>
`;
}
