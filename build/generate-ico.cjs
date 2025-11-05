#!/usr/bin/env node
/*
 * Generate a high-quality multi-resolution Windows .ico from PNG sources.
 * Primary: ImageMagick (magick/convert). Fallback: png-to-ico (Node-only).
 * Uses existing assets/icon-*.png; creates missing sizes from the largest PNG.
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ASSETS_DIR = path.resolve(__dirname, "../assets");
const OUTPUT_ICO = path.join(ASSETS_DIR, "icon.ico");
const SIZES = [16, 20, 24, 32, 40, 48, 64, 128, 256];

function hasCmd(cmd) {
  try {
    execSync(`${cmd} -version`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

async function ensurePng(size, sourcePng) {
  const target = path.join(ASSETS_DIR, `icon-${size}.png`);
  if (fs.existsSync(target)) return target;
  if (!sourcePng) return null;
  try {
    const sharp = require("sharp");
    await sharp(sourcePng)
      .resize(size, size, { fit: "cover" })
      .png({ compressionLevel: 9 })
      .toFile(target);
    return target;
  } catch (e) {
    console.error(`Failed to generate ${size}px from ${sourcePng}:`, e.message);
    return null;
  }
}

function findLargestPng() {
  const candidates = [
    "icon-1024.png",
    "icon-512.png",
    "icon-256.png",
    "icon.png",
  ].map((f) => path.join(ASSETS_DIR, f));
  return candidates.find((p) => fs.existsSync(p)) || null;
}

async function buildWithMagick(inputs) {
  const magickCmd = hasCmd("magick") ? "magick" : hasCmd("convert") ? "convert" : null;
  if (!magickCmd) return false;
  try {
    const args = magickCmd === "magick" ? ["convert", ...inputs, OUTPUT_ICO] : [...inputs, OUTPUT_ICO];
    execSync([magickCmd, ...args].join(" "), { stdio: "inherit" });
    if (!fs.existsSync(OUTPUT_ICO)) throw new Error("ICO was not created");
    console.log(`✅ Generated ICO (ImageMagick): ${OUTPUT_ICO}`);
    return true;
  } catch (e) {
    console.error("ImageMagick generation failed:", e.message);
    return false;
  }
}

async function buildWithPngToIco(inputs) {
  let pngToIco;
  try {
    const mod = require("png-to-ico");
    pngToIco = mod && typeof mod === "object" && typeof mod.default === "function" ? mod.default : mod;
  } catch (e) {
    return { ok: false, reason: "missing" };
  }
  try {
    const buf = await pngToIco(inputs);
    fs.writeFileSync(OUTPUT_ICO, buf);
    console.log(`✅ Generated ICO (png-to-ico): ${OUTPUT_ICO}`);
    return { ok: true };
  } catch (e) {
    console.error("png-to-ico generation failed:", e.message);
    return { ok: false, reason: "failed" };
  }
}

async function main() {
  if (!fs.existsSync(ASSETS_DIR)) {
    console.error(`Assets directory not found: ${ASSETS_DIR}`);
    process.exit(1);
  }

  const largest = findLargestPng();
  if (!largest) {
    console.error("No base PNG found (expected icon-256.png or larger in assets/)");
    process.exit(1);
  }

  const inputs = [];
  for (const size of SIZES) {
    const p = path.join(ASSETS_DIR, `icon-${size}.png`);
    if (fs.existsSync(p)) {
      inputs.push(p);
    } else {
      const gen = await ensurePng(size, largest);
      if (gen) inputs.push(gen);
    }
  }

  if (inputs.length === 0) {
    console.error("No PNG inputs found to build ICO.");
    process.exit(1);
  }

  // Try ImageMagick first
  const viaMagick = await buildWithMagick(inputs);
  if (viaMagick) return;

  // Fallback to png-to-ico (Node-only)
  const viaNode = await buildWithPngToIco(inputs);
  if (viaNode.ok) return;

  // If both unavailable, print guidance
  console.error("\nNo available ICO generator found.");
  console.error("Options:");
  console.error("  1) Install ImageMagick and ensure 'magick' is in PATH");
  console.error("  2) Or install Node fallback: npm i -D png-to-ico");
  console.error("Then re-run: npm run icon:gen");
  process.exit(1);
}

main();
