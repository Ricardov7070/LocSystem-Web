export function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function createInsensitiveSearchConditions(
  search: string,
  fields: string[]
) {
  const normalizedSearch = normalizeString(search);

  return fields.flatMap((field) => [
    {
      [field]: {
        contains: search,
        mode: 'insensitive' as const,
      },
    },
    {
      [field]: {
        contains: normalizedSearch,
        mode: 'insensitive' as const,
      },
    },
  ]);
}
