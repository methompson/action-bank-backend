import {
  ActionBankOptions,
  ProgramContext,
  UserTypeMap,
} from '@dataTypes';

function isRecord(value: Record<string, unknown> | unknown | null | undefined): value is Record<string, unknown> {
  const val = value as Record<string, unknown>;

  return typeof val === 'object' && !Array.isArray(val);
}

function isString(value: string | unknown | null | undefined): value is string {
  return typeof value === 'string';
}

function isNumber(value: number | unknown | null | undefined): value is number {
  return typeof value === 'number';
}

function isBoolean(value: boolean | unknown | null | undefined): value is boolean {
  return typeof value === 'boolean';
}

function isProgramContext (value: ProgramContext | unknown | null | undefined): value is ProgramContext {
  if (!isRecord(value)) return false;
  if (!(value.userTypeMap instanceof UserTypeMap)) return false;

  return true;
}

function isActionBankOptions(value: Record<string, unknown> | unknown | null | undefined): value is ActionBankOptions {
  if (!isRecord(value)) return false;
  if (!isProgramContext(value.programContext)) return false;

  return true;
}

export {
  isRecord,
  isString,
  isNumber,
  isBoolean,
  isProgramContext,
  isActionBankOptions,
};