import JoinFallbackClient from "./JoinFallbackClient";

export default async function JoinGamePage({
  params,
}: {
  params: Promise<{ gameCode: string }>;
}) {
  const { gameCode } = await params;

  return <JoinFallbackClient gameCode={decodeURIComponent(gameCode || "")} />;
}
