export function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        fields.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
  }
  fields.push(current);
  return fields;
}

export function splitLines(text: string): string[] {
  return text.split(/\r?\n/).filter(line => line.trim().length > 0);
}

export function quantile(sorted: Float64Array, q: number): number {
  if (sorted.length === 0) return NaN;
  if (sorted.length === 1) return sorted[0]!;
  const pos = q * (sorted.length - 1);
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  const frac = pos - lo;
  return sorted[lo]! * (1 - frac) + sorted[hi]! * frac;
}

export function sortedCopy(arr: Float64Array): Float64Array {
  const copy = new Float64Array(arr);
  copy.sort();
  return copy;
}

export function fromStanName(name: string): string {
  if (!name.includes('.')) return name;
  const parts = name.split('.');
  const base = parts[0]!;
  const indices = parts.slice(1);
  if (indices.length > 0 && indices.every(p => p.length > 0 && /^\d+$/.test(p))) {
    return `${base}[${indices.join(',')}]`;
  }
  return name;
}

export function toStanName(name: string): string {
  const m = name.match(/^(.+)\[(.+)\]$/);
  if (!m) return name;
  return `${m[1]}.${m[2]!.replace(/,/g, '.')}`;
}
