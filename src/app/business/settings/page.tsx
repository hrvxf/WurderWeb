import type { Metadata } from "next";
import BusinessSurfacePlaceholder from "@/components/business/BusinessSurfacePlaceholder";

export const metadata: Metadata = {
  title: "Business Settings",
  description: "Business organisation settings and controls.",
  alternates: { canonical: "/business/settings" },
};

export default function BusinessSettingsPage() {
  return (
    <BusinessSurfacePlaceholder
      title="Organisation settings"
      description="This surface is reserved for business configuration such as organisation defaults, saved templates, and sharing controls."
    />
  );
}
