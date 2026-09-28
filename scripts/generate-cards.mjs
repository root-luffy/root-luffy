// Generates the animated project cards in assets/cards/.
//   node scripts/generate-cards.mjs

import { mkdirSync, writeFileSync } from "node:fs";

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

// Small looping illustration for the top-right corner of each card (drawn in a 120x90 box).
const art = {
  agentgate: (a, b) => `
    <path d="M6 30 H44 M6 60 H44 M76 45 H114" stroke="#26304f" stroke-width="2"/>
    <rect x="48" y="12" width="8" height="66" rx="3" fill="${a}"/>
    <rect x="64" y="12" width="8" height="66" rx="3" fill="${a}"/>
    <path d="M46 14 Q60 -2 74 14" fill="none" stroke="${a}" stroke-width="4"/>
    <circle r="4" fill="${a}"><animateMotion dur="2.4s" repeatCount="indefinite" path="M6 30 H44 L60 45 H114"/></circle>
    <circle r="4" fill="#f87171">
      <animateMotion dur="2.4s" begin="1.2s" repeatCount="indefinite" keyPoints="0;1;0" keyTimes="0;.5;1" calcMode="linear" path="M6 60 H42"/>
    </circle>
    <text x="60" y="89" text-anchor="middle" font-size="10" fill="#f87171" font-family="Consolas, monospace">403</text>`,
  upsidedown: (a, b) => `
    <g transform="translate(60 45)">
      <rect x="-40" y="-30" width="80" height="54" rx="6" fill="#0b0c1a" stroke="#4b4d7a" stroke-width="2"/>
      <g>
        <rect x="-35" y="-25" width="70" height="44" rx="3" fill="${a}">
          <animate attributeName="fill" values="${a};${a};${b};${b};${a}" keyTimes="0;.45;.5;.95;1" dur="4s" repeatCount="indefinite"/>
        </rect>
        <animateTransform attributeName="transform" type="scale" values="1 1;1 1;1 0;1 1;1 1;1 0;1 1" keyTimes="0;.4;.45;.5;.9;.95;1" dur="4s" repeatCount="indefinite"/>
      </g>
      <rect x="-8" y="24" width="16" height="8" fill="#2a2b4d"/>
      <rect x="-18" y="32" width="36" height="4" rx="2" fill="#2a2b4d"/>
    </g>`,
  ghostty: (a, b) => `
    <rect x="4" y="8" width="112" height="74" rx="8" fill="#0b0c1a" stroke="#26304f" stroke-width="2"/>
    <text x="14" y="36" font-size="13" fill="${a}" font-family="Consolas, monospace">~ ❯</text>
    <rect x="44" y="25" width="8" height="14" fill="#e2e8f0"><animate attributeName="opacity" values="1;0;1" dur="1s" calcMode="discrete" repeatCount="indefinite"/></rect>
    <g>
      <path d="M78 70 V50 a14 14 0 0 1 28 0 V70 l-4.7 -5 -4.7 5 -4.7 -5 -4.7 5 -4.6 -5 z" fill="#e0e7ff"/>
      <circle cx="87" cy="52" r="2.6" fill="#0b0c1a"/><circle cx="97" cy="52" r="2.6" fill="#0b0c1a"/>
      <animateTransform attributeName="transform" type="translate" values="0 0;0 -6;0 0" dur="2.6s" repeatCount="indefinite"/>
    </g>`,
  cloudnest: (a, b) => `
    <g>
      <path d="M30 52 a16 16 0 0 1 8 -30 a22 22 0 0 1 40 4 a14 14 0 0 1 12 26 z" fill="#1c2748" stroke="${a}" stroke-width="2"/>
      <animateTransform attributeName="transform" type="translate" values="-4 0;4 0;-4 0" dur="6s" repeatCount="indefinite"/>
    </g>
    <path d="M22 70 Q60 94 98 70" fill="none" stroke="#b45309" stroke-width="5" stroke-linecap="round"/>
    <g font-family="Segoe UI, Arial, sans-serif" font-size="9" font-weight="700" text-anchor="middle" fill="#0d1224">
      <g><ellipse cx="44" cy="66" rx="9" ry="11" fill="${a}"/><text x="44" y="69">S3</text>
        <animateTransform attributeName="transform" type="translate" values="0 0;0 -3;0 0" dur="1.8s" repeatCount="indefinite"/></g>
      <g><ellipse cx="60" cy="62" rx="10" ry="13" fill="${b}"/><text x="60" y="66">λ</text>
        <animateTransform attributeName="transform" type="translate" values="0 0;0 -3;0 0" dur="1.8s" begin=".3s" repeatCount="indefinite"/></g>
      <g><ellipse cx="76" cy="66" rx="9" ry="11" fill="#a78bfa"/><text x="76" y="69">SQS</text>
        <animateTransform attributeName="transform" type="translate" values="0 0;0 -3;0 0" dur="1.8s" begin=".6s" repeatCount="indefinite"/></g>
    </g>`,
};

function card({ id, name, lines, tags, lang, langColor, a, b, glyph }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 580 210" width="580" height="210" role="img" aria-label="${esc(name)}: ${esc(lines.join(" "))}">
  <defs>
    <linearGradient id="acc" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>
    <linearGradient id="sweep" gradientUnits="userSpaceOnUse" x1="-580" y1="0" x2="0" y2="0">
      <stop offset="0" stop-color="${a}" stop-opacity="0"/>
      <stop offset=".5" stop-color="${a}" stop-opacity=".95"/>
      <stop offset=".75" stop-color="${b}" stop-opacity=".95"/>
      <stop offset="1" stop-color="${b}" stop-opacity="0"/>
      <animateTransform attributeName="gradientTransform" type="translate" values="0 0;1160 0" dur="5s" repeatCount="indefinite"/>
    </linearGradient>
    <radialGradient id="glow" cx="1" cy="0" r="1"><stop offset="0" stop-color="${a}" stop-opacity=".18"/><stop offset="1" stop-color="${a}" stop-opacity="0"/></radialGradient>
    <style>
      text { font-family: "Segoe UI", Inter, Helvetica, Arial, sans-serif; }
      .in { opacity: 0; animation: in .6s ease-out forwards; }
      @keyframes in { from { opacity: 0; transform: translateY(6px) } to { opacity: 1; transform: none } }
      .pulse { transform-box: fill-box; transform-origin: center; animation: pulse 2.8s ease-in-out infinite; }
      @keyframes pulse { 0%,100% { transform: scale(1) } 50% { transform: scale(1.07) } }
    </style>
  </defs>
  <rect x="1" y="1" width="578" height="208" rx="18" fill="#0d1224"/>
  <rect x="1" y="1" width="578" height="208" rx="18" fill="url(#glow)"/>
  <rect x="1" y="1" width="578" height="208" rx="18" fill="none" stroke="#222c4d" stroke-width="2"/>
  <rect x="1" y="1" width="578" height="208" rx="18" fill="none" stroke="url(#sweep)" stroke-width="2.5"/>

  <g class="pulse"><rect x="28" y="28" width="56" height="56" rx="14" fill="url(#acc)"/>
  <text x="56" y="67" text-anchor="middle" font-size="28" font-weight="800" fill="#0d1224">${glyph}</text></g>
  <text x="104" y="54" font-size="26" font-weight="800" fill="#f1f5f9">${esc(name)}</text>
  <text x="104" y="78" font-size="14" fill="#7c86a8">github.com/root-luffy/${esc(name)}</text>

  <g transform="translate(436 18)">${art[id](a, b)}</g>

  <text x="28" y="130" font-size="17" fill="#cbd5e1" class="in" style="animation-delay:.2s">${esc(lines[0])}</text>
  <text x="28" y="154" font-size="17" fill="#cbd5e1" class="in" style="animation-delay:.35s">${esc(lines[1])}</text>
  <circle cx="34" cy="186" r="6" fill="${langColor}"/>
  <text x="46" y="191" font-size="14" fill="#94a3b8">${esc(lang)}</text>
  <text x="552" y="191" text-anchor="end" font-size="14" fill="#7c86a8">${esc(tags)}</text>
</svg>
`;
}

const cards = [
  { id: "agentgate", name: "AgentGate", glyph: "⛨", a: "#34d399", b: "#0ea5e9", lang: "Rust + TypeScript", langColor: "#dea584",
    lines: ["The security checkpoint between AI agents", "and their MCP tools. Deny by default."], tags: "Rust · Axum · Next.js · Postgres" },
  { id: "upsidedown", name: "UpsideDown", glyph: "⇅", a: "#22d3ee", b: "#f472b6", lang: "PowerShell", langColor: "#5391fe",
    lines: ["Flip your monitor between two computers", "with one hotkey. No KVM switch needed."], tags: "Windows · DDC/CI · AutoHotkey" },
  { id: "ghostty", name: "ghosTTY-configs", glyph: "👻", a: "#a78bfa", b: "#f472b6", lang: "Shell", langColor: "#89e051",
    lines: ["A real wallpaper behind your terminal that", "rotates on its own and never fights the text."], tags: "Ghostty · Bash · Linux + macOS" },
  { id: "cloudnest", name: "Cloudnest.dev", glyph: "☁", a: "#38bdf8", b: "#fbbf24", lang: "Python", langColor: "#3572a5",
    lines: ["Your AWS cloud, nested on localhost:4566.", "Built on LocalStack. Web console in the works."], tags: "35 AWS APIs · Docker" },
];

mkdirSync("assets/cards", { recursive: true });
for (const c of cards) {
  writeFileSync(`assets/cards/${c.id}.svg`, card(c));
  console.log(`wrote assets/cards/${c.id}.svg`);
}
