import dynamicFn from "next/dynamic";
import { Suspense } from "react";

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
