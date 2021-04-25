function isRecord(value: Record<string, unknown> | unknown | null | undefined): value is Record<string, unknown> {
  const val = value as Record<string, unknown>;

  return typeof val === 'object' && !Array.isArray(val);
}

function isString(value: string | unknown | null | undefined): value is string {
  return typeof value === 'string';
}

function isBoolean(value: boolean | unknown | null | undefined): value is boolean {
  return typeof value === 'boolean';
}

export {
  isRecord,
  isString,
  isBoolean,
};