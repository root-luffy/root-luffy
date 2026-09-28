// Generates assets/generated/stats.svg, an animated "ship's log" card built from
// live GitHub data. Runs in GitHub Actions (see .github/workflows/profile.yml).
//
//   GITHUB_TOKEN=... node scripts/generate-stats.mjs     # real data
//   node scripts/generate-stats.mjs --mock               # sample data, for local design work

import { mkdirSync, writeFileSync } from "node:fs";

const LOGIN = process.env.PROFILE_LOGIN || "root-luffy";
const OUT = "assets/generated/stats.svg";

const QUERY = `
query($login: String!) {
  user(login: $login) {
    followers { totalCount }
    pullRequests { totalCount }
    repositories(first: 100, ownerAffiliations: OWNER, privacy: PUBLIC, isFork: false) {
      totalCount
      nodes {
        stargazerCount
        languages(first: 10, orderBy: { field: SIZE, direction: DESC }) {
          edges { size node { name color } }
        }
      }
    }
    contributionsCollection {
      totalCommitContributions
      restrictedContributionsCount
      contributionCalendar {
        totalContributions
        weeks { contributionDays { contributionCount } }
      }
    }
  }
}`;

async function fetchData() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GITHUB_TOKEN is not set (use --mock for sample data)");
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: { Authorization: `bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: QUERY, variables: { login: LOGIN } }),
  });
  const json = await res.json();
  if (json.errors) throw new Error(JSON.stringify(json.errors));
  return json.data.user;
}

function mockData() {
  const weeks = Array.from({ length: 53 }, (_, w) => ({
    contributionDays: Array.from({ length: 7 }, (_, d) => ({
      contributionCount: Math.max(0, Math.round(3 * Math.sin(w / 5) + 2 * Math.cos(w * d) + 2)),
    })),
  }));
  const lang = (name, color, size) => ({ size, node: { name, color } });
  return {
    followers: { totalCount: 1 },
    pullRequests: { totalCount: 4 },
    repositories: {
      totalCount: 6,
      nodes: [
        { stargazerCount: 1, languages: { edges: [lang("Rust", "#dea584", 90000), lang("TypeScript", "#3178c6", 70000)] } },
        { stargazerCount: 0, languages: { edges: [lang("Shell", "#89e051", 30000)] } },
        { stargazerCount: 0, languages: { edges: [lang("PowerShell", "#012456", 12000), lang("AutoHotkey", "#6594b9", 4000)] } },
        { stargazerCount: 0, languages: { edges: [lang("JavaScript", "#f1e05a", 20000)] } },
      ],
    },
    contributionsCollection: {
      totalCommitContributions: 214,
      restrictedContributionsCount: 37,
      contributionCalendar: { totalContributions: 312, weeks },
    },
  };
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const fmt = (n) => (n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, "") + "k" : String(n));

function summarize(user) {
  const repos = user.repositories.nodes;
  const stars = repos.reduce((s, r) => s + r.stargazerCount, 0);

  const bytes = new Map();
  for (const r of repos) {
    for (const { size, node } of r.languages.edges) {
      const cur = bytes.get(node.name) || { size: 0, color: node.color || "#94a3b8" };
      cur.size += size;
      bytes.set(node.name, cur);
    }
  }
  const total = [...bytes.values()].reduce((s, l) => s + l.size, 0) || 1;
  let langs = [...bytes.entries()]
    .map(([name, l]) => ({ name, color: l.color, pct: (l.size / total) * 100 }))
    .sort((a, b) => b.pct - a.pct);
  if (langs.length > 6) {
    const rest = langs.slice(5).reduce((s, l) => s + l.pct, 0);
    langs = [...langs.slice(0, 5), { name: "Other", color: "#475569", pct: rest }];
  }

  const cc = user.contributionsCollection;
  const weekly = cc.contributionCalendar.weeks.map((w) =>
    w.contributionDays.reduce((s, d) => s + d.contributionCount, 0),
  );

  return {
    contributions: cc.contributionCalendar.totalContributions,
    commits: cc.totalCommitContributions + cc.restrictedContributionsCount,
    repos: user.repositories.totalCount,
    stars,
    prs: user.pullRequests.totalCount,
    langs,
    weekly,
  };
}

function render(s) {
  const W = 1200, H = 380;
  const today = new Date().toISOString().slice(0, 10);

  // Stat tiles
  const tiles = [
    { label: "contributions", sub: "last 12 months", value: s.contributions, color: "#fbbf24" },
    { label: "commits", sub: "last 12 months", value: s.commits, color: "#f87171" },
    { label: "public repos", sub: "built from scratch", value: s.repos, color: "#e879f9" },
    { label: "stars earned", sub: "across my repos", value: s.stars, color: "#34d399" },
  ];
  const tileSvg = tiles
    .map((t, i) => {
      const x = 40 + (i % 2) * 250, y = 78 + Math.floor(i / 2) * 100;
      return `
    <g class="rise" style="animation-delay:${0.15 + i * 0.15}s">
      <rect x="${x}" y="${y}" width="232" height="84" rx="14" fill="#111831" stroke="#222c4d"/>
      <rect x="${x}" y="${y + 18}" width="4" height="48" rx="2" fill="${t.color}"/>
      <text x="${x + 22}" y="${y + 46}" class="num" fill="${t.color}">${esc(fmt(t.value))}</text>
      <text x="${x + 22}" y="${y + 68}" class="lbl">${esc(t.label)} <tspan class="sub">· ${esc(t.sub)}</tspan></text>
    </g>`;
    })
    .join("");

  // Language bar
  const barX = 580, barY = 108, barW = 580;
  let acc = 0;
  const segs = s.langs
    .map((l, i) => {
      const w = (l.pct / 100) * barW;
      const seg = `<rect x="${(barX + acc).toFixed(1)}" y="${barY}" width="${Math.max(w - 2, 1).toFixed(1)}" height="16" fill="${l.color}" class="grow" style="animation-delay:${0.4 + i * 0.12}s"/>`;
      acc += w;
      return seg;
    })
    .join("");
  const legend = s.langs
    .map((l, i) => {
      const x = barX + (i % 3) * 196, y = barY + 52 + Math.floor(i / 3) * 34;
      return `
    <g class="rise" style="animation-delay:${0.6 + i * 0.1}s">
      <circle cx="${x + 6}" cy="${y - 5}" r="6" fill="${l.color}"/>
      <text x="${x + 20}" y="${y}" class="leg">${esc(l.name)} <tspan class="sub">${l.pct.toFixed(1)}%</tspan></text>
    </g>`;
    })
    .join("");

  // Contribution wave (weekly totals over the year)
  const wx = 40, wy = 300, ww = W - 80, wh = 56;
  const max = Math.max(1, ...s.weekly);
  const pts = s.weekly.map((v, i) => [wx + (i / Math.max(1, s.weekly.length - 1)) * ww, wy + wh - (v / max) * wh]);
  let line = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    const cx = (x0 + x1) / 2;
    line += ` C${cx.toFixed(1)} ${y0.toFixed(1)} ${cx.toFixed(1)} ${y1.toFixed(1)} ${x1.toFixed(1)} ${y1.toFixed(1)}`;
  }
  const area = `${line} L${wx + ww} ${wy + wh} L${wx} ${wy + wh} Z`;
  const last = pts[pts.length - 1];

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="GitHub stats for ${LOGIN}: ${s.contributions} contributions and ${s.commits} commits in the last year, ${s.repos} public repos, ${s.stars} stars">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b1026"/><stop offset="1" stop-color="#101a3d"/></linearGradient>
    <linearGradient id="wave" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fbbf24"/><stop offset=".55" stop-color="#f87171"/><stop offset="1" stop-color="#e879f9"/></linearGradient>
    <linearGradient id="waveFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f87171" stop-opacity=".35"/><stop offset="1" stop-color="#f87171" stop-opacity="0"/></linearGradient>
    <clipPath id="barClip"><rect x="${barX}" y="${barY}" width="${barW}" height="16" rx="8"/></clipPath>
    <style>
      text { font-family: "Segoe UI", Inter, Helvetica, Arial, sans-serif; }
      .mono, .num { font-family: "Cascadia Code", "JetBrains Mono", Consolas, Menlo, monospace; }
      .title { font-size: 20px; font-weight: 700; fill: #e2e8f0; }
      .muted { font-size: 13px; fill: #64748b; }
      .num { font-size: 32px; font-weight: 700; }
      .lbl { font-size: 14px; fill: #cbd5e1; }
      .leg { font-size: 15px; fill: #cbd5e1; }
      .sub { fill: #64748b; font-size: 13px; }
      .rise { opacity: 0; animation: rise .7s ease-out forwards; }
      @keyframes rise { from { opacity: 0; transform: translateY(10px) } to { opacity: 1; transform: none } }
      .grow { transform-box: fill-box; transform-origin: left; transform: scaleX(0); animation: grow .9s cubic-bezier(.2,.8,.2,1) forwards; }
      @keyframes grow { to { transform: scaleX(1) } }
      .draw { stroke-dasharray: 3000; stroke-dashoffset: 3000; animation: draw 3s ease-out .6s forwards; }
      @keyframes draw { to { stroke-dashoffset: 0 } }
      .fill { opacity: 0; animation: fade 1.5s ease-out 2s forwards; }
      @keyframes fade { to { opacity: 1 } }
      .ping { transform-box: fill-box; transform-origin: center; animation: ping 2s ease-out 3.4s infinite; opacity: 0; }
      @keyframes ping { 0% { opacity: .8; transform: scale(1) } 100% { opacity: 0; transform: scale(3.2) } }
      .dot { opacity: 0; animation: fade .4s ease-out 3.4s forwards; }
    </style>
  </defs>
  <rect width="${W}" height="${H}" rx="22" fill="url(#bg)"/>
  <rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="21" fill="none" stroke="#1f2a4d"/>

  <text x="40" y="50" class="title">⚓ Ship's log</text>
  <text x="${W - 40}" y="50" text-anchor="end" class="muted mono">updated ${today} · auto-generated daily</text>

  ${tileSvg}

  <text x="${barX}" y="${barY - 16}" class="lbl rise" style="animation-delay:.3s">Languages across my repos</text>
  <rect x="${barX}" y="${barY}" width="${barW}" height="16" rx="8" fill="#1a2242"/>
  <g clip-path="url(#barClip)">${segs}</g>
  ${legend}

  <text x="40" y="${wy - 12}" class="muted mono">contribution tide · last 52 weeks</text>
  <path d="${area}" fill="url(#waveFill)" class="fill"/>
  <path d="${line}" fill="none" stroke="url(#wave)" stroke-width="3" stroke-linecap="round" class="draw"/>
  <circle cx="${last[0].toFixed(1)}" cy="${last[1].toFixed(1)}" r="5" fill="#e879f9" class="ping"/>
  <circle cx="${last[0].toFixed(1)}" cy="${last[1].toFixed(1)}" r="5" fill="#e879f9" class="dot"/>
</svg>
`;
}

const user = process.argv.includes("--mock") ? mockData() : await fetchData();
mkdirSync("assets/generated", { recursive: true });
writeFileSync(OUT, render(summarize(user)));
console.log(`wrote ${OUT}`);
