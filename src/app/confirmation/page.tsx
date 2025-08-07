// src/app/confirmation/page.tsx
import dynamic from "next/dynamic";

const ConfirmationContent = dynamic(() => import("./ConfirmationContent"), {
  ssr: false,
});

export default function ConfirmationPageWrapper() {
  return <ConfirmationContent />;
}
