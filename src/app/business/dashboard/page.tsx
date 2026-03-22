import type { Metadata } from "next";
import BusinessSurfacePlaceholder from "@/components/business/BusinessSurfacePlaceholder";

export const metadata: Metadata = {
  title: "Business Dashboard",
  description: "Business dashboard surface for Wurder sessions and reporting.",
  alternates: { canonical: "/business/dashboard" },
};

export default function BusinessDashboardPage() {
  return (
    <BusinessSurfacePlaceholder
      title="Business dashboard"
      description="This surface is reserved for organisation-level session management, reporting entry points, and saved workflows."
    />
  );
}
