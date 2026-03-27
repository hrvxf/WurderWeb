import { GET as businessGetTemplates, POST as businessPostTemplate, runtime } from "@/app/api/business/templates/route";
import { recordLegacySurfaceHit } from "@/lib/telemetry/legacy-surface";

export { runtime };

function markLegacy(response: Response): Response {
  response.headers.set("x-legacy-surface", "admin-company-templates");
  return response;
}

export async function GET(request: Request): Promise<Response> {
  recordLegacySurfaceHit("api.admin.company-templates.get");
  const response = await businessGetTemplates(request);
  return markLegacy(response);
}

export async function POST(request: Request): Promise<Response> {
  recordLegacySurfaceHit("api.admin.company-templates.post");
  const response = await businessPostTemplate(request);
  return markLegacy(response);
}

