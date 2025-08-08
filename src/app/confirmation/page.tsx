// No "use client" here — this stays a server component.
import ClientConfirmation from "./ClientConfirmation";

// (Optional) keep it static; the child handles runtime-only bits.
export const dynamic = "force-static";

export default function ConfirmationPage() {
  return <ClientConfirmation />;
}
