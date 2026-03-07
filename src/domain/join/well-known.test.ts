import { GET as getAasa } from "@/app/.well-known/apple-app-site-association/route";
import { GET as getAssetLinks } from "@/app/.well-known/assetlinks.json/route";

describe("well-known routes", () => {
  it("returns aasa payload", async () => {
    const response = await getAasa();
    expect(response.status).toBe(200);
  });

  it("returns assetlinks payload", async () => {
    const response = await getAssetLinks();
    expect(response.status).toBe(200);
  });
});
