import { NextResponse } from "next/server";

export const dynamic = "force-static";

export async function GET() {
  const packageName = process.env.ANDROID_PACKAGE_NAME || "app.wurder";
  const fingerprints = (process.env.ANDROID_SHA256_FINGERPRINTS || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  const body = [
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: packageName,
        sha256_cert_fingerprints:
          fingerprints.length > 0 ? fingerprints : ["REPLACE_WITH_RELEASE_FINGERPRINT"],
      },
    },
  ];

  return NextResponse.json(body, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=300",
    },
  });
}
