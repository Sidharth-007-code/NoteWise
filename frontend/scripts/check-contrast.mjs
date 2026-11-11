#!/usr/bin/env node

/**
 * check-contrast.mjs
 * Evaluates WCAG 2.1 contrast ratios for NoteWise token pairs across Light and Dark themes.
 * Standards:
 * - Normal text: minimum 4.5:1 (WCAG AA)
 * - UI components / borders / large text: minimum 3.0:1 (WCAG AA)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper functions for relative luminance & contrast ratio
function srgbToLin(c) {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function hexToRgb(hex) {
  const clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    return [
      parseInt(clean[0] + clean[0], 16),
      parseInt(clean[1] + clean[1], 16),
      parseInt(clean[2] + clean[2], 16),
    ];
  }
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ];
}

function luminance(hex) {
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * srgbToLin(r) + 0.7152 * srgbToLin(g) + 0.0722 * srgbToLin(b);
}

function contrastRatio(hex1, hex2) {
  const l1 = luminance(hex1);
  const l2 = luminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// Token pairs to verify
const pairs = [
  // --- LIGHT THEME (Canvas #F5F1E8, Surface #FFFEFA) ---
  { name: 'Light text on background', fg: '#292B29', bg: '#F5F1E8', min: 4.5, type: 'text' },
  { name: 'Light text on surface', fg: '#292B29', bg: '#FFFEFA', min: 4.5, type: 'text' },
  { name: 'Light muted text on background', fg: '#5E625C', bg: '#F5F1E8', min: 4.5, type: 'text' },
  { name: 'Light muted text on surface', fg: '#5E625C', bg: '#FFFEFA', min: 4.5, type: 'text' },
  { name: 'Light accent text on background', fg: '#7E5A44', bg: '#F5F1E8', min: 4.5, type: 'text' },
  { name: 'Light accent text on surface', fg: '#7E5A44', bg: '#FFFEFA', min: 4.5, type: 'text' },
  { name: 'Light primary button text', fg: '#FFFFFF', bg: '#293A34', min: 4.5, type: 'text' },
  { name: 'Light nav text on nav rail', fg: '#F1F0E9', bg: '#293A34', min: 4.5, type: 'text' },
  { name: 'Light nav muted text on nav rail', fg: '#B6B9AE', bg: '#293A34', min: 4.5, type: 'text' },
  { name: 'Light success text on success bg', fg: '#1E6B38', bg: '#E8F4EC', min: 4.5, type: 'text' },
  { name: 'Light success text on surface', fg: '#1E6B38', bg: '#FFFEFA', min: 4.5, type: 'text' },
  { name: 'Light danger text on danger bg', fg: '#A32323', bg: '#FDECEC', min: 4.5, type: 'text' },
  { name: 'Light danger text on surface', fg: '#A32323', bg: '#FFFEFA', min: 4.5, type: 'text' },
  { name: 'Light warning text on warning bg', fg: '#85520E', bg: '#FEF6E7', min: 4.5, type: 'text' },
  { name: 'Light warning text on surface', fg: '#85520E', bg: '#FFFEFA', min: 4.5, type: 'text' },
  { name: 'Light control border against surface', fg: '#8A8170', bg: '#FFFEFA', min: 3.0, type: 'ui' },
  { name: 'Light focus ring against surface', fg: '#7E5A44', bg: '#FFFEFA', min: 3.0, type: 'ui' },

  // --- DARK THEME (Canvas #171D1A, Surface #202923) ---
  { name: 'Dark text on background', fg: '#F1F0E9', bg: '#171D1A', min: 4.5, type: 'text' },
  { name: 'Dark text on surface', fg: '#F1F0E9', bg: '#202923', min: 4.5, type: 'text' },
  { name: 'Dark muted text on background', fg: '#B6B9AE', bg: '#171D1A', min: 4.5, type: 'text' },
  { name: 'Dark muted text on surface', fg: '#B6B9AE', bg: '#202923', min: 4.5, type: 'text' },
  { name: 'Dark accent text on background', fg: '#A5B69C', bg: '#171D1A', min: 4.5, type: 'text' },
  { name: 'Dark accent text on surface', fg: '#A5B69C', bg: '#202923', min: 4.5, type: 'text' },
  { name: 'Dark primary button text', fg: '#171D1A', bg: '#A5B69C', min: 4.5, type: 'text' },
  { name: 'Dark nav text on nav rail', fg: '#F1F0E9', bg: '#293A34', min: 4.5, type: 'text' },
  { name: 'Dark nav muted text on nav rail', fg: '#B6B9AE', bg: '#293A34', min: 4.5, type: 'text' },
  { name: 'Dark success text on success bg', fg: '#68D391', bg: '#142E1F', min: 4.5, type: 'text' },
  { name: 'Dark success text on surface', fg: '#68D391', bg: '#202923', min: 4.5, type: 'text' },
  { name: 'Dark danger text on danger bg', fg: '#FC8181', bg: '#321A1A', min: 4.5, type: 'text' },
  { name: 'Dark danger text on surface', fg: '#FC8181', bg: '#202923', min: 4.5, type: 'text' },
  { name: 'Dark warning text on warning bg', fg: '#F6AD55', bg: '#2D2214', min: 4.5, type: 'text' },
  { name: 'Dark warning text on surface', fg: '#F6AD55', bg: '#202923', min: 4.5, type: 'text' },
  { name: 'Dark control border against surface', fg: '#728277', bg: '#202923', min: 3.0, type: 'ui' },
  { name: 'Dark focus ring against surface', fg: '#A5B69C', bg: '#202923', min: 3.0, type: 'ui' },
];

console.log('='.repeat(70));
console.log('NoteWise WCAG 2.1 Contrast Ratio Verification');
console.log('='.repeat(70));

let failures = 0;
for (const p of pairs) {
  const ratio = contrastRatio(p.fg, p.bg);
  const passed = ratio >= p.min;
  const status = passed ? 'PASS' : 'FAIL';
  if (!passed) failures++;
  console.log(
    `[${status}] ${p.name.padEnd(42)} ${ratio.toFixed(2)}:1 (min ${p.min}:1) [${p.fg} on ${p.bg}]`
  );
}

console.log('='.repeat(70));
if (failures === 0) {
  console.log(`All ${pairs.length} token pairs passed WCAG contrast criteria.`);
  process.exit(0);
} else {
  console.error(`${failures} contrast checks failed.`);
  process.exit(1);
}
