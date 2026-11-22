#!/usr/bin/env node
/**
 * Adaptive Light/Dark Swiss Editorial SVG Generator for feb027/feb027
 * Unified across navigation chips, hero, 01-06 project rows/columns, and live contribution heatmap.
 * Zero card soup, 1px hairline structure, calm CSS motion, strict XML valid.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");
const ASSETS_DIR = path.join(ROOT_DIR, "assets");

function buildDefaultHeatmapWeeks() {
  const pattern = [
    [0, 2, 1, 0, 3, 1, 0],
    [1, 0, 4, 2, 0, 1, 2],
    [0, 3, 2, 1, 0, 2, 0],
    [2, 1, 0, 5, 3, 0, 1],
    [0, 0, 2, 1, 4, 2, 0],
    [1, 3, 5, 2, 1, 0, 2],
    [0, 4, 6, 8, 3, 1, 0],
    [1, 2, 0, 3, 2, 1, 0],
    [0, 1, 4, 2, 5, 0, 1],
    [2, 5, 3, 7, 4, 2, 0],
    [1, 0, 2, 4, 6, 3, 1],
    [0, 3, 5, 2, 1, 4, 0],
    [2, 1, 0, 3, 2, 0, 1],
    [0, 2, 6, 4, 1, 2, 0],
    [1, 4, 3, 8, 5, 2, 1],
    [0, 5, 7, 4, 2, 3, 0],
    [2, 3, 1, 0, 4, 2, 1],
    [0, 2, 4, 3, 5, 1, 0],
    [1, 6, 5, 8, 4, 2, 1],
    [2, 4, 9, 6, 3, 5, 2],
    [1, 3, 2, 5, 4, 1, 0],
    [0, 4, 3, 2, 6, 2, 1],
    [2, 5, 7, 4, 3, 2, 0],
    [1, 8, 6, 9, 5, 4, 2],
    [0, 4, 3, 6, 2, 3, 1],
    [2, 3, 5, 4, 7, 2, 1],
    [1, 4, 6, 3, 5, 4, 2],
    [0, 3, 4, 6, 8, 5, 3],
  ];
  return pattern;
}

const DEFAULT_STATS = {
  totalRepos: 86,
  publicRepos: 50,
  privateRepos: 36,
  totalContributions12m: 1702,
  allTimeContributions: 2455,
  publicCommits12m: 1295,
  privateContributions12m: 369,
  longestStreak: 18,
  currentStreak: 1,
  activeDays12m: 140,
  todayContributions: 15,
  updatedDate: new Date().toISOString().slice(0, 10),
  heatmapWeeks: buildDefaultHeatmapWeeks(),
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

    const last28Weeks = weeks.slice(-28).map((w) => {
      const counts = (w.contributionDays || []).map((d) => d.contributionCount);
      while (counts.length < 7) counts.push(0);
      return counts.slice(0, 7);
    });

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
      heatmapWeeks:
        last28Weeks.length === 28 ? last28Weeks : DEFAULT_STATS.heatmapWeeks,
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
        accentMid: "#0D9488",
        accentLow: "#134E4A",
        cellEmpty: "#161B22",
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
        accentMid: "#14B8A6",
        accentLow: "#99F6E4",
        cellEmpty: "#EBEDF0",
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
/* 0. TOP ANIMATED NAV CHIPS (Individually clickable, staggered sweep)        */
/* ========================================================================== */
function buildNavChipSvg(mode = "dark", config) {
  const p = getPalette(mode);
  const { width, label, delaySec, hasDot, showSeparator } = config;
  const lineEnd = showSeparator ? width - 22 : width - 8;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} 28" width="${width}" height="28" role="img" aria-label="${label}">
  <title>${label}</title>
  <defs>
    <style>
      .mono { font-family: ${FONT_MONO}; }
      @keyframes navSweep {
        0%, 60%, 100% { transform: scaleX(0.18); opacity: 0.25; }
        25% { transform: scaleX(1); opacity: 0.95; }
      }
      @keyframes dotBreathe {
        0%, 100% { opacity: 0.95; }
        50% { opacity: 0.35; }
      }
      .nav-line {
        transform-box: fill-box;
        transform-origin: left center;
        animation: navSweep 4.8s cubic-bezier(0.32, 0.72, 0, 1) infinite;
        animation-delay: ${delaySec}s;
      }
      .nav-dot {
        animation: dotBreathe 2.6s ease-in-out infinite;
      }
      @media (prefers-reduced-motion: reduce) {
        .nav-line { animation: none; opacity: 0.45; transform: scaleX(1); }
        .nav-dot { animation: none; }
      }
    </style>
  </defs>

  ${hasDot ? `<circle cx="11" cy="13" r="2.6" fill="${p.accent}" class="nav-dot"/>` : ""}
  <text x="${hasDot ? 21 : 8}" y="17" class="mono" font-size="11.5" fill="${p.inkSub}">${label} <tspan fill="${p.accent}" font-size="10.5">↗</tspan></text>
  <line x1="${hasDot ? 21 : 8}" y1="22" x2="${lineEnd}" y2="22" stroke="${p.accent}" stroke-width="1" class="nav-line"/>
  ${showSeparator ? `<circle cx="${width - 8}" cy="13" r="1.4" fill="${p.inkMuted}"/>` : ""}
</svg>
`;
}

/* ========================================================================== */
/* 1. HERO SVG (880 x 148) — Borderless Typography + Flowing Contour Waves    */
/* ========================================================================== */
function buildHeroSvg(mode = "dark") {
  const p = getPalette(mode);
  const wave1 = makePeriodicWavePath(480, 74, 24, 180, 4);
  const wave2 = makePeriodicWavePath(480, 78, 16, 180, 4);
  const wave3 = makePeriodicWavePath(480, 68, 11, 180, 4);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 880 148" width="880" height="148" role="img" aria-label="Febnawan Fatur Rochman — Web Development, Computer Vision, and Embedded Systems">
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
/* 2. PROJECT ROW 01 (880 x 104) — Multitech OS                               */
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
/* 3. PROJECT ROW 02 (880 x 104) — ECU Bench S3                               */
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
/* 4. PROJECT ROW 03 (880 x 104) — YOLO26 INT8                                */
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
/* 5. SECONDARY 3-COLUMN ANIMATED SVGs (288 x 124 each) — 04, 05, 06          */
/* ========================================================================== */
function buildColMicHpSvg(mode = "dark") {
  const p = getPalette(mode);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 288 124" width="288" height="124" role="img" aria-label="04 mic-hp — Wireless PC virtual microphone">
  <title>04 mic-hp</title>
  <defs>
    <style>
      .sans { font-family: ${FONT_SANS}; }
      .mono { font-family: ${FONT_MONO}; }
      @keyframes eqBar {
        0%, 100% { transform: scaleY(0.35); }
        50% { transform: scaleY(1); }
      }
      .eq { transform-box: fill-box; transform-origin: center bottom; animation: eqBar 1.4s ease-in-out infinite; }
      @media (prefers-reduced-motion: reduce) { .eq { animation: none; } }
    </style>
  </defs>

  <text x="0" y="24" class="mono" font-size="11" fill="${p.inkMuted}">04</text>
  <g>
    <rect x="234" y="13" width="3" height="12" rx="1.5" fill="${p.wireMuted}" class="eq" style="animation-delay: 0s"/>
    <rect x="240" y="9" width="3" height="16" rx="1.5" fill="${p.accent}" class="eq" style="animation-delay: 0.2s"/>
    <rect x="246" y="7" width="3" height="18" rx="1.5" fill="${p.accent}" class="eq" style="animation-delay: 0.4s"/>
    <rect x="252" y="11" width="3" height="14" rx="1.5" fill="${p.accent}" class="eq" style="animation-delay: 0.15s"/>
    <rect x="258" y="15" width="3" height="10" rx="1.5" fill="${p.wireMuted}" class="eq" style="animation-delay: 0.35s"/>
  </g>

  <text x="0" y="50" class="sans" font-size="17" font-weight="600" fill="${p.ink}" letter-spacing="-0.3">mic-hp</text>
  <text x="0" y="71" class="sans" font-size="12.5" fill="${p.inkSub}">Wireless PC virtual mic (~2 ms)</text>
  <text x="0" y="88" class="sans" font-size="12.5" fill="${p.inkSub}">from Android to Windows</text>
  <text x="0" y="110" class="mono" font-size="11" fill="${p.inkMuted}">Rust · WASAPI · Compose</text>

  <line x1="287" y1="10" x2="287" y2="112" stroke="${p.hairline}" stroke-width="1"/>
</svg>
`;
}

function buildColMydriaSvg(mode = "dark") {
  const p = getPalette(mode);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 288 124" width="288" height="124" role="img" aria-label="05 Mydria — Diabetic retinopathy screening">
  <title>05 Mydria</title>
  <defs>
    <style>
      .sans { font-family: ${FONT_SANS}; }
      .mono { font-family: ${FONT_MONO}; }
      @keyframes scanOrbit {
        0%, 100% { transform: scale(0.88); opacity: 0.45; }
        50% { transform: scale(1.12); opacity: 1; }
      }
      .scan-ring { transform-box: fill-box; transform-origin: center; animation: scanOrbit 3.4s cubic-bezier(0.32, 0.72, 0, 1) infinite; }
      @media (prefers-reduced-motion: reduce) { .scan-ring { animation: none; opacity: 0.8; } }
    </style>
  </defs>

  <text x="18" y="24" class="mono" font-size="11" fill="${p.inkMuted}">05</text>
  <g>
    <circle cx="256" cy="18" r="9" fill="none" stroke="${p.wireMuted}" stroke-width="1"/>
    <circle cx="256" cy="18" r="5" fill="none" stroke="${p.accent}" stroke-width="1.3" stroke-dasharray="6 3" class="scan-ring"/>
    <circle cx="256" cy="18" r="1.8" fill="${p.accent}"/>
  </g>

  <text x="18" y="50" class="sans" font-size="17" font-weight="600" fill="${p.ink}" letter-spacing="-0.3">Mydria</text>
  <text x="18" y="71" class="sans" font-size="12.5" fill="${p.inkSub}">Diabetic retinopathy screening</text>
  <text x="18" y="88" class="sans" font-size="12.5" fill="${p.inkSub}">on APTOS 2019 (Grad-CAM++)</text>
  <text x="18" y="110" class="mono" font-size="11" fill="${p.inkMuted}">ConvNeXt-V2 · FastAPI · React</text>

  <line x1="287" y1="10" x2="287" y2="112" stroke="${p.hairline}" stroke-width="1"/>
</svg>
`;
}

function buildColAutobardSvg(mode = "dark") {
  const p = getPalette(mode);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 288 124" width="288" height="124" role="img" aria-label="06 wwm-autobard — Automated MIDI player">
  <title>06 wwm-autobard</title>
  <defs>
    <style>
      .sans { font-family: ${FONT_SANS}; }
      .mono { font-family: ${FONT_MONO}; }
      @keyframes midiNote {
        0%, 100% { transform: translateY(0px); opacity: 0.45; }
        50% { transform: translateY(5px); opacity: 1; }
      }
      .note-a { animation: midiNote 1.8s ease-in-out infinite; }
      .note-b { animation: midiNote 2.2s ease-in-out infinite; animation-delay: 0.4s; }
      .note-c { animation: midiNote 1.6s ease-in-out infinite; animation-delay: 0.8s; }
      @media (prefers-reduced-motion: reduce) { .note-a, .note-b, .note-c { animation: none; opacity: 0.85; } }
    </style>
  </defs>

  <text x="18" y="24" class="mono" font-size="11" fill="${p.inkMuted}">06</text>
  <g>
    <line x1="242" y1="24" x2="278" y2="24" stroke="${p.hairline}" stroke-width="1"/>
    <rect x="244" y="11" width="7" height="4" rx="1.5" fill="${p.accent}" class="note-a"/>
    <rect x="255" y="15" width="7" height="4" rx="1.5" fill="${p.inkSub}" class="note-b"/>
    <rect x="266" y="10" width="7" height="4" rx="1.5" fill="${p.accent}" class="note-c"/>
  </g>

  <text x="18" y="50" class="sans" font-size="17" font-weight="600" fill="${p.ink}" letter-spacing="-0.3">wwm-autobard</text>
  <text x="18" y="71" class="sans" font-size="12.5" fill="${p.inkSub}">Automated MIDI &amp; sheet music</text>
  <text x="18" y="88" class="sans" font-size="12.5" fill="${p.inkSub}">player for Where Winds Meet</text>
  <text x="18" y="110" class="mono" font-size="11" fill="${p.inkMuted}">Python · MIDI · 3 ★</text>
</svg>
`;
}

/* ========================================================================== */
/* 6. TELEMETRY & HEATMAP SVG (880 x 146) — 28x7 Live Matrix & Stack          */
/* ========================================================================== */
function buildStatsSvg(mode = "dark", stats = DEFAULT_STATS) {
  const p = getPalette(mode);

  const cells = [];
  stats.heatmapWeeks.forEach((weekDays, wIdx) => {
    weekDays.forEach((count, dIdx) => {
      const x = wIdx * 10;
      const y = 36 + dIdx * 10;
      let fill = p.cellEmpty;
      let cls = "";
      let delay = "0";
      if (count >= 6) {
        fill = p.accent;
        cls = "hm-active";
        delay = ((wIdx + dIdx) * 0.06).toFixed(2);
      } else if (count >= 3) {
        fill = p.accentMid;
        cls = "hm-active";
        delay = ((wIdx + dIdx) * 0.06).toFixed(2);
      } else if (count >= 1) {
        fill = p.accentLow;
      }
      cells.push(
        cls
          ? `<rect x="${x}" y="${y}" width="7" height="7" rx="1.5" fill="${fill}" class="${cls}" style="animation-delay: ${delay}s"/>`
          : `<rect x="${x}" y="${y}" width="7" height="7" rx="1.5" fill="${fill}"/>`
      );
    });
  });

  const barWidth = 416;
  let langX = 464;
  const langSegments = stats.languages
    .map((lang) => {
      const w = Math.round((lang.pct / 100) * barWidth);
      const color = mode === "dark" ? lang.colorDark : lang.colorLight;
      const seg = `<rect x="${langX}" y="46" width="${w}" height="6" fill="${color}"/>`;
      langX += w;
      return seg;
    })
    .join("\n      ");

  const [py, ts, cpp, tex] = stats.languages;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 880 146" width="880" height="146" role="img" aria-label="GitHub Activity and Languages">
  <title>Activity and Languages</title>
  <defs>
    <style>
      .sans { font-family: ${FONT_SANS}; }
      .mono { font-family: ${FONT_MONO}; }
      @keyframes cellRipple {
        0%, 100% { opacity: 0.72; }
        50% { opacity: 1; }
      }
      @keyframes barGlint {
        0% { transform: translateX(-120px); opacity: 0; }
        35% { opacity: 0.35; }
        65% { opacity: 0.35; }
        100% { transform: translateX(460px); opacity: 0; }
      }
      @keyframes liveBlink {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.3; }
      }
      .hm-active { animation: cellRipple 3.2s ease-in-out infinite; }
      .lang-glint { animation: barGlint 5.5s cubic-bezier(0.32, 0.72, 0, 1) infinite; }
      .live-dot { animation: liveBlink 2.4s ease-in-out infinite; }
      @media (prefers-reduced-motion: reduce) {
        .hm-active, .lang-glint, .live-dot { animation: none; opacity: 1; }
      }
    </style>
    <clipPath id="langBarClip">
      <rect x="464" y="46" width="${barWidth}" height="6" rx="3"/>
    </clipPath>
    <linearGradient id="glintGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0"/>
      <stop offset="50%" stop-color="#FFFFFF" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <line x1="0" y1="1" x2="880" y2="1" stroke="${p.hairline}" stroke-width="1"/>

  <text x="0" y="24" class="mono" font-size="10.5" font-weight="600" fill="${p.inkMuted}" letter-spacing="1.2">CONTRIBUTION MATRIX (28 WEEKS)</text>
  <g>
    ${cells.join("\n    ")}
  </g>
  <text x="0" y="130" class="mono" font-size="11.5" fill="${p.inkSub}">${formatNumber(stats.totalContributions12m)} commits (12m)  ·  ${formatNumber(stats.allTimeContributions)} all-time  ·  ${stats.totalRepos} repos  ·  ${stats.longestStreak}d streak</text>

  <text x="464" y="24" class="mono" font-size="10.5" font-weight="600" fill="${p.inkMuted}" letter-spacing="1.2">LANGUAGES</text>
  <circle cx="752" cy="20" r="2.6" fill="${p.accent}" class="live-dot"/>
  <text x="880" y="24" text-anchor="end" class="mono" font-size="10.5" fill="${p.inkMuted}">Updated ${stats.updatedDate}</text>

  <rect x="464" y="46" width="${barWidth}" height="6" rx="3" fill="${p.barBg}"/>
  <g clip-path="url(#langBarClip)">
    ${langSegments}
    <rect x="464" y="46" width="84" height="6" fill="url(#glintGrad)" class="lang-glint"/>
  </g>

  <g class="mono" font-size="11.5" fill="${p.inkSub}">
    <circle cx="468" cy="78" r="4" fill="${mode === "dark" ? py.colorDark : py.colorLight}"/>
    <text x="478" y="82">Python <tspan fill="${p.inkMuted}">${py.pct}%</tspan></text>

    <circle cx="672" cy="78" r="4" fill="${mode === "dark" ? ts.colorDark : ts.colorLight}"/>
    <text x="682" y="82">TypeScript / JS <tspan fill="${p.inkMuted}">${ts.pct}%</tspan></text>

    <circle cx="468" cy="102" r="4" fill="${mode === "dark" ? cpp.colorDark : cpp.colorLight}"/>
    <text x="478" y="106">C++ / Rust <tspan fill="${p.inkMuted}">${cpp.pct}%</tspan></text>

    <circle cx="672" cy="102" r="4" fill="${mode === "dark" ? tex.colorDark : tex.colorLight}"/>
    <text x="682" y="106">Web / TeX <tspan fill="${p.inkMuted}">${tex.pct}%</tspan></text>
  </g>

  <text x="464" y="130" class="mono" font-size="11.5" fill="${p.inkMuted}">${stats.activeDays12m} active days (12m)  ·  ${formatNumber(stats.publicCommits12m)} public  ·  ${formatNumber(stats.privateContributions12m)} private</text>
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

  const navConfigs = [
    { key: "nav-web", width: 158, label: "aquarise.my.id", delaySec: "0", hasDot: true, showSeparator: true },
    { key: "nav-linkedin", width: 108, label: "linkedin", delaySec: "0.35", hasDot: false, showSeparator: true },
    { key: "nav-mail", width: 242, label: "febnawanrochman2@gmail.com", delaySec: "0.7", hasDot: false, showSeparator: true },
    { key: "nav-repos", width: 126, label: "repositories", delaySec: "1.05", hasDot: false, showSeparator: false },
  ];

  const files = [
    ...navConfigs.flatMap((cfg) => [
      [`${cfg.key}-dark.svg`, buildNavChipSvg("dark", cfg)],
      [`${cfg.key}-light.svg`, buildNavChipSvg("light", cfg)],
    ]),
    ["hero-dark.svg", buildHeroSvg("dark")],
    ["hero-light.svg", buildHeroSvg("light")],
    ["row-web-dark.svg", buildWebRowSvg("dark")],
    ["row-web-light.svg", buildWebRowSvg("light")],
    ["row-ecu-dark.svg", buildEcuRowSvg("dark")],
    ["row-ecu-light.svg", buildEcuRowSvg("light")],
    ["row-vision-dark.svg", buildVisionRowSvg("dark")],
    ["row-vision-light.svg", buildVisionRowSvg("light")],
    ["col-michp-dark.svg", buildColMicHpSvg("dark")],
    ["col-michp-light.svg", buildColMicHpSvg("light")],
    ["col-mydria-dark.svg", buildColMydriaSvg("dark")],
    ["col-mydria-light.svg", buildColMydriaSvg("light")],
    ["col-autobard-dark.svg", buildColAutobardSvg("dark")],
    ["col-autobard-light.svg", buildColAutobardSvg("light")],
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

  console.log(
    `Generated ${files.length} unified Swiss Editorial SVGs (Commits 12M: ${stats.totalContributions12m}, All-time: ${stats.allTimeContributions}, Repos: ${stats.totalRepos})`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
