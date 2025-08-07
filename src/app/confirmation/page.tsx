"use client";

// ✅ Rename to avoid conflict
import dynamicImport from "next/dynamic";

// ✅ Opt out of prerendering
export const dynamic = "force-dynamic";

// ✅ Dynamically load the actual page content
const ConfirmationContent = dynamicImport(() => import("./ConfirmationContent"), {
  ssr: false,
});

export default function Page() {
  return <ConfirmationContent />;
}
