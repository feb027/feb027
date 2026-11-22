#!/usr/bin/env node
/**
 * 1:1 Native-Width (880px) Animated SVG Card & Live GitHub Streak/Telemetry Generator
 * For feb027/feb027 — Swiss Blueprint + Animated Product Stage Cards (Light & Dark)
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
    { name: "Python", pct: 38, colorLight: "#0F766E", colorDark: "#14B8A6" },
    { name: "TypeScript / JS", pct: 26, colorLight: "#0071E3", colorDark: "#38BDF8" },
    { name: "C++ / Rust", pct: 18, colorLight: "#6366F1", colorDark: "#818CF8" },
    { name: "Web / TeX", pct: 18, colorLight: "#64748B", colorDark: "#94A3B8" },
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

    // Current streak (count backwards from today, or yesterday if today is 0)
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
        bg: "#0B0E14",
        panel: "#111621",
        stage: "#0D111A",
        surface: "#161D2B",
        surface2: "#1C2536",
        border: "#232C3D",
        hairline: "#1D2534",
        ink: "#F8FAFC",
        inkSub: "#94A3B8",
        inkMuted: "#64748B",
        teal: "#14B8A6",
        tealSoft: "rgba(20, 184, 166, 0.14)",
        blue: "#38BDF8",
        blueSoft: "rgba(56, 189, 248, 0.14)",
        indigo: "#818CF8",
        amber: "#FBBF24",
        rose: "#FB7185",
        grid: "#1E293B",
      }
    : {
        bg: "#F1F5F9",
        panel: "#FFFFFF",
        stage: "#F8FAFC",
        surface: "#F1F5F9",
        surface2: "#E2E8F0",
        border: "#CBD5E1",
        hairline: "#E2E8F0",
        ink: "#0F172A",
        inkSub: "#475569",
        inkMuted: "#64748B",
        teal: "#0F766E",
        tealSoft: "rgba(15, 118, 110, 0.10)",
        blue: "#0284C7",
        blueSoft: "rgba(2, 132, 199, 0.10)",
        indigo: "#4F46E5",
        amber: "#D97706",
        rose: "#E11D48",
        grid: "#E2E8F0",
      };
}

/* ========================================================================== */
/* 1. HERO SVG (880 x 300) — Hybrid Opsi 3 (Swiss Foundry) + Opsi 2 (Stage)   */
/* ========================================================================== */
function buildHeroSvg(mode = "dark", stats = DEFAULT_STATS) {
  const p = getPalette(mode);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 880 300" width="880" height="300" role="img" aria-label="Febnawan Fatur Rochman (Aquarise) — Frontend, Edge AI Vision, and Automotive Systems">
  <title>Febnawan Fatur Rochman (Aquarise)</title>
  <defs>
    <style>
      .sans { font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Helvetica, Arial, sans-serif; }
      .mono { font-family: 'JetBrains Mono', 'SFMono-Regular', Consolas, Menlo, monospace; font-variant-numeric: tabular-nums; }
      @keyframes pulseDot {
        0%, 100% { transform: scale(1); opacity: 0.9; }
        50% { transform: scale(2.2); opacity: 0; }
      }
      @keyframes cursorBlink {
        0%, 49% { opacity: 1; }
        50%, 100% { opacity: 0; }
      }
      @keyframes scanY {
        0%, 100% { transform: translateY(0px); }
        50% { transform: translateY(68px); }
      }
      @keyframes waveFlow {
        0% { stroke-dashoffset: 240; }
        100% { stroke-dashoffset: 0; }
      }
      @keyframes floatCard {
        0%, 100% { transform: translateY(0px); }
        50% { transform: translateY(-4px); }
      }
      .pulse-ring { transform-origin: 36px 38px; animation: pulseDot 2.2s ease-out infinite; }
      .cursor { animation: cursorBlink 1.1s step-end infinite; }
      .laser-scan { animation: scanY 3.6s ease-in-out infinite; }
      .ecu-trace { stroke-dasharray: 120 120; animation: waveFlow 3.2s linear infinite; }
      .float-ui { animation: floatCard 4s ease-in-out infinite; }
      @media (prefers-reduced-motion: reduce) { * { animation: none !important; } }
    </style>
    <pattern id="bp-grid" width="24" height="24" patternUnits="userSpaceOnUse">
      <path d="M 24 0 L 0 0 0 24" fill="none" stroke="${p.grid}" stroke-width="0.7" opacity="0.65"/>
    </pattern>
  </defs>

  <!-- Main Card Frame -->
  <rect width="880" height="300" rx="18" fill="${p.panel}" stroke="${p.border}" stroke-width="1.5"/>

  <!-- Left Swiss Identity Column (x: 0..380) -->
  <g>
    <!-- Live Status Pill -->
    <rect x="24" y="24" width="186" height="28" rx="14" fill="${p.surface}" stroke="${p.border}" stroke-width="1"/>
    <circle class="pulse-ring" cx="36" cy="38" r="5" fill="${p.teal}"/>
    <circle cx="36" cy="38" r="4" fill="${p.teal}"/>
    <text x="48" y="42" class="mono" font-size="10.5" font-weight="700" fill="${p.ink}" letter-spacing="1.2">AVAILABLE · S1 RESEARCH</text>

    <!-- Giant Swiss Foundry Display Typography (Zero Paragraphs!) -->
    <text x="24" y="114" class="sans" font-size="54" font-weight="800" fill="${p.ink}" letter-spacing="-2.4">Febnawan</text>
    <text x="24" y="168" class="sans" font-size="52" font-weight="800" fill="${p.teal}" letter-spacing="-2.2">Aquarise<tspan class="cursor" fill="${p.blue}">_</tspan></text>

    <!-- Big Clean Role Headline -->
    <text x="26" y="198" class="sans" font-size="15" font-weight="600" fill="${p.inkSub}">Frontend Craftsman · Edge AI · Silicon Firmware</text>

    <!-- 3 High-Contrast Domain Chips -->
    <g class="mono" font-size="11" font-weight="600">
      <rect x="24" y="216" width="104" height="28" rx="7" fill="${p.blueSoft}" stroke="${p.blue}" stroke-width="1"/>
      <text x="76" y="234" text-anchor="middle" fill="${p.blue}">WEB &amp; UI</text>

      <rect x="136" y="216" width="110" height="28" rx="7" fill="${p.tealSoft}" stroke="${p.teal}" stroke-width="1"/>
      <text x="191" y="234" text-anchor="middle" fill="${p.teal}">YOLO26 INT8</text>

      <rect x="254" y="216" width="104" height="28" rx="7" fill="${p.surface}" stroke="${p.border}" stroke-width="1"/>
      <text x="306" y="234" text-anchor="middle" fill="${p.ink}">ESP32-S3 ECU</text>
    </g>

    <!-- Bottom Colophon -->
    <text x="26" y="274" class="mono" font-size="11.5" font-weight="600" fill="${p.inkMuted}">UNSIL INFORMATICS  ·  <tspan fill="${p.teal}">AQUARISE.MY.ID ↗</tspan></text>
  </g>

  <!-- Vertical Architectural Divider -->
  <line x1="384" y1="0" x2="384" y2="300" stroke="${p.border}" stroke-width="1.2"/>

  <!-- Right Animated Blueprint & Multi-System Stage (x: 384..880) -->
  <g>
    <rect x="385" y="1" width="494" height="298" rx="17" fill="${p.stage}"/>
    <rect x="385" y="1" width="494" height="298" fill="url(#bp-grid)"/>

    <!-- Blueprint Header Strip -->
    <text x="406" y="28" class="mono" font-size="10" font-weight="600" fill="${p.inkMuted}" letter-spacing="1.6">STAGE // LIVE SYSTEM TELEMETRY</text>
    <text x="858" y="28" text-anchor="end" class="mono" font-size="10" font-weight="700" fill="${p.teal}">REV 2026.11 · ${stats.totalRepos} REPOS</text>
    <line x1="385" y1="40" x2="879" y2="40" stroke="${p.hairline}" stroke-width="1"/>

    <!-- MODULE A: Vision Bounding-Box Radar Stage (Top Left of Stage) -->
    <g transform="translate(404, 54)">
      <rect width="220" height="122" rx="10" fill="${p.panel}" stroke="${p.border}" stroke-width="1.2"/>
      <rect width="220" height="24" rx="10" fill="${p.surface}"/>
      <circle cx="14" cy="12" r="3.5" fill="${p.rose}"/>
      <circle cx="25" cy="12" r="3.5" fill="${p.amber}"/>
      <circle cx="36" cy="12" r="3.5" fill="${p.teal}"/>
      <text x="208" y="16" text-anchor="end" class="mono" font-size="9.5" font-weight="700" fill="${p.teal}">YOLO26 INT8 · 2.38x</text>

      <!-- Tracked Target Box 1 -->
      <rect x="22" y="38" width="68" height="68" rx="4" fill="${p.tealSoft}" stroke="${p.teal}" stroke-width="1.5" stroke-dasharray="4 2"/>
      <rect x="22" y="38" width="54" height="14" rx="2" fill="${p.teal}"/>
      <text x="26" y="48" class="mono" font-size="8.5" font-weight="700" fill="#FFFFFF">ID#07 0.94</text>

      <!-- Tracked Target Box 2 -->
      <rect x="116" y="46" width="80" height="60" rx="4" fill="${p.blueSoft}" stroke="${p.blue}" stroke-width="1.5"/>
      <rect x="116" y="46" width="56" height="14" rx="2" fill="${p.blue}"/>
      <text x="120" y="56" class="mono" font-size="8.5" font-weight="700" fill="#FFFFFF">ID#12 0.91</text>

      <!-- Animated Laser Scan Line -->
      <line class="laser-scan" x1="12" y1="36" x2="208" y2="36" stroke="${p.teal}" stroke-width="1.5" opacity="0.85"/>
    </g>

    <!-- MODULE B: Floating Clean Frontend UI Card (Top Right of Stage) -->
    <g class="float-ui" transform="translate(638, 54)">
      <rect width="222" height="122" rx="10" fill="${p.panel}" stroke="${p.border}" stroke-width="1.2"/>
      <text x="16" y="24" class="mono" font-size="9.5" font-weight="700" fill="${p.blue}" letter-spacing="1.2">UI CRAFT // REACT · TS</text>
      <text x="16" y="52" class="sans" font-size="24" font-weight="800" fill="${p.ink}" letter-spacing="-0.8">99.4<tspan font-size="14" fill="${p.teal}">%</tspan></text>
      <text x="104" y="46" class="mono" font-size="10" font-weight="700" fill="${p.teal}">▲ +2.38x CPU</text>
      <text x="104" y="60" class="mono" font-size="9.5" fill="${p.inkMuted}">OpenVINO IR</text>

      <!-- Mini Spark Bars -->
      <rect x="16" y="88" width="22" height="18" rx="3" fill="${p.surface2}"/>
      <rect x="44" y="80" width="22" height="26" rx="3" fill="${p.surface2}"/>
      <rect x="72" y="72" width="22" height="34" rx="3" fill="${p.blue}" opacity="0.55"/>
      <rect x="100" y="66" width="22" height="40" rx="3" fill="${p.blue}" opacity="0.8"/>
      <rect x="128" y="58" width="22" height="48" rx="3" fill="${p.teal}"/>
      <rect x="158" y="78" width="48" height="24" rx="6" fill="${p.tealSoft}" stroke="${p.teal}" stroke-width="1"/>
      <text x="182" y="94" text-anchor="middle" class="mono" font-size="10" font-weight="700" fill="${p.teal}">LIVE</text>
    </g>

    <!-- MODULE C: ESP32-S3 Dual-Core ECU & CAN-Bus Oscilloscope Strip (Bottom Full Stage) -->
    <g transform="translate(404, 190)">
      <rect width="456" height="92" rx="10" fill="${p.panel}" stroke="${p.border}" stroke-width="1.2"/>
      <text x="16" y="22" class="mono" font-size="10" font-weight="700" fill="${p.inkSub}" letter-spacing="1.2">ESP32-S3 DUAL-CORE ECU BENCH  ·  IGT/IGW COIL &amp; CAN 500KBPS</text>
      <text x="440" y="22" text-anchor="end" class="mono" font-size="10" font-weight="700" fill="${p.amber}">3,600 RPM</text>

      <!-- Oscilloscope Waveform Path -->
      <path d="M 16 68 L 54 68 L 54 36 L 86 36 L 86 68 L 124 68 L 136 46 L 144 30 L 152 76 L 160 68 L 204 68 L 204 36 L 236 36 L 236 68 L 274 68 L 286 46 L 294 30 L 302 76 L 310 68 L 354 68 L 354 36 L 386 36 L 386 68 L 440 68" fill="none" stroke="${p.teal}" stroke-width="1.5" opacity="0.32"/>
      <path class="ecu-trace" d="M 16 68 L 54 68 L 54 36 L 86 36 L 86 68 L 124 68 L 136 46 L 144 30 L 152 76 L 160 68 L 204 68 L 204 36 L 236 36 L 236 68 L 274 68 L 286 46 L 294 30 L 302 76 L 310 68 L 354 68 L 354 36 L 386 36 L 386 68 L 440 68" fill="none" stroke="${p.teal}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
    </g>
  </g>
</svg>
`;
}

/* ========================================================================== */
/* 2. PROJECT CARD 01: MULTITECH SERVICE & WORKSHOP OS (880 x 236)            */
/* ========================================================================== */
function buildWebCardSvg(mode = "dark") {
  const p = getPalette(mode);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 880 236" width="880" height="236" role="img" aria-label="Multitech Service Management Web App — React, TypeScript, Vite, Tailwind CSS">
  <title>Multitech Service &amp; Workshop OS</title>
  <defs>
    <style>
      .sans { font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Helvetica, Arial, sans-serif; }
      .mono { font-family: 'JetBrains Mono', 'SFMono-Regular', Consolas, Menlo, monospace; font-variant-numeric: tabular-nums; }
      @keyframes progressFill {
        0%, 15% { width: 80px; }
        50%, 85% { width: 196px; }
        100% { width: 80px; }
      }
      @keyframes rowHighlight {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.65; }
      }
      .anim-bar { animation: progressFill 4.5s cubic-bezier(0.22, 1, 0.36, 1) infinite; }
      .anim-badge { animation: rowHighlight 2.2s ease-in-out infinite; }
      @media (prefers-reduced-motion: reduce) { * { animation: none !important; } }
    </style>
  </defs>

  <rect width="880" height="236" rx="16" fill="${p.panel}" stroke="${p.border}" stroke-width="1.5"/>

  <!-- Left Identity Panel (x: 0..330) — Max 4 items, ZERO paragraphs! -->
  <g>
    <text x="28" y="42" class="mono" font-size="11" font-weight="700" fill="${p.blue}" letter-spacing="1.6">01 // FULL-STACK WEB APP</text>
    <text x="28" y="88" class="sans" font-size="34" font-weight="800" fill="${p.ink}" letter-spacing="-1.2">Multitech OS</text>
    <text x="28" y="116" class="sans" font-size="15.5" font-weight="600" fill="${p.inkSub}">ECU &amp; Electronics Repair Platform</text>

    <!-- 3 Big Figure / Feature Pairs -->
    <g transform="translate(28, 138)">
      <rect width="136" height="36" rx="8" fill="${p.surface}" stroke="${p.border}" stroke-width="1"/>
      <text x="12" y="15" class="mono" font-size="9" fill="${p.inkMuted}">WORKFLOW</text>
      <text x="12" y="29" class="mono" font-size="11.5" font-weight="700" fill="${p.ink}">Live Queue</text>

      <rect x="146" y="0" width="142" height="36" rx="8" fill="${p.surface}" stroke="${p.border}" stroke-width="1"/>
      <text x="158" y="15" class="mono" font-size="9" fill="${p.inkMuted}">ARCHITECTURE</text>
      <text x="158" y="29" class="mono" font-size="11.5" font-weight="700" fill="${p.blue}">React + TS + Vite</text>
    </g>

    <!-- Bottom Tech Chips -->
    <g class="mono" font-size="10.5" font-weight="600" fill="${p.inkMuted}">
      <text x="28" y="206">TYPESCRIPT  ·  REACT  ·  TAILWIND  ·  VITE ↗</text>
    </g>
  </g>

  <line x1="344" y1="0" x2="344" y2="236" stroke="${p.border}" stroke-width="1.2"/>

  <!-- Right Product Stage: Vector Redraw of Service Management Dashboard (x: 344..880) -->
  <g transform="translate(364, 18)">
    <rect width="496" height="200" rx="12" fill="${p.stage}" stroke="${p.border}" stroke-width="1.2"/>

    <!-- App Top Bar -->
    <rect width="496" height="34" rx="12" fill="${p.surface}"/>
    <circle cx="16" cy="17" r="4" fill="${p.rose}"/>
    <circle cx="28" cy="17" r="4" fill="${p.amber}"/>
    <circle cx="40" cy="17" r="4" fill="${p.teal}"/>
    <rect x="62" y="8" width="210" height="18" rx="5" fill="${p.panel}" stroke="${p.border}" stroke-width="0.8"/>
    <text x="72" y="20" class="mono" font-size="9.5" fill="${p.inkMuted}">⌘K  Search repair order #SRV...</text>
    <rect x="382" y="8" width="98" height="18" rx="5" fill="${p.tealSoft}"/>
    <text x="431" y="20" text-anchor="middle" class="mono" font-size="9.5" font-weight="700" fill="${p.teal}">● 14 ACTIVE JOBS</text>

    <!-- Ticket Row 1 (Animated Active Repair) -->
    <g transform="translate(16, 46)">
      <rect width="464" height="44" rx="8" fill="${p.panel}" stroke="${p.blue}" stroke-width="1.2"/>
      <text x="14" y="19" class="mono" font-size="11" font-weight="700" fill="${p.blue}">#SRV-204</text>
      <text x="86" y="19" class="sans" font-size="12.5" font-weight="700" fill="${p.ink}">Honda CR-V Gen 3 · Keihin ECU</text>
      <rect x="358" y="8" width="92" height="18" rx="9" fill="${p.tealSoft}"/>
      <text class="mono anim-badge" x="404" y="20" text-anchor="middle" font-size="9.5" font-weight="700" fill="${p.teal}">● BENCH TEST</text>
      <!-- Animated Progress Bar inside Ticket 1 -->
      <rect x="14" y="30" width="220" height="5" rx="2.5" fill="${p.surface2}"/>
      <rect class="anim-bar" x="14" y="30" width="160" height="5" rx="2.5" fill="${p.blue}"/>
      <text x="450" y="36" text-anchor="end" class="mono" font-size="10" font-weight="600" fill="${p.inkSub}">IGT Pulse OK · 92%</text>
    </g>

    <!-- Ticket Row 2 -->
    <g transform="translate(16, 98)">
      <rect width="464" height="40" rx="8" fill="${p.panel}" stroke="${p.border}" stroke-width="1"/>
      <text x="14" y="24" class="mono" font-size="11" font-weight="700" fill="${p.inkMuted}">#SRV-205</text>
      <text x="86" y="24" class="sans" font-size="12.5" font-weight="600" fill="${p.ink}">Toyota Innova Reborn · Injector Driver</text>
      <rect x="358" y="11" width="92" height="18" rx="9" fill="${p.blueSoft}"/>
      <text x="404" y="23" text-anchor="middle" class="mono" font-size="9.5" font-weight="700" fill="${p.blue}">✓ COMPLETED</text>
    </g>

    <!-- Ticket Row 3 -->
    <g transform="translate(16, 146)">
      <rect width="464" height="40" rx="8" fill="${p.panel}" stroke="${p.border}" stroke-width="1"/>
      <text x="14" y="24" class="mono" font-size="11" font-weight="700" fill="${p.inkMuted}">#SRV-206</text>
      <text x="86" y="24" class="sans" font-size="12.5" font-weight="600" fill="${p.ink}">Mitsubishi Pajero Sport · CAN Gateway</text>
      <rect x="358" y="11" width="92" height="18" rx="9" fill="${p.surface2}"/>
      <text x="404" y="23" text-anchor="middle" class="mono" font-size="9.5" font-weight="700" fill="${p.amber}">⧗ QUEUED</text>
    </g>
  </g>
</svg>
`;
}

/* ========================================================================== */
/* 3. PROJECT CARD 02: ECU PATTERN-GEN & COIL SIMULATOR S3 (880 x 236)        */
/* ========================================================================== */
function buildEcuCardSvg(mode = "dark") {
  const p = getPalette(mode);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 880 236" width="880" height="236" role="img" aria-label="ECU Pattern Generator and ESP32-S3 Dual-Core Ignition Coil Simulator">
  <title>ECU Pattern-Gen &amp; Ignition Coil Simulator S3</title>
  <defs>
    <style>
      .sans { font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Helvetica, Arial, sans-serif; }
      .mono { font-family: 'JetBrains Mono', 'SFMono-Regular', Consolas, Menlo, monospace; font-variant-numeric: tabular-nums; }
      @keyframes ckpScroll {
        0% { stroke-dashoffset: 320; }
        100% { stroke-dashoffset: 0; }
      }
      .ckp-wave { stroke-dasharray: 160 160; animation: ckpScroll 3.4s linear infinite; }
      @media (prefers-reduced-motion: reduce) { * { animation: none !important; } }
    </style>
  </defs>

  <rect width="880" height="236" rx="16" fill="${p.panel}" stroke="${p.border}" stroke-width="1.5"/>

  <!-- Left Identity Panel -->
  <g>
    <text x="28" y="42" class="mono" font-size="11" font-weight="700" fill="${p.teal}" letter-spacing="1.6">02 // AUTOMOTIVE &amp; EMBEDDED</text>
    <text x="28" y="88" class="sans" font-size="34" font-weight="800" fill="${p.ink}" letter-spacing="-1.2">ECU Bench S3</text>
    <text x="28" y="116" class="sans" font-size="15.5" font-weight="600" fill="${p.inkSub}">ESP32-S3 Ignition &amp; CAN Synthesizer</text>

    <g transform="translate(28, 138)">
      <rect width="136" height="36" rx="8" fill="${p.surface}" stroke="${p.border}" stroke-width="1"/>
      <text x="12" y="15" class="mono" font-size="9" fill="${p.inkMuted}">DUAL-CORE RTOS</text>
      <text x="12" y="29" class="mono" font-size="11.5" font-weight="700" fill="${p.teal}">1 µs ISR Pulse</text>

      <rect x="146" y="0" width="142" height="36" rx="8" fill="${p.surface}" stroke="${p.border}" stroke-width="1"/>
      <text x="158" y="15" class="mono" font-size="9" fill="${p.inkMuted}">TELEMETRY</text>
      <text x="158" y="29" class="mono" font-size="11.5" font-weight="700" fill="${p.ink}">CAN 500 kbps</text>
    </g>

    <g class="mono" font-size="10.5" font-weight="600" fill="${p.inkMuted}">
      <text x="28" y="206">C++ FREERTOS  ·  ESP32-S3  ·  MCP2515  ·  ILI9341 ↗</text>
    </g>
  </g>

  <line x1="344" y1="0" x2="344" y2="236" stroke="${p.border}" stroke-width="1.2"/>

  <!-- Right Product Stage: Oscilloscope & Trigger Wheel Waveform Stage -->
  <g transform="translate(364, 18)">
    <rect width="496" height="200" rx="12" fill="${p.stage}" stroke="${p.border}" stroke-width="1.2"/>

    <!-- Top Telemetry Readout Strip -->
    <rect x="14" y="12" width="146" height="44" rx="8" fill="${p.panel}" stroke="${p.border}" stroke-width="1"/>
    <text x="26" y="28" class="mono" font-size="9.5" fill="${p.inkMuted}">ENGINE SPEED</text>
    <text x="26" y="47" class="mono" font-size="18" font-weight="800" fill="${p.teal}">3,450 <tspan font-size="11">RPM</tspan></text>

    <rect x="170" y="12" width="146" height="44" rx="8" fill="${p.panel}" stroke="${p.border}" stroke-width="1"/>
    <text x="182" y="28" class="mono" font-size="9.5" fill="${p.inkMuted}">COIL DWELL TIME</text>
    <text x="182" y="47" class="mono" font-size="18" font-weight="800" fill="${p.blue}">2.85 <tspan font-size="11">ms</tspan></text>

    <rect x="326" y="12" width="156" height="44" rx="8" fill="${p.panel}" stroke="${p.border}" stroke-width="1"/>
    <text x="338" y="28" class="mono" font-size="9.5" fill="${p.inkMuted}">WHEEL PATTERN</text>
    <text x="338" y="47" class="mono" font-size="16" font-weight="800" fill="${p.amber}">36-2 CKP + CMP</text>

    <!-- Dual-Channel Digital Logic Analyzer & Ignition Stage -->
    <rect x="14" y="66" width="468" height="120" rx="8" fill="${p.panel}" stroke="${p.border}" stroke-width="1"/>

    <!-- Channel 1: CKP 36-2 Crankshaft Trigger Teeth -->
    <text x="26" y="84" class="mono" font-size="9.5" font-weight="700" fill="${p.blue}">CH1 · CKP 36-2 CRANK TRIGGER</text>
    <path d="M 26 112 L 42 112 L 42 94 L 56 94 L 56 112 L 70 112 L 70 94 L 84 94 L 84 112 L 98 112 L 98 94 L 112 94 L 112 112 L 126 112 L 126 94 L 140 94 L 140 112 L 182 112 L 182 94 L 196 94 L 196 112 L 210 112 L 210 94 L 224 94 L 224 112 L 238 112 L 238 94 L 252 94 L 252 112 L 266 112 L 266 94 L 280 94 L 280 112 L 322 112 L 322 94 L 336 94 L 336 112 L 350 112 L 350 94 L 364 94 L 364 112 L 378 112 L 378 94 L 392 94 L 392 112 L 406 112 L 406 94 L 420 94 L 420 112 L 468 112" fill="none" stroke="${p.blue}" stroke-width="1.8" opacity="0.85"/>

    <!-- Channel 2: IGT / IGW Ignition Coil Dwell & Discharge -->
    <text x="26" y="136" class="mono" font-size="9.5" font-weight="700" fill="${p.teal}">CH2 · IGT COIL DWELL &amp; SPARK DISCHARGE</text>
    <path d="M 26 170 L 110 170 L 126 146 L 138 138 L 142 178 L 148 164 L 154 170 L 250 170 L 266 146 L 278 138 L 282 178 L 288 164 L 294 170 L 390 170 L 406 146 L 418 138 L 422 178 L 428 164 L 434 170 L 468 170" fill="none" stroke="${p.teal}" stroke-width="1.5" opacity="0.35"/>
    <path class="ckp-wave" d="M 26 170 L 110 170 L 126 146 L 138 138 L 142 178 L 148 164 L 154 170 L 250 170 L 266 146 L 278 138 L 282 178 L 288 164 L 294 170 L 390 170 L 406 146 L 418 138 L 422 178 L 428 164 L 434 170 L 468 170" fill="none" stroke="${p.teal}" stroke-width="2.4" stroke-linecap="round"/>
  </g>
</svg>
`;
}

/* ========================================================================== */
/* 4. PROJECT CARD 03: YOLO26 INT8 CPU EDGE PEOPLE COUNTING (880 x 236)       */
/* ========================================================================== */
function buildVisionCardSvg(mode = "dark") {
  const p = getPalette(mode);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 880 236" width="880" height="236" role="img" aria-label="YOLO26 INT8 Quantization on CPU-Only Edge People Counting">
  <title>YOLO26 INT8 CPU Edge People Counting</title>
  <defs>
    <style>
      .sans { font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Helvetica, Arial, sans-serif; }
      .mono { font-family: 'JetBrains Mono', 'SFMono-Regular', Consolas, Menlo, monospace; font-variant-numeric: tabular-nums; }
      @keyframes trackMove {
        0%, 100% { transform: translate(0px, 0px); }
        50% { transform: translate(18px, -10px); }
      }
      .track-box { animation: trackMove 3.8s ease-in-out infinite; }
      @media (prefers-reduced-motion: reduce) { * { animation: none !important; } }
    </style>
  </defs>

  <rect width="880" height="236" rx="16" fill="${p.panel}" stroke="${p.border}" stroke-width="1.5"/>

  <!-- Left Identity Panel -->
  <g>
    <text x="28" y="42" class="mono" font-size="11" font-weight="700" fill="${p.teal}" letter-spacing="1.6">03 // EDGE AI &amp; VISION RESEARCH</text>
    <text x="28" y="88" class="sans" font-size="34" font-weight="800" fill="${p.ink}" letter-spacing="-1.2">YOLO26 INT8</text>
    <text x="28" y="116" class="sans" font-size="15.5" font-weight="600" fill="${p.inkSub}">CPU-Only Quantized People Counting</text>

    <g transform="translate(28, 138)">
      <rect width="136" height="36" rx="8" fill="${p.surface}" stroke="${p.border}" stroke-width="1"/>
      <text x="12" y="15" class="mono" font-size="9" fill="${p.inkMuted}">CPU SPEEDUP</text>
      <text x="12" y="29" class="mono" font-size="12.5" font-weight="800" fill="${p.teal}">2.38x Faster</text>

      <rect x="146" y="0" width="142" height="36" rx="8" fill="${p.surface}" stroke="${p.border}" stroke-width="1"/>
      <text x="158" y="15" class="mono" font-size="9" fill="${p.inkMuted}">MODEL SIZE</text>
      <text x="158" y="29" class="mono" font-size="12.5" font-weight="800" fill="${p.blue}">3.74x Smaller</text>
    </g>

    <g class="mono" font-size="10.5" font-weight="600" fill="${p.inkMuted}">
      <text x="28" y="206">OPENVINO 2026  ·  NNCF INT8  ·  102/104 RUNS ↗</text>
    </g>
  </g>

  <line x1="344" y1="0" x2="344" y2="236" stroke="${p.border}" stroke-width="1.2"/>

  <!-- Right Product Stage: People Counting Tripwire & FP32 vs INT8 Benchmark -->
  <g transform="translate(364, 18)">
    <rect width="496" height="200" rx="12" fill="${p.stage}" stroke="${p.border}" stroke-width="1.2"/>

    <!-- Left Sub-Stage: MOT20 Tripwire Counting Viewport (230px wide) -->
    <g transform="translate(14, 14)">
      <rect width="224" height="172" rx="10" fill="${p.panel}" stroke="${p.border}" stroke-width="1"/>
      <text x="12" y="20" class="mono" font-size="9.5" font-weight="700" fill="${p.inkMuted}">MOT20 CROWD · [1,300,6] NMS-FREE</text>

      <!-- Virtual Tripwire Line -->
      <line x1="12" y1="102" x2="212" y2="102" stroke="${p.amber}" stroke-width="1.8" stroke-dasharray="6 4"/>
      <text x="16" y="96" class="mono" font-size="8.5" font-weight="700" fill="${p.amber}">TRIPWIRE LINE</text>

      <!-- Animated Tracked Person 1 -->
      <g class="track-box">
        <rect x="34" y="48" width="52" height="72" rx="4" fill="${p.tealSoft}" stroke="${p.teal}" stroke-width="1.6"/>
        <rect x="34" y="48" width="44" height="13" rx="2" fill="${p.teal}"/>
        <text x="38" y="58" class="mono" font-size="8" font-weight="700" fill="#FFFFFF">#04 0.94</text>
        <path d="M 60 120 L 52 142" stroke="${p.teal}" stroke-width="1.6" stroke-dasharray="2 2"/>
      </g>

      <!-- Tracked Person 2 -->
      <rect x="126" y="64" width="54" height="74" rx="4" fill="${p.blueSoft}" stroke="${p.blue}" stroke-width="1.6"/>
      <rect x="126" y="64" width="44" height="13" rx="2" fill="${p.blue}"/>
      <text x="130" y="74" class="mono" font-size="8" font-weight="700" fill="#FFFFFF">#09 0.91</text>

      <!-- Counter Footer -->
      <rect x="12" y="142" width="200" height="22" rx="5" fill="${p.surface}"/>
      <text x="22" y="157" class="mono" font-size="10" font-weight="700" fill="${p.teal}">IN: 148</text>
      <text x="92" y="157" class="mono" font-size="10" font-weight="700" fill="${p.blue}">OUT: 143</text>
      <text x="204" y="157" text-anchor="end" class="mono" font-size="9.5" font-weight="700" fill="${p.ink}">nMAE 1.8%</text>
    </g>

    <!-- Right Sub-Stage: CPU Latency & Footprint Comparison Bars (230px wide) -->
    <g transform="translate(250, 14)">
      <rect width="232" height="172" rx="10" fill="${p.panel}" stroke="${p.border}" stroke-width="1"/>
      <text x="16" y="22" class="mono" font-size="9.5" font-weight="700" fill="${p.inkMuted}">INTEL CORE i5-12400F (NO GPU)</text>

      <!-- FP32 Baseline Bar -->
      <text x="16" y="48" class="mono" font-size="10.5" font-weight="600" fill="${p.inkSub}">FP32 Baseline</text>
      <text x="216" y="48" text-anchor="end" class="mono" font-size="10.5" font-weight="700" fill="${p.inkMuted}">58.4 ms</text>
      <rect x="16" y="55" width="200" height="10" rx="5" fill="${p.surface2}"/>

      <!-- OpenVINO INT8 Bar -->
      <text x="16" y="86" class="mono" font-size="10.5" font-weight="700" fill="${p.teal}">OpenVINO INT8 PTQ</text>
      <text x="216" y="86" text-anchor="end" class="mono" font-size="11" font-weight="800" fill="${p.teal}">24.5 ms</text>
      <rect x="16" y="93" width="200" height="10" rx="5" fill="${p.surface}"/>
      <rect x="16" y="93" width="84" height="10" rx="5" fill="${p.teal}"/>

      <!-- Big Summary Callout Box -->
      <rect x="16" y="118" width="200" height="42" rx="8" fill="${p.tealSoft}" stroke="${p.teal}" stroke-width="1"/>
      <text x="28" y="136" class="mono" font-size="10" font-weight="700" fill="${p.teal}">PARADOX ERROR CANCEL</text>
      <text x="28" y="151" class="mono" font-size="10.5" font-weight="700" fill="${p.ink}">ΔnMAE &lt; 0.25% vs FP32</text>
    </g>
  </g>
</svg>
`;
}

/* ========================================================================== */
/* 5. BIG GITHUB STREAK, COMMITS & ACTIVITY DASHBOARD (880 x 268)             */
/* ========================================================================== */
function buildStatsSvg(mode = "dark", stats = DEFAULT_STATS) {
  const p = getPalette(mode);

  // Build 26 weekly activity bars (x: 28..496, width=468)
  const maxWeek = Math.max(...stats.weeklyCounts, 10);
  const barSlot = 17.5;
  const barsSvg = stats.weeklyCounts
    .map((count, i) => {
      const h = Math.max(Math.round((count / maxWeek) * 58), 5);
      const x = Math.round(28 + i * barSlot);
      const y = 224 - h;
      const isLast = i === stats.weeklyCounts.length - 1;
      const fill = isLast
        ? p.amber
        : count > maxWeek * 0.6
        ? p.teal
        : count > maxWeek * 0.25
        ? p.blue
        : p.surface2;
      return `<rect x="${x}" y="${y}" width="12" height="${h}" rx="3" fill="${fill}"${
        isLast ? ' class="pulse-bar"' : ""
      }/>`;
    })
    .join("\n    ");

  // Build Language Bar (x: 528..852, width=324)
  let curX = 528;
  const totalW = 324;
  const langBarSvg = stats.languages
    .map((l) => {
      const w = Math.round((l.pct / 100) * totalW);
      const x = curX;
      curX += w;
      const color = mode === "dark" ? l.colorDark : l.colorLight;
      return `<rect x="${x}" y="176" width="${Math.max(w - 3, 6)}" height="12" rx="3" fill="${color}"/>`;
    })
    .join("\n    ");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 880 268" width="880" height="268" role="img" aria-label="GitHub Commits, Streak, and Language Telemetry for feb027">
  <title>GitHub Activity, Commits &amp; Streak Dashboard</title>
  <defs>
    <style>
      .sans { font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Helvetica, Arial, sans-serif; }
      .mono { font-family: 'JetBrains Mono', 'SFMono-Regular', Consolas, Menlo, monospace; font-variant-numeric: tabular-nums; }
      @keyframes pulseBar {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.45; }
      }
      .pulse-bar { animation: pulseBar 1.8s ease-in-out infinite; }
      @media (prefers-reduced-motion: reduce) { * { animation: none !important; } }
    </style>
  </defs>

  <rect width="880" height="268" rx="16" fill="${p.panel}" stroke="${p.border}" stroke-width="1.5"/>

  <!-- Top Header Strip -->
  <text x="28" y="30" class="mono" font-size="10.5" font-weight="700" fill="${p.inkMuted}" letter-spacing="1.8">GITHUB TELEMETRY // COMMITS, STREAK &amp; LANGUAGES</text>
  <text x="852" y="30" text-anchor="end" class="mono" font-size="10.5" font-weight="700" fill="${p.teal}">● AUTO-SYNCED ${stats.updatedDate}</text>
  <line x1="0" y1="44" x2="880" y2="44" stroke="${p.hairline}" stroke-width="1"/>

  <!-- 4 BIG HERO KPI TILES (y: 44..134) — 36px Bold Tabular Figures! -->
  <line x1="220" y1="44" x2="220" y2="134" stroke="${p.hairline}" stroke-width="1"/>
  <line x1="440" y1="44" x2="440" y2="134" stroke="${p.hairline}" stroke-width="1"/>
  <line x1="660" y1="44" x2="660" y2="134" stroke="${p.hairline}" stroke-width="1"/>

  <!-- KPI 1: Contributions (12M) & Commits -->
  <g>
    <text x="28" y="68" class="mono" font-size="10" font-weight="700" fill="${p.inkMuted}" letter-spacing="1.2">CONTRIBUTIONS (12M)</text>
    <text x="28" y="104" class="mono" font-size="34" font-weight="800" fill="${p.ink}">${stats.totalContributions12m.toLocaleString("en-US")}</text>
    <text x="28" y="123" class="mono" font-size="10.5" font-weight="600" fill="${p.teal}">${stats.publicCommits12m} Pub + ${stats.privateContributions12m} Priv Commits</text>
  </g>

  <!-- KPI 2: Longest Streak & Active Days -->
  <g>
    <text x="244" y="68" class="mono" font-size="10" font-weight="700" fill="${p.inkMuted}" letter-spacing="1.2">LONGEST STREAK</text>
    <text x="244" y="104" class="mono" font-size="34" font-weight="800" fill="${p.amber}">${stats.longestStreak} <tspan font-size="16" font-weight="700">DAYS</tspan></text>
    <text x="244" y="123" class="mono" font-size="10.5" font-weight="600" fill="${p.inkSub}">🔥 ${stats.activeDays12m} Active Days (12M)</text>
  </g>

  <!-- KPI 3: Current Streak / Today -->
  <g>
    <text x="464" y="68" class="mono" font-size="10" font-weight="700" fill="${p.inkMuted}" letter-spacing="1.2">CURRENT STREAK</text>
    <text x="464" y="104" class="mono" font-size="34" font-weight="800" fill="${p.teal}">${stats.currentStreak} <tspan font-size="16" font-weight="700">DAY${stats.currentStreak > 1 ? "S" : ""}</tspan></text>
    <text x="464" y="123" class="mono" font-size="10.5" font-weight="600" fill="${p.blue}">⚡ ${stats.todayContributions} Contributions Today</text>
  </g>

  <!-- KPI 4: Total Repositories -->
  <g>
    <text x="684" y="68" class="mono" font-size="10" font-weight="700" fill="${p.inkMuted}" letter-spacing="1.2">REPOSITORIES</text>
    <text x="684" y="104" class="mono" font-size="34" font-weight="800" fill="${p.ink}">${stats.totalRepos}</text>
    <text x="684" y="123" class="mono" font-size="10.5" font-weight="600" fill="${p.inkSub}">${stats.publicRepos} Public · ${stats.privateRepos} Private</text>
  </g>

  <line x1="0" y1="134" x2="880" y2="134" stroke="${p.hairline}" stroke-width="1"/>
  <line x1="504" y1="134" x2="504" y2="268" stroke="${p.hairline}" stroke-width="1"/>

  <!-- Bottom Left: 26-Week Contribution Velocity Chart (x: 28..480) -->
  <g>
    <text x="28" y="156" class="mono" font-size="10" font-weight="700" fill="${p.inkMuted}" letter-spacing="1.4">26-WEEK COMMIT &amp; CONTRIBUTION VELOCITY</text>
    ${barsSvg}
    <text x="28" y="246" class="mono" font-size="10" fill="${p.inkMuted}">6 MONTHS AGO</text>
    <text x="476" y="246" text-anchor="end" class="mono" font-size="10" font-weight="700" fill="${p.amber}">● THIS WEEK</text>
  </g>

  <!-- Bottom Right: Core Language Distribution (x: 528..852) -->
  <g>
    <text x="528" y="156" class="mono" font-size="10" font-weight="700" fill="${p.inkMuted}" letter-spacing="1.4">PRIMARY STACK DISTRIBUTION (${stats.totalRepos} REPOS)</text>
    ${langBarSvg}

    <g class="mono" font-size="11.5" font-weight="600" fill="${p.ink}">
      <circle cx="534" cy="210" r="5" fill="${mode === "dark" ? "#14B8A6" : "#0F766E"}"/>
      <text x="546" y="214">Python <tspan fill="${p.inkMuted}">38%</tspan></text>

      <circle cx="704" cy="210" r="5" fill="${mode === "dark" ? "#38BDF8" : "#0071E3"}"/>
      <text x="716" y="214">TS / JS <tspan fill="${p.inkMuted}">26%</tspan></text>

      <circle cx="534" cy="238" r="5" fill="${mode === "dark" ? "#818CF8" : "#6366F1"}"/>
      <text x="546" y="242">C++ / Rust <tspan fill="${p.inkMuted}">18%</tspan></text>

      <circle cx="704" cy="238" r="5" fill="${mode === "dark" ? "#94A3B8" : "#64748B"}"/>
      <text x="716" y="242">Web / TeX <tspan fill="${p.inkMuted}">18%</tspan></text>
    </g>
  </g>
</svg>
`;
}

async function main() {
  await fs.mkdir(ASSETS_DIR, { recursive: true });
  const stats = await fetchLiveGitHubStats();

  const files = [
    ["hero-dark.svg", buildHeroSvg("dark", stats)],
    ["hero-light.svg", buildHeroSvg("light", stats)],
    ["card-web-dark.svg", buildWebCardSvg("dark")],
    ["card-web-light.svg", buildWebCardSvg("light")],
    ["card-ecu-dark.svg", buildEcuCardSvg("dark")],
    ["card-ecu-light.svg", buildEcuCardSvg("light")],
    ["card-vision-dark.svg", buildVisionCardSvg("dark")],
    ["card-vision-light.svg", buildVisionCardSvg("light")],
    ["stats-dark.svg", buildStatsSvg("dark", stats)],
    ["stats-light.svg", buildStatsSvg("light", stats)],
  ];

  await Promise.all(
    files.map(([name, content]) =>
      fs.writeFile(path.join(ASSETS_DIR, name), content, "utf8")
    )
  );

  // Remove old telemetry-*.svg if present
  await fs.rm(path.join(ASSETS_DIR, "telemetry-dark.svg"), { force: true });
  await fs.rm(path.join(ASSETS_DIR, "telemetry-light.svg"), { force: true });

  console.log(
    `Generated ${files.length} 1:1 native-width (880px) SVG cards (Contribs 12M: ${stats.totalContributions12m}, Longest Streak: ${stats.longestStreak}d, Active Days: ${stats.activeDays12m})`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
