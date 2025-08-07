// src/app/confirmation/page.tsx

"use client";

import dynamic from "next/dynamic";

// Dynamically import your client-only component
const ConfirmationContent = dynamic(() => import("./ConfirmationContent"), {
  ssr: false, // Disable server-side rendering
});

export default function ConfirmationPage() {
  return <ConfirmationContent />;
}
