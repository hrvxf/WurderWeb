import { redirect } from "next/navigation";

type SearchParamsInput = Record<string, string | string[] | undefined>;

function toSearchParamsString(input: SearchParamsInput): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(input)) {
    if (typeof value === "string") {
      params.set(key, value);
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        params.append(key, item);
      }
    }
  }

  const encoded = params.toString();
  return encoded ? `?${encoded}` : "";
}

export default async function LegacyGameTypeQrRedirectPage({
  searchParams,
}: {
  searchParams: Promise<SearchParamsInput>;
}) {
  const resolvedSearchParams = await searchParams;
  redirect(`/start-session${toSearchParamsString(resolvedSearchParams)}`);
}
