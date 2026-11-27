const SIGNALS = [
  /\b(processor|procesor|prozessor|chipset|cpu|soc|snapdragon|dimensity|exynos|bionic)\b/i,
  /\b(display|screen|diagonal|pOLED|OLED|AMOLED|LCD)\b/i,
  /\b(resolution|pixels|FHD|QHD|[124]K)\b/i,
  /\b(refresh|\d+\s*Hz)\b/i,
  /\b(battery|\d[\d, ]*\s*mAh)\b/i,
  /\b(charging|charger|TurboPower|\d+\s*W)\b/i,
  /\b(camera|\d+\s*MP)\b/i,
  /\b(front|selfie)\b/i,
  /\b(operating system|Android|iOS|Windows|Linux)\b/i,
  /\b(Wi[ -]?Fi|802\.11)\b/i,
  /\bBluetooth\b/i,
  /\b(weight|hmotnost|dimensions|\d+\s*(?:kg|g))\b/i,
  /\b(LPDDR|RAM|memory|DDR[345])\b/i,
  /\b(SSD|HDD|NVMe|storage)\b/i,
  /\b(gpu|graphics|GeForce|Radeon|RTX|GTX)|grafick/i,
  /\b(NFC|USB|GPS|fingerprint|IP6[578]|IP5[234])\b/i,
];
function technicalCoverage(text) {
  return SIGNALS.filter(pattern => pattern.test(String(text))).length;
}
function focusSourceText(raw, limit = 9000) {
  const text = String(raw).slice(0, 60000)
    .replace(/!\[[^\]]*\]\([^\n)]*\)/g, ' ')
    .replace(/\[([^\]\n]+)\]\([^\n)]*\)/g, '$1')
    .replace(/[\t ]+/g, ' ');
  if (text.length <= limit) return text;
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const ranked = lines.map((line, index) => ({ index, score: technicalCoverage(line) + (/\d+(?:[.,]\d+)?\s*(?:mAh|Hz|W\b|MP|inches|inch|GB|mm|g\b)|snapdragon|dimensity|exynos|bionic/i.test(line) ? 6 : 0) + (line.includes('|') ? 2 : 0) - (line.length > 1200 ? 4 : 0) }))
    .filter(item => technicalCoverage(lines[item.index]) > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index);
  if (!ranked.length) return text.slice(0, limit);
  const selected = new Set();
  let used = 0;
  for (const { index } of ranked) {
    for (const offset of [0, -1, 1]) {
      const at = index + offset;
      if (at < 0 || at >= lines.length || selected.has(at)) continue;
      const line = lines[at];
      if (line.length + used + 1 > limit) continue;
      selected.add(at); used += line.length + 1;
    }
  }
  return [...selected].sort((a,b) => a-b).map(index => lines[index]).join('\n').slice(0,limit) || text.slice(0,limit);
}
module.exports = { technicalCoverage, focusSourceText };
