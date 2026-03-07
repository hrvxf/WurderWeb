import JoinFallbackClient from "./JoinFallbackClient";
import { parseGameCode } from "@/domain/join/code";

export default async function JoinGamePage({
  params,
}: {
  params: Promise<{ gameCode: string }>;
}) {
  const { gameCode } = await params;
  const parsed = parseGameCode(gameCode || "");

  return <JoinFallbackClient gameCode={parsed.value} isValidCode={parsed.isValid} />;
}

