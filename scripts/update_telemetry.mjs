#!/usr/bin/env node
/**
 * Adaptive Light/Dark Swiss Editorial SVG Generator for feb027/feb027
 * Zero cards, 1px hairline structure, calm CSS/SVG motion, strict XML valid.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");
const ASSETS_DIR = path.join(ROOT_DIR, "assets");

const DEFAULT_STATS = {
  totalRepos: 86,
  publicRepos: 50,
  privateRepos: 36,
  totalContributions12m: 1697,
  allTimeContributions: 2450,
  publicCommits12m: 1290,
  privateContributions12m: 369,
  longestStreak: 18,
  currentStreak: 1,
  activeDays12m: 140,
  todayContributions: 15,
  updatedDate: new Date().toISOString().slice(0, 10),
  weeklyCounts: [
    14, 22, 19, 31, 12, 27, 45, 38, 18, 29, 52, 41, 33, 24, 48, 63, 39, 28, 54,
    71, 44, 36, 62, 84, 51, 38,
  ],
  languages: [
    { name: "Python", pct: 38, colorDark: "#2DD4BF", colorLight: "#0F766E" },
    { name: "TypeScript / JS", pct: 26, colorDark: "#38BDF8", colorLight: "#0284C7" },
    { name: "C++ / Rust", pct: 18, colorDark: "#94A3B8", colorLight: "#475569" },
    { name: "Web / TeX", pct: 18, colorDark: "#475569", colorLight: "#CBD5E1" },
  ],
};

async function fetchLiveGitHubStats() {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (!token) return DEFAULT_STATS;

  try {
    const currentYear = new Date().getUTCFullYear();
    const yearAliases = [];
    for (let y = 2021; y <= currentYear; y++) {
      yearAliases.push(
        `y${y}: contributionsCollection(from: "${y}-01-01T00:00:00Z", to: "${y}-12-31T23:59:59Z") { contributionCalendar { totalContributions } }`
      );
    }

    const query = `
      query {
        viewer {
          repositories(first: 100, ownerAffiliations: OWNER) {
            totalCount
            nodes {
              isPrivate
              primaryLanguage { name }
            }
          }
          contributionsCollection {
            totalCommitContributions
            restrictedContributionsCount
            contributionCalendar {
              totalContributions
              weeks {
                contributionDays {
                  contributionCount
                  date
                }
              }
            }
          }
          ${yearAliases.join("\n          ")}
        }
      }
    `;

    const res = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "User-Agent": "feb027-profile-svg-builder",
      },
      body: JSON.stringify({ query }),
    });
    if (!res.ok) return DEFAULT_STATS;
    const json = await res.json();
    const viewer = json?.data?.viewer;
    if (!viewer) return DEFAULT_STATS;

    const totalRepos = viewer.repositories.totalCount || DEFAULT_STATS.totalRepos;
    const publicRepos =
      viewer.repositories.nodes.filter((r) => !r.isPrivate).length ||
      DEFAULT_STATS.publicRepos;
    const privateRepos = Math.max(totalRepos - publicRepos, 0);

    const cc = viewer.contributionsCollection;
    const totalContributions12m =
      cc?.contributionCalendar?.totalContributions ||
      DEFAULT_STATS.totalContributions12m;
    const publicCommits12m =
      cc?.totalCommitContributions || DEFAULT_STATS.publicCommits12m;
    const privateContributions12m =
      cc?.restrictedContributionsCount || DEFAULT_STATS.privateContributions12m;

    let allTimeContributions = 0;
    for (let y = 2021; y <= currentYear; y++) {
      allTimeContributions +=
        viewer[`y${y}`]?.contributionCalendar?.totalContributions || 0;
    }
    if (allTimeContributions < totalContributions12m) {
      allTimeContributions = totalContributions12m;
    }

    const weeks = cc?.contributionCalendar?.weeks || [];
    const days = weeks.flatMap((w) => w.contributionDays || []);
    let longestStreak = 0;
    let running = 0;
    let activeDays12m = 0;
    for (const d of days) {
      if (d.contributionCount > 0) {
        activeDays12m++;
        running++;
        if (running > longestStreak) longestStreak = running;
      } else {
        running = 0;
      }
    }

    let currentStreak = 0;
    for (let i = days.length - 1; i >= 0; i--) {
      if (days[i].contributionCount > 0) {
        currentStreak++;
      } else if (i === days.length - 1) {
        continue;
      } else {
        break;
      }
    }
    const todayContributions =
      days.length > 0 ? days[days.length - 1].contributionCount : 0;

    const last26Weeks = weeks.slice(-26).map((w) =>
      (w.contributionDays || []).reduce((acc, d) => acc + d.contributionCount, 0)
    );

    return {
      ...DEFAULT_STATS,
      totalRepos,
      publicRepos,
      privateRepos,
      totalContributions12m,
      allTimeContributions,
      publicCommits12m,
      privateContributions12m,
      longestStreak: longestStreak || DEFAULT_STATS.longestStreak,
      currentStreak: Math.max(currentStreak, 1),
      activeDays12m: activeDays12m || DEFAULT_STATS.activeDays12m,
      todayContributions,
      weeklyCounts:
        last26Weeks.length === 26 ? last26Weeks : DEFAULT_STATS.weeklyCounts,
      updatedDate: new Date().toISOString().slice(0, 10),
    };
  } catch {
    return DEFAULT_STATS;
  }
}

function getPalette(mode = "dark") {
  return mode === "dark"
    ? {
        ink: "#F0F6FC",
        inkSub: "#8B949E",
        inkMuted: "#6E7681",
        hairline: "#21262D",
        accent: "#2DD4BF",
        accentMuted: "#134E4A",
        wire: "#C9D1D9",
        wireMuted: "#30363D",
        barBg: "#21262D",
      }
    : {
        ink: "#1F2328",
        inkSub: "#57606A",
        inkMuted: "#6E7781",
        hairline: "#D0D7DE",
        accent: "#0F766E",
        accentMuted: "#99F6E4",
        wire: "#24292F",
        wireMuted: "#D0D7DE",
        barBg: "#EAECEF",
      };
}

const FONT_SANS =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";
const FONT_MONO =
  "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";

function formatNumber(n) {
  return Number(n).toLocaleString("en-US");
}

function makePeriodicWavePath(xStart, yMid, amp, wavelength, periods) {
  const half = wavelength / 2;
  const q = wavelength / 4;
  let d = `M ${xStart} ${yMid}`;
  for (let i = 0; i < periods; i++) {
    const x0 = xStart + i * wavelength;
    d += ` C ${x0 + q} ${yMid - amp}, ${x0 + half - q} ${yMid - amp}, ${x0 + half} ${yMid}`;
    d += ` C ${x0 + half + q} ${yMid + amp}, ${x0 + wavelength - q} ${yMid + amp}, ${x0 + wavelength} ${yMid}`;
  }
  return d;
}

/* ========================================================================== */
/* 1. HERO SVG (880 x 148) — Borderless Typography + Flowing Contour Waves    */
/* ========================================================================== */
function buildHeroSvg(mode = "dark") {
  const p = getPalette(mode);
  const wave1 = makePeriodicWavePath(480, 74, 24, 180, 4);
  const wave2 = makePeriodicWavePath(480, 78, 16, 180, 4);
  const wave3 = makePeriodicWavePath(480, 68, 11, 180, 4);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 880 148" width="880" height="148" role="img" aria-label="Febnawan Fatur Rochman — Web, Computer Vision, and Embedded Systems">
  <title>Febnawan Fatur Rochman</title>
  <defs>
    <style>
      .sans { font-family: ${FONT_SANS}; }
      .mono { font-family: ${FONT_MONO}; }
      @keyframes statusPulse {
        0%, 100% { opacity: 0.9; transform: scale(1); }
        50% { opacity: 0.25; transform: scale(1.9); }
      }
      @keyframes waveShiftA {
        0% { transform: translateX(0); }
        100% { transform: translateX(-180px); }
      }
      @keyframes waveShiftB {
        0% { transform: translateX(-90px); }
        100% { transform: translateX(-270px); }
      }
      .pulse-ring {
        transform-box: fill-box;
        transform-origin: center;
        animation: statusPulse 2.8s cubic-bezier(0.32, 0.72, 0, 1) infinite;
      }
      .wave-a { animation: waveShiftA 11s linear infinite; }
      .wave-b { animation: waveShiftA 15s linear infinite; }
      .wave-c { animation: waveShiftB 19s linear infinite; }
      @media (prefers-reduced-motion: reduce) {
        .pulse-ring, .wave-a, .wave-b, .wave-c { animation: none; }
      }
    </style>
    <linearGradient id="heroWaveFade" x1="490" y1="0" x2="880" y2="0" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0"/>
      <stop offset="18%" stop-color="#FFFFFF" stop-opacity="1"/>
      <stop offset="84%" stop-color="#FFFFFF" stop-opacity="1"/>
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0"/>
    </linearGradient>
    <mask id="heroWaveMask">
      <rect x="490" y="10" width="390" height="126" fill="url(#heroWaveFade)"/>
    </mask>
    <clipPath id="heroWaveClip">
      <rect x="490" y="10" width="390" height="126"/>
    </clipPath>
  </defs>

  <text x="0" y="42" class="sans" font-size="29" font-weight="700" fill="${p.ink}" letter-spacing="-0.8">Febnawan Fatur Rochman</text>
  <text x="0" y="71" class="sans" font-size="14" fill="${p.inkSub}">Web Development · Computer Vision · Embedded Systems</text>

  <circle cx="5" cy="99" r="3.5" fill="${p.accent}" opacity="0.3" class="pulse-ring"/>
  <circle cx="5" cy="99" r="3.2" fill="${p.accent}"/>
  <text x="18" y="103" class="mono" font-size="12" fill="${p.inkSub}">Tasikmalaya · Informatics S1 · Thesis 2026</text>

  <g clip-path="url(#heroWaveClip)" mask="url(#heroWaveMask)">
    <path d="${wave3}" fill="none" stroke="${p.wireMuted}" stroke-width="1.2" opacity="0.9" class="wave-c"/>
    <path d="${wave2}" fill="none" stroke="${p.inkSub}" stroke-width="1.35" opacity="0.5" class="wave-b"/>
    <path d="${wave1}" fill="none" stroke="${p.accent}" stroke-width="1.6" opacity="0.85" class="wave-a"/>
  </g>

  <line x1="0" y1="147" x2="880" y2="147" stroke="${p.hairline}" stroke-width="1"/>
</svg>
`;
}

/* ========================================================================== */
/* 2. PROJECT ROW 01 (880 x 104) — Multitech OS (Unboxed UI Wireframe)        */
/* ========================================================================== */
function buildWebRowSvg(mode = "dark") {
  const p = getPalette(mode);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 880 104" width="880" height="104" role="img" aria-label="01 Multitech OS — ECU repair and workshop service web app">
  <title>01 Multitech OS</title>
  <defs>
    <style>
      .sans { font-family: ${FONT_SANS}; }
      .mono { font-family: ${FONT_MONO}; }
      @keyframes rowSlide {
        0%, 100% { transform: translateX(0); opacity: 0.7; }
        50% { transform: translateX(64px); opacity: 1; }
      }
      .ui-slider { animation: rowSlide 4.8s cubic-bezier(0.32, 0.72, 0, 1) infinite; }
      @media (prefers-reduced-motion: reduce) {
        .ui-slider { animation: none; }
      }
    </style>
  </defs>

  <text x="0" y="38" class="mono" font-size="12" fill="${p.inkMuted}">01</text>
  <text x="36" y="39" class="sans" font-size="18.5" font-weight="600" fill="${p.ink}" letter-spacing="-0.35">Multitech OS</text>
  <text x="36" y="61" class="sans" font-size="13.5" fill="${p.inkSub}">ECU repair and workshop service web app</text>
  <text x="36" y="82" class="mono" font-size="11.5" fill="${p.inkMuted}">React · TypeScript · FastAPI</text>

  <!-- Minimal unboxed wireframe rows -->
  <g>
    <circle cx="668" cy="24" r="2.2" fill="${p.wireMuted}"/>
    <circle cx="677" cy="24" r="2.2" fill="${p.wireMuted}"/>
    <circle cx="686" cy="24" r="2.2" fill="${p.accent}"/>

    <line x1="666" y1="36" x2="876" y2="36" stroke="${p.hairline}" stroke-width="1"/>
    <rect x="666" y="44" width="54" height="4" rx="2" fill="${p.wireMuted}"/>
    <rect x="732" y="44" width="96" height="4" rx="2" fill="${p.hairline}"/>

    <line x1="666" y1="56" x2="876" y2="56" stroke="${p.hairline}" stroke-width="1"/>
    <rect x="666" y="63" width="144" height="4" rx="2" fill="${p.hairline}"/>
    <rect x="666" y="63" width="52" height="4" rx="2" fill="${p.accent}" class="ui-slider"/>

    <line x1="666" y1="76" x2="876" y2="76" stroke="${p.hairline}" stroke-width="1"/>
    <rect x="666" y="82" width="72" height="4" rx="2" fill="${p.wireMuted}"/>
    <rect x="748" y="82" width="44" height="4" rx="2" fill="${p.hairline}"/>
  </g>

  <line x1="0" y1="103" x2="880" y2="103" stroke="${p.hairline}" stroke-width="1"/>
</svg>
`;
}

/* ========================================================================== */
/* 3. PROJECT ROW 02 (880 x 104) — ECU Bench S3 (Unboxed Ignition Trace)      */
/* ========================================================================== */
function buildEcuRowSvg(mode = "dark") {
  const p = getPalette(mode);
  const period = 120;
  let trace = "";
  for (let i = 0; i < 4; i++) {
    const x = 660 + i * period;
    trace += `${i === 0 ? "M" : "L"} ${x} 66 L ${x + 18} 66 L ${x + 18} 48 L ${x + 34} 48 L ${x + 34} 66 L ${x + 52} 66 L ${x + 56} 26 L ${x + 62} 74 L ${x + 70} 62 L ${x + 76} 66 L ${x + 92} 66 L ${x + 92} 48 L ${x + 106} 48 L ${x + 106} 66 L ${x + 120} 66 `;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 880 104" width="880" height="104" role="img" aria-label="02 ECU Bench S3 — ESP32-S3 ignition coil and CAN bus simulator">
  <title>02 ECU Bench S3</title>
  <defs>
    <style>
      .sans { font-family: ${FONT_SANS}; }
      .mono { font-family: ${FONT_MONO}; }
      @keyframes ecuScroll {
        0% { transform: translateX(0); }
        100% { transform: translateX(-120px); }
      }
      .ecu-trace { animation: ecuScroll 3.2s linear infinite; }
      @media (prefers-reduced-motion: reduce) {
        .ecu-trace { animation: none; }
      }
    </style>
    <linearGradient id="ecuFade" x1="664" y1="0" x2="880" y2="0" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0"/>
      <stop offset="14%" stop-color="#FFFFFF" stop-opacity="1"/>
      <stop offset="86%" stop-color="#FFFFFF" stop-opacity="1"/>
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0"/>
    </linearGradient>
    <mask id="ecuMask">
      <rect x="664" y="16" width="216" height="72" fill="url(#ecuFade)"/>
    </mask>
    <clipPath id="ecuClip">
      <rect x="664" y="16" width="216" height="72"/>
    </clipPath>
  </defs>

  <text x="0" y="38" class="mono" font-size="12" fill="${p.inkMuted}">02</text>
  <text x="36" y="39" class="sans" font-size="18.5" font-weight="600" fill="${p.ink}" letter-spacing="-0.35">ECU Bench S3</text>
  <text x="36" y="61" class="sans" font-size="13.5" fill="${p.inkSub}">ESP32-S3 ignition coil and CAN bus simulator</text>
  <text x="36" y="82" class="mono" font-size="11.5" fill="${p.inkMuted}">C++ · FreeRTOS · 36-2 CKP · 500 kbps</text>

  <line x1="664" y1="66" x2="876" y2="66" stroke="${p.hairline}" stroke-width="1"/>
  <g clip-path="url(#ecuClip)" mask="url(#ecuMask)">
    <path d="${trace.trim()}" fill="none" stroke="${p.accent}" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round" class="ecu-trace"/>
  </g>

  <line x1="0" y1="103" x2="880" y2="103" stroke="${p.hairline}" stroke-width="1"/>
</svg>
`;
}

/* ========================================================================== */
/* 4. PROJECT ROW 03 (880 x 104) — YOLO26 INT8 (Unboxed Tracking Sketch)      */
/* ========================================================================== */
function buildVisionRowSvg(mode = "dark") {
  const p = getPalette(mode);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 880 104" width="880" height="104" role="img" aria-label="03 YOLO26 INT8 — CPU-only quantized people counting thesis">
  <title>03 YOLO26 INT8</title>
  <defs>
    <style>
      .sans { font-family: ${FONT_SANS}; }
      .mono { font-family: ${FONT_MONO}; }
      @keyframes trackA {
        0%, 100% { transform: translate(0px, -6px); }
        50% { transform: translate(6px, 8px); }
      }
      @keyframes trackB {
        0%, 100% { transform: translate(0px, 6px); }
        50% { transform: translate(-6px, -7px); }
      }
      .det-a { animation: trackA 4.6s cubic-bezier(0.32, 0.72, 0, 1) infinite; }
      .det-b { animation: trackB 5.4s cubic-bezier(0.32, 0.72, 0, 1) infinite; }
      @media (prefers-reduced-motion: reduce) {
        .det-a, .det-b { animation: none; }
      }
    </style>
  </defs>

  <text x="0" y="38" class="mono" font-size="12" fill="${p.inkMuted}">03</text>
  <text x="36" y="39" class="sans" font-size="18.5" font-weight="600" fill="${p.ink}" letter-spacing="-0.35">YOLO26 INT8</text>
  <text x="36" y="61" class="sans" font-size="13.5" fill="${p.inkSub}">CPU-only quantized people counting thesis</text>
  <text x="36" y="82" class="mono" font-size="11.5" fill="${p.inkMuted}">Python · OpenVINO · 2.38x speedup · 3.74x smaller · ΔnMAE &lt; 0.25%</text>

  <g>
    <line x1="666" y1="54" x2="876" y2="54" stroke="${p.wireMuted}" stroke-width="1" stroke-dasharray="4 4"/>
    <g class="det-a">
      <rect x="704" y="28" width="42" height="48" rx="4" fill="none" stroke="${p.accent}" stroke-width="1.35" stroke-dasharray="3 2"/>
      <text x="708" y="24" class="mono" font-size="9.5" fill="${p.accent}">0.94</text>
    </g>
    <g class="det-b">
      <rect x="792" y="30" width="42" height="48" rx="4" fill="none" stroke="${p.inkSub}" stroke-width="1.2"/>
      <text x="796" y="26" class="mono" font-size="9.5" fill="${p.inkSub}">0.91</text>
    </g>
  </g>

  <line x1="0" y1="103" x2="880" y2="103" stroke="${p.hairline}" stroke-width="1"/>
</svg>
`;
}

/* ========================================================================== */
/* 5. ACTIVITY & LANGUAGES STRIP (880 x 116) — Borderless Sparkline & Stack   */
/* ========================================================================== */
function buildStatsSvg(mode = "dark", stats = DEFAULT_STATS) {
  const p = getPalette(mode);
  const maxWeekly = Math.max(...stats.weeklyCounts, 1);

  const barsSvg = stats.weeklyCounts
    .map((count, idx) => {
      const x = idx * 12;
      const barH = Math.max(4, Math.round((count / maxWeekly) * 42));
      const y = 74 - barH;
      const isRecent = idx >= stats.weeklyCounts.length - 6;
      const fill = isRecent ? p.accent : p.wireMuted;
      const delay = (idx * 0.08).toFixed(2);
      return `<rect x="${x}" y="${y}" width="6" height="${barH}" rx="2" fill="${fill}" class="spark-bar" style="animation-delay: ${delay}s"/>`;
    })
    .join("\n      ");

  const barWidth = 416;
  let langX = 464;
  const langSegments = stats.languages
    .map((lang) => {
      const w = Math.round((lang.pct / 100) * barWidth);
      const color = mode === "dark" ? lang.colorDark : lang.colorLight;
      const seg = `<rect x="${langX}" y="42" width="${w}" height="6" fill="${color}"/>`;
      langX += w;
      return seg;
    })
    .join("\n      ");

  const [py, ts, cpp, tex] = stats.languages;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 880 116" width="880" height="116" role="img" aria-label="GitHub activity and language summary">
  <title>Activity and Languages</title>
  <defs>
    <style>
      .sans { font-family: ${FONT_SANS}; }
      .mono { font-family: ${FONT_MONO}; }
      @keyframes sparkWave {
        0%, 100% { opacity: 0.72; }
        50% { opacity: 1; }
      }
      .spark-bar { animation: sparkWave 3.6s ease-in-out infinite; }
      @media (prefers-reduced-motion: reduce) {
        .spark-bar { animation: none; opacity: 1; }
      }
    </style>
    <clipPath id="langBarClip">
      <rect x="464" y="42" width="${barWidth}" height="6" rx="3"/>
    </clipPath>
  </defs>

  <line x1="0" y1="1" x2="880" y2="1" stroke="${p.hairline}" stroke-width="1"/>

  <text x="0" y="25" class="mono" font-size="10.5" font-weight="600" fill="${p.inkMuted}" letter-spacing="1.2">ACTIVITY</text>
  <g>
    ${barsSvg}
  </g>
  <text x="0" y="99" class="mono" font-size="12" fill="${p.inkSub}">${formatNumber(stats.totalContributions12m)} commits (12m)  ·  ${stats.totalRepos} repos  ·  ${stats.longestStreak}d streak</text>

  <text x="464" y="25" class="mono" font-size="10.5" font-weight="600" fill="${p.inkMuted}" letter-spacing="1.2">LANGUAGES</text>
  <text x="880" y="25" text-anchor="end" class="mono" font-size="10.5" fill="${p.inkMuted}">Updated ${stats.updatedDate}</text>

  <rect x="464" y="42" width="${barWidth}" height="6" rx="3" fill="${p.barBg}"/>
  <g clip-path="url(#langBarClip)">
    ${langSegments}
  </g>

  <g class="mono" font-size="11.5" fill="${p.inkSub}">
    <circle cx="468" cy="72" r="4" fill="${mode === "dark" ? py.colorDark : py.colorLight}"/>
    <text x="478" y="76">Python <tspan fill="${p.inkMuted}">${py.pct}%</tspan></text>

    <circle cx="672" cy="72" r="4" fill="${mode === "dark" ? ts.colorDark : ts.colorLight}"/>
    <text x="682" y="76">TypeScript / JS <tspan fill="${p.inkMuted}">${ts.pct}%</tspan></text>

    <circle cx="468" cy="96" r="4" fill="${mode === "dark" ? cpp.colorDark : cpp.colorLight}"/>
    <text x="478" y="100">C++ / Rust <tspan fill="${p.inkMuted}">${cpp.pct}%</tspan></text>

    <circle cx="672" cy="96" r="4" fill="${mode === "dark" ? tex.colorDark : tex.colorLight}"/>
    <text x="682" y="100">Web / TeX <tspan fill="${p.inkMuted}">${tex.pct}%</tspan></text>
  </g>
</svg>
`;
}

function validateSvgStrict(name, svg) {
  if (!svg.startsWith("<svg ") || !svg.includes('xmlns="http://www.w3.org/2000/svg"')) {
    throw new Error(`${name}: missing root <svg> or xmlns`);
  }
  const openTagMatch = svg.match(/<([a-zA-Z0-9:_-]+)([^>]*)>/g) || [];
  for (const tag of openTagMatch) {
    const attrs = [...tag.matchAll(/\s([a-zA-Z0-9:_-]+)=/g)].map((m) => m[1]);
    const unique = new Set(attrs);
    if (unique.size !== attrs.length) {
      throw new Error(`${name}: duplicate attribute detected in ${tag}`);
    }
  }
  if (/&(?!(amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/.test(svg)) {
    throw new Error(`${name}: unescaped ampersand detected`);
  }
}

async function main() {
  await fs.mkdir(ASSETS_DIR, { recursive: true });
  const stats = await fetchLiveGitHubStats();

  const files = [
    ["hero-dark.svg", buildHeroSvg("dark")],
    ["hero-light.svg", buildHeroSvg("light")],
    ["row-web-dark.svg", buildWebRowSvg("dark")],
    ["row-web-light.svg", buildWebRowSvg("light")],
    ["row-ecu-dark.svg", buildEcuRowSvg("dark")],
    ["row-ecu-light.svg", buildEcuRowSvg("light")],
    ["row-vision-dark.svg", buildVisionRowSvg("dark")],
    ["row-vision-light.svg", buildVisionRowSvg("light")],
    ["stats-dark.svg", buildStatsSvg("dark", stats)],
    ["stats-light.svg", buildStatsSvg("light", stats)],
  ];

  for (const [name, content] of files) {
    validateSvgStrict(name, content);
  }

  await Promise.all(
    files.map(([name, content]) =>
      fs.writeFile(path.join(ASSETS_DIR, name), content, "utf8")
    )
  );

  // Clean up obsolete card-* SVGs from earlier layout
  const obsolete = [
    "card-web-dark.svg",
    "card-web-light.svg",
    "card-ecu-dark.svg",
    "card-ecu-light.svg",
    "card-vision-dark.svg",
    "card-vision-light.svg",
  ];
  await Promise.all(
    obsolete.map((name) =>
      fs.rm(path.join(ASSETS_DIR, name), { force: true })
    )
  );

  console.log(
    `Generated ${files.length} Swiss Editorial SVGs (Commits 12M: ${stats.totalContributions12m}, Repos: ${stats.totalRepos}, Streak: ${stats.longestStreak}d)`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
