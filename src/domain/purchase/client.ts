export type PurchasePayload = {
  gameName: string;
  players: number;
  addons: string[];
};

export function buildPurchasePayload(gameName: string, players: number, addons: string[]): PurchasePayload {
  return {
    gameName: gameName.trim(),
    players,
    addons: addons.map((addon) => addon.trim()).filter(Boolean),
  };
}

export function mapPurchaseError(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "Unable to process purchase right now.";
}
