const { Vibrant } = require("node-vibrant/node");
const axios = require("axios");

// --- Helpers ---
function rgbToHex([r, g, b]) {
  return "#" + [r, g, b].map(v => v.toString(16).padStart(2, "0")).join("");
}

function getTextColor([r, g, b]) {
  const brightness = Math.sqrt(0.299 * r * r + 0.587 * g * g + 0.114 * b * b);
  return brightness > 150 ? "#000000" : "#FFFFFF";
}

function colorDistance(c1, c2) {
  return Math.sqrt(c1.reduce((sum, v, i) => sum + Math.pow(v - c2[i], 2), 0));
}

// Ensure secondary/accent are visually distinct from primary
function ensureColorDistance(primary, secondary, minDistance = 50) {
  if (colorDistance(primary, secondary) < minDistance) {
    return secondary.map((v, i) =>
      Math.min(255, v + (primary[i] > 128 ? -minDistance : minDistance))
    );
  }
  return secondary;
}

// --- Default Color Scheme ---
const DEFAULT_THEME = {
  primary: "#4A90E2",      // Professional blue
  secondary: "#7B68EE",    // Medium slate blue
  accent: "#50C878",       // Emerald green
  text: "#FFFFFF",         // White text
  gradient: "linear-gradient(135deg, #4A90E2, #7B68EE, #50C878)",
};

// --- Main Function ---
async function extractThemeColor(fileUrl, type = "image") {
  try {
    // --- Prepare URLs ---
    let urls = [fileUrl];

    if (type === "video") {
      const base = fileUrl.replace(/\.[^/.]+$/, "");
      // Only sample first frame for speed (instead of 3 frames)
      urls = [`${base}.jpg?start_offset=0`];
    }

    let allColors = [];

    for (let url of urls) {
      try {
        // Download image/video frame as buffer with timeout
        const response = await axios.get(url, {
          responseType: "arraybuffer",
          timeout: 5000 // 5 second timeout
        });
        const buffer = Buffer.from(response.data, "binary");

        // ✅ Optimized for speed: quality 5 (was 2), maxColorCount 8 (was 12)
        // Lower quality = faster processing, still good results
        const palette = await Vibrant.from(buffer)
          .quality(5)           // Faster sampling (higher = faster but less accurate)
          .maxColorCount(8)     // Fewer colors = faster processing
          .getPalette();

        const swatches = Object.values(palette).filter(Boolean);

        allColors.push(...swatches.map(s => ({ rgb: s._rgb, population: s._population })));
      } catch (err) {
        console.warn("⚠️ Vibrant failed for URL:", url, err.message);
      }
    }

    // ✅ If no colors extracted, return default theme instead of throwing
    if (allColors.length === 0) {
      console.warn("⚠️ No colors extracted, using default theme for:", fileUrl);
      return DEFAULT_THEME;
    }

    // --- Remove duplicate colors ---
    allColors = allColors.filter(
      (c, i, self) => i === self.findIndex(s => s.rgb.join(",") === c.rgb.join(","))
    );

    // --- Sort by population ---
    allColors.sort((a, b) => b.population - a.population);

    // --- Pick primary, secondary, accent ---
    const primaryRgb = allColors[0].rgb;
    const secondaryRgb = allColors[1] ? ensureColorDistance(primaryRgb, allColors[1].rgb) : primaryRgb;
    const accentRgb = allColors[2] ? ensureColorDistance(primaryRgb, allColors[2].rgb) : secondaryRgb;

    const primary = rgbToHex(primaryRgb);
    const secondary = rgbToHex(secondaryRgb);
    const accent = rgbToHex(accentRgb);
    const text = getTextColor(primaryRgb);
    const gradient = `linear-gradient(135deg, ${primary}, ${secondary}, ${accent})`;

    return { primary, secondary, accent, text, gradient };

  } catch (err) {
    // ✅ Return default theme instead of throwing error
    console.error("⚠️ Theme extraction failed, using default theme:", err.message);
    return DEFAULT_THEME;
  }
}

module.exports = { extractThemeColor };
