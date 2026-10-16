import { getTenantSlugFromHeaders } from "@/lib/tenant";
import { TenantProvider } from "@/lib/tenant-context";
import { LoginForm } from "./LoginForm";

export default function AdminLoginPage() {
  const slug = getTenantSlugFromHeaders();
  return (
    <TenantProvider slug={slug}>
      <LoginForm />
    </TenantProvider>
  );
}
