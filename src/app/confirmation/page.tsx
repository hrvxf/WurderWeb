import { Suspense } from "react";
import ClientConfirmation from "./ClientConfirmation";

export const dynamic = "force-static";

export default function ConfirmationPage() {
  return (
    <Suspense fallback={<p className="text-soft">Loading confirmation...</p>}>
      <ClientConfirmation />
    </Suspense>
  );
}
