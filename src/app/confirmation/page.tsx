// app/confirmation/page.tsx
import dynamic from "next/dynamic";

const ConfirmationPageInner = dynamic(() => import("./ConfirmationPageInner"), {
  ssr: false,
});

export default function ConfirmationPage() {
  return <ConfirmationPageInner />;
}
