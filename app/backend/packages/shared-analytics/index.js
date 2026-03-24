function toNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function hasTimestamp(value) {
  if (typeof value !== "string") return false;
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime());
}

function deriveSessionStatus(input) {
  const status = typeof input?.status === "string" ? input.status.trim().toLowerCase() : "";
  if (["completed", "in_progress", "not_started"].includes(status)) return status;
  const ended = input?.ended === true || hasTimestamp(input?.endedAt);
  const started = input?.started === true || hasTimestamp(input?.startedAt);
  if (ended) return "completed";
  if (started) return "in_progress";
  return "not_started";
}

function displaySafeCount(value, fallback = "--") {
  const number = toNumber(value);
  return number == null ? fallback : number.toLocaleString();
}

function displaySafePercent(value, fallback = "--", fractionDigits = 1) {
  const number = toNumber(value);
  return number == null ? fallback : `${number.toFixed(fractionDigits)}%`;
}

function displaySafeRatio(value, fallback = "--", fractionDigits = 2) {
  const number = toNumber(value);
  return number == null ? fallback : number.toFixed(fractionDigits);
}

function displaySafeDurationSeconds(value, fallback = "--") {
  const seconds = toNumber(value);
  if (seconds == null || seconds <= 0) return fallback;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours <= 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}

module.exports = {
  deriveSessionStatus,
  displaySafeCount,
  displaySafePercent,
  displaySafeRatio,
  displaySafeDurationSeconds,
};
