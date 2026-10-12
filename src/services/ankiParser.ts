import { Word } from '../types';
import { DEFAULT_HSK3_WORDS } from '../data/hsk3Words';

export interface ParseResult {
  words: Word[];
  warnings: string[];
  totalParsed: number;
}

/**
 * Split CSV line handling quotes properly
 */
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Parses raw Anki export text or CSV (tab, comma, semicolon separated, or <br> format)
 * and extracts Hanzi, Pinyin, Vietnamese meaning, and Examples.
 */
export function parseAnkiOrCsvText(rawText: string): ParseResult {
  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
  const words: Word[] = [];
  const warnings: string[] = [];

  let curId = 1;

  lines.forEach((line, index) => {
    // Skip comment lines or CSV headers like "Mặt trước,Mặt sau"
    if (line.startsWith('#')) return;
    if (line.toLowerCase().includes('mặt trước') && line.toLowerCase().includes('mặt sau')) return;
    if (line.toLowerCase().startsWith('front,back')) return;

    let parts: string[] = [];

    // Check if line has quotes and commas
    if (line.includes('","') || (line.startsWith('"') && line.includes(','))) {
      parts = parseCsvLine(line).map((p) => p.replace(/^"|"$/g, '').trim());
    } else if (line.includes('\t')) {
      parts = line.split('\t').map((p) => p.replace(/^"|"$/g, '').trim());
    } else if (line.includes(';')) {
      parts = line.split(';').map((p) => p.replace(/^"|"$/g, '').trim());
    } else {
      parts = parseCsvLine(line).map((p) => p.replace(/^"|"$/g, '').trim());
    }

    if (parts.length === 0 || !parts[0]) return;

    const hanzi = parts[0];

    // Format with <br> in column 1 (e.g. "ài<br>yêu, thích (Ái)<br>Ví dụ: 妈妈,我爱你。 / 我爱吃米饭。")
    if (parts.length >= 2 && parts[1].includes('<br>')) {
      const brParts = parts[1].split(/<br\s*\/?>/i).map((s) => s.trim());
      const pinyin = brParts[0] || '';
      const vietnamese = brParts[1] || '';
      let rawExample = brParts.slice(2).join(' ') || '';

      // Clean up example
      let cleanExample = rawExample.replace(/^Ví dụ:\s*/i, '').trim();
      let exampleVi = '';

      if (!cleanExample) {
        cleanExample = `${hanzi}。`;
      }

      words.push({
        id: curId++,
        hanzi,
        pinyin: pinyin || '—',
        vietnamese: vietnamese || '(Chưa có bản dịch)',
        example: cleanExample,
        examplePinyin: '',
        exampleVi: exampleVi || `Ví dụ: ${cleanExample}`,
        hskLevel: 3,
      });
      return;
    }

    // Standard column layout: [hanzi, pinyin, vi, example, exampleVi]
    let pinyin = parts[1] || '';
    let vietnamese = parts[2] || '';
    let example = parts[3] || `${hanzi}。`;
    let exampleVi = parts[4] || '';

    words.push({
      id: curId++,
      hanzi,
      pinyin: pinyin || '—',
      vietnamese: vietnamese || '(Chưa có bản dịch)',
      example,
      examplePinyin: '',
      exampleVi,
      hskLevel: 3,
    });
  });

  return {
    words,
    warnings,
    totalParsed: words.length,
  };
}
