import { redirect } from "next/navigation";
import { BUSINESS_ROUTES } from "@/lib/business/routes";

export default function LegacyAdminCreateCompanyGameRoute() {
  redirect(BUSINESS_ROUTES.createSession);
}
