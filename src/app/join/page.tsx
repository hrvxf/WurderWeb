import JoinHandoffCard from "@/components/join/JoinHandoffCard";
import { extractGameCodeFromPayload } from "@/domain/join/joinLink";

export default async function JoinEntryPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const params = await searchParams;
  const initialCode = extractGameCodeFromPayload(params.code || "");

  return <JoinHandoffCard initialCode={initialCode} />;
}
