export function compareWbs(a: string | null | undefined, b: string | null | undefined): number {
  if (!a && !b) return 0;
  if (!a) return 1; // Colocar valores vacíos/null al final
  if (!b) return -1;

  // Limpiar puntos al final, ej: "1." -> "1"
  const aClean = a.endsWith('.') ? a.slice(0, -1) : a;
  const bClean = b.endsWith('.') ? b.slice(0, -1) : b;

  const aParts = aClean.split('.');
  const bParts = bClean.split('.');

  for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
    const aVal = aParts[i];
    const bVal = bParts[i];

    if (aVal === undefined) return -1; // "1.1" va antes de "1.1.1"
    if (bVal === undefined) return 1;

    const cmp = aVal.localeCompare(bVal, undefined, { numeric: true, sensitivity: 'base' });
    if (cmp !== 0) {
      return cmp;
    }
  }

  return 0;
}
