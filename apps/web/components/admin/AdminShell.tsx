import type { AdminMe } from "@/lib/admin-server";
import { SignOutButton } from "./SignOutButton";
import { AdminNav } from "./AdminNav";

/** Admin shell: tenant header, section nav, sign out. */
export function AdminShell({
  me,
  children,
}: {
  me: AdminMe;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="sticky top-0 z-40 border-b bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-extrabold">{me.tenant.name}</p>
            <p className="text-xs text-neutral-500">
              {me.user.name || me.user.role} · Admin
            </p>
          </div>
          <SignOutButton />
        </div>
        <AdminNav />
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
