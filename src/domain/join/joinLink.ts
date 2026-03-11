import { GAME_CODE_PATTERN, normalizeGameCode, parseGameCode } from "@/domain/join/code";

export { normalizeGameCode };

function safeDecode(input: string): string {
  try {
    return decodeURIComponent(input);
  } catch {
    return input;
  }
}

export function buildJoinUniversalLink(gameCode: string): string {
  const parsed = parseGameCode(gameCode);
  if (!parsed.isValid) {
    return "";
  }

  return `https://wurder.app/join/${parsed.value}`;
}

export function extractGameCodeFromPayload(payload: string): string {
  const trimmedPayload = safeDecode((payload ?? "").trim());
  if (!trimmedPayload) {
    return "";
  }

  const parsedRaw = parseGameCode(trimmedPayload);
  if (parsedRaw.isValid) {
    return parsedRaw.value;
  }

  const joinPathMatch = trimmedPayload.match(/\/join\/([^/?#]+)/i);
  if (!joinPathMatch) {
    return "";
  }

  const parsedPathCode = parseGameCode(normalizeGameCode(joinPathMatch[1] ?? ""));
  if (!parsedPathCode.isValid || !GAME_CODE_PATTERN.test(parsedPathCode.value)) {
    return "";
  }

  return parsedPathCode.value;
}
