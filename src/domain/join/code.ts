export const GAME_CODE_PATTERN = /^[A-Z0-9]{6}$/;

export type NormalizedGameCode = {
  value: string;
  isValid: boolean;
};

function safeDecode(input: string): string {
  try {
    return decodeURIComponent(input);
  } catch {
    return input;
  }
}

export function normalizeGameCode(input: string): string {
  return safeDecode(input ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

export function parseGameCode(input: string): NormalizedGameCode {
  const normalized = normalizeGameCode(input);
  return {
    value: normalized,
    isValid: GAME_CODE_PATTERN.test(normalized),
  };
}
