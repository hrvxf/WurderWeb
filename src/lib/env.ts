type ProcessLike = {
  env?: Record<string, string | undefined>;
};

function getRuntimeEnv(): Record<string, string | undefined> {
  const maybeProcess = (globalThis as { process?: ProcessLike }).process;
  return maybeProcess?.env ?? {};
}

export function readEnv(key: string): string | undefined {
  return getRuntimeEnv()[key];
}

export function readPublicEnv(key: `NEXT_PUBLIC_${string}`): string | undefined {
  return readEnv(key);
}
