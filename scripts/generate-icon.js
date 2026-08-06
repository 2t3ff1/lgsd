#!/usr/bin/env node
// Generates build/icon.png (256x256) and build/icon.ico from build/icon.svg

const fs = require("fs");
const path = require("path");

const svgPath = path.join(__dirname, "..", "build", "icon.svg");
const pngPath = path.join(__dirname, "..", "build", "icon.png");
const icoPath = path.join(__dirname, "..", "build", "icon.ico");

async function main() {
  const svgData = fs.readFileSync(svgPath);

  // SVG → PNG via @resvg/resvg-js
  const { Resvg } = require("@resvg/resvg-js");
  const resvg = new Resvg(svgData, { fitTo: { mode: "width", value: 256 } });
  const pngData = resvg.render().asPng();
  fs.writeFileSync(pngPath, pngData);
  console.log("✓ build/icon.png written");

  // PNG → ICO via png-to-ico
  const { default: pngToIco, imagesToIco } = require("png-to-ico");
  const icoFn = typeof pngToIco === "function" ? pngToIco : imagesToIco;
  const icoData = await icoFn(pngPath);
  fs.writeFileSync(icoPath, icoData);
  console.log("✓ build/icon.ico written");
}

main().catch((e) => { console.error(e); process.exit(1); });
