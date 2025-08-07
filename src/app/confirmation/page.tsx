// src/app/confirmation/page.tsx
import { Suspense } from "react";
import dynamicFn from "next/dynamic";

export const dynamic = "force-dynamic";

const ConfirmationContent = dynamicFn(() => import("./ConfirmationContent"), {
  ssr: false,
});

export default function ConfirmationPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ConfirmationContent />
    </Suspense>
  );
}
