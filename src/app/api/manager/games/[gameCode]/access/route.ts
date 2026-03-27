import { GET as businessSessionAccessGet, runtime } from "@/app/api/business/sessions/[gameCode]/access/route";
import { recordLegacySurfaceHit } from "@/lib/telemetry/legacy-surface";

export { runtime };

export async function GET(
  request: Request,
  context: { params: Promise<{ gameCode: string }> }
): Promise<Response> {
  recordLegacySurfaceHit("api.manager.games.access.get");
  const response = await businessSessionAccessGet(request, context);
  response.headers.set("x-legacy-surface", "manager-games-access");
  return response;
}

