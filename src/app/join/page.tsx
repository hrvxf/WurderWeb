import JoinHandoffCard from "@/components/join/JoinHandoffCard";

export default async function JoinEntryPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const params = await searchParams;
  const initialPayload = params.code || "";

  return <JoinHandoffCard initialPayload={initialPayload} />;
}
