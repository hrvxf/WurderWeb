const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomInt(max: number): number {
  if (max <= 0) {
    throw new Error("max must be greater than zero");
  }

  const source = globalThis.crypto;
  if (!source) {
    throw new Error("Secure random generator is unavailable");
  }

  const values = new Uint32Array(1);
  source.getRandomValues(values);
  return values[0] % max;
}

export function generateJoinCode(length = 6): string {
  if (!Number.isInteger(length) || length < 6 || length > 8) {
    throw new Error("Join code length must be an integer between 6 and 8.");
  }

  let code = "";
  for (let i = 0; i < length; i += 1) {
    code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  }

  return code;
}
