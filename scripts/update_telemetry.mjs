#!/usr/bin/env node
/**
 * Self-contained SVG Generator & Live Telemetry Updater for feb027/feb027
 * Generates adaptive Light & Dark Swiss-Bento Hero and Animated System Telemetry SVGs.
 * Zero external npm dependencies (runs on Node.js 20+ / 22+ / 26+).
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
  totalContributions: 1697,
  publicCommits: 1290,
  privateContributions: 369,
  updatedDate: new Date().toISOString().slice(0, 10),
  languages: [
    { name: "Python", pct: 38, colorLight: "#0F766E", colorDark: "#14B8A6" },
    { name: "TypeScript / JS", pct: 26, colorLight: "#0071E3", colorDark: "#38BDF8" },
    { name: "C++ / Rust", pct: 18, colorLight: "#475569", colorDark: "#94A3B8" },
    { name: "Web / TeX", pct: 18, colorLight: "#94A3B8", colorDark: "#475569" },
  ],
};

async function fetchLiveGitHubStats() {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (!token) {
    return DEFAULT_STATS;
  }
  try {
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
            }
          }
        }
      }
    `;
    const res = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "User-Agent": "feb027-profile-telemetry",
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
    const cc = viewer.contributionsCollection;
    const totalContributions =
      cc?.contributionCalendar?.totalContributions ||
      DEFAULT_STATS.totalContributions;
    const publicCommits =
      cc?.totalCommitContributions || DEFAULT_STATS.publicCommits;
    const privateContributions =
      cc?.restrictedContributionsCount || DEFAULT_STATS.privateContributions;

    return {
      ...DEFAULT_STATS,
      totalRepos,
      publicRepos,
      totalContributions,
      publicCommits,
      privateContributions,
      updatedDate: new Date().toISOString().slice(0, 10),
    };
  } catch {
    return DEFAULT_STATS;
  }
}

function buildHeroSvg(mode = "light") {
  const isDark = mode === "dark";
  const t = isDark
    ? {
        canvas: "#0B0D11",
        panel: "#11141B",
        panelElevated: "#161A23",
        border: "#222734",
        hairline: "#1E2330",
        gridCol: "#FFFFFF",
        gridOpacity: "0.018",
        ink: "#F3F4F6",
        inkSecondary: "#9CA3AF",
        inkMuted: "#64748B",
        accent: "#14B8A6",
        accentSoft: "rgba(20, 184, 166, 0.14)",
        accentBlue: "#38BDF8",
        badgeBg: "#161B26",
        badgeBorder: "#262F40",
        ruleHeavy: "#F3F4F6",
      }
    : {
        canvas: "#F5F5F7",
        panel: "#FFFFFF",
        panelElevated: "#F8FAFC",
        border: "#E2E8F0",
        hairline: "#E5E7EB",
        gridCol: "#0F172A",
        gridOpacity: "0.022",
        ink: "#1D1D1F",
        inkSecondary: "#4B5563",
        inkMuted: "#6E6E73",
        accent: "#0F766E",
        accentSoft: "rgba(15, 118, 110, 0.10)",
        accentBlue: "#0071E3",
        badgeBg: "#F1F5F9",
        badgeBorder: "#E2E8F0",
        ruleHeavy: "#1D1D1F",
      };

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 410" width="1200" height="410" role="img" aria-label="Febnawan Fatur Rochman (Aquarise) — Edge AI, High-Craft Web UI, and Automotive Embedded Systems">
  <title>Febnawan Fatur Rochman (Aquarise) — Engineering Profile</title>
  <desc>Computer Vision and Edge AI researcher, Full-Stack Frontend Engineer, and Automotive Embedded Systems Developer at Universitas Siliwangi.</desc>
  <defs>
    <style>
      .sans { font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', 'Segoe UI', Helvetica, Arial, sans-serif; }
      .mono { font-family: 'JetBrains Mono', 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; font-variant-numeric: tabular-nums; }
      @keyframes pulseRing {
        0% { transform: scale(0.95); opacity: 0.75; }
        70% { transform: scale(2.1); opacity: 0; }
        100% { transform: scale(2.1); opacity: 0; }
      }
      @keyframes fadeSlideUp {
        0% { opacity: 0; transform: translateY(6px); }
        100% { opacity: 1; transform: translateY(0); }
      }
      .pulse-ring {
        transform-origin: 904px 48px;
        animation: pulseRing 2.4s cubic-bezier(0.22, 1, 0.36, 1) infinite;
      }
      .fade-1 { animation: fadeSlideUp 0.55s cubic-bezier(0.22, 1, 0.36, 1) 0.05s both; }
      .fade-2 { animation: fadeSlideUp 0.55s cubic-bezier(0.22, 1, 0.36, 1) 0.14s both; }
      .fade-3 { animation: fadeSlideUp 0.55s cubic-bezier(0.22, 1, 0.36, 1) 0.23s both; }
      @media (prefers-reduced-motion: reduce) {
        * { animation: none !important; }
      }
    </style>
    <pattern id="swiss-cols" x="44" y="16" width="93.5" height="378" patternUnits="userSpaceOnUse">
      <rect x="0" y="0" width="77.5" height="378" fill="${t.gridCol}" opacity="${t.gridOpacity}"/>
    </pattern>
    <linearGradient id="accent-bar" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${t.accent}"/>
      <stop offset="100%" stop-color="${t.accentBlue}"/>
    </linearGradient>
  </defs>

  <!-- Outer Cool Canvas -->
  <rect width="1200" height="410" rx="24" fill="${t.canvas}"/>

  <!-- Unified Surface Panel -->
  <rect x="16" y="16" width="1168" height="378" rx="20" fill="${t.panel}" stroke="${t.border}" stroke-width="1.2"/>

  <!-- Subtle 12-Column Swiss Architectural Underlay -->
  <rect x="44" y="16" width="1112" height="378" fill="url(#swiss-cols)"/>

  <!-- Top Running Head & Hairline -->
  <g class="mono" font-size="11" fill="${t.inkMuted}" letter-spacing="2.2">
    <text x="48" y="52" font-weight="600" fill="${t.ink}">FEBNAWAN FATUR ROCHMAN</text>
    <text x="275" y="52" fill="${t.inkMuted}">//  AQUARISE  ·  @FEB027</text>
  </g>

  <!-- Live Status Pill (Top Right) -->
  <g>
    <rect x="886" y="33" width="266" height="30" rx="15" fill="${t.badgeBg}" stroke="${t.badgeBorder}" stroke-width="1"/>
    <circle class="pulse-ring" cx="904" cy="48" r="5" fill="${t.accent}"/>
    <circle cx="904" cy="48" r="4.2" fill="${t.accent}"/>
    <text x="918" y="52" class="mono" font-size="10.5" font-weight="600" fill="${t.ink}" letter-spacing="1.2">S1 THESIS · EDGE AI RESEARCH</text>
  </g>

  <line x1="16" y1="78" x2="1184" y2="78" stroke="${t.hairline}" stroke-width="1"/>

  <!-- Hero Display Typography & Positioning Statement -->
  <g class="sans fade-1">
    <text x="48" y="138" font-size="44" font-weight="700" fill="${t.ink}" letter-spacing="-1.6">Engineering across neural inference,</text>
    <text x="48" y="186" font-size="44" font-weight="700" fill="${t.ink}" letter-spacing="-1.6">clean interfaces &amp; <tspan fill="${t.accent}">silicon firmware.</tspan></text>
    <rect x="48" y="205" width="76" height="3.5" rx="1.75" fill="url(#accent-bar)"/>

    <!-- Right Editorial Metadata Block -->
    <g class="mono" font-size="11.5" fill="${t.inkSecondary}">
      <text x="850" y="118" font-size="10" fill="${t.inkMuted}" letter-spacing="2">AFFILIATION &amp; FOCUS</text>
      <text x="850" y="140" font-weight="600" fill="${t.ink}">Informatics @ Universitas Siliwangi</text>
      <text x="850" y="160" fill="${t.inkSecondary}">CPU-Only INT8 Quantization (YOLO26)</text>
      <text x="850" y="180" fill="${t.inkSecondary}">Automotive Diagnostics @ Multitech</text>
      <text x="850" y="202" font-weight="600" fill="${t.accent}">aquarise.my.id ↗</text>
    </g>
  </g>

  <!-- Middle Hairline Divider (Unified 3-Column Bento Grid) -->
  <line x1="16" y1="232" x2="1184" y2="232" stroke="${t.hairline}" stroke-width="1"/>
  <line x1="405" y1="232" x2="405" y2="352" stroke="${t.hairline}" stroke-width="1"/>
  <line x1="795" y1="232" x2="795" y2="352" stroke="${t.hairline}" stroke-width="1"/>

  <!-- Column 01: Edge AI & Computer Vision -->
  <g class="fade-2">
    <text x="48" y="258" class="mono" font-size="10.5" font-weight="600" fill="${t.accent}" letter-spacing="2">01 // COMPUTER VISION &amp; EDGE AI</text>
    <text x="48" y="284" class="sans" font-size="17" font-weight="700" fill="${t.ink}" letter-spacing="-0.3">Sub-8-Bit CPU Vision Pipelines</text>
    <text x="48" y="308" class="sans" font-size="13" fill="${t.inkSecondary}">NMS-free YOLO26/11/10 quantization, OpenVINO</text>
    <text x="48" y="327" class="sans" font-size="13" fill="${t.inkSecondary}">2026.2, NNCF PTQ, ONNX Runtime &amp; TrackEval.</text>
  </g>

  <!-- Column 02: High-Craft Web & Full-Stack -->
  <g class="fade-2">
    <text x="433" y="258" class="mono" font-size="10.5" font-weight="600" fill="${t.accentBlue}" letter-spacing="2">02 // FRONTEND &amp; FULL-STACK WEB</text>
    <text x="433" y="284" class="sans" font-size="17" font-weight="700" fill="${t.ink}" letter-spacing="-0.3">Swiss &amp; Apple-Grade Web Interfaces</text>
    <text x="433" y="308" class="sans" font-size="13" fill="${t.inkSecondary}">TypeScript, React, Next.js, Svelte, Tailwind CSS,</text>
    <text x="433" y="327" class="sans" font-size="13" fill="${t.inkSecondary}">FastAPI &amp; Bun with restraint-first UI systems.</text>
  </g>

  <!-- Column 03: Embedded & Automotive Electronics -->
  <g class="fade-3">
    <text x="823" y="258" class="mono" font-size="10.5" font-weight="600" fill="${t.accent}" letter-spacing="2">03 // AUTOMOTIVE &amp; EMBEDDED SYSTEMS</text>
    <text x="823" y="284" class="sans" font-size="17" font-weight="700" fill="${t.ink}" letter-spacing="-0.3">Real-Time ECU &amp; Low-Latency Systems</text>
    <text x="823" y="308" class="sans" font-size="13" fill="${t.inkSecondary}">Dual-Core ESP32-S3 FreeRTOS, MCP2515 CAN-Bus,</text>
    <text x="823" y="327" class="sans" font-size="13" fill="${t.inkSecondary}">ILI9341 TFT telemetry &amp; Rust WASAPI audio.</text>
  </g>

  <!-- Bottom Colophon Strip -->
  <line x1="16" y1="352" x2="1184" y2="352" stroke="${t.hairline}" stroke-width="1"/>
  <g class="mono" font-size="10.5" fill="${t.inkMuted}" letter-spacing="1.6">
    <text x="48" y="376">TASIKMALAYA, INDONESIA  ·  UTC+7</text>
    <text x="433" y="376">STACK: PYTHON 3.11 · TS · C++ · RUST</text>
    <text x="1152" y="376" text-anchor="end" fill="${t.inkSecondary}">AQUARISE.MY.ID  ·  REV 2026.11</text>
  </g>
</svg>
`;
}

function buildTelemetrySvg(mode = "light", stats = DEFAULT_STATS) {
  const isDark = mode === "dark";
  const t = isDark
    ? {
        canvas: "#0B0D11",
        panel: "#11141B",
        cardBg: "#151922",
        border: "#222734",
        hairline: "#1E2330",
        ink: "#F3F4F6",
        inkSecondary: "#9CA3AF",
        inkMuted: "#64748B",
        accent: "#14B8A6",
        accentBlue: "#38BDF8",
        accentAmber: "#F59E0B",
        trackBg: "#1E2433",
        gridLine: "#1C2230",
      }
    : {
        canvas: "#F5F5F7",
        panel: "#FFFFFF",
        cardBg: "#F8FAFC",
        border: "#E2E8F0",
        hairline: "#E5E7EB",
        ink: "#1D1D1F",
        inkSecondary: "#4B5563",
        inkMuted: "#6E6E73",
        accent: "#0F766E",
        accentBlue: "#0071E3",
        accentAmber: "#D97706",
        trackBg: "#E2E8F0",
        gridLine: "#F1F5F9",
      };

  // Language bar segments (width 312px at x=836)
  let currentX = 836;
  const totalBarWidth = 312;
  const langRects = stats.languages
    .map((l, idx) => {
      const w = Math.round((l.pct / 100) * totalBarWidth);
      const x = currentX;
      currentX += w;
      const color = isDark ? l.colorDark : l.colorLight;
      return `<rect x="${x}" y="176" width="${Math.max(w - 2, 4)}" height="8" rx="2" fill="${color}"/>`;
    })
    .join("\n    ");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 296" width="1200" height="296" role="img" aria-label="Live System Stage &amp; Engineering Telemetry — YOLO26 INT8 Benchmark, ESP32-S3 ECU Waveform, and GitHub Metrics">
  <title>Engineering Telemetry &amp; System Stage</title>
  <desc>Three-stage interactive vector telemetry card showing YOLO26 CPU-only INT8 quantization benchmarks, ESP32-S3 Dual-Core ECU ignition pulse synthesis, and live GitHub contribution metrics.</desc>
  <defs>
    <style>
      .sans { font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', 'Segoe UI', Helvetica, Arial, sans-serif; }
      .mono { font-family: 'JetBrains Mono', 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; font-variant-numeric: tabular-nums; }
      @keyframes scanWave {
        0% { stroke-dashoffset: 360; }
        100% { stroke-dashoffset: 0; }
      }
      @keyframes barBreath {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.72; }
      }
      .ecu-wave {
        stroke-dasharray: 180 180;
        animation: scanWave 4.5s linear infinite;
      }
      .live-bar {
        animation: barBreath 2.8s ease-in-out infinite;
      }
      @media (prefers-reduced-motion: reduce) {
        * { animation: none !important; }
      }
    </style>
    <linearGradient id="wave-fill" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${t.accent}" stop-opacity="0.24"/>
      <stop offset="100%" stop-color="${t.accent}" stop-opacity="0.0"/>
    </linearGradient>
  </defs>

  <!-- Outer Canvas & Unified Panel -->
  <rect width="1200" height="296" rx="22" fill="${t.canvas}"/>
  <rect x="16" y="12" width="1168" height="272" rx="18" fill="${t.panel}" stroke="${t.border}" stroke-width="1.2"/>

  <!-- Panel Header Bar -->
  <text x="44" y="42" class="mono" font-size="10.5" font-weight="600" fill="${t.inkMuted}" letter-spacing="2">SYSTEM TELEMETRY  //  LIVE BENCHMARKS &amp; REPOSITORY METRICS</text>
  <text x="1156" y="42" text-anchor="end" class="mono" font-size="10.5" fill="${t.accent}" letter-spacing="1.4">● SYNCED ${stats.updatedDate}</text>
  <line x1="16" y1="56" x2="1184" y2="56" stroke="${t.hairline}" stroke-width="1"/>

  <!-- Vertical Hairline Dividers -->
  <line x1="416" y1="56" x2="416" y2="284" stroke="${t.hairline}" stroke-width="1"/>
  <line x1="808" y1="56" x2="808" y2="284" stroke="${t.hairline}" stroke-width="1"/>

  <!-- ======================================================================= -->
  <!-- STAGE 01: YOLO26 INT8 CPU-ONLY QUANTIZATION BENCHMARK (x: 44 -> 388)    -->
  <!-- ======================================================================= -->
  <g>
    <text x="44" y="82" class="mono" font-size="10" font-weight="600" fill="${t.accent}" letter-spacing="1.8">STAGE 01 · CPU-ONLY EDGE AI (102/104 RUNS)</text>
    <text x="44" y="105" class="sans" font-size="15.5" font-weight="700" fill="${t.ink}" letter-spacing="-0.3">YOLO26 INT8 PTQ vs FP32 Baseline</text>

    <!-- Metric Row 1: OpenVINO INT8 Speedup -->
    <text x="44" y="133" class="mono" font-size="11" fill="${t.inkSecondary}">OpenVINO 2026.2 INT8 (CPU)</text>
    <text x="388" y="133" text-anchor="end" class="mono" font-size="11" font-weight="700" fill="${t.accent}">2.38x FASTER</text>
    <rect x="44" y="141" width="344" height="7" rx="3.5" fill="${t.trackBg}"/>
    <rect class="live-bar" x="44" y="141" width="296" height="7" rx="3.5" fill="${t.accent}"/>

    <!-- Metric Row 2: Model Footprint Compression -->
    <text x="44" y="171" class="mono" font-size="11" fill="${t.inkSecondary}">Weight Footprint (FP32 → INT8)</text>
    <text x="388" y="171" text-anchor="end" class="mono" font-size="11" font-weight="700" fill="${t.accentBlue}">3.74x SMALLER</text>
    <rect x="44" y="179" width="344" height="7" rx="3.5" fill="${t.trackBg}"/>
    <rect x="44" y="179" width="268" height="7" rx="3.5" fill="${t.accentBlue}"/>

    <!-- Metric Row 3: Counting Accuracy (1 - nMAE) -->
    <text x="44" y="209" class="mono" font-size="11" fill="${t.inkSecondary}">People Counting Stability (MOT20)</text>
    <text x="388" y="209" text-anchor="end" class="mono" font-size="11" font-weight="700" fill="${t.ink}">ΔnMAE &lt; 0.25%</text>
    <rect x="44" y="217" width="344" height="7" rx="3.5" fill="${t.trackBg}"/>
    <rect x="44" y="217" width="324" height="7" rx="3.5" fill="${t.inkMuted}"/>

    <!-- Bottom Chip Strip -->
    <rect x="44" y="240" width="344" height="26" rx="6" fill="${t.cardBg}" stroke="${t.border}" stroke-width="1"/>
    <text x="56" y="257" class="mono" font-size="10" fill="${t.inkMuted}">TENSOR: [1,300,6] NMS-FREE  ·  DEV: i5-12400F (NO GPU)</text>
  </g>

  <!-- ======================================================================= -->
  <!-- STAGE 02: ESP32-S3 AUTOMOTIVE ECU & CAN-BUS STAGE (x: 440 -> 784)       -->
  <!-- ======================================================================= -->
  <g>
    <text x="440" y="82" class="mono" font-size="10" font-weight="600" fill="${t.accentBlue}" letter-spacing="1.8">STAGE 02 · EMBEDDED SILICON &amp; CAN-BUS</text>
    <text x="440" y="105" class="sans" font-size="15.5" font-weight="700" fill="${t.ink}" letter-spacing="-0.3">ESP32-S3 Dual-Core ECU Pulse Synthesis</text>

    <!-- Oscilloscope Stage Box -->
    <rect x="440" y="118" width="344" height="106" rx="10" fill="${t.cardBg}" stroke="${t.border}" stroke-width="1"/>
    <!-- Subtle Oscilloscope Grid Lines -->
    <line x1="440" y1="145" x2="784" y2="145" stroke="${t.gridLine}" stroke-width="1"/>
    <line x1="440" y1="171" x2="784" y2="171" stroke="${t.gridLine}" stroke-width="1"/>
    <line x1="440" y1="197" x2="784" y2="197" stroke="${t.gridLine}" stroke-width="1"/>
    <line x1="526" y1="118" x2="526" y2="224" stroke="${t.gridLine}" stroke-width="1"/>
    <line x1="612" y1="118" x2="612" y2="224" stroke="${t.gridLine}" stroke-width="1"/>
    <line x1="698" y1="118" x2="698" y2="224" stroke="${t.gridLine}" stroke-width="1"/>

    <!-- Animated Ignition / CAN Dwell Waveform -->
    <path d="M 452 195 L 480 195 L 480 142 L 508 142 L 508 195 L 542 195 L 552 162 L 560 132 L 568 205 L 576 195 L 616 195 L 616 142 L 644 142 L 644 195 L 678 195 L 688 162 L 696 132 L 704 205 L 712 195 L 772 195 L 772 214 L 452 214 Z" fill="url(#wave-fill)"/>
    <path d="M 452 195 L 480 195 L 480 142 L 508 142 L 508 195 L 542 195 L 552 162 L 560 132 L 568 205 L 576 195 L 616 195 L 616 142 L 644 142 L 644 195 L 678 195 L 688 162 L 696 132 L 704 205 L 712 195 L 772 195" fill="none" stroke="${t.accent}" stroke-width="1.6" opacity="0.45"/>
    <path class="ecu-wave" d="M 452 195 L 480 195 L 480 142 L 508 142 L 508 195 L 542 195 L 552 162 L 560 132 L 568 205 L 576 195 L 616 195 L 616 142 L 644 142 L 644 195 L 678 195 L 688 162 L 696 132 L 704 205 L 712 195 L 772 195" fill="none" stroke="${t.accent}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>

    <text x="452" y="135" class="mono" font-size="9.5" fill="${t.inkMuted}">CH1: IGT/IGW COIL DWELL</text>
    <text x="772" y="135" text-anchor="end" class="mono" font-size="9.5" fill="${t.accent}">CAN 500kbps · MCP2515</text>

    <!-- Bottom Chip Strip -->
    <rect x="440" y="240" width="344" height="26" rx="6" fill="${t.cardBg}" stroke="${t.border}" stroke-width="1"/>
    <text x="452" y="257" class="mono" font-size="10" fill="${t.inkMuted}">FREERTOS CORE 0: ILI9341 SPI  ·  CORE 1: HARDWARE ISR</text>
  </g>

  <!-- ======================================================================= -->
  <!-- STAGE 03: LIVE GITHUB TELEMETRY & STACK MATRIX (x: 836 -> 1152)         -->
  <!-- ======================================================================= -->
  <g>
    <text x="836" y="82" class="mono" font-size="10" font-weight="600" fill="${t.accent}" letter-spacing="1.8">STAGE 03 · GITHUB REPOSITORY TELEMETRY</text>

    <!-- 3 Key KPI Figures (Tabular Monospace) -->
    <g>
      <text x="836" y="104" class="mono" font-size="10" fill="${t.inkMuted}">CONTRIBUTIONS (12M)</text>
      <text x="836" y="132" class="mono" font-size="26" font-weight="700" fill="${t.ink}">${stats.totalContributions.toLocaleString("en-US")}</text>

      <text x="992" y="104" class="mono" font-size="10" fill="${t.inkMuted}">REPOSITORIES</text>
      <text x="992" y="132" class="mono" font-size="26" font-weight="700" fill="${t.ink}">${stats.totalRepos} <tspan font-size="12" font-weight="500" fill="${t.inkMuted}">(${stats.publicRepos} PUB)</tspan></text>
    </g>

    <!-- Language Distribution Bar -->
    <text x="836" y="166" class="mono" font-size="10" fill="${t.inkMuted}" letter-spacing="1.2">LANGUAGE DISTRIBUTION ACROSS WORKSPACES</text>
    ${langRects}

    <!-- Legend Grid -->
    <g class="mono" font-size="10.5" fill="${t.inkSecondary}">
      <circle cx="842" cy="204" r="4" fill="${isDark ? "#14B8A6" : "#0F766E"}"/>
      <text x="852" y="208">Python 38%</text>

      <circle cx="996" cy="204" r="4" fill="${isDark ? "#38BDF8" : "#0071E3"}"/>
      <text x="1006" y="208">TS / JS 26%</text>

      <circle cx="842" cy="224" r="4" fill="${isDark ? "#94A3B8" : "#475569"}"/>
      <text x="852" y="228">C++ / Rust 18%</text>

      <circle cx="996" cy="224" r="4" fill="${isDark ? "#475569" : "#94A3B8"}"/>
      <text x="1006" y="228">Web / TeX 18%</text>
    </g>

    <!-- Bottom Chip Strip -->
    <rect x="836" y="240" width="316" height="26" rx="6" fill="${t.cardBg}" stroke="${t.border}" stroke-width="1"/>
    <text x="848" y="257" class="mono" font-size="10" fill="${t.inkMuted}">COMMITS: ${stats.publicCommits} PUB + ${stats.privateContributions} PRIV  ·  SELF-HOSTED SVG</text>
  </g>
</svg>
`;
}

async function main() {
  await fs.mkdir(ASSETS_DIR, { recursive: true });
  const stats = await fetchLiveGitHubStats();

  await Promise.all([
    fs.writeFile(path.join(ASSETS_DIR, "hero-light.svg"), buildHeroSvg("light"), "utf8"),
    fs.writeFile(path.join(ASSETS_DIR, "hero-dark.svg"), buildHeroSvg("dark"), "utf8"),
    fs.writeFile(
      path.join(ASSETS_DIR, "telemetry-light.svg"),
      buildTelemetrySvg("light", stats),
      "utf8"
    ),
    fs.writeFile(
      path.join(ASSETS_DIR, "telemetry-dark.svg"),
      buildTelemetrySvg("dark", stats),
      "utf8"
    ),
  ]);

  console.log(
    `Generated 4 adaptive SVG cards in ${ASSETS_DIR} (Repos: ${stats.totalRepos}, Contributions: ${stats.totalContributions})`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
